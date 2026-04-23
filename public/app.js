const HAND_SIZE = 10;

const PHASES = [
  { id: 1, label: "2 sets of 3", groups: [{ type: "set", size: 3 }, { type: "set", size: 3 }] },
  { id: 2, label: "1 set of 3 and 1 run of 4", groups: [{ type: "set", size: 3 }, { type: "run", size: 4 }] },
  { id: 3, label: "1 set of 4 and 1 run of 4", groups: [{ type: "set", size: 4 }, { type: "run", size: 4 }] },
  { id: 4, label: "1 run of 7", groups: [{ type: "run", size: 7 }] },
  { id: 5, label: "1 run of 8", groups: [{ type: "run", size: 8 }] },
  { id: 6, label: "1 run of 9", groups: [{ type: "run", size: 9 }] },
  { id: 7, label: "2 sets of 4", groups: [{ type: "set", size: 4 }, { type: "set", size: 4 }] },
  { id: 8, label: "7 cards of one color", groups: [{ type: "color", size: 7 }] },
  { id: 9, label: "1 set of 5 and 1 set of 2", groups: [{ type: "set", size: 5 }, { type: "set", size: 2 }] },
  { id: 10, label: "1 set of 5 and 1 set of 3", groups: [{ type: "set", size: 5 }, { type: "set", size: 3 }] }
];

const COLORS = ["red", "blue", "green", "yellow"];

const state = {
  players: [],
  currentPlayerIndex: 0,
  roundNumber: 0,
  deck: [],
  discardPile: [],
  selectedCardIds: [],
  hasDrawn: false,
  winner: null
};

const els = {
  setupScreen: document.getElementById("setup-screen"),
  gameScreen: document.getElementById("game-screen"),
  localPlayerName: document.getElementById("local-player-name"),
  createRoomBtn: document.getElementById("create-room-btn"),
  roomCodeInput: document.getElementById("room-code-input"),
  joinRoomBtn: document.getElementById("join-room-btn"),
  lobbyContainer: document.getElementById("lobby-container"),
  lobbyPlayers: document.getElementById("lobby-players"),
  roomBanner: document.getElementById("room-banner"),
  roomCodeDisplay: document.getElementById("room-code-display"),
  startGameBtn: document.getElementById("start-game-btn"),
  roundLabel: document.getElementById("round-label"),
  playersSummary: document.getElementById("players-summary"),
  phaseList: document.getElementById("phase-list"),
  drawPileCard: document.getElementById("draw-pile-card"),
  discardPileCard: document.getElementById("discard-pile-card"),
  turnStatus: document.getElementById("turn-status"),
  phaseTarget: document.getElementById("phase-target"),
  selectionStatus: document.getElementById("selection-status"),
  laidPhases: document.getElementById("laid-phases"),
  layPhaseBtn: document.getElementById("lay-phase-btn"),
  manualLayBtn: document.getElementById("manual-lay-btn"),
  hitCardBtn: document.getElementById("hit-card-btn"),
  manualHitBtn: document.getElementById("manual-hit-btn"),
  discardBtn: document.getElementById("discard-btn"),
  hitTarget: document.getElementById("hit-target"),
  skipTarget: document.getElementById("skip-target"),
  playerHand: document.getElementById("player-hand"),
  messageBar: document.getElementById("message-bar"),
  turnOverlay: document.getElementById("turn-overlay"),
  overlayPlayerName: document.getElementById("overlay-player-name"),
  overlayPhase: document.getElementById("overlay-phase"),
  overlaySummary: document.getElementById("overlay-summary"),
  revealTurnBtn: document.getElementById("reveal-turn-btn"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalBtn: document.getElementById("modal-btn")
};

let socket;
let localPlayerId = sessionStorage.getItem("phase10_playerId") || "player-" + Math.floor(Math.random() * 1000000);
sessionStorage.setItem("phase10_playerId", localPlayerId);
let localRoomId = sessionStorage.getItem("phase10_roomId") || null;

function init() {
  renderPhaseList();
  wireEvents();
  setupWebSocket();
  setMessage("Welcome! Create or join a room.");
}

function setupWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(protocol + "//" + window.location.host);
  
  socket.onopen = () => {
    if (localRoomId) {
      socket.send(JSON.stringify({ type: "JOIN_ROOM", roomId: localRoomId }));
    }
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === "ROOM_CREATED") {
      localRoomId = data.roomId;
      sessionStorage.setItem("phase10_roomId", localRoomId);
      els.roomCodeDisplay.textContent = localRoomId;
      els.roomBanner.style.display = "block";
      updateLobbyUI();
    } else if (data.type === "ROOM_JOINED") {
      localRoomId = data.roomId;
      sessionStorage.setItem("phase10_roomId", localRoomId);
      els.roomCodeDisplay.textContent = localRoomId;
      els.roomBanner.style.display = "block";
      Object.assign(state, data.state);
      updateLobbyUI();
      if (state.players && state.players.length && state.deck && state.deck.length) {
        els.setupScreen.classList.add("hidden");
        els.gameScreen.classList.remove("hidden");
        document.querySelector(".hero").style.display = "none";
        render();
      }
    } else if (data.type === "STATE_SYNC") {
      Object.assign(state, data.state);
      updateLobbyUI();
      if (state.players && state.players.length && state.deck && state.deck.length) {
        els.setupScreen.classList.add("hidden");
        els.gameScreen.classList.remove("hidden");
        document.querySelector(".hero").style.display = "none";
        render();
      }
    } else if (data.type === "ERROR") {
      alert(data.message);
    }
  };
}

