-- Мэдээний төрөл (ангилал). Утгууд: src/lib/news-categories.ts
-- Supabase SQL Editor дээр нэг удаа ажиллуулна. Давтан ажиллуулахад аюулгүй.
ALTER TABLE public."news" ADD COLUMN IF NOT EXISTS "category" varchar(30) NOT NULL DEFAULT 'general';
CREATE INDEX IF NOT EXISTS "news_category" ON public."news" ("category");
