// js/arcadeGame.js
const ArcadeGame = {
    id: 'ArcadeGame',
    gameContainer: null,
    mainSuccessCallback: null,
    sharedData: null,
    activeSubGame: null,

    arcadeGamesList: [
        { name: 'Asteroids', module: typeof AsteroidsGame !== 'undefined' ? AsteroidsGame : null, id: 'AsteroidsGame', image: 'images/games/asteroids.jpg' },
        { name: 'Asteroid Navigation', module: typeof AsteroidNavigatorGame !== 'undefined' ? AsteroidNavigatorGame : null, id: 'AsteroidNavigatorGame', image: 'images/games/asteroidNavigationGame.jpg' },
	{ name: 'Bit Army', module: typeof bitArmyGame !== 'undefined' ? bitArmyGame : null, id: 'bitArmyGame', image: 'images/games/bitArmy.jpg' },
        { name: 'Bit Craft', module: typeof bitCraftGame !== 'undefined' ? bitCraftGame : null, id: 'bitCraftGame', image: 'images/games/bitCraft.jpg' },
        { name: 'BitDefender Game', module: typeof bitDefenderGame !== 'undefined' ? bitDefenderGame : null, id: 'bitDefenderGame', image: 'images/games/bitDefender.jpg' },
        { name: 'Top Down Shooter', module: typeof TopDownShooterGame !== 'undefined' ? TopDownShooterGame : null, id: 'TopDownShooterGame', image: 'images/games/topdownshooter.jpg' },
        { name: 'Tower Defense', module: typeof TowerDefenseGame !== 'undefined' ? TowerDefenseGame : null, id: 'TowerDefenseGame', image: 'images/games/tower-defense.jpg' },
        { name: 'Falling Hazards', module: typeof FallingHazardsGame !== 'undefined' ? FallingHazardsGame : null, id: 'FallingHazardsGame', image: 'images/games/placeholder.jpg' },
        { name: 'Platformer', module: typeof PlatformerGame !== 'undefined' ? PlatformerGame : null, id: 'PlatformerGame', image: 'images/games/placeholder.jpg' },
        { name: 'Vector Space', module: typeof VectorArenaGame !== 'undefined' ? VectorArenaGame : null, id: 'vectorArenaGame', image: 'images/games/vector_space.png' },
        { name: 'Clicker Game', module: typeof ClickerGame !== 'undefined' ? ClickerGame : null, id: 'ClickerGame', image: 'images/games/placeholder.jpg' },
        { name: 'Reaction Game', module: typeof ReactionGame !== 'undefined' ? ReactionGame : null, id: 'ReactionGame', image: 'images/games/placeholder.jpg' }
    ],

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log("ArcadeGame: Initializing...");
        this.gameContainer = container;
        this.mainSuccessCallback = successCallback;
        this.sharedData = sharedData;
        this.renderArcadeMenu();
    },

    renderArcadeMenu: function() {
        if (this.activeSubGame && typeof this.activeSubGame.destroy === 'function') {
            console.log(`ArcadeGame: Destroying previously active sub-game: ${this.activeSubGame.id || 'N/A'} before rendering menu.`);
            this.activeSubGame.destroy();
        }
        this.activeSubGame = null;

        this.gameContainer.innerHTML = '';
        // IMPORTANT: Ensure .game-area.arcade-menu has 'position: relative;' in your CSS
        // for the new 'X' button's absolute positioning.
        this.gameContainer.className = 'game-area arcade-menu';

        // --- NEW "X" Close Button (Top-Left) ---
        const closeXButton = document.createElement('button');
        closeXButton.id = 'arcade-close-x-button';
        closeXButton.innerHTML = '&times;'; // HTML entity for '×' (multiplication sign)
        closeXButton.title = 'Close Arcade'; // Tooltip for accessibility
        closeXButton.onclick = () => {
            console.log("ArcadeGame: Exiting arcade via X button.");
            this.mainSuccessCallback({ ...this.sharedData, lastLocation: 'ArcadeCloseX' });
        };
        this.gameContainer.appendChild(closeXButton);
        // Styling for this button should be handled in CSS (see suggestions below)

        // --- Existing Menu Content ---
        const headerContainer = document.createElement('div');
        headerContainer.className = 'arcade-header';
        headerContainer.style.textAlign = 'center';
        headerContainer.style.marginBottom = '25px'; // Original style

        const title = document.createElement('h2');
        title.textContent = 'SELECT GAME';
        headerContainer.appendChild(title);

        if (this.sharedData && this.sharedData.playerName) {
            const playerNameDisplay = document.createElement('p');
            playerNameDisplay.textContent = `PLAYER: ${this.sharedData.playerName.toUpperCase()}`;
            headerContainer.appendChild(playerNameDisplay);
        }

        if (typeof this.sharedData.totalCoins !== 'undefined') {
            const coinsDisplay = document.createElement('p');
            coinsDisplay.textContent = `CREDITS: ${this.sharedData.totalCoins}`; // As seen in your screenshot
            headerContainer.appendChild(coinsDisplay);
        }
        this.gameContainer.appendChild(headerContainer);

        const gameCabinetsContainer = document.createElement('div');
        gameCabinetsContainer.className = 'arcade-cabinets-container';

        this.arcadeGamesList.forEach(gameEntry => {
            if (!gameEntry.module) {
                console.warn(`ArcadeGame: Game module for "${gameEntry.name}" (ID: ${gameEntry.id}) is undefined or not loaded. Skipping.`);
                return;
            }

            const cabinet = document.createElement('div');
            cabinet.className = 'arcade-cabinet';
            cabinet.onclick = () => this.launchArcadeGame(gameEntry.module, gameEntry.id);
            cabinet.setAttribute('role', 'button');
            cabinet.setAttribute('tabindex', '0');
            cabinet.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    this.launchArcadeGame(gameEntry.module, gameEntry.id);
                }
            });

            const gameImageEl = document.createElement('img');
            gameImageEl.src = gameEntry.image;
            gameImageEl.alt = gameEntry.name;

            const gameNameDisplay = document.createElement('div');
            gameNameDisplay.className = 'arcade-cabinet-title';
            gameNameDisplay.textContent = gameEntry.name.toUpperCase();

            cabinet.appendChild(gameImageEl);
            cabinet.appendChild(gameNameDisplay);
            gameCabinetsContainer.appendChild(cabinet);
        });
        this.gameContainer.appendChild(gameCabinetsContainer);

        // --- Existing "EXIT ARCADE" Button (Bottom) ---
        const exitButton = document.createElement('button');
        exitButton.textContent = 'EXIT ARCADE';
        exitButton.id = 'arcade-exit-button';
        exitButton.onclick = () => {
            console.log("ArcadeGame: Exiting arcade via bottom EXIT ARCADE button.");
            this.mainSuccessCallback({ ...this.sharedData, lastLocation: 'ArcadeComplete' });
        };
        
        const exitButtonContainer = document.createElement('div');
        exitButtonContainer.style.textAlign = 'center';
        exitButtonContainer.style.marginTop = '25px';
        exitButtonContainer.appendChild(exitButton);
        this.gameContainer.appendChild(exitButtonContainer);
    },

    launchArcadeGame: function(gameModule, gameId) {
        console.log(`ArcadeGame: Launching ${gameId}...`);
        if (!gameModule || typeof gameModule.init !== 'function') {
            console.error(`ArcadeGame: Game module for ${gameId} is invalid or has no init function.`);
            alert(`Error: Could not load ${gameId}.`);
            this.renderArcadeMenu();
            return;
        }
        
        this.activeSubGame = gameModule;

        this.gameContainer.innerHTML = ''; 
        // IMPORTANT: Ensure .game-area.in-sub-game has 'position: relative;' in your CSS
        // for the 'BACK TO ARCADE' button's absolute positioning.
        this.gameContainer.className = 'game-area in-sub-game'; 

        const subGameSuccessCallback = (dataFromSubGame) => {
            console.log(`ArcadeGame: Sub-game ${gameId} finished or was exited. Details:`, dataFromSubGame);
            if (this.activeSubGame && typeof this.activeSubGame.destroy === 'function') {
                this.activeSubGame.destroy();
            }
            this.activeSubGame = null;
            this.renderArcadeMenu();
        };

        const subGameFailureCallback = (dataFromSubGame) => {
            console.warn(`ArcadeGame: Sub-game ${gameId} reported failure. Reason:`, dataFromSubGame ? dataFromSubGame.reason : 'Unknown');
            if (this.activeSubGame && typeof this.activeSubGame.destroy === 'function') {
                this.activeSubGame.destroy();
            }
            this.activeSubGame = null;
            this.renderArcadeMenu();
        };

        const leaveButtonContainer = document.createElement('div');
        leaveButtonContainer.id = 'arcade-subgame-ui-overlay';
        leaveButtonContainer.style.position = 'absolute';
        leaveButtonContainer.style.top = '10px';
        leaveButtonContainer.style.left = '10px';
        leaveButtonContainer.style.zIndex = '1000';

        const leaveSubGameButton = document.createElement('button');
        leaveSubGameButton.textContent = 'BACK TO ARCADE';
        leaveSubGameButton.id = 'arcade-leave-subgame-button';
        leaveSubGameButton.onclick = () => {
            subGameSuccessCallback({ status: 'user_exit', message: `User exited ${gameId} to return to arcade menu.` });
        };
        leaveButtonContainer.appendChild(leaveSubGameButton);
        this.gameContainer.appendChild(leaveButtonContainer);

        const subGameDisplayContainer = document.createElement('div');
        subGameDisplayContainer.id = `subgame-display-${gameId}`;
        subGameDisplayContainer.style.width = '100%';
        subGameDisplayContainer.style.height = '100%';
        this.gameContainer.appendChild(subGameDisplayContainer);
        
        subGameDisplayContainer.innerHTML = `<div class="arcade-loading-screen">LOADING<br>${gameId.toUpperCase()}...</div>`;

        const subGameSharedData = { ...this.sharedData };
        try {
            this.activeSubGame.init(subGameDisplayContainer, subGameSuccessCallback, subGameFailureCallback, subGameSharedData);
        } catch (error) {
            console.error(`ArcadeGame: Error initializing ${gameId}:`, error);
            alert(`An error occurred while starting ${gameId}. Returning to arcade menu.`);
            if (this.activeSubGame && typeof this.activeSubGame.destroy === 'function') {
                try {
                    this.activeSubGame.destroy();
                } catch (destroyError) {
                    console.error(`ArcadeGame: Error destroying ${gameId} after init failure:`, destroyError);
                }
            }
            this.activeSubGame = null;
            this.renderArcadeMenu();
        }
    },

    destroy: function() {
        console.log("ArcadeGame: Destroying...");
        if (this.activeSubGame && typeof this.activeSubGame.destroy === 'function') {
            this.activeSubGame.destroy();
        }
        this.activeSubGame = null;
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
            this.gameContainer.className = 'game-area';
        }
    }
};
