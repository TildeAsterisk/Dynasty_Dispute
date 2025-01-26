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


//#region INITIALISING VARIABLES

//Setting up WebSocket
const socket = io("http://localhost:3000");

// Initialising Game Screen Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Initialise Canvas Event Variables
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Initialise Game Grid and Camera
const GRID_SIZE = 50;
const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

const defaultPathfindingCost = 5;

// Initialise Game State
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

function preloadImages() {
  console.log("PRELOADING GRAPHICAL ASSETS...");
  Object.values(Node.types).forEach((nodeType) => {
    console.log("Preloading image for node type: " + nodeType.key);
    nodeType.loadedImg = new Image();
    nodeType.loadedImg.src = nodeType.imgSrc;
  });
}
preloadImages();

//#endregion



//#region Start Game - Entry Point - Initialise Game Objects (Called when socket.on("game-state")) and Game Loop

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
      newNode.neighbors = netNode.neighbors;
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
