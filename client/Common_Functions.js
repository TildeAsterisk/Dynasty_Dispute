
// Draw text on the canvas
function drawText(text, x, y, size = 11, colour = "white", outlineColour = "black", textAlign = null) {
  if (typeof text != "string") { console.error("text is not a string"); client_LogMessage(text); return; }
  //Centre text to cell
  x-= size/2;
  y-=size/2;
  ctx.font = size.toString() + "px 'Roboto Mono', monospace";
  if (textAlign == "center") {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }
  else {
    //Default values
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // Process Text
  /*text = text.split(/_Node|_State/)[0]  // Cut off the class identifier part
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  text=String(text).charAt(0).toUpperCase() + String(text).slice(1);
  text = text.replace("_", " ");*/

  if (outlineColour != "None") {
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

// Draw rect on the canvas
function drawRect(x, y, width, height, colour, fillPercent=100) {
  // Offset the x and y to center the rectangle
  x -= width / 2;
  y -= height / 2;

  const lineWidth = 5;
  // Draw the outline
  if (fillPercent != undefined) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
  }
  else {
    fillPercent = 100;
  }

  // Calculate the height of the filled portion
  const filledHeight = height * (fillPercent / 100);

  // Draw the filled portion
  ctx.fillStyle = colour;
  ctx.fillRect(x, y + height - filledHeight, width, filledHeight);

  //drawASCIIartInRect(x,y,width,height,colour);
}

function drawSprite(x, y, width, height, loadedUnitImg) {
  if (!loadedUnitImg || loadedUnitImg.width == 0) {
    return false;
  }
  ctx.imageSmoothingEnabled = false;
  // Offset the x and y to center the rectangle
  x -= width / 2;
  y -= height / 2;
  ctx.drawImage(loadedUnitImg, x, y, width , height);
  return true;
}

function drawASCIIartInRect(x, y, width, height, colour) {
  // Offset the x and y to center the rectangle
  x -= width / 2;
  y -= height / 2;

  const asciiArt = `[↟_↟_↟_↟]
[_↟_↟_↟_]
[↟_↟_↟_↟]
[_↟_↟_↟_]
[↟_↟_↟_↟]`;
  // Draw the rectangle
  //ctx.fillStyle = 'black';
  //ctx.fillRect(x, y, width, height);

  // Draw the ASCII art inside the rectangle
  if (asciiArt) {
    const lines = asciiArt.split("\n"); // Split the ASCII art into lines
    const fontSize = height / (lines.length); // Adjust font size to fit all lines
    //ctx.fillStyle = "black"; // Set the text color
    ctx.font = `${fontSize}px monospace`; // Use a monospace font for ASCII art
    ctx.textAlign = "center"; // Center horizontally
    ctx.textBaseline = "middle"; // Adjust vertically for each line

    const lineHeight = fontSize; // Space between lines
    const centerY = y + height / 2; // Vertical center of the rectangle
    const startY = centerY - (lineHeight * (lines.length - 1)) / 2; // Top line position

    ctx.fillStyle = colour;
    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight;
      ctx.fillText(line, x + width / 2, lineY); // Draw each line
    });
  }
}

function getGridCoordinates(worldX, worldY) {
  const gridX = Math.floor(worldX / GRID_SIZE) * GRID_SIZE;
  const gridY = Math.floor(worldY / GRID_SIZE) * GRID_SIZE;
  return [gridX, gridY]; // Return as a unique key for the cell
}

function screenToWorldCoordinates(screenX, screenY, offset=0){
  const rect = canvas.getBoundingClientRect();
  let worldCoords = {};
  worldCoords.x = ((screenX - rect.left) / camera.scale + camera.x) + offset;
  worldCoords.y = ((screenY - rect.top) / camera.scale + camera.y) + offset;
  return worldCoords;
}

function worldToScreenCoordinates(worldX, worldY, offset = 0) {
  const rect = canvas.getBoundingClientRect();
  let screenCoords = {};
  screenCoords.x = (worldX - camera.x + offset) * camera.scale + rect.left;
  screenCoords.y = (worldY - camera.y + offset) * camera.scale + rect.top;
  return screenCoords;
}

// Utility function to check if a point is within a rectangle
function isPointInRect(px, py, rectX, rectY, rectWidth, rectHeight) {
  // Centre coords in drawn rect
  rectX -= rectWidth / 2;
  rectY -= rectHeight / 2;
  return px >= rectX && px <= rectX + rectWidth &&
    py >= rectY && py <= rectY + rectHeight;
}

