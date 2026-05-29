# Plan d'implémentation - Fonctionnalités manquantes pour l'anatomie d'algorithme

## Analyse de l'existant
- ✅ Lexer tokenise les instructions de base (affectation, boucles, conditionnelles)
- ✅ Parser produit un AST pour les instructions simples
- ✅ Evaluateur exécute les instructions avec support des types et tableaux
- ✅ Fonctions built-in (chr, ord, etc.)

## Fonctionnalités manquantes à implémenter

### 1. Tokenizer - Ajout de mots-clés
- [ ] Ajouter `algorithme`, `procédure`, `fonction`, `procédure`, `fonction` comme KEYWORD
- [ ] Ajouter `retourner` comme mot-clé
- [ ] Ajouter `@` dans OPERATOR pour les paramètres par adresse

### 2. Parser - Structure de programme
- [ ] Parser `Algorithme Nom Début ... Fin` (point d'entrée)
- [ ] Parser `Procédure Nom(@params) Début ... Fin` (définition de procédure)
- [ ] Parser `Fonction Nom(params): type Début ... Fin` (définition de fonction)
- [ ] Parser `Retourner expression` (retour de fonction)
- [ ] Parser les paramètres avec `@` pour passage par adresse
- [ ] Sections commentaires TDNT/TDOG/TDOL (ignorées)

### 3. Evaluateur - Exécution des modules
- [ ] Stocker les définitions de procédures/fonctions
- [ ] Appel de procédure/fonction utilisateur
- [ ] Gestion des paramètres par valeur vs par adresse (@)
- [ ] Mot-clé `Retourner` pour retourner une valeur
- [ ] Portée des variables (locale vs globale)

### 4. Mise à jour de l'interface
- [ ] Exemple par défaut dans parser.html avec la nouvelle syntaxe
- [ ] Test avec l'exemple de l'utilisateur

### 5. Tests
- [ ] Vérifier que l'exemple complet s'exécute correctement