function syncState() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "STATE_UPDATE", state }));
  }
}

function updateLobbyUI() {
  if (!localRoomId) return;
  els.lobbyContainer.classList.remove("hidden");
  els.lobbyPlayers.innerHTML = "";
  state.players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name + (p.id === localPlayerId ? " (You)" : "");
    els.lobbyPlayers.appendChild(li);
  });
}

function renderPhaseList() {
  els.phaseList.innerHTML = "";
  PHASES.forEach((phase) => {
    const li = document.createElement("li");
    li.textContent = `Phase ${phase.id}: ${phase.label}`;
    els.phaseList.append(li);
  });
}

function wireEvents() {
  els.createRoomBtn.addEventListener("click", () => {
    const name = els.localPlayerName.value.trim() || "Host";
    state.players = [{ id: localPlayerId, name, phaseIndex: 0, score: 0, hand: [], laidDown: null, completedPhaseThisRound: false, skips: 0 }];
    socket.send(JSON.stringify({ type: "CREATE_ROOM", state }));
  });
  
  els.joinRoomBtn.addEventListener("click", () => {
    const roomId = els.roomCodeInput.value.trim();
    if (!roomId) return alert("Enter Room Code");
    const name = els.localPlayerName.value.trim() || "Guest";
    socket.send(JSON.stringify({ type: "JOIN_ROOM", roomId }));
    
    setTimeout(() => {
      if (localRoomId && !state.players.find(p => p.id === localPlayerId)) {
        state.players.push({ id: localPlayerId, name, phaseIndex: 0, score: 0, hand: [], laidDown: null, completedPhaseThisRound: false, skips: 0 });
        syncState();
      }
    }, 500);
  });

  els.startGameBtn.addEventListener("click", () => {
    if (state.players.length < 2) return alert("Need at least 2 players!");
    startGame();
  });
  els.drawPileCard.addEventListener("click", () => {
    if (getCurrentPlayer().id !== localPlayerId) return;
    if (drawCard("deck")) { animateDraw("draw"); syncState(); }
  });
  els.discardPileCard.addEventListener("click", () => {
    if (getCurrentPlayer().id !== localPlayerId) return;
    if (drawCard("discard")) { animateDraw("discard"); syncState(); }
  });
  els.layPhaseBtn.addEventListener("click", () => { handleLayPhase(); syncState(); });
  els.manualLayBtn.addEventListener("click", () => { handleManualLayPhase(); syncState(); });
  els.hitCardBtn.addEventListener("click", () => { handleHitCards(); syncState(); });
  els.manualHitBtn.addEventListener("click", () => { handleManualHitCards(); syncState(); });
  els.discardBtn.addEventListener("click", () => { handleDiscard(); syncState(); });
  els.revealTurnBtn.addEventListener("click", () => {
    els.turnOverlay.classList.add("hidden");
    render();
  });
  els.modalBtn.addEventListener("click", () => {
    els.modal.classList.add("hidden");
  });
}

