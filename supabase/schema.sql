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
