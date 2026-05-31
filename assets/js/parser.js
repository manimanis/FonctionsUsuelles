// ──────────────────────────────────────────────
// Les classes Lexer, Parser et Evaluator ont été
// déplacées dans algorithm-core.js
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// INTERPRÉTEUR PRINCIPAL - Exécution via Web Worker
// ──────────────────────────────────────────────

/**
 * Exécute un programme algorithmique dans un Web Worker.
 * Les sorties (Ecrire) s'affichent dans un div id="sortie".
 * La saisie (Lire) affiche un contrôle <input> dans le div
 * de sortie, qui disparaît lorsque l'utilisateur valide
 * avec la touche Entrée.
 */

let executionWorker = null;
let stepEvaluator = null;
let stepRunning = false;
let editor = null; // CodeMirror instance

function createExecutionWorker(outputEl) {
  // Terminer l'ancien worker s'il existe
  if (executionWorker) {
    executionWorker.terminate();
    executionWorker = null;
  }

  const worker = new Worker('assets/js/execution-worker.js');
  executionWorker = worker;

  worker.onmessage = function(e) {
    const msg = e.data;

    if (msg.type === 'output') {
      // Convert \n to <br> for HTML display
      outputEl.innerHTML += msg.text.replace(/\n/g, '<br>');
      outputEl.scrollTop = outputEl.scrollHeight;
    } else if (msg.type === 'input-request') {
      requestInput(outputEl, msg.prompt, worker);
    } else if (msg.type === 'done') {
      outputEl.innerHTML += '<br>--- Exécution terminée ---<br>';
      outputEl.scrollTop = outputEl.scrollHeight;
    } else if (msg.type === 'error') {
      outputEl.innerHTML += '<br>✖ Erreur : ' + msg.message + '<br>';
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  };

  worker.onerror = function(err) {
    outputEl.innerHTML += '<br>✖ Erreur Worker : ' + err.message + '<br>';
    outputEl.scrollTop = outputEl.scrollHeight;
  };

  return worker;
}

function requestInput(outputEl, promptText, worker) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input-lire';
  input.autofocus = true;
  input.placeholder = promptText;
  outputEl.appendChild(input);
  outputEl.scrollTop = outputEl.scrollHeight;
  input.focus();

  const inputHandler = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value;
      
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'input-value';
      valueDisplay.innerHTML = value + "<br>";
      outputEl.insertBefore(valueDisplay, input);
      
      input.removeEventListener('keydown', inputHandler);
      input.remove();
      
      worker.postMessage({ type: 'input-response', value: value });
    }
  };

  input.addEventListener('keydown', inputHandler);
}

function clearOutputArea(outputEl) {
  outputEl.innerHTML = '';
}

/**
 * Affiche l'état des variables dans l'en-tête du panneau de sortie
 */
function updateVarsDisplay(variables) {
  const varsDisplay = document.getElementById('vars-display');
  if (!varsDisplay) return;
  
  const entries = Object.entries(variables).filter(([k]) => !k.startsWith('_'));
  if (entries.length === 0) {
    varsDisplay.textContent = '';
    return;
  }
  
  const parts = entries.map(([k, v]) => {
    const fmt = (val) => {
      if (typeof val === 'string') return '"' + val + '"';
      if (typeof val === 'boolean') return val ? 'vrai' : 'faux';
      if (val === null || val === undefined) return 'null';
      return String(val);
    };
    if (Array.isArray(v)) {
      return k + '=[' + v.map(el => fmt(el)).join(',') + ']';
    }
    return k + '=' + fmt(v);
  });
  
  varsDisplay.textContent = '📊 ' + parts.join('  ');
}

function setStepButtons(enabled) {
  document.getElementById('btn-step-next').disabled = !enabled;
  document.getElementById('btn-step-resume').disabled = !enabled;
  document.getElementById('btn-step-stop').disabled = !enabled;
}

