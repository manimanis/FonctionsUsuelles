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
    ['OPERATOR', /^[←+\-*/=<>!@∈≠≥≤]+/],
    ['STRING', /^"(.*?)"|^'(.*?)'/],
    ['RANGE', /^\.\./],
    ['PUNCTUATION', /^[\.{}()\[\],;:]/],
    ['KEYWORD', /^(algorithme|début|debut|mod|div|fin|tant|que|si|alors|sinon|r[ée]p[ée]ter|pour|de|à|faire|retourner|retourne|fonction|procédure|procedure|var|type|tableau|entier|r['\u00e9e]el|bool['\u00e9e]en|cha[îi]ne|caract['\u00e8e]re|vrai|faux|et|ou|non|pas|jusqua)(?![a-zA-Z0-9_àâäéèêëîïôöùûü])/i],
    ['IDENTIFIER', /^[a-zA-Z_àâäéèêëîïôöùûü][a-zA-Z0-9_àâäéèêëîïôöùûü]*/],
  ];

  getPosition(pos) {
    if (pos < 0 || pos > this.input.length) return { line: 0, col: 0 };
    const before = this.input.slice(0, pos);
    const lines = before.split('\n');
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  }

  errorAt(pos, message) {
    const { line, col } = this.getPosition(pos);
    return `Ligne ${line}, Colonne ${col} : ${message}`;
  }

  tokenize() {
    while (this.position < this.input.length) {
      const remainingInput = this.input.slice(this.position);
      let matched = false;

      for (let [type, regex] of Lexer.tokenSpecs) {
        const match = regex.exec(remainingInput);
        if (match) {
          matched = true;
          const value = match[0];
          const tokenPos = this.position;

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
          } else if (this.isReturnKeyword(type, value)) {
            type = "RETURN_KW";
          } else if (this.isFuncProcKeyword(type, value)) {
            type = "FUNC_PROC_KW";
          } else if (this.isAlgorithmKeyword(type, value)) {
            type = "ALGO_KW";
          } else if (this.isBeginKeyword(type, value)) {
            type = "BEGIN_KW";
          }

          if (type !== 'WHITESPACE' && type !== 'COMMENT') {
            const finalValue = (type === 'KEYWORD' || type === 'CONDITIONAL' || type === 'LOOP' || type === 'LOGICAL' || type === 'BOOLEAN' || type === 'TYPE_KW' || type === 'TYPE_DECL' || type === 'RETURN_KW' || type === 'FUNC_PROC_KW' || type === 'ALGO_KW' || type === 'BEGIN_KW') ? value.toLowerCase() : value;
            this.tokens.push({ type, value: finalValue, pos: tokenPos });
          }
          this.position += value.length;
          break;
        }
      }

      if (!matched) {
        throw new Error(`${this.errorAt(this.position, 'Token inattendu : "' + this.input[this.position] + '"')}`);
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
  isOpenParenthesis(type, value) { return type === "PUNCTUATION" && value === '('; }
  isCloseParenthesis(type, value) { return type === "PUNCTUATION" && value === ')'; }
  isAssignment(type, value) { return type === "OPERATOR" && (value === '←' || value === '<--'); }
  isDivOrMod(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'div' || v === 'mod'); }
  isOpenBracket(type, value) { return type === "PUNCTUATION" && value === '['; }
  isCloseBracket(type, value) { return type === "PUNCTUATION" && value === ']'; }
  isBoolean(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'vrai' || v === 'faux'); }
  isLogical(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'et' || v === 'ou' || v === 'non'); }
  isComparison(type, value) { return type === "OPERATOR" && (value === '=' || value === '<>' || value === '!=' || value === '≠' || value === '<' || value === '>' || value === '<=' || value === '>=' || value === '≤' || value === '≥'); }
  isMembership(type, value) { return type === "OPERATOR" && value === '∈'; }
  isConditional(type, value) { const v = value.toLowerCase(); return type === "KEYWORD" && (v === 'si' || v === 'alors' || v === 'sinon'); }
  isLoopKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && (v === 'pour' || v === 'de' || v === 'à' || v === 'a' || v === 'faire' || v === 'pas' || v === 'fin' ||
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
  isVarKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && v === 'var';
  }
  isColon(type, value) {
    return type === "PUNCTUATION" && value === ':';
  }
  isReturnKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && (v === 'retourner' || v === 'retourne');
  }
  isFuncProcKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && (v === 'fonction' || v === 'procédure' || v === 'procedure');
  }
  isAlgorithmKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && v === 'algorithme';
  }
  isBeginKeyword(type, value) {
    const v = value.toLowerCase();
    return type === "KEYWORD" && (v === 'début' || v === 'debut');
  }
}


// ──────────────────────────────────────────────
// PARSER (produit un AST)
// ──────────────────────────────────────────────

class Parser {
  constructor(tokens, lexer = null) {
    this.tokens = tokens;
    this.pos = 0;
    this.statements = [];
    this.hasError = false;
    this.lexer = lexer;
    this.parseAll();
  }

  peek(offset = 0) { const idx = this.pos + offset; return idx < this.tokens.length ? this.tokens[idx] : null; }

