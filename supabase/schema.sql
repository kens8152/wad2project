-- Riffle database schema
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then run seed.sql the same way to add the artists, events and forum posts.

-- =========================================================================
-- 1. Catalogue: genres, venues, artists, events (everyone can read)
-- =========================================================================

create table public.genres (
  id    text primary key,
  name  text not null,
  color text not null
);

create table public.venues (
  id      text primary key,
  name    text not null,
  address text
);

create table public.artists (
  id        text primary key,
  name      text not null,
  genre_id  text references public.genres (id),
  tag       text,
  bio       text,
  hometown  text,
  formed    integer,
  socials   jsonb not null default '{}'::jsonb,
  image_url text,
  tracks    jsonb not null default '[]'::jsonb -- up to 3 songs: [{ "id": Apple Music track id, "title" }] for the matchmaking previews
);

create table public.events (
  id           text primary key,
  title        text not null,
  image        text,
  genre_id     text references public.genres (id),
  venue_id     text references public.venues (id),
  headliner_id text references public.artists (id),
  day_offset   integer,
  dow          text,
  day_number   integer,
  month        text,
  date_label   text,
  start_time   time,
  time_label   text,
  price        numeric,
  going        integer not null default 0,
  tag          text
);

create table public.event_artists (
  event_id  text not null references public.events (id) on delete cascade,
  artist_id text not null references public.artists (id) on delete cascade,
  primary key (event_id, artist_id)
);

-- =========================================================================
-- 2. User profiles (filled in during onboarding)
-- =========================================================================

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text,
  genres               text[] not null default '{}',
  favourite_songs      text,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now()
);

-- =========================================================================
-- 3. Forum: tags, posts, replies, votes, saved posts
-- =========================================================================

create table public.tags (
  name        text primary key,
  description text
);

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid default auth.uid() references auth.users (id) on delete set null,
  username   text,
  title      text not null,
  content    text,
  tags       text[] not null default '{}',
  upvotes    integer not null default 0,
  downvotes  integer not null default 0,
  created_at timestamptz not null default now(),
  event_ids  text[] not null default '{}',
  artist_ids text[] not null default '{}',
  images     text[] not null default '{}',
  song       jsonb
);

create table public.replies (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  parent_id  uuid references public.replies (id) on delete cascade,
  user_id    uuid default auth.uid() references auth.users (id) on delete set null,
  username   text,
  content    text not null,
  upvotes    integer not null default 0,
  downvotes  integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote    smallint not null check (vote in (-1, 1)),
  primary key (post_id, user_id)
);

create table public.reply_votes (
  reply_id uuid not null references public.replies (id) on delete cascade,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote     smallint not null check (vote in (-1, 1)),
  primary key (reply_id, user_id)
);

create table public.saved_posts (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Keeps the upvote / downvote counts on posts and replies up to date when someone votes.
-- (Runs as the table owner, because a voter is not allowed to edit other people's posts.)
create or replace function public.apply_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_up   int := case when tg_op in ('UPDATE', 'DELETE') and old.vote = 1  then 1 else 0 end;
  old_down int := case when tg_op in ('UPDATE', 'DELETE') and old.vote = -1 then 1 else 0 end;
  new_up   int := case when tg_op in ('INSERT', 'UPDATE') and new.vote = 1  then 1 else 0 end;
  new_down int := case when tg_op in ('INSERT', 'UPDATE') and new.vote = -1 then 1 else 0 end;
begin
  if tg_table_name = 'post_votes' then
    update public.posts
       set upvotes = greatest(upvotes + new_up - old_up, 0),
           downvotes = greatest(downvotes + new_down - old_down, 0)
     where id = coalesce(new.post_id, old.post_id);
  else
    update public.replies
       set upvotes = greatest(upvotes + new_up - old_up, 0),
           downvotes = greatest(downvotes + new_down - old_down, 0)
     where id = coalesce(new.reply_id, old.reply_id);
  end if;
  return null;
end;
$$;

create trigger post_votes_count
after insert or update or delete on public.post_votes
for each row execute function public.apply_vote_change();

create trigger reply_votes_count
after insert or update or delete on public.reply_votes
for each row execute function public.apply_vote_change();

-- =========================================================================
-- 4. Artist matchmaking, saved artists and followed artists
-- =========================================================================

-- One row per artist a user has been shown. action: null = waiting in today's batch,
-- 'follow' = liked ("Like" in the app), 'skip' = skipped.
create table public.matchmaking_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  artist_id  text not null references public.artists (id) on delete cascade,
  action     text check (action in ('follow', 'skip')),
  created_at timestamptz not null default now(),
  unique (user_id, artist_id)
);

create table public.saved_artists (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  artist_id text not null references public.artists (id) on delete cascade,
  saved_at  timestamptz not null default now(),
  unique (user_id, artist_id)
);

create table public.followed_artists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  artist_id   text not null references public.artists (id) on delete cascade,
  followed_at timestamptz not null default now(),
  unique (user_id, artist_id)
);

