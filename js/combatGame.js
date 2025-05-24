// js/combatGame.js
const CombatGame = {
    id: 'combat-game',
    gameContainer: null,
    successCallback: null,
    globalFailureCallback: null,
    previousData: null,
    
    // Game state
    player: {},
    enemy: {
        name: 'Bandit',
        health: 405,
        maxHealth: 405,
        attack: 18,
        defense: 35,
        coins: 14,
        icon: '🏴‍☠️'
    },
    currentTurn: 'player',
    combatLog: [],
    gameOver: false,
    actionInProgress: false,

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        this.gameContainer = gameContainer;
        this.successCallback = successCallback;
        this.globalFailureCallback = globalFailureCallback;
        this.previousData = previousData || {};
        
        this.setupPlayer();
        this.resetGameState();
        this.render();
        this.addCombatLogMessage(`A wild ${this.enemy.name} appears! They're carrying ${this.enemy.coins} coins!`);
        this.addCombatLogMessage(`${this.player.name} enters the battle!`);
        
        console.log("Combat Game initialized");
    },

    setupPlayer: function() {
        // Use character data from previous game, or default to warrior
        const characterData = this.previousData.characterStats || {
            health: 80,
            defense: 60,
            speed: 70,
            attack: 75,
            type: 'balanced'
        };
        
        const characterName = this.previousData.selectedCharacter || 'warrior';
        
        this.player = {
            name: characterName.charAt(0).toUpperCase() + characterName.slice(1),
            health: characterData.health,
            maxHealth: characterData.health,
            attack: characterData.attack,
            defense: characterData.defense,
            speed: characterData.speed,
            type: characterData.type,
            special: characterData.special || 'Power Strike',
            specialCooldown: 0,
            icon: this.getCharacterIcon(characterName)
        };
    },

    getCharacterIcon: function(character) {
        const icons = {
            warrior: '⚔️',
            archer: '🏹',
            wizard: '🔮'
        };
        return icons[character] || '⚔️';
    },

    resetGameState: function() {
        this.currentTurn = 'player';
        this.combatLog = [];
        this.gameOver = false;
        this.actionInProgress = false;
        this.player.specialCooldown = 0;
    },

    render: function() {
        this.gameContainer.innerHTML = `
            <div class="combat-container" style="
                background: linear-gradient(135deg, #2c1810 0%, #8B4513 50%, #2c1810 100%);
                min-height: 500px;
                padding: 20px;
                border-radius: 15px;
                color: white;
                font-family: 'Courier New', monospace;
                position: relative;
                overflow: hidden;
            ">
                <!-- Background decoration -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: 
                        radial-gradient(circle at 20% 80%, rgba(255,69,0,0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(255,140,0,0.1) 0%, transparent 50%);
                    pointer-events: none;
                "></div>

                <h2 style="text-align: center; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.7); position: relative; z-index: 1;">
                    ⚔️ ARENA BATTLE ⚔️
                </h2>

                <div class="battle-area" style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                    position: relative;
                    z-index: 1;
                ">
                    <!-- Player Stats -->
                    <div class="character-panel player-panel" style="
                        background: linear-gradient(135deg, rgba(34,139,34,0.8), rgba(0,100,0,0.8));
                        border: 3px solid #228B22;
                        border-radius: 15px;
                        padding: 20px;
                        text-align: center;
                        box-shadow: 0 0 20px rgba(34,139,34,0.3);
                    ">
                        <div class="character-icon" style="font-size: 3em; margin-bottom: 10px;">${this.player.icon}</div>
                        <h3 style="margin: 10px 0; color: #90EE90;">${this.player.name}</h3>
                        
                        <div class="health-bar" style="margin: 15px 0;">
                            <div style="background: #8B0000; height: 20px; border-radius: 10px; overflow: hidden; border: 2px solid #000;">
                                <div id="player-health-fill" style="
                                    background: linear-gradient(90deg, #32CD32, #228B22);
                                    height: 100%;
                                    width: ${(this.player.health / this.player.maxHealth) * 100}%;
                                    transition: width 0.5s ease;
                                "></div>
                            </div>
                            <p style="margin: 5px 0; font-size: 0.9em;">HP: ${this.player.health}/${this.player.maxHealth}</p>
                        </div>

                        <div class="stats" style="font-size: 0.85em; text-align: left;">
                            <div>💥 Attack: ${this.player.attack}</div>
                            <div>🛡️ Defense: ${this.player.defense}</div>
                            <div>⚡ Speed: ${this.player.speed}</div>
                        </div>
                    </div>

                    <!-- Enemy Stats -->
                    <div class="character-panel enemy-panel" style="
                        background: linear-gradient(135deg, rgba(139,0,0,0.8), rgba(128,0,0,0.8));
                        border: 3px solid #8B0000;
                        border-radius: 15px;
                        padding: 20px;
                        text-align: center;
                        box-shadow: 0 0 20px rgba(139,0,0,0.3);
                    ">
                        <div class="character-icon" style="font-size: 3em; margin-bottom: 10px;">${this.enemy.icon}</div>
                        <h3 style="margin: 10px 0; color: #FFB6C1;">${this.enemy.name}</h3>
                        
                        <div class="health-bar" style="margin: 15px 0;">
                            <div style="background: #8B0000; height: 20px; border-radius: 10px; overflow: hidden; border: 2px solid #000;">
                                <div id="enemy-health-fill" style="
                                    background: linear-gradient(90deg, #DC143C, #8B0000);
                                    height: 100%;
                                    width: ${(this.enemy.health / this.enemy.maxHealth) * 100}%;
                                    transition: width 0.5s ease;
                                "></div>
                            </div>
                            <p style="margin: 5px 0; font-size: 0.9em;">HP: ${this.enemy.health}/${this.enemy.maxHealth}</p>
                        </div>

                        <div class="stats" style="font-size: 0.85em; text-align: left;">
                            <div>💥 Attack: ${this.enemy.attack}</div>
                            <div>🛡️ Defense: ${this.enemy.defense}</div>
                            <div>💰 Coins: ${this.enemy.coins}</div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons" style="
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-bottom: 25px;
                    position: relative;
                    z-index: 1;
                ">
                    <button id="attack-btn" class="action-btn" style="
                        padding: 12px 25px;
                        font-size: 1.1em;
                        background: linear-gradient(135deg, #FF6347, #DC143C);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(220,20,60,0.3);
                        font-family: inherit;
                    ">🗡️ Attack</button>

                    <button id="special-btn" class="action-btn" style="
                        padding: 12px 25px;
                        font-size: 1.1em;
                        background: linear-gradient(135deg, #9932CC, #8A2BE2);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(138,43,226,0.3);
                        font-family: inherit;
                    ">✨ ${this.player.special}</button>

                    <button id="defend-btn" class="action-btn" style="
                        padding: 12px 25px;
                        font-size: 1.1em;
                        background: linear-gradient(135deg, #4682B4, #191970);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(70,130,180,0.3);
                        font-family: inherit;
                    ">🛡️ Defend</button>
                </div>

                <!-- Turn Indicator -->
                <div id="turn-indicator" style="
                    text-align: center;
                    font-size: 1.2em;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #FFD700;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                    position: relative;
                    z-index: 1;
                ">
                    ${this.currentTurn === 'player' ? '🎯 Your Turn!' : '⚔️ Enemy Turn!'}
                </div>

                <!-- Combat Log -->
                <div class="combat-log" style="
                    background: rgba(0,0,0,0.6);
                    border: 2px solid #444;
                    border-radius: 10px;
                    padding: 15px;
                    height: 150px;
                    overflow-y: auto;
                    font-size: 0.9em;
                    position: relative;
                    z-index: 1;
                ">
                    <div id="log-content"></div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.updateTurnDisplay();
        this.updateSpecialButton();
    },

    attachEventListeners: function() {
        const attackBtn = this.gameContainer.querySelector('#attack-btn');
        const specialBtn = this.gameContainer.querySelector('#special-btn');
        const defendBtn = this.gameContainer.querySelector('#defend-btn');

        attackBtn.addEventListener('click', () => this.playerAttack());
        specialBtn.addEventListener('click', () => this.playerSpecialAttack());
        defendBtn.addEventListener('click', () => this.playerDefend());

        // Add hover effects
        [attackBtn, specialBtn, defendBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {
                    btn.style.transform = 'scale(1.05)';
                    btn.style.boxShadow = '0 6px 20px rgba(255,255,255,0.2)';
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (!btn.disabled) {
                    btn.style.transform = 'scale(1)';
                }
            });
        });
    },

    playerAttack: function() {
        if (this.currentTurn !== 'player' || this.actionInProgress || this.gameOver) return;
        
        this.actionInProgress = true;
        this.disableButtons();

        const damage = this.calculateDamage(this.player.attack, this.enemy.defense);
        this.enemy.health = Math.max(0, this.enemy.health - damage);
        
        this.addCombatLogMessage(`${this.player.name} attacks for ${damage} damage!`);
        this.updateHealthBars();
        
        if (this.enemy.health <= 0) {
            this.playerWins();
            return;
        }

        this.currentTurn = 'enemy';
        this.updateTurnDisplay();
        
        setTimeout(() => {
            this.enemyTurn();
        }, 1500);
    },

    playerSpecialAttack: function() {
        if (this.currentTurn !== 'player' || this.actionInProgress || this.gameOver || this.player.specialCooldown > 0) return;
        
        this.actionInProgress = true;
        this.disableButtons();

        const baseDamage = Math.floor(this.player.attack * 1.5);
        const damage = this.calculateDamage(baseDamage, this.enemy.defense);
        this.enemy.health = Math.max(0, this.enemy.health - damage);
        this.player.specialCooldown = 3;
        
        this.addCombatLogMessage(`${this.player.name} uses ${this.player.special} for ${damage} damage!`);
        this.updateHealthBars();
        this.updateSpecialButton();
        
        if (this.enemy.health <= 0) {
            this.playerWins();
            return;
        }

        this.currentTurn = 'enemy';
        this.updateTurnDisplay();
        
        setTimeout(() => {
            this.enemyTurn();
        }, 1500);
    },

    playerDefend: function() {
        if (this.currentTurn !== 'player' || this.actionInProgress || this.gameOver) return;
        
        this.actionInProgress = true;
        this.disableButtons();

        // Heal a small amount when defending
        const healAmount = Math.floor(this.player.maxHealth * 0.1);
        this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
        
        this.addCombatLogMessage(`${this.player.name} defends and recovers ${healAmount} HP!`);
        this.updateHealthBars();

        this.currentTurn = 'enemy';
        this.updateTurnDisplay();
        
        setTimeout(() => {
            this.enemyTurn();
        }, 1500);
    },

    enemyTurn: function() {
        if (this.gameOver) return;

        // Simple enemy AI - just attack
        const damage = this.calculateDamage(this.enemy.attack, this.player.defense);
        this.player.health = Math.max(0, this.player.health - damage);
        
        this.addCombatLogMessage(`${this.enemy.name} attacks for ${damage} damage!`);
        this.updateHealthBars();
        
        if (this.player.health <= 0) {
            this.playerLoses();
            return;
        }

        // Reduce special cooldown
        if (this.player.specialCooldown > 0) {
            this.player.specialCooldown--;
            this.updateSpecialButton();
        }

        this.currentTurn = 'player';
        this.actionInProgress = false;
        this.updateTurnDisplay();
        this.enableButtons();
    },

    calculateDamage: function(attack, defense) {
        const baseDamage = attack;
        const reduction = Math.floor(defense * 0.3);
        const finalDamage = Math.max(1, baseDamage - reduction);
        
        // Add some randomness (±20%)
        const variance = Math.floor(finalDamage * 0.2);
        return finalDamage + Math.floor(Math.random() * (variance * 2 + 1)) - variance;
    },

    updateHealthBars: function() {
        const playerHealthFill = this.gameContainer.querySelector('#player-health-fill');
        const enemyHealthFill = this.gameContainer.querySelector('#enemy-health-fill');
        const playerPanel = this.gameContainer.querySelector('.player-panel');
        const enemyPanel = this.gameContainer.querySelector('.enemy-panel');

        if (playerHealthFill) {
            playerHealthFill.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
            playerPanel.querySelector('p').textContent = `HP: ${this.player.health}/${this.player.maxHealth}`;
        }

        if (enemyHealthFill) {
            enemyHealthFill.style.width = `${(this.enemy.health / this.enemy.maxHealth) * 100}%`;
            enemyPanel.querySelector('p').textContent = `HP: ${this.enemy.health}/${this.enemy.maxHealth}`;
        }
    },

    updateTurnDisplay: function() {
        const turnIndicator = this.gameContainer.querySelector('#turn-indicator');
        if (turnIndicator) {
            turnIndicator.textContent = this.currentTurn === 'player' ? '🎯 Your Turn!' : '⚔️ Enemy Turn!';
            turnIndicator.style.color = this.currentTurn === 'player' ? '#90EE90' : '#FFB6C1';
        }
    },

    updateSpecialButton: function() {
        const specialBtn = this.gameContainer.querySelector('#special-btn');
        if (specialBtn) {
            if (this.player.specialCooldown > 0) {
                specialBtn.textContent = `⏳ ${this.player.special} (${this.player.specialCooldown})`;
                specialBtn.disabled = true;
                specialBtn.style.opacity = '0.5';
            } else {
                specialBtn.textContent = `✨ ${this.player.special}`;
                specialBtn.disabled = false;
                specialBtn.style.opacity = '1';
            }
        }
    },

    disableButtons: function() {
        const buttons = this.gameContainer.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    },

    enableButtons: function() {
        const buttons = this.gameContainer.querySelectorAll('.action-btn');
        buttons.forEach(btn => {
            if (btn.id !== 'special-btn' || this.player.specialCooldown === 0) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    },

    addCombatLogMessage: function(message) {
        this.combatLog.push(message);
        const logContent = this.gameContainer.querySelector('#log-content');
        if (logContent) {
            logContent.innerHTML = this.combatLog.map(msg => `<div style="margin-bottom: 5px;">${msg}</div>`).join('');
            logContent.scrollTop = logContent.scrollHeight;
        }
    },

    playerWins: function() {
        this.gameOver = true;
        this.addCombatLogMessage(`🎉 ${this.player.name} defeats the ${this.enemy.name}!`);
        this.addCombatLogMessage(`💰 You earned ${this.enemy.coins} coins!`);
        
        setTimeout(() => {
            this.gameContainer.innerHTML += `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: #8B4513;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    border: 3px solid #B8860B;
                    box-shadow: 0 0 30px rgba(255,215,0,0.6);
                    z-index: 100;
                ">
                    <h2>🏆 VICTORY! 🏆</h2>
                    <p style="font-size: 1.2em; margin: 15px 0;">
                        ${this.player.name} emerges victorious!
                    </p>
                    <p style="font-size: 1.1em; margin: 10px 0;">
                        💰 Coins earned: ${this.enemy.coins}
                    </p>
                    <button id="continue-btn" style="
                        padding: 12px 25px;
                        font-size: 1.1em;
                        background: #228B22;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 15px;
                    ">Continue Adventure</button>
                </div>
            `;

            this.gameContainer.querySelector('#continue-btn').addEventListener('click', () => {
                this.completeGame();
            });
        }, 2000);
    },

    playerLoses: function() {
        this.gameOver = true;
        this.addCombatLogMessage(`💀 ${this.player.name} has been defeated...`);
        
        setTimeout(() => {
            if (this.globalFailureCallback) {
                this.globalFailureCallback({
                    reason: `${this.player.name} was defeated in combat by the ${this.enemy.name}!`
                });
            }
        }, 2000);
    },

    completeGame: function() {
        const gameData = {
            combatWon: true,
            coinsEarned: this.enemy.coins,
            playerHealthRemaining: this.player.health,
            defeatedEnemy: this.enemy.name,
            ...this.previousData // Carry forward previous data
        };

        if (this.successCallback) {
            this.successCallback(gameData);
        }
    },

    destroy: function() {
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        console.log("Combat Game destroyed");
    }
};
