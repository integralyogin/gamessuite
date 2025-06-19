// js/characterStatsGame.js
const CharacterStatsGame = {
    id: 'CharacterStatsGame',
    gameContainer: null,
    onSuccess: null,
    onFailure: null,
    playerName: null,
    availableCoins: 0,
    initialCoinsForSession: 0, // Coins at the start of this specific game session

    // AD&D style stats
    stats: {
        strength: 8,
        dexterity: 8,
        constitution: 8,
        intelligence: 8,
        wisdom: 8,
        charisma: 8
    },
    // Store the initial stats for this session to calculate costs correctly
    // and prevent decreasing below what they started with in this screen.
    initialStatsForSession: {},
    statBaseValue: 8,
    statMaxValue: 18,
    costPerStatPoint: 1,

    uiElements: {}, // To store references to DOM elements like buttons and value displays
    messageDiv: null,

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        this.gameContainer = gameContainer;
        this.onSuccess = successCallback;
        this.onFailure = globalFailureCallback;

        console.log(`${this.id}: Initializing. Received data:`, previousData);

        if (!previousData || typeof previousData.playerName === 'undefined') {
            this.showError("Player name not found. Please start from the beginning.");
            return;
        }
        this.playerName = previousData.playerName;
        this.availableCoins = previousData.totalCoins || 0;
        this.initialCoinsForSession = this.availableCoins; // Track coins at the start of this game

        // Initialize stats. If stats were passed from a previous CharacterStatsGame session for this player,
        // we might load them. For now, we always start with base or allow point buy from base.
        // We'll reset to base stats each time this game is entered, and player rebuilds.
        // A more persistent model would require loading the player's last saved stats for THIS game.
        this.stats = {
            strength: this.statBaseValue,
            dexterity: this.statBaseValue,
            constitution: this.statBaseValue,
            intelligence: this.statBaseValue,
            wisdom: this.statBaseValue,
            charisma: this.statBaseValue
        };
        // Store a copy of the initial stats for this screen session
        this.initialStatsForSession = { ...this.stats };


        this.renderStatsScreen();
    },

    renderStatsScreen: function() {
        let statsHTML = '';
        const statKeys = Object.keys(this.stats); // STR, DEX, etc.

        statKeys.forEach(key => {
            const statName = key.charAt(0).toUpperCase() + key.slice(1); // Capitalize
            statsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 8px; background-color: #f9f9f9; border-radius: 4px;">
                    <label for="${key}Stat" style="font-weight: bold; color: #333;">${statName}:</label>
                    <div style="display: flex; align-items: center;">
                        <button class="stat-button" data-stat="${key}" data-change="-1" style="margin-right: 5px; padding: 5px 8px; background-color: #ffcdd2; border: 1px solid #e57373; border-radius: 3px; cursor: pointer;">-</button>
                        <span id="${key}Value" style="min-width: 25px; text-align: center; font-size: 1.1em;">${this.stats[key]}</span>
                        <button class="stat-button" data-stat="${key}" data-change="1" style="margin-left: 5px; padding: 5px 8px; background-color: #c8e6c9; border: 1px solid #81c784; border-radius: 3px; cursor: pointer;">+</button>
                    </div>
                </div>
            `;
        });

        this.gameContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; height: 100%; padding: 20px; box-sizing: border-box; text-align: center; background-color: #e3f2fd; border-radius: 8px;">
                <h2 style="margin-bottom: 10px; color: #0d47a1;">Character Stats for ${this.playerName}</h2>
                <p style="margin-bottom: 5px; color: #1565c0;">Base for each stat is ${this.statBaseValue}. Max is ${this.statMaxValue}.</p>
                <p style="margin-bottom: 15px; color: #1565c0;">Cost: ${this.costPerStatPoint} coin per point increase.</p>

                <div style="width: 90%; max-width: 400px; margin-bottom: 15px; background-color: #fff; padding: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 1.2em; margin-bottom: 10px;">Available Coins: <span id="availableCoinsDisplay" style="font-weight: bold;">${this.availableCoins}</span></div>
                    ${statsHTML}
                    <div style="font-size: 1.1em; margin-top: 15px;">Total Cost: <span id="totalCostDisplay" style="font-weight: bold;">0</span> coins</div>
                </div>

                <button id="saveStatsButton" style="padding: 12px 25px; font-size: 1.1em; color: white; background-color: #1976d2; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Confirm and Continue</button>
                <div id="statsMessage" style="margin-top: 15px; color: #d32f2f; min-height: 20px; font-weight: bold;"></div>
            </div>
        `;

        this.messageDiv = document.getElementById('statsMessage');
        this.uiElements.availableCoinsDisplay = document.getElementById('availableCoinsDisplay');
        this.uiElements.totalCostDisplay = document.getElementById('totalCostDisplay');

        statKeys.forEach(key => {
            this.uiElements[`${key}Value`] = document.getElementById(`${key}Value`);
        });

        document.querySelectorAll('.stat-button').forEach(button => {
            button.addEventListener('click', this.handleStatChange.bind(this));
        });
        document.getElementById('saveStatsButton').addEventListener('click', this.handleSaveAndContinue.bind(this));
        
        this.updateUIDisplays(); // Initial UI update
        console.log(`${this.id} for ${this.playerName} rendered.`);
    },

    handleStatChange: function(event) {
        const statKey = event.target.dataset.stat;
        const change = parseInt(event.target.dataset.change, 10);
        const currentStatValue = this.stats[statKey];
        let newStatValue = currentStatValue + change;

        // Prevent going below the initial stat value for this session or base, or above max
        if (newStatValue < this.initialStatsForSession[statKey]) newStatValue = this.initialStatsForSession[statKey];
        if (newStatValue < this.statBaseValue) newStatValue = this.statBaseValue; // Should be covered by initialStatsForSession if base is used
        if (newStatValue > this.statMaxValue) newStatValue = this.statMaxValue;

        if (change > 0) { // Trying to increase
            const costForThisIncrease = (newStatValue - currentStatValue) * this.costPerStatPoint;
            const currentTotalCost = this.calculateTotalCost();
            if (currentTotalCost + costForThisIncrease > this.initialCoinsForSession) {
                this.messageDiv.textContent = "Not enough coins for further increase.";
                newStatValue = currentStatValue; // Revert if cannot afford
            }
        }
        
        this.stats[statKey] = newStatValue;
        this.updateUIDisplays();
    },

    calculateTotalCost: function() {
        let totalCost = 0;
        Object.keys(this.stats).forEach(key => {
            // Cost is based on increase from the stat's value at the start of this screen
            const increase = this.stats[key] - this.initialStatsForSession[key];
            if (increase > 0) {
                totalCost += increase * this.costPerStatPoint;
            }
        });
        return totalCost;
    },

    updateUIDisplays: function() {
        Object.keys(this.stats).forEach(key => {
            if (this.uiElements[`${key}Value`]) {
                this.uiElements[`${key}Value`].textContent = this.stats[key];
            }
        });
        const totalCost = this.calculateTotalCost();
        this.uiElements.totalCostDisplay.textContent = totalCost;
        this.uiElements.availableCoinsDisplay.textContent = this.initialCoinsForSession; // Show initial coins, cost is subtracted from this

        // Disable/enable buttons based on limits and cost
        document.querySelectorAll('.stat-button').forEach(button => {
            const statKey = button.dataset.stat;
            const change = parseInt(button.dataset.change, 10);
            button.disabled = false; // Enable by default

            if (change < 0 && this.stats[statKey] <= this.initialStatsForSession[statKey]) {
                button.disabled = true; // Cannot decrease below session start
            }
            if (change > 0 && this.stats[statKey] >= this.statMaxValue) {
                button.disabled = true; // Cannot increase past max
            }
            if (change > 0 && (totalCost + this.costPerStatPoint > this.initialCoinsForSession) && this.stats[statKey] < this.statMaxValue) {
                 // More nuanced: disable if *this specific* increase is unaffordable
                 // This check is a bit broad, the one in handleStatChange is more precise for actual change
            }
        });
         this.messageDiv.textContent = ''; // Clear general messages on UI update
    },

    handleSaveAndContinue: function() {
        this.messageDiv.textContent = '';
        const totalCost = this.calculateTotalCost();

        if (totalCost > this.initialCoinsForSession) {
            this.messageDiv.textContent = "Error: Cost exceeds available coins. This shouldn't happen.";
            return;
        }

        const coinsRemaining = this.initialCoinsForSession - totalCost;

        const gameDataToSave = {
            playerName: this.playerName,
            gameName: this.id,
            timestamp: new Date().toISOString(),
            gameSpecificData: {
                stats: { ...this.stats }, // Save a copy
                coinsSpentThisGame: totalCost,
                coinsRemainingAfterStats: coinsRemaining
            }
        };

        const saveButton = document.getElementById('saveStatsButton');
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

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
            console.log(`${this.id}: Success response from server:`, data);
            if (data.success) {
                this.messageDiv.textContent = data.message || 'Stats saved successfully!';
                this.messageDiv.style.color = 'green';
                if (this.onSuccess) {
                    this.onSuccess({
                        playerName: this.playerName,
                        stats: { ...this.stats },
                        totalCoins: coinsRemaining // Pass the NEW total coins to GameManager
                    });
                }
            } else {
                throw new Error(data.message || 'Failed to save stats.');
            }
        })
        .catch(error => {
            console.error(`${this.id}: Error saving stats:`, error);
            this.messageDiv.textContent = `Error: ${error.message || 'Could not save stats.'}`;
            this.messageDiv.style.color = '#d32f2f';
            saveButton.disabled = false;
            saveButton.textContent = 'Confirm and Continue';
        });
    },

    showError: function(message) {
        this.gameContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; background-color: #FFEBEE; color: #D32F2F; text-align: center;">
                <h2>Error</h2>
                <p style="font-size: 1.1em; margin-bottom: 20px;">${message}</p>
                <button id="statsErrorRestartButton" style="padding: 10px 20px; font-size: 1em; color: white; background-color: #D32F2F; border: none; border-radius: 5px; cursor: pointer;">Restart Game Sequence</button>
            </div>
        `;
        const restartButton = document.getElementById('statsErrorRestartButton');
        if (restartButton && this.onFailure) {
            restartButton.addEventListener('click', () => {
                this.onFailure({ reason: message + " Restarting sequence." });
            });
        }
    },

    destroy: function() {
        console.log(`${this.id} for ${this.playerName} destroyed.`);
        this.gameContainer.innerHTML = '';
        // Reset properties
        this.playerName = null;
        this.availableCoins = 0;
        this.initialCoinsForSession = 0;
        this.uiElements = {};
        this.messageDiv = null;
        this.stats = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };
        this.initialStatsForSession = {};
        this.gameContainer = null;
        this.onSuccess = null;
        this.onFailure = null;
    }
};

