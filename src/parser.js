import * as ohm from 'ohm-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as core from './core.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const grammar = ohm.grammar(readFileSync(join(__dirname, 'moss.ohm'), 'utf-8'))

function parseColonyMembers(members) {
  const fields = []
  const methods = []
  for (const m of members.children.map(c => c.ast())) {
    if (m instanceof core.FunDecl) methods.push(m)
    else fields.push(m)
  }
  return { fields, methods }
}

const semantics = grammar.createSemantics().addOperation('ast', {
  Program(statements) {
    return new core.Program(statements.children.map(s => s.ast()))
  },
  FunDecl(_grow, name, _lp, params, _rp, body) {
    return new core.FunDecl(name.sourceString, params.ast(), body.ast())
  },
  Params(list) {
    return list.asIteration().children.map(p => p.sourceString)
  },
  VarDecl(_sprout, name, _arrow, exp) {
    return new core.VarDecl(name.sourceString, exp.ast())
  },
  MemberAssign(base, _dots, fields, _arrow, exp) {
    return new core.MemberAssign(
      base.sourceString,
      fields.children.map(f => f.sourceString),
      exp.ast()
    )
  },
  Assign(name, _arrow, exp) {
    return new core.Assign(name.sourceString, exp.ast())
  },
  GuardStmt(condition, _arrow, consequent) {
    return new core.GuardStmt(condition.ast(), consequent.ast())
  },
  BloomStmt(_bloom, exp) {
    return new core.BloomStmt(exp.ast())
  },
  SpreadStmt(_spread, graph, _from, start, _open, reach, _close) {
    const { reachVar, body } = reach.ast()
    return new core.SpreadStmt(graph.ast(), start.sourceString, reachVar, body)
  },
  ReachClause(_reach, variable, body) {
    return { reachVar: variable.sourceString, body: body.ast() }
  },
  WhenStmt(_when, test, consequent, _otherwise, alternate) {
    return new core.WhenStmt(
      test.ast(),
      consequent.ast(),
      alternate.children.length > 0 ? alternate.children[0].ast() : null
    )
  },
  CycleStmt(_cycle, test, body) {
    return new core.CycleStmt(test.ast(), body.ast())
  },
  HarvestStmt(_harvest, exp) {
    return new core.HarvestStmt(exp.ast())
  },
  WitherStmt(_) {
    return new core.WitherStmt()
  },
  DormantStmt(_) {
    return new core.DormantStmt()
  },
  ExprStmt(exp) {
    return exp.ast()
  },
  Block(_open, statements, _close) {
    return new core.Block(statements.children.map(s => s.ast()))
  },
  Exp_pipe(left, _arrow, right) {
    return new core.PipeExp(left.ast(), right.ast())
  },
  Exp_or(left, _op, right) {
    return new core.BinaryExp('or', left.ast(), right.ast())
  },
  Exp1_and(left, _op, right) {
    return new core.BinaryExp('and', left.ast(), right.ast())
  },
  Exp2_compare(left, op, right) {
    return new core.BinaryExp(op.sourceString, left.ast(), right.ast())
  },
  Exp3_add(left, _op, right) {
    return new core.BinaryExp('+', left.ast(), right.ast())
  },
  Exp3_sub(left, _op, right) {
    return new core.BinaryExp('-', left.ast(), right.ast())
  },
  Exp4_mul(left, _op, right) {
    return new core.BinaryExp('*', left.ast(), right.ast())
  },
  Exp4_div(left, _op, right) {
    return new core.BinaryExp('/', left.ast(), right.ast())
  },
  Exp4_mod(left, _op, right) {
    return new core.BinaryExp('%', left.ast(), right.ast())
  },
  Exp5_negate(_op, operand) {
    return new core.UnaryExp('-', operand.ast())
  },
  Exp5_not(_op, operand) {
    return new core.UnaryExp('not', operand.ast())
  },
  Exp6_call(callee, _lp, args, _rp) {
    return new core.CallExp(callee.ast(), args.ast())
  },
  Exp6_member(object, _dot, field) {
    return new core.MemberExp(object.ast(), field.sourceString)
  },
  Exp6_grows(base, _grows, _open, members, _close) {
    const { fields, methods } = parseColonyMembers(members)
    return new core.GrowsExp(base.ast(), fields, methods)
  },
  Exp7_paren(_lp, exp, _rp) {
    return exp.ast()
  },
  Exp7_self(_) {
    return new core.SelfExp()
  },
  Exp7_id(name) {
    return new core.IdExp(name.sourceString)
  },
  Args(list) {
    return list.asIteration().children.map(a => a.ast())
  },
  GraphLit(_graph, _open, items, _close) {
    const nodes = []
    const edges = []
    for (const item of items.children.map(i => i.ast())) {
      if (item.kind === 'node') nodes.push(item.name)
      else edges.push(item)
    }
    return new core.GraphLit(nodes, edges)
  },
  GraphItem(item) {
    return item.ast()
  },
  NodeDecl(_node, name) {
    return { kind: 'node', name: name.sourceString }
  },
  EdgeDecl(_edge, from, _arrow, to, weightKw, weightVal) {
    const weight = weightKw.children.length > 0 ? weightVal.children[0].ast().value : null
    return { from: from.sourceString, to: to.sourceString, weight }
  },
  ColonyLit(_colony, _open, members, _close) {
    const { fields, methods } = parseColonyMembers(members)
    return new core.ColonyLit(fields, methods)
  },
  ColonyMember(member) {
    return member.ast()
  },
  FieldDecl(name, _arrow, exp) {
    return new core.FieldDecl(name.sourceString, exp.ast())
  },
  boollit(value) {
    return new core.BoolLit(value.sourceString === 'true')
  },
  numlit(_whole, _dot, _frac) {
    return new core.NumLit(parseFloat(this.sourceString))
  },
  strlit(_open, chars, _close) {
    return new core.StrLit(chars.sourceString)
  },
})

export function parse(source) {
  const match = grammar.match(source)
  if (match.failed()) throw new Error(match.message)
  return semantics(match).ast()
}
