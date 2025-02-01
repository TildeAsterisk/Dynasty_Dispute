const express = require("express");
const router = express.Router();

// Define your game-related routes here
module.exports = router;

// Game state
const gameState = {
  players: {},
  nodes: [],
};

// Emit log messages to clients
function server_LogMessage(...args) {
  const stamp = ``;
  if (stamp=="")  { console.log(...args); }
  else            { console.log(stamp,...args); }
  //io.emit("log-message", ...args);
}

// Handle WebSocket connections
function handleSocketConnection(io) {
  io.on("connection", (socket) => {
    server_LogMessage(`Player connected: ${socket.id}`);

    // Initialize player data if not already present
    if (!gameState.players[socket.id]) {
      gameState.players[socket.id] = {
        /*resources: {
          wood: 0,
          stone: 0,
          food: 0,
        },
        nodes: [],
        agents: [],
        selectedType : null, // Tracks the currently selected type (e.g., "storage_Node", "farm")
        spawnedUnitsCount : 0,
        agentBirthChance : 3000,  //1 out of <agentBirthChance> chance to give birth
        selectedUnit : null,
        totalStoredResources : 0,
        gameTick : 0,
        networkState : {nodes: [], agents: [], players: []},
        playerData : {sid:socket.id, username:undefined}*/
        sid:socket.id, username:"Anonymous Guest"
      };
      gameState.playerData = {sid:socket.id, username:undefined};
    }

    // Send initial game state to the player
    socket.emit("game-state", gameState);

    // Handle building updates
    socket.on("update-node-c-s", (nodeData) => {  // Flow #10 b - Server recieves node update from client.
      gameState.nodes.push(nodeData); // Update server gameState with new node. (Inits from gamestate when page refreshes)
      io.emit("update-node-s-c", nodeData); // Flow #10 c - Broadcast to all clients
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      server_LogMessage(`Player disconnected: ${socket.id}`);
      delete gameState.players[socket.id];

      // Notify others to remove this player's cursor
      socket.broadcast.emit("cursor-remove", { id: socket.id });
    });

    // Listen for log messages from the client
    socket.on("client-log", (message) => {
      server_LogMessage(`Client log [${socket.id}]: ${message}`);
    });

    // Listen for cursor movement from a player
    socket.on("cursor-move", (data) => {
      // Broadcast the cursor position to other players
      socket.broadcast.emit("cursor-update", { id: socket.id, x: data.x, y: data.y });
    });

    // Listen for player data update
    socket.on("player-data-update", (data) => {
      // Broadcast the cursor position to other players
      gameState.players[socket.id] = data;
      socket.broadcast.emit("player-data-update", data);
    });

  });
}

module.exports = { router, handleSocketConnection, server_LogMessage };