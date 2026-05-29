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
  // Afficher le prompt dans la sortie
  // outputEl.innerHTML += promptText + ' ';
  
  // Créer un <input> dans le div de sortie
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input-lire';
  input.autofocus = true;
  input.placeholder = promptText;
  outputEl.appendChild(input);
  outputEl.scrollTop = outputEl.scrollHeight;
  input.focus();

  // Gestionnaire one-shot pour capturer Entrée
  const inputHandler = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value;
      
      // Afficher la valeur saisie dans la sortie avant de supprimer l'input
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'input-value';
      valueDisplay.innerHTML = value + "<br>";
      outputEl.insertBefore(valueDisplay, input);
      
      // Supprimer le input du DOM
      input.removeEventListener('keydown', inputHandler);
      input.remove();
      
      // Envoyer la réponse au worker
      worker.postMessage({ type: 'input-response', value: value });
    }
  };

  input.addEventListener('keydown', inputHandler);
}

function clearOutputArea(outputEl) {
  outputEl.innerHTML = '';
}

function detectDirectives(program) {
  const directives = {};
  if (/\/\/\/\s*verbeux/i.test(program)) { directives.verbeux = true; }
  return directives;
}

const app = new Vue({
  el: '#app',
  data: {
    program: `///verbeux
type Tab1 = Tableau de 50 chaine
var n : entier
var t : Tab1

Procédure Saisir(@n: entier)
Début
  Repeter
    Ecrire("Entrez n ? ")
    Lire(n)
  Jusqu'à 5 <= n <= 10
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
Fin`,
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

      // Vider la sortie
      outputArea.innerHTML = '';

      // Créer un nouveau worker pour cette exécution
      const worker = createExecutionWorker(outputArea);

      // Lancer le programme
      worker.postMessage({ type: 'execute', program: this.program });
    }
  }
});