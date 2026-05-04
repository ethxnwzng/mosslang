(function () {
  'use strict';

  // ── Keyword sets ──────────────────────────────────────────────────────────
  // "Starters" — keywords that open or declare things
  var STARTERS = new Set([
    'grow', 'sprout', 'colony', 'spread', 'reach', 'graph',
    'cycle', 'when', 'otherwise', 'grows', 'from', 'self',
    'node', 'edge', 'weight'
  ]);

  // "Enders" — keywords that conclude, output, or exit
  var ENDERS = new Set(['harvest', 'wither', 'dormant', 'bloom']);

  var BOOLEANS = new Set(['true', 'false']);
  var LOGIC    = new Set(['and', 'or', 'not']);

  // Symbolic operators that get amber highlighting
  var OPERATORS = new Set(['<~', '~>', '=>', '[~', '~]', '->']);

  // ── HTML escaping ─────────────────────────────────────────────────────────
  function escHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Tokenizer regex ───────────────────────────────────────────────────────
  // Alternatives are tried left-to-right; order is critical.
  //  1. Comments        ~~…   (to end of line)
  //  2. Strings         "…"   (with escape support)
  //  3. Numbers         42  3.14
  //  4. Multi-char ops  <~  ~>  =>  [~  ~]  ->
  //  5. Identifiers / keywords
  //  6. Whitespace (non-newline), newlines, any other character
  var TOKEN = /~~[^\n]*|"(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|<~|~>|=>|\[~|~\]|->|[a-zA-Z_][a-zA-Z0-9_]*|[^\S\n]+|\n|./g;

  // ── Core highlighter ──────────────────────────────────────────────────────
  function highlightMoss(code) {
    return code.replace(TOKEN, function (match) {
      // Comments
      if (match.length >= 2 && match[0] === '~' && match[1] === '~') {
        return '<span class="ms-comment">' + escHtml(match) + '</span>';
      }
      // Strings
      if (match[0] === '"') {
        return '<span class="ms-string">' + escHtml(match) + '</span>';
      }
      // Numbers
      if (match[0] >= '0' && match[0] <= '9') {
        return '<span class="ms-number">' + escHtml(match) + '</span>';
      }
      // Symbolic operators
      if (OPERATORS.has(match)) {
        return '<span class="ms-operator">' + escHtml(match) + '</span>';
      }
      // Ender keywords (amber)
      if (ENDERS.has(match)) {
        return '<span class="ms-ender">' + escHtml(match) + '</span>';
      }
      // Starter keywords (green)
      if (STARTERS.has(match)) {
        return '<span class="ms-starter">' + escHtml(match) + '</span>';
      }
      // Booleans
      if (BOOLEANS.has(match)) {
        return '<span class="ms-boolean">' + escHtml(match) + '</span>';
      }
      // Logic keywords
      if (LOGIC.has(match)) {
        return '<span class="ms-logic">' + escHtml(match) + '</span>';
      }
      // Everything else — plain, escaped
      return escHtml(match);
    });
  }

  // ── Auto-initialise ───────────────────────────────────────────────────────
  // Looks for pairs:  <script type="text/x-moss" id="NAME">…</script>
  //                   <code id="NAME-out"></code>
  // Reads raw Moss source from the script block (no HTML-escaping needed),
  // applies highlighting, and writes the result into the matching code element.
  function initHighlighting() {
    document.querySelectorAll('script[type="text/x-moss"]').forEach(function (script) {
      var target = document.getElementById(script.id + '-out');
      if (target) {
        target.innerHTML = highlightMoss(script.textContent.trim());
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHighlighting);
  } else {
    initHighlighting();
  }

  // Also expose for manual use
  window.highlightMoss = highlightMoss;
})();
