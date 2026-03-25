// Type definitions for Lakovňa PRO

export type AppRole = 'admin' | 'worker';
export type OrderStatus = 'prijate' | 'vo_vyrobe' | 'ukoncene' | 'odovzdane';
export type PaymentMethod = 'hotovost' | 'karta' | 'prevod' | 'postova_poukazka' | 'interne';
export type TransportType = 'zakaznik' | 'zvoz';
export type ItemType = 'ram' | 'vypln' | 'lamely' | 'sito';
export type OrderItemType = 'standard' | 'stlp' | 'disky' | 'zaklad' | 'lamely_sito' | 'ine' | 'doplnkova_sluzba';
export type StructureType = 'hladka' | 'jemna' | 'hruba' | 'antik' | 'kladivkova';
export type GlossType = 'leskle' | 'matne' | 'polomatne' | 'satenovane' | 'hlboko_matne' | 'metalicke' | 'fluorescentne' | 'glitrove' | 'perletove';

export interface Company {
  id: string;
  name: string;
  is_vat_payer: boolean;
  vat_rate?: number;
  ico?: string;
  dic?: string;
  ic_dph?: string;
  address?: string;
  bank_account?: string;
  logo_url?: string;
  paint_coverage_m2_per_kg?: number;
}

export interface TenantProductionParams {
  disk_price_per_piece: number;
  zaklad_price_per_m2: number;
  gun_cleaning_kg: number;
  consumption_tolerance_pct: number;
}

export interface Profile {
  id: string;
  full_name?: string;
  pin_code?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Customer {
  id: string;
  name: string;
  company_name?: string;
  city?: string;
  postal_code?: string;
  street?: string;
  house_number?: string;
  ico?: string;
  dic?: string;
  ic_dph?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
}

export interface Color {
  id: string;
  ral_code: string;
  structure: string;
  gloss: string;
  hex_code?: string;
  color_name?: string;
  density: number;
  price_per_kg: number;
  price_per_kg_purchase?: number;
  stock_kg: number;
  min_stock_limit: number;
}

export interface PriceListItem {
  id: string;
  item_type: string;
  name?: string;
  unit?: string;
  price_per_m2: number;
}

export interface Order {
  id: number;
  company_id?: string;
  customer_id?: string;
  status: OrderStatus;
  created_at: string;
  deadline_at?: string;
  due_date?: string;
  invoice_url?: string;
  transport_in: TransportType;
  transport_out: TransportType;
  payment_method: PaymentMethod;
  is_paid?: boolean;
  notes?: string;
  company?: Company;
  customer?: Customer;
  order_items?: OrderItem[];
}

export type WorkStatus = 'pending' | 'in_progress' | 'completed';

export interface OrderItem {
  id: string;
  order_id: number;
  global_production_number?: number;
  item_type?: OrderItemType;
  description?: string;
  price_list_id?: string;
  color_id?: string;
  is_double_layer: boolean;
  area_m2: number;
  price_per_m2?: number;
  total_price: number;
  discount_percent?: number;
  is_rework: boolean;
  work_status: WorkStatus;
  unit?: string;
  weight_before_temp?: number;
  estimated_consumption_kg?: number;
  base_coat_id?: string;
  top_coat_id?: string;
  batch_group_id?: string;
  color?: Color;
  price_list?: PriceListItem;
}

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  pending: 'Čaká',
  in_progress: 'V práci',
  completed: 'Dokončené',
};

export interface ProductionLog {
  id: string;
  order_item_id: string;
  worker_id: string;
  weight_before: number;
  weight_after: number;
  consumed_kg: number;
  created_at: string;
}

// Label maps for UI
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  prijate: 'Prijaté',
  vo_vyrobe: 'Vo výrobe',
  ukoncene: 'Ukončené',
  odovzdane: 'Odovzdané',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  hotovost: 'Hotovosť',
  karta: 'Karta',
  prevod: 'Bankový prevod',
  postova_poukazka: 'Poštová poukážka',
  interne: 'Interné',
};

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  zakaznik: 'Zákazník',
  zvoz: 'Zvoz',
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  ram: 'Rám',
  vypln: 'Výplň',
  lamely: 'Lamely',
  sito: 'Sito',
};

export const ORDER_ITEM_TYPE_LABELS: Record<OrderItemType, string> = {
  standard: 'Štandard',
  stlp: 'Stĺp',
  disky: 'Disky kolies',
  zaklad: 'Základ',
  lamely_sito: 'Lamely / Sito',
  ine: 'Iné',
  doplnkova_sluzba: 'Doplnková služba',
};

export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  hladka: 'Hladká',
  jemna: 'Jemná',
  hruba: 'Hrubá',
  antik: 'Antik',
  kladivkova: 'Kladivková',
};

export const GLOSS_TYPE_LABELS: Record<GlossType, string> = {
  leskle: 'Lesklé',
  matne: 'Matné',
  polomatne: 'Pololesklé',
  satenovane: 'Saténové',
  hlboko_matne: 'Hlboko matné',
  metalicke: 'Metalické',
  fluorescentne: 'Fluorescenčné',
  glitrove: 'Glitrové',
  perletove: 'Perleťové',
};
