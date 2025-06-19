/**
 * vectorShop.js
 * This module allows the player to purchase new ship parts.
 * It is launched from the Hangar.
 */
const VectorShopGame = {
    id: 'vectorShop',
    onSuccess: null,
    gameContainer: null,
    playerData: null,

    /**
     * Initializes the Shop screen.
     */
    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.playerData = sharedData.playerData;
        console.log("Vector Shop Initialized with credits:", this.playerData.credits);

        this.setupUI();
        this.addEventListeners();
        this.refreshShopView();
    },

    /**
     * Creates the HTML structure for the Shop.
     */
    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .shop-container { display: flex; flex-direction: column; width: 100%; height: 100%; background: #1a1a2a; font-family: 'Courier New', Courier, monospace; color: white; }
                .shop-header { padding: 10px 20px; background: #111; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00aaff; }
                .shop-header h1 { margin: 0; color: #00aaff; }
                #player-credits-display { font-size: 1.5em; color: #0f0; }
                .shop-main { display: flex; flex: 1; overflow: hidden; }
                .shop-sidebar { flex: 0 0 200px; background: #111; padding: 10px; overflow-y: auto; border-right: 1px solid #444;}
                .category-button { display: block; width: 100%; padding: 15px; margin-bottom: 10px; background: #222; border: 1px solid #444; color: white; cursor: pointer; text-align: left; font-size: 1.1em; }
                .category-button.active { background: #00aaff; color: #000; }
                .shop-item-list { flex: 1; padding: 20px; overflow-y: auto; }
                .shop-item { display: flex; justify-content: space-between; align-items: center; background: #222; padding: 15px; margin-bottom: 10px; border-left: 4px solid #444; }
                .shop-item-info h4 { margin: 0 0 5px 0; color: #00aaff; }
                .shop-item-info p { margin: 0 0 10px 0; font-size: 0.9em; color: #aaa; }
                .shop-item-stats { font-size: 0.8em; color: #0f0; }
                .shop-item-actions button { font-size: 1em; padding: 10px 20px; cursor: pointer; border: none; }
                .buy-button { background: #00aaff; color: #000; }
                .buy-button:disabled { background: #555; cursor: not-allowed; }
                .shop-footer { padding: 10px; background: #111; text-align: right; border-top: 1px solid #444; }
                .exit-button { background: #ff4400; color: white; border: 2px solid #ff6600; padding: 10px 30px; font-size: 1.2em; cursor: pointer; }
            </style>
            <div class="shop-container">
                <div class="shop-header">
                    <h1>PARTS VENDOR</h1>
                    <div id="player-credits-display">Credits: 0</div>
                </div>
                <div class="shop-main">
                    <div class="shop-sidebar" id="shop-categories"></div>
                    <div class="shop-item-list" id="shop-item-list"></div>
                </div>
                <div class="shop-footer">
                    <button id="shop-exit-btn" class="exit-button">Return to Hangar</button>
                </div>
            </div>
        `;
    },

    refreshShopView: function() {
        this.updateCredits();
        this.populateCategories();
        if (Object.keys(this.PARTS).length > 0) {
            this.showCategory(Object.keys(this.PARTS)[0]);
        }
    },
    
    updateCredits: function() {
        const creditsDisplay = this.gameContainer.querySelector('#player-credits-display');
        if (creditsDisplay) {
            creditsDisplay.textContent = `Credits: ${this.playerData.credits || 0}`;
        }
    },

    populateCategories: function() {
        const container = this.gameContainer.querySelector('#shop-categories');
        container.innerHTML = '';
        for (const type in this.PARTS) {
            const button = document.createElement('button');
            button.className = 'category-button';
            button.textContent = type.toUpperCase();
            button.dataset.type = type;
            container.appendChild(button);
        }
        const firstButton = container.querySelector('.category-button');
        if (firstButton) {
            firstButton.classList.add('active');
        }
    },

    showCategory: function(category) {
        const listContainer = this.gameContainer.querySelector('#shop-item-list');
        listContainer.innerHTML = '';

        this.gameContainer.querySelectorAll('.category-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === category);
        });

        for (const partId in this.PARTS[category]) {
            const part = this.PARTS[category][partId];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';

            const canAfford = this.playerData.credits >= part.cost;
            let buyButtonHTML;
            if (category === 'weapon') {
                buyButtonHTML = `<button class="buy-button" data-type="${category}" data-partid="${partId}" ${canAfford ? '' : 'disabled'}>Buy (${part.cost}c)</button>`;
            } else {
                const isOwned = this.playerData.owned[category]?.includes(partId);
                buyButtonHTML = isOwned ? `<span>OWNED</span>` : `<button class="buy-button" data-type="${category}" data-partid="${partId}" ${canAfford ? '' : 'disabled'}>Buy (${part.cost}c)</button>`;
            }

            itemDiv.innerHTML = `
                <div class="shop-item-info">
                    <h4>${part.name}</h4>
                    <p>${part.desc}</p>
                    <div class="shop-item-stats">${this.getPartStatsHTML(part)}</div>
                </div>
                <div class="shop-item-actions">
                    ${buyButtonHTML}
                </div>
            `;
            listContainer.appendChild(itemDiv);
        }
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

    buyPart: function(type, partId) {
        const part = this.PARTS[type][partId];
        if (this.playerData.credits < part.cost) {
            console.log("Cannot afford part.");
            return;
        }

        this.playerData.credits -= part.cost;

        if (type === 'weapon') {
            const maxInstanceId = this.playerData.owned.weapon.reduce((max, w) => Math.max(max, w.instanceId), 0);
            this.playerData.owned.weapon.push({ id: partId, instanceId: maxInstanceId + 1 });
        } else {
            if (!this.playerData.owned[type]) {
                this.playerData.owned[type] = [];
            }
            if (!this.playerData.owned[type].includes(partId)) {
                this.playerData.owned[type].push(partId);
            }
        }
        
        console.log(`Bough ${part.name}. Remaining credits: ${this.playerData.credits}`);
        this.refreshShopView();
    },

    addEventListeners: function() {
        this.exitHandler = () => {
            if(this.onSuccess) this.onSuccess({ from: 'shop', playerData: this.playerData });
        };
        this.categoryClickHandler = (e) => {
            if (e.target.classList.contains('category-button')) {
                this.showCategory(e.target.dataset.type);
            }
        };
        this.buyClickHandler = (e) => {
             if (e.target.classList.contains('buy-button')) {
                const { type, partid } = e.target.dataset;
                this.buyPart(type, partid);
            }
        };

        const exitButton = this.gameContainer.querySelector('#shop-exit-btn');
        if (exitButton) exitButton.addEventListener('click', this.exitHandler);

        const categoriesContainer = this.gameContainer.querySelector('#shop-categories');
        if (categoriesContainer) categoriesContainer.addEventListener('click', this.categoryClickHandler);

        const itemListContainer = this.gameContainer.querySelector('#shop-item-list');
        if(itemListContainer) itemListContainer.addEventListener('click', this.buyClickHandler);
    },

    destroy: function() {
        // ... (Cleanup logic for all listeners) ...
        this.gameContainer.innerHTML = '';
        console.log("Vector Shop Destroyed.");
    },

    // --- MASTER PARTS LIST FOR THE SHOP ---
    PARTS: {
        chassis: {
            interceptor: { name: 'Interceptor', desc: 'A light, agile frame.', cost: 1000, health: 100, size: 15, baseThrust: 0.1, baseStrafe: 0.08, baseTurn: 5, color: '#00aaff', art: 'interceptor' },
            juggernaut: { name: 'Juggernaut', desc: 'Heavy and tough, but slow.', cost: 1500, health: 200, size: 20, baseThrust: 0.07, baseStrafe: 0.04, baseTurn: 2, color: '#ff8800', art: 'juggernaut' },
            wraith: { name: 'Wraith', desc: 'Fragile but has a high energy ceiling.', cost: 2200, health: 80, size: 14, baseThrust: 0.12, baseStrafe: 0.09, baseTurn: 6, color: '#9966ff', art: 'interceptor' },
            goliath: { name: 'Goliath', desc: 'The ultimate defensive platform.', cost: 4000, health: 350, size: 25, baseThrust: 0.05, baseStrafe: 0.03, baseTurn: 1, color: '#cccccc', art: 'juggernaut' },
            phantom: { name: 'Phantom', desc: 'Advanced stealth capabilities.', cost: 5500, health: 90, size: 13, baseThrust: 0.11, baseStrafe: 0.1, baseTurn: 7, color: '#7f8c8d', art: 'interceptor' },
            leviathan: { name: 'Leviathan', desc: 'A true behemoth of a ship.', cost: 12000, health: 500, size: 30, baseThrust: 0.04, baseStrafe: 0.02, baseTurn: 0.5, color: '#34495e', art: 'juggernaut' },
        },
        weapon: {
            pulse_laser: { name: 'Pulse Laser', desc: 'Standard energy weapon.', cost: 500, damage: 10, cooldown: 15, type: 'pulse' },
            spread_shot: { name: 'Spread Shot', desc: 'Fires three projectiles.', cost: 800, damage: 7, cooldown: 30, type: 'spread' },
            homing_missiles: { name: 'Homing Missile Pod', desc: 'Fires a seeking projectile.', cost: 1200, damage: 25, cooldown: 80, type: 'missile' },
            beam_laser: { name: 'Beam Laser', desc: 'A continuous damage beam.', cost: 1500, damage: 2.5, cooldown: 0, type: 'beam' },
            railgun: { name: 'Railgun', desc: 'High-velocity piercing shot.', cost: 2500, damage: 40, cooldown: 90, type: 'railgun' },
            plasma_cannon: { name: 'Plasma Cannon', desc: 'Area-of-effect explosive.', cost: 2200, damage: 30, cooldown: 60, type: 'plasma' },
            flak_cannon: { name: 'Flak Cannon', desc: 'Fires a cloud of shrapnel.', cost: 1800, damage: 5, cooldown: 40, type: 'spread' },
            tachyon_lance: { name: 'Tachyon Lance', desc: 'Massive damage, long cooldown.', cost: 5000, damage: 100, cooldown: 200, type: 'railgun' },
            singularity_cannon: { name: 'Singularity Cannon', desc: 'Creates a damaging vortex.', cost: 8000, damage: 5, cooldown: 180, type: 'vortex' },
        },
        engine: {
            standard_ion: { name: 'Standard Ion', desc: 'A reliable, basic engine.', cost: 400, thrustMultiplier: 1.0 },
            overcharged_fusion: { name: 'Overcharged Fusion', desc: 'Higher thrust, less efficient.', cost: 900, thrustMultiplier: 1.4 },
            vector_drive: { name: 'Vector Drive', desc: 'Improves strafing effectiveness.', cost: 1300, thrustMultiplier: 1.1 },
            warp_core: { name: 'Warp Core', desc: 'Experimental, unstable power.', cost: 3200, thrustMultiplier: 1.8 },
        },
        shield: {
            basic_shield: { name: 'Basic Shield', desc: 'Standard deflector shield.', cost: 750, health: 50, regen: 1 },
            reactive_shield: { name: 'Reactive Shield', desc: 'Hardened against kinetic impact.', cost: 1400, health: 75, regen: 0.5 },
            energy_barrier: { name: 'Energy Barrier', desc: 'High capacity, slow to recharge.', cost: 1800, health: 120, regen: 0.2 },
            phase_field: { name: 'Phase Field', desc: 'Chance to ignore damage.', cost: 4000, health: 40, regen: 2 },
        },
        thrusters: {
            maneuvering_jets: { name: 'Maneuvering Jets', desc: 'Improves turning and strafing.', cost: 600, turnBonus: 2, strafeBonus: 0.02 },
            inertial_dampeners: { name: 'Inertial Dampeners', desc: 'Improves handling and drift.', cost: 1100, turnBonus: 1, strafeBonus: 0.04 },
            phase_thrusters: { name: 'Phase Thrusters', desc: 'Allows short-range phase jumps.', cost: 3500, turnBonus: 3, strafeBonus: 0.03 },
        },
        special: {
            burst_thruster: { name: 'Burst Thruster', desc: 'A short, powerful forward boost.', cost: 1000, type: 'boost', boostMultiplier: 4, duration: 15, cooldown: 120},
            emp_blast: { name: 'EMP Blast', desc: 'Disables nearby opponents.', cost: 1800, type: 'emp', duration: 180, cooldown: 300 },
            cloak_field: { name: 'Cloaking Field', desc: 'Renders ship invisible.', cost: 2500, type: 'cloak', duration: 240, cooldown: 400 },
            repair_drones: { name: 'Repair Drones', desc: 'Deploys drones to heal your ship.', cost: 2200, type: 'repair' },
        },
        tech: {
            fire_rate_controller: { name: 'Fire-Rate Controller', desc: 'Reduces weapon cooldowns.', cost: 1500, cooldownReduction: 5 },
            energy_siphon: { name: 'Energy Siphon', desc: 'Converts a portion of damage to energy.', cost: 2000 },
            targeting_cpu: { name: 'Targeting CPU', desc: 'Improves projectile accuracy.', cost: 1200 },
            augmented_projectiles: { name: 'Augmented Projectiles', desc: 'Increases projectile speed.', cost: 1800 }
        }
    }
};

