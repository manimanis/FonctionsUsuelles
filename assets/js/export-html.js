/**
 * Export Algorithm to HTML
 * 
 * Generates a standalone HTML page containing the algorithm code
 * from the CodeMirror editor with syntax coloring preserved,
 * and opens it in a new tab. Additionally generates TDOL
 * (Tableau de Déclaration des Objets) for each module,
 * placed immediately after the corresponding module's code.
 */

// ── Known built-in functions ──
const BUILTIN_FUNCTIONS = new Set([
  'chr', 'ord', 'arrondi', 'racine', 'alea', 'aléa', 'abs', 'ent',
  'long', 'pos', 'convch', 'estnum', 'valeur', 'sous_chaine', 'effacer', 'majus',
  'ecrire', 'écrire', 'lire'
]);

// ── Known built-in types ──
const BUILTIN_TYPES = new Set([
  'entier', 'réel', 'reel', 'booléen', 'booleen', 'chaîne', 'chaine', 'caractère', 'caractere'
]);

/**
 * Collect the set of user-defined module names from parsed statements.
 */
function collectUserModules(statements) {
  const names = new Set();
  for (const stmt of statements) {
    if (stmt.type === 'procedureDef' || stmt.type === 'functionDef') {
      names.add(stmt.name.toLowerCase());
    }
    if (stmt.type === 'algorithm') {
      for (const s of stmt.body) {
        if (s.type === 'procedureDef' || s.type === 'functionDef') {
          names.add(s.name.toLowerCase());
        }
      }
    }
  }
  return names;
}

/**
 * Collect all objects (variables and module calls) used in a list of AST statements.
 * @param {Array} body - Array of AST statement nodes
 * @param {Set} userModules - Set of user-defined module names (lowercase)
 * @param {Set} paramNames - Set of parameter names to exclude (lowercase)
 * @returns {Object} { variables: {name: type|null}[], modules: {name: type}[] }
 */
function collectObjects(body, userModules, paramNames) {
  const localVars = {};    // { name: type|null }
  const localModules = {}; // { name: 'procédure'|'fonction' }

  function addVar(name, type) {
    const key = name.toLowerCase();
    if (!paramNames.has(key)) {
      if (localVars[key] === undefined) {
        localVars[key] = type || null;
      }
    }
  }

  function addModule(name) {
    const key = name.toLowerCase();
    if (!localModules[key]) {
      localModules[key] = true;
    }
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'varDeclaration':
        for (const vn of node.varNames) {
          const type = node.varType || node.typeName || null;
          addVar(vn, type);
        }
        break;

      case 'assignment':
        addVar(node.varName, null);
        if (node.expression) walk(node.expression);
        break;

      case 'arrayAssignment':
        walk(node.target);
        if (node.value) walk(node.value);
        break;

      case 'functionCall': {
        const lower = node.funcName.toLowerCase();
        if (userModules.has(lower)) {
          addModule(node.funcName);
        }
        for (const arg of (node.args || [])) walk(arg);
        break;
      }

      case 'forLoop':
        addVar(node.varName, 'entier');
        if (node.start) walk(node.start);
        if (node.end) walk(node.end);
        if (node.step) walk(node.step);
        for (const s of (node.body || [])) walk(s);
        break;

      case 'whileLoop':
        if (node.condition) walk(node.condition);
        for (const s of (node.body || [])) walk(s);
        break;

      case 'repeatLoop':
        for (const s of (node.body || [])) walk(s);
        if (node.condition) walk(node.condition);
        break;

      case 'conditional':
        if (node.condition) walk(node.condition);
        for (const s of (node.thenBody || [])) walk(s);
        for (const branch of (node.elseIfBranches || [])) {
          if (branch.condition) walk(branch.condition);
          for (const s of (branch.body || [])) walk(s);
        }
        for (const s of (node.elseBody || [])) walk(s);
        break;

      case 'return':
        if (node.expression) walk(node.expression);
        break;

      case 'identifier':
        addVar(node.name, null);
        break;

      case 'binary':
        if (node.left) walk(node.left);
        if (node.right) walk(node.right);
        break;

      case 'unary':
        if (node.operand) walk(node.operand);
        break;

      case 'index': {
        addVar(node.name, null);
        if (node.index) walk(node.index);
        break;
      }

      case 'indexExpr':
        if (node.expression) walk(node.expression);
        if (node.index) walk(node.index);
        break;

      case 'group':
        if (node.expression) walk(node.expression);
        break;

      case 'number':
      case 'string':
      case 'boolean':
      case 'range':
        break;
    }
  }

  for (const stmt of body) {
    walk(stmt);
  }

  return { variables: localVars, modules: localModules };
}

