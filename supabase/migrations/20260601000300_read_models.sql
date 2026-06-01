-- Read models optimized for mobile/web clients.

create or replace view public.event_cards
with (security_invoker = true)
as
select
  e.id,
  e.organizer_id,
  p.display_name as organizer_name,
  e.category_id,
  coalesce(ec.name, 'Other') as category_name,
  e.title,
  e.description,
  e.starts_at,
  e.ends_at,
  e.visibility,
  e.status,
  e.requires_approval,
  e.hide_attendees,
  e.max_attendees,
  e.attendees_count,
  e.pending_requests_count,
  e.cover_image_url,
  e.created_at,
  e.updated_at,
  e.deleted_at,
  el.location_name,
  el.address,
  el.city,
  el.country,
  st_y(el.geo_point::geometry) as latitude,
  st_x(el.geo_point::geometry) as longitude
from public.events e
join public.profiles p on p.id = e.organizer_id
left join public.event_categories ec on ec.id = e.category_id
left join public.event_locations el on el.event_id = e.id;

grant select on public.event_cards to authenticated;
