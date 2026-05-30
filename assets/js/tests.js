// ============================================================
// TEST FRAMEWORK
// ============================================================

const groups = [];
let currentGroup = null;

function describe(name, fn) {
  currentGroup = { name, tests: [], fn };
  groups.push(currentGroup);
  fn();
  currentGroup = null;
}

function it(description, fn) {
  if (!currentGroup) throw new Error('it() must be called inside describe()');
  currentGroup.tests.push({ description, fn });
}

function assertEqual(actual, expected, msg = '') {
  const normalize = (v) => {
    if (typeof v === 'boolean') return v ? 'vrai' : 'faux';
    return v;
  };
  const a = normalize(actual);
  const e = normalize(expected);
  const pass = a === e || JSON.stringify(a) === JSON.stringify(e);
  if (!pass) {
    throw new Error(msg || `Attendu: ${JSON.stringify(e)}, Obtenu: ${JSON.stringify(a)}`);
  }
}

function assertContains(str, substring, msg = '') {
  if (!str.includes(substring)) {
    throw new Error(msg || `Attendu: "${substring}" dans "${str}"`);
  }
}

function assertNotNull(value, msg = '') {
  if (value === null || value === undefined) {
    throw new Error(msg || 'La valeur ne doit pas être null ou undefined');
  }
}

function assertThrows(fn, expectedMsg = '') {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    if (expectedMsg && !e.message.includes(expectedMsg)) {
      throw new Error(`Erreur attendue contenant "${expectedMsg}", mais obtenu: "${e.message}"`);
    }
  }
  if (!threw) {
    throw new Error('Une erreur était attendue mais aucune n\'a été levée');
  }
}

// ============================================================
// HELPERS simplifiés
// ============================================================

/**
 * Évalue une expression seule et retourne sa valeur.
 */
async function evalExpr(expr) {
  const lexer = new Lexer(expr);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const evaluator = new Evaluator({});
  const parsed = parser.parseExpression();
  return evaluator.evaluate(parsed);
}

/**
 * Exécute un programme complet et retourne les variables et sorties.
 * Pratique pour les tests qui doivent inspecter l'état final.
 */
async function execProg(code, config = {}) {
  const evaluator = new Evaluator(config);
  const outputs = await evaluator.evaluateProgram(code);
  return { variables: evaluator.variables, outputs, evaluator };
}

// ============================================================
// TESTS
// ============================================================

