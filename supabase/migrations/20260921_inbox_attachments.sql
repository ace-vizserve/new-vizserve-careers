-- Inbox attachments: metadata rows in Postgres, file bytes in Storage.
--
-- IMAP sync (lib/imap.ts) writes one row per part that mailparser reports
-- as an attachment. Inline parts (the `cid:` images an HTML signature
-- references) get is_inline = true and keep their content_id so the body
-- HTML can be rewritten to point at /api/inbox/attachments/<id>.

-- Private bucket — attachments are candidate data, never public URLs.
insert into storage.buckets (id, name, public)
values ('inbox-attachments', 'inbox-attachments', false)
on conflict (id) do nothing;

-- message_id must match inbox_messages.id exactly, whatever that type is.
do $$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into id_type
    from pg_attribute a
   where a.attrelid = 'public.inbox_messages'::regclass
     and a.attname = 'id'
     and a.attnum > 0;

  if id_type is null then
    raise exception 'public.inbox_messages.id not found';
  end if;

  execute format($fmt$
    create table if not exists public.inbox_attachments (
      id            uuid primary key default gen_random_uuid(),
      message_id    %s not null references public.inbox_messages(id) on delete cascade,
      filename      text not null,
      content_type  text not null default 'application/octet-stream',
      size_bytes    bigint not null default 0,
      storage_path  text not null,
      content_id    text,
      is_inline     boolean not null default false,
      created_at    timestamptz not null default now()
    )
  $fmt$, id_type);
end $$;

create index if not exists inbox_attachments_message_id_idx
  on public.inbox_attachments (message_id);

-- Inline lookup during cid rewriting is always scoped to one message.
create index if not exists inbox_attachments_content_id_idx
  on public.inbox_attachments (message_id, content_id)
  where content_id is not null;

-- Reads and writes go through the service-role client in API routes,
-- which bypasses RLS. Enable it with no policies so an anon/authed
-- client can never reach these rows directly.
alter table public.inbox_attachments enable row level security;