/**
 * Determine the kind (procédure/fonction) of a user module by its lowercase name.
 */
function getModuleKind(name, statements) {
  const lower = name.toLowerCase();
  for (const stmt of statements) {
    if ((stmt.type === 'procedureDef' || stmt.type === 'functionDef') &&
      stmt.name.toLowerCase() === lower) {
      return stmt.type === 'procedureDef' ? 'procédure' : 'fonction';
    }
    if (stmt.type === 'algorithm') {
      for (const s of stmt.body) {
        if ((s.type === 'procedureDef' || s.type === 'functionDef') &&
          s.name.toLowerCase() === lower) {
          return s.type === 'procedureDef' ? 'procédure' : 'fonction';
        }
      }
    }
  }
  return 'procédure';
}

/**
 * Build TDOL data for a single module.
 * Returns grouped objects: variables with the same type are combined.
 * @returns {{ moduleName, moduleKind, groups: [{ objet, type, isModule }] }}
 */
function buildModuleTDOL(stmt, allStatements) {
  let moduleName = null;
  let moduleKind = null;
  let params = [];
  let body = [];

  if (stmt.type === 'procedureDef') {
    moduleName = stmt.name;
    moduleKind = 'procédure';
    params = stmt.params || [];
    body = stmt.body || [];
  } else if (stmt.type === 'functionDef') {
    moduleName = stmt.name;
    moduleKind = 'fonction';
    params = stmt.params || [];
    body = stmt.body || [];
  } else if (stmt.type === 'algorithm') {
    moduleName = stmt.name || 'Principal';
    moduleKind = 'algorithme';
    params = [];
    body = stmt.body || [];
  } else {
    return null;
  }

  const userModules = collectUserModules(allStatements);

  const paramNames = new Set();
  for (const p of params) {
    paramNames.add(p.name.toLowerCase());
  }

  const { variables, modules } = collectObjects(body, userModules, paramNames);

  // ── Group variables by type ──
  // Map: type → [varName1, varName2, ...]
  const groupsByType = {};
  const sortedVarNames = Object.keys(variables).sort((a, b) => a.localeCompare(b));
  for (const vn of sortedVarNames) {
    const type = variables[vn] || '—';
    if (!groupsByType[type]) groupsByType[type] = [];
    groupsByType[type].push(vn);
  }

  const groups = [];

  // 1. Variable groups (sorted by type alphabetically)
  const sortedTypes = Object.keys(groupsByType).sort((a, b) => a.localeCompare(b));
  for (const type of sortedTypes) {
    const varNames = groupsByType[type];
    if (type === '—') {
      // Unknown type: each variable on its own row
      for (const vn of varNames) {
        groups.push({ objet: vn, type: '—', isModule: false });
      }
    } else {
      // Known type: group together with comma separation
      groups.push({ objet: varNames.join(', '), type: type, isModule: false });
    }
  }

  // 2. Non-standard modules called (sorted alphabetically) — each on its own row
  const sortedModNames = Object.keys(modules).sort((a, b) => a.localeCompare(b));
  for (const mn of sortedModNames) {
    const kind = getModuleKind(mn, allStatements);
    groups.push({
      objet: mn,
      type: kind,
      isModule: true
    });
  }

  return { moduleName, moduleKind, groups };
}

/**
 * Build the HTML of a single TDOL table for a module.
 */
