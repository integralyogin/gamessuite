// craftingSystem.js
// Crafting system for bitCraft.js v0.03

const CraftingSystem = {
    activeCrafts: [], // Currently crafting items

    // Start crafting an item
    startCrafting: function(unit, recipeId, workbench = null) {
        const recipe = GameConfig.getRecipe(recipeId);
        if (!recipe) {
            console.warn(`Recipe ${recipeId} not found`);
            return false;
        }

        // Check if workbench is required
        if (recipe.workbench && !workbench) {
            console.log("This recipe requires a workbench");
            return false;
        }

        // Check if unit has required materials
        if (!InventorySystem.hasItems(unit.inventory, recipe.materials)) {
            console.log("Not enough materials for crafting");
            return false;
        }

        // Consume materials
        if (!InventorySystem.consumeItems(unit.inventory, recipe.materials)) {
            console.log("Failed to consume materials");
            return false;
        }

        // Start crafting
        const craft = {
            id: Math.random().toString(36).substr(2, 9),
            recipe: recipe,
            crafter: unit,
            workbench: workbench,
            timeRemaining: recipe.craftTime,
            totalTime: recipe.craftTime
        };

        this.activeCrafts.push(craft);
        unit.currentCraft = craft;
        unit.task = 'crafting';

        console.log(`Started crafting ${recipe.name}`);
        return true;
    },

    // Update all active crafts
    update: function() {
        for (let i = this.activeCrafts.length - 1; i >= 0; i--) {
            const craft = this.activeCrafts[i];
            craft.timeRemaining--;

            if (craft.timeRemaining <= 0) {
                this.completeCraft(craft);
                this.activeCrafts.splice(i, 1);
            }
        }
    },

    // Complete a craft
    completeCraft: function(craft) {
        const recipe = craft.recipe;
        const crafter = craft.crafter;

        // Create result item
        const resultItem = ItemSystem.createItem(recipe.result.item, recipe.result.quantity);
        
        // Add to inventory
        const remaining = InventorySystem.addItem(crafter.inventory, resultItem);
        if (remaining > 0) {
            console.log(`Inventory full! Lost ${remaining} ${resultItem.name}`);
        }

        // Clear crafting state
        crafter.currentCraft = null;
        crafter.task = 'idle';

        console.log(`Completed crafting ${recipe.name} - Created ${resultItem.name}`);

        // Visual effect
        if (typeof MagicSystem !== 'undefined') {
            for (let i = 0; i < 10; i++) {
                MagicSystem.effects.push({
                    type: 'particle',
                    x: crafter.x,
                    y: crafter.y,
                    size: Math.random() * 3 + 1,
                    life: 30,
                    color: `rgba(255, 215, 0, ${Math.random() * 0.5 + 0.5})`,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.5) * 3
                });
            }
        }
    },

    // Cancel crafting
    cancelCraft: function(craft) {
        const recipe = craft.recipe;
        const crafter = craft.crafter;

        // Return materials (partial refund based on progress)
        const progress = 1 - (craft.timeRemaining / craft.totalTime);
        const refundRate = Math.max(0.5, 1 - progress); // At least 50% refund

        for (const material of recipe.materials) {
            const refundQuantity = Math.floor(material.quantity * refundRate);
            if (refundQuantity > 0) {
                const refundItem = ItemSystem.createItem(material.item, refundQuantity);
                InventorySystem.addItem(crafter.inventory, refundItem);
            }
        }

        // Clear crafting state
        crafter.currentCraft = null;
        crafter.task = 'idle';

        // Remove from active crafts
        const index = this.activeCrafts.indexOf(craft);
        if (index >= 0) {
            this.activeCrafts.splice(index, 1);
        }

        console.log(`Cancelled crafting ${recipe.name}`);
    },

    // Get available recipes for a unit
    getAvailableRecipes: function(unit, workbench = null) {
        const available = [];
        
        for (const recipeId in GameConfig.recipes) {
            const recipe = GameConfig.recipes[recipeId];
            
            // Check workbench requirement
            if (recipe.workbench && !workbench) continue;
            
            // Check if unit has materials
            const canCraft = InventorySystem.hasItems(unit.inventory, recipe.materials);
            
            available.push({
                recipe: recipe,
                canCraft: canCraft,
                materials: recipe.materials.map(mat => ({
                    ...mat,
                    available: InventorySystem.countItem(unit.inventory, mat.item)
                }))
            });
        }
        
        return available;
    },

    // Get crafting progress for a unit
    getCraftingProgress: function(unit) {
        if (!unit.currentCraft) return null;
        
        const craft = unit.currentCraft;
        const progress = 1 - (craft.timeRemaining / craft.totalTime);
        
        return {
            recipe: craft.recipe,
            progress: progress,
            timeRemaining: craft.timeRemaining,
            totalTime: craft.totalTime
        };
    },

    // Place a crafted structure
    placeStructure: function(unit, itemId, position, gameObjects) {
        const item = InventorySystem.findItem(unit.inventory, itemId);
        if (!item) {
            console.log("Item not found in inventory");
            return false;
        }

        const itemConfig = GameConfig.getItem(itemId);
        if (!itemConfig || itemConfig.type !== 'placeable') {
            console.log(`Item ${itemId} is not placeable`);
            return false;
        }

        // Create the structure entity using the item ID as entity type
        const structure = GameConfig.createEntity(itemId, {
            id: `${itemId}_${Math.random().toString(36).substr(2, 9)}`,
            x: position.x,
            y: position.y
        });

        // Add inventory to storage structures
        if (itemId === 'chest') {
            const entityConfig = GameConfig.getEntityConfig('chest');
            structure.inventory = InventorySystem.createInventory(entityConfig.inventorySlots || 30);
        }

        // Remove item from inventory
        InventorySystem.removeItem(unit.inventory, item.slot, 1);

        // Add to game objects
        gameObjects.push(structure);

        console.log(`Placed ${itemConfig.name} at (${Math.round(position.x)}, ${Math.round(position.y)})`);
        return structure;
    }
};


