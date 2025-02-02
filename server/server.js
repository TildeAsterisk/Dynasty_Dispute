const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { router: gameRoutes, handleSocketConnection, server_LogMessage } = require("./routes/gameRoutes");

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

// Example log messages
server_LogMessage("Server started");
server_LogMessage("Waiting for connections...");

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  server_LogMessage(`Server running on port ${PORT}`);
  //server_LogMessage(`Server running on port ${PORT}`);
});
