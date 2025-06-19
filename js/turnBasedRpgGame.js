// js/turnBasedRpgGame.js

const TurnBasedRpgGame = {
    id: 'TurnBasedRpgGame',
    gameContainer: null,
    onSuccess: null,
    onFailure: null,
    sharedData: null,

    player: {
        name: "Hero",
        hp: 0,
        maxHp: 50,
        attack: 10,
        isDefending: false,
    },
    monster: {
        name: "Goblin Grunt",
        hp: 0,
        maxHp: 30,
        attack: 8,
    },

    elements: {}, // To store references to DOM elements

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log("TurnBasedRpgGame: Initializing...", sharedData);
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback;
        this.sharedData = { ...sharedData }; // Make a copy

        // Initialize player stats
        // Use sharedData if available, otherwise defaults
        this.player.name = this.sharedData.playerName || "Hero";
        this.player.maxHp = this.sharedData.playerStats?.maxHp || 50;
        this.player.hp = this.sharedData.playerStats?.currentHp || this.player.maxHp; // Start with currentHP or full HP
        this.player.attack = this.sharedData.playerStats?.attack || 10;
        // Consider if an item from sharedData should boost stats
        if (this.sharedData.chosenItem === 'Power Sword') { // Example item check
            this.player.attack += 5;
            console.log("TurnBasedRpgGame: Player has Power Sword, attack boosted!");
        }


        // Initialize monster (simple, one monster for now)
        // For extensibility, monster stats could come from XML or a config object
        this.monster.name = "Goblin Grunt";
        this.monster.maxHp = 30;
        this.monster.hp = this.monster.maxHp;
        this.monster.attack = 8;

        this.player.isDefending = false;

        this.render();
        this.updateUI();
        this.logMessage(`A wild ${this.monster.name} appears!`);
        this.playerTurnSetup(); // Start with player's turn
    },

    render: function() {
        this.gameContainer.innerHTML = `
            <div id="rpg-battle-area" style="width:100%; max-width: 500px; margin: auto; text-align: center; padding: 20px; border: 1px solid #ccc; border-radius: 8px; background-color: #f7f7f7;">
                <div id="monster-display" style="margin-bottom: 20px; padding: 10px; background-color: #e9e9e9; border-radius: 5px;">
                    <h3 id="monster-name">${this.monster.name}</h3>
                    <p>HP: <span id="monster-hp-current">${this.monster.hp}</span> / <span id="monster-hp-max">${this.monster.maxHp}</span></p>
                    <progress id="monster-hp-bar" value="${this.monster.hp}" max="${this.monster.maxHp}" style="width: 80%;"></progress>
                </div>

                <div id="player-display" style="margin-bottom: 20px; padding: 10px; background-color: #e9e9e9; border-radius: 5px;">
                    <h3 id="player-name">${this.player.name}</h3>
                    <p>HP: <span id="player-hp-current">${this.player.hp}</span> / <span id="player-hp-max">${this.player.maxHp}</span></p>
                    <progress id="player-hp-bar" value="${this.player.hp}" max="${this.player.maxHp}" style="width: 80%;"></progress>
                </div>

                <div id="rpg-actions" style="margin-bottom: 20px;">
                    <button id="attack-button" class="rpg-button">Attack</button>
                    <button id="defend-button" class="rpg-button">Defend</button>
                    <button id="flee-button" class="rpg-button">Flee</button>
                </div>

                <div id="rpg-message-log" style="height: 120px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background-color: #fff; text-align: left; font-size: 0.9em; border-radius: 5px;">
                </div>
            </div>
            <style>
                .rpg-button { padding: 10px 15px; margin: 5px; font-size: 1em; cursor: pointer; border-radius: 5px; border: 1px solid #bbb; background-color: #f0f0f0;}
                .rpg-button:hover { background-color: #e0e0e0; }
                .rpg-button:disabled { background-color: #ccc; cursor: not-allowed; }
                progress { accent-color: #4CAF50; }
                progress[value^="0"], progress:empty { accent-color: #D32F2F; } /* Show red for low health conceptually, though direct styling is tricky */
            </style>
        `;

        this.elements.monsterName = document.getElementById('monster-name');
        this.elements.monsterHpCurrent = document.getElementById('monster-hp-current');
        this.elements.monsterHpMax = document.getElementById('monster-hp-max');
        this.elements.monsterHpBar = document.getElementById('monster-hp-bar');

        this.elements.playerName = document.getElementById('player-name');
        this.elements.playerHpCurrent = document.getElementById('player-hp-current');
        this.elements.playerHpMax = document.getElementById('player-hp-max');
        this.elements.playerHpBar = document.getElementById('player-hp-bar');

        this.elements.attackButton = document.getElementById('attack-button');
        this.elements.defendButton = document.getElementById('defend-button');
        this.elements.fleeButton = document.getElementById('flee-button');
        this.elements.messageLog = document.getElementById('rpg-message-log');

        // Event listeners will be managed by enablePlayerActions/disablePlayerActions
    },

    updateUI: function() {
        if (this.elements.monsterName) this.elements.monsterName.textContent = this.monster.name;
        if (this.elements.monsterHpCurrent) this.elements.monsterHpCurrent.textContent = this.monster.hp;
        if (this.elements.monsterHpMax) this.elements.monsterHpMax.textContent = this.monster.maxHp;
        if (this.elements.monsterHpBar) {
            this.elements.monsterHpBar.value = this.monster.hp;
            this.elements.monsterHpBar.max = this.monster.maxHp;
        }


        if (this.elements.playerName) this.elements.playerName.textContent = this.player.name;
        if (this.elements.playerHpCurrent) this.elements.playerHpCurrent.textContent = this.player.hp;
        if (this.elements.playerHpMax) this.elements.playerHpMax.textContent = this.player.maxHp;
        if (this.elements.playerHpBar) {
            this.elements.playerHpBar.value = this.player.hp;
            this.elements.playerHpBar.max = this.player.maxHp;
        }
    },

    logMessage: function(message) {
        if (!this.elements.messageLog) return;
        const p = document.createElement('p');
        p.textContent = message;
        p.style.margin = "2px 0";
        this.elements.messageLog.appendChild(p);
        this.elements.messageLog.scrollTop = this.elements.messageLog.scrollHeight; // Auto-scroll
    },

    _attackHandler: function() { this.handlePlayerAction('attack'); },
    _defendHandler: function() { this.handlePlayerAction('defend'); },
    _fleeHandler: function() { this.handlePlayerAction('flee'); },

    enablePlayerActions: function(enable) {
        if (!this.elements.attackButton) return; // Guard against elements not ready

        if (enable) {
            this.elements.attackButton.disabled = false;
            this.elements.defendButton.disabled = false;
            this.elements.fleeButton.disabled = false;
            this.elements.attackButton.onclick = this._attackHandler.bind(this);
            this.elements.defendButton.onclick = this._defendHandler.bind(this);
            this.elements.fleeButton.onclick = this._fleeHandler.bind(this);
        } else {
            this.elements.attackButton.disabled = true;
            this.elements.defendButton.disabled = true;
            this.elements.fleeButton.disabled = true;
            this.elements.attackButton.onclick = null;
            this.elements.defendButton.onclick = null;
            this.elements.fleeButton.onclick = null;
        }
    },

    playerTurnSetup: function() {
        this.logMessage("Your turn.");
        this.player.isDefending = false; // Reset defense stance
        this.enablePlayerActions(true);
    },

    handlePlayerAction: function(action) {
        this.enablePlayerActions(false); // Disable actions while processing

        switch (action) {
            case 'attack':
                const playerDamage = this.player.attack; // Simplistic damage
                this.monster.hp = Math.max(0, this.monster.hp - playerDamage);
                this.logMessage(`${this.player.name} attacks ${this.monster.name} for ${playerDamage} damage.`);
                this.updateUI();
                if (this.checkMonsterDefeat()) return;
                break;
            case 'defend':
                this.player.isDefending = true;
                this.logMessage(`${this.player.name} braces for the next attack!`);
                break;
            case 'flee':
                if (Math.random() < 0.5) { // 50% chance to flee
                    this.logMessage(`${this.player.name} successfully fled!`);
                    // For simplicity, fleeing is a "success" but doesn't give rewards like winning.
                    // It might be better to have a specific outcome type if GameManager needs to differentiate.
                    this.onSuccess({
                        battleOutcome: 'fled',
                        message: "You managed to escape!",
                        // Ensure player's current HP is passed back if it should persist
                        playerStats: { ...this.sharedData.playerStats, currentHp: this.player.hp }
                    });
                    return; // End battle
                } else {
                    this.logMessage(`${this.player.name} failed to flee!`);
                }
                break;
        }
        // If action didn't end the battle (win/flee), proceed to monster's turn
        setTimeout(() => this.monsterTurn(), 1000); // Delay before monster acts
    },

    checkMonsterDefeat: function() {
        if (this.monster.hp <= 0) {
            this.logMessage(`${this.player.name} defeated ${this.monster.name}!`);
            const coinsEarned = Math.floor(Math.random() * 10) + 5; // e.g. 5-14 coins
            this.onSuccess({
                battleWon: true,
                experienceGained: 50, // Example XP
                coinsCollected: coinsEarned, // Pass coins to GameManager
                message: `You won and found ${coinsEarned} coins!`,
                // Pass back player's current HP and max HP for consistency
                playerStats: { ...this.sharedData.playerStats, currentHp: this.player.hp, maxHp: this.player.maxHp }
            });
            return true;
        }
        return false;
    },

    monsterTurn: function() {
        this.logMessage(`${this.monster.name}'s turn.`);
        let monsterDamage = this.monster.attack;

        if (this.player.isDefending) {
            monsterDamage = Math.ceil(monsterDamage / 2); // Defending halves damage (rounded up)
            this.logMessage(`${this.player.name}'s defense reduces the damage!`);
        }

        this.player.hp = Math.max(0, this.player.hp - monsterDamage);
        this.logMessage(`${this.monster.name} attacks ${this.player.name} for ${monsterDamage} damage.`);
        this.updateUI();

        if (this.checkPlayerDefeat()) return; // If player defeated, end turn sequence

        this.player.isDefending = false; // Player's defense only lasts for one monster attack
        setTimeout(() => this.playerTurnSetup(), 1000); // Delay before player's turn starts
    },

    checkPlayerDefeat: function() {
        if (this.player.hp <= 0) {
            this.logMessage(`${this.player.name} has been defeated...`);
            this.onFailure({ reason: `You were slain by ${this.monster.name}!` });
            return true;
        }
        return false;
    },

    destroy: function() {
        console.log("TurnBasedRpgGame: Destroying...");
        this.enablePlayerActions(false); // This also detaches event listeners
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        this.elements = {};
        // Reset other internal states if necessary
        // (player/monster objects are re-initialized in init)
    }
};
