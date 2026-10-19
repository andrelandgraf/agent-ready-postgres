create table if not exists runs (
  id text primary key,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running' check (status in ('running', 'reset')),
  dev_branch_id text,
  pr_number integer,
  pr_opened_at timestamptz,
  fallback boolean not null default false,
  events jsonb not null default '[]'::jsonb,
  screenshot_png_base64 text,
  screenshot_at timestamptz
);

create unique index if not exists runs_one_running on runs ((status)) where status = 'running';
