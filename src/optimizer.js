import * as core from './core.js'

export function optimize(node) {
  if (node instanceof core.Program) {
    return new core.Program(node.statements.map(optimize))
  }
  if (node instanceof core.FunDecl) {
    return new core.FunDecl(node.name, node.params, optimize(node.body))
  }
  if (node instanceof core.VarDecl) {
    return new core.VarDecl(node.name, optimize(node.initializer))
  }
  if (node instanceof core.Assign) {
    return new core.Assign(node.name, optimize(node.source))
  }
  if (node instanceof core.MemberAssign) {
    return new core.MemberAssign(node.base, node.fields, optimize(node.source))
  }
  if (node instanceof core.GuardStmt) {
    const condition = optimize(node.condition)
    if (condition instanceof core.BoolLit) {
      if (condition.value) return optimize(node.consequent)
      return new core.Block([])
    }
    return new core.GuardStmt(condition, optimize(node.consequent))
  }

  if (node instanceof core.BloomStmt) {
    return new core.BloomStmt(optimize(node.expression))
  }
  if (node instanceof core.SpreadStmt) {
    return new core.SpreadStmt(optimize(node.graph), node.startNode, node.reachVar, optimize(node.body))
  }
  if (node instanceof core.WhenStmt) {
    const test = optimize(node.test)
    if (test instanceof core.BoolLit) {
      if (test.value) return optimize(node.consequent)
      if (node.alternate) return optimize(node.alternate)
      return new core.Block([])
    }
    const alternate = node.alternate ? optimize(node.alternate) : null
    return new core.WhenStmt(test, optimize(node.consequent), alternate)
  }
  if (node instanceof core.CycleStmt) {
    const test = optimize(node.test)
    if (test instanceof core.BoolLit && !test.value) return new core.Block([])
    return new core.CycleStmt(test, optimize(node.body))
  }
  if (node instanceof core.HarvestStmt) {
    return new core.HarvestStmt(optimize(node.expression))
  }
  if (node instanceof core.WitherStmt || node instanceof core.DormantStmt) {
    return node
  }
  if (node instanceof core.Block) {
    const stmts = []
    for (const s of node.statements) {
      stmts.push(optimize(s))
      if (s instanceof core.HarvestStmt || s instanceof core.WitherStmt || s instanceof core.DormantStmt) break
    }
    return new core.Block(stmts)
  }
  if (node instanceof core.GraphLit) {
    return node
  }
  if (node instanceof core.ColonyLit) {
    return new core.ColonyLit(
      node.fields.map(f => new core.FieldDecl(f.name, optimize(f.value))),
      node.methods.map(m => new core.FunDecl(m.name, m.params, optimize(m.body)))
    )
  }
  if (node instanceof core.GrowsExp) {
    return new core.GrowsExp(
      optimize(node.base),
      node.fields.map(f => new core.FieldDecl(f.name, optimize(f.value))),
      node.methods.map(m => new core.FunDecl(m.name, m.params, optimize(m.body)))
    )
  }
  if (node instanceof core.PipeExp) {
    return new core.PipeExp(optimize(node.left), optimize(node.right))
  }

  if (node instanceof core.BinaryExp) {
    const left = optimize(node.left)
    const right = optimize(node.right)
    if (left instanceof core.NumLit && right instanceof core.NumLit) {
      switch (node.op) {
        case '+': return new core.NumLit(left.value + right.value)
        case '-': return new core.NumLit(left.value - right.value)
        case '*': return new core.NumLit(left.value * right.value)
        case '/': return new core.NumLit(left.value / right.value)
        case '%': return new core.NumLit(left.value % right.value)
        case '<':  return new core.BoolLit(left.value < right.value)
        case '>':  return new core.BoolLit(left.value > right.value)
        case '<=': return new core.BoolLit(left.value <= right.value)
        case '>=': return new core.BoolLit(left.value >= right.value)
        case '==': return new core.BoolLit(left.value === right.value)
        case '!=': return new core.BoolLit(left.value !== right.value)
      }
    }
    if (left instanceof core.BoolLit && right instanceof core.BoolLit) {
      if (node.op === 'and') return new core.BoolLit(left.value && right.value)
      if (node.op === 'or')  return new core.BoolLit(left.value || right.value)
    }
    return new core.BinaryExp(node.op, left, right)
  }
  if (node instanceof core.UnaryExp) {
    const operand = optimize(node.operand)
    if (node.op === '-' && operand instanceof core.NumLit) return new core.NumLit(-operand.value)
    if (node.op === 'not' && operand instanceof core.BoolLit) return new core.BoolLit(!operand.value)
    return new core.UnaryExp(node.op, operand)
  }
  if (node instanceof core.CallExp) {
    return new core.CallExp(optimize(node.callee), node.args.map(optimize))
  }
  if (node instanceof core.MemberExp) {
    return new core.MemberExp(optimize(node.object), node.field)
  }
  // Leaves: IdExp, SelfExp, NumLit, StrLit, BoolLit
  return node
}
