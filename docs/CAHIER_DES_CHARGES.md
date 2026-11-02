# MASO — Cahier des charges fonctionnel et technique (v3.0)

> **MASO — Module d'Authentification et de Source Originale.**
> Plateforme web et application mobile (PWA) de vérification de l'information pour les journalistes et professionnels des médias de Madagascar.
>
> Ce document est la version Markdown du cahier des charges final v3.0 (PDF original : [references/MASO_Cahier_des_charges_v3.pdf](references/MASO_Cahier_des_charges_v3.pdf)).
> Le projet s'appelait **MAZAVA** dans le PDF : **le nom officiel de l'application est désormais MASO**. Partout où le PDF dit « MAZAVA », lire « MASO ».

Hackathon FANILO 2026 · 42 Antananarivo, Andraharo · 2–3 novembre 2026

| | |
|---|---|
| Type | PWA mobile installable + plateforme web de rédaction + portail public |
| Utilisateurs | Journaliste, fact-checker, rédacteur en chef, administrateur, public |
| Langues | Malagasy, français, anglais |
| Zone | Madagascar — connexion instable, Facebook et WhatsApp comme vecteurs |
| Principe | L'outil fournit des indices ; les professionnels décident |
| Charte graphique | Voir [DESIGN.md](DESIGN.md) (tirée de la maquette mobile fournie) |

---

## 1. Contexte et objectifs

**Contexte.** Le projet FANILO, porté par l'Institut français de Madagascar et le service de presse de l'Ambassade de France, vise à renforcer la résilience informationnelle à Madagascar. Le hackathon (2–3 novembre 2026, 42 Antananarivo) demande de transformer un besoin concret des professionnels des médias en une première application web ou mobile fonctionnelle en 48 heures, présentée au jury le 4 novembre à l'IFM Analakely (pitch de 3 minutes).

**Problème.** L'IA générative permet de fabriquer images, vidéos, voix et textes réalistes ; des contenus authentiques sont aussi détournés de leur contexte (photo ancienne présentée comme récente, vidéo d'un autre pays, chiffre truqué). À Madagascar, ces contenus circulent surtout par Facebook, WhatsApp et TikTok, en malgache et en français, en particulier lors des périodes sensibles : élections, cyclones et inondations, crises sanitaires. Les journalistes décrivent des outils dispersés et souvent en anglais, un accès difficile aux experts et aux chiffres officiels à jour, une connexion instable et l'absence de traçabilité des vérifications.

**Objectif général.** Donner aux journalistes, fact-checkers et rédactions un outil unique, adapté au contexte malgache, pour recevoir ou repérer un contenu suspect, le vérifier, documenter la vérification, faire valider par le rédacteur en chef et publier un rapport fiable, consultable et partageable par le public.

| Objectif | Indicateur |
|---|---|
| Réduire le temps entre la réception d'un contenu suspect et un verdict documenté | Temps mesuré en démo comparé à une vérification manuelle ; puis délai médian < 24 h pour les cas simples |
| Garder l'humain au centre | 100 % des verdicts publiés attribués et validés par des humains, horodatés |
| Éviter les doublons de vérification | Part des contenus reconnus comme « déjà vérifiés » (empreinte, recherche dans la bibliothèque) |
| Fonctionner sur le terrain | Parcours principal utilisable sans connexion, démontré en direct |
| Faciliter l'accès à l'expertise et aux chiffres | Annuaire et indicateurs sourcés et datés disponibles en quelques secondes |
| Toucher le public | Signalements reçus, consultations et partages des rapports publiés |
| Compléter l'existant | Interopérer avec les initiatives existantes (iVerify, What The Fact, observatoires des médias, bases de fact-checks) |

## 2. Principes directeurs

| Principe | Traduction concrète |
|---|---|
| Indices, pas verdicts automatiques | Chaque analyse produit des indices avec niveau de confiance, limites et outil utilisé. Aucun « vrai / faux » calculé par la machine. |
| La décision est humaine | Le fact-checker propose le verdict ; seul le rédacteur en chef valide et publie. |
| IA « zéro invention » | L'IA ne travaille que sur le contenu du dossier, cite chaque élément, s'abstient si l'information manque (section 10). |
| Terrain d'abord | Mobile, bas débit, hors connexion, partage direct depuis Facebook/WhatsApp. |
| Malagasy, français, anglais | Interface, rapports et modèles dans les trois langues, avec glossaire. |
| Tout est sourcé et daté | Aucun chiffre sans source ni date ; aucune preuve sans origine ni empreinte. |
| Traçabilité complète | Journal d'audit de toutes les actions, versions des rapports, chaîne de conservation des preuves. |
| Protection des personnes | Sources confidentielles protégées, consentement pour l'annuaire, signalements anonymisables. |
| Un parcours complet plutôt que tout à moitié | Priorités strictes (section 5) ; chaque écran livré fonctionne réellement. |

