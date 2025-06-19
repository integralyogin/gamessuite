const PlatformerGame = {
    id: 'PlatformerGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    callbacks: {
        success: null,
        failure: null,
    },
    sharedData: null,

    player: {
        x: 100,
        y: 450, // Start on a "floor"
        width: 30,
        height: 30,
        baseWidth: 30,
        baseHeight: 30,
        vx: 0, // Velocity X
        vy: 0, // Velocity Y
        speed: 4,
        jumpStrength: 12, // Adjusted for more typical platformer feel
        isJumping: false,
        isOnGround: true, // Start on the ground

        // Animation state
        squashStretchTimer: 0,
        squashStretchDuration: 150, // ms
        targetWidth: 30,
        targetHeight: 30,
        currentWidth: 30,
        currentHeight: 30,

        // Effects
        color: 'hsl(195, 100%, 60%)', // Bright blue
        trail: [],
        maxTrailLength: 10,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 8,
        shadowOffsetY: 4,
    },

    platforms: [
        { x: 0, y: 500, width: 800, height: 100, color: 'rgba(60, 60, 80, 1)', type: 'ground' },
        { x: 200, y: 400, width: 150, height: 20, color: 'rgba(80, 80, 110, 1)' },
        { x: 400, y: 320, width: 120, height: 20, color: 'rgba(80, 80, 110, 1)' },
        { x: 50, y: 250, width: 100, height: 20, color: 'rgba(100, 100, 130, 0.8)', type: 'ethereal' }, // Example special platform
    ],

    world: {
        gravity: 0.6, // Stronger gravity
        friction: 0.85,
        width: 800, // Same as canvas for now
        height: 600,
        backgroundColor: { current: 'linear-gradient(to bottom, #232a49 0%, #12152e 100%)' }, // For dynamic bg changes
    },

    effects: {
        particles: [],
        screenShake: {
            magnitude: 0,
            duration: 0,
            timer: 0,
        },
        // CSS variable driven effects (example)
        globalHue: 0,
        canvasBrightness: 1,
    },

    inputState: {
        left: false,
        right: false,
        jumpPressed: false, // Track if jump key is currently pressed
        jumpJustPressed: false, // For single jump action
    },

    gameLoopId: null,
    lastTimestamp: 0,
    score: 0,
    debugInfoElement: null,


    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.canvas = this.gameContainer.querySelector('#gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.callbacks.success = successCallback;
        this.callbacks.failure = failureCallback;
        this.sharedData = sharedData;
        this.debugInfoElement = this.gameContainer.querySelector('#debugInfo');


        this.canvas.width = this.world.width;
        this.canvas.height = this.world.height;
        this.player.x = this.world.width / 4;
        this.player.y = this.world.height - this.platforms[0].height - this.player.baseHeight - 1; // Start on the ground platform

        this._setupEventListeners();
        this.lastTimestamp = performance.now();
        this.startGameLoop();

        console.log(`${this.id}: Initialized and game loop started.`);
    },

    startGameLoop: function() {
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        const loop = (timestamp) => {
            const deltaTime = (timestamp - this.lastTimestamp);
            this.lastTimestamp = timestamp;
            this.update(deltaTime > 32 ? 16.67 : deltaTime); // Cap deltaTime to avoid physics glitches on tab resume
            this.render();
            this.gameLoopId = requestAnimationFrame(loop);
        };
        this.gameLoopId = requestAnimationFrame(loop);
    },

    update: function(deltaTime) {
        // Normalize deltaTime (aim for 60FPS physics)
        const dts = deltaTime / 16.67; // Delta Time Scale

        this._handleInput();
        this._updatePlayer(dts);
        this._updateParticles(dts);
        this._updateEffects(dts);
        this._updateDebugInfo();
    },

    _handleInput: function() {
        const p = this.player;
        p.vx = 0;
        if (this.inputState.left) {
            p.vx = -p.speed;
        }
        if (this.inputState.right) {
            p.vx = p.speed;
        }

        if (this.inputState.jumpJustPressed && p.isOnGround) {
            p.vy = -p.jumpStrength;
            p.isOnGround = false;
            p.isJumping = true;
            this._triggerSquashStretch('stretch');
            this._createParticleBurst(p.x + p.currentWidth / 2, p.y + p.currentHeight, 10, 'rgba(200,200,255,0.7)', 'jump');
        }
        this.inputState.jumpJustPressed = false; // Consume the just pressed state
    },

    _updatePlayer: function(dts) {
        const p = this.player;

        // Apply gravity
        if (!p.isOnGround) {
            p.vy += this.world.gravity * dts;
        } else {
            p.vy = 0; // Stop vertical movement when on ground
        }

        // Update position
        p.x += p.vx * dts;
        p.y += p.vy * dts;

        // Collision with world bounds (simple)
        if (p.x < 0) p.x = 0;
        if (p.x + p.currentWidth > this.world.width) p.x = this.world.width - p.currentWidth;

        // Ground and platform collision
        p.isOnGround = false;
        let landedThisFrame = false;

        this.platforms.forEach(platform => {
            // Check for horizontal overlap
            const horizontalOverlap = p.x < platform.x + platform.width && p.x + p.currentWidth > platform.x;
            // Check if player is currently above or intersecting the platform top
            const verticalPotential = p.y + p.currentHeight >= platform.y && p.y < platform.y + platform.height;

            if (horizontalOverlap && verticalPotential) {
                // Falling onto the platform
                if (p.vy >= 0 && (p.y + p.currentHeight - p.vy * dts) <= platform.y) { // ensure it was above last frame
                    p.y = platform.y - p.currentHeight;
                    p.vy = 0;
                    if (!p.isOnGround) landedThisFrame = true; // Check if it *wasn't* on ground before
                    p.isOnGround = true;
                    p.isJumping = false;
                }
                // Potentially add checks for hitting underside or sides later
            }
        });
        
        if (landedThisFrame) {
            this._triggerSquashStretch('squash');
            this._createParticleBurst(p.x + p.currentWidth / 2, p.y + p.currentHeight, 15, 'rgba(220,220,220,0.6)', 'land');
            this._triggerScreenShake(3, 100);
        }


        // Update squash/stretch animation
        if (p.squashStretchTimer > 0) {
            p.squashStretchTimer -= (16.67 * dts); // roughly in ms
            const progress = 1 - (p.squashStretchTimer / p.squashStretchDuration);
            p.currentWidth = p.baseWidth + (p.targetWidth - p.baseWidth) * Math.sin(progress * Math.PI); // Ease out
            p.currentHeight = p.baseHeight + (p.targetHeight - p.baseHeight) * Math.sin(progress * Math.PI);
            if (p.squashStretchTimer <= 0) {
                p.currentWidth = p.baseWidth;
                p.currentHeight = p.baseHeight;
            }
        } else {
             p.currentWidth = p.baseWidth; // Ensure it resets if timer is not active
             p.currentHeight = p.baseHeight;
        }
        
        // Update player trail
        p.trail.unshift({ x: p.x, y: p.y, width: p.currentWidth, height: p.currentHeight });
        if (p.trail.length > p.maxTrailLength) {
            p.trail.pop();
        }

        // Dynamic color based on state (example)
        if (p.isJumping) {
            const jumpProgress = Math.min(1, Math.abs(p.vy) / p.jumpStrength);
            const hue = 195 + jumpProgress * 60; // Shift towards green/yellow
            p.color = `hsl(${hue}, 100%, 70%)`;
        } else if (p.isOnGround) {
            p.color = 'hsl(195, 100%, 60%)'; // Reset color
        }
    },

    _triggerSquashStretch: function(type) {
        const p = this.player;
        p.squashStretchTimer = p.squashStretchDuration;
        if (type === 'stretch') { // Jumping
            p.targetWidth = p.baseWidth * 0.7;
            p.targetHeight = p.baseHeight * 1.4;
        } else if (type === 'squash') { // Landing
            p.targetWidth = p.baseWidth * 1.3;
            p.targetHeight = p.baseHeight * 0.7;
        }
    },

    _createParticleBurst: function(x, y, count, baseColor, type = 'generic') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            const size = Math.random() * (type === 'land' ? 4 : 3) + 2;
            const life = Math.random() * 400 + 300; // ms
            const particle = {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * (type === 'jump' ? -0.5 : (type === 'land' ? 0.3 : -1)), // Land particles go up a bit
                life,
                initialLife: life,
                size,
                color: baseColor, // Color could be varied too
            };
            if (type === 'land') particle.vy += this.world.gravity * 0.5; // Add slight gravity to land dust
            this.effects.particles.push(particle);
        }
    },

    _updateParticles: function(dts) {
        this.effects.particles = this.effects.particles.filter(p => {
            p.x += p.vx * dts;
            p.y += p.vy * dts;
            p.life -= (16.67 * dts);
            if (p.type === 'land') p.vy += this.world.gravity * 0.05 * dts; // Subtle gravity on dust
            return p.life > 0;
        });
    },
    
    _triggerScreenShake: function(magnitude, duration) {
        this.effects.screenShake.magnitude = magnitude;
        this.effects.screenShake.duration = duration;
        this.effects.screenShake.timer = duration;
    },

    _updateEffects: function(dts) {
        // Screen Shake
        if (this.effects.screenShake.timer > 0) {
            this.effects.screenShake.timer -= (16.67 * dts);
        } else {
            this.effects.screenShake.magnitude = 0;
        }

        // Example: Animate global hue for CSS filters (if canvas has .effects-active class)
        // this.effects.globalHue = (this.effects.globalHue + 0.2 * dts) % 360;
        // this.canvas.style.setProperty('--global-hue-shift', `${this.effects.globalHue}deg`);

        // Pulsating background (canvas drawn)
        // Could change this.world.backgroundColor based on time or events
    },


    render: function() {
        const ctx = this.ctx;
        const p = this.player;

        // Apply screen shake
        let shakeX = 0;
        let shakeY = 0;
        if (this.effects.screenShake.magnitude > 0) {
            shakeX = (Math.random() - 0.5) * 2 * this.effects.screenShake.magnitude;
            shakeY = (Math.random() - 0.5) * 2 * this.effects.screenShake.magnitude;
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }

        // Clear canvas / Draw background
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // For dynamic gradient background (can be animated in _updateEffects)
        if (typeof this.world.backgroundColor.current === 'string' && this.world.backgroundColor.current.includes('gradient')) {
            const gradientStops = this.world.backgroundColor.current.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g);
            if(gradientStops && gradientStops.length >= 2){
                 const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
                 grad.addColorStop(0, gradientStops[0]);
                 grad.addColorStop(1, gradientStops[1]);
                 ctx.fillStyle = grad;
            } else {
                 ctx.fillStyle = '#12152e'; // Fallback
            }
        } else {
            ctx.fillStyle = this.world.backgroundColor.current;
        }
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);


        // Draw platforms
        this.platforms.forEach(platform => {
            ctx.fillStyle = platform.color;
             if (platform.type === 'ethereal') { // Example special effect
                ctx.globalAlpha = 0.7 + Math.sin(performance.now() / 300) * 0.2; // Pulsating alpha
                ctx.shadowColor = 'rgba(150, 150, 255, 0.7)';
                ctx.shadowBlur = 15;
            }
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.globalAlpha = 1.0; // Reset alpha
            ctx.shadowBlur = 0; // Reset shadow
        });
        
        // Draw Player Trail (ghosting effect)
        for (let i = 0; i < p.trail.length; i++) {
            const trailPart = p.trail[i];
            const alpha = 0.5 * (1 - (i / p.trail.length)); // Fade out
            const trailColor = p.color.replace(/,\s*\d+(\.\d+)?\%\)/, `, ${Math.max(20, 60 - i*4)}%)`); // Desaturate/darken older trails
            ctx.fillStyle = trailColor;
            ctx.globalAlpha = alpha;
            ctx.fillRect(trailPart.x, trailPart.y, trailPart.width, trailPart.height);
        }
        ctx.globalAlpha = 1.0;


        // Draw Player
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.shadowColor;
        ctx.shadowBlur = p.shadowBlur;
        ctx.shadowOffsetY = p.shadowOffsetY;
        ctx.shadowOffsetX = 0;
        
        ctx.fillRect(p.x, p.y, p.currentWidth, p.currentHeight);
        ctx.shadowBlur = 0; // Reset shadow for other elements

        // Draw Particles
        this.effects.particles.forEach(particle => {
            const alpha = particle.life / particle.initialLife;
            ctx.fillStyle = particle.color.replace(/[\d\.]+\)$/g, `${alpha * 0.8})`); // Adjust alpha in rgba
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * (alpha), 0, Math.PI * 2); // Shrink as they fade
            ctx.fill();
        });

        // Restore context if screen shake was applied
        if (this.effects.screenShake.magnitude > 0) {
            ctx.restore();
        }

        // Update UI (Score - could be done in HTML overlay)
        this.gameContainer.querySelector('#scoreDisplay').textContent = `Score: ${this.score}`;
    },

    _updateDebugInfo: function() {
        if(this.debugInfoElement) {
             this.debugInfoElement.innerHTML = `
                Player X: ${this.player.x.toFixed(1)}, Y: ${this.player.y.toFixed(1)}<br>
                VX: ${this.player.vx.toFixed(1)}, VY: ${this.player.vy.toFixed(1)}<br>
                OnGround: ${this.player.isOnGround}, Jumping: ${this.player.isJumping}<br>
                Width: ${this.player.currentWidth.toFixed(1)}, Height: ${this.player.currentHeight.toFixed(1)}
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
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.inputState.left = true;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.inputState.right = true;
        } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !this.inputState.jumpPressed) {
            this.inputState.jumpPressed = true;
            this.inputState.jumpJustPressed = true;
        }
    },

    _handleKeyUp: function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.inputState.left = false;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.inputState.right = false;
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
            this.inputState.jumpPressed = false;
        }
    },

    destroy: function() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        this._removeEventListeners();
        this.gameContainer.innerHTML = ''; // Clear the container
        console.log(`${this.id}: Destroyed.`);
    }
};
