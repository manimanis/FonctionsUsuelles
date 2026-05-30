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
      outputEl.innerHTML += msg.text + '<br>';
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

  const defaultProgram = `type Tab1 = Tableau de 50 chaine
var n : entier
var t : Tab1

Procédure Saisir(@n: entier)
Début
  Repeter
    Ecrire("Entrez n ? ")
    Lire(n)
  Jusqu'à 5 <= n <= 50
Fin

Procédure Remplir(@t: Tab, n: entier)
Début
  Pour i de 0 à n-1 Faire
    Repeter
      Ecrire("Entrez t[", i, "] ? ")
      Lire(t[i])
    Jusqu'à Verif(t[i])
  Fin Pour
Fin

Fonction Verif(ch: chaine): booleen
var i : entier
Début
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
Début
  s ← 0
  Pour i de 0 à n-1 Faire
    s ← s + i
  Fin Pour
  Retourner s
Fin

Procédure Trier(@t: Tab, n: entier)
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
      temp ← t[i]
      t[i] ← t[min]
      t[min] ← temp
    Fin Si
  Fin Pour
Fin

Procédure Afficher(t: Tab, n: entier)
Début
  Pour i de 0 à n-1 Faire
    Ecrire(t[i])
  Fin Pour
Fin

Algorithme PP
Début
  Saisir(n)
  Remplir(t, n)
  x ← Calc(n)
  Ecrire("x = ", x)
  Trier(t, n)
  Afficher(t, n)
Fin`;

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
        cm.replaceSelection('  ', 'end');
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
            outputArea.innerHTML += text + '<br>';
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