--
-- PostgreSQL database dump
--

\restrict M8Pv2pIMV6pCBMPwqVdb2QY1CJszJSZd9M2IP4WfBvjsHQb0sh6g39CsnJXyq99

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
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_admin
--

INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('archive-private-originals', 'archive-private-originals', NULL, '2026-09-23 15:31:04.526177+00', '2026-09-23 15:31:04.526177+00', false, false, 31457280, '{image/jpeg,image/png,image/webp}', NULL, 'STANDARD', 'DISABLED', NULL, NULL);
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('archive-public-derivatives', 'archive-public-derivatives', NULL, '2026-09-23 15:31:04.526177+00', '2026-09-23 15:31:04.526177+00', true, false, 15728640, '{image/webp}', NULL, 'STANDARD', 'DISABLED', NULL, NULL);
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('comun-public-safe-attachments', 'comun-public-safe-attachments', NULL, '2026-09-23 15:31:04.526177+00', '2026-09-23 15:31:04.526177+00', false, false, 8388608, '{image/jpeg,image/png,image/webp,image/heic,image/heif}', NULL, 'STANDARD', 'DISABLED', NULL, NULL);
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('comun-relata-private', 'comun-relata-private', NULL, '2026-09-23 15:31:04.526177+00', '2026-09-23 15:31:04.526177+00', false, false, 8388608, '{image/jpeg,image/png,image/webp}', NULL, 'STANDARD', 'DISABLED', NULL, NULL);
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('comun-report-attachments', 'comun-report-attachments', NULL, '2026-09-23 15:31:04.526177+00', '2026-09-23 15:31:04.526177+00', false, false, 8388608, '{image/jpeg,image/png,image/webp,image/heic,image/heif}', NULL, 'STANDARD', 'DISABLED', NULL, NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict M8Pv2pIMV6pCBMPwqVdb2QY1CJszJSZd9M2IP4WfBvjsHQb0sh6g39CsnJXyq99

