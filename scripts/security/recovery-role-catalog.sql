-- Read-only PostgreSQL role attributes and membership graph; no credentials or GUC values.
with roles as (
  select rolname::text name, rolsuper superuser, rolinherit inherit,
    rolcreaterole create_role, rolcreatedb create_database, rolcanlogin login,
    rolreplication replication, rolbypassrls bypass_rls, rolconnlimit connection_limit,
    case when rolvaliduntil is null then null
      when rolvaliduntil='infinity'::timestamptz then 'infinity'
      when rolvaliduntil='-infinity'::timestamptz then '-infinity'
      else to_char(rolvaliduntil at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end valid_until
  from pg_catalog.pg_roles
), memberships as (
  select pg_catalog.pg_get_userbyid(roleid) role,
    pg_catalog.pg_get_userbyid(member) member,
    pg_catalog.pg_get_userbyid(grantor) grantor,
    admin_option admin, inherit_option inherit, set_option set_role
  from pg_catalog.pg_auth_members
)
select jsonb_build_object(
  'formatVersion',1,
  'postgresMajor',current_setting('server_version_num')::integer/10000,
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'roles',coalesce((select jsonb_agg(to_jsonb(r)) from roles r),'[]'::jsonb),
  'memberships',coalesce((select jsonb_agg(to_jsonb(m)) from memberships m),'[]'::jsonb)
);
