/**
 * Algorithm Core - Lexer, Parser and Evaluator
 *
 * Pure logic classes without DOM dependencies.
 * Designed to be used from a Web Worker or main thread.
 *
 * Converts algorithmic pseudo-code into tokens,
 * parses them into an AST, and evaluates them with
 * full operator precedence, function call support,
 * conditionals, loop structures, variable types, and arrays.
 */

// ──────────────────────────────────────────────
// LEXER
// ──────────────────────────────────────────────

class Lexer {
  constructor(input) {
    // Normaliser toutes les variantes de "jusqu'à" en "jusqua"
    this.input = input.replace(/jusqu['\u2019\u2018\u2019\u201a]?[àa]/gi, 'jusqua');
    this.position = 0;
    this.tokens = [];
  }

  static tokenSpecs = [
    ['WHITESPACE', /^\s+/],
    ['COMMENT', /^\/\/\/.*|^\/\/.*|^#.*/],
    ['NUMBER', /^\d+(\.\d+)?/],
    ['OPERATOR', /^[←+\-*/=<>!@∈]+/],
    ['STRING', /^"(.*?)"|^'(.*?)'/],
    ['RANGE', /^\.\./],
    ['PUNCTUATION', /^[\.{}()[\],;:]/],
    ['KEYWORD', /^(début|mod|div|fin|tant|que|si|alors|sinon|r[ée]p[ée]ter|pour|de|à|faire|retourner|fonction|procédure|var|type|tableau|entier|r['\u00e9e]el|bool['\u00e9e]en|cha[îi]ne|caract['\u00e8e]re|vrai|faux|et|ou|non|pas|jusqua)(?![a-zA-Z0-9_àâäéèêëîïôöùûü])/i],
    ['IDENTIFIER', /^[a-zA-Z_àâäéèêëîïôöùûü]\w*/],
  ];

  tokenize() {
    while (this.position < this.input.length) {
      const remainingInput = this.input.slice(this.position);
      let matched = false;

      for (let [type, regex] of Lexer.tokenSpecs) {
        const match = regex.exec(remainingInput);
        if (match) {
          matched = true;
          const value = match[0];
          if (this.isEOL(type, value)) {
            type = "EOL";
          } else if (this.isAssignment(type, value)) {
            type = "ASSIGNMENT";
          } else if (this.isOpenParenthesis(type, value)) {
            type = "OPEN_PAR";
          } else if (this.isCloseParenthesis(type, value)) {
            type = "CLOSE_PAR";
          } else if (this.isDivOrMod(type, value)) {
            type = "OPERATOR";
          } else if (this.isOpenBracket(type, value)) {
            type = "OPEN_BRACKET";
          } else if (this.isCloseBracket(type, value)) {
            type = "CLOSE_BRACKET";
          } else if (this.isBoolean(type, value)) {
            type = "BOOLEAN";
          } else if (this.isLogical(type, value)) {
            type = "LOGICAL";
          } else if (this.isComparison(type, value)) {
            type = "COMPARISON";
          } else if (this.isMembership(type, value)) {
            type = "MEMBERSHIP";
          } else if (this.isConditional(type, value)) {
            type = "CONDITIONAL";
          } else if (this.isLoopKeyword(type, value)) {
            type = "LOOP";
          } else if (this.isTypeKeyword(type, value)) {
            type = "TYPE_KW";
          } else if (this.isTypeDecl(type, value)) {
            type = "TYPE_DECL";
          } else if (this.isVarKeyword(type, value)) {
            type = "VAR_KW";
          } else if (this.isColon(type, value)) {
            type = "COLON";
          }

          if (type !== 'WHITESPACE' && type !== 'COMMENT') {
            const finalValue = (type === 'KEYWORD' || type === 'CONDITIONAL' || type === 'LOOP' || type === 'LOGICAL' || type === 'BOOLEAN' || type === 'TYPE_KW' || type === 'TYPE_DECL') ? value.toLowerCase() : value;
            this.tokens.push({ type, value: finalValue });
          }
          this.position += value.length;
          break;
        }
      }

      if (!matched) {
        throw new Error(`Token inattendu à la position ${this.position} : '${this.input[this.position]}'`);
      }
    }

    return this.tokens;
  }

  isCarWhitespace(car) { return car == ' ' || car == '\t'; }
  isCarEOL(car) { return car == '\n'; }
  isEOL(type, value) {
    if (type !== "WHITESPACE") return false;
    for (let i = 0; i < value.length; i++) { if (this.isCarEOL(value[i])) return true; }
    return false;
  }
  isWhitespace(type, value) {
    if (type !== "WHITESPACE") return false;
    for (let i = 1; i < value.length; i++) { if (!this.isCarWhitespace(value[i])) return false; }
    return true;
  }
  isOpenParenthesis(type, value) { return type === "PUNCTUATION" && value === '('; }
  isCloseParenthesis(type, value) { return type === "PUNCTUATION" && value === ')'; }
  isAssignment(type, value) { return type === "OPERATOR" && (value === '←' || value === '<--'); }
  isDivOrMod(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'div' || v === 'mod'); }
  isOpenBracket(type, value) { return type === "PUNCTUATION" && value === '['; }
  isCloseBracket(type, value) { return type === "PUNCTUATION" && value === ']'; }
  isBoolean(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'vrai' || v === 'faux'); }
  isLogical(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'et' || v === 'ou' || v === 'non'); }
  isComparison(type, value) { return type === "OPERATOR" && (value === '=' || value === '<>' || value === '!=' || value === '≠' || value === '<' || value === '>' || value === '<=' || value === '>='); }
  isMembership(type, value) { return type === "OPERATOR" && value === '∈'; }
  isConditional(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'si' || v === 'alors' || v === 'sinon'); }
  isLoopKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && (v === 'pour' || v === 'de' || v === 'à' || v === 'faire' || v === 'pas' || v === 'fin' ||
      v === 'tant' || v === 'que' || v === 'répéter' || v === 'repeter' || v === 'jusqua' || v === 'jusquà');
  }
  isTypeKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && (v === 'entier' || v === 'réel' || v === 'reel' || v === 'booléen' || v === 'booleen' || v === 'chaîne' || v === 'chaine' || v === 'caractère' || v === 'caractere' || v === 'tableau');
  }
  isTypeDecl(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && v === 'type';
  }
  isDeKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && v === 'de';
  }
  isVarKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && v === 'var';
  }
  isColon(type, value) {
    return type === "PUNCTUATION" && value === ':';
  }
}


