alter table ledger_transactions add column if not exists needs_review boolean not null default false;
alter table ledger_transactions add column if not exists category_locked boolean not null default false;
