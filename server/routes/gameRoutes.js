const express = require("express");
const router = express.Router();

// Define your game-related routes here
module.exports = router;

// Game state
const gameState = {
  players: {},
  nodes : new Map(),
  agents : new Map()
};
let playerData = undefined;

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
        sid : socket.id, 
        username : "Anonymous Guest"
      };
      playerData = {sid:socket.id, username:undefined};
    }

    // Send initial game state to the player
    socket.emit("game-state", gameState );

    socket.on("game-state", (state) => {
      //Update nodes from gameState
      gameState.nodes = state.nodes;
      gameState.agents = state.agents;
      gameState.spawnedUnitsCount = state.spawnedUnitsCount;
      
      server_LogMessage("[SYNC] Server recieved game state from client ",state);
      // Now emit the state to every other player
    });

    // Handle building updates
    socket.on("update-node-c-s", (nodeData) => {  // Flow #10 b - Server recieves node update from client.
      if(nodeData.type){
        gameState.nodes.set(nodeData.id,nodeData); // Update server gameState with new node. (Inits from gamestate when page refreshes)
      }
      else{
        // ANOTHER PLAYER DELETED NODE. REMOVE FROM GAMESTATE NODE ARRAY
        gameState.nodes.delete(nodeData.id);
      }
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