// Import * all from each file. (Catch-all)
// Import each main functions by { Name } from each file.
/*
import * as Node_Functions from "./Node.js";
import { Node } from "./Node.js";
import * as Agent_Functions from "./Agent.js";
import { Agent } from "./Agent.js";
import * as Resource_Functions from "./Resource.js";
import { Resource } from "./Resource.js";
import * as State_Functions from "./State.js";
import { Idle_State, Roaming_State  , Gathering_State, Deposit_State  , GoingHome_State, AtHome_State   , Combat_State   } from "./State.js";
import * as UI_Functions from "./UI.js";
import { Idle_State, Roaming_State  , Gathering_State, Deposit_State  , GoingHome_State, AtHome_State   , Combat_State   } from "./State.js";
*/


//#region Initialising variables

//Setting up WebSocket
const socket = io("http://localhost:3000");

// Initialising Game Screen Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game State
let gameState = {
  nodes: [],
  agents: [],
  selectedType: null, // Tracks the currently selected type (e.g., "storage_Node", "farm")
  spawnedUnitsCount: 0,
  agentBirthChance: 2000,  //1 out of <agentBirthChance> chance to give birth
  selectedUnit: null,
  totalStoredResources: 0,
  gameTick: 0,
  networkState: { nodes: [], agents: [], players: [] }
};

// Grid and Camera
const GRID_SIZE = 50;
const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

// Initialise Canvas Event Variables
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

//#endregion


//#region Canvas Events
// Event handler for selecting a unit
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / camera.scale + camera.x;
  const mouseY = (event.clientY - rect.top) / camera.scale + camera.y;

  const gameObjectsArray = gameState.nodes.concat(gameState.agents);

  // Check for clicked node
  for (const gameObject of gameObjectsArray) {
    const nodeScreenX = (gameObject.x - camera.x) * camera.scale;
    const nodeScreenY = (gameObject.y - camera.y) * camera.scale;
    const nodeSize = GRID_SIZE * camera.scale;

    if (isPointInRect(mouseX, mouseY, gameObject.x, gameObject.y, GRID_SIZE, GRID_SIZE)) {
      // Display gameObject info
      updateUnitInfo(gameObject);
      gameState.selectedUnit = gameObject;
      console.log(gameObject);
      // IF SELECTED BARRACKS, OPEN MENU TO TRAIN AGENTS
      if (gameObject.type == Node.types.barracks_Node) {
        displaySelectedUnitMenu(gameObject);
      }
      return;
    }
  }

  // Clear unit info if no unit is clicked
  updateUnitInfo(null);
  displaySelectedUnitMenu(null);
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
  const worldX = (event.clientX - rect.left) / camera.scale + camera.x;
  const worldY = (event.clientY - rect.top) / camera.scale + camera.y;

  // Snap coordinates to the nearest grid cell
  const snappedX = Math.floor(worldX / GRID_SIZE) * GRID_SIZE;
  const snappedY = Math.floor(worldY / GRID_SIZE) * GRID_SIZE;


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

