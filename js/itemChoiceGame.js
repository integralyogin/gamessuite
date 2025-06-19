// js/itemChoiceGame.js
const ItemChoiceGame = {
    id: 'ItemChoiceGame',
    gameContainer: null,
    successCallback: null,
    globalFailureCallback: null,
    previousData: null,
    playerName: '',

    player: {
        x: 50,
        y: 250, // Start player near the bottom-middle
        size: 30,
        speed: 10,
        element: null
    },
    items: [
        { name: 'Sword', x: 100, y: 100, size: 40, element: null, color: 'gray', emoji: '⚔️' },
        { name: 'Bow', x: 350, y: 100, size: 40, element: null, color: 'brown', emoji: '🏹' },
        { name: 'Spellbook', x: 600, y: 100, size: 40, element: null, color: 'purple', emoji: '📜' }
    ],
    gameAreaWidth: 750,
    gameAreaHeight: 350,
    selectedItem: null,
    keyListener: null,

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        console.log(`${this.id}: Initializing with data:`, previousData);
        this.gameContainer = gameContainer;
        this.successCallback = successCallback;
        this.globalFailureCallback = globalFailureCallback;
        this.previousData = previousData;
        this.playerName = previousData.playerName || 'Player';
        this.selectedItem = null; // Reset selection

        // Reset player position for new game start
        this.player.x = this.gameAreaWidth / 2 - this.player.size / 2;
        this.player.y = this.gameAreaHeight - this.player.size - 50;


        this.setupUI();
        this.render();
        this.attachEventListeners();
    },

    setupUI: function() {
        this.gameContainer.innerHTML = ''; // Clear previous content
        this.gameContainer.style.position = 'relative';
        this.gameContainer.style.width = `${this.gameAreaWidth}px`;
        this.gameContainer.style.height = `${this.gameAreaHeight}px`;
        this.gameContainer.style.border = '2px solid #555';
        this.gameContainer.style.backgroundColor = '#f0f0f0';
        this.gameContainer.style.overflow = 'hidden'; // Prevent player from going outside visually

        const instructions = document.createElement('p');
        instructions.textContent = 'Use arrow keys to move. Walk to an item to choose it.';
        instructions.style.textAlign = 'center';
        instructions.style.position = 'absolute';
        instructions.style.top = '10px';
        instructions.style.width = '100%';
        instructions.style.color = '#333';
        instructions.style.fontSize = '16px';
        this.gameContainer.appendChild(instructions);

        // Create player element
        this.player.element = document.createElement('div');
        this.player.element.style.position = 'absolute';
        this.player.element.style.width = `${this.player.size}px`;
        this.player.element.style.height = `${this.player.size}px`;
        this.player.element.style.backgroundColor = 'blue';
        this.player.element.style.borderRadius = '5px';
        this.player.element.textContent = 'P';
        this.player.element.style.display = 'flex';
        this.player.element.style.alignItems = 'center';
        this.player.element.style.justifyContent = 'center';
        this.player.element.style.color = 'white';
        this.player.element.style.fontSize = '20px';
        this.gameContainer.appendChild(this.player.element);

        // Create item elements
        this.items.forEach(item => {
            item.element = document.createElement('div');
            item.element.style.position = 'absolute';
            item.element.style.width = `${item.size}px`;
            item.element.style.height = `${item.size}px`;
            item.element.style.backgroundColor = item.color;
            item.element.style.border = '2px solid #333';
            item.element.style.borderRadius = '5px';
            item.element.style.display = 'flex';
            item.element.style.flexDirection = 'column';
            item.element.style.alignItems = 'center';
            item.element.style.justifyContent = 'center';
            item.element.style.textAlign = 'center';
            item.element.style.cursor = 'pointer'; // Indicate they are selectable

            const itemEmoji = document.createElement('span');
            itemEmoji.textContent = item.emoji;
            itemEmoji.style.fontSize = `${item.size * 0.5}px`; // Adjust emoji size

            const itemName = document.createElement('span');
            itemName.textContent = item.name;
            itemName.style.fontSize = `${item.size * 0.25}px`; // Adjust text size
            itemName.style.color = 'white';
            itemName.style.marginTop = '2px';
            
            item.element.appendChild(itemEmoji);
            item.element.appendChild(itemName);

            this.gameContainer.appendChild(item.element);
        });
    },

    render: function() {
        if (!this.player.element) return; // Guard if UI not ready

        // Update player position
        this.player.element.style.left = `${this.player.x}px`;
        this.player.element.style.top = `${this.player.y}px`;

        // Update item positions (usually static, but good practice if they could move)
        this.items.forEach(item => {
            if (!item.element) return;
            item.element.style.left = `${item.x}px`;
            item.element.style.top = `${item.y}px`;
        });
    },

    attachEventListeners: function() {
        this.keyListener = (event) => this.handleKeyPress(event);
        document.addEventListener('keydown', this.keyListener);
    },

    detachEventListeners: function() {
        if (this.keyListener) {
            document.removeEventListener('keydown', this.keyListener);
            this.keyListener = null;
        }
    },

    handleKeyPress: function(event) {
        if (this.selectedItem) return; // Game ended, no more moves

        let moved = false;
        switch(event.key) {
            case 'ArrowUp':
                this.player.y -= this.player.speed;
                moved = true;
                break;
            case 'ArrowDown':
                this.player.y += this.player.speed;
                moved = true;
                break;
            case 'ArrowLeft':
                this.player.x -= this.player.speed;
                moved = true;
                break;
            case 'ArrowRight':
                this.player.x += this.player.speed;
                moved = true;
                break;
        }

        if (moved) {
            event.preventDefault(); // Prevent page scrolling
            this.constrainPlayer();
            this.render();
            this.checkCollision();
        }
    },

    constrainPlayer: function() {
        // Keep player within game area boundaries
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.y < 0) this.player.y = 0; // Allow reaching top items
        if (this.player.x + this.player.size > this.gameAreaWidth) {
            this.player.x = this.gameAreaWidth - this.player.size;
        }
        if (this.player.y + this.player.size > this.gameAreaHeight) {
            this.player.y = this.gameAreaHeight - this.player.size;
        }
    },

    checkCollision: function() {
        if (this.selectedItem) return; // Already selected

        this.items.forEach(item => {
            // Simple AABB collision detection
            if (this.player.x < item.x + item.size &&
                this.player.x + this.player.size > item.x &&
                this.player.y < item.y + item.size &&
                this.player.y + this.player.size > item.y) {
                this.selectItem(item);
            }
        });
    },

    selectItem: function(item) {
        if (this.selectedItem) return; // Prevent multiple selections

        this.selectedItem = item;
        console.log(`${this.id}: Player selected ${item.name}`);
        this.detachEventListeners(); // Stop player movement

        // Highlight selected item (optional)
        if (item.element) {
            item.element.style.border = '3px solid gold';
            item.element.style.boxShadow = '0 0 15px gold';
        }
        
        // Display a confirmation message
        const confirmationMessage = document.createElement('div');
        confirmationMessage.textContent = `You picked the ${item.name}!`;
        confirmationMessage.style.position = 'absolute';
        confirmationMessage.style.top = '50%';
        confirmationMessage.style.left = '50%';
        confirmationMessage.style.transform = 'translate(-50%, -50%)';
        confirmationMessage.style.padding = '20px';
        confirmationMessage.style.backgroundColor = 'rgba(0,0,0,0.75)';
        confirmationMessage.style.color = 'white';
        confirmationMessage.style.fontSize = '24px';
        confirmationMessage.style.borderRadius = '10px';
        confirmationMessage.style.zIndex = '100'; // Ensure it's on top
        this.gameContainer.appendChild(confirmationMessage);

        // Data to be saved for this game completion
        const gameSpecificData = { chosenItem: item.name };
        this.savePlayerData(gameSpecificData)
            .then(saveResponse => {
                console.log(`${this.id}: Player data saved response:`, saveResponse);
                // Proceed to next game after a short delay for player to see message
                setTimeout(() => {
                    // Data to be passed to GameManager
                    const dataForManager = {
                        playerName: this.playerName,
                        gameName: this.id,
                        chosenItem: item.name // This specific data will be merged into sharedData by GameManager
                    };
                    this.successCallback(dataForManager);
                }, 2000); // 2 second delay
            })
            .catch(error => {
                console.error(`${this.id}: Failed to save player data:`, error);
                // Even if saving fails, we might want to proceed, or call globalFailureCallback
                // For now, let's proceed but log the error.
                // Consider if this should be a globalFailure.
                setTimeout(() => {
                     const dataForManager = {
                        playerName: this.playerName,
                        gameName: this.id,
                        chosenItem: item.name
                    };
                    this.successCallback(dataForManager); // Proceed anyway for now
                }, 2000);
            });
    },

    savePlayerData: async function(gameSpecificData) {
        const dataToSave = {
            playerName: this.playerName,
            gameName: this.id,
            timestamp: new Date().toISOString(),
            gameSpecificData: gameSpecificData
        };

        console.log(`${this.id}: Attempting to save data:`, dataToSave);

        try {
            const response = await fetch('save-player.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSave),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`${this.id}: Error saving player data:`, error);
            // Optionally, inform the player via UI, or trigger globalFailureCallback
            // For now, we just throw the error to be caught by selectItem
            throw error; 
        }
    },

    destroy: function() {
        console.log(`${this.id}: Destroying.`);
        this.detachEventListeners();
        if (this.gameContainer) {
            this.gameContainer.innerHTML = ''; // Clear all game elements
            // Reset styles that might have been set directly
            this.gameContainer.style.position = '';
            this.gameContainer.style.width = '';
            this.gameContainer.style.height = '';
            this.gameContainer.style.border = '';
            this.gameContainer.style.backgroundColor = '';
            this.gameContainer.style.overflow = '';
        }
        this.player.element = null;
        this.items.forEach(item => item.element = null);
        this.selectedItem = null;
    }
};