// ─── 1. Fonctions prédéfinies ───
describe('Fonctions prédéfinies', () => {

  it('chr: convertit un code ASCII en caractère', async () => {
    const v = await execProg('a ← chr(65)');
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertEqual(v.variables.a, 'A');
  });

  it('ord: convertit un caractère en code ASCII', async () => {
    const v = await execProg('a ← ord("A")');
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertEqual(v.variables.a, 65);
  });

  it('arrondi: arrondit un nombre à l\'entier le plus proche (pair pour .5)', async () => {
    const v = await execProg(`a ← arrondi(3.2)
      b ← arrondi(3.5)
      c ← arrondi(3.7)
      d ← arrondi(2.2)
      e ← arrondi(2.5)
      f ← arrondi(2.7)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertNotNull(v.variables.d);
    assertNotNull(v.variables.e);
    assertNotNull(v.variables.f);
    assertEqual(v.variables.a, 3);
    assertEqual(v.variables.b, 4);
    assertEqual(v.variables.c, 4);
    assertEqual(v.variables.d, 2);
    assertEqual(v.variables.e, 2);
    assertEqual(v.variables.f, 3);
  });

  it('arrondi: .5 arrondit au pair', async () => {
    const v = await execProg(`a ← arrondi(2.5)
      b ← arrondi(3.5)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertEqual(v.variables.a, 2);
    assertEqual(v.variables.b, 4);
  });

  it('racine: calcule la racine carrée', async () => {
    const v = await execProg(`a ← racine(25)
      b ← racine(16)
      c ← racine(2)
      d ← racine(1)
      e ← racine(-50)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertNotNull(v.variables.d);
    assertNotNull(v.variables.e);
    assertEqual(v.variables.a, 5);
    assertEqual(v.variables.b, 4);
    assertEqual(v.variables.c, Math.sqrt(2));
    assertEqual(v.variables.d, 1);
    assertEqual(v.variables.e, NaN);
  });

  it('abs: valeur absolue', async () => {
    const v = await execProg(`a ← abs(-10)
      b ← abs(5)
      c ← abs(0)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertEqual(v.variables.a, 10);
    assertEqual(v.variables.b, 5);
    assertEqual(v.variables.c, 0);
  });

  it('ent: partie entière', async () => {
    const v = await execProg(`a ← ent(3.9)
      b ← ent(5.2)
      c ← ent(-2.7)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertEqual(v.variables.a, 3);
    assertEqual(v.variables.b, 5);
    assertEqual(v.variables.c, -2);
  });

  it('long: longueur d\'une chaîne', async () => {
    const v = await execProg(`a ← long("Bonjour")
      b ← long("")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertEqual(v.variables.a, 7);
    assertEqual(v.variables.b, 0);
  });

  it('pos: position d\'une sous-chaîne', async () => {
    const v = await execProg(`a ← pos("monde", "Bonjour monde")
      b ← pos("xyz", "Bonjour")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertEqual(v.variables.a, 8);
    assertEqual(v.variables.b, -1);
  });

  it('pos: retourne -1 si sous-chaîne absente', async () => {
    const v = await execProg(`a ← pos("xyz", "Bonjour")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertEqual(v.variables.a, -1);
  });

  it('convch: convertit un nombre en chaîne', async () => {
    const v = await execProg(`a ← convch(42)
      b ← convch(3.14)
      c ← convch(0)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertEqual(v.variables.a, '42');
    assertEqual(v.variables.b, '3.14');
    assertEqual(v.variables.c, '0');
  });

  it('valeur: convertit une chaîne en nombre', async () => {
    const v = await execProg(`a ← valeur("3.14")
      b ← valeur("42")
      c ← valeur("0")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertEqual(v.variables.a, 3.14);
    assertEqual(v.variables.b, 42);
    assertEqual(v.variables.c, 0);
  });

  it('sous_chaine: extrait une sous-chaîne', async () => {
    const v = await execProg(`a ← sous_chaine("Bonjour", 0, 4)
      b ← sous_chaine("Bonjour", 3, 5)
      c ← sous_chaine("Bonjour", 6, 10)
      d ← sous_chaine("Bonjour", 5, 2)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertNotNull(v.variables.d);
    assertEqual(v.variables.a, 'Bonj');
    assertEqual(v.variables.b, 'jo');
    assertEqual(v.variables.c, 'r');
    assertEqual(v.variables.d, '');
  });

  it('effacer: supprime une portion de chaîne', async () => {
    const v = await execProg(`a ← effacer("Bonjour", 3, 5)
      b ← effacer("Bonjour", 0, 3)
      c ← effacer("Bonjour", 5, 10)
      d ← effacer("Bonjour", 4, 1)`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertNotNull(v.variables.d);
    assertEqual(v.variables.a, 'Bonur');
    assertEqual(v.variables.b, 'jour');
    assertEqual(v.variables.c, 'Bonjo');
    assertEqual(v.variables.d, 'Bonjour');
  });

  it('majus: met une chaîne en majuscules', async () => {
    const v = await execProg(`a ← majus("Bonjour")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertEqual(v.variables.a, 'BONJOUR');
  });

  it('estnum: vérifie si une chaîne est numérique', async () => {
    const v = await execProg(`a ← estnum("12345")
      b ← estnum("abc")
      c ← estnum("")
      d ← estnum("12.34")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertNotNull(v.variables.b);
    assertNotNull(v.variables.c);
    assertNotNull(v.variables.d);
    assertEqual(v.variables.a, true);
    assertEqual(v.variables.b, false);
    assertEqual(v.variables.c, false);
    assertEqual(v.variables.d, false);
  });

  it('estnum: retourne faux pour chaîne non numérique', async () => {
    const v = await execProg(`a ← estnum("12a45")`);
    assertNotNull(v.variables);
    assertNotNull(v.variables.a);
    assertEqual(v.variables.a, false);
  });

});

// ─── 2. Déclaration de nouveaux types ───
describe('Déclaration de nouveaux types (type … = tableau de …)', () => {

  it('type: déclaration simple type tab = tableau de 10 entier', () => {
    const code = `type tab = tableau de 10 entier\nvar t: tab`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const stmt = parser.statements[0];
    assertEqual(stmt.type, 'typeDeclaration');
    assertEqual(stmt.typeName, 'tab');
    assertEqual(stmt.arraySize, 10);
    assertEqual(stmt.elementType, 'entier');
  });

  it('type: avec ← au lieu de =', () => {
    const code = `type vec ← tableau de 5 réel\nvar v: vec`;
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const stmt = parser.statements[0];
    assertEqual(stmt.typeName, 'vec');
    assertEqual(stmt.arraySize, 5);
    assertEqual(stmt.elementType, 'réel');
  });

  it('type: erreur si taille non entière', () => {
    assertThrows(() => {
      const lexer = new Lexer('type t = tableau de 3.5 chaine');
      const tokens = lexer.tokenize();
      new Parser(tokens);
    }, 'constante entière');
  });

  it('type: evaluation crée bien le type utilisateur', async () => {
    const code = `type tab = tableau de 3 entier\nvar t: tab`;
    const { evaluator } = await execProg(code);
    assertEqual(evaluator.userTypes['tab'].type, 'array');
    assertEqual(evaluator.userTypes['tab'].elementType, 'entier');
    assertEqual(evaluator.userTypes['tab'].size, 3);
    assertEqual(Array.isArray(evaluator.variables['t']), true);
    assertEqual(evaluator.variables['t'].length, 3);
  });

});

// ─── 3. Déclaration de variables ───
describe('Déclaration de variables (var … : type)', () => {

  it('var: déclaration simple avec type entier', () => {
    const lexer = new Lexer('var n: entier');
    const parser = new Parser(lexer.tokenize());
    const stmt = parser.statements[0];
    assertEqual(stmt.type, 'varDeclaration');
    assertEqual(stmt.varNames[0], 'n');
    assertEqual(stmt.varType, 'entier');
  });

  it('var: variables multiples séparées par des virgules', () => {
    const lexer = new Lexer('var a, b, c: réel');
    const parser = new Parser(lexer.tokenize());
    const stmt = parser.statements[0];
    assertEqual(stmt.varNames.length, 3);
    assertEqual(stmt.varNames[0], 'a');
    assertEqual(stmt.varNames[1], 'b');
    assertEqual(stmt.varNames[2], 'c');
    assertEqual(stmt.varType, 'réel');
  });

  it('var: déclaration booléenne', () => {
    const parser = new Parser(new Lexer('var flag: booléen').tokenize());
    assertEqual(parser.statements[0].varType, 'booléen');
  });

  it('var: déclaration chaîne', () => {
    const parser = new Parser(new Lexer('var msg: chaîne').tokenize());
    assertEqual(parser.statements[0].varType, 'chaîne');
  });

  it('var: déclaration caractère', () => {
    const parser = new Parser(new Lexer('var c: caractère').tokenize());
    assertEqual(parser.statements[0].varType, 'caractère');
  });

  it('var: évaluation initialise les variables avec valeur par défaut', async () => {
    const { variables } = await execProg('var n: entier\nvar x: réel\nvar flag: booléen\nvar msg: chaîne');
    assertEqual(variables['n'], 0);
    assertEqual(variables['x'], 0.0);
    assertEqual(variables['flag'], false);
    assertEqual(variables['msg'], '');
  });

  it('var: avec type utilisateur (tableau)', async () => {
    const { variables } = await execProg('type tab = tableau de 4 entier\nvar t: tab');
    assertEqual(Array.isArray(variables['t']), true);
    assertEqual(variables['t'].length, 4);
    assertEqual(variables['t'][0], 0);
    assertEqual(variables['t'][1], 0);
    assertEqual(variables['t'][2], 0);
    assertEqual(variables['t'][3], 0);
  });

});

// ─── 4. Structures conditionnelles ───
describe('Structures conditionnelles (si … alors … sinon)', () => {

  it('si simple: condition vraie exécute le bloc then', async () => {
    const { variables } = await execProg('var x: entier\nx ← 10\nsi x > 5 alors\nx ← 42\nfinsi');
    assertEqual(variables['x'], 42);
  });

  it('si simple: condition fausse n\'exécute pas le bloc then', async () => {
    const { variables } = await execProg('var x: entier\nx ← 10\nsi x > 20 alors\nx ← 42\nfinsi');
    assertEqual(variables['x'], 10);
  });

  it('si … sinon: branche else s\'exécute quand condition fausse', async () => {
    const { variables } = await execProg('var x: entier\nx ← 10\nsi x > 20 alors\nx ← 1\nsinon\nx ← 99\nfinsi');
    assertEqual(variables['x'], 99);
  });

  it('si … sinonsi: condition elseif s\'évalue correctement', async () => {
    const { variables } = await execProg('var x: entier\nx ← 15\nsi x > 20 alors\nx ← 1\nsinon si x > 10 alors\nx ← 2\nsinon\nx ← 3\nfinsi');
    assertEqual(variables['x'], 2);
  });

  it('conditions composées: et, ou', async () => {
    const { variables } = await execProg('var x: entier\nx ← 10\nsi x > 5 et x < 20 alors\nx ← 100\nfinsi');
    assertEqual(variables['x'], 100);
  });

  it('conditions avec non (négation)', async () => {
    const { variables } = await execProg('var flag: booléen\nflag ← faux\nsi non flag alors\nflag ← vrai\nfinsi');
    assertEqual(variables['flag'], true);
  });

  it('conditions chaînées: 3 <= n <= 20', async () => {
    const { variables } = await execProg('var n: entier\nn ← 10\nsi 3 <= n <= 20 alors\nn ← 1\nsinon\nn ← 0\nfinsi');
    assertEqual(variables['n'], 1);
  });

  it('conditions chaînées: fausse', async () => {
    const { variables } = await execProg('var n: entier\nn ← 25\nsi 3 <= n <= 20 alors\nn ← 1\nsinon\nn ← 0\nfinsi');
    assertEqual(variables['n'], 0);
  });

  it('si imbriqué', async () => {
    const { variables } = await execProg('var a, b: entier\na ← 5\nb ← 10\nsi a > 0 alors\nsi b > 0 alors\na ← a + b\nfinsi\nfinsi');
    assertEqual(variables['a'], 15);
  });

});

// ─── 5. Structures itératives ───
describe('Structures itératives (boucles)', () => {

  it('pour: de 1 à 10 avec pas=1', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      pour i de 1 à 10 faire
        s ← s + i
      fin pour`);
    assertEqual(variables['s'], 55);
  });

  it('pour: de 10 à 1 sans pas=-1', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      pour i de 10 à 1 faire
        s ← s + i
      fin pour`);
    assertEqual(variables['s'], 0);
  });

  it('pour: avec pas explicite (pas 2)', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      pour i de 0 à 10 faire pas 2
        s ← s + i
      fin pour`);
    assertEqual(variables['s'], 30);
  });

  it('pour: pas négatif (décroissant)', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      pour i de 10 à 0 faire pas -2
        s ← s + i
      fin pour`);
    assertEqual(variables['s'], 30);
  });

  it('pour: corps vide ne cause pas d\'erreur', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 5
      pour i de 1 à 3 faire
      fin pour
      x ← x + 1`);
    assertEqual(variables['x'], 6);
  });

  it('tant que: exécution conditionnelle', async () => {
    const { variables } = await execProg(`var n: entier
      n ← 5
      var s: entier
      s ← 0
      tant que n > 0 faire
        s ← s + n
        n ← n - 1
      fintantque`);
    assertEqual(variables['s'], 15);
    assertEqual(variables['n'], 0);
  });

  it('tant que: condition fausse dès le départ', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 0
      tant que x > 0 faire
        x ← 42
      fintantque`);
    assertEqual(variables['x'], 0);
  });

  it('répéter: exécute au moins une fois', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 0
      répéter
        x ← x + 1
      jusqu'à x > 5`);
    assertEqual(variables['x'], 6);
  });

  it('répéter: s\'arrête quand condition devient vraie', async () => {
    const { variables } = await execProg(`var n: entier
      n ← 0
      var s: entier
      s ← 0
      répéter
        n ← n + 1
        s ← s + n
      jusqu'à n >= 4`);
    assertEqual(variables['s'], 10);
  });

  it('répéter: avec condition fausse au départ, exécute le corps', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 10
      répéter
        x ← x + 1
      jusqu'à x > 10`);
    assertEqual(variables['x'], 11);
  });

  it('pour imbriqué dans tant que', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      var i: entier
      i ← 1
      tant que i <= 3 faire
        var j: entier
        pour j de 1 à 2 faire
          s ← s + i * j
        finpour
        i ← i + 1
      fintantque`);
    assertEqual(variables['s'], 18);
  });

  it('répéter dans pour', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      pour i de 1 à 3 faire
        var j: entier
        j ← 1
        répéter
          s ← s + j
          j ← j + 1
        jusqu'à j > i
      finpour`);
    assertEqual(variables['s'], 10);
  });

});

