// Initialising Game Screen Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game State
const gameState = {
  resources: {
    wood: 0,
    stone: 0,
    food: 0,
  },
  buildings: [],
  agents: [],
  selectedType : null, // Tracks the currently selected type (e.g., "storage_Node", "farm")
  spawnedUnitsCount : 0
};

// Grid and Camera
const GRID_SIZE = 50;
const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

//#region Utility Functions
function drawText(text, x, y, size=11,  colour = "white", outlineColour="black") {
  ctx.font = size.toString()+"px Arial";
  // Capitalise Text
  text = text.split("_")[0]
  text=String(text).charAt(0).toUpperCase() + String(text).slice(1);

  if(outlineColour!="None"){
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

function drawRect(x, y, width, height, colour) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, width, height);
}

function getGridCoordinates(worldX, worldY) {
  const gridX = Math.floor(worldX / GRID_SIZE) * GRID_SIZE;
  const gridY = Math.floor(worldY / GRID_SIZE) * GRID_SIZE;
  return [gridX,gridY]; // Return as a unique key for the cell
}

// Utility function to check if a point is within a rectangle
function isPointInRect(px, py, rectX, rectY, rectWidth, rectHeight) {
  return px >= rectX && px <= rectX + rectWidth &&
         py >= rectY && py <= rectY + rectHeight;
}

// Event handler for selecting a unit
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) / camera.scale + camera.x;
  const mouseY = (event.clientY - rect.top) / camera.scale + camera.y;

  const gameObjectsArray = gameState.buildings.concat(gameState.agents);

  // Check for clicked building
  for (const gameObject of gameObjectsArray) {
    const buildingScreenX = (gameObject.x - camera.x) * camera.scale;
    const buildingScreenY = (gameObject.y - camera.y) * camera.scale;
    const buildingSize = GRID_SIZE * camera.scale;

    if (isPointInRect(mouseX, mouseY, gameObject.x, gameObject.y, GRID_SIZE, GRID_SIZE)) {
      // Display gameObject info
      updateUnitInfo(gameObject);
      return;
    }
  }

  // Clear unit info if no unit is clicked
  updateUnitInfo(null);
});

// Function to update the #unitInfo div
function updateUnitInfo(object=null) {
  const unitInfoDiv = document.getElementById("unitInfo");
  if (!object){
    unitInfoDiv.innerHTML = `<h3>Unit Info:</h3><p>Click on a unit to view details.</p>`;
    return;
  }


  // Create table element
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";

  // Add table header
  /*const headerRow = table.insertRow();
  headerRow.innerHTML = `<th style="border: 1px solid black; padding: 5px;">Attribute</th>
                         <th style="border: 1px solid black; padding: 5px;">Value</th>`;*/

  // Populate table rows with object's attributes
  for (const [key, value] of Object.entries(object)) {
    const row = table.insertRow();
    row.innerHTML = `<td style="border: 1px solid black; padding: 5px;">${key}</td>
                     <td style="border: 1px solid black; padding: 5px;">${value}</td>`;
  }

  // Set the inner HTML of the div and append the table
  unitInfoDiv.innerHTML = `<h3>Unit Info:</h3>`;
  unitInfoDiv.appendChild(table);
}


//#region  Building Class
class Building {
  static types = {
    storage_Node    : { key : "storage_Node", colour: "brown", description: "Provides shelter for agents." },
    farm            : { key : "farm", colour: "green", description: "Produces food resources." },
    quarry          : { key : "quarry", colour: "gray",  description: "Produces stone resources." },
    resource_Node   : { key : "resource_Node", colour: "green", description: "Contains resources to be extracted." }
  }

  constructor(x, y, type) {
    this.id = "Building" + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.type = type;
  }

  draw() {
    const screenX = (this.x - camera.x) * camera.scale;
    const screenY = (this.y - camera.y) * camera.scale;
    drawRect(
      screenX,
      screenY,
      GRID_SIZE * camera.scale,
      GRID_SIZE * camera.scale,
      Building.types[this.type].colour
    );
    drawText(
      this.type,
      screenX + 5,
      screenY + GRID_SIZE * camera.scale / 2
    );
  }
}

function populateBuildingSelector() {
  const buildingSelector = document.getElementById("buildingSelector");

  // Clear existing options
  buildingSelector.innerHTML = "";

  // Add a default "Please select" option
  const defaultOption = document.createElement("option");
  defaultOption.value = null;
  defaultOption.textContent = "Please select a building...";
  buildingSelector.appendChild(defaultOption);

  // Loop through Building types and add them as options
  for (const buildingType in Building.types) {
      const option = document.createElement("option");
      option.value = buildingType;
      option.textContent = buildingType.charAt(0).toUpperCase() + buildingType.slice(1); // Capitalize the first letter
      buildingSelector.appendChild(option);
  }
}

