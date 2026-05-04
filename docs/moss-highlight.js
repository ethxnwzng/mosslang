(function () {
  'use strict';

  // ── HTML escaping ─────────────────────────────────────────────────────────
  function escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MOSS HIGHLIGHTER
  // ══════════════════════════════════════════════════════════════════════════

  var STARTERS = new Set([
    'grow', 'sprout', 'colony', 'spread', 'reach', 'graph',
    'cycle', 'when', 'otherwise', 'grows', 'from', 'self',
    'node', 'edge', 'weight'
  ]);

  var ENDERS   = new Set(['harvest', 'wither', 'dormant', 'bloom']);
  var BOOLEANS = new Set(['true', 'false']);
  var LOGIC    = new Set(['and', 'or', 'not']);
  var MOSS_OPS = new Set(['<~', '~>', '=>', '[~', '~]', '->']);

  // Alternatives tried left-to-right; order is critical.
  var MOSS_TOKEN = /~~[^\n]*|"(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|<~|~>|=>|\[~|~\]|->|[a-zA-Z_][a-zA-Z0-9_]*|[^\S\n]+|\n|./g;

  function highlightMoss(code) {
    return code.replace(MOSS_TOKEN, function (m) {
      if (m.length >= 2 && m[0] === '~' && m[1] === '~')
        return '<span class="ms-comment">' + escHtml(m) + '</span>';
      if (m[0] === '"')
        return '<span class="ms-string">' + escHtml(m) + '</span>';
      if (m[0] >= '0' && m[0] <= '9')
        return '<span class="ms-number">' + escHtml(m) + '</span>';
      if (MOSS_OPS.has(m))
        return '<span class="ms-operator">' + escHtml(m) + '</span>';
      if (ENDERS.has(m))
        return '<span class="ms-ender">' + escHtml(m) + '</span>';
      if (STARTERS.has(m))
        return '<span class="ms-starter">' + escHtml(m) + '</span>';
      if (BOOLEANS.has(m))
        return '<span class="ms-boolean">' + escHtml(m) + '</span>';
      if (LOGIC.has(m))
        return '<span class="ms-logic">' + escHtml(m) + '</span>';
      return escHtml(m);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  JAVASCRIPT HIGHLIGHTER
  // ══════════════════════════════════════════════════════════════════════════

  var JS_KW = new Set([
    'function', 'return', 'let', 'const', 'var', 'while', 'if', 'else',
    'for', 'new', 'this', 'class', 'typeof', 'instanceof', 'true', 'false',
    'null', 'undefined'
  ]);
  var JS_BUILTIN = new Set(['console', 'log', 'Math', 'Array', 'Object']);

  var JS_TOKEN = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b(?:function|return|let|const|var|while|if|else|for|new|this|class|typeof|instanceof|true|false|null|undefined)\b|[a-zA-Z_$][a-zA-Z0-9_$]*|[^\S\n]+|\n|./g;

  function highlightJS(code) {
    return code.replace(JS_TOKEN, function (m) {
      if (m.startsWith('//') || m.startsWith('/*'))
        return '<span class="js-comment">' + escHtml(m) + '</span>';
      if (m[0] === '"' || m[0] === "'" || m[0] === '`')
        return '<span class="js-string">' + escHtml(m) + '</span>';
      if (m[0] >= '0' && m[0] <= '9')
        return '<span class="js-number">' + escHtml(m) + '</span>';
      if (JS_KW.has(m))
        return '<span class="js-kw">' + escHtml(m) + '</span>';
      if (JS_BUILTIN.has(m))
        return '<span class="js-builtin">' + escHtml(m) + '</span>';
      return escHtml(m);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PYTHON HIGHLIGHTER
  // ══════════════════════════════════════════════════════════════════════════

  var PY_KW = new Set([
    'def', 'return', 'while', 'if', 'else', 'elif', 'for', 'in',
    'and', 'or', 'not', 'True', 'False', 'None', 'class', 'import',
    'from', 'as', 'pass', 'break', 'continue', 'lambda'
  ]);
  var PY_BUILTIN = new Set(['print', 'len', 'range', 'int', 'str', 'list', 'dict']);

  var PY_TOKEN = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b(?:def|return|while|if|else|elif|for|in|and|or|not|True|False|None|class|import|from|as|pass|break|continue|lambda)\b|\b(?:print|len|range|int|str|list|dict)\b|[a-zA-Z_][a-zA-Z0-9_]*|[^\S\n]+|\n|./g;

  function highlightPython(code) {
    return code.replace(PY_TOKEN, function (m) {
      if (m[0] === '#')
        return '<span class="py-comment">' + escHtml(m) + '</span>';
      if (m[0] === '"' || m[0] === "'")
        return '<span class="py-string">' + escHtml(m) + '</span>';
      if (m[0] >= '0' && m[0] <= '9')
        return '<span class="py-number">' + escHtml(m) + '</span>';
      if (PY_KW.has(m))
        return '<span class="py-kw">' + escHtml(m) + '</span>';
      if (PY_BUILTIN.has(m))
        return '<span class="py-builtin">' + escHtml(m) + '</span>';
      return escHtml(m);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AUTO-INITIALISE
  //  Pairs:  <script type="text/x-moss" id="NAME">…</script>
  //          <code  id="NAME-out"></code>
  //  Same pattern for text/x-js and text/x-py.
  // ══════════════════════════════════════════════════════════════════════════

  function initHighlighting() {
    document.querySelectorAll('script[type="text/x-moss"]').forEach(function (s) {
      var t = document.getElementById(s.id + '-out');
      if (t) t.innerHTML = highlightMoss(s.textContent.trim());
    });
    document.querySelectorAll('script[type="text/x-js"]').forEach(function (s) {
      var t = document.getElementById(s.id + '-out');
      if (t) t.innerHTML = highlightJS(s.textContent.trim());
    });
    document.querySelectorAll('script[type="text/x-py"]').forEach(function (s) {
      var t = document.getElementById(s.id + '-out');
      if (t) t.innerHTML = highlightPython(s.textContent.trim());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHighlighting);
  } else {
    initHighlighting();
  }

  window.highlightMoss   = highlightMoss;
  window.highlightJS     = highlightJS;
  window.highlightPython = highlightPython;
})();
