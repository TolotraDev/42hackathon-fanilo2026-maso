// Vérifie la configuration de MASO sans jamais afficher une clé : Supabase, service d'analyse,
// et chaque service externe (Google Fact Check, Hugging Face, Groq / Gemini / Ollama).
// Utilisation : npm run check:config
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

async function probe(url, init = {}) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
    return { status: response.status, body: await response.text() }
  } catch (error) {
    return { status: 0, body: String(error?.message ?? error) }
  }
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

const hfToken = value('HF_TOKEN')
if (!hfToken) {
  off('Détecteur d’images IA (Hugging Face) non configuré', 'huggingface.co → Settings → Access Tokens → Create new token → « Fine-grained » → cocher « Make calls to Inference Providers » → HF_TOKEN')
} else {
  // Un jeton valide ne suffit pas : il doit avoir la permission d'appeler les modèles (Inference Providers).
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')
  const model = value('AI_IMAGE_MODEL') || 'umm-maybe/AI-image-detector'
  const test = await probe(`https://router.huggingface.co/hf-inference/models/${model}`, { method: 'POST', headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'image/png' }, body: pixel })
  if ((valid.hf = test.status === 200)) ok('Hugging Face : jeton valide, détecteur d’images IA joignable', model)
  else if (test.status === 401 || test.status === 403)
    ko(`Hugging Face : jeton sans la permission d’appeler les modèles (code ${test.status})`, 'huggingface.co → Settings → Access Tokens → Create new token → onglet « Fine-grained » → cocher « Make calls to Inference Providers » → copier dans HF_TOKEN')
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
    valid.hf && !capabilities.ai_clue && 'Hugging Face',
    valid.llm && !capabilities.assistant && 'assistant IA',
  ].filter(Boolean)
  if (restart.length) console.log(`\n⚠️  Clés présentes mais pas encore prises en compte (${restart.join(', ')}) : redémarrez « npm run service:dev ».`)
}
console.log('')
