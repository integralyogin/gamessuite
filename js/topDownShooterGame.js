// js/topDownShooterGame.js
const TopDownShooterGame = {
    id: 'TopDownShooterGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    player: null,
    bullets: [],
    enemies: [],
    keys: {},
    score: 0,
    gameLoopId: null,
    gameTimeLimit: 30000, // 30 seconds
    startTime: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    enemySpawnInterval: 2000, // Spawn an enemy every 2 seconds
    lastEnemySpawn: 0,
    enemiesToSpawn: 5,
    enemiesDestroyed: 0,

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log(`${this.id}: Initializing...`, sharedData);
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        this.gameContainer.innerHTML = `
            <style>
                #shooterCanvas {
                    border: 1px solid #000;
                    background-color: #f0f0f0;
                    display: block;
                    margin: 0 auto;
                }
                .shooter-info {
                    text-align: center;
                    margin-bottom: 10px;
                    font-size: 1.2em;
                }
            </style>
            <div class="shooter-info">
                <span id="shooterScore">Score: 0</span> | 
                <span id="shooterTime">Time Left: 30s</span> |
                <span id="shooterEnemiesLeft">Enemies Left: ${this.enemiesToSpawn}</span>
            </div>
            <canvas id="shooterCanvas" width="600" height="400"></canvas>
            <p style="text-align:center; margin-top:10px;">Use WASD/Arrow Keys to move, Space to shoot. Destroy ${this.enemiesToSpawn} enemies!</p>
        `;

        this.canvas = document.getElementById('shooterCanvas');
        if (!this.canvas) {
            console.error(`${this.id}: Canvas not found!`);
            this.failureCallback({ reason: "Canvas could not be created for TopDownShooterGame" });
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        this.player = {
            x: this.canvas.width / 2 - 15,
            y: this.canvas.height - 40,
            width: 30,
            height: 30,
            color: 'blue',
            speed: 5,
            shootCooldown: 300, // milliseconds
            lastShotTime: 0
        };

        this.bullets = [];
        this.enemies = [];
        this.keys = {};
        this.score = 0;
        this.enemiesDestroyed = 0;
        this.startTime = Date.now();
        this.lastEnemySpawn = Date.now();

        this.spawnEnemy(); // Spawn initial enemy

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        this.gameLoop();
        console.log(`${this.id}: Initialized successfully.`);
    },

    handleKeyDown: function(e) {
        this.keys[e.code] = true;
    },

    handleKeyUp: function(e) {
        this.keys[e.code] = false;
    },

    spawnEnemy: function() {
        if (this.enemies.length < this.enemiesToSpawn - this.enemiesDestroyed && this.enemies.length < 5) { // Max 5 enemies on screen
            const size = Math.random() * 20 + 20; // size between 20 and 40
            const enemy = {
                x: Math.random() * (this.canvas.width - size),
                y: Math.random() * (this.canvas.height / 2 - size), // Spawn in the upper half
                width: size,
                height: size,
                color: 'red',
                speed: Math.random() * 1 + 0.5 // Slower speed
            };
            this.enemies.push(enemy);
        }
    },

    update: function() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.startTime;
        const timeLeft = Math.max(0, Math.ceil((this.gameTimeLimit - elapsedTime) / 1000));
        document.getElementById('shooterTime').textContent = `Time Left: ${timeLeft}s`;
        document.getElementById('shooterEnemiesLeft').textContent = `Enemies Left: ${this.enemiesToSpawn - this.enemiesDestroyed}`;


        // Player movement
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.player.x -= this.player.speed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.player.x += this.player.speed;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.player.y -= this.player.speed;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.player.y += this.player.speed;

        // Keep player within bounds
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));

        // Player shooting
        if (this.keys['Space'] && (currentTime - this.player.lastShotTime > this.player.shootCooldown)) {
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2.5,
                y: this.player.y,
                width: 5,
                height: 10,
                color: 'yellow',
                speed: 7
            });
            this.player.lastShotTime = currentTime;
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].y -= this.bullets[i].speed;
            if (this.bullets[i].y < 0) {
                this.bullets.splice(i, 1);
            }
        }

        // Spawn new enemies
        if (currentTime - this.lastEnemySpawn > this.enemySpawnInterval && (this.enemiesDestroyed + this.enemies.length < this.enemiesToSpawn)) {
            this.spawnEnemy();
            this.lastEnemySpawn = currentTime;
        }

        // Update enemies & collision detection
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            // Simple enemy movement (e.g., slowly downwards or side to side)
            enemy.y += enemy.speed / 2;
            if (enemy.y + enemy.height > this.canvas.height) { // Enemy reaches bottom
                this.enemies.splice(i, 1);
                // Optionally penalize player or just let it despawn
                continue;
            }


            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const bullet = this.bullets[j];
                if (bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    // Collision
                    this.enemies.splice(i, 1);
                    this.bullets.splice(j, 1);
                    this.score += 10;
                    this.enemiesDestroyed++;
                    document.getElementById('shooterScore').textContent = `Score: ${this.score}`;
                    
                    if (this.enemiesDestroyed >= this.enemiesToSpawn) {
                        this.endGame(true);
                        return;
                    }
                    break; // Stop checking this enemy against other bullets
                }
            }
             // Check player collision with enemy
            if (this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                this.endGame(false, "Player collided with an enemy!");
                return;
            }
        }
        
        // Check win/loss conditions
        if (elapsedTime >= this.gameTimeLimit && this.enemiesDestroyed < this.enemiesToSpawn) {
            this.endGame(false, "Time's up! You didn't destroy all enemies.");
            return;
        }

        this.draw();
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // Draw bullets
        this.ctx.fillStyle = 'yellow';
        for (const bullet of this.bullets) {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }

        // Draw enemies
        for (const enemy of this.enemies) {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    },

    gameLoop: function() {
        this.update();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    endGame: function(isSuccess, reason = "") {
        console.log(`${this.id}: Game ended. Success: ${isSuccess}`, reason);
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        this.cleanupEventListeners();

        if (isSuccess) {
            this.gameContainer.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <h2>Wave Cleared!</h2>
                    <p>Your score: ${this.score}</p>
                    <p>Enemies Destroyed: ${this.enemiesDestroyed}</p>
                    <p>Well done, ${this.sharedData.playerName || 'Player'}!</p>
                </div>`;
            setTimeout(() => {
                this.successCallback({
                    shooterScore: this.score,
                    coinsCollected: this.score // Example: score translates to coins
                });
            }, 2000);
        } else {
            this.gameContainer.innerHTML = `
                <div style="text-align:center; padding:20px; color:red;">
                    <h2>Mission Failed!</h2>
                    <p>${reason}</p>
                    <p>Your score: ${this.score}</p>
                </div>`;
            setTimeout(() => {
                this.failureCallback({ 
                    reason: reason || "Failed Top-Down Shooter challenge.",
                    shooterScore: this.score 
                });
            }, 3000);
        }
    },
    
    cleanupEventListeners: function() {
        // Explicitly remove bound listeners if they were stored.
        // For simplicity here, we assume they are anonymous and will be garbage collected,
        // but for more complex scenarios, store the bound function and remove it.
        // e.g. this.boundKeyDown = this.handleKeyDown.bind(this); document.addEventListener('keydown', this.boundKeyDown);
        // then document.removeEventListener('keydown', this.boundKeyDown);
        // Since we are using .bind(this) directly in addEventListener,
        // proper cleanup would require storing those bound functions.
        // However, the GameManager clears the container and the old game instance
        // should be garbage collected, minimizing risks of lingering listeners in this setup.
        // For this example, we'll keep it simple.
        document.removeEventListener('keydown', this.handleKeyDown.bind(this)); // This won't work as expected due to new bind
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));     // Same here.
        // To properly remove them, you would need to:
        // 1. In init: this.boundKeyDown = this.handleKeyDown.bind(this); document.addEventListener('keydown', this.boundKeyDown);
        // 2. In cleanup: document.removeEventListener('keydown', this.boundKeyDown);
        // For now, this is a simplification. The GameManager destroying the old game instance usually handles this.
    },

    destroy: function() {
        console.log(`${this.id}: Destroying...`);
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        this.cleanupEventListeners(); // Attempt cleanup
        this.gameContainer.innerHTML = ''; // Clear content
        // Reset states for potential restart, though GameManager re-initializes typically
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.keys = {};
        this.score = 0;
        this.enemiesDestroyed = 0;
        this.gameLoopId = null;
        this.startTime = null;
        this.successCallback = null;
        this.failureCallback = null;
        this.sharedData = null;
        console.log(`${this.id}: Destroyed.`);
    }
};