socket.on("map-update", (updatedMap) => {
  gameState.networkState.nodes = updatedMap;
  logMessage("Map updated " + Date.now());
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

socket.on('update-building', (buildingData) => {
  // Update the map with the new building data
  updateMapWithBuildingData(buildingData);
});

function updateMapWithBuildingData(buildingData) {
  // Logic to update the map with the new building data
  // For example, you might update the DOM elements representing the buildings
  gameState.nodes.push(buildingData);
  io.emit("map-update", gameState.nodes); // Broadcast to all clients
  console.log('Building data updated:', buildingData);
  // Add your map update logic here
}
//#endregion


//#region Utility Functions
function drawText(text, x, y, size = 11, colour = "white", outlineColour = "black", textAlign = null) {
  if (typeof text != "string") { console.error("text is not a string"); console.log(text); return; }

  ctx.font = size.toString() + "px Arial";
  if (textAlign == "center") {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }
  else {
    //Default values
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // Process Text
  /*text = text.split(/_Node|_State/)[0]  // Cut off the class identifier part
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  text=String(text).charAt(0).toUpperCase() + String(text).slice(1);
  text = text.replace("_", " ");*/

  if (outlineColour != "None") {
    // Draw an outline
    ctx.strokeStyle = outlineColour;
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
  }
  //  Draw filled
  ctx.fillStyle = colour;
  ctx.lineWidth = 1;
  ctx.fillText(text, x, y);
}

function drawRect(x, y, width, height, colour, fillPercent) {
  const lineWidth = 5;
  // Draw the outline
  if (fillPercent != undefined) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
  }
  else {
    fillPercent = 100;
  }

  // Calculate the height of the filled portion
  const filledHeight = height * (fillPercent / 100);

  // Draw the filled portion
  ctx.fillStyle = colour;
  ctx.fillRect(x, y + height - filledHeight, width, filledHeight);

  //drawASCIIartInRect(x,y,width,height,colour);
}

function drawASCIIartInRect(x, y, width, height, colour) {
  const asciiArt = `[↟_↟_↟_↟]
[_↟_↟_↟_]
[↟_↟_↟_↟]
[_↟_↟_↟_]
[↟_↟_↟_↟]`;
  // Draw the rectangle
  //ctx.fillStyle = 'black';
  //ctx.fillRect(x, y, width, height);

  // Draw the ASCII art inside the rectangle
  if (asciiArt) {
    const lines = asciiArt.split("\n"); // Split the ASCII art into lines
    const fontSize = height / (lines.length); // Adjust font size to fit all lines
    //ctx.fillStyle = "black"; // Set the text color
    ctx.font = `${fontSize}px monospace`; // Use a monospace font for ASCII art
    ctx.textAlign = "center"; // Center horizontally
    ctx.textBaseline = "middle"; // Adjust vertically for each line

    const lineHeight = fontSize; // Space between lines
    const centerY = y + height / 2; // Vertical center of the rectangle
    const startY = centerY - (lineHeight * (lines.length - 1)) / 2; // Top line position

    ctx.fillStyle = colour;
    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;
      ctx.fillText(line, x + width / 2, lineY); // Draw each line
    });
  }
}

function getGridCoordinates(worldX, worldY) {
  const gridX = Math.floor(worldX / GRID_SIZE) * GRID_SIZE;
  const gridY = Math.floor(worldY / GRID_SIZE) * GRID_SIZE;
  return [gridX, gridY]; // Return as a unique key for the cell
}

// Utility function to check if a point is within a rectangle
function isPointInRect(px, py, rectX, rectY, rectWidth, rectHeight) {
  return px >= rectX && px <= rectX + rectWidth &&
    py >= rectY && py <= rectY + rectHeight;
}

function getRandomPositionInRange(obj, range) {
  const randomX = obj.x + Math.random() * range * 2 - range;
  const randomY = obj.y + Math.random() * range * 2 - range;
  const randomPos = { x: randomX, y: randomY };
  return randomPos;
}

// Helper function to calculate the distance between two positions
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Function to train agents
function trainAgents() {
  const numberOfAgents = document.getElementById("agentNumber").value;
  if (numberOfAgents) {
    console.log(`Training ${numberOfAgents} agents...`);
    // Add your logic here to train the agents
  } else {
    console.log("Please enter the number of agents.");
  }
}