## 3. Utilisateurs, rôles et droits

| Rôle | Mission |
|---|---|
| Public (sans compte) | Signale un contenu suspect, consulte les rapports publiés, vérifie l'authenticité d'un badge de journaliste ou d'un rapport (QR). |
| Journaliste | Reçoit ou repère un contenu, crée le dossier, lance les analyses, collecte sources et preuves, contacte les personnes-ressources, enquête sur le terrain, rédige le rapport. |
| Fact-checker | Approfondit les analyses, complète la checklist, propose le verdict motivé. |
| Rédacteur en chef | Contrôle éditorial : relit, demande corrections ou vérifications, valide et publie, consulte l'audit. |
| Administrateur | Comptes, rôles, badges, rédactions, paramètres, sources de veille, modèles, glossaire. Pas d'accès par défaut aux sources confidentielles. |

| Action | Public | Journaliste | Fact-checker | Réd. chef | Admin |
|---|---|---|---|---|---|
| Signaler une rumeur | Oui | Oui | Oui | Oui | Oui |
| Créer / prendre en charge un dossier | Non | Oui | Oui | Oui | Non |
| Lancer les analyses | Analyse publique limitée | Oui | Oui | Oui | Non |
| Ajouter sources, preuves, contacts | Non | Oui | Oui | Oui | Non |
| Voir une source confidentielle | Non | Si responsable du dossier | Sur autorisation | Oui (son équipe) | Non |
| Proposer un verdict | Non | Non | Oui | Oui | Non |
| Valider et publier un rapport | Non | Non | Non | Oui | Non |
| Gérer annuaires et statistiques | Non | Proposer | Proposer | Valider | Oui |
| Gérer comptes, rôles et badges | Non | Non | Non | Non | Oui |
| Voir le journal d'audit | Non | Non | Non | Oui | Oui |

