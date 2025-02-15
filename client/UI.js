function client_LogMessage(...args) {
  const verboseDebug = true;
  let stamp = '';
  const stack = new Error().stack.split('\n');
  if(verboseDebug){
    stamp = [stack[1] , stack[2]];
    // Process Stack Strings...
    stamp[0] = stamp[0] ? stamp[0].replace(/@.*\//, '@') : "";
    stamp[1] = stamp[1] ? stamp[1].replace(/@.*\//, '@') : "";
    stamp = stamp[0];
  }
  else{
    //stamp = stack[1] ? stack[1].replace(/@.*/, '') : "";
  }

  if (stamp == "") {
    console.log(...args);
  } else {
    console.log(`[${stamp}]:\n`,...args);
  }

  //const logEntry = document.createElement("div");
  //logEntry.textContent = message;

  //log.appendChild(logEntry);
  //log.scrollTop = log.scrollHeight;

  //socket.emit("client-log", ...args ); // Emit log message to the server
}

function clearLog() {
  //log.innerHTML = "";
}

/*function viewMap() {
    logMessage("Current Map:");
    logMessage(JSON.stringify(gameState.map, null, 2));
}
*/

// Function to update the #unitInfo div
function GenerateUnitInfoMenu(object = null) {
  const unitInfoDiv = document.getElementById("unitInfo");
  if (!object) {
    unitInfoDiv.innerHTML = ``;
    return;
  }

  // create basic unit info template
  const basicUnitInfoElement = document.createElement("div");
  basicUnitInfoElement.id = "basicUnitInfoUI";

  for (resource in object.resourceInventory) {
    let newStat = object.resourceInventory[resource].type ? object.resourceInventory[resource].type : object.resourceInventory[resource];
    roundedValue = newStat.key ? newStat.key : undefined;
    const resAmntDisplay = (Math.round(object.resourceInventory[resource].amount * 100) / 100).toFixed(2);
    const resDisplayColor = object.resourceInventory[resource].type.colour ? object.resourceInventory[resource].type.colour : null;

    basicUnitInfoElement.innerHTML += `${newStat.symbol} <progress value="${resAmntDisplay}" max="100" style="accent-color:${resDisplayColor};"></progress><br>`;

    /*row.innerHTML += `<td style="border: none; ">${newStat.symbol}</td>
                      <td style="border: none;">: ${(Math.round(object.resourceInventory[resource].amount * 100) / 100).toFixed(2)}</td>`;*/
  }



  // Create verbose unit info table element
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.borderSpacing = 0;
  table.style.width = "100%";
  table.style.display='none';
  table.style.textAlign = 'left';

  // Add table header
  /*const headerRow = table.insertRow();
  headerRow.innerHTML = `<th style="border: 1px solid black; padding: 5px;">Attribute</th>
                         <th style="border: 1px solid black; padding: 5px;">Value</th>`;*/

  // Populate table rows with object's attributes
  for (const [key, value] of Object.entries(object)) {
    let roundedValue = value;
    /*
    if (typeof value == 'number'){ roundedValue = value.toFixed(2); }  // If attribute is a number then round*/
    //let tmpSymbol = value.symbol ? value.symbol : value.type.symbol;
    if (value && key != 'neighbors') {
      //client_LogMessage("OBJECT ATTRIBNUTE", key, value);
      if (typeof value == 'object' && value.symbol) { roundedValue = value.symbol; }
      else if (typeof value.type == 'object' && value.type.symbol) { roundedValue = value.type.symbol; }
      else if (Array.isArray(value)) {
        //client_LogMessage(Object.entries(value));
        for (const [skey, stat] of Object.entries(value)) {
          let newStat = stat.type ? stat.type : stat;
          roundedValue = newStat.key ? newStat.key : undefined;
          const row = table.insertRow();
          row.style = "border: 1px solid #cccccc6d; border-radius: 10px;"
          row.innerHTML = `<td style="border: none; ">${newStat.symbol}</td>
                            <td style="border: none;">: ${(Math.round(value[skey].amount * 100) / 100).toFixed(2)}</td>`;
        }
      }
      else{
          roundedValue = value;
          const row = table.insertRow();
          row.style = "border: 1px solid #cccccc6d; border-radius: 10px;"
          row.innerHTML = `<td style="border: none; ">${key}</td>
                          <td style="border: none;">: ${roundedValue}</td>`;
      }

    }
    //if (key == "type") { roundedValue = value.name; }
  }

  // Set the inner HTML of the div and append the table
  unitInfoDiv.style.textAlign = 'right';
  unitInfoDiv.innerHTML = `<b>${object.id}</b><br>`;

  // Create a button element
  const upgradeBtn = document.createElement('button');
  // Set the button's properties
  upgradeBtn.innerText = '⬆️';
  upgradeBtn.id = 'myButton';
  upgradeBtn.className = `action-button`;
  upgradeBtn.dataset.id = object.id;
  upgradeBtn.disabled = true;
  //upgradeBtn.style;
  // Optionally, add event listeners to the button
  upgradeBtn.onclick = function() {
    client_LogMessage("[ACTION_BTN]:",'Upgrade Button clicked!', this.dataset.id);
  };

  // Create a button element
  const inspectInfoBtn = document.createElement('button');
  // Set the button's properties
  inspectInfoBtn.innerText = '🔍';
  inspectInfoBtn.id = 'myButton';
  inspectInfoBtn.className = `action-button`;
  inspectInfoBtn.dataset.id = object.id;
  // Optionally, add event listeners to the button
  inspectInfoBtn.onclick = function() {
    console.log("[ACTION_BTN]:",'Inspect Button clicked!', this.dataset.id, table.style.display);
    table.style = table.style.display == '' ? 'display:none;' : 'display:default';
  };

  // Create a button element
  const destroyBtn = document.createElement('button');
  // Set the button's properties
  destroyBtn.innerText = '🚫';
  destroyBtn.id = 'myButton';
  destroyBtn.className = `action-button`;
  destroyBtn.dataset.id = object.id;
  // Optionally, add event listeners to the button
  destroyBtn.onclick = function() {
    const sNode = Array.from(gameState.nodes.values()).find((node) => (node.id == this.dataset.id)); //Get node to destroy by id TO DO:!! FIX THIS AND ALL OF THEM
    gameState.nodes.delete(sNode.id); // delete from array in gamestate
    sNode.type=undefined;
    socket.emit("update-node-c-s", sNode);  // emit with no type so it gets deleted
    //delete sNode;  // Does this even do anything???
    client_LogMessage("[ACTION_BTN]:",sNode.id,"was destroyed.\n");
    //alert("DESTROYED");
  };

  //Create action buttons div
  const actionBtnContainer = document.createElement("div");
  actionBtnContainer.style.textAlign = "right";
  // Append the button to your div
  actionBtnContainer.appendChild(upgradeBtn);
  actionBtnContainer.appendChild(inspectInfoBtn);
  actionBtnContainer.appendChild(destroyBtn);
  //append btn container to menu
  unitInfoDiv.appendChild(actionBtnContainer);

  //append the unit template
  unitInfoDiv.appendChild(basicUnitInfoElement);

  unitInfoDiv.appendChild(table);
}

function updateUnitInfoMenu(object = null){
  const unitInfoElem = document.getElementById("basicUnitInfoUI");
  unitInfoElem.innerHTML = '';

  for (resourceIndex in object.resourceInventory) {
    let newStat = object.resourceInventory[resourceIndex].type ? object.resourceInventory[resourceIndex].type : object.resourceInventory[resourceIndex];
    roundedValue = newStat.key ? newStat.key : undefined;
    const resAmntDisplay = (Math.round(object.resourceInventory[resourceIndex].amount * 100) / 100).toFixed(2);
    const resDisplayColor = object.resourceInventory[resourceIndex].type.colour ? object.resourceInventory[resourceIndex].type.colour : null;
    unitInfoElem.innerHTML += `${newStat.symbol} <progress value="${resAmntDisplay}" max="100" style="accent-color:${resDisplayColor};"></progress><br>`;
  }

  for (agentIndex in object.agentCapacity) {

    unitInfoElem.innerHTML += `${gameState.agents.get(agentIndex) ? gameState.agents.get(agentIndex).type.symbol : "👤"}`;
  }
}

//#region BUILD MENU
const buildTypes = Node.types;
buildTypes.generic_Agent = Agent.types.generic_Agent;
buildTypes.raider_Agent = Agent.types.raider_Agent;

document.querySelectorAll('.grid-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.grid-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    // Find node type by name
    displayDetails(item.dataset.value);
    client_LogMessage(item.dataset.initobj);
    let initObj = item.dataset.initobj ? JSON.parse(item.dataset.initobj) : undefined;
    selectType(item.dataset.value, initObj ? initObj : undefined);
  });
});

