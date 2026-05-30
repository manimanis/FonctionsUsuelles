/**
 * CodeMirror 5 mode for Algorithmic pseudo-code
 * Used in algorithmic pedagogy (Bac Informatique Tunisie)
 */

(function(mod) {
  if (typeof exports === 'object' && typeof module === 'object')
    mod(require('codemirror'), require('codemirror/addon/hint/show-hint'));
  else if (typeof define === 'function' && define.amd)
    define(['codemirror', 'codemirror/addon/hint/show-hint'], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror) {

  // ── Keywords ──
  const keywords = [
    'si', 'alors', 'sinon', 'finsi',
    'pour', 'de', 'à', 'a', 'faire', 'pas', 'fin',
    'tant', 'que', 'fintantque',
    'répéter', 'repeter', 'jusqu\'à', 'jusqu\'a', 'jusqua',
    'début', 'debut',
    'mod', 'div',
    'et', 'ou', 'non',
    'fonction', 'procédure', 'procedure',
    'retourner', 'retourne',
    'var', 'type', 'tableau',
    'entier', 'réel', 'reel', 'booléen', 'booleen', 'chaîne', 'chaine', 'caractère', 'caractere',
    'vrai', 'faux', 'nul',
    'algorithme',
  ];

  const builtins = [
    'chr', 'ord',
    'arrondi', 'racine', 'alea', 'aléa', 'abs', 'ent',
    'long', 'pos', 'convch', 'estnum',
    'valeur', 'sous_chaine', 'effacer', 'majus',
    'ecrire', 'écrire', 'afficher', 'lire',
  ];

  const keywordSet = {};
  keywords.forEach(k => keywordSet[k] = true);
  const builtinSet = {};
  builtins.forEach(k => builtinSet[k] = true);

  CodeMirror.defineSimpleMode('algorithm', {
    start: [
      // Comments
      { regex: /\/\/\/.*|\/\/.*|#.*/, token: 'comment' },

      // Strings
      { regex: /"(?:[^\\"]|\\.)*"/, token: 'string' },
      { regex: /'(?:[^\\']|\\.)*'/, token: 'string' },

      // Assignment operator
      { regex: /←|<--/, token: 'operator' },

      // Range operator
      { regex: /\.\./, token: 'operator' },

      // Membership
      { regex: /∈/, token: 'operator' },

      // Comparison operators
      { regex: /<>|!=|≠|<=|>=|:=|=|<|>/, token: 'operator' },

      // Arithmetic operators
      { regex: /[+\-*/×]/, token: 'operator' },

      // Numbers
      { regex: /\b\d+\.\d+/, token: 'number' },
      { regex: /\b\d+/, token: 'number' },

      // Built-in functions (must come before keywords to prioritize)
      { regex: new RegExp('\\b(?:' + builtins.map(escapeRegex).join('|') + ')\\b', 'i'), token: 'builtin' },

      // Keywords
      { regex: new RegExp('\\b(?:' + keywords.map(escapeRegex).join('|') + ')\\b', 'i'), token: 'keyword' },

      // Identifiers
      { regex: /[a-zA-Z_àâäéèêëîïôöùûüÀÂÄÉÈÊËÎÏÔÖÙÛÜ][\wàâäéèêëîïôöùûüÀÂÄÉÈÊËÎÏÔÖÙÛÜ]*/, token: 'variable' },

      // Punctuation
      { regex: /[{}()[\],;:]/, token: 'bracket' },
    ],
    meta: {
      dontIndentStates: [],
      lineComment: '//',
    }
  });

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── Autocomplete ──
  const allCompletions = [
    // Keywords sorted by category
    { text: 'si', displayText: 'si … alors … finsi', type: 'keyword' },
    { text: 'sinon', displayText: 'sinon', type: 'keyword' },
    { text: 'alors', displayText: 'alors', type: 'keyword' },
    { text: 'pour', displayText: 'pour … de … à … faire', type: 'keyword' },
    { text: 'tant', displayText: 'tant que … faire', type: 'keyword' },
    { text: 'que', displayText: 'que', type: 'keyword' },
    { text: 'répéter', displayText: 'répéter … jusqu\'à', type: 'keyword' },
    { text: 'jusqu\'à', displayText: 'jusqu\'à', type: 'keyword' },
    { text: 'faire', displayText: 'faire', type: 'keyword' },
    { text: 'début', displayText: 'Début … Fin', type: 'keyword' },
    { text: 'fonction', displayText: 'Fonction … : type', type: 'keyword' },
    { text: 'procédure', displayText: 'Procédure …', type: 'keyword' },
    { text: 'retourner', displayText: 'Retourner', type: 'keyword' },
    { text: 'var', displayText: 'var … : type', type: 'keyword' },
    { text: 'type', displayText: 'type … = tableau de', type: 'keyword' },
    { text: 'tableau', displayText: 'tableau', type: 'keyword' },
    { text: 'algorithme', displayText: 'Algorithme …', type: 'keyword' },

    // Types
    { text: 'entier', displayText: 'entier', type: 'type' },
    { text: 'réel', displayText: 'réel', type: 'type' },
    { text: 'booléen', displayText: 'booléen', type: 'type' },
    { text: 'chaîne', displayText: 'chaîne', type: 'type' },
    { text: 'caractère', displayText: 'caractère', type: 'type' },

    // Literals
    { text: 'vrai', displayText: 'vrai', type: 'literal' },
    { text: 'faux', displayText: 'faux', type: 'literal' },

    // Built-in functions
    { text: 'chr', displayText: 'chr(code)', type: 'function' },
    { text: 'ord', displayText: 'ord(car)', type: 'function' },
    { text: 'arrondi', displayText: 'arrondi(x)', type: 'function' },
    { text: 'racine', displayText: 'racine(x)', type: 'function' },
    { text: 'alea', displayText: 'aléa(vi, vf)', type: 'function' },
    { text: 'abs', displayText: 'abs(x)', type: 'function' },
    { text: 'ent', displayText: 'ent(x)', type: 'function' },
    { text: 'long', displayText: 'long(ch)', type: 'function' },
    { text: 'pos', displayText: 'pos(ch1, ch2)', type: 'function' },
    { text: 'convch', displayText: 'ConvCh(x)', type: 'function' },
    { text: 'estnum', displayText: 'EstNum(ch)', type: 'function' },
    { text: 'valeur', displayText: 'valeur(ch)', type: 'function' },
    { text: 'sous_chaine', displayText: 'sous_chaine(ch, d, f)', type: 'function' },
    { text: 'effacer', displayText: 'effacer(ch, d, f)', type: 'function' },
    { text: 'majus', displayText: 'majus(ch)', type: 'function' },
    { text: 'ecrire', displayText: 'Ecrire(…)', type: 'function' },
    { text: 'lire', displayText: 'Lire(var)', type: 'function' },

    // Operators
    { text: 'div', displayText: 'div', type: 'operator' },
    { text: 'mod', displayText: 'mod', type: 'operator' },
    { text: 'et', displayText: 'et', type: 'operator' },
    { text: 'ou', displayText: 'ou', type: 'operator' },
    { text: 'non', displayText: 'non', type: 'operator' },
  ];

  // Provide autocomplete hints
  CodeMirror.registerHelper('hint', 'algorithm', function(cm) {
    const cursor = cm.getCursor();
    const token = cm.getTokenAt(cursor);

    // Get the word being typed
    const start = token.start;
    const end = cursor.ch;
    const word = token.string;

    // Don't autocomplete inside strings or comments
    if (token.type === 'string' || token.type === 'comment') return null;

    // If we're at a word boundary or have a partial word
    if (word.length === 0 || end <= start) return null;

    const wordLower = word.toLowerCase();
    const list = allCompletions
      .filter(item => item.text.toLowerCase().startsWith(wordLower))
      .slice(0, 20) // Limit to 20 results
      .map(item => ({
        text: item.text,
        displayText: item.displayText || item.text,
        className: 'cm-hint-' + (item.type || ''),
      }));

    if (list.length === 0) return null;

    return {
      list: list,
      from: { line: cursor.line, ch: start },
      to: { line: cursor.line, ch: end },
    };
  });

  // Set mode dependency for show-hint
  CodeMirror.defineExtension('algorithmHintOptions', {
    hint: CodeMirror.hint.algorithm,
    completeSingle: false,
  });
});