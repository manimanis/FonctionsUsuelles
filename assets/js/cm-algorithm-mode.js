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

      // "Jusqu'à" variants - must match before general keywords because the
      // apostrophe breaks \b word boundary in the standard keyword regex
      { regex: /jusqu['\u2019\u2018\u2019\u201a]?[àa]/i, token: 'keyword' },

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
    { text: 'var iden : type', displayText: 'var … : type', type: 'keyword' },
    { text: 'type tab = tableau de 20 entier', displayText: 'Tableau d\'entiers', type: 'keyword' },

    // Snippets
    { text: 'Algorithme PP\nDébut\n\t//traitement\nFin', displayText: 'Algorithme PP', type: 'snippet' },
    { text: 'Ecrire(var)', displayText: 'Ecrire(var)', type: 'snippet' },
    { text: 'Ecrire("texte")', displayText: 'Ecrire("texte")', type: 'snippet' },
    { text: 'Ecrire("var = ", var)', displayText: 'Ecrire("var = ", var)', type: 'snippet' },
    { text: 'Si condition Alors\n\t//traitement\nFinsi', displayText: 'si réduite', type: 'snippet' },
    { text: 'Si condition Alors\n\t//traitement\nSinon\n\t//traitement\nFinsi', displayText: 'si complète', type: 'snippet' },
    { text: 'Si condition1 Alors\n\t//traitement\nSinon Si condition2 Alors\n\t//traitement\nSinon\n\t//traitement\nFinsi', displayText: 'si généralisée', type: 'snippet' },
    { text: 'Pour i de deb à fin Faire\n\t//traitement\nFin Pour', displayText: 'pour', type: 'snippet' },
    { text: 'Pour i de deb à fin Faire Pas p\n\t//traitement\nFin Pour', displayText: 'pour avec pas', type: 'snippet' },
    { text: 'Tant Que condition Faire\n\t//traitement\nFin Tant Que', displayText: 'tant que', type: 'snippet' },
    { text: 'Répéter\n\t//traitement\nJusqu\'à condition', displayText: 'répéter jusqu\'à', type: 'snippet' },
    { text: 'Fonction nom(param: type):type\nDébut\n\t//traitement\n\tRetourner valeur\nFin', displayText: 'Fonction', type: 'snippet' },
    { text: 'Procédure nom(param: type)\nDébut\n\t//traitement\nFin', displayText: 'Procédure', type: 'snippet' },
    { text: 'Procédure Saisir(@n: entier)\nDébut\n\tRépéter\n\t\tEcrire("Entrez un entier: ")\n\t\tLire(n)\n\tJusqu\'à 2 ≤ n ≤ 10\nFin', displayText: 'Procédure Saisir', type: 'snippet' },
    { text: 'Procédure Remplir(@T: tab, n: entier)\nDébut\n\tPour i de 0 à n-1 Faire\n\t\tRépéter\n\t\t\tEcrire("Entrez T[", i, "] ? ")\n\t\t\tLire(T[i])\n\tJusqu\'à T[i] > 0\n\tFin Pour\nFin', displayText: 'Procédure Remplir', type: 'snippet' },
    { text: 'Procédure Afficher(T: tab, n: entier)\nDébut\n\tPour i de 0 à n-1 Faire\n\t\tEcrire("T[", i, "] = ", T[i])\n\tFin Pour\nFin', displayText: 'Procédure Afficher', type: 'snippet' },
    { text: `type Tab = tableau de 20 chaîne
Procédure Saisir(@ch: chaîne)
Début
  Répéter
    Ecrire("Entrez une chaîne: ")
    Lire(ch)
  Jusqu'à verif(ch)
Fin

Fonction verif(ch: chaîne): booléen
Début
  test ← Long(ch) ≥ 0 et ch[0] ≠ ' ' et ch[Long(ch)-1] ≠ ' ' et Pos("  ", ch) = -1
  i ← 0
  nm ← 0
  Tant que i < Long(ch) et test faire
    test ← "A" ≤ majus(ch[i]) ≤ "Z" ou ch[i] = ' '
    i ← i + 1
    Si ch[i] = ' ' alors
      nm ← nm + 1
    Fin Si
  Fin Tant que
  Retourner test et nm ≤ 20
Fin

Procédure Découper(@t: tab, @n:entier, ch: chaîne)
Début
  ch ← ch + " "
  n ← 0
  Tant que ch ≠ "" faire
    p ← Pos(" ", ch)
    mot ← sous_chaine(ch, 0, p)
    t[n] ← mot
    n ← n + 1
    ch ← effacer(ch, 0, p + 1)
  Fin Tant que
Fin

Procédure Crypter(@t: tab, n: entier)
Début
  Pour i de 0 à n-1 Faire
    Si (i+1) mod 2 = 0 Alors
      p ← i+1
    Sinon
      p ← -(i+1)
    Fin Si
    t[i] ← CrypterMot(t[i], p)
  Fin Pour
Fin

Fonction CrypterMot(mot: chaîne, p: entier): chaîne
Début
  res ← ""
  Pour i de 0 à Long(mot)-1 Faire
    c ← mot[i]
    Si "A" ≤ c ≤ "Z" Alors
      ref ← "A"
    Sinon
      ref ← "a"
    Fin Si
    c ← chr((ord(c) - ord(ref) + p) mod 26 + ord(ref))
    res ← res + c
  Fin Pour
  Retourner res
Fin

Procédure Trier(@t: tab, n: entier)
Début
  // Tri par sélection
  Pour i de 0 à n-2 Faire
    min ← i
    Pour j de i+1 à n-1 Faire
      Si Long(t[j]) < Long(t[min]) Alors
        min ← j
      Fin Si
    Fin Pour
    Si min ≠ i Alors
      tmp ← t[i]
      t[i] ← t[min]
      t[min] ← tmp
    Fin Si
  Fin Pour
Fin

Procédure Afficher(t: tab, n: entier)
Début
  Pour i de 0 à n-1 Faire
    Ecrire(t[i])
  Fin Pour
Fin

Algorithme Principal
// Déclaration des variables
var t: tab
var n: entier
var ch: chaîne
Début  
  Saisir(ch)
  Découper(t, n, ch)
  Crypter(t, n)
  Trier(t, n)
  Afficher(t, n)
Fin`, displayText: 'Programme de test 1', type: 'snippet' },
{ text: `type Tab = tableau de 1000 booléen

Procédure Saisir(@n: entier)
Début
  Répéter
    Ecrire("Entrez un entier: ")
    Lire(n)
  Jusqu'à 10 < n < 1000
Fin

Procédure CalcPremiers(@t: tab, n: entier)
Début
  Pour i de 0 à n Faire
    t[i] ← i > 1
  Fin Pour

  Pour i de 2 à Ent(Racine(n)) Faire
    Si t[i] Alors
      Pour j de i*2 à n Faire pas i
        t[j] ← faux
      Fin Pour
    Fin Si
  Fin Pour
Fin

Procédure AfficherPremiers(t: tab, n: entier)
Début
  Pour i de 0 à n Faire
    Si t[i] Alors
      Ecrire(i)
    Fin Si
  Fin Pour
Fin

Algorithme Principal
// Déclaration des variables
var t: tab
var n: entier
Début  
  Saisir(n)
  CalcPremiers(t, n)
  AfficherPremiers(t, n)
Fin`, displayText: 'Programme de test 2', type: 'snippet' },

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
    { text: 'chr(code)', displayText: 'chr(code)', type: 'function' },
    { text: 'ord(car)', displayText: 'ord(car)', type: 'function' },
    { text: 'Arrondi(x)', displayText: 'Arrondi(x)', type: 'function' },
    { text: 'Racine(x)', displayText: 'Racine(x)', type: 'function' },
    { text: 'Alea(vi, vf)', displayText: 'Alea(vi, vf)', type: 'function' },
    { text: 'Abs(x)', displayText: 'Abs(x)', type: 'function' },
    { text: 'Ent(x)', displayText: 'Ent(x)', type: 'function' },
    { text: 'Long(ch)', displayText: 'Long(ch)', type: 'function' },
    { text: 'Pos(ch1, ch2)', displayText: 'Pos(ch1, ch2)', type: 'function' },
    { text: 'ConvCh(x)', displayText: 'ConvCh(x)', type: 'function' },
    { text: 'EstNum(ch)', displayText: 'EstNum(ch)', type: 'function' },
    { text: 'Valeur(ch)', displayText: 'Valeur(ch)', type: 'function' },
    { text: 'Sous_chaine(ch, d, f)', displayText: 'Sous_chaine(ch, d, f)', type: 'function' },
    { text: 'Effacer(ch, d, f)', displayText: 'Effacer(ch, d, f)', type: 'function' },
    { text: 'Majus(ch)', displayText: 'Majus(ch)', type: 'function' },
    { text: 'Lire(var)', displayText: 'Lire(var)', type: 'function' },

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