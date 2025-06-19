// js/asteroidNavigatorGame.js
const AsteroidNavigatorGame2 = {
    id: 'AsteroidNavigatorGame2',
    gameContainer: null,
    canvas: null,
    ctx: null,
    player: null,
    asteroids: [],
    score: 0,
    moneyEarned: 0,
    gameInterval: null,
    spawnInterval: null,
    startTime: null,
    elapsedTime: 0,
    onComplete: null, // Callback for game completion
    onFailure: null,   // Callback for game over (global failure)
    sharedData: {},

    // Game settings
    playerWidth: 30,
    playerHeight: 20,
    playerSpeed: 8,
    asteroidMinSize: 15,
    asteroidMaxSize: 40,
    asteroidSpeed: 2,
    asteroidSpawnRate: 2000, // milliseconds

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log("AsteroidNavigatorGame: Initializing...");
        this.gameContainer = container;
        this.onComplete = successCallback;
        this.onFailure = failureCallback; // Store the global failure callback
        this.sharedData = { ...sharedData }; // Store received shared data

        this.gameContainer.innerHTML = `
            <div style="text-align:center; margin-bottom:10px;">
                <h2>Asteroid Navigator</h2>
                <p>Avoid the asteroids! Survive as long as you can.</p>
                <p>Score: <span id="ang-score">0</span> | Money Earned: $<span id="ang-money">0</span></p>
            </div>
            <canvas id="asteroidCanvas" style="border: 1px solid #ccc; background-color: #000;"></canvas>
        `;

        this.canvas = document.getElementById('asteroidCanvas');
        if (!this.canvas) {
            console.error("AsteroidNavigatorGame: Canvas element not found!");
            if (this.onFailure) {
                 this.onFailure({ reason: "Failed to initialize canvas for AsteroidNavigatorGame."});
            }
            return;
        }
        this.ctx = this.canvas.getContext('2d');

        // Set canvas dimensions (adjust as needed)
        this.canvas.width = 600;
        this.canvas.height = 400;

        this.player = {
            x: this.canvas.width / 2 - this.playerWidth / 2,
            y: this.canvas.height - this.playerHeight - 10,
            width: this.playerWidth,
            height: this.playerHeight,
            color: '#00FF00' // Green player ship
        };

        this.asteroids = [];
        this.score = 0;
        this.moneyEarned = 0;
        this.startTime = Date.now();
        this.elapsedTime = 0;

        document.addEventListener('keydown', this.handleKeyDown);
        // For simplicity, let's make the game run for a fixed duration or until collision
        // For now, we'll make it an endless survival that the player can "quit" or "fail"
        // Let's add a simple end condition for testing (e.g., survive 60 seconds)
        // setTimeout(() => this.endGame(true), 60000); // Example: End after 60 seconds

        this.startGameLoop();
        console.log("AsteroidNavigatorGame: Initialized successfully.");
    },

    handleKeyDown: function(event) {
        if (!AsteroidNavigatorGame.player) return; // Check if player is initialized

        if (event.key === 'ArrowLeft' || event.key === 'a') {
            AsteroidNavigatorGame.player.x -= AsteroidNavigatorGame.playerSpeed;
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
            AsteroidNavigatorGame.player.x += AsteroidNavigatorGame.playerSpeed;
        }

        // Keep player within canvas bounds
        if (AsteroidNavigatorGame.player.x < 0) {
            AsteroidNavigatorGame.player.x = 0;
        }
        if (AsteroidNavigatorGame.player.x + AsteroidNavigatorGame.player.width > AsteroidNavigatorGame.canvas.width) {
            AsteroidNavigatorGame.player.x = AsteroidNavigatorGame.canvas.width - AsteroidNavigatorGame.player.width;
        }
    }.bind(this), // Bind 'this' to AsteroidNavigatorGame

    startGameLoop: function() {
        this.spawnAsteroid(); // Spawn one immediately
        this.spawnInterval = setInterval(() => this.spawnAsteroid(), this.asteroidSpawnRate);
        this.gameInterval = setInterval(() => this.updateGame(), 1000 / 60); // 60 FPS
    },

    spawnAsteroid: function() {
        const size = Math.random() * (this.asteroidMaxSize - this.asteroidMinSize) + this.asteroidMinSize;
        const x = Math.random() * (this.canvas.width - size);
        const y = -size; // Start above the canvas
        const isLarge = size > (this.asteroidMinSize + this.asteroidMaxSize) / 2; // Differentiate large/small

        this.asteroids.push({
            x: x,
            y: y,
            width: size,
            height: size,
            speed: this.asteroidSpeed + Math.random() * 1.5, // Vary speed slightly
            color: isLarge ? '#A0A0A0' : '#D3D3D3' // Darker grey for large, lighter for small
        });
    },

    updateGame: function() {
        if (!this.ctx || !this.player) return;

        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000); // Time in seconds
        this.score = this.elapsedTime * 10; // Score increases with time
        this.moneyEarned = this.elapsedTime * 1; // 1 coin per second survived

        // Clear canvas
        this.ctx.fillStyle = '#000000'; // Black background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // Move and draw asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            asteroid.y += asteroid.speed;

            // Collision detection
            if (
                this.player.x < asteroid.x + asteroid.width &&
                this.player.x + this.player.width > asteroid.x &&
                this.player.y < asteroid.y + asteroid.height &&
                this.player.y + this.player.height > asteroid.y
            ) {
                this.endGame(false); // Player hit, game over
                return;
            }

            // Remove asteroids that are off-screen
            if (asteroid.y > this.canvas.height) {
                this.asteroids.splice(i, 1);
            } else {
                this.ctx.fillStyle = asteroid.color;
                this.ctx.fillRect(asteroid.x, asteroid.y, asteroid.width, asteroid.height);
            }
        }

        // Update HUD
        const scoreElement = document.getElementById('ang-score');
        const moneyElement = document.getElementById('ang-money');
        if (scoreElement) scoreElement.textContent = this.score;
        if (moneyElement) moneyElement.textContent = this.moneyEarned;

        // For now, let's say if the player survives for 2 minutes, they "win" this mini-game
        if (this.elapsedTime >= 120) { // 2 minutes
            this.endGame(true); // Player survived
        }
    },

    endGame: function(isSuccess) {
        console.log(`AsteroidNavigatorGame: Ending game. Success: ${isSuccess}, Score: ${this.score}, Money: ${this.moneyEarned}`);
        clearInterval(this.gameInterval);
        clearInterval(this.spawnInterval);
        document.removeEventListener('keydown', this.handleKeyDown);

        this.gameInterval = null;
        this.spawnInterval = null;

        if (isSuccess) {
            this.gameContainer.innerHTML += `<p style="color: green; text-align:center;">You navigated the field successfully!</p>`;
            if (this.onComplete) {
                this.onComplete({
                    coinsCollected: this.moneyEarned,
                    asteroidNavigatorScore: this.score
                    // You can add other game-specific data here
                });
            }
        } else {
            this.gameContainer.innerHTML += `<p style="color: red; text-align:center;">CRASH! Game Over. You survived for ${this.elapsedTime} seconds.</p>`;
            // According to GameManager, a failure here is a global failure.
            if (this.onFailure) {
                 this.onFailure({
                    reason: `Crashed into an asteroid after ${this.elapsedTime} seconds! Final score: ${this.score}.`,
                    coinsCollectedThisRound: this.moneyEarned // Optional: if you want to award coins even on failure for this game
                });
            }
        }
    },

    destroy: function() {
        console.log("AsteroidNavigatorGame: Destroying...");
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.spawnInterval) clearInterval(this.spawnInterval);
        document.removeEventListener('keydown', this.handleKeyDown);

        this.canvas = null;
        this.ctx = null;
        this.player = null;
        this.asteroids = [];
        if (this.gameContainer) {
            this.gameContainer.innerHTML = ''; // Clear content
        }
        console.log("AsteroidNavigatorGame: Destroyed.");
    }
};
