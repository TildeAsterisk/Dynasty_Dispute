const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { router: gameRoutes, handleSocketConnection } = require("./routes/gameRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.static("public")); // Serve static files from the public directory
app.use("/api/game", gameRoutes);

// Handle WebSocket connections
handleSocketConnection(io);

// Emit log messages to clients
function logMessage(message) {
  io.emit("log-message", message);
}

// Example log messages
logMessage("Server started");
logMessage("Waiting for connections...");

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logMessage(`Server running on port ${PORT}`);
});



function handleBuildingUpdate(buildingData) {
  // Emit the update-node event to all connected clients
  socket.emit('update-node', buildingData);
}

// Example usage
/*handleSocketConnection(socket => {
  socket.on('building-updated', (buildingData) => {
      handleBuildingUpdate(buildingData);
  });
});*/