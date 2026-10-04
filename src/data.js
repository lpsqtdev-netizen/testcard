(() => {
  const factions = [
    {
      id: 'veilleurs', name: 'Veilleurs du Fil', short: 'Veilleurs', title: 'Tisseurs de souvenirs',
      icon: '✧', art: 'assets/hero-veilleurs.jpg', color: '#55b5a7', accent: '#f2c86b',
      motto: 'Rien ne se perd tant qu’on le relie.',
      lore: 'Après le Déluge muet, les Veilleurs cousent les souvenirs aux pages mouvantes de l’atlas. Leurs compas trouvent des chemins là où les autres ne voient que brouillard. Ils protègent les compagnons et font durer chaque histoire.',
      style: 'Protection · soins · renforts', power: 'Point de couture', powerText: 'Pour 2 Élan : donne +0/+2 à un serviteur allié.', powerEffect: 'healAlly'
    },
    {
      id: 'cendres', name: 'Archivistes des Cendres', short: 'Archivistes', title: 'Gardiens de l’oubli',
      icon: '⌁', art: 'assets/hero-cendres.jpg', color: '#b87476', accent: '#e9a45f',
      motto: 'Toute histoire laisse une braise.',
      lore: 'Dans des tours qui dérivent entre les pages, les Archivistes recueillent les fragments que le monde rejette. Leurs masques gardent les noms effacés. Ils échangent sans crainte une vie contre une vérité qui brûle.',
      style: 'Élimination · braises · morts utiles', power: 'Mèche ardente', powerText: 'Pour 2 Élan : inflige 2 dégâts à un serviteur ennemi.', powerEffect: 'damageAlly'
    },
    {
      id: 'marees', name: 'Passeurs des Marées', short: 'Passeurs', title: 'Navigateurs des courants',
      icon: '≈', art: 'assets/hero-marees.jpg', color: '#629ce0', accent: '#ff9470',
      motto: 'Aucune rive n’est la dernière.',
      lore: 'Les Passeurs connaissent les marées qui traversent les cartes. Leur flottille suit les courants entre les îles flottantes et déplace les repères quand le monde se fige. Ils gagnent par l’élan, le placement et les détours.',
      style: 'Mobilité · tempo · changements de lieu', power: 'Courant porteur', powerText: 'Pour 2 Élan : déplace un serviteur allié vers un autre lieu.', powerEffect: 'moveAlly'
    },
    {
      id: 'myceles', name: 'Cour des Mycéliums', short: 'Mycéliums', title: 'Veilleurs des racines',
      icon: '❋', art: 'assets/hero-myceles.jpg', color: '#87aa61', accent: '#f0c36b',
      motto: 'Une seule spore peut refaire une forêt.',
      lore: 'Sous la Forêt renversée, le peuple des Mycéliums entend la mémoire circuler entre racines et champignons. La Cour partage son souffle avec de minuscules spores, puis laisse l’essaim devenir un refuge vivant.',
      style: 'Essaim · invocation · croissance', power: 'Petite floraison', powerText: 'Pour 2 Élan : invoque une Spore 1/1 dans un lieu.', powerEffect: 'summonSpore'
    }
  ];

  const locations = [
    { id: 'brisants', name: 'Les Trois Brisants', epithet: 'Les îles qu’on s’échange', icon: '⌁', artPosition: '17% 58%', rule: 'Le premier serviteur joué ici depuis ta main à ton tour gagne +1 Attaque.', detail: 'Les cordages se retendent d’île en île au rythme de la marée.' },
    { id: 'foret', name: 'La Forêt renversée', epithet: 'Les racines dans le ciel', icon: '♧', artPosition: '51% 38%', rule: 'À la première mort d’un de tes serviteurs ici à ton tour, soigne ton héros de 1.', detail: 'Ses lanternes-fruits éclairent les souvenirs qui n’ont pas encore trouvé leur nom.' },
    { id: 'phare', name: 'Le Phare sans côte', epithet: 'Une lumière à la dérive', icon: '✧', artPosition: '83% 57%', rule: 'Ton premier sort lancé ici à chaque tour coûte 1 Élan de moins (minimum 1).', detail: 'Il guide les navires vers une côte qui n’apparaît que dans les cartes.' }
  ];

  const cards = [
    { id: 'aiguille-nacre', faction: 'veilleurs', name: 'Aiguille de nacre', cost: 1, type: 'Serviteur', attack: 1, health: 2, artFocus: 'an adventurer with a bright pearl compass', text: 'Une petite lumière suffit pour retrouver le fil.', effect: 'plain' },
    { id: 'gardien-amarres', faction: 'veilleurs', name: 'Gardien des amarres', cost: 2, type: 'Serviteur', attack: 2, health: 3, artFocus: 'a stout rope keeper with a brass hook', text: 'À l’arrivée : donne +1 PV à un autre allié ici.', effect: 'healAllyHere' },
    { id: 'vigie-brisants', faction: 'veilleurs', name: 'Vigie des Brisants', cost: 3, type: 'Serviteur', attack: 2, health: 4, guard: true, artFocus: 'a lookout raising a little round shield', text: 'Garde — protège ton héros dans son lieu.', effect: 'plain' },
    { id: 'cartographe-attaches', faction: 'veilleurs', name: 'Cartographe des attaches', cost: 3, type: 'Serviteur', attack: 3, health: 2, artFocus: 'a cartographer unrolling a map', text: 'À l’arrivée : soigne ton héros de 3.', effect: 'healHero' },
    { id: 'sentinelle-atlas', faction: 'veilleurs', name: 'Sentinelle du grand atlas', cost: 5, type: 'Serviteur', attack: 4, health: 6, artFocus: 'a gentle giant carrying a book shield', text: 'À l’arrivée : donne +1 PV à tes autres serviteurs.', effect: 'teamHealth' },
    { id: 'fil-protecteur', faction: 'veilleurs', name: 'Fil protecteur', cost: 2, type: 'Sort', artFocus: 'a shining protective thread around an ally', text: 'Un allié gagne +3 PV et Garde jusqu’à ton prochain tour.', effect: 'protectAlly', target: 'ally' },

    { id: 'page-calcinee', faction: 'cendres', name: 'Page calcinée', cost: 1, type: 'Serviteur', attack: 2, health: 1, artFocus: 'a quick masked ember courier', text: '« Ce souvenir pique encore. »', effect: 'plain' },
    { id: 'recitant-naufrages', faction: 'cendres', name: 'Récitant des naufrages', cost: 2, type: 'Serviteur', attack: 2, health: 2, artFocus: 'an old storyteller with a floating paper bird', text: 'Si un de tes serviteurs est mort ce tour : inflige 2 dégâts au héros ennemi.', effect: 'deathPing' },
    { id: 'veuve-cloches', faction: 'cendres', name: 'Veuve des cloches', cost: 3, type: 'Serviteur', attack: 3, health: 3, artFocus: 'a bell keeper ringing a blackened handbell', text: 'À l’arrivée : inflige 1 dégât à un serviteur ennemi.', effect: 'pingEnemy' },
    { id: 'chien-suie', faction: 'cendres', name: 'Chien de suie', cost: 4, type: 'Serviteur', attack: 4, health: 3, rush: true, artFocus: 'a lively soot hound leaping through smoke', text: 'Ruée — peut attaquer un serviteur dès son arrivée.', effect: 'plain' },
    { id: 'archiviste-visage', faction: 'cendres', name: 'Archiviste sans visage', cost: 5, type: 'Serviteur', attack: 4, health: 5, artFocus: 'a masked archivist among floating books', text: 'À la mort d’un autre allié : gagne +1 Attaque.', effect: 'deathGain' },
    { id: 'derniere-etincelle', faction: 'cendres', name: 'Dernière étincelle', cost: 2, type: 'Sort', artFocus: 'an ember cracking a protective shell', text: 'Inflige 3 dégâts à un serviteur.', effect: 'deal3', target: 'enemy' },

    { id: 'eclaireur-passes', faction: 'marees', name: 'Éclaireur des passes', cost: 1, type: 'Serviteur', attack: 1, health: 2, artFocus: 'a skiff scout spotting a safe channel', text: 'Toujours une route, même dans le brouillard.', effect: 'plain' },
    { id: 'passeuse-brisants', faction: 'marees', name: 'Passeuse des Brisants', cost: 2, type: 'Serviteur', attack: 2, health: 2, artFocus: 'a ferry captain carrying a tiny boat', text: 'À l’arrivée : déplace un autre allié vers un lieu libre.', effect: 'moveAlly' },
    { id: 'danseuse-ressac', faction: 'marees', name: 'Danseuse de ressac', cost: 3, type: 'Serviteur', attack: 3, health: 3, artFocus: 'a nimble dancer skipping over a wave', text: 'Après son attaque : tu peux la déplacer.', effect: 'drift' },
    { id: 'sirene-baies', faction: 'marees', name: 'Sirène des trois baies', cost: 4, type: 'Serviteur', attack: 3, health: 4, artFocus: 'a bright-eyed siren with a shell whistle', text: 'À l’arrivée : renvoie le plus faible serviteur ennemi dans sa main.', effect: 'bounceEnemy' },
    { id: 'albatros-detour', faction: 'marees', name: 'Albatros du détour', cost: 5, type: 'Serviteur', attack: 4, health: 5, artFocus: 'a proud albatross with a route map ribbon', text: 'À l’arrivée : ton prochain serviteur joué depuis ta main dans un autre lieu ce tour gagne +1 Attaque.', effect: 'laneBuff' },
    { id: 'courant-inverse', faction: 'marees', name: 'Courant inverse', cost: 2, type: 'Sort', artFocus: 'a blue current carrying a tiny boat across a map', text: 'Déplace un serviteur vers un autre lieu.', effect: 'moveAny', target: 'any' },

    { id: 'sporeveille', faction: 'myceles', name: 'Sporeveille', cost: 1, type: 'Serviteur', attack: 1, health: 2, artFocus: 'a sleepy little mushroom spirit', text: 'À sa mort : fait naître une Spore 1/1 ici.', effect: 'sporeOnDeath' },
    { id: 'bergeron-racines', faction: 'myceles', name: 'Bergeron des racines', cost: 2, type: 'Serviteur', attack: 2, health: 2, artFocus: 'a smiling mushroom gardener with a twig staff', text: 'À l’arrivée : invoque une Spore 1/1 ici.', effect: 'spawnOne' },
    { id: 'garde-talus', faction: 'myceles', name: 'Garde-talus', cost: 3, type: 'Serviteur', attack: 2, health: 5, guard: true, artFocus: 'a squat mossy guardian with a bark shield', text: 'Garde — protège ton héros dans son lieu.', effect: 'plain' },
    { id: 'bete-lisiere', faction: 'myceles', name: 'Bête de lisière', cost: 4, type: 'Serviteur', attack: 4, health: 4, artFocus: 'a curious antlered forest beast', text: 'Si un allié est mort ce tour : gagne +2/+2.', effect: 'mossGrowth' },
    { id: 'matriarche-mousses', faction: 'myceles', name: 'Matriarche des mousses', cost: 6, type: 'Serviteur', attack: 4, health: 7, artFocus: 'a warm giant mushroom mother with little spores', text: 'À l’arrivée : invoque jusqu’à deux Spores 1/1 ici.', effect: 'spawnTwo' },
    { id: 'floraison-captive', faction: 'myceles', name: 'Floraison captive', cost: 3, type: 'Sort', artFocus: 'two glowing spores opening in a forest', text: 'Invoque deux Spores 1/1 dans le lieu choisi.', effect: 'spawnTwoSpell' }
  ];

  const artFiles = {
    veilleurs: 'assets/cards-veilleurs.jpg', cendres: 'assets/cards-cendres.jpg',
    marees: 'assets/cards-marees.jpg', myceles: 'assets/cards-myceles.jpg'
  };
  const artCounts = Object.fromEntries(factions.map((faction) => [faction.id, 0]));
  cards.forEach((card) => {
    card.artIndex = artCounts[card.faction]++;
    card.cardArt = artFiles[card.faction];
    const column = card.artIndex % 3;
    const row = Math.floor(card.artIndex / 3);
    card.artPosition = `${column * 50}% ${row * 100}%`;
  });

  window.AtlasData = { factions, locations, cards };
})();

