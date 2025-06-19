// gameConfig.js
// Enhanced data-driven configuration system for bitCraft.js v0.04

const GameConfig = {
    // Game settings
    settings: {
        version: '0.04',
        debugMode: false,
        maxEntities: 1000
    },

    // Entity types and their properties
    entityTypes: {
        player_unit: {
            size: 12,
            color: '#00ff00',
            health: 100,
            maxHealth: 100,
            mana: 50,
            maxMana: 50,
            manaRegen: 0.1,
            hpRegen: 0.05,
            speed: 2,
            inventorySlots: 20,
            damage: 15,
            attackSpeed: 45,
            attackRange: 25,
            armor: 2,
            magicResistance: 0.1,
            pixelPattern: 'player',
            spells: ['lightningBolt', 'teleport', 'ballLightning', 'fireball', 'heal', 'shield']
        },
        tree: {
            size: 20,
            color: '#228B22',
            trunkColor: '#654321',
            leafColor: '#2E8B57',
            wood: 12,
            maxWood: 12,
            pixelPattern: 'tree'
        },
        rock: {
            size: 18,
            color: '#696969',
            stone: 10,
            maxStone: 10,
            pixelPattern: 'solid'
        },
        dummy: {
            size: 16,
            color: '#8B4513',
            health: 80,
            maxHealth: 80,
            hpRegen: 0.02,
            damage: 8,
            attackSpeed: 60,
            attackRange: 20,
            armor: 1,
            magicResistance: 0.05,
            pixelPattern: 'dummy'
        },
        grass: {
            size: 12,
            color: '#32CD32',
            pixelPattern: 'sparse'
        },
        lightningTurret: {
            size: 20,
            color: '#9400D3',
            health: 120,
            maxHealth: 120,
            attackSpeed: 100,
            range: 160,
            damage: 18,
            attackRange: 160,
            armor: 5,
            magicResistance: 0.3,
            pixelPattern: 'turret'
        },
        
        goblin: {
            size: 14,
            color: '#228B22',
            health: 40,
            maxHealth: 40,
            mana: 20,
            maxMana: 20,
            manaRegen: 0.05,
            hpRegen: 0.02,
            speed: 1.5,
            damage: 12,
            attackSpeed: 50,
            attackRange: 20,
            armor: 1,
            magicResistance: 0.05,
            pixelPattern: 'goblin',
            isEnemy: true,
            aggroRange: 80,
            spells: [] // Remove magic for now, melee only
        },
        
        chest: {
            size: 16,
            color: '#8B4513',
            inventorySlots: 30,
            pixelPattern: 'chest'
        },
        workbench: {
            size: 24,
            color: '#654321',
            pixelPattern: 'workbench'
        }
    },

    // Item definitions
    items: {
        // Raw materials
        wood: {
            id: 'wood',
            name: 'Wood',
            type: 'material',
            stackSize: 50,
            color: '#8B4513',
            description: 'Basic building material from trees'
        },
        stone: {
            id: 'stone',
            name: 'Stone',
            type: 'material',
            stackSize: 50,
            color: '#696969',
            description: 'Sturdy material for construction'
        },
        
        // Crafted materials
        plank: {
            id: 'plank',
            name: 'Wood Plank',
            type: 'material',
            stackSize: 30,
            color: '#DEB887',
            description: 'Processed wood for advanced crafting'
        },
        brick: {
            id: 'brick',
            name: 'Stone Brick',
            type: 'material',
            stackSize: 30,
            color: '#A0522D',
            description: 'Refined stone for sturdy construction'
        },
        
        // Tools
        axe: {
            id: 'axe',
            name: 'Wooden Axe',
            type: 'tool',
            stackSize: 1,
            color: '#8B4513',
            durability: 100,
            maxDurability: 100,
            gatherBonus: 2,
            description: 'Increases wood gathering efficiency'
        },
        pickaxe: {
            id: 'pickaxe',
            name: 'Stone Pickaxe',
            type: 'tool',
            stackSize: 1,
            color: '#696969',
            durability: 150,
            maxDurability: 150,
            gatherBonus: 2,
            description: 'Increases stone gathering efficiency'
        },
        
        // Equipment
        staff: {
            id: 'staff',
            name: 'Wooden Staff',
            type: 'weapon',
            stackSize: 1,
            color: '#8B4513',
            manaBonus: 20,
            spellPowerBonus: 1.2,
            damage: 5,
            description: 'Increases mana and spell effectiveness'
        },
        
        // Combat weapons
        sword: {
            id: 'sword',
            name: 'Iron Sword',
            type: 'weapon',
            stackSize: 1,
            color: '#C0C0C0',
            damage: 12,
            damageBonus: 1.3,
            durability: 200,
            maxDurability: 200,
            description: 'A sturdy iron sword for combat'
        },
        bow: {
            id: 'bow',
            name: 'Wooden Bow',
            type: 'weapon',
            stackSize: 1,
            color: '#8B4513',
            damage: 8,
            attackRange: 80,
            durability: 150,
            maxDurability: 150,
            description: 'Ranged weapon for distant combat'
        },
        
        // Armor
        shield: {
            id: 'shield',
            name: 'Wooden Shield',
            type: 'armor',
            stackSize: 1,
            color: '#654321',
            armorBonus: 3,
            blockChance: 0.2,
            durability: 120,
            maxDurability: 120,
            description: 'Provides protection and chance to block attacks'
        },
        
        // Consumables
        healthPotion: {
            id: 'healthPotion',
            name: 'Health Potion',
            type: 'consumable',
            stackSize: 10,
            color: '#FF0000',
            healAmount: 50,
            description: 'Restores 50 health when consumed'
        },
        manaPotion: {
            id: 'manaPotion',
            name: 'Mana Potion',
            type: 'consumable',
            stackSize: 10,
            color: '#0000FF',
            manaAmount: 40,
            description: 'Restores 40 mana when consumed'
        },
        
        // Placeable structures
        chest: {
            id: 'chest',
            name: 'Storage Chest',
            type: 'placeable',
            stackSize: 1,
            color: '#8B4513',
            description: 'Provides additional storage space'
        },
        workbench: {
            id: 'workbench',
            name: 'Workbench',
            type: 'placeable',
            stackSize: 1,
            color: '#654321',
            description: 'Enables advanced crafting recipes'
        }
    },

    // Crafting recipes
    recipes: {
        plank: {
            id: 'plank',
            name: 'Wood Plank',
            result: { item: 'plank', quantity: 2 },
            materials: [
                { item: 'wood', quantity: 1 }
            ],
            craftTime: 60,
            workbench: false
        },
        brick: {
            id: 'brick',
            name: 'Stone Brick',
            result: { item: 'brick', quantity: 2 },
            materials: [
                { item: 'stone', quantity: 1 }
            ],
            craftTime: 80,
            workbench: false
        },
        axe: {
            id: 'axe',
            name: 'Wooden Axe',
            result: { item: 'axe', quantity: 1 },
            materials: [
                { item: 'wood', quantity: 3 },
                { item: 'stone', quantity: 1 }
            ],
            craftTime: 120,
            workbench: true
        },
        pickaxe: {
            id: 'pickaxe',
            name: 'Stone Pickaxe',
            result: { item: 'pickaxe', quantity: 1 },
            materials: [
                { item: 'stone', quantity: 3 },
                { item: 'wood', quantity: 2 }
            ],
            craftTime: 150,
            workbench: true
        },
        staff: {
            id: 'staff',
            name: 'Wooden Staff',
            result: { item: 'staff', quantity: 1 },
            materials: [
                { item: 'plank', quantity: 3 },
                { item: 'stone', quantity: 1 }
            ],
            craftTime: 200,
            workbench: true
        },
        healthPotion: {
            id: 'healthPotion',
            name: 'Health Potion',
            result: { item: 'healthPotion', quantity: 1 },
            materials: [
                { item: 'wood', quantity: 1 }
            ],
            craftTime: 100,
            workbench: false
        },
        manaPotion: {
            id: 'manaPotion',
            name: 'Mana Potion',
            result: { item: 'manaPotion', quantity: 1 },
            materials: [
                { item: 'stone', quantity: 1 }
            ],
            craftTime: 100,
            workbench: false
        },
        sword: {
            id: 'sword',
            name: 'Iron Sword',
            result: { item: 'sword', quantity: 1 },
            materials: [
                { item: 'brick', quantity: 3 },
                { item: 'plank', quantity: 1 }
            ],
            craftTime: 300,
            workbench: true
        },
        bow: {
            id: 'bow',
            name: 'Wooden Bow',
            result: { item: 'bow', quantity: 1 },
            materials: [
                { item: 'plank', quantity: 2 },
                { item: 'wood', quantity: 1 }
            ],
            craftTime: 240,
            workbench: true
        },
        shield: {
            id: 'shield',
            name: 'Wooden Shield',
            result: { item: 'shield', quantity: 1 },
            materials: [
                { item: 'plank', quantity: 3 },
                { item: 'wood', quantity: 2 }
            ],
            craftTime: 200,
            workbench: true
        },
        chest: {
            id: 'chest',
            name: 'Storage Chest',
            result: { item: 'chest', quantity: 1 },
            materials: [
                { item: 'plank', quantity: 4 }
            ],
            craftTime: 180,
            workbench: true,
            placeable: true
        },
        workbench: {
            id: 'workbench',
            name: 'Workbench',
            result: { item: 'workbench', quantity: 1 },
            materials: [
                { item: 'plank', quantity: 6 },
                { item: 'stone', quantity: 2 }
            ],
            craftTime: 240,
            workbench: false,
            placeable: true
        }
    },

    // World generation parameters
    worldGen: {
        width: 1200,
        height: 800,
        treeCount: 15,
        rockCount: 12,
        dummyCount: 4,
        grassCount: 25,
        playerUnits: 2
    },

    // Input configuration
    input: {
        panSpeed: 6,
        zoomSpeed: 0.12,
        minZoom: 0.3,
        maxZoom: 4,
        doubleClickTime: 300,
        dragThreshold: 5
    },

    // Visual settings
    graphics: {
        backgroundColor: '#0d0d0d',
        selectionColor: '#ffff00',
        selectionWidth: 2,
        healthBarHeight: 4,
        tooltipFont: '12px Courier New',
        pixelSize: 2
    },

    // Performance settings
    performance: {
        maxParticles: 200,
        cullDistance: 1000,
        updateBatches: 10
    }
};

// Utility functions for configuration
GameConfig.getEntityConfig = function(type) {
    return this.entityTypes[type] || {};
};

GameConfig.createEntity = function(type, overrides = {}) {
    const config = this.getEntityConfig(type);
    return {
        type: type,
        ...config,
        ...overrides,
        id: overrides.id || `${type}_${Math.random().toString(36).substr(2, 9)}`
    };
};

GameConfig.getItem = function(itemId) {
    return this.items[itemId] || null;
};

GameConfig.getRecipe = function(recipeId) {
    return this.recipes[recipeId] || null;
};


