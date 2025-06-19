// js/platformer.js
const PlatformerGame = {
    id: 'PlatformerGame', // Consistent ID
    animationFrameId: null,
    boundKeyDownHandler: null,
    boundKeyUpHandler: null,
    
    player: null,
    playerElement: null,
    goalElement: null,
    platforms: [],
    coins: [],
    
    keys: {}, // Keep track of pressed keys

    gameManagerSuccessCallback: null,
    gameManagerFailureCallback: null,
    playerName: null,

    gameContainer: null, // The main container element for the game (viewport)
    gameWorldElement: null, // The element representing the entire game world that scrolls
    
    // HUD Elements
    hudCoinDisplayElement: null,
    hudPlayerNameElement: null,
    collectedCoinCount: 0,

    // Camera and Viewport
    cameraX: 0,
    viewportWidth: 0,

    levelSettings: {
        gameRootWidth: 1300, 
        gameRootHeight: 650, 
        platformData: [
            { left: 0, bottom: 0, width: 200, height: 20, id: 'startPlatform' },
            { left: 250, bottom: 0, width: 100, height: 20 }, 
            { left: 400, bottom: 0, width: 150, height: 20 },
            { left: 180, bottom: 100, width: 80, height: 20 }, 
            { left: 350, bottom: 160, width: 70, height: 20 },
            { left: 500, bottom: 220, width: 60, height: 20, id: 'highPlatform1' },
            { left: 600, bottom: 80, width: 50, height: 20, id: 'smallStep1' }, 
            { left: 700, bottom: 40, width: 40, height: 20, id: 'verySmallStep' },
            { left: 800, bottom: 100, width: 70, height: 20 },
            { left: 650, bottom: 300, width: 100, height: 20, id: 'secretHighPlatform1' },
            { left: 800, bottom: 380, width: 80, height: 20, id: 'secretHighPlatform2' },
            { left: 950, bottom: 180, width: 100, height: 20 },
            { left: 1100, bottom: 240, width: 70, height: 20, id: 'preGoalPlatform' },
            { right: 0, bottom: 0, width: 150, height: 20, id: 'endPlatform' } 
        ],
        coinLayout: [
            { left: 200, bottom: 130, id: 'coin1' }, { left: 370, bottom: 190, id: 'coin2' },
            { left: 520, bottom: 250, id: 'coin3_high1' }, { left: 615, bottom: 110, id: 'coin4_smallStep' },
            { left: 710, bottom: 70, id: 'coin5_verySmallStep' }, { left: 820, bottom: 130, id: 'coin6' },
            { left: 680, bottom: 330, id: 'coin7_secretHigh1' }, { left: 720, bottom: 330, id: 'coin8_secretHigh2' },
            { left: 830, bottom: 410, id: 'coin9_secretHigh3' }, { left: 860, bottom: 410, id: 'coin10_secretHigh4' },
            { left: 980, bottom: 210, id: 'coin11' }, { left: 1120, bottom: 270, id: 'coin12_preGoal' },
            { left: 50, bottom: 350, id: 'coin13_superHighStartBonus' },
            { left: 1250, bottom: 50, id: 'coin14_endBonusLow' },
            { left: 1200, bottom: 300, id: 'coin15_endBonusHigh' }
        ],
        playerJumpStrength: 11.5, 
        gravity: 0.5,
        goalPosition: { bottom: 20, right: 30 },
        scoreMultiplier: 1.8 
    },

    init: function(gameContainerElement, successCallback, globalFailureCallback, previousData) {
        console.log(`${this.id}: Initializing. Received data:`, previousData);
        this.gameContainer = gameContainerElement; // Store the reference to the game's viewport container
        this.gameManagerSuccessCallback = successCallback;
        this.gameManagerFailureCallback = globalFailureCallback;
        this.playerName = previousData ? previousData.playerName : "Guest";

        this.setupGameLevel(previousData);
    },

    setupGameLevel: function(previousData) {
        this.platforms = [];
        this.coins = [];
        this.collectedCoinCount = 0;
        this.keys = {};
        this.cameraX = 0;

        const settings = this.levelSettings;

        // Configure the gameContainer as the viewport
        this.gameContainer.style.overflow = 'hidden';
        this.gameContainer.style.position = 'relative'; // For positioning HUD and gameWorld
        // Use existing width/max-width from CSS (.game-area), but set height
        this.gameContainer.style.height = settings.gameRootHeight + 'px';
        // Ensure background of viewport is distinct or transparent if gameWorldElement covers it
        // this.gameContainer.style.backgroundColor = 'rgba(0,0,0,0.1)'; // Optional: for debugging viewport

        let platformHTML = '';
        settings.platformData.forEach((pd, index) => {
            let style = `bottom: ${pd.bottom}px; width: ${pd.width}px; height: ${pd.height}px; background-color: #8d6e63; border-bottom: 3px solid #5d4037;`;
            if (typeof pd.left !== 'undefined') {
                style += ` left: ${pd.left}px;`;
            } else if (typeof pd.right !== 'undefined') {
                style += ` right: ${pd.right}px;`;
            }
            platformHTML += `<div class="platform" id="${pd.id || 'platform' + index}" style="${style} position: absolute; border-radius: 3px;"></div>`;
        });
        
        const startPlatform = settings.platformData.find(p => p.id === 'startPlatform') || { left: 30, bottom: 0, height: 20, width: 100 };

        // Set up the HTML structure: Viewport (gameContainer) > GameWorld + HUD
        this.gameContainer.innerHTML = `
            <div id="platformerGameWorld" style="width: ${settings.gameRootWidth}px; height: ${settings.gameRootHeight}px; position: absolute; left: 0; top: 0; background-color: #c5cae9; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.3);">
                <div id="platformerPlayer" class="player" style="background-color: #ff5722; width: 20px; height: 20px; position: absolute; border-radius: 4px; box-shadow: 0 0 5px #ff5722;"></div>
                ${platformHTML}
                <div id="platformerGoal" class="goal" style="bottom: ${settings.goalPosition.bottom}px; right: ${settings.goalPosition.right}px; width: 35px; height: 35px; background-color: #4caf50; position: absolute; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size:1.8em; color:white; box-shadow: 0 0 8px #4caf50;">&#127942;</div>
            </div>
            <div id="hudPlatformerCoinDisplay" style="position: absolute; top: 15px; left: 15px; font-size: 1.6em; color: #2c3e50; background-color: rgba(255,255,255,0.85); padding: 10px 15px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10;">Coins: 0</div>
            <div id="hudPlatformerPlayerName" style="position: absolute; top: 20px; right: 20px; font-size: 1em; color: #2c3e50; background-color: rgba(255,255,255,0.7); padding: 6px 10px; border-radius: 4px; z-index: 10;">Player: ${this.playerName}</div>
        `;

        this.gameWorldElement = document.getElementById('platformerGameWorld');
        this.playerElement = document.getElementById('platformerPlayer'); // Assumes it's child of gameWorld
        this.goalElement = document.getElementById('platformerGoal');     // Assumes it's child of gameWorld
        
        this.hudCoinDisplayElement = document.getElementById('hudPlatformerCoinDisplay');
        this.hudPlayerNameElement = document.getElementById('hudPlatformerPlayerName');

        this.gameWorldElement.querySelectorAll('.platform').forEach(p => this.platforms.push(p));

        settings.coinLayout.forEach(cd => {
            const coinElement = document.createElement('div');
            coinElement.classList.add('coin');
            coinElement.style.backgroundColor = '#ffeb3b'; 
            coinElement.style.width = '22px'; 
            coinElement.style.height = '22px';
            coinElement.style.borderRadius = '50%';
            coinElement.style.position = 'absolute';
            coinElement.style.boxShadow = '0 0 6px #fbc02d';
            coinElement.style.display = 'flex';
            coinElement.style.alignItems = 'center';
            coinElement.style.justifyContent = 'center';
            coinElement.style.fontSize = '12px';
            coinElement.style.fontWeight = 'bold';
            coinElement.style.color = '#c79100';
            coinElement.innerHTML = '$'; 

            coinElement.id = cd.id;
            coinElement.style.left = cd.left + 'px';
            coinElement.style.bottom = cd.bottom + 'px';
            this.gameWorldElement.appendChild(coinElement); // Append coins to the game world
            this.coins.push({
                x_css_left: cd.left, y_css_bottom: cd.bottom,
                width: 22, height: 22,
                element: coinElement, collected: false, id: cd.id
            });
        });
        this.updateCoinDisplay();

        this.player = {
            x: startPlatform.left + (startPlatform.width / 2) - 10, 
            y_css_bottom: startPlatform.bottom + startPlatform.height,
            width: 20, height: 20,
            vx: 0, vy: 0,
            speed: 4.5, 
            jumpStrength: settings.playerJumpStrength,
            gravity: settings.gravity,
            onGround: true, isJumping: false
        };

        this.playerElement.style.left = this.player.x + 'px';
        this.playerElement.style.bottom = this.player.y_css_bottom + 'px';
        
        // Get viewport width after DOM is set up and styles applied
        this.viewportWidth = this.gameContainer.clientWidth; 

        this.boundKeyDownHandler = (e) => { 
            this.keys[e.key] = true; 
            if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
                e.preventDefault();
            }
        };
        this.boundKeyUpHandler = (e) => {
            this.keys[e.key] = false;
            if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') this.player.isJumping = false;
        };
        document.addEventListener('keydown', this.boundKeyDownHandler);
        document.addEventListener('keyup', this.boundKeyUpHandler);

        let lastFrameTime = performance.now();
        const gameLoop = (currentTime) => {
            // Ensure game objects are still valid (e.g. not destroyed)
            if (!this.player || !this.gameWorldElement || !this.playerElement) {
                console.warn(`${this.id}: Game loop called after potential cleanup.`);
                if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                return;
            }
            
            const deltaTime = Math.min(0.05, (currentTime - lastFrameTime) / 1000); 
            lastFrameTime = currentTime;

            if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.player.vx = -this.player.speed;
            else if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.player.vx = this.player.speed;
            else this.player.vx = 0;

            if ((this.keys['ArrowUp'] || this.keys[' '] || this.keys['w'] || this.keys['W']) && this.player.onGround && !this.player.isJumping) {
                this.player.vy = this.player.jumpStrength;
                this.player.onGround = false;
                this.player.isJumping = true;
            }

            this.player.vy -= this.player.gravity; 
            this.player.x += this.player.vx;
            this.player.y_css_bottom += this.player.vy;

            this.player.onGround = false;

            this.platforms.forEach(platformEl => {
                const platRect = {
                    left: platformEl.offsetLeft, bottom: parseInt(getComputedStyle(platformEl).bottom),
                    width: platformEl.offsetWidth, height: parseInt(getComputedStyle(platformEl).height)
                };
                const platformTop_css = platRect.bottom + platRect.height;

                if (this.player.vy <= 0 &&
                    this.player.x + this.player.width > platRect.left &&
                    this.player.x < platRect.left + platRect.width) {
                    const playerPrevBottom_css = (this.player.y_css_bottom - this.player.vy);
                    if (playerPrevBottom_css >= platformTop_css && this.player.y_css_bottom <= platformTop_css) {
                        this.player.y_css_bottom = platformTop_css;
                        this.player.vy = 0;
                        this.player.onGround = true;
                        this.player.isJumping = false; 
                    }
                }
            });
            
            if (this.player.y_css_bottom < -this.player.height * 3) {
                console.log(`${this.id}: Fell in pit! Resetting player position.`);
                const initialStartPlatform = settings.platformData.find(p => p.id === 'startPlatform') || { left: 30, bottom: 0, height: 20, width: 100 };
                this.player.x = initialStartPlatform.left + (initialStartPlatform.width / 2) - (this.player.width / 2);
                this.player.y_css_bottom = initialStartPlatform.bottom + initialStartPlatform.height;
                this.player.vx = 0; this.player.vy = 0;
                this.player.onGround = true; 
                this.player.isJumping = false;
            }

            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > settings.gameRootWidth) {
                this.player.x = settings.gameRootWidth - this.player.width;
            }

            // Camera Logic
            if (this.viewportWidth > 0) { // Ensure viewportWidth is initialized
                let targetCameraX = this.player.x - (this.viewportWidth / 2) + (this.player.width / 2);
                this.cameraX = Math.max(0, Math.min(targetCameraX, settings.gameRootWidth - this.viewportWidth));
                this.gameWorldElement.style.transform = 'translateX(' + (-this.cameraX) + 'px)'; // Corrected this line
            }


            this.playerElement.style.left = this.player.x + 'px';
            this.playerElement.style.bottom = this.player.y_css_bottom + 'px';

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
                    console.log(`${this.id}: Collected ${coin.id}. Total coins: ${this.collectedCoinCount}`);
                }
            });

            const goalRect = {
                left: this.goalElement.offsetLeft, bottom: parseInt(getComputedStyle(this.goalElement).bottom),
                width: this.goalElement.offsetWidth, height: this.goalElement.offsetHeight
            };
            if (this.player.x < goalRect.left + goalRect.width &&
                this.player.x + this.player.width > goalRect.left &&
                this.player.y_css_bottom < goalRect.bottom + goalRect.height &&
                this.player.y_css_bottom + this.player.height > goalRect.bottom) {
                console.log(`${this.id}: Goal Reached! Collected coins: ${this.collectedCoinCount}`);
                this.handleGameCompletion(); 
                return; 
            }

            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        this.animationFrameId = requestAnimationFrame(gameLoop);
        console.log(`${this.id} initialized and game loop started with scrolling camera.`);
    },

    handleGameCompletion: function() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // Event listeners are cleaned up in destroyCleanup
        
        const finalScore = Math.round((100 + (this.collectedCoinCount * 10)) * this.levelSettings.scoreMultiplier);

        const gameDataToSave = {
            playerName: this.playerName || "UnknownPlayer",
            gameName: this.id,
            timestamp: new Date().toISOString(),
            gameSpecificData: {
                coinsCollected: this.collectedCoinCount,
                score: finalScore,
                levelPlayed: "ChallengeModeScrolling" 
            }
        };

        const dataForGameManager = {
            platformerResult: "Success",
            coinsCollected: this.collectedCoinCount,
            score: finalScore,
            playerName: this.playerName
        };

        if (!this.playerName || this.playerName === "Guest") {
            console.warn(`${this.id}: PlayerName is not set or is Guest. Skipping save to player_data.json.`);
            if (this.gameManagerSuccessCallback) {
                this.gameManagerSuccessCallback(dataForGameManager);
            }
            this.destroy(); // Call full destroy to ensure cleanup
            return;
        }
        
        console.log(`${this.id}: Attempting to save data:`, gameDataToSave);

        fetch('save-player.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameDataToSave)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; }).catch(() => {
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(`${this.id}: Save successful:`, data);
            if (this.gameManagerSuccessCallback) {
                this.gameManagerSuccessCallback(dataForGameManager);
            }
        })
        .catch(error => {
            console.error(`${this.id}: Error saving player data:`, error);
            if (this.gameManagerSuccessCallback) {
                console.warn(`${this.id}: Proceeding to next game despite save error.`);
                this.gameManagerSuccessCallback(dataForGameManager);
            }
        })
        .finally(() => {
            this.destroy(); // Call full destroy to ensure cleanup
        });
    },

    updateCoinDisplay: function() {
        if (this.hudCoinDisplayElement) {
            this.hudCoinDisplayElement.textContent = `Coins: ${this.collectedCoinCount}`;
        }
    },

    destroyCleanup: function() {
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
        
        // Reset styles on gameContainer that were set by this game
        if (this.gameContainer) {
            this.gameContainer.style.overflow = '';
            this.gameContainer.style.position = '';
            this.gameContainer.style.height = '';
            // this.gameContainer.style.backgroundColor = ''; // Let GameManager handle this via class reset
        }
        // GameManager will clear innerHTML of gameContainer

        this.platforms = [];
        this.coins = [];
        this.player = null;
        this.keys = {};
        this.gameWorldElement = null; 
        this.hudCoinDisplayElement = null;
        this.hudPlayerNameElement = null;
        this.playerElement = null;
        this.goalElement = null;
        this.gameContainer = null; // Clear reference
        console.log(`${this.id} resources cleaned up.`);
    },

    destroy: function() {
        console.log(`${this.id}: Destroy called.`);
        this.destroyCleanup();
    }
};

