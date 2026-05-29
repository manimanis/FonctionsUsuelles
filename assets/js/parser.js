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
 * Affiche l'état des variables dans le panneau dédié
 */
function updateVarsDisplay(variables) {
  const varsDisplay = document.getElementById('vars-display');
  if (!varsDisplay) return;
  
  const entries = Object.entries(variables).filter(([k]) => !k.startsWith('_'));
  if (entries.length === 0) {
    varsDisplay.innerHTML = '<span class="step-state">(aucune variable)</span>';
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
      return k + ' = [' + v.map(el => fmt(el)).join(', ') + ']';
    }
    return k + ' = ' + fmt(v);
  });
  
  varsDisplay.innerHTML = '<span class="step-state">📊 ' + parts.join('<br>📊 ') + '</span>';
}

function setStepButtons(enabled) {
  document.getElementById('btn-step-next').disabled = !enabled;
  document.getElementById('btn-step-resume').disabled = !enabled;
  document.getElementById('btn-step-stop').disabled = !enabled;
}

function detectDirectives(program) {
  const directives = {};
  if (/\/\/\/\s*verbeux/i.test(program)) { directives.verbeux = true; }
  return directives;
}

const app = new Vue({
  el: '#app',
  data: {
    program: `var n, i : entier
var s : reel

///verbeux
Ecrire("Entrez n : ")
Lire(n)
s ← 0
Pour i de 1 à n Faire
  s ← s + i
Fin Pour
Ecrire("La somme est : ", s)

Si s > 10 Alors
  Ecrire("s est supérieur à 10")
Sinon
  Ecrire("s est inférieur ou égal à 10")
Fin Si
///finverbeux`,
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
    highlightCode: function() {
      setTimeout(() => {
        const codeEl = document.getElementById('highlighted-code');
        if (!codeEl) return;
        const textarea = document.getElementById('algo');
        if (!textarea) return;
        codeEl.textContent = textarea.value || '';
        hljs.highlightBlock(codeEl);
      }, 0);
    },
    exec() {
      const outputArea = document.getElementById('sortie');
      if (!outputArea) {
        console.error('Zone de sortie introuvable');
        return;
      }

      // Cacher le panneau de variables
      document.getElementById('vars-panel').style.display = 'none';
      setStepButtons(false);
      stepRunning = false;
      stepEvaluator = null;

      // Vider la sortie
      outputArea.innerHTML = '';

      // Créer un nouveau worker pour cette exécution
      const worker = createExecutionWorker(outputArea);

      // Lancer le programme
      worker.postMessage({ type: 'execute', program: this.program });
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
      
      // Afficher le panneau de variables
      const varsPanel = document.getElementById('vars-panel');
      varsPanel.style.display = 'block';
      document.getElementById('vars-display').innerHTML = '<span class="step-state">⏳ Initialisation...</span>';
      
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
          verbose: false,
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
        
        // Tokenizer et parser
        const lexer = new Lexer(this.program);
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
        outputArea.innerHTML += '<span class="step-verbose-header">▶ Début de l\'exécution pas à pas</span><br>';
        
        try {
          for (const stmt of mainStatements) {
            await stepEvaluator.evaluate(stmt);
          }
          outputArea.innerHTML += '<br><span class="step-verbose-header">◀ Fin de l\'exécution</span><br>';
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
