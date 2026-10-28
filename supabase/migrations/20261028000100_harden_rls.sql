-- Fixes from the Supabase security and performance advisors.

-- Helper and trigger functions are not part of the public API: move them to a
-- schema PostgREST does not expose. Policies and triggers reference functions
-- by OID, so they keep working.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.handle_new_user()             set schema private;
alter function public.handle_new_garage()           set schema private;
alter function public.prevent_used_setup_update()   set schema private;
alter function public.is_garage_member(uuid)        set schema private;
alter function public.is_garage_owner(uuid)         set schema private;
alter function public.storage_garage_id(text)       set schema private;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_garage_member(uuid)  to authenticated;
grant execute on function private.is_garage_owner(uuid)   to authenticated;
grant execute on function private.storage_garage_id(text) to authenticated;

-- Evaluate auth.uid() once per query instead of once per row.
alter policy "own profile" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "members read garage" on public.garages
  using (private.is_garage_member(id) or created_by = (select auth.uid()));
alter policy "create garage" on public.garages
  with check (created_by = (select auth.uid()));

-- One permissive policy per action.
drop policy "owners manage members" on public.garage_members;
create policy "owners add members" on public.garage_members
  for insert to authenticated with check (private.is_garage_owner(garage_id));
create policy "owners update members" on public.garage_members
  for update to authenticated using (private.is_garage_owner(garage_id)) with check (private.is_garage_owner(garage_id));
create policy "owners remove members" on public.garage_members
  for delete to authenticated using (private.is_garage_owner(garage_id));

drop policy "manage own track layouts" on public.track_layouts;
create policy "add own track layouts" on public.track_layouts
  for insert to authenticated
  with check (exists (select 1 from public.tracks t where t.id = track_id
                      and t.created_by_garage_id is not null and private.is_garage_member(t.created_by_garage_id)));
create policy "edit own track layouts" on public.track_layouts
  for update to authenticated
  using (exists (select 1 from public.tracks t where t.id = track_id
                 and t.created_by_garage_id is not null and private.is_garage_member(t.created_by_garage_id)));
create policy "delete own track layouts" on public.track_layouts
  for delete to authenticated
  using (exists (select 1 from public.tracks t where t.id = track_id
                 and t.created_by_garage_id is not null and private.is_garage_member(t.created_by_garage_id)));

-- Indexes for foreign keys.
create index data_imports_uploaded_by_idx           on public.data_imports (uploaded_by);
create index drivers_user_id_idx                    on public.drivers (user_id);
create index events_track_id_idx                    on public.events (track_id);
create index expenses_event_id_idx                  on public.expenses (event_id);
create index expenses_maintenance_record_id_idx     on public.expenses (maintenance_record_id);
create index expenses_part_id_idx                   on public.expenses (part_id);
create index garages_created_by_idx                 on public.garages (created_by);
create index maintenance_records_garage_id_idx      on public.maintenance_records (garage_id);
create index seasons_driver_id_idx                  on public.seasons (driver_id);
create index sessions_data_import_id_idx            on public.sessions (data_import_id);
create index sessions_track_layout_id_idx           on public.sessions (track_layout_id);
create index setup_templates_kart_id_idx            on public.setup_templates (kart_id);
create index setup_templates_track_id_idx           on public.setup_templates (track_id);
create index setups_parent_setup_id_idx             on public.setups (parent_setup_id);
create index setups_template_id_idx                 on public.setups (template_id);
create index tracks_created_by_garage_id_idx        on public.tracks (created_by_garage_id);
