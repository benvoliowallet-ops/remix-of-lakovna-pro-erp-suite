-- Add hex_code column to colors table
ALTER TABLE public.colors ADD COLUMN IF NOT EXISTS hex_code text;

-- Add new values to gloss_type enum
ALTER TYPE public.gloss_type ADD VALUE IF NOT EXISTS 'hlboko_matne';
ALTER TYPE public.gloss_type ADD VALUE IF NOT EXISTS 'metalicke';
ALTER TYPE public.gloss_type ADD VALUE IF NOT EXISTS 'fluorescentne';
ALTER TYPE public.gloss_type ADD VALUE IF NOT EXISTS 'glitrove';
ALTER TYPE public.gloss_type ADD VALUE IF NOT EXISTS 'perletove';