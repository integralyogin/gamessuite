const MemoryGame = {
    id: 'memory-game',
    symbols: ['A', 'B', 'A', 'B'], // Simple 2 pairs for a 2x2 grid
    shuffledSymbols: [],
    selectedCards: [],
    matchedPairs: 0,
    totalPairs: 2,
    timeoutId: null,
    cardClickHandlers: [], // To store handlers for easy removal

    init: function(gameContainer, onCompleteCallback, previousData) {
        console.log("Initializing Memory Game. Received data:", previousData);
        this.matchedPairs = 0;
        this.selectedCards = [];
        this.cardClickHandlers = [];
        this.shuffledSymbols = [...this.symbols].sort(() => 0.5 - Math.random()); // Shuffle symbols

        gameContainer.innerHTML = `
            <div class="memory-game-root">
                <h2 class="memory-title">Memory Match!</h2>
                <div class="memory-grid" id="memoryGrid">
                    </div>
                <p id="memoryFeedback" style="margin-top: 15px; min-height: 20px;"></p>
            </div>
        `;

        const grid = document.getElementById('memoryGrid');
        const feedback = document.getElementById('memoryFeedback');

        this.shuffledSymbols.forEach((symbol, index) => {
            const card = document.createElement('div');
            card.classList.add('memory-card', 'hidden'); // Start hidden
            card.dataset.index = index;
            card.dataset.symbol = symbol;

            const cardContent = document.createElement('span');
            cardContent.classList.add('card-content');
            cardContent.textContent = symbol; // Content to show when flipped
            card.appendChild(cardContent);

            const handler = () => this.handleCardClick(card, feedback, onCompleteCallback);
            this.cardClickHandlers.push({ element: card, handler: handler });
            card.addEventListener('click', handler);
            grid.appendChild(card);
        });
    },

    handleCardClick: function(card, feedback, onCompleteCallback) {
        if (this.selectedCards.length >= 2 || card.classList.contains('flipped') || card.classList.contains('matched')) {
            return; // Ignore click if 2 cards already selected, or card is already flipped/matched
        }

        card.classList.remove('hidden');
        card.classList.add('flipped');
        this.selectedCards.push(card);

        if (this.selectedCards.length === 2) {
            feedback.textContent = "Checking...";
            // Disable further clicks temporarily
            const [card1, card2] = this.selectedCards;

            if (card1.dataset.symbol === card2.dataset.symbol) {
                // Match found
                feedback.textContent = "Match found!";
                card1.classList.add('matched');
                card2.classList.add('matched');
                card1.classList.remove('flipped'); // Keep them visually distinct from temporarily flipped
                card2.classList.remove('flipped');
                
                // Make matched cards unclickable or visually distinct
                this.cardClickHandlers.forEach(item => {
                    if (item.element === card1 || item.element === card2) {
                        item.element.removeEventListener('click', item.handler);
                    }
                });

                this.matchedPairs++;
                this.selectedCards = [];

                if (this.matchedPairs === this.totalPairs) {
                    feedback.textContent = "All pairs found! Well done!";
                    if (this.timeoutId) clearTimeout(this.timeoutId);
                    this.timeoutId = setTimeout(() => {
                        this.destroy();
                        onCompleteCallback({ memoryGameResult: "All pairs matched", score: this.totalPairs * 10 });
                    }, 1500);
                }
            } else {
                // No match
                feedback.textContent = "No match. Try again.";
                if (this.timeoutId) clearTimeout(this.timeoutId);
                this.timeoutId = setTimeout(() => {
                    card1.classList.remove('flipped');
                    card2.classList.remove('flipped');
                    card1.classList.add('hidden');
                    card2.classList.add('hidden');
                    this.selectedCards = [];
                    feedback.textContent = "";
                }, 1000);
            }
        } else {
            feedback.textContent = "Select another card.";
        }
    },

    destroy: function() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.cardClickHandlers.forEach(item => {
            item.element.removeEventListener('click', item.handler);
        });
        this.cardClickHandlers = [];
        this.selectedCards = [];
        this.matchedPairs = 0;
        console.log("MemoryGame resources cleaned up.");
    }
};
