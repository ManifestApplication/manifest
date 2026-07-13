-- supabase/seed.sql — snapshot of current data (generated via pg_dump --data-only --inserts).
-- Triggers & FK checks are disabled during load so derived rows (line totals,
-- settlements, commissions) load exactly as captured, and the auth signup trigger
-- does NOT fire (accounts/party rows are loaded explicitly below).
set session_replication_role = replica;

-- ===== auth.users (logins) =====
--
-- PostgreSQL database dump
--


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
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 'authenticated', 'authenticated', 'aeroindopack@inc.com', '$2a$10$kMVKzb7R9JvuyrCaDyjbTejyhHxO.1tRMMI2g8CwFhOLLj257Um.K', '2026-06-18 15:27:38.065167+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 19:23:07.30047+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "13eb9ded-1532-4a4c-854b-d6dcc78a52b3", "role": "manufacturer", "email": "aeroindopack@inc.com", "full_name": "Aero Indopack", "business_name": "PT. Aero Indopack", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 15:27:38.042721+00', '2026-06-18 19:23:07.304646+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 'authenticated', 'authenticated', 'fantasylogistic@courier.com', '$2a$10$jX9q0ahs4n5vza0AYAWz6uDv6sGR1P27C4r9QCjUs4hFDSjQc1pUS', '2026-06-18 15:19:37.99765+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 19:39:06.554789+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "2b10d584-4778-4b0c-8a48-2a56dc5fae9a", "role": "distributor", "email": "fantasylogistic@courier.com", "full_name": "Tifa", "business_name": "PT. Fantasy Logistic", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 15:19:37.978482+00', '2026-06-18 19:39:06.564461+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '37431a87-9e2a-44bb-86aa-e1fe3e7e9ab0', 'authenticated', 'authenticated', 'michellemart@shop.com', '$2a$10$gg5RL2VFu6KC9O4j.VKbQuXAk2R59b0g72ItCiyDXACSwWPIQElS2', '2026-06-18 15:15:36.263478+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 15:48:22.35629+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "37431a87-9e2a-44bb-86aa-e1fe3e7e9ab0", "role": "warung", "email": "michellemart@shop.com", "full_name": "Michelle", "business_name": "Michelle Mart", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 15:15:36.249439+00', '2026-06-18 19:20:56.147056+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 'authenticated', 'authenticated', 'omegaspices@inc.com', '$2a$10$X8sbGVhrwW/baOdJHDg4P.2yUq59OykVkBAr0L62sOVLlKOJoH02q', '2026-06-18 15:30:12.803807+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 15:37:08.732925+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "03fd37d6-d6c4-47e6-89a7-9a35e1f27d27", "role": "manufacturer", "email": "omegaspices@inc.com", "full_name": "Omega Spices", "business_name": "PT. Omega Spices", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 15:30:12.785008+00', '2026-06-18 15:37:08.736929+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '0492c691-8600-4110-bf3d-bd52ecaae67b', 'authenticated', 'authenticated', 'fastlogistic@courier.com', '$2a$10$hL3bz7NZospIdTH28uAmYOcqr1lXcFcGuFFtLoCwd3F1BZ977MMKC', '2026-06-18 19:38:45.20792+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 20:11:05.02531+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "0492c691-8600-4110-bf3d-bd52ecaae67b", "role": "distributor", "email": "fastlogistic@courier.com", "full_name": "Aerith", "business_name": "PT. Fast Logistic", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 19:38:45.189843+00', '2026-06-18 20:11:05.030873+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', 'authenticated', 'authenticated', 'manifestapp.cs@gmail.com', '$2a$10$YPHt7GfUXTpBCgj0AcDDbeh5kdMFqNl39T.AG5M7.PKqzheWqSzyS', '2026-06-18 14:58:33.529153+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 20:12:56.641545+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "133eb3b7-4817-46cd-a0a7-4c73c7a05ecc", "role": "manufacturer", "email": "manifestapp.cs@gmail.com", "full_name": "Administrator", "business_name": "Manifest Indonesia", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 14:58:33.50187+00', '2026-06-18 20:12:56.645842+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'a602113e-0b2a-43bc-a719-7828a2916bc8', 'authenticated', 'authenticated', 'antoniusmart@shop.com', '$2a$10$yI5hbNBqlhxp2KJq7ia2H.lo/H4JKlwp2xtNNKe.8Nf6Z19njKfo6', '2026-06-18 15:14:31.528027+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 19:21:28.125111+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "a602113e-0b2a-43bc-a719-7828a2916bc8", "role": "warung", "email": "antoniusmart@shop.com", "full_name": "Antonius", "business_name": "Antonius Mart", "email_verified": true, "phone_verified": false}', NULL, '2026-06-18 15:14:31.513012+00', '2026-06-18 20:19:41.339065+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- PostgreSQL database dump complete
--



