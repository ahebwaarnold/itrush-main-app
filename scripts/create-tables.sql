-- iTRUSH - Supabase schema (tables + constraints + RLS)
-- Run this in Supabase Dashboard -> SQL Editor.
-- Then run: scripts/seed-data.sql

-- Extensions
create extension if not exists pgcrypto;

-- USERS
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null,
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  address text not null,
  user_type text not null check (user_type in ('resident', 'business', 'admin', 'provider')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Temporary stub so policies compile; real implementation is defined later
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select false;
$$;

drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin"
on public.users
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_update_own_or_admin" on public.users;
create policy "users_update_own_or_admin"
on public.users
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- SERVICE PROVIDERS
create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null unique, -- used by app to match provider by email
  area text not null,
  location_lat double precision,
  location_lon double precision,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.service_providers enable row level security;

-- Helper functions for RLS
-- NOTE: these must be created AFTER the tables they reference exist.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.user_type = 'admin'
  );
$$;

create or replace function public.is_provider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.user_type = 'provider'
  );
$$;

create or replace function public.current_provider_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sp.id
  from public.service_providers sp
  where sp.contact = (
    select u.email
    from public.users u
    where u.id = auth.uid()
  )
  limit 1;
$$;

drop policy if exists "providers_select_active_or_admin" on public.service_providers;
create policy "providers_select_active_or_admin"
on public.service_providers
for select
to authenticated
using (
  status = 'active'
  or public.is_admin()
  or contact = (
    select u.email
    from public.users u
    where u.id = auth.uid()
  )
);

drop policy if exists "providers_admin_all" on public.service_providers;
create policy "providers_admin_all"
on public.service_providers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ORDERS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider_id uuid references public.service_providers (id) on delete set null,
  pickup_location text not null,
  location_lat double precision,
  location_lon double precision,
  waste_type text not null check (waste_type in ('Residential', 'Commercial', 'Public')),
  pickup_time timestamptz not null,
  status text not null default 'Pending' check (status in ('Pending', 'Assigned', 'Completed', 'Failed')),
  cost numeric not null default 0,
  estimated_kg numeric,
  image_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_provider_id_idx on public.orders (provider_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_user_select_own_or_admin" on public.orders;
create policy "orders_user_select_own_or_admin"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_user_insert_own" on public.orders;
create policy "orders_user_insert_own"
on public.orders
for insert
to authenticated
with check (user_id = auth.uid());

-- Providers can see all Pending orders + any orders assigned to their provider profile
drop policy if exists "orders_provider_select_queue" on public.orders;
create policy "orders_provider_select_queue"
on public.orders
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_provider()
    and (
      status = 'Pending'
      or provider_id = public.current_provider_id()
    )
  )
);

-- Providers can claim a Pending unassigned order (set provider_id to self + status to Assigned)
drop policy if exists "orders_provider_claim_pending" on public.orders;
create policy "orders_provider_claim_pending"
on public.orders
for update
to authenticated
using (
  public.is_provider()
  and status = 'Pending'
  and provider_id is null
)
with check (
  provider_id = public.current_provider_id()
  and status in ('Assigned', 'Pending')
);

-- Providers can update orders that are already assigned to them (complete/fail, etc.)
drop policy if exists "orders_provider_update_assigned" on public.orders;
create policy "orders_provider_update_assigned"
on public.orders
for update
to authenticated
using (
  public.is_admin()
  or (public.is_provider() and provider_id = public.current_provider_id())
)
with check (
  public.is_admin()
  or (public.is_provider() and provider_id = public.current_provider_id())
);

-- PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount numeric not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Failed')),
  payment_method text not null check (payment_method in ('Mobile Money', 'Card')),
  transaction_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_transaction_id_uq on public.payments (transaction_id) where transaction_id is not null;
create index if not exists payments_order_id_idx on public.payments (order_id);

alter table public.payments enable row level security;

-- Users can see/pay for their own orders; admins can see all
drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin"
on public.payments
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "payments_insert_own_or_admin" on public.payments;
create policy "payments_insert_own_or_admin"
on public.payments
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update"
on public.payments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- REPORTS (not heavily used by the app yet, but created for completeness)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb,
  area text,
  provider_id uuid references public.service_providers (id) on delete set null,
  report_type text
);

create index if not exists reports_provider_id_idx on public.reports (provider_id);

alter table public.reports enable row level security;

drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all"
on public.reports
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

