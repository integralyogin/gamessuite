// js/asteroidsGame.js

const AsteroidsGame = {
    id: 'AsteroidsGameInfinite', // Changed ID to reflect new version
    gameContainer: null,
    canvas: null,
    ctx: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    player: null,
    asteroids: [],
    bullets: [],
    keys: {},
    score: 0,
    lives: 3,

    camera: { x: 0, y: 0 }, // Camera object to track player

    gameLoopInterval: null,
    isGameOver: false,

    config: {
        shipSize: 20,
        shipTurnSpeed: 0.1, // radians
        shipThrust: 0.15,
        shipFriction: 0.99,
        bulletSpeed: 7,
        bulletCooldown: 150, // ms
        maxBullets: 5,
        asteroidMinSize: 20,
        asteroidMaxSize: 50,
        asteroidSpeed: 1,
        numAsteroidVertices: 8,
        bulletLifetime: 120, // Increased lifetime for larger world
        invincibilityDuration: 180, // frames (3 seconds at 60fps)

        // New for infinite world & dynamic spawning
        minNearbyAsteroids: 8,    // Try to maintain at least this many asteroids
        maxAsteroidsInWorld: 40,  // Hard cap for performance
        asteroidSpawnMinRadius: 350, // Min distance from player to spawn new asteroids (edge of screen)
        asteroidSpawnMaxRadius: 600, // Max distance from player to spawn new asteroids (further off screen)
        objectDespawnRadius: 1200, // Distance from player at which objects are removed (e.g., 2-3 screen widths)
        initialAsteroidCount: 10, // Number of asteroids to spawn at the start
    },

    init: function(container, successCb, failureCb, sharedData) {
        this.gameContainer = container;
        this.successCallback = successCb;
        this.failureCallback = failureCb;
        this.sharedData = { ...sharedData };

        this.isGameOver = false;
        this.score = 0;
        this.lives = 3;
        this.asteroids = [];
        this.bullets = [];
        this.keys = {};
        this.camera = { x: 0, y: 0 };

        this.gameContainer.innerHTML = `
            <style>
                #asteroidsCanvas {
                    background-color: #000;
                    border: 1px solid #555;
                    display: block;
                    margin: 0 auto;
                    width: 100%; /* Make canvas responsive */
                    max-width: 780px; /* Max width like original */
                    aspect-ratio: 780 / 380; /* Maintain aspect ratio */
                }
                .asteroids-info {
                    text-align: center;
                    color: #fff;
                    background-color: #111;
                    padding: 10px;
                    font-family: Arial, sans-serif;
                    font-size: 1em;
                    border-radius: 8px;
                    margin-bottom: 10px;
                }
                .asteroids-info span {
                    margin: 0 10px;
                }
                .asteroids-controls {
                    font-size: 0.8em;
                    color: #aaa;
                    margin-top: 5px;
                }
                 .game-over-message {
                    color: red;
                    text-align: center;
                    font-size: 1.5em;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: rgba(0,0,0,0.7);
                    border-radius: 10px;
                    z-index: 100;
                }
            </style>
            <div class="asteroids-info">
                <span>Score: <span id="asteroids-score">0</span></span> |
                <span>Lives: <span id="asteroids-lives">3</span></span> |
                <span>Asteroids: <span id="asteroids-count">0</span></span>
                <div class="asteroids-controls">Controls: Left/Right Arrows to Turn, Up Arrow to Thrust, Space to Shoot</div>
            </div>
            <canvas id="asteroidsCanvas"></canvas> 
            `;

        this.canvas = document.getElementById('asteroidsCanvas');
        if (!this.canvas) {
            console.error("AsteroidsGame: Canvas element not found!");
            this.failureCallback({ reason: "Canvas initialization failed for Asteroids." });
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size (can be made more dynamic based on container)
        this.canvas.width = 780; 
        this.canvas.height = 380;


        this.player = {
            x: 0, // World coordinates
            y: 0, // World coordinates
            radius: this.config.shipSize / 2,
            angle: -Math.PI / 2, // Pointing up
            rotation: 0,
            thrusting: false,
            thrust: { x: 0, y: 0 },
            canShoot: true,
            invincible: false,
            invincibilityTimer: 0
        };

        // Initial camera position based on player
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        this.spawnInitialAsteroids(this.config.initialAsteroidCount);
        this.updateInfoDisplay();

        this.addEventListeners();
        this.gameLoopInterval = setInterval(() => this.gameLoop(), 1000 / 60); // ~60 FPS

        console.log(`${this.id}: Initialized. Shared data:`, this.sharedData);
        if(this.sharedData.playerStats && this.sharedData.playerStats.piloting) {
            this.config.shipTurnSpeed += (this.sharedData.playerStats.piloting * 0.001);
            this.config.shipThrust += (this.sharedData.playerStats.piloting * 0.002);
            console.log(`${this.id}: Piloting skill ${this.sharedData.playerStats.piloting} applied.`);
        }
    },

    destroy: function() {
        clearInterval(this.gameLoopInterval);
        this.removeEventListeners();
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        this.canvas = null;
        this.ctx = null;
        this.asteroids = [];
        this.bullets = [];
        console.log(`${this.id}: Destroyed.`);
    },

    addEventListeners: function() {
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
    },

    removeEventListeners: function() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
    },

    handleKeyDown: function(e) {
        if (this.isGameOver) return;
        this.keys[e.code] = true;
        if (e.code === 'Space' && this.player.canShoot && this.bullets.length < this.config.maxBullets) {
            this.shoot();
        }
    },

    handleKeyUp: function(e) {
        this.keys[e.code] = false;
    },

    spawnInitialAsteroids: function(count) {
        for (let i = 0; i < count; i++) {
            let x, y, distToPlayerCenter;
            const safetyMargin = this.config.asteroidMaxSize + this.player.radius + 20; // Min distance from player start
            do {
                const angle = Math.random() * Math.PI * 2;
                // Spawn in a ring around player's initial world position (0,0)
                const spawnRingMinRadius = safetyMargin;
                const spawnRingMaxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.6; // Initial spawn somewhat close
                
                const dist = spawnRingMinRadius + Math.random() * (spawnRingMaxRadius - spawnRingMinRadius);
                
                x = this.player.x + Math.cos(angle) * dist; // player.x is 0 initially
                y = this.player.y + Math.sin(angle) * dist; // player.y is 0 initially
                distToPlayerCenter = Math.hypot(x - this.player.x, y - this.player.y);
            } while (distToPlayerCenter < safetyMargin);

            this.createAsteroid(x, y, this.config.asteroidMaxSize);
        }
    },
    
    manageAsteroidPopulation: function() {
        // 1. Despawn asteroids too far from the player
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            const distToPlayer = Math.hypot(asteroid.x - this.player.x, asteroid.y - this.player.y);
            if (distToPlayer > this.config.objectDespawnRadius) {
                this.asteroids.splice(i, 1);
            }
        }

        // 2. Spawn new asteroids if count is low and not exceeding world cap
        const currentAsteroidCount = this.asteroids.length;
        if (currentAsteroidCount < this.config.minNearbyAsteroids && currentAsteroidCount < this.config.maxAsteroidsInWorld) {
            const asteroidsToSpawn = Math.min(
                this.config.minNearbyAsteroids - currentAsteroidCount,
                this.config.maxAsteroidsInWorld - currentAsteroidCount 
            );

            for (let i = 0; i < asteroidsToSpawn; i++) {
                const angle = Math.random() * Math.PI * 2;
                // Spawn at a distance that is likely off-screen but not excessively far
                const dist = this.config.asteroidSpawnMinRadius + Math.random() * (this.config.asteroidSpawnMaxRadius - this.config.asteroidSpawnMinRadius);
                
                const spawnX = this.player.x + Math.cos(angle) * dist;
                const spawnY = this.player.y + Math.sin(angle) * dist;
                
                this.createAsteroid(spawnX, spawnY, this.config.asteroidMaxSize);
            }
        }
    },

    createAsteroid: function(x, y, size, parentVelocity = null) {
        const numVertices = this.config.numAsteroidVertices;
        const irregularity = 0.4; 
        const vertices = [];
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const randomFactor = 1 + (Math.random() - 0.5) * 2 * irregularity;
            vertices.push({
                x: Math.cos(angle) * size * randomFactor,
                y: Math.sin(angle) * size * randomFactor
            });
        }

        let velX, velY;
        if (parentVelocity) {
            const speed = Math.hypot(parentVelocity.x, parentVelocity.y) * (1 + Math.random() * 0.5);
            const angle = Math.random() * Math.PI * 2;
            velX = Math.cos(angle) * speed;
            velY = Math.sin(angle) * speed;
        } else {
            velX = (Math.random() - 0.5) * 2 * this.config.asteroidSpeed;
            velY = (Math.random() - 0.5) * 2 * this.config.asteroidSpeed;
        }
         
        this.asteroids.push({
            x, y, size, // World coordinates
            vel: { x: velX, y: velY },
            angle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            vertices: vertices,
            originalSize: size 
        });
    },

    shoot: function() {
        this.player.canShoot = false;
        // Spawn bullet at player's nose, in world coordinates
        const bulletX = this.player.x + Math.cos(this.player.angle) * (this.config.shipSize / 1.5);
        const bulletY = this.player.y + Math.sin(this.player.angle) * (this.config.shipSize / 1.5);
        
        this.bullets.push({
            x: bulletX, // World coordinates
            y: bulletY, // World coordinates
            velX: Math.cos(this.player.angle) * this.config.bulletSpeed + this.player.thrust.x,
            velY: Math.sin(this.player.angle) * this.config.bulletSpeed + this.player.thrust.y,
            radius: 2,
            lifetime: this.config.bulletLifetime
        });
        setTimeout(() => { this.player.canShoot = true; }, this.config.bulletCooldown);
    },

    updatePlayer: function() {
        if (this.player.invincibilityTimer > 0) {
            this.player.invincibilityTimer--;
            if (this.player.invincibilityTimer <= 0) {
                this.player.invincible = false;
            }
        }

        if (this.keys['ArrowLeft']) this.player.angle -= this.config.shipTurnSpeed;
        if (this.keys['ArrowRight']) this.player.angle += this.config.shipTurnSpeed;

        this.player.thrusting = this.keys['ArrowUp'];
        if (this.player.thrusting) {
            this.player.thrust.x += Math.cos(this.player.angle) * this.config.shipThrust;
            this.player.thrust.y += Math.sin(this.player.angle) * this.config.shipThrust;
        } else {
            this.player.thrust.x *= this.config.shipFriction;
            this.player.thrust.y *= this.config.shipFriction;
        }

        this.player.x += this.player.thrust.x; // Update world position
        this.player.y += this.player.thrust.y; // Update world position

        // No screen wrap
    },

    updateAsteroids: function() {
        this.asteroids.forEach(asteroid => {
            asteroid.x += asteroid.vel.x; // Update world position
            asteroid.y += asteroid.vel.y; // Update world position
            asteroid.angle += asteroid.rotationSpeed;
            // No screen wrap
        });
    },

    updateBullets: function() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.velX; // Update world position
            bullet.y += bullet.velY; // Update world position
            bullet.lifetime--;

            const distToPlayer = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);

            if (bullet.lifetime <= 0 || distToPlayer > this.config.objectDespawnRadius) {
                this.bullets.splice(i, 1);
            }
        }
    },

    checkCollisions: function() {
        // Bullets vs Asteroids (all in world coordinates)
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                const dist = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y);
                if (dist < asteroid.size + bullet.radius) {
                    this.bullets.splice(i, 1); 
                    this.splitAsteroid(j);
                    this.score += 10;
                    this.updateInfoDisplay();
                    break; 
                }
            }
        }

        // Player vs Asteroids (all in world coordinates)
        if (!this.player.invincible) {
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i];
                const dist = Math.hypot(this.player.x - asteroid.x, this.player.y - asteroid.y);
                if (dist < asteroid.size + this.player.radius * 0.8) { 
                    this.playerHit();
                    break; 
                }
            }
        }
    },

    splitAsteroid: function(index) {
        const asteroid = this.asteroids[index];
        const parentVelocity = asteroid.vel;
        this.asteroids.splice(index, 1);

        if (asteroid.originalSize > this.config.asteroidMinSize * 2) { 
            const newSize = asteroid.originalSize / 2;
            // Create new asteroids at the same world position
            this.createAsteroid(asteroid.x, asteroid.y, newSize, parentVelocity);
            this.createAsteroid(asteroid.x, asteroid.y, newSize, parentVelocity);
        }
        // this.updateInfoDisplay(); // Called in checkCollisions or manageAsteroidPopulation
    },
     
    playerHit: function() {
        this.lives--;
        this.player.invincible = true;
        this.player.invincibilityTimer = this.config.invincibilityDuration;

        // Reset player to the center of the CURRENT camera's view, in world coordinates
        this.player.x = this.camera.x + this.canvas.width / 2;
        this.player.y = this.camera.y + this.canvas.height / 2;
        
        this.player.thrust = { x: 0, y: 0 }; // Stop movement
        this.player.angle = -Math.PI / 2; // Reset orientation to up

        this.updateInfoDisplay();

        if (this.lives <= 0) {
            this.gameOver(); 
        }
    },

    updateInfoDisplay: function() {
        if (document.getElementById('asteroids-score')) {
             document.getElementById('asteroids-score').textContent = this.score;
        }
        if (document.getElementById('asteroids-lives')) {
            document.getElementById('asteroids-lives').textContent = this.lives;
        }
        if (document.getElementById('asteroids-count')) {
            document.getElementById('asteroids-count').textContent = this.asteroids.length;
        }
    },
     
    drawPlayer: function() {
        // Player is drawn at their world coordinates (this.player.x, this.player.y)
        // The main draw function's camera transform handles mapping this to screen space.
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y); // Translate to player's world position
        this.ctx.rotate(this.player.angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.config.shipSize / 2, 0); // Nose
        this.ctx.lineTo(-this.config.shipSize / 2, -this.config.shipSize / 3);
        this.ctx.lineTo(-this.config.shipSize / 2, this.config.shipSize / 3);
        this.ctx.closePath();

        if (this.player.invincible && Math.floor(this.player.invincibilityTimer / 10) % 2 === 0) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; 
            this.ctx.fillStyle = 'rgba(0, 150, 255, 0.3)';
        } else {
            this.ctx.strokeStyle = 'white';
            this.ctx.fillStyle = '#0095DD';
        }
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.fill();

        if (this.player.thrusting && Math.random() > 0.3) { 
            this.ctx.beginPath();
            this.ctx.moveTo(-this.config.shipSize / 2, 0); 
            this.ctx.lineTo(-this.config.shipSize / 2 - (this.config.shipSize*0.4 + Math.random()*3), this.config.shipSize / 6);
            this.ctx.lineTo(-this.config.shipSize / 2 - (this.config.shipSize*0.4 + Math.random()*3), -this.config.shipSize / 6);
            this.ctx.closePath();
            this.ctx.fillStyle = `rgba(255, ${Math.random()*155 + 100}, 0, ${Math.random()*0.5 + 0.5})`;
            this.ctx.fill();
        }
        this.ctx.restore();
    },

    drawAsteroids: function() {
        // Asteroids are drawn at their world coordinates. Camera transform handles screen mapping.
        this.asteroids.forEach(asteroid => {
            this.ctx.save();
            this.ctx.translate(asteroid.x, asteroid.y); // Translate to asteroid's world position
            this.ctx.rotate(asteroid.angle);
            this.ctx.beginPath();
            this.ctx.moveTo(asteroid.vertices[0].x, asteroid.vertices[0].y);
            for (let j = 1; j < asteroid.vertices.length; j++) {
                this.ctx.lineTo(asteroid.vertices[j].x, asteroid.vertices[j].y);
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = 'rgb(180, 180, 180)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.restore();
        });
    },

    drawBullets: function() {
        // Bullets are drawn at their world coordinates. Camera transform handles screen mapping.
        this.bullets.forEach(bullet => {
            this.ctx.save();
            this.ctx.translate(bullet.x, bullet.y); // Translate to bullet's world position
            // No rotation for simple circle bullets, but translate is important
            this.ctx.beginPath();
            this.ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2); // Draw relative to translated origin
            this.ctx.fillStyle = 'yellow';
            this.ctx.fill();
            this.ctx.restore();
        });
    },

    draw: function() {
        if (!this.ctx || !this.canvas) return;

        // 1. Clear the viewport (physical canvas area) with background color
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Save context state (before camera transform)
        this.ctx.save();
        
        // 3. Apply camera transformation
        // This moves the world so the camera's viewpoint is effectively at (0,0) on canvas
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 4. Draw all game elements (they use their world coordinates)
        this.drawPlayer();
        this.drawAsteroids();
        this.drawBullets();
        
        // 5. Restore context state (removes camera transform, back to screen space)
        this.ctx.restore();
    },

    gameLoop: function() {
        if (this.isGameOver) return;

        this.updatePlayer(); // Player moves in world space

        // Camera follows player: update camera's world coordinates
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        this.updateAsteroids(); // Existing asteroids move in world space
        this.updateBullets();   // Bullets move in world space, may despawn

        this.checkCollisions(); // Check collisions in world space
        
        this.manageAsteroidPopulation(); // Despawn far, spawn new near player (updates this.asteroids)
                                         // Also calls updateInfoDisplay

        this.draw(); // Draws everything relative to camera

        // No win condition based on asteroids.length === 0
    },

    gameOver: function() { // No isWin parameter, always a loss
        if (this.isGameOver) return; 
        this.isGameOver = true;
        clearInterval(this.gameLoopInterval);
        this.removeEventListeners(); 

        console.log(`${this.id}: Game Over! Score: ${this.score}`);
        
        const gameOverMessageElem = document.createElement('div');
        gameOverMessageElem.className = 'game-over-message'; // For styling
        gameOverMessageElem.textContent = `SHIP DESTROYED! Final Score: ${this.score}`;
        
        // Append to gameContainer, so it's part of the game's specific area
        if (this.gameContainer) {
             this.gameContainer.appendChild(gameOverMessageElem);
        } else {
            document.body.appendChild(gameOverMessageElem); // Fallback
        }


        setTimeout(() => {
            // Remove the game over message before calling callback, or let the parent component handle cleanup
            if (gameOverMessageElem && gameOverMessageElem.parentNode) {
                gameOverMessageElem.parentNode.removeChild(gameOverMessageElem);
            }
            this.successCallback({ 
                asteroidsGameScore: this.score,
                asteroidsCleared: false, // Game is infinite, so never "cleared"
                reason: "Player ship destroyed." 
            }); 
        }, 3000); // Display message for 3 seconds
    }
};