function drawGrid() {
  // Calculate the grid using camera
  const gridStartX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
  const gridStartY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;

  const gridWidth = Math.ceil(canvas.width / (GRID_SIZE * camera.scale));
  const gridHeight = Math.ceil(canvas.height / (GRID_SIZE * camera.scale));
  // Draw grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= gridWidth; i++) {
    const x = (gridStartX + i * GRID_SIZE - camera.x) * camera.scale;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let j = 0; j <= gridHeight; j++) {
    const y = (gridStartY + j * GRID_SIZE - camera.y) * camera.scale;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Function to check if a node exists at the given position
function isCellOccupied(x, y) {
  return gameState.nodes.some((node) => {
    return node.x === x && node.y === y;
  });
}

function calculateTotalLiveAgents() {
  return gameState.agents.length;
}

//#endregion





//#region Start Game - Entry Point - Initialise Game Objects and Game Loop

function initializeGameObjects() {
  // Clear existing game objects
  gameState.nodes = [];
  gameState.agents = [];
  let centerX = canvas.width / 2;
  let centerY = canvas.height / 2;

  // Initialize nodes from the network state
  if (gameState.networkState.nodes && gameState.networkState.nodes.length > 0) {
    gameState.networkState.nodes.forEach(netNode => {
      const newNode = new Node(netNode.x, netNode.y, netNode.type.key, false);
      newNode.id = netNode.id;
      newNode.type = netNode.type;
      newNode.resourceInventory = netNode.resourceInventory;
      newNode.agentCapacity = netNode.agentCapacity;
      newNode.maxAgentCapacity = netNode.maxAgentCapacity;
      newNode.agentTypeAllianceKey = netNode.agentTypeAllianceKey;
      newNode.regenCooldown = netNode.regenCooldown;
      newNode.lastRegenTime = netNode.lastRegenTime;
      gameState.nodes.push(newNode);
      logMessage(`Node added from Server at (${newNode.x}, ${newNode.y})`);
    });
  } else {
    // Add a resource node and a storage_Node nearby
    const nodeCoords = getGridCoordinates(centerX, centerY);
    let tmpInitObj = JSON.parse('{"resourceInventory" : [ {"type":{"key":"food","name":"Food","description":"Resources for consumption.","colour":"yellow","symbol":"🌾"},"amount":100} ] }');
    tmpInitObj.symbol = "🌾";
    //console.log(tmpInitObj);
    addNode(nodeCoords[0], nodeCoords[1] + (GRID_SIZE * 2), Node.types.resource_Node.key, undefined, tmpInitObj);
    //tmpCustomTypeSymbolNode.type.symbol = "🌾";

    addNode(nodeCoords[0], nodeCoords[1] - (GRID_SIZE * 2), Node.types.resource_Node.key);
    addNode(nodeCoords[0] + (GRID_SIZE * 2), nodeCoords[1], Node.types.storage_Node.key);
    addNode(nodeCoords[0], nodeCoords[1], "home");
  }

  // Initialize agents from the network state
  if (gameState.networkState.agents && gameState.networkState.agents.length > 0) {
    gameState.networkState.agents.forEach(netAgent => {
      const newAgent = new Agent(netAgent.x, netAgent.y, netAgent.type.key);
      newAgent.id = netAgent.id;
      newAgent.colour = netAgent.colour;
      newAgent.behaviourState = new Idle_State(); // Assuming agents start in Idle_State
      newAgent.target = netAgent.target;
      newAgent.previousUnitTarget = netAgent.previousUnitTarget;
      newAgent.carrying = netAgent.carrying;
      newAgent.maxCarry = netAgent.maxCarry;
      newAgent.speed = netAgent.speed;
      newAgent.home = netAgent.home;
      newAgent.resourceHunger = netAgent.resourceHunger;
      newAgent.searchRadius = netAgent.searchRadius;
      newAgent.health = netAgent.health;
      newAgent.attackPower = netAgent.attackPower;
      newAgent.attackRange = netAgent.attackRange;
      newAgent.attackCooldown = netAgent.attackCooldown;
      newAgent.lastAttackTime = netAgent.lastAttackTime;
      gameState.agents.push(newAgent);
      logMessage(`Agent added from Server at (${newAgent.x}, ${newAgent.y})`);
    });
  } else {
    // Add initial setup for testing
    const firstAgent = addAgent(centerX, centerY);
    const secondAgent = addAgent(centerX + 100, centerY + 100);
  }
}


function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Fill the entire canvas with colour
  ctx.fillStyle = "rgb(51, 51, 51)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Draw grid
  //drawGrid();

  // Draw Civ Status Bar
  drawCivStatusBarUI();

  // Draw and update nodes
  gameState.nodes.forEach((node) => {
    node.update();
    node.draw()
  });

  // Draw and update agents
  gameState.agents.forEach((agent) => {
    agent.update();
    agent.draw();
  });

  // Draw quest log
  //drawQuestLog();

  // Check quests
  //checkQuests();

  updateUnitInfo(gameState.selectedUnit);

  //console.log("Selected Node Type: "+gameState.selectedType);

  gameState.gameTick += 1;
  requestAnimationFrame(gameLoop);
}

//#endregion

logMessage("Game Started");

updateUnitInfo();


gameLoop();
