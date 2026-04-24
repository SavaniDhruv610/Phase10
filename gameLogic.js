import { state, els, localPlayerId } from './state.js';
import { HAND_SIZE, COLORS, PHASES } from './constants.js';
import { buildPhaseLayout, canAddCardToGroup } from './phaseValidator.js';
import { render, setMessage, animateDraw, openModal, showTurnOverlay, describeCard } from './ui.js';
import { syncState } from './network.js';

export function startGame() {
  state.winner = null;
  startRound();
  els.setupScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
  document.querySelector(".hero").style.display = "none";
  syncState();
}

export function startRound() {
  state.roundNumber += 1;
  state.deck = shuffle(createDeck());
  state.discardPile = [];
  state.selectedCardIds = [];
  state.currentPlayerIndex = 0;
  state.hasDrawn = false;

  state.players.forEach((player) => {
    player.hand = [];
    player.laidDown = null;
    player.completedPhaseThisRound = false;
    player.skips = 0;
    player.pendingSkip = null;
    player.wasSkippedLastTurn = false;
  });

  for (let i = 0; i < HAND_SIZE; i += 1) {
    state.players.forEach((player) => {
      player.hand.push(drawFromDeck());
    });
  }

  state.discardPile.push(drawFromDeck());
  
  const initialCard = state.discardPile[0];
  if (initialCard && initialCard.type === "skip") {
    if (state.players.length > 0) {
      state.players[0].skips = 1;
      // Note: maybeHandleSkipAtTurnStart will announce it.
    }
  }

  maybeHandleSkipAtTurnStart();
  render();
  showTurnOverlay();
}

export function createDeck() {
  const deck = [];
  let idCounter = 0;

  COLORS.forEach((color) => {
    for (let copy = 0; copy < 2; copy += 1) {
      for (let value = 1; value <= 12; value += 1) {
        deck.push({
          id: `card-${idCounter += 1}`,
          type: "number",
          color,
          value
        });
      }
    }
  });

  for (let i = 0; i < 8; i += 1) {
    deck.push({
      id: `card-${idCounter += 1}`,
      type: "wild",
      color: "wild",
      value: null
    });
  }

  for (let i = 0; i < 4; i += 1) {
    deck.push({
      id: `card-${idCounter += 1}`,
      type: "skip",
      color: "skip",
      value: null
    });
  }

  return deck;
}

export function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawFromDeck() {
  if (!state.deck.length) {
    refillDeckFromDiscard();
  }
  return state.deck.pop();
}

export function refillDeckFromDiscard() {
  if (state.discardPile.length <= 1) {
    return;
  }
  const topDiscard = state.discardPile.pop();
  state.deck = shuffle(state.discardPile);
  state.discardPile = [topDiscard];
}

export function getCurrentPlayer() {
  return state.players[state.currentPlayerIndex];
}

export function getCurrentPhase(player = getCurrentPlayer()) {
  return PHASES[player.phaseIndex];
}

export function drawCard(source) {
  const player = getCurrentPlayer();
  if (state.winner) {
    return false;
  }
  if (state.hasDrawn) {
    setMessage(`${player.name} already drew this turn. Discard to end the turn.`);
    return false;
  }

  let card;
  if (source === "deck") {
    card = drawFromDeck();
  } else {
    if (!state.discardPile.length) {
      setMessage("Discard pile is empty.");
      return false;
    }
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (topCard.type === "skip") {
      setMessage("You cannot draw a Skip card from the discard pile.");
      return false;
    }
    card = state.discardPile.pop();
  }

  if (!card) {
    setMessage("No cards available to draw.");
    return false;
  }

  player.hand.push(card);
  state.hasDrawn = true;
  state.lastDrawnCardId = card.id;
  sortHand(player.hand);
  state.selectedCardIds = [];
  setMessage(`${player.name} drew ${describeCard(card)}.`);
  render();
  return true;
}

export function handleLayPhase() {
  const player = getCurrentPlayer();
  if (!state.hasDrawn) {
    setMessage("Draw a card before trying to lay your phase.");
    return;
  }
  if (player.completedPhaseThisRound) {
    setMessage(`${player.name} already laid Phase ${player.phaseIndex + 1} this round.`);
    return;
  }

  const phase = getCurrentPhase(player);
  const result = buildPhaseLayout(player.hand, phase.groups);
  if (!result) {
    setMessage(`You don't have the cards for Phase ${phase.id}: ${phase.label}.`);
    return;
  }

  const usedIds = new Set();
  result.groups.forEach((group) => {
    group.cards.forEach((card) => usedIds.add(card.id));
  });

  player.hand = player.hand.filter((card) => !usedIds.has(card.id));
  player.laidDown = {
    phaseId: phase.id,
    label: phase.label,
    groups: result.groups
  };
  player.completedPhaseThisRound = true;
  state.selectedCardIds = [];
  setMessage(`${player.name} smartly auto-laid Phase ${phase.id}!`);
  render();
}