// Get a random world positon within a gievn range of a given object
function getRandomPositionInRange(obj, range) {
  const randomX = obj.x + Math.random() * range * 2 - range;
  const randomY = obj.y + Math.random() * range * 2 - range;
  const randomPos = { x: randomX, y: randomY };
  return randomPos;
}

// Helper function to calculate the distance between two positions
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function drawGrid() {
  // Calculate the grid using camera
  const gridStartX = Math.floor(camera.x / GRID_SIZE) * GRID_SIZE;
  const gridStartY = Math.floor(camera.y / GRID_SIZE) * GRID_SIZE;

  const gridWidth = Math.ceil(canvas.width / (GRID_SIZE * camera.scale));
  const gridHeight = Math.ceil(canvas.height / (GRID_SIZE * camera.scale));
  // DRAW GRID
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

function heuristic(nodeA, nodeB) {
  return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
}

/**
 * Find the shortest path between two nodes using the A* algorithm
 * 
 * @param   {*}     startNode 
 * @param   {*}     endNode 
 * @param   {*}     gridNodes 
 * @returns {Array} path
 */
function findPath(startNode, endNode, gridNodes = gameState.nodes) {
  // Initialize the open set with the start node
  let openSet = new Set([startNode]);
  // Map to keep track of the most efficient previous step to reach each node
  let cameFrom = new Map();
  // Map to keep track of the cost of the cheapest path from start to each node
  let gScore = new Map(gridNodes.map(node => [node, Infinity]));
  // Map to keep track of the estimated cost from start to end passing through each node
  let fScore = new Map(gridNodes.map(node => [node, Infinity]));

  // The cost of the start node is 0
  gScore.set(startNode, 0);
  // The estimated cost from start to end through the start node
  fScore.set(startNode, heuristic(startNode, endNode));

  // Initialize the path as an empty array
  let path = [];

  // While there are nodes to evaluate in the open set
  while (openSet.size > 0) {
    // Get the node in the open set with the lowest fScore value
    let current = [...openSet].reduce((a, b) => fScore.get(a) < fScore.get(b) ? a : b);

    // If the current node is the end node, reconstruct the path
    if (current === endNode) {
      while (current) {
        const pathfindingScore = getNodePathfindingScore(current);
        path.unshift({ id:current.id, x: current.x, y: current.y, pathfindingScore });
        current = cameFrom.get(current);
      }
      return path; // Return the reconstructed path
    }

    // Remove the current node from the open set
    openSet.delete(current);
    // Get the neighbors of the current node
    current.neighbors = getNeighbors(current);
    for (let neighbor of current.neighbors) {
      // Calculate the tentative gScore for the neighbor
      // TODO: GetNodePathfindingScore??
      neighbor.pathfindingScore = getNodePathfindingScore(neighbor);
      let tentative_gScore = gScore.get(current) + neighbor.pathfindingScore; // Assuming each move has a cost of 1

      // If the tentative gScore is better, update the path
      if (tentative_gScore < gScore.get(neighbor)) {
        // This path is the best until now. Record it!
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentative_gScore);
        fScore.set(neighbor, gScore.get(neighbor) + heuristic(neighbor, endNode));
        // If the neighbor is not in the open set, add it
        if (!openSet.has(neighbor)) {
          openSet.add(neighbor);
        }
      }
    }
  }
  path = [];
  return path; // Return an empty array if no path is found
}


function getNeighbors(node = this, grid = gameState.nodes) {
  const neighbors = [];
  const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }  // left
  ];

  for (const direction of directions) {
    const neighborX = node.x + (direction.x * GRID_SIZE);
    const neighborY = node.y + (direction.y * GRID_SIZE);

    // Find a node in the grid that matches the neighbor's coordinates
    const neighborNode = grid.find(node => node.x === neighborX && node.y === neighborY);
    if (neighborNode && !neighborNode.isWall) { // If a node is found and it is not a wall, add it to the neighbors array TODO: node.isWall?
      neighbors.push(neighborNode);
    }
    else{
      neighbors.push({x: neighborX, y: neighborY, pathfindingScore:defaultPathfindingCost}); // Add the coordinates of the neighbor node
    }
  }

  return neighbors;
}

function getNodePathfindingScore(node){
  if(node.pathfindingScore){
    return node.pathfindingScore;
  }
  else{ // node doesnt have a pathfinding score
    if(node.id){
      //Set cost based on Node ID
      node.pathfindingScore = defaultPathfindingCost;
    }
    else{
      // Node doesnt have id, set cost one less than default. Greather than a path.
      node.pathfindingScore = defaultPathfindingCost - 1;
    }

  }

  return node.pathfindingScore;
}


//#endregion
