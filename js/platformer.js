// js/platformer.js
const PlatformerGame = {
    id: 'platformer-game',
    animationFrameId: null,
    boundKeyDownHandler: null,
    boundKeyUpHandler: null,
    player: null, // Will store { x, y_css_bottom, width, height, vx, vy, speed, jumpStrength, gravity, onGround, isJumping }
    playerElement: null,
    goalElement: null,
    platforms: [], // Will store DOM elements of platforms
    coins: [],     // Will store coin objects { x_css_left, y_css_bottom, width, height, element, collected, id }
    coinDisplayElement: null,
    collectedCoinCount: 0,
    
    // Define platform layout: [left, bottom, width, height, id (optional)]
    // Note: CSS bottom/left will be used directly.
    platformData: [
        { left: 0, bottom: 0, width: 120, height: 20, id: 'startPlatform' },
        { left: 180, bottom: 70, width: 100, height: 20 }, // Platform 1
        { left: 320, bottom: 140, width: 80, height: 20 },  // Platform 2 (higher)
        { left: 450, bottom: 50, width: 100, height: 20, id: 'middlePitPlatform' }, // Over a potential pit area
        { left: 600, bottom: 110, width: 70, height: 20 },  // Platform 3
        { left: 700, bottom: 0, width: 100, height: 20, id: 'endPlatform' } // endPlatform (right:0 in CSS will be used)
    ],

    // Define coin layout: [left_css, bottom_css, id]
    // Place them relative to platforms or specific coordinates
    coinLayout: [
        { left: 210, bottom: 100, id: 'coin1' }, // On Platform 1 (70 + 20 + 10)
        { left: 345, bottom: 170, id: 'coin2' }, // On Platform 2 (140 + 20 + 10)
        { left: 480, bottom: 80, id: 'coin3' },  // On Middle Pit Platform
        { left: 620, bottom: 140, id: 'coin4' }, // On Platform 3
        { left: 50, bottom: 200, id: 'coin5_highJump' } // Requires a good jump from start or other platform
    ],

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        console.log("Initializing Enhanced Platformer Game. Received data:", previousData);
        this.platforms = [];
        this.coins = [];
        this.collectedCoinCount = 0;
        this.keys = {}; // Ensure keys object is reset

        // New, larger dimensions for the game root
        const gameRootWidth = 800;
        const gameRootHeight = 400;

        let platformHTML = '';
        this.platformData.forEach((pd, index) => {
            let style = `bottom: ${pd.bottom}px; left: ${pd.left}px; width: ${pd.width}px; height: ${pd.height}px;`;
            if (pd.id === 'endPlatform') { // Adjust for right-aligned platform
                style = `bottom: ${pd.bottom}px; right: 0px; width: ${pd.width}px; height: ${pd.height}px;`;
            }
            platformHTML += `<div class="platform" id="${pd.id || 'platform' + index}" style="${style}"></div>`;
        });
        
        gameContainer.innerHTML = `
            <div class="platformer-game-root" id="platformerRootElement" style="width: ${gameRootWidth}px; height: ${gameRootHeight}px;">
                <div class="player" id="platformerPlayer"></div>
                ${platformHTML}
                <div class="goal" id="platformerGoal" style="bottom: 20px; right: 30px;"></div>
                <div id="platformerCoinDisplay">Coins: 0</div>
            </div>
        `;

        const rootElement = document.getElementById('platformerRootElement');
        this.playerElement = document.getElementById('platformerPlayer');
        this.goalElement = document.getElementById('platformerGoal');
        this.coinDisplayElement = document.getElementById('platformerCoinDisplay');

        // Store platform elements
        rootElement.querySelectorAll('.platform').forEach(p => this.platforms.push(p));

        // Create and store coin elements
        this.coinLayout.forEach(cd => {
            const coinElement = document.createElement('div');
            coinElement.classList.add('coin');
            coinElement.id = cd.id;
            coinElement.style.left = cd.left + 'px';
            coinElement.style.bottom = cd.bottom + 'px';
            rootElement.appendChild(coinElement);
            this.coins.push({
                x_css_left: cd.left,
                y_css_bottom: cd.bottom,
                width: 20, // From CSS .coin width
                height: 20, // From CSS .coin height
                element: coinElement,
                collected: false,
                id: cd.id
            });
        });
        this.updateCoinDisplay();

        this.player = {
            x: 30, y_css_bottom: 20, // Initial position on start platform's top
            width: parseInt(getComputedStyle(this.playerElement).width),
            height: parseInt(getComputedStyle(this.playerElement).height),
            vx: 0, vy: 0,
            speed: 4, // Slightly increased speed
            jumpStrength: 11, // Adjusted jump
            gravity: 0.5,  // Adjusted gravity
            onGround: true,
            isJumping: false
        };

        this.playerElement.style.left = this.player.x + 'px';
        this.playerElement.style.bottom = this.player.y_css_bottom + 'px';

        this.boundKeyDownHandler = (e) => { this.keys[e.key] = true; };
        this.boundKeyUpHandler = (e) => {
            this.keys[e.key] = false;
            if (e.key === 'ArrowUp' || e.key === ' ') this.player.isJumping = false;
        };
        document.addEventListener('keydown', this.boundKeyDownHandler);
        document.addEventListener('keyup', this.boundKeyUpHandler);

        let lastFrameTime = performance.now();
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - lastFrameTime) / 1000; // Delta time in seconds
            lastFrameTime = currentTime;

            // Handle input
            if (this.keys['ArrowLeft']) this.player.vx = -this.player.speed;
            else if (this.keys['ArrowRight']) this.player.vx = this.player.speed;
            else this.player.vx = 0;

            if ((this.keys['ArrowUp'] || this.keys[' ']) && this.player.onGround && !this.player.isJumping) {
                this.player.vy = this.player.jumpStrength;
                this.player.onGround = false;
                this.player.isJumping = true;
            }

            // Apply physics
            this.player.vy -= this.player.gravity * 60 * deltaTime; // Scale gravity by deltaTime
            this.player.x += this.player.vx * 60 * deltaTime;     // Scale velocity by deltaTime
            this.player.y_css_bottom += this.player.vy * 60 * deltaTime;

            this.player.onGround = false;

            // Platform collisions
            this.platforms.forEach(platformEl => {
                const platStyle = getComputedStyle(platformEl);
                const platRect = {
                    left: platformEl.offsetLeft,
                    bottom: parseInt(platStyle.bottom),
                    width: platformEl.offsetWidth,
                    height: parseInt(platStyle.height)
                };

                if (this.player.vy <= 0 && // Moving downwards or still
                    this.player.x + this.player.width > platRect.left &&
                    this.player.x < platRect.left + platRect.width) {
                    
                    const playerPrevBottom_css = this.player.y_css_bottom - (this.player.vy * 60 * deltaTime);
                    const platformTop_css = platRect.bottom + platRect.height;

                    if (playerPrevBottom_css >= platformTop_css && this.player.y_css_bottom <= platformTop_css) {
                        this.player.y_css_bottom = platformTop_css;
                        this.player.vy = 0;
                        this.player.onGround = true;
                    }
                }
            });
            
            // Pit detection / ground boundary (y_css_bottom=0)
            if (this.player.y_css_bottom < 0) {
                let onAnyGroundPlatform = false;
                this.platforms.forEach(platformEl => {
                    const platStyle = getComputedStyle(platformEl);
                    if (parseInt(platStyle.bottom) === 0) { // Check only ground level platforms
                        if (this.player.x + this.player.width > platformEl.offsetLeft && 
                            this.player.x < platformEl.offsetLeft + platformEl.offsetWidth) {
                            onAnyGroundPlatform = true;
                        }
                    }
                });

                if (onAnyGroundPlatform) {
                    this.player.y_css_bottom = 0;
                    this.player.vy = 0;
                    this.player.onGround = true;
                } else { // Fell into a pit
                    console.log("Fell in pit! Resetting player position.");
                    this.player.x = 30; this.player.y_css_bottom = 20; // Reset to start
                    this.player.vx = 0; this.player.vy = 0;
                    this.player.onGround = true;
                    // Coins remain collected for this attempt.
                }
            }

            // Side boundaries of the game area
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > gameRootWidth) this.player.x = gameRootWidth - this.player.width;

            // Update player element style
            this.playerElement.style.left = this.player.x + 'px';
            this.playerElement.style.bottom = this.player.y_css_bottom + 'px';

            // Coin collection
            this.coins.forEach(coin => {
                if (!coin.collected &&
                    this.player.x < coin.x_css_left + coin.width &&
                    this.player.x + this.player.width > coin.x_css_left &&
                    this.player.y_css_bottom < coin.y_css_bottom + coin.height &&
                    this.player.y_css_bottom + this.player.height > coin.y_css_bottom) {
                    
                    coin.collected = true;
                    coin.element.style.display = 'none';
                    this.collectedCoinCount++;
                    this.updateCoinDisplay();
                    console.log(`Collected ${coin.id}. Total coins: ${this.collectedCoinCount}`);
                }
            });

            // Check win condition (collision with goal)
            const goalRect = {
                left: this.goalElement.offsetLeft,
                bottom: parseInt(getComputedStyle(this.goalElement).bottom),
                width: this.goalElement.offsetWidth,
                height: this.goalElement.offsetHeight
            };
            if (this.player.x < goalRect.left + goalRect.width &&
                this.player.x + this.player.width > goalRect.left &&
                this.player.y_css_bottom < goalRect.bottom + goalRect.height &&
                this.player.y_css_bottom + this.player.height > goalRect.bottom) {
                console.log("Platformer Goal Reached!");
                this.destroy();
                successCallback({ platformerResult: "Success", coinsCollected: this.collectedCoinCount, score: 100 + (this.collectedCoinCount * 10) });
                return;
            }

            this.animationFrameId = requestAnimationFrame(gameLoop);
        };

        this.animationFrameId = requestAnimationFrame(gameLoop);
    },

    updateCoinDisplay: function() {
        if (this.coinDisplayElement) {
            this.coinDisplayElement.textContent = `Coins: ${this.collectedCoinCount}`;
        }
    },

    destroy: function() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.boundKeyDownHandler) {
            document.removeEventListener('keydown', this.boundKeyDownHandler);
            this.boundKeyDownHandler = null;
        }
        if (this.boundKeyUpHandler) {
            document.removeEventListener('keyup', this.boundKeyUpHandler);
            this.boundKeyUpHandler = null;
        }
        // Clear arrays and DOM elements if necessary, though GameManager clears innerHTML
        this.platforms = [];
        this.coins = []; // Could clear coin elements if not handled by innerHTML overwrite
        this.player = null; // Reset player object
        console.log("PlatformerGame resources cleaned up.");
    }
};
