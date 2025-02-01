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
      gameState.playerSocketId = socket.id;
    }

    // Send initial game state to the player
    socket.emit("game-state", gameState);

    // Handle building updates
    socket.on("update-node-c-s", (nodeData) => {  // Flow #10 b - Server recieves node update from client.
      //gameState.nodes.push(nodeData);
      io.emit("update-node-s-c", nodeData); // Flow #10 c - Broadcast to all clients
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      delete gameState.players[socket.id];

      // Notify others to remove this player's cursor
      socket.broadcast.emit("cursor-remove", { id: socket.id });
    });

    // Listen for log messages from the client
    socket.on("client-log", (message) => {
      console.log(`Client log [${socket.id}]: ${message}`);
    });

    // Listen for cursor movement from a player
    socket.on("cursor-move", (data) => {
      // Broadcast the cursor position to other players
      socket.broadcast.emit("cursor-update", { id: socket.id, x: data.x, y: data.y });
  });
  });
}

module.exports = { router, handleSocketConnection };