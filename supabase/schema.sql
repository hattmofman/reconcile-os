-- ============================================
-- ReconcileOS Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Reconciliation submissions
create table reconciliations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Untitled Reconciliation',
  created_at timestamptz default now() not null,

  -- Summary stats
  total_orders int default 0,
  total_shipments int default 0,
  total_warehouse numeric(12,2) default 0,
  total_parcel numeric(12,2) default 0,
  shipping_cpo numeric(8,2) default 0,
  all_in_cpo numeric(8,2) default 0,
  total_overcharges numeric(12,2) default 0,
  total_credits numeric(12,2) default 0,
  net_impact numeric(12,2) default 0,
  total_findings int default 0,

  -- Full results stored as JSON
  findings jsonb default '[]'::jsonb,
  rate_card jsonb default '[]'::jsonb,
  category_summary jsonb default '{}'::jsonb,

  -- File metadata
  files_uploaded jsonb default '[]'::jsonb
);

-- Row Level Security: users only see their own data
alter table reconciliations enable row level security;

create policy "Users can view own reconciliations"
  on reconciliations for select
  using (auth.uid() = user_id);

create policy "Users can insert own reconciliations"
  on reconciliations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reconciliations"
  on reconciliations for delete
  using (auth.uid() = user_id);

-- Index for fast lookups
create index reconciliations_user_id_idx on reconciliations(user_id);
create index reconciliations_created_at_idx on reconciliations(created_at desc);
