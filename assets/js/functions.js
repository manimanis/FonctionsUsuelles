/**
 * Fonctions algorithmiques usuelles
 * Ces fonctions implémentent les fonctions algorithmiques classiques 
 * pour les démonstrations interactives et le parser.
 */

function chr(code) {
  return String.fromCharCode(code);
}

function ord(car) {
  return car.charCodeAt(0);
}

function arrondi(x) {
  const xi = Math.floor(x);
  const fx = x - xi;
  if (fx < 0.5) {
    return xi;
  } else if (fx > 0.5) {
    return xi + 1;
  }
  // Arrondi bancaire (pair le plus proche) si partie décimale = 0.5
  if (xi % 2 == 0) {
    return xi;
  } else {
    return xi + 1;
  }
}

function racine(x) {
  return Math.sqrt(x);
}

function alea(a, b) {
  return Math.floor(Math.random() * (b - a + 1) + a);
}

function abs(x) {
  return Math.abs(x);
}

function ent(x) {
  // Troncature vers zéro (comme int() en Python)
  return parseInt(x);
}

function long(ch) {
  return ch.length;
}

function pos(ch1, ch2) {
  return ch2.indexOf(ch1);
}

function convch(x) {
  return x + "";
}

function ConvCh(x) {
  return x + "";
}

function estnum(ch) {
  for (let i = 0; i < ch.length; i++) {
    const v = (ch[i] >= '0' && ch[i] <= '9');
    if (!v) return false;
  }
  return ch.length > 0;
}

function estNum(ch) {
  return estnum(ch);
}

function valeur(ch) {
  return Number(ch);
}

function sous_chaine(ch, d, f) {
  return ch.substring(d, f);
}

function effacer(ch, d, f) {
  if (f >= d) {
    return ch.substring(0, d) + ch.substring(f);
  }
  return ch;
}

function majus(ch) {
  return ch.toUpperCase();
}

function ecrire(...args) {
  let s = "";
  for (let arg of args) {
    if (s != '') s += ' ';
    s += arg;
  }
  document.getElementById('sortie').innerHTML += s + "<br>";
}