  errorAtToken(message) {
    const t = this.peek();
    if (t && t.pos !== undefined) {
      if (this.lexer && this.lexer.getPosition) {
        const { line, col } = this.lexer.getPosition(t.pos);
        return `Ligne ${line}, Colonne ${col} : ${message}`;
      }
      return `Ligne 0, Colonne 0 : ${message}`;
    }
    return `Ligne 0, Colonne 0 : ${message}`;
  }

  consume() { return this.tokens[this.pos++]; }
  expect(type) {
    const t = this.peek();
    if (!t || t.type !== type) {
      const msg = `Attendu ${type}, obtenu ${t ? t.type + '("' + t.value + '")' : 'fin de fichier'}`;
      throw new Error(this.errorAtToken(msg));
    }
    return this.consume();
  }
  expectValue(type, value) {
    const t = this.peek();
    if (!t || t.type !== type || t.value !== value) {
      const msg = `Attendu ${type}("${value}"), obtenu ${t ? t.type + '("' + t.value + '")' : 'fin de fichier'}`;
      throw new Error(this.errorAtToken(msg));
    }
    return this.consume();
  }
  isEOL() { const t = this.peek(); return t && t.type === 'EOL'; }
  skipEOL() { while (this.isEOL()) this.pos++; }

  parseAll() {
    while (this.pos < this.tokens.length) {
      this.skipEOL();
      if (this.pos >= this.tokens.length) break;
      this.preprocessToken();
      
      const t = this.peek();
      if (!t) break;
      
      if (t.type === 'ALGO_KW' && t.value === 'algorithme') {
        this.statements.push(this.parseAlgorithm());
        continue;
      }
      
      if (t.type === 'FUNC_PROC_KW') {
        if (t.value === 'procédure' || t.value === 'procedure') {
          this.statements.push(this.parseProcedure());
          continue;
        }
        if (t.value === 'fonction') {
          this.statements.push(this.parseFunction());
          continue;
        }
      }
      
      if (t.type === 'BEGIN_KW' && (t.value === 'début' || t.value === 'debut')) {
        this.statements.push(this.parseAlgorithmBody());
        continue;
      }
      
      // Sauter les lignes de documentation (TDNT, TDOG, TDOL, TDO, Objet) → ignorer jusqu'à fin de ligne
      if (t.type === 'IDENTIFIER' && /^TDNT$|^TDOG$|^TDOL$|^TDO$|^objet$/i.test(t.value)) {
        while (this.peek() && !this.isEOL()) this.pos++;
        continue;
      }

      const stmt = this.parseStatement();
      if (stmt) { this.statements.push(stmt); } else { this.pos++; }
    }
  }

  isSectionHeader() {
    const t = this.peek();
    if (!t) return true;
    if (t.type === 'ALGO_KW') return true;
    if (t.type === 'FUNC_PROC_KW') return true;
    if (t.type === 'BEGIN_KW') return true;
    if (t.type === 'IDENTIFIER' && /^TDN?T$|^TDOG?$|^TDOL?$|^TDO$/.test(t.value.toUpperCase())) return true;
    return false;
  }

  // ── Sauter les lignes de documentation ──
  skipDocLines() {
    while (true) {
      this.skipEOL();
      const t = this.peek();
      if (!t || t.type !== 'IDENTIFIER') break;
      if (!/^TDNT$|^TDOG$|^TDOL$|^TDO$|^objet$/i.test(t.value)) break;
      while (this.peek() && !this.isEOL()) {
        this.pos++;
      }
    }
  }

  skipToBegin() {
    this.skipDocLines();
    const decls = [];
    while (this.peek() && (this.peek().type === 'VAR_KW' || (this.peek().type === 'TYPE_DECL' && this.peek().value === 'type'))) {
      if (this.peek().type === 'VAR_KW') {
        decls.push(this.parseVarDeclaration());
      } else {
        decls.push(this.parseTypeDeclaration());
      }
      this.skipDocLines();
    }
    this.skipDocLines();
    this.expectBegin();
    this.skipEOL();
    return decls;
  }

  expectBegin() {
    const t = this.peek();
    if (!t || t.type !== 'BEGIN_KW' || (t.value !== 'début' && t.value !== 'debut')) {
      throw new Error(this.errorAtToken(`Attendu BEGIN_KW("début"|"debut"), obtenu ${t ? t.type + '("' + t.value + '")' : 'fin de fichier'}`));
    }
    return this.consume();
  }

  parseAlgorithm() {
    this.expectValue('ALGO_KW', 'algorithme'); this.skipEOL();
    const name = this.expect('IDENTIFIER').value; this.skipEOL();
    const decls = this.skipToBegin();
    const body = this.parseBodyUntil(['fin']);
    this.expectValue('LOOP', 'fin'); this.skipEOL();
    return { type: 'algorithm', name, body: [...decls, ...body] };
  }

  parseAlgorithmBody() {
    const decls = this.skipToBegin();
    const body = this.parseBodyUntil(['fin']);
    this.expectValue('LOOP', 'fin'); this.skipEOL();
    return { type: 'algorithm', name: null, body: [...decls, ...body] };
  }

