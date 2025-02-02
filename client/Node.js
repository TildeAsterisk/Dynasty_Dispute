//#region  Node Class
class Node {
  static types = {
    storage_Node:
    {
      key: "storage_Node",
      name: "Storage Node",
      colour: "brown",
      description: "A repository for resources. Cost: 50",
      cost: 50,
      symbol: "📦",
      imgSrc: "Graphics/buildings-rooms/storage_node2.png",
      loadedImg: null
    },
    home:
    {
      key: "home",
      name: "Home",
      description: "A central hub for agents. Cost: 50",
      colour: "grey",
      cost: 50,
      symbol: "🏠",
      imgSrc: "Graphics/buildings-rooms/home3.png",
      loadedImg: null
    },
    resource_Node:
    {
      key: "resource_Node",
      name: "Resource Node",
      colour: "green",
      description: "Contains resources to be extracted.  Cost: 100",
      cost: 100,
      symbol: "🏭",
      imgSrc: "Graphics/buildings-rooms/resource_node1.png",
      loadedImg: null
    },
    barracks_Node:
    {
      key: "barracks_Node",
      name: "Barracks Node",
      colour: "orange",
      description: "Houses and trains Agents for defence.  Cost: 1000",
      cost: 50,
      symbol: "🏰",
      imgSrc: "Graphics/buildings-rooms/barracks_node.png",
      loadedImg: null

    },
    path_Node: {
      key: "path_Node",
      name: "Path Node",
      colour: "rgb(200, 200, 200)",
      description: "A path for agents to travel on. Cost: 10",
      cost: 10,
      symbol: "🛤️",
      imgSrc: "Graphics/paths/path_node.png",
      loadedImg: null
    }
  }

  constructor(x, y, typeKey) {
    this.id = typeKey + gameState.spawnedUnitsCount;
    this.x = x;
    this.y = y;
    this.type = Node.types[typeKey]; // If type object is given, inherit initial  from type object dict.
    this.colour = this.type.colour;

    this.maxCapacity = 100; // max capacity for each resource in the inventory
    this.resourceInventory = (Node.types.resource_Node.key === typeKey) ? [new Resource(Resource.types.rawMaterials.key, this.maxCapacity)] : []; //If resource node give default inventory

    this.agentCapacity = [];
    this.maxAgentCapacity = 2;

    this.agentTypeAllianceKey = 0;

    this.regenCooldown = 120; // number of gameTicks between regen (24-60 per second) (20 is good and short)
    this.lastRegenTime = 0; // Time of the regen

    this.neighbors = [];

    this.pathfindingScore = typeKey == Node.types.path_Node.key ? 1 : defaultPathfindingCost;

  }

