// js/doorStrengthCheckGame.js
const DoorStrengthCheckGame = {
    id: 'DoorStrengthCheckGame',
    gameContainer: null,
    successCallback: null,
    globalFailureCallback: null,
    previousData: null,
    playerName: '',

    gameState: {
        strength: 0,
        attempts: 0,
        requiredStrength: 9,
        attemptsForBonus: 10,
        doorOpened: false,
        strengthGainedThisSession: false // Prevents multiple strength gains in one game load if logic were more complex
    },

    elements: {
        door: null,
        messageArea: null,
        attemptCounter: null,
        scene: null
    },

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        console.log(`${this.id}: Initializing with data:`, previousData);
        this.gameContainer = gameContainer;
        this.successCallback = successCallback;
        this.globalFailureCallback = globalFailureCallback;
        this.previousData = { ...previousData }; // Clone to modify playerStats locally if needed

        // Ensure playerStats and strength exist
        if (!this.previousData.playerStats) {
            this.previousData.playerStats = { strength: 5 }; // Default if no stats
            console.warn(`${this.id}: Player stats not found, using default strength.`);
        }
        if (typeof this.previousData.playerStats.strength === 'undefined') {
            this.previousData.playerStats.strength = 5; // Default if strength is missing
            console.warn(`${this.id}: Strength not found in player stats, using default.`);
        }
        
        this.playerName = this.previousData.playerName || 'Player';
        
        // Reset game state for this instance
        this.gameState.strength = this.previousData.playerStats.strength;
        this.gameState.attempts = 0;
        this.gameState.doorOpened = false;
        this.gameState.strengthGainedThisSession = false;

        this.setupUI();
        this.updateMessage(`A sturdy door blocks your path. Current Strength: ${this.gameState.strength}`);
    },

    setupUI: function() {
        this.gameContainer.innerHTML = ''; // Clear previous content
        this.gameContainer.style.display = 'flex';
        this.gameContainer.style.flexDirection = 'column';
        this.gameContainer.style.alignItems = 'center';
        this.gameContainer.style.justifyContent = 'center';
        this.gameContainer.style.fontFamily = 'Arial, sans-serif';
        this.gameContainer.style.backgroundColor = '#333'; // Darker background for atmosphere
        this.gameContainer.style.color = '#fff';
        this.gameContainer.style.padding = '20px';
        this.gameContainer.style.textAlign = 'center';


        this.elements.scene = document.createElement('div');
        this.elements.scene.style.width = '300px';
        this.elements.scene.style.height = '400px';
        this.elements.scene.style.backgroundColor = '#503010'; // Dark wood color
        this.elements.scene.style.border = '10px solid #201000';
        this.elements.scene.style.borderRadius = '5px 5px 0 0';
        this.elements.scene.style.display = 'flex';
        this.elements.scene.style.alignItems = 'center';
        this.elements.scene.style.justifyContent = 'center';
        this.elements.scene.style.cursor = 'pointer';
        this.elements.scene.style.boxShadow = '0 0 20px rgba(0,0,0,0.5) inset';
        this.elements.scene.setAttribute('aria-label', 'Old wooden door');
        this.elements.scene.setAttribute('role', 'button');
        this.elements.scene.tabIndex = 0; // Make it focusable

        // Door details (optional, for more visual flair)
        const doorPanel = document.createElement('div');
        doorPanel.style.width = '80%';
        doorPanel.style.height = '90%';
        doorPanel.style.backgroundColor = '#654321'; // Lighter wood panel
        doorPanel.style.border = '5px solid #402000';
        doorPanel.style.borderRadius = '3px';
        doorPanel.style.display = 'flex';
        doorPanel.style.alignItems = 'center';
        doorPanel.style.justifyContent = 'center';
        
        const doorKnob = document.createElement('div');
        doorKnob.style.width = '20px';
        doorKnob.style.height = '20px';
        doorKnob.style.backgroundColor = '#c0c0c0'; // Silver
        doorKnob.style.borderRadius = '50%';
        doorKnob.style.border = '2px solid #808080';
        doorKnob.style.position = 'relative'; // In relation to panel
        doorKnob.style.left = '-35%'; // Position knob to one side

        doorPanel.appendChild(doorKnob);
        this.elements.scene.appendChild(doorPanel);
        this.elements.door = this.elements.scene; // The whole scene div is the clickable door

        this.elements.messageArea = document.createElement('p');
        this.elements.messageArea.setAttribute('aria-live', 'polite');
        this.elements.messageArea.style.marginTop = '20px';
        this.elements.messageArea.style.minHeight = '40px'; // Prevent layout shifts
        this.elements.messageArea.style.fontSize = '1.1em';

        this.elements.attemptCounter = document.createElement('p');
        this.elements.attemptCounter.style.fontSize = '0.9em';
        this.elements.attemptCounter.style.color = '#ccc';
        this.elements.attemptCounter.textContent = 'Attempts: 0';

        this.gameContainer.appendChild(this.elements.door);
        this.gameContainer.appendChild(this.elements.messageArea);
        this.gameContainer.appendChild(this.elements.attemptCounter);

        this.elements.door.onclick = () => this.handleDoorClick();
        this.elements.door.onkeypress = (e) => { // Accessibility: allow Enter/Space to click
            if (e.key === 'Enter' || e.key === ' ') {
                this.handleDoorClick();
            }
        };
    },

    updateMessage: function(message, isSuccess = false) {
        if (this.elements.messageArea) {
            this.elements.messageArea.textContent = message;
            this.elements.messageArea.style.color = isSuccess ? '#4CAF50' : '#FFFFFF';
        }
    },

    updateAttemptCounter: function() {
        if (this.elements.attemptCounter) {
            this.elements.attemptCounter.textContent = `Attempts: ${this.gameState.attempts}`;
        }
    },

    handleDoorClick: function() {
        if (this.gameState.doorOpened) return; // Door is already open

        this.gameState.attempts++;
        this.updateAttemptCounter();
        console.log(`${this.id}: Door clicked. Strength: ${this.gameState.strength}, Attempts: ${this.gameState.attempts}`);

        if (this.gameState.strength >= this.gameState.requiredStrength) {
            this.openDoor();
        } else {
            this.updateMessage(`The door remains shut. (Needs ${this.gameState.requiredStrength} STR) You strain against it...`);
            if (this.gameState.attempts % this.gameState.attemptsForBonus === 0 && !this.gameState.strengthGainedThisSession) {
                 // Check if current strength is exactly one less than required, or if they are just below.
                 // For simplicity, the prompt implies a single +1 gain if they are at 8.
                 // Let's make it so if they are below 9, and have tried 10 times, they get +1 STR.
                 // This allows someone starting at 7 to eventually get to 9.
                if (this.previousData.playerStats.strength < this.gameState.requiredStrength) {
                    this.gainStrength();
                } else {
                     this.updateMessage(`You push with all your might, but it's not enough. (Current STR: ${this.gameState.strength})`);
                }
            }
        }
    },

    gainStrength: async function() {
        const oldStrength = this.previousData.playerStats.strength;
        this.previousData.playerStats.strength++;
        this.gameState.strength = this.previousData.playerStats.strength; // Update local game state strength
        this.gameState.strengthGainedThisSession = true; // Mark that strength was gained in this game session

        this.updateMessage(`Through sheer effort, you feel stronger! Strength increased to ${this.gameState.strength}!`, true);
        console.log(`${this.id}: Strength increased to ${this.gameState.strength}`);

        // Save this specific event (strength gain)
        const gameSpecificDataForSave = {
            event: "strengthGained",
            newStrength: this.gameState.strength,
            previousStrength: oldStrength,
            updatedPlayerStats: this.previousData.playerStats // Save the whole stats object with the update
        };

        try {
            await this.savePlayerData(gameSpecificDataForSave, "Strength Gain Event");
            // If strength is now sufficient, inform the player they can try again
            if (this.gameState.strength >= this.gameState.requiredStrength) {
                this.updateMessage(`You feel strong enough now! Try the door again. (Current STR: ${this.gameState.strength})`, true);
            }
        } catch (error) {
            console.error(`${this.id}: Failed to save strength gain:`, error);
            // Potentially revert strength gain locally or inform user of save error
            this.updateMessage("Error saving strength gain. Please try again.", false);
            this.previousData.playerStats.strength = oldStrength; // Revert if save fails
            this.gameState.strength = oldStrength;
            this.gameState.strengthGainedThisSession = false;
        }
    },

    openDoor: function() {
        this.gameState.doorOpened = true;
        this.updateMessage("With a mighty heave, the door creaks open!", true);
        console.log(`${this.id}: Door opened.`);
        if(this.elements.door) {
            this.elements.door.style.cursor = 'default';
            this.elements.door.onclick = null; // Disable further clicks
            this.elements.door.onkeypress = null;
            // Visual feedback for open door
            this.elements.door.style.backgroundColor = '#222'; // Darker, implying open
            this.elements.door.innerHTML = '<p style="color: #888; font-size: 1.5em;">OPENED</p>';
        }


        // Data for GameManager
        const dataForManager = {
            playerName: this.playerName,
            gameName: this.id,
            doorOpened: true,
            playerStats: this.previousData.playerStats // Pass the potentially updated stats
        };
        
        // Save game completion
        const gameSpecificDataForCompletion = {
            doorOpened: true,
            finalStrength: this.gameState.strength,
            attemptsMade: this.gameState.attempts
        };

        this.savePlayerData(gameSpecificDataForCompletion, "Game Completion")
            .then(() => {
                setTimeout(() => {
                    this.successCallback(dataForManager);
                }, 1500); // Delay to show message
            })
            .catch(error => {
                 console.error(`${this.id}: Failed to save game completion data:`, error);
                 // Proceed even if final save fails, as critical data (strength gain) might have been saved
                 setTimeout(() => {
                    this.successCallback(dataForManager);
                }, 1500);
            });
    },

    savePlayerData: async function(gameSpecificData, eventDescription = "Game Event") {
        const dataToSave = {
            playerName: this.playerName,
            gameName: this.id,
            timestamp: new Date().toISOString(),
            eventDescription: eventDescription, // Added for clarity in player_data.json
            gameSpecificData: gameSpecificData
        };

        console.log(`${this.id}: Attempting to save data for '${eventDescription}':`, dataToSave);

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
                throw new Error(`Server responded with ${response.status} for ${eventDescription}: ${errorText}`);
            }
            const result = await response.json();
            console.log(`${this.id}: Player data for '${eventDescription}' saved successfully:`, result);
            return result;
        } catch (error) {
            console.error(`${this.id}: Error saving player data for '${eventDescription}':`, error);
            throw error; // Re-throw to be handled by caller
        }
    },

    destroy: function() {
        console.log(`${this.id}: Destroying.`);
        if (this.elements.door) {
            this.elements.door.onclick = null;
            this.elements.door.onkeypress = null;
        }
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
            // Reset any specific styles applied to gameContainer itself if necessary
            this.gameContainer.style.backgroundColor = ''; 
            this.gameContainer.style.color = '';
        }
    }
};