function startGame() {
  state.winner = null;
  startRound();
  els.setupScreen.classList.add("hidden");
  els.gameScreen.classList.remove("hidden");
  document.querySelector(".hero").style.display = "none";
  syncState();
}

function startRound() {
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
  });

  for (let i = 0; i < HAND_SIZE; i += 1) {
    state.players.forEach((player) => {
      player.hand.push(drawFromDeck());
    });
  }

  state.discardPile.push(drawFromDeck());
  maybeHandleSkipAtTurnStart();
  render();
  showTurnOverlay();
}

function createDeck() {
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

function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawFromDeck() {
  if (!state.deck.length) {
    refillDeckFromDiscard();
  }
  return state.deck.pop();
}

function refillDeckFromDiscard() {
  if (state.discardPile.length <= 1) {
    return;
  }
  const topDiscard = state.discardPile.pop();
  state.deck = shuffle(state.discardPile);
  state.discardPile = [topDiscard];
}

function getCurrentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function getCurrentPhase(player = getCurrentPlayer()) {
  return PHASES[player.phaseIndex];
}

function drawCard(source) {
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

function animateDraw(source) {
  const pileEl = document.getElementById(`${source}-pile-card`);
  if (!pileEl) return;
  
  const rect = pileEl.getBoundingClientRect();
  const clone = pileEl.cloneNode(true);
  
  clone.style.position = "fixed";
  clone.style.top = rect.top + "px";
  clone.style.left = rect.left + "px";
  clone.style.margin = "0";
  clone.style.zIndex = "999";
  clone.style.transition = "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
  clone.style.pointerEvents = "none";
  
  document.body.appendChild(clone);
  
  requestAnimationFrame(() => {
    clone.style.top = "80vh";
    clone.style.left = "50vw";
    clone.style.transform = "scale(0.6) rotate(10deg)";
    clone.style.opacity = "0";
  });
  
  setTimeout(() => clone.remove(), 400);
}

function handleLayPhase() {
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

function handleManualLayPhase() {
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

function handleHitCards() {
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

function handleManualHitCards() {
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

function handleDiscard() {
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
    skippedPlayerName = skippedPlayerObj.name;
    skippedPlayerObj.skips = (skippedPlayerObj.skips || 0) + 1;
  }

  player.hand = player.hand.filter((entry) => entry.id !== card.id);
  state.discardPile.push(card);
  state.selectedCardIds = [];

  if (card.type === "skip") {
    setMessage(`${player.name} discarded a Skip. ${skippedPlayerName} will miss their upcoming turn.`);
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

function advanceTurn() {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.hasDrawn = false;
  state.lastDrawnCardId = null;
  maybeHandleSkipAtTurnStart();
  render();
  showTurnOverlay();
}

function maybeHandleSkipAtTurnStart() {
  let current = getCurrentPlayer();
  while (current && current.skips > 0) {
    current.skips -= 1;
    setMessage(`${current.name} was skipped!`);
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    current = getCurrentPlayer();
  }
}

function finishRound(wentOutPlayer) {
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

function scoreHand(hand) {
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

function buildPhaseLayout(cards, groupDefs) {
  const groups = groupDefs.map((group) => ({ ...group }));
  const allAssignments = assignGroupsAll(cards, groups, 0);
  if (!allAssignments.length) return null;

  allAssignments.sort((a, b) => scoreAssignment(a, cards) - scoreAssignment(b, cards));
  return { groups: allAssignments[0] };
}

function scoreAssignment(assignment, originalCards) {
  let wildCount = 0;
  const usedIds = new Set();
  
  assignment.forEach(group => {
    group.cards.forEach(card => {
      usedIds.add(card.id);
      if (card.type === "wild") wildCount++;
    });
  });

  const leftoverCards = originalCards.filter(c => !usedIds.has(c.id));
  const valueCounts = {};
  leftoverCards.forEach(c => {
    if (c.type === "number") {
      valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
    }
  });

  let leftoverPenalty = 0;
  for (const val in valueCounts) {
    if (valueCounts[val] === 1) leftoverPenalty += 10;
    else if (valueCounts[val] === 2) leftoverPenalty -= 5;
    else if (valueCounts[val] >= 3) leftoverPenalty -= 10;
  }

  return (wildCount * 100) + leftoverPenalty;
}

function assignGroupsAll(cards, groups, index) {
  if (index >= groups.length) {
    return [[]];
  }

  const group = groups[index];
  const combinations = getCombinations(cards, group.size);
  const validAssignments = [];

  for (const combo of combinations) {
    if (!matchesGroup(combo, group.type)) {
      continue;
    }
    const comboIds = new Set(combo.map((card) => card.id));
    const remaining = cards.filter((card) => !comboIds.has(card.id));
    
    const tails = assignGroupsAll(remaining, groups, index + 1);
    for (const tail of tails) {
      validAssignments.push([{ type: group.type, size: group.size, cards: combo }, ...tail]);
    }
  }
  
  return validAssignments;
}

function matchesGroup(cards, type) {
  if (cards.some((card) => card.type === "skip")) {
    return false;
  }
  if (type === "set") {
    return isValidSet(cards);
  }
  if (type === "run") {
    return isValidRun(cards);
  }
  if (type === "color") {
    return isValidColor(cards);
  }
  return false;
}

function isValidSet(cards) {
  const numbers = cards.filter((card) => card.type === "number").map((card) => card.value);
  return new Set(numbers).size <= 1;
}

function isValidColor(cards) {
  const colors = cards.filter((card) => card.type === "number").map((card) => card.color);
  return new Set(colors).size <= 1;
}

function isValidRun(cards) {
  const wildCount = cards.filter((card) => card.type === "wild").length;
  const numbers = cards
    .filter((card) => card.type === "number")
    .map((card) => card.value)
    .sort((a, b) => a - b);

  if (new Set(numbers).size !== numbers.length) {
    return false;
  }
  if (!numbers.length) {
    return true;
  }

  const minStart = Math.max(1, numbers[numbers.length - 1] - cards.length + 1);
  const maxStart = Math.min(numbers[0], 12 - cards.length + 1);
  for (let start = minStart; start <= maxStart; start += 1) {
    const sequence = [];
    for (let value = start; value < start + cards.length; value += 1) {
      sequence.push(value);
    }
    const missing = sequence.filter((value) => !numbers.includes(value)).length;
    if (missing <= wildCount) {
      return true;
    }
  }
  return false;
}

function canAddCardToGroup(card, group) {
  if (card.type === "skip") {
    return false;
  }
  const prospective = [...group.cards, card];
  if (group.type === "set") {
    return isValidSet(prospective);
  }
  if (group.type === "color") {
    return isValidColor(prospective);
  }
  if (group.type === "run") {
    return isValidRun(prospective);
  }
  return false;
}

function getCombinations(cards, size) {
  const result = [];

  function walk(start, combo) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < cards.length; i += 1) {
      combo.push(cards[i]);
      walk(i + 1, combo);
      combo.pop();
    }
  }

  walk(0, []);
  return result;
}

function getSelectedCards(player) {
  return player.hand.filter((card) => state.selectedCardIds.includes(card.id));
}

function getNextPlayer() {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return state.players[nextIndex];
}

function sortHand(hand) {
  hand.sort((a, b) => {
    const rankA = a.type === "number" ? a.value : (a.type === "wild" ? 13 : 14);
    const rankB = b.type === "number" ? b.value : (b.type === "wild" ? 13 : 14);
    if (rankA !== rankB) return rankA - rankB;
    // same type & value: sort by color just for consistency
    const colorOrder = ["red", "blue", "green", "yellow", "wild", "skip"];
    return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
  });
}

function setMessage(text) {
  els.messageBar.textContent = text;
}

function openModal(title, body) {
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modal.classList.remove("hidden");
}

function showTurnOverlay() {
  // Multiplayer: no device passing overlay.
  // We rely entirely on render() to show whose turn it is.
}

function render() {
  renderSummary();
  renderPhaseHighlights();
  renderPiles();
  renderTurnStatus();
  renderLaidPhases();
  renderHitTargets();
  renderSkipTargets();
  renderHand();
  renderButtons();
}

function renderSummary() {
  els.roundLabel.textContent = `Round ${state.roundNumber}`;
  els.playersSummary.innerHTML = "";

  state.players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "player-summary";
    if (index === state.currentPlayerIndex) {
      card.classList.add("current");
    }
    if (player.completedPhaseThisRound) {
      card.classList.add("done");
    }
    const currentPhaseNumber = Math.min(player.phaseIndex + 1, PHASES.length);
    card.innerHTML = `
      <strong>${player.name}</strong> ${player.skips > 0 ? `<span style="color:var(--red, red); font-size: 0.8rem;">(Skipped x${player.skips})</span>` : ""}
      <div style="color: var(--primary); font-weight: bold; margin-top: 4px;">Phase: ${player.phaseIndex >= PHASES.length ? "Completed" : currentPhaseNumber}</div>
      <div>Score: ${player.score}</div>
      <div>Cards: ${player.hand.length}</div>
      <div>${player.completedPhaseThisRound ? "Laid Phase" : "Needs Phase"}</div>
    `;
    els.playersSummary.append(card);
  });
}

function renderPhaseHighlights() {
  [...els.phaseList.children].forEach((item, index) => {
    const phase = PHASES[index];
    const playersOnThisPhase = state.players.filter(p => Math.min(p.phaseIndex, PHASES.length - 1) === index);
    
    let text = `Phase ${phase.id}: ${phase.label}`;
    if (playersOnThisPhase.length > 0) {
      const names = playersOnThisPhase.map(p => p.name).join(", ");
      text += ` (${names})`;
    }
    
    item.textContent = text;
    
    const localPlayer = state.players.find(p => p.id === localPlayerId);
    item.classList.toggle("active", localPlayer && localPlayer.phaseIndex === index);
  });
}

function renderPiles() {
  const canDraw = getCurrentPlayer()?.id === localPlayerId && !state.hasDrawn && !state.winner;

  els.drawPileCard.style.opacity = state.deck.length ? "1" : "0.35";
  els.drawPileCard.title = `${state.deck.length} cards left`;
  els.drawPileCard.className = "card-back large-card" + (canDraw ? " clickable-pile" : "");

  if (state.discardPile.length > 0) {
    const topCard = state.discardPile[state.discardPile.length - 1];
    els.discardPileCard.className = `play-card large-card ${cardColorClass(topCard)}` + (canDraw && topCard.type !== "skip" ? " clickable-pile" : "");
    els.discardPileCard.innerHTML = cardMarkup(topCard);
  } else {
    els.discardPileCard.className = "large-card placeholder-card";
    els.discardPileCard.innerHTML = "Empty";
  }
}

function renderTurnStatus() {
  const player = getCurrentPlayer();
  const phase = getCurrentPhase(player);
  els.turnStatus.textContent = `${player.name}'s turn. ${state.hasDrawn ? "Ready to lay, hit, or discard." : "Draw a card to begin."}`;
  els.phaseTarget.textContent = `Current phase: Phase ${phase.id} - ${phase.label}`;
  els.selectionStatus.textContent = `${state.selectedCardIds.length} card(s) selected.`;
}

function renderLaidPhases() {
  els.laidPhases.innerHTML = "";
  const laidPlayers = state.players.filter((player) => player.laidDown);
  if (!laidPlayers.length) {
    const empty = document.createElement("div");
    empty.className = "hint-box";
    empty.textContent = "No phases have been laid yet this round.";
    els.laidPhases.append(empty);
    return;
  }

  laidPlayers.forEach((player) => {
    const card = document.createElement("div");
    card.className = "laid-phase-card";
    const groupsHtml = player.laidDown.groups.map((group, index) => `
      <div class="laid-group">
        <strong>${groupLabel(group, index + 1)}</strong>
        <div class="mini-card-row">${group.cards.map(renderMiniCardMarkup).join("")}</div>
      </div>
    `).join("");
    card.innerHTML = `
      <div>
        <strong>${player.name}</strong>
        <div>Phase ${player.laidDown.phaseId}: ${player.laidDown.label}</div>
      </div>
      ${groupsHtml}
    `;
    els.laidPhases.append(card);
  });
}

function renderHitTargets() {
  const currentPlayer = getCurrentPlayer();
  if (!els.hitTarget) return; // safety check
  const previousValue = els.hitTarget.value;
  els.hitTarget.innerHTML = `<option value="">Choose a laid group</option>`;

  state.players.forEach((player) => {
    if (!player.laidDown) return;
    
    player.laidDown.groups.forEach((group, index) => {
      const option = document.createElement("option");
      option.value = `${player.id}:${index}`;
      option.textContent = `${player.name} - ${groupLabel(group, index + 1)}`;
      els.hitTarget.append(option);
    });
  });

  if (currentPlayer && currentPlayer.completedPhaseThisRound && previousValue) {
    els.hitTarget.value = previousValue;
  }
}

function renderSkipTargets() {
  if (!els.skipTarget) return;
  const previousValue = els.skipTarget.value;
  els.skipTarget.innerHTML = `<option value="">Choose player to skip</option>`;

  state.players.forEach((player) => {
    if (player.id !== localPlayerId) {
      const option = document.createElement("option");
      option.value = player.id;
      option.textContent = player.name;
      els.skipTarget.append(option);
    }
  });

  if (previousValue) {
    els.skipTarget.value = previousValue;
  }
}

function renderHand() {
  const player = state.players.find(p => p.id === localPlayerId);
  if (!player) return;
  sortHand(player.hand);
  els.playerHand.innerHTML = "";

  player.hand.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `play-card ${cardColorClass(card)}`;
    if (state.selectedCardIds.includes(card.id)) {
      button.classList.add("selected");
    }
    if (state.lastDrawnCardId === card.id) {
      button.classList.add("just-drawn");
    }
    button.innerHTML = cardMarkup(card);
    button.addEventListener("click", () => {
       if (getCurrentPlayer().id !== localPlayerId) return;
       toggleCard(card.id);
    });
    els.playerHand.append(button);
  });
}

function renderButtons() {
  const player = getCurrentPlayer();
  const isMyTurn = player && player.id === localPlayerId;
  els.layPhaseBtn.disabled = !isMyTurn || !state.hasDrawn || player.completedPhaseThisRound;
  els.manualLayBtn.disabled = !isMyTurn || !state.hasDrawn || player.completedPhaseThisRound;
  els.hitCardBtn.disabled = !isMyTurn || !state.hasDrawn || !player.completedPhaseThisRound;
  els.manualHitBtn.disabled = !isMyTurn || !state.hasDrawn || !player.completedPhaseThisRound;
  els.discardBtn.disabled = !isMyTurn || !state.hasDrawn;
}

function toggleCard(cardId) {
  if (state.selectedCardIds.includes(cardId)) {
    state.selectedCardIds = state.selectedCardIds.filter((id) => id !== cardId);
  } else {
    state.selectedCardIds = [...state.selectedCardIds, cardId];
  }
  render();
}

function describeCard(card) {
  if (card.type === "wild") {
    return "Wild";
  }
  if (card.type === "skip") {
    return "Skip";
  }
  return `${capitalize(card.color)} ${card.value}`;
}

function groupLabel(group, position) {
  return `Group ${position}: ${capitalize(group.type)} (${group.cards.length} cards)`;
}

function renderMiniCardMarkup(card) {
  return `<div class="mini-card ${cardColorClass(card)}">${cardInnerMarkup(card, true)}</div>`;
}

function cardMarkup(card) {
  return cardInnerMarkup(card, false);
}

function cardInnerMarkup(card, mini) {
  const label = card.type === "number" ? capitalize(card.color) : capitalize(card.type);
  const value = card.type === "number" ? String(card.value) : capitalize(card.type);
  if (mini) {
    return `<div class="tiny-label">${label}</div><div class="tiny-value">${value}</div>`;
  }
  return `
    <div class="corner">${label}</div>
    <div class="card-value">${value}</div>
    <div class="card-subtitle">${card.type === "number" ? "Number card" : "Action card"}</div>
  `;
}

function cardColorClass(card) {
  if (card.type === "wild") return "wild";
  if (card.type === "skip") return "skip";
  return card.color;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

init();