export function handleManualLayPhase() {
  const player = getCurrentPlayer();
  if (!state.hasDrawn) return setMessage("Draw a card before trying to lay your phase.");
  if (player.completedPhaseThisRound) return setMessage(`${player.name} already laid Phase ${player.phaseIndex + 1} this round.`);

  const selectedCards = getSelectedCards(player);
  const phase = getCurrentPhase(player);
  const expectedCount = phase.groups.reduce((sum, group) => sum + group.size, 0);

  if (selectedCards.length !== expectedCount) {
    return setMessage(`Phase ${phase.id} needs exactly ${expectedCount} cards selected.`);
  }

  const result = buildPhaseLayout(selectedCards, phase.groups);
  if (!result) {
    return setMessage(`Those selected cards do not exactly make Phase ${phase.id}.`);
  }

  player.hand = player.hand.filter((card) => !state.selectedCardIds.includes(card.id));
  player.laidDown = {
    phaseId: phase.id,
    label: phase.label,
    groups: result.groups
  };
  player.completedPhaseThisRound = true;
  state.selectedCardIds = [];
  setMessage(`${player.name} manually laid Phase ${phase.id}: ${phase.label}.`);
  render();
}

export function handleHitCards() {
  const player = getCurrentPlayer();
  if (!state.hasDrawn) {
    setMessage("Draw a card before hitting.");
    return;
  }
  if (!player.completedPhaseThisRound) {
    setMessage("You can only hit after you have laid your own phase this round.");
    return;
  }

  let hittingOccurred = false;
  let hitAdded = true;
  while (hitAdded) {
    hitAdded = false;
    for (let i = player.hand.length - 1; i >= 0; i--) {
      const card = player.hand[i];
      if (card.type === "skip") continue;

      let foundGroup = false;
      for (const p of state.players) {
        if (!p.laidDown) continue;
        for (const group of p.laidDown.groups) {
          if (canAddCardToGroup(card, group)) {
            group.cards.push(card);
            foundGroup = true;
            break;
          }
        }
        if (foundGroup) break;
      }
      
      if (foundGroup) {
        player.hand.splice(i, 1);
        hitAdded = true;
        hittingOccurred = true;
      }
    }
  }

  if (!hittingOccurred) {
    setMessage("No valid cards in your hand can be auto-hit onto the board.");
    return;
  }
  state.selectedCardIds = [];
  setMessage(`${player.name} auto-hit all valid cards!`);
  render();
}

export function handleManualHitCards() {
  const player = getCurrentPlayer();
  if (!state.hasDrawn) return setMessage("Draw a card before hitting.");
  if (!player.completedPhaseThisRound) return setMessage("You can only hit after you have laid your own phase this round.");

  const targetValue = els.hitTarget.value;
  if (!targetValue) return setMessage("Pick a hit target from the dropdown first.");

  const selectedCards = getSelectedCards(player);
  if (!selectedCards.length) return setMessage("Select at least one card to hit.");

  const [targetPlayerId, groupIndexText] = targetValue.split(":");
  const targetPlayer = state.players.find((entry) => entry.id === targetPlayerId);
  if (!targetPlayer || !targetPlayer.laidDown) return setMessage("That hit target is no longer available.");

  const groupIndex = Number(groupIndexText);
  const group = targetPlayer.laidDown.groups[groupIndex];
  if (!group) return setMessage("That group does not exist.");

  for (const card of selectedCards) {
    if (!canAddCardToGroup(card, group)) {
      return setMessage(`${describeCard(card)} cannot be added to that group.`);
    }
  }

  group.cards.push(...selectedCards);
  player.hand = player.hand.filter((card) => !state.selectedCardIds.includes(card.id));
  state.selectedCardIds = [];
  setMessage(`${player.name} manually hit ${selectedCards.length} card(s) onto ${targetPlayer.name}'s laid phase.`);
  render();
}

