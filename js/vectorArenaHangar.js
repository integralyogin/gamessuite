/**
 * vectorArenaHangar.js - v9 (Complete Redesign & Fix)
 * This is a complete overhaul of the hangar UI. It now uses a dedicated loadout
 * panel to display all part slots, including turret and drone types.
 * This version corrects the fatal initialization bug and all visual glitches.
 */
const VectorArenaHangarGame = {
    id: 'vectorArenaHangar',
    onSuccess: null,
    gameContainer: null,
    playerData: null,
    PARTS: null,
    activeCategory: 'chassis',
    tooltip: null,
    mousePos: { x: 0, y: 0 },

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        console.log("Vector Arena Hangar Initializing.");

        this.PARTS = await PartsLoader.getParts();
        if (!this.PARTS) {
            console.error("CRITICAL: Hangar could not load parts data. Aborting.");
            if (failureCallback) failureCallback({ reason: "Failed to load parts data." });
            return;
        }

        this.playerData = sharedData.playerData || {
            credits: 50000,
            owned: {
                chassis: ['interceptor', 'juggernaut', 'mothership'],
                weapon: [ { id: 'pulse_laser', instanceId: 1 }, { id: 'spread_shot', instanceId: 2 } ],
                turret: [ {id: 'point_defense', instanceId: 101}],
                drone: [ {id: 'combat_drone', instanceId: 201}],
                engine: ['standard_ion'],
                shield: ['basic_shield'],
                special: ['burst_thruster'],
                tech: ['fire_rate_controller']
            },
            equipped: {
                chassis: 'interceptor',
                weapon: [], 
                turret: [],
                drone: [],
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
        const slotTypes = ['weapon', 'turret', 'drone'];

        slotTypes.forEach(slotType => {
            const numSlots = chassis.slots?.[slotType]?.length || 0;
            if (!this.playerData.equipped[slotType] || !Array.isArray(this.playerData.equipped[slotType]) || this.playerData.equipped[slotType].length !== numSlots) {
                const newSlots = new Array(numSlots).fill(null);
                if(this.playerData.equipped[slotType] && Array.isArray(this.playerData.equipped[slotType])){
                     for(let i = 0; i < Math.min(newSlots.length, this.playerData.equipped[slotType].length); i++){
                         newSlots[i] = this.playerData.equipped[slotType][i];
                     }
                }
                this.playerData.equipped[slotType] = newSlots;
            }
        });
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .hangar-container { display: flex; flex-direction: row; width: 100%; height: 100%; background: #080a10; font-family: 'Courier New', Courier, monospace; color: white; padding: 20px; box-sizing: border-box; gap: 20px; }
                .hangar-column { flex: 1; display: flex; flex-direction: column; padding: 20px; background: #111; border: 1px solid #333; overflow-y: auto; }
                .ship-display-column { flex-basis: 30%; justify-content: space-between;}
                .ship-display-column h2 { color: #00aaff; border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0; text-align: center; }
                #hangar-canvas { background: #0c0c0c; width: 100%; aspect-ratio: 1 / 1; border: 1px solid #333; }
                .hangar-menu button { display: block; width: 100%; background: transparent; border: 2px solid #00aaff; color: #00aaff; padding: 15px 30px; font-size: 1.5em; cursor: pointer; margin-top: 10px; transition: all 0.3s ease; }
                .hangar-menu button:hover { background: #00aaff; color: #000; box-shadow: 0 0 15px #00aaff; }
                .loadout-column { flex-basis: 35%; }
                .loadout-column h2 { color: #00aaff; border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0; }
                .loadout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                .loadout-slot { background: #1a1a1a; border: 1px dashed #444; padding: 10px; border-radius: 4px; min-height: 50px; display: flex; flex-direction: column; justify-content: center;}
                .loadout-slot.equipped { border-style: solid; border-color: #00aaff; }
                .loadout-slot .slot-label { font-size: 0.8em; color: #888; margin-bottom: 5px; }
                .loadout-slot .part-name { font-size: 1em; color: #fff; }
                .loadout-slot .empty { color: #555; font-style: italic; }
                .inventory-column { flex-basis: 35%; }
                .inventory-column h2 { color: #00aaff; border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0; }
                .part-tabs { display: flex; border-bottom: 1px solid #444; margin-bottom: 10px; flex-wrap: wrap;}
                .part-tab { padding: 10px 15px; cursor: pointer; background: #222; border: 1px solid #444; border-bottom: none; margin-right: 5px; margin-bottom: -1px; }
                .part-tab.active { background: #111; border-bottom: 1px solid #111; color: #00aaff; font-weight: bold; }
                .part-tab-pane { display: none; }
                .part-tab-pane.active { display: block; }
                .part-list { list-style-type: none; padding: 0; }
                .part-item { background: #2a2a2a; margin-bottom: 8px; padding: 10px; border-left: 3px solid #555; }
                .part-item-header { display: flex; justify-content: space-between; align-items: center; }
                .part-item.in-use { border-left-color: #e67e22; }
                .part-item-name { font-weight: bold; }
                .part-action-buttons { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end;}
                .part-action-buttons button { background: #00aaff; color: #000; border: none; padding: 5px 10px; cursor: pointer; font-size: 0.8em; }
                .part-unequip-button { background: #ff4400; color: #fff; }
            </style>
            <div class="hangar-container">
                <div class="hangar-column ship-display-column">
                    <div>
                        <h2>SHIP BLUEPRINT</h2>
                        <canvas id="hangar-canvas" width="400" height="400"></canvas>
                    </div>
                     <div class="hangar-menu">
                        <div>
                            <h2>ACTIONS</h2>
                            <button id="hangar-launch-test-flight-btn">Test Flight</button>
                            <button id="shop-btn">Go to Shop</button>
                        </div>
                        <button id="hangar-back-btn">Return to Menu</button>
                    </div>
                </div>
                <div class="hangar-column loadout-column">
                    <h2>SHIP LOADOUT</h2>
                    <div class="loadout-grid" id="loadout-grid"></div>
                </div>
                 <div class="hangar-column inventory-column">
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

        const createSlot = (label, partData) => {
            const slotDiv = document.createElement('div');
            slotDiv.className = `loadout-slot ${partData ? 'equipped' : ''}`;
            slotDiv.innerHTML = `<div class="slot-label">${label}</div>`;
            slotDiv.innerHTML += `<div class="part-name">${partData ? partData.name : '[ EMPTY ]'}</div>`;
            return slotDiv;
        };
        
        grid.appendChild(createSlot('Chassis', chassis));
        grid.appendChild(createSlot('Engine', this.PARTS.engine[equipped.engine]));
        grid.appendChild(createSlot('Shield', this.PARTS.shield[equipped.shield]));
        grid.appendChild(createSlot('Special', this.PARTS.special[equipped.special]));
        grid.appendChild(createSlot('Tech', this.PARTS.tech[equipped.tech]));
        
        const slotTypes = ['weapon', 'turret', 'drone'];
        slotTypes.forEach(slotType => {
             chassis.slots?.[slotType]?.forEach((slot, index) => {
                const instanceId = equipped[slotType]?.[index];
                const partInst = this.playerData.owned[slotType]?.find(w => w.instanceId === instanceId);
                const partData = partInst ? this.PARTS[slotType]?.[partInst.id] : null;
                grid.appendChild(createSlot(slot.label, partData));
            });
        });
    },

    populatePartSelection: function() {
        const container = this.gameContainer.querySelector('#part-selection-container');
        if (!container) return;

        let tabsHTML = '<div class="part-tabs">';
        let panesHTML = '<div class="part-tab-content">';

        for (const type in this.PARTS) {
            const isActive = type === this.activeCategory;
            tabsHTML += `<div class="part-tab ${isActive ? 'active' : ''}" data-type="${type}">${type.toUpperCase()}</div>`;
            panesHTML += `<div class="part-tab-pane ${isActive ? 'active' : ''}" id="tab-pane-${type}"><ul class="part-list">`;
            
            const ownedParts = this.playerData.owned[type] || [];
            
            ownedParts.forEach(partOrId => {
                const partId = typeof partOrId === 'object' ? partOrId.id : partOrId;
                const instanceId = typeof partOrId === 'object' ? partOrId.instanceId : null;
                const part = this.PARTS[type][partId];

                let actionButtons = '';
                const isArraySlot = ['weapon', 'turret', 'drone'].includes(type);

                if (isArraySlot) {
                    const isEquipped = this.playerData.equipped[type]?.includes(instanceId);
                    if (isEquipped) {
                        const slotIndex = this.playerData.equipped[type].indexOf(instanceId);
                        actionButtons = `<button class="part-unequip-button part-action-button" data-type="${type}" data-slotindex="${slotIndex}">Unequip</button>`;
                    } else {
                        const numSlots = this.PARTS.chassis[this.playerData.equipped.chassis].slots?.[type]?.length || 0;
                        for (let i = 0; i < numSlots; i++) {
                            if (!this.playerData.equipped[type][i]) {
                                 actionButtons += `<button class="part-equip-button part-action-button" data-type="${type}" data-slotindex="${i}" data-instanceid="${instanceId}">Slot ${i + 1}</button>`;
                            }
                        }
                    }
                } else {
                    const isEquipped = this.playerData.equipped[type] === partId;
                    if (isEquipped) {
                        actionButtons = `<span>EQUIPPED</span>`;
                        if (type !== 'chassis') {
                            actionButtons += ` <button class="part-unequip-button part-action-button" data-type="${type}">X</button>`;
                        }
                    } else {
                        actionButtons = `<button class="part-equip-button part-action-button" data-type="${type}" data-partid="${partId}">Equip</button>`;
                    }
                }

                panesHTML += `<li class="part-item ${actionButtons.includes('EQUIPPED') || actionButtons.includes('Unequip') ? 'in-use' : ''}">
                    <div class="part-item-header">
                        <span class="part-item-name">${part.name} ${instanceId ? `(#${instanceId})` : ''}</span>
                        <div class="part-action-buttons">${actionButtons}</div>
                    </div>
                </li>`;
            });
            panesHTML += `</ul></div>`;
        }
        tabsHTML += '</div>';
        panesHTML += '</div>';
        container.innerHTML = tabsHTML + panesHTML;
    },

    equipPart: function(type, id, slotIndex) {
        const isArraySlot = ['weapon', 'turret', 'drone'].includes(type);
        if (isArraySlot) {
            this.playerData.equipped[type][slotIndex] = parseInt(id, 10);
        } else {
            this.playerData.equipped[type] = id;
            if (type === 'chassis') {
                this.validateAllSlots();
            }
        }
        this.refreshHangar();
    },

    unequipPart: function(type, slotIndex) {
        const isArraySlot = ['weapon', 'turret', 'drone'].includes(type);
        if (isArraySlot) {
            this.playerData.equipped[type][slotIndex] = null;
        } else {
            this.playerData.equipped[type] = null;
        }
        this.refreshHangar();
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
    
    addEventListeners: function() {
        this.exitHangarHandler = () => { if(this.onSuccess) this.onSuccess({ from: 'hangar', playerData: this.playerData }); };
        this.launchTestFlightHandler = () => { if (this.onSuccess) this.onSuccess({ nextGame: 'vectorTestFlight', returnTo: 'vectorArenaHangar', playerData: this.playerData }); };
        this.shopHandler = () => { if (this.onSuccess) this.onSuccess({ nextGame: 'vectorShop', returnTo: 'vectorArenaHangar', playerData: this.playerData }); }

        this.inventoryClickHandler = (e) => {
            const button = e.target.closest('.part-action-button');
            const tab = e.target.closest('.part-tab');

            if (button) {
                const { type, partid, slotindex, instanceid } = button.dataset;
                if (button.classList.contains('part-equip-button')) {
                    this.equipPart(type, instanceid || partid, slotindex);
                } else if (button.classList.contains('part-unequip-button')) {
                    this.unequipPart(type, slotindex);
                }
            } else if (tab) {
                this.activeCategory = tab.dataset.type;
                this.populatePartSelection();
            }
        };
        
        const backButton = this.gameContainer.querySelector('#hangar-back-btn');
        if (backButton) backButton.addEventListener('click', this.exitHangarHandler);
        
        const partContainer = this.gameContainer.querySelector('#part-selection-container');
        if (partContainer) partContainer.addEventListener('click', this.inventoryClickHandler);

        const testFlightButton = this.gameContainer.querySelector('#hangar-launch-test-flight-btn');
        if (testFlightButton) testFlightButton.addEventListener('click', this.launchTestFlightHandler);
        
        const shopButton = this.gameContainer.querySelector('#shop-btn');
        if (shopButton) shopButton.addEventListener('click', this.shopHandler);
    },

    destroy: function() {
        if(this.gameContainer){
            const backButton = this.gameContainer.querySelector('#hangar-back-btn');
            if (backButton) backButton.removeEventListener('click', this.exitHangarHandler);
            const partContainer = this.gameContainer.querySelector('#part-selection-container');
            if (partContainer) partContainer.removeEventListener('click', this.inventoryClickHandler);
            const testFlightButton = this.gameContainer.querySelector('#hangar-launch-test-flight-btn');
            if (testFlightButton) testFlightButton.removeEventListener('click', this.launchTestFlightHandler);
            const shopButton = this.gameContainer.querySelector('#shop-btn');
            if (shopButton) shopButton.removeEventListener('click', this.shopHandler);
            this.gameContainer.innerHTML = '';
        }
        console.log("Vector Arena Hangar Destroyed.");
    },
};

