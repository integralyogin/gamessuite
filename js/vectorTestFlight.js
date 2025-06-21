/**
 * vectorTestFlight.js - v2.0 (Targeting Fix)
 * This version updates the test flight scene to support homing weapons.
 * - Added an `opponents` array to the game state.
 * - The test dummy is now a proper game object with health and is added to the `opponents` array.
 * - This makes the dummy a valid target for the Cluster Missiles and other homing projectiles, preventing crashes.
 * - The dummy will now respawn after being destroyed.
 */
const VectorTestFlightGame = {
    id: 'vectorTestFlight',
    onSuccess: null,
    onFailure: null,
    gameContainer: null,
    canvas: null,
    ctx: null,
    playerShip: null,
    projectiles: [],
    particles: [],
    opponents: [], // Added to support targeting logic
    dummy: null, // To hold the dummy object
    keys: {},
    mousePos: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    worldBounds: { width: 3000, height: 3000 },
    stars: [],
    PARTS: null,
    playerData: null,
    gameLoop: null,

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback;

        try {
            this.PARTS = sharedData.parts || await PartsLoader.getParts();
            this.playerData = sharedData.playerData;

            this.setupUI();
            this.addEventListeners();
            this.setupGame();
            
            this.gameLoop = setInterval(this.update.bind(this), 1000 / 60);

        } catch (error) {
            console.error("Failed to initialize Test Flight:", error);
            if (this.onFailure) this.onFailure({ reason: "Could not start test flight." });
        }
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                #flight-canvas { background: #080010; display: block; width: 100%; height: 100%; cursor: crosshair; }
                #flight-return-btn { position: absolute; top: 20px; right: 20px; font-size: 1.2em; padding: 10px 20px; cursor: pointer; background: #ff4400; color: white; border: none; }
            </style>
            <canvas id="flight-canvas"></canvas>
            <button id="flight-return-btn">Return to Hangar</button>
        `;
        this.canvas = this.gameContainer.querySelector('#flight-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    },

    resizeCanvas: function() {
        this.canvas.width = this.gameContainer.clientWidth;
        this.canvas.height = this.gameContainer.clientHeight;
    },

    Dummy: class {
        constructor(x, y, context) {
            this.x = x;
            this.y = y;
            this.context = context;
            this.size = 50;
            this.maxHealth = 5000;
            this.health = this.maxHealth;
            this.playerNum = 99; // Unique ID to avoid friendly fire issues
            this.color = '#555';
        }

        takeDamage(amount) {
            this.health -= amount;
            // Visual feedback for damage
             for (let i = 0; i < 3; i++) {
                this.context.particles.push(new VectorArenaObjects.Particle(
                    this.x + (Math.random() - 0.5) * this.size, 
                    this.y + (Math.random() - 0.5) * this.size, 
                    '#ff9900', Math.random() * 3 + 1, 2));
            }

            if (this.health <= 0) {
                this.respawn();
            }
        }
        
        respawn() {
             for (let i = 0; i < 100; i++) {
                this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, this.color, Math.random() * 6, 4));
            }
            this.health = this.maxHealth;
        }

        update() { /* The dummy doesn't move */ }
        
        onHit(projectile) { /* Dummy doesn't fire back */ }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
            
            // Draw health bar
            const barWidth = this.size * 1.5;
            const barY = this.y - this.size / 2 - 20;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth, 10);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - barWidth / 2, barY, barWidth * (this.health / this.maxHealth), 10);
        }
    },

    setupGame: function() {
        this.playerShip = new VectorArenaObjects.Ship(this.worldBounds.width / 2, this.worldBounds.height / 2, this.playerData, 1, this);
        
        // Setup dummy as an opponent
        this.dummy = new this.Dummy(this.worldBounds.width / 2, this.worldBounds.height / 2 - 400, this);
        this.opponents = [this.dummy]; // Add dummy to opponents array for targeting

        this.projectiles = [];
        this.particles = [];
        
        this.stars = [];
        for (let i = 0; i < 1000; i++) {
            this.stars.push({
                x: Math.random() * this.worldBounds.width,
                y: Math.random() * this.worldBounds.height,
                size: Math.random() * 2 + 1
            });
        }
    },
    
    update: function() {
        // Update logic
        this.playerShip.update(this.keys, {x: this.mousePos.x + this.camera.x, y: this.mousePos.y + this.camera.y});
        this.clampToWorld(this.playerShip);
        
        this.opponents.forEach(opp => opp.update());

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(this.dummy, this.playerShip); // Pass dummy as the primary opponent
             if (p.life <= 0 || p.x < 0 || p.x > this.worldBounds.width || p.y < 0 || p.y > this.worldBounds.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].isOutOfBounds()) this.particles.splice(i, 1);
        }
        
        // Collision Detection
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!p) continue;
            
            // Player projectiles vs dummy
            if (p.owner === 1) {
                const target = this.dummy;
                if (target.health > 0 && Math.hypot(p.x - target.x, p.y - target.y) < target.size / 2) {
                    p.onHit(target);
                     if (!p.isPiercing) this.projectiles.splice(i,1);
                }
            }
        }

        // Drawing logic
        this.updateCamera();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.drawBackground();
        this.playerShip.draw(this.ctx);
        this.opponents.forEach(opp => opp.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
        this.ctx.restore();
    },

    updateCamera: function() {
        const smoothing = 0.05;
        const targetX = this.playerShip.x - this.canvas.width / 2;
        const targetY = this.playerShip.y - this.canvas.height / 2;
        this.camera.x += (targetX - this.camera.x) * smoothing;
        this.camera.y += (targetY - this.camera.y) * smoothing;
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.worldBounds.width - this.canvas.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.worldBounds.height - this.canvas.height));
    },

    drawBackground: function() {
        this.ctx.fillStyle = '#080010';
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

        document.getElementById('flight-return-btn').onclick = () => {
            if (this.onSuccess) {
                this.onSuccess({ from: 'testFlight', playerData: this.playerData });
            }
        };
    },

    destroy: function() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
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
        console.log("Vector Test Flight Destroyed.");
    }
};

