import { state, els, localPlayerId, localRoomId, socket } from './state.js';
import { setupWebSocket, syncState } from './network.js';
import { renderPhaseList, render, setMessage } from './ui.js';
import { startGame, drawCard, handleLayPhase, handleManualLayPhase, handleHitCards, handleManualHitCards, handleDiscard, getCurrentPlayer } from './gameLogic.js';
import { animateDraw } from './ui.js';

function init() {
  renderPhaseList();
  wireEvents();
  setupWebSocket();
  setMessage("Welcome! Create or join a room.");
}

function wireEvents() {
  els.createRoomBtn.addEventListener("click", () => {
    const name = els.localPlayerName.value.trim() || "Host";
    state.players = [{ id: localPlayerId, name, phaseIndex: 0, score: 0, hand: [], laidDown: null, completedPhaseThisRound: false, skips: 0 }];
    syncState();
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
    if (getCurrentPlayer()?.id !== localPlayerId) return;
    if (drawCard("deck")) { animateDraw("draw"); syncState(); }
  });
  els.discardPileCard.addEventListener("click", () => {
    if (getCurrentPlayer()?.id !== localPlayerId) return;
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

init();