// ─── 6. Affectation de variables ───
describe('Affectation de variables', () => {

  it('affectation simple: variable ← expression', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 42`);
    assertEqual(variables['x'], 42);
  });

  it('affectation avec expression arithmétique', async () => {
    const { variables } = await execProg(`var x: entier
      x ← (2 + 3) * 4`);
    assertEqual(variables['x'], 20);
  });

  it('affectation avec div et mod', async () => {
    const { variables } = await execProg(`var q, r: entier
      q ← 17 div 5
      r ← 17 mod 5`);
    assertEqual(variables['q'], 3);
    assertEqual(variables['r'], 2);
  });

  it('affectation de chaîne', async () => {
    const { variables } = await execProg(`var msg: chaîne
      msg ← "Hello, World!"`);
    assertEqual(variables['msg'], 'Hello, World!');
  });

  it('affectation booléenne', async () => {
    const { variables } = await execProg(`var flag: booléen
      flag ← vrai`);
    assertEqual(variables['flag'], true);
  });

  it('affectation avec opérateur de comparaison', async () => {
    const { variables } = await execProg(`var a, b: booléen
      a ← 10 > 5
      b ← 3 = 7`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
  });

  it('affectation à un tableau (index)', async () => {
    const { variables } = await execProg(`type tab = tableau de 3 entier
      type tab1 = tableau de 26 caractère
      var t: tab
      var t1: tab1
      t[0] ← 10
      t[1] ← 20
      t[2] ← 30
      Pour i de 0 à 25 faire
        t1[i] ← chr(65 + i)
      finpour`);
    assertEqual(variables['t'][0], 10);
    assertEqual(variables['t'][1], 20);
    assertEqual(variables['t'][2], 30);
    assertEqual(variables['t1'][0], 'A');
    assertEqual(variables['t1'][1], 'B');
    assertEqual(variables['t1'][2], 'C');
    assertEqual(variables['t1'][25], 'Z');
  });

});

// ─── 7. Fonction Ecrire ───
describe('Fonction Ecrire', () => {

  it('ecrire: affiche une chaîne', async () => {
    const { outputs } = await execProg('Ecrire("Bonjour")');
    assertEqual(outputs.length >= 1, true);
    assertEqual(outputs[0].includes('Bonjour'), true);
  });

  it('ecrire: affiche une variable', async () => {
    const { outputs } = await execProg(`var x: entier
      x ← 42
      Ecrire(x)`);
    const found = outputs.some(o => o.includes('42'));
    assertEqual(found, true);
  });

  it('ecrire: affiche plusieurs expressions séparées', async () => {
    const { outputs } = await execProg(`Ecrire("a = ", 10, " et b = ", 20)`);
    const combined = outputs.join(' ');
    assertEqual(combined.includes('a ='), true);
    assertEqual(combined.includes('10'), true);
    assertEqual(combined.includes('et b ='), true);
    assertEqual(combined.includes('20'), true);
  });

});

// ─── 8. Opérateurs arithmétiques et logiques ───
describe('Opérateurs arithmétiques et logiques', () => {

  it('addition', async () => {
    const {variables} = await execProg(`a ← 5 + 3
      b ← 10 + -20`);
    assertEqual(variables['a'], 8)
    assertEqual(variables['b'], -10)
  });
  it('soustraction', async () => {
    const {variables} = await execProg(`a ← 10 - 4
      b ← 10 - -4
      c ← -10 - 4
      d ← 4 - 6`);
    assertEqual(variables['a'], 6)
    assertEqual(variables['b'], 14)
    assertEqual(variables['c'], -14)
    assertEqual(variables['d'], -2)
  });
  it('multiplication', async () => {
    const {variables} = await execProg(`a ← 6 * 7
      b ← -3 * 4
      c ← -2 * -5
      d ← 4 * -3`);
    assertEqual(variables['a'], 42)
    assertEqual(variables['b'], -12)
    assertEqual(variables['c'], 10)
    assertEqual(variables['d'], -12)
  });
  it('division', async () => {
    const {variables} = await execProg(`a ← 15 / 4
      b ← -15 / 4
      c ← 15 / -4
      d ← -15 / -4`);
    assertEqual(variables['a'], 3.75)
    assertEqual(variables['b'], -3.75)
    assertEqual(variables['c'], -3.75)
    assertEqual(variables['d'], 3.75)
  });
  it('div (division entière)', async () => {
    const {variables} = await execProg(`a ← 15 div 4
      b ← -15 div 4
      c ← 15 div -4
      d ← -15 div -4`);
    assertEqual(variables['a'], 3);
    assertEqual(variables['b'], -3);
    assertEqual(variables['c'], -3);
    assertEqual(variables['d'], 3);
  });
  it('mod (modulo)', async () => {
    const {variables} = await execProg(`a ← 17 mod 5
      b ← -17 mod 5`);
    assertEqual(variables['a'], 2);
    assertEqual(variables['b'], 3);
  });
  it('concaténation: chaîne + nombre', async () => {
    const {variables} = await execProg(`a ← "Résultat: " + 42`);
    assertEqual(variables['a'], 'Résultat: 42');
  });
  it('non (négation logique)', async () => {
    const {variables} = await execProg(`a ← non vrai
      b ← non faux`);
    assertEqual(variables['a'], false);
    assertEqual(variables['b'], true);
  });
  it('et (ET logique)', async () => {
    const {variables} = await execProg(`a ← vrai et faux
      b ← vrai et vrai
      c ← faux et faux
      d ← faux et vrai`);
    assertEqual(variables['a'], false);
    assertEqual(variables['b'], true);
    assertEqual(variables['c'], false);
    assertEqual(variables['d'], false);
  });
  it('ou (OU logique)', async () => {
    const {variables} = await execProg(`a ← vrai ou faux
      b ← faux ou faux
      c ← vrai ou vrai
      d ← faux ou vrai`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
    assertEqual(variables['c'], true);
    assertEqual(variables['d'], true);
  });
  it('précédence: non > et > ou', async () => {
    const {variables} = await execProg(`a ← vrai ou faux et non faux
      b ← non vrai ou faux et vrai`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
  });
  it('comparaison supérieur', async () => {
    const {variables} = await execProg(`a ← 10 > 5
      b ← 5 > 10`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
  });
  it('comparaison inférieur ou égal', async () => {
    const {variables} = await execProg(`a ← 5 <= 5
      b ← 10 <= 5
      c ← 3 <= 7
      d ← 7 ≤ 3`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
    assertEqual(variables['c'], true);
    assertEqual(variables['d'], false);
  });
  it('comparaison supérieur ou égal', async () => {
    const {variables} = await execProg(`a ← 5 >= 5
      b ← 3 >= 7
      c ← 10 >= 5
      d ← 7 ≥ 3`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
    assertEqual(variables['c'], true);
    assertEqual(variables['d'], true);
  });
  it('comparaison différent de', async () => {
    const {variables} = await execProg(`a ← 3 <> 4
      b ← 3 <> 3
      c ← "hello" <> "world"
      d ← 8 != 8
      e ← 5 != 6
      f ← "test" ≠ "test"
      g ← 3 ≠ 5`);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
    assertEqual(variables['c'], true);
    assertEqual(variables['d'], false);
    assertEqual(variables['e'], true);
    assertEqual(variables['f'], false);
    assertEqual(variables['g'], true);
  });
  it('parenthèses: priorité modifiée', async () => {
    const {variables} = await execProg(`a ← (2 + 3) * 4`);
    assertEqual(variables['a'], 20);
  });
  it('priorité des opérateurs', async () => {
    const {variables} = await execProg(`a ← 2 + 3 * 4
      b ←  2 * 3 + 4
      c ← 2 * 3 + 4 * 5 / 6
      d ← 256 mod 10 * 256 div 10`);
    assertEqual(variables['a'], 14);
    assertEqual(variables['b'], 10);
    assertEqual(variables['c'], 9.3333333333333333);
    assertEqual(variables['d'], 153);
  });
});

// ─── 9. Lexer ───
describe('Lexer (analyse lexicale)', () => {

  it('tokenize: identifiants simples', () => {
    const tokens = new Lexer('abc def_123').tokenize();
    const ids = tokens.filter(t => t.type === 'IDENTIFIER');
    assertEqual(ids.length, 2);
    assertEqual(ids[0].value, 'abc');
    assertEqual(ids[1].value, 'def_123');
  });

  it('tokenize: nombres entiers et réels', () => {
    const tokens = new Lexer('42 3.14').tokenize();
    const nums = tokens.filter(t => t.type === 'NUMBER');
    assertEqual(nums.length, 2);
    assertEqual(nums[0].value, '42');
    assertEqual(nums[1].value, '3.14');
  });

  it('tokenize: chaînes de caractères', () => {
    const tokens = new Lexer('"Hello" \'World\'').tokenize();
    assertEqual(tokens.filter(t => t.type === 'STRING').length, 2);
  });

  it('tokenize: mots-clés', () => {
    const types = new Lexer('si alors sinon fin').tokenize().map(t => t.type);
    assertEqual(types[0], 'CONDITIONAL');
    assertEqual(types[1], 'CONDITIONAL');
    assertEqual(types[2], 'CONDITIONAL');
    assertEqual(types[3], 'LOOP');
  });

  it('tokenize: commentaires ignorés', () => {
    const tokens = new Lexer('// ceci est un commentaire\nvar x: entier').tokenize();
    assertEqual(tokens.length, 5);
    assertEqual(tokens.filter(t => t.type === 'COMMENT').length, 0);
  });

  it('tokenize: opérateur ← (affectation)', () => {
    const tokens = new Lexer('x ← 5').tokenize();
    assertEqual(tokens.filter(t => t.type === 'ASSIGNMENT').length, 1);
  });

  it('tokenize: finsi normalisé', () => {
    const parser = new Parser(new Lexer(`si vrai alors
      x ← 1
    finsi`).tokenize());
    assertEqual(parser.statements.length, 1);
    assertEqual(parser.statements[0].type, 'conditional');
    assertEqual(parser.statements[0].thenBody.length, 1);
    assertEqual(parser.statements[0].thenBody[0].type, 'assignment');
  });

  it('tokenize: finpour normalisé', () => {
    const parser = new Parser(new Lexer('pour i de 1 à 3 faire\nx ← x + 1\nfinpour').tokenize());
    assertEqual(parser.statements.length, 1);
    assertEqual(parser.statements[0].type, 'forLoop');
  });

});

// ─── 10. Parser ───
describe('Parser (analyse syntaxique)', () => {

  it('parse: algorithme complet sain', () => {
    const parser = new Parser(new Lexer('var n: entier\nn ← 10\nsi n > 5 alors\nEcrire("OK")\nfinsi').tokenize());
    assertEqual(parser.hasError, false);
    assertEqual(parser.statements.length, 3);
    assertEqual(parser.statements[0].type, 'varDeclaration');
    assertEqual(parser.statements[1].type, 'assignment');
    assertEqual(parser.statements[2].type, 'conditional');
  });

  it('parse: expression avec opérateur ∈ (appartenance)', async () => {
    const {variables} = await execProg(`
      x ← 5
      y ← x ∈ [1..10]
      z ← x ∈ [10..20]
    `);
    assertEqual(variables.y, true);
    assertEqual(variables.z, false);
  });

  it('parse: détection d\'erreur syntaxique', () => {
    assertThrows(() => new Parser(new Lexer('var x: entier\nx ← ').tokenize()), 'incomplète');
  });

  it('parse: finsi reconnu correctement (mot composé)', () => {
    const parser = new Parser(new Lexer('si vrai alors\nx ← 1\nfinsi').tokenize());
    assertEqual(parser.statements.length, 1);
    assertEqual(parser.statements[0].type, 'conditional');
  });

  it('parse: fintantque reconnu correctement', () => {
    const parser = new Parser(new Lexer('tant que vrai faire\nx ← x + 1\nfintantque').tokenize());
    assertEqual(parser.statements.length, 1);
    assertEqual(parser.statements[0].type, 'whileLoop');
  });

});

// ─── 11. Modules : Procédure, Fonction, Algorithme ───
describe('Modules (Procédure, Fonction, Algorithme)', () => {

  it('procedure: définir et appeler une procédure simple', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 0
      Procédure Incremente(@x: entier)
      Début
        x ← x + 1
      Fin
      Début
        Incremente(x)
      Fin`);
    assertEqual(variables['x'], 1);
  });

  it('procedure: passage par valeur ne modifie pas l original', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 5
      Procédure Test(a: entier)
      Début
        a ← 99
      Fin
      Début
        Test(x)
      Fin`);
    assertEqual(variables['x'], 5);
  });

  it('procedure: passage par adresse modifie l original (@)', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 5
      Procédure Test(@a: entier)
      Début
        a ← 99
      Fin
      Début
        Test(x)
      Fin`);
    assertEqual(variables['x'], 99);
  });

  it('procedure: variables locales isolées', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 1
      Procédure Test()
      var i: entier
      Début
        i ← 42
      Fin
      Début
        i ← 10
        Test()
      Fin`);
    // i doit rester 10 après l'appel (i local de Test ≠ i global)
    assertEqual(variables['x'], 1);
    assertEqual(variables['i'], 10);
  });

  it('procedure: plusieurs paramètres', async () => {
    const { variables } = await execProg(`var x, y: entier
      x ← 10
      y ← 20
      Procédure Echange(@a: entier, @b: entier)
      var tmp: entier
      Début
        tmp ← a
        a ← b
        b ← tmp
      Fin
      Début
        Echange(x, y)
      Fin`);
    assertEqual(variables['x'], 20);
    assertEqual(variables['y'], 10);
  });

  it('fonction: définir et appeler une fonction simple', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction Double(n: entier): entier
      Début
        Retourner n * 2
      Fin
      Début
        r ← Double(5)
      Fin`);
    assertEqual(variables['r'], 10);
  });

  it('fonction: appel dans une expression', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction Carre(n: entier): entier
      Début
        Retourner n * n
      Fin
      Début
        r ← Carre(3) + Carre(4)
      Fin`);
    assertEqual(variables['r'], 25);
  });

  it('fonction: retourner dans une condition', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction Max(a: entier, b: entier): entier
      Début
        Si a > b Alors
          Retourner a
        Sinon
          Retourner b
        Fin Si
      Fin
      Début
        r ← Max(7, 12)
      Fin`);
    assertEqual(variables['r'], 12);
  });

  it('fonction: variables locales isolées', async () => {
    const { variables } = await execProg(`var i: entier
      i ← 5
      Fonction F(n: entier): entier
      var i: entier
      Début
        i ← 99
        Retourner n + i
      Fin
      Début
        i ← F(1)
      Fin`);
    // i global = F(1) = 1 + 99 = 100, pas écrasé par le i local
    assertEqual(variables['i'], 100);
  });

  it('fonction: appel dans une expression complexe', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction Factorielle(n: entier): entier
      var i, f: entier
      Début
        f ← 1
        Pour i de 1 à n Faire
          f ← f * i
        Fin Pour
        Retourner f
      Fin
      Début
        r ← Factorielle(5)
      Fin`);
    assertEqual(variables['r'], 120);
  });

  it('algorithme: bloc avec nom et corps', async () => {
    const { outputs } = await execProg(`Algorithme Test
      Début
        Ecrire("Hello")
      Fin`);
    const found = outputs.some(o => o.includes('Hello'));
    assertEqual(found, true);
  });

  it('algorithme: les instructions hors modules avant algorithme sont ignorées', async () => {
    const { variables } = await execProg(`x ← 42
      Algorithme PP
      var x: entier
      Début
        x ← 10
      Fin`);
    // x initialisé à 0 (déclaration dans le corps), puis 10
    assertEqual(variables['x'], 10);
  });

  it('algorithme: sans nom', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      Début
        s ← 42
      Fin`);
    assertEqual(variables['s'], 42);
  });

  it('module: sections TDNT/TDOG/TDOL/TDO ignorées', async () => {
    const prog = await execProg(`var x: entier
      TDNT
      Tab1 = Tableau de 50 entier
      TDOG
      Objet : Type/Nature
      x : entier
      Fonction Calc(n: entier): entier
      TDO
      Objet : Type/Nature
      var s : entier
      Début
        s ← 0
        Pour i de 1 à n Faire
          s ← s + i
        Fin Pour
        Retourner s
      Fin
      
      Début
        x ← Calc(5)
      Fin`);
    console.log(prog);
  });

  it('procedure: appel d une fonction depuis une procedure', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction Carre(n: entier): entier
      Début
        Retourner n * n
      Fin
      Procédure Test(@r: entier)
      Début
        r ← Carre(6)
      Fin
      Début
        Test(r)
      Fin`);
    assertEqual(variables['r'], 36);
  });

  it('fonction: deux modules utilisent le même nom de variable i sans interference', async () => {
    const { variables } = await execProg(`var x, y: entier
      Fonction F1(n: entier): entier
      var i, s: entier
      Début
        s ← 0
        Pour i de 1 à n Faire
          s ← s + i
        Fin Pour
        Retourner s
      Fin
      Fonction F2(n: entier): entier
      var i, p: entier
      Début
        p ← 1
        Pour i de 1 à n Faire
          p ← p * 2
        Fin Pour
        Retourner p
      Fin
      Début
        x ← F1(3)
        y ← F2(3)
      Fin`);
    assertEqual(variables['x'], 6);  // 1+2+3
    assertEqual(variables['y'], 8);  // 2*2*2
  });

  it('Passage par adresse (@)', async () => {
    const { variables } = await execProg(`var x, y: entier
      Procédure Permuter(@a: entier, @b: entier)
      var temp: entier
      Début
        temp ← a
        a ← b
        b ← temp
      Fin

      Début
        x ← 5
        y ← 6
        Permuter(x, y)
      Fin`);
    assertEqual(variables['x'], 6);
    assertEqual(variables['y'], 5);
  });

});

// ─── 12. Mots-clés sans accents ───
describe('Mots-clés sans accents', () => {

  it('debut sans accent', async () => {
    const { variables } = await execProg(`var x: entier
      Debut
        x ← 5
      Fin`);
    assertEqual(variables['x'], 5);
  });

  it('procedure sans accent', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 0
      Procedure Test(@x: entier)
      Debut
        x ← 7
      Fin
      Debut
        Test(x)
      Fin`);
    assertEqual(variables['x'], 7);
  });

  it('fonction sans accent sur le mot-clé', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction F(n: entier): entier
      Debut
        Retourner n + 1
      Fin
      Debut
        r ← F(9)
      Fin`);
    assertEqual(variables['r'], 10);
  });

  it('retourner peut s écrire retourne', async () => {
    const { variables } = await execProg(`var r: entier
      Fonction F(n: entier): entier
      Debut
        Retourne n * 3
      Fin
      Debut
        r ← F(7)
      Fin`);
    assertEqual(variables['r'], 21);
  });

  it('a dans boucle pour (sans accent)', async () => {
    const { variables } = await execProg(`var s: entier
      s ← 0
      Debut
        Pour i de 0 a 4 Faire
          s ← s + i
        Fin Pour
      Fin`);
    assertEqual(variables['s'], 10);
  });

  it('jusqua sans accent (depuis le lexer)', async () => {
    const { variables } = await execProg(`var x: entier
      x ← 0
      Debut
        Repeter
          x ← x + 1
        Jusqua x > 3
      Fin`);
    assertEqual(variables['x'], 4);
  });

});

// ─── 13. Tests de bout en bout ───
describe('Tests de bout en bout (programme complet)', () => {

  it('programme complet: PP avec Saisir, Remplir, Verif, Calc', async () => {
    const code = `type Tab1 = Tableau de 50 chaine
      var n : entier
      var t : Tab1
      
      Procedure Saisir(@n: entier)
      Debut
        Repeter
          Ecrire("Entrez n ? ")
          Lire(n)
        Jusqua 5 <= n <= 10
      Fin
      
      Procedure Remplir(@t: Tab, n: entier)
      Debut
        Pour i de 0 a n-1 Faire
          Repeter
            Ecrire("Entrez t[", i, "] ? ")
            Lire(t[i])
          Jusqua Verif(t[i])
        Fin Pour
      Fin
      
      Fonction Verif(ch: chaine): booleen
      var i : entier
      Debut
        test ← Long(ch) > 0
        i ← 0
        Tant Que test ET i < Long(ch) Faire
          Si "A" <= Majus(ch[i]) ET Majus(ch[i]) <= "Z" Alors
            test ← vrai
          Sinon
            test ← faux
          Fin Si
          i ← i + 1
        Fin Tant Que
        Retourner test
      Fin
      
      Fonction Calc(n: entier): entier
      var s, i : entier
      Debut
        s ← 0
        Pour i de 0 a n-1 Faire
          s ← s + i
        Fin Pour
        Retourner s
      Fin
      
      Algorithme PP
      Debut
        Saisir(n)
        Remplir(t, n)
        x ← Calc(n)
        Ecrire("x = ", x)
      Fin`;
    
    // On ne peut pas vraiment tester interactif, mais on vérifie que le parse ne plante pas
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    assertEqual(parser.hasError, false);
    assertEqual(parser.statements.length > 0, true);
    
    // Vérifier les types de statements
    const types = parser.statements.map(s => s.type);
    assertEqual(types.includes('typeDeclaration'), true);
    assertEqual(types.includes('varDeclaration'), true);
    assertEqual(types.includes('procedureDef'), true);
    assertEqual(types.includes('functionDef'), true);
    assertEqual(types.includes('algorithm'), true);
  });

  it('fonction verification de chaine: Verif', async () => {
    const code = `
      Fonction Verif(ch: chaine): booleen
      var i : entier
      Debut
        test ← Long(ch) > 0
        i ← 0
        Tant Que test ET i < Long(ch) Faire
          Si "A" <= Majus(ch[i]) ET Majus(ch[i]) <= "Z" Alors
            test ← vrai
          Sinon
            test ← faux
          Fin Si
          i ← i + 1
        Fin Tant Que
        Retourner test
      Fin
      Debut
        a ← Verif("ABC")
        b ← Verif("")
        c ← Verif("123")
      Fin`;
    const { variables } = await execProg(code);
    assertEqual(variables['a'], true);
    assertEqual(variables['b'], false);
    assertEqual(variables['c'], false);
  });

  it('fonction Calc: somme des i de 0 a n-1', async () => {
    const code = `
      Fonction Calc(n: entier): entier
      var s, i : entier
      Debut
        s ← 0
        Pour i de 0 a n-1 Faire
          s ← s + i
        Fin Pour
        Retourner s
      Fin
      Debut
        r5 ← Calc(5)
        r10 ← Calc(10)
      Fin`;
    const { variables } = await execProg(code);
    assertEqual(variables['r5'], 10);  // 0+1+2+3+4
    assertEqual(variables['r10'], 45); // 0+1+...+9
  });

  it('passage par adresse avec tableau (@t)', async () => {
    const { variables } = await execProg(`type Tab = Tableau de 3 entier
      var t: Tab
      t[0] ← 1
      t[1] ← 2
      t[2] ← 3
      
      Procedure Modifie(@t: Tab)
      Debut
        t[0] ← 99
      Fin
      
      Debut
        Modifie(t)
      Fin`);
    assertEqual(variables['t'][0], 99);
    assertEqual(variables['t'][1], 2);
    assertEqual(variables['t'][2], 3);
  });

});
// terminer */


// ============================================================
// TEST RUNNER
// ============================================================

function render() {
  const container = document.getElementById('test-container');
  container.innerHTML = '';

  groups.forEach((group, gi) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'test-group';
    groupDiv.dataset.groupIndex = gi;

    const header = document.createElement('h2');
    header.innerHTML = `<span>${group.name}</span><span class="badge" id="badge-${gi}">—</span>`;
    header.onclick = () => {
      const body = groupDiv.querySelector('.test-group-body');
      body.classList.toggle('collapsed');
    };
    groupDiv.appendChild(header);

    const body = document.createElement('div');
    body.className = 'test-group-body';
    body.id = `group-body-${gi}`;

    group.tests.forEach((test, ti) => {
      const tc = document.createElement('div');
      tc.className = 'test-case';
      tc.dataset.testId = `${gi}-${ti}`;
      tc.dataset.status = 'pending';
      tc.innerHTML = `
        <span class="status pending">⏳</span>
        <div>
          <div class="desc">${test.description}</div>
          <div class="expected" id="detail-${gi}-${ti}"></div>
        </div>
      `;
      body.appendChild(tc);
    });

    groupDiv.appendChild(body);
    container.appendChild(groupDiv);
  });

  updateStats(0, 0, 0);
  document.getElementById('progress-fill').style.width = '0%';
}

function updateStats(total, passed, failed) {
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pass').textContent = passed;
  document.getElementById('stat-fail').textContent = failed;
}

async function runAllTests() {
  const runBtn = document.getElementById('run-all');
  runBtn.disabled = true;
  runBtn.textContent = '⏳ Exécution en cours…';

  let total = 0, passed = 0, failed = 0;

  document.querySelectorAll('.test-case').forEach(tc => {
    tc.dataset.status = 'pending';
    tc.querySelector('.status').textContent = '⏳';
    tc.querySelector('.status').className = 'status pending';
    tc.querySelector('.expected').textContent = '';
    tc.querySelector('.expected').classList.remove('summary-fail');
  });

  groups.forEach((_, gi) => {
    const badge = document.getElementById(`badge-${gi}`);
    if (badge) { badge.textContent = '—'; badge.className = 'badge'; }
  });

  const filterVal = document.getElementById('filter-select').value;
  let testIndex = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    let groupPassed = 0, groupFailed = 0;

    for (let ti = 0; ti < group.tests.length; ti++) {
      const test = group.tests[ti];
      total++;
      testIndex++;

      const tc = document.querySelector(`.test-case[data-test-id="${gi}-${ti}"]`);
      const detailEl = document.getElementById(`detail-${gi}-${ti}`);
      const statusEl = tc.querySelector('.status');

      try {
        const result = test.fn();
        if (result && typeof result.then === 'function') {
          await result;
        }
        passed++;
        groupPassed++;
        statusEl.textContent = '✅';
        statusEl.className = 'status pass';
        tc.dataset.status = 'pass';
        detailEl.textContent = '✓ Réussi';
        detailEl.style.color = '#3fb950';
      } catch (e) {
        failed++;
        groupFailed++;
        statusEl.textContent = '❌';
        statusEl.className = 'status fail';
        tc.dataset.status = 'fail';
        detailEl.textContent = '✖ ' + e.message;
        detailEl.style.color = '#f85149';
      }

      if (filterVal === 'pass' && tc.dataset.status !== 'pass') tc.style.display = 'none';
      else if (filterVal === 'fail' && tc.dataset.status !== 'fail') tc.style.display = 'none';
      else tc.style.display = 'flex';

      updateStats(total, passed, failed);
      const pct = Math.round((testIndex / totalTests()) * 100);
      document.getElementById('progress-fill').style.width = Math.min(pct, 100) + '%';
    }

    const badge = document.getElementById(`badge-${gi}`);
    if (badge) {
      if (groupFailed === 0) {
        badge.textContent = `✅ ${groupPassed}/${group.tests.length}`;
        badge.className = 'badge all-pass';
      } else {
        badge.textContent = `⚠ ${groupPassed}/${group.tests.length} (${groupFailed} échec${groupFailed > 1 ? 's' : ''})`;
        badge.className = 'badge some-fail';
      }
    }
  }

  document.getElementById('progress-fill').style.width = '100%';
  runBtn.disabled = false;
  runBtn.textContent = '▶ Exécuter tous les tests';
}

function totalTests() {
  return groups.reduce((acc, g) => acc + g.tests.length, 0);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  render();

  document.getElementById('run-all').addEventListener('click', runAllTests);

  document.getElementById('clear-results').addEventListener('click', () => {
    render();
    document.getElementById('progress-fill').style.width = '0%';
  });

  document.getElementById('filter-select').addEventListener('change', (e) => {
    const val = e.target.value;
    document.querySelectorAll('.test-case').forEach(tc => {
      if (val === 'all') { tc.style.display = 'flex'; return; }
      if (tc.dataset.status === val) { tc.style.display = 'flex'; }
      else { tc.style.display = 'none'; }
    });
  });
});