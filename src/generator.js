import * as core from './core.js'

let _tmpCount = 0
const tmp = () => `_m${_tmpCount++}`

export function generate(node) {
  if (node instanceof core.Program) {
    _tmpCount = 0
    return node.statements.map(generate).join('\n')
  }

  if (node instanceof core.FunDecl) {
    const params = node.params.join(', ')
    return `function ${node.name}(${params}) ${generate(node.body)}`
  }

  if (node instanceof core.VarDecl) {
    return `let ${node.name} = ${generate(node.initializer)};`
  }

  if (node instanceof core.Assign) {
    return `${node.name} = ${generate(node.source)};`
  }

  if (node instanceof core.MemberAssign) {
    const base = node.base === 'self' ? 'this' : node.base
    return `${base}.${node.fields.join('.')} = ${generate(node.source)};`
  }

  if (node instanceof core.GuardStmt) {
    return `if (${generate(node.condition)}) { ${generate(node.consequent)} }`
  }

  if (node instanceof core.BloomStmt) {
    return `console.log(${generate(node.expression)});`
  }

  if (node instanceof core.SpreadStmt) {
    // BFS traversal — generates clean, readable JS
    const g = tmp()
    const queue = tmp()
    const visited = tmp()
    const current = node.reachVar
    return [
      `{`,
      `  const ${g} = ${generate(node.graph)};`,
      `  const ${queue} = [${JSON.stringify(node.startNode)}];`,
      `  const ${visited} = new Set([${JSON.stringify(node.startNode)}]);`,
      `  while (${queue}.length > 0) {`,
      `    const ${current} = ${queue}.shift();`,
      `    ${generate(node.body).replace(/^\{|\}$/g, '').trim()}`,
      `    for (const _nb of (${g}.edges.get(${current}) ?? [])) {`,
      `      if (!${visited}.has(_nb.to)) { ${visited}.add(_nb.to); ${queue}.push(_nb.to); }`,
      `    }`,
      `  }`,
      `}`,
    ].join('\n')
  }

  if (node instanceof core.WhenStmt) {
    const test = generate(node.test)
    const consequent = generate(node.consequent)
    if (node.alternate) return `if (${test}) ${consequent} else ${generate(node.alternate)}`
    return `if (${test}) ${consequent}`
  }

  if (node instanceof core.CycleStmt) {
    return `while (${generate(node.test)}) ${generate(node.body)}`
  }

  if (node instanceof core.HarvestStmt) {
    return `return ${generate(node.expression)};`
  }

  if (node instanceof core.WitherStmt) return 'break;'
  if (node instanceof core.DormantStmt) return 'continue;'

  if (node instanceof core.Block) {
    const body = node.statements.map(generate).join('\n  ')
    return `{\n  ${body}\n}`
  }

  if (node instanceof core.GraphLit) {
    // Nodes as a Set, edges as an adjacency Map of {to, weight} lists
    const nodeEntries = node.nodes.map(n => JSON.stringify(n)).join(', ')
    const edgeMap = new Map(node.nodes.map(n => [n, []]))
    for (const e of node.edges) {
      edgeMap.get(e.from).push(e.weight !== null ? `{to:${JSON.stringify(e.to)},weight:${e.weight}}` : `{to:${JSON.stringify(e.to)},weight:1}`)
    }
    const edgeEntries = node.nodes
      .map(n => `[${JSON.stringify(n)}, [${edgeMap.get(n).join(', ')}]]`)
      .join(', ')
    return `({ nodes: new Set([${nodeEntries}]), edges: new Map([${edgeEntries}]) })`
  }

  if (node instanceof core.ColonyLit) {
    const fields = node.fields.map(f => `${f.name}: ${generate(f.value)}`).join(',\n  ')
    const methods = node.methods.map(m => {
      const params = m.params.join(', ')
      return `${m.name}: function(${params}) ${generate(m.body)}`
    }).join(',\n  ')
    const members = [fields, methods].filter(Boolean).join(',\n  ')
    return `({\n  ${members}\n})`
  }

  if (node instanceof core.GrowsExp) {
    const fields = node.fields.map(f => `${f.name}: ${generate(f.value)}`).join(', ')
    const methods = node.methods.map(m => {
      const params = m.params.join(', ')
      return `${m.name}: function(${params}) ${generate(m.body)}`
    }).join(', ')
    const overrides = [fields, methods].filter(Boolean).join(', ')
    return `Object.assign(Object.create(${generate(node.base)}), {${overrides}})`
  }

  if (node instanceof core.PipeExp) {
    return `${generate(node.right)}(${generate(node.left)})`
  }

  if (node instanceof core.BinaryExp) {
    const op = node.op === 'and' ? '&&' : node.op === 'or' ? '||' : node.op
    return `(${generate(node.left)} ${op} ${generate(node.right)})`
  }

  if (node instanceof core.UnaryExp) {
    const op = node.op === 'not' ? '!' : node.op
    return `(${op}${generate(node.operand)})`
  }

  if (node instanceof core.CallExp) {
    const args = node.args.map(generate).join(', ')
    return `${generate(node.callee)}(${args})`
  }

  if (node instanceof core.MemberExp) {
    return `${generate(node.object)}.${node.field}`
  }

  if (node instanceof core.IdExp) return node.name
  if (node instanceof core.SelfExp) return 'this'
  if (node instanceof core.NumLit) return String(node.value)
  if (node instanceof core.StrLit) return `"${node.value}"`
  if (node instanceof core.BoolLit) return String(node.value)

  throw new Error(`Cannot generate code for: ${node.constructor.name}`)
}
