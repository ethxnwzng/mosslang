// AST node types for the Moss programming language

export class Program {
  constructor(statements) {
    this.statements = statements
  }
}

export class FunDecl {
  constructor(name, params, body) {
    this.name = name
    this.params = params
    this.body = body
  }
}

export class VarDecl {
  constructor(name, initializer) {
    this.name = name
    this.initializer = initializer
  }
}

export class Assign {
  constructor(name, source) {
    this.name = name
    this.source = source
  }
}

export class MemberAssign {
  constructor(base, fields, source) {
    this.base = base     // "self" or an id name string
    this.fields = fields // string[] chain of field names
    this.source = source
  }
}

export class GuardStmt {
  constructor(condition, consequent) {
    this.condition = condition
    this.consequent = consequent
  }
}

export class BloomStmt {
  constructor(expression) {
    this.expression = expression
  }
}

export class SpreadStmt {
  constructor(graph, startNode, reachVar, body) {
    this.graph = graph         // Exp — must resolve to a graph
    this.startNode = startNode // string — starting node name
    this.reachVar = reachVar   // string — variable bound at each visited node
    this.body = body           // Block
  }
}

export class WhenStmt {
  constructor(test, consequent, alternate) {
    this.test = test
    this.consequent = consequent
    this.alternate = alternate
  }
}

export class CycleStmt {
  constructor(test, body) {
    this.test = test
    this.body = body
  }
}

export class HarvestStmt {
  constructor(expression) {
    this.expression = expression
  }
}

export class WitherStmt {}
export class DormantStmt {}

export class Block {
  constructor(statements) {
    this.statements = statements
  }
}

export class GraphLit {
  constructor(nodes, edges) {
    this.nodes = nodes // string[]
    this.edges = edges // { from, to, weight }[]
  }
}

export class ColonyLit {
  constructor(fields, methods) {
    this.fields = fields   // FieldDecl[]
    this.methods = methods // FunDecl[]
  }
}

export class FieldDecl {
  constructor(name, value) {
    this.name = name
    this.value = value
  }
}

export class GrowsExp {
  constructor(base, fields, methods) {
    this.base = base       // Exp — prototype to grow from
    this.fields = fields   // FieldDecl[]
    this.methods = methods // FunDecl[]
  }
}

export class PipeExp {
  constructor(left, right) {
    this.left = left
    this.right = right
  }
}

export class BinaryExp {
  constructor(op, left, right) {
    this.op = op
    this.left = left
    this.right = right
  }
}

export class UnaryExp {
  constructor(op, operand) {
    this.op = op
    this.operand = operand
  }
}

export class CallExp {
  constructor(callee, args) {
    this.callee = callee
    this.args = args
  }
}

export class MemberExp {
  constructor(object, field) {
    this.object = object
    this.field = field
  }
}

export class IdExp {
  constructor(name) {
    this.name = name
  }
}

export class SelfExp {}

export class NumLit {
  constructor(value) {
    this.value = value
  }
}

export class StrLit {
  constructor(value) {
    this.value = value
  }
}

export class BoolLit {
  constructor(value) {
    this.value = value
  }
}