// ── Initialize CodeMirror ──
function initCodeMirror() {
  const container = document.getElementById('editor-container');
  if (!container) return;

  const defaultProgram = ``;

  editor = CodeMirror(container, {
    value: defaultProgram,
    mode: 'algorithm',
    theme: 'algo-theme',
    lineNumbers: true,
    lineWrapping: false,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    electricChars: true,
    extraKeys: {
      'Ctrl-Space': function(cm) {
        CodeMirror.commands.autocomplete(cm);
      },
      'Tab': function(cm) {
        if (cm.somethingSelected()) {
          // Indent every selected line by 2 spaces
          cm.indentSelection('add');
        } else {
          // Insert 2 spaces at cursor
          cm.replaceSelection('  ', 'end');
        }
      },
      'Shift-Tab': function(cm) {
        if (cm.somethingSelected()) {
          // Dedent every selected line by 2 spaces
          cm.indentSelection('subtract');
        } else {
          // Dedent current line: remove up to 2 leading spaces
          var cursor = cm.getCursor();
          var line = cm.getLine(cursor.line);
          var leadingSpaces = line.match(/^  /);
          if (leadingSpaces) {
            cm.replaceRange('', {line: cursor.line, ch: 0}, {line: cursor.line, ch: 2});
            // Keep cursor at same relative position
            var newPos = Math.max(0, cursor.ch - 2);
            cm.setCursor({line: cursor.line, ch: newPos});
          }
        }
      },
      'Backspace': function(cm) {
        var cursor = cm.getCursor();
        if (!cm.somethingSelected() && cursor.ch > 0) {
          var line = cm.getLine(cursor.line);
          var textBefore = line.slice(0, cursor.ch);
          // If cursor is in leading whitespace before any non-space character
          var nonSpaceIdx = line.search(/\S/);
          var isAtLeadingEdge = (nonSpaceIdx === -1 || cursor.ch <= nonSpaceIdx);
          
          if (/^ +$/.test(textBefore) && isAtLeadingEdge) {
            // Delete 2 spaces (or 1 if odd number)
            var spacesToDelete = cursor.ch % 2 === 0 ? 2 : 1;
            cm.replaceRange('', {line: cursor.line, ch: cursor.ch - spacesToDelete}, {line: cursor.line, ch: cursor.ch});
            return;
          }
        }
        // Default backspace behavior
        cm.deleteH(-1, 'char');
      },
    },
    hintOptions: {
      hint: CodeMirror.hint.algorithm,
      completeSingle: false,
    },
  });

  // Trigger autocomplete while typing
  editor.on('inputRead', function(cm, change) {
    if (change.text && change.text.length > 0 && /\w/.test(change.text[change.text.length - 1])) {
      CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
    }
  });

  // Trigger autocomplete on '.' (not used often but helpful)
  editor.on('keyup', function(cm, event) {
    // Trigger hint on letters only (not on backspace/delete)
    const key = event.key;
    if (key && key.length === 1 && /[a-zA-Zàâäéèêëîïôöùûü]/.test(key)) {
      // Already handled by inputRead above
    }
  });
}