-- =========================================================================
-- 5. Access rules (Row Level Security)
-- =========================================================================

alter table public.genres              enable row level security;
alter table public.venues              enable row level security;
alter table public.artists             enable row level security;
alter table public.events              enable row level security;
alter table public.event_artists       enable row level security;
alter table public.tags                enable row level security;
alter table public.profiles            enable row level security;
alter table public.posts               enable row level security;
alter table public.replies             enable row level security;
alter table public.post_votes          enable row level security;
alter table public.reply_votes         enable row level security;
alter table public.saved_posts         enable row level security;
alter table public.matchmaking_actions enable row level security;
alter table public.saved_artists       enable row level security;
alter table public.followed_artists    enable row level security;

-- Catalogue and forum: anyone (even logged out) can read
create policy "Anyone can read genres"        on public.genres        for select using (true);
create policy "Anyone can read venues"        on public.venues        for select using (true);
create policy "Anyone can read artists"       on public.artists       for select using (true);
create policy "Anyone can read events"        on public.events        for select using (true);
create policy "Anyone can read event artists" on public.event_artists for select using (true);
create policy "Anyone can read tags"          on public.tags          for select using (true);
create policy "Anyone can read posts"         on public.posts         for select using (true);
create policy "Anyone can read replies"       on public.replies       for select using (true);

-- Posts and replies: signed-in users write their own
create policy "Users create their own posts" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "Users edit their own posts"   on public.posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete their own posts" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "Users create their own replies" on public.replies for insert to authenticated with check (user_id = auth.uid());
create policy "Users edit their own replies"   on public.replies for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users delete their own replies" on public.replies for delete to authenticated using (user_id = auth.uid());

-- Personal tables: each signed-in user only sees and changes their own rows
create policy "Users manage their own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage their own post votes" on public.post_votes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own reply votes" on public.reply_votes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own saved posts" on public.saved_posts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own matchmaking" on public.matchmaking_actions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own saved artists" on public.saved_artists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their own followed artists" on public.followed_artists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Table permissions for the app's two roles (logged out = anon, logged in = authenticated)
grant usage on schema public to anon, authenticated;
grant select on public.genres, public.venues, public.artists, public.events, public.event_artists,
                public.tags, public.posts, public.replies
  to anon, authenticated;
grant insert, update, delete on public.posts, public.replies to authenticated;
grant select, insert, update, delete on public.profiles, public.post_votes, public.reply_votes,
                public.saved_posts, public.matchmaking_actions, public.saved_artists,
                public.followed_artists
  to authenticated;

-- =========================================================================
-- 6. Storage: photos attached to forum posts
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Files are stored as <user id>/<file name>, so users can only upload to and delete from their own folder
create policy "Users upload their own post images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own post images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
