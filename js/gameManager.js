const GameManager = {
    gameContainer: null,
    games: [], // Full list of game modules for the current playthrough
    gameModules: [], // Initial configuration of game modules
    
    gameModulesMap: new Map(), // For quick lookup of game modules by ID

    currentGameIndex: -1,
    sharedData: {}, // Data shared between games

    init: function(containerId, gameModuleConfig) {
        this.gameContainer = document.getElementById(containerId);
        if (!this.gameContainer) {
            console.error(`Game container with ID '${containerId}' not found! Creating a fallback.`);
            this.gameContainer = document.createElement('div');
            document.body.appendChild(this.gameContainer);
        }
        
        // Ensure gameModuleConfig is an array
        this.gameModules = Array.isArray(gameModuleConfig) ? gameModuleConfig : []; 
        
        this.gameModulesMap.clear(); 
        this.gameModules.forEach(module => {
            if (module && typeof module.id !== 'undefined') { 
                this.gameModulesMap.set(module.id, module);
            } else {
                let moduleIdentifier = 'Unknown Module';
                if (module && module.constructor && module.constructor.name && module.constructor.name !== 'Object') {
                    moduleIdentifier = module.constructor.name;
                } else if (module && typeof module === 'object' && module !== null) {
                    moduleIdentifier = JSON.stringify(module).substring(0, 50) + "...";
                } else if (typeof module !== 'undefined') {
                    moduleIdentifier = String(module);
                }
                console.warn(`GameManager.init: A game module is undefined, null, or missing an 'id' property and cannot be mapped. Module details: ${moduleIdentifier}`, module);
            }
        });
        
        this.games = [...this.gameModules.filter(m => m && typeof m.id !== 'undefined')]; 
        this.currentGameIndex = -1;
        this.sharedData = {}; 
        
        console.log("GameManager: Initialized. Game modules map created with IDs:", Array.from(this.gameModulesMap.keys()));
        if (this.games.length !== this.gameModules.length) {
            console.warn("GameManager: Some modules were filtered from the active game sequence due to being undefined or missing an ID. Original count:", this.gameModules.length, "Active count:", this.games.length);
        }
        console.log("GameManager: Active game sequence (IDs):", this.games.map(g => g.id));
    },

    startGame: function() {
        console.log("GameManager: Starting game sequence from scratch...");
        this.sharedData = { returnStack: [] }; // Initialize with an empty return stack
        this.games = [...this.gameModules.filter(m => m && typeof m.id !== 'undefined')]; // Reset games list, filtering invalid
        this.currentGameIndex = -1;
        
        if (this.games && this.games.length > 0) {
            this.loadGame(0); 
        } else {
            this.gameContainer.innerHTML = "<p>No games configured to start. Check GameManager.init array and module definitions.</p>";
            console.warn("GameManager: No valid games available to start. The 'this.games' array is empty after filtering.");
        }
    },

    loadGame: function(gameIndexToLoad) {
        if (this.currentGameIndex !== -1 && this.games[this.currentGameIndex] && typeof this.games[this.currentGameIndex].destroy === 'function') {
            console.log(`GameManager: Destroying game: ${this.games[this.currentGameIndex].id || `index ${this.currentGameIndex}`}`);
            this.games[this.currentGameIndex].destroy();
        }

        if (gameIndexToLoad >= this.games.length || gameIndexToLoad < 0) {
            this.showCompletionScreen("Main game sequence appears to be complete.");
            return;
        }
        
        const gameModuleToLoad = this.games[gameIndexToLoad];
        if (!gameModuleToLoad) { 
            console.error(`GameManager: No valid game module found for index ${gameIndexToLoad}.`);
            this.showCompletionScreen("Error: Game module not found.");
            return;
        }

        this.currentGameIndex = gameIndexToLoad;
        const currentModule = gameModuleToLoad;

        console.log(`GameManager: Loading game: ${currentModule.id} (index ${this.currentGameIndex}). SharedData snapshot:`, JSON.parse(JSON.stringify(this.sharedData)));

        this.gameContainer.innerHTML = ''; 
        this.gameContainer.className = 'game-area'; 

        const successCallback = (dataFromGame) => {
            console.log(`GameManager: Game '${currentModule.id}' reported success. Data received:`, dataFromGame);
            
            // --- NAVIGATION LOGIC REBUILT ---
            // 1. Update shared data with results from the game that just finished.
            this.sharedData = { ...this.sharedData, ...dataFromGame };
            
            let nextGameIdToLoad = null;

            // 2. Determine the next destination.
            if (dataFromGame.nextGame) {
                // If the game explicitly tells us where to go next.
                nextGameIdToLoad = dataFromGame.nextGame;
                
                // If it also specifies a 'returnTo' location, push the current return target onto the stack.
                if (dataFromGame.returnTo) {
                    if (!this.sharedData.returnStack) this.sharedData.returnStack = [];
                    this.sharedData.returnStack.push(this.sharedData.returnToId); // Save where we were supposed to go
                    this.sharedData.returnToId = dataFromGame.returnTo; // Set the new return target
                }
            } else if (this.sharedData.returnToId) {
                // If there's no explicit next game, check if we need to return from a sub-task.
                nextGameIdToLoad = this.sharedData.returnToId;
                
                // We've completed the return journey, so clear the target and pop from the stack if available.
                this.sharedData.returnToId = this.sharedData.returnStack?.pop();
            }

            // 3. Load the next game.
            if (nextGameIdToLoad) {
                const nextGameActualIndex = this.games.findIndex(g => g && g.id === nextGameIdToLoad);
                if (nextGameActualIndex !== -1) {
                    this.loadGame(nextGameActualIndex);
                } else {
                    console.error(`GameManager: Game ID ${nextGameIdToLoad} is not in the active sequence. Fallback to sequential.`);
                    this.loadNextSequentialGame(); 
                }
            } else {
                // If no navigation logic applies, continue the main sequence.
                this.loadNextSequentialGame(); 
            }
        };

        const globalFailureCallback = (dataFromFailure) => {
            console.warn(`GameManager: GLOBAL GAME OVER triggered by ${currentModule.id || 'a game'}. Reason: ${dataFromFailure.reason || 'unspecified'}`);
            this.sharedData = {}; 
            this.gameContainer.innerHTML = `<div class="game-over-screen"><h2>GAME OVER</h2><p>${dataFromFailure.reason || 'A critical failure occurred.'}</p><button id="restartGameSequenceButtonGM2">Try Again</button></div>`;
            const restartBtn = this.gameContainer.querySelector('#restartGameSequenceButtonGM2');
            if(restartBtn) restartBtn.onclick = () => this.startGame();
        };

        if (typeof currentModule.init === 'function') {
            currentModule.init(this.gameContainer, successCallback, globalFailureCallback, { ...this.sharedData });
        } else {
            console.error(`GameManager: Game module ${currentModule.id} does not have an init function! Skipping.`);
            this.loadNextSequentialGame();
        }
    },

    loadNextSequentialGame: function() {
        const nextSequentialIndex = this.currentGameIndex + 1;
        if (nextSequentialIndex < this.games.length) {
            this.loadGame(nextSequentialIndex);
        } else {
            this.showCompletionScreen("You've completed the main sequence of games!");
        }
    },
    
    getModuleById: function(id) {
        return this.gameModulesMap.get(id);
    },

    showCompletionScreen: function(message = "You've completed all mini-games!") {
        this.gameContainer.innerHTML = `<div class="completion-screen"><h2>🎉 Congratulations! 🎉</h2><p>${message}</p><button id="restartButtonGM2">Play Again?</button></div>`;
        const restartBtn = this.gameContainer.querySelector('#restartButtonGM2');
        if(restartBtn) restartBtn.onclick = () => this.startGame();
        this.currentGameIndex = -1; 
        console.log("GameManager: Game sequence ended or all games completed.");
    }
};

