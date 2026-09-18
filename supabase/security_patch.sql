-- XTEN security patch for an EXISTING Supabase project
-- Run in Supabase SQL Editor as one script.
-- This patch does NOT drop is_admin(), so existing policy dependencies are preserved.
-- It also avoids storage.objects.owner_id because Supabase Storage commonly stores it as text.

begin;

-- ---------------------------------------------------------
-- 0) Required tables that current React code uses
-- ---------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'video_status'
  ) then
    create type public.video_status as enum ('published','private','deleted','processing');
  end if;
end $$;

create table if not exists public.image_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  image_url text not null,
  category text not null default '기타',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.video_dislikes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index if not exists image_posts_created_at_idx on public.image_posts(created_at desc);
create index if not exists image_posts_owner_idx on public.image_posts(owner_id);
create index if not exists videos_owner_idx on public.videos(owner_id);
create index if not exists comments_user_idx on public.comments(user_id);

-- ---------------------------------------------------------
-- 1) Admin helper - REPLACE ONLY, never DROP
-- ---------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------
-- 2) Create profile automatically for every new auth user
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), '사용자'),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 3) Block privilege escalation through profiles.role
-- ---------------------------------------------------------
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Normal users can never change role or suspension state.
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'role 변경 권한이 없습니다.';
    end if;

    if new.suspended_until is distinct from old.suspended_until then
      raise exception 'suspended_until 변경 권한이 없습니다.';
    end if;
  end if;

  -- Never allow a profile primary key to be swapped.
  if new.id is distinct from old.id then
    raise exception 'profile id 변경은 허용되지 않습니다.';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_security_fields() from public;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- ---------------------------------------------------------
-- 4) Secure counters: viewers should not get broad UPDATE on videos
-- ---------------------------------------------------------
create or replace function public.increment_video_view(p_video_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_views bigint;
begin
  update public.videos
  set views = views + 1
  where id = p_video_id
    and (
      status = 'published'
      or owner_id = auth.uid()
      or public.is_admin()
    )
  returning views into v_views;

  return v_views;
end;
$$;

revoke all on function public.increment_video_view(uuid) from public;
grant execute on function public.increment_video_view(uuid) to authenticated;

create or replace function public.toggle_video_like(p_video_id uuid)
returns table(liked boolean, likes_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_liked boolean;
  v_count bigint;
begin
  if v_user is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not exists (
    select 1
    from public.videos v
    where v.id = p_video_id
      and (
        v.status = 'published'
        or v.owner_id = v_user
        or public.is_admin()
      )
  ) then
    raise exception '접근할 수 없는 영상입니다.';
  end if;

  if exists (
    select 1
    from public.video_likes vl
    where vl.user_id = v_user
      and vl.video_id = p_video_id
  ) then
    delete from public.video_likes
    where user_id = v_user
      and video_id = p_video_id;

    v_liked := false;
  else
    insert into public.video_likes(user_id, video_id)
    values (v_user, p_video_id)
    on conflict do nothing;

    v_liked := true;
  end if;

  select count(*)::bigint
  into v_count
  from public.video_likes
  where video_id = p_video_id;

  update public.videos
  set likes_count = v_count
  where id = p_video_id;

  return query select v_liked, v_count;
end;
$$;

revoke all on function public.toggle_video_like(uuid) from public;
grant execute on function public.toggle_video_like(uuid) to authenticated;

-- ---------------------------------------------------------
-- 5) Enable RLS everywhere used by the app
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_dislikes enable row level security;
alter table public.saved_videos enable row level security;
alter table public.watch_history enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.search_history enable row level security;
alter table public.image_posts enable row level security;

-- ---------------------------------------------------------
-- 6) Remove ALL old policies on XTEN public tables.
--    This avoids an old permissive policy silently weakening the new ones.
-- ---------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles','videos','video_likes','video_dislikes','saved_videos',
        'watch_history','comments','comment_likes','search_history','image_posts'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------
-- 7) profiles
-- Public profile data is read by VideoDetail for comment authors.
-- Writes remain tightly restricted.
-- ---------------------------------------------------------
create policy "xten profiles read"
on public.profiles
for select
to authenticated
using (true);

create policy "xten profiles own update"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "xten profiles admin delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

-- Do not allow client-side profile INSERT. handle_new_user() creates it.
revoke insert on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant delete on public.profiles to authenticated;

-- ---------------------------------------------------------
-- 8) videos
-- ---------------------------------------------------------
create policy "xten videos read"
on public.videos
for select
to anon, authenticated
using (
  status = 'published'
  or owner_id = auth.uid()
  or public.is_admin()
);

create policy "xten videos own insert"
on public.videos
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "xten videos own or admin update"
on public.videos
for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "xten videos own or admin delete"
on public.videos
for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

revoke all on public.videos from anon;
grant select on public.videos to anon;
revoke all on public.videos from authenticated;
grant select, insert, update, delete on public.videos to authenticated;

-- ---------------------------------------------------------
-- 9) video likes / dislikes
-- ---------------------------------------------------------
create policy "xten video likes own read"
on public.video_likes
for select
to authenticated
using (user_id = auth.uid());

create policy "xten video likes own insert"
on public.video_likes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten video likes own delete"
on public.video_likes
for delete
to authenticated
using (user_id = auth.uid());

create policy "xten video dislikes own read"
on public.video_dislikes
for select
to authenticated
using (user_id = auth.uid());

