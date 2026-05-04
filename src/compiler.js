import { parse } from './parser.js'
import { analyze } from './analyzer.js'
import { optimize } from './optimizer.js'
import { generate } from './generator.js'

export function compile(source, { phase = 'gen' } = {}) {
  const ast = parse(source)
  if (phase === 'parse') return ast
  analyze(ast)
  if (phase === 'analyze') return ast
  const optimized = optimize(ast)
  if (phase === 'optimize') return optimized
  return generate(optimized)
}
