/**
 * Execution Worker - Algorithm runner in Web Worker
 * 
 * Runs Lexer → Parser → Evaluator in a separate thread.
 * Communicates with the main thread via messages for:
 * - Output display (Ecrire)
 * - User input (Lire)
 */

// Import the algorithm core classes
importScripts('algorithm-core.js');

// ──────────────────────────────────────────────
// Worker message handler
// ──────────────────────────────────────────────

self.onmessage = function(e) {
  const msg = e.data;
  
  if (msg.type === 'execute') {
    runProgram(msg.program);
  } else if (msg.type === 'input-response') {
    // Resume the waiting input promise
    if (self._inputResolver) {
      self._inputResolver(msg.value);
      self._inputResolver = null;
    }
  }
};

function waitForInput(promptText) {
  return new Promise((resolve) => {
    // Store the resolver so the message handler can call it
    self._inputResolver = resolve;
    // Ask the main thread to get input from the user
    self.postMessage({ type: 'input-request', prompt: promptText });
  });
}

function sendOutput(text) {
  self.postMessage({ type: 'output', text: text });
}

function runProgram(program) {
  try {
    const variables = {};
    const userTypes = {}; // Store type definitions (e.g. tab = tableau[20] réel)
    const userFunctions = {}; // Store user-defined functions
    const userProcedures = {}; // Store user-defined procedures
    
    const evaluator = new Evaluator({
      variables,
      outputFn: (text) => sendOutput(text),
      inputFn:(promptText) => waitForInput(promptText),
      userTypes,
      userFunctions,
      userProcedures
    });

    const lexer = new Lexer(program);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);

    // Execute all statements sequentially (async)
    (async () => {
      try {
        for (const stmt of parser.statements) {
          await evaluator.evaluate(stmt);
        }
        self.postMessage({ type: 'done', variables: variables });
      } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
      }
    })();
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
}