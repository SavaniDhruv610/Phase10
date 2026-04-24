export const state = {
  players: [],
  currentPlayerIndex: 0,
  roundNumber: 0,
  deck: [],
  discardPile: [],
  selectedCardIds: [],
  hasDrawn: false,
  winner: null
};

export const els = {
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

export let localPlayerId = sessionStorage.getItem("phase10_playerId") || "player-" + Math.floor(Math.random() * 1000000);
sessionStorage.setItem("phase10_playerId", localPlayerId);

export let localRoomId = sessionStorage.getItem("phase10_roomId") || null;

export function setLocalRoomId(id) {
  localRoomId = id;
}

export let peer = null;
export let peerConnections = {};
export let isHost = false;

export function setPeer(p) {
  peer = p;
}

export function setIsHost(val) {
  isHost = val;
}
