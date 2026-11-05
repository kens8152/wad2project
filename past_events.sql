-- =============================================================================
-- past_events.sql
-- ALL past events live in their own dedicated tables, separate from the
-- regular (upcoming) `events` table:
--
--   past_events          -- past event rows (same columns as `events`)
--   past_event_artists   -- links past events to artists
--
-- Rules:
--   * every DUMMY (act-*) artist gets exactly 1 past event
--   * every REAL artist gets several (2..4) past events
--
-- Safe to re-run: wipes its own generated rows first, then recreates them.
-- Run in the Supabase SQL Editor.
-- =============================================================================

-- 0. The new tables (mirror the shape of events / event_artists)
create table if not exists past_events (
  id          text primary key,
  title       text,
  image       text,
  genre_id    text references genres(id),
  venue_id    text references venues(id),
  headliner_id text references artists(id),
  day_offset  int,
  dow         text,
  day_number  int,
  month       text,
  date_label  text,
  start_time  text,
  time_label  text,
  price       int,
  going       int,
  tag         text
);

create table if not exists past_event_artists (
  event_id  text not null references past_events(id) on delete cascade,
  artist_id text not null references artists(id)      on delete cascade,
  primary key (event_id, artist_id)
);

-- 1. Clean up any previous run (idempotent)
delete from past_event_artists;
delete from past_events;

-- ---------------------------------------------------------------------------
-- 2. DUMMY artists: exactly ONE past event each
-- ---------------------------------------------------------------------------
with dummies as (
  select
    a.id                                              as artist_id,
    a.name                                            as artist_name,
    a.genre_id                                        as genre_id,
    (row_number() over (order by a.id)) - 1           as idx
  from artists a
  where a.id like 'act-%'
),
venue_list as (
  select
    v.id                                              as venue_id,
    (row_number() over (order by v.id)) - 1           as vidx,
    count(*) over ()                                  as vcount
  from venues v
),
built as (
  select
    'past-' || d.artist_id                            as event_id,
    d.artist_id, d.artist_name, d.genre_id,
    vl.venue_id,
    -( 7 + ((d.idx * 11) % 114) )                     as day_offset
  from dummies d
  join venue_list vl on vl.vidx = (d.idx % vl.vcount)
),
dated as (
  select b.*, (current_date + b.day_offset::int) as event_date from built b
)
insert into past_events (
  id, title, image, genre_id, venue_id, headliner_id,
  day_offset, dow, day_number, month, date_label,
  start_time, time_label, price, going, tag
)
select
  d.event_id,
  d.artist_name || ' (live)',
  null,
  d.genre_id,
  d.venue_id,
  d.artist_id,
  d.day_offset::int,
  upper(to_char(d.event_date, 'Dy')),
  extract(day from d.event_date)::int,
  upper(to_char(d.event_date, 'Mon')),
  to_char(d.event_date, 'Dy DD Mon'),
  '20:00',
  '8:00 PM',
  0,
  (40 + (abs(hashtext(d.artist_id)) % 160)),
  null
from dated d;

-- ---------------------------------------------------------------------------
-- 3. REAL artists: SEVERAL past events each (2..4, deterministic per artist)
--    We expand each real artist into N rows using a generated series, then
--    build one past event per (artist, n).
-- ---------------------------------------------------------------------------
with reals as (
  select
    a.id                                              as artist_id,
    a.name                                            as artist_name,
    a.genre_id                                        as genre_id,
    (row_number() over (order by a.id)) - 1           as idx,
    -- 2..4 events, stable per artist
    2 + (abs(hashtext(a.id)) % 3)                     as n_events
  from artists a
  where a.id not like 'act-%'
),
venue_list as (
  select
    v.id                                              as venue_id,
    (row_number() over (order by v.id)) - 1           as vidx,
    count(*) over ()                                  as vcount
  from venues v
),
expanded as (
  select
    r.artist_id, r.artist_name, r.genre_id, r.idx,
    gs.n                                              as n            -- 1..n_events
  from reals r
  cross join lateral generate_series(1, r.n_events) as gs(n)
),
built as (
  select
    'past-' || e.artist_id || '-' || e.n             as event_id,
    e.artist_id, e.artist_name, e.genre_id, e.n,
    vl.venue_id,
    -- each of an artist's shows lands on a different past date
    -( 10 + (e.n * 23) + ((e.idx * 7) % 40) )        as day_offset
  from expanded e
  join venue_list vl
    on vl.vidx = ((e.idx + e.n) % vl.vcount)
),
dated as (
  select b.*, (current_date + b.day_offset::int) as event_date from built b
)
insert into past_events (
  id, title, image, genre_id, venue_id, headliner_id,
  day_offset, dow, day_number, month, date_label,
  start_time, time_label, price, going, tag
)
select
  d.event_id,
  d.artist_name || ' (live)',
  null,
  d.genre_id,
  d.venue_id,
  d.artist_id,
  d.day_offset::int,
  upper(to_char(d.event_date, 'Dy')),
  extract(day from d.event_date)::int,
  upper(to_char(d.event_date, 'Mon')),
  to_char(d.event_date, 'Dy DD Mon'),
  '20:00',
  '8:00 PM',
  (15 + (abs(hashtext(d.event_id)) % 26)),            -- price 15..40
  (50 + (abs(hashtext(d.event_id)) % 200)),           -- going 50..249
  null
from dated d;

-- 4. Link every past event to its headliner artist
insert into past_event_artists (event_id, artist_id)
select id, headliner_id from past_events;

-- 5. Quick checks
-- dummy artists: should all be exactly 1
-- select count(*) from (
--   select a.id, count(e.id) c
--   from artists a
--   join past_event_artists pea on pea.artist_id = a.id
--   join past_events e on e.id = pea.event_id
--   where a.id like 'act-%' group by a.id having count(e.id) <> 1
-- ) bad;   -- expect 0
--
-- real artists: should each be 2..4
-- select a.id, count(e.id) past_events
--   from artists a
--   join past_event_artists pea on pea.artist_id = a.id
--   join past_events e on e.id = pea.event_id
--   where a.id not like 'act-%' group by a.id order by a.id;
