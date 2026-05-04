import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'
import { generate } from '../src/generator.js'
import * as core from '../src/core.js'

const gen = src => generate(parse(src))

describe('Generator — core', () => {
  it('generates console.log for bloom', () => expect(gen('bloom 42')).toContain('console.log(42)'))
  it('generates let for sprout with <~', () => expect(gen('sprout x <~ 5')).toContain('let x = 5;'))
  it('generates assignment with <~', () => expect(gen('sprout x <~ 1\nx <~ 2')).toContain('x = 2;'))
  it('generates member assign with <~', () => expect(gen('sprout x <~ 1\nx.y <~ 2')).toContain('x.y = 2;'))
  it('generates self as this', () => expect(gen('self.name <~ "a"')).toContain('this.name'))
  it('generates function', () => { const c = gen('grow f(a,b) [~ harvest a+b\n~]'); expect(c).toContain('function f(a, b)') })
  it('generates if for when', () => expect(gen('when true [~ bloom 1\n~]')).toContain('if (true)'))
  it('generates if/else for when/otherwise', () => expect(gen('when true [~ bloom 1\n~] otherwise [~ bloom 2\n~]')).toContain('else'))
  it('generates while for cycle', () => expect(gen('cycle true [~ bloom 1\n~]')).toContain('while (true)'))
  it('generates return for harvest', () => expect(gen('grow f() [~ harvest 1\n~]')).toContain('return 1;'))
  it('generates break for wither', () => expect(gen('cycle true [~ wither\n~]')).toContain('break;'))
  it('generates continue for dormant', () => expect(gen('cycle true [~ dormant\n~]')).toContain('continue;'))
  it('generates arithmetic ops', () => {
    for (const op of ['+','-','*','/','%']) expect(gen(`bloom 1 ${op} 2`)).toContain(op)
  })
  it('generates && for and', () => expect(gen('bloom true and false')).toContain('&&'))
  it('generates || for or', () => expect(gen('bloom true or false')).toContain('||'))
  it('generates ! for not', () => expect(gen('bloom not true')).toContain('(!true)'))
  it('generates unary negation', () => expect(gen('bloom -5')).toContain('(-5)'))
  it('generates string literals', () => expect(gen('bloom "hello"')).toContain('"hello"'))
  it('generates bool literals', () => { expect(gen('bloom true')).toContain('true'); expect(gen('bloom false')).toContain('false') })
  it('generates member access', () => expect(gen('bloom x.y')).toContain('x.y'))
  it('generates call', () => { const c = gen('grow f(x) [~ harvest x\n~]\nf(1)'); expect(c).toContain('f(1)') })
  it('generates if for guard', () => expect(gen('sprout x <~ 1\nx > 0 => bloom x')).toContain('if ('))
  it('generates pipeline as function call', () => {
    const c = gen('grow f(n) [~ harvest n\n~]\nbloom 5 ~> f')
    expect(c).toContain('f(5)')
  })
  it('generates chained pipeline', () => {
    const c = gen('grow f(n) [~ harvest n\n~]\nbloom 1 ~> f ~> f')
    expect(c).toContain('f(f(1))')
  })
  it('throws on unknown node', () => expect(() => generate(new (class Bogus {})())).toThrow('Cannot generate code for: Bogus'))
})

describe('Generator — graph', () => {
  it('generates graph as Set + Map', () => {
    const c = gen('sprout g <~ graph [~ node a\nnode b\nedge a -> b\n~]')
    expect(c).toContain('new Set')
    expect(c).toContain('new Map')
  })
  it('includes weight in edge when provided', () => {
    const c = gen('sprout g <~ graph [~ node a\nnode b\nedge a -> b weight 5\n~]')
    expect(c).toContain('weight:5')
  })
  it('defaults weight to 1 when omitted', () => {
    const c = gen('sprout g <~ graph [~ node a\nnode b\nedge a -> b\n~]')
    expect(c).toContain('weight:1')
  })
  it('generates BFS spread with while loop and queue', () => {
    const c = gen('sprout g <~ graph [~ node a\n~]\nspread g from a [~ reach n [~ bloom n\n~]\n~]')
    expect(c).toContain('while')
    expect(c).toContain('.shift()')
    expect(c).toContain('console.log')
  })
})

describe('Generator — colony and grows', () => {
  it('generates colony as object literal', () => {
    const c = gen('sprout cr <~ colony [~ name <~ "x"\n~]')
    expect(c).toContain('name: "x"')
  })
  it('generates colony method as function property', () => {
    const c = gen('sprout cr <~ colony [~ grow f() [~ bloom self.name\n~]\n~]')
    expect(c).toContain('f: function()')
    expect(c).toContain('this.name')
  })
  it('generates grows as Object.assign(Object.create(...))', () => {
    const c = gen('sprout c <~ colony [~\n~]\nsprout d <~ c grows [~ name <~ "d"\n~]')
    expect(c).toContain('Object.assign(Object.create(c)')
    expect(c).toContain('name: "d"')
  })
  it('generates grows with method', () => {
    const c = gen('sprout c <~ colony [~\n~]\nsprout d <~ c grows [~ grow f() [~ bloom 1\n~]\n~]')
    expect(c).toContain('f: function()')
  })
})
