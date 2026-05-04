import { readFileSync } from 'fs'
import { compile } from './compiler.js'

const args = process.argv.slice(2)
const flags = args.filter(a => a.startsWith('--'))
const files = args.filter(a => !a.startsWith('--'))

if (files.length === 0) {
  console.error('Usage: node src/moss.js [--parse|--analyze|--optimize|--gen] <file.moss>')
  process.exit(1)
}

const source = readFileSync(files[0], 'utf-8')
const phase = flags.includes('--parse') ? 'parse'
  : flags.includes('--analyze') ? 'analyze'
  : flags.includes('--optimize') ? 'optimize'
  : 'gen'

try {
  const result = compile(source, { phase })
  console.log(phase === 'gen' ? result : JSON.stringify(result, null, 2))
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
