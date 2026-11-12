create extension if not exists pgcrypto;

create table if not exists public.users_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  profile_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_file_name text not null,
  uploaded_file_url text not null,
  extracted_resume_text text not null default '',
  file_type text not null check (file_type in ('PDF', 'DOCX')),
  upload_date timestamptz not null default now(),
  resume_status text not null default 'uploaded'
    check (resume_status in ('uploaded', 'processing', 'analyzed', 'failed')),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null,
  ats_score integer not null check (ats_score between 0 and 100),
  skills_score integer not null check (skills_score between 0 and 100),
  keyword_match_score integer not null check (keyword_match_score between 0 and 100),
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  missing_skills text[] not null default '{}',
  improvement_suggestions text[] not null default '{}',
  job_role_recommendations jsonb not null default '[]'::jsonb,
  analysis_date timestamptz not null default now(),
  constraint resume_analyses_resume_user_fk
    foreign key (resume_id, user_id)
    references public.resumes (id, user_id)
    on delete cascade
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  degree text,
  department text,
  graduation_year integer,
  cgpa numeric(4, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null,
  job_title text,
  employment_type text,
  start_date date,
  end_date date,
  technologies text[] not null default '{}',
  responsibilities text[] not null default '{}',
  achievements text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_name text not null,
  description text,
  technologies text[] not null default '{}',
  github_url text,
  live_demo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_name text not null,
  skill_category text,
  proficiency_level text,
  created_at timestamptz not null default now()
);

create index if not exists resumes_user_upload_date_idx
  on public.resumes (user_id, upload_date desc);
create index if not exists resume_analyses_user_analysis_date_idx
  on public.resume_analyses (user_id, analysis_date desc);
create index if not exists resume_analyses_resume_id_idx
  on public.resume_analyses (resume_id);
create index if not exists education_user_id_idx on public.education (user_id);
create index if not exists experience_user_id_idx on public.experience (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists skills_user_id_idx on public.skills (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_profiles_set_updated_at on public.users_profiles;
create trigger users_profiles_set_updated_at
before update on public.users_profiles
for each row execute function public.set_updated_at();

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users_profiles as profile (user_id, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = coalesce(profile.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.create_user_profile();

insert into public.users_profiles (user_id, full_name, email)
select
  id,
  nullif(raw_user_meta_data ->> 'full_name', ''),
  email
from auth.users
on conflict (user_id) do nothing;

alter table public.users_profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.education enable row level security;
alter table public.experience enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;

revoke all on public.users_profiles, public.resumes, public.resume_analyses,
  public.education, public.experience, public.projects, public.skills from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.users_profiles, public.resumes,
  public.resume_analyses, public.education, public.experience, public.projects,
  public.skills to authenticated;

create policy "Users manage their own profile"
  on public.users_profiles for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own resumes"
  on public.resumes for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own resume analyses"
  on public.resume_analyses for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own education"
  on public.education for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own experience"
  on public.experience for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own projects"
  on public.projects for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own skills"
  on public.skills for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read their own resume files"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users upload files to their own resume folder"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update files in their own resume folder"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete files in their own resume folder"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
