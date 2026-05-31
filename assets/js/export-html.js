/**
 * Export Algorithm to HTML
 * 
 * Generates a standalone HTML page containing the algorithm code
 * from the CodeMirror editor with syntax coloring preserved,
 * and opens it in a new tab.
 */

function exportAlgorithmToHTML() {
  // Get the CodeMirror editor instance
  if (!editor) return;
  
  const code = editor.getValue();
  const title = 'Algorithme exporté';
  
  // Extract syntax-colored HTML from CodeMirror
  const codeWrapper = editor.getWrapperElement();
  const codeMirrorCode = codeWrapper.querySelector('.CodeMirror-code');
  let coloredHtml = '';
  if (codeMirrorCode) {
    // Clone to avoid modifying the live DOM
    const clone = codeMirrorCode.cloneNode(true);
    // Convert line numbers (which are just markers) and remove gutters
    // We only want the actual content spans
    const lines = clone.querySelectorAll('.CodeMirror-line');
    const fragments = [];
    for (const line of lines) {
      fragments.push(line.innerHTML);
    }
    coloredHtml = fragments.join('\n');
  }
  
  // If we couldn't extract syntax HTML, fall back to plain text
  function escHtml(s) {
    var lt = String.fromCharCode(108, 116);
    var gt = String.fromCharCode(103, 116);
    var amp = String.fromCharCode(97, 109, 112);
    return s.replace(/[<>&]/g, function(m) {
      if (m === '<') return '&' + lt + ';';
      if (m === '>') return '&' + gt + ';';
      return '&' + amp + ';';
    });
  }
  if (!coloredHtml) {
    coloredHtml = escHtml(code);
  }
  
  // Important: we need to clean up any pre-existing cm- classes from cloned nodes
  // The spans keep their semantic classes (cm-keyword, cm-string, etc.)
  
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
      min-height: 200px;
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
    <div class="code-block" id="code-block"><pre style="margin:0;padding:0;background:transparent;color:inherit;font:inherit;white-space:pre-wrap;word-break:break-word;line-height:150%;">${coloredHtml}</pre></div>
    <div class="footer">Généré depuis l'Interpréteur d'algorithmes pédagogiques</div>
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
    
    function copyContent() {
      var pre = document.querySelector('#code-block pre');
      if (!pre) return;
      var btn = document.getElementById('btn-copy');
      
      // Clone the pre and inline all styles so colors survive paste into any app
      var clone = pre.cloneNode(true);
      inlineStyles(clone);
      // Also set font on the pre itself
      clone.style.cssText = 'margin:0;padding:0;background:transparent;font-family:JetBrains Mono,Fira Code,Consolas,monospace;font-size:12pt;line-height:150%;white-space:pre-wrap;word-break:break-word;';
      var fullHtml = clone.outerHTML;
      
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
  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 10000);
}