-- ===== public (business data) =====
--
-- PostgreSQL database dump
--


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
-- Data for Name: communities; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts VALUES ('133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', 'admin', 'Administrator', NULL, NULL, '2026-06-18 14:58:33.499089+00');
INSERT INTO public.accounts VALUES ('a602113e-0b2a-43bc-a719-7828a2916bc8', 'warung', 'Antonius', NULL, NULL, '2026-06-18 15:14:31.51265+00');
INSERT INTO public.accounts VALUES ('37431a87-9e2a-44bb-86aa-e1fe3e7e9ab0', 'warung', 'Michelle', NULL, NULL, '2026-06-18 15:15:36.248955+00');
INSERT INTO public.accounts VALUES ('2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 'distributor', 'Tifa', NULL, NULL, '2026-06-18 15:19:37.97804+00');
INSERT INTO public.accounts VALUES ('13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 'manufacturer', 'Aero Indopack', NULL, NULL, '2026-06-18 15:27:38.042349+00');
INSERT INTO public.accounts VALUES ('03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 'manufacturer', 'Omega Spices', NULL, NULL, '2026-06-18 15:30:12.784672+00');
INSERT INTO public.accounts VALUES ('0492c691-8600-4110-bf3d-bd52ecaae67b', 'distributor', 'Aerith', NULL, NULL, '2026-06-18 19:38:45.189435+00');


--
-- Data for Name: distributors; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.distributors VALUES ('2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 'PT. Fantasy Logistic', 'third_party', 0.0500, '2026-06-18 15:19:37.97804+00');
INSERT INTO public.distributors VALUES ('0492c691-8600-4110-bf3d-bd52ecaae67b', 'PT. Fast Logistic', 'third_party', 0.0500, '2026-06-18 19:38:45.189435+00');


--
-- Data for Name: manufacturers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.manufacturers VALUES ('13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 'PT. Aero Indopack', 0.0300, NULL, '2026-06-18 15:27:38.042349+00');
INSERT INTO public.manufacturers VALUES ('03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 'PT. Omega Spices', 0.0300, NULL, '2026-06-18 15:30:12.784672+00');


--
-- Data for Name: warungs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.warungs VALUES ('a602113e-0b2a-43bc-a719-7828a2916bc8', 'Antonius Mart', NULL, '2026-06-18 15:14:31.51265+00');
INSERT INTO public.warungs VALUES ('37431a87-9e2a-44bb-86aa-e1fe3e7e9ab0', 'Michelle Mart', NULL, '2026-06-18 15:15:36.248955+00');


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.orders VALUES ('2ad3f93e-1ac1-4af9-a8dc-1fa07e0eb32d', 'a602113e-0b2a-43bc-a719-7828a2916bc8', 'paid', 340000, 17000, 357000, '2026-06-18 15:47:11.300517+00');
INSERT INTO public.orders VALUES ('177fe6aa-2107-4dac-a5de-f90676678b73', '37431a87-9e2a-44bb-86aa-e1fe3e7e9ab0', 'paid', 440000, 22000, 462000, '2026-06-18 15:48:51.322055+00');
INSERT INTO public.orders VALUES ('9c925492-84a6-430c-a9d0-315eb429de2d', 'a602113e-0b2a-43bc-a719-7828a2916bc8', 'paid', 530000, 26500, 556500, '2026-06-18 19:24:51.211299+00');
INSERT INTO public.orders VALUES ('d285db2f-153c-4a5f-92ec-d346a15a2c7f', 'a602113e-0b2a-43bc-a719-7828a2916bc8', 'paid', 1200000, 36000, 1236000, '2026-06-18 20:14:16.565638+00');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products VALUES ('3fcdbbe3-4fd7-4c9b-8f28-bb5d03a0ddf9', '13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 'Packaging', 'Goldstar Aluminum', 'Aluminum Foil Food Wrapper', true, '2026-06-18 15:36:10.259524+00');
INSERT INTO public.products VALUES ('726e5c93-0a23-47c6-ba1b-09aadf776908', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 'Spices', 'Omega Spices', 'Ground White Pepper', true, '2026-06-18 15:41:48.460205+00');
INSERT INTO public.products VALUES ('7688df7b-c40d-452c-971b-4e3c8819fea9', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 'Spices', 'Omega Spices', 'Ground Black Pepper', true, '2026-06-18 15:40:53.360824+00');


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.product_variants VALUES ('33988e4e-f15c-4674-991c-aec859d04f55', '3fcdbbe3-4fd7-4c9b-8f28-bb5d03a0ddf9', '50 pcs', 50000, 0, true, '2026-06-18 15:36:10.29451+00');
INSERT INTO public.product_variants VALUES ('3964984e-b21b-4271-8ae9-09c4633dd501', '3fcdbbe3-4fd7-4c9b-8f28-bb5d03a0ddf9', '100 pcs', 100000, 0, true, '2026-06-18 15:36:10.29451+00');
INSERT INTO public.product_variants VALUES ('fb1c83c9-6a6b-4e33-be1a-9fdd8a1f13ed', '726e5c93-0a23-47c6-ba1b-09aadf776908', 'Box of 24', 240000, 0, true, '2026-06-18 15:41:48.490002+00');
INSERT INTO public.product_variants VALUES ('402af999-d123-4b55-b6d4-de60cd5268e6', '7688df7b-c40d-452c-971b-4e3c8819fea9', 'Box of 24', 240000, 0, true, '2026-06-18 15:40:53.38976+00');


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.order_items VALUES ('e8d7df71-639b-4764-8ad7-54cfda4bf8f7', '2ad3f93e-1ac1-4af9-a8dc-1fa07e0eb32d', '3964984e-b21b-4271-8ae9-09c4633dd501', 1, 100000, 0.0000, 0.0500, 100000, 5000);
INSERT INTO public.order_items VALUES ('a234b787-6073-474c-b9a1-526235ec47e1', '2ad3f93e-1ac1-4af9-a8dc-1fa07e0eb32d', '402af999-d123-4b55-b6d4-de60cd5268e6', 1, 240000, 0.0000, 0.0500, 240000, 12000);
INSERT INTO public.order_items VALUES ('82bf72d1-7ae5-4b8c-97ca-c7add3a97652', '177fe6aa-2107-4dac-a5de-f90676678b73', '3964984e-b21b-4271-8ae9-09c4633dd501', 2, 100000, 0.0000, 0.0500, 200000, 10000);
INSERT INTO public.order_items VALUES ('1129f507-6b27-45b1-a9bd-5aff239a93e3', '177fe6aa-2107-4dac-a5de-f90676678b73', 'fb1c83c9-6a6b-4e33-be1a-9fdd8a1f13ed', 1, 240000, 0.0000, 0.0500, 240000, 12000);
INSERT INTO public.order_items VALUES ('45a7ff15-f644-4ef7-b81d-8453abe050f3', '9c925492-84a6-430c-a9d0-315eb429de2d', '33988e4e-f15c-4674-991c-aec859d04f55', 1, 50000, 0.0000, 0.0500, 50000, 2500);
INSERT INTO public.order_items VALUES ('643e05de-1840-4bec-9c3a-ceb08c6a9077', '9c925492-84a6-430c-a9d0-315eb429de2d', 'fb1c83c9-6a6b-4e33-be1a-9fdd8a1f13ed', 2, 240000, 0.0000, 0.0500, 480000, 24000);
INSERT INTO public.order_items VALUES ('b91aaa9b-7a02-48ae-ad7c-9a488236c2bf', 'd285db2f-153c-4a5f-92ec-d346a15a2c7f', 'fb1c83c9-6a6b-4e33-be1a-9fdd8a1f13ed', 5, 240000, 0.0000, 0.0300, 1200000, 36000);


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.payments VALUES ('e752359d-969c-4034-988e-f939c53851d3', '2ad3f93e-1ac1-4af9-a8dc-1fa07e0eb32d', 357000, 'confirmed', 'manual_transfer', NULL, NULL, '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', '2026-06-18 19:16:34.321+00', 'Confirmed via admin UI', '2026-06-18 15:47:11.722629+00', '2026-06-18 15:47:11.722629+00');
INSERT INTO public.payments VALUES ('d1e5e912-67a5-43e0-ba3a-873461c2e9c0', '177fe6aa-2107-4dac-a5de-f90676678b73', 462000, 'confirmed', 'manual_transfer', NULL, NULL, '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', '2026-06-18 20:10:24.007+00', 'Confirmed via admin UI', '2026-06-18 15:48:51.617055+00', '2026-06-18 15:48:51.617055+00');
INSERT INTO public.payments VALUES ('5c4d5278-7781-47fc-90c9-1e01d9a80f18', '9c925492-84a6-430c-a9d0-315eb429de2d', 556500, 'confirmed', 'manual_transfer', NULL, NULL, '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', '2026-06-18 20:14:31.483+00', 'Confirmed via admin UI', '2026-06-18 19:24:51.660728+00', '2026-06-18 19:24:51.660728+00');
INSERT INTO public.payments VALUES ('386a9047-4a2c-4233-abff-5f7e8ac27689', 'd285db2f-153c-4a5f-92ec-d346a15a2c7f', 1236000, 'confirmed', 'manual_transfer', NULL, NULL, '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', '2026-06-18 20:14:45.669+00', 'Confirmed via admin UI', '2026-06-18 20:14:16.798001+00', '2026-06-18 20:14:16.798001+00');


--
-- Data for Name: payment_events; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.payment_events VALUES ('bc599bcf-534a-4769-9e37-e333d896b3d1', 'e752359d-969c-4034-988e-f939c53851d3', NULL, 'pending', NULL, 'payment created', '2026-06-18 15:47:11.722629+00');
INSERT INTO public.payment_events VALUES ('1a29d79b-01d3-412c-86a3-226304ccbb41', 'd1e5e912-67a5-43e0-ba3a-873461c2e9c0', NULL, 'pending', NULL, 'payment created', '2026-06-18 15:48:51.617055+00');
INSERT INTO public.payment_events VALUES ('2adad509-e887-4d0e-ae89-f0bb029d06e0', 'e752359d-969c-4034-988e-f939c53851d3', 'pending', 'confirmed', '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', 'Confirmed via admin UI', '2026-06-18 19:16:34.343795+00');
INSERT INTO public.payment_events VALUES ('4d07a8f8-43b5-4919-a759-50a4b39ff90f', '5c4d5278-7781-47fc-90c9-1e01d9a80f18', NULL, 'pending', NULL, 'payment created', '2026-06-18 19:24:51.660728+00');
INSERT INTO public.payment_events VALUES ('8dfa3dc3-5f70-4b87-9c8d-2f15899e07ae', 'd1e5e912-67a5-43e0-ba3a-873461c2e9c0', 'pending', 'confirmed', '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', 'Confirmed via admin UI', '2026-06-18 20:10:24.017984+00');
INSERT INTO public.payment_events VALUES ('b0275ec9-09e1-42a2-947a-4dfe0ecbaf8a', '386a9047-4a2c-4233-abff-5f7e8ac27689', NULL, 'pending', NULL, 'payment created', '2026-06-18 20:14:16.798001+00');
INSERT INTO public.payment_events VALUES ('70aa8fea-628c-42e6-a0fe-526193609e16', '5c4d5278-7781-47fc-90c9-1e01d9a80f18', 'pending', 'confirmed', '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', 'Confirmed via admin UI', '2026-06-18 20:14:31.494882+00');
INSERT INTO public.payment_events VALUES ('ac223f80-ea38-4445-a3dd-7c8edd9f8b32', '386a9047-4a2c-4233-abff-5f7e8ac27689', 'pending', 'confirmed', '133eb3b7-4817-46cd-a0a7-4c73c7a05ecc', 'Confirmed via admin UI', '2026-06-18 20:14:45.678565+00');


--
-- Data for Name: quantity_discounts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.shipments VALUES ('1f2d6384-1540-4de9-96d8-608c7afc6f66', '2ad3f93e-1ac1-4af9-a8dc-1fa07e0eb32d', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 'planned', 17000, '2026-06-18 19:33:13.910969+00', '2026-06-18 19:33:13.910969+00');
INSERT INTO public.shipments VALUES ('6fe2b269-e4a2-46f3-8f03-e850b939de7f', '177fe6aa-2107-4dac-a5de-f90676678b73', '0492c691-8600-4110-bf3d-bd52ecaae67b', 'reconciled', 22000, '2026-06-18 20:10:33.185445+00', '2026-06-18 20:10:33.185445+00');
INSERT INTO public.shipments VALUES ('909f3327-123f-45ea-86d2-9e58d5cf8967', '9c925492-84a6-430c-a9d0-315eb429de2d', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 'planned', 26500, '2026-06-18 20:14:48.790223+00', '2026-06-18 20:14:48.790223+00');
INSERT INTO public.shipments VALUES ('225d6adc-334c-4fe6-84e0-633270ec1f16', 'd285db2f-153c-4a5f-92ec-d346a15a2c7f', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 'planned', 60000, '2026-06-18 20:14:51.215194+00', '2026-06-18 20:14:51.215194+00');


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.settlements VALUES ('22909ced-89ce-4585-976c-684e738620db', 'e752359d-969c-4034-988e-f939c53851d3', 'manufacturer', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 240000, '2026-06-18 19:16:34.343795+00', NULL);
INSERT INTO public.settlements VALUES ('ffbab3b7-698c-406b-b5e1-b1a3ec053920', 'e752359d-969c-4034-988e-f939c53851d3', 'manufacturer', '13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 100000, '2026-06-18 19:16:34.343795+00', NULL);
INSERT INTO public.settlements VALUES ('6928e39d-4548-47d6-b051-26f334a599b4', 'e752359d-969c-4034-988e-f939c53851d3', 'halinest', NULL, 17000, '2026-06-18 19:16:34.343795+00', NULL);
INSERT INTO public.settlements VALUES ('12ef406b-d717-47c2-88b3-d20a71131ab3', NULL, 'distributor', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 17000, '2026-06-18 19:33:13.910969+00', '1f2d6384-1540-4de9-96d8-608c7afc6f66');
INSERT INTO public.settlements VALUES ('06e03b76-99f5-4054-926e-e3aa35443c7d', 'd1e5e912-67a5-43e0-ba3a-873461c2e9c0', 'manufacturer', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 240000, '2026-06-18 20:10:24.017984+00', NULL);
INSERT INTO public.settlements VALUES ('3dbec114-ba25-4f84-8470-0a9d6d12248a', 'd1e5e912-67a5-43e0-ba3a-873461c2e9c0', 'manufacturer', '13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 200000, '2026-06-18 20:10:24.017984+00', NULL);
INSERT INTO public.settlements VALUES ('0df51355-911e-45bc-aa12-5ea4373fa342', 'd1e5e912-67a5-43e0-ba3a-873461c2e9c0', 'halinest', NULL, 22000, '2026-06-18 20:10:24.017984+00', NULL);
INSERT INTO public.settlements VALUES ('474ebe3b-96a1-48f1-b470-99f30a1a25b0', NULL, 'distributor', '0492c691-8600-4110-bf3d-bd52ecaae67b', 22000, '2026-06-18 20:10:33.185445+00', '6fe2b269-e4a2-46f3-8f03-e850b939de7f');
INSERT INTO public.settlements VALUES ('59b58ccf-0d00-4355-9f22-07f8db5e9290', '5c4d5278-7781-47fc-90c9-1e01d9a80f18', 'manufacturer', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 480000, '2026-06-18 20:14:31.494882+00', NULL);
INSERT INTO public.settlements VALUES ('e349fa96-f32f-4ee3-b4c4-a9123a2bfb52', '5c4d5278-7781-47fc-90c9-1e01d9a80f18', 'manufacturer', '13eb9ded-1532-4a4c-854b-d6dcc78a52b3', 50000, '2026-06-18 20:14:31.494882+00', NULL);
INSERT INTO public.settlements VALUES ('0ed0fec3-0849-41eb-a90e-4694ac40ca81', '5c4d5278-7781-47fc-90c9-1e01d9a80f18', 'halinest', NULL, 26500, '2026-06-18 20:14:31.494882+00', NULL);
INSERT INTO public.settlements VALUES ('fdd70079-d181-4fe7-8d24-2f7fca9961ad', '386a9047-4a2c-4233-abff-5f7e8ac27689', 'manufacturer', '03fd37d6-d6c4-47e6-89a7-9a35e1f27d27', 1200000, '2026-06-18 20:14:45.678565+00', NULL);
INSERT INTO public.settlements VALUES ('39ef1a89-25a2-4d3b-9d10-a0c155794a7a', '386a9047-4a2c-4233-abff-5f7e8ac27689', 'halinest', NULL, 36000, '2026-06-18 20:14:45.678565+00', NULL);
INSERT INTO public.settlements VALUES ('4ec3017a-09ff-4862-a6f2-36edb3b2570c', NULL, 'distributor', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 26500, '2026-06-18 20:14:48.790223+00', '909f3327-123f-45ea-86d2-9e58d5cf8967');
INSERT INTO public.settlements VALUES ('dbe437ad-eb17-46b4-a57b-995e03c49fda', NULL, 'distributor', '2b10d584-4778-4b0c-8a48-2a56dc5fae9a', 60000, '2026-06-18 20:14:51.215194+00', '225d6adc-334c-4fe6-84e0-633270ec1f16');


--
-- PostgreSQL database dump complete
--



set session_replication_role = origin;
