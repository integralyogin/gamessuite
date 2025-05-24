const ClickerGame = {
    id: 'clicker-game',
    targetClicks: 5,
    currentClicks: 0,
    boundTargetClickHandler: null,

    init: function(gameContainer, onCompleteCallback, previousData) {
        console.log("Initializing Clicker Game. Received data:", previousData);
        this.currentClicks = 0; // Reset for subsequent plays

        gameContainer.innerHTML = `
            <div class="clicker-game-root" id="clickerRootElement">
                <p class="clicker-instructions">Click the blue circle ${this.targetClicks} times to proceed!</p>
                <div class="clicker-target" id="clickerTargetElement">Click Me!</div>
                <p class="clicker-feedback" id="clickerFeedbackElement">Clicks: 0 / ${this.targetClicks}</p>
            </div>
        `;

        const rootElement = document.getElementById('clickerRootElement');
        const targetElement = document.getElementById('clickerTargetElement');
        const feedbackElement = document.getElementById('clickerFeedbackElement');

        this.boundTargetClickHandler = () => {
            this.currentClicks++;
            feedbackElement.textContent = `Clicks: ${this.currentClicks} / ${this.targetClicks}`;
            targetElement.textContent = `Hit! (${this.currentClicks})`;

            if (this.currentClicks >= this.targetClicks) {
                console.log("Clicker Game Completed!");
                this.destroy(); // Cleanup listener
                onCompleteCallback({ clickerResult: "Done", clicksMade: this.currentClicks });
            } else {
                // Optional: Move target to a new random position within the game root
                const maxX = rootElement.clientWidth - targetElement.offsetWidth;
                const maxY = rootElement.clientHeight - targetElement.offsetHeight - 70; // Adjust for text elements

                // Ensure targetElement is positioned if it's not already (CSS might handle this)
                // targetElement.style.position = 'absolute'; // If using absolute positioning for movement

                // Example of simple movement (might need more robust positioning)
                // This simple version assumes the clicker-target is already relatively positioned or the root is flex/grid
                // For true random absolute positioning, ensure parent has position:relative.
                // For now, we'll keep it simple, centered by flex.
            }
        };

        targetElement.addEventListener('click', this.boundTargetClickHandler);
    },

    destroy: function() {
        const targetElement = document.getElementById('clickerTargetElement');
        if (targetElement && this.boundTargetClickHandler) {
            targetElement.removeEventListener('click', this.boundTargetClickHandler);
            this.boundTargetClickHandler = null;
        }
        this.currentClicks = 0; // Reset internal state
        console.log("ClickerGame resources cleaned up.");
    }
};
