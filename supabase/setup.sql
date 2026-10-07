-- Run once in the Supabase project's SQL Editor. No administrator keys are put in the website.
-- Dedicated public image bucket. Anonymous users can create files, but cannot list, edit, or delete files.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('blog-images','blog-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "blog_images_anonymous_insert" on storage.objects;
create policy "blog_images_anonymous_insert"
on storage.objects for insert to anon
with check (
 bucket_id='blog-images'
 and name ~ '^uploads/[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
);
commit;