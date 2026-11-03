// Vérifie la configuration de MASO sans jamais afficher une clé : Supabase, service d'analyse,
// et chaque service externe (Google Fact Check, Hugging Face, Groq / Gemini / Ollama).
// Utilisation : npm run check:config                          (configuration locale)
//               npm run check:config -- https://maso-xxx.vercel.app   (site en ligne)
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const env = {}
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (match && !line.trim().startsWith('#')) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}
const value = (key) => process.env[key] || env[key] || ''

const ok = (label, detail = '') => console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`)
const ko = (label, fix) => console.log(`  ❌ ${label}\n     → ${fix}`)
const off = (label, fix) => console.log(`  ⚪ ${label} (facultatif)\n     → ${fix}`)

async function probe(url, init = {}, timeoutMs = 15000) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    return { status: response.status, body: await response.text(), headers: response.headers }
  } catch (error) {
    return { status: 0, body: String(error?.message ?? error) }
  }
}

const siteArg = process.argv.slice(2).find((arg) => /^https?:\/\//.test(arg))
if (siteArg) {
  await checkOnline(siteArg.replace(/\/$/, ''))
  process.exit(0)
}

/** Site en ligne : variables intégrées à la construction, service d'analyse joignable et autorisé (CORS). */
async function checkOnline(site) {
  console.log(`\nMASO — vérification du site en ligne ${site}\n`)
  const page = await probe(`${site}/connexion`)
  if (page.status !== 200) return ko(`Site injoignable (code ${page.status})`, 'vérifier l’adresse Vercel et que le déploiement est « Ready »')
  ok('Site en ligne')
  const main = page.body.match(/\/assets\/index-[^"']+\.js/)?.[0]
  if (!main) return ko('Code de l’application introuvable', 'le déploiement est peut-être incomplet : redéployer')
  const first = await probe(`${site}${main}`)
  const chunks = [...new Set(first.body.match(/assets\/[\w.-]+\.js/g) ?? [])]
  let code = first.body
  for (const chunk of chunks) code += (await probe(`${site}/${chunk}`)).body
  const commit = code.match(/commit (\w{7})/)?.[1]
  if (commit) ok('Version déployée', `commit ${commit}`)

  console.log('\nVariables intégrées au site (Vercel → Settings → Environment Variables)')
  const supabaseUrl = code.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0]
  // Clé publique Supabase : nouveau format (sb_publishable_…) ou ancien (JWT dont le rôle est « anon »).
  const anon =
    code.match(/sb_publishable_[\w-]+/)?.[0] ??
    (code.match(/eyJhbGciOi[\w-]+\.[\w-]+\.[\w-]+/g) ?? []).find((jwt) => {
      try {
        return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role === 'anon'
      } catch {
        return false
      }
    })
  if (!supabaseUrl || !anon) {
    ko('Supabase absent du site : il tourne en MODE DÉMONSTRATION', 'ajouter VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (case Production cochée), puis Deployments → ⋯ → Redeploy')
  } else {
    const health = await probe(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: anon } })
    if (health.status === 200) ok('Supabase intégré et joignable', supabaseUrl)
    else ko(`Supabase intégré mais refuse la clé (code ${health.status})`, 'VITE_SUPABASE_ANON_KEY doit être la clé « anon public » du même projet')
  }
  const analyse = code.match(/https:\/\/[a-z0-9.-]+\.onrender\.com/)?.[0]
  if (!analyse) {
    ko('Adresse du service d’analyse absente du site', 'ajouter VITE_ANALYSE_API_URL (adresse Render, sans / final), puis redéployer')
  } else {
    console.log('\nService d’analyse (Render) — peut mettre 1 minute à se réveiller…')
    const health = await probe(`${analyse}/health`, { headers: { Origin: site } }, 90000)
    if (health.status !== 200) return ko(`Service d’analyse injoignable (${analyse}, code ${health.status})`, 'Render → maso-analyse → Logs : le déploiement a-t-il réussi ?')
    ok('Service d’analyse joignable', analyse)
    if (health.headers?.get('access-control-allow-origin') === site) ok('Le service accepte les appels du site (ALLOWED_ORIGINS)')
    else ko('Le service REFUSE les appels du site', `Render → Environment → ALLOWED_ORIGINS = ${site} (exactement, sans / final) → Save`)
    const caps = JSON.parse(health.body).capabilities
    const labels = { factcheck: 'Vérifications publiées (GOOGLE_FACTCHECK_API_KEY)', ai_clue: 'Détecteur d’images IA (SIGHTENGINE_… ou HF_TOKEN)', assistant: 'Assistant IA (LLM_API_KEY)' }
    for (const [key, label] of Object.entries(labels)) caps[key] ? ok(label) : ko(`${label} : clé absente`, 'Render → Environment : ajouter la clé, puis Save')
    const ai = await probe(`${analyse}/image/ai-clue`, { method: 'POST', body: (() => { const form = new FormData(); form.append('file', new Blob([readFileSync(join(root, 'docs', 'exemples', '1-photo-originale.jpg'))], { type: 'image/jpeg' }), 'photo.jpg'); return form })() }, 90000)
    if (caps.ai_clue && ai.status === 200) {
      const result = JSON.parse(ai.body)
      if (result.available) ok('Détecteur d’images IA : appel réussi')
      else if (result.error === 'model_not_prepared') ko('Détecteur d’images IA : modèle non préparé sur Render', 'Render → maso-analyse → Manual Deploy → Clear build cache & deploy, puis lire les Logs (ligne « Modèle prêt »)')
      else if (result.error === 'quota_exceeded') ko('Détecteur d’images IA : plus de crédit', 'Render → Environment : ajouter SIGHTENGINE_API_USER et SIGHTENGINE_API_SECRET (gratuit) et vider HF_TOKEN')
      else if (result.error === 'token_not_allowed') ko('HF_TOKEN sans la permission d’appeler les modèles', 'recréer le jeton : onglet « Fine-grained » → cocher « Make calls to Inference Providers »')
      else ko(`Détecteur d’images IA : ${result.error ?? 'indisponible'}`, 'vérifier HF_TOKEN dans Render, puis réessayer dans quelques minutes')
    }
    if (caps.assistant) {
      const assist = await probe(`${analyse}/ai/assist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: 'headlines', format: 'post', language: 'fr', claim: 'Test de configuration.', excerpts: [{ id: 'P1', text: 'Le bulletin officiel du 12 mars 2024 annonce 3 routes coupées.' }] }) }, 90000)
      if (assist.status === 200) ok('Assistant IA : appel réussi', JSON.parse(assist.body).model)
      else ko(`Assistant IA en échec (code ${assist.status})`, 'vérifier LLM_API_KEY et GROQ_MODEL=openai/gpt-oss-120b dans Render')
    }
  }
  console.log('\nÀ vérifier à la main : Supabase → Authentication → URL Configuration → Site URL = ' + site + '\n')
}

