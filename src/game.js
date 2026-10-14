(() => {
  'use strict';
  const { factions, locations, cards } = window.AtlasData;
  const $ = (id) => document.getElementById(id);
  const sideIds = ['player', 'enemy'];
  let game = null;
  let chosenFaction = factions[0].id;
  let aiTimer = null;
  let gameSerial = 0;
  let collectionFilter = 'all';

  const factionFor = (id) => factions.find((f) => f.id === id);
  const spriteImage = (card, className) => {
    const index = Number.isInteger(card.artIndex) ? card.artIndex : 0;
    return `<img class="${className}" src="${card.cardArt}" alt="" loading="lazy" decoding="async" style="--sprite-col:${index % 3};--sprite-row:${Math.floor(index / 3)}">`;
  };
  function snapshotRect(element) {
    if (!element?.getBoundingClientRect) return null;
    const { left, top, width, height } = element.getBoundingClientRect();
    return { left, top, width, height };
  }

  function unitElement(instanceId) {
    return Array.from(document.querySelectorAll('[data-unit]')).find((element) => element.dataset.unit === instanceId) || null;
  }

  function queueUnitFloat(unit, label, tone = 'damage') {
    if (!game?.visualEvents) return;
    game.visualEvents.push({ type: 'unitFloat', unitId: unit.instanceId, rect: snapshotRect(unitElement(unit.instanceId)), label, tone });
  }

  function animateClass(element, className, duration = 760) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), duration);
  }

  function showCombatFloat(rect, label, tone = 'damage') {
    if (!rect) return;
    const float = document.createElement('span');
    float.className = `combat-float ${tone}`;
    float.textContent = label;
    float.style.left = `${rect.left + rect.width / 2}px`;
    float.style.top = `${rect.top + rect.height * 0.28}px`;
    document.body.appendChild(float);
    window.setTimeout(() => float.remove(), 1050);
  }

  function animateHealthCounter(ownerId, from, to) {
    const counter = $(`${ownerId}Hp`);
    if (!counter) return;
    if (counter._healthFrame) cancelAnimationFrame(counter._healthFrame);
    const startedAt = performance.now();
    const duration = 560;
    const start = Math.max(0, from);
    const finish = Math.max(0, to);
    counter.textContent = String(start);
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(start + (finish - start) * eased));
      if (progress < 1) counter._healthFrame = requestAnimationFrame(step);
      else { counter.textContent = String(finish); counter._healthFrame = 0; }
    };
    counter._healthFrame = requestAnimationFrame(step);
  }

  function animateCardFlight(cardClone, fromRect, toRect) {
    if (!cardClone || !fromRect || !toRect) return;
    cardClone.classList.remove('selected');
    cardClone.classList.add('card-flight-clone');
    cardClone.removeAttribute('data-card');
    cardClone.setAttribute('aria-hidden', 'true');
    Object.assign(cardClone.style, {
      position: 'fixed', left: `${fromRect.left}px`, top: `${fromRect.top}px`,
      width: `${fromRect.width}px`, height: `${fromRect.height}px`, margin: '0',
      zIndex: '10000', pointerEvents: 'none', transform: 'none'
    });
    document.body.appendChild(cardClone);
    const dx = toRect.left + toRect.width / 2 - fromRect.left - fromRect.width / 2;
    const dy = toRect.top + toRect.height / 2 - fromRect.top - fromRect.height / 2;
    const scale = Math.min(0.72, toRect.width / fromRect.width, toRect.height / fromRect.height);
    const flight = cardClone.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1.2)' },
      { transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(7deg)`, opacity: 0.08, filter: 'brightness(1.8)' }
    ], { duration: 640, easing: 'cubic-bezier(.18,.82,.24,1)', fill: 'forwards' });
    flight.onfinish = () => cardClone.remove();
  }

  function laneElement(ownerId, lane) {
    const row = $(ownerId === 'enemy' ? 'enemyBoard' : 'playerBoard');
    return Array.from(row?.querySelectorAll('[data-lane]') || []).find((element) => Number(element.dataset.lane) === lane) || null;
  }

  function runVisualEvents() {
    if (!game?.visualEvents?.length) return;
    const events = game.visualEvents.splice(0);
    events.forEach((event, index) => {
      if (event.type === 'summon') {
        const unit = unitElement(event.unitId);
        if (unit) animateClass(unit, 'unit-summon', 820);
        animateClass(laneElement(event.ownerId, event.lane), 'lane-burst', 780);
        if (event.cardClone) animateCardFlight(event.cardClone, event.sourceRect, snapshotRect(unit));
      } else if (event.type === 'draw') {
        window.setTimeout(() => {
          const card = Array.from($('handRow').querySelectorAll('[data-card]')).find((element) => element.dataset.card === event.cardId);
          animateClass(card, 'card-draw', 760);
        }, event.delay || 0);
      } else if (event.type === 'turnStart') {
        animateClass($('turnRibbon'), 'turn-start', 900);
        const hero = $(event.ownerId === 'enemy' ? 'enemyHp' : 'playerHp')?.closest('.health-medallion');
        animateClass(hero, 'hero-ready', 900);
      } else if (event.type === 'clash') {
        const attacker = unitElement(event.attackerId);
        const defender = unitElement(event.defenderId);
        if (attacker) {
          attacker.style.setProperty('--attack-first', event.attackerOwner === 'enemy' ? '24px' : '-24px');
          attacker.style.setProperty('--attack-back', event.attackerOwner === 'enemy' ? '-16px' : '16px');
          animateClass(attacker, 'unit-attacking', 650);
        }
        animateClass(defender, 'unit-struck', 720);
        showCombatFloat(event.defenderRect, `−${event.defenderDamage}`, 'damage');
        showCombatFloat(event.attackerRect, `−${event.attackerDamage}`, 'damage');
        animateClass(laneElement(event.attackerOwner, event.lane), 'lane-burst', 780);
      } else if (event.type === 'heroStrike') {
        const attacker = unitElement(event.attackerId);
        if (attacker) {
          attacker.style.setProperty('--attack-first', event.attackerOwner === 'enemy' ? '24px' : '-24px');
          attacker.style.setProperty('--attack-back', event.attackerOwner === 'enemy' ? '-16px' : '16px');
          animateClass(attacker, 'unit-attacking', 650);
        }
      } else if (event.type === 'heroDamage' || event.type === 'heroHeal') {
        const badge = $(`${event.ownerId}Hp`)?.closest('.health-medallion');
        animateClass(badge, event.type === 'heroDamage' ? 'health-hit' : 'health-heal', 760);
        animateHealthCounter(event.ownerId, event.from, event.to);
        showCombatFloat(event.rect, event.type === 'heroDamage' ? `−${event.amount}` : `+${event.amount}`, event.type === 'heroDamage' ? 'damage' : 'healing');
      } else if (event.type === 'unitFloat') {
        animateClass(unitElement(event.unitId), event.tone === 'damage' ? 'unit-struck' : 'unit-buffed', 720);
        showCombatFloat(event.rect, event.label, event.tone);
      } else if (event.type === 'death') {
        showCombatFloat(event.rect, '✦', 'death');
      } else if (event.type === 'spell') {
        const place = Array.from($('locationsRow').querySelectorAll('[data-location]')).find((element) => Number(element.dataset.location) === event.lane);
        animateClass(place, 'spell-burst', 850);
        if (event.cardClone) animateCardFlight(event.cardClone, event.sourceRect, event.targetRect || snapshotRect(place));
      } else if (event.type === 'move') {
        const unit = unitElement(event.unitId);
        animateClass(unit, 'unit-moved', 760);
        showCombatFloat(snapshotRect(unit) || event.targetRect, '⇢', 'healing');
        animateClass(laneElement(event.ownerId, event.lane), 'lane-burst', 780);
      }
    });
  }
  const side = (id = game?.active) => game.players[id];
  const otherId = (id) => id === 'player' ? 'enemy' : 'player';
  const unitById = (id) => game?.players.player.board.flat().concat(game?.players.enemy.board.flat()).find((u) => u.instanceId === id);
  const allUnits = () => sideIds.flatMap((id) => game.players[id].board.flat());
  const unitsAt = (sideId, lane) => game.players[sideId].board[lane];
  const boardCount = (sideId) => game.players[sideId].board.reduce((n, lane) => n + lane.length, 0);
  const laneLabel = (index) => locations[index]?.name || 'ce lieu';
  const log = (message, tone = '') => {
    $('logText').textContent = message;
    $('gameLog').classList.toggle('hint-warn', tone === 'warn');
  };

  function makeCardInstance(template, owner) {
    return { ...template, instanceId: `${owner}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`, owner };
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function replaceStartingCards(p, selectedIds) {
    const selected = new Set(selectedIds);
    const rejected = p.hand.filter((card) => selected.has(card.instanceId));
    if (!rejected.length) return 0;
    p.hand = p.hand.filter((card) => !selected.has(card.instanceId));
    p.hand.push(...p.deck.splice(0, rejected.length));
    p.deck.push(...rejected);
    shuffle(p.deck);
    return rejected.length;
  }

  function makePlayer(id, factionId) {
    const faction = factionFor(factionId);
    const deck = shuffle(cards.filter((card) => card.faction === factionId).flatMap((card) => [makeCardInstance(card, id), makeCardInstance(card, id)]));
    return {
      id, faction, hp: 20, maxMana: 0, mana: 0, deck, hand: [], graveyard: [], board: [[], [], []],
      fatigue: 0, turns: 0, heroPowerUsed: false, deathsThisTurn: 0,
      brisantsUsed: [false, false, false], forestHealUsed: [false, false, false], spellDiscountUsed: [false, false, false], nextLaneBuff: null
    };
  }

  function openGame(factionId) {
    if (aiTimer) clearTimeout(aiTimer);
    gameSerial += 1;
    const enemyFaction = factions[(factions.findIndex((f) => f.id === factionId) + 1) % factions.length];
    game = {
      serial: gameSerial, active: 'player', turnNumber: 0, done: false, busy: false, phase: 'mulligan', mulliganSelected: [],
      selection: null, pending: null, visualEvents: [],
      players: { player: makePlayer('player', factionId), enemy: makePlayer('enemy', enemyFaction.id) }
    };
    game.players.player.hand = game.players.player.deck.splice(0, 3);
    game.players.player.hand.forEach((card, index) => game.visualEvents.push({ type: 'draw', cardId: card.instanceId, delay: index * 90 }));
    game.players.enemy.hand = game.players.enemy.deck.splice(0, 3);
    replaceStartingCards(game.players.enemy, game.players.enemy.hand.filter((card) => card.cost >= 4).map((card) => card.instanceId));
    $('homeScreen').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    $('matchHeading').textContent = 'DUEL DE L’ATLAS';
    updateFactionLabels();
    render();
    showMulligan();
    log('Choisis les cartes de départ que tu souhaites remplacer.');
  }

  function startTurn(id) {
    if (!game || game.done) return;
    game.active = id;
    game.turnNumber += id === 'player' ? 1 : 0;
    const p = side(id);
    game.visualEvents.push({ type: 'turnStart', ownerId: id });
    p.turns += 1;
    p.maxMana = Math.min(7, p.maxMana + 1);
    p.mana = p.maxMana;
    p.heroPowerUsed = false;
    p.deathsThisTurn = 0;
    p.brisantsUsed = [false, false, false];
    p.forestHealUsed = [false, false, false];
    p.spellDiscountUsed = [false, false, false];
    p.nextLaneBuff = null;
    game.selection = null;
    game.pending = null;
    p.board.flat().forEach((unit) => { unit.attacksThisTurn = 0; });
    p.board.flat().forEach((unit) => {
      if (unit.tempGuardUntil !== undefined && p.turns >= unit.tempGuardUntil) delete unit.tempGuardUntil;
    });
    drawCard(p);
    if (game.done) return;
    if (id === 'player') log(`Ton tour ${p.turns} commence. Tu as ${p.mana} Élan.`);
  }

  function drawCard(p) {
    if (p.hand.length >= 10) {
      if (p.deck.length) {
        const burned = p.deck.shift();
        p.graveyard.push(burned);
        log(`${p.faction.short} : main pleine, ${burned.name} est perdue.`, 'warn');
      } else {
        p.fatigue += 1;
        damageHero(p.id, p.fatigue, 'la fatigue');
      }
      return;
    }
    if (!p.deck.length) {
      p.fatigue += 1;
      damageHero(p.id, p.fatigue, 'la fatigue');
      return;
    }
    const card = p.deck.shift();
    p.hand.push(card);
    if (p.id === 'player') game.visualEvents.push({ type: 'draw', cardId: card.instanceId });
  }

  function healHero(id, amount) {
    const p = side(id);
    const before = p.hp;
    p.hp = Math.min(20, p.hp + amount);
    const healed = p.hp - before;
    if (healed > 0 && game?.visualEvents) {
      const badge = $(`${id}Hp`)?.closest('.health-medallion');
      game.visualEvents.push({ type: 'heroHeal', ownerId: id, from: before, to: p.hp, amount: healed, rect: snapshotRect(badge) });
    }
    return healed;
  }

  function damageHero(id, amount, source = 'une attaque') {
    if (!game || game.done) return;
    const p = side(id);
    const before = p.hp;
    const badge = $(`${id}Hp`)?.closest('.health-medallion');
    p.hp -= amount;
    const actualDamage = Math.max(0, Math.min(before, amount));
    if (actualDamage > 0) game.visualEvents.push({ type: 'heroDamage', ownerId: id, from: before, to: p.hp, amount: actualDamage, rect: snapshotRect(badge) });
    checkVictory(source);
  }

  function checkVictory(reason = '') {
    if (game.done) return true;
    const playerDead = game.players.player.hp <= 0;
    const enemyDead = game.players.enemy.hp <= 0;
    if (!playerDead && !enemyDead) return false;
    game.done = true;
    game.busy = false;
    game.selection = null;
    game.pending = null;
    const winner = playerDead && enemyDead ? 'draw' : playerDead ? 'enemy' : 'player';
    showResult(winner, reason);
    render();
    return true;
  }

  function addUnit(ownerId, template, lane, options = {}) {
    const p = side(ownerId);
    if (boardCount(ownerId) >= 7 || p.board[lane].length >= 3) return null;
    const unit = {
      instanceId: `unit-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`,
      owner: ownerId, cardId: template.id, name: template.name, faction: template.faction || p.faction.id,
      artFocus: template.artFocus || 'a tiny glowing forest spore',
      art: template.cardArt || template.art || factionFor(template.faction || p.faction.id).art,
      artIndex: template.artIndex ?? 0,
      artPosition: template.artPosition || '50% 0%',
      attack: template.attack ?? 1, hp: template.health ?? 1, maxHp: template.health ?? 1,
      guard: !!template.guard, rush: !!template.rush, effect: template.effect || 'plain', lane,
      summonedTurn: p.turns, attacksThisTurn: 0, token: !!options.token
    };

    if (!options.token && lane === 0 && !p.brisantsUsed[lane]) {
      unit.attack += 1;
      p.brisantsUsed[lane] = true;
      if (ownerId === 'player') log(`${unit.name} prend de l’élan aux Trois Brisants (+1 Attaque).`);
    }
    if (!options.token && p.nextLaneBuff && p.nextLaneBuff.lane !== lane) {
      unit.attack += 1;
      p.nextLaneBuff = null;
      if (ownerId === 'player') log(`${unit.name} suit le détour de l’Albatros (+1 Attaque).`);
    }
    p.board[lane].push(unit);
    game.visualEvents?.push({ type: 'summon', unitId: unit.instanceId, ownerId, lane });
    return unit;
  }

  function canSummon(ownerId, lane, amount = 1) {
    const p = side(ownerId);
    return Number.isInteger(lane) && !!p.board[lane] && boardCount(ownerId) + amount <= 7 && p.board[lane].length + amount <= 3;
  }

  function canMoveTo(unit, lane) {
    return !!unit && lane !== unit.lane && side(unit.owner).board[lane].length < 3;
  }

  function summonSpore(ownerId, lane) {
    return addUnit(ownerId, { id: 'spore-token', name: 'Spore', faction: 'myceles', attack: 1, health: 1, effect: 'plain', artFocus: 'a tiny smiling mushroom spirit', cardArt: 'assets/cards-myceles.png', artIndex: 0, artPosition: '0% 0%' }, lane, { token: true });
  }

  function removeCardFromHand(p, cardId) {
    const index = p.hand.findIndex((card) => card.instanceId === cardId);
    if (index < 0) return null;
    return p.hand.splice(index, 1)[0];
  }

  function paySpell(p, card, lane) {
    const discounted = !p.spellDiscountUsed[lane];
    const cost = discounted ? Math.max(1, card.cost - 1) : card.cost;
    if (p.mana < cost) {
      log(`Il te faut ${cost} Élan pour lancer ${card.name}.`, 'warn');
      return false;
    }
    p.mana -= cost;
    if (discounted) p.spellDiscountUsed[lane] = true;
    return true;
  }

  function playMinion(ownerId, cardId, lane) {
    const p = side(ownerId);
    const card = p.hand.find((item) => item.instanceId === cardId);
    if (!card || !canSummon(ownerId, lane)) {
      if (ownerId === 'player') log(boardCount(ownerId) >= 7 ? 'Ton plateau est complet : sept serviteurs maximum.' : `Il n’y a plus de place aux ${laneLabel(lane)}.`, 'warn');
      return false;
    }
    if (p.mana < card.cost) {
      log(`Il te faut ${card.cost} Élan pour jouer ${card.name}.`, 'warn');
      return false;
    }
    const sourceCard = ownerId === 'player'
      ? Array.from($('handRow').querySelectorAll('[data-card]')).find((element) => element.dataset.card === cardId)
      : null;
    const cardClone = sourceCard?.cloneNode(true) || null;
    const sourceRect = snapshotRect(sourceCard);
    p.mana -= card.cost;
    const played = removeCardFromHand(p, cardId);
    const unit = addUnit(ownerId, played, lane);
    if (!unit) return false;
    const summonEvent = game.visualEvents[game.visualEvents.length - 1];
    if (summonEvent?.unitId === unit.instanceId) Object.assign(summonEvent, { cardClone, sourceRect });
    resolveBattlecry(ownerId, unit, card, lane);
    if (ownerId === 'player') log(`${card.name} rejoint l’atlas aux ${laneLabel(lane)}.`);
    return true;
  }

  function resolveBattlecry(ownerId, unit, card, lane) {
    const p = side(ownerId);
    const enemy = side(otherId(ownerId));
    const friendly = p.board.flat().filter((other) => other.instanceId !== unit.instanceId);
    const weakestFriendly = friendly.slice().sort((a, b) => a.hp - b.hp || a.attack - b.attack)[0];
    const weakestHere = p.board[lane].filter((other) => other.instanceId !== unit.instanceId).sort((a, b) => a.hp - b.hp)[0];
    switch (card.effect) {
      case 'healAllyHere':
        if (weakestHere) { weakestHere.hp = Math.min(weakestHere.maxHp + 1, weakestHere.hp + 1); weakestHere.maxHp += 1; }
        break;
      case 'healHero':
        healHero(ownerId, 3);
        break;
      case 'teamHealth':
        friendly.forEach((ally) => { queueUnitFloat(ally, '+1 PV', 'healing'); ally.maxHp += 1; ally.hp += 1; });
        break;
      case 'deathPing':
        if (p.deathsThisTurn > 0) damageHero(enemy.id, 2, card.name);
        break;
      case 'pingEnemy': {
        const target = enemy.board.flat().sort((a, b) => a.hp - b.hp || a.attack - b.attack)[0];
        if (target) { queueUnitFloat(target, '−1', 'damage'); target.hp -= 1; removeDead(target); }
        break;
      }
      case 'spawnOne': summonSpore(ownerId, lane); break;
      case 'spawnTwo': summonSpore(ownerId, lane); summonSpore(ownerId, lane); break;
      case 'mossGrowth':
        if (p.deathsThisTurn > 0) { unit.attack += 2; unit.hp += 2; unit.maxHp += 2; }
        break;
      case 'moveAlly':
        if (friendly.length) {
          const mover = weakestFriendly;
          const destination = locations.map((_, i) => i).find((i) => canMoveTo(mover, i));
          if (destination !== undefined) moveUnit(mover, destination);
        }
        break;
      case 'bounceEnemy': {
        const target = enemy.board.flat().sort((a, b) => a.attack + a.hp - (b.attack + b.hp))[0];
        if (target) bounceUnit(target);
        break;
      }
      case 'laneBuff': p.nextLaneBuff = { lane, used: false }; break;
      default: break;
    }
  }

  function moveUnit(unit, destination) {
    const p = side(unit.owner);
    if (!canMoveTo(unit, destination)) return false;
    const sourceRect = snapshotRect(unitElement(unit.instanceId));
    const oldLane = unit.lane;
    p.board[oldLane] = p.board[oldLane].filter((candidate) => candidate.instanceId !== unit.instanceId);
    unit.lane = destination;
    p.board[destination].push(unit);
    game.visualEvents.push({ type: 'move', unitId: unit.instanceId, ownerId: unit.owner, lane: destination, sourceRect });
    return true;
  }

  function bounceUnit(unit) {
    const owner = side(unit.owner);
    if (!unit.token && owner.hand.length < 10) {
      const template = cards.find((card) => card.id === unit.cardId);
      if (template) owner.hand.push(makeCardInstance(template, owner.id));
      else owner.hand.push(makeCardInstance({ id: unit.cardId, name: unit.name, faction: unit.faction, cost: 1, type: 'Serviteur', attack: unit.attack, health: unit.maxHp, effect: 'plain' }, owner.id));
    }
    owner.board[unit.lane] = owner.board[unit.lane].filter((candidate) => candidate.instanceId !== unit.instanceId);
  }

  function removeDead(unit) {
    if (!game || game.done || unit.hp > 0) return;
    const owner = side(unit.owner);
    const lane = unit.lane;
    game.visualEvents.push({ type: 'death', rect: snapshotRect(unitElement(unit.instanceId)) });
    owner.board[lane] = owner.board[lane].filter((candidate) => candidate.instanceId !== unit.instanceId);
    owner.deathsThisTurn += 1;
    if (game.active === owner.id && lane === 1 && !owner.forestHealUsed[lane]) {
      owner.forestHealUsed[lane] = true;
      healHero(owner.id, 1);
    }
    owner.board.flat().filter((ally) => ally.effect === 'deathGain' && ally.instanceId !== unit.instanceId).forEach((ally) => { ally.attack += 1; });
    if (unit.effect === 'sporeOnDeath' && canSummon(owner.id, lane)) summonSpore(owner.id, lane);
    owner.graveyard.push({ id: unit.cardId, name: unit.name });
  }

  function selectCard(cardId) {
    if (!isPlayerAction()) return;
    if (game.pending) { log('Annule d’abord l’action en cours pour choisir une autre carte.', 'warn'); return; }
    const p = side('player');
    const card = p.hand.find((item) => item.instanceId === cardId);
    if (!card) return;
    if (game.selection?.cardId === cardId) {
      game.selection = null;
      log('Sélection annulée. Choisis ta prochaine action.');
    } else if (card.type === 'Serviteur') {
      game.selection = { kind: 'minion', cardId };
      log(`Choisis un lieu pour ${card.name}.`);
    } else if (card.effect === 'spawnTwoSpell') {
      game.selection = { kind: 'spellLane', cardId };
      log(`Choisis un lieu pour lancer ${card.name}.`);
    } else {
      game.selection = { kind: 'spellTarget', cardId };
      log(card.target === 'ally' ? `Choisis un serviteur allié pour ${card.name}.` : card.effect === 'moveAny' ? `Choisis un serviteur, puis sa destination, pour ${card.name}.` : `Choisis un serviteur ennemi pour ${card.name}.`);
    }
    render();
  }

  function cardByInstance(ownerId, cardId) {
    return side(ownerId).hand.find((card) => card.instanceId === cardId);
  }

  function isPlayerAction() {
    return game && game.phase === 'playing' && !game.done && !game.busy && game.active === 'player';
  }

  function laneClick(lane) {
    if (!isPlayerAction()) return;
    if (game.pending?.kind === 'moveDestination') {
      const pending = game.pending;
      const unit = unitById(pending.unitId);
      if (!canMoveTo(unit, lane)) { log('Choisis un autre lieu où il reste une place.', 'warn'); return; }
      if (pending.cardId) {
        const p = side('player');
        const card = cardByInstance('player', pending.cardId);
        if (!card || !paySpell(p, card, pending.costLane)) return;
        p.graveyard.push(removeCardFromHand(p, pending.cardId));
      } else if (pending.power) {
        if (side('player').mana < 2) return;
        side('player').mana -= 2;
        side('player').heroPowerUsed = true;
      }
      moveUnit(unit, lane);
      game.pending = null;
      game.selection = null;
      log(`${unit.name} traverse l’atlas jusqu’aux ${laneLabel(lane)}.`);
      render();
      return;
    }
    if (game.pending?.kind === 'drift') {
      const unit = unitById(game.pending.unitId);
      if (!canMoveTo(unit, lane)) { log('Choisis un autre lieu libre pour la Danseuse.', 'warn'); return; }
      moveUnit(unit, lane);
      game.pending = null;
      log(`La Danseuse de ressac glisse jusqu’aux ${laneLabel(lane)}.`);
      render();
      return;
    }
    if (game.selection?.kind === 'minion') {
      const card = cardByInstance('player', game.selection.cardId);
      if (!card) return;
      if (!canSummon('player', lane)) { log(boardCount('player') >= 7 ? 'Sept serviteurs maximum : aucun autre ne peut entrer.' : `Il n’y a plus de place aux ${laneLabel(lane)}.`, 'warn'); return; }
      const ok = playMinion('player', card.instanceId, lane);
      if (ok) game.selection = null;
      render();
      return;
    }
    if (game.selection?.kind === 'spellLane') {
      const card = cardByInstance('player', game.selection.cardId);
      if (!card) return;
      castSpellAtLane(card, lane);
      return;
    }
    if (game.pending?.kind === 'powerLane') {
      if (!canSummon('player', lane)) { log('Il n’y a plus de place dans ce lieu.', 'warn'); return; }
      const p = side('player');
      if (p.mana < 2 || p.heroPowerUsed) return;
      p.mana -= 2;
      p.heroPowerUsed = true;
      summonSpore('player', lane);
      game.pending = null;
      log(`Une Spore pousse aux ${laneLabel(lane)}.`);
      render();
    }
  }

  function minionClick(unitId) {
    if (!isPlayerAction()) return;
    const unit = unitById(unitId);
    if (!unit) return;
    if (game.pending?.kind === 'spellTarget') {
      const pending = game.pending;
      const card = cardByInstance('player', pending.cardId);
      if (!card || !isValidSpellTarget(card, unit, 'player')) { log('Cette carte ne peut pas cibler ce serviteur.', 'warn'); return; }
      if (card.effect === 'moveAny') {
        game.pending = { kind: 'moveDestination', unitId, cardId: card.instanceId, costLane: unit.lane };
        game.selection = null;
        log(`Choisis le nouveau lieu pour ${unit.name}.`);
        render();
        return;
      }
      castTargetSpell(card, unit);
      return;
    }
    if (game.pending?.kind === 'heroTarget') {
      const p = side('player');
      const power = p.faction.powerEffect;
      if (power === 'healAlly' && unit.owner !== 'player') { log('Choisis un allié à soigner.', 'warn'); return; }
      if (power === 'damageAlly' && unit.owner !== 'enemy') { log('Choisis un serviteur ennemi.', 'warn'); return; }
      if (power === 'moveAlly' && unit.owner !== 'player') { log('Choisis un allié à déplacer.', 'warn'); return; }
      if (power === 'moveAlly') {
        game.pending = { kind: 'moveDestination', unitId, power: true, costLane: unit.lane };
        log(`Choisis un autre lieu libre pour ${unit.name}.`);
        render();
        return;
      }
      p.mana -= 2;
      p.heroPowerUsed = true;
      if (power === 'healAlly') { queueUnitFloat(unit, '+2 PV', 'healing'); unit.hp = Math.min(unit.maxHp + 2, unit.hp + 2); unit.maxHp += 2; log(`${unit.name} reçoit +2 PV.`); }
      if (power === 'damageAlly') { queueUnitFloat(unit, '−2', 'damage'); unit.hp -= 2; removeDead(unit); log(`La Mèche ardente inflige 2 dégâts à ${unit.name}.`); }
      game.pending = null;
      game.selection = null;
      checkVictory('le pouvoir de héros');
      render();
      return;
    }
    if (game.selection?.kind === 'spellTarget') {
      const card = cardByInstance('player', game.selection.cardId);
      if (card && isValidSpellTarget(card, unit, 'player')) {
        if (card.effect === 'moveAny') {
          game.pending = { kind: 'moveDestination', unitId, cardId: card.instanceId, costLane: unit.lane };
          game.selection = null;
          log(`Choisis le nouveau lieu pour ${unit.name}.`);
          render();
        } else castTargetSpell(card, unit);
      } else if (card) log('Cette carte ne peut pas cibler ce serviteur.', 'warn');
      return;
    }
    if (game.selection?.kind === 'attack') {
      const attacker = unitById(game.selection.unitId);
      if (attacker && unit.owner === 'enemy' && unit.lane === attacker.lane) attackUnit(attacker, unit);
      else if (unit.owner === 'player') chooseAttacker(unit);
      else log('Un serviteur ne peut attaquer qu’un rival dans le même lieu.', 'warn');
      return;
    }
    if (unit.owner === 'player') chooseAttacker(unit);
    else log('Clique d’abord sur un serviteur allié prêt à attaquer.', 'warn');
  }

  function isValidSpellTarget(card, unit, casterId) {
    if (!unit || !game) return false;
    if (card.target === 'ally') return unit.owner === casterId;
    if (card.target === 'enemy') return unit.owner === otherId(casterId);
    if (card.target === 'any') return true;
    return false;
  }

  function castSpellAtLane(card, lane, casterId = 'player') {
    const p = side(casterId);
    if (!canSummon(casterId, lane) && card.effect === 'spawnTwoSpell') { log(`Il n’y a plus de place aux ${laneLabel(lane)}.`, 'warn'); return; }
    const sourceCard = casterId === 'player'
      ? Array.from($('handRow').querySelectorAll('[data-card]')).find((element) => element.dataset.card === card.instanceId)
      : null;
    const cardClone = sourceCard?.cloneNode(true) || null;
    const sourceRect = snapshotRect(sourceCard);
    if (!paySpell(p, card, lane)) return;
    const played = removeCardFromHand(p, card.instanceId);
    p.graveyard.push(played);
    const place = Array.from($('locationsRow').querySelectorAll('[data-location]')).find((element) => Number(element.dataset.location) === lane);
    game.visualEvents.push({ type: 'spell', lane, cardClone, sourceRect, targetRect: snapshotRect(place) });
    if (card.effect === 'spawnTwoSpell') {
      summonSpore(casterId, lane);
      summonSpore(casterId, lane);
      log(`${card.name} fait éclore des spores aux ${laneLabel(lane)}.`);
    }
    game.selection = null;
    render();
  }

  function castTargetSpell(card, target, casterId = 'player') {
    const p = side(casterId);
    const lane = target.lane;
    if (card.effect === 'moveAny') {
      game.pending = { kind: 'moveDestination', unitId: target.instanceId, cardId: card.instanceId, costLane: lane };
      game.selection = null;
      log(`Choisis un nouveau lieu pour ${target.name}.`);
      render();
      return;
    }
    const sourceCard = casterId === 'player'
      ? Array.from($('handRow').querySelectorAll('[data-card]')).find((element) => element.dataset.card === card.instanceId)
      : null;
    const cardClone = sourceCard?.cloneNode(true) || null;
    const sourceRect = snapshotRect(sourceCard);
    const targetRect = snapshotRect(unitElement(target.instanceId));
    if (!paySpell(p, card, lane)) return;
    p.graveyard.push(removeCardFromHand(p, card.instanceId));
    if (card.effect === 'protectAlly') {
      queueUnitFloat(target, '+3 PV · GARDE', 'healing');
      target.maxHp += 3;
      target.hp = Math.min(target.maxHp, target.hp + 3);
      target.tempGuardUntil = p.turns + 1;
      log(`${target.name} reçoit +3 PV et Garde jusqu’à ton prochain tour.`);
    } else if (card.effect === 'deal3') {
      queueUnitFloat(target, '−3', 'damage');
      target.hp -= 3;
      log(`${card.name} inflige 3 dégâts à ${target.name}.`);
      removeDead(target);
    }
    game.visualEvents.push({ type: 'spell', lane, cardClone, sourceRect, targetRect });
    game.selection = null;
    game.pending = null;
    checkVictory(card.name);
    render();
  }

  function chooseAttacker(unit) {
    if (unit.owner !== 'player') return;
    const p = side('player');
    if (game.active !== 'player') return;
    if (unit.attacksThisTurn > 0 || (p.turns <= unit.summonedTurn && !unit.rush)) {
      log(`${unit.name} doit attendre ton prochain tour avant d’attaquer.`, 'warn');
      return;
    }
    game.selection = { kind: 'attack', unitId: unit.instanceId };
    log(`${unit.name} est prêt. Clique une cible ennemie dans son lieu, ou le héros adverse.`);
    render();
  }

  function guardAt(ownerId, lane) {
    return unitsAt(ownerId, lane).filter(isGuarded);
  }

  function isGuarded(unit) {
    const p = side(unit.owner);
    return unit.guard || (unit.tempGuardUntil !== undefined && p.turns < unit.tempGuardUntil);
  }

  function attackUnit(attacker, defender) {
    if (!isPlayerAction()) return;
    if (attacker.owner !== 'player' || defender.owner !== 'enemy' || attacker.lane !== defender.lane) return;
    const guards = guardAt('enemy', attacker.lane);
    if (guards.length && !isGuarded(defender)) { log(`La Garde de ${guards[0].name} bloque ce lieu.`, 'warn'); return; }
    if (attacker.attacksThisTurn > 0 || (side('player').turns <= attacker.summonedTurn && !attacker.rush)) { log(`${attacker.name} n’est pas prêt à attaquer.`, 'warn'); return; }
    game.visualEvents.push({
      type: 'clash', attackerId: attacker.instanceId, defenderId: defender.instanceId, attackerOwner: attacker.owner,
      lane: attacker.lane, attackerDamage: defender.attack, defenderDamage: attacker.attack,
      attackerRect: snapshotRect(unitElement(attacker.instanceId)), defenderRect: snapshotRect(unitElement(defender.instanceId))
    });
    const attackPower = attacker.attack;
    const counterPower = defender.attack;
    attacker.attacksThisTurn += 1;
    defender.hp -= attackPower;
    attacker.hp -= counterPower;
    removeDead(defender);
    removeDead(attacker);
    game.selection = null;
    if (attacker.effect === 'drift' && unitById(attacker.instanceId) && locations.some((_, i) => canMoveTo(attacker, i))) {
      game.pending = { kind: 'drift', unitId: attacker.instanceId };
      log(`${attacker.name} a frappé. Choisis le courant qui l’emportera.`);
    } else log(`${attacker.name} et ${defender.name} s’affrontent aux ${laneLabel(attacker.lane)}.`);
    checkVictory('un combat');
    render();
  }

  function attackHero(attacker) {
    if (!isPlayerAction() || attacker.owner !== 'player') return;
    const p = side('player');
    if (attacker.attacksThisTurn > 0 || (p.turns <= attacker.summonedTurn && !attacker.rush)) { log(`${attacker.name} doit attendre ton prochain tour.`, 'warn'); return; }
    if (attacker.rush && p.turns <= attacker.summonedTurn) { log('Ruée permet d’attaquer un serviteur à l’arrivée, pas le héros.', 'warn'); return; }
    const guards = guardAt('enemy', attacker.lane);
    if (guards.length) { log(`${guards[0].name} garde ce lieu : attaque-le d’abord.`, 'warn'); return; }
    game.visualEvents.push({ type: 'heroStrike', attackerId: attacker.instanceId, attackerOwner: attacker.owner });
    attacker.attacksThisTurn += 1;
    const damage = attacker.attack;
    damageHero('enemy', damage, attacker.name);
    game.selection = null;
    if (attacker.effect === 'drift' && unitById(attacker.instanceId) && locations.some((_, i) => canMoveTo(attacker, i))) {
      game.pending = { kind: 'drift', unitId: attacker.instanceId };
      log(`${attacker.name} frappe le héros adverse. Choisis sa nouvelle route.`);
    } else log(`${attacker.name} frappe le héros adverse pour ${damage} dégâts.`);
    render();
  }

  function targetHeroClick() {
    if (!isPlayerAction()) return;
    if (game.selection?.kind === 'attack') {
      const attacker = unitById(game.selection.unitId);
      if (attacker) attackHero(attacker);
      return;
    }
    if (game.pending?.kind === 'spellTarget' || game.selection?.kind === 'spellTarget') {
      log('Ces sorts ciblent un serviteur, pas un héros.', 'warn');
    }
  }

  function heroPower() {
    if (!isPlayerAction()) return;
    const p = side('player');
    if (p.heroPowerUsed) { log('Tu as déjà utilisé ton pouvoir ce tour.', 'warn'); return; }
    if (p.mana < 2) { log('Il te faut 2 Élan pour utiliser ton pouvoir.', 'warn'); return; }
    const effect = p.faction.powerEffect;
    if (effect === 'summonSpore') {
      game.pending = { kind: 'powerLane' };
      log('Choisis un lieu pour faire naître une Spore 1/1.');
    } else {
      game.pending = { kind: 'heroTarget' };
      if (effect === 'healAlly') log('Choisis un serviteur allié à renforcer de +2 PV.');
      if (effect === 'damageAlly') log('Choisis un serviteur ennemi à frapper pour 2 dégâts.');
      if (effect === 'moveAlly') log('Choisis un allié à déplacer vers un autre lieu.');
    }
    render();
  }

  function unitClickEnemy(unit) {
    if (game.selection?.kind === 'attack' && unit.owner === 'enemy') attackUnit(unitById(game.selection.unitId), unit);
  }

  function aiPickLane(ownerId, preferLane = null) {
    const open = locations.map((_, i) => i).filter((i) => canSummon(ownerId, i));
    if (!open.length) return undefined;
    if (preferLane !== null && open.includes(preferLane)) return preferLane;
    return open.sort((a, b) => {
      const aOpp = unitsAt(otherId(ownerId), a).length;
      const bOpp = unitsAt(otherId(ownerId), b).length;
      const aOwn = unitsAt(ownerId, a).length;
      const bOwn = unitsAt(ownerId, b).length;
      return (bOpp - bOwn) - (aOpp - aOwn) || aOwn - bOwn || a - b;
    })[0];
  }

  function aiProtectTarget() {
    return side('enemy').board.flat().slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp) || b.attack - a.attack)[0];
  }

  function aiPlayCard(card) {
    const p = side('enemy');
    if (card.type === 'Serviteur') {
      const lane = aiPickLane('enemy');
      if (lane === undefined || p.mana < card.cost) return false;
      p.mana -= card.cost;
      removeCardFromHand(p, card.instanceId);
      const unit = addUnit('enemy', card, lane);
      if (!unit) return false;
      resolveBattlecry('enemy', unit, card, lane);
      log(`Les ${p.faction.short} jouent ${card.name} aux ${laneLabel(lane)}.`);
      return true;
    }
    if (card.effect === 'deal3') {
      const target = side('player').board.flat().filter((u) => u.hp <= 3).sort((a, b) => a.hp - b.hp || b.attack - a.attack)[0]
        || side('player').board.flat().sort((a, b) => a.hp - b.hp || b.attack - a.attack)[0];
      if (!target) return false;
      return aiCastTarget(card, target);
    }
    if (card.effect === 'protectAlly') {
      const target = aiProtectTarget();
      return target ? aiCastTarget(card, target) : false;
    }
    if (card.effect === 'spawnTwoSpell') {
      const lane = aiPickLane('enemy');
      if (lane === undefined) return false;
      const current = p.spellDiscountUsed[lane];
      const cost = current ? card.cost : Math.max(1, card.cost - 1);
      if (p.mana < cost) return false;
      p.mana -= cost;
      p.spellDiscountUsed[lane] = true;
      p.graveyard.push(removeCardFromHand(p, card.instanceId));
      summonSpore('enemy', lane); summonSpore('enemy', lane);
      log(`Les ${p.faction.short} lancent ${card.name} aux ${laneLabel(lane)}.`);
      return true;
    }
    if (card.effect === 'moveAny') {
      const mover = side('enemy').board.flat().filter((u) => locations.some((_, i) => canMoveTo(u, i))).sort((a, b) => b.hp - a.hp)[0];
      if (!mover) return false;
      const lane = locations.map((_, i) => i).find((i) => canMoveTo(mover, i));
      if (lane === undefined) return false;
      const current = p.spellDiscountUsed[mover.lane];
      const cost = current ? card.cost : Math.max(1, card.cost - 1);
      if (p.mana < cost) return false;
      p.mana -= cost; p.spellDiscountUsed[mover.lane] = true;
      p.graveyard.push(removeCardFromHand(p, card.instanceId));
      moveUnit(mover, lane);
      log(`Les ${p.faction.short} jouent ${card.name} : ${mover.name} change de lieu.`);
      return true;
    }
    return false;
  }

  function aiCastTarget(card, target) {
    const p = side('enemy');
    const lane = target.lane;
    const cost = p.spellDiscountUsed[lane] ? card.cost : Math.max(1, card.cost - 1);
    if (p.mana < cost) return false;
    p.mana -= cost;
    p.spellDiscountUsed[lane] = true;
    p.graveyard.push(removeCardFromHand(p, card.instanceId));
    if (card.effect === 'deal3') { queueUnitFloat(target, '−3', 'damage'); target.hp -= 3; removeDead(target); log(`Les ${p.faction.short} lancent ${card.name} sur ${target.name}.`); }
    else if (card.effect === 'protectAlly') {
      queueUnitFloat(target, '+3 PV · GARDE', 'healing');
      target.maxHp += 3;
      target.hp = Math.min(target.maxHp, target.hp + 3);
      target.tempGuardUntil = p.turns + 1;
      log(`Les ${p.faction.short} protègent ${target.name} avec ${card.name}.`);
    }
    game.visualEvents.push({ type: 'spell', lane });
    return true;
  }

  function aiUsePower() {
    const p = side('enemy');
    if (p.mana < 2 || p.heroPowerUsed) return;
    const effect = p.faction.powerEffect;
    if (effect === 'damageAlly') {
      const target = side('player').board.flat().sort((a, b) => a.hp - b.hp || b.attack - a.attack)[0];
      if (!target) return;
      p.mana -= 2; p.heroPowerUsed = true; queueUnitFloat(target, '−2', 'damage'); target.hp -= 2; removeDead(target);
      log(`La Mèche ardente frappe ${target.name}.`);
    } else if (effect === 'healAlly') {
      const target = p.board.flat().filter((u) => u.hp < u.maxHp + 2).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (!target) return;
      p.mana -= 2; p.heroPowerUsed = true; target.maxHp += 2; target.hp = Math.min(target.maxHp, target.hp + 2);
    } else if (effect === 'summonSpore') {
      const lane = aiPickLane('enemy'); if (lane === undefined) return;
      p.mana -= 2; p.heroPowerUsed = true; summonSpore('enemy', lane);
    } else if (effect === 'moveAlly') {
      const mover = p.board.flat().find((u) => locations.some((_, i) => canMoveTo(u, i)));
      if (!mover) return;
      const lane = locations.map((_, i) => i).find((i) => canMoveTo(mover, i));
      if (lane === undefined) return;
      p.mana -= 2; p.heroPowerUsed = true; moveUnit(mover, lane);
    }
  }

  function aiAttack() {
    const enemy = side('enemy');
    const attackers = enemy.board.flat().slice();
    for (const attacker of attackers) {
      if (game.done) return;
      if (attacker.attacksThisTurn > 0 || enemy.turns <= attacker.summonedTurn && !attacker.rush) continue;
      const guards = guardAt('player', attacker.lane);
      const targets = unitsAt('player', attacker.lane);
      const target = guards.length
        ? guards.sort((a, b) => a.hp - b.hp)[0]
        : targets.filter((unit) => unit.hp <= attacker.attack).sort((a, b) => a.hp - b.hp || b.attack - a.attack)[0];
      if (target) {
        const atk = attacker.attack; const counter = target.attack;
        game.visualEvents.push({
          type: 'clash', attackerId: attacker.instanceId, defenderId: target.instanceId, attackerOwner: attacker.owner,
          lane: attacker.lane, attackerDamage: counter, defenderDamage: atk,
          attackerRect: snapshotRect(unitElement(attacker.instanceId)), defenderRect: snapshotRect(unitElement(target.instanceId))
        });
        attacker.attacksThisTurn += 1; target.hp -= atk; attacker.hp -= counter;
        removeDead(target); removeDead(attacker);
        log(`${attacker.name} affronte ${target.name} aux ${laneLabel(attacker.lane)}.`);
      } else if (!guards.length && !(attacker.rush && enemy.turns <= attacker.summonedTurn)) {
        attacker.attacksThisTurn += 1;
        game.visualEvents.push({ type: 'heroStrike', attackerId: attacker.instanceId, attackerOwner: attacker.owner });
        damageHero('player', attacker.attack, attacker.name);
        log(`${attacker.name} frappe ton héros pour ${attacker.attack} dégâts.`);
      }
    }
  }

  function aiTurn(serial) {
    if (!game || game.serial !== serial || game.done) return;
    startTurn('enemy');
    if (game.done) return;
    aiUsePower();
    // Resolve existing attacks before playing cards so deaths can unlock battlecries this turn.
    aiAttack();
    if (game.done) return;
    let actions = 0;
    while (!game.done && actions < 8) {
      const p = side('enemy');
      const affordable = p.hand.filter((card) => {
        if (card.type === 'Serviteur') {
          const lane = aiPickLane('enemy');
          return lane !== undefined && canSummon('enemy', lane) && p.mana >= card.cost;
        }
        let lane;
        if (card.effect === 'deal3') {
          const target = side('player').board.flat().filter((u) => u.hp <= 3).sort((a, b) => a.hp - b.hp || b.attack - a.attack)[0]
            || side('player').board.flat().sort((a, b) => a.hp - b.hp || b.attack - a.attack)[0];
          if (!target) return false;
          lane = target.lane;
        } else if (card.effect === 'protectAlly') {
          const target = aiProtectTarget();
          if (!target) return false;
          lane = target.lane;
        } else if (card.effect === 'spawnTwoSpell') {
          lane = aiPickLane('enemy');
          if (lane === undefined) return false;
        } else if (card.effect === 'moveAny') {
          const mover = p.board.flat().filter((u) => locations.some((_, i) => canMoveTo(u, i))).sort((a, b) => b.hp - a.hp)[0];
          if (!mover) return false;
          lane = mover.lane;
        } else return false;
        const cost = p.spellDiscountUsed[lane] ? card.cost : Math.max(1, card.cost - 1);
        return p.mana >= cost;
      }).sort((a, b) => b.cost - a.cost || (a.type === 'Serviteur' ? -1 : 1));
      const play = affordable[0];
      if (!play || !aiPlayCard(play)) break;
      actions += 1;
    }
    aiAttack();
    if (game.done) return;
    const player = side('player');
    if (player.hp <= 0) { checkVictory('un combat'); return; }
    if (side('enemy').hp <= 0) { checkVictory('un combat'); return; }
    startTurn('player');
    render();
    if (!game.done) log(`À toi, cartographe. Tour ${side('player').turns} · ${side('player').mana} Élan.`);
  }

  function endTurn() {
    if (!isPlayerAction()) return;
    if (game.pending) { log('Termine ou annule d’abord ton action en cours.', 'warn'); return; }
    game.selection = null;
    game.busy = true;
    game.active = 'enemy';
    render();
    log('Le rival déploie son prochain souvenir…');
    const serial = game.serial;
    aiTimer = setTimeout(() => {
      if (!game || game.serial !== serial || game.done) return;
      game.busy = false;
      aiTurn(serial);
      game.busy = false;
      render();
    }, 520);
  }

  function playHeroAbility() {
    if (!isPlayerAction()) return;
    const p = side('player');
    if (p.heroPowerUsed) { log('Ton pouvoir a déjà été utilisé ce tour.', 'warn'); return; }
    if (p.mana < 2) { log('Il te faut 2 Élan pour utiliser ce pouvoir.', 'warn'); return; }
    const effect = p.faction.powerEffect;
    if (effect === 'summonSpore') game.pending = { kind: 'powerLane' };
    else game.pending = { kind: 'heroTarget' };
    if (effect === 'healAlly') log('Clique un allié : il gagne +2 PV maximum et actuels.');
    if (effect === 'damageAlly') log('Clique un serviteur ennemi : il subit 2 dégâts.');
    if (effect === 'moveAlly') log('Clique un serviteur allié, puis un autre lieu libre.');
    if (effect === 'summonSpore') log('Choisis un lieu pour invoquer une Spore 1/1.');
    render();
  }

  function renderFactions() {
    const grid = $('factionGrid');
    grid.innerHTML = factions.map((faction) => `
      <button class="faction-card ${faction.id === chosenFaction ? 'selected' : ''}" type="button" data-faction="${faction.id}" style="--faction:${faction.color};--accent:${faction.accent}" aria-pressed="${faction.id === chosenFaction}">
        <img src="${faction.art}" alt="${faction.name}"><span class="faction-gem">${faction.icon}</span>
        <span class="faction-card-copy"><h3>${faction.name}</h3><p>${faction.style}</p></span>
      </button>`).join('');
    grid.querySelectorAll('[data-faction]').forEach((button) => button.addEventListener('click', () => {
      chosenFaction = button.dataset.faction;
      const f = factionFor(chosenFaction);
      $('factionSummary').textContent = `${f.motto} Pouvoir : ${f.powerText}`;
      $('readyMark').textContent = `${cards.filter((card) => card.faction === chosenFaction).length} CARTES · ${f.short.toUpperCase()}`;
      renderFactions();
    }));
    const selected = factionFor(chosenFaction);
    $('factionSummary').textContent = `${selected.motto} Pouvoir : ${selected.powerText}`;
    $('readyMark').textContent = `${cards.filter((card) => card.faction === chosenFaction).length} CARTES · ${selected.short.toUpperCase()}`;
  }

  function updateFactionLabels() {
    const playerFaction = side('player').faction;
    const enemyFaction = side('enemy').faction;
    $('playerPortrait').src = playerFaction.art;
    $('playerPortrait').alt = `Portrait des ${playerFaction.name}`;
    $('playerFactionName').textContent = playerFaction.name;
    $('playerFactionTitle').textContent = playerFaction.title.toUpperCase();
    $('playerMotto').textContent = playerFaction.motto;
    $('enemyPortrait').src = enemyFaction.art;
    $('enemyPortrait').alt = `Portrait des ${enemyFaction.name}`;
    $('enemyFactionName').textContent = enemyFaction.name;
    $('enemyFactionTitle').textContent = enemyFaction.title.toUpperCase();
    $('enemyMotto').textContent = enemyFaction.motto;
    $('powerName').textContent = playerFaction.power;
    $('powerIcon').textContent = playerFaction.icon;
  }

  function renderCrystals(holder, p) {
    holder.innerHTML = Array.from({ length: p.maxMana }, (_, index) => `<span class="crystal ${index < p.mana ? 'full' : ''}" aria-hidden="true"></span>`).join('');
  }

  function renderUnit(unit) {
    const ready = unit.owner === 'player' && game.active === 'player' && unit.attacksThisTurn === 0 && (side('player').turns > unit.summonedTurn || unit.rush);
    const selected = game.selection?.kind === 'attack' && game.selection.unitId === unit.instanceId;
    let target = (game.pending?.kind === 'spellTarget' || game.selection?.kind === 'spellTarget' || game.pending?.kind === 'heroTarget')
      && isValidTargetForMode(unit);
    if (game.selection?.kind === 'attack' && unit.owner === 'enemy') {
      const attacker = unitById(game.selection.unitId);
      const guards = attacker ? guardAt('enemy', attacker.lane) : [];
      target = !!attacker && unit.lane === attacker.lane && (!guards.length || isGuarded(unit));
    }
    const card = cards.find((entry) => entry.id === unit.cardId);
    const faction = factionFor(unit.faction);
    const classes = ['unit-piece', unit.owner === 'enemy' ? 'enemy-piece' : '', selected ? 'selected-attacker' : '', target ? 'target-valid' : '', !ready && unit.owner === 'player' ? 'sleepy' : ''].filter(Boolean).join(' ');
    return `<button class="${classes}" type="button" data-unit="${unit.instanceId}" aria-label="${unit.name}, ${unit.attack} Attaque, ${unit.hp} PV${isGuarded(unit) ? ', Garde' : ''}">
      <span class="unit-image">${spriteImage({ cardArt: unit.art || faction.art, artIndex: unit.artIndex }, 'unit-sprite')}</span><span class="unit-title">${unit.name}</span><span class="unit-stat attack">${unit.attack}</span><span class="unit-stat hp">${unit.hp}</span>
      ${isGuarded(unit) ? '<span class="keyword-badge">GARDE</span>' : unit.rush ? '<span class="keyword-badge">RUÉE</span>' : ready ? '<span class="keyword-badge">PRÊT</span>' : ''}
    </button>`;
  }

  function isValidTargetForMode(unit) {
    if (game.pending?.kind === 'spellTarget') {
      const card = cardByInstance('player', game.pending.cardId);
      return card ? isValidSpellTarget(card, unit, 'player') : false;
    }
    if (game.selection?.kind === 'spellTarget') {
      const card = cardByInstance('player', game.selection.cardId);
      return card ? isValidSpellTarget(card, unit, 'player') : false;
    }
    if (game.pending?.kind === 'heroTarget') {
      const effect = side('player').faction.powerEffect;
      return effect === 'healAlly' || effect === 'moveAlly' ? unit.owner === 'player' : unit.owner === 'enemy';
    }
    return false;
  }

  function renderBoardRow(element, ownerId) {
    element.innerHTML = locations.map((_, lane) => {
      const units = side(ownerId).board[lane];
      const content = units.length ? units.map(renderUnit).join('') : `<span class="empty-lane">${ownerId === 'enemy' ? 'Aucun rival' : 'Lieu libre'}</span>`;
      return `<div class="lane-units" data-lane="${lane}">${content}</div>`;
    }).join('');
    element.querySelectorAll('[data-unit]').forEach((button) => button.addEventListener('click', () => minionClick(button.dataset.unit)));
    element.querySelectorAll('[data-lane]').forEach((lane) => lane.addEventListener('click', (event) => {
      if (!event.target.closest('[data-unit]')) laneClick(Number(lane.dataset.lane));
    }));
  }

  function locationScores(lane) {
    return side('player').board[lane].length;
  }

  function renderLocations() {
    const row = $('locationsRow');
    row.innerHTML = locations.map((location, lane) => {
      const chosen = game.pending?.kind === 'powerLane' || game.selection?.kind === 'minion' || game.selection?.kind === 'spellLane' || game.pending?.kind === 'moveDestination' || game.pending?.kind === 'drift';
      const movingUnit = (game.pending?.kind === 'moveDestination' || game.pending?.kind === 'drift') ? unitById(game.pending.unitId) : null;
      const targetLane = chosen && (movingUnit ? canMoveTo(movingUnit, lane) : canSummon('player', lane));
      const playerGuard = unitsAt('player', lane).some(isGuarded);
      const enemyGuard = unitsAt('enemy', lane).some(isGuarded);
      return `<button class="location-card ${targetLane ? 'lane-target' : ''}" type="button" data-location="${lane}" aria-label="${location.name}. ${location.rule}">
        <span class="location-scores"><span class="score-pill">✧ ${locationScores(lane)} allié${locationScores(lane) > 1 ? 's' : ''}${playerGuard ? ' · Garde' : ''}</span><span class="score-pill enemy-score">${unitsAt('enemy', lane).length} rival${unitsAt('enemy', lane).length > 1 ? 's' : ''}${enemyGuard ? ' · Garde' : ''} ⌁</span></span>
        <span class="location-icon">${location.icon}</span><span class="location-content"><span class="location-epithet">${location.epithet}</span><h3>${location.name}</h3><span class="location-rule">${location.rule}</span></span><span class="target-hint">CHOISIR CE LIEU</span>
      </button>`;
    }).join('');
    row.querySelectorAll('[data-location]').forEach((button) => button.addEventListener('click', () => laneClick(Number(button.dataset.location))));
  }

  function renderHand() {
    const p = side('player');
    const row = $('handRow');
    $('handCount').textContent = String(p.hand.length);
    row.innerHTML = p.hand.map((card) => {
      const faction = factionFor(card.faction);
      const selected = game.selection?.cardId === card.instanceId;
      const canAfford = card.type === 'Sort' && card.effect !== 'spawnTwoSpell'
        ? p.mana >= Math.max(1, card.cost - 1)
        : p.mana >= card.cost;
      const stats = card.type === 'Serviteur' ? `<span class="card-stat attack">${card.attack}</span><span class="card-stat health">${card.health}</span>` : '';
      return `<button class="game-card ${card.type === 'Sort' ? 'spell' : ''} ${selected ? 'selected' : ''} ${canAfford ? 'affordable' : ''}" type="button" data-card="${card.instanceId}" style="--faction:${faction.color};--accent:${faction.accent};--card-image:url('${card.cardArt}');--card-position:${card.artPosition}" aria-label="${card.name}, coût ${card.cost}, ${card.text}">
        <span class="card-art">${spriteImage(card, 'card-sprite')}<span class="card-cost">${card.cost}</span><span class="card-ribbon">${card.type}</span></span><span class="card-name">${card.name}</span><span class="card-text">${card.text}</span><span class="card-bottom">${faction.short}</span>${stats}
      </button>`;
    }).join('');
    row.querySelectorAll('[data-card]').forEach((button) => {
      button.addEventListener('click', () => selectCard(button.dataset.card));
      button.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        button.style.setProperty('--tilt-x', `${x * 9}deg`);
        button.style.setProperty('--tilt-y', `${y * -7}deg`);
      });
      button.addEventListener('pointerleave', () => {
        button.style.removeProperty('--tilt-x');
        button.style.removeProperty('--tilt-y');
      });
    });
  }

  function updateHint() {
    const hint = $('actionHint');
    const end = $('endTurnButton');
    const power = $('heroPowerButton');
    const isActive = game.active === 'player' && game.phase === 'playing' && !game.busy && !game.done;
    if (game.phase === 'mulligan') hint.textContent = 'Choisis les cartes de départ à remplacer avant le premier tour.';
    else if (!game.selection && !game.pending) hint.textContent = 'Joue une carte ou attaque un rival dans le même lieu.';
    if (game.selection?.kind === 'minion') hint.textContent = 'Choisis un lieu où ton serviteur peut prendre place.';
    if (game.selection?.kind === 'spellLane') hint.textContent = 'Choisis le lieu où lancer ton sort.';
    if (game.selection?.kind === 'spellTarget') hint.textContent = 'Choisis la cible indiquée par la carte.';
    if (game.selection?.kind === 'attack') hint.textContent = 'Choisis une cible dans le même lieu ou le héros adverse.';
    if (game.pending?.kind === 'moveDestination') hint.textContent = 'Choisis le lieu d’arrivée.';
    if (game.pending?.kind === 'drift') hint.textContent = 'La Danseuse peut continuer vers un autre lieu.';
    if (game.pending?.kind === 'powerLane') hint.textContent = 'Choisis le lieu de ta nouvelle Spore.';
    if (game.pending?.kind === 'heroTarget') hint.textContent = 'Choisis une cible pour ton pouvoir.';
    $('cancelAction').classList.toggle('hidden', !game.selection && !game.pending);
    end.disabled = !isActive || !!game.pending;
    end.querySelector('span').innerHTML = isActive ? 'Terminer<br>le tour' : game.done ? 'Partie<br>finie' : 'Rival<br>réfléchit';
    power.disabled = !isActive || game.players.player.heroPowerUsed || game.players.player.mana < 2 || !!game.pending;
    $('turnRibbon').textContent = game.done ? 'PARTIE TERMINÉE' : game.phase === 'mulligan' ? 'CHOIX DE DÉPART' : game.active === 'player' ? `VOTRE TOUR · ${side('player').turns}` : 'TOUR DU RIVAL';
    $('battleCaption').textContent = game.phase === 'mulligan' ? 'PRÉPARE TA MAIN DE DÉPART' : game.active === 'player' ? 'POSE TES CARTES · DÉFENDS TES SOUVENIRS' : 'LES PAGES SE TOURNENT…';
  }

  function render() {
    if (!game) return;
    const p = side('player'); const enemy = side('enemy');
    $('playerHp').textContent = String(Math.max(0, p.hp));
    $('enemyHp').textContent = String(Math.max(0, enemy.hp));
    $('playerDeckCount').textContent = `Paquet ${p.deck.length} · Main ${p.hand.length}`;
    $('enemyDeckCount').textContent = `Paquet ${enemy.deck.length}`;
    renderCrystals($('playerMana'), p);
    renderCrystals($('enemyMana'), enemy);
    renderBoardRow($('enemyBoard'), 'enemy');
    renderBoardRow($('playerBoard'), 'player');
    renderLocations();
    renderHand();
    updateHint();
    runVisualEvents();
  }

  function showOverlay(kicker, title, html, actions = []) {
    $('overlayKicker').textContent = kicker;
    $('overlayTitle').textContent = title;
    $('overlayContent').innerHTML = html;
    $('overlayActions').innerHTML = actions.map((action, index) => `<button class="${action.primary ? 'gold-button' : 'soft-button'}" data-modal-action="${index}" type="button">${action.label}</button>`).join('');
    $('overlayActions').querySelectorAll('[data-modal-action]').forEach((button) => button.addEventListener('click', () => actions[Number(button.dataset.modalAction)].run?.()));
    $('overlay').classList.remove('hidden');
    $('closeOverlay').classList.remove('hidden');
  }

  function closeOverlay() {
    if (game?.phase === 'mulligan') return;
    $('overlay').classList.add('hidden');
  }

  function showMulligan() {
    const p = side('player');
    const selected = new Set(game.mulliganSelected);
    const cardsHtml = p.hand.map((card) => {
      const isSelected = selected.has(card.instanceId);
      const stats = card.type === 'Serviteur' ? ` · ${card.attack}/${card.health}` : '';
      return `<button class="mulligan-card ${isSelected ? 'selected' : ''}" type="button" data-mulligan-card="${card.instanceId}" aria-pressed="${isSelected}"><span class="mulligan-cost">${card.cost} ÉLAN</span><strong>${card.name}</strong><small>${card.type}${stats}</small><span class="mulligan-status">${isSelected ? 'À REMPLACER' : 'GARDER'}</span></button>`;
    }).join('');
    const count = game.mulliganSelected.length;
    showOverlay('AVANT LE PREMIER TOUR', 'Choisis ta main de départ', `<p>Tu peux garder ces cartes ou en sélectionner pour les échanger. Les remplacements sont piochés avant que les cartes écartées retournent dans le paquet.</p><div class="mulligan-cards">${cardsHtml}</div><p class="mulligan-note">L’IA renouvelle automatiquement les cartes qui coûtent 4 Élan ou plus.</p>`, [{ label: count ? `Remplacer ${count} carte${count > 1 ? 's' : ''}` : 'Garder ma main', primary: true, run: confirmMulligan }]);
    $('closeOverlay').classList.add('hidden');
    $('overlayContent').querySelectorAll('[data-mulligan-card]').forEach((button) => button.addEventListener('click', () => {
      const id = button.dataset.mulliganCard;
      game.mulliganSelected = selected.has(id) ? game.mulliganSelected.filter((item) => item !== id) : [...game.mulliganSelected, id];
      showMulligan();
    }));
  }

  function confirmMulligan() {
    if (!game || game.phase !== 'mulligan') return;
    const replaced = replaceStartingCards(side('player'), game.mulliganSelected);
    game.mulliganSelected = [];
    game.phase = 'playing';
    closeOverlay();
    startTurn('player');
    render();
    log(replaced ? `Tu échanges ${replaced} carte${replaced > 1 ? 's' : ''}. Ton premier tour commence avec ${side('player').mana} Élan.` : `Tu gardes ta main. Ton premier tour commence avec ${side('player').mana} Élan.`);
  }

  function showRules() {
    showOverlay('COMMENT JOUER', 'Les règles du duel', `
      <h3>Ton but</h3><p>Fais tomber le héros adverse à <strong>0 PV</strong>. Chaque héros commence à 20 PV. À la fatigue, la première pioche manquée inflige 1 dégât, puis 2, puis 3…</p>
      <h3>Ta main de départ</h3><p>Avant le premier tour, tu peux sélectionner autant de cartes que tu veux pour les échanger. Les nouvelles cartes arrivent avant le retour des cartes écartées dans le paquet. L’IA renouvelle automatiquement ses cartes à 4 Élan ou plus.</p>
      <h3>À ton tour</h3><ul><li>Ton Élan maximum augmente de 1 (jusqu’à 7), puis se recharge complètement. Tu pioches une carte.</li><li>Joue tes cartes et attaque dans l’ordre que tu veux. Termine ton tour pour laisser jouer le rival.</li><li>Les serviteurs ont Attaque et PV. Ils arrivent épuisés et ne peuvent attaquer qu’à ton prochain tour. Une attaque contre un serviteur inflige des dégâts simultanément.</li><li>Tu peux utiliser ton pouvoir une fois par tour pour 2 Élan. Les serviteurs Garde bloquent les attaques du héros dans leur lieu.</li></ul>
      <h3>L’atlas compte aussi</h3><ul><li><strong>Trois Brisants :</strong> le premier serviteur joué depuis la main par chaque camp ici à son tour gagne +1 Attaque; les Spores n’activent pas ce bonus.</li><li><strong>Forêt renversée :</strong> la première mort d’un de tes serviteurs ici pendant ton tour soigne ton héros de 1.</li><li><strong>Phare sans côte :</strong> ton premier sort lancé ici à ton tour coûte 1 Élan de moins (minimum 1).</li><li>Sept serviteurs maximum par camp; trois par lieu. Ta main peut contenir dix cartes.</li></ul>
      <h3>Le paquet de famille</h3><p>Chaque famille possède six cartes uniques, en deux exemplaires chacune. Les pouvoirs et les cartes ont des effets déterministes : les victoires viennent du placement, des échanges et du bon moment pour jouer.</p>`, [{ label: 'Compris', primary: true, run: closeOverlay }]);
  }

  function showLore() {
    const lore = factions.map((faction) => `<article class="codex-faction" style="--accent:${faction.accent}"><img src="${faction.art}" alt="Portrait ${faction.name}"><div><h3>${faction.name}</h3><p><em>${faction.motto}</em></p><p>${faction.lore}</p><p><strong>Style :</strong> ${faction.style}. <strong>Pouvoir :</strong> ${faction.powerText}</p></div></article>`).join('');
    const places = locations.map((place) => `<li><strong>${place.name}</strong> — ${place.detail}</li>`).join('');
    showOverlay('LE DÉLUGE MUET', 'Un monde cousu de mémoire', `<p>Les îles dérivent dans une mer d’encre. Elles n’existent que tant qu’un souvenir les nomme. Depuis le Déluge muet, quatre familles parcourent les pages vivantes de l’atlas pour décider ce qui doit rester du monde.</p><h3>Les pages mouvantes</h3><ul>${places}</ul><h3>Les quatre familles</h3>${lore}`, [{ label: 'Retour au jeu', primary: true, run: closeOverlay }]);
  }

  function showCollection(filter = 'all') {
    collectionFilter = filter;
    const filterButtons = `<div class="archive-filter"><button class="filter-button ${filter === 'all' ? 'active' : ''}" data-filter="all">Toutes · 24</button>${factions.map((f) => `<button class="filter-button ${filter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.short}</button>`).join('')}</div>`;
    const shown = cards.filter((card) => filter === 'all' || card.faction === filter);
    const catalogue = `<div class="collection-grid">${shown.map((card) => {
      const faction = factionFor(card.faction);
      const stats = card.type === 'Serviteur' ? `<span class="archive-stats">${card.attack} / ${card.health}</span>` : '';
      return `<article class="archive-card" style="--faction:${faction.color};--archive-art:url('${card.cardArt}');--archive-position:${card.artPosition}"><span class="archive-illustration">${spriteImage(card, 'archive-sprite')}</span><span class="archive-cost">${card.cost}</span>${stats}<h4>${card.name}</h4><p>${card.text}</p><p><strong>${faction.short}</strong> · ${card.type}</p></article>`;
    }).join('')}</div>`;
    showOverlay('LE GRIMOIRE', `${shown.length} cartes à découvrir`, `${filterButtons}${catalogue}`, [{ label: 'Fermer le grimoire', primary: true, run: closeOverlay }]);
    $('overlayContent').querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => showCollection(button.dataset.filter)));
  }

  function showResult(winner, reason) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    const didWin = winner === 'player';
    const draw = winner === 'draw';
    const title = draw ? 'Les deux histoires s’éteignent' : didWin ? 'Ton nom reste sur la carte' : 'Les pages se referment';
    const copy = draw ? 'Les deux héros sont tombés au même instant. Le prochain relevé attend.' : didWin ? `Les ${side('player').faction.name} ont préservé leur version du monde.` : `Les ${side('enemy').faction.name} ont inscrit la dernière ligne du duel.`;
    showOverlay('LE DERNIER CHAPITRE', title, `<div class="result-banner" style="--result-image:url('${didWin ? side('player').faction.art : side('enemy').faction.art}')"><p>${draw ? 'MATCH NUL' : didWin ? 'VICTOIRE' : 'DÉFAITE'}</p><h2>${copy}</h2><p>${reason ? `La bataille s’achève par ${reason}.` : 'Un nouveau monde s’ouvre.'}</p></div><p>${side('player').faction.name} · ${Math.max(0, side('player').hp)} PV <span aria-hidden="true">✧</span> ${side('enemy').faction.name} · ${Math.max(0, side('enemy').hp)} PV</p>`, [
      { label: 'Rejouer avec cette famille', primary: true, run: () => { closeOverlay(); openGame(side('player').faction.id); } },
      { label: 'Choisir une famille', run: () => { closeOverlay(); if (aiTimer) clearTimeout(aiTimer); game = null; $('gameScreen').classList.add('hidden'); $('homeScreen').classList.remove('hidden'); } }
    ]);
    $('closeOverlay').classList.add('hidden');
  }

  function renderEvents() {
    $('homeButton').addEventListener('click', () => {
      if (aiTimer) clearTimeout(aiTimer);
      game = null;
      $('gameScreen').classList.add('hidden');
      $('homeScreen').classList.remove('hidden');
    });
    $('startButton').addEventListener('click', () => openGame(chosenFaction));
    $('collectionButton').addEventListener('click', () => showCollection());
    $('loreButton').addEventListener('click', showLore);
    $('rulesButton').addEventListener('click', showRules);
    $('gameRulesButton').addEventListener('click', showRules);
    $('closeOverlay').addEventListener('click', closeOverlay);
    $('overlay').addEventListener('click', (event) => { if (event.target === $('overlay') && !game?.done && game?.phase !== 'mulligan') closeOverlay(); });
    $('endTurnButton').addEventListener('click', endTurn);
    $('cancelAction').addEventListener('click', () => {
      if (!isPlayerAction()) return;
      game.selection = null;
      game.pending = null;
      log('Action annulée. Rien n’a été dépensé.');
      render();
    });
    $('heroPowerButton').addEventListener('click', playHeroAbility);
    $('enemyHero').addEventListener('click', targetHeroClick);
    $('concedeButton').addEventListener('click', () => {
      if (!isPlayerAction()) return;
      game.players.player.hp = 0;
      checkVictory('un abandon');
    });
  }

  renderFactions();
  renderEvents();
})();
