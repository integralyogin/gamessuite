/**
 * vectorArenaHangar.js - v9.9 (Critical Data Handling Fix)
 * This version fixes the persistent weapon firing bug by implementing proper data cloning.
 * - The root cause was identified as a shallow copy issue, where playerData was being mutated across different game scenes.
 * - Implemented a deep copy of playerData using JSON.parse(JSON.stringify()) when transitioning to a new scene.
 * - This ensures that the combat and test flight scenes always receive a clean, un-mutated copy of the player's loadout, preventing initialization errors.
 * - This change guarantees data integrity between the hangar and combat scenes.
 */
const VectorArenaHangarGame = {
    id: 'vectorArenaHangar',
    onSuccess: null,
    gameContainer: null,
    playerData: null,
    PARTS: null,
    activeCategory: 'chassis',

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        console.log("Vector Arena Hangar Initializing (v9.9).");

        this.PARTS = sharedData.parts || await PartsLoader.getParts();
        if (!this.PARTS) {
            console.error("CRITICAL: Hangar could not load parts data. Aborting.");
            if (failureCallback) failureCallback({ reason: "Failed to load parts data." });
            return;
        }

        this.playerData = sharedData.playerData || {
            credits: 50000,
            owned: {
                chassis: ['interceptor', 'juggernaut', 'mothership'],
                weapon: [
                    { id: 'pulse_laser', instanceId: 1 },
                    { id: 'spread_shot', instanceId: 2 },
                    { id: 'railgun', instanceId: 3 }
                ],
                turret: [
                    {id: 'point_defense', instanceId: 101}
                ],
                drone: [
                    {id: 'combat_drone', instanceId: 201}
                ],
                engine: ['standard_ion'],
                shield: ['basic_shield'],
                special: ['burst_thruster'],
                tech: ['fire_rate_controller']
            },
            equipped: {
                chassis: 'interceptor',
                weapon: [1, 2, null],
                turret: [],
                drone: [],
                weaponGroups: [1, 1, 1],
                engine: 'standard_ion',
                shield: 'basic_shield',
                thrusters: null,
                special: 'burst_thruster',
                tech: null
            }
        };

        this.validateAllSlots();
        this.activeCategory = 'chassis';
        this.setupUI();
        this.addEventListeners();
        this.refreshHangar();
    },

    validateAllSlots: function() {
        const chassis = this.PARTS.chassis[this.playerData.equipped.chassis];
        if (!chassis) {
            this.playerData.equipped.chassis = Object.keys(this.PARTS.chassis)[0];
            this.validateAllSlots();
            return;
        }

        const slotTypes = ['weapon', 'turret', 'drone'];
        slotTypes.forEach(slotType => {
            const numSlots = chassis.slots?.[slotType]?.length || 0;
            if (!this.playerData.equipped[slotType] || this.playerData.equipped[slotType].length !== numSlots) {
                const newSlots = new Array(numSlots).fill(null);
                if(this.playerData.equipped[slotType]){
                    for(let i = 0; i < Math.min(newSlots.length, this.playerData.equipped[slotType].length); i++){
                        newSlots[i] = this.playerData.equipped[slotType][i];
                    }
                }
                this.playerData.equipped[slotType] = newSlots;
            }
        });

        const numWeaponSlots = chassis.slots?.weapon?.length || 0;
        if (!this.playerData.equipped.weaponGroups || this.playerData.equipped.weaponGroups.length !== numWeaponSlots) {
            this.playerData.equipped.weaponGroups = new Array(numWeaponSlots).fill(1);
        }
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                body, html { height: 100%; margin: 0; padding: 0; overflow: hidden; }
                .hangar-container { display: flex; flex-direction: row; width: 100%; height: 100%; background: #080a10; font-family: 'Courier New', Courier, monospace; color: white; padding: 15px; box-sizing: border-box; gap: 15px; }
                .hangar-column { display: flex; flex-direction: column; background: #111; border: 1px solid #333; overflow-y: auto; padding: 15px; }
                .left-column { flex: 3; }
                .right-column { flex: 2; }
                .left-column-content { display: flex; flex-direction: column; height: 100%; }
                .ship-section { display: flex; gap: 20px; margin-bottom: 20px; }
                .ship-blueprint-container { flex: 1; }
                .ship-loadout-container { flex: 1; }
                #hangar-canvas { background: #0c0c0c; width: 100%; aspect-ratio: 1 / 1; border: 1px solid #333; }
                .hangar-menu { margin-top: auto; padding-top: 20px; }
                .hangar-menu button { display: block; width: 100%; background: transparent; border: 2px solid #00aaff; color: #00aaff; padding: 10px; font-size: 1.2em; cursor: pointer; margin-top: 10px; transition: all 0.3s ease; }
                .hangar-menu button:hover { background: #00aaff; color: #000; box-shadow: 0 0 15px #00aaff; }
                .hangar-column h2 { color: #00aaff; border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0; text-align: center; margin-bottom: 15px;}
                .loadout-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
                .loadout-slot { background: #1a1a1a; border: 1px dashed #444; padding: 8px; border-radius: 4px; display: flex; flex-direction: column; justify-content: center; position: relative;}
                .loadout-slot.equipped { border-style: solid; border-color: #00aaff; }
                .loadout-slot .slot-label { font-size: 0.7em; color: #888; margin-bottom: 4px; }
                .loadout-slot .part-name { font-size: 0.9em; color: #fff; }
                .loadout-slot .fire-group-display { position: absolute; top: 2px; right: 2px; background: #2c3e50; color: #ecf0f1; font-size: 0.7em; padding: 2px 4px; border-radius: 3px; }
                .part-tabs { display: flex; border-bottom: 1px solid #444; margin-bottom: 10px; flex-wrap: wrap;}
                .part-tab { padding: 10px 15px; cursor: pointer; background: #222; border: 1px solid #444; border-bottom: none; }
                .part-tab.active { background: #111; border-bottom: 1px solid #111; color: #00aaff; font-weight: bold; }
                .part-tab-pane { display: none; }
                .part-tab-pane.active { display: block; }
                .part-list { list-style-type: none; padding: 0; }
                .part-item { background: #2a2a2a; margin-bottom: 8px; padding: 10px; border-left: 3px solid #555; }
                .part-item-header { display: flex; justify-content: space-between; align-items: center; }
                .part-item.in-use { border-left-color: #e67e22; }
                .part-action-buttons button, .fire-group-tag { background: #00aaff; color: #000; border: none; padding: 5px 10px; cursor: pointer; font-size: 0.8em; }
                .fire-group-tag { background: #27ae60; color: #fff; margin-left: 5px;}
                .part-unequip-button { background: #ff4400; color: #fff; }
            </style>
            <div class="hangar-container">
                <div class="hangar-column left-column">
                    <div class="left-column-content">
                        <div class="ship-section">
                            <div class="ship-blueprint-container">
                                <h2>SHIP BLUEPRINT</h2>
                                <canvas id="hangar-canvas" width="300" height="300"></canvas>
                            </div>
                            <div class="ship-loadout-container">
                                <h2>SHIP LOADOUT</h2>
                                <div class="loadout-grid" id="loadout-grid"></div>
                            </div>
                        </div>
                        <div class="hangar-menu">
                            <button id="hangar-launch-test-flight-btn">Test Flight</button>
                            <button id="shop-btn">Go to Shop</button>
                            <button id="hangar-back-btn">Return to Menu</button>
                        </div>
                    </div>
                </div>
                <div class="hangar-column right-column">
                    <h2>INVENTORY</h2>
                    <div id="part-selection-container"></div>
                </div>
            </div>
        `;
    },

    refreshHangar: function() {
        this.updateLoadoutDisplay();
        this.populatePartSelection();
        this.drawHangarShip();
    },

    updateLoadoutDisplay: function() {
        const grid = this.gameContainer.querySelector('#loadout-grid');
        const equipped = this.playerData.equipped;
        const chassis = this.PARTS.chassis[equipped.chassis];
        grid.innerHTML = '';

        const createSlot = (label, partData, slotType, slotIndex) => {
            const slotDiv = document.createElement('div');
            slotDiv.className = `loadout-slot ${partData ? 'equipped' : ''}`;
            slotDiv.innerHTML = `<div class="slot-label">${label}</div><div class="part-name">${partData ? partData.name : '[ EMPTY ]'}</div>`;
            if (partData && slotType === 'weapon') {
                const group = this.playerData.equipped.weaponGroups[slotIndex] || 1;
                slotDiv.innerHTML += `<div class="fire-group-display">G${group}</div>`;
            }
            return slotDiv;
        };

        grid.appendChild(createSlot('Chassis', chassis));
        grid.appendChild(createSlot('Engine', this.PARTS.engine[equipped.engine]));
        grid.appendChild(createSlot('Shield', this.PARTS.shield[equipped.shield]));
        grid.appendChild(createSlot('Special', this.PARTS.special[equipped.special]));
        grid.appendChild(createSlot('Tech', this.PARTS.tech[equipped.tech]));

        const weaponSlots = chassis.slots?.weapon || [];
        weaponSlots.forEach((slot, index) => {
            const instanceId = equipped.weapon?.[index];
            let weaponData = null;
            if (instanceId) {
                const weaponInstance = this.playerData.owned.weapon.find(w => w.instanceId === instanceId);
                if (weaponInstance) {
                    weaponData = this.PARTS.weapon[weaponInstance.id];
                }
            }
            const label = slot.label || `Weapon ${index + 1}`;
            grid.appendChild(createSlot(label, weaponData, 'weapon', index));
        });

        const turretSlots = chassis.slots?.turret || [];
        turretSlots.forEach((slot, index) => {
            const instanceId = equipped.turret?.[index];
            let turretData = null;
            if (instanceId) {
                const turretInstance = this.playerData.owned.turret.find(t => t.instanceId === instanceId);
                if (turretInstance) {
                    turretData = this.PARTS.turret[turretInstance.id];
                }
            }
            const label = slot.label || `Turret ${index + 1}`;
            grid.appendChild(createSlot(label, turretData, 'turret', index));
        });

        const droneSlots = chassis.slots?.drone || [];
        droneSlots.forEach((slot, index) => {
            const instanceId = equipped.drone?.[index];
            let droneData = null;
            if (instanceId) {
                const droneInstance = this.playerData.owned.drone.find(d => d.instanceId === instanceId);
                if (droneInstance) {
                    droneData = this.PARTS.drone[droneInstance.id];
                }
            }
            const label = slot.label || `Drone ${index + 1}`;
            grid.appendChild(createSlot(label, droneData, 'drone', index));
        });
    },

    populatePartSelection: function() {
        const container = this.gameContainer.querySelector('#part-selection-container');
        if (!container) return;

        let tabsHTML = '<div class="part-tabs">';
        let panesHTML = '<div class="part-tab-content">';

        for (const type in this.PARTS) {
            tabsHTML += `<div class="part-tab ${type === this.activeCategory ? 'active' : ''}" data-type="${type}">${type.toUpperCase()}</div>`;
            panesHTML += `<div class="part-tab-pane ${type === this.activeCategory ? 'active' : ''}" id="tab-pane-${type}">`;
            panesHTML += `<ul class="part-list">`;

            if (type === 'weapon' || type === 'turret' || type === 'drone') {
                const ownedInstances = this.playerData.owned[type] || [];
                ownedInstances.forEach(instance => {
                    const partData = this.PARTS[type][instance.id];
                    if (partData) {
                        const isInUse = this.playerData.equipped[type]?.includes(instance.instanceId);
                        const slotIndex = this.playerData.equipped[type]?.indexOf(instance.instanceId);
                        
                        panesHTML += `<li class="part-item ${isInUse ? 'in-use' : ''}" data-type="${type}" data-instanceid="${instance.instanceId}">`;
                        panesHTML += `<div class="part-item-header">`;
                        panesHTML += `<div><strong>${partData.name}</strong> #${instance.instanceId}</div>`;
                        panesHTML += `<div class="part-action-buttons">`;
                        
                        if (isInUse) {
                            panesHTML += `<button class="part-action-button part-unequip-button" data-type="${type}" data-slotindex="${slotIndex}">Unequip</button>`;
                            if (type === 'weapon') {
                                const group = this.playerData.equipped.weaponGroups[slotIndex] || 1;
                                panesHTML += `<span class="fire-group-tag">G${group}</span>`;
                            }
                        } else {
                            const chassis = this.PARTS.chassis[this.playerData.equipped.chassis];
                            const slots = chassis.slots?.[type] || [];
                            const nextAvailableSlotIndex = this.playerData.equipped[type].findIndex(slot => slot === null);
                            
                            if (nextAvailableSlotIndex !== -1) {
                                const slotLabel = slots[nextAvailableSlotIndex]?.label || `${type} ${nextAvailableSlotIndex + 1}`;
                                panesHTML += `<button class="part-action-button part-equip-button" data-type="${type}" data-instanceid="${instance.instanceId}" data-slotindex="${nextAvailableSlotIndex}">Equip to ${slotLabel}</button>`;
                            }
                        }
                        
                        panesHTML += `</div></div></li>`;
                    }
                });
            } else {
                const ownedParts = this.playerData.owned[type] || [];
                ownedParts.forEach(partId => {
                    const partData = this.PARTS[type][partId];
                    if (partData) {
                        const isEquipped = this.playerData.equipped[type] === partId;
                        panesHTML += `<li class="part-item ${isEquipped ? 'in-use' : ''}" data-type="${type}" data-partid="${partId}">`;
                        panesHTML += `<div class="part-item-header">`;
                        panesHTML += `<div><strong>${partData.name}</strong></div>`;
                        panesHTML += `<div class="part-action-buttons">`;
                        if (isEquipped) {
                            panesHTML += `<button class="part-action-button part-unequip-button" data-type="${type}">Unequip</button>`;
                        } else {
                            panesHTML += `<button class="part-action-button part-equip-button" data-type="${type}" data-partid="${partId}">Equip</button>`;
                        }
                        panesHTML += `</div></div></li>`;
                    }
                });
            }

            panesHTML += `</ul></div>`;
        }

        tabsHTML += '</div>';
        panesHTML += '</div>';
        container.innerHTML = tabsHTML + panesHTML;
    },

    setActiveTab: function(type) {
        this.activeCategory = type;
        const tabs = this.gameContainer.querySelectorAll('.part-tab');
        const panes = this.gameContainer.querySelectorAll('.part-tab-pane');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        panes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-pane-${type}`);
        });
    },

    equipPart: function(type, partIdOrInstanceId, slotIndex) {
        const id = (type === 'weapon' || type === 'turret' || type === 'drone') ? parseInt(partIdOrInstanceId) : partIdOrInstanceId;

        if (type === 'weapon' || type === 'turret' || type === 'drone') {
            this.playerData.equipped[type][slotIndex] = id;
        } else {
            this.playerData.equipped[type] = id;
        }
        this.refreshHangar();
    },

    unequipPart: function(type, slotIndex) {
        if (type === 'weapon' || type === 'turret' || type === 'drone') {
            this.playerData.equipped[type][slotIndex] = null;
        } else {
            this.playerData.equipped[type] = null;
        }
        this.refreshHangar();
    },

    cycleWeaponGroup: function(instanceId) {
        const slotIndex = this.playerData.equipped.weapon.indexOf(parseInt(instanceId));
        if (slotIndex === -1) return;
        
        let currentGroup = this.playerData.equipped.weaponGroups[slotIndex] || 1;
        currentGroup++;
        if (currentGroup > 4) { 
            currentGroup = 1;
        }
        this.playerData.equipped.weaponGroups[slotIndex] = currentGroup;
        this.refreshHangar();
    },

    addEventListeners: function() {
        // --- DATA INTEGRITY FIX: Use deep copies when transitioning scenes ---
        const createSuccessPayload = (nextGame) => {
            return {
                nextGame: nextGame,
                returnTo: 'vectorArenaHangar',
                playerData: JSON.parse(JSON.stringify(this.playerData)), // Create a deep copy
                parts: this.PARTS
            };
        };

        this.exitHangarHandler = () => { if(this.onSuccess) this.onSuccess({ from: 'hangar', playerData: JSON.parse(JSON.stringify(this.playerData)) }); };
        this.launchTestFlightHandler = () => { if (this.onSuccess) this.onSuccess(createSuccessPayload('vectorTestFlight')); };
        this.shopHandler = () => { if (this.onSuccess) this.onSuccess(createSuccessPayload('vectorShop')); }
        // --- END FIX ---

        this.inventoryClickHandler = (e) => {
            const button = e.target.closest('.part-action-button');
            const tab = e.target.closest('.part-tab');

            if (button) {
                const { type, partid, slotindex, instanceid } = button.dataset;
                if (button.classList.contains('part-equip-button')) {
                    this.equipPart(type, instanceid || partid, parseInt(slotindex));
                } else if (button.classList.contains('part-unequip-button')) {
                    this.unequipPart(type, parseInt(slotindex));
                }
            } else if (tab) {
                this.activeCategory = tab.dataset.type;
                this.setActiveTab(this.activeCategory);
            }
        };

        this.inventoryRightClickHandler = (e) => {
            const item = e.target.closest('.part-item');
            if(item && item.dataset.type === 'weapon' && item.classList.contains('in-use')) {
                e.preventDefault(); 
                this.cycleWeaponGroup(item.dataset.instanceid);
            }
        };
        
        const partContainer = this.gameContainer.querySelector('#part-selection-container');
        if (partContainer) {
            partContainer.addEventListener('click', this.inventoryClickHandler);
            partContainer.addEventListener('contextmenu', this.inventoryRightClickHandler);
        }

        const backButton = this.gameContainer.querySelector('#hangar-back-btn');
        if (backButton) backButton.addEventListener('click', this.exitHangarHandler);
        
        const testFlightButton = this.gameContainer.querySelector('#hangar-launch-test-flight-btn');
        if (testFlightButton) testFlightButton.addEventListener('click', this.launchTestFlightHandler);
        
        const shopButton = this.gameContainer.querySelector('#shop-btn');
        if (shopButton) shopButton.addEventListener('click', this.shopHandler);
    },
    
    drawHangarShip: function() {
        const canvas = this.gameContainer.querySelector('#hangar-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const chassis = this.PARTS.chassis[this.playerData.equipped.chassis];
        const shipSize = chassis.size * 4;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        ctx.strokeStyle = chassis.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = chassis.color;

        if (chassis.art === 'mothership') {
            ctx.beginPath();
            ctx.ellipse(0, 0, shipSize * 1.2, shipSize * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (chassis.art === 'juggernaut') {
            ctx.beginPath();
            ctx.rect(-shipSize * 0.7, -shipSize * 0.5, shipSize * 1.4, shipSize);
            ctx.fill();
        } else { 
            ctx.beginPath();
            ctx.moveTo(shipSize * 0.8, 0);
            ctx.lineTo(-shipSize * 0.4, shipSize * 0.6);
            ctx.lineTo(-shipSize * 0.4, -shipSize * 0.6);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    },

    destroy: function() {
        if(this.gameContainer){
            const backButton = this.gameContainer.querySelector('#hangar-back-btn');
            if (backButton) backButton.removeEventListener('click', this.exitHangarHandler);
            const partContainer = this.gameContainer.querySelector('#part-selection-container');
            if (partContainer) {
                partContainer.removeEventListener('click', this.inventoryClickHandler);
                partContainer.removeEventListener('contextmenu', this.inventoryRightClickHandler);
            }
            const testFlightButton = this.gameContainer.querySelector('#hangar-launch-test-flight-btn');
            if (testFlightButton) testFlightButton.removeEventListener('click', this.launchTestFlightHandler);
            const shopButton = this.gameContainer.querySelector('#shop-btn');
            if (shopButton) shopButton.removeEventListener('click', this.shopHandler);
            this.gameContainer.innerHTML = '';
        }
        console.log("Vector Arena Hangar Destroyed.");
    },
};

