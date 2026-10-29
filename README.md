# LeagueMN — Next.js + Supabase PostgreSQL

Сагсан бөмбөгийн лиг, улирал, баг, тоглогч, тоглолт, статистик удирдах систем. Статистикийг admin (бүх лиг) болон commissioner (өөрийн лиг) шууд оруулна.

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4. PostgreSQL рүү сервер талаас `pg` драйвераар холбогдоно.

## Тохиргоо

Node.js 20+ ашиглана. `npm install` ажиллуулж `.env.example`-ийг `.env.local` болгон хуулна (байгаа `.env.local` файлыг дарж болохгүй).

Supabase → Connect → Session pooler → URI-г `.env.local` дахь `DATABASE_URL` талбарт оруулна. `[YOUR-PASSWORD]`-ийг database password-аар солино. Нууц үг доторх `@`, `#`, `%`, `/` зэрэг тэмдэгтийг URL encode хийнэ. `anon` key ашиглахгүй.

```dotenv
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
DATABASE_POOL_MAX=5
```

Гадаад DB холболт TLS сертификатыг шалгана. Сертификатын алдаа гарвал Supabase-аас CA certificate татаж `DATABASE_SSL_CA_FILE`-д замыг заана. TLS шалгалтыг унтраахгүй.

`SESSION_SECRET` (32+ тэмдэгт), `UPLOAD_DIR=../uploads`, `SITE_URL` тохиргоонууд хэвээр ашиглагдана. Хуучин `DB_HOST`, `DB_USER` зэрэг MySQL тохиргоог Next код ашиглахгүй.

## Зураг (Supabase Storage)

Vercel-ийн файлын систем зөвхөн уншигдах тул `SUPABASE_URL` болон `SUPABASE_SERVICE_ROLE_KEY` тохируулсан орчинд upload хийсэн зураг `uploads` нэртэй нийтийн bucket-д хадгалагдана. DB-д зам нь `uploads/<dir>/<file>` хэвээр; `/uploads/...` route нь Storage-ийн нийтийн URL руу шилжүүлнэ. Эдгээрийг тохируулаагүй бол локал `UPLOAD_DIR` ашиглана.

Одоо байгаа зургийг хуулах (bucket-ийг өөрөө үүсгэнэ, давтан ажиллуулж болно):

```bash
npm run storage:upload
```

Vercel дээр serverless функц олон холболт нээдэг тул `DATABASE_URL`-д Transaction pooler (порт 6543), `DATABASE_POOL_MAX=1` ашиглана.

## MySQL dump → Supabase

Эх файл: төслийн дээд хавтас дахь `last base.sql`. Хөрвүүлэлт эх файлыг өөрчлөхгүй.

```bash
npm run db:export   # зөвхөн локал файл үүсгэнэ
npm run test:db     # тусгаарласан PostgreSQL engine дээр шалгана
npm run db:migrate  # DATABASE_URL дахь хоосон Supabase сан руу импортлоно
```

- `database/supabase-schema.sql`: зөвхөн бүтэц, индекс, RLS; хувийн өгөгдөл агуулахгүй.
- `database/generated/supabase-import.sql`: бүтэц + бүх өгөгдөл + sequence; бүтнээр нь SQL Editor дээр нэг удаа ажиллуулж болно. Скриптээр импортолсон бол дахин ажиллуулахгүй.
- `database/generated/migration-report.json`: эх файлын SHA-256, хүснэгт бүрийн мөрийн тоо, огнооны хөрвүүлэлтийн тоо.

`db:migrate`-ийг хэрэглэх бол schema файлыг урьдчилж ажиллуулахгүй. Импорт нь бүтцийг өөрөө үүсгэнэ. Ижил нэртэй хүснэгт байвал дарж бичихгүй, зогсоно. Нэг transaction дотор бүх мөрийг оруулж, багана бүрийн утгыг эх өгөгдөлтэй тулган шалгасны дараа commit хийнэ. Алдаа гарвал rollback хийнэ. Хэрэв тусдаа migration URI хэрэгтэй бол `MIGRATION_DATABASE_URL` тохируулна (direct эсвэл session pooler).

Dump дотор 16 хүснэгт, 11,924 мөр байна. PostgreSQL-д хүчинтэй бус 254 zero-date утгыг NULL болгоно. MySQL-ийн enum-д байсан хоосон утгыг хэвээр хадгална. ID, хэрэглэгчийн bcrypt hash, Монгол текст, статистик, wallet түүхийг хадгална. Identity sequence нь dump-ийн AUTO_INCREMENT болон хамгийн их ID-ийн дараагаас эхэлнэ.

Үүсгэсэн import файлд хувийн өгөгдөл, password hash орсон тул `database/generated/` нь `.gitignore`-д бүртгэлтэй. Public хавтас руу байрлуулахгүй.

## Ажиллуулах

```bash
npm run dev
npm run typecheck
npm run build
npm start
```

Supabase импорт болон DATABASE_URL тохиргоо дуусаагүй бол DB ашигладаг хуудсууд ажиллахгүй.

## Бүтэц

- `src/app/(public)`: нүүр, лигүүд, хуваарь, тоглолт, тоглогч, about/contact.
- `src/app/league/[slug]`: лиг, улирлын чансаа, баг, тоглогч, статистик.
- `src/app/admin`: admin, commissioner удирдлага, boxscore/stat оруулах.
- `src/lib/db.ts`: параметртэй SQL, transaction, INSERT-ийн ID.
- `src/lib/postgres.ts`: TLS, pool, date/numeric төрлийн тохиргоо.
- `src/lib/sql-params.ts`: query-ийн `?` параметрийг PostgreSQL `$1` хэлбэрт холбоно.
- `src/middleware.ts`: admin нэвтрэлт болон хуучин PHP URL redirect.

Одоогийн JWT cookie + bcrypt нэвтрэлт хэвээр. Supabase Auth руу шилжүүлээгүй. RLS идэвхтэй бөгөөд anon/authenticated API role-д хүснэгтүүдийг нээгээгүй; зөвхөн итгэмжлэгдсэн серверийн DB холболт болон одоогийн эрхийн шалгалтаар хандана. DATABASE_URL-ийг NEXT_PUBLIC_ хувьсагчид хийж болохгүй.

Зурагнууд `UPLOAD_DIR` дахь локал хавтсаас үйлчилнэ; Supabase Storage руу шилжүүлээгүй. Огноог Монголын local wall-clock утгаар хадгалж, `app_now()` функц Asia/Ulaanbaatar цагаар үүсгэнэ.

Хуучин PHP төсөл MySQL сангаа ашигласан хэвээр бөгөөд Supabase дээрх өөрчлөлттэй автоматаар синк хийхгүй.

Холболтын албан ёсны заавар: https://supabase.com/docs/guides/database/connecting-to-postgres
