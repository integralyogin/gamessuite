/**
 * vectorArenaCombat.js - v3.5 (Opponent Selection Screen)
 * This version implements a pre-combat screen for selecting opponents.
 * - Added a new UI overlay that appears before combat starts.
 * - Players can now add different classes of enemy ships to the upcoming battle.
 * - A roster of selected opponents is displayed, and can be modified.
 * - The combat scene now dynamically spawns the exact enemies chosen by the player.
 * - This provides a flexible way to test different scenarios and ship loadouts.
 */
const VectorArenaCombatGame = {
    id: 'vectorArenaCombat',
    onSuccess: null,
    onFailure: null,
    gameContainer: null,
    canvas: null,
    ctx: null,
    playerShip: null,
    opponents: [],
    selectedOpponents: [], // Array to hold opponent loadouts before starting
    opponentTemplates: {}, // To store predefined enemy types
    projectiles: [],
    particles: [],
    keys: {},
    mousePos: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    worldBounds: { width: 3000, height: 3000 },
    stars: [],
    PARTS: null,
    playerData: null,
    gameLoop: null,
    isPaused: false,
    winner: null,

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback;

        try {
            this.PARTS = sharedData.parts || await PartsLoader.getParts();
            this.playerData = sharedData.playerData;
            this.selectedOpponents = []; // Reset selected opponents

            this.defineOpponentTemplates();
            this.setupUI();
            this.showOpponentSelection(); // Show the selection screen first

        } catch (error) {
            console.error("Failed to initialize Vector Arena Combat:", error);
            if (this.onFailure) this.onFailure({ reason: "Could not start combat." });
        }
    },
    
    defineOpponentTemplates: function() {
        this.opponentTemplates = {
            interceptor: {
                name: "Interceptor",
                credits: 0,
                owned: {
                    chassis: ['interceptor'], weapon: [{ id: 'pulse_laser', instanceId: 1001 }],
                    engine: ['standard_ion'], shield: ['basic_shield'],
                },
                equipped: {
                    chassis: 'interceptor', weapon: [1001], weaponGroups: [1],
                    engine: 'standard_ion', shield: 'basic_shield',
                }
            },
            fighter: {
                name: "Fighter",
                credits: 0,
                owned: {
                    chassis: ['fighter'], weapon: [{ id: 'pulse_laser', instanceId: 1001 }, { id: 'spread_shot', instanceId: 1002 }],
                    engine: ['standard_ion'], shield: ['basic_shield'],
                },
                equipped: {
                    chassis: 'fighter', weapon: [1001, 1002], weaponGroups: [1, 1],
                    engine: 'standard_ion', shield: 'basic_shield',
                }
            },
            juggernaut: {
                name: "Juggernaut",
                credits: 0,
                owned: {
                    chassis: ['juggernaut'], weapon: [{ id: 'railgun', instanceId: 1003 }],
                    turret: [{id: 'point_defense', instanceId: 2001}],
                    engine: ['standard_ion'], shield: ['heavy_shield'],
                },
                equipped: {
                    chassis: 'juggernaut', weapon: [1003], turret: [2001], weaponGroups: [1],
                    engine: 'standard_ion', shield: 'heavy_shield',
                }
            }
        };
    },

    showOpponentSelection: function() {
        const selectionScreen = this.gameContainer.querySelector('#pre-combat-screen');
        selectionScreen.style.display = 'flex';
        this.updateRosterDisplay();
    },

    updateRosterDisplay: function() {
        const rosterList = this.gameContainer.querySelector('#opponent-roster-list');
        rosterList.innerHTML = '';
        this.selectedOpponents.forEach((opponent, index) => {
            const li = document.createElement('li');
            li.textContent = opponent.name;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                this.selectedOpponents.splice(index, 1);
                this.updateRosterDisplay();
            };
            li.appendChild(removeBtn);
            rosterList.appendChild(li);
        });
    },

    startCombat: function() {
        this.gameContainer.querySelector('#pre-combat-screen').style.display = 'none';
        this.addEventListeners();
        this.setupGame();
        this.isPaused = false;
        this.winner = null;
        this.gameLoop = this.update.bind(this);
        requestAnimationFrame(this.gameLoop);
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                #combat-canvas { background: #000; display: block; width: 100%; height: 100%; cursor: crosshair; }
                .combat-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box; pointer-events: none; }
                .hud { display: flex; justify-content: space-between; align-items: flex-start; }
                .hud-player, .hud-opponent { border: 1px solid white; padding: 10px; background: rgba(0,0,0,0.5); width: 250px; }
                .hud-player { border-color: #00aaff; }
                .hud-opponent { border-color: #ff4400; }
                .bar { background: #555; height: 10px; margin-top: 5px; }
                .health-bar { background: #0f0; height: 100%; }
                .shield-bar { background: #0af; height: 100%; }
                .screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; }
                .screen h1 { font-size: 4em; margin-bottom: 20px; }
                .screen button { font-size: 1.5em; padding: 10px 20px; cursor: pointer; margin: 5px; }
                .victory { color: #00aaff; }
                .defeat { color: #ff4400; }
                #pre-combat-screen { color: white; text-align: center; }
                .selection-container { display: flex; gap: 20px; }
                .selection-box { background: rgba(20,20,30,0.9); padding: 20px; border: 1px solid #00aaff; }
                #opponent-roster-list { list-style: none; padding: 0; }
                #opponent-roster-list li { display: flex; justify-content: space-between; align-items: center; padding: 5px; border-bottom: 1px solid #444;}
            </style>
            <canvas id="combat-canvas"></canvas>
            <div id="pre-combat-screen" class="screen">
                <h1>Select Your Opponents</h1>
                <div class="selection-container">
                    <div class="selection-box">
                        <h2>Add to Fleet</h2>
                        <button id="add-interceptor">Add Interceptor</button>
                        <button id="add-fighter">Add Fighter</button>
                        <button id="add-juggernaut">Add Juggernaut</button>
                    </div>
                    <div class="selection-box">
                        <h2>Combat Roster</h2>
                        <ul id="opponent-roster-list"></ul>
                    </div>
                </div>
                <button id="start-combat-btn" style="margin-top: 20px;">Start Combat</button>
            </div>
            <div class="combat-overlay" style="display: none;">
                <div class="hud">
                    <div id="player-hud" class="hud-player"></div>
                    <div id="opponent-hud" class="hud-opponent"></div>
                </div>
            </div>
            <div id="end-screen" class="screen" style="display: none;"></div>
        `;
        this.canvas = this.gameContainer.querySelector('#combat-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Event listeners for the selection screen
        document.getElementById('add-interceptor').onclick = () => { this.selectedOpponents.push(JSON.parse(JSON.stringify(this.opponentTemplates.interceptor))); this.updateRosterDisplay(); };
        document.getElementById('add-fighter').onclick = () => { this.selectedOpponents.push(JSON.parse(JSON.stringify(this.opponentTemplates.fighter))); this.updateRosterDisplay(); };
        document.getElementById('add-juggernaut').onclick = () => { this.selectedOpponents.push(JSON.parse(JSON.stringify(this.opponentTemplates.juggernaut))); this.updateRosterDisplay(); };
        document.getElementById('start-combat-btn').onclick = () => this.startCombat();
    },

    updateHUD: function() {
        const playerHUD = this.gameContainer.querySelector('#player-hud');
        const opponentHUD = this.gameContainer.querySelector('#opponent-hud');
        if (playerHUD && this.playerShip) {
            const ship = this.playerShip;
            const healthPercentage = (ship.health / ship.maxHealth) * 100;
            const shieldPercentage = ship.maxShield > 0 ? (ship.shield / ship.maxShield) * 100 : 0;
            playerHUD.innerHTML = `
                <div>Health: ${Math.ceil(ship.health)} / ${ship.maxHealth}</div>
                <div class="bar"><div class="health-bar" style="width: ${healthPercentage}%;"></div></div>
                <div>Shield: ${Math.ceil(ship.shield)} / ${ship.maxShield}</div>
                <div class="bar"><div class="shield-bar" style="width: ${shieldPercentage}%;"></div></div>
            `;
        }
        if (opponentHUD) {
            opponentHUD.innerHTML = `<div>Opponents Remaining: ${this.opponents.length}</div>`;
        }
    },

    resizeCanvas: function() {
        this.canvas.width = this.gameContainer.clientWidth;
        this.canvas.height = this.gameContainer.clientHeight;
    },

    setupGame: function() {
        this.playerShip = new VectorArenaObjects.Ship(this.worldBounds.width / 2, this.worldBounds.height / 2, this.playerData, 1, this);
        this.projectiles = [];
        this.particles = [];
        this.opponents = [];
        
        this.selectedOpponents.forEach((opponentLoadout, i) => {
            const angle = (i / this.selectedOpponents.length) * Math.PI * 2;
            const radius = 800;
            const x = this.playerShip.x + Math.cos(angle) * radius;
            const y = this.playerShip.y + Math.sin(angle) * radius;
            this.opponents.push(new VectorArenaObjects.Ship(x, y, opponentLoadout, 2 + i, this));
        });

        this.stars = [];
        for (let i = 0; i < 500; i++) {
            this.stars.push({
                x: Math.random() * this.worldBounds.width,
                y: Math.random() * this.worldBounds.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    },

    updateCamera: function() {
        if (!this.playerShip) return;
        const smoothing = 0.05;
        const targetX = this.playerShip.x - this.canvas.width / 2;
        const targetY = this.playerShip.y - this.canvas.height / 2;
        this.camera.x += (targetX - this.camera.x) * smoothing;
        this.camera.y += (targetY - this.camera.y) * smoothing;
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.worldBounds.width - this.canvas.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.worldBounds.height - this.canvas.height));
    },

    drawBackground: function() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.worldBounds.width, this.worldBounds.height);
        
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    },
    
    clampToWorld: function(entity) {
        entity.x = Math.max(entity.size, Math.min(entity.x, this.worldBounds.width - entity.size));
        entity.y = Math.max(entity.size, Math.min(entity.y, this.worldBounds.height - entity.size));
    },

    update: function() {
        if (this.isPaused) return;

        if (this.playerShip) {
            this.playerShip.update(this.keys, {x: this.mousePos.x + this.camera.x, y: this.mousePos.y + this.camera.y});
            this.clampToWorld(this.playerShip);
        }
        for (let i = this.opponents.length - 1; i >= 0; i--) {
            const opponent = this.opponents[i];
            if (opponent.health <= 0) {
                this.opponents.splice(i, 1); continue;
            }
            opponent.update(this.keys, this.playerShip);
            this.clampToWorld(opponent);
        }
        
        this.updateCamera();
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawBackground();

        if (this.playerShip) this.playerShip.draw(this.ctx);
        this.opponents.forEach(o => o.draw(this.ctx));

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(this.opponents[0], this.playerShip);
            p.draw(this.ctx);
            if (p.life <= 0 || p.x < 0 || p.x > this.worldBounds.width || p.y < 0 || p.y > this.worldBounds.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();
            particle.draw(this.ctx);
            if (particle.isOutOfBounds()) {
                this.particles.splice(i, 1);
            }
        }

        this.ctx.restore();
        
        // This must be after restore() to be drawn on top of the game world
        this.gameContainer.querySelector('.combat-overlay').style.display = 'flex';
        this.updateHUD();


        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!p) continue;
            
            if (p.owner === 1) { // Player projectile
                for (let j = this.opponents.length - 1; j >= 0; j--) {
                    const target = this.opponents[j];
                     if (target && target.health > 0 && Math.hypot(p.x - target.x, p.y - target.y) < target.size) {
                        target.takeDamage(p.damage);
                        p.onHit(target);
                        if (!p.isPiercing) { this.projectiles.splice(i, 1); break; }
                    }
                }
            } else { // Opponent projectile
                const target = this.playerShip;
                if (target && target.health > 0 && Math.hypot(p.x - target.x, p.y - target.y) < target.size) {
                    target.takeDamage(p.damage);
                    p.onHit(target);
                    if (!p.isPiercing) { this.projectiles.splice(i, 1); }
                }
            }
        }
        
        if (this.playerShip && this.playerShip.health <= 0) { this.endGame(false); return; }
        if (this.opponents.length === 0 && this.winner === null) { this.endGame(true); return; }

        this.gameLoop = requestAnimationFrame(this.update.bind(this));
    },

    endGame: function(playerWon) {
        if (this.winner !== null) return;
        this.winner = playerWon;
        this.isPaused = true;
        
        const endScreen = this.gameContainer.querySelector('#end-screen');
        if (endScreen) {
            endScreen.style.display = 'flex';
            endScreen.innerHTML = `
                <h1 class="${playerWon ? 'victory' : 'defeat'}">${playerWon ? 'VICTORY' : 'DEFEAT'}</h1>
                <button id="combat-continue-btn">Continue</button>
            `;
            const continueBtn = this.gameContainer.querySelector('#combat-continue-btn');
            continueBtn.addEventListener('click', () => {
                 if (this.onSuccess) {
                    this.onSuccess({ from: 'combat', playerWon: playerWon, playerData: this.playerData });
                }
            });
        }
    },

    addEventListeners: function() {
        this.resizeHandler = () => this.resizeCanvas();
        window.addEventListener('resize', this.resizeHandler);

        this.keydownHandler = (e) => { this.keys[e.key] = true; };
        this.keyupHandler = (e) => { this.keys[e.key] = false; };
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);

        this.mousedownHandler = (e) => { this.keys['mouse' + e.button] = true; };
        this.mouseupHandler = (e) => { this.keys['mouse' + e.button] = false; };
        this.canvas.addEventListener('mousedown', this.mousedownHandler);
        this.canvas.addEventListener('mouseup', this.mouseupHandler);
        
        this.mousemoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        };
        this.canvas.addEventListener('mousemove', this.mousemoveHandler);
        
        this.contextmenuHandler = (e) => e.preventDefault();
        this.canvas.addEventListener('contextmenu', this.contextmenuHandler);
    },

    destroy: function() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.mousedownHandler);
            this.canvas.removeEventListener('mouseup', this.mouseupHandler);
            this.canvas.removeEventListener('mousemove', this.mousemoveHandler);
            this.canvas.removeEventListener('contextmenu', this.contextmenuHandler);
        }
        this.gameContainer.innerHTML = '';
        console.log("Vector Arena Combat Destroyed.");
    }
};

