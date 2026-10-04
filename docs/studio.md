# Organisation du studio (agents locaux)

## Équipe et responsabilités

| Rôle | Mission | Livrable attendu |
|---|---|---|
| Direction créative / produit | Tient la vision, arbitre le périmètre et valide le ton | Vision, décisions consignées, critères d’acceptation |
| Game design | Écrit les règles, cartes, lieux, cas limites et hypothèses d’équilibrage | Fiches de règles versionnées, matrice de cartes, note de playtest |
| Production / architecture | Découpe le travail, garde la cohérence des contrats, signale risques et dépendances | Plan de sprint, contrats techniques, registre des risques |
| Développement gameplay/UI | Implémente le moteur et l’interface selon le contrat validé | Tranche jouable, journal d’événements, notes de vérification |
| Direction artistique / lore | Définit le langage visuel et l’univers, fournit des éléments originaux | Guide visuel, lexique de lore, brief d’illustration |
| Assurance qualité | Vérifie les critères de fini et les parcours manuels convenus | Scénarios reproductibles, anomalies avec étapes et résultat attendu |

Ces rôles sont des agents spécialisés, pas des membres humains ni des services exécutés en continu. Le directeur de studio orchestre leurs missions; aucun agent ne pousse directement une décision produit ou une modification distante sans revue du résultat.

## Circulation du travail

1. La direction ouvre une fiche avec objectif joueur, périmètre, critères de fini et responsable.
2. Le game designer et l’architecte se mettent d’accord sur les règles et les données avant l’implémentation.
3. L’architecte publie les dépendances et limites; le développeur livre une tranche autonome.
4. La direction artistique fournit ses éléments originaux à partir du brief validé; l’intégration conserve lisibilité et contraste.
5. La QA rend ses observations au développeur et au producteur; la direction tranche les écarts de vision.
6. Le directeur synthétise les décisions et les points bloquants dans le dépôt afin que les agents partagent la même source de vérité.

## Format de transmission entre agents

Chaque compte rendu utilise ce schéma pour limiter les pertes de contexte :

```text
RÔLE / LIVRABLE :
ÉTAT : brouillon | prêt pour revue | bloqué
DÉCISIONS :
CONTRAT OU FICHIERS CONCERNÉS :
DÉPENDANCES / QUESTIONS :
CRITÈRES DE FIN :
RISQUES ET CAS LIMITES :
PROCHAINE ACTION + DESTINATAIRE :
```

La direction relaie les décisions qui affectent plusieurs rôles. Les agents signalent leurs désaccords avec une proposition et ses conséquences; le directeur produit choisit et inscrit l’arbitrage dans `docs/vision.md` ou une décision datée.

## Rythme d’un petit studio

- **Début de tranche :** vision et critères d’acceptation verrouillés.
- **Synchronisation :** état, dépendances et blocages par rôle; les tâches indépendantes avancent en parallèle.
- **Revue :** une tranche jouable et un parcours joueur vérifiables avant d’élargir le contenu.
- **Rétrospective :** consigner les hypothèses infirmées, décisions d’équilibrage et prochaine tranche.

## Définition de fini du vertical slice

- Le joueur peut comprendre le but, jouer ses cartes et finir une partie contre le bot.
- Le contrôle des lieux est lisible et la Confluence donne un résultat déterministe.
- Les cartes, lieux et textes sont originaux et lisibles en français.
- Les commandes principales fonctionnent à la souris et au clavier.
- Les limites connues et la prochaine tranche sont documentées.