function buildTDOLHtml(stmt, allStatements, escHtml) {
  const data = buildModuleTDOL(stmt, allStatements);
  if (!data) return '';

  const kind = data.moduleKind === 'algorithme' ? 'TDOG' : 'TDOL';

  let html = '';
  html += `<div>\n`;
  html += `<h4 align="center">${kind}</h4>\n`;

  if (data.groups.length === 0) {
    html += `<p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:0.85rem;color:#718096;font-style:italic;margin:0.3rem 0;">Aucun objet local (hors paramètres).</p>\n`;
  } else {
    html += `<table align="center" style="border-collapse:collapse;width:8cm;margin:0 auto;font-family:'JetBrains Mono','Fira Code','Consolas',monospace;font-size:10pt;border:2px solid black;">\n`;
    html += `<thead><tr style="background:#e8ecf0;">`;
    html += `<th width="50%" style="border:1px solid black;padding:4px;font-weight:600;">Objet</th>`;
    html += `<th width="50%" style="border:1px solid black;padding:4px;font-weight:600;">Type/Nature</th>`;
    html += `</tr></thead>\n`;
    html += `<tbody>\n`;

    for (const grp of data.groups) {
      let typeColor = '#1a202c';
      if (grp.isModule) {
        typeColor = '#7c3aed';
      } else if (BUILTIN_TYPES.has(grp.type.toLowerCase())) {
        typeColor = '#2563eb';
      }
      html += `<tr>`;
      html += `<td width="50%" align="center" style="border:1px solid black;padding:4px;color:#1a202c;">${escHtml(grp.objet)}</td>`;
      html += `<td width="50%" align="center" style="border:1px solid black;padding:4px;color:${typeColor};font-weight:${grp.isModule ? 600 : 400};">${escHtml(grp.type)}</td>`;
      html += `</tr>\n`;
    }

    html += `</tbody>\n</table>\n`;
  }

  html += `</div>\n`;
  return html;
}