  parseProcedure() {
    this.consume(); this.skipEOL();
    const name = this.expect('IDENTIFIER').value; this.skipEOL();
    let params = [];
    if (this.peek() && this.peek().type === 'OPEN_PAR') {
      this.consume(); this.skipEOL();
      params = this.parseProcFuncParams();
      this.expect('CLOSE_PAR'); this.skipEOL();
    }
    const decls = this.skipToBegin();
    const body = this.parseBodyUntil(['fin']);
    this.expectValue('LOOP', 'fin'); this.skipEOL();
    return { type: 'procedureDef', name, params, body: [...decls, ...body] };
  }

  parseFunction() {
    this.consume(); this.skipEOL();
    const name = this.expect('IDENTIFIER').value; this.skipEOL();
    let params = [];
    if (this.peek() && this.peek().type === 'OPEN_PAR') {
      this.consume(); this.skipEOL();
      params = this.parseProcFuncParams();
      this.expect('CLOSE_PAR'); this.skipEOL();
    }
    let returnType = null;
    if (this.peek() && this.peek().type === 'COLON') {
      this.consume(); this.skipEOL();
      if (this.peek() && this.peek().type === 'TYPE_KW') {
        returnType = this.consume().value;
      } else if (this.peek() && this.peek().type === 'IDENTIFIER') {
        returnType = this.consume().value;
      }
    }
    const decls = this.skipToBegin();
    const body = this.parseBodyUntil(['fin']);
    this.expectValue('LOOP', 'fin'); this.skipEOL();
    return { type: 'functionDef', name, params, returnType, body: [...decls, ...body] };
  }

  parseProcFuncParams() {
    const params = [];
    while (this.peek() && this.peek().type !== 'CLOSE_PAR') {
      this.skipEOL();
      if (!this.peek() || this.peek().type === 'CLOSE_PAR') break;
      const byRef = (this.peek() && this.peek().type === 'OPERATOR' && this.peek().value === '@');
      if (byRef) this.consume();
      const paramName = this.expect('IDENTIFIER').value; this.skipEOL();
      let paramType = null;
      if (this.peek() && this.peek().type === 'COLON') {
        this.consume(); this.skipEOL();
        if (this.peek() && this.peek().type === 'TYPE_KW') {
          paramType = this.consume().value;
        } else if (this.peek() && this.peek().type === 'IDENTIFIER') {
          paramType = this.consume().value;
        }
      }
      params.push({ name: paramName, type: paramType, byRef });
      this.skipEOL();
      if (this.peek() && this.peek().type === 'PUNCTUATION' && this.peek().value === ',') { this.consume(); this.skipEOL(); }
      else break;
    }
    return params;
  }

  preprocessToken() {
    this.normalizeCompoundKeyword();
  }

  parseStatement() {
    this.preprocessToken();

    if (this.peek() && this.peek().type === 'TYPE_DECL' && this.peek().value === 'type') {
      return this.parseTypeDeclaration();
    }
    if (this.peek() && this.peek().type === 'VAR_KW') {
      return this.parseVarDeclaration();
    }
    if (this.peek() && this.peek(1) && this.peek(2) && 
        this.peek().type === 'IDENTIFIER' && this.peek(1).type === 'COLON' && 
        (this.peek(2).type === 'TYPE_KW' || this.peek(2).type === 'IDENTIFIER')) {
      return this.parseImplicitVarDeclaration();
    }
    if (this.peek() && this.peek(1) && this.peek(2) && this.peek(3) && this.peek(4) &&
        this.peek().type === 'IDENTIFIER' && 
        this.peek(1).type === 'COMPARISON' && this.peek(1).value === '=' && 
        this.peek(2).type === 'TYPE_KW' && this.peek(2).value === 'tableau' &&
        this.peek(3).type === 'LOOP' && this.peek(3).value === 'de' &&
        (this.peek(4).type === 'NUMBER' || this.peek(4).type === 'TYPE_KW' || this.peek(4).type === 'IDENTIFIER')) {
      return this.parseImplicitTypeDeclaration();
    }
    if (this.peek() && this.peek().type === 'LOOP') {
      if (this.peek().value === 'pour') return this.parseForLoop();
      if (this.peek().value === 'tant') return this.parseTantQue();
      if (this.peek().value === 'répéter' || this.peek().value === 'repeter') return this.parseRepeter();
    }
    if (this.peek() && this.peek().type === 'CONDITIONAL' && this.peek().value === 'si') return this.parseConditional();
    if (this.peek() && this.peek().type === 'RETURN_KW') return this.parseReturn();
    if (this.peek() && this.peek(1) && this.peek().type === 'IDENTIFIER' && 
        (this.peek(1).type === 'ASSIGNMENT' || this.peek(1).type === 'OPEN_BRACKET')) return this.parseAssignment();
    if (this.peek() && this.peek(1) && this.peek().type === 'IDENTIFIER' && this.peek(1).type === 'OPEN_PAR') return this.parseFunctionCallStmt();

    const cur = this.peek();
    if (cur && cur.type !== 'EOL') {
      throw new Error(this.errorAtToken(`Token inattendu : "${cur.value}" (type: ${cur.type})`));
    }
    return null;
  }

