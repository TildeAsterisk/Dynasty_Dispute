#   CIV SIM
Agents and Nodes.
1. Start with Resource Node and two Agents.
2. Collect resources to build a storage node.
3. Store up resources.
4. Upgrade Defences. (Barracks, Walls)
5. Updgrade Home to (Head Quarters, Hub, HQ, Citadel, Main Base, Central, Heart)
6. Defend against outdoor attacks
.. Further progression based on unit graphics, from tents to space...

##  Nodes
Nodes are objects on the Grid that store information and other objects;
They tend to stay in their position.
Node Types:
- Resource
- Storage
- Home

##  Agents
Agents are objects that move around the grid according to a pattern of behaviour,
often moving between Nodes.

---
##  To Do:
- [ ] Defence Barracks, uses resources. Homes agents.
    - [ ] Allow Barracks to house many agents that stay inside untill enemy detected.
- [ ] Update resource node cooldown to begin from when it is empty
- [ ] Graphics Update
    - [ ] NODE GRAPHICS (Capacity Identifiers, Cooldown icon)
        - [X] Show Node Capacity
    - [ ] Show elaborate unit info based on type (generate a image)
    - [X] Clean up Unit Info screen and quest log. Minimize buttons.
    - [X] Different colour agents.
    - [X] Build Menu with Icons
    - [X] UI Rework
    - [ ] ASCII Graphics?
- [ ] FIX QUEST PROGRESSION
- [ ] Generate Build Menu
- [ ] Update die logic to move to die state. Show dead body then despawn after time.
- [ ] Show Radius on selected Unit
- [ ] Develop Progression: Upgrades
- [ ] Fix the weird checkForEnemy in State class implementation. Shouldnt be there...

- [X] Implement Node team alliance flag. (Makes settlements easier.)
- [X] Allow Agent to gather from a storage node.
- [X] Take build item cost from storage
- [X] Unit Info Menu and Quest cleanup
- [X] Update score to calculate total storage
- [X] Drain resource node that regenerates after cooldown
- [X] Building Menu
- [X] Zero Player Game
- [X] Mulitple Agents
- [X] Combat
- [X] Nodes and Agents with behaviour states that consume resources from the storage nodes.

#   BUGS
- ~Weird bug where settlemenmts only use two storage nodeswhen there are many.~
- ~FIx bug where capacity goes negative.~
- ~Agents not filling all storage.~
- ~When clicking on default build option, "Select". Change description text.~
- ~Home capacity, agents not properly entering and exiting~
- ~Fix questing. If one home is built, it completes all future quests of the same condition.~
- ~After the game runs for a while there is a bug with the agentCapacity that crashes the game.~
- ~Enemies spawnign in the home~

# Notes
Independant sections of CIVs with Resource, Storage and Homes are able to thrive competetively against eachother.


[Cheat Sheet](https://www.markdownguide.org/cheat-sheet/)