// js/PawnIdleGame.js
const PawnIdleGame = {
    id: 'PawnIdleGame',
    gameContainer: null,
    onComplete: null,     // GameManager's successCallback
    onFailure: null,      // GameManager's failureCallback
    sharedGameData: {},   // Data from GameManager (like playerName)

    // Game-specific state
    pawn: null,
    itemsDB: [],
    dungeonLevelsDB: [],
    enemiesDB: [],
    locationsDB: {},

    // Timers and intervals
    gameLoopInterval: null,
    lastTickTime: 0,
    saveInterval: null,

    // UI Elements (cache them for performance)
    ui: {},

    // --- Core GameManager Functions ---
    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onComplete = successCallback;
        this.onFailure = failureCallback;
        this.sharedGameData = sharedData;

        this.log("Initializing Pawn Idle Game...");
        this.renderBaseUI();

        try {
            await this.loadGameData(); // Load JSONs
            this.loadPawn();           // Load pawn data (from localStorage or default)
        } catch (error) {
            this.log("FATAL: Could not load game data. " + error.message, 'error');
            console.error("PawnIdleGame Init Error:", error);
            // Optionally call this.onFailure if loading is critical for any startup
            this.ui.statusDisplay.innerHTML = "Error loading game data. Cannot start.";
            return;
        }
        
        this.updateAllUI();
        this.startGameLoop();
        this.startAutoSave();

        // This game is "ongoing" until the player quits.
        // For now, we don't call onComplete immediately.
        // It might be called when the player manually exits the idle game.
        this.log("Pawn Idle Game started successfully.");
    },

    destroy: function() {
        this.log("Destroying Pawn Idle Game...");
        if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
        if (this.saveInterval) clearInterval(this.saveInterval);
        this.savePawn(); // Final save
        this.gameContainer.innerHTML = ''; // Clear UI
    },

    // --- Data Loading & Saving ---
    loadGameData: async function() {
        const dataSources = {
            itemsDB: 'data/pawnIdleGame/items.json',
            dungeonLevelsDB: 'data/pawnIdleGame/dungeon_levels.json',
            enemiesDB: 'data/pawnIdleGame/enemies.json',
            locationsDB: 'data/pawnIdleGame/locations.json',
            defaultPawnStats: 'data/pawnIdleGame/pawn_default_stats.json'
        };
        for (const key in dataSources) {
            try {
                const response = await fetch(dataSources[key]);
                if (!response.ok) throw new Error(`Failed to fetch ${dataSources[key]}: ${response.statusText}`);
                this[key] = await response.json();
                this.log(`${key} loaded.`);
            } catch (error) {
                console.error(`Error loading ${key}:`, error);
                throw error; // Re-throw to be caught by init
            }
        }
    },

    loadPawn: function() {
        const savedPawnData = localStorage.getItem('pawnIdleGame_pawnData');
        if (savedPawnData) {
            this.pawn = JSON.parse(savedPawnData);
            this.log("Loaded pawn data from localStorage.");
            // Offline progress calculation
            if (this.pawn.lastUpdate) {
                const offlineTime = (Date.now() - this.pawn.lastUpdate) / 1000; // seconds
                this.calculateOfflineProgress(offlineTime);
            }
        } else {
            this.pawn = JSON.parse(JSON.stringify(this.defaultPawnStats)); // Deep copy
            if (this.sharedGameData.playerName) {
                 this.pawn.name = this.sharedGameData.playerName;
            }
            this.log("No saved data found. Initialized new pawn.");
        }
        this.pawn.lastUpdate = Date.now();
    },

    savePawn: function() {
        if (this.pawn) {
            this.pawn.lastUpdate = Date.now();
            localStorage.setItem('pawnIdleGame_pawnData', JSON.stringify(this.pawn));
            this.log("Pawn data saved.", 'info', false); // Less verbose log
        }
    },

    startAutoSave: function() {
        this.saveInterval = setInterval(() => {
            this.savePawn();
        }, 30000); // Save every 30 seconds
    },

    // --- Game Loop & Actions ---
    startGameLoop: function() {
        this.lastTickTime = Date.now();
        this.gameLoopInterval = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - this.lastTickTime) / 1000; // seconds
            this.lastTickTime = now;
            this.updateGame(deltaTime);
        }, 1000); // Tick every second
    },

    updateGame: function(deltaTime) {
        // 1. Process current action
        if (this.pawn.currentAction !== "Idle" && this.pawn.currentActionDuration > 0) {
            this.pawn.currentActionProgress += deltaTime;
            if (this.pawn.currentActionProgress >= this.pawn.currentActionDuration) {
                this.completeAction(this.pawn.currentActionDetails);
            }
        }

        // 2. Passive effects (e.g., regen in town)
        const locationData = this.locationsDB[this.pawn.currentLocation];
        if (locationData && locationData.passiveEffect) {
            if (locationData.passiveEffect.energyRegenPerSecond) {
                this.pawn.currentEnergy = Math.min(this.pawn.maxEnergy, this.pawn.currentEnergy + locationData.passiveEffect.energyRegenPerSecond * deltaTime);
            }
            if (locationData.passiveEffect.healthRegenPerSecond) {
                this.pawn.currentHealth = Math.min(this.pawn.maxHealth, this.pawn.currentHealth + locationData.passiveEffect.healthRegenPerSecond * deltaTime);
            }
        }
        
        // 3. Dungeon Progression (if in dungeon and not in combat/other action)
        if (this.pawn.currentLocation === "Dungeon" && this.pawn.currentAction === "Delving" && !this.pawn.dungeon.currentEncounter) {
             this.progressDungeonStep(deltaTime);
        }

        // 4. Check for level up
        this.checkLevelUp();

        // 5. Update UI
        this.updatePawnStatsUI();
        this.updateActionUI();
        this.updateLocationUI(); // Could be more specific if needed
        this.updateDungeonUI();
    },
    
    calculateOfflineProgress: function(offlineSeconds) {
        this.log(`Calculating offline progress for ${offlineSeconds.toFixed(0)} seconds...`);
        // This can be complex. Simplified version:
        // - Assume pawn was doing their currentAction or a default safe action.
        // - Grant a portion of resources/xp they might have gained.
        // - For example, if resting, restore energy/HP. If training, grant some XP.
        // - Avoid simulating combat unless you want to risk pawn death offline.

        let action = this.pawn.currentActionDetails;
        if (!action && this.pawn.currentLocation === "Town") { // Default to Town's passive
            const townData = this.locationsDB["Town"];
            if (townData && townData.passiveEffect) {
                if (townData.passiveEffect.energyRegenPerSecond) {
                     this.pawn.currentEnergy = Math.min(this.pawn.maxEnergy, this.pawn.currentEnergy + townData.passiveEffect.energyRegenPerSecond * offlineSeconds);
                }
                 this.log(`Offline: Restored energy.`, 'system');
            }
        } else if (action) {
            // Example: if they were on a long training session
            if (action.type === "training" && this.pawn.currentActionProgress < this.pawn.currentActionDuration) {
                const remainingActionTime = this.pawn.currentActionDuration - this.pawn.currentActionProgress;
                const timeSpentOfflineOnAction = Math.min(offlineSeconds, remainingActionTime);
                this.pawn.currentActionProgress += timeSpentOfflineOnAction;

                const schoolAction = this.locationsDB["School"].actions.find(a => a.id === action.id);
                if (schoolAction) {
                    const xpPortion = (timeSpentOfflineOnAction / schoolAction.duration) * schoolAction.xpGain;
                    this.pawn.experience += Math.floor(xpPortion);
                    this.log(`Offline: Gained ${Math.floor(xpPortion)} XP from training.`, 'system');

                    if (this.pawn.currentActionProgress >= this.pawn.currentActionDuration) {
                        this.completeAction(action, true); // Complete silently
                    }
                }
            }
        }
        this.checkLevelUp(); // Check for level ups from offline XP
        // Ensure HP/Energy are capped
        this.pawn.currentHealth = Math.min(this.pawn.maxHealth, this.pawn.currentHealth);
        this.pawn.currentEnergy = Math.min(this.pawn.maxEnergy, this.pawn.currentEnergy);
    },

    setAction: function(actionDetails, locationContext) {
        if (this.pawn.currentEnergy < (actionDetails.energyCost || 0)) {
            this.log("Not enough energy!", 'warning');
            return;
        }
        if (this.pawn.gold < (actionDetails.cost || 0)) {
            this.log("Not enough gold!", 'warning');
            return;
        }

        this.pawn.currentEnergy -= (actionDetails.energyCost || 0);
        this.pawn.gold -= (actionDetails.cost || 0);

        this.pawn.currentAction = actionDetails.name || "Working...";
        this.pawn.currentActionProgress = 0;
        this.pawn.currentActionDuration = actionDetails.duration || 0;
        this.pawn.currentActionDetails = actionDetails; // Store context
        this.pawn.currentActionDetails.locationContext = locationContext; // e.g. "School", "Inn"

        this.log(`Started action: ${this.pawn.currentAction}`);
        this.updateActionUI();
        this.updatePawnStatsUI();
    },

    completeAction: function(actionDetails, silent = false) {
        if (!silent) this.log(`Finished action: ${actionDetails.name}`);

        switch (actionDetails.locationContext) {
            case "Inn":
                this.pawn.currentHealth = Math.min(this.pawn.maxHealth, this.pawn.currentHealth + (actionDetails.healthRestored || 0));
                this.pawn.currentEnergy = Math.min(this.pawn.maxEnergy, this.pawn.currentEnergy + (actionDetails.energyRestored || 0));
                if (!silent) this.log(`Rested. HP +${actionDetails.healthRestored || 0}, Energy +${actionDetails.energyRestored || 0}.`, 'success');
                break;
            case "Hospital":
                if (actionDetails.healthRestored === "full") this.pawn.currentHealth = this.pawn.maxHealth;
                else this.pawn.currentHealth = Math.min(this.pawn.maxHealth, this.pawn.currentHealth + (actionDetails.healthRestored || 0));
                if (!silent) this.log(`Healed. HP is now ${this.pawn.currentHealth.toFixed(0)}.`, 'success');
                break;
            case "School":
                this.pawn.experience += actionDetails.xpGain || 0;
                // Potentially increase specific stat if actionDetails.stat is defined
                // this.pawn.stats[actionDetails.stat] += 1; // Or some other logic
                if (!silent) this.log(`Trained. Gained ${actionDetails.xpGain || 0} XP.`, 'success');
                this.checkLevelUp();
                break;
        }

        this.pawn.currentAction = "Idle";
        this.pawn.currentActionProgress = 0;
        this.pawn.currentActionDuration = 0;
        this.pawn.currentActionDetails = null;

        if (!silent) {
            this.updateActionUI();
            this.updatePawnStatsUI();
            this.renderCurrentLocationActions(); // Refresh actions, button might re-enable
        }
    },
    
    changeLocation: function(newLocationId) {
        if (this.pawn.currentAction !== "Idle" && this.pawn.currentActionDuration > 0) {
            this.log("Cannot change location while busy.", "warning");
            return;
        }
        if (this.locationsDB[newLocationId]) {
            this.pawn.currentLocation = newLocationId;
            this.log(`Moved to ${this.locationsDB[newLocationId].displayName}.`);
            this.updateLocationUI();
            this.renderCurrentLocationActions();
        } else {
            this.log(`Unknown location: ${newLocationId}`, "error");
        }
    },

    // --- Item & Inventory ---
    getItemData: function(itemId) {
        return this.itemsDB.find(item => item.id === itemId);
    },

    addItemToInventory: function(itemId, quantity = 1) {
        const itemData = this.getItemData(itemId);
        if (!itemData) {
            this.log(`Unknown item ID: ${itemId}`, 'error');
            return;
        }

        const existingItem = this.pawn.inventory.find(i => i.itemId === itemId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.pawn.inventory.push({ itemId, quantity });
        }
        this.log(`Added ${quantity}x ${itemData.name} to inventory.`, 'item');
        this.updateInventoryUI();
    },

    removeItemFromInventory: function(itemId, quantity = 1) {
        const itemIndex = this.pawn.inventory.findIndex(i => i.itemId === itemId);
        if (itemIndex > -1) {
            const item = this.pawn.inventory[itemIndex];
            item.quantity -= quantity;
            if (item.quantity <= 0) {
                this.pawn.inventory.splice(itemIndex, 1);
            }
            const itemData = this.getItemData(itemId);
            this.log(`Removed ${quantity}x ${itemData.name} from inventory.`, 'item');
            this.updateInventoryUI();
            return true;
        }
        return false;
    },

    equipItem: function(itemId) {
        const itemInInventory = this.pawn.inventory.find(i => i.itemId === itemId);
        if (!itemInInventory) {
            this.log("Item not in inventory.", "warning");
            return;
        }
        const itemData = this.getItemData(itemId);
        if (!itemData || !itemData.slot) {
            this.log("Item cannot be equipped.", "warning");
            return;
        }

        // Unequip current item in that slot, if any
        if (this.pawn.equipment[itemData.slot]) {
            this.unequipItem(itemData.slot, true); // Silent unequip
        }

        this.pawn.equipment[itemData.slot] = itemId;
        this.removeItemFromInventory(itemId, 1); // Remove one instance from inventory
        this.applyItemEffects(itemData);
        this.log(`Equipped ${itemData.name}.`, 'success');
        this.updateEquipmentUI();
        this.updatePawnStatsUI();
    },

    unequipItem: function(slot, silent = false) {
        const itemId = this.pawn.equipment[slot];
        if (!itemId) return;

        const itemData = this.getItemData(itemId);
        this.removeItemEffects(itemData);
        this.pawn.equipment[slot] = null;
        this.addItemToInventory(itemId, 1); // Add back to inventory
        if (!silent) this.log(`Unequipped ${itemData.name}.`, 'info');
        
        if (!silent) {
            this.updateEquipmentUI();
            this.updatePawnStatsUI();
        }
    },

    applyItemEffects: function(itemData) {
        if (!itemData.effects) return;
        for (const effect in itemData.effects) {
            if (this.pawn.stats.hasOwnProperty(effect)) {
                this.pawn.stats[effect] += itemData.effects[effect];
            } else if (effect === "maxHealth") {
                this.pawn.maxHealth += itemData.effects.maxHealth;
                this.pawn.currentHealth += itemData.effects.maxHealth; // Also increase current if max increases
            } else if (effect === "maxEnergy") {
                this.pawn.maxEnergy += itemData.effects.maxEnergy;
                this.pawn.currentEnergy += itemData.effects.maxEnergy;
            }
            // Add more specific effects if needed
        }
        this.pawn.currentHealth = Math.min(this.pawn.currentHealth, this.pawn.maxHealth); // Cap health
    },

    removeItemEffects: function(itemData) {
        if (!itemData.effects) return;
        for (const effect in itemData.effects) {
            if (this.pawn.stats.hasOwnProperty(effect)) {
                this.pawn.stats[effect] -= itemData.effects[effect];
            } else if (effect === "maxHealth") {
                this.pawn.maxHealth -= itemData.effects.maxHealth;
            } else if (effect === "maxEnergy") {
                this.pawn.maxEnergy -= itemData.effects.maxEnergy;
            }
        }
        this.pawn.currentHealth = Math.min(this.pawn.currentHealth, this.pawn.maxHealth);
        if (this.pawn.currentHealth <= 0) this.pawn.currentHealth = 1; // Don't let unequipping kill
    },
    
    useConsumable: function(itemId) {
        const itemInInventory = this.pawn.inventory.find(i => i.itemId === itemId);
        if (!itemInInventory) return;
        const itemData = this.getItemData(itemId);
        if (!itemData || itemData.type !== "consumable") return;

        if (itemData.effects.action === "heal") {
            this.pawn.currentHealth = Math.min(this.pawn.maxHealth, this.pawn.currentHealth + itemData.effects.value);
            this.log(`Used ${itemData.name}, healed for ${itemData.effects.value} HP.`, 'success');
        }
        // Add other consumable effects (e.g., energy restore, temporary buffs)

        this.removeItemFromInventory(itemId, 1);
        this.updatePawnStatsUI();
    },

    // --- Shop ---
    buyItemFromShop: function(itemIdToBuy) {
        const shopData = this.locationsDB["Shop"];
        const shopItemEntry = shopData.inventory.find(entry => entry.itemId === itemIdToBuy);
        if (!shopItemEntry) {
            this.log("Item not available in shop.", "warning");
            return;
        }
        const itemData = this.getItemData(itemIdToBuy);
        if (!itemData || itemData.buyCost === null) {
            this.log("Item cannot be bought.", "error");
            return;
        }

        if (this.pawn.gold < itemData.buyCost) {
            this.log("Not enough gold.", "warning");
            return;
        }
        if (shopItemEntry.stock === 0) {
            this.log(`${itemData.name} is out of stock.`, "warning");
            return;
        }

        this.pawn.gold -= itemData.buyCost;
        this.addItemToInventory(itemIdToBuy, 1);
        if (shopItemEntry.stock > 0) {
            shopItemEntry.stock--;
        }
        this.log(`Bought ${itemData.name} for ${itemData.buyCost} gold.`, 'success');
        this.updatePawnStatsUI();
        this.renderCurrentLocationActions(); // Re-render shop to update stock
    },

    sellItemToShop: function(itemIdToSell, quantity = 1) {
        const itemInInventory = this.pawn.inventory.find(i => i.itemId === itemIdToSell);
        if (!itemInInventory || itemInInventory.quantity < quantity) {
             this.log("Not enough items to sell.", "warning");
             return;
        }
        const itemData = this.getItemData(itemIdToSell);
        if (!itemData || itemData.sellValue === null) {
            this.log("This item cannot be sold.", "warning");
            return;
        }

        if (this.removeItemFromInventory(itemIdToSell, quantity)) {
            const totalSellValue = itemData.sellValue * quantity;
            this.pawn.gold += totalSellValue;
            this.log(`Sold ${quantity}x ${itemData.name} for ${totalSellValue} gold.`, 'success');
            this.updatePawnStatsUI();
            this.renderCurrentLocationActions(); // Re-render shop
        }
    },

    // --- Combat & Dungeon ---
    enterDungeon: function() {
        if (this.pawn.currentAction !== "Idle") {
            this.log("Cannot enter dungeon while busy.", "warning");
            return;
        }
        const dungeonLevelData = this.dungeonLevelsDB.find(dl => dl.level === this.pawn.dungeon.currentLevel);
        if (!dungeonLevelData) {
            this.log(`Dungeon level ${this.pawn.dungeon.currentLevel} data not found!`, 'error');
            return;
        }
        if (this.pawn.currentHealth < this.pawn.maxHealth * 0.25) { // Require at least 25% HP
            this.log("Too weak to enter the dungeon. Heal first.", "warning");
            return;
        }

        this.pawn.currentLocation = "Dungeon";
        this.pawn.currentAction = "Delving"; // Special action state for dungeon
        this.pawn.dungeon.progressInLevel = 0;
        this.pawn.dungeon.currentEncounter = null;
        this.log(`Entering ${dungeonLevelData.name}...`, "event");
        this.updateLocationUI();
        this.updateActionUI();
        this.renderCurrentLocationActions(); // Show dungeon-specific UI/actions
        this.updateDungeonUI();
    },

    progressDungeonStep: function(deltaTime) {
        // This function would be called by updateGame if pawn.currentAction is "Delving"
        // For simplicity, let's assume each "tick" in the dungeon is a step or an opportunity for an event.
        // deltaTime could be used for more fine-grained progress if steps took variable time.
        
        const currentLevelNum = this.pawn.dungeon.currentLevel;
        const levelData = this.dungeonLevelsDB.find(dl => dl.level === currentLevelNum);
        if (!levelData) return;

        // Basic step cost (energy)
        const energyCostPerStep = 1; // Example
        if (this.pawn.currentEnergy < energyCostPerStep) {
            this.log("Not enough energy to delve deeper. Resting a bit.", "warning");
            this.pawn.currentAction = "Resting in Dungeon"; // Special state, maybe slow regen
            // TODO: Implement logic for "Resting in Dungeon"
            this.updateActionUI();
            return;
        }
        this.pawn.currentEnergy -= energyCostPerStep;
        this.pawn.dungeon.progressInLevel++;
        this.log(`Delved deeper. Progress: ${this.pawn.dungeon.progressInLevel}/${levelData.stepsToComplete}`, 'event', false);

        // Check for loot on step
        if (levelData.lootOnStep) {
            levelData.lootOnStep.forEach(lootRule => {
                if (Math.random() < lootRule.chance) {
                    if (lootRule.type === "gold") {
                        const goldFound = Math.floor(Math.random() * (lootRule.max - lootRule.min + 1)) + lootRule.min;
                        if (goldFound > 0) {
                            this.pawn.gold += goldFound;
                            this.log(`Found ${goldFound} gold.`, 'item');
                        }
                    }
                    // Add other loot types like items if desired
                }
            });
        }
        
        // Check for encounter
        if (Math.random() < levelData.encounterChance) {
            this.initiateEncounter(levelData);
        } else if (this.pawn.dungeon.progressInLevel >= levelData.stepsToComplete) {
             // Check for boss if it's end of level
            if (levelData.boss && !this.pawn.dungeon.bossDefeatedThisRun) {
                this.initiateEncounter(levelData, true); // true for boss
            } else {
                this.completeDungeonLevel(levelData);
            }
        }
        this.updateDungeonUI();
        this.updatePawnStatsUI();
    },

    initiateEncounter: function(levelData, isBoss = false) {
        let enemyToSpawn;
        if (isBoss) {
            enemyToSpawn = this.enemiesDB.find(e => e.id === levelData.boss.enemyId);
        } else {
            // Weighted random enemy selection
            const totalWeight = levelData.enemies.reduce((sum, e) => sum + e.weight, 0);
            let randomPick = Math.random() * totalWeight;
            for (const enemyRule of levelData.enemies) {
                if (randomPick < enemyRule.weight) {
                    enemyToSpawn = this.enemiesDB.find(e => e.id === enemyRule.enemyId);
                    break;
                }
                randomPick -= enemyRule.weight;
            }
        }

        if (enemyToSpawn) {
            this.pawn.dungeon.currentEncounter = JSON.parse(JSON.stringify(enemyToSpawn)); // Deep copy
            this.pawn.dungeon.currentEncounter.currentHealth = this.pawn.dungeon.currentEncounter.health; // Initialize combat health
            this.pawn.currentAction = "In Combat";
            this.log(`Encountered a ${this.pawn.dungeon.currentEncounter.name}!`, 'combat_start');
            this.updateActionUI();
            this.updateDungeonUI(); // Show combat info
            this.renderCombatActions();
        }
    },
    
    handleCombatAction: function(actionType) { // e.g. "attack", "defend", "flee"
        if (!this.pawn.dungeon.currentEncounter || this.pawn.currentAction !== "In Combat") return;
        const enemy = this.pawn.dungeon.currentEncounter;

        // Player's turn
        if (actionType === "attack") {
            let playerDamage = Math.max(1, this.pawn.stats.strength - (enemy.defense || 0));
            // Add agility for hit/crit later
            enemy.currentHealth -= playerDamage;
            this.log(`You hit ${enemy.name} for ${playerDamage} damage. (${enemy.currentHealth}/${enemy.health})`, 'combat_player');
        } else if (actionType === "flee") {
            const fleeChance = 0.3 + (this.pawn.stats.agility - (enemy.agility || 0)) * 0.05;
            if (Math.random() < fleeChance) {
                this.log("Successfully fled from combat!", "combat_neutral");
                this.endCombat(false); // false = did not win
                return;
            } else {
                this.log("Failed to flee!", "combat_enemy");
            }
        }
        // Add "defend", "skill" options later

        if (enemy.currentHealth <= 0) {
            this.log(`${enemy.name} defeated!`, 'combat_win');
            this.endCombat(true); // true = player won
            return;
        }

        // Enemy's turn (simplified: enemy always attacks)
        let enemyDamage = Math.max(1, (enemy.attack || 0) - this.pawn.stats.defense);
        // Add agility for hit/dodge later
        this.pawn.currentHealth -= enemyDamage;
        this.log(`${enemy.name} hits you for ${enemyDamage} damage.`, 'combat_enemy');

        this.updatePawnStatsUI();
        this.updateDungeonUI(); // Update enemy health

        if (this.pawn.currentHealth <= 0) {
            this.pawn.currentHealth = 0;
            this.log("You have been defeated!", 'game_over');
            this.handleDefeat();
            return;
        }
        // Re-render combat actions for next turn
        this.renderCombatActions();
    },

    endCombat: function(playerWon) {
        const enemy = this.pawn.dungeon.currentEncounter;
        if (playerWon && enemy) {
            this.pawn.experience += enemy.xpReward || 0;
            this.log(`Gained ${enemy.xpReward || 0} XP.`, 'success');
            this.checkLevelUp();

            // Handle loot
            if (enemy.lootTable) {
                enemy.lootTable.forEach(loot => {
                    if (Math.random() < loot.chance) {
                        if (loot.type === "gold") {
                            const goldFound = Math.floor(Math.random() * (loot.max - loot.min + 1)) + loot.min;
                            this.pawn.gold += goldFound;
                            this.log(`Found ${goldFound} gold.`, 'item');
                        } else if (loot.type === "item") {
                            this.addItemToInventory(loot.itemId, 1);
                        }
                    }
                });
            }
            // If it was a boss
            const levelData = this.dungeonLevelsDB.find(dl => dl.level === this.pawn.dungeon.currentLevel);
            if (levelData && levelData.boss && levelData.boss.enemyId === enemy.id) {
                this.pawn.dungeon.bossDefeatedThisRun = true;
                 this.log(`Boss ${enemy.name} defeated!`, 'event');
            }

        }

        this.pawn.dungeon.currentEncounter = null;
        this.pawn.currentAction = "Delving"; // Return to delving
        this.updateActionUI();
        this.updateDungeonUI(); // Clear combat info
        this.renderCurrentLocationActions(); // Back to dungeon delve actions

        // If combat ended and level is now complete (e.g. boss was the last step)
        const levelData = this.dungeonLevelsDB.find(dl => dl.level === this.pawn.dungeon.currentLevel);
        if (levelData && this.pawn.dungeon.progressInLevel >= levelData.stepsToComplete) {
             if (levelData.boss && !this.pawn.dungeon.bossDefeatedThisRun && playerWon) {
                 // If boss was defeated just now, it counts for completion
             } else if (levelData.boss && !this.pawn.dungeon.bossDefeatedThisRun) {
                 // Still need to beat the boss if not just defeated
             } else {
                this.completeDungeonLevel(levelData);
             }
        }
    },
    
    completeDungeonLevel: function(levelData) {
        this.log(`Congratulations! You cleared ${levelData.name}!`, 'success_major');
        if (levelData.completionReward) {
            this.pawn.gold += levelData.completionReward.gold || 0;
            this.pawn.experience += levelData.completionReward.xp || 0;
            if(levelData.completionReward.gold) this.log(`Reward: ${levelData.completionReward.gold} gold.`, 'item');
            if(levelData.completionReward.xp) this.log(`Reward: ${levelData.completionReward.xp} XP.`, 'success');
            if (levelData.completionReward.items) {
                levelData.completionReward.items.forEach(itemRule => {
                    if (Math.random() < itemRule.chance) {
                        this.addItemToInventory(itemRule.itemId, 1);
                    }
                });
            }
        }
        this.pawn.dungeon.deepestLevelReached = Math.max(this.pawn.dungeon.deepestLevelReached, levelData.level);
        this.pawn.dungeon.currentLevel = levelData.level + 1; // Advance to next level
        this.pawn.dungeon.progressInLevel = 0;
        this.pawn.dungeon.bossDefeatedThisRun = false; // Reset for next level
        
        this.pawn.currentLocation = "DungeonGate"; // Or "Town"
        this.pawn.currentAction = "Idle";
        this.checkLevelUp();
        this.updateUI();
        this.changeLocation("DungeonGate"); // Force UI refresh for location
    },

    handleDefeat: function() {
        // Penalties: lose some gold, XP, or return to town with very low HP.
        const goldLost = Math.floor(this.pawn.gold * 0.25); // Lose 25% gold
        this.pawn.gold -= goldLost;
        this.log(`Lost ${goldLost} gold.`, "penalty");

        this.pawn.currentHealth = 1; // Barely alive
        this.pawn.currentEnergy = 0;
        this.pawn.currentLocation = "Hospital"; // Respawn at hospital or town
        this.pawn.currentAction = "Recovering"; // Special state, cannot do much
        this.pawn.currentActionDuration = 60; // Recover for 60 seconds
        this.pawn.currentActionProgress = 0;
        this.pawn.currentActionDetails = { name: "Recovering from Defeat", duration: 60, locationContext: "Hospital" };

        this.pawn.dungeon.currentEncounter = null; // Clear encounter

        this.log("You black out and wake up in town...", "event");
        this.updateAllUI();
        this.renderCurrentLocationActions();
        // Potentially call this.onFailure if defeat is game-ending for the GameManager sequence.
        // For an idle game, it's usually not.
    },

    // --- Player Progression ---
    checkLevelUp: function() {
        while (this.pawn.experience >= this.pawn.xpToNextLevel) {
            this.pawn.level++;
            this.pawn.experience -= this.pawn.xpToNextLevel;
            this.pawn.xpToNextLevel = Math.floor(this.pawn.xpToNextLevel * 1.25); // Increase XP for next level

            // Stat increases on level up (example)
            this.pawn.maxHealth += 10;
            this.pawn.currentHealth = this.pawn.maxHealth; // Full heal on level up
            this.pawn.maxEnergy += 5;
            this.pawn.currentEnergy = this.pawn.maxEnergy;
            this.pawn.stats.strength += 1;
            this.pawn.stats.defense += 1;
            if (this.pawn.level % 2 === 0) this.pawn.stats.agility += 1;
            if (this.pawn.level % 3 === 0) this.pawn.stats.intelligence += 1;

            this.log(`Reached Level ${this.pawn.level}! Stats increased. HP/Energy restored.`, 'level_up');
            this.updatePawnStatsUI(); // Update immediately after level up
        }
    },

    // --- UI Rendering & Updates ---
    renderBaseUI: function() {
        this.gameContainer.innerHTML = `
            <div id="pawn-idle-container">
                <div class="column" id="pawn-info-col">
                    <h2>Pawn: <span id="pawn-name-ui"></span></h2>
                    <div id="pawn-stats-ui"></div>
                    <div id="pawn-equipment-ui"></div>
                    <div id="pawn-inventory-ui"></div>
                </div>
                <div class="column" id="world-col">
                    <h2>Location: <span id="current-location-ui"></span></h2>
                    <div id="current-action-ui">Action: Idle</div>
                    <div id="location-actions-ui"></div>
                    <div id="dungeon-status-ui" style="display:none;"></div>
                </div>
                <div class="column" id="log-col">
                    <h2>Log</h2>
                    <div id="game-log-ui"></div>
                </div>
            </div>
            <button id="manual-save-btn">Save Game</button>
            <button id="quit-idle-game-btn">Quit to Menu (Saves)</button>
            <style>
                #pawn-idle-container { display: flex; flex-direction: row; gap: 15px; height: calc(100% - 40px); }
                .column { flex: 1; padding: 10px; background-color: #f0f0f0; border-radius: 5px; overflow-y: auto; }
                #log-col { flex: 1.5; }
                #game-log-ui { height: 300px; overflow-y: scroll; background: #fff; padding: 5px; border: 1px solid #ccc; font-size:0.9em}
                .log-message { margin-bottom: 3px; }
                .log-error { color: red; }
                .log-success { color: green; }
                .log-warning { color: orange; }
                .log-item { color: blue; }
                .log-event { color: purple; }
                .log-combat_start { color: darkred; font-weight: bold; }
                .log-combat_win { color: darkgreen; font-weight: bold; }
                .log-combat_player { color: navy; }
                .log-combat_enemy { color: crimson; }
                .log-combat_neutral { color: dimgray; }
                .log-level_up { color: gold; font-weight: bold; background-color: #333; padding: 2px;}
                .log-penalty { color: #FF4500; }
                .log-system { color: #777; font-style: italic;}
                .action-button, .item-button { display: block; margin: 5px 0; padding: 8px; background-color: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; width:95%;}
                .action-button:hover, .item-button:hover { background-color: #45a049; }
                .item-entry { margin-bottom: 5px; padding: 3px; border-bottom: 1px dashed #ccc; }
            </style>
        `;

        // Cache UI elements
        this.ui.pawnName = document.getElementById('pawn-name-ui');
        this.ui.statsDisplay = document.getElementById('pawn-stats-ui');
        this.ui.equipmentDisplay = document.getElementById('pawn-equipment-ui');
        this.ui.inventoryDisplay = document.getElementById('pawn-inventory-ui');
        this.ui.currentLocation = document.getElementById('current-location-ui');
        this.ui.currentAction = document.getElementById('current-action-ui');
        this.ui.locationActions = document.getElementById('location-actions-ui');
        this.ui.dungeonStatus = document.getElementById('dungeon-status-ui');
        this.ui.logDisplay = document.getElementById('game-log-ui');
        
        document.getElementById('manual-save-btn').addEventListener('click', () => this.savePawn());
        document.getElementById('quit-idle-game-btn').addEventListener('click', () => {
            this.savePawn();
            this.destroy(); // Clean up intervals etc.
            if(this.onComplete) this.onComplete({ status: "PawnIdleGameManuallyExited", pawnData: this.pawn });
        });
    },

    updateAllUI: function() {
        this.updatePawnStatsUI();
        this.updateEquipmentUI();
        this.updateInventoryUI();
        this.updateLocationUI();
        this.updateActionUI();
        this.renderCurrentLocationActions();
        this.updateDungeonUI();
    },

    updatePawnStatsUI: function() {
        if (!this.pawn || !this.ui.pawnName) return; // Not initialized yet
        this.ui.pawnName.textContent = `${this.pawn.name} (Lvl ${this.pawn.level})`;
        this.ui.statsDisplay.innerHTML = `
            HP: ${this.pawn.currentHealth.toFixed(0)} / ${this.pawn.maxHealth.toFixed(0)}<br>
            Energy: ${this.pawn.currentEnergy.toFixed(0)} / ${this.pawn.maxEnergy.toFixed(0)}<br>
            XP: ${this.pawn.experience} / ${this.pawn.xpToNextLevel}<br>
            Gold: ${this.pawn.gold}<br>
            Strength: ${this.pawn.stats.strength}<br>
            Defense: ${this.pawn.stats.defense}<br>
            Agility: ${this.pawn.stats.agility}<br>
            Intelligence: ${this.pawn.stats.intelligence}<br>
        `;
    },

    updateEquipmentUI: function() {
        if (!this.pawn || !this.ui.equipmentDisplay) return;
        let html = '<h4>Equipment:</h4>';
        for (const slot in this.pawn.equipment) {
            const itemId = this.pawn.equipment[slot];
            const itemData = itemId ? this.getItemData(itemId) : null;
            html += `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${itemData ? itemData.name : 'None'}`;
            if (itemData) {
                html += ` <button class="item-button" data-action="unequip" data-slot="${slot}" style="display:inline-block; width:auto; padding: 2px 5px; font-size:0.8em;">Unequip</button>`;
            }
            html += '<br>';
        }
        this.ui.equipmentDisplay.innerHTML = html;
        this.ui.equipmentDisplay.querySelectorAll('.item-button[data-action="unequip"]').forEach(btn => {
            btn.onclick = (e) => this.unequipItem(e.target.dataset.slot);
        });
    },

    updateInventoryUI: function() {
        if (!this.pawn || !this.ui.inventoryDisplay) return;
        let html = '<h4>Inventory:</h4>';
        if (this.pawn.inventory.length === 0) {
            html += '<i>Empty</i>';
        } else {
            this.pawn.inventory.forEach(invItem => {
                const itemData = this.getItemData(invItem.itemId);
                if (itemData) {
                    html += `<div class="item-entry">${itemData.name} (x${invItem.quantity})`;
                    if (itemData.type === "weapon" || itemData.type === "armor") {
                        html += ` <button class="item-button" data-action="equip" data-itemid="${invItem.itemId}" style="display:inline-block; width:auto; padding: 2px 5px; font-size:0.8em;">Equip</button>`;
                    } else if (itemData.type === "consumable") {
                         html += ` <button class="item-button" data-action="use" data-itemid="${invItem.itemId}" style="display:inline-block; width:auto; padding: 2px 5px; font-size:0.8em;">Use</button>`;
                    }
                    if (itemData.sellValue !== null && this.pawn.currentLocation === "Shop") { // Only show sell button in shop
                         html += ` <button class="item-button" data-action="sell" data-itemid="${invItem.itemId}" style="display:inline-block; width:auto; padding: 2px 5px; font-size:0.8em; background-color:#d9534f;">Sell (${itemData.sellValue}g)</button>`;
                    }
                    html += `</div>`;
                }
            });
        }
        this.ui.inventoryDisplay.innerHTML = html;
        this.ui.inventoryDisplay.querySelectorAll('.item-button[data-action="equip"]').forEach(btn => {
            btn.onclick = (e) => this.equipItem(e.target.dataset.itemid);
        });
        this.ui.inventoryDisplay.querySelectorAll('.item-button[data-action="use"]').forEach(btn => {
            btn.onclick = (e) => this.useConsumable(e.target.dataset.itemid);
        });
        if (this.pawn.currentLocation === "Shop") {
            this.ui.inventoryDisplay.querySelectorAll('.item-button[data-action="sell"]').forEach(btn => {
                btn.onclick = (e) => this.sellItemToShop(e.target.dataset.itemid, 1); // Sell one at a time for now
            });
        }
    },

    updateLocationUI: function() {
        if (!this.pawn || !this.ui.currentLocation) return;
        const locData = this.locationsDB[this.pawn.currentLocation];
        this.ui.currentLocation.textContent = locData ? locData.displayName : "Unknown";
        this.ui.dungeonStatus.style.display = this.pawn.currentLocation === "Dungeon" ? 'block' : 'none';
    },

    updateActionUI: function() {
        if (!this.pawn || !this.ui.currentAction) return;
        let actionText = `Action: ${this.pawn.currentAction}`;
        if (this.pawn.currentAction !== "Idle" && this.pawn.currentActionDuration > 0) {
            const progressPercent = (this.pawn.currentActionProgress / this.pawn.currentActionDuration) * 100;
            actionText += ` (${this.pawn.currentActionProgress.toFixed(0)}s / ${this.pawn.currentActionDuration.toFixed(0)}s) [${progressPercent.toFixed(0)}%]`;
        }
        this.ui.currentAction.textContent = actionText;
    },
    
    updateDungeonUI: function() {
        if (!this.pawn || !this.ui.dungeonStatus || this.pawn.currentLocation !== "Dungeon") {
            if(this.ui.dungeonStatus) this.ui.dungeonStatus.innerHTML = ""; // Clear if not in dungeon
            return;
        }
        const levelNum = this.pawn.dungeon.currentLevel;
        const levelData = this.dungeonLevelsDB.find(dl => dl.level === levelNum);
        if (!levelData) {
            this.ui.dungeonStatus.innerHTML = "Error: Current dungeon level data not found.";
            return;
        }

        let html = `<h3>${levelData.name}</h3>`;
        if (this.pawn.dungeon.currentEncounter) {
            const enemy = this.pawn.dungeon.currentEncounter;
            html += `<h4>Combat!</h4>`;
            html += `<div>${enemy.name} - HP: ${enemy.currentHealth}/${enemy.health}</div>`;
        } else {
            html += `Progress: ${this.pawn.dungeon.progressInLevel} / ${levelData.stepsToComplete} steps.<br>`;
            if (levelData.boss && !this.pawn.dungeon.bossDefeatedThisRun && this.pawn.dungeon.progressInLevel >= levelData.stepsToComplete) {
                html += "A powerful presence blocks the way! (Boss fight pending)"
            }
        }
        this.ui.dungeonStatus.innerHTML = html;
    },

    renderCurrentLocationActions: function() {
        if (!this.pawn || !this.ui.locationActions) return;
        const locId = this.pawn.currentLocation;
        const locData = this.locationsDB[locId];
        this.ui.locationActions.innerHTML = ''; // Clear previous actions

        if (this.pawn.currentAction !== "Idle" && this.pawn.currentActionDuration > 0 && this.pawn.currentAction !== "Delving" && this.pawn.currentAction !== "In Combat") {
            this.ui.locationActions.innerHTML = `<p>Busy with current action...</p>`;
            return;
        }
        
        if (this.pawn.currentAction === "Recovering") {
             this.ui.locationActions.innerHTML = `<p>Recovering from defeat...</p>`;
            return;
        }


        if (locData) {
            // Generic navigation actions (if defined in Town usually)
            if (locId === "Town" && locData.actions) {
                locData.actions.forEach(actionKey => {
                    const targetLocationId = actionKey.substring(4); // "GoToInn" -> "Inn"
                    const targetLocationData = this.locationsDB[targetLocationId];
                    if (targetLocationData) {
                        const btn = document.createElement('button');
                        btn.classList.add('action-button');
                        btn.textContent = `Go to ${targetLocationData.displayName}`;
                        btn.onclick = () => this.changeLocation(targetLocationId);
                        this.ui.locationActions.appendChild(btn);
                    } else if (actionKey === "GoToDungeonGate") { // Special case for dungeon
                        const btn = document.createElement('button');
                        btn.classList.add('action-button');
                        btn.textContent = `Go to Dungeon Entrance`;
                        btn.onclick = () => this.changeLocation("DungeonGate");
                        this.ui.locationActions.appendChild(btn);
                    }
                });
            }

            // Specific actions for the location
            if (locData.actions && locId !== "Town") { // Town handles nav separately above
                 if (Array.isArray(locData.actions)) { // For Inn, Hospital, School
                    locData.actions.forEach(action => {
                        const btn = document.createElement('button');
                        btn.classList.add('action-button');
                        btn.textContent = `${action.name} (${action.cost}g, ${action.duration}s)`;
                        btn.title = action.description || "";
                        btn.onclick = () => this.setAction(action, locId);
                        this.ui.locationActions.appendChild(btn);
                    });
                }
            }
            
            // Dungeon Gate specific
            if (locId === "DungeonGate") {
                const btn = document.createElement('button');
                btn.classList.add('action-button');
                const nextLevelToShow = this.pawn.dungeon.deepestLevelReached + 1;
                const actualNextLevel = this.dungeonLevelsDB.find(l => l.level === this.pawn.dungeon.currentLevel) ? this.pawn.dungeon.currentLevel : nextLevelToShow;
                btn.textContent = `Enter Dungeon (Level ${actualNextLevel})`;
                btn.onclick = () => this.enterDungeon();
                this.ui.locationActions.appendChild(btn);
            }

            // Shop specific
            if (locId === "Shop") {
                let shopHtml = '<h4>Buy Items:</h4>';
                locData.inventory.forEach(shopItem => {
                    const itemData = this.getItemData(shopItem.itemId);
                    if (itemData) {
                        shopHtml += `<div class="item-entry">${itemData.name} - ${itemData.buyCost}g (Stock: ${shopItem.stock === -1 ? 'ထ' : shopItem.stock})
                                     <button class="item-button shop-buy-btn" data-itemid="${itemData.id}" style="display:inline-block; width:auto; padding: 2px 5px; font-size:0.8em;" ${shopItem.stock === 0 ? 'disabled' : ''}>Buy</button>
                                     </div>`;
                    }
                });
                shopHtml += '<h4>Sell Items (from your inventory):</h4>'; // Placeholder, sell is on inventory items
                this.ui.locationActions.innerHTML = shopHtml;
                this.ui.locationActions.querySelectorAll('.shop-buy-btn').forEach(btn => {
                    btn.onclick = (e) => this.buyItemFromShop(e.target.dataset.itemid);
                });
                this.updateInventoryUI(); // Re-render inventory to show sell buttons if in shop
            }

            // Back to Town button for sub-locations
            if (locId !== "Town" && locId !== "Dungeon" && locId !== "DungeonGate") {
                const btn = document.createElement('button');
                btn.classList.add('action-button');
                btn.textContent = `Back to Town Square`;
                btn.style.marginTop = "20px";
                btn.style.backgroundColor = "#6c757d";
                btn.onclick = () => this.changeLocation("Town");
                this.ui.locationActions.appendChild(btn);
            }
        }
        
        // If in Dungeon and not in combat, show "Leave Dungeon"
        if (locId === "Dungeon" && !this.pawn.dungeon.currentEncounter) {
            const btn = document.createElement('button');
            btn.classList.add('action-button');
            btn.textContent = "Leave Dungeon";
            btn.style.backgroundColor = "#d9534f"; // Reddish
            btn.onclick = () => {
                this.log("You decide to leave the dungeon.", "event");
                this.pawn.currentLocation = "DungeonGate";
                this.pawn.currentAction = "Idle";
                this.updateLocationUI();
                this.updateActionUI();
                this.renderCurrentLocationActions();
            };
            this.ui.locationActions.appendChild(btn);
        }
    },
    
    renderCombatActions: function() {
        if (!this.pawn || !this.ui.locationActions || !this.pawn.dungeon.currentEncounter) {
            this.renderCurrentLocationActions(); // Fallback if not in combat state
            return;
        }
        this.ui.locationActions.innerHTML = `
            <h4>Combat Actions:</h4>
            <button class="action-button combat-action-btn" data-combat="attack">Attack</button>
            <button class="action-button combat-action-btn" data-combat="flee">Attempt to Flee</button>
            `;
        this.ui.locationActions.querySelectorAll('.combat-action-btn').forEach(btn => {
            btn.onclick = (e) => this.handleCombatAction(e.target.dataset.combat);
        });
    },

    log: function(message, type = 'info', toUI = true) {
        console.log(`[PawnIdleGame] [${type.toUpperCase()}] ${message}`);
        if (toUI && this.ui.logDisplay) {
            const logEntry = document.createElement('div');
            logEntry.classList.add('log-message', `log-${type}`);
            logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`; // Use innerHTML to render potential item links or bolding
            this.ui.logDisplay.appendChild(logEntry);
            // Auto-scroll to bottom
            this.ui.logDisplay.scrollTop = this.ui.logDisplay.scrollHeight;

            // Limit log entries
            const maxLogEntries = 100;
            while (this.ui.logDisplay.children.length > maxLogEntries) {
                this.ui.logDisplay.removeChild(this.ui.logDisplay.firstChild);
            }
        }
    }
};
