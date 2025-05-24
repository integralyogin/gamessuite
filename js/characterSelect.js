// js/characterSelection.js
const CharacterSelectionGame = {
    id: 'character-selection',
    gameContainer: null,
    successCallback: null,
    globalFailureCallback: null,
    previousData: null,
    selectedCharacter: null,

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        this.gameContainer = gameContainer;
        this.successCallback = successCallback;
        this.globalFailureCallback = globalFailureCallback;
        this.previousData = previousData || {};
        this.selectedCharacter = null;
        
        this.render();
        console.log("Character Selection Game initialized");
    },

    render: function() {
        this.gameContainer.innerHTML = `
            <div class="character-selection-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 400px;
                border-radius: 10px;
                color: white;
                font-family: Arial, sans-serif;
            ">
                <h2 style="margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                    Choose Your Character
                </h2>
                
                <div class="characters-grid" style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    max-width: 600px;
                    width: 100%;
                ">
                    <div class="character-card" data-character="warrior" style="
                        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                        border: 3px solid transparent;
                        border-radius: 15px;
                        padding: 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    ">
                        <div class="character-icon" style="font-size: 3em; margin-bottom: 10px;">⚔️</div>
                        <h3 style="margin: 10px 0; font-size: 1.4em;">Warrior</h3>
                        <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">
                            High health and defense<br>
                            Strong melee attacks<br>
                            Slower movement
                        </p>
                        <div class="stats" style="margin-top: 15px; font-size: 0.8em;">
                            <div>❤️ Health: 100</div>
                            <div>🛡️ Defense: 85</div>
                            <div>⚡ Speed: 60</div>
                            <div>💥 Attack: 80</div>
                        </div>
                    </div>

                    <div class="character-card" data-character="archer" style="
                        background: linear-gradient(135deg, #26de81, #20bf6b);
                        border: 3px solid transparent;
                        border-radius: 15px;
                        padding: 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    ">
                        <div class="character-icon" style="font-size: 3em; margin-bottom: 10px;">🏹</div>
                        <h3 style="margin: 10px 0; font-size: 1.4em;">Archer</h3>
                        <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">
                            Balanced stats<br>
                            Ranged attacks<br>
                            Good mobility
                        </p>
                        <div class="stats" style="margin-top: 15px; font-size: 0.8em;">
                            <div>❤️ Health: 80</div>
                            <div>🛡️ Defense: 70</div>
                            <div>⚡ Speed: 85</div>
                            <div>💥 Attack: 75</div>
                        </div>
                    </div>

                    <div class="character-card" data-character="wizard" style="
                        background: linear-gradient(135deg, #a55eea, #8e44ad);
                        border: 3px solid transparent;
                        border-radius: 15px;
                        padding: 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    ">
                        <div class="character-icon" style="font-size: 3em; margin-bottom: 10px;">🔮</div>
                        <h3 style="margin: 10px 0; font-size: 1.4em;">Wizard</h3>
                        <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">
                            High magic damage<br>
                            Special abilities<br>
                            Low physical defense
                        </p>
                        <div class="stats" style="margin-top: 15px; font-size: 0.8em;">
                            <div>❤️ Health: 60</div>
                            <div>🛡️ Defense: 50</div>
                            <div>⚡ Speed: 70</div>
                            <div>💥 Attack: 95</div>
                        </div>
                    </div>
                </div>

                <div class="selection-info" style="
                    margin-top: 30px;
                    padding: 15px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    text-align: center;
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <p id="selection-text" style="margin: 0; font-size: 1.1em;">
                        Click on a character to select them for battle!
                    </p>
                </div>

                <button id="confirm-selection" style="
                    margin-top: 20px;
                    padding: 12px 30px;
                    font-size: 1.2em;
                    background: #2c3e50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    opacity: 0.5;
                    pointer-events: none;
                " disabled>
                    Confirm Selection
                </button>
            </div>
        `;

        this.attachEventListeners();
    },

    attachEventListeners: function() {
        const characterCards = this.gameContainer.querySelectorAll('.character-card');
        const confirmButton = this.gameContainer.querySelector('#confirm-selection');
        const selectionText = this.gameContainer.querySelector('#selection-text');

        // Add hover effects
        characterCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                if (!card.classList.contains('selected')) {
                    card.style.transform = 'translateY(-5px) scale(1.02)';
                    card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                }
            });

            card.addEventListener('mouseleave', () => {
                if (!card.classList.contains('selected')) {
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                }
            });

            card.addEventListener('click', () => {
                // Remove selection from all cards
                characterCards.forEach(c => {
                    c.classList.remove('selected');
                    c.style.border = '3px solid transparent';
                    c.style.transform = 'translateY(0) scale(1)';
                    c.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                });

                // Select this card
                card.classList.add('selected');
                card.style.border = '3px solid #ffd700';
                card.style.transform = 'translateY(-3px) scale(1.05)';
                card.style.boxShadow = '0 10px 30px rgba(255,215,0,0.4)';

                this.selectedCharacter = card.dataset.character;
                
                // Update UI
                const characterName = this.selectedCharacter.charAt(0).toUpperCase() + this.selectedCharacter.slice(1);
                selectionText.textContent = `${characterName} selected! Ready for battle!`;
                
                confirmButton.style.opacity = '1';
                confirmButton.style.pointerEvents = 'auto';
                confirmButton.style.background = '#27ae60';
                confirmButton.disabled = false;

                // Add glow effect to confirm button
                confirmButton.style.boxShadow = '0 0 20px rgba(39,174,96,0.5)';
            });
        });

        confirmButton.addEventListener('click', () => {
            if (this.selectedCharacter) {
                this.completeGame();
            }
        });

        // Add confirm button hover effect
        confirmButton.addEventListener('mouseenter', () => {
            if (!confirmButton.disabled) {
                confirmButton.style.background = '#2ecc71';
                confirmButton.style.transform = 'scale(1.05)';
            }
        });

        confirmButton.addEventListener('mouseleave', () => {
            if (!confirmButton.disabled) {
                confirmButton.style.background = '#27ae60';
                confirmButton.style.transform = 'scale(1)';
            }
        });
    },

    getCharacterStats: function(character) {
        const stats = {
            warrior: {
                health: 100,
                defense: 85,
                speed: 60,
                attack: 80,
                type: 'melee',
                special: 'Shield Bash'
            },
            archer: {
                health: 80,
                defense: 70,
                speed: 85,
                attack: 75,
                type: 'ranged',
                special: 'Multi-Shot'
            },
            wizard: {
                health: 60,
                defense: 50,
                speed: 70,
                attack: 95,
                type: 'magic',
                special: 'Fireball'
            }
        };
        return stats[character] || stats.warrior;
    },

    completeGame: function() {
        if (!this.selectedCharacter) {
            console.warn("No character selected!");
            return;
        }

        const characterStats = this.getCharacterStats(this.selectedCharacter);
        
        // Show success animation
        const selectionText = this.gameContainer.querySelector('#selection-text');
        selectionText.innerHTML = `
            <span style="color: #ffd700; font-weight: bold; font-size: 1.3em;">
                ✨ ${this.selectedCharacter.toUpperCase()} CHOSEN! ✨
            </span>
        `;

        // Prepare data to pass to next games
        const gameData = {
            selectedCharacter: this.selectedCharacter,
            characterStats: characterStats,
            characterSelectionComplete: true,
            selectionTimestamp: Date.now()
        };

        console.log(`Character selection completed: ${this.selectedCharacter}`, gameData);

        // Wait a moment for the success animation, then proceed
        setTimeout(() => {
            if (this.successCallback) {
                this.successCallback(gameData);
            }
        }, 1500);
    },

    destroy: function() {
        // Clean up any intervals, event listeners, etc.
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        console.log("Character Selection Game destroyed");
    }
};