function selectType(typeKey, initObj) {
  if (buildTypes[typeKey]) {
    gameState.selectedType = buildTypes[typeKey];
    gameState.selectedType.initObj = initObj;
    //gameState.selectedType.initObj = bui
    client_LogMessage(`Selected type: ${buildTypes[typeKey].key}`);
  }
  else {
    gameState.selectedType = null;
    //console.error(`Invalid type selected: ${type}`);
    client_LogMessage(`Invalid node type selected: ${typeKey}`);
    return;
  }
}

// Display details of selected object
function displayDetails(buildTypeKey) {
  // get build type from list
  buildType = buildTypes[buildTypeKey];
  const details = document.getElementById("selectedBuildItemInfo");
  if (!buildType) { details.innerHTML = ""; return; }  // buildType = {name:"Inspection Mode", description:"Click on a unit to view its information."
  if (details) {
    details.innerHTML = `<p style="margin:0;"><b>${buildType.name}</b><br><i>${buildType.description}</i></p>`;
  }

}

function togglePanel() {
  const panel = document.getElementById('gridPanel');
  panel.classList.toggle('hidden');
}

function drawCivStatusBarUI() {
  calculateAndUpdateStoredResources(Node.types.generic_Agent.key);  // Update total stored resources
  const totalLiveAgents = calculateTotalLiveAgents(); //Calulate total live agents
  let totalCivResourceArray = [];
  // Calculate total amount of each resource
  gameState.nodes.forEach(node => {
      node.resourceInventory.forEach(resource => {
        //For each resource of each node
        // Check if the resource is already in the array
        let existingResource = totalCivResourceArray.find(r => r.type.key === resource.type.key);
        if (existingResource) {
          // If the resource is already in the array, add the amount to the existing resource
          existingResource.amount += resource.amount;
        }
        else {  // If the resource is not in the array, add it to the array
          totalCivResourceArray.push({ type: resource.type, amount: resource.amount });
        }
      });
  });

  // Calculate total amount of each STORED resource
  let totalCivStorageNodesArray = Array.from(gameState.nodes.values()).filter(n => n.type.key === 'storage_Node');
  let totalCivStoredResourcesArray = [];
  totalCivStorageNodesArray.forEach(sNode => {
    sNode.resourceInventory.forEach(resource => {
      //For each resource of each node
      // Check if the resource is already in the array
      let existingResource = totalCivStoredResourcesArray.find(r => r.type.key === resource.type.key);
      if (existingResource) {
        // If the resource is already in the array, add the amount to the existing resource
        existingResource.amount += resource.amount;
      }
      else {  // If the resource is not in the array, add it to the array
        totalCivStoredResourcesArray.push({ type: resource.type, amount: resource.amount });
      }


      //console.log("STORAGE NOGES:",totalCivStorageNodesArray,existingResource);
    });
});

  let civStatusUIText = "📦"; // Initialize the text to be displayed on the UI
  let uiPosX = 10; let uiPosY = 30;
  const textSize = 18;
  const statSpacing = 4.5;
  drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);
  uiPosX += textSize * 1.5;

  /*totalCivResourceArray.forEach(resource => {
    // Display the total amount of each resource on the UI
    //client_LogMessage("LETS GOOOOOO",resource);
    civStatusUIText = `${resource.type.symbol} ${Math.round(resource.amount)}  `;
    drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);
    uiPosX += textSize * statSpacing;
  });*/
  
  // Display the total amount of the resource on the UI
  //client_LogMessage("LETS GOOOOOO",resource);

  // display TOTAL food
  let resource = totalCivResourceArray.find(r => r.type.key === Resource.types.food.key);
  resource = resource ? resource : { type: Resource.types.food, amount: 0 };
  civStatusUIText = `${resource.type.symbol}${Math.round(resource.amount)}  `;
  drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);
  uiPosX += textSize * statSpacing;
  // Display STORAED raw materials
  resource = totalCivStoredResourcesArray.find(r => r.type.key === Resource.types.rawMaterials.key);
  resource = resource ? resource : { type: Resource.types.rawMaterials, amount: 0 };
  civStatusUIText = `${resource.type.symbol}${Math.round(resource.amount)}`;
  drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);
  uiPosX += textSize * statSpacing;
  
  civStatusUIText = `☥ ${totalLiveAgents}`;  // Display total live agents
  drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);

  uiPosX = 10; uiPosY = 60;
  civStatusUIText = '❗';
  drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);
  uiPosX += textSize * 1.5;

  //Calulcate surplus FOOD value
  const tmpTotalFood = totalCivResourceArray.find(r => r.type.key === Resource.types.food.key);
  const totalFood = tmpTotalFood ? tmpTotalFood.amount : 0;
  const civResReqSurplus = totalFood - (totalLiveAgents * 50);
  // Determine Surplus colour, red bad, green good.
  let surplusColour;
  if (civResReqSurplus <= 0) {
    surplusColour = 'red';
  }
  else if (civResReqSurplus > 0 && civResReqSurplus < (totalLiveAgents * 50)) {
    surplusColour = 'orange';
  }
  else {
    surplusColour = 'green';
  }

  civStatusUIText = `${Resource.types.food.symbol + Math.round(civResReqSurplus)}`;
  drawText(civStatusUIText, uiPosX, uiPosY, textSize, surplusColour);
  uiPosX += textSize * statSpacing;

  let numHomes = (Array.from(gameState.nodes.values()).filter(b => b.type.key === Node.types.home.key).length);
  const civHomeReqSurplus = numHomes - totalLiveAgents;
  if (civHomeReqSurplus < 0) {
    surplusColour = 'red';
  }
  else if (civHomeReqSurplus >= 0 && civHomeReqSurplus < (totalLiveAgents)) {
    surplusColour = 'orange';
  }
  else {
    surplusColour = 'green';
  }
  civStatusUIText = `🏠${Math.round(civHomeReqSurplus)}`;
  drawText(civStatusUIText, uiPosX, uiPosY, textSize, surplusColour);

}

//#region Player Cursor Functions (Multiplayer)
function spawnPlayerCursor(cursorData){
  /*cursor = document.createElement("div");
  cursor.className = "player-cursor";
  cursor.dataset.id = data.id;
  document.body.appendChild(cursor);
  cursors[data.id] = cursor;*/
  cursor = {id:cursorData.id, x:cursorData.x,y:cursorData.y};
  cursors[cursor.id] = cursor;
  return cursor;
}

function updateCursorPosition(cursor, netCursorData){
  cursor.x = netCursorData.x;
  cursor.y = netCursorData.y;
  //const cursorWorldPos = screenToWorldCoordinates(cursor.x, cursor.y);
  //cursor.style.left = `${data.x}px`;
  //cursor.style.top = `${data.y}px`;
}

//#endregion