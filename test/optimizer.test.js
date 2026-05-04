import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'
import { optimize } from '../src/optimizer.js'
import * as core from '../src/core.js'

const opt = src => optimize(parse(src))

describe('Optimizer — constant folding', () => {
  it('folds addition', () => expect(opt('bloom 2 + 3').statements[0].expression.value).toBe(5))
  it('folds subtraction', () => expect(opt('bloom 10 - 4').statements[0].expression.value).toBe(6))
  it('folds multiplication', () => expect(opt('bloom 3 * 4').statements[0].expression.value).toBe(12))
  it('folds division', () => expect(opt('bloom 10 / 2').statements[0].expression.value).toBe(5))
  it('folds modulo', () => expect(opt('bloom 7 % 3').statements[0].expression.value).toBe(1))
  it('folds numeric comparisons', () => {
    expect(opt('bloom 3 < 5').statements[0].expression.value).toBe(true)
    expect(opt('bloom 5 >= 5').statements[0].expression.value).toBe(true)
    expect(opt('bloom 4 == 4').statements[0].expression.value).toBe(true)
    expect(opt('bloom 4 != 5').statements[0].expression.value).toBe(true)
    expect(opt('bloom 5 > 3').statements[0].expression.value).toBe(true)
    expect(opt('bloom 3 <= 3').statements[0].expression.value).toBe(true)
  })
  it('folds boolean and/or', () => {
    expect(opt('bloom true and false').statements[0].expression.value).toBe(false)
    expect(opt('bloom false or true').statements[0].expression.value).toBe(true)
  })
  it('falls through bool comparison to BinaryExp', () => {
    expect(opt('bloom true == false').statements[0].expression).toBeInstanceOf(core.BinaryExp)
  })
  it('folds unary negation', () => expect(opt('bloom -5').statements[0].expression.value).toBe(-5))
  it('folds unary not', () => expect(opt('bloom not true').statements[0].expression.value).toBe(false))
  it('preserves non-constant unary', () => {
    expect(opt('sprout x <~ 1\nbloom -x').statements[1].expression).toBeInstanceOf(core.UnaryExp)
  })
})

describe('Optimizer — dead code elimination', () => {
  it('removes statements after harvest', () => {
    expect(opt('grow f() [~ harvest 1\nbloom 2\n~]').statements[0].body.statements).toHaveLength(1)
  })
  it('removes statements after wither', () => {
    expect(opt('cycle true [~ wither\nbloom 1\n~]').statements[0].body.statements).toHaveLength(1)
  })
  it('removes statements after dormant', () => {
    expect(opt('cycle true [~ dormant\nbloom 1\n~]').statements[0].body.statements).toHaveLength(1)
  })
})

describe('Optimizer — constant when/cycle folding', () => {
  it('folds when true to consequent', () => {
    expect(opt('when true [~ bloom 1\n~] otherwise [~ bloom 2\n~]').statements[0]).toBeInstanceOf(core.Block)
  })
  it('folds when false to alternate', () => {
    expect(opt('when false [~ bloom 1\n~] otherwise [~ bloom 2\n~]').statements[0]).toBeInstanceOf(core.Block)
  })
  it('folds when false with no alternate to empty block', () => {
    const b = opt('when false [~ bloom 1\n~]').statements[0]
    expect(b).toBeInstanceOf(core.Block)
    expect(b.statements).toHaveLength(0)
  })
  it('eliminates cycle false', () => {
    expect(opt('cycle false [~ bloom 1\n~]').statements[0]).toBeInstanceOf(core.Block)
  })
  it('preserves non-constant when with no alternate', () => {
    const r = opt('sprout x <~ true\nwhen x [~ bloom 1\n~]')
    expect(r.statements[1]).toBeInstanceOf(core.WhenStmt)
    expect(r.statements[1].alternate).toBeNull()
  })
  it('preserves non-constant when with alternate', () => {
    const r = opt('sprout x <~ true\nwhen x [~ bloom 1\n~] otherwise [~ bloom 2\n~]')
    expect(r.statements[1]).toBeInstanceOf(core.WhenStmt)
    expect(r.statements[1].alternate).not.toBeNull()
  })
})

describe('Optimizer — guard statement folding', () => {
  it('folds guard true to consequent', () => {
    expect(opt('true => bloom 1').statements[0]).toBeInstanceOf(core.BloomStmt)
  })
  it('folds guard false to empty block', () => {
    const b = opt('false => bloom 1').statements[0]
    expect(b).toBeInstanceOf(core.Block)
    expect(b.statements).toHaveLength(0)
  })
  it('preserves non-constant guard', () => {
    expect(opt('sprout x <~ 1\nx > 0 => bloom x').statements[1]).toBeInstanceOf(core.GuardStmt)
  })
})

describe('Optimizer — pipeline pass-through', () => {
  it('passes pipeline through unchanged when non-constant', () => {
    const r = opt('grow f(n) [~ harvest n\n~]\nbloom 1 ~> f')
    expect(r.statements[1].expression).toBeInstanceOf(core.PipeExp)
  })
  it('optimizes pipeline left side', () => {
    const r = opt('grow f(n) [~ harvest n\n~]\nbloom (2 + 3) ~> f')
    expect(r.statements[1].expression.left.value).toBe(5)
  })
})

describe('Optimizer — new nodes pass-through', () => {
  it('passes graph through unchanged', () => {
    const r = opt('sprout g <~ graph [~ node a\n~]')
    expect(r.statements[0].initializer).toBeInstanceOf(core.GraphLit)
  })
  it('optimizes colony field values', () => {
    const r = opt('sprout c <~ colony [~ x <~ 2 + 3\n~]')
    expect(r.statements[0].initializer.fields[0].value.value).toBe(5)
  })
  it('optimizes grows field values', () => {
    const r = opt('sprout c <~ colony [~\n~]\nsprout d <~ c grows [~ x <~ 2 * 3\n~]')
    expect(r.statements[1].initializer.fields[0].value.value).toBe(6)
  })
  it('optimizes grows method body', () => {
    const r = opt('sprout c <~ colony [~\n~]\nsprout d <~ c grows [~ grow f() [~ harvest 2 + 3\n~]\n~]')
    expect(r.statements[1].initializer.methods[0].body.statements[0].expression.value).toBe(5)
  })
  it('optimizes spread body', () => {
    const r = opt('sprout g <~ graph [~ node a\n~]\nspread g from a [~ reach n [~ bloom 2 + 3\n~]\n~]')
    expect(r.statements[1]).toBeInstanceOf(core.SpreadStmt)
  })
  it('optimizes assign source', () => {
    const r = opt('sprout x <~ 1\nx <~ 2 + 3')
    expect(r.statements[1].source.value).toBe(5)
  })
  it('optimizes member assign source', () => {
    const r = opt('sprout x <~ 1\nx.y <~ 2 + 3')
    expect(r.statements[1].source.value).toBe(5)
  })
  it('optimizes member access', () => {
    const r = opt('bloom x.y')
    expect(r.statements[0].expression).toBeInstanceOf(core.MemberExp)
  })
})
