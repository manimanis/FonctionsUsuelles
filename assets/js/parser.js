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
// Types simples
var n, m : entier
var x : réel
var ok : booléen
var msg : chaîne
var car : caractère

// Type tableau
type tab = tableau de 4 réel
var t : tab

// Lecture typée : Lire(x) convertit automatiquement
// la saisie en fonction du type déclaré
ecrire("Exemple Lire() typé :")
ecrire("Donnez un entier pour n :")
lire(n)
ecrire("Donnez un réel pour x :")
lire(x)
ecrire("Donnez un booléen (vrai/faux) pour ok :")
lire(ok)
ecrire("Donnez un message pour msg :")
lire(msg)
ecrire("Donnez un caractère pour car :")
lire(car)

// Affichage après lecture
ecrire("")
ecrire("n =", n)
ecrire("x =", x)
ecrire("ok =", ok)
ecrire("msg =", msg)
ecrire("car =", car)

// Remplissage du tableau
t[0] ← n
t[1] ← x
t[2] ← n + x
t[3] ← n * 2

// Affichage d'un tableau
ecrire("")
ecrire("Valeurs du tableau t :")
i ← 0
tant que i < 4 faire
  ecrire("t[", i, "] =", t[i])
  i ← i + 1
fin tant que`,
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