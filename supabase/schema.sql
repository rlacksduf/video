create extension if not exists pgcrypto;

create type public.video_status as enum ('published','private','deleted','processing');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '사용자',
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  suspended_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  thumbnail_url text,
  video_url text not null,
  category text not null default '기타',
  tags text[] not null default '{}',
  status public.video_status not null default 'published',
  views bigint not null default 0,
  likes_count bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.video_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,video_id)
);

create table if not exists public.saved_videos (
  user_id uuid references public.profiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,video_id)
);

create table if not exists public.watch_history (
  user_id uuid references public.profiles(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  progress_seconds numeric not null default 0,
  watched_at timestamptz not null default now(),
  primary key(user_id,video_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comment_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,comment_id)
);

create table if not exists public.search_history (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

create index if not exists videos_created_at_idx on public.videos(created_at desc);
create index if not exists videos_views_idx on public.videos(views desc);
create index if not exists videos_category_idx on public.videos(category);
create index if not exists comments_video_idx on public.comments(video_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.saved_videos enable row level security;
alter table public.watch_history enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.search_history enable row level security;

create policy "public profiles read" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

create policy "published videos public read" on public.videos for select using (status='published' or owner_id=auth.uid());
create policy "own videos insert" on public.videos for insert to authenticated with check (owner_id=auth.uid());
create policy "own videos update" on public.videos for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());

create policy "likes read" on public.video_likes for select using (true);
create policy "own likes insert" on public.video_likes for insert to authenticated with check (auth.uid()=user_id);
create policy "own likes delete" on public.video_likes for delete to authenticated using (auth.uid()=user_id);

create policy "saved own read" on public.saved_videos for select to authenticated using (auth.uid()=user_id);
create policy "saved own insert" on public.saved_videos for insert to authenticated with check (auth.uid()=user_id);
create policy "saved own delete" on public.saved_videos for delete to authenticated using (auth.uid()=user_id);

create policy "history own" on public.watch_history for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create policy "comments public read" on public.comments for select using (true);
create policy "comments auth insert" on public.comments for insert to authenticated with check (auth.uid()=user_id);
create policy "comments own update" on public.comments for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "comments own delete" on public.comments for delete to authenticated using (auth.uid()=user_id);

create policy "comment likes read" on public.comment_likes for select using (true);
create policy "comment likes insert" on public.comment_likes for insert to authenticated with check (auth.uid()=user_id);
create policy "comment likes delete" on public.comment_likes for delete to authenticated using (auth.uid()=user_id);

create policy "search own" on public.search_history for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

insert into storage.buckets(id,name,public) values ('videos','videos',true) on conflict do nothing;
insert into storage.buckets(id,name,public) values ('thumbnails','thumbnails',true) on conflict do nothing;

create policy "public video files" on storage.objects for select using (bucket_id='videos');
create policy "auth video upload" on storage.objects for insert to authenticated with check (bucket_id='videos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "own video delete" on storage.objects for delete to authenticated using (bucket_id='videos' and owner_id=auth.uid());
create policy "public thumbs" on storage.objects for select using (bucket_id='thumbnails');
create policy "auth thumb upload" on storage.objects for insert to authenticated with check (bucket_id='thumbnails' and (storage.foldername(name))[1]=auth.uid()::text);
