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
  nodes: [],
  agents: [],
  selectedType : null, // Tracks the currently selected type (e.g., "storage_Node", "farm")
  spawnedUnitsCount : 0,
  agentBirthChance : 3000  //1 out of <agentBirthChance> chance to give birth
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
  if (typeof text != "string") { console.error("text is not a string"); console.log(text); return;}
  // Capitalise Text
  text = text.split(/_Node|_State/)[0]  // Cut off the class identifier part
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  text=String(text).charAt(0).toUpperCase() + String(text).slice(1);
  text = text.replace("_", " ");

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

function getRandomPositionInRange(obj, range) {
  const randomX = obj.x + Math.random() * range * 2 - range;
  const randomY = obj.y + Math.random() * range * 2 - range;
  const randomPos = { x: randomX, y: randomY };
  return randomPos;
}




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
      console.log(gameObject);
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

// Helper function to calculate the distance between two positions
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

//#region  Node Class
class Node {
  static types = {
    storage_Node    : { key : "storage_Node", colour: "brown", description: "A repository for resources." },
    home            : { key : "home", colour: "blue", description: "Houses agents" },
    quarry          : { key : "quarry", colour: "gray",  description: "Produces stone resources." },
    resource_Node   : { key : "resource_Node", colour: "green", description: "Contains resources to be extracted." }
  }

  constructor(x, y, type) {
    this.id = type + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.type = type;

    this.maxCapacity = 50;
    this.currentCapacity = 0;

    this.agentCapacity = [];
    this.maxAgentCapacity = 2;

  }

  update(){
    // Random chance to spawn agent
    if(this.agentCapacity.length >= 2 && Math.floor(Math.random() * gameState.agentBirthChance)==1 ){
      //Random change to give birth to a new agent
      addAgent(this.x+(GRID_SIZE/2),this.y+(GRID_SIZE/2));
      console.log("New Agent Spawned!!!");
    }

    // Drain resources slowly from storage depo
    if(this.type == Node.types.storage_Node.key && this.currentCapacity > 0)
      this.currentCapacity -= 0.01;
  }

  draw() {
    const screenX = (this.x - camera.x) * camera.scale;
    const screenY = (this.y - camera.y) * camera.scale;
    drawRect(
      screenX,
      screenY,
      GRID_SIZE * camera.scale,
      GRID_SIZE * camera.scale,
      Node.types[this.type].colour
    );
    drawText(
      this.type,
      screenX + 5,
      screenY + GRID_SIZE * camera.scale / 2
    );
  }
}

function populateNodeSelector() {
  const nodeSelector = document.getElementById("nodeSelector");

  // Clear existing options
  nodeSelector.innerHTML = "";

  // Add a default "Please select" option
  const defaultOption = document.createElement("option");
  defaultOption.value = null;
  defaultOption.textContent = "Please select a node...";
  nodeSelector.appendChild(defaultOption);

  // Loop through Node types and add them as options
  const buildTypes  = Node.types;
  buildTypes.genericAgent = "genericAgent";
  buildTypes.raider = "raider";
  for (const nodeType in buildTypes) {
      const option = document.createElement("option");
      option.value = nodeType;
      option.textContent = nodeType.charAt(0).toUpperCase() + nodeType.slice(1); // Capitalize the first letter
      nodeSelector.appendChild(option);
  }
}

// Event handler when a node is selected from the dropdown
function onNodeSelect() {
  const nodeSelector = document.getElementById("nodeSelector");
  const selectedType = nodeSelector.value;
  
  if (selectedType) {
      selectType(selectedType);
  }
}

// Call populateNodeSelector to fill the dropdown when the game starts
populateNodeSelector();



//#region State Class
// Define a State base class (optional)
class State {
  enter(context) {
    // Code executed when entering the state
    console.log(`${context.id} enters ${this.constructor.name}.`);
  }
  execute(context) {
    // Code executed on each update/tick

    /*
    
    */
  }
  exit(context) {
      // Code executed when leaving the state
      console.log(`${context.id} stops  ${this.constructor.name}.`);
  }

