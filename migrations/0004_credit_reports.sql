create table if not exists credit_reports (
  id text not null,
  user_id text not null,
  uploaded_at timestamptz not null,
  report_date text,
  payload text not null,
  primary key (user_id, id)
);

create index if not exists credit_reports_user_uploaded_idx
  on credit_reports (user_id, uploaded_at desc);
