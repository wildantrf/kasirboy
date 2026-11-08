create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  unique (owner_user_id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  code text not null check (char_length(code) between 2 and 12),
  address text not null default '',
  status text not null default 'operational' check (status in ('operational', 'inactive')),
  timezone text not null default 'Asia/Jakarta',
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  service_rate numeric(5, 2) not null default 0 check (service_rate between 0 and 100),
  tax_applies_to text[] not null default array['dine_in', 'takeaway'],
  service_applies_to text[] not null default array['dine_in', 'takeaway'],
  config_version integer not null default 1 check (config_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, code),
  check (tax_applies_to <@ array['dine_in', 'takeaway']),
  check (service_applies_to <@ array['dine_in', 'takeaway'])
);

create table public.staff_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  branch_id uuid not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  role text not null check (role in ('manager', 'cashier', 'kitchen', 'waiter')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, user_id),
  foreign key (business_id, branch_id) references public.branches (business_id, id) on delete restrict
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  display_order integer not null default 0 check (display_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, branch_id, id),
  foreign key (business_id, branch_id) references public.branches (business_id, id) on delete restrict
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  category_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '',
  price_idr bigint not null check (price_idr >= 0),
  availability text not null default 'available' check (availability in ('available', 'sold_out')),
  photo_path text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, branch_id, id),
  foreign key (business_id, branch_id) references public.branches (business_id, id) on delete restrict,
  foreign key (business_id, branch_id, category_id) references public.categories (business_id, branch_id, id) on delete restrict
);

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 40),
  seats smallint not null default 2 check (seats > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, branch_id, id),
  foreign key (business_id, branch_id) references public.branches (business_id, id) on delete restrict
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  order_number text not null,
  source text not null check (source in ('cashier', 'qr_table')),
  order_type text not null check (order_type in ('dine_in', 'takeaway')),
  table_id uuid,
  payment_method text not null check (payment_method in ('cash', 'manual_digital', 'qris')),
  payment_state text not null default 'unpaid' check (payment_state in ('unpaid', 'pending', 'paid', 'abandoned')),
  fulfillment_state text not null default 'new' check (fulfillment_state in ('new', 'preparing', 'ready', 'awaiting_handover', 'completed')),
  fulfillment_mode text not null default 'instant' check (fulfillment_mode in ('kds', 'instant', 'offline_sync')),
  subtotal_idr bigint not null check (subtotal_idr >= 0),
  discount_type text check (discount_type in ('amount', 'percent')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  discount_amount_idr bigint not null default 0 check (discount_amount_idr >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  tax_amount_idr bigint not null default 0 check (tax_amount_idr >= 0),
  service_rate numeric(5, 2) not null default 0 check (service_rate between 0 and 100),
  service_amount_idr bigint not null default 0 check (service_amount_idr >= 0),
  unrounded_total_idr bigint not null check (unrounded_total_idr >= 0),
  rounding_delta_idr bigint not null default 0,
  final_total_idr bigint not null check (final_total_idr >= 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  customer_note text not null default '' check (char_length(customer_note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  unique (business_id, branch_id, id),
  unique (business_id, branch_id, order_number),
  foreign key (business_id, branch_id) references public.branches (business_id, id) on delete restrict,
  foreign key (business_id, branch_id, table_id) references public.dining_tables (business_id, branch_id, id) on delete restrict,
  check ((discount_type is null) = (discount_value = 0)),
  check ((payment_state = 'paid') = (paid_at is not null))
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  product_id uuid,
  name_snapshot text not null check (char_length(name_snapshot) between 1 and 120),
  unit_price_idr bigint not null check (unit_price_idr >= 0),
  quantity integer not null check (quantity between 1 and 999),
  note text not null default '' check (char_length(note) <= 140),
  ready boolean not null default false,
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (business_id, branch_id, order_id) references public.orders (business_id, branch_id, id) on delete restrict,
  foreign key (business_id, branch_id, product_id) references public.products (business_id, branch_id, id) on delete restrict,
  check ((ready = false) = (ready_at is null))
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  provider text not null,
  provider_ref text not null,
  amount_idr bigint not null check (amount_idr > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  state text not null default 'pending' check (state in ('pending', 'paid', 'failed', 'expired', 'uncertain')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (business_id, branch_id, order_id) references public.orders (business_id, branch_id, id) on delete restrict,
  unique (provider, provider_ref),
  check ((state = 'paid') = (verified_at is not null))
);

create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  method text not null check (method in ('cash', 'manual_digital', 'qris')),
  amount_idr bigint not null check (amount_idr > 0),
  provider text,
  provider_ref text,
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz not null default now(),
  foreign key (business_id, branch_id, order_id) references public.orders (business_id, branch_id, id) on delete restrict,
  unique (provider, provider_ref)
);

create table public.kitchen_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  branch_id uuid not null,
  order_id uuid not null,
  sequence bigint generated always as identity,
  status text not null default 'new' check (status in ('new', 'preparing', 'ready', 'completed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  unique (order_id),
  foreign key (business_id, branch_id, order_id) references public.orders (business_id, branch_id, id) on delete restrict
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete restrict,
  branch_id uuid,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (business_id, branch_id) references public.branches (business_id, id) on delete restrict
);

create index staff_accounts_user_scope_idx on public.staff_accounts (user_id, business_id, branch_id) where status = 'active';
create index categories_branch_order_idx on public.categories (business_id, branch_id, display_order) where archived_at is null;
create index products_branch_category_idx on public.products (business_id, branch_id, category_id) where archived_at is null;
create index orders_branch_created_idx on public.orders (business_id, branch_id, created_at desc);
create index kitchen_jobs_branch_status_idx on public.kitchen_jobs (business_id, branch_id, status, sequence);
create index audit_events_business_created_idx on public.audit_events (business_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create function private.validate_branch_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_timezone_names tz
    where tz.name = new.timezone
  ) then
    raise exception 'Invalid branch timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger branches_set_updated_at
before update on public.branches
for each row execute function private.set_updated_at();
create trigger branches_validate_timezone
before insert or update on public.branches
for each row execute function private.validate_branch_timezone();
create trigger businesses_validate_timezone
before insert or update on public.businesses
for each row execute function private.validate_branch_timezone();
create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();
create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create function private.can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_user_id = (select auth.uid())
  ) or exists (
    select 1
    from public.staff_accounts s
    where s.business_id = target_business_id
      and s.user_id = (select auth.uid())
      and s.status = 'active'
  );
$$;

create function private.can_access_branch(target_business_id uuid, target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_user_id = (select auth.uid())
  ) or exists (
    select 1
    from public.staff_accounts s
    where s.business_id = target_business_id
      and s.branch_id = target_branch_id
      and s.user_id = (select auth.uid())
      and s.status = 'active'
  );
$$;

create function private.has_business_role(target_business_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_user_id = (select auth.uid())
      and 'owner' = any (allowed_roles)
  ) or exists (
    select 1
    from public.staff_accounts s
    where s.business_id = target_business_id
      and s.user_id = (select auth.uid())
      and s.status = 'active'
      and s.role = any (allowed_roles)
  );
$$;

create function private.has_branch_role(target_business_id uuid, target_branch_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_user_id = (select auth.uid())
      and 'owner' = any (allowed_roles)
  ) or exists (
    select 1
    from public.staff_accounts s
    where s.business_id = target_business_id
      and s.branch_id = target_branch_id
      and s.user_id = (select auth.uid())
      and s.status = 'active'
      and s.role = any (allowed_roles)
  );
$$;

create function public.create_business_with_branch(
  business_name text,
  branch_name text,
  branch_address text default '',
  branch_timezone text default 'Asia/Jakarta'
)
returns table (business_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_business_id uuid;
  new_branch_id uuid;
  branch_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if char_length(btrim(business_name)) not between 2 and 120
    or char_length(btrim(branch_name)) not between 2 and 120 then
    raise exception 'Business and branch names must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.businesses b where b.owner_user_id = (select auth.uid())
  ) then
    raise exception 'This account already owns a business' using errcode = '23505';
  end if;

  branch_code := upper(left(regexp_replace(btrim(branch_name), '[^A-Za-z0-9]', '', 'g'), 3));
  if char_length(branch_code) < 2 then
    branch_code := 'CAB';
  end if;

  insert into public.businesses (owner_user_id, name)
  values ((select auth.uid()), btrim(business_name))
  returning id into new_business_id;

  insert into public.branches (business_id, name, code, address, timezone)
  values (new_business_id, btrim(branch_name), branch_code, coalesce(btrim(branch_address), ''), coalesce(nullif(btrim(branch_timezone), ''), 'Asia/Jakarta'))
  returning id into new_branch_id;

  return query select new_business_id, new_branch_id;
end;
$$;

revoke all on function private.can_access_business(uuid) from public, anon;
revoke all on function private.can_access_branch(uuid, uuid) from public, anon;
revoke all on function private.has_business_role(uuid, text[]) from public, anon;
revoke all on function private.has_branch_role(uuid, uuid, text[]) from public, anon;
grant execute on function private.can_access_business(uuid) to authenticated;
grant execute on function private.can_access_branch(uuid, uuid) to authenticated;
grant execute on function private.has_business_role(uuid, text[]) to authenticated;
grant execute on function private.has_branch_role(uuid, uuid, text[]) to authenticated;
revoke all on function public.create_business_with_branch(text, text, text, text) from public, anon;
grant execute on function public.create_business_with_branch(text, text, text, text) to authenticated;

alter table public.businesses enable row level security;
alter table public.branches enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.dining_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.order_payments enable row level security;
alter table public.kitchen_jobs enable row level security;
alter table public.audit_events enable row level security;

revoke all on public.businesses, public.branches, public.staff_accounts, public.categories,
  public.products, public.dining_tables, public.orders, public.order_items,
  public.payment_attempts, public.order_payments, public.kitchen_jobs, public.audit_events
from anon, authenticated;

grant select on public.businesses, public.branches, public.staff_accounts, public.categories,
  public.products, public.dining_tables, public.orders, public.order_items,
  public.payment_attempts, public.order_payments, public.kitchen_jobs, public.audit_events
 to authenticated;
grant update (name, timezone) on public.businesses to authenticated;
grant update (name, address, status, timezone, tax_rate, service_rate, tax_applies_to, service_applies_to, config_version) on public.branches to authenticated;
grant insert, update, delete on public.staff_accounts, public.categories, public.products, public.dining_tables to authenticated;

create policy businesses_read_member on public.businesses
for select to authenticated
using (private.can_access_business(id));
create policy businesses_update_owner on public.businesses
for update to authenticated
using (private.has_business_role(id, array['owner']))
with check (private.has_business_role(id, array['owner']));

create policy branches_read_member on public.branches
for select to authenticated
using (private.can_access_branch(business_id, id));
create policy branches_update_manager on public.branches
for update to authenticated
using (private.has_branch_role(business_id, id, array['owner', 'manager']))
with check (private.has_branch_role(business_id, id, array['owner', 'manager']));

create policy staff_read_business on public.staff_accounts
for select to authenticated
using (private.can_access_business(business_id));
create policy staff_insert_manager on public.staff_accounts
for insert to authenticated
with check (
  private.has_branch_role(business_id, branch_id, array['owner', 'manager'])
  and (role <> 'manager' or private.has_business_role(business_id, array['owner']))
);
create policy staff_update_manager on public.staff_accounts
for update to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']))
with check (
  private.has_branch_role(business_id, branch_id, array['owner', 'manager'])
  and (role <> 'manager' or private.has_business_role(business_id, array['owner']))
);
create policy staff_delete_manager on public.staff_accounts
for delete to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));

create policy categories_read_branch on public.categories
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy categories_insert_manager on public.categories
for insert to authenticated
with check (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));
create policy categories_update_manager on public.categories
for update to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']))
with check (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));
create policy categories_delete_manager on public.categories
for delete to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));

create policy products_read_branch on public.products
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy products_insert_manager on public.products
for insert to authenticated
with check (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));
create policy products_update_manager on public.products
for update to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']))
with check (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));
create policy products_delete_manager on public.products
for delete to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));

create policy tables_read_branch on public.dining_tables
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy tables_insert_manager on public.dining_tables
for insert to authenticated
with check (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));
create policy tables_update_manager on public.dining_tables
for update to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']))
with check (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));
create policy tables_delete_manager on public.dining_tables
for delete to authenticated
using (private.has_branch_role(business_id, branch_id, array['owner', 'manager']));

create policy orders_read_branch on public.orders
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy order_items_read_branch on public.order_items
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy payment_attempts_read_branch on public.payment_attempts
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy order_payments_read_branch on public.order_payments
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy kitchen_jobs_read_branch on public.kitchen_jobs
for select to authenticated
using (private.can_access_branch(business_id, branch_id));
create policy audit_read_managers on public.audit_events
for select to authenticated
using (
  (branch_id is null and private.has_business_role(business_id, array['owner', 'manager']))
  or (branch_id is not null and private.has_branch_role(business_id, branch_id, array['owner', 'manager']))
);
