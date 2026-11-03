# MASO — Service d'analyse (Python / FastAPI)

Analyses qui demandent un serveur. Les analyses locales (empreintes, métadonnées, recompression) tournent dans le navigateur, même hors ligne.

| Route | Rôle | Outil |
|---|---|---|
| `GET /health` | État du service et analyses disponibles | — |
| `POST /image/provenance` | Content Credentials (C2PA) : créateur, outils, IA générative, signature | c2pa-python |
| `POST /image/ai-clue` | Indice de génération par IA (jamais une conclusion) | Modèle Hugging Face (si `HF_TOKEN`) |
| `POST /video/analyse` | Durée, codec, résolution, images clés (intervalles + changements de plan) | FFmpeg via PyAV |
| `POST /link/analyse` | HTTPS, âge du domaine, hébergeur, dernière archive | RDAP, Wayback Machine |
| `POST /link/archive` | Archiver la page maintenant | Wayback Machine |
| `GET /factcheck?query=` | Vérifications déjà publiées | Google Fact Check Tools (si clé) |
| `POST /ai/assist` | Assistant éditorial borné aux extraits du dossier, sortie contrôlée « zéro invention » (section 10) | Groq, Gemini ou Ollama (`LLM_PROVIDER`) |
| `POST /veille/rss` | Lecture des flux RSS / Atom de la veille (10 au maximum) | httpx + defusedxml |

**Sécurité** : les adresses internes, privées ou sur un port non standard sont refusées, y compris après redirection (protection SSRF). Le type réel des fichiers est contrôlé (pas l'extension). Les tailles sont limitées (20 Mo image, 100 Mo vidéo). Le débit est limité par adresse IP.

## Lancer en local

Prérequis : Python 3.11 ou plus récent. FFmpeg n'a pas besoin d'être installé (fourni par PyAV).

```bash
cd services/analyse
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000     # http://localhost:8000/health
.venv/bin/python -m pytest                               # tests
```

Puis dans le `.env` du front : `VITE_ANALYSE_API_URL=http://localhost:8000`.

## Variables d'environnement (toutes facultatives)

À mettre dans le `.env` **à la racine du projet** (le service le lit au démarrage), puis relancer le service. Explication en clair et obtention des clés : [docs/GUIDE_TEST_MOD03.md](../../docs/GUIDE_TEST_MOD03.md#les-réglages-du-service-en-clair).

| Variable | Défaut | Rôle |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Adresses du front autorisées (CORS) — ajouter l'adresse publique en production |
| `GOOGLE_FACTCHECK_API_KEY` | vide (désactivé) | Clé Google Fact Check Tools |
| `HF_TOKEN` | vide (désactivé) | Jeton Hugging Face pour l'indice IA |
| `AI_IMAGE_MODEL` | `umm-maybe/AI-image-detector` | Modèle d'indice IA |
| `MAX_IMAGE_MB` / `MAX_VIDEO_MB` | `20` / `100` | Tailles maximales |
| `REQUESTS_PER_MINUTE` | `60` | Limite par adresse IP |
| `LLM_PROVIDER` | vide (premier configuré) | `groq`, `gemini` ou `ollama` |
| `LLM_API_KEY` | vide | Clé du fournisseur choisi (ou `GROQ_API_KEY` / `GEMINI_API_KEY`) |
| `GROQ_MODEL` / `GEMINI_MODEL` | `openai/gpt-oss-120b` / `gemini-2.0-flash` | Modèle utilisé |
| `OLLAMA_URL` / `OLLAMA_MODEL` | vide / `llama3.1` | Modèle local ; l'assistant n'est annoncé que si Ollama répond et que le modèle est installé |

Sans clé, chaque analyse concernée est simplement signalée « non configurée » dans l'application ; le reste fonctionne.

## Déployer (Render, VPS…)

```bash
docker build -t maso-analyse services/analyse
docker run -p 8000:8000 -e ALLOWED_ORIGINS=https://votre-front.example maso-analyse
```