  checkForEnemy(context){
    // Check for nearby enemies
    const enemy = context.findEnemy();
    if (enemy) {
      console.log(`${context.id} found an enemy: ${enemy.id}`);
      context.target = enemy;
      context.changeBehaviourState(new Combat_State());
    }
  }
}

//#region Idle State
class Idle_State extends State {
  execute(context) {
    context.target = context.findResourceNode();
    if (context.target) { context.changeBehaviourState(new Gathering_State()); }
  }
}

//#region Roaming State
class Roaming_State extends State {
  execute(context) {
    this.checkForEnemy(context);
    if(context.target){
      context.moveToTarget();
      if (!context.consumeResources()) { //Consume resources, If cannot then change state to gathering
        console.log(context.id+" ran out of resources while roaming.");
        context.target = context.findResourceNode();
        if (context.target) { // If resource found, gather
          context.changeBehaviourState(new Gathering_State()); 
        }
        else{
          //Die?
          context.die;
        }
      }

      if (context.reachedTarget()){
        console.log("Wandering to random position.");
        context.target = getRandomPositionInRange(context.target, GRID_SIZE*3);
      }
    }
    else{
      //  Roaming with no target. Set a new one? 
      context.target = getRandomPositionInRange(context, GRID_SIZE*3);
    }
  }
}

//#region Gathering State
class Gathering_State extends State {
  execute(context) {
    this.checkForEnemy(context);
    context.moveToTarget();
    if (context.reachedTarget()) {
      context.gatherResources();
    }
  }
}

//#region Depositing State
class Depositing_State extends State {
  execute(context) {
    //Execute
    this.checkForEnemy(context);
    context.moveToTarget();
    if (context.reachedTarget()) {
      if(context.target.currentCapacity < context.target.maxCapacity){
        context.depositResources();
        context.changeBehaviourState(new Roaming_State());
      }
      else {
        //Nodes storage is full!
        console.log("Agent cannot deposit resources.");
        //Go Home
        context.target = context.home;
        context.changeBehaviourState(new GoingHome_State());
      }
    }
  }
}

//#region Going Home State
class GoingHome_State extends State {
  execute(context) {
    this.checkForEnemy(context);
    //execute
    context.home   = context.findHome();
    //If no home then wander about
    if (!context.home) {
      // Set target, change state
      context.target = getRandomPositionInRange(context, GRID_SIZE*3);
      context.changeBehaviourState(new Roaming_State()); 
    }
    //context.target = context.home;
    context.moveToTarget();
    if (context.reachedTarget()){
      //Is at Home 
      //console.log("Agent is at home");
      context.home.agentCapacity.push(context);
      context.changeBehaviourState(new AtHome_State());
    }
  }
}

//#region At Home State
class AtHome_State extends State {
  execute(context) {
    //execute
    if(context.target != context.home){ console.error("At home but target is not home."); }
    if (context.carrying >= context.resourceHunger){ //If at home and can eat then consume, if not enough then leave home and gather
      if (!context.consumeResources()) { //Consume resources, If cannot then change state to gathering
        context.changeBehaviourState(new Roaming_State());
      }
    }
    else {
      //leave home
      context.home.agentCapacity = context.home.agentCapacity.filter((agent) => agent !== context);
      context.changeBehaviourState(new Roaming_State());
    }
  }
}

//#region Combat State
class Combat_State extends State {
  enter(agent) {
    console.log(`${agent.id} is entering combat.`);
  }

  execute(agent) {
    if (!agent.target || agent.target.health <= 0) {
      console.log(`${agent.id} has no valid target.`);
      agent.changeBehaviourState(new Roaming_State());
      return;
    }

    const distance = calculateDistance(agent, agent.target);
    if (distance > agent.attackRange) {
      console.log(`${agent.id} is chasing ${agent.target.id}.`);
      agent.moveToTarget(); // Move closer to the target
    } else {
      agent.attackTarget();
    }
  }

  exit(agent) {
    console.log(`${agent.id} is exiting combat.`);
  }
}


//#endregion



//#region Agent Class
class Agent {
  static types = {
    generic : "genericAgent",
    raider  : "raider"
  }

