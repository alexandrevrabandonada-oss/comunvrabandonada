-- Perfil gratuito da Rádio V1.
-- Esta migration é aditiva, idempotente e restrita aos dois buckets de Rádio.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'radio-private-originals',
    'radio-private-originals',
    false,
    47185920,
    array[
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/flac'
    ]::text[]
  ),
  (
    'radio-public-audio',
    'radio-public-audio',
    true,
    47185920,
    array[
      'audio/mpeg',
      'application/json',
      'text/vtt',
      'text/plain'
    ]::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types
where storage.buckets.id in (
  'radio-private-originals',
  'radio-public-audio'
)
  and (
    storage.buckets.public is distinct from excluded.public
    or storage.buckets.file_size_limit is distinct from excluded.file_size_limit
    or storage.buckets.allowed_mime_types is distinct from excluded.allowed_mime_types
  );
