// js/ArenaGame.js
const ArenaGame = {
    id: 'ArenaGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        totalRounds: 10,
        baseGoldReward: 50,     
        goldRewardMultiplier: 1.5, 
        turnDelay: 150, // Slightly faster for testing       
        opponentProgression: [ 
            "SINGLE_CAVE_RAT", "KOBOLD_SKIRMISHER", "GIANT_BAT", "GOBLIN_CUTTER",      
            "SKELETON_GUARD", "GIANT_SPIDER", "ORC_RAIDER", "HOBGOBLIN_SOLDIER",  
            "SHADOW_MASTIFF", "OGRE_THUG"           
        ],
        // STANDARD_ACTION_COST needs to be accessible, typically from CombatProcessorGame.config
        // We'll try to access it dynamically, or use a fallback.
        STANDARD_ACTION_COST_FALLBACK: 1000 
    },

    localState: {
        playerRoster: [],
        playerInventory: [],
        selectedChampion: null, 
        selectedChampionId: null,
        currentRound: 1,
        currentOpponent: null,
        isCombatActive: false,
        combatProcessor: null,
        combatTurnInterval: null,
        message: "Welcome to the Arena! Select your champion.",
        arenaLog: [] 
    },

    elements: {
        rosterDisplay: null,
        championDisplay: null,
        opponentDisplay: null,
        arenaMessageDisplay: null,
        actionButtons: null,
        playerGoldDisplay: null,
        roundInfoDisplay: null,
        combatLogDisplay: null 
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (!this.container) {
            console.error("ArenaGame: Container not provided for initialization!");
            if (this.failureCallback) this.failureCallback({reason: "Initialization failed: No game container."});
            return;
        }

        if (!this.sharedData.playerRoster) this.sharedData.playerRoster = [];
        if (!this.sharedData.playerInventory) this.sharedData.playerInventory = [];
        if (this.sharedData.totalCoins === undefined) this.sharedData.totalCoins = 0;

        this.localState.playerRoster = JSON.parse(JSON.stringify(this.sharedData.playerRoster.filter(p => p.hp && p.hp.current > 0))); 
        this.localState.playerInventory = JSON.parse(JSON.stringify(this.sharedData.playerInventory));
        
        this.localState.selectedChampion = null;
        this.localState.selectedChampionId = null;
        this.localState.currentRound = 1;
        this.localState.currentOpponent = null;
        this.localState.isCombatActive = false;
        this.localState.arenaLog = [];
        if (this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);

        console.log("ArenaGame: Initializing. Roster:", this.localState.playerRoster);

        this.renderBaseLayout(); 
        this.cacheElements();    
        this.updateDisplay();
        this.attachEventListeners();
        this.logArenaMessage("Welcome to the Grand Arena! Select your champion to begin.");
    },

    renderBaseLayout: function() {
        if (!this.container) {
            console.error("ArenaGame: renderBaseLayout called but this.container is null!");
            return;
        }
        this.container.innerHTML = `
            <div class="arena-game-container compact-arena-v2">
                <div class="arena-top-bar-v2">
                    <h1 class="arena-title-v2">The Grand Arena</h1>
                    <div id="arenaPlayerGoldAG" class="player-gold-arena-v2">Gold: ${this.sharedData.totalCoins}</div>
                </div>
                <div id="arenaRoundInfoAG" class="arena-round-info-v2">Select a Champion</div>
                <div id="arenaMessageDisplayAG" class="arena-message-display-v2">${this.localState.message}</div>

                <div class="arena-main-grid-v2">
                    <div class="arena-roster-panel-v2">
                        <h3>Champions</h3>
                        <div id="arenaRosterDisplayAG" class="arena-list-container-v2"></div>
                    </div>

                    <div class="arena-fight-display-v2">
                        <div class="arena-combatant-area-v2">
                            <h4>Your Champion</h4>
                            <div id="arenaChampionDisplayAG" class="arena-character-card-v2">Choose a champion...</div>
                        </div>
                        <div class="arena-vs-indicator-v2">VS</div>
                        <div class="arena-combatant-area-v2">
                            <h4>Opponent</h4>
                            <div id="arenaOpponentDisplayAG" class="arena-character-card-v2">Waiting...</div>
                        </div>
                    </div>
                </div>

                <div id="arenaCombatLogDisplayAG" class="arena-combat-log-v2"></div>
                <div id="arenaActionButtonsAG" class="arena-action-buttons-v2">
                    <button id="exitArenaBtnAG" class="arena-button-v2 arena-exit-button-v2">Leave Arena</button>
                </div>
            </div>
        `;
        this.applyStyles();
    },

    cacheElements: function() {
        if (!this.container) {
            console.error("ArenaGame: cacheElements called but this.container is null!");
            return;
        }
        this.elements.rosterDisplay = this.container.querySelector('#arenaRosterDisplayAG');
        this.elements.championDisplay = this.container.querySelector('#arenaChampionDisplayAG');
        this.elements.opponentDisplay = this.container.querySelector('#arenaOpponentDisplayAG');
        this.elements.arenaMessageDisplay = this.container.querySelector('#arenaMessageDisplayAG');
        this.elements.actionButtons = this.container.querySelector('#arenaActionButtonsAG');
        this.elements.playerGoldDisplay = this.container.querySelector('#arenaPlayerGoldAG'); 
        this.elements.roundInfoDisplay = this.container.querySelector('#arenaRoundInfoAG');
        this.elements.combatLogDisplay = this.container.querySelector('#arenaCombatLogDisplayAG');

        for (const key in this.elements) {
            if (this.elements[key] === null) {
                console.warn(`ArenaGame: cacheElements - Element for '${key}' was not found.`);
            }
        }
    },

    applyStyles: function() { 
        let style = document.getElementById('arenaGameStyleV2'); // New ID for new styles
        if (!style) {
            style = document.createElement('style');
            style.id = 'arenaGameStyleV2';
            document.head.appendChild(style);
        }
        style.textContent = `
            .arena-game-container.compact-arena-v2 { display: flex; flex-direction: column; height: 100%; max-height: 98vh; padding: 8px; box-sizing: border-box; font-family: 'Trebuchet MS', sans-serif; background-color: #2d2d2d; color: #c5c5c5; }
            .compact-arena-v2 .arena-top-bar-v2 { display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px; border-bottom: 1px solid #444; margin-bottom: 4px; }
            .compact-arena-v2 .arena-title-v2 { margin: 0; font-size: 1.4em; color: #e0b050; }
            .compact-arena-v2 .player-gold-arena-v2 { font-size: 0.9em; }
            .compact-arena-v2 .arena-message-display-v2 { padding: 5px; margin-bottom: 5px; background-color: #383838; border: 1px solid #505050; border-radius: 3px; text-align: center; font-size: 0.85em; min-height: 1.2em; }
            .compact-arena-v2 .arena-round-info-v2 { text-align: center; font-size: 1em; font-weight: bold; margin-bottom: 5px; color: #e0b050; }
            
            .compact-arena-v2 .arena-main-grid-v2 { display: grid; grid-template-columns: 170px 1fr; /* Roster | Fight Area */ gap: 8px; flex-grow: 1; overflow: hidden; margin-bottom: 5px; }
            .compact-arena-v2 .arena-roster-panel-v2 { background-color: #333; padding: 6px; border-radius: 4px; display: flex; flex-direction: column; overflow: hidden;}
            .compact-arena-v2 .arena-fight-display-v2 { background-color: #333; padding: 6px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; overflow: hidden;} /* Changed to column */
            
            .compact-arena-v2 .arena-roster-panel-v2 h3, .compact-arena-v2 .arena-combatant-area-v2 h4 { text-align: center; margin-top: 0; margin-bottom: 5px; color: #b0b0b0; font-size: 0.95em; border-bottom: 1px solid #484848; padding-bottom: 3px;}
            .compact-arena-v2 .arena-list-container-v2 { overflow-y: auto; flex-grow: 1; padding-right: 3px;}
            .compact-arena-v2 .arena-list-item { padding: 4px 6px; margin-bottom: 3px; background-color: #484848; border-radius: 3px; cursor: pointer; transition: background-color 0.15s; font-size: 0.8em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .compact-arena-v2 .arena-list-item:hover { background-color: #585858; }
            .compact-arena-v2 .arena-list-item.selected { background-color: #b8860b; color: #fff; font-weight: bold; }

            .compact-arena-v2 .arena-combatant-area-v2 { width: 100%; margin-bottom: 5px; background-color: #3f3f3f; padding: 8px; border-radius: 4px; box-sizing: border-box;}
            .compact-arena-v2 .arena-character-card-v2 { font-size: 0.75em; min-height: 80px; /* Adjusted min-height */ }
            .compact-arena-v2 .arena-character-card-v2 h4 { margin: 0 0 3px 0; color: #e0b050; font-size: 1em; }
            .compact-arena-v2 .arena-character-card-v2 p { margin: 1px 0; font-size: 0.9em; line-height: 1.2; }
            .compact-arena-v2 .arena-vs-indicator-v2 { font-size: 1em; font-weight: bold; color: #e0b050; margin: 3px 0; }

            .compact-arena-v2 .stat-line { display: flex; align-items: center; margin-bottom: 1px; height: 12px; font-size: 0.9em; }
            .compact-arena-v2 .stat-label { font-weight: normal; min-width: 25px; color: #aaa; margin-right: 4px; font-size: 0.9em; }
            .compact-arena-v2 .stat-values { min-width: 45px; text-align: left; margin-right: 4px; color: #ddd; font-size: 0.9em; }
            .compact-arena-v2 .stat-bar { flex-grow: 1; height: 7px; background-color: #5a2020; border-radius: 2px; border: 1px solid #3f1717; overflow: hidden; }
            .compact-arena-v2 .hp-bar-inner { background-color: #208020; }
            .compact-arena-v2 .mp-bar { background-color: #1a2a5a; } .compact-arena-v2 .mp-bar-inner { background-color: #5070dd; }
            .compact-arena-v2 .action-bar { background-color: #604000; } .compact-arena-v2 .action-bar-inner { background-color: #dd9500; }
            .compact-arena-v2 .stat-bar-inner { height: 100%; border-radius: 1px; transition: width 0.1s linear; }

            .compact-arena-v2 .arena-combat-log-v2 { height: 70px; background-color: #282828; border: 1px solid #404040; border-radius: 4px; padding: 5px; overflow-y: auto; margin-bottom: 5px; font-size: 0.75em; line-height: 1.25; }
            .compact-arena-v2 .arena-combat-log-v2 p { margin: 0 0 2px 0; }
            .compact-arena-v2 .arena-action-buttons-v2 { text-align: center; padding-top: 5px; border-top: 1px solid #444;}
            .compact-arena-v2 .arena-button-v2 { padding: 6px 12px; margin: 3px; font-size: 0.9em; background-color: #6a5a4a; color: #e0e0e0; border: 1px solid #8c7b6a; border-radius: 3px; cursor: pointer; }
            .compact-arena-v2 .arena-button-v2:hover:not(:disabled) { background-color: #7a6a5a; }
            .compact-arena-v2 .arena-button-v2:disabled { background-color: #4f4f4f; color: #777; cursor: not-allowed; }
        `;
    },

    updateDisplay: function() {
        if (this.elements.playerGoldDisplay) this.elements.playerGoldDisplay.textContent = this.sharedData.totalCoins || 0;
        if (this.elements.arenaMessageDisplay) this.elements.arenaMessageDisplay.textContent = this.localState.message;
        if (this.elements.roundInfoDisplay) {
            if (this.localState.isCombatActive) {
                 this.elements.roundInfoDisplay.textContent = `Round ${this.localState.currentRound} - FIGHT!`;
            } else if (this.localState.selectedChampion) {
                if (this.localState.currentRound > this.config.totalRounds) {
                    this.elements.roundInfoDisplay.textContent = "Arena Cleared!";
                } else if (this.localState.selectedChampion.hp.current <= 0) {
                    this.elements.roundInfoDisplay.textContent = "Champion Defeated. Select another.";
                }
                else {
                    this.elements.roundInfoDisplay.textContent = `Arena Round: ${this.localState.currentRound} / ${this.config.totalRounds}`;
                }
            } else {
                 this.elements.roundInfoDisplay.textContent = "Select a Champion";
            }
        }
        this.renderRosterList();
        this.renderChampionCard();
        this.renderOpponentCard(); 
        this.updateActionButtons();
    },

    renderRosterList: function() { /* ... (same as before) ... */ 
        if (!this.elements.rosterDisplay) return;
        this.elements.rosterDisplay.innerHTML = '';
        const livingChampions = this.localState.playerRoster.filter(p => p.hp && p.hp.current > 0);

        if (livingChampions.length === 0) {
            this.elements.rosterDisplay.innerHTML = '<p style="text-align:center; font-size:0.9em;">No available champions.</p>';
            return;
        }
        livingChampions.forEach(pawn => {
            const div = document.createElement('div');
            div.className = 'arena-list-item';
            if (pawn.id === this.localState.selectedChampionId) {
                div.classList.add('selected');
            }
            div.textContent = `${pawn.name} (Lvl ${pawn.level} ${pawn.class} | HP: ${pawn.hp.current}/${pawn.hp.max})`;
            div.dataset.pawnId = pawn.id;
            div.onclick = () => this.selectChampion(pawn.id);
            this.elements.rosterDisplay.appendChild(div);
        });
    },

    renderCombatantCard: function(containerElement, combatant, isChampion) {
        if (!containerElement) return;
        if (!combatant) {
            containerElement.innerHTML = isChampion ? '<p style="text-align:center;">Select champion</p>' : '<p style="text-align:center;">Waiting...</p>';
            return;
        }

        const standardActionCost = (window.CombatProcessorGame && window.CombatProcessorGame.config && window.CombatProcessorGame.config.STANDARD_ACTION_COST) 
                                  ? window.CombatProcessorGame.config.STANDARD_ACTION_COST 
                                  : this.config.STANDARD_ACTION_COST_FALLBACK;
        const actionProgress = combatant.actionProgress || 0;
        const actionPercent = Math.min(100, (actionProgress / standardActionCost) * 100);
        
        let maxHpForDisplay = 0;
        if (isChampion && combatant.hp) maxHpForDisplay = combatant.hp.max;
        else if (!isChampion && combatant.baseStats) maxHpForDisplay = combatant.baseStats.hp;
        else maxHpForDisplay = combatant.currentHP > 0 ? combatant.currentHP : 10; // Fallback

        const hpPercent = maxHpForDisplay > 0 ? (Math.max(0, combatant.currentHP) / maxHpForDisplay) * 100 : 0;
        
        let mpHtml = '';
        if (isChampion && combatant.mp && combatant.mp.max > 0) {
            const mpPercent = combatant.mp.max > 0 ? (Math.max(0, combatant.mp.current || 0) / combatant.mp.max) * 100 : 0;
            mpHtml = `
                <div class="stat-line">
                    <span class="stat-label">MP:</span>
                    <span class="stat-values">${combatant.mp.current || 0}/${combatant.mp.max}</span>
                    <div class="mp-bar stat-bar"><div class="stat-bar-inner mp-bar-inner" style="width: ${mpPercent}%;"></div></div>
                </div>`;
        }
        
        containerElement.innerHTML = `
            <h4>${combatant.name} ${combatant.isPlayerCharacter ? `(Lvl ${combatant.level} ${combatant.class})` : ''}</h4>
            <div class="stat-line">
                <span class="stat-label">HP:</span>
                <span class="stat-values">${combatant.currentHP}/${maxHpForDisplay}</span>
                <div class="hp-bar stat-bar"><div class="stat-bar-inner hp-bar-inner" style="width: ${hpPercent}%;"></div></div>
            </div>
            ${mpHtml}
            <div class="stat-line">
                <span class="stat-label">AP:</span>
                <span class="stat-values">${actionProgress}/${standardActionCost}</span>
                <div class="action-bar stat-bar"><div class="stat-bar-inner action-bar-inner" style="width: ${actionPercent}%;"></div></div>
            </div>
            <p>ATK: ${combatant.attackBonus !== undefined ? combatant.attackBonus : (combatant.baseStats ? combatant.baseStats.attack : 'N/A')} | AC: ${combatant.armorClass !== undefined ? combatant.armorClass : (combatant.baseStats ? combatant.baseStats.defense : 'N/A')}</p>
            ${!combatant.isPlayerCharacter && combatant.abilities ? `<p style="font-size:0.8em;">Abilities: ${combatant.abilities.join(', ')}</p>` : ''}
        `;
        if (combatant.currentHP <= 0) {
            containerElement.classList.add('defeated');
        } else {
            containerElement.classList.remove('defeated');
        }
    },

    renderChampionCard: function() { this.renderCombatantCard(this.elements.championDisplay, this.localState.selectedChampion, true); },
    renderOpponentCard: function() { this.renderCombatantCard(this.elements.opponentDisplay, this.localState.currentOpponent, false); },

    selectChampion: function(pawnId) { /* ... (same as before) ... */ 
        if (this.localState.isCombatActive) {
            this.logArenaMessage("Cannot change champion during combat!", "error");
            return;
        }
        this.localState.selectedChampionId = pawnId;
        this.localState.selectedChampion = JSON.parse(JSON.stringify(this.localState.playerRoster.find(p => p.id === pawnId))); 
        this.localState.currentRound = 1; 
        this.localState.currentOpponent = null; 
        this.logArenaMessage(`${this.localState.selectedChampion.name} has been selected! Ready for Round ${this.localState.currentRound}.`);
        this.updateDisplay();
    },

    startNextRound: function() { /* ... (same as before) ... */ 
        if (!this.localState.selectedChampion) {
            this.logArenaMessage("Please select a champion first!", "error");
            return;
        }
        if (this.localState.isCombatActive) {
            this.logArenaMessage("Combat is already in progress!", "info");
            return;
        }
        if (this.localState.selectedChampion.hp.current <= 0) {
             this.logArenaMessage(`${this.localState.selectedChampion.name} is defeated and cannot fight. Select another champion or leave.`, "error");
             this.localState.selectedChampion = null; 
             this.localState.selectedChampionId = null;
             this.updateDisplay();
             return;
        }

        if (this.elements.combatLogDisplay) { 
            this.elements.combatLogDisplay.innerHTML = ''; 
        } else {
            console.error("ArenaGame: combatLogDisplay element is null in startNextRound! Cannot clear.");
        }
        this.logArenaMessage(`Preparing for Round ${this.localState.currentRound}...`, "info");

        const monsterTypeKey = this.config.opponentProgression[this.localState.currentRound - 1];
        if (!monsterTypeKey) {
            this.logArenaMessage("Error: No opponent defined for this round. You've cleared all available rounds!", "victory");
            this.updateActionButtons(); 
            return;
        }

        const monsterGenerator = window.MonsterGeneratorGame;
        if (monsterGenerator && typeof monsterGenerator.init === 'function') {
            monsterGenerator.init(null, 
                (monsterData) => {
                    if (monsterData && monsterData.generatedMonsters && monsterData.generatedMonsters.length > 0) {
                        this.localState.currentOpponent = monsterData.generatedMonsters[0]; 
                        this.logArenaMessage(`Opponent for Round ${this.localState.currentRound}: ${this.localState.currentOpponent.name}!`, "info");
                        this.updateDisplay(); 
                        this.initiateCombat();
                    } else {
                        this.logArenaMessage("Failed to generate an opponent.", "error");
                    }
                },
                (error) => {
                    this.logArenaMessage("Error generating opponent: " + error.reason, "error");
                },
                { monsterType: monsterTypeKey, count: 1 }
            );
        } else {
            this.logArenaMessage("Monster generation service unavailable.", "error");
        }
    },

    initiateCombat: function() { /* ... (same as before) ... */ 
        this.localState.isCombatActive = true;
        this.logArenaMessage(`Round ${this.localState.currentRound} - FIGHT!`, "combat"); 
        this.updateDisplay(); 

        const combatProcessor = window.CombatProcessorGame;
        if (combatProcessor && typeof combatProcessor.init === 'function') {
            this.localState.combatProcessor = combatProcessor; 
            combatProcessor.init(
                null, 
                () => { 
                    console.log("Arena: CombatProcessor initialized by ArenaGame."); 
                    this.processCombatTick(); 
                }, 
                (err) => { 
                    console.error("Arena: CombatProcessor failed to init:", err); 
                    this.logArenaMessage("Combat system error!", "error");
                    this.localState.isCombatActive = false;
                    this.updateDisplay();
                },
                {
                    playerParty: [this.localState.selectedChampion], 
                    monsterGroup: [this.localState.currentOpponent],
                    options: {
                        onTurnProcessed: this.handleTurnProcessed.bind(this),
                        onCombatEnd: this.handleArenaCombatEnd.bind(this)
                    }
                }
            );
        } else {
             console.error("ArenaGame: CombatProcessorGame module not found or invalid.");
            this.logArenaMessage("Error: Combat system unavailable.", "error");
            this.localState.isCombatActive = false;
            this.updateDisplay();
        }
    },

    processCombatTick: function() { /* ... (same as before) ... */ 
        if (!this.localState.isCombatActive || !this.localState.combatProcessor) {
            if(this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);
            return;
        }
        if (typeof this.localState.combatProcessor.processTick === 'function') {
            this.localState.combatProcessor.processTick(); 
        } else if(typeof this.localState.combatProcessor.processNextTurn === 'function'){
            console.warn("ArenaGame: Falling back to processNextTurn on combatProcessor.");
            this.localState.combatProcessor.processNextTurn();
        } else {
             console.error("ArenaGame: combatProcessor has no valid turn processing method.");
             this.logArenaMessage("Error: Combat cannot proceed.", "error");
             this.localState.isCombatActive = false; 
             if(this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);
             this.updateDisplay(); 
        }
    },

    handleTurnProcessed: function(updatedCombatants, newLogEntries, isCombatStillActive, victor) { /* ... (same as before) ... */ 
        newLogEntries.forEach(entry => this.logArenaCombatMessage(entry));

        if (updatedCombatants && updatedCombatants.length > 0) {
            const playerCombatant = updatedCombatants.find(c => c.isPlayerCharacter);
            const monsterCombatant = updatedCombatants.find(c => !c.isPlayerCharacter);

            if (playerCombatant && this.localState.selectedChampion) {
                this.localState.selectedChampion.hp.current = playerCombatant.currentHP;
                this.localState.selectedChampion.mp.current = playerCombatant.currentMP;
                this.localState.selectedChampion.actionProgress = playerCombatant.actionProgress;
            }
            if (monsterCombatant && this.localState.currentOpponent) {
                this.localState.currentOpponent.currentHP = monsterCombatant.currentHP;
                this.localState.currentOpponent.actionProgress = monsterCombatant.actionProgress;
            }
        }
        
        this.renderChampionCard();
        this.renderOpponentCard();

        if (isCombatStillActive) {
            if (this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval); 
            this.localState.combatTurnInterval = setTimeout(() => {
                this.processCombatTick();
            }, this.config.turnDelay);
        }
    },

    handleArenaCombatEnd: function(result) { /* ... (same as before) ... */ 
        this.localState.isCombatActive = false;
        if (this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);
        
        if (result.survivors) {
            const survivingChampion = result.survivors.find(s => s.isPlayerCharacter && (s.id || s.instanceId) === this.localState.selectedChampionId);
            if (survivingChampion && this.localState.selectedChampion) {
                this.localState.selectedChampion.hp.current = survivingChampion.currentHP;
                if (survivingChampion.currentMP !== undefined) {
                    this.localState.selectedChampion.mp.current = survivingChampion.currentMP;
                }
            } else if (this.localState.selectedChampion) { 
                 this.localState.selectedChampion.hp.current = 0;
            }
        }
        this.renderChampionCard(); 

        if (result.outcome === 'player') {
            const goldWon = this.config.baseGoldReward * Math.pow(this.config.goldRewardMultiplier, this.localState.currentRound - 1);
            this.sharedData.totalCoins = (this.sharedData.totalCoins || 0) + Math.floor(goldWon);
            this.logArenaMessage(`Round ${this.localState.currentRound} Won! You earned ${Math.floor(goldWon)}G.`, "victory");

            if (this.localState.selectedChampion && this.localState.currentOpponent && this.localState.currentOpponent.xpValue) {
                this.localState.selectedChampion.xp = (this.localState.selectedChampion.xp || 0) + this.localState.currentOpponent.xpValue;
                this.logArenaMessage(`${this.localState.selectedChampion.name} gained ${this.localState.currentOpponent.xpValue} XP.`, "xp");
                 if (this.localState.selectedChampion.xp >= this.localState.selectedChampion.xpToNextLevel) {
                    this.logArenaMessage(`${this.localState.selectedChampion.name} is ready to LEVEL UP! (Will occur at Inn/Rest)`, "levelup");
                }
            }

            if (result.droppedLoot && result.droppedLoot.length > 0) {
                this.logArenaMessage("Opponent's gear recovered:", "loot");
                if (!this.sharedData.playerInventory) this.sharedData.playerInventory = [];
                result.droppedLoot.forEach(item => {
                    this.logArenaMessage(`- 1x ${item.name}`, "loot"); 
                    const existingItem = this.sharedData.playerInventory.find(invItem => invItem.itemId === item.itemId);
                    if (existingItem) existingItem.quantity += 1;
                    else {
                        const newItem = JSON.parse(JSON.stringify(item));
                        newItem.quantity = 1;
                        this.sharedData.playerInventory.push(newItem);
                    }
                });
            }
            
            this.localState.currentRound++;
            if (this.localState.currentRound > this.config.totalRounds) {
                this.logArenaMessage("You are the Arena Champion! Congratulations!", "victory");
                const rosterIndex = this.sharedData.playerRoster.findIndex(p => p.id === this.localState.selectedChampionId);
                if (rosterIndex !== -1 && this.localState.selectedChampion) this.sharedData.playerRoster[rosterIndex] = JSON.parse(JSON.stringify(this.localState.selectedChampion));
            }
        } else { 
            this.logArenaMessage(`Round ${this.localState.currentRound} Lost. ${this.localState.selectedChampion.name} has been defeated.`, "defeat");
            const rosterIndex = this.sharedData.playerRoster.findIndex(p => p.id === this.localState.selectedChampionId);
            if (rosterIndex !== -1 && this.localState.selectedChampion) {
                 this.sharedData.playerRoster[rosterIndex].hp.current = 0; 
            }
            this.localState.selectedChampion = null; 
            this.localState.selectedChampionId = null;
        }
        this.updateDisplay(); 
    },

    updateActionButtons: function() { /* ... (same as before) ... */ 
        if (!this.elements.actionButtons) return;
        let html = '';
        if (this.localState.isCombatActive) {
            html = '<button class="arena-button-v2" disabled>Combat in Progress...</button>';
        } else if (!this.localState.selectedChampion) {
            html = '<p style="font-style:italic;">Select a champion from your roster to fight.</p>';
        } else if (this.localState.selectedChampion.hp.current <= 0) {
             html = '<p style="color: #ff8888;">Your champion is defeated. Select another or leave.</p>';
        } else if (this.localState.currentRound > this.config.totalRounds) {
            html = '<p style="color: #ffd700; font-weight:bold;">Arena Conquered!</p>';
        } else {
            html = `<button id="startNextRoundBtnArenaAG" class="arena-button-v2">Start Round ${this.localState.currentRound}</button>`;
        }
        html += ' <button id="exitArenaBtnAG" class="arena-button-v2 arena-exit-button-v2">Leave Arena</button>';
        this.elements.actionButtons.innerHTML = html;
        this.attachEventListenersToActionButtons(); 
    },

    attachEventListenersToActionButtons: function() { 
        const startBtn = this.container.querySelector('#startNextRoundBtnArenaAG'); 
        if (startBtn) startBtn.onclick = () => this.startNextRound();
        
        const exitBtn = this.container.querySelector('#exitArenaBtnAG'); 
        if (exitBtn) { 
            const newExitBtn = exitBtn.cloneNode(true);
            if (exitBtn.parentNode) exitBtn.parentNode.replaceChild(newExitBtn, exitBtn);
            newExitBtn.onclick = () => this.handleExitArena();
        }
    },
    
    logArenaMessage: function(message, type = "info") { 
        this.localState.message = message;
        if(this.elements.arenaMessageDisplay) {
            this.elements.arenaMessageDisplay.textContent = message;
            this.elements.arenaMessageDisplay.className = `arena-message-display-v2 arena-message-${type}`; // Use new class
        }
        console.log("ArenaLog:", message);
    },
    logArenaCombatMessage: function(message, type = "combat") { 
        if (!this.elements.combatLogDisplay) return;
        const p = document.createElement('p');
        p.textContent = message;
        p.className = type; 
        this.elements.combatLogDisplay.appendChild(p);
        this.elements.combatLogDisplay.scrollTop = this.elements.combatLogDisplay.scrollHeight;
    },
    
    handleExitArena: function() { /* ... (same as before) ... */ 
        if (this.localState.isCombatActive) {
            this.logArenaMessage("Cannot leave during active combat. Forfeit?", "error"); 
            return;
        }
        console.log("ArenaGame: Exiting Arena.");
        if (this.localState.selectedChampionId && this.localState.selectedChampion) {
            const rosterIndex = this.sharedData.playerRoster.findIndex(p => p.id === this.localState.selectedChampionId);
            if (rosterIndex !== -1) {
                this.sharedData.playerRoster[rosterIndex] = JSON.parse(JSON.stringify(this.localState.selectedChampion));
            }
        }
        this.successCallback(this.sharedData);
    },

    attachEventListeners: function() {
        // Roster item clicks are handled in renderRosterList
        this.attachEventListenersToActionButtons(); 
    },

    getRandomInt: function(min, max) { /* ... (same as before) ... */ 
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    getAttributeModifier: function(attributeValue) { /* ... (same as before) ... */ 
        return Math.floor(((attributeValue || 10) - 10) / 2);
    },

    destroy: function() { /* ... (same as before) ... */ 
        console.log("ArenaGame: Destroying...");
        if (this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);
        if (this.container) this.container.innerHTML = '';
    }
};

if (typeof window !== 'undefined') {
    window.ArenaGame = ArenaGame; 
}

