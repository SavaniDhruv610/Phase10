const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const path = require("path");

// Room data structure
// rooms[roomId] = { state: { ... } }
const rooms = {};

app.use(express.static(path.join(__dirname, "public")));

function generateRoomId() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

wss.on("connection", (ws) => {
  let currentRoomId = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "CREATE_ROOM") {
        let roomId = generateRoomId();
        while (rooms[roomId]) {
          roomId = generateRoomId();
        }
        rooms[roomId] = { state: data.state || {}, clients: new Set() };
        currentRoomId = roomId;
        rooms[roomId].clients.add(ws);
        
        ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId, state: rooms[roomId].state }));
      } 
      else if (data.type === "JOIN_ROOM") {
        const roomId = data.roomId.toUpperCase();
        if (rooms[roomId]) {
          currentRoomId = roomId;
          rooms[roomId].clients.add(ws);
          ws.send(JSON.stringify({ type: "ROOM_JOINED", roomId, state: rooms[roomId].state }));
        } else {
          ws.send(JSON.stringify({ type: "ERROR", message: "Room not found." }));
        }
      } 
      else if (data.type === "STATE_UPDATE") {
        if (currentRoomId && rooms[currentRoomId]) {
          // Merge state or just replace completely based on client side logic
          rooms[currentRoomId].state = data.state;
          
          // Broadcast to everyone else in the room
          for (const client of rooms[currentRoomId].clients) {
            if (client !== ws && client.readyState === 1) { // 1 = OPEN
              client.send(JSON.stringify({ type: "STATE_SYNC", state: data.state }));
            }
          }
        }
      }
    } catch (e) {
      console.error("Message parsing error", e);
    }
  });

  ws.on("close", () => {
    if (currentRoomId && rooms[currentRoomId]) {
      rooms[currentRoomId].clients.delete(ws);
      if (rooms[currentRoomId].clients.size === 0) {
        // Free up memory if everyone leaves
        delete rooms[currentRoomId];
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
