import { state, els, localRoomId, setLocalRoomId, localPlayerId, peer, setPeer, peerConnections, isHost, setIsHost } from './state.js';
import { render } from './ui.js';

function generateShortId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function setupNetwork() {
  // Initialization done on demand when creating/joining
}

export function hostRoom() {
  const roomId = generateShortId();
  const p = new Peer(`phase10-${roomId}`);
  setPeer(p);
  setIsHost(true);
  
  p.on('open', (id) => {
    setLocalRoomId(roomId);
    sessionStorage.setItem("phase10_roomId", roomId);
    els.roomCodeDisplay.textContent = roomId;
    els.roomBanner.style.display = "block";
    updateLobbyUI();
  });
  
  p.on('connection', (conn) => {
    peerConnections[conn.peer] = conn;
    
    conn.on('data', (data) => {
      handleNetworkData(data, conn);
    });
    
    conn.on('close', () => {
      delete peerConnections[conn.peer];
    });
  });
  
  p.on('error', (err) => {
    alert("Host error: " + err.message);
  });
}

export function joinRoom(roomId) {
  roomId = roomId.toUpperCase();
  const p = new Peer();
  setPeer(p);
  setIsHost(false);
  
  p.on('open', (id) => {
    const conn = p.connect(`phase10-${roomId}`);
    peerConnections['host'] = conn;
    
    conn.on('open', () => {
      setLocalRoomId(roomId);
      sessionStorage.setItem("phase10_roomId", roomId);
      els.roomCodeDisplay.textContent = roomId;
      els.roomBanner.style.display = "block";
      
      // Tell host we joined, and pass our initial player state
      conn.send({ type: "JOIN_ROOM", state });
    });
    
    conn.on('data', (data) => {
      handleNetworkData(data, conn);
    });
    
    conn.on('close', () => {
      alert("Disconnected from host");
    });
  });
  
  p.on('error', (err) => {
    alert("Connection error: " + err.message);
  });
}

export function sendNetworkMessage(data) {
  if (isHost) {
    Object.values(peerConnections).forEach(conn => {
      if (conn.open) conn.send(data);
    });
  } else {
    const conn = peerConnections['host'];
    if (conn && conn.open) conn.send(data);
  }
}

export function syncState() {
  sendNetworkMessage({ type: "STATE_SYNC", state });
}

function handleNetworkData(data, senderConn) {
  if (data.type === "JOIN_ROOM") {
    if (isHost) {
      const guestPlayer = data.state.players[0];
      if (guestPlayer && !state.players.find(p => p.id === guestPlayer.id)) {
        state.players.push(guestPlayer);
      }
      updateLobbyUI();
      syncState();
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
    
    if (isHost) {
      Object.values(peerConnections).forEach(conn => {
        if (conn !== senderConn && conn.open) {
          conn.send({ type: "STATE_SYNC", state });
        }
      });
    }
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
