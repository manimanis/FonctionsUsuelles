
const nomCtrl = document.querySelector("#simulation-1 input[name='nom']");
const ageCtrl = document.querySelector("#simulation-1 input[name='age']");
const app = new Vue({
    el: "#simulation-1",
    data: {
      step: -1,
      j1: 0,
      j2: 0,
      objets: ["Pierre", "Feuille", "Ciseaux"],
      message: ''
    },
    methods: {
      setFocus: function (control) {
        const ctrl = this.$refs[control][0];
        ctrl.focus();
        ctrl.select();
      },
      simuler: function (step) {
        this.step = step;
        if (step == 0) {
          this.j1 = Math.floor(Math.random() * 3);
          Vue.nextTick(() => this.setFocus('j1'));
        } else if (step == 1) {
          this.j2 = Math.floor(Math.random() * 3);
          let g = (this.j1 - this.j2) % 3;
          if (g < 0) { g += 3; }
          if (g == 0) {
            this.message = "Match nul";
          } else if (g == 1) {
            this.message = "Bravo, vous gagnez!";
          } else {
            this.message = "Désolé, vous perdez!";
          }
        }
      }
    }
  });

const app1 = new Vue({
  el: "#simulation-2",
  data: {
    step: -1,
    qte: 5,
    argent: 5000,
    message: ''
  },
  methods: {
    simuler: function (step) {
      this.step = step;
      if (step == 0) {
        Vue.nextTick(() => this.$refs.qte.focus());
      } else if (step == 1) {
        Vue.nextTick(() => this.$refs.argent.focus());
      } else if (step == 2) {
        const total = this.qte * 800;
        if (this.argent > total) {
          this.message = "Monnaie = " + (this.argent - total);
        } else if (this.argent < total) {
          this.message = "Manquant = " + (total - this.argent);
        } else {
          this.message = "A bientôt";
        }
      }
    }
  }
});
