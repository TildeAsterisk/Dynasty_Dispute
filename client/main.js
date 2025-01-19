
//const log = document.getElementById("log");

function logMessage(message) {
    const logEntry = document.createElement("div");
    logEntry.textContent = message;
    //log.appendChild(logEntry);
    //log.scrollTop = log.scrollHeight;
    socket.emit("client-log", message); // Emit log message to the server
    console.log(message);
}

/*function viewMap() {
    logMessage("Current Map:");
    logMessage(JSON.stringify(gameState.map, null, 2));
}
*/

function clearLog() {
    //log.innerHTML = "";
}


//#region GAME START HERE
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
  selectedType : null, // Tracks the currently selected type (e.g., "storage_Node", "farm")
  spawnedUnitsCount : 0,
  agentBirthChance : 3000,  //1 out of <agentBirthChance> chance to give birth
  selectedUnit : null,
  totalStoredResources : 0,
  gameTick : 0,
  networkState : {nodes: [], agents: [], players: []}
};


//#region WebSocket Event Listeners
socket.on("game-state", (state) => {
  gameState.networkState = state;
  logMessage("Received initial game state");
  initializeGameObjects();
  //renderGame();
});

socket.on("map-update", (updatedMap) => {
  gameState.networkState.nodes = updatedMap;
  logMessage("Map updated "+Date.now());
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
//#endregion

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
    addNode(nodeCoords[0], nodeCoords[1] + (GRID_SIZE * 2), Node.types.resource_Node.key);
    addNode(nodeCoords[0], nodeCoords[1] - (GRID_SIZE * 2), Node.types.storage_Node.key);
    let tmpInitObj = JSON.parse('{"resourceInventory" : [ {"type":{"key":"food","name":"Food","description":"Resources for consumption.","colour":"yellow"},"amount":100} ] }');
    //console.log(tmpInitObj);
    addNode(nodeCoords[0], nodeCoords[1], Node.types.resource_Node.key, undefined,tmpInitObj);
    const homeCoords = getGridCoordinates(centerX + 100, centerY + 100);
    addNode(homeCoords[0], homeCoords[1], "home");
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

// Grid and Camera
const GRID_SIZE = 50;
const camera = {
  x: 0,
  y: 0,
  scale: 1,
};

//#region Utility Functions
function drawText(text, x, y, size=11,  colour = "white", outlineColour="black", textAlign = null) {
  if (typeof text != "string") { console.error("text is not a string"); console.log(text); return;}

  ctx.font = size.toString()+"px Arial";
  if (textAlign=="center"){
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }
  else{ 
    //Default values
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // Process Text
  /*text = text.split(/_Node|_State/)[0]  // Cut off the class identifier part
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  text=String(text).charAt(0).toUpperCase() + String(text).slice(1);
  text = text.replace("_", " ");*/

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

function drawRect(x, y, width, height, colour, fillPercent) {
  const lineWidth = 5;
  // Draw the outline
  if (fillPercent != undefined) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
  }
  else{
    fillPercent=100;
  }

  // Calculate the height of the filled portion
  const filledHeight = height * (fillPercent / 100);

  // Draw the filled portion
  ctx.fillStyle = colour;
  ctx.fillRect(x, y + height - filledHeight, width, filledHeight);
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

// Function to update the #unitInfo div
function updateUnitInfo(object=null) {
  const unitInfoDiv = document.getElementById("unitInfo");
  if (!object){
    unitInfoDiv.innerHTML = ``;
    return;
  }


  // Create table element
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.borderSpacing = 0;
  table.style.width = "100%";
  //table.style = "border-collapse = collapse; border-spacing: 0;";

  // Add table header
  /*const headerRow = table.insertRow();
  headerRow.innerHTML = `<th style="border: 1px solid black; padding: 5px;">Attribute</th>
                         <th style="border: 1px solid black; padding: 5px;">Value</th>`;*/

  // Populate table rows with object's attributes
  for (const [key, value] of Object.entries(object)) {
    let roundedValue = value;
    if (typeof value == 'number'){ roundedValue = value.toFixed(2); }  // If attribute is a number then round
    if (typeof value == 'object') { roundedValue = value.id ? value.id : JSON.stringify(value);}
    if (key == "type") { roundedValue = value.name; }

    const row = table.insertRow();
    row.style = "border: 1px solid #cccccc6d; border-radius: 10px;"
    row.innerHTML = `<td style="border: none; ">${key}</td>
                     <td style="border: none;">: ${roundedValue}</td>`;
  }

  // Set the inner HTML of the div and append the table
  unitInfoDiv.innerHTML = `<b>Unit Info:</b>`;
  unitInfoDiv.appendChild(table);
  unitInfoDiv.innerHTML += `<br>`;
}

// Helper function to calculate the distance between two positions
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function displaySelectedUnitMenu(object = null){
  const unitInfoDiv = document.getElementById("unitActionsMenu");
  if (!object){
    unitInfoDiv.innerHTML = ``;
    return;
  }

  // Create table element
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.borderSpacing = 0;
  table.style.width = "100%";

  // Add input field and button to train agents
  const buttonRow = table.insertRow();
  buttonRow.innerHTML = `<td style="padding: 5px;"><input type="number" id="agentNumber" min="1" style="width: 100%;"></td>
                         <td style="padding: 5px;"><button onclick="trainAgents()">Train Agents</button></td>`;

  unitInfoDiv.innerHTML = `<b>${object.id}</b>`;
  unitInfoDiv.appendChild(table);
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

//#region Resource Class
class Resource {
  static types = {
    rawMaterials: {
      key: "rawMaterials",
      name: "Raw Materials",
      description: "Resources for construction and crafting.",
      colour: "gray"
    },
    food: {
      key: "food",
      name: "Food",
      description: "Resources for consumption.",
      colour: "yellow"
    },
    agricultural: {
      key: "agricultural",
      name: "Agricultural Resources",
      description: "Resources for farming and agriculture.",
      colour: "green"
    }
  };

  constructor(typeKey, amount) {
    this.type = Resource.types[typeKey];
    this.amount = amount;
  }
}
//#endregion


//#region  Node Class
class Node {
  static types = {
    storage_Node : 
    { 
      key : "storage_Node",
      name: "Storage Node",
      colour: "brown", 
      description: "A repository for resources. Cost: 50",
      cost : 50
    },
    home : 
    { 
      key : "home",
      name: "Home",
      description: "A central hub for agents. Cost: 50", 
      colour: "grey", 
      cost : 50 
    },
    resource_Node : 
    { 
      key : "resource_Node",
      name: "Resource Node",
      colour: "green", 
      description: "Contains resources to be extracted.  Cost: 0",
      cost : 0
    },
    barracks_Node : 
    { 
      key : "barracks_Node",
      name: "Barracks Node",
      colour: "orange", 
      description: "Houses and trains Agents for defence.  Cost: 150",
      cost : 150 
    }
  }

  constructor(x, y, typeKey) {
    this.id = typeKey + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.type = Node.types[typeKey]; // If type object is given, inherit initial  from type object dict.
    this.colour = this.type.colour;

    this.maxCapacity = 100;
    this.resourceInventory = (Node.types.resource_Node.key === typeKey) ? [new Resource(Resource.types.rawMaterials.key, this.maxCapacity)] : []; //If resource node give default inventory

    this.agentCapacity = [];
    this.maxAgentCapacity = 2;

    this.agentTypeAllianceKey = 0;

    this.regenCooldown = 120; // number of gameTicks between regen (24-60 per second) (20 is good and short)
    this.lastRegenTime = 0; // Time of the regen

  }

  update(){
    // Random chance to spawn agent
    // check if number of homes is enough for new agent
    let numHomes = (gameState.nodes.filter(b => b.type.key === Node.types.home.key).length);
    let numAgents = calculateTotalLiveAgents();
    const enoughHomes = ( numAgents < (numHomes*2)+1 );
    if(this.agentCapacity.length >= 2 && Math.floor(Math.random() * gameState.agentBirthChance)==1 && enoughHomes ){
      //Random change to give birth to a new agent
      addAgent(this.x+(GRID_SIZE/2),this.y+(GRID_SIZE/2), this.agentCapacity[0].type.key);
      console.log("New Agent Spawned!!!"); //newborn
    }

    

    switch (this.type.key){
      case Node.types.storage_Node.key:
        /* Drain resources slowly from storage depo
        if(this.get... > 0){
          this.resourceInventory.food.amount -= 0.005; // RESOURCE DECAY
        }*/
        break;
      case Node.types.resource_Node.key:
        this.checkCooldownRegen();
        break;
    }

  }

  draw() {
    const screenX = (this.x - camera.x) * camera.scale;
    const screenY = (this.y - camera.y) * camera.scale;
    //calculate percentage of fill
    let totalResInvFillPct=1;
    this.resourceInventory.forEach(invResource => {
      const rFillPct = (invResource.amount/this.maxCapacity);
      totalResInvFillPct = totalResInvFillPct*rFillPct;
    });
    drawRect(
      screenX,
      screenY,
      GRID_SIZE * camera.scale,
      GRID_SIZE * camera.scale,
      this.type.colour,
      totalResInvFillPct *100  // Fill percentage
    );
    /*drawText(
      this.type.key,
      screenX + 5,
      screenY + GRID_SIZE * camera.scale / 2
    );*/
  }

  checkCooldownRegen() {
    const now = gameState.gameTick;
    if (now - this.lastRegenTime >= this.regenCooldown * 60) { // Check if regen cooldown finished
      // Regenerate resources
      this.resourceInventory.forEach(resource => {
        resource.amount = this.maxCapacity;
      });
      this.lastRegenTime = now;
      return true;
    } else {
      return false;
    }
  }

  getResourceInInventory(resourceTypeKey) {
    //return this.resourceInventory.reduce((total, resource) => total + resource.amount, 0);
    //console.log("GETTING RESOURCE "+resourceTypeKey, this.resourceInventory);
    //console.log(this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? "ok" : this.resourceInventory[0]);
    return this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) : new Resource(resourceTypeKey, 0);
  }

}


//#region State Class
// Define a State base class (optional)
class State {
  constructor(){
    this.textSymbol = "💭";
  }

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
    //console.log(`${context.id} stops  ${this.constructor.name}.`);
  }

  checkForEnemy(context){
    // Check for nearby enemies
    const enemy = context.findEnemy(context.searchRadius);
    if (enemy) {
      console.log(`${context.id} found an enemy: ${enemy.id}`);
      context.setNewTarget(enemy);
      context.changeBehaviourState(new Combat_State());
    }
  }
}

//#region Idle State
/**
 * ## Idle_State.execute(context)
 * ### Executes the idle state logic.
 * - If the agent cannot consume resources, it tries to find a resource node.
 * - If a resource node is found, it changes state to gathering.
 * - If no resource node is found, it tries to find a storage node.
 *   - If a storage node is found, it changes state to gathering.
 *   - If no storage node is found, the agent dies due to lack of resources.
 * - If the agent can consume resources, it continues roaming.
 * - It tries to find a resource node for raw materials.
 *   - If a resource node is found, it changes state to gathering.
 *   - If no resource node is found, it reverts to the previous target and changes state to gathering.
 * @param {object|null} context - The agent object.
 */
class Idle_State extends State {
  execute(context) {
    /*context.moveToTarget();
    if (context.reachedTarget()){

    }*/
    let newTargetQuery;

    if (!context.consumeResources(Resource.types.food.key)) { // Each food, if cannot...
      // try to find resource node with food
      newTargetQuery = context.findResourceNode(context.searchRadius*2, Resource.types.food.key);
      if (newTargetQuery) { // If food found, gather
        context.setNewTarget(newTargetQuery);
        context.targetResourceTypeKey = Resource.types.food.key;
        context.changeBehaviourState(new Gathering_State()); 
        return;
      }
      else{ // Cannot consume resources, and cannot find resource node
        // try to find storage node to take from
        newTargetQuery = context.findStorageNode_NotEmptyInRange(context.searchRadius*2, Resource.types.food.key);
        if(newTargetQuery){
          //console.log(context.id, "is retrieving food from storage", context.target.id);
          context.setNewTarget(newTargetQuery);
          context.targetResourceTypeKey = Resource.types.food.key;
          context.changeBehaviourState(new Gathering_State());
          return;
        }
        else{
          console.log(context.id+" ran out of resources while Idle.");
          context.die();
          return;
        }    
      }
    }
    else{ // Is idle and just consumed food. Find work to do...
      // find a storage node with space to deposit into
      newTargetQuery = context.findStorageNode_LowestInRange(context.searchRadius, Resource.types.rawMaterials.key);
      if (newTargetQuery) { // If there is storage node with space, find resource node to gather
        newTargetQuery = context.findResourceNode(context.searchRadius*2, Resource.types.rawMaterials.key);
        if(newTargetQuery){
          context.setNewTarget(newTargetQuery);
          context.targetResourceTypeKey = Resource.types.rawMaterials.key;
          context.changeBehaviourState(new Gathering_State()); 
          return;
        }
        else{ // No work to be done (Storage full). Go home, or roam or chill...
          context.changeBehaviourState(new Roaming_State());
          return;
        }
      }
      else{ // Idle, consumed food and no work to do.
        context.changeBehaviourState(new GoingHome_State());
        return;
      }
    }

  }
}

//#region Roaming State
/**
 * ## Roaming_State.execute(context)
 * ### Executes the roaming state logic.
 * - Checks for enemies.
 * - If the agent cannot consume resources, it tries to find a resource node.
 *   - If no resource node is found, it tries to find a storage node to gather from.
 *     - If a storage node is found, it changes state to gathering.
 *     - If no storage node is found, the agent dies due to lack of resources.
 * 
 * - If the agent can consume resources and has a target, attempts to move towards it.
 *   - Moves towards the target.
 *   - If the agent reaches the target, it sets a new random roam position.
 * @param {object|null} context - The agent object.
 */
class Roaming_State extends State {
  constructor(){
    super(); this.textSymbol = "";//"🧭";
  }

  execute(context) {
    this.checkForEnemy(context);
    let newTargetQuery;
    if (!context.consumeResources(Resource.types.food.key)) { // Each food, if cannot...
      // try to find resource node with food
      newTargetQuery = context.findResourceNode(context.searchRadius*2, Resource.types.food.key);
      if (newTargetQuery) { // If food found, gather
        context.setNewTarget(newTargetQuery);
        context.targetResourceTypeKey = Resource.types.food.key;
        context.changeBehaviourState(new Gathering_State()); 
        return;
      }
      else{ // Cannot consume resources, and cannot find resource node
        // try to find storage node to take from
        newTargetQuery = context.findStorageNode_NotEmptyInRange(context.searchRadius*2, Resource.types.food.key);
        if(newTargetQuery){
          //console.log(context.id, "is retrieving food from storage", context.target.id);
          context.setNewTarget(newTargetQuery);
          context.targetResourceTypeKey = Resource.types.food.key;
          context.changeBehaviourState(new Gathering_State());
          return;
        }
        else{
          console.log(context.id+" ran out of resources while Roaming.");
          context.die();
          return;
        }    
      }
    }
    else{ // Can consume food.
      // Roam around randomly
      if(context.target){
        context.moveToTarget();
        return;
      }
      else{
        //  Roaming with no target. Set a new one? 
        context.setRandomRoamPosition();
      }
    }

  }
}

//#region Gathering State
/**
 * Executes the gathering state logic.
 * - If the agent has reached the target, gather resources. (Set node alliance key)
 * - If the agent is gathering from a resource node and cannot gather anymore...
 *   - Find a storage node to deposit resources.
 *   - If no storage node is found to deposit, go home.
 * - If the agent is gathering from a storage node and cannot gather anymore...
 *   - Find a storage node to deposit resources.
 *     - If no storage node is found to deposit, go home.
 * @param {object|null} context - The agent object.
 */
class Gathering_State extends State {
  constructor(){
    super(); this.textSymbol = "⚙"; //📥?
  }

  execute(context) {
    this.checkForEnemy(context);  // Check for an Enemy, if found transition to Combat immediately

    if (context.reachedTarget()) {  // Reached Resource?
      //console.log("REACHED",context.target);
      if(context.gatherResources(context.targetResourceTypeKey)) { // If Target reached and resources gathered
        //console.log(context.id, "Gathering resources ",context.target.id);
        // Set Node typealliance 
        context.target.agentTypeAllianceKey = context.type.key;
        return;
      }
      else{ // If cannot gather anymore
        // iff gathered from resource, then store it. If gathered from stroage then go home
        console.log(context.id, "Cannot gather "+ context.targetResourceTypeKey+" from ",context.target.id);

        if(context.target.id && context.target.type.key == Node.types.resource_Node.key){
          const storageFound = context.findStorageNode_LowestInRange(context.searchRadius); // go and store gathered resources
          if(storageFound) {
            context.setNewTarget(storageFound);  // Find new storage
            context.changeBehaviourState(new Depositing_State());
            return;
          }
          else{ // No storage found
            console.log(context.id,"finished gathering and no storage found");
            context.changeBehaviourState(new GoingHome_State());
            return;
          }
        }

        else if (context.target.id && context.target.type.key == Node.types.storage_Node.key) {
          // Finished gathering from storage.
          console.log(context.id,"finished taking from storage");
          context.changeBehaviourState(new GoingHome_State());
          return;
        }
        else{ // cannot gather from target
          context.changeBehaviourState(new GoingHome_State());
          return;
        }

      }
    }
    else{
      context.moveToTarget(); // Advance towards target
    }
  }
}

//#region Depositing State
/**
   * Executes the depositing state logic.
   * - If the agent has reached the target, deposit resources.
   * - If the agent cannot deposit resources, go home.
   * @param {object|null} context - The agent object.
   */
class Depositing_State extends State {
  constructor(){
    super(); this.textSymbol = "📦"; //📤?
  }

  execute(context) {
    //Execute
    this.checkForEnemy(context);
    context.moveToTarget();
    if (context.reachedTarget()) {
      if(context.depositResources(context.targetNodeResource)){ // If can deposit
        context.target.agentTypeAllianceKey = context.type.key; // Change Node alliance key
        context.changeBehaviourState(new Roaming_State());  // Go roaming
      }
      else {
        // If cannot deposit resources, go home
        console.log(context.id," cannot deposit resources, going home.");
        context.setNewTarget(context.home);
        context.changeBehaviourState(new GoingHome_State());
      }
    }
  }
}

//#region Going Home State
/**
 * Executes the going home state logic.
 * - If the agent can find a home, move towards it.
 * - If the agent has reached home, enter the home.
 * - If the agent cannot find a home, go roaming.
 * - If the agent has no home, go roaming.
 * @param {object|null} context - The agent object.
 */
class GoingHome_State extends State {
  constructor(){
    super(); this.textSymbol = "🏠";
  }

  execute(context) {
    this.checkForEnemy(context);
    //execute
    context.home = context.findHome(context.searchRadius);
    context.setNewTarget(context.home);

    context.moveToTarget();
    if (context.reachedTarget()){
      // If agent reached home and its not full
      if(context.home && context.home.agentCapacity.length < context.home.maxAgentCapacity){
        context.enterTargetNode();
        context.changeBehaviourState(new AtHome_State());
        return;
      }
    }

    //If no home then wander about
    if (!context.home) {
      // Set target, change state
      context.setNewTarget(getRandomPositionInRange(context, GRID_SIZE*3));
      context.changeBehaviourState(new Roaming_State()); 
      return;
    }
  }
}

//#region At Home State
/**
 * Executes the at home state logic.
 * - If the agent is hungry, consume food and do nothing...
 *   - If the agent cannot consume food, go gathering.
 * - If the agent is not hungry, stay home and do nothing...
 * @param {object|null} context - The agent object.
 */
class AtHome_State extends State {
  constructor(){
    super(); this.textSymbol = "💤";
  }

  execute(context) {
    this.checkForEnemy(context);
    //execute
    if(context.target != context.home){ console.error("At home but target is not home."); }

    let newTargetQuery;
    if (!context.consumeResources(Resource.types.food.key)) { // Each food, if cannot...
      // try to find resource node with food
      newTargetQuery = context.findResourceNode(context.searchRadius*2, Resource.types.food.key);
      if (newTargetQuery) { // If food found, gather
        context.setNewTarget(newTargetQuery);
        context.targetResourceTypeKey = Resource.types.food.key;
        context.changeBehaviourState(new Gathering_State()); 
        return;
      }
      else{ // Cannot consume resources, and cannot find resource node
        // try to find storage node to take from
        newTargetQuery = context.findStorageNode_NotEmptyInRange(context.searchRadius*2, Resource.types.food.key);
        if(newTargetQuery){
          console.log(context.id+" is at home hungry, going to gather food.");
          context.exitNode();
          context.setNewTarget(newTargetQuery);
          context.targetResourceTypeKey = Resource.types.food.key;
          context.changeBehaviourState(new Gathering_State()); 
          return;
        }
        else{
          console.log(context.id+" ran out of resources and died home.");
          context.die();
          return;
        }    
      }

    }
    else{
      // Is at home, has enough food to eat. Effectivdely Idle, look for work.
      context.exitNode();
      context.changeBehaviourState(new Idle_State());
      return;

    }
  }
}

//#region Combat State
class Combat_State extends State {
  constructor(){
    super(); this.textSymbol = "⚔";
  }
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
      //console.log(`${agent.id} is chasing ${agent.target.id}.`);
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
    generic_Agent : {
    key:"generic_Agent",
    name: "Generic Agent",
    description: "A general-purpose agent. Cost: 100",
    colour:"black",
    cost : 100
    },
    raider_Agent  : {
    key:"raider_Agent", 
    name: "Raider",
    description: "An aggressive agent.",
    colour:"red",
    cost : 0
    }
  }

  constructor(x, y, type = Agent.types.generic_Agent) {
    this.id = "Agent" + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.colour = type.colour;
    this.behaviourState = new Idle_State(); // Possible behaviourStates: idle, gathering, depositing
    this.target = null; // Current target (node or position)
    this.previousUnitTarget = this.target;  //Stores the previous valid target (non position)
    this.carrying = 0; // Resources being carried
    this.resourceInventory = [];
    this.maxCarry = 5; // Max resources agent can carry
    this.speed = 2; // Movement speed
    this.home = null;
    this.type = type;
    this.resourceHunger = 0.01;  // Amount of resources consumed per iteration
    this.searchRadius = GRID_SIZE * 7

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
    const agentScreenSize = (GRID_SIZE / 5) * camera.scale;
    drawRect(
      screenX,
      screenY,
      agentScreenSize,
      agentScreenSize,
      this.colour,
      undefined
    );
    drawText(this.behaviourState.textSymbol, screenX+(agentScreenSize/2), screenY-agentScreenSize, undefined,undefined,undefined,'center');
  }
  
/**
 * Find the closest resource node within range and set it as the target.
 * If no resourceTypeKey is given, a node with any resource will be found.
 * @param {number} range - The maximum range to search for resource nodes.
 * @param {string} resourceTypeKey - The key of the desired resource type.
 * @returns {Node|null} - The closest resource node or null if none is found.
 */
findResourceNode(range = Infinity, resourceTypeKey = undefined, resourceToExcludeKey = undefined) {
  let closestResourceNode = null;
  let shortestDistance = range;
  console.log(this.id, "Looking for", resourceTypeKey);

  gameState.nodes.forEach((b) => {
    const isEmpty = b.getResourceInInventory(resourceTypeKey).amount <= 0;
    if (b.type.key === Node.types.resource_Node.key && !isEmpty) {
      let soughtResource;
      
      if (resourceTypeKey) {
        soughtResource = b.resourceInventory.find(resource => ( (resource.type.key === resourceTypeKey) && ( !resourceToExcludeKey || resource.type.key !== resourceToExcludeKey) ) );
      }
      else{
        soughtResource = b.resourceInventory.find(resource => (resource.amount > 0 && ( resource.type.key != resourceToExcludeKey) ) );
      }
      
      if (soughtResource) {
        console.log(this.id, "Found", soughtResource);
        const distance = calculateDistance(this, b);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestResourceNode = b;
        }
      }
    }
  });

  return closestResourceNode;
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

  addResourceToInventory(resourceTypeKey, amount) {

    // Take the resource from the target's resource storage
    let targetNodeResource = this.target.resourceInventory.find(resource => resource.type.key === resourceTypeKey);
    if (resourceTypeKey && targetNodeResource && targetNodeResource.amount > 0) {
      targetNodeResource.amount -= amount;
    } 
    else {
      // Find any available resource in the target's resource storage
      targetNodeResource = this.target.resourceInventory.find(resource => resource.amount > 0);
      targetNodeResource.amount -= amount;
    }

    // Add the resource to the inventory
    let resource = this.resourceInventory.find(r => r.type.key === resourceTypeKey);
    if (resource) {
      resource.amount += amount;
    } else {
      const newResource = new Resource(resourceTypeKey, amount);
      this.resourceInventory.push(newResource);
    }
  }

  /**
   * Gather resources and return a boolean indicating if the gathering was successful.
   * 
   * @param {string} [resourceTypeKey=Resource.types.rawMaterials.key] - The key of the resource type to gather.
   * @returns {boolean} - True if resources were successfully gathered, false otherwise.
   */
  gatherResources(resourceTypeKey) {
    /* Gather resources and return bool if successful */
    // NEEDS UPDATING SO THAT RESOURCE AMOUNT IS UPDATED. NOT PUSHED

    if (this.getResourceInInventory(resourceTypeKey).amount >= this.maxCarry || this.target.getResourceInInventory(resourceTypeKey).amount <= 0) { // If there is NO space to carry or target is empty
      return false;
    } 
    else {
      let targetNodeResource = null;

      if (resourceTypeKey) {
        // Find the specified resource type in the target's resource storage
        targetNodeResource = this.target.resourceInventory.find(resource => resource.type.key === resourceTypeKey);
      } 
      else {
        // Find any available resource in the target's resource storage
        targetNodeResource = this.target.resourceInventory.find(resource => resource.amount > 0);
      }

      if (targetNodeResource && targetNodeResource.amount > 0) {
        this.carrying++;

        this.addResourceToInventory(targetNodeResource.type.key, 1);

        //resourceToGather.amount--;
        //Subtract from target inventory
        console.log(this.id, " gathered   ", 1, targetNodeResource.type.key, "from", this.target.id);
        //console.log(this.resourceInventory);
        return true;
      } 
      else {
        console.log(this.id, " could not gather", resourceTypeKey, "from", this.target.id);
        return false;
      }
    }
  }

  findStorageNode_LowestInRange(range = this.searchRadius) {
    /* Find the closes storage node with the (lowest capacity OR shortest distance) */
    let foundStorageNode = null;
    let shortestDistance = range;
    let lowestCapacity = Infinity;

    gameState.nodes.forEach( (b) => {
      const distance = calculateDistance(this, b);
      const isFull = b.getResourceInInventory(this.targetResourceTypeKey).amount >= b.maxCapacity;
      if (b.type.key === Node.types.storage_Node.key && distance < this.searchRadius && !isFull) {
        // Found storage node within search radius
        if (b.getResourceInInventory(this.targetResourceTypeKey).amount < lowestCapacity && distance < range) { //if node is within searchradius AND has lower capacity
          lowestCapacity = b.getResourceInInventory(this.targetResourceTypeKey).amount;
          foundStorageNode = b;

          /*if (distance < shortestDistance){ // if node is within shortest distance
            shortestDistance = distance;
          }*/
        }
      }
    });
    if(!foundStorageNode){console.log(this.id,"Canot find empty storage node");}
    return foundStorageNode;
  }

  findStorageNode_NotEmptyInRange(range = this.searchRadius, resourceTypeKey = Resource.types.rawMaterials.key) {
    /* Find the closes storage node with the (lowest capacity OR shortest distance) */
    let foundStorageNode = null;

    gameState.nodes.forEach( (b) => {
      const distance = calculateDistance(this, b);
      const soughtResource = b.resourceInventory.find(resource => resource.type.key === resourceTypeKey);
      if (b.type.key === Node.types.storage_Node.key && soughtResource && soughtResource.amount > 0 && distance < this.searchRadius){
        // Found empty storage node within search radius
        foundStorageNode = b;
      }
    });
    
    if(!foundStorageNode){console.log("Canot find storage node");}
    return foundStorageNode;
  }

  findHome(range) {
    /*
    Find the closest Node of type Home and set target.
    Find the closest home that has capacity and go there.

    Output: foundHome
    */
    let foundHome = null; // If no home is found, return null
    let shortestDistance = range;

    // Iterate over all nodes to find the closest eligible home
    gameState.nodes.forEach((b) => {
      if (b.type.key === Node.types.home.key && b.agentCapacity.length < b.maxAgentCapacity) {
        const pos1 =  {x:this.x, y:this.y};
        const pos2 =  {x:b.x, y:b.y};
        const distance = calculateDistance(pos1, pos2);
        if (distance < shortestDistance) {
            shortestDistance = distance;
            foundHome = b;
        }
      }
    });

    return foundHome;
  }
  
  depositResources(resourceTypeKey = undefined) {
    // if has resources to deposit and storage is not going to overflow
    const totalResourceAmount = this.target.getResourceInInventory(resourceTypeKey).amount;
    const wouldOverflow = (totalResourceAmount > this.target.maxCapacity);
  
    if (!wouldOverflow) {
      if (resourceTypeKey) {
        // Deposit only the specified resource type
        let resourceType = Resource.types[resourceTypeKey];
        let resource = this.resourceInventory.find(r => r.type === resourceType);
        if (resource) {
          let targetResource = this.target.resourceInventory.find(r => r.type === resource.type);
          if (targetResource) {
            targetResource.amount += resource.amount;
          } 
          else {
            targetResource = new Resource(resource.type.key, resource.amount);
            this.target.resourceInventory.push(targetResource);
          }
          this.resourceInventory = this.resourceInventory.filter(r => r.type !== resourceType);
        }
      } 
      else {
        // Deposit all resources
        this.resourceInventory.forEach(resource => {
          let targetResource = this.target.resourceInventory.find(r => r.type === resource.type);
          if (targetResource) {
            targetResource.amount += resource.amount;
          } 
          else {
            targetResource = new Resource(resource.type.key, resource.amount);
            this.target.resourceInventory.push(targetResource);
          }
          console.log(this.id, " deposited  ", resource.amount, targetResource.type.key, "to  ", this.target.id);
        });
        this.resourceInventory = [];
      }
  
      this.carrying = 0;
      return true;
    } else {
      //console.log("Cannot deposit resources ", this.target.getResourceInInventory(Resource.types.food.key).amount, "/", this.target.maxCapacity, this.getResourceInInventory(Resource.types.food.key).amount);
      return false;
    }
  }
  

  changeBehaviourState(newState){
    if (this.behaviourState) {
      this.behaviourState.exit(this); // Exit the current state
    }
    this.behaviourState = newState;
    this.behaviourState.enter(this); // Enter the new state
  }

  getResourceInInventory(resourceTypeKey) {
    //return this.resourceInventory.reduce((total, resource) => total + resource.amount, 0);
    //console.log("GETTING RESOURCE "+resourceTypeKey, this.resourceInventory);
    //console.log(this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? "ok" : this.resourceInventory[0]);
    return this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) : new Resource(resourceTypeKey, 0);
  }

  /**
   * Consumes resources of a specific type from the agent's inventory.
   * @param {string} resourceTypeKey - The key of the resource type to consume.
   * @returns {boolean} - Returns true if the agent has enough resources to consume, false otherwise.
   */
  consumeResources(resourceTypeKey) {
    //define Agents inventory resource to consume
    let agentInvResource = this.getResourceInInventory(resourceTypeKey);// ? this.getResourceInInventory(resourceTypeKey) : this.resourceInventory[0];
    //console.log(this.resourceInventory, agentInvResource);
    
    if (!agentInvResource) {
      //console.log(this.resourceInventory, agentInvResource);
      agentInvResource = { type: Resource.types.food, amount: 0 };
    }

    if (agentInvResource.amount >= this.resourceHunger){
      agentInvResource.amount -= this.resourceHunger;
      //console.log(this.id, " consumed ", this.resourceHunger, resourceTypeKey);
      return true;
    }
    else {  //Agent need to ead and cannot
      console.log(this.id + " has no " + resourceTypeKey + " to consume.", this.resourceInventory);
      return false;
      //this.die();
      //console.log(this.id+" has died due to lack of resources.");
    }
  }

  isHungry(){
    return this.getResourceInInventory(Resource.types.food.key) <= this.resourceHunger;
  }

  die(){
    console.log(`${this.id} has died.`);
    gameState.agents = gameState.agents.filter((agent) => agent !== this);
    
    //if is at home then remove from home capacity
    if (this.behaviourState.constructor.name  == AtHome_State.constructor.name && this.home.agentCapacity.length > 0){
      this.home = this.home.agentCapacity.filter((agent) => agent !== this);
    }

    delete this;
  }

  findEnemy(range = Infinity) {
    /*
    Finds an enemy and sets it as a target
    */
    let closestEnemy = null;
    let shortestDistance = range;

    gameState.agents.forEach((agent) => {
      if (agent.type.key !== this.type.key && agent.health > 0) { // Find enemies with health > 0
        const distance = calculateDistance(this, agent);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestEnemy = agent;
        }
      }
    });

    //this.setNewTarget(closestEnemy);
    return closestEnemy;
  }


  attackTarget() {
    const now = gameState.gameTick;
    if (now - this.lastAttackTime >= this.attackCooldown * 60) {
      if (this.target && this.target.health > 0) {
        console.log(`${this.id} attacks ${this.target.id} for ${this.attackPower} damage.`);
        this.target.health -= this.attackPower;

        if (this.target.health <= 0) {
          console.log(`${this.target.id} has been defeated.`);
          this.target.die();
          this.setNewTarget(null); // Reset target after defeat
          this.changeBehaviourState(new GoingHome_State());
        }

        this.lastAttackTime = now;
      } 
      else {
        console.log(`${this.id} has no valid target to attack.`);
        this.changeBehaviourState(new GoingHome_State());
      }
    }
  }

  setNewTarget(newTarget){
    /*
    Set a new target for the Agent.
    If the previoustarget is a unit with a valid ID then set previous target
    */
    if (this.target){
      this.previousUnitTarget = this.target.id ? this.target : this.previousUnitTarget;
    }
    this.target = newTarget;
  }

  setRandomRoamPosition(){
    let focus;
    const roamingRange = this.searchRadius;//*1.5;  // Sets a roaming range 1 and a half times default range
    if (this.target && this.target.id) {   // If target has ID (not random position)
      //console.log("TARGET HAS ID");
      focus = this.target;  // Set focus for random position range
    }
    else if( this.previousUnitTarget){  // Target doesnt have ID
      focus = this.previousUnitTarget;
    }
    else{
      console.log("no target or id or prev");
      focus = this;
    }

    this.setNewTarget( getRandomPositionInRange(focus, roamingRange) );  // sets a random position within the range of the object
  }

  enterTargetNode(){
    if (this.target.agentCapacity.length == 0){
      this.target.agentTypeAllianceKey = this.type.key; // If node it empty, Update Node Agent Alliance.
    }
    this.target.agentCapacity.push(this);
    console.log(this.id," is entering node ", this.home.id);
  }

  exitNode(){
    this.home.agentCapacity = this.home.agentCapacity.filter((agent) => agent !== this);
    if (this.target.agentCapacity.length == 0){
      this.target.agentTypeAllianceKey = null; // If node it empty, Update Node Agent Alliance to null.
    }
    console.log(this.id," is leaving node ", this.home.id);
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
  new Quest("Build a Storage Node.",   () => (gameState.nodes.filter(b => b.type.key === Node.types.storage_Node.key).length >= 1) ),
  new Quest("Build a Home.",           () => gameState.nodes.some(b => b.type.key === Node.types.home.key)),
  new Quest("Collect 50 resources.",   () => gameState.totalStoredResources >= 50),
  //new Quest("Upgrade Home",         () => gameState.nodes.some(b => b.type.key === Node.types.home.key)),
  //new Quest("Build a Resource Node.",  () => (gameState.nodes.filter(b => b.type.key === Node.types.resource_Node.key).length >= 2) ),
  //new Quest("Build 10 Storage Nodes.",   () => (gameState.nodes.filter(b => b.type.key === Node.types.storage_Node.key).length >= 10) ),
  //new Quest("Collect 1000 resources.", () => gameState.totalStoredResources >= 1000),
  new Quest("Build Barracks", () => gameState.nodes.some(b => b.type.key === Node.types.barracks_Node.key)),
  new Quest("Train Defences", () => gameState.totalStoredResources >= 10000),
  new Quest("Scout Another Base", () => gameState.totalStoredResources >= 10000),
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
  questContainer.innerHTML = "<b>Quests:</b>";

  questLog.forEach((quest, index) => {
      // Create a div for each quest
      const questDiv = document.createElement("div");
      questDiv.style.fontStyle = "italic";
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

function addNode(x, y, typeKey, emit = true, initObj) {
  const newNode = new Node(x, y, typeKey);

  // If initObj is given, initialise the new node with the given attributes
  if (initObj){
    console.log("INitialising : ",initObj);
    for (let key in initObj) {
      //console.log(attribute.key, attribute.value);
      newNode[key] = initObj[key];   // Set initial attributes
    }
  }
  else{
    console.log("NEW NODE INVENTORY",newNode.resourceInventory);
  }

  gameState.nodes.push(newNode);
  gameState.spawnedUnitsCount += 1;
  if (emit){ socket.emit("update-building", newNode); }
  logMessage(`Spawned a new ${typeKey} Node at ${x}, ${y}.`);
  return newNode;
}

function addAgent(x, y, typeKey  = Agent.types.generic_Agent.key) {
  const newAgent = new Agent(x, y, Agent.types[typeKey]);
  //newAgent.type = ;  // if type is given set type if not then leave default
  gameState.agents.push(newAgent);
  gameState.spawnedUnitsCount += 1;
  return newAgent;
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

/**
 * Calculates and updates the total stored resources in the game state.
 * If agentTypeKey is provided, it only considers storage nodes with the specified agent type alliance key.
 * If agentTypeKey is not provided, it considers all storage nodes.
 * @param {string|null} agentTypeKey - The agent type alliance key to filter storage nodes (optional).
 * @returns {number} - The calculated total stored resources.
 */
function calculateAndUpdateStoredResources(agentTypeKey = null){
  let storedResources = 0; // Initialize the totalRes variable to 0
  gameState.nodes.forEach(node => {
    if (!agentTypeKey && node.type.key == Node.types.storage_Node.key){ // If agentTypeKey is not provided and the node is a storage node
      storedResources += node.getResourceInInventory(Resource.types.food.key).amount;
    }
    else if ( agentTypeKey && node.type.key == Node.types.storage_Node.key && node.agentTypeAllianceKey == agentTypeKey) { // If agentTypeKey is provided and the node is a storage node with the specified agent type alliance key
      storedResources += node.getResourceInInventory(Resource.types.food.key).amount; 
    }
  });
  gameState.totalStoredResources = storedResources;
  return storedResources;
}

function subtractFromStoredResources(resCost, agentTypeKey) {
  if (calculateAndUpdateStoredResources() < resCost) { console.log("/!\\YOU CANT BUY THAT/!\\ It costs "+resCost+" and you have "+gameState.totalStoredResources); return;}

  gameState.nodes.forEach(node => {
    const resourceToSubtract = node.getResourceInInventory(Resource.types.rawMaterials.key);
    if (node.type.key == Node.types.storage_Node.key && resourceToSubtract && resCost > 0) { // Is storage node and can still subtract
      let availableCapacity = resourceToSubtract.amount;
      if (availableCapacity >= resCost) {  // If can subtract all from node, subtract and set amount to zero.
        resourceToSubtract.amount  -= resCost;
        resCost = 0;
        console.log("Subtracted ", resCost, " from ", node.resourceInventory);
      } else {  // If node capacity is less than rsource cost, subtract capacity form resource cost and set node to zero;
        resCost -= availableCapacity;
      }

    }
  });

  // check if all resources were subtracted
  return resCost <= 0;
}


function calculateTotalLiveAgents(){
  return gameState.agents.length;
}

//#region BUILD MENU
const buildTypes  = Node.types;
buildTypes.generic_Agent = Agent.types.generic_Agent;
buildTypes.raider_Agent = Agent.types.raider_Agent;

function selectType(typeKey, initObj) {
  if (buildTypes[typeKey]) {
    gameState.selectedType = buildTypes[typeKey];
    gameState.selectedType.initObj = initObj;
    //gameState.selectedType.initObj = bui
    console.log(`Selected type: ${buildTypes[typeKey].key}`);
  }
  else{
    gameState.selectedType = null;
    //console.error(`Invalid type selected: ${type}`);
    console.log(`Invalid node type selected: ${typeKey}`);
    return;
  }
}

// Display details of selected object
function displayDetails(buildTypeKey) {
  // get build type from list
  buildType = buildTypes[buildTypeKey];
  const details = document.getElementById("selectedBuildItemInfo");
  if(!buildType){ details.innerHTML=""; return; }  // buildType = {name:"Inspection Mode", description:"Click on a unit to view its information."
  if(details){
    details.innerHTML = `<p style="margin:0;"><b>${buildType.name}</b><br><i>${buildType.description}</i></p>`;
  }
  
}

function togglePanel() {
  const panel = document.getElementById('gridPanel');
  panel.classList.toggle('hidden');
}

document.querySelectorAll('.grid-item').forEach(item => {
  item.addEventListener('click', () => {
      document.querySelectorAll('.grid-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      // Find node type by name
      displayDetails(item.dataset.value);
      console.log(item.dataset.initobj);
      let initObj = item.dataset.initobj ? JSON.parse(item.dataset.initobj) : undefined;
      selectType(item.dataset.value, initObj ? initObj : undefined  );
  });
});

//#endregion





//#region   Event Listeners
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

// Prevent right-click context menu
document.addEventListener('contextmenu', function(event) {
  event.preventDefault();
});

// Prevent text selection
document.addEventListener('selectstart', function(event) {
  event.preventDefault();
});

// Prevent text dragging
document.addEventListener('dragstart', function(event) {
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
      //alert("/!\\ Cannot place node: Cell is already occupied. /!\\");
      return;
    }

    // Subtract resources if can
    if(!subtractFromStoredResources(gameState.selectedType.cost)){
      console.log("cannot build unit");
      return;
    }

    let buildTypeIsAgent = Object.values(Agent.types).includes(gameState.selectedType);
    if(buildTypeIsAgent){
      addAgent(snappedX, snappedY, gameState.selectedType.key);
    }
    else{
      //console.log(JSON.parse(gameState.selectedType.initObj));
      addNode(snappedX, snappedY, gameState.selectedType.key, undefined, gameState.selectedType.initObj );
    }
    console.log(`Placed ${gameState.selectedType} at (${snappedX}, ${snappedY})`);
  }
  else{
    // Selecting a unit?
  }
  
});

//#endregion

function drawCivStatusBarUI(){
  calculateAndUpdateStoredResources(Node.types.generic_Agent.key);  // Update total stored resources
  const totalLiveAgents = calculateTotalLiveAgents(); //Calulate total live agents
  let totalCivResourceArray = [];
  // Calculate total amount of each resource
  let civStatusUIText = ""; // Initialize the text to be displayed on the UI
  gameState.nodes.forEach(node => {
    node.resourceInventory.forEach(resource => {
      //For each resource of each node
      // Check if the resource is already in the array
      let existingResource = totalCivResourceArray.find(r => r.type.key === resource.type.key);
      if(existingResource){
        // If the resource is already in the array, add the amount to the existing resource
        existingResource.amount += resource.amount;
      } 
      else {  // If the resource is not in the array, add it to the array
        totalCivResourceArray.push({type: resource.type, amount: resource.amount});
      }
    });
  });

  totalCivResourceArray.forEach(resource => {
    // Display the total amount of each resource on the UI
    civStatusUIText += `${resource.type.key}: ${resource.amount }  `;
  });
  civStatusUIText += `☥ ${totalLiveAgents}`;  // Display total live agents

  //totalCivResourceArray = totalNodeResourceArray.reduce((total, resource) => total + resource.amount, 0); //to calculate total overall of each resource.
  //civStatusUIText += JSON.stringify(totalCivResourceArray);  // Display total resources of each type
  //console.log(totalNodeResourceArray);
  drawText(`${civStatusUIText}`, 10, 30, 20);
  //drawText(`🜨 ${Math.round(gameState.totalStoredResources)}`, 10, 30, 20);
  const tmpTotalFood = totalCivResourceArray.find(r => r.type.key === Resource.types.food.key);
  const totalFood =  tmpTotalFood ? tmpTotalFood.amount : 0;
  const civRequirementsText = totalFood - (totalLiveAgents * 50);
  drawText(`Surplus Food: ${civRequirementsText}`, 10, 60, 20);
}


//#region  Game Loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Fill the entire canvas with colour
  ctx.fillStyle = "rgb(51, 51, 51)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
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
  checkQuests();

  updateUnitInfo(gameState.selectedUnit);

  //console.log("Selected Node Type: "+gameState.selectedType);

  gameState.gameTick += 1;
  requestAnimationFrame(gameLoop);
}


//#region   Start Game
logMessage("Game Started");

//Build nodes from gameState.networkState.map
//initializeGameObjects(); CALLED SOMEHWRERE ELSE


updateUnitInfo();


gameLoop();
