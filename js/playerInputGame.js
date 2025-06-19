// js/playerInputGame.js
const PlayerInputGame = {
    id: 'PlayerInputGame',
    gameContainer: null,
    onSuccess: null,
    onFailure: null, // Global failure callback
    playerNameInput: null,
    submitButton: null,
    messageDiv: null,
    sharedData: {}, // To hold shared data passed from GameManager

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        this.gameContainer = gameContainer;
        this.onSuccess = successCallback;
        this.onFailure = globalFailureCallback; 
        this.sharedData = previousData || {}; // Store previousData as sharedData

        console.log("PlayerInputGame: Initializing with data", this.sharedData);
        this.gameContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; box-sizing: border-box; text-align: center; background-color: #f0f7fa; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="margin-bottom: 20px; color: #2c5282; font-size: 1.8em;">Welcome, Future Hero!</h2>
                <p style="margin-bottom: 15px; color: #4a5568; font-size: 1.1em;">Please enter your chosen name to begin your legend.</p>
                <input type="text" id="playerName" placeholder="Your Heroic Name" style="padding: 12px; margin-bottom: 25px; width: 85%; max-width: 350px; border: 2px solid #a0aec0; border-radius: 6px; font-size: 1.1em; text-align: center;">
                <button id="submitPlayerName" style="padding: 12px 30px; font-size: 1.1em; color: white; background-color: #3182ce; border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.3s ease;">Embark on Adventure!</button>
                <div id="playerInputMessage" style="margin-top: 20px; font-weight: bold; min-height: 1.5em;"></div>
            </div>
        `;

        this.playerNameInput = document.getElementById('playerName');
        this.submitButton = document.getElementById('submitPlayerName');
        this.messageDiv = document.getElementById('playerInputMessage');

        if (this.playerNameInput) {
            this.playerNameInput.focus();
            if (this.sharedData.playerName) {
                this.playerNameInput.value = this.sharedData.playerName;
            }
        }

        this.submitButton.addEventListener('click', this.handlePlayerNameSubmit.bind(this));
        this.playerNameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.handlePlayerNameSubmit();
            }
        });

        console.log(`${this.id} initialized.`);
    },

    handlePlayerNameSubmit: function() {
        const playerName = this.playerNameInput.value.trim();
        this.messageDiv.textContent = ''; 

        if (!playerName) {
            this.messageDiv.textContent = 'A hero needs a name!';
            this.messageDiv.style.color = '#e53e3e'; 
            this.playerNameInput.focus(); 
            return;
        }

        console.log(`PlayerInputGame: Player name submitted: ${playerName}`);
        this.submitButton.disabled = true; 
        this.submitButton.textContent = 'Saving...';

        const startingGold = 1000;
        const newTotalCoins = startingGold; 

        // Data to be sent to the PHP script
        // Nesting totalCoins within gameSpecificData
        const playerDataToSend = {
            playerName: playerName,
            gameName: this.id, // PHP script might save this as 'game'
            timestamp: new Date().toISOString(), // PHP script might save this as 'time'
            gameSpecificData: {
                totalCoins: newTotalCoins // <<<< GOLD NESTED HERE
                // Add other game-specific initial data here if needed
            }
        };

        console.log("PlayerInputGame: Sending to save-player.php:", playerDataToSend);

        fetch('save-player.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(playerDataToSend)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { 
                    let errorDetail = `HTTP error! status: ${response.status}`;
                    try {
                        const errJson = JSON.parse(text); 
                        errorDetail += ` - ${errJson.message || text}`;
                    } catch (e) {
                        errorDetail += ` - Server response: ${text.substring(0,100)}`; 
                    }
                    throw new Error(errorDetail);
                });
            }
            return response.json(); 
        })
        .then(dataFromServer => { 
            console.log('PlayerInputGame: Success response from server:', dataFromServer);
            if (dataFromServer.success) {
                this.messageDiv.textContent = dataFromServer.message || 'Player data saved successfully!';
                this.messageDiv.style.color = 'green';
                
                // Data to pass to GameManager
                const successDataForGameManager = {
                    playerName: playerName,
                    totalCoins: newTotalCoins, // For client-side sharedData convenience
                    playerDataFile: dataFromServer.dataFile || "player_data.json", 
                    playerRoster: this.sharedData.playerRoster || [],
                    // Also include gameSpecificData in sharedData for consistency with saved structure
                    gameSpecificData: {
                        ...(this.sharedData.gameSpecificData || {}), // Preserve existing gameSpecificData
                        totalCoins: newTotalCoins
                    }
                };
                
                console.log("PlayerInputGame: Passing to GameManager onSuccess:", successDataForGameManager);
                if (this.onSuccess) {
                    this.onSuccess(successDataForGameManager);
                }
            } else {
                throw new Error(dataFromServer.message || 'Failed to save player data (server logic).');
            }
        })
        .catch(error => {
            console.error('PlayerInputGame: Error saving player data:', error);
            this.messageDiv.textContent = `Error: ${error.message || 'Could not save player data.'}`;
            this.messageDiv.style.color = '#e53e3e'; 
            this.submitButton.disabled = false; 
            this.submitButton.textContent = 'Start Game';
        });
    },

    destroy: function() {
        console.log(`${this.id} destroyed.`);
        if (this.gameContainer) {
            this.gameContainer.innerHTML = ''; 
        }
        this.playerNameInput = null;
        this.submitButton = null;
        this.messageDiv = null;
        this.gameContainer = null;
        this.onSuccess = null;
        this.onFailure = null;
        this.sharedData = {}; 
    }
};

