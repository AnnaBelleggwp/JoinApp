drop function if exists public.nearby_events(
  double precision,
  double precision,
  integer,
  timestamptz,
  uuid,
  integer
);

create or replace function public.nearby_events(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_meters integer default 10000,
  p_starts_after timestamptz default now(),
  p_category_id uuid default null,
  p_limit integer default 50,
  p_query text default null,
  p_category_name text default null,
  p_starts_before timestamptz default null,
  p_min_attendees integer default null,
  p_max_attendees_count integer default null,
  p_has_available_seats boolean default null
)
returns table (
  id uuid,
  organizer_id uuid,
  organizer_name text,
  category_id uuid,
  category_name text,
  title text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  visibility public.event_visibility,
  status public.event_status,
  requires_approval boolean,
  hide_attendees boolean,
  max_attendees integer,
  attendees_count integer,
  pending_requests_count integer,
  cover_image_url text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  location_name text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  distance_meters double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with origin as (
    select
      case
        when p_latitude is not null and p_longitude is not null
          then st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
        else null::geography
      end as point
  ),
  normalized as (
    select
      nullif(trim(coalesce(p_query, '')), '') as query,
      nullif(trim(coalesce(p_category_name, '')), '') as category_name
  )
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
    st_x(el.geo_point::geometry) as longitude,
    case
      when origin.point is null then null::double precision
      else st_distance(el.geo_point, origin.point)
    end as distance_meters
  from public.events e
  join public.profiles p on p.id = e.organizer_id
  join public.event_locations el on el.event_id = e.id
  left join public.event_categories ec on ec.id = e.category_id
  cross join origin
  cross join normalized n
  where e.deleted_at is null
    and e.status = 'published'
    and e.starts_at >= coalesce(p_starts_after, now())
    and (p_starts_before is null or e.starts_at < p_starts_before)
    and (p_category_id is null or e.category_id = p_category_id)
    and (n.category_name is null or coalesce(ec.name, 'Other') = n.category_name)
    and (p_min_attendees is null or e.attendees_count >= greatest(p_min_attendees, 0))
    and (p_max_attendees_count is null or e.attendees_count <= greatest(p_max_attendees_count, 0))
    and (
      p_has_available_seats is null
      or p_has_available_seats = false
      or e.max_attendees is null
      or e.attendees_count < e.max_attendees
    )
    and (
      n.query is null
      or e.title ilike '%' || n.query || '%'
      or coalesce(e.description, '') ilike '%' || n.query || '%'
      or el.location_name ilike '%' || n.query || '%'
      or coalesce(el.address, '') ilike '%' || n.query || '%'
      or coalesce(el.city, '') ilike '%' || n.query || '%'
    )
    and (
      origin.point is null
      or st_dwithin(el.geo_point, origin.point, least(greatest(coalesce(p_radius_meters, 10000), 100), 100000))
    )
  order by
    case when origin.point is null then null else st_distance(el.geo_point, origin.point) end asc nulls last,
    e.starts_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.nearby_events(
  double precision,
  double precision,
  integer,
  timestamptz,
  uuid,
  integer,
  text,
  text,
  timestamptz,
  integer,
  integer,
  boolean
) from public;

grant execute on function public.nearby_events(
  double precision,
  double precision,
  integer,
  timestamptz,
  uuid,
  integer,
  text,
  text,
  timestamptz,
  integer,
  integer,
  boolean
) to authenticated;
