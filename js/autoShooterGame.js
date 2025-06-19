// js/autoShooterGame.js
const AutoShooterGame = {
    id: 'AutoShooterGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    player: null,
    enemies: [],
    projectiles: [],
    keys: {},
    gameInterval: null,
    spawnIntervalId: null,
    score: 0,
    gameTime: 0, // in seconds
    maxGameTime: 90, // e.g., survive for 90 seconds
    basePlayerStats: {
        hp: 100,
        speed: 3,
        attackDamage: 10,
        attackSpeed: 1, // attacks per second
        projectileSpeed: 7,
        xp: 0,
        level: 1,
        xpToNextLevel: 100
    },
    onSuccess: null,
    onFailure: null,
    sharedInitialData: null,

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log(`${this.id}: Initializing game with sharedData:`, sharedData);
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback;
        this.sharedInitialData = { ...sharedData };

        this.gameContainer.innerHTML = `
            <style>
                #${this.id}-canvas {
                    border: 1px solid #ccc;
                    background-color: #f0f0f0;
                    width: 100%;
                    height: 400px; /* Default, can be overridden by game-area styles */
                }
                .${this.id}-ui {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px;
                    font-size: 0.9em;
                    background-color: #333;
                    color: white;
                }
            </style>
            <div class="${this.id}-ui">
                <span id="${this.id}-hp">HP: 100/100</span>
                <span id="${this.id}-level">Level: 1</span>
                <span id="${this.id}-xp">XP: 0/100</span>
                <span id="${this.id}-timer">Time: ${this.maxGameTime}s</span>
                <span id="${this.id}-score">Score: 0</span>
            </div>
            <canvas id="${this.id}-canvas"></canvas>
        `;

        this.canvas = document.getElementById(`${this.id}-canvas`);
        // Adjust canvas size to fit container, respecting aspect if needed
        const containerRect = this.gameContainer.getBoundingClientRect();
        this.canvas.width = containerRect.width > 0 ? containerRect.width : 600;
        this.canvas.height = containerRect.height > 100 ? (containerRect.height - 40) : 400; // Account for UI bar

        this.ctx = this.canvas.getContext('2d');

        this.player = {
            ...this.basePlayerStats,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            width: 20,
            height: 20,
            color: 'blue',
            maxHp: this.basePlayerStats.hp,
            lastAttackTime: 0
        };
        
        // Apply initial stats from sharedData if available
        if (this.sharedInitialData.playerStats) {
            this.player.maxHp = this.sharedInitialData.playerStats.maxHealth || this.player.maxHp;
            this.player.hp = this.player.maxHp; // Start with full health based on potential shared stats
            this.player.attackDamage = this.sharedInitialData.playerStats.attack || this.player.attackDamage;
            // Potentially adjust other stats like speed or attackSpeed
        }


        this.enemies = [];
        this.projectiles = [];
        this.keys = {};
        this.score = 0;
        this.gameTime = this.maxGameTime;

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        this.spawnEnemy(); // Initial enemy
        this.spawnIntervalId = setInterval(this.spawnEnemy.bind(this), 3000); // Spawn enemy every 3 seconds

        this.gameInterval = requestAnimationFrame(this.gameLoop.bind(this));
        this.lastLoopTime = Date.now();
        this.elapsedTimeSinceLastTick = 0; // for timer update

        console.log(`${this.id}: Game initialized. Player:`, this.player);
    },

    handleKeyDown: function(e) {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.code.toLowerCase()] = true; // For Arrow keys etc.
    },

    handleKeyUp: function(e) {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.code.toLowerCase()] = false;
    },

    updatePlayer: function() {
        if (this.keys['w'] || this.keys['arrowup']) this.player.y -= this.player.speed;
        if (this.keys['s'] || this.keys['arrowdown']) this.player.y += this.player.speed;
        if (this.keys['a'] || this.keys['arrowleft']) this.player.x -= this.player.speed;
        if (this.keys['d'] || this.keys['arrowright']) this.player.x += this.player.speed;

        // Boundary checks
        this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));

        // Auto attack
        const now = Date.now();
        if (now - this.player.lastAttackTime > 1000 / this.player.attackSpeed) {
            if (this.enemies.length > 0) {
                let closestEnemy = null;
                let minDistSq = Infinity;

                this.enemies.forEach(enemy => {
                    const distSq = (enemy.x - this.player.x)**2 + (enemy.y - this.player.y)**2;
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestEnemy = enemy;
                    }
                });

                if (closestEnemy) {
                    const angle = Math.atan2(closestEnemy.y - this.player.y, closestEnemy.x - this.player.x);
                    this.projectiles.push({
                        x: this.player.x + this.player.width / 2,
                        y: this.player.y + this.player.height / 2,
                        width: 5,
                        height: 5,
                        color: 'red',
                        speed: this.player.projectileSpeed,
                        dx: Math.cos(angle) * this.player.projectileSpeed,
                        dy: Math.sin(angle) * this.player.projectileSpeed,
                        damage: this.player.attackDamage
                    });
                    this.player.lastAttackTime = now;
                }
            }
        }
    },

    spawnEnemy: function() {
        const size = 15 + Math.random() * 15; // Random size
        const edge = Math.floor(Math.random() * 4);
        let x, y;

        switch (edge) {
            case 0: // Top
                x = Math.random() * this.canvas.width;
                y = -size;
                break;
            case 1: // Right
                x = this.canvas.width + size;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + size;
                break;
            case 3: // Left
                x = -size;
                y = Math.random() * this.canvas.height;
                break;
        }
        const enemyLevelMultiplier = 1 + (this.maxGameTime - this.gameTime) / 30; // Gets tougher over time
        const enemyHp = Math.floor(20 * enemyLevelMultiplier * (0.8 + Math.random() * 0.4));
        const enemySpeed = 0.5 + Math.random() * 0.5 * Math.min(2, enemyLevelMultiplier * 0.5);
        const enemyDamage = Math.floor(5 * enemyLevelMultiplier * (0.8 + Math.random() * 0.4));
        const xpValue = Math.floor(10 + (enemyHp / 10) + (enemyDamage / 2));


        this.enemies.push({
            x, y, width: size, height: size,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Random color
            speed: enemySpeed,
            hp: enemyHp,
            maxHp: enemyHp,
            damage: enemyDamage,
            xpValue: xpValue
        });
    },

    updateEnemies: function() {
        this.enemies.forEach(enemy => {
            const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
        });
    },

    updateProjectiles: function() {
        this.projectiles = this.projectiles.filter(p => {
            p.x += p.dx;
            p.y += p.dy;
            return p.x > 0 && p.x < this.canvas.width && p.y > 0 && p.y < this.canvas.height;
        });
    },

    checkCollisions: function() {
        // Projectile-Enemy
        this.projectiles.forEach((proj, pIndex) => {
            this.enemies.forEach((enemy, eIndex) => {
                if (proj.x < enemy.x + enemy.width &&
                    proj.x + proj.width > enemy.x &&
                    proj.y < enemy.y + enemy.height &&
                    proj.y + proj.height > enemy.y) {
                    
                    enemy.hp -= proj.damage;
                    this.projectiles.splice(pIndex, 1); // Remove projectile

                    if (enemy.hp <= 0) {
                        this.enemies.splice(eIndex, 1);
                        this.gainXP(enemy.xpValue);
                        this.score += enemy.xpValue * this.player.level; // Score bonus for higher level
                    }
                    return; // Projectile can only hit one enemy
                }
            });
        });

        // Player-Enemy
        this.enemies.forEach((enemy, eIndex) => {
            if (this.player.x < enemy.x + enemy.width &&
                this.player.x + this.player.width > enemy.x &&
                this.player.y < enemy.y + enemy.height &&
                this.player.y + this.player.height > enemy.y) {
                
                this.player.hp -= enemy.damage;
                this.enemies.splice(eIndex, 1); // Enemy is destroyed on collision (kamikaze)
                                                // Or make them bounce off / deal damage periodically
                if (this.player.hp <= 0) {
                    this.gameOver("Player defeated!");
                }
            }
        });
    },

    gainXP: function(amount) {
        this.player.xp += amount;
        if (this.player.xp >= this.player.xpToNextLevel) {
            this.levelUp();
        }
    },

    levelUp: function() {
        this.player.level++;
        this.player.xp = 0; // Or this.player.xp -= this.player.xpToNextLevel;
        this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5);
        
        this.player.maxHp = Math.floor(this.player.maxHp * 1.1);
        this.player.hp = this.player.maxHp; // Full heal on level up
        this.player.attackDamage += 2 + Math.floor(this.player.level * 0.5);
        this.player.attackSpeed = Math.min(5, this.player.attackSpeed + 0.1); // Cap attack speed
        this.player.speed = Math.min(6, this.player.speed + 0.1); // Cap speed

        console.log(`${this.id}: Player leveled up to ${this.player.level}! Stats:`, this.player);
    },

    updateUI: function() {
        document.getElementById(`${this.id}-hp`).textContent = `HP: ${Math.max(0, Math.round(this.player.hp))}/${Math.round(this.player.maxHp)}`;
        document.getElementById(`${this.id}-level`).textContent = `Level: ${this.player.level}`;
        document.getElementById(`${this.id}-xp`).textContent = `XP: ${Math.round(this.player.xp)}/${Math.round(this.player.xpToNextLevel)}`;
        document.getElementById(`${this.id}-timer`).textContent = `Time: ${Math.ceil(this.gameTime)}s`;
        document.getElementById(`${this.id}-score`).textContent = `Score: ${this.score}`;
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        // Draw player HP bar
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(this.player.x, this.player.y - 10, this.player.width * (this.player.hp / this.player.maxHp), 5);
        this.ctx.strokeStyle = 'darkgreen';
        this.ctx.strokeRect(this.player.x, this.player.y - 10, this.player.width, 5);


        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            // Draw enemy HP bar
            if (enemy.hp < enemy.maxHp) {
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(enemy.x, enemy.y - 7, enemy.width * (enemy.hp / enemy.maxHp), 3);
                this.ctx.strokeStyle = 'darkred';
                this.ctx.strokeRect(enemy.x, enemy.y - 7, enemy.width, 3);
            }
        });

        // Draw projectiles
        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x - p.width/2, p.y - p.height/2, p.width, p.height);
        });
    },
    
    lastLoopTime: Date.now(),
    elapsedTimeSinceLastTick: 0,

    gameLoop: function() {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastLoopTime) / 1000; // deltaTime in seconds
        this.lastLoopTime = currentTime;
        this.elapsedTimeSinceLastTick += deltaTime;

        if (this.elapsedTimeSinceLastTick >= 1) {
            this.gameTime -= Math.floor(this.elapsedTimeSinceLastTick);
            this.elapsedTimeSinceLastTick -= Math.floor(this.elapsedTimeSinceLastTick);
            if (this.gameTime <= 0) {
                this.gameTime = 0;
                this.gameWon("Survived!");
                return;
            }
        }
        
        this.updatePlayer();
        this.updateEnemies();
        this.updateProjectiles();
        this.checkCollisions();
        this.draw();
        this.updateUI();

        if (this.player.hp > 0 && this.gameTime > 0) {
            this.gameInterval = requestAnimationFrame(this.gameLoop.bind(this));
        }
    },

    gameOver: function(reason) {
        console.log(`${this.id}: Game Over - ${reason}`);
        this.cleanup();
        this.onFailure({
            reason: reason,
            score: this.score,
            levelReached: this.player.level,
            gameId: this.id
        });
    },

    gameWon: function(message) {
        console.log(`${this.id}: Game Won - ${message}`);
        this.cleanup();
        // Collect data to pass on
        const gameResultData = {
            score: this.score,
            finalLevel: this.player.level,
            xpEarnedThisGame: this.player.xp + (this.player.level -1) * this.player.xpToNextLevel, // crude total xp
            gameId: this.id
        };
        // Example: Update shared player stats if this game influences them globally
        // This part needs careful design based on how stats should persist
        // For now, just passing score and level.
        // sharedData.playerStats could be updated here if needed for future games.
        // e.g., this.sharedInitialData.playerStats.maxHealth = this.player.maxHp;
        // this.onSuccess({ ...this.sharedInitialData, autoShooterResult: gameResultData });
        
        // More directly, pass specific, relevant outcomes.
        // GameManager will handle merging.
        this.onSuccess({
            coinsCollected: this.score, // Using score as 'coins' for example
            newPlayerStats: { // Example of potentially updating stats. This should be defined by game design.
                 // For this game, perhaps it doesn't directly modify base stats, but gives "perks" or "currency"
            },
            autoShooterGameScore: this.score,
            autoShooterGameLevel: this.player.level
        });
    },
    
    cleanup: function() {
        cancelAnimationFrame(this.gameInterval);
        clearInterval(this.spawnIntervalId);
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        this.keys = {}; // Clear keys to prevent interference if game is reloaded quickly
        if (this.gameContainer) {
            // this.gameContainer.innerHTML = ''; // GameManager handles clearing typically.
        }
        console.log(`${this.id}: Cleaned up.`);
    },

    // The destroy method is called by GameManager if it exists
    destroy: function() {
        console.log(`${this.id}: Destroy method called.`);
        this.cleanup(); // Ensure all resources are released
    }
};
