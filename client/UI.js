function client_LogMessage(...args) {
  const verboseDebug = false;
  let stamp = '';
  const stack = new Error().stack.split('\n');
  if(verboseDebug){
    stamp = [stack[1] , stack[2]];
    // Process Stack Strings...
    stamp[0] = stamp[0] ? stamp[0].replace(/@.*\//, '@') : "";
    stamp[1] = stamp[1] ? stamp[1].replace(/@.*\//, '@') : "";
    stamp = `Source:\n    ${stamp[1]}\n    ${stamp[0]}`;
  }
  else{
    stamp = stack[1] ? stack[1].replace(/@.*/, '') : "";
  }

  if (stamp == "") {
    console.log(...args);
  } else {
    console.log(...args, `[SOURCE:${stamp}]`);
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
function updateUnitInfo(object = null) {
  const unitInfoDiv = document.getElementById("unitInfo");
  if (!object) {
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
    /*
    if (typeof value == 'number'){ roundedValue = value.toFixed(2); }  // If attribute is a number then round*/
    //let tmpSymbol = value.symbol ? value.symbol : value.type.symbol;
    if (value && typeof value == 'object') {
      //client_LogMessage("OBJECT ATTRIBNUTE", key, value);
      if (value.symbol) { roundedValue = value.symbol; }
      else if (typeof value.type == 'object' && value.type.symbol) { roundedValue = value.type.symbol; }
      else {
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
      if (key != "resourceInventory") {
        const row = table.insertRow();
        row.style = "border: 1px solid #cccccc6d; border-radius: 10px;"
        row.innerHTML = `<td style="border: none; ">${key}</td>
                        <td style="border: none;">: ${roundedValue}</td>`;
      }

    }
    //if (key == "type") { roundedValue = value.name; }
  }

  // Set the inner HTML of the div and append the table
  unitInfoDiv.innerHTML = `<b>${object.id}</b>`;
  // Create a button element
  const button = document.createElement('button');
  // Set the button's properties
  button.innerText = 'Destroy';
  button.id = 'myButton';
  button.style = 'margin-left:5px;';
  // Optionally, add event listeners to the button
  button.addEventListener('click', function() {
    alert('Button clicked!');
  });
  // Append the button to your div
  unitInfoDiv.appendChild(button);
  unitInfoDiv.appendChild(table);
  //unitInfoDiv.innerHTML += `<br>`;
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
  let totalCivStorageNodesArray = gameState.nodes.filter(n => n.type.key === Node.types.storage_Node.key);
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
    });
});

  let civStatusUIText = "📦"; // Initialize the text to be displayed on the UI
  let uiPosX = 10; let uiPosY = 30;
  const textSize = 20;
  const statSpacing = 3.5;
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
  civStatusUIText = `${resource.type.symbol} ${Math.round(resource.amount)}  `;
  drawText(`${civStatusUIText}`, uiPosX, uiPosY, textSize);
  uiPosX += textSize * statSpacing;
  // Display STORAED raw materials
  resource = totalCivStoredResourcesArray.find(r => r.type.key === Resource.types.rawMaterials.key);
  resource = resource ? resource : { type: Resource.types.rawMaterials, amount: 0 };
  civStatusUIText = `${resource.type.symbol} ${Math.round(resource.amount)}  `;
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

  let numHomes = (gameState.nodes.filter(b => b.type.key === Node.types.home.key).length);
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
function spawnPlayerCursor(){
  cursor = document.createElement("div");
  cursor.className = "player-cursor";
  cursor.dataset.id = data.id;
  document.body.appendChild(cursor);
  cursors[data.id] = cursor;
  return cursor;
}

function updateCursorPosition(cursor){
  cursor.style.left = `${data.x}px`;
  cursor.style.top = `${data.y}px`;
}

//#endregion