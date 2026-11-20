-- Ração Certa: contas e casas no Supabase.
-- Cola tudo no SQL Editor do projeto e carrega em "Run". Pode correr-se mais do que uma vez.

-- Uma linha por conta, com a casa toda (nome, animais, rações) em JSON.
create table if not exists public.casas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.casas enable row level security;

-- Os projetos novos do Supabase não dão acesso às tabelas por omissão: só quem tem sessão iniciada.
grant select, insert, update, delete on public.casas to authenticated;
revoke all on public.casas from anon;

-- Cada pessoa só vê e altera a sua casa.
drop policy if exists "ler a minha casa" on public.casas;
create policy "ler a minha casa" on public.casas
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "criar a minha casa" on public.casas;
create policy "criar a minha casa" on public.casas
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "alterar a minha casa" on public.casas;
create policy "alterar a minha casa" on public.casas 
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "apagar a minha casa" on public.casas;
create policy "apagar a minha casa" on public.casas
  for delete to authenticated using ((select auth.uid()) = user_id);

-- "Apagar conta" na app (a App Store obriga a isto). Apaga o utilizador; a casa vai junto (on delete cascade).
create or replace function public.apagar_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sem sessão';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.apagar_conta() from public, anon;
grant execute on function public.apagar_conta() to authenticated;
