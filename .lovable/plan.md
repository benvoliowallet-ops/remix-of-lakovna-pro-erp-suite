
## Vymazanie položky zákazky

### Situácia
V tabuľke položiek zákazky (`OrderDetail.tsx`) existuje tlačidlo na úpravu položky (edit, len pre admina), ale chýba tlačidlo na vymazanie. RLS politika `Admins can delete order_items` v databáze už existuje.

### Zmeny v `src/pages/OrderDetail.tsx`

1. **Nový state** pre potvrdzovacie dialógy:
   - `deleteItemDialogOpen: boolean`
   - `itemToDelete: OrderItem | null`

2. **Nová mutácia** `deleteOrderItemMutation`:
   - Zavolá `supabase.from('order_items').delete().eq('id', itemId)`
   - `onSuccess`: toast "Položka vymazaná" + invalidate query `['order', id]`
   - `onError`: toast "Chyba pri mazaní položky"

3. **Nové tlačidlo** v riadku tabuľky (vedľa edit buttonu, len pre admina):
   - Ikona `Trash2`, variant `ghost`, červená farba
   - `onClick`: nastaví `itemToDelete` a otvorí `deleteItemDialogOpen`

4. **Nový AlertDialog** (potvrdenie):
   - Zobrazí číslo výrobnej položky a typ
   - Cancel / Potvrdiť vymazanie

### Obmedzenia
- Tlačidlo bude viditeľné len pre admina (`isAdmin`)
- Bez obmedzenia na stav položky (admin môže zmazať aj rozpracovanú)