export function handleDiscard() {
  const player = getCurrentPlayer();
  if (!state.hasDrawn) {
    setMessage("Draw a card before discarding.");
    return;
  }

  const selectedCards = getSelectedCards(player);
  if (selectedCards.length !== 1) {
    setMessage("Select exactly one card to discard.");
    return;
  }

  const [card] = selectedCards;

  let skippedPlayerId = null;
  let skippedPlayerName = null;
  if (card.type === "skip") {
    skippedPlayerId = els.skipTarget ? els.skipTarget.value : null;
    if (!skippedPlayerId) {
      setMessage("You must select a player to skip from the 'Skip target' dropdown.");
      return;
    }
    const skippedPlayerObj = state.players.find(p => p.id === skippedPlayerId);
    if (!skippedPlayerObj) {
      setMessage("Selected player not found.");
      return;
    }
    if (skippedPlayerObj.id === player.id) {
      setMessage("You cannot skip yourself.");
      return;
    }
    if (skippedPlayerObj.pendingSkip || skippedPlayerObj.skips > 0) {
      setMessage(`${skippedPlayerObj.name} is already skipped! You cannot stack skips.`);
      return;
    }
    if (skippedPlayerObj.wasSkippedLastTurn) {
      setMessage(`${skippedPlayerObj.name} was skipped last turn! A player cannot be skipped two turns in a row.`);
      return;
    }
    skippedPlayerName = skippedPlayerObj.name;
    skippedPlayerObj.pendingSkip = card;
  }

  player.hand = player.hand.filter((entry) => entry.id !== card.id);
  if (card.type !== "skip") {
    state.discardPile.push(card);
  }
  state.selectedCardIds = [];

  if (card.type === "skip") {
    setMessage(`${player.name} played a Skip on ${skippedPlayerName}.`);
    if (els.skipTarget) els.skipTarget.value = "";
  } else {
    setMessage(`${player.name} discarded ${describeCard(card)}.`);
  }

  if (player.hand.length === 0) {
    finishRound(player);
    return;
  }

  advanceTurn();
}

export function advanceTurn() {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.hasDrawn = false;
  state.lastDrawnCardId = null;
  maybeHandleSkipAtTurnStart();
  render();
  showTurnOverlay();
}

export function maybeHandleSkipAtTurnStart() {
  let current = getCurrentPlayer();
  while (current && (current.pendingSkip || current.skips > 0)) {
    if (current.pendingSkip) {
      const skipCard = current.pendingSkip;
      current.pendingSkip = null;
      state.discardPile.push(skipCard);
    }
    if (current.skips > 0) {
      current.skips -= 1;
    }
    current.wasSkippedLastTurn = true;
    setMessage(`${current.name} was skipped!`);
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    current = getCurrentPlayer();
  }

  if (current) {
    current.wasSkippedLastTurn = false;
  }
}

export function finishRound(wentOutPlayer) {
  state.players.forEach((player) => {
    if (player.id !== wentOutPlayer.id) {
      player.score += scoreHand(player.hand);
    }
    if (player.completedPhaseThisRound) {
      player.phaseIndex += 1;
    }
  });

  const champions = state.players.filter((player) => player.phaseIndex >= PHASES.length);
  if (champions.length) {
    champions.sort((a, b) => a.score - b.score);
    state.winner = champions[0];
    render();
    openModal(
      `${state.winner.name} wins the game`,
      `${wentOutPlayer.name} went out in Round ${state.roundNumber}. ${state.winner.name} completed all 10 phases with ${state.winner.score} points.`
    );
    return;
  }

  render();
  openModal(
    `Round ${state.roundNumber} complete`,
    `${wentOutPlayer.name} went out first. Players who completed their phase advance; everyone else repeats the same phase next round.`
  );
  startRound();
}

export function scoreHand(hand) {
  return hand.reduce((sum, card) => {
    if (card.type === "wild") {
      return sum + 25;
    }
    if (card.type === "skip") {
      return sum + 15;
    }
    if (card.value >= 10) {
      return sum + 10;
    }
    return sum + 5;
  }, 0);
}

export function getSelectedCards(player) {
  return player.hand.filter((card) => state.selectedCardIds.includes(card.id));
}

export function getNextPlayer() {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return state.players[nextIndex];
}

export function sortHand(hand) {
  hand.sort((a, b) => {
    const rankA = a.type === "number" ? a.value : (a.type === "wild" ? 13 : 14);
    const rankB = b.type === "number" ? b.value : (b.type === "wild" ? 13 : 14);
    if (rankA !== rankB) return rankA - rankB;
    const colorOrder = ["red", "blue", "green", "yellow", "wild", "skip"];
    return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
  });
}
