import { state, els, localRoomId, setLocalRoomId, localPlayerId, socket, setSocket } from './state.js';
import { render } from './ui.js';

export function setupWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  setSocket(new WebSocket(protocol + "//" + window.location.host));
  
  socket.onopen = () => {
    if (localRoomId) {
      socket.send(JSON.stringify({ type: "JOIN_ROOM", roomId: localRoomId }));
    }
  };
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === "ROOM_CREATED") {
      setLocalRoomId(data.roomId);
      sessionStorage.setItem("phase10_roomId", localRoomId);
      els.roomCodeDisplay.textContent = localRoomId;
      els.roomBanner.style.display = "block";
      updateLobbyUI();
    } else if (data.type === "ROOM_JOINED") {
      setLocalRoomId(data.roomId);
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

export function syncState() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "STATE_UPDATE", state }));
  }
}

export function updateLobbyUI() {
  if (!localRoomId) return;
  els.lobbyContainer.classList.remove("hidden");
  els.lobbyPlayers.innerHTML = "";
  state.players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name + (p.id === localPlayerId ? " (You)" : "");
    els.lobbyPlayers.appendChild(li);
  });
}
