const express = require("express");
const router = express.Router();

// Define your game-related routes here
module.exports = router;

// Game state
const gameState = {
  players: {},
  nodes: [],
};

// Handle WebSocket connections
function handleSocketConnection(io) {
  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Initialize player data if not already present
    if (!gameState.players[socket.id]) {
      gameState.players[socket.id] = {
        resources: {
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
        networkState : {nodes: [], agents: [], players: []}
      };
    }

    // Send initial game state to the player
    socket.emit("game-state", gameState);

    // Handle building updates
    socket.on("update-building", (data) => {
      gameState.nodes.push(data);
      io.emit("map-update", gameState.nodes); // Broadcast to all clients
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      delete gameState.players[socket.id];
    });

    // Listen for log messages from the client
    socket.on("client-log", (message) => {
      console.log(`Client log [${socket.id}]: ${message}`);
    });
  });
}

module.exports = { router, handleSocketConnection };