// Event handler when a building is selected from the dropdown
function onBuildingSelect() {
  const buildingSelector = document.getElementById("buildingSelector");
  const selectedType = buildingSelector.value;
  
  if (selectedType) {
      selectType(selectedType);
  }
}

// Call populateBuildingSelector to fill the dropdown when the game starts
populateBuildingSelector();


//#region Agent Class
class Agent {
  constructor(x, y) {
    this.id = "Agent" + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.job = "idle"; // Possible jobs: idle, gathering, depositing
    this.target = null; // Current target (building or position)
    this.carrying = 0; // Resources being carried
    this.maxCarry = 5; // Max resources agent can carry
    this.speed = 2; // Movement speed
    this.home = null;
  }

  update() {
    switch (this.job) {
      case "idle":
        this.findResourceNode();
        break;
      case "gathering":
        this.moveToTarget();
        if (this.reachedTarget()) {
          this.gatherResources();
        }
        break;
      case "depositing":
        this.moveToTarget();
        if (this.reachedTarget()) {
          this.depositResources();
        }
        break;
    }
  }

  draw() {
    const screenX = (this.x - camera.x) * camera.scale;
    const screenY = (this.y - camera.y) * camera.scale;
    drawRect(
      screenX,
      screenY,
      (GRID_SIZE / 5) * camera.scale,
      (GRID_SIZE / 5) * camera.scale,
      "black"
    );
    drawText(this.job, screenX - 10, screenY - 10);
  }

  findResourceNode() {
    const resourceNode = gameState.buildings.find(
      (b) => b.type === Building.types.resource_Node.key
    );
    if (resourceNode) {
      this.job = "gathering";
      this.target = resourceNode;
    }
  }

  moveToTarget() {
    if (!this.target) return;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.speed) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
  }

  reachedTarget() {
    if (!this.target) return false;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    return Math.abs(dx) < 5 && Math.abs(dy) < 5;
  }

  gatherResources() {
    if (this.carrying < this.maxCarry) {
      this.carrying++;
      //console.log("Gathered 1 resource.");
    }

    if (this.carrying >= this.maxCarry) {
      this.findStorageNode();
    }
  }

  findStorageNode() {
    var foundStorageNode = null;
    if (this.home && this.home.type == Building.types.storage_Node.key) {
      this.job = "depositing";
      this.target = this.home;
    }
    else {
      foundStorageNode = gameState.buildings.find((b) => b.type === Building.types.storage_Node.key);
      this.home = foundStorageNode;

      if (!foundStorageNode){
        this.job = "idle"; // No storage_Node found, return to idle
        this.target = null;
      }
      
    }
  }

  depositResources() {
    if (this.carrying > 0) {
      gameState.resources.wood += this.carrying;
      //console.log(`Deposited ${this.carrying} resources.`);
      this.carrying = 0;
    }
    this.job = "idle"; // Return to idle after depositing
    this.target = null;
  }
}


//#region Questing
// Quest Class
class Quest {
  constructor(description, condition) {
    this.description = description;
    this.condition = condition; // A function to check if the quest is complete
    this.completed = false;
  }

  checkCompletion() {
    if (!this.completed && this.condition()) {
      this.completed = true;
      console.log(`Quest Completed: ${this.description}`);
      //alert(`Quest Completed: ${this.description}`);
    }
  }
}

// Quest Log
const questLog = [
  /*new Quest("Build a resource node", () => gameState.buildings.some(b => b.type === Building.types.resource_Node.key)),*/
  new Quest("Collect 200 resources", () => gameState.resources.wood >= 200),
  new Quest("Build a storage_Node", () => gameState.buildings.some(b => b.type === Building.types.storage_Node.key)),
];
// Function to draw the quest log on the canvas screen
function drawQuestLog() {
  drawText("Quests:", canvas.width - 200, 30, 16);
  questLog.forEach((quest, index) => {
    const text = `${index + 1}. ${quest.description}${quest.completed ? " (Completed)" : ""}`;
    drawText(text, canvas.width - 200, 60 + index * 30, 14, quest.completed ? "green" : "white");
  });
}

