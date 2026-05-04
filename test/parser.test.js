import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'
import * as core from '../src/core.js'

describe('Parser — core expressions', () => {
  it('parses a number literal', () => {
    const ast = parse('bloom 42')
    expect(ast.statements[0].expression).toBeInstanceOf(core.NumLit)
    expect(ast.statements[0].expression.value).toBe(42)
  })
  it('parses a float', () => {
    expect(parse('bloom 3.14').statements[0].expression.value).toBeCloseTo(3.14)
  })
  it('parses a string', () => {
    expect(parse('bloom "hello"').statements[0].expression).toBeInstanceOf(core.StrLit)
  })
  it('parses true / false', () => {
    expect(parse('bloom true').statements[0].expression.value).toBe(true)
    expect(parse('bloom false').statements[0].expression.value).toBe(false)
  })
  it('parses self', () => {
    expect(parse('bloom self').statements[0].expression).toBeInstanceOf(core.SelfExp)
  })
  it('parses binary ops', () => {
    for (const op of ['+', '-', '*', '/', '%']) {
      expect(parse(`bloom 1 ${op} 2`).statements[0].expression).toBeInstanceOf(core.BinaryExp)
    }
  })
  it('parses comparison ops', () => {
    for (const op of ['<', '>', '<=', '>=', '==', '!=']) {
      expect(parse(`bloom 1 ${op} 2`).statements[0].expression.op).toBe(op)
    }
  })
  it('parses and / or', () => {
    expect(parse('bloom true and false').statements[0].expression.op).toBe('and')
    expect(parse('bloom true or false').statements[0].expression.op).toBe('or')
  })
  it('parses unary negation and not', () => {
    expect(parse('bloom -5').statements[0].expression).toBeInstanceOf(core.UnaryExp)
    expect(parse('bloom not true').statements[0].expression.op).toBe('not')
  })
  it('parses parenthesized expression', () => {
    expect(parse('bloom (1 + 2)').statements[0].expression).toBeInstanceOf(core.BinaryExp)
  })
  it('parses comments', () => {
    expect(parse('~~ hi\nbloom 1').statements[0]).toBeInstanceOf(core.BloomStmt)
  })
  it('throws on syntax error', () => {
    expect(() => parse('grow 123')).toThrow()
  })
  it('parses pipeline expression', () => {
    const ast = parse('grow f(n) [~ harvest n\n~]\nbloom 5 ~> f')
    expect(ast.statements[1].expression).toBeInstanceOf(core.PipeExp)
  })
  it('parses chained pipeline', () => {
    const ast = parse('grow f(n) [~ harvest n\n~]\nbloom 1 ~> f ~> f')
    expect(ast.statements[1].expression).toBeInstanceOf(core.PipeExp)
  })
})

describe('Parser — statements', () => {
  it('parses sprout with <~', () => {
    const ast = parse('sprout x <~ 5')
    expect(ast.statements[0]).toBeInstanceOf(core.VarDecl)
    expect(ast.statements[0].name).toBe('x')
  })
  it('parses assign with <~', () => {
    expect(parse('sprout x <~ 1\nx <~ 2').statements[1]).toBeInstanceOf(core.Assign)
  })
  it('parses member assign with <~', () => {
    expect(parse('sprout x <~ 1\nx.y <~ 2').statements[1]).toBeInstanceOf(core.MemberAssign)
  })
  it('parses self member assign', () => {
    const ma = parse('self.name <~ "x"').statements[0]
    expect(ma).toBeInstanceOf(core.MemberAssign)
    expect(ma.base).toBe('self')
  })
  it('parses guard statement', () => {
    const ast = parse('grow f(n) [~ n <= 1 => harvest n\nharvest 0\n~]')
    expect(ast.statements[0].body.statements[0]).toBeInstanceOf(core.GuardStmt)
  })
  it('parses guard with bloom', () => {
    expect(parse('sprout x <~ 1\nx > 0 => bloom x').statements[1]).toBeInstanceOf(core.GuardStmt)
  })
  it('parses grow function', () => {
    const ast = parse('grow f(x, y) [~ harvest x + y\n~]')
    expect(ast.statements[0]).toBeInstanceOf(core.FunDecl)
    expect(ast.statements[0].params).toEqual(['x', 'y'])
  })
  it('parses grow with no params', () => {
    expect(parse('grow f() [~ bloom 1\n~]').statements[0].params).toEqual([])
  })
  it('parses when', () => {
    expect(parse('when true [~ bloom 1\n~]').statements[0]).toBeInstanceOf(core.WhenStmt)
  })
  it('parses when / otherwise', () => {
    expect(parse('when true [~ bloom 1\n~] otherwise [~ bloom 2\n~]').statements[0].alternate).not.toBeNull()
  })
  it('parses cycle / wither / dormant', () => {
    expect(parse('cycle true [~ wither\n~]').statements[0]).toBeInstanceOf(core.CycleStmt)
    expect(parse('cycle true [~ wither\n~]').statements[0].body.statements[0]).toBeInstanceOf(core.WitherStmt)
    expect(parse('cycle true [~ dormant\n~]').statements[0].body.statements[0]).toBeInstanceOf(core.DormantStmt)
  })
  it('parses harvest', () => {
    expect(parse('grow f() [~ harvest 1\n~]').statements[0].body.statements[0]).toBeInstanceOf(core.HarvestStmt)
  })
  it('parses a call', () => {
    expect(parse('grow f(x) [~ harvest x\n~]\nf(1)').statements[1]).toBeInstanceOf(core.CallExp)
  })
  it('parses member access', () => {
    expect(parse('bloom x.y').statements[0].expression).toBeInstanceOf(core.MemberExp)
  })
})

describe('Parser — graph', () => {
  it('parses a graph with nodes and edges', () => {
    const g = parse('sprout g <~ graph [~ node a\nnode b\nedge a -> b\n~]').statements[0].initializer
    expect(g).toBeInstanceOf(core.GraphLit)
    expect(g.nodes).toEqual(['a', 'b'])
    expect(g.edges[0]).toMatchObject({ from: 'a', to: 'b', weight: null })
  })
  it('parses weighted edge', () => {
    const g = parse('sprout g <~ graph [~ node a\nnode b\nedge a -> b weight 7\n~]').statements[0].initializer
    expect(g.edges[0].weight).toBe(7)
  })
  it('parses an empty graph', () => {
    expect(parse('sprout g <~ graph [~\n~]').statements[0].initializer.nodes).toHaveLength(0)
  })
  it('parses spread statement', () => {
    const s = parse('sprout g <~ graph [~ node a\n~]\nspread g from a [~ reach n [~ bloom n\n~]\n~]').statements[1]
    expect(s).toBeInstanceOf(core.SpreadStmt)
    expect(s.reachVar).toBe('n')
    expect(s.startNode).toBe('a')
  })
})

describe('Parser — colony', () => {
  it('parses a colony with fields', () => {
    const c = parse('sprout c <~ colony [~ name <~ "x"\n~]').statements[0].initializer
    expect(c).toBeInstanceOf(core.ColonyLit)
    expect(c.fields[0].name).toBe('name')
  })
  it('parses colony with method', () => {
    const c = parse('sprout c <~ colony [~ grow greet() [~ bloom self.name\n~]\n~]').statements[0].initializer
    expect(c.methods[0]).toBeInstanceOf(core.FunDecl)
  })
  it('parses grows expression', () => {
    const d = parse('sprout c <~ colony [~\n~]\nsprout d <~ c grows [~ name <~ "d"\n~]').statements[1].initializer
    expect(d).toBeInstanceOf(core.GrowsExp)
  })
})
