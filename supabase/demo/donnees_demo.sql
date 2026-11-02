-- MASO — Données de démonstration (MOD-04). À coller dans Supabase → SQL Editor → Run.
-- Personnes, organisations et sources FICTIVES : numéros en +261 00 (aucun opérateur) et e-mails @example.org (domaine réservé).
-- Statistiques RÉELLES : Banque mondiale (WDI), Madagascar, extraites via l'API le 2026-11-02.
-- Le script peut être relancé sans créer de doublons.

-- Personnes-ressources
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('6aa6bbb3-c5ca-55ad-9f76-b0ec72b0377f', 'Hery Rakotomalala', 'Climatologue', 'Service météorologique (fictif)', '{"climat","météo","cyclones"}', 'Analamanga', '{"mg","fr"}'::public.language_code[], '+261 00 00 000 01', '+261 00 00 000 01', 'hery@example.org', 'team', true, now() - interval '60 days', true, now() - interval '30 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('6accdeae-b6f0-59c5-b14e-4548e0e99e0b', 'Voahangy Andriamanana', 'Porte-parole', 'Gestion des risques et catastrophes (fictif)', '{"catastrophes","inondations","cyclones"}', 'Analamanga', '{"mg","fr"}'::public.language_code[], '+261 00 00 000 02', '+261 00 00 000 02', 'voahangy@example.org', 'public', true, now() - interval '75 days', true, now() - interval '45 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('1a312168-9fad-57bc-ace5-c2907710be2d', 'Tiana Razafindrabe', 'Médecin épidémiologiste', 'Centre de santé publique (fictif)', '{"santé","épidémies","vaccination"}', 'Atsinanana', '{"mg","fr","en"}'::public.language_code[], '+261 00 00 000 03', '+261 00 00 000 03', 'tiana@example.org', 'team', true, now() - interval '90 days', true, now() - interval '60 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('48cbfdc6-264a-58be-9742-da8855cd0de9', 'Fanja Rasoanaivo', 'Économiste', 'Université d''Antananarivo (fictif)', '{"économie","prix","inflation"}', 'Analamanga', '{"mg","fr","en"}'::public.language_code[], '+261 00 00 000 04', '+261 00 00 000 04', 'fanja@example.org', 'team', true, now() - interval '50 days', true, now() - interval '20 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('4aaddb4b-6ace-5fdd-bc50-90ee244f26d2', 'Rivo Andrianarisoa', 'Juriste électoral', 'Observatoire des élections (fictif)', '{"élections","droit","institutions"}', 'Analamanga', '{"mg","fr"}'::public.language_code[], '+261 00 00 000 05', '+261 00 00 000 05', 'rivo@example.org', 'private', true, now() - interval '120 days', true, now() - interval '90 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('092b08c3-f197-585d-9f27-91a215731bcd', 'Nirina Randrianasolo', 'Ingénieur agronome', 'Centre de recherche agricole (fictif)', '{"agriculture","riz","sécheresse"}', 'Vakinankaratra', '{"mg","fr"}'::public.language_code[], '+261 00 00 000 06', '+261 00 00 000 06', 'nirina@example.org', 'team', true, now() - interval '270 days', true, now() - interval '240 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('528b555d-2435-559a-83d8-0b22fd9cf4d4', 'Haingo Rabemananjara', 'Géographe, cartographe', 'Collectif OpenStreetMap Madagascar (fictif)', '{"géographie","géolocalisation","cartes"}', 'Boeny', '{"mg","fr","en"}'::public.language_code[], '+261 00 00 000 07', '+261 00 00 000 07', 'haingo@example.org', 'public', true, now() - interval '45 days', true, now() - interval '15 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('27541d9a-884b-51e3-be16-c0cc9710a073', 'Mamy Ratsimbazafy', 'Spécialiste des réseaux sociaux', 'Association des journalistes numériques (fictif)', '{"réseaux sociaux","désinformation","numérique"}', 'Analamanga', '{"mg","fr","en"}'::public.language_code[], '+261 00 00 000 08', '+261 00 00 000 08', 'mamy@example.org', 'team', true, now() - interval '40 days', true, now() - interval '10 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('66baf21f-ef5f-50d8-9364-01085dc88d88', 'Lalao Rakotondrabe', 'Directrice d''école', 'Établissement scolaire public (fictif)', '{"éducation","écoles"}', 'Haute Matsiatra', '{"mg","fr"}'::public.language_code[], '+261 00 00 000 09', '+261 00 00 000 09', 'lalao@example.org', 'team', true, now() - interval '150 days', true, now() - interval '120 days', true)
on conflict (id) do nothing;
insert into public.resource_people (id, full_name, position, organization, domains, region, languages, phone, whatsapp, email, visibility, consent, consent_at, validated, last_validated_at, active)
values ('8797555f-a8bf-5af7-abe9-2c57db390695', 'Andry Rasolofo', 'Ingénieur des travaux publics', 'Direction des routes (fictif)', '{"infrastructures","routes","ponts"}', 'Haute Matsiatra', '{"mg","fr"}'::public.language_code[], '+261 00 00 000 10', '+261 00 00 000 10', 'andry@example.org', 'private', true, now() - interval '240 days', true, now() - interval '210 days', true)
on conflict (id) do nothing;

-- Sources (le score est calculé automatiquement à partir des critères justifiés)
insert into public.sources (id, type, name, url, created_on, criteria) values ('7aa95178-f1aa-5e8a-8c7f-5d129884190a', 'site', 'Info Flash Mada (fictif)', 'https://infoflash-mada.example', '2025-09-01', '{"identity": {"score": 0, "justification": "Aucune mention légale ni responsable de publication."}, "seniority": {"score": 0, "justification": "Domaine créé il y a quelques semaines, juste avant la saison cyclonique."}, "corrections_history": {"score": 0, "justification": "Deux photos recyclées déjà démenties en 2025."}}'::jsonb)
on conflict (id) do nothing;
insert into public.sources (id, type, name, url, created_on, criteria) values ('c36acd1f-c8ad-5c32-bc34-8fdd943f3a8b', 'media', 'Radio Fanilo (fictif)', 'https://radiofanilo.example', '2009-03-15', '{"identity": {"score": 2, "justification": "Rédaction, adresse et directeur de publication affichés."}, "transparency": {"score": 2, "justification": "Sources citées et rectificatifs publiés."}, "seniority": {"score": 2, "justification": "Station active depuis 2009."}, "competence": {"score": 1, "justification": "Rédaction généraliste, peu de spécialistes."}}'::jsonb)
on conflict (id) do nothing;
insert into public.sources (id, type, name, url, created_on, criteria) values ('e7b071c3-44ec-57c1-bd80-3b4e3e61ac0f', 'page', 'Page Facebook « Vaovao Mafana » (fictif)', 'https://facebook.com/vaovaomafana.example', null, '{"identity": {"score": 0, "justification": "Administrateurs anonymes."}, "corroboration": {"score": 1, "justification": "Certaines informations confirmées par la suite, d''autres non."}}'::jsonb)
on conflict (id) do nothing;

-- Statistiques officielles (une ligne par indicateur et par année)
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.POP.TOTL', 'demography', 'Population totale', 28953556, 'habitants', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.POP.TOTL', 'demography', 'Population totale', 29691083, 'habitants', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.POP.TOTL', 'demography', 'Population totale', 30437261, 'habitants', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.POP.TOTL', 'demography', 'Population totale', 31195932, 'habitants', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.POP.TOTL', 'demography', 'Population totale', 31964956, 'habitants', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.POP.TOTL', 'demography', 'Population totale', 32740678, 'habitants', 2025, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.URB.TOTL.IN.ZS', 'demography', 'Population urbaine', 30.7019, '% de la population', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.URB.TOTL.IN.ZS', 'demography', 'Population urbaine', 31.1137, '% de la population', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.URB.TOTL.IN.ZS', 'demography', 'Population urbaine', 31.5398, '% de la population', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.URB.TOTL.IN.ZS', 'demography', 'Population urbaine', 31.9799, '% de la population', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.URB.TOTL.IN.ZS', 'demography', 'Population urbaine', 32.434, '% de la population', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.URB.TOTL.IN.ZS', 'demography', 'Population urbaine', 32.9017, '% de la population', 2025, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.DYN.LE00.IN', 'demography', 'Espérance de vie à la naissance', 63.504, 'années', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.DYN.LE00.IN', 'demography', 'Espérance de vie à la naissance', 62.706, 'années', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.DYN.LE00.IN', 'demography', 'Espérance de vie à la naissance', 62.516, 'années', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.DYN.LE00.IN', 'demography', 'Espérance de vie à la naissance', 63.068, 'années', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.DYN.LE00.IN', 'demography', 'Espérance de vie à la naissance', 63.632, 'années', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SP.DYN.LE00.IN', 'demography', 'Espérance de vie à la naissance', 63.835, 'années', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.DYN.MORT', 'health', 'Mortalité des enfants de moins de 5 ans', 65, 'pour 1 000 naissances', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.DYN.MORT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.DYN.MORT', 'health', 'Mortalité des enfants de moins de 5 ans', 65.1, 'pour 1 000 naissances', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.DYN.MORT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.DYN.MORT', 'health', 'Mortalité des enfants de moins de 5 ans', 65, 'pour 1 000 naissances', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.DYN.MORT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.DYN.MORT', 'health', 'Mortalité des enfants de moins de 5 ans', 64.5, 'pour 1 000 naissances', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.DYN.MORT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.DYN.MORT', 'health', 'Mortalité des enfants de moins de 5 ans', 63.6, 'pour 1 000 naissances', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.DYN.MORT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.DYN.MORT', 'health', 'Mortalité des enfants de moins de 5 ans', 62.4, 'pour 1 000 naissances', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.DYN.MORT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.STA.MMRT', 'health', 'Mortalité maternelle', 466, 'pour 100 000 naissances', 2018, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.STA.MMRT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.STA.MMRT', 'health', 'Mortalité maternelle', 462, 'pour 100 000 naissances', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.STA.MMRT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.STA.MMRT', 'health', 'Mortalité maternelle', 447, 'pour 100 000 naissances', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.STA.MMRT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.STA.MMRT', 'health', 'Mortalité maternelle', 467, 'pour 100 000 naissances', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.STA.MMRT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.STA.MMRT', 'health', 'Mortalité maternelle', 439, 'pour 100 000 naissances', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.STA.MMRT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.STA.MMRT', 'health', 'Mortalité maternelle', 445, 'pour 100 000 naissances', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.STA.MMRT?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.IMM.MEAS', 'health', 'Vaccination contre la rougeole (12-23 mois)', 60, '%', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.IMM.MEAS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.IMM.MEAS', 'health', 'Vaccination contre la rougeole (12-23 mois)', 55, '%', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.IMM.MEAS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.IMM.MEAS', 'health', 'Vaccination contre la rougeole (12-23 mois)', 43, '%', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.IMM.MEAS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.IMM.MEAS', 'health', 'Vaccination contre la rougeole (12-23 mois)', 44, '%', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.IMM.MEAS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.IMM.MEAS', 'health', 'Vaccination contre la rougeole (12-23 mois)', 51, '%', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.IMM.MEAS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SH.IMM.MEAS', 'health', 'Vaccination contre la rougeole (12-23 mois)', 46, '%', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SH.IMM.MEAS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.PRM.ENRR', 'education', 'Taux brut de scolarisation primaire', 124.9466, '%', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.PRM.ENRR?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.PRM.ENRR', 'education', 'Taux brut de scolarisation primaire', 126.5858, '%', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.PRM.ENRR?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.PRM.ENRR', 'education', 'Taux brut de scolarisation primaire', 140.2657, '%', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.PRM.ENRR?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.PRM.ENRR', 'education', 'Taux brut de scolarisation primaire', 132.8878, '%', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.PRM.ENRR?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.PRM.ENRR', 'education', 'Taux brut de scolarisation primaire', 130.599, '%', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.PRM.ENRR?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.PRM.ENRR', 'education', 'Taux brut de scolarisation primaire', 132.7396, '%', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.PRM.ENRR?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.ADT.LITR.ZS', 'education', 'Taux d''alphabétisation des adultes', 70.69, '%', 2000, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.ADT.LITR.ZS', 'education', 'Taux d''alphabétisation des adultes', 71.57, '%', 2012, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.ADT.LITR.ZS', 'education', 'Taux d''alphabétisation des adultes', 76.68, '%', 2018, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SE.ADT.LITR.ZS', 'education', 'Taux d''alphabétisation des adultes', 74.69, '%', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SE.ADT.LITR.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('NY.GDP.PCAP.CD', 'economy', 'PIB par habitant', 450.7716, 'US$ courants', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('NY.GDP.PCAP.CD', 'economy', 'PIB par habitant', 483.4695, 'US$ courants', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('NY.GDP.PCAP.CD', 'economy', 'PIB par habitant', 504.0591, 'US$ courants', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('NY.GDP.PCAP.CD', 'economy', 'PIB par habitant', 514.0641, 'US$ courants', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('NY.GDP.PCAP.CD', 'economy', 'PIB par habitant', 550.3788, 'US$ courants', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('NY.GDP.PCAP.CD', 'economy', 'PIB par habitant', 599.2653, 'US$ courants', 2025, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('FP.CPI.TOTL.ZG', 'economy', 'Inflation (prix à la consommation)', 4.1946, '% par an', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('FP.CPI.TOTL.ZG', 'economy', 'Inflation (prix à la consommation)', 5.8109, '% par an', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('FP.CPI.TOTL.ZG', 'economy', 'Inflation (prix à la consommation)', 8.1606, '% par an', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('FP.CPI.TOTL.ZG', 'economy', 'Inflation (prix à la consommation)', 9.8743, '% par an', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('FP.CPI.TOTL.ZG', 'economy', 'Inflation (prix à la consommation)', 7.6134, '% par an', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('FP.CPI.TOTL.ZG', 'economy', 'Inflation (prix à la consommation)', 8.0505, '% par an', 2025, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SI.POV.DDAY', 'economy', 'Pauvreté (seuil international)', 78.5, '% de la population', 1999, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SI.POV.DDAY?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SI.POV.DDAY', 'economy', 'Pauvreté (seuil international)', 57.5, '% de la population', 2001, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SI.POV.DDAY?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SI.POV.DDAY', 'economy', 'Pauvreté (seuil international)', 55.3, '% de la population', 2005, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SI.POV.DDAY?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SI.POV.DDAY', 'economy', 'Pauvreté (seuil international)', 65.3, '% de la population', 2010, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SI.POV.DDAY?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SI.POV.DDAY', 'economy', 'Pauvreté (seuil international)', 67.3, '% de la population', 2012, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SI.POV.DDAY?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SI.POV.DDAY', 'economy', 'Pauvreté (seuil international)', 69.2, '% de la population', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SI.POV.DDAY?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('EG.ELC.ACCS.ZS', 'climate', 'Accès à l''électricité', 31, '% de la population', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('EG.ELC.ACCS.ZS', 'climate', 'Accès à l''électricité', 32, '% de la population', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('EG.ELC.ACCS.ZS', 'climate', 'Accès à l''électricité', 35.1, '% de la population', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('EG.ELC.ACCS.ZS', 'climate', 'Accès à l''électricité', 36.1, '% de la population', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('EG.ELC.ACCS.ZS', 'climate', 'Accès à l''électricité', 39.4, '% de la population', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('EG.ELC.ACCS.ZS', 'climate', 'Accès à l''électricité', 42.5, '% de la population', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('AG.LND.FRST.ZS', 'climate', 'Surface forestière', 18.3292, '% du territoire', 2019, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('AG.LND.FRST.ZS', 'climate', 'Surface forestière', 18.1222, '% du territoire', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('AG.LND.FRST.ZS', 'climate', 'Surface forestière', 17.9085, '% du territoire', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('AG.LND.FRST.ZS', 'climate', 'Surface forestière', 17.6949, '% du territoire', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('AG.LND.FRST.ZS', 'climate', 'Surface forestière', 17.4813, '% du territoire', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('AG.LND.FRST.ZS', 'climate', 'Surface forestière', 17.2677, '% du territoire', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/AG.LND.FRST.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SG.GEN.PARL.ZS', 'elections', 'Sièges occupés par des femmes au Parlement', 17.8808, '%', 2020, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SG.GEN.PARL.ZS', 'elections', 'Sièges occupés par des femmes au Parlement', 17.8808, '%', 2021, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SG.GEN.PARL.ZS', 'elections', 'Sièges occupés par des femmes au Parlement', 18.543, '%', 2022, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SG.GEN.PARL.ZS', 'elections', 'Sièges occupés par des femmes au Parlement', 18.543, '%', 2023, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SG.GEN.PARL.ZS', 'elections', 'Sièges occupés par des femmes au Parlement', 15.9509, '%', 2024, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;
insert into public.statistic_indicators (code, theme, name, value, unit, year, source, source_url, source_updated_at, validated)
values ('SG.GEN.PARL.ZS', 'elections', 'Sièges occupés par des femmes au Parlement', 14.1104, '%', 2025, 'Banque mondiale — Indicateurs du développement dans le monde (WDI)', 'https://data.worldbank.org/indicator/SG.GEN.PARL.ZS?locations=MG', '2026-10-08', true)
on conflict (code, year) where code is not null do nothing;

-- Trois cas de démonstration (cahier des charges, section 17), créés au nom du premier membre de l'équipe éditoriale
insert into public.cases (title, claim, category, region, created_by)
select c.title, c.claim, c.category, c.region, p.id
from (values
  ('Photo d''inondation « à Antananarivo ce matin »', 'Une photo montre Antananarivo inondée ce matin après le passage du cyclone.', 'climat', 'Analamanga'),
  ('Bilan chiffré du cyclone diffusé sur WhatsApp', 'Le cyclone aurait fait 3 000 victimes selon un message viral sans source.', 'catastrophes', 'Atsinanana'),
  ('Vidéo d''un pont effondré attribuée à la RN7', 'Une vidéo montrerait l''effondrement d''un pont sur la RN7 cette semaine.', 'infrastructures', 'Haute Matsiatra')
) as c(title, claim, category, region)
cross join lateral (select id from public.profiles where role in ('journalist', 'fact_checker', 'editor_in_chief') and active order by created_at limit 1) p
where not exists (select 1 from public.cases k where k.title = c.title);
