// js/bitCraft.js
// Enhanced foundation for a 2D strategy game.
// Version 0.03: Basic Inventory & Crafting (FIXED)

const bitCraftGame = {
    id: 'bitCraftGame',
    container: null,
    successCallback: null,
    failureCallback: null,

    // =================================================================================
    // --- GAME STATE ---
    // =================================================================================
    canvas: null,
    sideMenu: null,
    ctx: null,
    gameLoopId: null,
    lastFrameTime: 0,
    deltaTime: 0,
    
    gameObjects: [],
    playerUnits: [],
    turrets: [], 
    summons: [], 
    selectedEntities: [], 
    hoveredObject: null,

    camera: {
        x: 0, y: 0, zoom: 1, isFollowing: false,
        dragStart: { x: 0, y: 0 },
        targetX: 0, targetY: 0, smoothing: 0.1
    },
    
    input: {
        isSelecting: false, isPanning: false,
        dragStart: { x: 0, y: 0 }, mousePos: { x: 0, y: 0 },
        keys: new Set(),
        targetingMode: null,
        lastClickTime: 0,
        clickCount: 0,
        attackMode: false
    },

    // UI State
    ui: {
        showInventory: false,
        showCrafting: false,
        selectedInventorySlot: -1,
        placingItem: null,
        draggedItem: null,
        dragStartSlot: -1,
        dragStartContainer: null, // 'inventory' or 'chest'
        openChest: null
    },

    boundHandlers: {},
    performance: {
        frameCount: 0,
        lastFPSUpdate: 0,
        currentFPS: 0
    },

    // =================================================================================
    // --- INITIALIZATION ---
    // =================================================================================
    init: function(container, successCallback, failureCallback) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        
        console.log(`bitCraftGame v${GameConfig.settings.version}: Basic Inventory & Crafting (FIXED) - Initializing.`);
        this.render();
        this.startGame();
    },

    render: function() {
        this.container.innerHTML = `
            <div id="bitcraft-container" style="position: relative; width: 100%; height: 100%; display: flex; font-family: 'Courier New', Courier, monospace;">
                <canvas id="bitcraft-canvas" style="background-color: ${GameConfig.graphics.backgroundColor}; cursor: default; flex-grow: 1; image-rendering: pixelated;"></canvas>
                <div id="bitcraft-side-menu" style="width: 320px; height: 100%; background-color: #1a1a1a; border-left: 2px solid #333; color: #fff; padding: 15px; box-sizing: border-box; display: none; flex-shrink: 0; overflow-y: auto;">
                    <div id="side-menu-content">Details will appear here.</div>
                    <div id="performance-info" style="position: absolute; bottom: 40px; right: 10px; font-size: 10px; color: #666;"></div>
                    <button id="bitcraft-exit-btn" style="position: absolute; bottom: 10px; right: 10px; padding: 5px 10px; font-size: 12px; cursor: pointer; background-color: #522; border: 1px solid #a44; color: #fff;">Exit</button>
                </div>
                
                <!-- Inventory UI -->
                <div id="inventory-ui" style="position: absolute; top: 50px; left: 50px; background: rgba(0,0,0,0.9); border: 2px solid #333; padding: 15px; color: #fff; font-family: 'Courier New', Courier, monospace; display: none; max-width: 400px;">
                    <h3 style="margin: 0 0 10px 0; color: #0f0;">Inventory</h3>
                    <div id="inventory-grid" style="display: grid; grid-template-columns: repeat(5, 40px); gap: 2px; margin-bottom: 10px;"></div>
                    <div id="inventory-info" style="font-size: 12px; color: #888;"></div>
                </div>
                
                <!-- Chest UI -->
                <div id="chest-ui" style="position: absolute; top: 50px; right: 350px; background: rgba(0,0,0,0.9); border: 2px solid #333; padding: 15px; color: #fff; font-family: 'Courier New', Courier, monospace; display: none; max-width: 400px;">
                    <h3 id="chest-title" style="margin: 0 0 10px 0; color: #0f0;">Storage Chest</h3>
                    <div id="chest-grid" style="display: grid; grid-template-columns: repeat(6, 40px); gap: 2px; margin-bottom: 10px;"></div>
                    <div id="chest-info" style="font-size: 12px; color: #888;"></div>
                    <button id="close-chest-btn" style="margin-top: 10px; padding: 5px 10px; background: #333; border: 1px solid #666; color: #fff; cursor: pointer;">Close</button>
                </div>
                
                <!-- Crafting UI -->
                <div id="crafting-ui" style="position: absolute; top: 50px; right: 50px; background: rgba(0,0,0,0.9); border: 2px solid #333; padding: 15px; color: #fff; font-family: 'Courier New', Courier, monospace; display: none; max-width: 350px;">
                    <h3 style="margin: 0 0 10px 0; color: #0f0;">Crafting</h3>
                    <div id="recipe-list" style="max-height: 300px; overflow-y: auto;"></div>
                </div>
                
                <!-- Drag Preview -->
                <div id="drag-preview" style="position: absolute; pointer-events: none; display: none; z-index: 1000; width: 38px; height: 38px; border: 1px solid #fff; opacity: 0.8;"></div>
            </div>
        `;
        
        document.getElementById('bitcraft-exit-btn').onclick = () => this.successCallback({ message: 'Exited bitCraft v0.04 (Combat & Magic)' });
        
        const sideMenu = document.getElementById('bitcraft-side-menu');
        sideMenu.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.target && e.target.dataset.action) {
                const action = e.target.dataset.action;
                const value = e.target.dataset.value;
                if (action === 'activate-spell') {
                    this.activateTargetingMode(value, 'spell');
                } else if (action === 'activate-build') {
                    this.activateTargetingMode(value, 'build');
                } else if (action === 'use-item') {
                    this.useInventoryItem(parseInt(value));
                } else if (action === 'craft-item') {
                    this.startCrafting(value);
                }
            }
        });

        // Fixed Inventory UI event handlers
        const inventoryUI = document.getElementById('inventory-ui');
        inventoryUI.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.target.dataset.slot !== undefined) {
                this.handleInventoryMouseDown(parseInt(e.target.dataset.slot), e);
            }
        });

        inventoryUI.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target.dataset.slot !== undefined) {
                this.handleInventoryRightClick(parseInt(e.target.dataset.slot));
            }
        });

        // Chest UI event handlers
        const chestUI = document.getElementById('chest-ui');
        chestUI.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.target.dataset.slot !== undefined) {
                this.handleChestMouseDown(parseInt(e.target.dataset.slot), e);
            }
        });

        chestUI.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        document.getElementById('close-chest-btn').addEventListener('click', () => {
            this.closeChest();
        });

        // Global mouse events for drag and drop
        document.addEventListener('mousemove', (e) => {
            if (this.ui.draggedItem) {
                this.updateDragPreview(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.ui.draggedItem) {
                this.handleDragDrop(e);
            }
        });

        // Fixed Crafting UI event handlers
        const craftingUI = document.getElementById('crafting-ui');
        craftingUI.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.dataset.action === 'craft-item') {
                this.startCrafting(e.target.dataset.value);
            }
        });
    },

    startGame: function() {
        this.canvas = document.getElementById('bitcraft-canvas');
        this.sideMenu = document.getElementById('bitcraft-side-menu');
        this.ctx = this.canvas.getContext('2d');
        
        // Disable image smoothing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;
        
        this.resizeCanvas();
        MagicSystem.init();
        CombatSystem.init();
        this.createEnhancedWorld();
        
        if (this.playerUnits.length > 0) {
            this.camera.x = this.playerUnits[0].x;
            this.camera.y = this.playerUnits[0].y;
            this.camera.targetX = this.camera.x;
            this.camera.targetY = this.camera.y;
        }
        
        this.addEventListeners();
        this.lastFrameTime = performance.now();
        this.gameLoop();
    },
    
    createEnhancedWorld: function() {
        this.gameObjects = [];
        this.playerUnits = [];
        this.turrets = [];

        const config = GameConfig.worldGen;

        // Create player units with enhanced properties and inventory
        for (let i = 0; i < config.playerUnits; i++) {
            const unit = GameConfig.createEntity('player_unit', {
                id: `player_${i + 1}`,
                x: 100 + i * 25,
                y: 100 + i * 25,
                spells: ['lightningBolt', 'teleport', 'ballLightning', 'fireball', 'heal', 'shield'],
                canBuild: ['lightningTurret'],
                target: null,
                task: 'idle',
                gatherTimer: 0,
                inventory: InventorySystem.createInventory(GameConfig.getEntityConfig('player_unit').inventorySlots),
                equippedTool: null,
                equippedWeapon: null,
                currentCraft: null
            });

            // Give starting items
            InventorySystem.addItem(unit.inventory, ItemSystem.createItem('wood', 5));
            InventorySystem.addItem(unit.inventory, ItemSystem.createItem('stone', 5));
            InventorySystem.addItem(unit.inventory, ItemSystem.createItem('healthPotion', 2));

            this.playerUnits.push(unit);
            this.gameObjects.push(unit);
        }

        // Create trees with enhanced distribution
        for (let i = 0; i < config.treeCount; i++) {
            const tree = GameConfig.createEntity('tree', {
                id: `tree_${i}`,
                x: Math.random() * config.width + 200,
                y: Math.random() * config.height + 200
            });
            this.gameObjects.push(tree);
        }

        // Create rocks
        for (let i = 0; i < config.rockCount; i++) {
            const rock = GameConfig.createEntity('rock', {
                id: `rock_${i}`,
                x: Math.random() * config.width + 200,
                y: Math.random() * config.height + 200
            });
            this.gameObjects.push(rock);
        }

        // Create training dummies
        for (let i = 0; i < config.dummyCount; i++) {
            const dummy = GameConfig.createEntity('dummy', {
                id: `dummy_${i}`,
                x: Math.random() * 400 + 400,
                y: Math.random() * 400 + 300
            });
            this.gameObjects.push(dummy);
        }

        // Create grass patches for visual variety
        for (let i = 0; i < config.grassCount; i++) {
            const grass = GameConfig.createEntity('grass', {
                id: `grass_${i}`,
                x: Math.random() * config.width + 100,
                y: Math.random() * config.height + 100
            });
            this.gameObjects.push(grass);
        }

        // Add a starter workbench
        const workbench = GameConfig.createEntity('workbench', {
            id: 'starter_workbench',
            x: 200,
            y: 200
        });
        this.gameObjects.push(workbench);
        
        // Spawn some goblins for combat testing
        for (let i = 0; i < 3; i++) {
            const goblin = GameConfig.createEntity('goblin', {
                id: `goblin_${i}`,
                x: Math.random() * config.width + 300,
                y: Math.random() * config.height + 300,
                task: 'idle',
                inventory: null,
                currentCraft: null
            });
            this.gameObjects.push(goblin);
        }
    },

    addEventListeners: function() {
        this.boundHandlers = {
            resize: this.resizeCanvas.bind(this),
            wheel: this.handleZoom.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            keydown: this.handleKeyDown.bind(this),
            keyup: (e) => this.input.keys.delete(e.key.toLowerCase()),
            contextmenu: (e) => e.preventDefault()
        };
        
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            const target = (event === 'keydown' || event === 'keyup' || event === 'resize') ? window : this.canvas;
            target.addEventListener(event, handler, false);
        }
    },

    resizeCanvas: function() {
        const container = document.getElementById('bitcraft-container');
        if (!container || !this.canvas) return;
        const menuWidth = this.sideMenu.style.display === 'block' ? this.sideMenu.offsetWidth : 0;
        this.canvas.width = container.offsetWidth - menuWidth;
        this.canvas.height = container.offsetHeight;
    },

    // =================================================================================
    // --- ENHANCED INPUT & UI ---
    // =================================================================================
    handleKeyDown: function(e) {
        const key = e.key.toLowerCase();
        this.input.keys.add(key);
        
        if (key === 'escape') {
            this.deactivateTargetingMode();
            this.selectedEntities = [];
            this.ui.showInventory = false;
            this.ui.showCrafting = false;
            this.ui.placingItem = null;
            this.input.attackMode = false;
            this.closeChest();
            this.cancelDrag();
            this.updateUI();
        }

        // Inventory toggle
        if (key === 'i') {
            if (this.selectedEntities.length > 0 && this.selectedEntities[0].inventory) {
                this.ui.showInventory = !this.ui.showInventory;
                this.updateInventoryUI();
            }
        }

        // Crafting toggle
        if (key === 'c') {
            if (this.selectedEntities.length > 0) {
                this.ui.showCrafting = !this.ui.showCrafting;
                this.updateCraftingUI();
            }
        }

        // Combat controls - changed from 'a' to 'x' to avoid WASD conflict
        if (key === 'x' && this.selectedEntities.length > 0) {
            // Attack command - right click to target
            this.input.attackMode = !this.input.attackMode;
            console.log(this.input.attackMode ? "Attack mode activated - right click to target" : "Attack mode deactivated");
        }

        // Enhanced spell casting with number keys
        const spellIndex = parseInt(key) - 1;
        if (!isNaN(spellIndex) && spellIndex >= 0 && spellIndex < 9) {
            if (this.selectedEntities.length === 1 && this.selectedEntities[0].spells && this.selectedEntities[0].spells.length > spellIndex) {
                e.preventDefault(); 
                const spellId = this.selectedEntities[0].spells[spellIndex];
                this.activateTargetingMode(spellId, 'spell');
            }
        }

        // Debug mode toggle
        if (key === '`') {
            GameConfig.settings.debugMode = !GameConfig.settings.debugMode;
        }
    },

    handleMouseDown: function(event) {
        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        const targetObject = this.getEntityAt(worldPos);
        const currentTime = Date.now();

        // Enhanced double-click detection
        if (currentTime - this.input.lastClickTime < GameConfig.input.doubleClickTime) {
            this.input.clickCount++;
        } else {
            this.input.clickCount = 1;
        }
        this.input.lastClickTime = currentTime;

        if (event.button === 0) { // Left-click
            // Handle item placement
            if (this.ui.placingItem) {
                this.placeItem(worldPos);
                return;
            }

            if (this.input.targetingMode) {
                if (this.input.targetingMode.type === 'spell') {
                    const spellResult = MagicSystem.castSpell(this.input.targetingMode.data.id, {
                        target: worldPos, caster: this.selectedEntities[0], targetObject: targetObject 
                    });
                    if (spellResult && spellResult.summon) {
                        this.summons.push(spellResult.summon);
                    }
                } else if (this.input.targetingMode.type === 'build') {
                    this.buildStructure(this.input.targetingMode.data, worldPos);
                }
                this.deactivateTargetingMode();
                return;
            }

            // Double-click to center camera on unit
            if (this.input.clickCount === 2 && targetObject && targetObject.type === 'player_unit') {
                this.camera.targetX = targetObject.x;
                this.camera.targetY = targetObject.y;
                this.camera.isFollowing = false;
            }

            // Handle attack command
            if (this.input.attackMode && this.selectedEntities.length > 0) {
                const attacker = this.selectedEntities[0];
                if (targetObject && targetObject.health !== undefined && targetObject !== attacker) {
                    console.log(`Attack command: ${attacker.id} (${attacker.type}) attacking ${targetObject.id} (${targetObject.type})`);
                    CombatSystem.attackTarget(attacker, targetObject);
                    this.input.attackMode = false;
                    return;
                }
            }

            // Handle chest interaction - don't select the chest, just open it
            if (targetObject && targetObject.type === 'chest') {
                this.openChest(targetObject);
                return;
            }

            this.input.isSelecting = true;
            this.input.dragStart = worldPos;
            this.camera.isFollowing = false;
        } 
        else if (event.button === 2) { // Right-click
            if (this.input.targetingMode) {
                this.deactivateTargetingMode();
                return;
            }
            
            if (this.ui.placingItem) {
                this.ui.placingItem = null;
                return;
            }
            
            if (this.selectedEntities.some(e => e.type === 'player_unit')) {
                for (const unit of this.selectedEntities) { 
                    if (unit.speed) { 
                        if (targetObject && (targetObject.type === 'tree' || targetObject.type === 'rock')) {
                            unit.target = targetObject; 
                            unit.task = 'gathering';
                        } else {
                            unit.target = worldPos; 
                            unit.task = 'moving';
                        }
                    }
                }
                this.updateSideMenu();
                this.camera.isFollowing = true;
            } else { 
                this.input.isPanning = true; 
                this.camera.isFollowing = false;
                this.camera.dragStart = { 
                    x: event.clientX / this.camera.zoom + this.camera.x, 
                    y: event.clientY / this.camera.zoom + this.camera.y 
                };
            }
        }
    },
    
    handleMouseMove: function(event) {
        this.input.mousePos = this.screenToWorld(event.clientX, event.clientY);
        
        if (this.input.isPanning) {
            this.camera.x = this.camera.dragStart.x - event.clientX / this.camera.zoom;
            this.camera.y = this.camera.dragStart.y - event.clientY / this.camera.zoom;
            this.camera.targetX = this.camera.x;
            this.camera.targetY = this.camera.y;
        }
    },

    handleMouseUp: function(event) {
        if (event.button === 0 && this.input.isSelecting) {
            this.selectEntitiesInBox();
            this.input.isSelecting = false;
        } else if (event.button === 2) {
            this.input.isPanning = false;
        }
    },

    handleZoom: function(event) {
        event.preventDefault();
        const config = GameConfig.input;
        const wheel = event.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(wheel * config.zoomSpeed);
        const newZoom = this.camera.zoom * zoomFactor;

        if (newZoom < config.minZoom || newZoom > config.maxZoom) return;

        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        this.camera.x = worldPos.x - (worldPos.x - this.camera.x) / zoomFactor;
        this.camera.y = worldPos.y - (worldPos.y - this.camera.y) / zoomFactor;
        this.camera.targetX = this.camera.x;
        this.camera.targetY = this.camera.y;
        this.camera.zoom = newZoom;
    },

    selectEntitiesInBox: function() {
        this.selectedEntities = [];
        const start = this.input.dragStart;
        const end = this.input.mousePos;
        const box = { 
            x: Math.min(start.x, end.x), 
            y: Math.min(start.y, end.y),
            w: Math.abs(start.x - end.x), 
            h: Math.abs(start.y - end.y) 
        };

        if (box.w < GameConfig.input.dragThreshold && box.h < GameConfig.input.dragThreshold) {
            let clickedEntity = this.getEntityAt(start);
            // Don't select chests - they should only be opened, not selected
            // Allow selection of enemies for attack targeting
            if (clickedEntity && (clickedEntity.type === 'player_unit' || clickedEntity.type === 'lightningTurret' || clickedEntity.type === 'workbench' || clickedEntity.type === 'dummy' || clickedEntity.type === 'goblin')) {
                this.selectedEntities.push(clickedEntity);
            }
        } else {
            this.selectedEntities = this.playerUnits.filter(unit => 
                unit.x > box.x && unit.x < box.x + box.w && unit.y > box.y && unit.y < box.y + box.h
            );
        }
        this.updateSideMenu();
        this.updateInventoryUI();
        this.updateCraftingUI();
        // Don't close chest when selecting entities
    },
    
    activateTargetingMode: function(id, type) {
        if (this.selectedEntities.length > 0) {
            const caster = this.selectedEntities[0];
            if (type === 'spell') {
                const spell = MagicSystem.getSpell(id);
                if (spell && caster.mana >= spell.manaCost && !(MagicSystem.cooldowns[id] > 0)) {
                    this.input.targetingMode = { type: 'spell', data: spell };
                }
            } else if (type === 'build') {
                const blueprint = MagicSystem.getStructureBlueprint(id);
                // FIXED: Check inventory instead of unit properties
                const woodCount = InventorySystem.countItem(caster.inventory, 'wood');
                const stoneCount = InventorySystem.countItem(caster.inventory, 'stone');
                
                if (blueprint && woodCount >= blueprint.woodCost && stoneCount >= blueprint.stoneCost && caster.mana >= blueprint.manaCost && caster.spells.includes(blueprint.prerequisite)) {
                    this.input.targetingMode = { type: 'build', data: blueprint };
                } else {
                    console.log(`Not enough resources: Need ${blueprint.woodCost} wood (have ${woodCount}), ${blueprint.stoneCost} stone (have ${stoneCount}), ${blueprint.manaCost} mana (have ${Math.floor(caster.mana)})`);
                }
            }
        }
    },

    deactivateTargetingMode: function() {
        this.input.targetingMode = null;
    },

    // =================================================================================
    // --- ENHANCED INVENTORY & CHEST FUNCTIONS ---
    // =================================================================================
    handleInventoryMouseDown: function(slotIndex, event) {
        if (this.selectedEntities.length === 0) return;
        
        const unit = this.selectedEntities[0];
        if (!unit.inventory) return;
        
        const item = unit.inventory.slots[slotIndex];
        
        if (event.button === 0) { // Left click
            if (event.shiftKey && item) {
                // Shift+click to use item
                this.useInventoryItem(slotIndex);
            } else if (item) {
                // Start drag
                this.startDrag(item, slotIndex, 'inventory');
            } else {
                // Select empty slot
                this.ui.selectedInventorySlot = slotIndex;
                this.updateInventoryUI();
            }
        }
    },

    handleChestMouseDown: function(slotIndex, event) {
        if (!this.ui.openChest) return;
        
        const item = this.ui.openChest.inventory.slots[slotIndex];
        
        if (event.button === 0 && item) { // Left click on item
            // Start drag from chest
            this.startDrag(item, slotIndex, 'chest');
        }
    },

    startDrag: function(item, slotIndex, container) {
        this.ui.draggedItem = { ...item };
        this.ui.dragStartSlot = slotIndex;
        this.ui.dragStartContainer = container;
        
        // Show drag preview
        const dragPreview = document.getElementById('drag-preview');
        dragPreview.style.backgroundColor = item.color;
        dragPreview.style.display = 'block';
        
        console.log(`Started dragging ${item.name} from ${container} slot ${slotIndex}`);
    },

    updateDragPreview: function(event) {
        const dragPreview = document.getElementById('drag-preview');
        dragPreview.style.left = (event.clientX - 19) + 'px';
        dragPreview.style.top = (event.clientY - 19) + 'px';
    },

    handleDragDrop: function(event) {
        const dragPreview = document.getElementById('drag-preview');
        dragPreview.style.display = 'none';
        
        // Find what we're dropping on
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (!target || !target.dataset.slot) {
            this.cancelDrag();
            return;
        }
        
        const targetSlot = parseInt(target.dataset.slot);
        const targetContainer = target.closest('#inventory-ui') ? 'inventory' : 
                              target.closest('#chest-ui') ? 'chest' : null;
        
        if (!targetContainer) {
            this.cancelDrag();
            return;
        }
        
        // Perform the transfer
        this.transferItem(targetSlot, targetContainer);
    },

    transferItem: function(targetSlot, targetContainer) {
        const draggedItem = this.ui.draggedItem;
        const sourceSlot = this.ui.dragStartSlot;
        const sourceContainer = this.ui.dragStartContainer;
        
        if (sourceContainer === targetContainer && sourceSlot === targetSlot) {
            // Dropped on same slot, cancel
            this.cancelDrag();
            return;
        }
        
        // Get source and target inventories
        const unit = this.selectedEntities[0];
        const sourceInventory = sourceContainer === 'inventory' ? unit.inventory : this.ui.openChest.inventory;
        const targetInventory = targetContainer === 'inventory' ? unit.inventory : this.ui.openChest.inventory;
        
        // Get target item (if any)
        const targetItem = targetInventory.slots[targetSlot];
        
        if (targetItem && targetItem.id === draggedItem.id && targetItem.quantity < targetItem.stackSize) {
            // Stack items
            const spaceAvailable = targetItem.stackSize - targetItem.quantity;
            const amountToTransfer = Math.min(draggedItem.quantity, spaceAvailable);
            
            targetItem.quantity += amountToTransfer;
            draggedItem.quantity -= amountToTransfer;
            
            if (draggedItem.quantity <= 0) {
                sourceInventory.slots[sourceSlot] = null;
            } else {
                sourceInventory.slots[sourceSlot] = draggedItem;
            }
        } else if (!targetItem) {
            // Move to empty slot
            targetInventory.slots[targetSlot] = draggedItem;
            sourceInventory.slots[sourceSlot] = null;
        } else {
            // Swap items
            targetInventory.slots[targetSlot] = draggedItem;
            sourceInventory.slots[sourceSlot] = targetItem;
        }
        
        this.cancelDrag();
        this.updateInventoryUI();
        this.updateChestUI();
        
        console.log(`Transferred item from ${sourceContainer}[${sourceSlot}] to ${targetContainer}[${targetSlot}]`);
    },

    cancelDrag: function() {
        this.ui.draggedItem = null;
        this.ui.dragStartSlot = -1;
        this.ui.dragStartContainer = null;
        
        const dragPreview = document.getElementById('drag-preview');
        dragPreview.style.display = 'none';
    },

    openChest: function(chest) {
        this.ui.openChest = chest;
        this.updateChestUI();
        console.log(`Opened chest: ${chest.id}`);
    },

    closeChest: function() {
        this.ui.openChest = null;
        document.getElementById('chest-ui').style.display = 'none';
        this.cancelDrag();
    },

    updateChestUI: function() {
        const chestUI = document.getElementById('chest-ui');
        const chestGrid = document.getElementById('chest-grid');
        const chestInfo = document.getElementById('chest-info');
        const chestTitle = document.getElementById('chest-title');
        
        if (!this.ui.openChest) {
            chestUI.style.display = 'none';
            return;
        }
        
        chestUI.style.display = 'block';
        const chest = this.ui.openChest;
        const inventory = chest.inventory;
        
        chestTitle.textContent = `Storage Chest (${chest.id})`;
        
        // Clear grid
        chestGrid.innerHTML = '';
        
        // Create chest slots
        for (let i = 0; i < inventory.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 38px; height: 38px; border: 1px solid #666; 
                background: ${inventory.slots[i] ? '#444' : '#222'};
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; position: relative;
            `;
            slot.dataset.slot = i;
            
            const item = inventory.slots[i];
            if (item) {
                slot.style.backgroundColor = item.color;
                if (item.quantity > 1) {
                    const quantityLabel = document.createElement('div');
                    quantityLabel.textContent = item.quantity;
                    quantityLabel.style.cssText = 'position: absolute; bottom: 0; right: 2px; font-size: 10px; color: #fff; text-shadow: 1px 1px 1px #000;';
                    slot.appendChild(quantityLabel);
                }
                slot.title = ItemSystem.getTooltip(item);
            }
            
            chestGrid.appendChild(slot);
        }
        
        // Update info
        const emptySlots = InventorySystem.getEmptySlots(inventory);
        chestInfo.innerHTML = `
            ${inventory.maxSlots - emptySlots}/${inventory.maxSlots} slots used<br>
            <small>Drag items to transfer between inventory and chest</small>
        `;
    },

    handleInventoryRightClick: function(slotIndex) {
        if (this.selectedEntities.length === 0) return;
        
        const unit = this.selectedEntities[0];
        if (!unit.inventory) return;
        
        const item = unit.inventory.slots[slotIndex];
        if (item) {
            this.useInventoryItem(slotIndex);
        }
    },

    useInventoryItem: function(slotIndex) {
        if (this.selectedEntities.length === 0) return;
        
        const unit = this.selectedEntities[0];
        if (!unit.inventory) return;
        
        const item = unit.inventory.slots[slotIndex];
        if (!item) return;
        
        const recipe = GameConfig.getRecipe(item.id);
        if (recipe && recipe.placeable) {
            this.ui.placingItem = { item: item, slotIndex: slotIndex };
            console.log(`Click to place ${item.name}`);
            return;
        }
        
        if (ItemSystem.useItem(item, unit)) {
            if (item.quantity <= 0) {
                unit.inventory.slots[slotIndex] = null;
            }
            this.updateInventoryUI();
            this.updateSideMenu();
        }
    },

    selectInventorySlot: function(slotIndex) {
        this.ui.selectedInventorySlot = slotIndex;
        this.updateInventoryUI();
    },

    placeItem: function(position) {
        if (!this.ui.placingItem || this.selectedEntities.length === 0) return;
        
        const unit = this.selectedEntities[0];
        const { item, slotIndex } = this.ui.placingItem;
        
        const structure = CraftingSystem.placeStructure(unit, item.id, position, this.gameObjects);
        if (structure) {
            this.ui.placingItem = null;
            this.updateInventoryUI();
        }
    },

    startCrafting: function(recipeId) {
        if (this.selectedEntities.length === 0) return;
        
        const unit = this.selectedEntities[0];
        const nearbyWorkbench = this.findNearbyWorkbench(unit);
        
        if (CraftingSystem.startCrafting(unit, recipeId, nearbyWorkbench)) {
            this.updateCraftingUI();
            this.updateSideMenu();
        }
    },

    findNearbyWorkbench: function(unit) {
        for (const obj of this.gameObjects) {
            if (obj.type === 'workbench') {
                const dist = Math.sqrt(Math.pow(unit.x - obj.x, 2) + Math.pow(unit.y - obj.y, 2));
                if (dist < 50) { // Within range
                    return obj;
                }
            }
        }
        return null;
    },

    openChest: function(chest) {
        this.ui.openChest = chest;
        this.updateChestUI();
        console.log(`Opened chest: ${chest.id}`);
    },

    updateInventoryUI: function() {
        const inventoryUI = document.getElementById('inventory-ui');
        const inventoryGrid = document.getElementById('inventory-grid');
        const inventoryInfo = document.getElementById('inventory-info');
        
        if (!this.ui.showInventory || this.selectedEntities.length === 0 || !this.selectedEntities[0].inventory) {
            inventoryUI.style.display = 'none';
            return;
        }
        
        inventoryUI.style.display = 'block';
        const unit = this.selectedEntities[0];
        const inventory = unit.inventory;
        
        // Clear grid
        inventoryGrid.innerHTML = '';
        
        // Create inventory slots
        for (let i = 0; i < inventory.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width: 38px; height: 38px; border: 1px solid #666; 
                background: ${inventory.slots[i] ? '#444' : '#222'};
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; position: relative;
                ${this.ui.selectedInventorySlot === i ? 'border-color: #ff0; border-width: 2px;' : ''}
            `;
            slot.dataset.slot = i;
            
            const item = inventory.slots[i];
            if (item) {
                slot.style.backgroundColor = item.color;
                if (item.quantity > 1) {
                    const quantityLabel = document.createElement('div');
                    quantityLabel.textContent = item.quantity;
                    quantityLabel.style.cssText = 'position: absolute; bottom: 0; right: 2px; font-size: 10px; color: #fff; text-shadow: 1px 1px 1px #000;';
                    slot.appendChild(quantityLabel);
                }
                slot.title = ItemSystem.getTooltip(item);
            }
            
            inventoryGrid.appendChild(slot);
        }
        
        // Update info
        const emptySlots = InventorySystem.getEmptySlots(inventory);
        inventoryInfo.innerHTML = `
            ${inventory.maxSlots - emptySlots}/${inventory.maxSlots} slots used<br>
            <small>Left-click: Select | Right-click: Use | Shift+click: Use</small>
        `;
    },

    updateCraftingUI: function() {
        const craftingUI = document.getElementById('crafting-ui');
        const recipeList = document.getElementById('recipe-list');
        
        if (!this.ui.showCrafting || this.selectedEntities.length === 0) {
            craftingUI.style.display = 'none';
            return;
        }
        
        craftingUI.style.display = 'block';
        const unit = this.selectedEntities[0];
        const nearbyWorkbench = this.findNearbyWorkbench(unit);
        const availableRecipes = CraftingSystem.getAvailableRecipes(unit, nearbyWorkbench);
        
        // Clear recipe list
        recipeList.innerHTML = '';
        
        // Show current craft if any
        const currentCraft = CraftingSystem.getCraftingProgress(unit);
        if (currentCraft) {
            const craftDiv = document.createElement('div');
            craftDiv.style.cssText = 'border: 1px solid #666; padding: 8px; margin-bottom: 10px; background: #333;';
            craftDiv.innerHTML = `
                <div style="color: #0f0;">Crafting: ${currentCraft.recipe.name}</div>
                <div style="background: #222; height: 8px; margin: 4px 0;">
                    <div style="background: #0f0; height: 100%; width: ${currentCraft.progress * 100}%;"></div>
                </div>
                <div style="font-size: 10px; color: #888;">${Math.ceil(currentCraft.timeRemaining / 60)} seconds remaining</div>
            `;
            recipeList.appendChild(craftDiv);
        }
        
        // Show available recipes
        for (const recipeData of availableRecipes) {
            const recipe = recipeData.recipe;
            const canCraft = recipeData.canCraft && !unit.currentCraft;
            
            const recipeDiv = document.createElement('div');
            recipeDiv.style.cssText = `
                border: 1px solid #666; padding: 8px; margin-bottom: 5px; cursor: pointer;
                background: ${canCraft ? '#333' : '#222'};
                color: ${canCraft ? '#fff' : '#666'};
                ${canCraft ? 'border-color: #0f0;' : ''}
            `;
            
            let materialsText = '';
            for (const mat of recipeData.materials) {
                const color = mat.available >= mat.quantity ? '#0f0' : '#f00';
                materialsText += `<span style="color: ${color};">${mat.item}: ${mat.available}/${mat.quantity}</span> `;
            }
            
            recipeDiv.innerHTML = `
                <div style="font-weight: bold;">${recipe.name}</div>
                <div style="font-size: 11px; margin: 2px 0;">${materialsText}</div>
                <div style="font-size: 10px; color: #888;">Time: ${Math.ceil(recipe.craftTime / 60)}s ${recipe.workbench ? '(Workbench)' : ''}</div>
            `;
            
            if (canCraft) {
                recipeDiv.dataset.action = 'craft-item';
                recipeDiv.dataset.value = recipe.id;
                recipeDiv.addEventListener('click', () => {
                    this.startCrafting(recipe.id);
                });
            }
            
            recipeList.appendChild(recipeDiv);
        }
    },

    updateSideMenu: function() {
        const contentDiv = document.getElementById('side-menu-content');
        const perfDiv = document.getElementById('performance-info');
        if (!contentDiv) return;
        
        // Update performance info
        if (perfDiv && GameConfig.settings.debugMode) {
            perfDiv.innerHTML = `FPS: ${this.performance.currentFPS}<br>Entities: ${this.gameObjects.length}<br>Effects: ${MagicSystem.effects.length}<br>Combats: ${CombatSystem.activeCombats.length}`;
        }
        
        if (this.selectedEntities.length > 0) {
            let content = '';
            const entity = this.selectedEntities[0];

            if (this.selectedEntities.length === 1) {
                content += `<div style="border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px;">`;
                content += `<b>ID:</b> ${entity.id}<br>`;
                content += `<b>Type:</b> ${entity.type}<br>`;
                
                // Combat status
                const combatStatus = CombatSystem.getCombatStatus(entity);
                if (combatStatus) {
                    content += `<div style="color: #ff4444; margin: 4px 0;"><b>⚔️ IN COMBAT</b><br>`;
                    content += `<b>vs:</b> ${combatStatus.opponent.id}<br>`;
                    content += `<b>Role:</b> ${combatStatus.isAttacker ? 'Attacker' : 'Defender'}</div>`;
                }
                
                // Magic shield status
                if (entity.magicShield) {
                    content += `<div style="color: #00aaff; margin: 4px 0;"><b>🛡️ Shield:</b> ${entity.magicShield.absorption}/${entity.magicShield.maxAbsorption}<br>`;
                    content += `<b>Duration:</b> ${Math.ceil(entity.magicShield.duration / 60)}s</div>`;
                }
                
                if (entity.type === 'player_unit') {
                    content += `<b>Task:</b> ${entity.task}<br>`;
                    content += `<b>Health:</b> ${Math.floor(entity.health)}/${entity.maxHealth}<br>`;
                    content += `<b>Mana:</b> ${Math.floor(entity.mana)}/${entity.maxMana}<br>`;
                    
                    // Show equipped items
                    if (entity.equippedTool) {
                        content += `<b>Tool:</b> ${entity.equippedTool.name}<br>`;
                    }
                    if (entity.equippedWeapon) {
                        content += `<b>Weapon:</b> ${entity.equippedWeapon.name}<br>`;
                    }
                    
                    // Show inventory summary
                    const woodCount = InventorySystem.countItem(entity.inventory, 'wood');
                    const stoneCount = InventorySystem.countItem(entity.inventory, 'stone');
                    content += `<b>Resources:</b> Wood: ${woodCount}, Stone: ${stoneCount}<br>`;
                    
                    content += `</div>`;
                    
                    // Inventory quick actions
                    content += '<b>Quick Actions:</b><br>';
                    content += `<button onclick="bitCraftGame.ui.showInventory = !bitCraftGame.ui.showInventory; bitCraftGame.updateInventoryUI();" style="width:48%;margin:2px;padding:4px;cursor:pointer;background:#333;border:1px solid #666;color:#fff;font-size:11px;">[I] Inventory</button>`;
                    content += `<button onclick="bitCraftGame.ui.showCrafting = !bitCraftGame.ui.showCrafting; bitCraftGame.updateCraftingUI();" style="width:48%;margin:2px;padding:4px;cursor:pointer;background:#333;border:1px solid #666;color:#fff;font-size:11px;">[C] Craft</button>`;
                    
                    // Combat actions
                    content += '<br><b>Combat:</b><br>';
                    content += `<button onclick="bitCraftGame.input.attackMode = !bitCraftGame.input.attackMode; console.log(bitCraftGame.input.attackMode ? 'Attack mode ON' : 'Attack mode OFF'); bitCraftGame.updateSideMenu();" style="width:100%;margin:2px;padding:4px;cursor:pointer;background:${this.input.attackMode ? '#aa0000' : '#660000'};border:1px solid #aa0000;color:#fff;font-size:11px;">[X] Attack Mode ${this.input.attackMode ? '(ON)' : '(OFF)'}</button>`;
                    
                    if (entity.spells && entity.spells.length > 0) {
                        content += '<br><b>Spells:</b><br>';
                        entity.spells.forEach((spellId, index) => {
                            const spell = MagicSystem.getSpell(spellId);
                            if (spell) {
                                const onCooldown = MagicSystem.cooldowns[spellId] > 0;
                                const cooldownText = onCooldown ? ` (${MagicSystem.cooldowns[spellId]})` : '';
                                content += `<button data-action="activate-spell" data-value="${spellId}" ${onCooldown ? 'disabled' : ''} style="width:100%;margin-top:3px;padding:6px;cursor:pointer;background:${onCooldown?'#444':'#333'};border:1px solid #666;color:${onCooldown?'#888':'#fff'};text-align:left;font-size:11px;">[${index+1}] ${spell.name} (${spell.manaCost}m)${cooldownText}</button>`;
                            }
                        });
                    }
                    
                    if (entity.canBuild && entity.canBuild.length > 0) {
                        content += '<br><b>Build:</b><br>';
                        entity.canBuild.forEach((buildId) => {
                            const blueprint = MagicSystem.getStructureBlueprint(buildId);
                            if (blueprint) {
                                const woodCount = InventorySystem.countItem(entity.inventory, 'wood');
                                const stoneCount = InventorySystem.countItem(entity.inventory, 'stone');
                                const canAfford = woodCount >= blueprint.woodCost && stoneCount >= blueprint.stoneCost && entity.mana >= blueprint.manaCost;
                                content += `<button data-action="activate-build" data-value="${buildId}" ${!canAfford ? 'disabled' : ''} style="width:100%;margin-top:3px;padding:6px;cursor:pointer;background:${!canAfford?'#444':'#333'};border:1px solid #666;color:${!canAfford?'#888':'#fff'};text-align:left;font-size:11px;">[B] ${blueprint.name}<br>&nbsp;&nbsp;W:${blueprint.woodCost} S:${blueprint.stoneCost} M:${blueprint.manaCost}</button>`;
                            }
                        });
                    }
                } else if (entity.type === 'lightningTurret') {
                    content += `<b>Health:</b> ${Math.ceil(entity.health)}/${entity.maxHealth}<br>`;
                    content += `<b>Damage:</b> ${entity.damage}<br>`;
                    content += `<b>Range:</b> ${entity.range}<br>`;
                    content += `<b>Attack Speed:</b> ${entity.attackSpeed}<br>`;
                    content += `</div>`;
                } else if (entity.type === 'chest') {
                    const emptySlots = InventorySystem.getEmptySlots(entity.inventory);
                    content += `<b>Storage:</b> ${entity.inventory.maxSlots - emptySlots}/${entity.inventory.maxSlots}<br>`;
                    content += `</div>`;
                } else if (entity.type === 'workbench') {
                    content += `<b>Crafting Station</b><br>`;
                    content += `Enables advanced recipes<br>`;
                    content += `</div>`;
                }
            } else {
                content = `<div style="text-align: center; padding: 20px;">${this.selectedEntities.length} units selected</div>`;
            }
            
            contentDiv.innerHTML = content;
            this.sideMenu.style.display = 'block';
        } else {
            this.sideMenu.style.display = 'none';
        }
        this.resizeCanvas();
    },

    updateUI: function() {
        this.updateSideMenu();
        this.updateInventoryUI();
        this.updateCraftingUI();
        this.updateChestUI();
    },

    // =================================================================================
    // --- ENHANCED UPDATE (Game Logic) ---
    // =================================================================================
    gameLoop: function(currentTime) {
        if (!this.canvas) return;
        
        this.deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // FPS calculation
        this.performance.frameCount++;
        if (currentTime - this.performance.lastFPSUpdate > 1000) {
            this.performance.currentFPS = Math.round(this.performance.frameCount * 1000 / (currentTime - this.performance.lastFPSUpdate));
            this.performance.frameCount = 0;
            this.performance.lastFPSUpdate = currentTime;
        }
        
        this.update();
        this.draw();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    update: function() {
        this.handleCameraPanWithKeys();
        this.updateCameraSmoothing();
        this.updateWorldObjects();
        this.applyUnitSeparation();
        this.updateCameraFollow();
        this.updateHoverState(); 
        
        // Update combat and magic systems
        CombatSystem.update();
        MagicSystem.update();
        CraftingSystem.update();
        this.cleanupDestroyedObjects();
    },

    updateCameraSmoothing: function() {
        if (!this.camera.isFollowing) {
            const dx = this.camera.targetX - this.camera.x;
            const dy = this.camera.targetY - this.camera.y;
            this.camera.x += dx * this.camera.smoothing;
            this.camera.y += dy * this.camera.smoothing;
        }
    },
    
    // FIXED: buildStructure now uses inventory system
    buildStructure: function(blueprint, position) {
        const builder = this.selectedEntities[0];
        const stats = blueprint.stats;
        
        const woodCount = InventorySystem.countItem(builder.inventory, 'wood');
        const stoneCount = InventorySystem.countItem(builder.inventory, 'stone');
        
        if (woodCount >= blueprint.woodCost && stoneCount >= blueprint.stoneCost && builder.mana >= blueprint.manaCost && builder.spells.includes(blueprint.prerequisite)) {
            // Consume resources from inventory
            const woodRequirement = [{ item: 'wood', quantity: blueprint.woodCost }];
            const stoneRequirement = [{ item: 'stone', quantity: blueprint.stoneCost }];
            
            InventorySystem.consumeItems(builder.inventory, woodRequirement);
            InventorySystem.consumeItems(builder.inventory, stoneRequirement);
            builder.mana -= blueprint.manaCost;

            const newTurret = {
                ...stats,
                id: `turret_${Math.random().toString(36).substr(2, 9)}`,
                x: position.x,
                y: position.y
            };
            
            this.turrets.push(newTurret);
            this.gameObjects.push(newTurret);
            this.updateSideMenu(); // Update UI to show new resource counts
            console.log(`Built ${blueprint.name} at (${Math.round(position.x)}, ${Math.round(position.y)})`);
        } else {
            console.log(`Failed to build: Need ${blueprint.woodCost} wood (have ${woodCount}), ${blueprint.stoneCost} stone (have ${stoneCount}), ${blueprint.manaCost} mana (have ${Math.floor(builder.mana)})`);
        }
    },

    updateWorldObjects: function() {
        for (const obj of this.gameObjects) {
            // Enhanced regeneration
            if (obj.mana < obj.maxMana) {
                obj.mana = Math.min(obj.maxMana, obj.mana + (obj.manaRegen || 0));
            }
            if (obj.health < obj.maxHealth && obj.hpRegen) {
                obj.health = Math.min(obj.maxHealth, obj.health + obj.hpRegen);
            }
            
            if (obj.type === 'player_unit') {
                this.updateUnit(obj);
            }
        }
        this.updateTurrets();
        this.updateSummons();
    },

    updateSummons: function() {
        for (let i = this.summons.length - 1; i >= 0; i--) {
            const summon = this.summons[i];
            summon.life--;
            
            if (summon.life <= 0) { 
                this.summons.splice(i, 1); 
                continue; 
            }

            // Enhanced AI targeting - include goblins
            if (!summon.target || summon.target.health <= 0) {
                let closestTarget = null;
                let minDist = Infinity;
                
                for (const obj of this.gameObjects) {
                    if ((obj.type === 'dummy' || obj.type === 'goblin') && obj.health > 0) {
                        const dist = Math.sqrt(Math.pow(summon.x - obj.x, 2) + Math.pow(summon.y - obj.y, 2));
                        if (dist < minDist) { 
                            minDist = dist; 
                            closestTarget = obj; 
                        }
                    }
                }
                summon.target = closestTarget;
            }

            // Enhanced movement with orbital mechanics
            if (summon.target) {
                const dx = summon.target.x - summon.x;
                const dy = summon.target.y - summon.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                let moveX = 0, moveY = 0;
                
                // Approach target
                if (dist > 0) {
                    moveX += (dx / dist) * summon.speed;
                    moveY += (dy / dist) * summon.speed;
                }
                
                // Repulsion when too close
                if (dist < summon.repulsionRadius) {
                    const repulsionForce = (summon.repulsionRadius - dist) * 0.15;
                    moveX -= (dx / dist) * repulsionForce;
                    moveY -= (dy / dist) * repulsionForce;
                }
                
                // Orbital movement
                if (dist > 0) {
                    moveX += (-dy / dist) * summon.orbitalSpeed;
                    moveY += (dx / dist) * summon.orbitalSpeed;
                }
                
                summon.x += moveX; 
                summon.y += moveY;
            }

            // Enhanced particle animation
            for (const pixel of summon.pixels) {
                pixel.x += pixel.vx; 
                pixel.y += pixel.vy;
                
                const gravity = 0.08;
                pixel.vx -= pixel.x * gravity; 
                pixel.vy -= pixel.y * gravity;
                pixel.vx += (Math.random() - 0.5) * 0.15;
                pixel.vy += (Math.random() - 0.5) * 0.15;
                
                // Keep particles within bounds
                const maxDist = 12;
                const dist = Math.sqrt(pixel.x*pixel.x + pixel.y*pixel.y);
                if (dist > maxDist) {
                    pixel.x = (pixel.x / dist) * maxDist;
                    pixel.y = (pixel.y / dist) * maxDist;
                }
            }

            // Enhanced attack system
            summon.attackCooldown--;
            if (summon.attackCooldown <= 0 && summon.target) {
                summon.attackCooldown = summon.attackSpeed;
                MagicSystem.spellbook.lightningBolt.cast({
                    caster: summon, 
                    target: summon.target, 
                    targetObject: summon.target
                });
            }
        }
    },

    updateTurrets: function() {
        for (const turret of this.turrets) {
            turret.attackCooldown = Math.max(0, turret.attackCooldown - 1);
            
            if (turret.attackCooldown <= 0) {
                let closestTarget = null;
                let minDist = turret.range;
                
                for (const obj of this.gameObjects) {
                    if (obj.type === 'dummy' && obj.health > 0) {
                        const dist = Math.sqrt(Math.pow(turret.x - obj.x, 2) + Math.pow(turret.y - obj.y, 2));
                        if (dist < minDist) { 
                            minDist = dist; 
                            closestTarget = obj; 
                        }
                    }
                }
                
                if (closestTarget) {
                    turret.attackCooldown = turret.attackSpeed;
                    MagicSystem.spellbook.lightningTurretShot.cast({
                        caster: turret, 
                        target: closestTarget, 
                        targetObject: closestTarget
                    });
                }
            }
        }
        
        // Update entity health/mana regeneration and combat AI
        const allEntities = [...this.playerUnits, ...this.gameObjects];
        for (const entity of allEntities) {
            // Health regeneration
            if (entity.health !== undefined && entity.hpRegen && entity.health < entity.maxHealth) {
                entity.health = Math.min(entity.maxHealth, entity.health + entity.hpRegen);
            }
            
            // Mana regeneration
            if (entity.mana !== undefined && entity.manaRegen && entity.mana < entity.maxMana) {
                entity.mana = Math.min(entity.maxMana, entity.mana + entity.manaRegen);
            }
            
            // Update attack cooldowns
            if (entity.attackCooldown > 0) {
                entity.attackCooldown--;
            }
            
            // Update magic shield
            if (entity.magicShield) {
                entity.magicShield.duration--;
                if (entity.magicShield.duration <= 0) {
                    delete entity.magicShield;
                }
            }
            
            // Enhanced AI for goblins and dummies - attack nearby player units
            if ((entity.type === 'dummy' || entity.type === 'goblin') && entity.health > 0) {
                let closestPlayer = null;
                let closestDistance = Infinity;
                
                // Find closest player
                for (const player of this.playerUnits) {
                    const dx = player.x - entity.x;
                    const dy = player.y - entity.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestPlayer = player;
                    }
                }
                
                if (closestPlayer) {
                    const aggroRange = entity.aggroRange || 60;
                    
                    // If player is in aggro range and not in combat, start combat
                    if (closestDistance < aggroRange && !entity.inCombat) {
                        CombatSystem.attackTarget(entity, closestPlayer);
                    }
                    
                    // If goblin and player is close, move toward player (get within attack range)
                    if (entity.type === 'goblin' && closestDistance < aggroRange && closestDistance > 25) {
                        const dx = closestPlayer.x - entity.x;
                        const dy = closestPlayer.y - entity.y;
                        const moveSpeed = entity.speed || 1;
                        
                        // Normalize and move toward player
                        const length = Math.sqrt(dx * dx + dy * dy);
                        if (length > 0) {
                            entity.x += (dx / length) * moveSpeed;
                            entity.y += (dy / length) * moveSpeed;
                        }
                    }
                }
            }
        }
    },
    
    cleanupDestroyedObjects: function() {
        this.gameObjects = this.gameObjects.filter(obj => obj.health === undefined || obj.health > 0);
        this.playerUnits = this.playerUnits.filter(u => u.health === undefined || u.health > 0);
        this.turrets = this.turrets.filter(t => t.health === undefined || t.health > 0);
    },

    updateUnit: function(unit) {
        if (!unit.target) { 
            if (unit.task !== 'idle' && unit.task !== 'crafting') unit.task = 'idle'; 
            return; 
        }
        
        // Skip movement if crafting
        if (unit.task === 'crafting') return;
        
        // Check if resource is depleted
        if (unit.task === 'gathering' && (!unit.target.wood || unit.target.wood <= 0) && (!unit.target.stone || unit.target.stone <= 0)) { 
            unit.task = 'idle'; 
            unit.target = null; 
            return; 
        }
        
        const reachDistance = unit.target.size ? unit.target.size / 2 : 0;
        const dx = unit.target.x - unit.x;
        const dy = unit.target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > reachDistance + unit.size/2) {
            // Enhanced movement with smoother interpolation
            const moveSpeed = unit.speed * (this.deltaTime / 16.67); // Normalize to 60fps
            unit.x += (dx / dist) * moveSpeed;
            unit.y += (dy / dist) * moveSpeed;
        } else { 
            if (unit.task === 'moving') { 
                unit.target = null; 
            } else if (unit.task === 'gathering') { 
                this.gatherResource(unit); 
            }
        }
    },
    
    gatherResource: function(unit) {
        const config = GameConfig.getEntityConfig('player_unit');
        unit.gatherTimer = (unit.gatherTimer || 0) - 1;
        
        if (unit.gatherTimer <= 0) {
            let gatherSpeed = config.gatherSpeed;
            
            // Apply tool bonus
            if (unit.equippedTool && unit.equippedTool.gatherBonus) {
                gatherSpeed = Math.floor(gatherSpeed / unit.equippedTool.gatherBonus);
                
                // Damage tool
                if (ItemSystem.damageTool(unit.equippedTool)) {
                    console.log(`${unit.equippedTool.name} broke!`);
                    unit.equippedTool = null;
                }
            }
            
            unit.gatherTimer = gatherSpeed;
            const resourceType = unit.target.type === 'tree' ? 'wood' : 'stone';
            
            if (unit.target[resourceType] > 0) {
                unit.target[resourceType]--;
                
                // Add to inventory instead of unit properties
                const resourceItem = ItemSystem.createItem(resourceType, 1);
                const remaining = InventorySystem.addItem(unit.inventory, resourceItem);
                
                if (remaining > 0) {
                    console.log("Inventory full! Resource lost.");
                }
                
                // Visual feedback for gathering
                MagicSystem.effects.push({
                    type: 'particle',
                    x: unit.target.x,
                    y: unit.target.y,
                    size: 2,
                    life: 20,
                    color: resourceType === 'wood' ? 'rgba(139, 69, 19, 0.8)' : 'rgba(105, 105, 105, 0.8)',
                    vx: (unit.x - unit.target.x) * 0.1,
                    vy: (unit.y - unit.target.y) * 0.1
                });
            } else {
                unit.task = 'idle'; 
                unit.target = null;
            }
        }
    },

    updateHoverState: function() {
        this.hoveredObject = null;
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            if (this.isPointInObject(this.input.mousePos, this.gameObjects[i])) {
                this.hoveredObject = this.gameObjects[i];
                return;
            }
        }
    },

    handleCameraPanWithKeys: function() {
        const config = GameConfig.input;
        const panSpeed = config.panSpeed / this.camera.zoom;
        let didPan = false;
        
        if (this.input.keys.has('w') || this.input.keys.has('arrowup')) { 
            this.camera.y -= panSpeed; 
            this.camera.targetY = this.camera.y;
            didPan = true; 
        }
        if (this.input.keys.has('s') || this.input.keys.has('arrowdown')) { 
            this.camera.y += panSpeed; 
            this.camera.targetY = this.camera.y;
            didPan = true; 
        }
        if (this.input.keys.has('a') || this.input.keys.has('arrowleft')) { 
            this.camera.x -= panSpeed; 
            this.camera.targetX = this.camera.x;
            didPan = true; 
        }
        if (this.input.keys.has('d') || this.input.keys.has('arrowright')) { 
            this.camera.x += panSpeed; 
            this.camera.targetX = this.camera.x;
            didPan = true; 
        }
        
        if (didPan) { 
            this.camera.isFollowing = false; 
        }
    },
    
    applyUnitSeparation: function() {
        for (let i = 0; i < this.playerUnits.length; i++) {
            for (let j = i + 1; j < this.playerUnits.length; j++) {
                const u1 = this.playerUnits[i];
                const u2 = this.playerUnits[j];
                const dx = u2.x - u1.x;
                const dy = u2.y - u1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const minDist = (u1.size + u2.size) / 2;

                if (dist > 0 && dist < minDist) {
                    const overlap = (minDist - dist) / 2;
                    const pushX = (dx / dist) * overlap;
                    const pushY = (dy / dist) * overlap;
                    u1.x -= pushX; 
                    u1.y -= pushY;
                    u2.x += pushX; 
                    u2.y += pushY;
                }
            }
        }
    },
    
    updateCameraFollow: function() {
        if (!this.camera.isFollowing || this.selectedEntities.length === 0) return;
        
        let totalX = 0, totalY = 0, count = 0;
        
        for (const entity of this.selectedEntities) { 
            if (entity.speed) { // Only follow mobile units
                totalX += entity.x; 
                totalY += entity.y; 
                count++;
            }
        }
        
        if (count === 0) return;
        
        const centroid = { x: totalX / count, y: totalY / count };
        this.camera.targetX = centroid.x;
        this.camera.targetY = centroid.y;
    },

    // =================================================================================
    // --- ENHANCED DRAW (Rendering) ---
    // =================================================================================
    draw: function() {
        if (!this.ctx) return;
        
        this.canvas.style.cursor = this.input.targetingMode || this.ui.placingItem ? 'crosshair' : 'default';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Sort objects by y-coordinate for proper depth
        this.gameObjects.sort((a, b) => a.y - b.y);

        // Draw all game objects using enhanced renderer
        for (const obj of this.gameObjects) { 
            PixelRenderer.drawEntity(this.ctx, obj); 
        }
        
        // Draw summons
        for (const summon of this.summons) { 
            PixelRenderer.drawEntity(this.ctx, summon); 
        }
        
        // Draw magic effects
        MagicSystem.draw(this.ctx);
        
        // Draw selection highlights
        for (const entity of this.selectedEntities) { 
            PixelRenderer.drawSelectionHighlight(this.ctx, entity, this.camera); 
        }
        
        // Draw selection box
        if (this.input.isSelecting) { 
            PixelRenderer.drawSelectionBox(this.ctx, this.input.dragStart, this.input.mousePos, this.camera); 
        }
        
        // Draw placement preview
        if (this.ui.placingItem) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.7;
            const item = this.ui.placingItem.item;
            const entityConfig = GameConfig.getEntityConfig(item.id);
            if (entityConfig) {
                PixelRenderer.patterns.solid(this.ctx, this.input.mousePos.x, this.input.mousePos.y, entityConfig.size, entityConfig.color);
            }
            this.ctx.restore();
        }
        
        // Draw magic effects
        MagicSystem.draw(this.ctx);
        
        // Draw combat effects (damage numbers, etc.)
        CombatSystem.draw(this.ctx);
        
        this.ctx.restore();
        
        // Draw UI elements in screen space
        this.drawTooltip();
        if (this.input.targetingMode) { 
            this.drawTargetingReticule(); 
        }
        
        // Debug information
        if (GameConfig.settings.debugMode) {
            this.drawDebugInfo();
        }
    },
    
    drawTooltip: function() {
        if (!this.hoveredObject || this.input.isSelecting || this.input.targetingMode) return;
        
        const screenPos = this.worldToScreen(this.input.mousePos.x, this.input.mousePos.y);
        PixelRenderer.drawTooltip(this.ctx, this.hoveredObject, screenPos);
    },
    
    drawTargetingReticule: function() {
        const screenPos = this.worldToScreen(this.input.mousePos.x, this.input.mousePos.y);
        PixelRenderer.drawTargetingReticule(this.ctx, screenPos);
    },

    drawDebugInfo: function() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 120);
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = '12px Courier New';
        this.ctx.fillText(`Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`, 15, 25);
        this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}`, 15, 40);
        this.ctx.fillText(`Mouse: (${Math.round(this.input.mousePos.x)}, ${Math.round(this.input.mousePos.y)})`, 15, 55);
        this.ctx.fillText(`Selected: ${this.selectedEntities.length}`, 15, 70);
        this.ctx.fillText(`Delta: ${this.deltaTime.toFixed(1)}ms`, 15, 85);
        this.ctx.fillText(`Crafts: ${CraftingSystem.activeCrafts.length}`, 15, 100);
        this.ctx.restore();
    },

    // =================================================================================
    // --- HELPERS & TEARDOWN ---
    // =================================================================================
    getEntityAt: function(point, typeFilter = null) {
        const checkableObjects = [...this.turrets, ...this.playerUnits, ...this.gameObjects];
        const uniqueObjects = [...new Map(checkableObjects.map(item => [item['id'], item])).values()];
        
        for (let i = uniqueObjects.length - 1; i >= 0; i--) {
            const obj = uniqueObjects[i];
            if (typeFilter && obj.type !== typeFilter) continue;
            if (this.isPointInObject(point, obj)) return obj;
        }
        return null;
    },

    isPointInObject: function(point, object) {
        const size = object.size || 0;
        
        if (object.type === 'tree') {
            const leafRadius = size;
            const leafCenterY = object.y - (size * 1.2);
            const dist = Math.sqrt(Math.pow(point.x - object.x, 2) + Math.pow(point.y - leafCenterY, 2));
            return dist < leafRadius;
        } else {
            // Rectangle collision for most objects
            return (point.x > object.x - size / 2 && point.x < object.x + size / 2 &&
                    point.y > object.y - size / 2 && point.y < object.y + size / 2);
        }
    },
    
    screenToWorld: function(screenX, screenY) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const y = (screenY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return { x, y };
    },

    worldToScreen: function(worldX, worldY) {
        if (!this.canvas) return { x: 0, y: 0 };
        const x = (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
        const y = (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
        return { x, y };
    },
    
    destroy: function() {
        console.log(`bitCraftGame v${GameConfig.settings.version}: Destroying.`);
        if (this.gameLoopId) { 
            cancelAnimationFrame(this.gameLoopId); 
        }
        
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            const target = (event === 'keydown' || event === 'keyup' || event === 'resize') ? window : this.canvas;
            if (target) { 
                target.removeEventListener(event, handler); 
            }
        }
        
        this.canvas = null; 
        this.container.innerHTML = '';
    }
};


