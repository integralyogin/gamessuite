// gameConfig.js
// Data-driven configuration system for bitCraft.js v0.02

const GameConfig = {
    // Game settings
    settings: {
        version: "0.02",
        targetFPS: 60,
        maxEntities: 1000,
        debugMode: false
    },

    // Entity types and their properties
    entityTypes: {
        player_unit: {
            size: 16,
            color: '#00ff00',
            speed: 2.5,
            health: 100,
            maxHealth: 100,
            mana: 100,
            maxMana: 100,
            manaRegen: 0.15,
            capacity: 12,
            gatherSpeed: 50, // frames per resource
            pixelPattern: 'solid'
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
            size: 20,
            color: '#8B4513',
            health: 60,
            maxHealth: 60,
            pixelPattern: 'solid'
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
            damage: 12,
            pixelPattern: 'turret'
        }
    },

    // World generation parameters
    worldGen: {
        width: 1200,
        height: 800,
        treeCount: 12,
        rockCount: 10,
        dummyCount: 4,
        grassCount: 20,
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
        pixelSize: 2 // Enhanced pixel rendering
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


