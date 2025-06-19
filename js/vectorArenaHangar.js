/**
 * vectorArenaHangar.js
 * This module serves as the player's hangar, for viewing and customizing their ship.
 * It now loads parts data dynamically.
 */
const VectorArenaHangarGame = {
    id: 'vectorArenaHangar',
    onSuccess: null,
    gameContainer: null,
    playerData: null, 
    PARTS: null, // Will be loaded from the JSON file

    /**
     * Initializes the Hangar screen.
     */
    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        console.log("Vector Arena Hangar Initializing.");

        // Load the master parts list first
        this.PARTS = await PartsLoader.getParts();
        if (!this.PARTS) {
            console.error("CRITICAL: Hangar could not load parts data. Aborting.");
            return;
        }

        // Load player data from shared context, or use a default if none exists.
        this.playerData = sharedData.playerData || {
            credits: 2000,
            owned: {
                chassis: ['interceptor', 'juggernaut'],
                weapon: [
                    { id: 'pulse_laser', instanceId: 1 },
                    { id: 'pulse_laser', instanceId: 2 }, 
                    { id: 'spread_shot', instanceId: 3 },
                    { id: 'homing_missiles', instanceId: 4 }
                ],
                engine: ['standard_ion', 'overcharged_fusion'],
                shield: ['basic_shield'],
                thrusters: ['maneuvering_jets'],
                special: ['burst_thruster'],
                tech: ['fire_rate_controller']
            },
            equipped: {
                chassis: 'interceptor',
                weapon: 1, 
                weapon_secondary: null, 
                engine: 'standard_ion',
                shield: 'basic_shield',
                thrusters: 'maneuvering_jets',
                special: null,
                tech: null
            }
        };

        this.setupUI();
        this.addEventListeners();
        this.refreshHangar(); // Initial draw and population
    },

    /**
     * Creates the HTML for the Hangar.
     */
    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .hangar-container { display: flex; flex-direction: row; justify-content: center; align-items: stretch; width: 100%; height: 100%; background: #080a10; font-family: 'Courier New', monospace; color: white; padding: 20px; box-sizing: border-box; gap: 20px; }
                .hangar-column { flex: 1; padding: 20px; background: #111; border: 1px solid #333; overflow-y: auto; }
                .ship-display { flex-basis: 40%; text-align: center; }
                .ship-display h2 { color: #00aaff; border-bottom: 2px solid #444; padding-bottom: 10px; margin-top: 0; }
                #hangar-canvas { background: #0c0c0c; width: 100%; max-width: 400px; aspect-ratio: 1 / 1; }
                .stats-display h3 { color: #00aaff; margin-top: 15px; margin-bottom: 5px; border-top: 1px solid #333; padding-top: 10px; }
                .stats-display p { background: #1a1a1a; padding: 8px; margin: 5px 0; border-left: 3px solid #00aaff; font-size: 0.9em; }
                .customize-display { flex-basis: 35%; }
                
                /* Tab Styles */
                .part-tabs { display: flex; border-bottom: 1px solid #444; margin-bottom: 10px; flex-wrap: wrap;}
                .part-tab { padding: 10px 15px; cursor: pointer; background: #222; border: 1px solid #444; border-bottom: none; margin-right: 5px; margin-bottom: -1px; }
                .part-tab.active { background: #111; border-bottom: 1px solid #111; color: #00aaff; }
                .part-tab-pane { display: none; }
                .part-tab-pane.active { display: block; }

                .part-list { list-style-type: none; padding: 0; }
                .part-item { background: #222; margin-bottom: 8px; padding: 10px; border: 1px solid #444; }
                .part-item-header { display: flex; justify-content: space-between; align-items: center; }
                .part-item.in-use { background: #333; color: #777; }
                .part-item-name { font-weight: bold; }
                .part-item-stats { font-size: 0.8em; color: #0f0; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #444; }
                .part-action-button { background: #00aaff; color: #000; border: none; padding: 5px 10px; cursor: pointer; margin-left: 5px; }
                .part-unequip-button { background: #ff4400; color: #fff; }

                .hangar-menu { flex-basis: 25%; display: flex; flex-direction: column; justify-content: space-between; }
                .hangar-menu button { display: block; width: 100%; background: transparent; border: 2px solid #00aaff; color: #00aaff; padding: 15px 30px; font-size: 1.5em; cursor: pointer; margin-top: 10px; transition: all 0.3s ease; }
                .hangar-menu button:hover { background: #00aaff; color: #000; box-shadow: 0 0 15px #00aaff; }
            </style>
            <div class="hangar-container">
                <div class="hangar-column ship-display">
                    <h2>SHIP BLUEPRINT</h2>
                    <canvas id="hangar-canvas" width="400" height="400"></canvas>
                    <div class="stats-display" id="ship-stats-list"></div>
                </div>
                 <div class="hangar-column customize-display">
                    <h2>INVENTORY</h2>
                    <div id="part-selection-container"></div>
                 </div>
                 <div class="hangar-column hangar-menu">
                    <div>
                        <h2>ACTIONS</h2>
                        <button id="hangar-launch-test-flight-btn">Test Flight</button>
                        <button id="shop-btn">Go to Shop</button>
                    </div>
                    <button id="hangar-back-btn">Return to Menu</button>
                </div>
            </div>
        `;
    },

    refreshHangar: function() {
        this.updateStatsDisplay();
        this.populatePartSelection();
        this.drawHangarShip();
    },

    updateStatsDisplay: function() {
        const statsContainer = this.gameContainer.querySelector('#ship-stats-list');
        if (!statsContainer) return;

        const equipped = this.playerData.equipped;
        const chassis = this.PARTS.chassis[equipped.chassis];
        const primaryWeaponInst = this.playerData.owned.weapon.find(w => w.instanceId === equipped.weapon);
        const secondaryWeaponInst = this.playerData.owned.weapon.find(w => w.instanceId === equipped.weapon_secondary);
        const primaryWeapon = primaryWeaponInst ? this.PARTS.weapon[primaryWeaponInst.id] : null;
        const secondaryWeapon = secondaryWeaponInst ? this.PARTS.weapon[secondaryWeaponInst.id] : null;
        const engine = equipped.engine ? this.PARTS.engine[equipped.engine] : null;
        const thrusters = equipped.thrusters ? this.PARTS.thrusters[equipped.thrusters] : null;
        const shield = equipped.shield ? this.PARTS.shield[equipped.shield] : null;
        const tech = equipped.tech ? this.PARTS.tech[equipped.tech] : null;

        const effectiveThrust = engine ? (chassis.baseThrust * engine.thrustMultiplier).toFixed(2) : '0.00';
        const effectiveStrafe = thrusters ? (chassis.baseStrafe + thrusters.strafeBonus).toFixed(2) : chassis.baseStrafe.toFixed(2);
        const effectiveTurn = thrusters ? (chassis.baseTurn + thrusters.turnBonus).toFixed(2) : chassis.baseTurn.toFixed(2);
        
        let statsHTML = `<h3>CORE STATS</h3><p><strong>Hull:</strong> ${chassis.health} HP</p>`;
        statsHTML += shield ? `<p><strong>Shield:</strong> ${shield.health} HP (${shield.regen}/s)</p>` : `<p><strong>Shield:</strong> None</p>`;
        
        statsHTML += `<h3>MOBILITY</h3><p><strong>Thrust Power:</strong> ${effectiveThrust}</p><p><strong>Strafe Power:</strong> ${effectiveStrafe}</p><p><strong>Turn Speed:</strong> ${effectiveTurn}</p>`;

        statsHTML += `<hr><h3>WEAPONS</h3>`;
        if (primaryWeapon) {
            const cooldownReduction = tech && tech.cooldownReduction ? tech.cooldownReduction : 0;
            const finalCooldown = Math.max(1, primaryWeapon.cooldown - cooldownReduction);
            statsHTML += `<p><strong>Primary:</strong> ${primaryWeapon.name} (CD: ${finalCooldown})</p>`;
        } else {
             statsHTML += `<p><strong>Primary:</strong> Empty</p>`;
        }
        if(secondaryWeapon) {
             const cooldownReduction = tech && tech.cooldownReduction ? tech.cooldownReduction : 0;
             const finalCooldown = Math.max(1, secondaryWeapon.cooldown - cooldownReduction);
             statsHTML += `<p><strong>Secondary:</strong> ${secondaryWeapon.name} (CD: ${finalCooldown})</p>`;
        } else {
            statsHTML += `<p><strong>Secondary:</strong> Empty</p>`;
        }
        
        statsContainer.innerHTML = statsHTML;
    },

    populatePartSelection: function() {
        const container = this.gameContainer.querySelector('#part-selection-container');
        if (!container) return;

        let tabsHTML = '<div class="part-tabs">';
        let panesHTML = '<div class="part-tab-content">';
        let isFirstTab = true;

        for (const type in this.PARTS) {
            tabsHTML += `<div class="part-tab ${isFirstTab ? 'active' : ''}" data-type="${type}">${type.toUpperCase()}</div>`;
            panesHTML += `<div class="part-tab-pane ${isFirstTab ? 'active' : ''}" id="tab-pane-${type}"><ul class="part-list">`;
            
            const ownedParts = this.playerData.owned[type] || [];
            
            ownedParts.forEach(partOrId => {
                const isWeapon = type === 'weapon';
                const partId = isWeapon ? partOrId.id : partOrId;
                const instanceId = isWeapon ? partOrId.instanceId : null;
                const part = this.PARTS[type][partId];

                let actionButtons = '';
                if (isWeapon) {
                    const isEquipped = instanceId === this.playerData.equipped.weapon || instanceId === this.playerData.equipped.weapon_secondary;
                    if (isEquipped) {
                        actionButtons = `<span>EQUIPPED</span>`;
                    } else {
                        actionButtons = `<button class="part-equip-button part-action-button" data-type="weapon" data-slot="primary" data-instanceid="${instanceId}">Pri</button>
                                       <button class="part-equip-button part-action-button" data-type="weapon" data-slot="secondary" data-instanceid="${instanceId}">Sec</button>`;
                    }
                } else {
                    const isEquipped = this.playerData.equipped[type] === partId;
                    if (isEquipped) {
                        actionButtons = '<span>EQUIPPED</span>';
                        if (type !== 'chassis') {
                            actionButtons += ` <button class="part-unequip-button part-action-button" data-type="${type}">X</button>`;
                        }
                    } else {
                        actionButtons = `<button class="part-equip-button part-action-button" data-type="${type}" data-partid="${partId}">Equip</button>`;
                    }
                }

                panesHTML += `<li class="part-item ${actionButtons.includes('EQUIPPED') ? 'in-use' : ''}">
                    <div class="part-info">
                        <div class="part-item-header">
                            <span class="part-item-name">${part.name} ${isWeapon ? `(#${instanceId})` : ''}</span>
                            <div>${actionButtons}</div>
                        </div>
                        <small>${part.desc}</small>
                        <div class="part-item-stats">${this.getPartStatsHTML(part)}</div>
                    </div>
                </li>`;
            });
            panesHTML += `</ul></div>`;
            isFirstTab = false;
        }
        tabsHTML += '</div>';
        panesHTML += '</div>';
        container.innerHTML = tabsHTML + panesHTML;
    },

    getPartStatsHTML: function(part) {
        let stats = [];
        if(part.health) stats.push(`Hull/HP: ${part.health}`);
        if(part.regen) stats.push(`Regen: ${part.regen}/s`);
        if(part.baseThrust) stats.push(`Base Thrust: ${part.baseThrust}`);
        if(part.thrustMultiplier) stats.push(`Thrust Multi: ${part.thrustMultiplier}x`);
        if(part.turnBonus) stats.push(`Turn Bonus: +${part.turnBonus}`);
        if(part.strafeBonus) stats.push(`Strafe Bonus: +${part.strafeBonus}`);
        if(part.cooldownReduction) stats.push(`CD Reduction: -${part.cooldownReduction}`);
        if(part.damage) stats.push(`Damage: ${part.damage}`);
        if(part.cooldown) stats.push(`Cooldown: ${part.cooldown}f`);
        if(part.boostMultiplier) stats.push(`Boost Multi: ${part.boostMultiplier}x`);
        if(part.duration) stats.push(`Duration: ${part.duration}f`);
        return stats.join(' | ');
    },

    equipPart: function(type, id, slot) {
        if (type === 'weapon') {
            this.playerData.equipped[slot === 'secondary' ? 'weapon_secondary' : 'weapon'] = parseInt(id, 10);
        } else {
            this.playerData.equipped[type] = id;
        }
        this.refreshHangar();
    },
    
    unequipPart: function(type, slot) {
        this.playerData.equipped[type === 'weapon' ? (slot === 'secondary' ? 'weapon_secondary' : 'weapon') : type] = null;
        this.refreshHangar();
    },

    drawHangarShip: function() {
        const canvas = this.gameContainer.querySelector('#hangar-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const chassis = this.PARTS.chassis[this.playerData.equipped.chassis];
        const shield = this.playerData.equipped.shield ? this.PARTS.shield[this.playerData.equipped.shield] : null;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const shipSize = chassis.size * 5;
        const shipColor = chassis.color;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        if (shield) {
            ctx.beginPath();
            ctx.arc(0, 0, shipSize * 1.2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 150, 255, 0.5)";
            ctx.fillStyle = "rgba(0, 50, 100, 0.2)";
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        }

        ctx.strokeStyle = shipColor;
        ctx.lineWidth = 3;
        if (chassis.art === 'juggernaut') {
            ctx.beginPath();
            ctx.rect(-shipSize * 0.7, -shipSize * 0.5, shipSize * 1.4, shipSize);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(shipSize, 0);
            ctx.lineTo(-shipSize / 2, shipSize / 1.5);
            ctx.lineTo(-shipSize / 2, -shipSize / 1.5);
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.restore();
    },
    
    addEventListeners: function() {
        this.exitHangarHandler = () => { if(this.onSuccess) this.onSuccess({ from: 'hangar', playerData: this.playerData }); };
        this.launchTestFlightHandler = () => {
            if (this.onSuccess) {
                this.onSuccess({ nextGame: 'vectorTestFlight', returnTo: 'vectorArenaHangar', playerData: this.playerData });
            }
        };
        this.shopHandler = () => {
             if (this.onSuccess) this.onSuccess({ nextGame: 'vectorShop', returnTo: 'vectorArenaHangar', playerData: this.playerData });
        }

        // This combined handler uses event delegation for all clicks within the inventory column
        this.inventoryClickHandler = (e) => {
            const button = e.target.closest('.part-action-button');
            const tab = e.target.closest('.part-tab');

            if (button) {
                const { type, partid, slot, instanceid } = button.dataset;
                if (button.classList.contains('part-equip-button')) {
                    this.equipPart(type, instanceid || partid, slot);
                } else if (button.classList.contains('part-unequip-button')) {
                    this.unequipPart(type, slot);
                }
            } else if (tab) {
                const type = tab.dataset.type;
                this.gameContainer.querySelectorAll('.part-tab, .part-tab-pane').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                this.gameContainer.querySelector(`#tab-pane-${type}`).classList.add('active');
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
        const backButton = this.gameContainer.querySelector('#hangar-back-btn');
        if (backButton) backButton.removeEventListener('click', this.exitHangarHandler);
        
        const partContainer = this.gameContainer.querySelector('#part-selection-container');
        if (partContainer) partContainer.removeEventListener('click', this.inventoryClickHandler);

        const testFlightButton = this.gameContainer.querySelector('#hangar-launch-test-flight-btn');
        if (testFlightButton) testFlightButton.removeEventListener('click', this.launchTestFlightHandler);
        
        const shopButton = this.gameContainer.querySelector('#shop-btn');
        if (shopButton) shopButton.removeEventListener('click', this.shopHandler);

        this.gameContainer.innerHTML = '';
        console.log("Vector Arena Hangar Destroyed.");
    },
};

