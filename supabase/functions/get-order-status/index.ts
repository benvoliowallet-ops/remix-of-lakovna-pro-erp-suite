import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for public access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch only public-safe data (no payment info, prices, notes)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        created_at,
        deadline_at,
        customer:customers(name, company_name),
        company:companies(name)
      `)
      .eq("id", parseInt(orderId))
      .maybeSingle();

    if (orderError) {
      console.error("Order fetch error:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order items for progress calculation (only status, no prices)
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, work_status, item_type, description")
      .eq("order_id", parseInt(orderId));

    if (itemsError) {
      console.error("Items fetch error:", itemsError);
    }

    // Calculate progress
    const totalItems = items?.length || 0;
    const completedItems = items?.filter(item => item.work_status === "completed").length || 0;
    const inProgressItems = items?.filter(item => item.work_status === "in_progress").length || 0;
    
    let progressPercent = 0;
    if (totalItems > 0) {
      // Completed items = 100%, in progress = 50%
      progressPercent = Math.round(((completedItems * 100) + (inProgressItems * 50)) / totalItems);
    }

    // Determine human-readable status message
    let statusMessage = "";
    let statusColor = "";
    
    switch (order.status) {
      case "prijate":
        statusMessage = "Zákazka prijatá do výroby";
        statusColor = "blue";
        break;
      case "vo_vyrobe":
        if (progressPercent < 30) {
          statusMessage = "Začíname pracovať na vašej zákazke";
        } else if (progressPercent < 70) {
          statusMessage = "Zákazka je vo výrobe";
        } else {
          statusMessage = "Dokončujeme vašu zákazku";
        }
        statusColor = "yellow";
        break;
      case "ukoncene":
        statusMessage = "Pripravené na odber";
        statusColor = "green";
        break;
      case "odovzdane":
        statusMessage = "Zákazka bola odovzdaná";
        statusColor = "gray";
        break;
      default:
        statusMessage = "Stav neznámy";
        statusColor = "gray";
    }

    // Return sanitized public data
    const publicData = {
      id: order.id,
      status: order.status,
      statusMessage,
      statusColor,
      progressPercent,
      createdAt: order.created_at,
      deadlineAt: order.deadline_at,
      customerName: order.customer?.name || order.customer?.company_name || null,
      companyName: order.company?.name || null,
      itemsTotal: totalItems,
      itemsCompleted: completedItems,
      itemsInProgress: inProgressItems,
    };

    return new Response(
      JSON.stringify(publicData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
