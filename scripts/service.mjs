// Lance le service d'analyse Python sur Windows, macOS et Linux (chemins du venv différents).
// Utilisation : node scripts/service.mjs install | dev | test
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const cwd = join(import.meta.dirname, '..', 'services', 'analyse')
const windows = process.platform === 'win32'
const venvPython = join(cwd, '.venv', windows ? 'Scripts' : 'bin', windows ? 'python.exe' : 'python')

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.error) {
    console.error(`Impossible de lancer « ${command} » : ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const task = process.argv[2]
if (task === 'install') {
  // Python 3.11+ : « python » sous Windows, « python3 » ailleurs.
  if (!existsSync(venvPython)) run(windows ? 'python' : 'python3', ['-m', 'venv', '.venv'])
  run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements-dev.txt'])
} else if (!existsSync(venvPython)) {
  console.error('Service non installé : lancez d’abord « npm run service:install ».')
  process.exit(1)
} else if (task === 'dev') {
  run(venvPython, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'])
} else if (task === 'test') {
  run(venvPython, ['-m', 'pytest', '-q'])
} else {
  console.error('Usage : node scripts/service.mjs install | dev | test')
  process.exit(1)
}
