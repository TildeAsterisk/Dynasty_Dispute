
//#region Canvas Events

//const { server_LogMessage } = require("../server/routes/gameRoutes");

// Event handler for selecting a unit
canvas.addEventListener("click", (event) => {
  //const rect = canvas.getBoundingClientRect();
  // Get Screen to World Coords
  const mouseToWorldCoords = screenToWorldCoordinates(event.clientX, event.clientY,0);
  //const mouseX = (event.clientX - rect.left) / camera.scale + camera.x;
  //const mouseY = (event.clientY - rect.top) / camera.scale + camera.y;

  const gameObjectsArray = Array.from(gameState.nodes.values()).concat(Array.from(gameState.agents.values()));  //Convert both maps into arrays and concat them to iterate all units.

  // Check for clicked node
  for (const gameObject of gameObjectsArray) {

    if (isPointInRect(mouseToWorldCoords.x, mouseToWorldCoords.y, gameObject.x, gameObject.y, GRID_SIZE, GRID_SIZE)) {
      // Display gameObject info
      GenerateUnitInfoMenu(gameObject);
      gameState.selectedUnit = gameObject;
      client_LogMessage(gameObject);
      // IF SELECTED BARRACKS, OPEN MENU TO TRAIN AGENTS
      if (gameObject.type == Node.types.barracks_Node) {
        GenerateUnitInfoMenu(gameObject);
      }
      return;
    }
  }

  // Clear unit info if no unit is clicked
  GenerateUnitInfoMenu(null);
  gameState.selectedUnit = null;
});

canvas.addEventListener("mousedown", (event) => {
  isDragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
});

