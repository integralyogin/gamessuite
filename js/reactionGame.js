const ReactionGame = {
    id: 'reaction-game',
    gameState: 'initial', // initial, waiting, go, early, result
    timeoutId: null,
    startTime: null,
    boundClickHandler: null,

    init: function(gameContainer, onCompleteCallback, previousData) {
        console.log("Initializing Reaction Game. Received data:", previousData);
        this.gameState = 'initial';
        gameContainer.innerHTML = `
            <div class="reaction-game-root" id="reactionRoot">
                <p class="reaction-message" id="reactionMessage">Click to start!</p>
                <div id="reactionTimeDisplay" class="reaction-time" style="display: none;"></div>
                <p id="reactionSubtext" class="reaction-subtext" style="display: none;"></p>
            </div>
        `;

        const root = document.getElementById('reactionRoot');
        const message = document.getElementById('reactionMessage');
        const timeDisplay = document.getElementById('reactionTimeDisplay');
        const subtext = document.getElementById('reactionSubtext');

        this.boundClickHandler = () => this.handleClick(root, message, timeDisplay, subtext, onCompleteCallback);
        root.addEventListener('click', this.boundClickHandler);
    },

    handleClick: function(root, message, timeDisplay, subtext, onCompleteCallback) {
        if (this.timeoutId) clearTimeout(this.timeoutId); // Clear any pending timeouts

        switch (this.gameState) {
            case 'initial':
                this.gameState = 'waiting';
                root.className = 'reaction-game-root wait';
                message.textContent = "Wait for Green...";
                timeDisplay.style.display = 'none';
                subtext.style.display = 'none';

                const randomDelay = Math.random() * 3000 + 2000; // 2-5 seconds
                this.timeoutId = setTimeout(() => {
                    if (this.gameState === 'waiting') { // Ensure game hasn't been exited/destroyed
                        this.gameState = 'go';
                        root.className = 'reaction-game-root go';
                        message.textContent = "CLICK NOW!";
                        this.startTime = performance.now();
                    }
                }, randomDelay);
                break;

            case 'waiting': // Clicked too early
                this.gameState = 'early';
                root.className = 'reaction-game-root early';
                message.textContent = "Too early! Click to try again.";
                clearTimeout(this.timeoutId); // Important: clear the timeout for green
                this.timeoutId = setTimeout(() => { // Auto-reset after a moment
                    if (this.gameState === 'early') { // Check if still in 'early' state
                        this.gameState = 'initial';
                        root.className = 'reaction-game-root';
                        message.textContent = "Click to start!";
                    }
                }, 2000);
                break;

            case 'go': // Clicked on green
                const endTime = performance.now();
                const reactionTime = Math.round(endTime - this.startTime);
                this.gameState = 'result';
                root.className = 'reaction-game-root result';
                message.textContent = "Your Reaction Time:";
                timeDisplay.textContent = `${reactionTime} ms`;
                timeDisplay.style.display = 'block';
                subtext.textContent = "Click to continue.";
                subtext.style.display = 'block';
                
                // Remove main click listener to prevent re-triggering while showing results
                root.removeEventListener('click', this.boundClickHandler);
                // Add a new listener specifically for advancing from results
                const advanceHandler = () => {
                    root.removeEventListener('click', advanceHandler); // Clean self up
                    this.destroy();
                    onCompleteCallback({ reactionGameTime: reactionTime });
                };
                root.addEventListener('click', advanceHandler);
                this.boundClickHandler = advanceHandler; // Store for potential destroy
                break;

            case 'early': // User clicks again after "Too Early" message
            case 'result': // User clicks again after seeing results (this case is handled by advanceHandler now)
                this.gameState = 'initial';
                root.className = 'reaction-game-root';
                message.textContent = "Click to start!";
                timeDisplay.style.display = 'none';
                subtext.style.display = 'none';
                // The main click listener (this.boundClickHandler) should already be active if we reach here
                // from 'early'. If from 'result', it's replaced by advanceHandler.
                break;
        }
    },

    destroy: function() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        const root = document.getElementById('reactionRoot');
        if (root && this.boundClickHandler) {
            root.removeEventListener('click', this.boundClickHandler);
            this.boundClickHandler = null;
        }
        this.gameState = 'initial'; // Reset state
        console.log("ReactionGame resources cleaned up.");
    }
};