// ──────────────────────────────────────────────
// PARSER (produit un AST)
// ──────────────────────────────────────────────

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.statements = [];
    this.hasError = false;
    this.parseAll();
  }

  peek(offset = 0) { const idx = this.pos + offset; return idx < this.tokens.length ? this.tokens[idx] : null; }
  consume() { return this.tokens[this.pos++]; }
  expect(type) {
    const t = this.peek();
    if (!t || t.type !== type) throw new Error(`Attendu ${type}, obtenu ${t ? t.type + '("' + t.value + '")' : 'fin de fichier'}`);
    return this.consume();
  }
  expectValue(type, value) {
    const t = this.peek();
    if (!t || t.type !== type || t.value !== value) throw new Error(`Attendu ${type}("${value}"), obtenu ${t ? t.type + '("' + t.value + '")' : 'fin de fichier'}`);
    return this.consume();
  }
  isEOL() { const t = this.peek(); return t && t.type === 'EOL'; }
  skipEOL() { while (this.isEOL()) this.pos++; }

  parseAll() {
    while (this.pos < this.tokens.length) {
      this.skipEOL();
      if (this.pos >= this.tokens.length) break;
      const stmt = this.parseStatement();
      if (stmt) { this.statements.push(stmt); } else { this.pos++; }
    }
  }

  parseStatement() {
    // Type declarations: type nom = tableau de taille type_elem
    if (this.peek() && this.peek().type === 'TYPE_DECL' && this.peek().value === 'type') {
      return this.parseTypeDeclaration();
    }
    // Var declarations: var x, y, z : type
    if (this.peek() && this.peek().type === 'VAR_KW') {
      return this.parseVarDeclaration();
    }
    // Boucles
    if (this.peek() && this.peek().type === 'LOOP') {
      if (this.peek().value === 'pour') return this.parseForLoop();
      if (this.peek().value === 'tant') return this.parseTantQue();
      if (this.peek().value === 'répéter' || this.peek().value === 'repeter') return this.parseRepeter();
    }
    // Conditionnel
    if (this.peek() && this.peek().type === 'CONDITIONAL' && this.peek().value === 'si') return this.parseConditional();
    // Affectation
    if (this.peek() && this.peek(1) && this.peek().type === 'IDENTIFIER' && this.peek(1).type === 'ASSIGNMENT') return this.parseAssignment();
    // Appel de fonction
    if (this.peek() && this.peek(1) && this.peek().type === 'IDENTIFIER' && this.peek(1).type === 'OPEN_PAR') return this.parseFunctionCallStmt();
    return null;
  }

  // ── Type Declaration: type nom = tableau de taille type_elem ──
  parseTypeDeclaration() {
    this.expectValue('TYPE_DECL', 'type'); this.skipEOL();
    const typeName = this.expect('IDENTIFIER').value; this.skipEOL();
    // accepter '=' (COMPARISON) ou '←' (ASSIGNMENT)
    const t = this.peek();
    if (t && t.type === 'COMPARISON' && t.value === '=') {
      this.consume(); this.skipEOL();
    } else {
      this.expect('ASSIGNMENT'); this.skipEOL();
    }
    // 'tableau' → TYPE_KW (via isTypeKeyword)
    if (this.peek() && this.peek().type === 'TYPE_KW' && this.peek().value === 'tableau') {
      this.consume(); this.skipEOL();
    }
    // 'de' → LOOP (via isLoopKeyword)
    this.expectValue('LOOP', 'de'); this.skipEOL();
    // La taille doit être une constante entière, pas une expression
    const sizeToken = this.peek();
    if (!sizeToken || sizeToken.type !== 'NUMBER' || sizeToken.value.indexOf('.') !== -1) {
      throw new Error(`La taille du tableau doit être une constante entière, obtenu : ${sizeToken ? sizeToken.value : 'rien'}`);
    }
    const arraySize = parseInt(sizeToken.value, 10);
    this.consume(); this.skipEOL();
    const elementType = this.expect('TYPE_KW').value; // entier, réel, booléen, chaîne, caractère
    return { type: 'typeDeclaration', typeName, arraySize, elementType };
  }

  // ── Var Declaration: var noms : type ──
  parseVarDeclaration() {
    this.expect('VAR_KW'); this.skipEOL();
    const varNames = [];
    varNames.push(this.expect('IDENTIFIER').value); this.skipEOL();
    while (this.peek() && this.peek().type === 'PUNCTUATION' && this.peek().value === ',') {
      this.consume(); this.skipEOL();
      varNames.push(this.expect('IDENTIFIER').value); this.skipEOL();
    }
    let varType = null;
    let typeName = null;
    if (this.peek() && this.peek().type === 'COLON') {
      this.consume(); this.skipEOL();
      if (this.peek() && this.peek().type === 'TYPE_KW') {
        varType = this.consume().value; // entier, réel, booléen, chaîne, caractère
      } else if (this.peek() && this.peek().type === 'IDENTIFIER') {
        typeName = this.consume().value; // reference to a type defined with "type ... = ..."
      }
    }
    return { type: 'varDeclaration', varNames, varType, typeName };
  }

  // ── Boucle Pour ──
  parseForLoop() {
    this.expectValue('LOOP', 'pour'); this.skipEOL();
    const varName = this.expect('IDENTIFIER').value; this.skipEOL();
    this.expectValue('LOOP', 'de'); this.skipEOL();
    const start = this.parseExpression(); this.skipEOL();
    this.expectValue('LOOP', 'à'); this.skipEOL();
    const end = this.parseExpression(); this.skipEOL();
    this.expectValue('LOOP', 'faire'); this.skipEOL();
    let step = null;
    if (this.peek() && this.peek().type === 'LOOP' && this.peek().value === 'pas') {
      this.consume(); this.skipEOL();
      step = this.parseExpression();
      this.skipEOL();
    }
    const body = this.parseBodyUntil(['fin']);
    this.expectValue('LOOP', 'fin');
    this.skipEOL();
    this.expectValue('LOOP', 'pour');
    return { type: 'forLoop', varName, start, end, step, body };
  }

  // ── Boucle Tant Que : tant que condition faire ... fin tant que ──
  parseTantQue() {
    this.expectValue('LOOP', 'tant');
    this.skipEOL();
    this.expectValue('LOOP', 'que');
    this.skipEOL();
    const condition = this.parseExpression();
    this.skipEOL();
    this.expectValue('LOOP', 'faire');
    this.skipEOL();
    const body = this.parseBodyUntil(['fin']);
    this.expectValue('LOOP', 'fin');
    this.skipEOL();
    // 'tant' + 'que' final (optionnel, certains algorithmes l'omettent)
    if (this.peek() && this.peek().type === 'LOOP' && this.peek().value === 'tant') {
      this.consume(); this.skipEOL();
      if (this.peek() && this.peek().type === 'LOOP' && this.peek().value === 'que') {
        this.consume();
      }
    }
    return { type: 'whileLoop', condition, body };
  }

  // ── Boucle Répéter : répéter ... jusqu'à condition ──
  parseRepeter() {
    this.consume(); // répéter/repeter
    this.skipEOL();
    const body = this.parseBodyUntil(['jusqu\'à', 'jusqu\'a', 'jusqua', 'jusquà']);
    this.skipEOL();
    // consommer jusqu'à (peut être tokenisé de différentes façons)
    if (this.peek() && this.peek().type === 'LOOP') {
      this.consume(); // jusqu'à/jusqua/jusquà
    }
    this.skipEOL();
    const condition = this.parseExpression();
    return { type: 'repeatLoop', condition, body };
  }

  // ── Conditionnel ──
  parseConditional() {
    this.expectValue('CONDITIONAL', 'si'); this.skipEOL();
    const condition = this.parseExpression(); this.skipEOL();
    this.expectValue('CONDITIONAL', 'alors'); this.skipEOL();
    const thenBody = this.parseBodyUntil(['sinon', 'fin']);
    const elseIfBranches = [];
    let elseBody = null;
    while (this.peek() && this.peek().type === 'CONDITIONAL' && this.peek().value === 'sinon') {
      this.consume(); this.skipEOL();
      if (this.peek() && this.peek().type === 'CONDITIONAL' && this.peek().value === 'si') {
        this.consume(); this.skipEOL();
        const elseifCond = this.parseExpression(); this.skipEOL();
        this.expectValue('CONDITIONAL', 'alors'); this.skipEOL();
        const elseifBody = this.parseBodyUntil(['sinon', 'fin']);
        elseIfBranches.push({ condition: elseifCond, body: elseifBody });
      } else {
        elseBody = this.parseBodyUntil(['fin']); break;
      }
    }
    this.expectValue('LOOP', 'fin');
    this.skipEOL();
    if (this.peek() && this.peek().type === 'CONDITIONAL' && this.peek().value === 'si') { this.consume(); }
    return { type: 'conditional', condition, thenBody, elseIfBranches, elseBody };
  }

  parseBodyUntil(stopKeywords) {
    const body = [];
    while (this.pos < this.tokens.length) {
      this.skipEOL();
      if (!this.peek()) break;
      const v = this.peek().value;
      const t = this.peek().type;

      // Stop si on rencontre un mot-clé d'arrêt
      if ((t === 'CONDITIONAL' || t === 'LOOP') && stopKeywords.includes(v)) break;

      // Structures imbriquées
      if (t === 'CONDITIONAL' && v === 'si') { body.push(this.parseConditional()); continue; }
      if (t === 'LOOP') {
        if (v === 'pour') { body.push(this.parseForLoop()); continue; }
        if (v === 'tant') { body.push(this.parseTantQue()); continue; }
        if (v === 'répéter' || v === 'repeter') { body.push(this.parseRepeter()); continue; }
      }

      // Type/Var declarations can appear in bodies too
      if (t === 'TYPE_DECL' && v === 'type') { body.push(this.parseTypeDeclaration()); continue; }
      if (t === 'VAR_KW') { body.push(this.parseVarDeclaration()); continue; }

      const stmt = this.parseStatement();
      if (stmt) { body.push(stmt); } else { this.pos++; }
    }
    return body;
  }

  parseAssignment() {
    const varName = this.expect('IDENTIFIER').value;
    this.expect('ASSIGNMENT');
    return { type: 'assignment', varName, expression: this.parseExpression() };
  }

  parseFunctionCallStmt() {
    const funcName = this.expect('IDENTIFIER').value;
    this.expect('OPEN_PAR');
    const args = this.parseFunctionArgs();
    this.expect('CLOSE_PAR');
    return { type: 'functionCall', funcName, args };
  }

  parseFunctionArgs() {
    const args = [];
    while (this.peek() && this.peek().type !== 'CLOSE_PAR') {
      this.skipEOL();
      if (!this.peek() || this.peek().type === 'CLOSE_PAR') break;
      args.push(this.parseExpression());
      this.skipEOL();
      if (this.peek() && this.peek().type === 'PUNCTUATION' && this.peek().value === ',') { this.consume(); }
      else break;
    }
    return args;
  }

  // ── Analyse d'expressions avec précédence ──
  // Ordre de priorité décroissant : non (unaire), et, ou

  parseExpression() { return this.parseOu(); }

  // 'ou' : priorité la plus faible
  parseOu() {
    this.skipEOL();
    let left = this.parseEt();
    while (this.peek() && this.peek().type === 'LOGICAL' && this.peek().value === 'ou') {
      this.consume(); this.skipEOL();
      const right = this.parseEt();
      left = { type: 'binary', operator: 'ou', left, right };
    }
    return left;
  }

  // 'et' : priorité moyenne
  parseEt() {
    this.skipEOL();
    let left = this.parseMembership();
    while (this.peek() && this.peek().type === 'LOGICAL' && this.peek().value === 'et') {
      this.consume(); this.skipEOL();
      const right = this.parseMembership();
      left = { type: 'binary', operator: 'et', left, right };
    }
    return left;
  }

  parseMembership() {
    this.skipEOL();
    let left = this.parseComparison();
    while (this.peek() && this.peek().type === 'MEMBERSHIP') {
      this.consume(); this.skipEOL();
      const right = this.parseAtom();
      left = { type: 'membership', left, right };
    }
    return left;
  }

  parseComparison() {
    this.skipEOL();
    let left = this.parseAddSub();
    while (this.peek() && this.peek().type === 'COMPARISON') {
      const op = this.consume().value; this.skipEOL();
      const right = this.parseAddSub();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  parseAddSub() {
    this.skipEOL();
    let left = this.parseMulDiv();
    while (this.peek() && this.peek().type === 'OPERATOR' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value; this.skipEOL();
      const right = this.parseMulDiv();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  parseMulDiv() {
    this.skipEOL();
    let left = this.parseUnary();
    while (this.peek() && (
      (this.peek().type === 'OPERATOR' && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '×' || this.peek().value === 'div' || this.peek().value === 'mod'))
    )) {
      const op = this.consume().value; this.skipEOL();
      const right = this.parseUnary();
      left = { type: 'binary', operator: op, left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '-') { this.consume(); return { type: 'unary', operator: '-', operand: this.parseUnary() }; }
    if (this.peek() && this.peek().type === 'LOGICAL' && this.peek().value === 'non') { this.consume(); return { type: 'unary', operator: 'non', operand: this.parseUnary() }; }
    return this.parseAtom();
  }

  parseAtom() {
    const t = this.peek();
    if (!t) throw new Error('Expression incomplète');

    if (t.type === 'NUMBER') { this.consume(); return { type: 'number', value: parseFloat(t.value) }; }
    if (t.type === 'STRING') { this.consume(); return { type: 'string', value: t.value.slice(1, -1) }; }
    if (t.type === 'BOOLEAN') { this.consume(); return { type: 'boolean', value: t.value === 'vrai' }; }

    if (t.type === 'IDENTIFIER') {
      if (this.peek(1) && this.peek(1).type === 'OPEN_PAR') {
        const fnCall = this.parseFunctionCallExpr();
        if (this.peek() && this.peek().type === 'OPEN_BRACKET') return this.parseIndexAccessOnExpr(fnCall);
        return fnCall;
      }
      const name = this.consume().value;
      if (this.peek() && this.peek().type === 'OPEN_BRACKET') return this.parseIndexAccess(name);
      return { type: 'identifier', name: name };
    }

    if (t.type === 'OPEN_BRACKET') {
      this.consume(); this.skipEOL();
      const first = this.parseExpression(); this.skipEOL();
      if (this.peek() && this.peek().type === 'RANGE') {
        this.consume(); this.skipEOL();
        const last = this.parseExpression(); this.skipEOL();
        this.expect('CLOSE_BRACKET');
        return { type: 'range', first, last };
      }
      throw new Error("Crochet ouvrant sans '..' : attendu un intervalle [deb..fin]");
    }

    if (t.type === 'OPEN_PAR') {
      this.consume();
      const expr = this.parseExpression();
      this.expect('CLOSE_PAR');
      return { type: 'group', expression: expr };
    }

    throw new Error(`Token inattendu dans l'expression : ${t.type}("${t.value}")`);
  }

  parseFunctionCallExpr() {
    const funcName = this.expect('IDENTIFIER').value;
    this.expect('OPEN_PAR');
    const args = this.parseFunctionArgs();
    this.expect('CLOSE_PAR');
    return { type: 'functionCall', funcName, args };
  }

  parseIndexAccess(name) {
    this.expect('OPEN_BRACKET');
    const index = this.parseExpression();
    this.expect('CLOSE_BRACKET');
    return { type: 'index', name, index };
  }

  parseIndexAccessOnExpr(expr) {
    this.expect('OPEN_BRACKET');
    const index = this.parseExpression();
    this.expect('CLOSE_BRACKET');
    return { type: 'indexExpr', expression: expr, index };
  }
}


// ──────────────────────────────────────────────
// EVALUATEUR
// ──────────────────────────────────────────────

class Evaluator {
  constructor(variables, outputFn, verbose, inputFn, userTypes) {
    this.variables = variables;
    this.varTypes = {}; // stores type info for each variable: { varName: 'entier'|'réel'|'booléen'|'chaîne'|'caractère'|null }
    this.outputFn = outputFn || function() {};
    this.verbose = verbose || false;
    this.inputFn = inputFn || function(prompt) {
      return Promise.resolve(prompt('Entrez une valeur :') || '');
    };
    this.userTypes = userTypes || {}; // Store type definitions: { typeName: { arraySize, elementType } }
  }

  formatValue(value) {
    if (typeof value === 'string') return '"' + value + '"';
    if (typeof value === 'boolean') return value ? 'vrai' : 'faux';
    if (value === null || value === undefined) return 'null';
    return String(value);
  }

  getDefaultValue(typeName) {
    switch (typeName) {
      case 'entier': case 'integer': return 0;
      case 'réel': case 'reel': case 'real': return 0.0;
      case 'booléen': case 'booleen': case 'boolean': return false;
      case 'chaîne': case 'chaine': case 'string': return '';
      case 'caractère': case 'caractere': case 'char': return ' ';
      default: return null;
    }
  }

  convertToType(value, typeName) {
    if (value === null || value === undefined) return value;
    switch (typeName) {
      case 'entier': case 'integer':
        return parseInt(value, 10);
      case 'réel': case 'reel': case 'real':
        return parseFloat(value);
      case 'booléen': case 'booleen': case 'boolean':
        if (typeof value === 'string') {
          const v = value.toLowerCase().trim();
          if (v === 'vrai' || v === 'true' || v === '1') return true;
          if (v === 'faux' || v === 'false' || v === '0') return false;
        }
        return Boolean(value);
      case 'caractère': case 'caractere': case 'char':
        return String(value).charAt(0);
      default:
        return value;
    }
  }

  async evaluate(node) {
    if (!node) return null;
    switch (node.type) {
      case 'number': return node.value;
      case 'string': return node.value;
      case 'boolean': return node.value;
      case 'identifier': return this.variables[node.name] !== undefined ? this.variables[node.name] : null;
      case 'group': return this.evaluate(node.expression);
      case 'unary': {
        const val = await this.evaluate(node.operand);
        if (node.operator === '-') return -val;
        if (node.operator === 'non') return !val;
        return val;
      }
      case 'binary': {
        const left = await this.evaluate(node.left);
        const right = await this.evaluate(node.right);
        return this.applyOperator(node.operator, left, right);
      }
      case 'index': {
        const value = await this.evaluate({ type: 'identifier', name: node.name });
        const idx = await this.evaluate(node.index);
        return this.getIndexValue(value, idx);
      }
      case 'indexExpr': {
        const value = await this.evaluate(node.expression);
        const idx = await this.evaluate(node.index);
        return this.getIndexValue(value, idx);
      }
      case 'functionCall': {
        if (node.funcName.toLowerCase() === 'lire') {
          return await this.callFunctionLire(node);
        }
        const args = [];
        for (const a of node.args) {
          args.push(await this.evaluate(a));
        }
        return await this.callFunction(node.funcName, args);
      }
      case 'conditional': return await this.evaluateConditional(node);
      case 'forLoop': return await this.evaluateForLoop(node);
      case 'whileLoop': return await this.evaluateWhileLoop(node);
      case 'repeatLoop': return await this.evaluateRepeatLoop(node);
      case 'assignment': {
        const value = await this.evaluate(node.expression);
        this.variables[node.varName] = value;
        if (this.verbose && this.outputFn) {
          this.outputFn('<span class="step-assign">' + node.varName + ' ← ' + this.formatValue(value) + '</span>');
        }
        return value;
      }
      case 'typeDeclaration': {
        // Store the type definition for later use in var declarations
        this.userTypes[node.typeName] = {
          type: 'array',
          elementType: node.elementType,
          size: node.arraySize
        };
        if (this.outputFn) {
          this.outputFn('Type "' + node.typeName + '" défini : tableau[' + node.arraySize + '] de ' + node.elementType);
        }
        return null;
      }
      case 'varDeclaration': {
        for (const varName of node.varNames) {
          let value = null;
          let actualType = null;
          if (node.varType) {
            // Simple type
            actualType = node.varType;
            value = this.getDefaultValue(node.varType);
          } else if (node.typeName) {
            // User-defined type (array) — store the element type for Lire() support
            const typeDef = this.userTypes[node.typeName];
            if (typeDef && typeDef.type === 'array') {
              actualType = typeDef.elementType; // 'réel', 'entier', etc.
              const defaultVal = this.getDefaultValue(typeDef.elementType);
              value = new Array(typeDef.size).fill(defaultVal);
            } else {
              value = null;
            }
          }
          // Store type info for this variable (element type for arrays)
          this.varTypes[varName] = actualType;
          // If no type specified, leave as undefined
          if (value !== null) {
            this.variables[varName] = value;
            if (this.verbose && this.outputFn) {
              this.outputFn('<span class="step-assign">' + varName + ' initialisé (' + (node.varType || node.typeName) + ')</span>');
            }
          }
        }
        return null;
      }
      case 'membership': {
        const value = await this.evaluate(node.left);
        const range = await this.evaluate(node.right);
        if (range && typeof range === 'object' && range.type === 'range_val') {
          return value >= range.first && value <= range.last;
        }
        return false;
      }
      case 'range': {
        const first = await this.evaluate(node.first);
        const last = await this.evaluate(node.last);
        return { type: 'range_val', first, last };
      }
      default: return null;
    }
  }

  async evaluateConditional(node) {
    const cond = await this.evaluate(node.condition);
    if (cond) { for (const stmt of node.thenBody) { await this.evaluate(stmt); } return null; }
    for (const elseifBranch of node.elseIfBranches) {
      const elseifCond = await this.evaluate(elseifBranch.condition);
      if (elseifCond) { for (const stmt of elseifBranch.body) { await this.evaluate(stmt); } return null; }
    }
    if (node.elseBody) { for (const stmt of node.elseBody) { await this.evaluate(stmt); } }
    return null;
  }

  async evaluateForLoop(node) {
    const start = await this.evaluate(node.start);
    const end = await this.evaluate(node.end);
    const step = node.step !== null ? await this.evaluate(node.step) : (start <= end ? 1 : -1);
    if (step === 0) { this.outputFn("Erreur : le pas ne peut pas être 0"); return null; }
    if (step > 0) {
      for (let i = start; i <= end; i += step) { this.variables[node.varName] = i; for (const stmt of node.body) { await this.evaluate(stmt); } }
    } else {
      for (let i = start; i >= end; i += step) { this.variables[node.varName] = i; for (const stmt of node.body) { await this.evaluate(stmt); } }
    }
    return null;
  }

  async evaluateWhileLoop(node) {
    let cond = await this.evaluate(node.condition);
    while (cond) {
      for (const stmt of node.body) { await this.evaluate(stmt); }
      cond = await this.evaluate(node.condition);
    }
    return null;
  }

  async evaluateRepeatLoop(node) {
    do {
      for (const stmt of node.body) { await this.evaluate(stmt); }
      const cond = await this.evaluate(node.condition);
      if (cond) return null;
    } while (true);
  }

  getIndexValue(value, idx) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || Array.isArray(value)) {
      if (idx < 0) { const adjustedIdx = value.length + idx; return adjustedIdx >= 0 ? value[adjustedIdx] : null; }
      return idx < value.length ? value[idx] : null;
    }
    return null;
  }

  applyOperator(op, left, right) {
    switch (op) {
      case '+':
        if (typeof left === 'string' || typeof right === 'string') return String(left) + String(right);
        return left + right;
      case '-': return left - right;
      case '*': case '×': return left * right;
      case '/': return left / right;
      case 'div': return Math.trunc(left / right);
      case 'mod': return this.mod(left, right);
      case '=': return left === right;
      case '<>': case '!=': case '≠': return left !== right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case 'et': return left && right;
      case 'ou': return left || right;
      default: return null;
    }
  }

  mod(a, b) { return ((a % b) + b) % b; }

  async callFunctionLire(node) {
    if (!node.args || node.args.length === 0) {
      const value = await this.inputFn('Entrez une valeur :');
      return value;
    }

    const firstArg = node.args[0];

    // Cas 1: lire(varName) — variable simple typée
    if (firstArg.type === 'identifier') {
      const varName = firstArg.name;
      const raw = await this.inputFn('Entrez la valeur de ' + varName + ' :');
      const varType = this.varTypes[varName] || null;
      const value = varType ? this.convertToType(raw, varType) : raw;
      this.variables[varName] = value;
      if (this.outputFn) {
        this.outputFn(varName + ' ← ' + this.formatOutput(varType, value) + ' (lu)');
      }
      return value;
    }

    // Cas 2: lire(t[i]) — case de tableau
    if (firstArg.type === 'index') {
      const arrayName = firstArg.name;
      const idx = await this.evaluate(firstArg.index);
      const raw = await this.inputFn('Entrez la valeur de ' + arrayName + '[' + idx + '] :');
      const varType = this.varTypes[arrayName] || null;
      const value = varType ? this.convertToType(raw, varType) : raw;
      if (Array.isArray(this.variables[arrayName])) {
        this.variables[arrayName][idx] = value;
      }
      if (this.outputFn) {
        this.outputFn(arrayName + '[' + idx + '] ← ' + this.formatOutput(varType, value) + ' (lu)');
      }
      return value;
    }

    // Fallback
    const value = await this.inputFn('Entrez une valeur :');
    return value;
  }

  formatOutput(varType, value) {
    if (varType === 'caractère' || varType === 'chaîne') {
      return '"' + value + '"';
    }
    return String(value);
  }

  writeStdout(...args) {
    const s = args.filter(x => x !== undefined).join(' ');
    if (this.outputFn) this.outputFn(s);
    return null;
  }

  async callFunction(name, args) {
    const normalized = name.charAt(0).toLowerCase() + name.slice(1);
    const functionMap = {
      'chr':          (code) => Promise.resolve(String.fromCharCode(code)),
      'ord':          (car) => Promise.resolve((typeof car === 'string' && car.length > 0) ? car.charCodeAt(0) : NaN),
      'arrondi':      (x) => { const xi = Math.floor(x); const fx = x - xi; if (fx < 0.5) return xi; if (fx > 0.5) return xi + 1; return xi % 2 === 0 ? xi : xi + 1; },
      'racine':       (x) => Math.sqrt(x),
      'alea':         (a, b) => Math.floor(Math.random() * (b - a + 1) + a),
      'abs':          (x) => Math.abs(x),
      'ent':          (x) => parseInt(x),
      'long':         (ch) => (typeof ch === 'string' ? ch.length : String(ch).length),
      'pos':          (ch1, ch2) => (typeof ch2 === 'string' ? ch2.indexOf(ch1) : -1),
      'convch':       (x) => String(x),
      'valeur':       (ch) => Number(ch),
      'sous_chaine':  (ch, d, f) => (typeof ch === 'string' ? ch.substring(d, f) : ''),
      'effacer':      (ch, d, f) => (typeof ch === 'string' ? (f >= d ? ch.substring(0, d) + ch.substring(f) : ch) : ch),
      'majus':        (ch) => (typeof ch === 'string' ? ch.toUpperCase() : String(ch).toUpperCase()),
      'estnum':       (ch) => { if (typeof ch !== 'string') return false; for (let c of ch) { if (c < '0' || c > '9') return false; } return ch.length > 0; },
      'ecrire':       (...a) => { const s = a.filter(x => x !== undefined).join(' '); if (this.outputFn) this.outputFn(s); return null; },
      'écrire':       (...a) => { const s = a.filter(x => x !== undefined).join(' '); if (this.outputFn) this.outputFn(s); return null; },
      'lire':         () => this.inputFn('Entrez une valeur :'),
    };
    const fn = functionMap[normalized] || functionMap[name.toLowerCase()] || functionMap[name];
    if (fn) return await fn(...args);
    throw new Error(`Fonction inconnue : ${name}`);
  }
}