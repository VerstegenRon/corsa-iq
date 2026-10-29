-- Billing: the Stripe customer and subscription per garage. Only the server writes here (the Stripe
-- webhook, with the secret key); owners read it for the subscription page.
create table public.garage_billing (
  garage_id              uuid primary key references public.garages (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text,
  price_lookup_key       text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);
alter table public.garage_billing enable row level security;
create policy "owners read billing" on public.garage_billing
  for select to authenticated using (private.is_garage_owner(garage_id));
revoke insert, update, delete on public.garage_billing from anon, authenticated;

-- The plan comes from Stripe only: owners may still rename the garage, not change its plan.
revoke update on public.garages from authenticated;
grant update (name, currency) on public.garages to authenticated;
revoke insert on public.garages from authenticated;
grant insert (name, currency, created_by) on public.garages to authenticated;