const app = new Vue({
  el: '#app',
  data: {
    instructions: [],
    outputHistory: []
  },
  methods: {
    formatValue: function(value) {
      if (typeof value === 'string') return '"' + value + '"';
      if (typeof value === 'boolean') return value ? 'vrai' : 'faux';
      if (value === null || value === undefined) return 'null';
      return String(value);
    },
    getProgram: function() {
      return editor ? editor.getValue() : '';
    },
    exec() {
      const outputArea = document.getElementById('sortie');
      if (!outputArea) {
        console.error('Zone de sortie introuvable');
        return;
      }

      // Cacher les variables
      document.getElementById('vars-display').textContent = '';
      setStepButtons(false);
      stepRunning = false;
      stepEvaluator = null;

      // Vider la sortie
      outputArea.innerHTML = '';

      // Créer un nouveau worker pour cette exécution
      const worker = createExecutionWorker(outputArea);

      // Lancer le programme
      worker.postMessage({ type: 'execute', program: this.getProgram() });
    },

    // ═══════════════════════════════════
    // EXÉCUTION PAS À PAS
    // ═══════════════════════════════════

    /**
     * Exécute le programme pas à pas (sans Worker, dans le thread principal)
     */
    async stepExec() {
      if (stepRunning) return;
      
      const outputArea = document.getElementById('sortie');
      if (!outputArea) return;
      
      // Vider la sortie
      outputArea.innerHTML = '';
      
      // Afficher l'état des variables dans l'en-tête
      document.getElementById('vars-display').textContent = '⏳ Initialisation...';
      
      // Activer les boutons de contrôle
      setStepButtons(true);
      stepRunning = true;
      
      try {
        // Créer un évaluateur en mode pas à pas
        const variables = {};
        const userTypes = {};
        const userFunctions = {};
        const userProcedures = {};
        
        stepEvaluator = new Evaluator({
          variables,
      outputFn: (text) => {
            // Convert \n to <br> for HTML display, but don't blindly add <br>
            const html = text.replace(/\n$/, '<br>').replace(/\n/g, '<br>');
            outputArea.innerHTML += html;
            outputArea.scrollTop = outputArea.scrollHeight;
          },
          inputFn: (promptText) => {
            return new Promise((resolve) => {
              // Créer un champ de saisie dans la sortie
              const input = document.createElement('input');
              input.type = 'text';
              input.className = 'input-lire';
              input.autofocus = true;
              input.placeholder = promptText;
              outputArea.appendChild(input);
              outputArea.scrollTop = outputArea.scrollHeight;
              input.focus();
              
              const handler = (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = input.value;
                  const valueDisplay = document.createElement('span');
                  valueDisplay.className = 'input-value';
                  valueDisplay.innerHTML = value + "<br>";
                  outputArea.insertBefore(valueDisplay, input);
                  input.removeEventListener('keydown', handler);
                  input.remove();
                  resolve(value);
                }
              };
              input.addEventListener('keydown', handler);
            });
          },
          userTypes,
          userFunctions,
          userProcedures,
          stepMode: true
        });
        
        const program = this.getProgram();
        
        // Tokenizer et parser
        const lexer = new Lexer(program);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, lexer);
        
        // Séparer les statements
        const mainStatements = [];
        let hasAlgorithmBlock = false;
        
        for (const stmt of parser.statements) {
          if (stmt.type === 'algorithm') {
            hasAlgorithmBlock = true;
            mainStatements.push(stmt);
          } else if (stmt.type === 'functionDef' || stmt.type === 'procedureDef') {
            stepEvaluator.evaluate(stmt);
          } else {
            if (!hasAlgorithmBlock) mainStatements.push(stmt);
          }
        }
        
        // Exécuter en boucle asynchrone
        outputArea.innerHTML += '<span class="step-state">▶ Début de l\'exécution pas à pas</span><br>';
        
        try {
          for (const stmt of mainStatements) {
            await stepEvaluator.evaluate(stmt);
          }
          outputArea.innerHTML += '<br><span class="step-state">◀ Fin de l\'exécution</span><br>';
          outputArea.innerHTML += '<br>--- Exécution terminée ---<br>';
        } catch (err) {
          outputArea.innerHTML += '<br>✖ Erreur : ' + err.message + '<br>';
        }
        
        // Mettre à jour l'affichage des variables final
        updateVarsDisplay(variables);
        
      } catch (err) {
        outputArea.innerHTML += '<br>✖ Erreur : ' + err.message + '<br>';
      }
      
      setStepButtons(false);
      stepRunning = false;
    },

    /**
     * Passe à l'étape suivante (résume l'exécution bloquée)
     */
    stepNext() {
      if (stepEvaluator && stepRunning) {
        stepEvaluator.resumeStep();
        // Mettre à jour l'affichage des variables après l'étape
        setTimeout(() => updateVarsDisplay(stepEvaluator.variables), 0);
      }
    },

    /**
     * Continue l'exécution jusqu'à la fin (désactive le mode pas à pas)
     */
    stepResume() {
      if (stepEvaluator && stepRunning) {
        stepEvaluator.stepMode = false;
        stepEvaluator.resumeStep();
        setStepButtons(false);
      }
    },

    /**
     * Arrête l'exécution pas à pas
     */
    stepStop() {
      if (stepEvaluator && stepRunning) {
        // Forcer la résolution de l'attente en désactivant le mode pas à pas
        stepEvaluator.stepMode = false;
        stepEvaluator.resumeStep();
        stepRunning = false;
        stepEvaluator = null;
        setStepButtons(false);
        document.getElementById('sortie').innerHTML += '<br>⏹ Exécution interrompue<br>';
      }
    }
  }
});

// Initialiser CodeMirror après le chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
  initCodeMirror();
});