  constructor(x, y, type = Agent.types.generic) {
    this.id = "Agent" + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.behaviourState = new Idle_State(); // Possible behaviourStates: idle, gathering, depositing
    this.target = null; // Current target (node or position)
    this.carrying = 0; // Resources being carried
    this.maxCarry = 5; // Max resources agent can carry
    this.speed = 2; // Movement speed
    this.home = null;
    this.type = type;
    this.resourceHunger = 0.005;  // Amount of resources consumed per iteration

    // Combat properties
    this.health = 100; // Agent's health
    this.attackPower = 10; // Damage dealt by the agent
    this.attackRange = 10; // Range of attack
    this.attackCooldown = 1; // Seconds between attacks
    this.lastAttackTime = 0; // Time of the last attack
  }

  update() {
    if (this.behaviourState){
      this.behaviourState.execute(this);
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
    drawText(this.behaviourState.constructor.name, screenX - 10, screenY - 10);
  }

  findResourceNode() {
    /*
    Find a resource node and set it as the target 
    */
    const resourceNode = gameState.nodes.find(
      (b) => b.type === Node.types.resource_Node.key
    );
    return resourceNode;
  }

  moveToTarget() {
    /*
    Moves Agent towards target
    */
    if (!this.target){ console.error("Theres no target to move to"); return;}
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.speed) {
      //console.log("Waking to target");
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
    else{
      //console.error(this.id+" Cannot walk to target "+this.target);
      //console.log(this.target);
    }
  }

  reachedTarget() {
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
      const storageFound = this.findStorageNode();
      if (!storageFound) { this.changeBehaviourState(new GoingHome_State()); }
    }
  }

  findStorageNode() {
    // Returns True
    let foundStorageNode = null;
    let shortestDistance = Infinity;

    gameState.nodes.forEach( (b) => {
      if (b.type === Node.types.storage_Node.key && b.currentCapacity < b.maxCapacity){
        const pos1 =  {x:this.x, y:this.y};
        const pos2 =  {x:b.x, y:b.y};
        const distance = calculateDistance(pos1, pos2);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          foundStorageNode = b;
        }
      }
    });
    