**Règles impératives (appliquées côté serveur, pas seulement dans l'interface)** : personne ne valide son propre travail ; tout changement de statut est horodaté et motivé ; toute consultation d'une donnée confidentielle est journalisée.

## 4. Les 9 besoins exprimés par les journalistes

| N° | Besoin | Réponse MASO | Utilité | Écrans |
|---|---|---|---|---|
| 1 | Vérification des sources et fiabilité | Fiches sources avec score explicable par critères, analyse de liens et domaines, recherche de vérifications existantes, checklist guidée | Évite de relayer une rumeur ; réutilise les vérifications publiées | M5, M6, M7, M13, W5, W8 |
| 2 | Authentification des images | Empreinte, métadonnées, C2PA, recompression, recherche inversée, images clés vidéo, indices de génération IA, aide à la géolocalisation | Repère vite une image recyclée ou manipulée ; analyses locales sans réseau | M3, M4, W5 |
| 3 | Veille nationale | Fil d'alertes (médias, signalements, mots-clés), carte par région, tendances, regroupement, prise en charge en un clic | Détecter une rumeur avant qu'elle devienne virale | M2, W3 |
| 4 | Multilinguisme | Interface et rapports FR/MG/EN, glossaire, traduction assistée relue | Toucher le public malgachophone et les radios régionales | Transversal, M11, W11 |
| 5 | Plateforme / mobile | PWA installable pour le terrain ; plateforme web pour la coordination | Le bon outil à chaque moment | M1–M14, W1–W13 |
| 6 | Accès hors connexion | Cache, analyses locales, rédaction et export sans réseau, synchronisation différée | Utilisable en zone coupée | Transversal |
| 7 | Annuaire des personnes-ressources | Experts, porte-parole, institutions par domaine, région, langue ; contact en un geste ; validation périodique | Trouver la bonne voix en quelques secondes | M8, M9, W9 |
| 8 | Statistiques actualisées | Indicateurs sourcés et datés, comparaison affirmation / donnée officielle | Chiffres traçables ; repérage d'un chiffre truqué | M10, W10 |
| 9 | Inspiration éditoriale | Assistant : angles, titres, questions, contexte, formats radio / réseaux / article / démenti, borné au dossier | Passer vite de la vérification à la diffusion | M11, W11 |

## 5. Périmètre et priorités

| Priorité | Contenu | Objectif |
|---|---|---|
| **P0 — parfait en démo** | Connexion et rôles ; partage / import d'un contenu ; analyse image complète ; analyse lien ; dossier, preuves, sources, checklist ; verdict proposé ; revue et publication par le rédacteur en chef ; rapport public ; hors connexion du parcours principal ; FR/MG | Parcours de bout en bout sans faille (besoins 1, 2, 5, 6) |
| **P1 — fonctionnel simple** | Annuaire des personnes-ressources ; statistiques (préchargées + comparaison) ; assistant éditorial borné ; analyse de texte ; images clés vidéo ; export PDF ; signalement public et « déjà vérifié » ; anglais | Besoins 4, 7, 8, 9 visibles |
| **P2 — minimal crédible** | Veille : flux RSS, signalements, regroupement par mots-clés, carte par région ; badge QR de journaliste ; tableau de bord par rôle | Besoin 3 démontrable |
| Hors hackathon | Bot WhatsApp ; collecte automatique sur les réseaux sociaux ; détection avancée de deepfakes vidéo et voix ; application native ; intégration CMS ; multi-rédactions | Feuille de route (section 19) |

## 6. Parcours principal et statuts

**Parcours** : contenu suspect (signalement public, alerte de veille ou partage depuis le téléphone) → création ou prise en charge d'un dossier → analyses techniques → collecte des preuves et évaluation des sources → contacts et demandes de confirmation → checklist complétée → verdict proposé par le fact-checker → revue du rédacteur en chef → publication du rapport → consultation et partage par le public.

| Statut du dossier | Signification | Qui le déclenche |
|---|---|---|
| Nouveau | Créé depuis une alerte, un signalement ou un partage | Système / journaliste |
| En analyse | Analyses, collecte de preuves et de sources en cours | Journaliste, fact-checker |
| En attente de réponse | Une confirmation est demandée à une personne ou institution | Journaliste |
| À relire | Verdict proposé, rapport soumis au rédacteur en chef | Fact-checker |
| Correction demandée | Retour au journaliste / fact-checker avec commentaires | Rédacteur en chef |
| Validé | Rapport approuvé, signé numériquement | Rédacteur en chef |
| Publié | Visible sur le portail public, partageable par lien ou QR | Rédacteur en chef |
| Classé | Sans suite, hors périmètre ou doublon (motif obligatoire) | Rédacteur en chef |

Statuts d'une **alerte de veille** : nouveau, en cours, vérifié, démenti.
Statuts d'une **demande de confirmation** : à contacter, demande envoyée, réponse reçue, relance nécessaire, sans réponse.

## 7. Application mobile (PWA) — page par page

`[Hors ligne]` indique ce qui fonctionne sans connexion. La PWA sert au terrain ; la plateforme web sert à la coordination.

- **M1 — Accueil, connexion et onboarding (P0)** : connexion e-mail + mot de passe ou lien magique ; choix de la langue (MG/FR/EN) ; présentation en 3 écrans ; invitation à installer la PWA ; mode invité limité au portail public, à l'annuaire public et aux statistiques. `[Hors ligne]` session conservée après la première connexion.
- **M2 — Veille (accueil connecté) (P2)** : fil d'alertes par niveau (faible, moyen, élevé) ; filtres région, thème, langue, statut ; bouton *Signaler une rumeur* (texte, capture, lien) ; bouton *Prendre en charge* qui crée le dossier ; indication « déjà prise en charge par… ». `[Hors ligne]` 50 dernières alertes en cache ; signalements en file d'attente.
- **M3 — Vérifier (hub) (P0)** : quatre entrées image, vidéo, lien, texte ; prise de vue ou import ; capture d'écran ; réception directe depuis Facebook, WhatsApp ou la galerie via le menu Partager (Web Share Target) ; rattachement à un dossier existant ou création. `[Hors ligne]` entrées image et texte.
- **M4 — Analyse image et vidéo (P0 image, P1 vidéo)** : étapes en direct (section 9) : empreinte et « déjà vérifié ? », métadonnées (date, appareil, GPS, logiciel), C2PA, analyse de recompression avec carte, recherche inversée (Google Lens, TinEye, Yandex, Bing, InVID-WeVerify) ; indices de génération IA avec confiance, outil et avertissement ; vidéo : infos techniques et images clés ; carte de géolocalisation ; checklist visuelle (ombres, météo, panneaux, langue visible, plaques, végétation) ; bouton *Ajouter au dossier*. `[Hors ligne]` empreinte, métadonnées, recompression, checklist.
- **M5 — Analyse de lien et de source (P0)** : âge du domaine (RDAP/WHOIS), HTTPS, hébergeur, présence dans l'annuaire des médias ; vérifications existantes (bibliothèque interne + Google Fact Check Tools) ; archivage Wayback Machine enregistré comme preuve ; accès à la fiche source.
- **M6 — Analyse de texte et de rumeur (P1)** : texte MG ou FR ; extraction des affirmations vérifiables (noms, lieux, dates, chiffres, citations) ; vérifications existantes ; rapprochement des chiffres avec M10 ; signaux de manipulation (urgence, appel au partage, absence de source, chiffres non sourcés) ; indice de texte IA expérimental ; traduction MG ⇄ FR relue. `[Hors ligne]` signaux de manipulation de base.
- **M7 — Fiche source (P0)** : identité, type, ancienneté, contacts ; score de fiabilité par critère (identité claire, transparence, ancienneté, historique de démentis, compétence, proximité avec les faits, indépendance, corroboration) renseigné par un humain avec justification — le score n'évalue que la source ; vérifications liées ; mention « vérifiée » ; niveau de confidentialité. `[Hors ligne]` fiches consultées ou favorites.
- **M8 — Ressources : annuaire des personnes-ressources (P1)** : recherche et filtres (domaine, région, langue, organisation) ; suggestions selon la catégorie du dossier ; favoris. `[Hors ligne]` annuaire en pack.
- **M9 — Fiche personne-ressource (P1)** : coordonnées selon visibilité consentie, domaines, langues, région, disponibilité, dernière validation ; boutons Appeler, WhatsApp, E-mail ; notes privées ; Ajouter au dossier ; demande de confirmation et réponse. `[Hors ligne]` favoris et notes.
- **M10 — Statistiques (P1)** : indicateurs par thème (démographie, santé, éducation, économie, climat et catastrophes, élections) : valeur, année, source, lien officiel, mise à jour, graphique ; mode *Comparer à une affirmation* ; alerte « donnée ancienne ». `[Hors ligne]` dernière version téléchargée, date affichée.
- **M11 — Rédiger : assistant éditorial (P1)** : format (brève radio ~45 s, post réseau, article court, rapport de démenti) et langue ; angles, titres, questions d'interview, contexte, ce qui manque — uniquement à partir du dossier ; mention « Brouillon assisté par IA — à relire ». `[Hors ligne]` modèles sans IA.
- **M12 — Mes dossiers (P0)** : liste filtrable par statut, recherche, priorité, échéance ; indicateur de synchronisation. `[Hors ligne]` complet.
- **M13 — Dossier et rapport (P0)** : onglets résumé/affirmation · preuves · sources · contacts · chiffres cités · checklist · rapport · historique ; verdict proposé avec confiance et justification liée aux preuves ; liaison affirmation ↔ preuve ; historique des versions ; workflow *Soumettre au fact-checker* puis *Soumettre au rédacteur en chef* (bloqué sans affirmation, sans source ou checklist incomplète non justifiée) ; export PDF, copie texte, partage lien/QR après publication. `[Hors ligne]` édition, export PDF, copie.
- **M14 — Profil et paramètres (P0 sauf badge P2)** : langue ; mode économie de données ; packs hors ligne ; badge d'identité avec QR ; notifications ; code PIN ; déconnexion.

## 8. Plateforme web — page par page

- **W0 — Portail public (P0 rapports, P1 signalement, P2 badge)** : accueil (derniers rapports, recherche par mot-clé, verdict, thème, région) ; signaler sans compte (fichier ou lien, texte, plateforme, contact facultatif, code de suivi) ; résultat d'un dépôt : « Déjà vérifié » si empreinte/lien connu, sinon indices simples et « Non vérifié à ce stade, transmis aux journalistes » — jamais de verdict automatique ; page rapport (affirmation, verdict, explication, preuves publiables, méthode, date, rédaction, corrections, aperçu de partage Facebook/WhatsApp) ; vérifier un badge ou un rapport (QR) ; anti-abus (débit, taille max, déduplication, CAPTCHA léger).
- **W1 — Connexion et récupération (P0)** : connexion, mot de passe oublié, invitation par e-mail, langue.
- **W2 — Tableau de bord (P1)** : indicateurs selon le rôle ; file de travail ; activité récente ; notifications ; raccourcis.
- **W3 — Veille nationale (P2)** : carte de Madagascar par région, fil d'alertes, tendances ; flux RSS, signalements, règles de mots-clés ; regroupement des rumeurs ; attribution ; historique.
- **W4 — File de vérification (P0)** : colonnes par statut, attribution, priorité (portée, gravité, urgence), échéance, filtres, commentaires avec @.
- **W5 — Poste de travail d'analyse (P0)** : version grand écran de M4–M7 : comparaison côte à côte, carte, panneau de preuves, notes, commentaires, checklist, verdict proposé.
- **W6 — Revue éditoriale (P0)** : rapport avec affirmations liées aux preuves, affirmations non étayées en évidence ; comparaison de versions ; décisions *Valider et publier*, *Demander une correction*, *Demander une vérification complémentaire*, *Rejeter* — commentaire obligatoire ; signature numérique ; publication en un clic.
- **W7 — Bibliothèque des rapports (P1)** : recherche (mot-clé, verdict, région, thème, langue, date) ; export PDF ; partage.
- **W8 — Annuaire des médias et sources (P1)** : CRUD, import CSV, critères du score, validation, historique.
- **W9 — Annuaire des personnes-ressources (P1)** : CRUD, import CSV, validation périodique, consentement, visibilité, actif/inactif, droit de retrait.
- **W10 — Statistiques (P1)** : catalogue ; import API Banque mondiale ou CSV ; saisie manuelle avec source obligatoire ; date de mise à jour ; alertes de péremption ; graphiques.
- **W11 — Assistant éditorial (P1)** : rédaction longue ; modèles par format et langue ; glossaire FR/MG ; historique des générations ; export vers le rapport.
- **W12 — Administration (P0 comptes, P2 badges)** : comptes, suspension, rôles, rédactions, invitations ; badges QR ; statistiques d'usage.
- **W13 — Paramètres et journal d'audit (P1)** : langues et glossaire ; modèles ; niveaux d'alerte ; sources de veille ; journal (qui, quoi, quand, avant/après) ; export ; mentions légales et consentements.

## 9. Moteur d'analyse

Chaque analyse s'exécute en étapes réelles affichées en direct (en cours, terminée, non applicable, en attente de réseau). Aucune attente artificielle. Les analyses **locales** s'exécutent dans le navigateur et fonctionnent hors connexion.

| Étape | Contrôle | Où | Outils |
|---|---|---|---|
| 1. Réception | SHA-256 de l'original conservé intact ; type réel du fichier ; compression en mode économie | Local + serveur | Web Crypto, hashlib |
| 2. Déjà vu ? | Empreinte perceptuelle comparée aux rapports, dossiers, signalements ; Google Fact Check Tools | Serveur | imagehash (pHash), API Fact Check |
| 3. Métadonnées | Format, dimensions, date, appareil, logiciel, GPS ; explique l'absence de métadonnées | Local | exifr |
| 4. Provenance | C2PA : créateur, outils, mention d'IA, validité de signature | Serveur | c2pa-python / c2patool |
| 5. Recompression | ELA avec carte ; indice à interpréter | Local | Canvas |
| 6. Recherche inversée | Liens préremplis Google Lens, TinEye, Yandex, Bing, InVID-WeVerify | Externe | Liens |
| 7. Génération IA | Indice par modèle spécialisé avec nom, version, confiance, avertissement | Serveur | Modèle Hugging Face |
| 8. Vidéo | Durée, codec, fréquence ; images clés analysables | Serveur | FFmpeg / ffprobe |
| 9. Lien | Âge du domaine, HTTPS, hébergeur, annuaire des médias, archive | Serveur | RDAP/WHOIS, Wayback |
| 10. Texte | Affirmations, entités, chiffres ; signaux de manipulation ; statistiques | Local + serveur | Règles + LLM borné |
| 11. Fiche d'analyse | Indices, limites, outils et versions, date, commentaires ; ajout au dossier | Local + serveur | — |

**Règles de présentation** : chaque résultat est un indice qualifié (*aucun indice / indice faible / indice à examiner*) avec ses limites en langage simple (ex. : « Aucune métadonnée : c'est le cas de presque toute image partagée sur WhatsApp ; ce n'est pas une preuve de manipulation. »). Les indices IA ne sont jamais une conclusion. Les fichiers originaux ne sont jamais modifiés.

## 10. Politique « IA zéro invention »

| Règle | Mise en œuvre |
|---|---|
| 1. Contexte fermé | Le modèle reçoit uniquement des extraits numérotés du dossier : preuves [P1], sources [S2], chiffres [C3], personnes-ressources [R4], checklist [K5]. Pas d'accès web. |
| 2. Citation obligatoire | Chaque phrase factuelle se termine par au moins un identifiant d'extrait ; sortie en JSON structuré. |
| 3. Contrôle automatique | Le serveur vérifie que chaque identifiant existe et que nombres, dates et noms propres figurent dans les extraits cités. Phrase non conforme retirée ou signalée. |
| 4. Abstention | « Information insuffisante dans le dossier » + liste de ce qui manque. |
| 5. Aucun verdict | Le modèle ne propose jamais de verdict ni de niveau de confiance. |
| 6. Paramètres prudents | Température 0 à 0,2 ; consignes versionnées ; longueur bornée. |
| 7. Transparence | Mention « Brouillon assisté par IA — à relire » ; journalisation (modèle, date, consigne, extraits, sortie, conformité). |
| 8. Malgache | Modèles et formulations malgaches rédigés par l'équipe ; relecture humaine obligatoire. |
| 9. Dégradation propre | Sans modèle, l'assistant est masqué et les modèles sans IA restent utilisables. |

Fournisseur : interface unique **`LLMProvider`** avec deux implémentations interchangeables : une API à offre gratuite (Gemini ou Groq) et un modèle local via Ollama.

## 11. Verdicts et checklist

### 11.1 Échelle de verdicts (attribués par des humains)

| Verdict | Définition |
|---|---|
| Confirmé | L'affirmation est exacte et étayée par des preuves |
| Plutôt vrai | Exacte pour l'essentiel, avec des imprécisions mineures |
| Trompeur | Contient des éléments exacts mais donne une impression fausse |
| Hors contexte | Contenu authentique présenté avec une date, un lieu ou un sens qui ne sont pas les siens |
| Faux | L'affirmation est contredite par les preuves |
| Contenu fabriqué | Image, vidéo, audio ou document créé ou modifié pour tromper (dont IA générative) |
| Non vérifiable | Les éléments disponibles ne permettent pas de conclure à ce jour |

Chaque verdict porte un niveau de confiance (élevé, moyen, faible) et une justification de 3 à 5 phrases renvoyant chacune à une preuve. **Un verdict n'est jamais signalé uniquement par un code visuel : son libellé est toujours écrit.**

### 11.2 Checklist guidée

Chaque point a un état (à faire, en cours, fait, non applicable), une explication, au moins une preuve liée lorsqu'il est « fait », un auteur et une date.

| Bloc | Questions |
|---|---|
| Origine | Qui a publié en premier ? Première date retrouvée ? Compte d'origine identifiable et crédible ? Contenu repris ailleurs ? |
| Contexte | Lieu et date confirmés ? Version plus ancienne ? Correspond à l'événement ? |
| Contenu | Analyse technique faite (M4) ? Recherche inversée faite ? Chiffres comparés à une source officielle (M10) ? |
| Sources | Au moins deux sources indépendantes ? Connaissance directe des faits ? Conflits d'intérêts examinés ? Déclarations recoupées ? |
| Contradictoire | Personne ou institution concernée contactée ? Réponse conservée ? Éléments contraires examinés ? |
| Conclusion | Verdict, niveau de confiance et justification renvoyant aux preuves. |

## 12. Fonctionnalités transverses

| Fonction | Exigences |
|---|---|
| Hors connexion | Service worker et IndexedDB ; cache dossiers, alertes, annuaire, statistiques, sources ; saisie et analyses locales ; file de synchronisation ; état visible de chaque donnée. |
| Multilinguisme | Toutes les chaînes en MG/FR/EN ; glossaire modifiable (FR, MG, contexte) ; rapports dans la langue choisie. |
| Transparence IA | Indices avec confiance, limites et outil ; aucune décision automatique. |
| Notifications | Affectation, alerte élevée, résultat d'analyse, demande de relecture, correction demandée, rapport validé ou publié, relance. |
| Bas débit | Compression des images, mode économie de données, chargement progressif, premier chargement léger. |
| Accessibilité | Grandes zones tactiles, textes lisibles, contrastes suffisants, mode sombre, information jamais portée par le seul code visuel. |
| Collaboration | Commentaires par élément, mentions @, historique des versions, indication de modification en cours. |

## 13. Architecture et outils

| Couche | Choix retenu | Rôle |
|---|---|---|
| Front (PWA + web) | React, TypeScript, Vite, Tailwind, vite-plugin-pwa, react-i18next, Recharts, Leaflet + OpenStreetMap | Une base de code pour mobile et web |
| Données locales | IndexedDB via Dexie | Cache, brouillons, file de synchronisation |
| Analyses locales | exifr, Canvas, Web Crypto (SHA-256), règles texte | Hors connexion |
| Backend | Supabase : PostgreSQL, auth, stockage privé, RLS par rôle, temps réel | Sécurité et rapidité |
| Service d'analyse | Python (FastAPI) : imagehash, c2pa-python, FFmpeg, modèle d'indices IA, RDAP | Meilleures bibliothèques d'analyse |
| Fonctions serveur | Edge Functions Supabase ou Node.js : tâches planifiées, contrôle des sorties IA, signature des rapports | Logique sensible côté serveur |
| IA générative | LLMProvider : API à offre gratuite ou Ollama local | Extraction, traduction, assistant bornés |
| Données externes | Google Fact Check Tools ; Banque mondiale ; INSTAT, OMS, FAO ; RSS | Vérifications et chiffres officiels |
| Export | pdf-lib ou jsPDF côté client | PDF même hors ligne |
| Déploiement | Vercel (front), Render ou VPS (analyse), Supabase ; dépôt GitHub unique | Démo accessible depuis un téléphone |

## 14. Modèle de données (entités principales)

| Entité | Champs clés |
|---|---|
| Utilisateur | id, nom, e-mail, rôle, langue, rédaction, badge (QR, validité, révoqué), actif |
| Rédaction | id, nom, type (presse, radio, TV, en ligne), région |
| Alerte / Signalement | id, contenu ou lien, texte, plateforme, région, thème, langue, niveau, statut, SHA-256, empreinte perceptuelle, occurrences, contact facultatif, code de suivi |
| Dossier | id, titre, affirmation, catégorie, région, priorité, statut, assigné, échéance, verdict, confiance, justification |
| Preuve | id, type, fichier ou lien, archive, SHA-256, empreinte, origine, ajoutée par, date, dossier, résultats d'analyse |
| Analyse | id, preuve, étapes (état, résultat, limites, outil, version), date |
| Source | id, type, identité, ancienneté, critères et justifications, score, état, confidentiel (chiffré), historique |
| Personne-ressource | id, nom, fonction, organisation, domaines, région, langues, contacts, visibilité, consentement, dernière validation, actif |
| Demande de confirmation | id, dossier, personne, canal, date d'envoi, statut, réponse, relance |
| Indicateur statistique | id, thème, nom, valeur, unité, année, source, lien, mise à jour |
| ChecklistItem | id, dossier, bloc, question, état, explication, preuves liées, auteur, date |
| Rapport | id, dossier, langue, contenu, liens affirmation-preuve, versions, signature, statut de publication, corrections |
| Décision éditoriale | id, rapport, type, commentaire, auteur, date |
| Suggestion IA | id, dossier, fonction, modèle, consigne, extraits cités, sortie, conformité, date |
| Commentaire | id, élément ciblé, auteur, texte, mentions, date |
| Glossaire | id, terme FR, terme MG, terme EN, contexte |
| Journal d'audit | id, utilisateur, action, entité, avant, après, date (ajout seul) |

## 15. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| Performance | Téléphone d'entrée de gamme et connexion lente ; analyse d'image < 15 s ; tailles max paramétrables (20 Mo image, 100 Mo vidéo). |
| Sécurité | HTTPS ; auth gérée ; RLS côté serveur ; stockage privé des preuves ; validation du type réel ; XSS/CSRF ; limitation de débit ; code PIN mobile. |
| Données personnelles | Collecte minimale ; consentement et visibilité ; signalements anonymisables ; sources confidentielles chiffrées ; suppression sur demande ; loi malgache sur les données personnelles. |
| Traçabilité | Audit en ajout seul ; versions des rapports ; signature numérique ; chaîne de conservation. |
| Fiabilité | Sauvegardes ; reprise de synchronisation ; dégradation propre (liens de repli). |
| Maintenabilité | TypeScript typé ; dépôt unique ; variables d'environnement ; README ; tests sur les règles critiques (droits, workflow, sorties IA). |

## 16. Planning (48 h)

Lancement lundi 2 novembre 8 h ; gel du code mardi 3 novembre 18 h ; soumission 20 h ; pitch mercredi 4 novembre 8 h 30.
La répartition détaillée par module est dans [MODULES.md](MODULES.md).

## 17. Démonstration (pitch 3 min)

| Temps | Contenu |
|---|---|
| 0:00 – 0:25 | Problème : pendant un cyclone, une photo d'inondation « à Antananarivo ce matin » circule sur Facebook. |
| 0:25 – 0:50 | Alerte dans la veille, signalée aussi par le public ; la journaliste la prend en charge et partage l'image vers MASO. |
| 0:50 – 1:40 | Analyse en direct : métadonnées effacées (expliqué), recherche inversée → même photo deux ans plus tôt ; fiabilité de la page émettrice ; pluviométrie officielle comparée ; expert météo contacté via l'annuaire. |
| 1:40 – 2:10 | Brève radio en malgache proposée par l'assistant, chaque phrase référencée ; une phrase sans preuve est écartée. |
| 2:10 – 2:40 | Coupure réseau : l'application continue, rapport exporté en PDF ; au retour du réseau, le rédacteur en chef valide « Hors contexte » et publie ; partage WhatsApp. |
| 2:40 – 3:00 | Impact : 9 besoins couverts, temps mesuré, coût quasi nul ; proposition de pilote. |

**Critères de réussite** : parcours complet sur un cas malgache réel + 2 cas de secours (chiffre truqué, vidéo d'un autre pays) ; 9 besoins visibles ; temps mesuré ; hors connexion démontré ; réponses prêtes (IA qui n'invente pas, annuaire, protection des sources, financement).

## 18. Risques et réponses

| Risque | Réponse |
|---|---|
| Périmètre trop large | Priorités P0/P1/P2, gel du code mardi 18 h |
| Verdict automatique perçu comme vérité | Aucun verdict automatique ; indices avec limites |
| Indices IA peu fiables | Présentés comme indices, avec outil et confiance |
| Invention par l'IA | Contexte fermé, citations contrôlées, abstention, journalisation |
| Données malgaches insuffisantes | Données de démo préparées tôt, toujours datées |
| Panne réseau en démo | Cache, Ollama local, vidéo de secours |
| Exposition d'une source confidentielle | Chiffrement, droits restreints, journal des consultations |
| Données personnelles de l'annuaire | Consentement, validation, visibilité, droit de retrait |
| Abus du signalement public | Débit, taille max, déduplication, CAPTCHA |
| Dépendance aux API externes | Liens de repli, fonctions locales prioritaires |
| Qualité du malgache produit par l'IA | Modèles rédigés par l'équipe, relecture humaine |

## 19. Feuille de route

| Phase | Contenu |
|---|---|
| Mois 1–2 : pilote | 3 à 5 rédactions partenaires ; formation ; audit de sécurité ; enrichissement annuaire et statistiques |
| Mois 3–6 : extension | Bot WhatsApp ; audio et voix synthétiques ; import automatique de statistiques ; badges QR généralisés |
| Mois 6–12 : réseau | Multi-rédactions ; alertes communes en période de crise ; intégration CMS ; applications natives |

## 20. Glossaire

| Terme | Définition |
|---|---|
| C2PA / Content Credentials | Norme ouverte qui inscrit dans un fichier l'historique signé de sa création et de ses modifications |
| ELA (analyse de recompression) | Visualise les écarts de compression JPEG pouvant révéler une zone retouchée ; indice, pas preuve |
| Empreinte perceptuelle (pHash) | Signature d'image stable malgré recadrage léger ou recompression |
| SHA-256 | Empreinte cryptographique garantissant qu'un fichier n'a pas été modifié |
| PWA | Application web installable sur téléphone, capable de fonctionner hors connexion |
| RLS | Row Level Security : règles d'accès appliquées ligne par ligne dans la base |
| RDAP / WHOIS | Services publics donnant la date de création d'un nom de domaine |
| Web Share Target | Permet à la PWA d'apparaître dans le menu « Partager » du téléphone |
| Recherche inversée | Recherche d'une image à partir de l'image elle-même |
| Contexte fermé (RAG borné) | Le modèle répond uniquement à partir des documents fournis, avec citations |
