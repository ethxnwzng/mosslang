import { describe, it, expect } from 'vitest'
import { compile } from '../src/compiler.js'
import * as core from '../src/core.js'

describe('Compiler — phases', () => {
  it('returns AST at parse phase', () => expect(compile('bloom 1', { phase: 'parse' })).toBeInstanceOf(core.Program))
  it('returns AST at analyze phase', () => expect(compile('bloom 1', { phase: 'analyze' })).toBeInstanceOf(core.Program))
  it('returns optimized AST at optimize phase', () => {
    const r = compile('bloom 2 + 3', { phase: 'optimize' })
    expect(r.statements[0].expression.value).toBe(5)
  })
  it('returns JS string by default', () => expect(typeof compile('bloom 42')).toBe('string'))
  it('throws on parse error', () => expect(() => compile('grow 123')).toThrow())
  it('throws on semantic error', () => expect(() => compile('bloom undeclared')).toThrow())
})

describe('Compiler — end to end', () => {
  it('compiles fibonacci with guard clauses', () => {
    const src = `
grow fib(n) [~
    n <= 1 => harvest n
    harvest fib(n - 1) + fib(n - 2)
~]
bloom fib(10)`
    const out = compile(src)
    expect(out).toContain('function fib')
    expect(out).toContain('console.log')
  })

  it('compiles pipeline expression', () => {
    const src = `
grow double(n) [~
    harvest n * 2
~]
bloom 5 ~> double`
    const out = compile(src)
    expect(out).toContain('double(5)')
  })

  it('compiles a graph with BFS spread', () => {
    const src = `
sprout web <~ graph [~
    node a
    node b
    edge a -> b weight 3
~]
spread web from a [~ reach n [~ bloom n
~]
~]`
    const out = compile(src)
    expect(out).toContain('new Set')
    expect(out).toContain('while')
  })

  it('compiles colony and grows', () => {
    const src = `
sprout creature <~ colony [~
    name <~ "base"
    grow speak() [~ bloom self.name
    ~]
~]
sprout fern <~ creature grows [~ name <~ "fern"
~]
fern.speak()`
    const out = compile(src)
    expect(out).toContain('Object.create')
    expect(out).toContain('this.name')
  })
})