    this.target = foundStorageNode;
    this.changeBehaviourState(new Depositing_State());
    return foundStorageNode;
  }

  findHome() {
    /*
    Find the closest Node of type Home and set target.
    Find the closest home that has capacity and go there.

    Output: foundHome
    */
    let foundHome = null; // If no home is found, return null
    let shortestDistance = Infinity;

    // Iterate over all nodes to find the closest eligible home
    gameState.nodes.forEach((b) => {
      if (b.type === Node.types.home.key && b.agentCapacity.length < b.maxAgentCapacity) {
        const pos1 =  {x:this.x, y:this.y};
        const pos2 =  {x:b.x, y:b.y};
        const distance = calculateDistance(pos1, pos2);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            foundHome = b;
        }
      }
    });

    this.target = foundHome;
    return foundHome;
}

  depositResources() {
    if (this.carrying > 0) {
      gameState.resources.wood += this.carrying;
      this.target.currentCapacity += this.carrying;
      console.log(`Deposited ${this.carrying} resources.`);
      this.carrying = 0;
    }
  }

  changeBehaviourState(newState){
    if (this.behaviourState) {
      this.behaviourState.exit(this); // Exit the current state
    }
    this.behaviourState = newState;
    this.behaviourState.enter(this); // Enter the new state
  }

  consumeResources(hunger=this.resourceHunger){
    if (this.carrying >= hunger){
      this.carrying -= hunger;
      return true;
    }
    else {  //Agent need to ead and cannot
      //console.log(this.id+" cannot eat.");
      return false;
      //this.die();
      //console.log(this.id+" has died due to lack of resources.");
    }
  }

  isHungry(){
    return this.carrying < this.resourceHunger;
  }

  die(){
    console.log(`${this.id} has died.`);
    gameState.agents = gameState.agents.filter((agent) => agent !== this);
    //gameState.agents.pop(this);
    delete this;
  }

  findEnemy() {
    /*
    Finds an enemy and sets it as a target
    */
    let closestEnemy = null;
    let shortestDistance = Infinity;

    gameState.agents.forEach((agent) => {
      if (agent.type !== this.type && agent.health > 0) { // Find enemies with health > 0
        const distance = calculateDistance(this, agent);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestEnemy = agent;
        }
      }
    });

    //this.target = closestEnemy;
    return closestEnemy;
  }


  attackTarget() {
    const now = performance.now();
    if (now - this.lastAttackTime >= this.attackCooldown * 1000) {
      if (this.target && this.target.health > 0) {
        console.log(`${this.id} attacks ${this.target.id} for ${this.attackPower} damage.`);
        this.target.health -= this.attackPower;

        if (this.target.health <= 0) {
          console.log(`${this.target.id} has been defeated.`);
          this.target.die();
          this.target = null; // Reset target after defeat
          this.changeBehaviourState(new Roaming_State());
        }

        this.lastAttackTime = now;
      } else {
        console.log(`${this.id} has no valid target to attack.`);
        this.changeBehaviourState(new Roaming_State());
      }
    }
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
  /*new Quest("Build a resource node", () => gameState.nodes.some(b => b.type === Node.types.resource_Node.key)),*/
  new Quest("Collect 200 resources", () => gameState.resources.wood >= 200),
  new Quest("Build a storage_Node", () => gameState.nodes.some(b => b.type === Node.types.storage_Node.key)),
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

function addNode(x, y, type) {
  const newNode = new Node(x, y, type);
  gameState.nodes.push(newNode);
  gameState.spawnedUnitsCount += 1;
  console.log(`Spawned a new ${type} Node at ${x}, ${y}.`);
  return newNode;
}

function addAgent(x, y, type  = null) {
  const newAgent = new Agent(x, y);
  newAgent.type = type ? type : newAgent.type;  // if type is given set type if not then leave default
  gameState.agents.push(newAgent);
  gameState.spawnedUnitsCount += 1;
  return newAgent;
}

function drawGrid() {
  // Fill the entire canvas with colour
  ctx.fillStyle = "rgb(51, 51, 51)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // Calculate the grid using camera
  const gridStartX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
  const gridStartY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;

  const gridWidth = Math.ceil(canvas.width / (GRID_SIZE * camera.scale));
  const gridHeight = Math.ceil(canvas.height / (GRID_SIZE * camera.scale));
  // Draw grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
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

function selectType(type) {
  
  if (!Node.types[type]) {
    gameState.selectedType = null;
    //console.error(`Invalid type selected: ${type}`);
    console.log(`Invalid node type selected: ${type}`);
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
  if (gameState.selectedType!=null) {
    // Check if the cell is already occupied
    if (isCellOccupied(snappedX, snappedY)) {
      console.log("Cannot place node: Cell is already occupied.");
      alert("Cannot place node: Cell is already occupied.");
      return;
    }
    // Add the selected unit to the game
    //let typeExists = Object.values(Agent.types).some(type => type.key === gameState.selectedType);
    let typeExists = Object.values(Agent.types).includes(gameState.selectedType);
    if(typeExists){
      addAgent(snappedX, snappedY, gameState.selectedType);
    }
    else{
      addNode(snappedX, snappedY, gameState.selectedType);
    }
    //const builtAgent = addAgent(snappedX, snappedY);
    //builtAgent.home = builtNode;
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
  checkQuests();

  //console.log("Selected Node Type: "+gameState.selectedType);

  requestAnimationFrame(gameLoop);
}


// Simulate Resource Collection Every Second
//setInterval(collectResources, 1000);

//#region   Start Game
// Add initial setup for testing
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;


// First home
var nodeCoords = getGridCoordinates(centerX, centerY-300);
const firstHome = addNode(nodeCoords[0], nodeCoords[1], "home");
// Add a agent in the center
const firstAgent = addAgent(centerX, centerY);
const secondAgent = addAgent(centerX+100, centerY+100);
firstAgent.home = firstHome;
secondAgent.home = firstHome;

// Add a resource node and a storage_Node nearby
nodeCoords = getGridCoordinates(centerX/5, centerY);
addNode(nodeCoords[0], nodeCoords[1], "resource_Node");
//nodeCoords = getGridCoordinates(centerX + 100, centerY);
//addNode(nodeCoords[0], nodeCoords[1], "storage_Node");

updateUnitInfo();


gameLoop();
