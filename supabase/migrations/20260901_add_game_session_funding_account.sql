alter table public.game_sessions
add column if not exists funding_account_id uuid
references public.accounts(id)
on delete restrict;

create index if not exists game_sessions_funding_account_id_idx
on public.game_sessions(funding_account_id);