  parseReturn() {
    this.consume();
    const expr = this.parseExpression();
    return { type: 'return', expression: expr };
  }

  parseTypeDeclaration() {
    this.expectValue('TYPE_DECL', 'type'); this.skipEOL();
    const typeName = this.expect('IDENTIFIER').value; this.skipEOL();
    const t = this.peek();
    if (t && t.type === 'COMPARISON' && t.value === '=') {
      this.consume(); this.skipEOL();
    } else {
      this.expect('ASSIGNMENT'); this.skipEOL();
    }
    if (this.peek() && this.peek().type === 'TYPE_KW' && this.peek().value === 'tableau') {
      this.consume(); this.skipEOL();
    }
    this.expectValue('LOOP', 'de'); this.skipEOL();
    const sizeToken = this.peek();
    if (!sizeToken || sizeToken.type !== 'NUMBER' || sizeToken.value.indexOf('.') !== -1) {
      throw new Error(`La taille du tableau doit être une constante entière, obtenu : ${sizeToken ? sizeToken.value : 'rien'}`);
    }
    const arraySize = parseInt(sizeToken.value, 10);
    this.consume(); this.skipEOL();
    const elementType = this.expect('TYPE_KW').value;
    return { type: 'typeDeclaration', typeName, arraySize, elementType };
  }

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
        varType = this.consume().value;
      } else if (this.peek() && this.peek().type === 'IDENTIFIER') {
        typeName = this.consume().value;
      }
    }
    return { type: 'varDeclaration', varNames, varType, typeName };
  }

  parseImplicitVarDeclaration() {
    const varNames = [this.expect('IDENTIFIER').value]; this.skipEOL();
    this.expect('COLON'); this.skipEOL();
    let varType = null;
    let typeName = null;
    if (this.peek() && this.peek().type === 'TYPE_KW') {
      varType = this.consume().value;
    } else if (this.peek() && this.peek().type === 'IDENTIFIER') {
      typeName = this.consume().value;
    }
    return { type: 'varDeclaration', varNames, varType, typeName };
  }

  parseImplicitTypeDeclaration() {
    const typeName = this.expect('IDENTIFIER').value; this.skipEOL();
    this.expect('COMPARISON'); this.skipEOL();
    this.consume(); this.skipEOL();
    this.expectValue('LOOP', 'de'); this.skipEOL();
    const sizeToken = this.peek();
    if (!sizeToken || sizeToken.type !== 'NUMBER' || sizeToken.value.indexOf('.') !== -1) {
      throw new Error(`La taille du tableau doit être une constante entière, obtenu : ${sizeToken ? sizeToken.value : 'rien'}`);
    }
    const arraySize = parseInt(sizeToken.value, 10);
    this.consume(); this.skipEOL();
    const elementType = this.expect('TYPE_KW').value;
    return { type: 'typeDeclaration', typeName, arraySize, elementType };
  }

  parseForLoop() {
    this.expectValue('LOOP', 'pour'); this.skipEOL();
    const varName = this.expect('IDENTIFIER').value; this.skipEOL();
    this.expectValue('LOOP', 'de'); this.skipEOL();
    const start = this.parseExpression(); this.skipEOL();
    if (this.peek() && this.peek().type === 'IDENTIFIER' && this.peek().value.toLowerCase() === 'a') {
      this.consume();
    } else {
      this.expectValue('LOOP', 'à');
    }
    this.skipEOL();
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
    if (this.peek() && this.peek().type === 'LOOP' && this.peek().value === 'tant') {
      this.consume(); this.skipEOL();
      if (this.peek() && this.peek().type === 'LOOP' && this.peek().value === 'que') {
        this.consume();
      }
    }
    return { type: 'whileLoop', condition, body };
  }

  parseRepeter() {
    this.consume();
    this.skipEOL();
    const body = this.parseBodyUntil(['jusqu\'à', 'jusqu\'a', 'jusqua', 'jusquà']);
    this.skipEOL();
    if (this.peek() && this.peek().type === 'LOOP') {
      this.consume();
    }
    this.skipEOL();
    const condition = this.parseExpression();
    return { type: 'repeatLoop', condition, body };
  }

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

  normalizeCompoundKeyword() {
    if (!this.peek() || this.peek().type !== 'IDENTIFIER') return false;
    const v = this.peek().value.toLowerCase();
    if (v === 'finsi') {
      this.tokens.splice(this.pos, 1,
        { type: 'LOOP', value: 'fin' },
        { type: 'CONDITIONAL', value: 'si' }
      );
      return true;
    }
    if (v === 'fintantque' || v === 'fintant') {
      this.tokens.splice(this.pos, 1,
        { type: 'LOOP', value: 'fin' },
        { type: 'LOOP', value: 'tant' },
        { type: 'LOOP', value: 'que' }
      );
      return true;
    }
    if (v === 'finpour') {
      this.tokens.splice(this.pos, 1,
        { type: 'LOOP', value: 'fin' },
        { type: 'LOOP', value: 'pour' }
      );
      return true;
    }
    if (v === 'finprocedure' || v === 'finprocédure' || v === 'finfonction') {
      this.tokens.splice(this.pos, 1,
        { type: 'LOOP', value: 'fin' }
      );
      return true;
    }
    return false;
  }

  parseBodyUntil(stopKeywords) {
    const body = [];
    while (this.pos < this.tokens.length) {
      this.skipEOL();
      if (!this.peek()) break;
      this.normalizeCompoundKeyword();
      const v = this.peek().value;
      const t = this.peek().type;

      if ((t === 'CONDITIONAL' || t === 'LOOP') && stopKeywords.includes(v)) break;
      if (t === 'LOOP' && v === 'fin') break;
      if (t === 'RETURN_KW' && v === 'retourner') { body.push(this.parseReturn()); continue; }

      if (t === 'CONDITIONAL' && v === 'si') { body.push(this.parseConditional()); continue; }
      if (t === 'LOOP') {
        if (v === 'pour') { body.push(this.parseForLoop()); continue; }
        if (v === 'tant') { body.push(this.parseTantQue()); continue; }
        if (v === 'répéter' || v === 'repeter') { body.push(this.parseRepeter()); continue; }
      }

      if (t === 'TYPE_DECL' && v === 'type') { body.push(this.parseTypeDeclaration()); continue; }
      if (t === 'VAR_KW') { body.push(this.parseVarDeclaration()); continue; }

      const stmt = this.parseStatement();
      if (stmt) { body.push(stmt); } else { this.pos++; }
    }
    return body;
  }

  parseAssignment() {
    const varName = this.expect('IDENTIFIER').value;
    if (this.peek() && this.peek().type === 'OPEN_BRACKET') {
      let expr = this.parseIndexAccess(varName);
      while (this.peek() && this.peek().type === 'OPEN_BRACKET') {
        expr = this.parseIndexAccessOnExpr(expr);
      }
      this.expect('ASSIGNMENT');
      const value = this.parseExpression();
      return { type: 'arrayAssignment', target: expr, value };
    }
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
      
      // Handle named parameters like sep=":" or fin="-"
      // sep is an IDENTIFIER, fin is a LOOP keyword  
      const t = this.peek();
      if (t && t.type === 'LOOP' && 
          this.peek(1) && this.peek(1).type === 'COMPARISON' && this.peek(1).value === '=') {
        // For keyword parameters like fin, consume and create synthetic binary node
        const paramName = this.consume().value; // consume the LOOP keyword
        this.expect('COMPARISON'); // consume the '=' sign
        const rightVal = this.parseAtom();
        args.push({ type: 'binary', operator: '=', 
          left: { type: 'identifier', name: paramName }, 
          right: rightVal
        });
        this.skipEOL();
        if (this.peek() && this.peek().type === 'PUNCTUATION' && this.peek().value === ',') { this.consume(); }
        else break;
        continue;
      }
      
      args.push(this.parseExpression());
      this.skipEOL();
      if (this.peek() && this.peek().type === 'PUNCTUATION' && this.peek().value === ',') { this.consume(); }
      else break;
    }
    return args;
  }

  parseExpression() { return this.parseOu(); }

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
    const chainParts = [];
    while (this.peek() && this.peek().type === 'COMPARISON') {
      const op = this.consume().value; this.skipEOL();
      const right = this.parseAddSub();
      chainParts.push({ left, op, right });
      left = right;
    }
    if (chainParts.length === 0) return left;
    if (chainParts.length === 1) {
      return { type: 'binary', operator: chainParts[0].op, left: chainParts[0].left, right: chainParts[0].right };
    }
    let result = { type: 'binary', operator: chainParts[0].op, left: chainParts[0].left, right: chainParts[0].right };
    for (let i = 1; i < chainParts.length; i++) {
      const part = chainParts[i];
      const node = { type: 'binary', operator: part.op, left: part.left, right: part.right };
      result = { type: 'binary', operator: 'et', left: result, right: node };
    }
    return result;
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
      if (this.peek() && this.peek().type === 'OPEN_BRACKET') {
        let expr = this.parseIndexAccess(name);
        while (this.peek() && this.peek().type === 'OPEN_BRACKET') {
          expr = this.parseIndexAccessOnExpr(expr);
        }
        return expr;
      }
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
  constructor(config = {}) {
    if (typeof config === 'object' && !Array.isArray(config) && config !== null && !('_isLegacy' in config)) {
      this.variables = config.variables || {};
      this.varTypes = config.varTypes || {};
      this.outputFn = config.outputFn || function() {};
      this.inputFn = config.inputFn || function(prompt) {
        return Promise.resolve(console.log('Entrez une valeur :') || '');
      };
      this.userTypes = config.userTypes || {};
      this.userFunctions = config.userFunctions || {};
      this.userProcedures = config.userProcedures || {};
      this.currentReturn = undefined;
      this.returned = false;
      // Step mode support
      this.stepMode = config.stepMode || false;
      this._stepResolve = null;
    } else {
      const args = Array.from(arguments);
      this.variables = args[0] || {};
      this.varTypes = {};
      this.outputFn = args[1] || function() {};
      this.inputFn = args[3] || function(prompt) {
        return Promise.resolve(console.log('Entrez une valeur :') || '');
      };
      this.userTypes = args[4] || {};
      this.userFunctions = {};
      this.userProcedures = {};
      this.currentReturn = undefined;
      this.returned = false;
      this.stepMode = false;
      this._stepResolve = null;
    }
  }

  /**
   * Wait for resumeStep() to be called (when in stepMode)
   */
  async _waitForStep() {
    if (!this.stepMode) return;
    return new Promise((resolve) => {
      this._stepResolve = resolve;
    });
  }

  /**
   * Resume execution after a step
   */
  resumeStep() {
    if (this._stepResolve) {
      this._stepResolve();
      this._stepResolve = null;
    }
  }

  async evaluateProgram(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, lexer);
    if (parser.hasError) {
      throw new Error('Erreur de parsing');
    }
    const outputs = [];
    const origOutput = this.outputFn;
    this.outputFn = (text) => {
      outputs.push(text);
      if (origOutput) origOutput(text);
    };
    
    const mainStatements = [];
    let hasAlgorithmBlock = false;
    
    for (const stmt of parser.statements) {
      if (stmt.type === 'algorithm') {
        hasAlgorithmBlock = true;
        mainStatements.push(stmt);
      } else if (stmt.type === 'functionDef' || stmt.type === 'procedureDef') {
        await this.evaluate(stmt);
      } else {
        if (!hasAlgorithmBlock) {
          mainStatements.push(stmt);
        }
      }
    }
    
    for (const stmt of mainStatements) {
      await this.evaluate(stmt);
    }
    return outputs;
  }

  static async run(code, config = {}) {
    const evaluator = new Evaluator(config);
    return evaluator.evaluateProgram(code);
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

  showVariablesState() {
    if (!this.outputFn) return;
    const entries = Object.entries(this.variables).filter(([k]) => !k.startsWith('_'));
    if (entries.length === 0) {
      this.outputFn('<span class="step-state">📊 Variables : (aucune)</span>');
      return;
    }
    const parts = entries.map(([k, v]) => {
      if (Array.isArray(v)) {
        return k + ' = [' + v.map(el => this.formatValue(el)).join(', ') + ']';
      }
      return k + ' = ' + this.formatValue(v);
    });
    this.outputFn('<span class="step-state">📊 Variables : ' + parts.join(', ') + '</span>');
  }

  async evaluate(node) {
    if (!node) return null;
    
    // In step mode, wait after each statement-level evaluation
    const isStepStatement = this.stepMode && (
      node.type === 'assignment' ||
      node.type === 'arrayAssignment' ||
      node.type === 'varDeclaration' ||
      node.type === 'typeDeclaration' ||
      node.type === 'functionCall' ||
      node.type === 'return'
    );

    if (isStepStatement) {
      await this._waitForStep();
    }

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
        const nameLower = node.funcName.toLowerCase();
        if (nameLower === 'lire') {
          return await this.callFunctionLire(node);
        }
        if (nameLower === 'ecrire' || nameLower === 'écrire') {
          return await this.callFunctionEcrire(node);
        }
        
        if (this.userProcedures[nameLower]) {
          return await this.callUserProcedure(node);
        }
        
        if (this.userFunctions[nameLower]) {
          return await this.callUserFunction(node);
        }
        
        const args = [];
        for (const a of node.args) {
          args.push(await this.evaluate(a));
        }
        return await this.callFunction(nameLower, args);
      }
      case 'return': {
        const val = await this.evaluate(node.expression);
        this.currentReturn = val;
        this.returned = true;
        return val;
      }
      case 'algorithm': {
        for (const stmt of node.body) {
          await this.evaluate(stmt);
        }
        return null;
      }
      case 'functionDef': {
        this.userFunctions[node.name.toLowerCase()] = node;
        return null;
      }
      case 'procedureDef': {
        this.userProcedures[node.name.toLowerCase()] = node;
        return null;
      }
      case 'conditional': return await this.evaluateConditional(node);
      case 'forLoop': return await this.evaluateForLoop(node);
      case 'whileLoop': return await this.evaluateWhileLoop(node);
      case 'repeatLoop': return await this.evaluateRepeatLoop(node);
      case 'arrayAssignment': {
        if (this.stepMode) await this._waitForStep();
        return await this.evaluateArrayAssignment(node);
      }
      case 'assignment': {
        const value = await this.evaluate(node.expression);
        this.variables[node.varName] = value;
        return value;
      }
      case 'typeDeclaration': {
        // Stocker avec le nom en minuscules pour éviter les problèmes de casse
        this.userTypes[node.typeName.toLowerCase()] = {
          type: 'array',
          elementType: node.elementType,
          size: node.arraySize
        };
        return null;
      }
      case 'varDeclaration': {
        for (const varName of node.varNames) {
          let value = null;
          let actualType = null;
          if (node.varType) {
            actualType = node.varType;
            value = this.getDefaultValue(node.varType);
          } else if (node.typeName) {
            // Chercher le type en ignorant la casse
            const typeDef = this.userTypes[node.typeName.toLowerCase()];
            if (typeDef && typeDef.type === 'array') {
              actualType = typeDef.elementType;
              const defaultVal = this.getDefaultValue(typeDef.elementType);
              value = new Array(typeDef.size).fill(defaultVal);
            } else {
              value = null;
            }
          }
          this.varTypes[varName] = actualType;
          if (value !== null) {
            this.variables[varName] = value;
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
    if (cond) { for (const stmt of node.thenBody) { await this.evaluate(stmt); if (this.returned) return null; } return null; }
    for (const elseifBranch of node.elseIfBranches) {
      const elseifCond = await this.evaluate(elseifBranch.condition);
      if (elseifCond) { for (const stmt of elseifBranch.body) { await this.evaluate(stmt); if (this.returned) return null; } return null; }
    }
    if (node.elseBody) {
      for (const stmt of node.elseBody) { await this.evaluate(stmt); if (this.returned) return null; }
    }
    return null;
  }

  async evaluateForLoop(node) {
    const start = await this.evaluate(node.start);
    const end = await this.evaluate(node.end);
    let step = null;
    if (node.step !== null) {
      step = await this.evaluate(node.step);
    } else {
      if (start > end) return null;
      step = 1;
    }
    if (step === 0) { this.outputFn("Erreur : le pas ne peut pas être 0"); return null; }
    if (step > 0) {
      for (let i = start; i <= end; i += step) { 
        this.variables[node.varName] = i; 
        for (const stmt of node.body) { 
          await this.evaluate(stmt); 
          if (this.returned) return null;
        } 
      }
    } else {
      for (let i = start; i >= end; i += step) { 
        this.variables[node.varName] = i; 
        for (const stmt of node.body) { 
          await this.evaluate(stmt); 
          if (this.returned) return null;
        } 
      }
    }
    return null;
  }

  async evaluateWhileLoop(node) {
    let cond = await this.evaluate(node.condition);
    while (cond) {
      for (const stmt of node.body) { 
        await this.evaluate(stmt); 
        if (this.returned) return null;
      }
      cond = await this.evaluate(node.condition);
    }
    return null;
  }

  async evaluateRepeatLoop(node) {
    do {
      for (const stmt of node.body) { 
        await this.evaluate(stmt); 
        if (this.returned) return null;
      }
      const cond = await this.evaluate(node.condition);
      if (cond) return null;
    } while (true);
  }

  async evaluateArrayAssignment(node) {
    const value = await this.evaluate(node.value);
    const target = node.target;
    return this.setIndexValue(target, value);
  }

  async setIndexValue(target, value) {
    if (target.type === 'index') {
      const arr = this.variables[target.name];
      const idx = await this.evaluate(target.index);
      if (arr !== undefined && (Array.isArray(arr) || typeof arr === 'string')) {
        arr[idx] = value;
        this.variables[target.name] = arr;
      }
      return value;
    }
    if (target.type === 'indexExpr') {
      const container = await this.evaluate(target.expression);
      const idx = await this.evaluate(target.index);
      if (container !== null && container !== undefined && (Array.isArray(container) || typeof container === 'string')) {
        container[idx] = value;
      }
      if (target.expression.type === 'index') {
        const parentArr = this.variables[target.expression.name];
        const parentIdx = await this.evaluate(target.expression.index);
        if (Array.isArray(parentArr)) {
          parentArr[parentIdx] = container;
          this.variables[target.expression.name] = parentArr;
        }
      }
      return value;
    }
    return value;
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
      case '<=': case '≤': return left <= right;
      case '>=': case '≥': return left >= right;
      case 'et': return left && right;
      case 'ou': return left || right;
      default: return null;
    }
  }

  mod(a, b) { return ((a % b) + b) % b; }

  async callUserProcedure(node) {
    const procDef = this.userProcedures[node.funcName.toLowerCase()];
    if (!procDef) throw new Error(`Procédure inconnue : ${node.funcName}`);
    
    const savedVars = {...this.variables};
    const savedTypes = {...this.varTypes};
    
    const byRefOrigins = {};
    if (procDef.params && node.args) {
      for (let i = 0; i < procDef.params.length && i < node.args.length; i++) {
        const param = procDef.params[i];
        const arg = node.args[i];
        if (param.byRef) {
          if (arg.type === 'identifier') {
            const origName = arg.name;
            this.variables[param.name] = savedVars[origName];
            byRefOrigins[param.name] = origName;
          } else {
            this.variables[param.name] = await this.evaluate(arg);
          }
        } else {
          this.variables[param.name] = await this.evaluate(arg);
        }
      }
    }
    
    for (const stmt of procDef.body) {
      await this.evaluate(stmt);
    }
    
    for (const [localName, origName] of Object.entries(byRefOrigins)) {
      savedVars[origName] = this.variables[localName];
    }
    
    for (const key of Object.keys(this.variables)) {
      if (!(key in byRefOrigins)) {
        delete this.variables[key];
      }
    }
    for (const [key, val] of Object.entries(savedVars)) {
      this.variables[key] = val;
    }
    for (const key of Object.keys(this.varTypes)) {
      if (!(key in byRefOrigins)) {
        delete this.varTypes[key];
      }
    }
    for (const [key, val] of Object.entries(savedTypes)) {
      this.varTypes[key] = val;
    }
    
    return null;
  }

  async callUserFunction(node) {
    const funcDef = this.userFunctions[node.funcName.toLowerCase()];
    if (!funcDef) throw new Error(`Fonction inconnue : ${node.funcName}`);
    
    const savedVars = {...this.variables};
    const savedTypes = {...this.varTypes};
    
    const byRefOrigins = {};
    if (funcDef.params && node.args) {
      for (let i = 0; i < funcDef.params.length && i < node.args.length; i++) {
        const param = funcDef.params[i];
        const arg = node.args[i];
        if (param.byRef) {
          if (arg.type === 'identifier') {
            const origName = arg.name;
            this.variables[param.name] = savedVars[origName];
            byRefOrigins[param.name] = origName;
          } else {
            this.variables[param.name] = await this.evaluate(arg);
          }
        } else {
          this.variables[param.name] = await this.evaluate(arg);
        }
      }
    }
    
    this.returned = false;
    this.currentReturn = undefined;
    for (const stmt of funcDef.body) {
      await this.evaluate(stmt);
      if (this.returned) break;
    }
    
    const result = this.currentReturn;
    this.returned = false;
    this.currentReturn = undefined;
    
    for (const [localName, origName] of Object.entries(byRefOrigins)) {
      savedVars[origName] = this.variables[localName];
    }
    
    for (const key of Object.keys(this.variables)) {
      if (!(key in byRefOrigins)) {
        delete this.variables[key];
      }
    }
    for (const [key, val] of Object.entries(savedVars)) {
      this.variables[key] = val;
    }
    for (const key of Object.keys(this.varTypes)) {
      if (!(key in byRefOrigins)) {
        delete this.varTypes[key];
      }
    }
    for (const [key, val] of Object.entries(savedTypes)) {
      this.varTypes[key] = val;
    }
    
    return result;
  }

  async callFunctionLire(node) {
    if (!node.args || node.args.length === 0) {
      const value = await this.inputFn('Entrez une valeur :');
      return value;
    }

    const firstArg = node.args[0];

    if (firstArg.type === 'identifier') {
      const varName = firstArg.name;
      const raw = await this.inputFn('Entrez la valeur de ' + varName + ' :');
      const varType = this.varTypes[varName] || null;
      const value = varType ? this.convertToType(raw, varType) : raw;
      this.variables[varName] = value;
      return value;
    }

    if (firstArg.type === 'index') {
      const arrayName = firstArg.name;
      const idx = await this.evaluate(firstArg.index);
      const raw = await this.inputFn('Entrez la valeur de ' + arrayName + '[' + idx + '] :');
      const varType = this.varTypes[arrayName] || null;
      const value = varType ? this.convertToType(raw, varType) : raw;
      if (Array.isArray(this.variables[arrayName])) {
        this.variables[arrayName][idx] = value;
      }
      return value;
    }

    const value = await this.inputFn('Entrez une valeur :');
    return value;
  }

  writeStdout(...args) {
    const s = args.filter(x => x !== undefined).join(' ');
    if (this.outputFn) this.outputFn(s);
    return null;
  }

  async callFunctionEcrire(node) {
    let separator = ' ';
    let end = '\n';
    const values = [];
    for (const arg of node.args) {
      if (arg.type === 'binary' && arg.operator === '=' && arg.left.type === 'identifier') {
        const paramName = arg.left.name.toLowerCase();
        const paramValue = await this.evaluate(arg.right);
        if (paramName === 'sep') {
          separator = String(paramValue);
        } else if (paramName === 'fin') {
          end = String(paramValue);
        }
        continue;
      }
      const val = await this.evaluate(arg);
      values.push(val !== undefined && val !== null ? String(val) : '');
    }
    const output = values.join(separator) + end;
    if (this.outputFn) this.outputFn(output);
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
      'aléa':         (a, b) => Math.floor(Math.random() * (b - a + 1) + a),
      'abs':          (x) => Math.abs(x),
      'ent':          (x) => parseInt(x),
      'long':         (ch) => (typeof ch === 'string' ? ch.length : String(ch).length),
      'pos':          (ch1, ch2) => (typeof ch2 === 'string' ? ch2.indexOf(ch1) : -1),
      'convch':       (x) => String(x),
      'valeur':       (ch) => Number(ch),
      'sous_chaine':  (ch, d, f) => ((typeof ch === 'string' && d <= f) ? ch.substring(d, f) : ''),
      'effacer':      (ch, d, f) => (typeof ch === 'string' ? (f >= d ? ch.substring(0, d) + ch.substring(f) : ch) : ch),
      'majus':        (ch) => (typeof ch === 'string' ? ch.toUpperCase() : String(ch).toUpperCase()),
      'estnum':       (ch) => { if (typeof ch !== 'string') return false; for (let c of ch) { if (c < '0' || c > '9') return false; } return ch.length > 0; },
      'lire':         () => this.inputFn('Entrez une valeur :'),
    };
    const fn = functionMap[normalized] || functionMap[name.toLowerCase()] || functionMap[name];
    if (fn) return await fn(...args);
    throw new Error(`Fonction inconnue : ${name}`);
  }
}