import * as core from './core.js'

const GRAPH_TYPE = 'graph'
const COLONY_TYPE = 'colony'

class Context {
  constructor({ parent = null, inFunction = false, inLoop = false, inSpread = false, inColony = false } = {}) {
    this.parent = parent
    this.locals = new Map()
    this.inFunction = inFunction
    this.inLoop = inLoop
    this.inSpread = inSpread
    this.inColony = inColony
  }

  add(name, entity, type = null) {
    if (this.locals.has(name)) throw new Error(`'${name}' is already declared in this scope`)
    this.locals.set(name, { entity, type })
  }

  lookup(name) {
    if (this.locals.has(name)) return this.locals.get(name)
    if (this.parent) return this.parent.lookup(name)
    throw new Error(`'${name}' has not been declared`)
  }

  typeOf(name) {
    return this.lookup(name).type
  }

  child(options = {}) {
    return new Context({
      parent: this,
      inFunction: options.inFunction ?? this.inFunction,
      inLoop: options.inLoop ?? this.inLoop,
      inSpread: options.inSpread ?? this.inSpread,
      inColony: options.inColony ?? this.inColony,
    })
  }
}

function analyze(node, context) {
  if (node instanceof core.Program) {
    const ctx = new Context()
    node.statements.forEach(s => analyze(s, ctx))
    return node
  }

  if (node instanceof core.FunDecl) {
    context.add(node.name, node)
    const funCtx = context.child({ inFunction: true })
    node.params.forEach(p => funCtx.add(p, { name: p }))
    analyze(node.body, funCtx)
    return node
  }

  if (node instanceof core.VarDecl) {
    analyze(node.initializer, context)
    const type =
      node.initializer instanceof core.GraphLit ? GRAPH_TYPE
      : node.initializer instanceof core.ColonyLit ? COLONY_TYPE
      : null
    context.add(node.name, node, type)
    return node
  }

  if (node instanceof core.Assign) {
    context.lookup(node.name)
    analyze(node.source, context)
    return node
  }

  if (node instanceof core.MemberAssign) {
    if (node.base === 'self') {
      if (!context.inColony) throw new Error("'self' used outside of a colony method")
    } else {
      context.lookup(node.base)
    }
    analyze(node.source, context)
    return node
  }

  if (node instanceof core.GuardStmt) {
    analyze(node.condition, context)
    analyze(node.consequent, context)
    return node
  }

  if (node instanceof core.BloomStmt) {
    analyze(node.expression, context)
    return node
  }

  if (node instanceof core.SpreadStmt) {
    if (node.graph instanceof core.IdExp) {
      if (context.typeOf(node.graph.name) !== GRAPH_TYPE) {
        throw new Error(`'${node.graph.name}' is not a graph — spread requires a graph value`)
      }
    }
    analyze(node.graph, context)
    const spreadCtx = context.child({ inSpread: true })
    spreadCtx.add(node.reachVar, { name: node.reachVar })
    analyze(node.body, spreadCtx)
    return node
  }

  if (node instanceof core.WhenStmt) {
    analyze(node.test, context)
    analyze(node.consequent, context.child())
    if (node.alternate) analyze(node.alternate, context.child())
    return node
  }

  if (node instanceof core.CycleStmt) {
    analyze(node.test, context)
    analyze(node.body, context.child({ inLoop: true }))
    return node
  }

  if (node instanceof core.HarvestStmt) {
    if (!context.inFunction) throw new Error("'harvest' used outside of a function")
    analyze(node.expression, context)
    return node
  }

  if (node instanceof core.WitherStmt) {
    if (!context.inLoop) throw new Error("'wither' used outside of a cycle")
    return node
  }

  if (node instanceof core.DormantStmt) {
    if (!context.inLoop) throw new Error("'dormant' used outside of a cycle")
    return node
  }

  if (node instanceof core.Block) {
    node.statements.forEach(s => analyze(s, context))
    return node
  }

  if (node instanceof core.GraphLit) {
    const declared = new Set()
    for (const name of node.nodes) {
      if (declared.has(name)) throw new Error(`Duplicate node '${name}' in graph`)
      declared.add(name)
    }
    for (const edge of node.edges) {
      if (!declared.has(edge.from))
        throw new Error(`Edge references undeclared node '${edge.from}'`)
      if (!declared.has(edge.to))
        throw new Error(`Edge references undeclared node '${edge.to}'`)
    }
    return node
  }

  if (node instanceof core.ColonyLit) {
    const colonyCtx = context.child({ inColony: true })
    node.fields.forEach(f => analyze(f, colonyCtx))
    node.methods.forEach(m => {
      colonyCtx.add(m.name, m)
      const methodCtx = colonyCtx.child({ inFunction: true })
      m.params.forEach(p => methodCtx.add(p, { name: p }))
      analyze(m.body, methodCtx)
    })
    return node
  }

  if (node instanceof core.FieldDecl) {
    analyze(node.value, context)
    return node
  }

  if (node instanceof core.GrowsExp) {
    if (node.base instanceof core.IdExp) {
      if (context.typeOf(node.base.name) !== COLONY_TYPE) {
        throw new Error(`'${node.base.name}' is not a colony — grows requires a colony value`)
      }
    }
    analyze(node.base, context)
    const growsCtx = context.child({ inColony: true })
    node.fields.forEach(f => analyze(f, growsCtx))
    node.methods.forEach(m => {
      growsCtx.add(m.name, m)
      const methodCtx = growsCtx.child({ inFunction: true })
      m.params.forEach(p => methodCtx.add(p, { name: p }))
      analyze(m.body, methodCtx)
    })
    return node
  }

  if (node instanceof core.PipeExp) {
    analyze(node.left, context)
    analyze(node.right, context)
    return node
  }

  if (node instanceof core.BinaryExp) {
    analyze(node.left, context)
    analyze(node.right, context)
    return node
  }

  if (node instanceof core.UnaryExp) {
    analyze(node.operand, context)
    return node
  }

  if (node instanceof core.CallExp) {
    const callee = analyze(node.callee, context)
    node.args.forEach(a => analyze(a, context))
    if (callee instanceof core.FunDecl) {
      if (node.args.length !== callee.params.length) {
        throw new Error(
          `'${callee.name}' expects ${callee.params.length} argument(s) but got ${node.args.length}`
        )
      }
    }
    return node
  }

  if (node instanceof core.MemberExp) {
    analyze(node.object, context)
    return node
  }

  if (node instanceof core.IdExp) {
    return context.lookup(node.name).entity
  }

  if (node instanceof core.SelfExp) {
    if (!context.inColony) throw new Error("'self' used outside of a colony method")
    return node
  }

  if (node instanceof core.NumLit || node instanceof core.StrLit || node instanceof core.BoolLit) {
    return node
  }

  throw new Error(`Unknown node type in analyzer: ${node.constructor.name}`)
}

export { analyze, Context, GRAPH_TYPE, COLONY_TYPE }
