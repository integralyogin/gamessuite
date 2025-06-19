// js/ClimbingGame.js
const ClimbingGame = {
    id: 'ClimbingGame_Minimal', // Changed ID to avoid conflict if old one is cached/used
    gameContainer: null,
    canvas: null,
    ctx: null,
    callbacks: {
        success: null,
        failure: null,
    },
    sharedData: null,

    player: {
        x: 50, // Start closer to a wall for easier testing
        y: 500,
        width: 28,
        height: 38,
        vx: 0,
        vy: 0,
        speed: 3.5,         // Horizontal speed
        jumpStrength: 10,
        climbSpeed: 1.5,        // Base climb speed
        climbingSkill: 0,       // Loaded from sharedData

        isOnGround: true,
        isJumping: false,
        isClimbing: false,
        canClimb: false,        // True if near a climbable surface
        currentWall: null,      // Reference to the wall being interacted with
        climbingWallSide: null, // 'wall_left_surface' or 'wall_right_surface'

        color: 'orange',
    },

    platforms: [
        // Ground
        { x: 0, y: 560, width: 800, height: 40, color: '#555', type: 'ground' },
        // Climbable Wall
        { x: 150, y: 100, width: 30, height: 460, color: '#777', climbable: true, type: 'wall' }, // Tall wall
        // Another wall for transfer testing
        { x: 300, y: 150, width: 30, height: 300, color: '#777', climbable: true, type: 'wall' },
        // Goal Platform
        { x: 100, y: 50, width: 100, height: 20, color: 'gold', type: 'goal' }
    ],

    world: {
        gravity: 0.6,
        width: 800,    // Canvas width
        height: 600,   // Canvas height
        levelHeight: 700,  // Total scrollable height of the level
        cameraY: 0,
        backgroundColor: '#333', // Simple solid background
    },

    inputState: {
        left: false,
        right: false,
        up: false,    // For climbing up
        down: false,  // For climbing down
        jumpPressed: false,
        jumpJustPressed: false,
        grabPressed: false,
        grabJustPressed: false,
    },

    gameLoopId: null,
    lastTimestamp: 0,
    debugInfoElement: null,

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.canvas = this.gameContainer.querySelector('#gameCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas'); this.canvas.id = 'gameCanvas';
            this.gameContainer.appendChild(this.canvas);
        }
        this.ctx = this.canvas.getContext('2d');
        this.debugInfoElement = this.gameContainer.querySelector('#debugInfo');

        this.callbacks.success = successCallback;
        this.callbacks.failure = failureCallback;
        this.sharedData = sharedData;

        this.canvas.width = this.world.width;
        this.canvas.height = this.world.height;

        // Reset player state
        const groundPlatform = this.platforms.find(p => p.type === 'ground') || { y: this.world.levelHeight - 40 };
        this.player.x = 50;
        this.player.y = groundPlatform.y - this.player.height - 1;
        this.player.vx = 0; this.player.vy = 0;
        this.player.isOnGround = true; this.player.isJumping = false;
        this.player.isClimbing = false; this.player.canClimb = false;
        this.player.currentWall = null; this.player.climbingWallSide = null;

        // Integrate climbingSkill for climbSpeed
        if (this.sharedData && this.sharedData.playerStats && typeof this.sharedData.playerStats.climbingSkill !== 'undefined') {
            this.player.climbingSkill = this.sharedData.playerStats.climbingSkill;
            const baseClimbSpeed = 1.2; // Base speed
            const skillFactor = 0.03;   // How much each skill point adds
            this.player.climbSpeed = baseClimbSpeed + (this.player.climbingSkill * skillFactor);
        } else {
            this.player.climbSpeed = 1.2; // Default if no skill data
        }

        this._setupEventListeners();
        this.lastTimestamp = performance.now();
        this._updateCamera(0, true); // Initial camera position
        this.startGameLoop();
        console.log(`${this.id}: Minimal Initialized. Climb Speed: ${this.player.climbSpeed}`);
    },

    startGameLoop: function() {
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        const loop = (timestamp) => {
            const deltaTime = timestamp - this.lastTimestamp;
            this.lastTimestamp = timestamp;
            this.update(deltaTime > 33 ? 16.67 : deltaTime); // Cap deltaTime
            this.render();
            this.gameLoopId = requestAnimationFrame(loop);
        };
        this.gameLoopId = requestAnimationFrame(loop);
    },

    update: function(deltaTime) {
        const dts = deltaTime / 16.67; // Delta Time Scale (for 60FPS target)
        this._handleInput();
        this._updatePlayer(dts);
        this._updateCamera(dts);
        this._checkGoal();
    },

    _checkCanClimb: function() {
        const p = this.player;
        if (p.isClimbing) return; // Already climbing

        let canCurrentlyClimb = false;
        let wallToClimb = null;
        let sideOfWall = null;
        const PROXIMITY_THRESHOLD = 8; // How close player's edge needs to be

        for (const platform of this.platforms) {
            if (platform.climbable) {
                const verticalOverlap = (p.y + p.height > platform.y && p.y < platform.y + platform.height);
                if (!verticalOverlap) continue;

                const playerRightEdge = p.x + p.width;
                const playerLeftEdge = p.x;
                const wallLeftEdge = platform.x;
                const wallRightEdge = platform.x + platform.width;

                const nearWallLeftSurface = (playerRightEdge >= wallLeftEdge - PROXIMITY_THRESHOLD &&
                                             playerRightEdge <= wallLeftEdge + PROXIMITY_THRESHOLD);
                const nearWallRightSurface = (playerLeftEdge <= wallRightEdge + PROXIMITY_THRESHOLD &&
                                              playerLeftEdge >= wallRightEdge - PROXIMITY_THRESHOLD);

                if (nearWallLeftSurface) {
                    canCurrentlyClimb = true; wallToClimb = platform; sideOfWall = 'wall_left_surface'; break;
                }
                if (nearWallRightSurface) {
                    canCurrentlyClimb = true; wallToClimb = platform; sideOfWall = 'wall_right_surface'; break;
                }
            }
        }
        p.canClimb = canCurrentlyClimb;
        p.currentWall = wallToClimb;
        p.climbingWallSide = sideOfWall;
    },

    _handleInput: function() {
        const p = this.player;

        if (p.isClimbing) {
            p.vx = 0; // Usually no horizontal input while climbing
            if (this.inputState.up) p.vy = -p.climbSpeed;
            else if (this.inputState.down) p.vy = p.climbSpeed;
            else p.vy = 0; // Hold position

            // Jump off wall
            if (this.inputState.jumpJustPressed) {
                const sideClimbed = p.climbingWallSide;
                p.isClimbing = false; p.currentWall = null; p.climbingWallSide = null;
                p.vy = -p.jumpStrength * 0.9; // Wall jump height
                if (sideClimbed === 'wall_left_surface') p.vx = p.speed;      // Was on left face, jump right
                else if (sideClimbed === 'wall_right_surface') p.vx = -p.speed; // Was on right face, jump left
                else p.vx = (p.x < this.world.width / 2) ? p.speed : -p.speed; // Fallback
            }
            // Detach with Grab key
            if (this.inputState.grabJustPressed) {
                const sideClimbed = p.climbingWallSide;
                p.isClimbing = false; p.currentWall = null; p.climbingWallSide = null;
                p.vy = -1.5; // Slight pop
                if (sideClimbed === 'wall_left_surface') p.vx = p.speed * 0.6;
                else if (sideClimbed === 'wall_right_surface') p.vx = -p.speed * 0.6;
                else p.vx = 0;
            }
        } else { // Not Climbing (Ground/Air)
            p.vx = 0;
            if (this.inputState.left) p.vx = -p.speed;
            if (this.inputState.right) p.vx = p.speed;

            if (this.inputState.jumpJustPressed && p.isOnGround) {
                p.vy = -p.jumpStrength;
                p.isOnGround = false; p.isJumping = true;
            }

            // Initiate Climb
            if (this.inputState.grabJustPressed && p.canClimb && p.currentWall) {
                p.isClimbing = true; p.isOnGround = false; p.isJumping = false;
                p.vy = 0; // Stop any current vertical movement
                if (p.climbingWallSide === 'wall_left_surface') {
                    p.x = p.currentWall.x - p.width; // Snap player's right edge to wall's left edge
                } else if (p.climbingWallSide === 'wall_right_surface') {
                    p.x = p.currentWall.x + p.currentWall.width; // Snap player's left edge to wall's right edge
                }
            }
        }
        // Consume "just pressed" flags
        this.inputState.jumpJustPressed = false;
        this.inputState.grabJustPressed = false;
    },

    _updatePlayer: function(dts) {
        const p = this.player;
        const w = this.world;

        if (!p.isClimbing) {
            this._checkCanClimb(); // Check if near a wall if not already climbing
        }

        if (p.isClimbing) {
            p.isOnGround = false;
            // Horizontal position (sticking or from wall jump)
            if (p.vx !== 0) { // From wall jump
                p.x += p.vx * dts;
            } else if (p.currentWall) { // Sticking to wall
                if (p.climbingWallSide === 'wall_left_surface') p.x = p.currentWall.x - p.width;
                else if (p.climbingWallSide === 'wall_right_surface') p.x = p.currentWall.x + p.currentWall.width;
            }
            p.y += p.vy * dts; // Vertical movement from input

            // Check if still effectively on the wall & clamp to wall edges
            let stillEffectivelyOnWall = false;
            if (p.currentWall) {
                const verticalOverlap = p.y < p.currentWall.y + p.currentWall.height && p.y + p.height > p.currentWall.y;
                let correctlyPositionedHorizontally = false;
                const HORIZONTAL_TOLERANCE = 1.5;

                if (p.climbingWallSide === 'wall_left_surface') {
                    correctlyPositionedHorizontally = Math.abs((p.x + p.width) - p.currentWall.x) < HORIZONTAL_TOLERANCE;
                } else if (p.climbingWallSide === 'wall_right_surface') {
                    correctlyPositionedHorizontally = Math.abs(p.x - (p.currentWall.x + p.currentWall.width)) < HORIZONTAL_TOLERANCE;
                }

                if (correctlyPositionedHorizontally && verticalOverlap) {
                    stillEffectivelyOnWall = true;
                }

                // Clamp to wall's top/bottom climbable area
                if (p.y < p.currentWall.y) { p.y = p.currentWall.y; p.vy = Math.max(0, p.vy); }
                if (p.y + p.height > p.currentWall.y + p.currentWall.height) {
                    p.y = p.currentWall.y + p.currentWall.height - p.height; p.vy = Math.min(0, p.vy);
                }
            }
            if (!stillEffectivelyOnWall && p.vx === 0) { // If not wall-jumping and lost contact
                p.isClimbing = false;
            }
        } else { // Not Climbing
            if (!p.isOnGround) p.vy += w.gravity * dts; else p.vy = 0;

            // Horizontal movement and collision with non-climbable parts of platforms
            let nextX = p.x + p.vx * dts;
            for (const platform of this.platforms) {
                if (platform.climbable && p.canClimb && p.currentWall === platform) continue; // Allow passing "through" climbable wall if preparing to climb

                if (p.y + p.height > platform.y && p.y < platform.y + platform.height) { // Vertical overlap
                    if (p.vx > 0 && p.x + p.width <= platform.x && nextX + p.width > platform.x) { // Colliding with left side of platform
                        nextX = platform.x - p.width; p.vx = 0;
                    }
                    if (p.vx < 0 && p.x >= platform.x + platform.width && nextX < platform.x + platform.width) { // Colliding with right side
                        nextX = platform.x + platform.width; p.vx = 0;
                    }
                }
            }
            p.x = nextX;

            // Vertical movement and collision
            p.isOnGround = false;
            let targetY = p.y + p.vy * dts;

            for (const platform of this.platforms) {
                const horizontalOverlap = p.x < platform.x + platform.width && p.x + p.width > platform.x;
                if (horizontalOverlap) {
                    // Landing on top
                    if (p.vy >= 0 && p.y + p.height <= platform.y && targetY + p.height > platform.y) {
                        targetY = platform.y - p.height;
                        p.vy = 0; p.isOnGround = true; p.isJumping = false;
                    }
                    // Hitting underside
                    if (p.vy < 0 && p.y >= platform.y + platform.height && targetY < platform.y + platform.height) {
                        targetY = platform.y + platform.height;
                        p.vy = 0;
                    }
                }
            }
            p.y = targetY;
        }

        // World bounds
        if (p.y + p.height > w.levelHeight) { p.y = w.levelHeight - p.height; p.vy = 0; p.isOnGround = true; p.isClimbing = false;}
        if (p.x < 0) p.x = 0;
        if (p.x + p.width > w.width) p.x = w.width - p.width;
    },

    _updateCamera: function(dts, immediate = false) {
        const p = this.player;
        const targetCamY = p.y - this.canvas.height / 2.2; // Keep player slightly lower than center
        let newCamY;
        if (immediate) newCamY = targetCamY;
        else newCamY = this.world.cameraY + (targetCamY - this.world.cameraY) * 0.15 * dts; // Slightly faster smooth camera
        this.world.cameraY = Math.max(0, Math.min(newCamY, this.world.levelHeight - this.canvas.height));
    },

    _checkGoal: function() {
        const p = this.player;
        const goalPlatform = this.platforms.find(pf => pf.type === 'goal');
        if (goalPlatform && p.isOnGround) {
            const horizontalOverlap = p.x < goalPlatform.x + goalPlatform.width && p.x + p.width > goalPlatform.x;
            const onGoalSurface = Math.abs((p.y + p.height) - goalPlatform.y) < 1;
            if (horizontalOverlap && onGoalSurface) {
                console.log(`${this.id}: Goal Reached!`);
                this.callbacks.success({ message: "Minimalist Summit!" });
                if (this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId = null; }
            }
        }
    },

    render: function() {
        const ctx = this.ctx;
        const p = this.player;
        const w = this.world;

        ctx.save();
        ctx.translate(0, -w.cameraY); // Apply camera

        // Background
        ctx.fillStyle = w.backgroundColor;
        ctx.fillRect(0, w.cameraY, this.canvas.width, this.canvas.height); // Draw only visible portion

        // Platforms
        this.platforms.forEach(platform => {
            ctx.fillStyle = platform.color;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            if (platform.climbable) { // Visual cue for climbable walls
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.width - 1, platform.height - 1);
            }
        });

        // Player
        ctx.fillStyle = p.color;
        if (p.isClimbing) ctx.fillStyle = 'lime'; // Different color when climbing for feedback
        ctx.fillRect(p.x, p.y, p.width, p.height);

        ctx.restore(); // Pops camera transform

        // Debug Info (drawn in screen space)
        this._updateDebugInfo();
    },

    _updateDebugInfo: function() {
        if (this.debugInfoElement) {
            this.debugInfoElement.innerHTML = `
                X: ${this.player.x.toFixed(1)}, Y: ${this.player.y.toFixed(1)}, VY: ${this.player.vy.toFixed(1)}<br>
                Ground: ${this.player.isOnGround}, Jump: ${this.player.isJumping}<br>
                Climb: ${this.player.isClimbing}, CanClimb: ${this.player.canClimb}<br>
                Wall: ${this.player.currentWall ? `(${this.player.currentWall.x})` : 'N'}<br>
                Side: ${this.player.climbingWallSide || 'N/A'}<br>
                CamY: ${this.world.cameraY.toFixed(1)}
            `;
        }
    },

    _setupEventListeners: function() {
        this._boundKeyDown = this._handleKeyDown.bind(this);
        this._boundKeyUp = this._handleKeyUp.bind(this);
        document.addEventListener('keydown', this._boundKeyDown);
        document.addEventListener('keyup', this._boundKeyUp);
    },
    _removeEventListeners: function() {
        document.removeEventListener('keydown', this._boundKeyDown);
        document.removeEventListener('keyup', this._boundKeyUp);
    },
    _handleKeyDown: function(e) {
        // Simplified input mapping
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.inputState.left = true;
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.inputState.right = true;
        else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
             this.inputState.up = true;
             if (!this.player.isClimbing && !this.inputState.jumpPressed) { // W is jump if not climbing
                this.inputState.jumpPressed = true; this.inputState.jumpJustPressed = true;
             }
        }
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.inputState.down = true;
        else if (e.key === ' ') { // Space is always jump
            if (!this.inputState.jumpPressed) {
                this.inputState.jumpPressed = true; this.inputState.jumpJustPressed = true;
            }
        }
        else if (e.key.toLowerCase() === 'e') { // E is grab
            if (!this.inputState.grabPressed) {
                this.inputState.grabPressed = true; this.inputState.grabJustPressed = true;
            }
        }
    },
    _handleKeyUp: function(e) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.inputState.left = false;
        else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.inputState.right = false;
        else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
            this.inputState.up = false;
            // Only release jumpPressed if W was the one that set it and player isn't climbing
            if (this.inputState.jumpPressed && !this.player.isClimbing) this.inputState.jumpPressed = false;
        }
        else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.inputState.down = false;
        else if (e.key === ' ') this.inputState.jumpPressed = false;
        else if (e.key.toLowerCase() === 'e') this.inputState.grabPressed = false;
    },

    destroy: function() {
        if (this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); this.gameLoopId = null; }
        this._removeEventListeners();
        console.log(`${this.id}: Destroyed.`);
    }
};
