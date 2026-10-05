# Localia

Jeu de cartes local jouable directement dans un navigateur, sans serveur ni dépendance.

## V1
- Deck standard de 52 cartes.
- Partie locale joueur contre bot.
- Main, pioche, défausse et score.
- Tour par tour avec état sauvegardé dans localStorage.
- Interface responsive desktop/mobile.
- Aucun compte, aucune API et aucune intégration externe.

## Lancer
Ouvrir index.html dans un navigateur moderne.

## Architecture
- index.html : interface.
- styles.css : présentation responsive.
- game.js : moteur de partie et persistance.

La base est volontairement sans backend afin de conserver un vrai mode local. Les règles spécifiques de Localia pourront être ajoutées au moteur sans dépendre de l’interface.
