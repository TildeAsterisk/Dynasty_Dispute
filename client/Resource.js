//#region Resource Class
class Resource {
  static types = {
    rawMaterials: {
      key: "rawMaterials",
      name: "Raw Materials",
      description: "Resources for construction and crafting.",
      colour: "gray",
      symbol: "🪨"
    },
    food: {
      key: "food",
      name: "Food",
      description: "Resources for consumption.",
      colour: "yellow",
      symbol: "🥩"
    },
    agricultural: {
      key: "agricultural",
      name: "Agricultural Resources",
      description: "Resources for farming and agriculture.",
      colour: "green",
      symbol: "⚘"
    }
  };

  constructor(typeKey, amount) {
    this.type = Resource.types[typeKey];
    this.amount = amount;
  }
}
//#endregion
