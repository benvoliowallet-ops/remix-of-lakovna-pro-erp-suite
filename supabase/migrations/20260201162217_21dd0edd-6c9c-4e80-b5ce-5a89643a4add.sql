-- Rozšírenie tabuľky customers o nové polia
ALTER TABLE public.customers
ADD COLUMN company_name text,
ADD COLUMN city text,
ADD COLUMN postal_code text,
ADD COLUMN street text,
ADD COLUMN house_number text,
ADD COLUMN ico text,
ADD COLUMN dic text,
ADD COLUMN ic_dph text,
ADD COLUMN contact_person text;

-- Premenujeme existujúce 'name' na 'name' (ponecháme pre spätnú kompatibilitu)
-- Pôvodné 'name' bude slúžiť ako display name / company_name
COMMENT ON COLUMN public.customers.name IS 'Display name - môže byť názov spoločnosti alebo meno kontaktu';
COMMENT ON COLUMN public.customers.company_name IS 'Oficiálny názov spoločnosti';
COMMENT ON COLUMN public.customers.city IS 'Mesto sídla';
COMMENT ON COLUMN public.customers.postal_code IS 'PSČ';
COMMENT ON COLUMN public.customers.street IS 'Ulica';
COMMENT ON COLUMN public.customers.house_number IS 'Popisné číslo';
COMMENT ON COLUMN public.customers.contact_person IS 'Kontaktná osoba';