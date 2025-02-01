## Game Design Document (GDD)

### **1. Game Overview**
- **Title:** CivSim (placeholder name)
- **Genre:** Strategy/Simulation
- **Platform:** Browser-based (HTML5/JavaScript)
- **Description:** CivSim is a grid-based simulation game where players manage resources, build structures, and command agents. The game will include multiplayer aspects inspired by *Clash of Clans*, allowing players to view and interact with others' bases.

---

### **2. Core Gameplay**
#### **2.1 Player Objectives**
- Collect resources (wood, stone, food).
- Build and upgrade structures (homes, storage, barracks).
- Train and manage agents for gathering, roaming, and combat.
- Interact with other players' bases in multiplayer mode.

#### **2.2 Game Loop**
1. Players build and upgrade structures to support resource production and storage.
2. Agents gather resources and defend the base.
3. Players attack or interact with other players' bases for rewards.
4. Use earned resources to expand and fortify their base.

---

### **3. Key Features**
#### **3.1 Structures**
- **Home:** Central hub; houses agents.
- **Resource Node:** Produces resources periodically.
- **Storage Node:** Stores gathered resources.
- **Barracks:** Trains agents for combat and defense.

#### **3.2 Agents**
- **Generic Agent:** General-purpose for gathering and basic tasks.
- **Raider Agent:** Specialized for combat.
- **AI Behavior:** States include idle, roaming, gathering, depositing, and combat.

#### **3.3 Multiplayer**
- **Base Interaction:** Players can view and interact with other bases.
- **Combat:** Raid other players' bases to steal resources.
- **Social Features:** Friends list, alliances, or leaderboards (future expansion).

#### **3.4 Resource Management**
- **Types:** Wood, Stone, Food.
- **Mechanics:** Gathered by agents and stored in nodes.

#### **3.5 Save and Load**
- **Current State:** Completely client-side; no save feature.
- **Planned Feature:** Integration of cloud-based saving for multiplayer and session persistence.

---

### **4. Technical Details**
#### **4.1 Game Architecture**
- **Frontend:** HTML5, CSS, JavaScript.
- **Canvas Rendering:** Grid-based rendering for agents, nodes, and interactions.
- **State Management:** `gameState` object handles resources, nodes, agents, and ticks.

#### **4.2 Multiplayer System**
- **Implementation Plan:**
  - Use a backend service (e.g., Firebase, Node.js with WebSocket, or REST API) to manage player data and interactions.
  - Store player base layouts, resources, and progress in a central database.
  - Real-time updates for base raids and multiplayer interactions.
- **Challenges:** Synchronization, scalability, and ensuring fair interactions.

#### **4.3 Save System**
- **Local:** Use browser's LocalStorage for temporary saving.
- **Cloud Save:** Backend integration to persist game state across devices.

---

### **5. User Interface**
#### **5.1 Build Menu**
- A grid-based menu at the bottom of the screen for selecting structures and agents to build.
- Displays details (name, description, cost) of the selected item.

#### **5.2 HUD**
- Resource counters (wood, stone, food) in the top-left corner.
- Agent and structure stats on click.
- Notifications for key events (e.g., raids, low resources).

#### **5.3 Interaction**
- **Mouse Controls:**
  - Left-click to select/place nodes.
  - Drag to pan the camera.
- **Keyboard Controls:** (future implementation)
  - Shortcuts for quick actions (e.g., build menu, agent commands).

---

### **6. Development Roadmap**
#### **Phase 1: Core Gameplay**
- Implement basic grid mechanics, resource gathering, and agent behaviors.
- Add saving/loading using LocalStorage.

#### **Phase 2: Multiplayer**
- Set up backend for saving bases and managing interactions.
- Implement base viewing and raiding.

#### **Phase 3: Polishing**
- Enhance UI/UX (animations, tooltips, sounds).
- Introduce social and competitive features (e.g., leaderboards).

---

### **7. Visual Style**
- **Theme:** Minimalist with ASCII-inspired graphics.
- **Assets:** Use symbols and simple shapes for agents, resources, and structures.
- **Color Palette:** Contrast-rich for clarity on the grid.

---

### **8. Challenges and Considerations**
1. **Multiplayer Fairness:** Prevent exploits and ensure balanced raids.
2. **Scaling:** Optimize rendering for large bases and high agent counts.
3. **Data Persistence:** Securely save and restore player progress.
4. **Cross-Platform:** Ensure compatibility across browsers.