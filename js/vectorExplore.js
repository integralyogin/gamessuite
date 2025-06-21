/**
 * vectorExplore.js - v1.2 (Docking Navigation Fix)
 * This version fixes the docking logic to ensure the player returns to the main menu.
 * - The `dockAtStation` function now correctly sends the 'vectorArena' game ID to the game manager.
 * - This prevents the game from getting lost in the game sequence and ensures a smooth return to the main menu.
 */
const VectorExploreGame = {
    id: 'vectorExplore',
    onSuccess: null,
    onFailure: null,
    gameContainer: null,
    canvas: null,
    ctx: null,
    playerShip: null,
    hostiles: [],
    station: null,
    projectiles: [],
    particles: [],
    keys: {},
    mousePos: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    worldBounds: { width: 8000, height: 8000 },
    stars: [],
    PARTS: null,
    playerData: null,
    gameLoop: null,
    isPaused: false,

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
            
            this.isPaused = false;
            
            this.gameLoop = this.update.bind(this);
            requestAnimationFrame(this.gameLoop);

        } catch (error) {
            console.error("Failed to initialize Vector Explore:", error);
            if (this.onFailure) this.onFailure({ reason: "Could not start exploration." });
        }
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                #explore-canvas { background: #000; display: block; width: 100%; height: 100%; cursor: crosshair; }
                .explore-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; box-sizing: border-box; pointer-events: none; }
                .explore-hud { display: flex; justify-content: space-between; align-items: flex-start; }
                .hud-box { border: 1px solid #00aaff; padding: 10px; background: rgba(0,0,0,0.5); color: white; min-width: 200px; }
                .hud-box h4 { margin: 0 0 10px 0; }
                #dock-at-station-btn { display: none; position: absolute; bottom: 20px; right: 20px; font-size: 1.2em; padding: 10px 20px; cursor: pointer; background: #00aaff; color: black; border: none; pointer-events: auto; }
            </style>
            <canvas id="explore-canvas"></canvas>
            <div class="explore-overlay">
                <div class="explore-hud">
                    <div id="player-hud" class="hud-box"></div>
                    <div id="explore-hud" class="hud-box"></div>
                </div>
            </div>
            <button id="dock-at-station-btn">Return to Menu</button>
        `;
        this.canvas = this.gameContainer.querySelector('#explore-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    },

    updateHUD: function() {
        const playerHUD = this.gameContainer.querySelector('#player-hud');
        const exploreHUD = this.gameContainer.querySelector('#explore-hud');
        
        if (playerHUD && this.playerShip) {
            playerHUD.innerHTML = `<h4>Player Credits</h4><div>${this.playerData.credits}c</div>`;
        }
        
        if (exploreHUD) {
            exploreHUD.innerHTML = `<h4>Hostiles Remaining</h4><div>${this.hostiles.length}</div>`;
        }

        const dockBtn = document.getElementById('dock-at-station-btn');
        if (this.station && this.playerShip) {
             const dist = Math.hypot(this.station.x - this.playerShip.x, this.station.y - this.playerShip.y);
             if (dist < this.station.dockingRadius) {
                 dockBtn.style.display = 'block';
             } else {
                 dockBtn.style.display = 'none';
             }
        }
    },

    resizeCanvas: function() {
        this.canvas.width = this.gameContainer.clientWidth;
        this.canvas.height = this.gameContainer.clientHeight;
    },
    
    SpaceStation: class {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = 150;
            this.dockingRadius = 300;
            this.angle = 0;
        }

        update() {
            this.angle += 0.0005;
        }
        
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.strokeStyle = '#00aaff';
            ctx.fillStyle = 'rgba(0, 50, 100, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            for(let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.strokeRect(-this.size * 1.5, -10, this.size, 20);
            }
            ctx.restore();
            
            ctx.strokeStyle = 'rgba(0, 170, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.dockingRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    setupGame: function() {
        this.playerShip = new VectorArenaObjects.Ship(this.worldBounds.width / 2, this.worldBounds.height / 2, this.playerData, 1, this);
        this.projectiles = [];
        this.particles = [];
        this.hostiles = [];

        this.station = new this.SpaceStation(this.worldBounds.width / 2, this.worldBounds.height / 2);
        
        const numHostiles = 15;
        const pirateLoadout = {
            owned: { chassis: ['fighter'], weapon: [{ id: 'pulse_laser', instanceId: 1001 }], engine: ['standard_ion'] },
            equipped: { chassis: 'fighter', weapon: [1001], weaponGroups: [1], engine: 'standard_ion' }
        };

        for (let i = 0; i < numHostiles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1500 + Math.random() * 1500;
            const x = this.station.x + Math.cos(angle) * radius;
            const y = this.station.y + Math.sin(angle) * radius;
            this.hostiles.push(new VectorArenaObjects.Ship(x, y, pirateLoadout, 2 + i, this));
        }

        this.stars = [];
        for (let i = 0; i < 2000; i++) {
            this.stars.push({
                x: Math.random() * this.worldBounds.width,
                y: Math.random() * this.worldBounds.height,
                size: Math.random() * 2 + 1
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
        
        for (let i = this.hostiles.length - 1; i >= 0; i--) {
            const hostile = this.hostiles[i];
            if (hostile.health <= 0) {
                this.playerData.credits += 150;
                this.hostiles.splice(i, 1); 
                continue;
            }
            hostile.update(this.keys, this.playerShip);
            this.clampToWorld(hostile);
        }

        this.station.update();
        this.updateCamera();
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawBackground();
        this.station.draw(this.ctx);
        if (this.playerShip) this.playerShip.draw(this.ctx);
        this.hostiles.forEach(h => h.draw(this.ctx));

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const target = p.owner === 1 ? this.hostiles.sort((a,b) => Math.hypot(p.x - a.x, p.y-a.y) - Math.hypot(p.x-b.x, p.y-b.y))[0] : this.playerShip;
            p.update(target, this.playerShip);
            p.draw(this.ctx);
            if (p.life <= 0 || p.x < 0 || p.x > this.worldBounds.width || p.y < 0 || p.y > this.worldBounds.height) {
                this.projectiles.splice(i, 1);
            }
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            this.particles[i].draw(this.ctx);
            if (this.particles[i].isOutOfBounds()) this.particles.splice(i, 1);
        }

        this.ctx.restore();
        
        this.updateHUD();

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!p) continue;
            
            if (p.owner === 1) {
                for (let j = this.hostiles.length - 1; j >= 0; j--) {
                    const target = this.hostiles[j];
                     if (target && target.health > 0 && Math.hypot(p.x - target.x, p.y - target.y) < target.size) {
                        p.onHit(target);
                        if (!p.isPiercing) { this.projectiles.splice(i, 1); break; }
                    }
                }
            } else {
                const target = this.playerShip;
                if (target && target.health > 0 && Math.hypot(p.x - target.x, p.y - target.y) < target.size) {
                    p.onHit(target);
                    if (!p.isPiercing) { this.projectiles.splice(i, 1); }
                }
            }
        }
        
        if (this.playerShip && this.playerShip.health <= 0) { this.dockAtStation(); return; }

        this.gameLoop = requestAnimationFrame(this.update.bind(this));
    },

    dockAtStation: function() {
        if(this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        if (this.onSuccess) {
            this.onSuccess({ nextGame: 'vectorArena', playerData: this.playerData, parts: this.PARTS });
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
        
        document.getElementById('dock-at-station-btn').onclick = () => this.dockAtStation();
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
        console.log("Vector Explore Destroyed.");
    }
};