// Generate quests log as a HTML element
function renderQuests() {
  const questContainer = document.getElementById("questContainer");

  // Clear existing quests
  questContainer.innerHTML = "<h3>Quests:</h3>";

  questLog.forEach((quest, index) => {
      // Create a div for each quest
      const questDiv = document.createElement("div");
      questDiv.className = "quest-item";

      // Set quest text
      questDiv.textContent = `${index + 1}. ${quest.description} ${
          quest.completed ? "(Completed)" : ""
      }`;

      // Optionally style completed quests
      if (quest.completed) {
          questDiv.style.color = "lightgreen";
      }

      questContainer.appendChild(questDiv);
  });
}

// Update quest rendering whenever quests change
function checkQuests() {
  questLog.forEach((quest) => quest.checkCompletion());
  renderQuests(); // Re-render quests
}

// Call renderQuests initially to populate the list
renderQuests();

//#endregion

//#region Game Functions
function collectResources() {
  gameState.resources.wood += 1;
  gameState.resources.stone += 1;
  gameState.resources.food += 1;
}

function addBuilding(x, y, type) {
  const newBuilding = new Building(x, y, type);
  gameState.buildings.push(newBuilding);
  gameState.spawnedUnitsCount += 1;
  return newBuilding;
}

function addAgent(x, y) {
  const newAgent = new Agent(x, y);
  gameState.agents.push(newAgent);
  gameState.spawnedUnitsCount += 1;
  return newAgent;
}

function drawGrid() {
  const gridStartX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
  const gridStartY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;

  const gridWidth = Math.ceil(canvas.width / (GRID_SIZE * camera.scale));
  const gridHeight = Math.ceil(canvas.height / (GRID_SIZE * camera.scale));

  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
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

// Function to check if a building exists at the given position
function isCellOccupied(x, y) {
  return gameState.buildings.some((building) => {
    return building.x === x && building.y === y;
  });
}

function selectType(type) {
  
  if (!Building.types[type]) {
    gameState.selectedType = null;
    //console.error(`Invalid type selected: ${type}`);
    console.log(`Invalid building type selected: ${type}`);
    return;
  }
  
  gameState.selectedType = type;
  console.log(`Selected type: ${type}`);
}
//#endregion

//#region   Mouse Event Handlers
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

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

// Mouse click event for adding buildings
canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();

  // Convert screen coordinates to world coordinates
  const worldX = (event.clientX - rect.left) / camera.scale + camera.x;
  const worldY = (event.clientY - rect.top) / camera.scale + camera.y;

  // Snap coordinates to the nearest grid cell
  const snappedX = Math.floor(worldX / GRID_SIZE) * GRID_SIZE;
  const snappedY = Math.floor(worldY / GRID_SIZE) * GRID_SIZE;


  // Ensure a type is selected
  if (gameState.selectedType!=null) {
    // Check if the cell is already occupied
    if (isCellOccupied(snappedX, snappedY)) {
      console.log("Cannot place building: Cell is already occupied.");
      alert("Cannot place building: Cell is already occupied.");
      return;
    }
    // Add the selected building to the game
    const builtBuilding = addBuilding(snappedX, snappedY, gameState.selectedType);
    const builtAgent = addAgent(snappedX, snappedY);
    builtAgent.home = builtBuilding;
    console.log(`Placed ${gameState.selectedType} at (${snappedX}, ${snappedY})`);
  }
  else{
    // Selecting a unit?
  }
  
});

//#endregion

//#region  Game Loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  drawGrid();

  // Draw resources
  drawText(`Wood: ${gameState.resources.wood}`, 10, 30, 20);
  drawText(`Stone: ${gameState.resources.stone}`, 10, 60, 20);
  drawText(`Food: ${gameState.resources.food}`, 10, 90, 20);

  // Draw and update buildings
  gameState.buildings.forEach((building) => building.draw());

  // Draw and update agents
  gameState.agents.forEach((agent) => {
    agent.update();
    agent.draw();
  });

  // Draw quest log
  //drawQuestLog();

  // Check quests
  checkQuests();

  //console.log("Selected Building Type: "+gameState.selectedType);

  requestAnimationFrame(gameLoop);
}


// Simulate Resource Collection Every Second
//setInterval(collectResources, 1000);

//#region   Start Game
// Add initial setup for testing
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

// Add a agent in the center
addAgent(centerX, centerY);

// Add a resource node and a storage_Node nearby
var buildingCoords = getGridCoordinates(centerX/5, centerY);
addBuilding(buildingCoords[0], buildingCoords[1], "resource_Node");
buildingCoords = getGridCoordinates(centerX + 100, centerY);
addBuilding(buildingCoords[0], buildingCoords[1], "storage_Node");

updateUnitInfo();


gameLoop();
