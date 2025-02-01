
//#region Canvas Events
// Event handler for selecting a unit
canvas.addEventListener("click", (event) => {
  //const rect = canvas.getBoundingClientRect();
  // Get Screen to World Coords
  const mouseToWorldCoords = screenToWorldCoordinates(event.clientX, event.clientY,0);
  //const mouseX = (event.clientX - rect.left) / camera.scale + camera.x;
  //const mouseY = (event.clientY - rect.top) / camera.scale + camera.y;

  const gameObjectsArray = gameState.nodes.concat(gameState.agents);

  // Check for clicked node
  for (const gameObject of gameObjectsArray) {

    if (isPointInRect(mouseToWorldCoords.x, mouseToWorldCoords.y, gameObject.x, gameObject.y, GRID_SIZE, GRID_SIZE)) {
      // Display gameObject info
      updateUnitInfo(gameObject);
      gameState.selectedUnit = gameObject;
      console.log(gameObject);
      // IF SELECTED BARRACKS, OPEN MENU TO TRAIN AGENTS
      if (gameObject.type == Node.types.barracks_Node) {
        updateUnitInfo(gameObject);
      }
      return;
    }
  }

  // Clear unit info if no unit is clicked
  updateUnitInfo(null);
  updateUnitInfo(null);
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
      console.log("Cannot place node: Cell is already occupied.");
      //alert("/!\\ Cannot place node: Cell is already occupied. /!\\");
      return;
    }

    // Subtract resources if can
    if (!subtractFromStoredResources(gameState.selectedType.cost)) {
      console.log("cannot build unit");
      return;
    }

    let buildTypeIsAgent = Object.values(Agent.types).includes(gameState.selectedType);
    if (buildTypeIsAgent) {
      addAgent(snappedX, snappedY, gameState.selectedType.key);
    }
    else {
      //console.log(JSON.parse(gameState.selectedType.initObj));
      addNode(snappedX, snappedY, gameState.selectedType.key, true, gameState.selectedType.initObj);
    }
    console.log(`Placed ${gameState.selectedType} at (${snappedX}, ${snappedY})`);
  }
  else {
    // Selecting a unit?
  }

});

/* // HTML UI Event Listeners
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
*/

//#endregion


//#region WebSocket Event Listeners
socket.on("game-state", (state) => {
  gameState.networkState = state;
  logMessage("Received initial game state");
  initializeGameObjects();
  //renderGame();
});

socket.on("map-update", (nodeData) => { // Flow #10 d - Client recieves a player initiated node update from the Server.
  //gameState.networkState.nodes = updatedMap;
  // Update the map with the new building data
  //updateMapWithNodeData(nodeData);
  // Logic to update the map with the new building data
  // For example, you might update the DOM elements representing the buildings
  //gameState.nodes.push(buildingData);
  addNode(nodeData.x, nodeData.y, nodeData.type.key, false, nodeData);
  //io.emit("map-update", gameState.nodes); // Broadcast to all clients
  logMessage('Building data updated:', nodeData);
  //logMessage("Map updated " + Date.now());
  // Add your map update logic here
  //renderGame();
});

// Listen for log messages from the server
socket.on("log-message", (message) => {
  logMessage(message);
});

// Handle connection errors
socket.on("connect_error", (error) => {
  logMessage(`Connection error: ${error.message}`);
});

// Handle reconnection attempts
socket.on("reconnect_attempt", () => {
  logMessage("Attempting to reconnect...");
});

socket.on('update-node', (nodeData) => {
  logMessage("Received update-node from server.");
});

//#endregion
