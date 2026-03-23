import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer } from 'lucide-react';
import { useState } from 'react';
import { ITEM_TYPE_LABELS, ORDER_ITEM_TYPE_LABELS, STRUCTURE_TYPE_LABELS, GLOSS_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/types';
import { formatRALWithName } from '@/lib/ral-colors';
import type { Order, OrderItem, Color, PriceListItem, Customer, Company } from '@/lib/types';

export default function OrderProtocolHandover() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showItemPrices, setShowItemPrices] = useState(searchParams.get('ceny') === 'true');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-protocol-handover', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          company:companies(*),
          customer:customers(*),
          order_items(*, color:colors(*), price_list:price_list(*))
        `)
        .eq('id', Number(id))
        .single();
      if (error) throw error;
      return data as Order & {
        company: Company | null;
        customer: Customer | null;
        order_items: (OrderItem & { color: Color | null; price_list: PriceListItem | null })[];
      };
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Načítavam...</div>;
  }

  if (!order) {
    return <div className="flex h-screen items-center justify-center">Zákazka nenájdená</div>;
  }

  // Sort items by global_production_number to group paired items
  const sortedItems = [...(order.order_items || [])].sort((a, b) => {
    const numA = a.global_production_number ?? Infinity;
    const numB = b.global_production_number ?? Infinity;
    if (numA !== numB) return numA - numB;
    if (a.item_type === 'zaklad' && b.item_type !== 'zaklad') return -1;
    if (a.item_type !== 'zaklad' && b.item_type === 'zaklad') return 1;
    return 0;
  });

  const totalPrice = order.order_items?.reduce((sum, item) => 
    sum + (item.is_rework ? 0 : Number(item.total_price)), 0
  ) || 0;
  const totalStandardPrice = order.order_items?.reduce((sum, item) => 
    sum + (item.is_rework ? 0 : Number(item.area_m2) * Number(item.price_per_m2)), 0
  ) || 0;
  const totalDiscount = totalStandardPrice - totalPrice;
  // VAT using company vat_rate field (not hardcoded 23%)
  const vatAmount = order.company?.is_vat_payer 
    ? totalPrice * ((order.company.vat_rate ?? 23) / 100)
    : 0;
  const vatPercent = order.company?.vat_rate ?? 23;
  const now = new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* Screen-only controls */}
      <div className="print:hidden border-b bg-muted/50 p-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/zakazky/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Späť na zákazku
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-item-prices" 
                checked={showItemPrices} 
                onCheckedChange={(checked) => setShowItemPrices(checked === true)}
              />
              <Label htmlFor="show-item-prices">Zobraziť položkovité ceny</Label>
            </div>
            <Button onClick={handlePrint} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Printer className="mr-2 h-4 w-4" />
              Tlačiť
            </Button>
          </div>
        </div>
      </div>

      {/* Printable content */}
      <div className="mx-auto max-w-4xl p-8 print:p-0 print:max-w-none">
        <div className="protocol-a4 bg-white p-8 shadow-sm print:shadow-none">
          {/* Header */}
          <div className="border-b pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-foreground">ODOVZDÁVACÍ PROTOKOL</h1>
                <p className="text-muted-foreground mt-1">
                  Zákazka č. {order.id}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{order.company?.name}</p>
                {order.company?.ico && <p className="text-sm text-muted-foreground">IČO: {order.company.ico}</p>}
                {order.company?.dic && <p className="text-sm text-muted-foreground">DIČ: {order.company.dic}</p>}
                {order.company?.ic_dph && <p className="text-sm text-muted-foreground">IČ DPH: {order.company.ic_dph}</p>}
                {order.company?.bank_account && (
                  <p className="text-sm text-muted-foreground">Účet: {order.company.bank_account}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2 text-muted-foreground uppercase text-sm">Zákazník</h3>
              {order.customer ? (
                <div>
                  <p className="font-semibold">{order.customer.name}</p>
                  {order.customer.company_name && <p>{order.customer.company_name}</p>}
                  {order.customer.street && order.customer.house_number && (
                    <p>{order.customer.street} {order.customer.house_number}</p>
                  )}
                  {order.customer.city && order.customer.postal_code && (
                    <p>{order.customer.postal_code} {order.customer.city}</p>
                  )}
                  {order.customer.phone && <p>Tel: {order.customer.phone}</p>}
                  {order.customer.email && <p>Email: {order.customer.email}</p>}
                  {order.customer.ico && <p>IČO: {order.customer.ico}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground">Bez zákazníka</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-muted-foreground uppercase text-sm">Údaje zákazky</h3>
              <p><span className="text-muted-foreground">Dátum prijatia:</span> {new Date(order.created_at).toLocaleDateString('sk-SK')}</p>
              <p><span className="text-muted-foreground">Dátum odovzdania:</span> {now.toLocaleDateString('sk-SK')}</p>
              <p><span className="text-muted-foreground">Čas odovzdania:</span> {now.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="text-muted-foreground">Spôsob platby:</span> {PAYMENT_METHOD_LABELS[order.payment_method]}</p>
            </div>
          </div>

          {/* Items table */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-muted-foreground uppercase text-sm">Položky</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="py-2 text-left font-semibold w-16">Číslo</th>
                  <th className="py-2 text-left font-semibold">Popis</th>
                  <th className="py-2 text-left font-semibold">Farba</th>
                  <th className="py-2 text-right font-semibold">Množstvo</th>
                  {showItemPrices && <th className="py-2 text-right font-semibold">Cena</th>}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className={`border-b ${item.item_type === 'zaklad' ? 'bg-orange-50' : ''}`}>
                    <td className="py-3 font-mono font-bold">
                      {item.global_production_number || '—'}
                    </td>
                    <td className="py-3">
                      <p>
                        {item.item_type === 'zaklad' && (
                          <span className="text-xs font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded mr-1">ZÁKLAD</span>
                        )}
                        {item.item_type !== 'zaklad' && item.base_coat_id && (
                          <span className="text-xs font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded mr-1">FARBA</span>
                        )}
                        {item.price_list ? ITEM_TYPE_LABELS[item.price_list.item_type] : (item.description || (item.item_type ? ORDER_ITEM_TYPE_LABELS[item.item_type] : '—'))}
                        {item.is_double_layer && ' (Základ + Vrch)'}
                        {item.is_rework && ' (Oprava)'}
                      </p>
                    </td>
                    <td className="py-3">
                      {item.item_type === 'zaklad' ? (
                        <span>Základná farba (strieborná)</span>
                      ) : item.color ? (
                        <span>
                          {formatRALWithName(item.color.ral_code, item.color.color_name)}
                          {item.color.ral_code !== 'ZAKLAD' && (
                            <> - {STRUCTURE_TYPE_LABELS[item.color.structure]} / {GLOSS_TYPE_LABELS[item.color.gloss]}</>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {(item as any).unit === 'ks'
                        ? `${Number(item.area_m2).toFixed(2)} ks`
                        : `${Number(item.area_m2).toFixed(2)} m²`}
                    </td>
                    {showItemPrices && (
                      <td className="py-3 text-right font-mono">
                        {item.is_rework ? '0.00 €' : (
                          <>
                            {Number(item.discount_percent) > 0 && (
                              <>
                                <span className="line-through text-muted-foreground text-xs">{(Number(item.area_m2) * Number(item.price_per_m2)).toFixed(2)} €</span>
                                <span className="text-xs font-bold text-red-600 ml-1">-{Number(item.discount_percent).toFixed(0)}%</span>
                                <br />
                              </>
                            )}
                            {Number(item.total_price).toFixed(2)} €
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Price summary */}
          <div className="mb-8 flex justify-end">
              <div className="w-64 border-2 border-foreground p-4">
                {totalDiscount > 0 && (
                  <>
                    <div className="flex justify-between py-1">
                      <span>Cenník:</span>
                      <span className="font-mono">{totalStandardPrice.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between py-1 text-red-600">
                      <span>Zľava:</span>
                      <span className="font-mono">-{totalDiscount.toFixed(2)} €</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-1">
                  <span>Základ:</span>
                  <span className="font-mono">{totalPrice.toFixed(2)} €</span>
                </div>
                {order.company?.is_vat_payer && (
                  <div className="flex justify-between py-1">
                    <span>DPH ({vatPercent}%):</span>
                    <span className="font-mono">{vatAmount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-foreground font-bold text-lg">
                  <span>CELKOM:</span>
                  <span className="font-mono">{(totalPrice + vatAmount).toFixed(2)} €</span>
                </div>
              </div>
            </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-8">
              <h3 className="font-semibold mb-2 text-muted-foreground uppercase text-sm">Poznámky</h3>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* Signature section */}
          <div className="mt-12 pt-8 border-t">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-muted-foreground mb-16">Podpis zákazníka:</p>
                <div className="border-b border-foreground"></div>
                <p className="text-xs text-muted-foreground mt-1">Podpisom potvrdzujem prevzatie zákazky v poriadku</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-16">Podpis pracovníka:</p>
                <div className="border-b border-foreground"></div>
                <p className="text-xs text-muted-foreground mt-1">Odovzdal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