  update() {
    // Random chance to spawn agent
    // check if number of homes is enough for new agent
    let numHomes = (gameState.nodes.filter(b => b.type.key === Node.types.home.key).length);
    let numAgents = calculateTotalLiveAgents();
    const enoughHomes = (numAgents < (numHomes * 2) + 1);
    if (this.agentCapacity.length >= 2 && Math.floor(Math.random() * gameState.agentBirthChance) == 1 && enoughHomes) {
      //Random change to give birth to a new agent
      addAgent(this.x + (GRID_SIZE / 2), this.y + (GRID_SIZE / 2), this.agentCapacity[0].type.key);
      client_LogMessage("New Agent Spawned!!!"); //newborn
    }



    switch (this.type.key) {
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
    // Draw node so its origin is in centre
    const screenX = ((this.x - camera.x) * camera.scale);// - GRID_SIZE / 2;
    const screenY = ((this.y - camera.y) * camera.scale);// - GRID_SIZE / 2;
    
    //Determine nodeImg to draw
    let loadedUnitImg = Node.types[this.type.key].loadedImg;
    if (this.type.key == Node.types.path_Node.key) {
      // Get load unit img based on connections
      //client_LogMessage(this,this.neighbors);
      //find neighbor that id contains path_Node
      const connectedNodes = this.neighbors.filter(neighbor => neighbor.id);
      /*if ((Array.isArray(this.neighbors) &&
        this.neighbors[0] && this.neighbors[0].id &&
        this.neighbors[1] && this.neighbors[1].id &&
        this.neighbors[3] && this.neighbors[3].id) || connectedNodes.length == 3) {  // If connected to North East and West
        loadedUnitImg = new Image();
        loadedUnitImg.src = "Graphics/paths/path_Node-N_E_W.png";
      }
      else */if (connectedNodes.length == 2 && this.neighbors[1] && this.neighbors[1].id &&
        this.neighbors[3] && this.neighbors[3].id) {  // If connected to East and West
        loadedUnitImg = new Image();
        loadedUnitImg.src = "Graphics/paths/path_Node-E_W1.png";
      }
      /*else if(connectedNodes.length == 2 && this.neighbors[0] && this.neighbors[0].id && this.neighbors[1] && this.neighbors[1].id) {  // If connected to North and East
        loadedUnitImg = new Image();
        loadedUnitImg.src = "Graphics/paths/path_Node-N_E.png";
      }*/
      else if (connectedNodes.length == 2 && this.neighbors[0] && this.neighbors[0].id && this.neighbors[2] && this.neighbors[2].id) {  // If connected to North and South
        loadedUnitImg = new Image();
        loadedUnitImg.src = "Graphics/paths/path_Node-N_S1.png";
        //Rotate 90 degrees
      }
      else {
        loadedUnitImg = new Image();
        loadedUnitImg.src = "Graphics/paths/path_Node-All1.png";
      }


      /*switch (connectedNodes.length) {
        case 1:
        case 2:
          // Straight path
          loadedUnitImg = new Image();
          loadedUnitImg.src = "Graphics/paths/path_Node-E_W.png";
          break;
        case 3:
          // T junction
          loadedUnitImg = new Image();
          loadedUnitImg.src = "Graphics/paths/path_Node-N_E_W.png";
          break;
        default:
          client_LogMessage("4 way junction",connectedNodes.length);
          // 4 way junction
          loadedUnitImg = new Image();
          loadedUnitImg.src = "Graphics/paths/path_Node-All.png";
          break;
      }*/
    }

    // Try to draw sprite, if not draw rectangle
    if (loadedUnitImg && loadedUnitImg.src && loadedUnitImg.width > 0) {
      drawSprite(screenX, screenY, GRID_SIZE * camera.scale, GRID_SIZE * camera.scale, loadedUnitImg);
    }
    else {
      //calculate percentage of fill
    let totalResInvFillPct = 0;
    this.resourceInventory.forEach(invResource => {
      const rFillPct = (invResource.amount / this.maxCapacity);
      totalResInvFillPct = totalResInvFillPct + rFillPct;
    }); //calculate fill percentage for each resource and add them up
    totalResInvFillPct = totalResInvFillPct / (this.resourceInventory.length > 0 ? this.resourceInventory.length : 1); // Divide by the number of resources to caluclate Average fill percentage
      drawRect(
        screenX,
        screenY,
        GRID_SIZE * camera.scale,
        GRID_SIZE * camera.scale,
        this.type.colour,
        totalResInvFillPct * 100  // Fill percentage
      );
    }
    /**/
    /*drawText(
      this.type.key,
      screenX + 5,
      screenY + GRID_SIZE * camera.scale / 2
    );*/
  }

  checkCooldownRegen() {
    const now = gameState.gameTick;
    const regenPerTick = 0.05;
    if (now - this.lastRegenTime >= this.regenCooldown * 60) { // Check if regen cooldown finished
      // Regenerate resources
      this.resourceInventory.forEach(resource => {
        resource.amount = this.maxCapacity;
      });
      this.lastRegenTime = now;
      return true;
    }
    else {
      if ((this.resourceInventory[0].amount + regenPerTick) <= this.maxCapacity && this.resourceInventory[0].amount > 0) {
        this.resourceInventory[0].amount += regenPerTick;
      }
      return false;
    }
  }

  getResourceInInventory(resourceTypeKey) {
    //return this.resourceInventory.reduce((total, resource) => total + resource.amount, 0);
    //client_LogMessage("GETTING RESOURCE "+resourceTypeKey, this.resourceInventory);
    //client_LogMessage(this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? "ok" : this.resourceInventory[0]);
    return this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) : new Resource(resourceTypeKey, 0);
  }

}

