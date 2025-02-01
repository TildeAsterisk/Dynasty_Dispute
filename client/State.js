//#region State Class
// Define a State base class (optional)
class State {
  constructor() {
    this.symbol = "💭";
  }

  enter(context) {
    // Code executed when entering the state
    client_LogMessage(`${context.id} enters ${this.constructor.name}.`);
  }
  execute(context) {
    // Code executed on each update/tick

    /*
    
    */
  }
  exit(context) {
    // Code executed when leaving the state
    //client_LogMessage(`${context.id} stops  ${this.constructor.name}.`);
  }

  checkForEnemy(context) {
    // Check for nearby enemies
    const enemy = context.findEnemy(context.searchRadius);
    if (enemy) {
      client_LogMessage(`${context.id} found an enemy: ${enemy.id}`);
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

    if (!context.consumeResources(Resource.types.food.key)) { // Eat food, if cannot...
      context.targetResourceTypeKey = Resource.types.food.key;

      // try to find resource node with food
      newTargetQuery = context.findResourceNode(context.searchRadius * 2, Resource.types.food.key);
      if (newTargetQuery) { // If food found, gather
        context.setNewTarget(newTargetQuery);
        context.changeBehaviourState(new Gathering_State());
        return;
      }
      else { // Cannot consume resources, and cannot find resource node
        // try to find storage node to take from
        newTargetQuery = context.findStorageNode_NotEmptyInRange(context.searchRadius * 2, Resource.types.food.key);
        if (newTargetQuery) {
          //client_LogMessage(context.id, "is retrieving food from storage", context.target.id);
          context.setNewTarget(newTargetQuery);
          context.changeBehaviourState(new Gathering_State());
          return;
        }
        else {
          client_LogMessage(context.id + " ran out of resources while Idle.");
          context.die();
          return;
        }
      }
    }
    else { // Is idle and just consumed food. Find work to do...
      //context.changeBehaviourState(new Idle_State());
      client_LogMessage(context.id," just consumed food, looking for work.");

      // try to find resource node with raw materials
      context.targetResourceTypeKey = Resource.types.rawMaterials.key;

      const newResourceNodeTargetQuery = context.findResourceNode(context.searchRadius * 2, Resource.types.rawMaterials.key);
      if (!newResourceNodeTargetQuery) { // If no resources found then go home or roam
        context.changeBehaviourState(new GoingHome_State());
        return;
      }
      // try to find storage node to take from
      let newTargetQuery = context.findStorageNode_LowestInRange(context.searchRadius * 2, Resource.types.rawMaterials.key);
      if (newTargetQuery) {
        context.setNewTarget(newResourceNodeTargetQuery);
        context.changeBehaviourState(new Gathering_State());
        return;
      }
      else {
        client_LogMessage(context.id + " no work to do, going home.");
        context.changeBehaviourState(new GoingHome_State());
        return;
      }
      
      return;
      /*
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
        else{
          client_LogMessage(context.id+" No work to be done (Storage full). Go home, or roam or chill...");
          context.changeBehaviourState(new GoingHome_State());
          return;
        }
      }
      else{ // Idle, consumed food and no work to do.
        context.changeBehaviourState(new GoingHome_State());
        return;
      }*/
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
  constructor() {
    super(); this.symbol = "";//"🧭";
  }

  execute(context) {
    this.checkForEnemy(context);
    let newTargetQuery;
    if (!context.consumeResources(Resource.types.food.key)) { // Each food, if cannot...
      // try to find resource node with food
      context.targetResourceTypeKey = Resource.types.food.key;

      newTargetQuery = context.findResourceNode(context.searchRadius * 2, Resource.types.food.key);
      if (newTargetQuery) { // If food found, gather
        context.setNewTarget(newTargetQuery);
        context.changeBehaviourState(new Gathering_State());
        return;
      }
      else { // Cannot consume resources, and cannot find resource node
        // try to find storage node to take from
        newTargetQuery = context.findStorageNode_NotEmptyInRange(context.searchRadius * 2, Resource.types.food.key);
        if (newTargetQuery) {
          //client_LogMessage(context.id, "is retrieving food from storage", context.target.id);
          context.setNewTarget(newTargetQuery);
          context.changeBehaviourState(new Gathering_State());
          return;
        }
        else {
          client_LogMessage(context.id + " ran out of resources while Roaming.");
          context.die();
          return;
        }
      }
    }
    else { // Can consume food.
      // Roam around randomly
      if (context.target) { // has target, move to it
        context.moveToTarget();
        if (context.reachedTarget()) { // Has target and reached it.
          context.setRandomRoamPosition();  // set new random target
          return;
        }
        else {
          // moving to target still...
        }
      }
      else {
        //  Roaming with no target. Set a new one? 
        context.setRandomRoamPosition();
        context.moveToTarget();
        return;
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
  constructor() {
    super(); this.symbol = "🧺"; //📥?
  }

  execute(context) {
    this.checkForEnemy(context);  // Check for an Enemy, if found transition to Combat immediately

    if(context.getResourceInInventory(Resource.types.food.key).amount > context.resourceHunger){
      context.consumeResources(Resource.types.food.key); // Consume food
    }

    if (context.reachedTarget()) {  // Reached Resource?
      //client_LogMessage("REACHED",context.target);
      if (context.gatherResources(context.targetResourceTypeKey)) { // If Target reached and resources gathered
        //client_LogMessage(context.id, "Gathering resources ",context.target.id);
        // Set Node typealliance 
        context.target.agentTypeAllianceKey = context.type.key;
        return;
      }
      else { // If cannot gather anymore
        // iff gathered from resource, then store it. If gathered from stroage then go home
        client_LogMessage(context.id, "Cannot gather " + context.targetResourceTypeKey + " from ", context.target.id);

        if (context.target.id && context.target.type.key == Node.types.resource_Node.key) {
          const storageFound = context.findStorageNode_LowestInRange(context.searchRadius); // go and store gathered resources
          if (storageFound) {
            // finished gathering from resource node.
            context.setNewTarget(storageFound);  // Find new storage
            context.changeBehaviourState(new Depositing_State());
            return;
          }
          else { // No storage found
            client_LogMessage(context.id, "finished gathering from resource node and no storage found to put it away. Idle, looking for work.");
            context.changeBehaviourState(new Idle_State());
            return;
          }
        }

        else if (context.target.id && context.target.type.key == Node.types.storage_Node.key) {
          // Finished gathering from storage. Idle, look for some work
          client_LogMessage(context.id, "finished taking from storage. Idle, going to look for some work");
          context.changeBehaviourState(new Idle_State());
          return;
        }
        else { // cannot gather from target
          context.changeBehaviourState(new GoingHome_State());
          return;
        }

      }
    }
    else {
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
  constructor() {
    super(); this.symbol = "📦"; //📤?
  }

  execute(context) {
    //Execute
    this.checkForEnemy(context);
    //Dont eat when depositing resources, theres no point. Inventory will likely be empty right after. Don't get high on your own supply.

    //if(context.target.getResourceInInventory(Resource.types.food.key).amount < context.resourceHunger){
      //client_LogMessage(context.id,"has food to consume");
      //context.consumeResources(Resource.types.food.key); // Consume food
    //}

    context.moveToTarget();
    if (context.reachedTarget()) {
      if (context.depositResources(context.targetNodeResource)) { // If can deposit
        context.target.agentTypeAllianceKey = context.type.key; // Change Node alliance key
        context.changeBehaviourState(new Idle_State());  // Go look for work
      }
      else {
        // If cannot deposit resources, go home
        client_LogMessage(context.id, "cannot deposit resources, storage would overflow, looking for work.");
        context.targetResourceTypeKey = Resource.types.food.key;
        context.changeBehaviourState(new Idle_State()); // go look for work to do
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
  constructor() {
    super(); this.symbol = "🏠";
  }

  execute(context) {
    this.checkForEnemy(context);
    //execute
    // Check if there is no target or target is not home. Find and set a home.
    
    context.home = context.findHome(context.searchRadius);
    if (context.home && context.target !== context.home){ //If home is found and target is not home.
      context.setNewTarget(context.home);
      context.moveToTarget();
    }
    else if (context.home && context.target == context.home){
      context.moveToTarget();
    }
    else{
      context.changeBehaviourState(new Roaming_State);
      return;
    }

    //context.moveToTarget();
    
    
    /* If there is no target ir tg
    if(!context.target || context.target.type.key !== Node.types.home.key) {
      context.home = context.findHome(context.searchRadius);
      context.setNewTarget(context.home);
    }*/

    

    if (context.reachedTarget()) {
      // If agent reached home and its not full
      if (context.home && context.home.agentCapacity.length < context.home.maxAgentCapacity) {
        context.enterTargetNode();
        context.changeBehaviourState(new AtHome_State());
        return;
      }
    }

    //If no home then wander about
    if (!context.home) {
      // Set target, change state
      context.setNewTarget(getRandomPositionInRange(context, GRID_SIZE * 3));
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
  constructor() {
    super(); this.symbol = "💤";
  }

  execute(context) {
    this.checkForEnemy(context);
    //execute
    if (context.target != context.home) { console.error("At home but target is not home."); }

    let newTargetQuery;
    if (!context.consumeResources(Resource.types.food.key)) { // Each food, if cannot...
      // try to find resource node with food
      context.targetResourceTypeKey = Resource.types.food.key;
      newTargetQuery = context.findResourceNode(context.searchRadius * 2, Resource.types.food.key);
      if (newTargetQuery) { // If food found, gather
        client_LogMessage(context.id, "ran out of food at home.")
        context.setNewTarget(newTargetQuery);
        context.exitNode();
        context.changeBehaviourState(new Gathering_State());
        return;
      }
      else { // Cannot consume resources, and cannot find resource node
        // try to find storage node to take from
        newTargetQuery = context.findStorageNode_NotEmptyInRange(context.searchRadius * 2, Resource.types.food.key);
        if (newTargetQuery) {
          client_LogMessage(context.id + " is at home hungry, going to gather food.");
          context.setNewTarget(newTargetQuery);
          context.exitNode();
          context.changeBehaviourState( new Gathering_State() );
          return;
        }
        else {
          context.exitNode();
          //client_LogMessage(context.id + " ran out of resources and died at home.");
          context.die();
          return;
        }
      }

    }
    else {
      // Is at home, has enough food to eat. Effectivdely Idle, look for work.
      //context.exitNode();
      //context.changeBehaviourState(new Idle_State());

      //Stay at home and chill
      return;

    }
  }
}

//#region Combat State
class Combat_State extends State {
  constructor() {
    super(); this.symbol = "⚔";
  }
  enter(agent) {
    client_LogMessage(`${agent.id} is entering combat.`);
  }

  execute(agent) {
    if (!agent.target || agent.target.health <= 0) {
      client_LogMessage(`${agent.id} has no valid target.`);
      agent.changeBehaviourState(new Roaming_State());
      return;
    }

    const distance = calculateDistance(agent, agent.target);
    if (distance > agent.attackRange) {
      //client_LogMessage(`${agent.id} is chasing ${agent.target.id}.`);
      agent.moveToTarget(); // Move closer to the target
    } else {
      agent.attackTarget();
    }
  }

  exit(agent) {
    client_LogMessage(`${agent.id} is exiting combat.`);
  }
}


//#endregion