function exportAlgorithmToHTML() {
  // Get the CodeMirror editor instance
  if (!editor) return;

  const code = editor.getValue();
  const title = 'Algorithme exporté';

  // ── Helper ──
  function escHtml(s) {
    var lt = String.fromCharCode(108, 116);
    var gt = String.fromCharCode(103, 116);
    var amp = String.fromCharCode(97, 109, 112);
    return s.replace(/[<>&]/g, function (m) {
      if (m === '<') return '&' + lt + ';';
      if (m === '>') return '&' + gt + ';';
      return '&' + amp + ';';
    });
  }

  // ── Get the colored HTML lines from CodeMirror ──
  const codeWrapper = editor.getWrapperElement();
  const codeMirrorCode = codeWrapper.querySelector('.CodeMirror-code');
  let coloredLineFragments = [];
  if (codeMirrorCode) {
    const clone = codeMirrorCode.cloneNode(true);
    const lines = clone.querySelectorAll('.CodeMirror-line');
    for (const line of lines) {
      coloredLineFragments.push(line.innerHTML);
    }
  }

  // If we couldn't extract syntax HTML, fall back to plain text
  if (coloredLineFragments.length === 0) {
    coloredLineFragments = code.split('\n').map(l => escHtml(l));
  }

  // ── Parse the code to build the TDOL sections ──
  let tdolSectionData = [];
  let parseError = false;
  try {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, lexer);
    const statements = parser.statements;

    // Build TDOL data for each module statement
    for (const stmt of statements) {
      if (stmt.type === 'procedureDef' || stmt.type === 'functionDef' || stmt.type === 'algorithm') {
        const data = buildModuleTDOL(stmt, statements);
        if (data) {
          tdolSectionData.push({
            stmt: stmt,
            data: data
          });
        }
      }
    }
  } catch (e) {
    parseError = true;
  }

  // ── Build the interleaved HTML ──
  // We match modules to code line ranges by scanning the code.
  // Each module header (Fonction/Procédure/Algorithme) marks a boundary.

  // Step 1: determine which original source lines belong to each section
  const sourceLines = code.split('\n');

  // Determine section boundaries by scanning for module headers
  // A section starts at a module header or at line 0, and ends before the next
  // module header or EOF.
  const moduleHeaders = [];
  for (let i = 0; i < sourceLines.length; i++) {
    const trimmed = sourceLines[i].trim();
    // Match "Procedure ...", "Fonction ...", "Algorithme ..." at line start
    if (/^(Procédure|Procedure|Fonction|Algorithme)\b/i.test(trimmed)) {
      moduleHeaders.push({ lineIndex: i, text: trimmed });
    }
  }

  // Build sections: each is { startLine, endLineExclusive, isModule, headerText }
  const sections = [];
  let prevLine = 0;
  let headerIdx = 0;

  for (const header of moduleHeaders) {
    if (header.lineIndex > prevLine) {
      sections.push({
        startLine: prevLine,
        endLineExclusive: header.lineIndex,
        isModule: false,
        headerText: null
      });
    }
    // Find where this module ends: search for "Fin" at the right indentation level
    // or until the next module header / end of file
    let endLine = sourceLines.length;
    for (let j = header.lineIndex + 1; j < sourceLines.length; j++) {
      const l = sourceLines[j].trim();
      if (/^(Procédure|Procedure|Fonction|Algorithme)\b/i.test(l)) {
        endLine = j;
        break;
      }
    }
    sections.push({
      startLine: header.lineIndex,
      endLineExclusive: endLine,
      isModule: true,
      headerText: header.text
    });
    prevLine = endLine;
    headerIdx++;
  }

  if (prevLine < sourceLines.length) {
    sections.push({
      startLine: prevLine,
      endLineExclusive: sourceLines.length,
      isModule: false,
      headerText: null
    });
  }

  // Step 2: Assign TDOL data to module sections
  let tdolIdx = 0;
  for (const sec of sections) {
    if (sec.isModule && tdolIdx < tdolSectionData.length) {
      sec.tdolData = tdolSectionData[tdolIdx].data;
      sec.tdolStmt = tdolSectionData[tdolIdx].stmt;
      tdolIdx++;
    } else {
      sec.tdolData = null;
    }
  }

  // Step 3: Build the final HTML parts
  let bodyHtml = '';

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const start = sec.startLine;
    const end = sec.endLineExclusive;


    bodyHtml += '<!-- Section ' + si + ' -->\n';
    bodyHtml += '<h3>' + ufirst(sec.tdolData?.moduleKind || '') + ' ' + (sec.tdolData?.moduleName || '') + '</h3>\n';

    bodyHtml += `<div class="code-block">`;
    bodyHtml += `<pre style="margin:0;padding:0;background:transparent; font-family: 'Fira Code', consolas, monospace;font:inherit;white-space:pre-wrap;word-break:break-word;line-height:150%;">`;

    // Add the code lines for this section
    for (let i = start; i < end && i < coloredLineFragments.length; i++) {
      bodyHtml += '<span class="cm-line-fragment">' + coloredLineFragments[i] + '</span>\n';
    }
    bodyHtml += `</pre>\n</div>\n`;

    // Close the pre for the code block
    // Close code-block div
    // Then add TDOL if applicable
    if (sec.isModule && sec.tdolData && sec.tdolData.groups) {
      bodyHtml += buildTDOLHtml(sec.tdolStmt, tdolSectionData.map(t => t.stmt), escHtml);
    }

    if (si < sections.length - 1) {
      bodyHtml += `<br>`;
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      background: #f5f7fa;
      color: #1a202c;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    
    .container {
      max-width: 900px;
      width: 100%;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .header h1 {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 1.3rem;
      font-weight: 600;
      color: #2b6cb0;
      letter-spacing: 0.05em;
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    
    .btn-copy {
      background: #2b6cb0;
      color: #fff;
    }
    .btn-copy:hover {
      background: #3182ce;
      transform: translateY(-1px);
    }
    .btn-copy:active {
      transform: translateY(0);
    }
    .btn-copy.copied {
      background: #38a169;
    }
    
    .code-block {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.9rem;
      line-height: 150%;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    
    /* ── Syntax coloring (light theme) ── */
    .cm-keyword { color: #2563eb; font-weight: 600; }
    .cm-builtin { color: #b45309; }
    .cm-string  { color: #059669; }
    .cm-number  { color: #d97706; }
    .cm-comment { color: #6b7280; font-style: italic; }
    .cm-operator { color: #dc2626; }
    .cm-variable { color: #1a202c; }
    .cm-variable-2 { color: #1a202c; }
    .cm-atom    { color: #7c3aed; }
    .cm-def     { color: #1a202c; }
    .cm-error   { color: #dc2626; background: rgba(220,38,38,0.08); }
    .cm-meta    { color: #1a202c; }
    .cm-property { color: #1a202c; }
    .cm-tag     { color: #2563eb; }
    .cm-attribute { color: #b45309; }
    
    
    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #38a169;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-weight: 500;
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: none;
      z-index: 1000;
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    
    .footer {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #718096;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 0.85rem;
    }
    
    @media (max-width: 600px) {
      body { padding: 1rem; }
      .code-block { padding: 1rem; font-size: 0.8rem; }
      .header h1 { font-size: 1.1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Algorithme exporté</h1>
      <button class="btn btn-copy" id="btn-copy" onclick="copyContent()">📋 Copier le contenu</button>
    </div>
    
    ${bodyHtml}
    
  </div>
  
  <div class="toast" id="toast">✓ Copié dans le presse-papier</div>

  <script>
    // Map of CodeMirror classes to inline styles (light theme)
    var styleMap = {
      'cm-keyword': 'color:#2563eb;font-weight:600;',
      'cm-builtin': 'color:#b45309;',
      'cm-string': 'color:#059669;',
      'cm-number': 'color:#d97706;',
      'cm-comment': 'color:#6b7280;font-style:italic;',
      'cm-operator': 'color:#dc2626;',
      'cm-variable': 'color:#1a202c;',
      'cm-variable-2': 'color:#1a202c;',
      'cm-atom': 'color:#7c3aed;',
      'cm-def': 'color:#1a202c;',
      'cm-meta': 'color:#1a202c;',
      'cm-property': 'color:#1a202c;',
      'cm-tag': 'color:#2563eb;',
      'cm-attribute': 'color:#b45309;'
    };
    
    function inlineStyles(el) {
      var nodes = el.querySelectorAll('span[class*="cm-"]');
      for (var i = 0; i < nodes.length; i++) {
        var span = nodes[i];
        var classes = span.className.split(/\s+/);
        for (var j = 0; j < classes.length; j++) {
          if (styleMap[classes[j]]) {
            span.style.cssText = (span.style.cssText ? span.style.cssText + ';' : '') + styleMap[classes[j]];
          }
        }
        span.removeAttribute('class');
      }
      return el;
    }
    
    // Copy the entire content (all code blocks & TDOL sections)
    function copyContent() {
      var container = document.querySelector('.container');
      if (!container) return;
      var btn = document.getElementById('btn-copy');
      
      // Clone the entire container
      var clone = container.cloneNode(true);
      // Remove the header and footer from the clone
      var headerClone = clone.querySelector('.header');
      var footerClone = clone.querySelector('.footer');
      // Keep only code blocks and tdol sections
      var copyDiv = document.createElement('div');
      var codeBlocks = clone.querySelectorAll('.code-block');
      var tdolModules = clone.querySelectorAll('.tdol-module');
      
      // Collect all elements in document order
      var allChildren = clone.childNodes;
      for (var i = 0; i < allChildren.length; i++) {
        var el = allChildren[i];
        if (el.nodeType === 1) {
          if (el.classList && (el.classList.contains('code-block') || el.classList.contains('tdol-module'))) {
            // Inline styles in code blocks
            if (el.classList.contains('code-block')) {
              var pre = el.querySelector('pre');
              if (pre) inlineStyles(pre);
            }
          }
        }
      }
      
      var fullHtml = clone.innerHTML;
      
      if (navigator.clipboard && navigator.clipboard.write) {
        var blob = new Blob([fullHtml], { type: 'text/html' });
        var clipboardItem = new ClipboardItem({ 'text/html': blob });
        navigator.clipboard.write([clipboardItem]).then(function() {
          showCopiedFeedback(btn);
        }).catch(function() {
          fallbackCopyHTML(fullHtml, btn);
        });
      } else {
        fallbackCopyHTML(fullHtml, btn);
      }
    }
    
    function fallbackCopyHTML(html, btn) {
      var textarea = document.createElement('textarea');
      textarea.value = html;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showCopiedFeedback(btn);
      } catch (e) {
        alert('Impossible de copier le contenu. Veuillez le sélectionner manuellement.');
      }
      document.body.removeChild(textarea);
    }
    
    function showCopiedFeedback(btn) {
      btn.textContent = '✓ Copié !';
      btn.classList.add('copied');
      
      var toast = document.getElementById('toast');
      toast.classList.add('show');
      
      setTimeout(function() {
        toast.classList.remove('show');
      }, 2000);
      
      setTimeout(function() {
        btn.textContent = '📋 Copier le contenu';
        btn.classList.remove('copied');
      }, 2500);
    }
  </script>
</body>
</html>`;

  // Create a Blob and open it in a new tab
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');

  // Clean up the blob URL after a delay (once the new tab has loaded)
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 10000);
}