console.log(`\nMASO — vérification de la configuration (${existsSync(envPath) ? '.env trouvé' : 'aucun .env : mode démonstration'})\n`)

console.log('Base de données (Supabase)')
const supabaseUrl = value('VITE_SUPABASE_URL')
const anonKey = value('VITE_SUPABASE_ANON_KEY')
if (!supabaseUrl || !anonKey) {
  off('Supabase non configuré : l’application tourne en mode démonstration', 'renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (docs/CONFIGURATION_SUPABASE.md)')
} else {
  let origin = supabaseUrl
  try {
    origin = new URL(supabaseUrl).origin
  } catch {
    ko('VITE_SUPABASE_URL invalide', 'copier l’adresse « Project URL » (https://xxxx.supabase.co)')
  }
  const health = await probe(`${origin}/auth/v1/health`, { headers: { apikey: anonKey } })
  if (health.status === 200) ok('Supabase joignable', origin)
  else ko(`Supabase injoignable (code ${health.status})`, 'vérifier l’adresse et la clé « anon public » (Settings → API)')
  const portal = await probe(`${origin}/rest/v1/rpc/portal_reports`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' }, body: '{}' })
  if (portal.status === 200) ok('Migrations installées (portail public)')
  else ko('Migrations incomplètes (fonction portal_reports absente)', 'exécuter les fichiers SQL de docs/CONFIGURATION_SUPABASE.md, dans l’ordre')
}

console.log('\nService d’analyse')
const analyseUrl = value('VITE_ANALYSE_API_URL')
let capabilities = null
if (!analyseUrl) {
  ko('VITE_ANALYSE_API_URL vide', 'mettre http://localhost:8000 en local, ou l’adresse Render en ligne')
} else {
  const health = await probe(`${analyseUrl.replace(/\/$/, '')}/health`)
  if (health.status === 200) {
    capabilities = JSON.parse(health.body).capabilities
    ok('Service d’analyse joignable', analyseUrl)
  } else {
    ko(`Service d’analyse injoignable (${analyseUrl})`, 'lancer « npm run service:dev » (après « npm run service:install »)')
  }
}

console.log('\nServices externes (clés lues par le service d’analyse)')
const valid = { factcheck: false, hf: false, llm: false }
const factcheckKey = value('GOOGLE_FACTCHECK_API_KEY')
if (!factcheckKey) {
  off('Vérifications publiées (Google Fact Check) non configurées', 'console.cloud.google.com → activer « Fact Check Tools API » → Identifiants → Créer une clé API → GOOGLE_FACTCHECK_API_KEY')
} else {
  const test = await probe(`https://factchecktools.googleapis.com/v1alpha1/claims:search?query=cyclone&pageSize=1&key=${encodeURIComponent(factcheckKey)}`)
  if ((valid.factcheck = test.status === 200)) ok('Google Fact Check : clé valide')
  else ko(`Google Fact Check : clé refusée (code ${test.status})`, 'vérifier que l’API « Fact Check Tools » est activée pour le projet de la clé')
}

const seUser = value('SIGHTENGINE_API_USER')
const seSecret = value('SIGHTENGINE_API_SECRET')
if (seUser && seSecret) {
  // Sightengine est prioritaire sur Hugging Face pour le détecteur d'images IA.
  const form = new FormData()
  form.append('media', new Blob([readFileSync(join(root, 'docs', 'exemples', '1-photo-originale.jpg'))], { type: 'image/jpeg' }), 'photo.jpg')
  form.append('models', 'genai')
  form.append('api_user', seUser)
  form.append('api_secret', seSecret)
  const test = await probe('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form }, 30000)
  let body = {}
  try {
    body = JSON.parse(test.body)
  } catch {}
  if ((valid.hf = body.status === 'success')) ok('Sightengine : clés valides, détecteur d’images IA joignable')
  else ko(`Sightengine : ${body.error?.message ?? `code ${test.status}`}`, 'vérifier SIGHTENGINE_API_USER et SIGHTENGINE_API_SECRET (dashboard.sightengine.com → API keys)')
} else if (seUser || seSecret) {
  ko('Sightengine : il faut les deux valeurs', 'SIGHTENGINE_API_USER et SIGHTENGINE_API_SECRET')
}
const hfToken = value('HF_TOKEN')
const localModel = existsSync(join(root, 'services', 'analyse', 'models', 'sdxl-detector', 'model.int8.onnx'))
if (localModel) {
  ok('Détecteur d’images IA local : modèle prêt (sans clé ni crédit)')
  valid.hf = true
} else if (!seUser && !seSecret) {
  off('Détecteur d’images IA local : modèle non téléchargé sur ce PC', 'en ligne, Render le prépare tout seul ; sur ce PC : « npm run service:model » (354 Mo à télécharger)')
}
if (seUser && seSecret) {
  // Hugging Face n'est pas utilisé quand Sightengine est configuré.
} else if (!hfToken) {
  if (!localModel) off('Détecteur d’images IA non configuré', 'Sightengine (recommandé, gratuit) : sightengine.com → Sign up → API keys → SIGHTENGINE_API_USER et SIGHTENGINE_API_SECRET ; ou Hugging Face : HF_TOKEN')
} else {
  // Un jeton valide ne suffit pas : il doit avoir la permission d'appeler les modèles (Inference Providers).
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')
  const model = value('AI_IMAGE_MODEL') || 'umm-maybe/AI-image-detector'
  const test = await probe(`https://router.huggingface.co/hf-inference/models/${model}`, { method: 'POST', headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'image/png' }, body: pixel })
  if ((valid.hf = test.status === 200)) ok('Hugging Face : jeton valide, détecteur d’images IA joignable', model)
  else if (test.status === 401 || test.status === 403)
    ko(`Hugging Face : jeton sans la permission d’appeler les modèles (code ${test.status})`, 'huggingface.co → Settings → Access Tokens → Create new token → onglet « Fine-grained » → cocher « Make calls to Inference Providers » → copier dans HF_TOKEN')
  else if (test.status === 402)
    ko('Hugging Face : aucun crédit sur ce compte (code 402) — le service est devenu payant (PRO ou crédits prépayés)', 'utiliser Sightengine, gratuit : SIGHTENGINE_API_USER et SIGHTENGINE_API_SECRET (docs/DEPLOIEMENT.md, étape 1.3) ; un autre compte Hugging Face ne change rien')
  else ko(`Hugging Face : détecteur injoignable (code ${test.status})`, 'réessayer dans quelques minutes (le modèle démarre parfois lentement)')
}

const provider = value('LLM_PROVIDER') || (value('GROQ_API_KEY') ? 'groq' : value('GEMINI_API_KEY') ? 'gemini' : '')
const llmKey = value('LLM_API_KEY') || value(provider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY')
if (!provider) {
  off('Assistant IA non configuré', 'console.groq.com → API Keys → Create → LLM_PROVIDER=groq et LLM_API_KEY=<clé>')
} else if (provider === 'groq') {
  if (!llmKey) ko('Groq choisi mais LLM_API_KEY vide', 'console.groq.com → API Keys → Create API Key')
  else {
    const model = value('GROQ_MODEL') || 'openai/gpt-oss-120b'
    const test = await probe('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${llmKey}` } })
    if (test.status !== 200) ko(`Groq : clé refusée (code ${test.status})`, 'recréer une clé sur console.groq.com')
    else {
      // Groq retire régulièrement des modèles : on vérifie que celui choisi existe encore.
      const models = JSON.parse(test.body).data.map((item) => item.id)
      if ((valid.llm = models.includes(model))) ok('Groq : clé valide', model)
      else ko(`Groq : le modèle « ${model} » n’existe plus`, `mettre GROQ_MODEL=openai/gpt-oss-120b (disponibles : ${models.filter((id) => !/whisper|guard|orpheus/.test(id)).join(', ')})`)
    }
  }
} else if (provider === 'gemini') {
  if (!llmKey) ko('Gemini choisi mais LLM_API_KEY vide', 'aistudio.google.com → Get API key')
  else {
    const test = await probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(llmKey)}`)
    if ((valid.llm = test.status === 200)) ok('Gemini : clé valide')
    else ko(`Gemini : clé refusée (code ${test.status})`, 'recréer une clé sur aistudio.google.com')
  }
} else if (provider === 'ollama') {
  const base = value('OLLAMA_URL') || 'http://localhost:11434'
  const test = await probe(`${base}/api/tags`)
  if ((valid.llm = test.status === 200)) ok('Ollama joignable', base)
  else ko(`Ollama choisi mais injoignable (${base})`, 'installer Ollama puis « ollama pull llama3.1 », ou passer à LLM_PROVIDER=groq')
}

if (capabilities) {
  const restart = [
    valid.factcheck && !capabilities.factcheck && 'Google Fact Check',
    valid.hf && !capabilities.ai_clue && 'détecteur d’images IA',
    valid.llm && !capabilities.assistant && 'assistant IA',
  ].filter(Boolean)
  if (restart.length) console.log(`\n⚠️  Clés présentes mais pas encore prises en compte (${restart.join(', ')}) : redémarrez « npm run service:dev ».`)
}
console.log('')
