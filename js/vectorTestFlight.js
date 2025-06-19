/**
 * VectorTestFlight.js - v16 (Uses JSON Parts Loader)
 * A dedicated module for flight simulation. This module now loads all parts data
 * from the central PartsLoader, ensuring it's always up-to-date.
 */
const VectorTestFlightGame = {
    id: 'vectorTestFlight',

    // --- Core State ---
    gameContainer: null,
    canvas: null,
    ctx: null,
    gameLoop: null,
    keys: {},
    playerShip: null,
    mousePos: { x: 0, y: 0 },
    projectiles: [],
    particles: [],
    onSuccess: null,
    playerData: null,
    PARTS: null,

    /**
     * Initializes the Test Flight game.
     */
    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback; 
        
        // Load the master parts list first
        this.PARTS = await PartsLoader.getParts();
        if (!this.PARTS) {
            console.error("CRITICAL: Test Flight could not load parts data. Aborting.");
            return;
        }
        
        if (sharedData && sharedData.playerData) {
            this.playerData = sharedData.playerData;
        } else {
            console.warn("VectorTestFlightGame: No playerData found. Using default loadout.");
            this.playerData = {
                 owned: { weapon: [ { id: 'homing_missiles', instanceId: 1 } ] },
                 equipped: { chassis: 'interceptor', weapon: 1, engine: 'standard_ion', thrusters: 'maneuvering_jets', special: 'burst_thruster' }
            };
        }

        this.setupUI();
        this.addEventListeners();
        this.initializeScene();

        if (this.gameLoop) clearInterval(this.gameLoop);
        this.gameLoop = setInterval(() => this.update(), 1000 / 60);
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                #vtf-canvas-container { width: 100%; height: 100%; background: #0c0c0c; position: relative; cursor: crosshair; }
                #vtf-canvas { display: block; width: 100%; height: 100%; }
                .vtf-hud { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; pointer-events: none; color: white; font-family: 'Courier New', Courier, monospace; }
                .vtf-controls { background: rgba(0,0,0,0.5); padding: 10px; border: 1px solid #333; border-radius: 5px; }
                .vtf-speed { font-size: 1.2em; color: #0f0; }
                .vtf-exit { pointer-events: all; }
                .vtf-button { background: transparent; border: 2px solid #00aaff; color: #00aaff; padding: 10px 20px; font-size: 1em; cursor: pointer; transition: all 0.3s ease; }
                .vtf-button:hover { background: #00aaff; color: #000; }
            </style>
            <div id="vtf-canvas-container">
                <canvas id="vtf-canvas"></canvas>
                <div class="vtf-hud">
                    <div class="vtf-controls">
                        <strong>Test Flight Mode</strong><br>
                        LMB/RMB: Primary/Secondary Fire<br>
                        Spacebar: Use Special<br>
                        W/S: Accelerate/Reverse<br>
                        A/D: Strafe Left/Right<br>
                        <div class="vtf-speed" id="vtf-speed-display">Speed: 0</div>
                    </div>
                    <div class="vtf-exit">
                         <button id="vtf-back-btn" class="vtf-button">Exit Test Flight</button>
                    </div>
                </div>
            </div>
        `;
        this.canvas = document.getElementById('vtf-canvas');
        this.ctx = this.canvas.getContext('2d');
    },
    
    initializeScene: function() {
        this.projectiles = [];
        this.particles = [];
        requestAnimationFrame(() => {
            this.resizeCanvas();
            const startX = this.canvas.width / 2;
            const startY = this.canvas.height / 2;
            if (this.canvas.width > 0) {
                this.playerShip = new VectorArenaObjects.Ship(startX, startY, this.playerData, 1, this);
            }
        });
    },

    update: function() {
        if (!this.playerShip || !this.ctx) return;
        this.ctx.fillStyle = '#0c0c0c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.playerShip.update(this.keys, this.mousePos); 
        this.updateCollection(this.projectiles);
        this.updateCollection(this.particles);
        this.updateHUD();

        this.drawCollection(this.projectiles);
        this.drawCollection(this.particles);
        this.playerShip.draw(this.ctx);
    },

    updateHUD: function() {
        const speedDisplay = document.getElementById('vtf-speed-display');
        if (speedDisplay && this.playerShip) {
            const speed = Math.hypot(this.playerShip.vx, this.playerShip.vy) * 10;
            speedDisplay.textContent = `Speed: ${speed.toFixed(2)}`;
        }
    },

    updateCollection: function(collection) {
        for (let i = collection.length - 1; i >= 0; i--) {
            collection[i].update(this.mousePos, null);
            if (collection[i].life <= 0 || collection[i].isOutOfBounds(this.canvas)) {
                collection.splice(i, 1);
            }
        }
    },
    drawCollection: function(collection) {
        for (const item of collection) {
            item.draw(this.ctx);
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
        this.boundExitHandler = () => {
            if(this.onSuccess) this.onSuccess({ from: 'testFlight', playerData: this.playerData });
        };
        
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        window.addEventListener('resize', this.boundResize);
        
        this.gameContainer.addEventListener('mousemove', this.boundMouseMove);
        this.gameContainer.addEventListener('mousedown', this.boundMouseDown);
        this.gameContainer.addEventListener('mouseup', this.boundMouseUp);
        this.gameContainer.addEventListener('contextmenu', this.boundContextMenu);
        
        const exitButton = this.gameContainer.querySelector('#vtf-back-btn');
        if (exitButton) exitButton.addEventListener('click', this.boundExitHandler);
    },

    removeEventListeners: function() {
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('resize', this.boundResize);
        if (this.gameContainer) {
            this.gameContainer.removeEventListener('mousemove', this.boundMouseMove);
            this.gameContainer.removeEventListener('mousedown', this.boundMouseDown);
            this.gameContainer.removeEventListener('mouseup', this.boundMouseUp);
            this.gameContainer.removeEventListener('contextmenu', this.boundContextMenu);
            const exitButton = this.gameContainer.querySelector('#vtf-back-btn');
            if (exitButton) exitButton.removeEventListener('click', this.boundExitHandler);
        }
    },
    
    resizeCanvas: function() {
        if (!this.canvas) return;
        const container = document.getElementById('vtf-canvas-container');
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            if (this.playerShip) {
                this.playerShip.x = this.canvas.width / 2;
                this.playerShip.y = this.canvas.height / 2;
            }
        }
    },

    destroy: function() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.removeEventListeners();
        if (this.gameContainer) this.gameContainer.innerHTML = '';
        console.log("VectorTestFlightGame: Destroyed.");
    },
};

