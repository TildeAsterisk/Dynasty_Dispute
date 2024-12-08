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
  stickmen: [],
  selectedType : null // Tracks the currently selected type (e.g., "house", "farm")
};

// Grid and Camera
const GRID_SIZE = 50;
const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

//#region Common Functions
function drawText(text, x, y, size=11,  colour = "white", outlineColour="black") {
  ctx.font = size.toString()+"px Arial";
  // Capitalise Text
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

//#region  Building Class
class Building {
  static types = {
    house           : { colour: "brown", description: "Provides shelter for stickmen." },
    farm            : { colour: "green", description: "Produces food resources." },
    quarry          : { colour: "gray",  description: "Produces stone resources." },
    resource_Node : { colour: "green", description: "Contains resources to be extracted." }
  }

  constructor(x, y, type) {
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

//#region Stickman Class
class Stickman {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.job = "idle"; // Possible jobs: idle, gathering, building
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
  new Quest("Build a house", () => gameState.buildings.some(b => b.type === "house")),
  new Quest("Build a resource node", () => gameState.buildings.some(b => b.type === "resource_Node")),
  new Quest("Collect 10 wood", () => gameState.resources.wood >= 10),
];

// Function to draw the quest log on the screen
function drawQuestLog() {
  drawText("Quests:", canvas.width - 200, 30, 16);
  questLog.forEach((quest, index) => {
    const text = `${index + 1}. ${quest.description}${quest.completed ? " (Completed)" : ""}`;
    drawText(text, canvas.width - 200, 60 + index * 30, 14, quest.completed ? "green" : "white");
  });
}

// Check for quest completion in the game loop
function checkQuests() {
  questLog.forEach((quest) => quest.checkCompletion());
}
//#endregion

//#region Game Functions
function collectResources() {
  gameState.resources.wood += 1;
  gameState.resources.stone += 1;
  gameState.resources.food += 1;
}

function addBuilding(x, y, type) {
  gameState.buildings.push(new Building(x, y, type));
}

function addStickman(x, y) {
  gameState.stickmen.push(new Stickman(x, y));
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
    console.error(`Invalid type selected: ${type}`);
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

  // Check if the cell is already occupied
  if (isCellOccupied(snappedX, snappedY)) {
    console.log("Cannot place building: Cell is already occupied.");
    alert("Cannot place building: Cell is already occupied.");
    return;
  }

  // Ensure a type is selected
  if (!gameState.selectedType) {
    alert("Please select a building type to place!");
    return;
  }

  // Add the selected building to the game
  addBuilding(snappedX, snappedY, gameState.selectedType);
  console.log(`Placed ${gameState.selectedType} at (${snappedX}, ${snappedY})`);
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

  // Draw buildings
  gameState.buildings.forEach((building) => {
    building.draw();
    //calculate points
  });

  // Draw stickmen
  gameState.stickmen.forEach((stickman) => stickman.draw());

  // Draw quest log
  drawQuestLog();

  // Check quests
  checkQuests();

  requestAnimationFrame(gameLoop);
}

// Simulate Resource Collection Every Second
//setInterval(collectResources, 1000);

//#region   Start Game
addStickman(canvas.width/2, canvas.height/2);

gameLoop();
