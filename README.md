# Expense Tracker

Private, mobile-first expense tracker built with React, Vite, and Supabase. This version is tuned for personal use: free static hosting, email magic-link sign-in, and per-user database access through Supabase Row Level Security.

## What changed

- Supabase config now comes from Vite environment variables.
- The app expects authenticated users and filters expenses by `user_id`.
- Mobile install metadata was added so the site can be pinned to your phone home screen.
- The chart view is lazy-loaded so the first screen is lighter on mobile.

## Local setup

1. Install dependencies.
   ```bash
   npm install
   ```
2. Copy the environment template and add your own Supabase values.
   ```bash
   cp .env.example .env
   ```
3. Set these keys in `.env`:
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start the app.
   ```bash
   npm run dev
   ```

## Supabase schema and RLS

Run this SQL in the Supabase SQL editor. It creates a table that belongs to the signed-in user and locks all access to that user.

```sql
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  note text,
  date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists expenses_user_id_date_idx
  on public.expenses (user_id, date desc, created_at desc);

alter table public.expenses enable row level security;

create policy "users can read own expenses"
on public.expenses
for select
using (auth.uid() = user_id);

create policy "users can insert own expenses"
on public.expenses
for insert
with check (auth.uid() = user_id);

create policy "users can update own expenses"
on public.expenses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own expenses"
on public.expenses
for delete
using (auth.uid() = user_id);
```

## Authentication

- In Supabase, enable Email auth.
- Keep magic links enabled.
- Add your production URL to Supabase Auth redirect URLs.
- If you also use local development, add `http://localhost:5173` as a redirect URL too.

## Free hosting options

This app is a static frontend, so any of these work well:

- Vercel
- Netlify
- Cloudflare Pages

For deployment:

1. Connect the repo or upload the project.
2. Set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables in the host dashboard.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add the deployed URL to Supabase Auth redirect URLs.

## Personal-use recommendations

- Use your own email only and keep RLS enabled.
- Export or back up your data occasionally from Supabase.
- If you want stronger privacy later, add a monthly CSV export button and optional PIN gate on top of auth.

## Quality checks

```bash
npm run lint
npm run build
```
