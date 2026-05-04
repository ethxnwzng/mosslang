import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'
import { analyze } from '../src/analyzer.js'
import * as core from '../src/core.js'

function check(src) { return analyze(parse(src)) }
function bad(src, msg) { expect(() => check(src)).toThrow(msg) }

describe('Analyzer — scope', () => {
  it('accepts declared variables', () => expect(() => check('sprout x <~ 1\nbloom x')).not.toThrow())
  it('rejects undeclared variable', () => bad('bloom x', "has not been declared"))
  it('rejects redeclaration in same scope', () => bad('sprout x <~ 1\nsprout x <~ 2', "already declared"))
  it('accepts assign to declared var', () => expect(() => check('sprout x <~ 1\nx <~ 2')).not.toThrow())
  it('rejects assign to undeclared var', () => bad('x <~ 1', "has not been declared"))
  it('accepts params shadowing outer scope', () => expect(() => check('sprout x <~ 1\ngrow f(x) [~ harvest x\n~]\nf(2)')).not.toThrow())
})

describe('Analyzer — guard statements', () => {
  it('accepts guard with valid condition and statement', () => {
    expect(() => check('sprout x <~ 1\nx > 0 => bloom x')).not.toThrow()
  })
  it('accepts guard inside function', () => {
    expect(() => check('grow f(n) [~ n <= 1 => harvest n\nharvest 0\n~]')).not.toThrow()
  })
  it('rejects guard with undeclared variable in condition', () => {
    bad('x > 0 => bloom x', "has not been declared")
  })
})

describe('Analyzer — pipeline expressions', () => {
  it('accepts pipeline to a declared function', () => {
    expect(() => check('grow f(n) [~ harvest n\n~]\nbloom 5 ~> f')).not.toThrow()
  })
  it('rejects pipeline to undeclared identifier', () => {
    bad('bloom 5 ~> f', "has not been declared")
  })
  it('accepts chained pipeline', () => {
    expect(() => check('grow f(n) [~ harvest n\n~]\nbloom 1 ~> f ~> f')).not.toThrow()
  })
})

describe('Analyzer — function context', () => {
  it('accepts harvest inside grow', () => expect(() => check('grow f() [~ harvest 1\n~]')).not.toThrow())
  it('rejects harvest outside grow', () => bad('harvest 1', "'harvest' used outside"))
  it('checks argument count (too many)', () => bad('grow f(x) [~ harvest x\n~]\nf(1,2)', "expects 1"))
  it('checks argument count (too few)', () => bad('grow f(x,y) [~ harvest x\n~]\nf(1)', "expects 2"))
  it('accepts correct arg count', () => expect(() => check('grow f(x) [~ harvest x\n~]\nf(1)')).not.toThrow())
})

describe('Analyzer — loop context', () => {
  it('accepts wither inside cycle', () => expect(() => check('cycle true [~ wither\n~]')).not.toThrow())
  it('rejects wither outside cycle', () => bad('wither', "'wither' used outside"))
  it('accepts dormant inside cycle', () => expect(() => check('cycle true [~ dormant\n~]')).not.toThrow())
  it('rejects dormant outside cycle', () => bad('dormant', "'dormant' used outside"))
})

describe('Analyzer — graph static checks', () => {
  it('accepts a valid graph', () => expect(() => check('sprout g <~ graph [~ node a\nnode b\nedge a -> b\n~]')).not.toThrow())
  it('rejects duplicate node', () => bad('sprout g <~ graph [~ node a\nnode a\n~]', "Duplicate node 'a'"))
  it('rejects edge from undeclared node', () => bad('sprout g <~ graph [~ node a\nedge x -> a\n~]', "undeclared node 'x'"))
  it('rejects edge to undeclared node', () => bad('sprout g <~ graph [~ node a\nedge a -> z\n~]', "undeclared node 'z'"))
  it('rejects spread on non-graph', () => bad('sprout x <~ 1\nspread x from a [~ reach n [~ bloom n\n~]\n~]', "not a graph"))
  it('accepts spread on graph', () => expect(() => check('sprout g <~ graph [~ node a\n~]\nspread g from a [~ reach n [~ bloom n\n~]\n~]')).not.toThrow())
  it('binds reach variable in spread body', () => expect(() => check('sprout g <~ graph [~ node a\n~]\nspread g from a [~ reach current [~ bloom current\n~]\n~]')).not.toThrow())
  it('accepts spread on inline graph literal', () => expect(() => check('spread (graph [~ node a\n~]) from a [~ reach n [~ bloom n\n~]\n~]')).not.toThrow())
})

describe('Analyzer — colony and grows', () => {
  it('accepts a valid colony', () => expect(() => check('sprout c <~ colony [~ name <~ "x"\n~]')).not.toThrow())
  it('accepts self inside colony method', () => expect(() => check('sprout c <~ colony [~ grow f() [~ bloom self.name\n~]\n~]')).not.toThrow())
  it('rejects self outside colony', () => bad('bloom self', "'self' used outside"))
  it('rejects self member assign outside colony', () => bad('self.x <~ 1', "'self' used outside"))
  it('accepts self member assign inside colony method', () => expect(() => check('sprout c <~ colony [~ grow f() [~ self.x <~ 1\n~]\n~]')).not.toThrow())
  it('accepts member assign on declared var', () => expect(() => check('sprout x <~ 1\nx.y <~ 2')).not.toThrow())
  it('rejects member assign on undeclared var', () => bad('z.y <~ 1', "has not been declared"))
  it('accepts grows from a colony', () => expect(() => check('sprout c <~ colony [~ name <~ "x"\n~]\nsprout d <~ c grows [~ name <~ "y"\n~]')).not.toThrow())
  it('rejects grows from a non-colony', () => bad('sprout x <~ 1\nsprout d <~ x grows [~ name <~ "y"\n~]', "not a colony"))
  it('accepts grows with method using self', () => expect(() => check('sprout c <~ colony [~\n~]\nsprout d <~ c grows [~ grow f() [~ bloom self\n~]\n~]')).not.toThrow())
  it('accepts grows from an inline colony literal', () => expect(() => check('sprout d <~ (colony [~ name <~ "x"\n~]) grows [~ name <~ "y"\n~]')).not.toThrow())
})

describe('Analyzer — other', () => {
  it('accepts when without otherwise', () => expect(() => check('when true [~ bloom 1\n~]')).not.toThrow())
  it('accepts when/otherwise', () => expect(() => check('when true [~ bloom 1\n~] otherwise [~ bloom 2\n~]')).not.toThrow())
  it('accepts member access on declared var', () => expect(() => check('sprout x <~ 1\nbloom x.field')).not.toThrow())
  it('accepts binary and unary expressions', () => expect(() => check('bloom not true\nbloom 1 + 2')).not.toThrow())
  it('throws on unknown node type', () => expect(() => analyze({ constructor: { name: 'Bogus' } })).toThrow('Unknown node type'))
  it('accepts calling a non-function variable', () => expect(() => check('sprout f <~ 1\nf()')).not.toThrow())
})