create policy "xten video dislikes own insert"
on public.video_dislikes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten video dislikes own delete"
on public.video_dislikes
for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.video_likes from anon;
revoke all on public.video_likes from authenticated;
grant select, insert, delete on public.video_likes to authenticated;

revoke all on public.video_dislikes from anon;
revoke all on public.video_dislikes from authenticated;
grant select, insert, delete on public.video_dislikes to authenticated;

-- ---------------------------------------------------------
-- 10) saved videos / watch history
-- ---------------------------------------------------------
create policy "xten saved own read"
on public.saved_videos
for select
to authenticated
using (user_id = auth.uid());

create policy "xten saved own insert"
on public.saved_videos
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten saved own delete"
on public.saved_videos
for delete
to authenticated
using (user_id = auth.uid());

create policy "xten history own select"
on public.watch_history
for select
to authenticated
using (user_id = auth.uid());

create policy "xten history own insert"
on public.watch_history
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten history own update"
on public.watch_history
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "xten history own delete"
on public.watch_history
for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.saved_videos from anon;
revoke all on public.saved_videos from authenticated;
grant select, insert, delete on public.saved_videos to authenticated;

revoke all on public.watch_history from anon;
revoke all on public.watch_history from authenticated;
grant select, insert, update, delete on public.watch_history to authenticated;

-- ---------------------------------------------------------
-- 11) comments / comment likes
-- ---------------------------------------------------------
create policy "xten comments read"
on public.comments
for select
to anon, authenticated
using (true);

create policy "xten comments own insert"
on public.comments
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten comments own or admin update"
on public.comments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "xten comments own or admin delete"
on public.comments
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- VideoDetail counts all comment likes, so SELECT must be readable.
create policy "xten comment likes read"
on public.comment_likes
for select
to authenticated
using (true);

create policy "xten comment likes own insert"
on public.comment_likes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten comment likes own delete"
on public.comment_likes
for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.comments from anon;
grant select on public.comments to anon;
revoke all on public.comments from authenticated;
grant select, insert, update, delete on public.comments to authenticated;

revoke all on public.comment_likes from anon;
revoke all on public.comment_likes from authenticated;
grant select, insert, delete on public.comment_likes to authenticated;

-- ---------------------------------------------------------
-- 12) search history
-- ---------------------------------------------------------
create policy "xten search own select"
on public.search_history
for select
to authenticated
using (user_id = auth.uid());

create policy "xten search own insert"
on public.search_history
for insert
to authenticated
with check (user_id = auth.uid());

create policy "xten search own update"
on public.search_history
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "xten search own delete"
on public.search_history
for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.search_history from anon;
revoke all on public.search_history from authenticated;
grant select, insert, update, delete on public.search_history to authenticated;

-- ---------------------------------------------------------
-- 13) image posts
-- ---------------------------------------------------------
create policy "xten images read"
on public.image_posts
for select
to anon, authenticated
using (true);

create policy "xten images own insert"
on public.image_posts
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "xten images own or admin update"
on public.image_posts
for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "xten images own or admin delete"
on public.image_posts
for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

revoke all on public.image_posts from anon;
grant select on public.image_posts to anon;
revoke all on public.image_posts from authenticated;
grant select, insert, update, delete on public.image_posts to authenticated;

-- ---------------------------------------------------------
-- 14) Storage buckets used by current React code
-- ---------------------------------------------------------
insert into storage.buckets(id, name, public)
values
  ('videos', 'videos', true),
  ('thumbnails', 'thumbnails', true),
  ('images', 'images', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Remove known old/new XTEN storage policies only.
-- We deliberately do NOT wipe unrelated storage policies for other buckets.
drop policy if exists "public video files" on storage.objects;
drop policy if exists "auth video upload" on storage.objects;
drop policy if exists "own video delete" on storage.objects;
drop policy if exists "public thumbs" on storage.objects;
drop policy if exists "auth thumb upload" on storage.objects;

drop policy if exists "avatars_upload_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "images_upload_own" on storage.objects;
drop policy if exists "images_update_own" on storage.objects;
drop policy if exists "images_delete_own" on storage.objects;
drop policy if exists "videos_storage_upload_own" on storage.objects;
drop policy if exists "videos_storage_update_own" on storage.objects;
drop policy if exists "videos_storage_delete_own" on storage.objects;
drop policy if exists "thumbnails_upload_own" on storage.objects;
drop policy if exists "thumbnails_update_own" on storage.objects;
drop policy if exists "thumbnails_delete_own" on storage.objects;

drop policy if exists "xten public media read" on storage.objects;
drop policy if exists "xten media own insert" on storage.objects;
drop policy if exists "xten media own update" on storage.objects;
drop policy if exists "xten media own delete" on storage.objects;

-- Public buckets: objects are readable. Mutations require authentication.
create policy "xten public media read"
on storage.objects
for select
to public
using (bucket_id in ('videos','thumbnails','images','avatars'));

-- Current Upload/Profile/MyPage code always stores files as:
--   <auth.uid()>/<filename>
create policy "xten media own insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('videos','thumbnails','images','avatars')
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

create policy "xten media own update"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('videos','thumbnails','images','avatars')
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id in ('videos','thumbnails','images','avatars')
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

create policy "xten media own delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('videos','thumbnails','images','avatars')
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

commit;
