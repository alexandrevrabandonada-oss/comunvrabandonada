--
-- PostgreSQL database dump
--

\restrict dtkiINw0j2y0gU3hmrgsqLD0cTpdpuHd8lZLxQbGN7Ufgzu78HDLsrxxC7V604I

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: comun_schema_releases; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.comun_schema_releases (release, migration_path, migration_sha256, pre_fingerprint, post_fingerprint, applied_at, applied_by, status) VALUES ('20260922120000-canonical-security-hardening-v2', 'supabase/migrations/20260922120000_comun_canonical_security_hardening_v2.sql', '59351a1736ca21683f6307e78b12fa9362697d8772c0a8c807ab7c387f1da279', 'db609afb6c7e6627a25b016460a2e1b02e7fb9f052fa1e440adeaed662b72460', 'a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98', '2026-09-23 15:37:35.319645+00', 'postgres', 'applied');


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: supabase_migrations; Owner: supabase_admin
--

INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('202605070001', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('202605200001', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('202605270002', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('202605280001', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('202605310001', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('202607070001', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260707182045', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260707191614', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260707201244', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260707203422', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260707213246', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260707232209', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708024032', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708030426', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708031446', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708140650', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708141916', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708150335', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708163526', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708173035', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708174621', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708175500', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708181116', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708182545', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708182643', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260708182724', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714144416', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714163643', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714171854', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714174020', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714175818', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714185438', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714213123', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714220640', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714223658', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714231050', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260714235034', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715002809', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715011302', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715021055', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715025948', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715032613', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715151922', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715155802', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715170058', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715174723', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715185344', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260715192935', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260716000000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260716120000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260717013709', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260717022301', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260718031145', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260719180751', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260719202300', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260720005353', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260720161117', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260720185530', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260721155914', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260721164415', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260722003105', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260723220112', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260726133409', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260726161426', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260726171220', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260729205156', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260729221500', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260730122000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260730213205', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260730230044', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260731183339', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260731220000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260731231411', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260805130000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260805201000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260805212659', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260806235454', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260808043000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260808180246', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260808220000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260809045302', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260809055800', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260809133923', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260810045610', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260810143000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260810155310', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260810171448', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260810194054', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260813124308', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260814160000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260815184529', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260815223006', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260816011500', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260816181040', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260816224228', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260817012247', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260817160000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260817170000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260818120000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260819130000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260823003249', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260824001340', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260825090000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260825120000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260826090000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260826120000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260826150000', NULL, NULL, NULL, NULL, NULL);
INSERT INTO supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) VALUES ('20260827120000', NULL, NULL, NULL, NULL, NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict dtkiINw0j2y0gU3hmrgsqLD0cTpdpuHd8lZLxQbGN7Ufgzu78HDLsrxxC7V604I