function addNode(x, y, typeKey, emit = true, initObj) {
  const newNode = new Node(x, y, typeKey);

  // If initObj is given, initialise the new node with the given attributes
  if (initObj) {
    client_LogMessage("INitialising : ", initObj);
    for (let key in initObj) {
      //client_LogMessage(attribute.key, attribute.value);
      newNode[key] = initObj[key];   // Set initial attributes
    }
  }
  else {
    client_LogMessage("NEW NODE INVENTORY", newNode.resourceInventory);
  }

  gameState.nodes.push(newNode);
  gameState.spawnedUnitsCount += 1;
  
  if (emit) { socket.emit("update-node-c-s", newNode); }  // Flow #10 a - A client adds a node (emit=true)
  client_LogMessage(`Spawned a new ${typeKey} Node at ${x}, ${y}.`);
  client_LogMessage(newNode);

  //Update neighbors
  newNode.neighbors = getNeighbors(newNode, gameState.nodes);
  gameState.nodes.forEach(node => {
    node.neighbors = getNeighbors(node, gameState.nodes);
  });

  return newNode;
}


/**
 * Calculates and updates the total stored resources in the game state.
 * If agentTypeKey is provided, it only considers storage nodes with the specified agent type alliance key.
 * If agentTypeKey is not provided, it considers all storage nodes.
 * @param {string|null} agentTypeKey - The agent type alliance key to filter storage nodes (optional).
 * @returns {number} - The calculated total stored resources.
 */
// Function to calculate and update the total stored resources
function calculateAndUpdateStoredResources(agentTypeKey = null) {
  // Initialize stored resources counter
  let storedResources = 0;

  // Iterate over each node in the game state
  gameState.nodes.forEach(node => {
    // Check if no specific agent type key is provided and the node is a storage node
    if (!agentTypeKey && node.type.key == Node.types.storage_Node.key) {
      // Add the total resource amount of the node to the stored resources counter
      storedResources += node.getResourceInInventory(agentTypeKey);
    }
    // Check if a specific agent type key is provided, the node is a storage node, and the node's agent type matches the provided key
    else if (agentTypeKey && node.type.key == Node.types.storage_Node.key && node.agentTypeAllianceKey == agentTypeKey) {
      // Add the total resource amount of the node to the stored resources counter
      storedResources += node.getResourceInInventory(agentTypeKey);
    }
  });

  // Update the total stored resources in the game state
  gameState.totalStoredResources = storedResources;

  // Return the total stored resources
  return storedResources;
}

function subtractFromStoredResources(resCost, agentTypeKey) {
  if (calculateAndUpdateStoredResources() < resCost) { client_LogMessage("/!\\YOU CANT BUY THAT/!\\ It costs " + resCost + " and you have " + gameState.totalStoredResources); return; }

  gameState.nodes.forEach(node => {
    const resourceToSubtract = node.getResourceInInventory(Resource.types.rawMaterials.key);
    if (node.type.key == Node.types.storage_Node.key && resourceToSubtract && resCost > 0) { // Is storage node and can still subtract
      let availableCapacity = resourceToSubtract.amount;
      if (availableCapacity >= resCost) {  // If can subtract all from node, subtract and set amount to zero.
        resourceToSubtract.amount -= resCost;
        resCost = 0;
        client_LogMessage("Subtracted ", resCost, " from ", node.resourceInventory);
      } else {  // If node capacity is less than rsource cost, subtract capacity form resource cost and set node to zero;
        resCost -= availableCapacity;
      }

    }
  });

  // check if all resources were subtracted
  return resCost <= 0;
}

// Function to check if a node exists at the given position
function isCellOccupied(x, y) {
  return gameState.nodes.some((node) => {
    return node.x === x && node.y === y;
  });
}