canvas.addEventListener("mousemove", (event) => {
  if (isDragging) {
    const dx = event.clientX - lastMouseX;
    const dy = event.clientY - lastMouseY;
    camera.x -= dx / camera.scale;
    camera.y -= dy / camera.scale;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

canvas.addEventListener("wheel", (event) => {
  const zoomIntensity = 0.1;
  const minScale = 0.5; // Minimum zoom level
  const maxScale = 2;   // Maximum zoom level

  const mouseX = (event.clientX - canvas.width / 2) / camera.scale + camera.x;
  const mouseY = (event.clientY - canvas.height / 2) / camera.scale + camera.y;

  // Calculate the new scale
  const newScale = Math.max(minScale, Math.min(maxScale, camera.scale * (1 - event.deltaY * zoomIntensity / 100)));

  // Adjust the camera position based on zoom
  camera.x = mouseX - (mouseX - camera.x) * (camera.scale / newScale);
  camera.y = mouseY - (mouseY - camera.y) * (camera.scale / newScale);
  camera.scale = newScale;

  // Prevent default browser scrolling behavior
  event.preventDefault();
});

// Mouse click event for adding nodes
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();

  // Convert screen coordinates to world coordinates
  const worldsCoords = screenToWorldCoordinates(event.clientX, event.clientY, GRID_SIZE/2);

  // Snap coordinates to the nearest grid cell
  const gridCoords = getGridCoordinates(worldsCoords.x, worldsCoords.y);
  const snappedX = gridCoords[0];
  const snappedY = gridCoords[1];


  // Ensure a type is selected
  if (gameState.selectedType != null) {
    // Check if the cell is already occupied
    if (isCellOccupied(snappedX, snappedY)) {
      client_LogMessage("Cannot place node: Cell is already occupied.");
      //alert("/!\\ Cannot place node: Cell is already occupied. /!\\");
      return;
    }

    // Subtract resources if can
    if (!subtractFromStoredResources(gameState.selectedType.cost)) {
      client_LogMessage("cannot build unit");
      return;
    }

    let buildTypeIsAgent = Object.values(Agent.types).includes(gameState.selectedType);
    if (buildTypeIsAgent) {
      addAgent(snappedX, snappedY, gameState.selectedType.key);
    }
    else {
      //client_LogMessage(JSON.parse(gameState.selectedType.initObj));
      addNode(snappedX, snappedY, gameState.selectedType.key, true, gameState.selectedType.initObj);
    }
    client_LogMessage(`Placed ${gameState.selectedType} at (${snappedX}, ${snappedY})`);
  }
  else {
    // Selecting a unit?
  }

});

// Handle cursor updates from the backend
socket.on("cursor-update", (netCursorData) => {
    let cursor = cursors[netCursorData.id];
    if (!cursor) {
        // Create a new cursor for the player if it doesn't exist
        cursor = spawnPlayerCursor(netCursorData);
    }

    // Update cursor position with world position
    updateCursorPosition(cursor, netCursorData);
});

// Remove cursor when a player disconnects
socket.on("cursor-remove", (data) => {
    const cursor = cursors[data.id];
    if (cursor) {
        //cursor.remove();
        delete cursors[data.id];
    }
});

let pCursorlastEmitTime = 0;
const pCursorThrottleInterval = 50; // Emit every 50ms
//Track this player's mouse movements and emit to the backend
document.addEventListener("mousemove", (event) => {
    const now = Date.now();
    if (now - pCursorlastEmitTime > pCursorThrottleInterval) {
        pCursorlastEmitTime = now;

        // Send cursor position to the server
        const cursorWorldCoords = screenToWorldCoordinates(event.clientX, event.clientY);
        socket.emit("cursor-move", { x: cursorWorldCoords.x, y: cursorWorldCoords.y });
    }
});

// HTML UI Event Listeners
// Prevent right-click context menu
document.addEventListener('contextmenu', function (event) {
  event.preventDefault();
});
// Prevent text selection
document.addEventListener('selectstart', function (event) {
  event.preventDefault();
});
// Prevent text dragging
document.addEventListener('dragstart', function (event) {
  event.preventDefault();
});


//#endregion


//#region WebSocket Event Listeners

// When the Client recieves an 'init-game-state' socket event with the game state of the Server (state)
socket.on("init-game-state", (netState) => {
  client_LogMessage("[INIT]: Received initial game state from server", netState);
  // Convert arrays back into maps
  netState.nodes = new Map(netState.nodes);
  netState.agents = new Map(netState.agents);
  //set client gameState players to server players list
  gameState.players = netState.players;
  //update playerdata in gameState with player username
  playerData = { sid:socket.id, username:playerUsername};
  gameState.players[socket.id] = playerData;
  client_LogMessage("[INIT]: Initialised players list from server with updated username", gameState.players);
  socket.emit('player-data-update-c-s',playerData);
  // Initialise all game objects from server game state
  InitialiseGameObjects(netState);

  gameState.spawnedUnitsCount = netState.spawnedUnitsCount; //init spawned unitcount form server AFTER init gameonbjects
  client_LogMessage("CLIENT INITIALISING GAMESTATE COMPLETE.",gameState);
  
  // Now sync with clients
  syncWithServerState();
});

socket.on("update-node-s-c", (nodeData) => { // Flow #10 d - Client recieves a player initiated node update from the Server.
  //gameState.networkState.nodes = updatedMap;
  // Update the map with the new building data
  //updateMapWithNodeData(nodeData);
  // Logic to update the map with the new building data
  // For example, you might update the DOM elements representing the buildings
  //gameState.nodes.push(buildingData);
  
  //io.emit("update-node-s-c", gameState.nodes); // Broadcast to all clients
  //logMessage("Map updated " + Date.now());
  // Add your map update logic here
  //renderGame();

  if(nodeData.type){
    addNode(nodeData.x, nodeData.y, nodeData.type.key, false, nodeData);
    client_LogMessage(`A player has built ${nodeData.id}.`);
  }
  else{
    // ANOTHER PLAYER DELETED NODE. REMOVE FROM GAMESTATE NODE ARRAY
    gameState.nodes.delete(nodeData.id);
    client_LogMessage(`A player has destroyed ${nodeData.id}.`);
  }
  client_LogMessage('Building data updated:', nodeData);
});

// Listen for log messages from the server
socket.on("log-message", (...args) => {
  client_LogMessage(...args);
});

// Handle connection errors
socket.on("connect_error", (error) => {
  client_LogMessage(`Connection error: ${error.message}`);
});

// Handle reconnection attempts
socket.on("reconnect_attempt", () => {
  client_LogMessage("Attempting to reconnect...");
});

socket.on('update-node-c-s', (nodeData) => {
  /**if(nodeData.type){
    addNode(nodeData.x, nodeData.y, nodeData.type.key, false, nodeData);
  }
  else{
    // ANOTHER PLAYER DELETED NODE. REMOVE FROM GAMESTATE NODE ARRAY
    gameState.nodes = gameState.nodes.filter((n) => (n.id !== nodeData.id));
  }*/
  client_LogMessage("Received update-node-c-s from server.");
});

// Listen for player data update
socket.on("player-data-update-s-c", (pDataFromServer) => {
  // Update player data
  client_LogMessage("[PDU]: Player updated in server.",pDataFromServer);
  gameState.players = pDataFromServer;
  
});

//#endregion
