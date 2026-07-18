-- ───────────────────────────────────────────────
-- آرکان — سیستم بلاگ مولتی‌ایجنت (فاز ۳)
-- این فایل را در SQL Editor داشبورد Supabase اجرا کنید.
-- ───────────────────────────────────────────────

-- پست‌های بلاگ (خروجی نهایی پایپ‌لاین)
create table if not exists posts (
  id            uuid primary key,
  run_id        uuid,
  title         text not null,
  slug          text not null unique,
  excerpt       text not null default '',
  content_md    text not null,
  meta_title    text not null default '',
  meta_description text not null default '',
  keywords      jsonb not null default '[]',
  faq           jsonb not null default '[]',
  score         int,
  status        text not null default 'draft' check (status in ('draft','published')),
  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

-- اجراهای پایپ‌لاین (برای نمایش زنده و تاریخچه)
-- steps: آرایه‌ای از رکورد گام‌ها (jsonb) — ساده‌تر از جدول جدا، برای این مقیاس کافی است
create table if not exists pipeline_runs (
  id           uuid primary key,
  status       text not null default 'running' check (status in ('running','done','error')),
  topic_hint   text,
  steps        jsonb not null default '[]',
  post_id      uuid,
  error        text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- درس‌ها = حافظه‌ی بلندمدت خودبهبودی
-- هر درس به یک ایجنت خاص تعلق دارد و در اجراهای بعدی به پرامپت او تزریق می‌شود.
create table if not exists lessons (
  id          uuid primary key,
  agent       text not null,
  lesson      text not null,
  source      text not null check (source in ('critic','human')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- بازخورد انسانی روی پست‌ها (ورودی خام خودبهبودی)
create table if not exists post_feedback (
  id          uuid primary key,
  post_id     uuid not null,
  rating      text not null check (rating in ('up','down')),
  comment     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_posts_status on posts(status);
create index if not exists idx_lessons_agent on lessons(agent) where active;

-- ───────────────────────────────────────────────
-- فاز ۴ — محتوای شبکه‌های اجتماعی
-- ───────────────────────────────────────────────

-- خروجی پایپ‌لاین بازآفرینی: کاروسل اینستاگرام و پست لینکدین.
--
-- چرا جدول جدا و نه یک ستون content_type روی posts؟ چون posts.slug یکتا و
-- not null است (کپشن اسلاگ ندارد) و ستون‌های meta_title/faq برای یک کپشن
-- بی‌معنی‌اند. راه دیگر یعنی nullable کردن نیمی از جدول بلاگ.
create table if not exists social_posts (
  id              uuid primary key,
  run_id          uuid,
  -- پست بلاگی که این محتوا از آن بازآفرینی شده
  source_post_id  uuid,
  platform        text not null check (platform in ('instagram','linkedin')),
  -- reels هم روی پلتفرم instagram می‌نشیند؛ format است که فرقشان را می‌گوید
  format          text not null check (format in ('carousel','post','reels')),
  -- عنوان داخلی برای فهرست استودیو — منتشر نمی‌شود
  title           text not null default '',
  -- کپشن اینستاگرام یا متن کامل پست لینکدین
  body            text not null default '',
  -- فقط برای کاروسل: [{ "kicker": "...", "heading": "...", "text": "..." }]
  slides          jsonb not null default '[]',
  hashtags        jsonb not null default '[]',
  cta             text not null default '',
  -- خروجی چک‌های قطعی (social-checks) برای نمایش در استودیو
  checks          jsonb not null default '[]',
  -- فیلدهای مخصوص هر قالب که جای ثابتی در جدول ندارند.
  -- برای ریلز: { onScreenText, caption, ctaReason }
  -- چرا jsonb و نه چند ستون جدید؟ چون هر قالب جدید ستون‌های خودش را
  -- می‌خواهد و جدول به‌سرعت پر از ستون‌های همیشه-خالی می‌شد.
  extras          jsonb not null default '{}',
  score           int,
  -- «approved» یعنی انسان تأییدش کرده برای انتشار دستی؛ انتشار خودکار نداریم.
  status          text not null default 'draft' check (status in ('draft','approved')),
  created_at      timestamptz not null default now(),
  approved_at     timestamptz,

  -- قرارداد شکل داده را همین‌جا قفل می‌کنیم: کاروسل حتماً ۵ تا ۸ اسلاید دارد
  -- و پست تک‌متنی حتماً صفر. این تنها جایی است که نمی‌شود دورش زد.
  -- ⚠️ همین بازه در InstagramCarouselSchema (src/lib/agents/types.ts) هم هست؛
  --    اگر یکی را عوض کردی، آن یکی را هم عوض کن.
  constraint social_posts_shape check (
    (format = 'carousel' and jsonb_array_length(slides) between 5 and 8)
    or (format in ('post','reels') and jsonb_array_length(slides) = 0)
  )
);

-- ── افزودن قالب ریلز به جدولی که از قبل ساخته شده ──
-- چون ابزار migration نداریم، تغییر constraint را با drop/add انجام می‌دهیم.
-- «drop … if exists» قبل از «add»، کل بلوک را دوباره‌اجراپذیر می‌کند.
alter table social_posts add column if not exists extras jsonb not null default '{}';

alter table social_posts drop constraint if exists social_posts_format_check;
alter table social_posts add constraint social_posts_format_check
  check (format in ('carousel','post','reels'));

alter table social_posts drop constraint if exists social_posts_shape;
alter table social_posts add constraint social_posts_shape check (
  (format = 'carousel' and jsonb_array_length(slides) between 5 and 8)
  or (format in ('post','reels') and jsonb_array_length(slides) = 0)
);

-- اجرای بازآفرینی دو خروجی دارد، نه یکی؛ پس post_id تکی کافی نیست.
-- kind عمداً check constraint ندارد: با هر نوع اجرای جدید (کمپین چندکاناله
-- در فازهای بعد) باید drop/recreate می‌شد. اتحادش در TS کنترل می‌شود.
alter table pipeline_runs add column if not exists kind text not null default 'blog';
alter table pipeline_runs add column if not exists source_post_id uuid;
alter table pipeline_runs add column if not exists social_post_ids jsonb not null default '[]';

create index if not exists idx_social_posts_status on social_posts(status);
create index if not exists idx_social_posts_source on social_posts(source_post_id);
