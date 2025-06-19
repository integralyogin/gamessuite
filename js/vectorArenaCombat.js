/**
 * vectorArenaCombat.js - v13 (Uses Shared Objects Correctly)
 * This module handles the core combat loop against an AI opponent.
 * It now uses the shared VectorArenaObjects library for all game objects.
 */
const VectorArenaCombatGame = {
    id: 'vectorArenaCombat',

    // --- Core State ---
    gameContainer: null,
    canvas: null,
    ctx: null,
    gameLoop: null,
    keys: {},
    playerShip: null,
    opponentShip: null,
    currentOpponent: null, 
    mousePos: { x: 0, y: 0 },
    projectiles: [],
    particles: [],
    onSuccess: null,
    onFailure: null,
    playerData: null,
    sceneInitialized: false,

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback; 
        this.playerData = sharedData.playerData;
        this.sceneInitialized = false;

        console.log("VectorArenaCombat: Initializing...");
        
        this.setupUI();
        this.addEventListeners();
        this.showScreen('opponent-select');
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .vac-container { width: 100%; height: 100%; background: #080a10; position: relative; font-family: 'Courier New', Courier, monospace; color: white; }
                .vac-screen { display: none; width: 100%; height: 100%; }
                #vac-opponent-select-screen { display: flex; flex-direction: column; padding: 20px; }
                #vac-opponent-select-screen h2 { text-align: center; color: #ff4400; border-bottom: 2px solid #555; padding-bottom: 10px; margin-top: 0;}
                #vac-opponent-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; overflow-y: auto; padding: 20px; }
                .vac-opponent-card { background: #111; border: 2px solid #444; padding: 15px; text-align: center; width: 200px; }
                .vac-opponent-card canvas { background: #0c0c0c; margin: 10px 0; border: 1px solid #333; }
                .vac-opponent-card button { width: 100%; padding: 10px; background: #ff4400; color: white; border: none; cursor: pointer; font-size: 1.1em; margin-top: 10px; }
                #vac-back-to-menu { margin-top: 20px; padding: 10px 20px; align-self: center; background: #555; border: none; color: white; cursor: pointer; }
                #vac-combat-screen { display: flex; background: #0c0c0c; cursor: crosshair; }
                #vac-canvas { display: block; width: 100%; height: 100%; }
                .vac-hud { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; pointer-events: none; }
                .vac-player-hud { background: rgba(0,0,0,0.5); padding: 10px; border: 1px solid #333; border-radius: 5px; width: 40%; }
                .vac-bar-container { width: 100%; height: 12px; background-color: #333; border: 1px solid #555; margin-top: 5px; }
                .vac-bar { height: 100%; transition: width 0.2s ease; }
            </style>
            <div class="vac-container">
                <div id="vac-opponent-select-screen" class="vac-screen">
                    <h2>ARENA BOUNTIES</h2>
                    <div id="vac-opponent-list"></div>
                    <button id="vac-back-to-menu">Return to Main Menu</button>
                </div>
                <div id="vac-combat-screen" class="vac-screen">
                    <canvas id="vac-canvas"></canvas>
                    <div class="vac-hud">
                        <div class="vac-player-hud">
                            <label>Player</label>
                            <div class="vac-bar-container"><div id="vac-p1-health" class="vac-bar" style="background-color: #00aaff;"></div></div>
                        </div>
                        <div class="vac-player-hud" style="text-align: right;">
                            <label>Opponent</label>
                            <div class="vac-bar-container"><div id="vac-p2-health" class="vac-bar" style="background-color: #ff4400;"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.canvas = document.getElementById('vac-canvas');
        this.ctx = this.canvas.getContext('2d');
    },
    
    showScreen: function(screenId) {
        this.gameContainer.querySelectorAll('.vac-screen').forEach(s => s.style.display = 'none');
        const screen = this.gameContainer.querySelector(`#vac-${screenId}-screen`);
        if (screen) screen.style.display = 'flex';
        if (screenId === 'opponent-select') this.populateOpponentList();
    },

    populateOpponentList: function() {
        const listContainer = document.getElementById('vac-opponent-list');
        listContainer.innerHTML = '';
        this.OPPONENTS.forEach((opponent, index) => {
            const card = document.createElement('div');
            card.className = 'vac-opponent-card';
            
            const canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 150;
            // Use the shared Ship class for the preview
            const tempShip = new VectorArenaObjects.Ship(75, 75, opponent.config, 2, this);
            tempShip.draw(canvas.getContext('2d'));

            card.innerHTML = `<h4>${opponent.name}</h4><p>Reward: ${opponent.credits}c</p>`;
            card.appendChild(canvas);
            const fightButton = document.createElement('button');
            fightButton.textContent = 'Fight';
            fightButton.dataset.opponentIndex = index;
            card.appendChild(fightButton);
            listContainer.appendChild(card);
        });
    },

    startCombat: function(opponent) {
        this.currentOpponent = opponent;
        this.sceneInitialized = false; 
        this.showScreen('combat');
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.update(), 1000 / 60);
    },
    
    initializeCombatScene: function() {
        this.resizeCanvas(); 
        if (this.canvas.width === 0) return;

        this.projectiles = [];
        this.particles = [];
        
        const opponentConfig = this.currentOpponent.config;
        this.playerShip = new VectorArenaObjects.Ship(this.canvas.width * 0.25, this.canvas.height / 2, this.playerData, 1, this);
        this.opponentShip = new VectorArenaObjects.Ship(this.canvas.width * 0.75, this.canvas.height / 2, opponentConfig, 2, this);
        this.opponentShip.angle = Math.PI;

        this.sceneInitialized = true;
        console.log("Combat scene initialized against:", this.currentOpponent.name);
    },

    update: function() {
        if (this.currentOpponent && !this.sceneInitialized) {
            this.initializeCombatScene();
            return;
        }
        if (!this.playerShip || !this.opponentShip || !this.ctx) return;
        
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.playerShip.update(this.keys, this.opponentShip);
        this.opponentShip.update({}, this.playerShip); 

        this.updateCollection(this.projectiles);
        this.updateCollection(this.particles);
        this.checkCollisions();
        
        this.drawCollection(this.projectiles);
        this.drawCollection(this.particles);
        this.playerShip.draw(this.ctx);
        this.opponentShip.draw(this.ctx);
        
        this.updateHUD();
        this.checkWinLoss();
    },

    updateHUD: function() {
        if (!this.playerShip || !this.opponentShip) return;
        const p1HealthBar = document.getElementById('vac-p1-health');
        if (p1HealthBar) p1HealthBar.style.width = `${(this.playerShip.health / this.playerShip.maxHealth) * 100}%`;
        const p2HealthBar = document.getElementById('vac-p2-health');
        if (p2HealthBar) p2HealthBar.style.width = `${(this.opponentShip.health / this.opponentShip.maxHealth) * 100}%`;
    },

    checkWinLoss: function() {
        if (!this.gameLoop || !this.playerShip || !this.opponentShip) return;
        if (this.opponentShip.health <= 0) this.endGame(true);
        else if (this.playerShip.health <= 0) this.endGame(false);
    },
    
    endGame: function(playerWon) {
        if (!this.gameLoop) return; 
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        console.log("Combat ended. Player won:", playerWon);
        if(playerWon) {
            this.playerData.credits = (this.playerData.credits || 0) + this.currentOpponent.credits; 
            this.onSuccess({ from: 'combat', result: 'victory', playerData: this.playerData });
        } else {
            this.onFailure({reason: "Your ship was destroyed in combat!"});
        }
    },

    updateCollection: function(collection) {
        for (let i = collection.length - 1; i >= 0; i--) {
            collection[i].update(this.opponentShip, this.playerShip);
            if (collection[i].life <= 0 || collection[i].isOutOfBounds(this.canvas)) {
                collection.splice(i, 1);
            }
        }
    },
    drawCollection: function(collection) {
        for (const item of collection) item.draw(this.ctx);
    },
    checkCollisions: function() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const target = proj.owner === 1 ? this.opponentShip : this.playerShip;
            if (!target) continue;
            const dist = Math.hypot(proj.x - target.x, proj.y - target.y);
            if (dist < target.size + proj.size) {
                target.takeDamage(proj.damage);
                if (!proj.isPiercing) {
                    this.projectiles.splice(i, 1); 
                }
                for (let j = 0; j < 5; j++) {
                    this.particles.push(new VectorArenaObjects.Particle(proj.x, proj.y, '#ff8800', 2, 1));
                }
            }
        }
    },
    addEventListeners: function() {
        this.boundKeyDown = e => { this.keys[e.key.toLowerCase()] = true; };
        this.boundKeyUp = e => { this.keys[e.key.toLowerCase()] = false; };
        this.boundMouseDown = e => { this.keys['mouse' + e.button] = true; };
        this.boundMouseUp = e => { this.keys['mouse' + e.button] = false; };
        this.boundResize = () => this.resizeCanvas();
        this.boundContextMenu = e => e.preventDefault();
        this.boundMouseMove = e => {
            if (!this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        };
        this.boundExitHandler = () => { if(this.onSuccess) this.onSuccess({ from: 'combat', result: 'menu' }); };
        this.boundOpponentSelect = (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.opponentIndex) {
                const index = parseInt(e.target.dataset.opponentIndex, 10);
                this.startCombat(this.OPPONENTS[index]);
            }
        };
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        window.addEventListener('resize', this.boundResize);
        this.gameContainer.addEventListener('mousemove', this.boundMouseMove);
        this.gameContainer.addEventListener('mousedown', this.boundMouseDown);
        this.gameContainer.addEventListener('mouseup', this.boundMouseUp);
        this.gameContainer.addEventListener('contextmenu', this.boundContextMenu);
        document.getElementById('vac-back-to-menu').addEventListener('click', this.boundExitHandler);
        document.getElementById('vac-opponent-list').addEventListener('click', this.boundOpponentSelect);
    },
    removeEventListeners: function() {
        if (!this.gameContainer) return;
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('resize', this.boundResize);
        this.gameContainer.removeEventListener('mousemove', this.boundMouseMove);
        this.gameContainer.removeEventListener('mousedown', this.boundMouseDown);
        this.gameContainer.removeEventListener('mouseup', this.boundMouseUp);
        this.gameContainer.removeEventListener('contextmenu', this.boundContextMenu);
        const exitButton = this.gameContainer.querySelector('#vac-back-to-menu');
        if (exitButton) exitButton.removeEventListener('click', this.boundExitHandler);
        const opponentList = this.gameContainer.querySelector('#vac-opponent-list');
        if(opponentList) opponentList.removeEventListener('click', this.boundOpponentSelect);
    },
    resizeCanvas: function() {
        if (!this.canvas) return;
        const container = document.getElementById('vac-combat-screen');
        if (container) {
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            if (this.canvas.width !== newWidth || this.canvas.height !== newHeight) {
                this.canvas.width = newWidth;
                this.canvas.height = newHeight;
            }
        }
    },
    destroy: function() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.removeEventListeners();
        if (this.gameContainer) this.gameContainer.innerHTML = '';
        console.log("VectorArenaCombatGame: Destroyed.");
    },

    OPPONENTS: [
        { name: 'Rookie Pilot', credits: 100, config: { owned: { weapon: [{ id: 'pulse_laser', instanceId: 101 }] }, equipped: { chassis: 'interceptor', engine: 'standard_ion', thrusters: 'maneuvering_jets', weapon: 101 } } },
        { name: 'Juggernaut Grunt', credits: 250, config: { owned: { weapon: [{ id: 'spread_shot', instanceId: 201 }] }, equipped: { chassis: 'juggernaut', engine: 'standard_ion', thrusters: null, weapon: 201, shield: 'basic_shield' } } },
        { name: 'Missile Boat', credits: 400, config: { owned: { weapon: [{ id: 'homing_missiles', instanceId: 301 }] }, equipped: { chassis: 'juggernaut', engine: 'standard_ion', thrusters: null, weapon: 301, shield: 'reactive_shield' } } }
    ],
    
    // --- MASTER PARTS LIST - Copied from Shop to be self-contained ---
    PARTS: {
        chassis: {
            interceptor: { name: 'Interceptor', health: 100, size: 15, baseThrust: 0.1, baseStrafe: 0.08, baseTurn: 5, color: '#00aaff', art: 'interceptor' },
            juggernaut: { name: 'Juggernaut', health: 200, size: 20, baseThrust: 0.07, baseStrafe: 0.04, baseTurn: 2, color: '#ff8800', art: 'juggernaut' },
            wraith: { name: 'Wraith', health: 80, size: 14, baseThrust: 0.12, baseStrafe: 0.09, baseTurn: 6, color: '#9966ff', art: 'interceptor' },
            goliath: { name: 'Goliath', health: 350, size: 25, baseThrust: 0.05, baseStrafe: 0.03, baseTurn: 1, color: '#cccccc', art: 'juggernaut' },
            phantom: { name: 'Phantom', health: 90, size: 13, baseThrust: 0.11, baseStrafe: 0.1, baseTurn: 7, color: '#7f8c8d', art: 'interceptor' },
            leviathan: { name: 'Leviathan', health: 500, size: 30, baseThrust: 0.04, baseStrafe: 0.02, baseTurn: 0.5, color: '#34495e', art: 'juggernaut' },
        },
        weapon: {
            pulse_laser: { name: 'Pulse Laser', damage: 10, cooldown: 15, speed: 7, color: '#00ff00', size: 3, type: 'pulse' },
            spread_shot: { name: 'Spread Shot', damage: 7, cooldown: 30, speed: 6, color: '#ffff00', size: 2, type: 'spread' },
            homing_missiles: { name: 'Homing Missile Pod', damage: 25, cooldown: 80, speed: 4, turn: 0.05, color: '#ff6600', size: 4, type: 'missile' },
            beam_laser: { name: 'Beam Laser', damage: 2.5, cooldown: 0, speed: 20, color: '#ff0000', size: 2, type: 'beam' },
            railgun: { name: 'Railgun', damage: 40, cooldown: 90, speed: 25, color: '#00ffff', size: 2, type: 'railgun' },
            plasma_cannon: { name: 'Plasma Cannon', damage: 30, cooldown: 60, speed: 5, color: '#ff00ff', size: 5, type: 'plasma' },
            flak_cannon: { name: 'Flak Cannon', damage: 5, cooldown: 40, type: 'spread' },
            tachyon_lance: { name: 'Tachyon Lance', damage: 100, cooldown: 200, type: 'railgun' },
            singularity_cannon: { name: 'Singularity Cannon', damage: 5, cooldown: 180, type: 'vortex' },
        },
        engine: {
            standard_ion: { thrustMultiplier: 1.0 },
            overcharged_fusion: { thrustMultiplier: 1.4 },
            vector_drive: { thrustMultiplier: 1.1 },
            warp_core: { thrustMultiplier: 1.8 },
        },
        shield: {
            basic_shield: { health: 50, regen: 1 },
            reactive_shield: { health: 75, regen: 0.5 },
            energy_barrier: { health: 120, regen: 0.2 },
            phase_field: { health: 40, regen: 2 },
        },
        thrusters: {
            maneuvering_jets: { turnBonus: 2, strafeBonus: 0.02 },
            inertial_dampeners: { turnBonus: 1, strafeBonus: 0.04 },
            phase_thrusters: { turnBonus: 3, strafeBonus: 0.03 },
        },
        special: {
            burst_thruster: { boostMultiplier: 4, duration: 15, cooldown: 120},
            emp_blast: { duration: 180, cooldown: 300 },
            cloak_field: { duration: 240, cooldown: 400 },
            repair_drones: { type: 'repair' },
        },
        tech: {
            fire_rate_controller: { cooldownReduction: 5 },
            energy_siphon: {},
            targeting_cpu: {},
            augmented_projectiles: {}
        }
    }
};

