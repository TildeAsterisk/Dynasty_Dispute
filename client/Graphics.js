/*
// Was trying to let the GameGraphic obj have keys determined by the types
const storage_Node_GraphicsKey = Node.types.storage_Node.key;
const home_GraphicsKey = Node.types.home.key;
const resource_Node_food_GraphicsKey = Node.types.resource_Node.key+"_food";
const resource_Node_rawMaterials_GraphicsKey = Node.types.resource_Node.key+"_rawMaterials";*/

class GraphicsManager {
  static preloadImages() {
    client_LogMessage("Loading Game Graphics: ...");
    /*Object.values(Node.types).forEach((nodeType) => {
      client_LogMessage("Preloading image for node type: " + nodeType.imgSrc);
      nodeType.loadedImg = new Image();
      nodeType.loadedImg.src = nodeType.imgSrc;
    });
    Object.values(Agent.types).forEach((agentType) => {
      client_LogMessage("Preloading image for node type: " + agentType.imgSrc);
      agentType.loadedImg = new Image();
      agentType.loadedImg.src = agentType.imgSrc;
    });*/
    // ^Thats the old
    // \V/ this is the new \V/
    Object.values(this.GameGraphics).forEach((graphic) => {
      //graphic.loadedImg = new Image();
      graphic.loadedImg.src = graphic.imgSrc
      //client_LogMessage("Preloading image for node type: " + graphic.imgSrc);
    });

    cursorImage = new Image();
    cursorImage.src = "Graphics/mouse-pointer.png";

    client_LogMessage("Loading Game Graphics: Complete.");
  }

  static GameGraphics = {
    storage_Node: {
      imgSrc: "Graphics/buildings-rooms/storage_Node2.png",
      loadedImg: new Image()
    },
    home: {
      imgSrc: "Graphics/buildings-rooms/home3.png",
      loadedImg: new Image()
    },
    resource_Node_food : {
      imgSrc: "Graphics/buildings-rooms/resource_Node.png",
      loadedImg: new Image()
    },
    resource_Node_rawMaterials : { 
      imgSrc: "Graphics/buildings-rooms/resource_Node1.png",
      loadedImg: new Image()
    },
    path_node_E_W: {
      imgSrc: "Graphics/paths/path_Node-E_W1.png",
      loadedImg: new Image(),
    },
    path_node_N_S: {
      imgSrc: "Graphics/paths/path_Node-N_S1.png",
      loadedImg: new Image(),
    },
    path_node_ALL: {
      imgSrc: "Graphics/paths/path_Node-All1.png",
      loadedImg: new Image(),
    }
  };
}

