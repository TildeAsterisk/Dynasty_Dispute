//#region Agent Class
class Agent {
  static types = {
    generic_Agent: {
      key: "generic_Agent",
      name: "Generic Agent",
      description: "A general-purpose agent. Cost: 100",
      colour: "rgb(120,50,0)",
      cost: 100,
      symbol: "👤",
      imgSrc: "Graphics/characters/generic_Agent.png",
      loadedImg: null
    },
    raider_Agent: {
      key: "raider_Agent",
      name: "Raider",
      description: "An aggressive agent.",
      colour: "red",
      cost: 0,
      symbol: "🤺",
      imgSrc: "Graphics/characters/raider_Agent.png",
      loadedImg: null
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
    this.path = [];

    // Combat properties
    this.health = 100; // Agent's health
    this.attackPower = 10; // Damage dealt by the agent
    this.attackRange = 10; // Range of attack
    this.attackCooldown = 1; // Seconds between attacks
    this.lastAttackTime = 0; // Time of the last attack
  }

  update() {
    if (this.behaviourState) {
      this.behaviourState.execute(this);
    }

  }

  draw() {
    const screenX = (this.x - camera.x) * camera.scale;
    const screenY = (this.y - camera.y) * camera.scale;
    const agentScreenSize = (GRID_SIZE / 5) * camera.scale;
    let loadedUnitImg = null;//Agent.types[this.type.key].loadedImg;
    // Try to draw sprite, if not draw rectangle
    if (loadedUnitImg && loadedUnitImg.src && loadedUnitImg.width > 0) {
      drawSprite(screenX, screenY, agentScreenSize, agentScreenSize, loadedUnitImg);
    }
    else {
      drawRect(
        screenX,
        screenY,
        agentScreenSize,
        agentScreenSize,
        this.colour,
        undefined
      );
    }
    drawText(this.behaviourState.symbol, screenX + (agentScreenSize / 2), screenY - agentScreenSize, undefined, undefined, undefined, 'center');
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
    client_LogMessage(this.id, "Looking for", resourceTypeKey);

    gameState.nodes.forEach((b) => {
      const isEmpty = b.getResourceInInventory(resourceTypeKey).amount <= 0;
      if (b.type.key === Node.types.resource_Node.key && !isEmpty) {
        let soughtResource;

        if (resourceTypeKey) {
          soughtResource = b.resourceInventory.find(resource => ((resource.type.key === resourceTypeKey) && (!resourceToExcludeKey || resource.type.key !== resourceToExcludeKey)));
        }
        else {
          soughtResource = b.resourceInventory.find(resource => (resource.amount > 0 && (resource.type.key != resourceToExcludeKey)));
        }

        if (soughtResource) {
          client_LogMessage(this.id, "Found", soughtResource);
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

  /**
   * #### Agent moves to to target.
   * - If has path:
   *   - Move to next cell in path
   * - If no path:
   *   - Move directly to cell
   * 
   * @param {*} bsTarget - Behaviour State Target
   * @param {*} path - Path to target
   * @returns 
   */
  moveToTarget(bsTarget = this.target, path = this.path) {
    if (!bsTarget) { console.error("Theres no target to move to"); return; }
    //const bsTargetCentre = { x: bsTarget.x + GRID_SIZE / 2, y: bsTarget.y + GRID_SIZE / 2 };
    // Instead of changing target to centre, draw cells with offset

    if(path && path.length > 0){  // If agent has path
      // TO DO: Follow path....
      // move to next point in path
      // if reached point in path, move to next point in path
      // if reached end of path, set path to empty
      //client_LogMessage(this.id, " IF FOLLOWING PATH ", path[0]);
      const nextNode = path[0]; // Get the next node in the path
      bsTarget = nextNode;
      

      // Calculate distance to the next node
      const dx = nextNode.x - this.x;
      const dy = nextNode.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If not already close to the next node, move directly towards it
      if (distance >= this.speed) {
        //client_LogMessage(this.id,"moving to path node",nextNode);
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      } 
      else {
        // Move to the next node and remove it from the path
        //this.x = nextNode.x;
        //this.y = nextNode.y;
        //client_LogMessage("Next node in path is", nextNode,path);
        path.shift(); // Shift removes the first element from an array and returns it
        this.path = path; //Set Agent path to the new path
        //client_LogMessage(this.id,"arrived at",nextNode,"in",path,"next is",path[1]);
        //newpath set, move to next node in path
      }
    }
    else {  // Agent has no path
      // Calulcate distance to target
      const dx = bsTarget.x - this.x;
      const dy = bsTarget.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If not already close to target then move directly towards target
      if (distance > this.speed) {
        //client_LogMessage("Waking to target");
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
        // return false; still walking to target
      }
      /*else {
        client_LogMessage(this.id+" has reached target "+bsTarget);
        // return true; reached target
      }*/
    }
  }

  /**
   * Evaluates if agent had reached target.
   * @param {*} target - The target to reach. Defaults to Agent.target.
   * @returns 
   */
  reachedTarget(target = this.target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    return Math.abs(dx) <= this.speed && Math.abs(dy) <= this.speed;
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
        client_LogMessage(this.id, " gathered   ", 1, targetNodeResource.type.key, "from", this.target.id);
        //client_LogMessage(this.resourceInventory);
        return true;
      }
      else {
        client_LogMessage(this.id, " could not gather", resourceTypeKey, "from", this.target.id);
        return false;
      }
    }
  }

  findStorageNode_LowestInRange(range = this.searchRadius) {
    /* Find the closes storage node with the (lowest capacity OR shortest distance) */
    let foundStorageNode = null;
    let shortestDistance = range;
    let lowestCapacity = Infinity;

    gameState.nodes.forEach((b) => {
      const distance = calculateDistance(this, b);
      const isFull = (b.getResourceInInventory(this.targetResourceTypeKey).amount+this.getResourceInInventory(this.targetResourceTypeKey).amount) >= b.maxCapacity;
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
    if (!foundStorageNode) { client_LogMessage(this.id, "Canot find empty storage node"); }
    return foundStorageNode;
  }

  findStorageNode_NotEmptyInRange(range = this.searchRadius, resourceTypeKey = Resource.types.rawMaterials.key) {
    /* Find the closes storage node with the (lowest capacity OR shortest distance) */
    let foundStorageNode = null;

    gameState.nodes.forEach((b) => {
      const distance = calculateDistance(this, b);
      const soughtResource = b.resourceInventory.find(resource => resource.type.key === resourceTypeKey);
      if (b.type.key === Node.types.storage_Node.key && soughtResource && soughtResource.amount >= 0 && distance < this.searchRadius) {
        // Found empty storage node within search radius
        foundStorageNode = b;
      }
    });

    if (!foundStorageNode) { client_LogMessage(this.id,"Canot find storage node"); }
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
        const pos1 = { x: this.x, y: this.y };
        const pos2 = { x: b.x, y: b.y };
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

    resourceTypeKey = this.targetResourceTypeKey;
    if (resourceTypeKey) {
      // Deposit only the specified resource type
      let resourceInAgentInv = this.resourceInventory.find(r => r.type.key === resourceTypeKey);
      /*if (!resource){
        resource = new Resource(resourceTypeKey, 0);
        this.resourceInventory.push(resource);
      }*/

      const totalResourceAmount = this.target.getResourceInInventory(resourceTypeKey).amount;
      const wouldOverflow = ((totalResourceAmount + resourceInAgentInv.amount) >= this.target.maxCapacity);
      //check if would overflow
      if (wouldOverflow) {
        //client_LogMessage("Cannot deposit resources ", this.target.getResourceInInventory(Resource.types.food.key).amount, "/", this.target.maxCapacity, this.getResourceInInventory(Resource.types.food.key).amount);
        //this.targetResourceTypeKey = undefined;
        return false;
      }

      if (resourceInAgentInv) {
        let resourceInTargetInv = this.target.resourceInventory.find(r => r.type === resourceInAgentInv.type);
        if (resourceInTargetInv) {
          resourceInTargetInv.amount += resourceInAgentInv.amount;
          resourceInAgentInv.amount = 0;
        }
        else {
          // Add Empty resource to Agent inventory
          resourceInTargetInv = new Resource(resourceInAgentInv.type.key, resourceInAgentInv.amount);
          this.target.resourceInventory.push(resourceInTargetInv);
          // Add Empty resource to Node INventory
          resourceInAgentInv = new Resource(resourceInAgentInv.type.key, 0);
          //this.resourceInventory = this.resourceInventory.filter(r => r.type !== resourceTypeKey);
        }
        //this.resourceInventory = this.resourceInventory.filter(r => r.type !== resourceType);
      }
    }
    else {
      client_LogMessage(this, "depositing all resources");
      this.resourceInventory.forEach(resource => {
        let targetResource = this.target.resourceInventory.find(r => r.type === resource.type);
        if (targetResource) {
          targetResource.amount += resource.amount;
        }
        else {
          targetResource = new Resource(resource.type.key, resource.amount);
          this.target.resourceInventory.push(targetResource);
        }
        //client_LogMessage(this, " deposited  ", resource.amount, targetResource.type.key, "to  ", this.target.id);
      });
      this.resourceInventory = [];
    }

    this.carrying = 0;
    return true;
  }


  changeBehaviourState(newState) {
    if (this.behaviourState) {
      this.behaviourState.exit(this); // Exit the current state
    }
    this.behaviourState = newState;
    this.behaviourState.enter(this); // Enter the new state
  }

  getResourceInInventory(resourceTypeKey) {
    //return this.resourceInventory.reduce((total, resource) => total + resource.amount, 0);
    //client_LogMessage("GETTING RESOURCE "+resourceTypeKey, this.resourceInventory);
    //client_LogMessage(this.resourceInventory.find(resource => resource.type.key === resourceTypeKey) ? "ok" : this.resourceInventory[0]);
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
    //client_LogMessage(this.resourceInventory, agentInvResource);

    if (!agentInvResource) {
      //client_LogMessage(this.resourceInventory, agentInvResource);
      agentInvResource = { type: Resource.types.food, amount: 0 };
    }

    if (agentInvResource.amount >= this.resourceHunger) {
      agentInvResource.amount -= this.resourceHunger;
      //client_LogMessage(this.id, " consumed ", this.resourceHunger, resourceTypeKey);
      return true;
    }
    else {  //Agent need to ead and cannot
      //client_LogMessage(this.id + " has no " + resourceTypeKey + " to consume.", this.resourceInventory);
      return false;
      //this.die();
      //client_LogMessage(this.id+" has died due to lack of resources.");
    }
  }

  isHungry() {
    return this.getResourceInInventory(Resource.types.food.key) <= this.resourceHunger;
  }

  die() {
    client_LogMessage(`${this.id} has died.`);
    gameState.agents = gameState.agents.filter((agent) => agent !== this);

    //if is at home then remove from home capacity
    if (this.behaviourState.constructor.name == AtHome_State.constructor.name && this.home.agentCapacity.length > 0) {
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
        client_LogMessage(`${this.id} attacks ${this.target.id} for ${this.attackPower} damage.`);
        this.target.health -= this.attackPower;

        if (this.target.health <= 0) {
          client_LogMessage(`${this.target.id} has been defeated.`);
          this.target.die();
          this.setNewTarget(null); // Reset target after defeat
          this.changeBehaviourState(new GoingHome_State());
        }

        this.lastAttackTime = now;
      }
      else {
        client_LogMessage(`${this.id} has no valid target to attack.`);
        this.changeBehaviourState(new GoingHome_State());
      }
    }
  }

  /** 
   * #### Sets a new target for the agent.
   * If the current target is a unit with a valid ID then set previousUnitTarget before setting new target.
   * @param {*} newTarget - New target to set.
  */
  setNewTarget(newTarget) {
    let thisGridCoords = getGridCoordinates(this.x, this.y);
    thisGridCoords = { x: thisGridCoords[0], y: thisGridCoords[1] };
    this.path = findPath(thisGridCoords, newTarget);  //Find a path to the new target.
    client_LogMessage(this.id, " is setting new target ", newTarget.id, " with path ", this.path);
    if (this.target) {
      this.previousUnitTarget = this.target.id ? this.target : this.previousUnitTarget;
    }
    this.target = newTarget;
  }

  setRandomRoamPosition() {
    let focus;
    const roamingRange = this.searchRadius;//*1.5;  // Sets a roaming range 1 and a half times default range
    if (this.target && this.target.id) {   // If target has ID (not random position)
      //client_LogMessage("TARGET HAS ID");
      focus = this.target;  // Set focus for random position range
    }
    else if (this.previousUnitTarget) {  // Target doesnt have ID
      focus = this.previousUnitTarget;
    }
    else {
      client_LogMessage("no target or id or prev");
      focus = this;
    }

    this.setNewTarget(getRandomPositionInRange(focus, roamingRange));  // sets a random position within the range of the object
  }

  enterTargetNode() {
    if (this.target.agentCapacity.length == 0) {
      this.target.agentTypeAllianceKey = this.type.key; // If node it empty, Update Node Agent Alliance.
    }
    this.target.agentCapacity.push(this);
    client_LogMessage(this.id, " is entering node ", this.home.id);
  }

  exitNode() {
    this.home.agentCapacity = this.home.agentCapacity.filter((agent) => agent !== this);
    if (this.target.agentCapacity.length == 0) {
      this.target.agentTypeAllianceKey = null; // If node it empty, Update Node Agent Alliance to null.
    }
    client_LogMessage(this.id, " is leaving node ", this.home.id);
  }

}

function addAgent(x, y, typeKey = Agent.types.generic_Agent.key) {
  const newAgent = new Agent(x, y, Agent.types[typeKey]);
  //newAgent.type = ;  // if type is given set type if not then leave default
  gameState.agents.push(newAgent);
  gameState.spawnedUnitsCount += 1;
  return newAgent;
}

function calculateTotalLiveAgents() {
  return gameState.agents.length;
}

// Function to train agents
function trainAgents() {
  const numberOfAgents = document.getElementById("agentNumber").value;
  if (numberOfAgents) {
    client_LogMessage(`Training ${numberOfAgents} agents...`);
    // Add your logic here to train the agents
  } else {
    client_LogMessage("Please enter the number of agents.");
  }
}