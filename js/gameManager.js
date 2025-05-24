// js/gameManager.js
const GameManager = {
    gameContainer: null,
    games: [], // This will hold the original list of game modules
    gameModules: [], // To store the initial configuration for restart
    currentGameIndex: -1,
    sharedData: {},

    init: function(containerId, gameModuleConfig) {
        this.gameContainer = document.getElementById(containerId);
        if (!this.gameContainer) {
            console.error(`Game container with ID '${containerId}' not found!`);
            this.gameContainer = document.createElement('div');
            document.body.appendChild(this.gameContainer);
        }
        this.gameModules = gameModuleConfig; // Store the original configuration
        this.games = [...this.gameModules]; // Make a mutable copy for current playthrough
        this.currentGameIndex = -1;
        this.sharedData = {};
    },

    startGame: function() {
        console.log("Starting game sequence from scratch...");
        this.sharedData = {}; // Clear shared data for a fresh start
        this.games = [...this.gameModules]; // Reset to the full list of games
        this.currentGameIndex = -1;   // Reset game progress

        if (this.games && this.games.length > 0) {
            this.loadGame(0); // Load the first game
        } else {
            this.gameContainer.innerHTML = "<p>No games configured to start.</p>";
            console.warn("No games available in GameManager to start.");
        }
    },

    loadGame: function(gameIndexToLoad) {
        if (this.currentGameIndex !== -1 && this.games[this.currentGameIndex]) {
            const oldGameModule = this.games[this.currentGameIndex];
            if (typeof oldGameModule.destroy === 'function') {
                console.log(`Destroying game: ${oldGameModule.id || this.currentGameIndex}`);
                oldGameModule.destroy();
            }
        }

        if (gameIndexToLoad >= this.games.length) {
            this.gameContainer.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <h2>🎉 Congratulations! 🎉</h2>
                    <p>You've completed all mini-games!</p>
                    <p>Final shared data: ${JSON.stringify(this.sharedData)}</p>
                    <button id="restartButton" style="padding: 10px 15px; font-size: 1em;">Play Again?</button>
                </div>`;
            document.getElementById('restartButton').onclick = () => {
                this.startGame(); // Restart the whole sequence
            };
            this.currentGameIndex = -1;
            console.log("All games completed.");
            return;
        }

        this.currentGameIndex = gameIndexToLoad;
        const gameModule = this.games[this.currentGameIndex];
        console.log(`Loading game: ${gameModule.id || this.currentGameIndex}`);

        this.gameContainer.innerHTML = '';
        this.gameContainer.className = 'game-area';

        const successCallback = (dataFromGame) => {
            this.sharedData = { ...this.sharedData, ...dataFromGame };
            console.log(`Game '${gameModule.id || 'Unknown'}' completed successfully. Data:`, dataFromGame);
            this.loadNextGame();
        };

        const globalFailureCallback = (dataFromFailure) => {
            console.warn(`GLOBAL GAME OVER triggered by ${gameModule.id || 'a game'}. Reason: ${dataFromFailure.reason || 'unspecified'}`);
            this.sharedData = {}; // Clear shared data on global failure.

            this.gameContainer.innerHTML = `
                <div class="game-over-screen" style="padding: 30px; text-align: center; width: 100%; color: #D32F2F; background-color: #FFEBEE; border: 2px solid #D32F2F; box-sizing: border-box;">
                    <h2>GAME OVER</h2>
                    <p style="font-size: 1.2em; margin-bottom: 20px;">${dataFromFailure.reason || 'A critical failure occurred.'}</p>
                    <p>You have to start from the very beginning!</p>
                    <button id="restartGameSequenceButton" style="padding: 12px 25px; font-size: 1.1em; cursor: pointer; background-color: #C62828; color: white; border: none; border-radius: 5px; margin-top: 20px;">Try Again</button>
                </div>`;
            
            document.getElementById('restartGameSequenceButton').onclick = () => {
                this.startGame(); // This will call loadGame(0) and reset everything.
            };
        };

        gameModule.init(
            this.gameContainer,
            successCallback,
            globalFailureCallback, // New callback for permadeath
            this.sharedData
        );
    },

    loadNextGame: function() {
        const nextIndex = this.currentGameIndex + 1;
        this.loadGame(nextIndex);
    }
};
