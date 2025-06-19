// js/geometricAscentGame.js
const GeometricAscentGame = {
    id: 'GeometricAscentGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    stylesElement: null, // To hold the <style> element
    animationRequestId: null,
    scoreElement: null,

    player: {
        x: 0, y: 0, width: 25, height: 25,
        dx: 0, dy: 0, jumpPower: 11, onGround: false,
        color: '#3498DB' // A vibrant blue
    },
    platforms: [],
    cameraY: 0,
    gravity: 0.45,
    friction: 0.85, // For horizontal movement
    score: 0,
    targetScore: 3000, // Height to reach for winning
    platformWidthMin: 60,
    platformWidthMax: 120,
    platformHeight: 15,
    platformGapYMin: 80,
    platformGapYMax: 150,
    platformColor: '#9B59B6', // A regal purple for platforms

    animationSettings: {
        baseBrightness: 0.7, baseSaturation: 0.8, baseContrast: 0.9,
        baseHueShift: 0,
        peakBrightness: 1.3, peakSaturation: 1.1, peakContrast: 1.2,
        peakHueShift: 45, // Degrees
        bgColorStart: '#111827', // Darker cool gray
        bgColorEnd: '#0c0f18',   // Very dark blue/black
        phaseDurationSeconds: 10, // Slower, more ambient pulsing
        totalAnimationDuration: 40, // phaseDurationSeconds * 4
    },

    _eventListeners: [], // Stores {element, type, handler} for easy removal
    _boundHandleKeyDown: null,
    _boundHandleKeyUp: null,

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log(`${this.id}: Initializing...`, sharedData);
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        this.gameContainer.innerHTML = ''; // Clear container
        this.gameContainer.className = 'game-area geometric-ascent-game-container'; // Add main class for styling

        this._injectStyles();

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'geometricAscentCanvas';
        // Set canvas size based on container, ensuring it fits
        const containerRect = this.gameContainer.getBoundingClientRect();
        this.canvas.width = Math.min(containerRect.width, 800); // Max width of 800px or container width
        this.canvas.height = Math.min(containerRect.height, 600); // Max height of 600px or container height
        // Ensure canvas doesn't exceed parent's padding
        this.canvas.width -= 20; // accounting for potential padding if any
        this.canvas.height -= 20;


        this.ctx = this.canvas.getContext('2d');
        this.gameContainer.appendChild(this.canvas);

        this.scoreElement = document.createElement('div');
        this.scoreElement.className = 'geometric-ascent-score';
        this.scoreElement.textContent = `Height: 0`;
        this.gameContainer.appendChild(this.scoreElement);

        this._resetGame();
        this._setupEventListeners();
        
        this.animationRequestId = requestAnimationFrame(this._gameLoop.bind(this));
        console.log(`${this.id}: Initialized and game loop started.`);
    },

    _injectStyles: function() {
        if (this.stylesElement) this.stylesElement.remove();

        this.stylesElement = document.createElement('style');
        this.stylesElement.id = 'geometric-ascent-styles';
        const s = this.animationSettings;

        this.stylesElement.innerHTML = `
            .geometric-ascent-game-container {
                --base-brightness: ${s.baseBrightness}; --base-saturation: ${s.baseSaturation}; --base-contrast: ${s.baseContrast};
                --base-hue-shift: ${s.baseHueShift}deg;
                --peak-brightness: ${s.peakBrightness}; --peak-saturation: ${s.peakSaturation}; --peak-contrast: ${s.peakContrast};
                --peak-hue-shift: ${s.peakHueShift}deg;

                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, ${s.bgColorStart} 0%, ${s.bgColorEnd} 90%);
                overflow: hidden;
                position: relative;
                animation-name: geometricAscentPulse;
                animation-duration: ${s.totalAnimationDuration}s;
                animation-timing-function: ease-in-out;
                animation-iteration-count: infinite;
                will-change: filter;
                box-sizing: border-box; /* Ensure padding doesn't expand container */
            }

            @keyframes geometricAscentPulse {
                0%, 100% {
                    filter: brightness(var(--base-brightness)) saturate(var(--base-saturation)) contrast(var(--base-contrast)) hue-rotate(var(--base-hue-shift));
                }
                25% {
                    filter: brightness(var(--peak-brightness)) saturate(var(--peak-saturation)) contrast(var(--peak-contrast)) hue-rotate(var(--peak-hue-shift));
                }
                50% {
                    filter: brightness(var(--base-brightness)) saturate(var(--peak-saturation)) contrast(var(--peak-contrast)) hue-rotate(var(--base-hue-shift));
                }
                75% {
                    filter: brightness(var(--peak-brightness)) saturate(var(--base-saturation)) contrast(var(--base-contrast)) hue-rotate(calc(var(--peak-hue-shift) / 2));
                }
            }

            #geometricAscentCanvas {
                background-color: transparent;
                border-radius: 5px; /* Optional: slight rounding for the canvas appearance */
            }

            .geometric-ascent-score {
                position: absolute;
                top: 15px; /* Adjusted for visibility */
                left: 15px; /* Adjusted for visibility */
                color: #EAEAEA;
                font-size: 1.2em; /* Slightly larger */
                font-family: 'Arial', sans-serif;
                text-shadow: 1px 1px 3px #000000;
                z-index: 10;
                background-color: rgba(0,0,0,0.3);
                padding: 5px 10px;
                border-radius: 3px;
            }
        `;
        document.head.appendChild(this.stylesElement);
    },

    _resetGame: function() {
        this.player.x = this.canvas.width / 2 - this.player.width / 2;
        this.player.y = this.canvas.height - 50; // Start lower
        this.player.dx = 0;
        this.player.dy = 0;
        this.player.onGround = true;

        this.platforms = [];
        this.cameraY = 0;
        this.score = 0;

        // Initial platform for the player
        this.platforms.push({
            x: this.canvas.width / 2 - 50,
            y: this.canvas.height - 30,
            width: 100,
            height: this.platformHeight,
            color: this.platformColor
        });

        // Generate some initial platforms
        let lastPlatformY = this.platforms[0].y;
        for (let i = 0; i < 10; i++) {
            lastPlatformY -= (this.platformGapYMin + Math.random() * (this.platformGapYMax - this.platformGapYMin));
            this._generatePlatform(lastPlatformY);
        }
        this._updateScoreDisplay();
    },

    _generatePlatform: function(yPosition) {
        const width = this.platformWidthMin + Math.random() * (this.platformWidthMax - this.platformWidthMin);
        const x = Math.random() * (this.canvas.width - width);
        this.platforms.push({
            x: x,
            y: yPosition,
            width: width,
            height: this.platformHeight,
            color: this.platformColor // Could vary color slightly if desired
        });
    },

    _update: function() {
        // Player horizontal movement
        this.player.x += this.player.dx;
        this.player.dx *= this.friction; // Apply friction

        // Player vertical movement
        if (!this.player.onGround) {
            this.player.dy += this.gravity;
            this.player.y += this.player.dy;
        }

        // Player bounds (screen edges)
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }

        // Collision detection with platforms
        this.player.onGround = false;
        this.platforms.forEach(platform => {
            if (this.player.x < platform.x + platform.width &&
                this.player.x + this.player.width > platform.x &&
                this.player.y + this.player.height > platform.y &&
                this.player.y + this.player.height < platform.y + platform.height + this.player.dy // Check collision only from top
            ) {
                if (this.player.dy >= 0) { // Moving downwards or still
                    this.player.y = platform.y - this.player.height;
                    this.player.dy = 0;
                    this.player.onGround = true;
                }
            }
        });

        // Camera follow player (smoothly or directly)
        // Keep player in the middle-upper part of the screen
        const targetCameraY = this.player.y - this.canvas.height * 0.4;
        this.cameraY = Math.min(this.cameraY, targetCameraY); // Only move camera up

        // Update score (highest point reached, inverted Y)
        // Score is the negative of the lowest Y value the player has reached (which is highest on screen)
        const currentHeight = Math.max(0, Math.floor(-this.player.y + (this.canvas.height - 50)));
        if (currentHeight > this.score) {
            this.score = currentHeight;
        }
        this._updateScoreDisplay();


        // Generate new platforms as player ascends
        const lowestPlatformYInView = this.cameraY + this.canvas.height;
        // Find the highest platform generated so far (lowest Y value)
        let highestPlatformCurrentY = 0; // Y is inverted for generation (smaller is higher)
        if (this.platforms.length > 0) {
             highestPlatformCurrentY = this.platforms.reduce((minY, p) => Math.min(minY, p.y), this.platforms[0].y);
        }

        if (highestPlatformCurrentY > this.cameraY - this.canvas.height) { // If highest platform is getting too close to top of camera view
            this._generatePlatform(highestPlatformCurrentY - (this.platformGapYMin + Math.random() * (this.platformGapYMax - this.platformGapYMin)));
        }

        // Remove off-screen platforms (below camera)
        this.platforms = this.platforms.filter(platform => platform.y < lowestPlatformYInView + 100);


        // Win condition
        if (this.score >= this.targetScore) {
            console.log(`${this.id}: Player reached target height!`);
            if (this.successCallback) this.successCallback({ score: this.score, status: 'Reached the Summit!' });
            this._cleanupAndStop();
            return;
        }

        // Lose condition (fell off screen)
        if (this.player.y > this.cameraY + this.canvas.height + this.player.height) {
            console.log(`${this.id}: Player fell off screen.`);
            if (this.failureCallback) this.failureCallback({ reason: 'You fell into the abyss!', finalScore: this.score });
            this._cleanupAndStop();
            return;
        }
    },

    _render: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(0, -this.cameraY);

        // Draw platforms
        this.platforms.forEach(platform => {
            this.ctx.fillStyle = platform.color;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            // Simple geometric detail
            this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });

        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        // Simple geometric detail for player
        this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);


        this.ctx.restore();
    },

    _gameLoop: function() {
        if (!this.canvas) return; // Game might have been destroyed

        this._update();
        this._render();

        this.animationRequestId = requestAnimationFrame(this._gameLoop.bind(this));
    },

    _updateScoreDisplay: function() {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Height: ${this.score}`;
        }
    },
    
    _handleKeyDown: function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.player.dx = -5;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.player.dx = 5;
        } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && this.player.onGround) {
            this.player.dy = -this.player.jumpPower;
            this.player.onGround = false;
        }
    },

    _handleKeyUp: function(e) {
        if ((e.key === 'ArrowLeft' || e.key === 'a') && this.player.dx < 0) {
           // this.player.dx = 0; // Friction will handle slowdown
        } else if ((e.key === 'ArrowRight' || e.key === 'd') && this.player.dx > 0) {
           // this.player.dx = 0; // Friction will handle slowdown
        }
    },

    _addEvent: function(element, type, handler) {
        element.addEventListener(type, handler);
        this._eventListeners.push({ element, type, handler });
    },

    _removeAllEvents: function() {
        this._eventListeners.forEach(listener => {
            listener.element.removeEventListener(listener.type, listener.handler);
        });
        this._eventListeners = [];
    },

    _setupEventListeners: function() {
        this._boundHandleKeyDown = this._handleKeyDown.bind(this);
        this._boundHandleKeyUp = this._handleKeyUp.bind(this);
        this._addEvent(document, 'keydown', this._boundHandleKeyDown);
        this._addEvent(document, 'keyup', this._boundHandleKeyUp);
    },
    
    _cleanupAndStop: function() {
        if (this.animationRequestId) {
            cancelAnimationFrame(this.animationRequestId);
            this.animationRequestId = null;
        }
        this._removeAllEvents(); // This should now correctly remove bound listeners
        // GameManager will call destroy, which handles further cleanup
    },

    destroy: function() {
        console.log(`${this.id}: Destroying...`);
        this._cleanupAndStop();

        if (this.stylesElement) {
            this.stylesElement.remove();
            this.stylesElement = null;
        }
        if (this.gameContainer) {
            this.gameContainer.innerHTML = ''; // Clear all content
            this.gameContainer.className = 'game-area'; // Reset class
        }
        this.canvas = null;
        this.ctx = null;
        this.platforms = [];
        this.player = { ...this.player, dx:0, dy:0 }; // Reset player state partially
        console.log(`${this.id}: Destroyed.`);
    }
};
