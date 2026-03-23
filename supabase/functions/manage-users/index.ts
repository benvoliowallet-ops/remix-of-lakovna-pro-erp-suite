import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'list' | 'create' | 'update-role' | 'delete';
  email?: string;
  password?: string;
  full_name?: string;
  role?: 'admin' | 'worker';
  user_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Chýba autorizácia' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Neplatný token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseUser.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (roleError || !isAdmin) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Prístup odmietnutý - vyžaduje sa admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: RequestBody = await req.json();
    const { action } = body;

    console.log(`Action: ${action}, by user: ${user.id}`);

    // LIST - Get all users with their roles
    if (action === 'list') {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('List users error:', listError);
        throw listError;
      }

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name');
      if (profilesError) {
        console.error('Profiles error:', profilesError);
      }

      // Get all roles
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) {
        console.error('Roles error:', rolesError);
      }

      // Map profiles and roles to users
      const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithDetails = users.map(u => ({
        id: u.id,
        email: u.email,
        full_name: profilesMap.get(u.id) || u.user_metadata?.full_name || 'Neznáme',
        role: rolesMap.get(u.id) || 'worker',
        created_at: u.created_at,
      }));

      return new Response(
        JSON.stringify({ users: usersWithDetails }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE - Create new user
    if (action === 'create') {
      const { email, password, full_name, role } = body;

      // Validation
      if (!email || !password || !full_name || !role) {
        return new Response(
          JSON.stringify({ error: 'Chýbajú povinné polia' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Heslo musí mať aspoň 6 znakov' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['admin', 'worker'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Neplatná rola' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        console.error('Create user error:', createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The trigger should create the profile and default role, but we need to update the role if it's admin
      if (role === 'admin' && newUser.user) {
        const { error: roleUpdateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', newUser.user.id);

        if (roleUpdateError) {
          console.error('Role update error:', roleUpdateError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: { 
            id: newUser.user?.id, 
            email: newUser.user?.email,
            full_name,
            role 
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE-ROLE - Change user's role
    if (action === 'update-role') {
      const { user_id, role } = body;

      if (!user_id || !role) {
        return new Response(
          JSON.stringify({ error: 'Chýba user_id alebo role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['admin', 'worker'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Neplatná rola' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Update role error:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Delete a user
    if (action === 'delete') {
      const { user_id } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'Chýba user_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prevent self-deletion
      if (user_id === user.id) {
        return new Response(
          JSON.stringify({ error: 'Nemôžete vymazať sami seba' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteError) {
        console.error('Delete user error:', deleteError);
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Neznáma akcia' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-users:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Interná chyba servera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
