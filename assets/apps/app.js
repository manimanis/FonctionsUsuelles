/**
 * Utility functions used by the Vue app for interactive demonstrations.
 * Core algorithm functions are in functions.js (loaded before this file).
 */

function randint(a, b) {
  return Math.floor(a + (b - a + 1) * Math.random());
}

function charPosition(ch, pos) {
  if (pos >= 0 && pos < ch.length) {
    return pos;
  } else if (pos < 0 && pos >= -ch.length) {
    return ch.length + pos;
  }
  return null;
}

function charAt(ch, pos) {
  if (pos >= 0 && pos < ch.length) {
    return ch[pos];
  } else if (pos < 0 && pos >= -ch.length) {
    return ch[ch.length + pos];
  }
  return null;
}

const app = new Vue({
  el: "#app",
  data: {
    functionName: "",
    chrCode: 65,
    ordCar: "a",
    arrondiX: (randint(1, 10) * 2 + 1) / 2,
    racineX: randint(1, 10) ** 2,
    aleaVi: 1,
    aleaVf: 6,
    aleaVal: randint(1, 6),
    absX: -randint(1, 50),
    entX: randint(1, 20) / randint(1, 6),
    indexICh: "Je suis informaticien!",
    indexIval: 0,
    longCh: "Bac Info",
    posCh1: "beaux",
    posCh2: "De beaux bateaux!",
    estNumCh: "2574",
    convChVal: randint(1, 50) / 3,
    sousChaineCh: "Je suis Tunisien",
    sousChaineD: 3,
    sousChaineF: 7,
    effacerCh: "Bateaux",
    effacerD: 1,
    effacerF: 3,
    valeurCh: randint(1000, 9999) / 100,
    majusCh: "SoUssE 2025!"
  },
  methods: {
    refreshAlea: function () {
      this.aleaVal = randint(+this.aleaVi, +this.aleaVf);
    },
    onCharClicked: function (i) {
      this.indexIval = i;
    },
    onCharacterSelected: function (charCode) {
      if (this.functionName == 'chr') {
        this.chrCode = charCode;
      }
      if (this.functionName == 'ord') {
        this.ordCar = String.fromCharCode(charCode);
      }
    },
    isInPosRange: function (ch1, ch2, i) {
      const p = ch2.indexOf(ch1);
      if (p == -1) {
        return false;
      }
      return i >= p && i < p + ch1.length;
    },
    isCharacterSelected: function (charCode) {
      return (this.functionName == 'chr' && charCode == this.chrCode) ||
        (this.functionName == 'ord' && charCode == this.ordCar.charCodeAt(0));
    },
    isInDeleteRange: function (i) {
      return i >= +this.effacerD && i < +this.effacerF;
    },
    deleteIndex: function (i) {
      if (+this.effacerD > +this.effacerF) {
        return i;
      }
      if (i < +this.effacerD) {
        return i;
      }
      if (i >= +this.effacerF) {
        return i - (+this.effacerF - +this.effacerD);
      }
    }
  }
});