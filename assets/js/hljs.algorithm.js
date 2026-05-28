/**
 * highlight.js language definition for Algorithmic pseudo-code
 * Used in algorithmic pedagogy (Bac Informatique Tunisie)
 */
hljs.registerLanguage('algorithm', (hljs) => {
  const KEYWORDS = {
    keyword: [
      // Structures conditionnelles
      'si', 'alors', 'sinon', 'fin',
      // Boucles
      'pour', 'de', 'à', 'faire', 'pas', 'tant', 'que',
      'répéter', 'repeter', 'jusqu\'à', 'jusqua',
      // Général
      'début', 'mod', 'div', 'et', 'ou', 'non',
      'fonction', 'procédure', 'retourner', 'var'
    ].join(' '),
    literal: [
      'vrai', 'faux', 'nul'
    ].join(' '),
    built_in: [
      // Fonctions de manipulation de caractères
      'chr', 'ord',
      // Fonctions mathématiques
      'arrondi', 'racine', 'alea', 'abs', 'ent',
      // Fonctions de chaînes
      'long', 'pos', 'convch', 'convch', 'estnum', 'estnum',
      'valeur', 'sous_chaine', 'effacer', 'majus',
      // Entrées/Sorties
      'ecrire', 'écrire', 'afficher', 'lire',
      // Aliases capitalisés
      'ConvCh', 'EstNum', 'Valeur', 'Ecrire', 'Lire'
    ].join(' ')
  };

  // Opérateur d'affectation
  const ASSIGNMENT = {
    className: 'operator',
    begin: /←|<--/,
    relevance: 10
  };

  // Opérateur d'appartenance
  const MEMBERSHIP = {
    className: 'operator',
    begin: /∈/,
    relevance: 10
  };

  // Comparateurs
  const COMPARISON = {
    className: 'operator',
    begin: /<>|!=|≠|<=|>=|:=|=|<|>/,
    relevance: 0
  };

  // Opérateurs arithmétiques et logiques
  const OPERATORS = {
    className: 'operator',
    begin: /[+\-*/×]/,
    relevance: 0
  };

  // Intervalle
  const RANGE = {
    className: 'symbol',
    begin: /\.\./,
    relevance: 10
  };

  // Nombres
  const NUMBER = {
    className: 'number',
    variants: [
      { begin: /\b\d+\.\d+/ },
      { begin: /\b\d+/ }
    ],
    relevance: 0
  };

  // Chaînes de caractères
  const STRING = {
    className: 'string',
    variants: [
      { begin: /"/, end: /"/, contains: [{ begin: /\\"/ }] }
    ],
    relevance: 0
  };

  // Commentaires
  const COMMENT = {
    className: 'comment',
    variants: [
      // Directive ///verbeux
      { begin: /\/\/\/.*/, relevance: 1 },
      // Commentaire //
      { begin: /\/\/.*/, relevance: 0 },
      // Commentaire #
      { begin: /#.*/, relevance: 0 }
    ]
  };

  return {
    name: 'algorithm',
    aliases: ['alg', 'algo'],
    case_insensitive: true,
    lexemes: /[a-zA-Z_àâäéèêëîïôöùûüÀÂÄÉÈÊËÎÏÔÖÙÛÜ][\wàâäéèêëîïôöùûüÀÂÄÉÈÊËÎÏÔÖÙÛÜ]*/,
    keywords: KEYWORDS,
    contains: [
      COMMENT,
      STRING,
      NUMBER,
      ASSIGNMENT,
      MEMBERSHIP,
      COMPARISON,
      OPERATORS,
      RANGE,
      hljs.HASH_COMMENT_MODE
    ]
  };
});