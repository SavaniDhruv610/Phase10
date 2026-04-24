import { state, els, localPlayerId } from './state.js';
import { PHASES } from './constants.js';
import { getCurrentPlayer, getCurrentPhase, getNextPlayer, sortHand } from './gameLogic.js';

export function render() {
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
      <strong>${player.name}</strong> ${(player.pendingSkip || player.skips > 0) ? `<span style="color:var(--red, red); font-size: 0.8rem;">(Skipped)</span>` : ""}
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
  if (!player) return;
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
  if (!els.hitTarget) return; 
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
       if (getCurrentPlayer()?.id !== localPlayerId) return;
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

export function describeCard(card) {
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

export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function setMessage(text) {
  els.messageBar.textContent = text;
}

export function openModal(title, body) {
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modal.classList.remove("hidden");
}

export function showTurnOverlay() {
  // Multiplayer: no device passing overlay.
}

export function animateDraw(source) {
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

export function renderPhaseList() {
  els.phaseList.innerHTML = "";
  PHASES.forEach((phase) => {
    const li = document.createElement("li");
    li.textContent = `Phase ${phase.id}: ${phase.label}`;
    els.phaseList.append(li);
  });
}
