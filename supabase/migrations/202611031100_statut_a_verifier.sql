-- MASO — Nouveau statut « À vérifier » : l'analyse du journaliste attend la vérification humaine du fact-checker.
-- Fichier séparé : une nouvelle valeur d'énumération ne peut être utilisée qu'après la fin de la transaction
-- qui l'a créée (dans l'éditeur SQL de Supabase, exécuter ce fichier seul, puis le suivant).

alter type public.case_status add value if not exists 'to_verify' after 'in_analysis';
