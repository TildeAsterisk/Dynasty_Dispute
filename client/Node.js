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
      symbol: "📦"
    },
    home:
    {
      key: "home",
      name: "Home",
      description: "A central hub for agents. Cost: 50",
      colour: "grey",
      cost: 50,
      symbol: "🏠"
    },
    resource_Node:
    {
      key: "resource_Node",
      name: "Resource Node",
      colour: "green",
      description: "Contains resources to be extracted.  Cost: 100",
      cost: 100,
      symbol: "🏭"
    },
    barracks_Node:
    {
      key: "barracks_Node",
      name: "Barracks Node",
      colour: "orange",
      description: "Houses and trains Agents for defence.  Cost: 1000",
      cost: 1000,
      symbol: "🏰"

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
      console.log("New Agent Spawned!!!"); //newborn
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
    const screenX = (this.x - camera.x) * camera.scale;
    const screenY = (this.y - camera.y) * camera.scale;
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
    }
    else {
      if (this.resourceInventory[0].amount < this.maxCapacity && this.resourceInventory[0].amount > 0 ) {
        this.resourceInventory[0].amount += 0.05;
      }
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
  if (calculateAndUpdateStoredResources() < resCost) { console.log("/!\\YOU CANT BUY THAT/!\\ It costs " + resCost + " and you have " + gameState.totalStoredResources); return; }

  gameState.nodes.forEach(node => {
    const resourceToSubtract = node.getResourceInInventory(Resource.types.rawMaterials.key);
    if (node.type.key == Node.types.storage_Node.key && resourceToSubtract && resCost > 0) { // Is storage node and can still subtract
      let availableCapacity = resourceToSubtract.amount;
      if (availableCapacity >= resCost) {  // If can subtract all from node, subtract and set amount to zero.
        resourceToSubtract.amount -= resCost;
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

function addNode(x, y, typeKey, emit = true, initObj) {
  const newNode = new Node(x, y, typeKey);

  // If initObj is given, initialise the new node with the given attributes
  if (initObj) {
    console.log("INitialising : ", initObj);
    for (let key in initObj) {
      //console.log(attribute.key, attribute.value);
      newNode[key] = initObj[key];   // Set initial attributes
    }
  }
  else {
    console.log("NEW NODE INVENTORY", newNode.resourceInventory);
  }

  gameState.nodes.push(newNode);
  gameState.spawnedUnitsCount += 1;
  if (emit) { socket.emit("update-building", newNode); }
  logMessage(`Spawned a new ${typeKey} Node at ${x}, ${y}.`);
  console.log(newNode);
  return newNode;
}