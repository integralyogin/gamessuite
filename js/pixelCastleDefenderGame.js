// js/pixelCastleDefenderGame.js
const PixelCastleDefenderGame = {
    id: 'PixelCastleDefenderGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    successCb: null,
    failureCb: null,
    sharedData: null,
    animationFrameId: null,
    eventListeners: [],

    // Game state
    gameState: {
        castle: { x: 0, y: 0, width: 50, height: 50, health: 100, maxHealth: 100, color: '#8B4513' },
        enemies: [],
        towers: [],
        projectiles: [],
        resources: 100, // Starting resources
        wave: 0,
        enemiesToSpawnThisWave: 0,
        enemiesSpawnedThisWave: 0,
        enemySpawnTimer: 0,
        enemySpawnInterval: 2000, // ms
        score: 0,
        gameOver: false,
        gameWon: false,
        selectedTowerType: 'basic', // For future expansion, for now only one type
        towerCost: 25,
        maxWaves: 5, // Win after 5 waves
        gameTime: 0, // in ms
        lastTime: 0,
    },

    config: {
        enemySize: 10,
        enemyBaseHealth: 10,
        enemyBaseSpeed: 0.5, // pixels per frame at 60fps
        enemyColor: '#FF0000',
        enemyValue: 5, // resources gained for killing an enemy
        towerSize: 15,
        towerRange: 100, // pixels
        towerFireRate: 1000, // ms per shot
        towerDamage: 5,
        towerColor: '#0000FF',
        projectileSize: 4,
        projectileSpeed: 3, // pixels per frame
        projectileColor: '#FFFF00',
        waveStartDelay: 3000, // ms before next wave
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.successCb = successCallback;
        this.failureCb = failureCallback;
        this.sharedData = sharedData;

        this.gameContainer.innerHTML = `
            <style>
                #pcg-canvas { border: 1px solid #000; background-color: #ADD8E6; }
                .pcg-ui { margin-bottom: 10px; font-family: Arial, sans-serif; }
                .pcg-ui span { margin-right: 15px; }
                .pcg-controls button { padding: 8px 12px; margin-right: 10px; cursor: pointer; }
                .pcg-message { text-align: center; font-size: 1.5em; margin-top: 20px;}
            </style>
            <div class="pcg-ui">
                <span>Castle Health: <span id="pcg-castle-health">100</span></span>
                <span>Resources: <span id="pcg-resources">100</span></span>
                <span>Wave: <span id="pcg-wave">0</span></span>
                <span>Score: <span id="pcg-score">0</span></span>
            </div>
            <div class="pcg-controls">
                <button id="pcg-build-tower">Build Tower (Cost: ${this.gameState.towerCost})</button>
                <button id="pcg-start-wave" disabled>Start Next Wave</button>
            </div>
            <canvas id="pcg-canvas" width="600" height="400"></canvas>
            <div id="pcg-message-area" class="pcg-message"></div>
        `;

        this.canvas = document.getElementById('pcg-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Reset game state
        this.gameState.castle.x = this.canvas.width / 2 - this.gameState.castle.width / 2;
        this.gameState.castle.y = this.canvas.height / 2 - this.gameState.castle.height / 2;
        this.gameState.castle.health = this.gameState.castle.maxHealth;
        this.gameState.enemies = [];
        this.gameState.towers = [];
        this.gameState.projectiles = [];
        this.gameState.resources = 100 + (this.sharedData.totalCoins || 0) / 10; // Example: Convert some shared coins to resources
        this.gameState.wave = 0;
        this.gameState.enemiesToSpawnThisWave = 0;
        this.gameState.enemiesSpawnedThisWave = 0;
        this.gameState.enemySpawnTimer = 0;
        this.gameState.score = 0;
        this.gameState.gameOver = false;
        this.gameState.gameWon = false;
        this.gameState.gameTime = 0;
        this.gameState.lastTime = performance.now();

        this.updateUI();
        this.showMessage("Place towers to defend the castle! Click 'Start Next Wave' when ready.");

        document.getElementById('pcg-start-wave').disabled = false;

        this.registerEventListener(this.canvas, 'click', this.handleCanvasClick.bind(this));
        this.registerEventListener(document.getElementById('pcg-build-tower'), 'click', () => {
            this.gameState.selectedTowerType = 'basic'; // Only one type for now
            this.showMessage(`Selected: Build Tower. Click on the map to place. Cost: ${this.gameState.towerCost}`);
        });
        this.registerEventListener(document.getElementById('pcg-start-wave'), 'click', this.startNextWave.bind(this));

        this.gameLoop();
    },

    startNextWave: function() {
        if (this.gameState.enemies.length > 0 || this.gameState.enemiesSpawnedThisWave < this.gameState.enemiesToSpawnThisWave) {
            this.showMessage("Current wave not yet cleared!");
            return;
        }
        this.gameState.wave++;
        this.gameState.enemiesToSpawnThisWave = 5 + this.gameState.wave * 3; // More enemies each wave
        this.gameState.enemiesSpawnedThisWave = 0;
        this.gameState.enemySpawnTimer = 0; // Reset spawn timer for the new wave
        this.config.enemySpawnInterval = Math.max(500, 2000 - this.gameState.wave * 100); // Enemies spawn faster
        this.config.enemyBaseHealth = 10 + this.gameState.wave * 2;
        this.showMessage(`Wave ${this.gameState.wave} incoming!`);
        document.getElementById('pcg-start-wave').disabled = true;
        this.updateUI();
    },

    registerEventListener: function(element, eventType, handler) {
        element.addEventListener(eventType, handler);
        this.eventListeners.push({ element, eventType, handler });
    },

    showMessage: function(message) {
        document.getElementById('pcg-message-area').textContent = message;
    },

    updateUI: function() {
        document.getElementById('pcg-castle-health').textContent = `${this.gameState.castle.health}/${this.gameState.castle.maxHealth}`;
        document.getElementById('pcg-resources').textContent = this.gameState.resources;
        document.getElementById('pcg-wave').textContent = this.gameState.wave;
        document.getElementById('pcg-score').textContent = this.gameState.score;
        document.getElementById('pcg-build-tower').textContent = `Build Tower (Cost: ${this.gameState.towerCost})`;
    },

    handleCanvasClick: function(event) {
        if (this.gameState.gameOver || this.gameState.gameWon) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (this.gameState.selectedTowerType) {
            if (this.gameState.resources >= this.gameState.towerCost) {
                // Basic check for overlapping with castle or other towers (can be improved)
                const castleRect = this.gameState.castle;
                if (x + this.config.towerSize <= castleRect.x || x >= castleRect.x + castleRect.width ||
                    y + this.config.towerSize <= castleRect.y || y >= castleRect.y + castleRect.height) {

                    let canPlace = true;
                    for (const tower of this.gameState.towers) {
                        if (Math.abs(tower.x - x) < this.config.towerSize && Math.abs(tower.y - y) < this.config.towerSize) {
                            canPlace = false;
                            break;
                        }
                    }
                    if (x < 0 || x > this.canvas.width - this.config.towerSize || y < 0 || y > this.canvas.height - this.config.towerSize) {
                        canPlace = false; // Don't place off-screen
                        this.showMessage("Cannot place tower outside play area.");
                    }


                    if (canPlace) {
                        this.gameState.towers.push({
                            x: x - this.config.towerSize / 2,
                            y: y - this.config.towerSize / 2,
                            width: this.config.towerSize,
                            height: this.config.towerSize,
                            range: this.config.towerRange,
                            fireRate: this.config.towerFireRate,
                            damage: this.config.towerDamage,
                            lastShotTime: 0,
                            color: this.config.towerColor
                        });
                        this.gameState.resources -= this.gameState.towerCost;
                        this.gameState.selectedTowerType = null; // Deselect after placing
                        this.updateUI();
                        this.showMessage("Tower placed!");
                    } else {
                        this.showMessage("Cannot place tower here (too close to another tower or castle, or outside bounds).");
                    }
                } else {
                    this.showMessage("Cannot place tower on the castle.");
                }
            } else {
                this.showMessage("Not enough resources to build a tower!");
            }
        }
    },

    spawnEnemy: function(deltaTime) {
        if (this.gameState.wave === 0 || this.gameState.enemiesSpawnedThisWave >= this.gameState.enemiesToSpawnThisWave) {
            if (this.gameState.wave > 0 && this.gameState.enemies.length === 0 && this.gameState.enemiesSpawnedThisWave >= this.gameState.enemiesToSpawnThisWave) {
                 document.getElementById('pcg-start-wave').disabled = false;
                 if (this.gameState.wave >= this.gameState.maxWaves) {
                    this.winGame();
                 } else {
                    this.showMessage(`Wave ${this.gameState.wave} cleared! Prepare for the next wave.`);
                 }
            }
            return;
        }

        this.gameState.enemySpawnTimer += deltaTime;
        if (this.gameState.enemySpawnTimer >= this.config.enemySpawnInterval) {
            this.gameState.enemySpawnTimer = 0;
            this.gameState.enemiesSpawnedThisWave++;

            let spawnX, spawnY;
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            switch (side) {
                case 0: // Top
                    spawnX = Math.random() * this.canvas.width;
                    spawnY = -this.config.enemySize;
                    break;
                case 1: // Right
                    spawnX = this.canvas.width + this.config.enemySize;
                    spawnY = Math.random() * this.canvas.height;
                    break;
                case 2: // Bottom
                    spawnX = Math.random() * this.canvas.width;
                    spawnY = this.canvas.height + this.config.enemySize;
                    break;
                case 3: // Left
                    spawnX = -this.config.enemySize;
                    spawnY = Math.random() * this.canvas.height;
                    break;
            }

            this.gameState.enemies.push({
                x: spawnX,
                y: spawnY,
                width: this.config.enemySize,
                height: this.config.enemySize,
                health: this.config.enemyBaseHealth,
                maxHealth: this.config.enemyBaseHealth,
                speed: this.config.enemyBaseSpeed * (1 + this.gameState.wave * 0.1),
                color: this.config.enemyColor
            });
        }
    },

    updateEnemies: function(deltaTime) {
        const castleCenterX = this.gameState.castle.x + this.gameState.castle.width / 2;
        const castleCenterY = this.gameState.castle.y + this.gameState.castle.height / 2;

        for (let i = this.gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = this.gameState.enemies[i];
            const dx = castleCenterX - (enemy.x + enemy.width / 2);
            const dy = castleCenterY - (enemy.y + enemy.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            const moveSpeed = enemy.speed * (deltaTime / (1000/60)); // Adjust speed for deltaTime

            if (dist > 0) { // Check dist to prevent division by zero if enemy is exactly at center
                enemy.x += (dx / dist) * moveSpeed;
                enemy.y += (dy / dist) * moveSpeed;
            }


            // Check collision with castle
            if (enemy.x < this.gameState.castle.x + this.gameState.castle.width &&
                enemy.x + enemy.width > this.gameState.castle.x &&
                enemy.y < this.gameState.castle.y + this.gameState.castle.height &&
                enemy.y + enemy.height > this.gameState.castle.y) {
                this.gameState.castle.health -= 5; // Enemy deals damage
                this.gameState.enemies.splice(i, 1); // Enemy sacrifices itself
                this.updateUI();
                if (this.gameState.castle.health <= 0) {
                    this.loseGame("Castle destroyed!");
                    return;
                }
            }
        }
    },

    updateTowers: function(deltaTime) {
        this.gameState.gameTime += deltaTime;
        for (const tower of this.gameState.towers) {
            if (this.gameState.gameTime - tower.lastShotTime >= tower.fireRate) {
                let targetEnemy = null;
                let minDistance = tower.range;

                for (const enemy of this.gameState.enemies) {
                    const dx = (enemy.x + enemy.width / 2) - (tower.x + tower.width / 2);
                    const dy = (enemy.y + enemy.height / 2) - (tower.y + tower.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= tower.range && distance < minDistance) {
                        // A simple targeting: closest enemy. Could be first, strongest etc.
                        minDistance = distance;
                        targetEnemy = enemy;
                    }
                }

                if (targetEnemy) {
                    this.gameState.projectiles.push({
                        x: tower.x + tower.width / 2 - this.config.projectileSize / 2,
                        y: tower.y + tower.height / 2 - this.config.projectileSize / 2,
                        width: this.config.projectileSize,
                        height: this.config.projectileSize,
                        damage: tower.damage,
                        speed: this.config.projectileSpeed,
                        targetX: targetEnemy.x + targetEnemy.width / 2,
                        targetY: targetEnemy.y + targetEnemy.height / 2,
                        color: this.config.projectileColor
                    });
                    tower.lastShotTime = this.gameState.gameTime;
                }
            }
        }
    },

    updateProjectiles: function(deltaTime) {
        const projectileMoveSpeed = this.config.projectileSpeed * (deltaTime / (1000/60)); // Adjust speed for deltaTime

        for (let i = this.gameState.projectiles.length - 1; i >= 0; i--) {
            const p = this.gameState.projectiles[i];
            const dx = p.targetX - p.x; // Keep original target, don't track moving enemy perfectly
            const dy = p.targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < projectileMoveSpeed) { // Reached vicinity of target point
                this.gameState.projectiles.splice(i, 1);
                continue;
            }

            p.x += (dx / dist) * projectileMoveSpeed;
            p.y += (dy / dist) * projectileMoveSpeed;


            // Check collision with enemies
            for (let j = this.gameState.enemies.length - 1; j >= 0; j--) {
                const enemy = this.gameState.enemies[j];
                if (p.x < enemy.x + enemy.width &&
                    p.x + p.width > enemy.x &&
                    p.y < enemy.y + enemy.height &&
                    p.y + p.height > enemy.y) {
                    
                    enemy.health -= p.damage;
                    this.gameState.projectiles.splice(i, 1); // Projectile hits

                    if (enemy.health <= 0) {
                        this.gameState.enemies.splice(j, 1);
                        this.gameState.resources += this.config.enemyValue;
                        this.gameState.score += 10;
                        this.updateUI();
                    }
                    break; // Projectile can only hit one enemy
                }
            }
            // Remove projectile if it goes off screen significantly (simple cleanup)
            if (p.x < -50 || p.x > this.canvas.width + 50 || p.y < -50 || p.y > this.canvas.height + 50) {
                 this.gameState.projectiles.splice(i, 1);
            }
        }
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Castle
        this.ctx.fillStyle = this.gameState.castle.color;
        this.ctx.fillRect(this.gameState.castle.x, this.gameState.castle.y, this.gameState.castle.width, this.gameState.castle.height);
        // Draw castle health bar
        const castleHealthPercentage = this.gameState.castle.health / this.gameState.castle.maxHealth;
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(this.gameState.castle.x, this.gameState.castle.y - 10, this.gameState.castle.width, 5);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(this.gameState.castle.x, this.gameState.castle.y - 10, this.gameState.castle.width * castleHealthPercentage, 5);


        // Draw Towers
        for (const tower of this.gameState.towers) {
            this.ctx.fillStyle = tower.color;
            this.ctx.fillRect(tower.x, tower.y, tower.width, tower.height);
            // Optional: Draw tower range
            // this.ctx.beginPath();
            // this.ctx.strokeStyle = 'rgba(0,0,255,0.2)';
            // this.ctx.arc(tower.x + tower.width/2, tower.y + tower.height/2, tower.range, 0, Math.PI * 2);
            // this.ctx.stroke();
        }

        // Draw Enemies
        for (const enemy of this.gameState.enemies) {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            // Draw enemy health bar
            if (enemy.health < enemy.maxHealth) {
                const enemyHealthPercentage = enemy.health / enemy.maxHealth;
                this.ctx.fillStyle = 'darkred';
                this.ctx.fillRect(enemy.x, enemy.y - 6, enemy.width, 3);
                this.ctx.fillStyle = 'lime';
                this.ctx.fillRect(enemy.x, enemy.y - 6, enemy.width * enemyHealthPercentage, 3);
            }
        }

        // Draw Projectiles
        for (const p of this.gameState.projectiles) {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.width, p.height);
        }
    },

    gameLoop: function(timestamp) {
        if (this.gameState.gameOver || this.gameState.gameWon) {
            return; // Stop loop if game ended
        }
        
        const deltaTime = timestamp - this.gameState.lastTime;
        this.gameState.lastTime = timestamp;

        if (deltaTime > 0) { // Ensure deltaTime is positive
            this.spawnEnemy(deltaTime);
            this.updateEnemies(deltaTime);
            this.updateTowers(deltaTime);
            this.updateProjectiles(deltaTime);
        }

        this.draw();

        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    winGame: function() {
        if (this.gameState.gameWon || this.gameState.gameOver) return;
        this.gameState.gameWon = true;
        cancelAnimationFrame(this.animationFrameId);
        this.showMessage(`Congratulations! You survived all ${this.gameState.maxWaves} waves! Final Score: ${this.gameState.score}`);
        document.getElementById('pcg-start-wave').disabled = true;
        document.getElementById('pcg-build-tower').disabled = true;
        this.canvas.style.cursor = 'default';

        // Automatically proceed after a delay
        setTimeout(() => {
            if (typeof this.successCb === 'function') {
                this.successCb({
                    score: this.gameState.score,
                    wavesCleared: this.gameState.wave,
                    resourcesRemaining: this.gameState.resources,
                    coinsCollected: Math.floor(this.gameState.score / 10) // Example: convert score to coins
                });
            }
        }, 3000);
    },

    loseGame: function(reason) {
        if (this.gameState.gameOver) return;
        this.gameState.gameOver = true;
        cancelAnimationFrame(this.animationFrameId);
        this.showMessage(`Game Over! ${reason}. Score: ${this.gameState.score}`);
        document.getElementById('pcg-start-wave').disabled = true;
        document.getElementById('pcg-build-tower').disabled = true;
        this.canvas.style.cursor = 'default';

        // Automatically proceed after a delay
        setTimeout(() => {
            if (typeof this.failureCb === 'function') {
                this.failureCb({
                    reason: reason,
                    score: this.gameState.score,
                    waveReached: this.gameState.wave
                });
            }
        }, 3000);
    },

    destroy: function() {
        cancelAnimationFrame(this.animationFrameId);
        this.eventListeners.forEach(({ element, eventType, handler }) => {
            element.removeEventListener(eventType, handler);
        });
        this.eventListeners = [];
        if (this.gameContainer) {
            this.gameContainer.innerHTML = ''; // Clear game-specific HTML
        }
        this.canvas = null;
        this.ctx = null;
        console.log("PixelCastleDefenderGame: Destroyed.");
    }
};
