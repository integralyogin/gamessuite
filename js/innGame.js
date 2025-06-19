// js/InnGame.js
const InnGame = {
    id: 'InnGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        rooms: {
            basic: { name: "Basic Room", cost: 10, ticks: 20, description: "A simple, clean bed for the night. Offers moderate rest." },
            deluxe: { name: "Deluxe Suite", cost: 30, ticks: 60, description: "A luxurious room with a feather bed and fine amenities. Offers excellent recuperation." }
        },
        regenRates: { 
            hp: 0.01, mp: 0.03, sp: 0.02, wp: 0.03
        },
        levelUpGameId: 'LevelUpGame' // ID of the LevelUpGame module
    },

    localState: {
        message: "Welcome to The Weary Adventurer Inn! How can we help you?",
        playerParty: [], 
        levelUpQueue: [], // Queue of pawn IDs that need to level up
        isLevelingUp: false // Flag to manage UI state during level up
    },

    elements: {
        playerGoldDisplay: null,
        roomOptionsDisplay: null,
        messageDisplay: null,
        partyStatusDisplay: null,
        exitButton: null,
        // We might need a dedicated area for LevelUpGame's UI if it doesn't take over the whole container
        levelUpDisplayArea: null 
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback; 
        this.sharedData = sharedData;

        if (!this.sharedData.playerRoster) this.sharedData.playerRoster = []; 
        if (this.sharedData.totalCoins === undefined) this.sharedData.totalCoins = 0; 

        this.localState.playerParty = this.sharedData.playerRoster 
            ? JSON.parse(JSON.stringify(this.sharedData.playerRoster)).map(pawn => {
                const baseXPToNext = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.xpToNextLevelBase) 
                                    ? window.PawnGeneratorGame.config.xpToNextLevelBase 
                                    : 100; 
                return {
                    ...pawn,
                    level: pawn.level || 1,
                    xp: pawn.xp || 0,
                    xpToNextLevel: pawn.xpToNextLevel || Math.floor(baseXPToNext * Math.pow((window.RoguelikeDungeonGame ? window.RoguelikeDungeonGame.config.xpPerLevelMultiplier : 1.75), (pawn.level || 1) -1)),
                    hp: pawn.hp || { current: (pawn.derivedStats ? pawn.derivedStats.maxHP : 10), max: (pawn.derivedStats ? pawn.derivedStats.maxHP : 10) },
                    mp: pawn.mp || { current: (pawn.derivedStats ? pawn.derivedStats.maxMP : 0), max: (pawn.derivedStats ? pawn.derivedStats.maxMP : 0) },   
                    sp: pawn.sp || { current: 0, max: 0 },   
                    wp: pawn.wp || { current: 0, max: 0 }    
                };
            })
            : [];
        
        this.localState.message = "Welcome to The Weary Adventurer Inn! How can we help you?";
        this.localState.levelUpQueue = [];
        this.localState.isLevelingUp = false;

        console.log("InnGame: Initializing. SharedData:", JSON.parse(JSON.stringify(this.sharedData)));
        console.log("InnGame: Initialized localState.playerParty:", JSON.parse(JSON.stringify(this.localState.playerParty)));

        this.renderBaseLayout();
        this.cacheElements();
        this.updateDisplay();
        this.attachEventListeners();
    },

    renderBaseLayout: function() {
        this.container.innerHTML = `
            <div class="inn-game-container">
                <div class="inn-header">
                    <h1>The Weary Adventurer Inn</h1>
                    <div class="player-gold-inn">Your Gold: <span id="innPlayerGold">${this.sharedData.totalCoins}</span></div>
                </div>
                <div id="innMessageDisplay" class="inn-message">${this.localState.message}</div>
                
                <div id="innLevelUpDisplayArea" class="level-up-area" style="display:none;">
                    </div>

                <div class="inn-main-content">
                    <div id="innRoomOptions" class="room-options-container">
                        </div>
                    <div id="innPartyStatus" class="party-status-inn">
                        </div>
                </div>

                <button id="exitInnBtn" class="inn-button exit-button-inn">Leave Inn</button>
            </div>
        `;
        this.applyStyles();
        this.renderRoomOptions();
        this.renderPartyStatus(); 
    },

    cacheElements: function() {
        this.elements.playerGoldDisplay = document.getElementById('innPlayerGold');
        this.elements.roomOptionsDisplay = document.getElementById('innRoomOptions');
        this.elements.messageDisplay = document.getElementById('innMessageDisplay');
        this.elements.partyStatusDisplay = document.getElementById('innPartyStatus');
        this.elements.exitButton = document.getElementById('exitInnBtn');
        this.elements.levelUpDisplayArea = document.getElementById('innLevelUpDisplayArea');
    },

    applyStyles: function() { /* ... (Keep existing styles, add for .level-up-area if needed) ... */ 
        let style = document.getElementById('innGameStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'innGameStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .inn-game-container { display: flex; flex-direction: column; height: 100%; padding: 20px; box-sizing: border-box; font-family: 'Georgia', serif; background-color: #fdf5e6; color: #5a3e2b; }
            .inn-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 2px solid #d2b48c; margin-bottom: 15px; }
            .inn-header h1 { margin: 0; font-size: 2em; color: #8b4513; font-variant: small-caps; }
            .player-gold-inn { font-size: 1.2em; font-weight: bold; }
            .inn-message { padding: 12px; margin-bottom: 20px; background-color: #fff8e1; border: 1px solid #ffe0b2; border-radius: 5px; text-align: center; font-size: 1.1em; min-height: 1.5em; }
            .level-up-area { margin-bottom: 15px; padding: 10px; background-color: #e8e4d9; border-radius: 5px; }
            .inn-main-content { display: flex; flex-grow: 1; gap: 20px; overflow: hidden; }
            .room-options-container { flex: 1; display: flex; flex-direction: column; gap: 15px; }
            .room-option-card { background-color: #fffaf0; border: 1px solid #e0dcd1; border-radius: 8px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .room-option-card h3 { margin-top: 0; margin-bottom: 10px; color: #7a5230; }
            .room-option-card p { margin: 5px 0; font-size: 0.95em; }
            .room-option-card .room-cost { font-weight: bold; color: #b8860b; font-size: 1.1em; margin-top:10px;}
            .party-status-inn { flex: 1; background-color: #faf0e6; border-left: 1px solid #d2b48c; padding: 15px; overflow-y: auto; }
            .party-status-inn h3 { text-align:center; margin-top:0; color: #8b4513;}
            .party-member-inn-status { font-size: 0.9em; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px dotted #d2b48c;}
            .party-member-inn-status:last-child { border-bottom: none; }
            .inn-button { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease; background-color: #b08d57; color: white; margin-top: 10px; }
            .inn-button.rest-button { background-color: #5f9ea0; width: 100%;}
            .inn-button.exit-button-inn { background-color: #a0522d; width: 100%; margin-top: 20px; }
            .inn-button:hover:not(:disabled) { filter: brightness(115%); }
            .inn-button:disabled { background-color: #cccccc; color: #888888; cursor: not-allowed; }
        `;
    },

    renderRoomOptions: function() { /* ... (same as before) ... */ 
        if (!this.elements.roomOptionsDisplay) return;
        this.elements.roomOptionsDisplay.innerHTML = '';
        for (const roomKey in this.config.rooms) {
            const room = this.config.rooms[roomKey];
            const card = document.createElement('div');
            card.className = 'room-option-card';
            card.innerHTML = `
                <h3>${room.name}</h3>
                <p>${room.description}</p>
                <p class="room-cost">Cost: ${room.cost} Gold</p>
                <button class="inn-button rest-button" data-room-key="${roomKey}" ${ (this.sharedData.totalCoins || 0) < room.cost || this.localState.isLevelingUp ? 'disabled' : ''}>Rest Here</button>
            `;
            this.elements.roomOptionsDisplay.appendChild(card);
        }
    },
    
    renderPartyStatus: function() { /* ... (same as before) ... */ 
        if (!this.elements.partyStatusDisplay) return;
        let html = '<h3>Party Status</h3>';
        if (!this.localState.playerParty || this.localState.playerParty.length === 0) {
            html += '<p>No party members.</p>';
        } else {
            this.localState.playerParty.forEach(pawn => {
                const name = pawn.name || "Unknown Hero";
                const level = pawn.level || 1;
                const className = pawn.class || "Adventurer";
                const hpCurrent = (pawn.hp && pawn.hp.current !== undefined) ? pawn.hp.current : "N/A";
                const hpMax = (pawn.hp && pawn.hp.max !== undefined) ? pawn.hp.max : "N/A";
                const mpCurrent = (pawn.mp && pawn.mp.current !== undefined) ? pawn.mp.current : "N/A";
                const mpMax = (pawn.mp && pawn.mp.max !== undefined) ? pawn.mp.max : "N/A";
                const spCurrent = (pawn.sp && pawn.sp.current !== undefined) ? pawn.sp.current : "N/A";
                const spMax = (pawn.sp && pawn.sp.max !== undefined) ? pawn.sp.max : "N/A";
                const wpCurrent = (pawn.wp && pawn.wp.current !== undefined) ? pawn.wp.current : "N/A";
                const wpMax = (pawn.wp && pawn.wp.max !== undefined) ? pawn.wp.max : "N/A";
                const xp = pawn.xp || 0;
                const xpToNext = pawn.xpToNextLevel || "N/A";

                html += `<div class="party-member-inn-status">
                            <strong>${name}</strong> (Lvl ${level} ${className}) ${xp >= xpToNext ? '<strong style="color:gold;">(LEVEL UP!)</strong>' : ''}<br>
                            HP: ${hpCurrent}/${hpMax}
                            ${(pawn.mp && pawn.mp.max > 0) || mpCurrent !== "N/A" ? `| MP: ${mpCurrent}/${mpMax}` : ''}
                            ${(pawn.sp && pawn.sp.max > 0) || spCurrent !== "N/A" ? `| SP: ${spCurrent}/${spMax}` : ''}
                            ${(pawn.wp && pawn.wp.max > 0) || wpCurrent !== "N/A" ? `| WP: ${wpCurrent}/${wpMax}` : ''}
                            <br>XP: ${xp}/${xpToNext}
                         </div>`;
            });
        }
        this.elements.partyStatusDisplay.innerHTML = html;
    },

    updateDisplay: function() {
        if (this.elements.playerGoldDisplay) {
            this.elements.playerGoldDisplay.textContent = this.sharedData.totalCoins || 0;
        }
        if (this.elements.messageDisplay) {
            this.elements.messageDisplay.textContent = this.localState.message;
            if (this.localState.message.toLowerCase().includes("error") || this.localState.message.toLowerCase().includes("not enough")) {
                this.elements.messageDisplay.style.color = "#c0392b"; 
            } else if (this.localState.message.toLowerCase().includes("rested") || this.localState.message.toLowerCase().includes("refreshed") || this.localState.message.toLowerCase().includes("spent") || this.localState.message.toLowerCase().includes("leveled up")) {
                this.elements.messageDisplay.style.color = "#27ae60"; 
            } else {
                this.elements.messageDisplay.style.color = "#5a3e2b"; 
            }
        }
        this.renderRoomOptions(); 
        this.renderPartyStatus();
    },

    handleRest: function(roomKey) {
        const room = this.config.rooms[roomKey];
        if (!room) {
            this.logMessage("Error: Selected room does not exist.", "error");
            return;
        }
        if ((this.sharedData.totalCoins || 0) < room.cost) {
            this.logMessage(`Not enough gold for the ${room.name}. You need ${room.cost}G.`, "error");
            return;
        }

        this.sharedData.totalCoins -= room.cost;
        this.logMessage(`Spent ${room.cost}G for the ${room.name}. The party rests...`, "success", false); 

        if (!this.localState.playerParty || this.localState.playerParty.length === 0) {
            this.logMessage("No one in the party to rest!", "info"); 
            return;
        }

        this.localState.playerParty.forEach(pawn => {
            pawn.hp = pawn.hp || { current: 0, max: 0 };
            pawn.mp = pawn.mp || { current: 0, max: 0 };
            pawn.sp = pawn.sp || { current: 0, max: 0 };
            pawn.wp = pawn.wp || { current: 0, max: 0 };

            for (let i = 0; i < room.ticks; i++) {
                if (pawn.hp.current < pawn.hp.max) {
                    pawn.hp.current = Math.min(pawn.hp.max, pawn.hp.current + Math.ceil(pawn.hp.max * this.config.regenRates.hp));
                }
                if (pawn.mp.max > 0 && pawn.mp.current < pawn.mp.max) {
                    pawn.mp.current = Math.min(pawn.mp.max, pawn.mp.current + Math.ceil(pawn.mp.max * this.config.regenRates.mp));
                }
                if (pawn.sp.max > 0 && pawn.sp.current < pawn.sp.max) {
                    pawn.sp.current = Math.min(pawn.sp.max, pawn.sp.current + Math.ceil(pawn.sp.max * this.config.regenRates.sp));
                }
                if (pawn.wp.max > 0 && pawn.wp.current < pawn.wp.max) {
                    pawn.wp.current = Math.min(pawn.wp.max, pawn.wp.current + Math.ceil(pawn.wp.max * this.config.regenRates.wp));
                }
            }
        });
        
        this.logMessage(`The party feels well-rested after staying in the ${room.name}.`, "success", false); 
        this.sharedData.playerRoster = JSON.parse(JSON.stringify(this.localState.playerParty)); 
        this.updateDisplay(); // Update display after basic rest

        // Now check for level ups
        this.localState.levelUpQueue = this.localState.playerParty
            .filter(p => (p.xp || 0) >= (p.xpToNextLevel || Infinity))
            .map(p => p.id); // Queue IDs of pawns ready to level up

        if (this.localState.levelUpQueue.length > 0) {
            this.processLevelUpQueue();
        } else {
            this.logMessage("Everyone is rested and ready for adventure!", "success"); // Final message if no level ups
        }
    },

    processLevelUpQueue: function() {
        if (this.localState.levelUpQueue.length === 0) {
            this.localState.isLevelingUp = false;
            this.elements.levelUpDisplayArea.style.display = 'none';
            this.elements.levelUpDisplayArea.innerHTML = ''; // Clear level up area
            this.logMessage("All level-ups processed. Party is fully rested!", "success");
            this.renderRoomOptions(); // Re-enable rest buttons
            this.renderPartyStatus(); // Final party status
            return;
        }

        this.localState.isLevelingUp = true;
        this.renderRoomOptions(); // Disable rest buttons during level up

        const pawnIdToLevelUp = this.localState.levelUpQueue[0]; // Get the first pawn ID from the queue
        const pawn = this.localState.playerParty.find(p => p.id === pawnIdToLevelUp);

        if (!pawn) {
            console.error("InnGame: Pawn to level up not found in localState.playerParty:", pawnIdToLevelUp);
            this.localState.levelUpQueue.shift(); // Remove problematic ID
            this.processLevelUpQueue(); // Try next
            return;
        }
        
        this.logMessage(`Processing level up for ${pawn.name}...`, "info", false);
        this.elements.levelUpDisplayArea.style.display = 'block'; // Show level up area

        const levelUpGame = window.LevelUpGame;
        if (levelUpGame && typeof levelUpGame.init === 'function') {
            levelUpGame.init(
                this.elements.levelUpDisplayArea, // LevelUpGame will render its UI here
                (levelUpResult) => { // Success callback for LevelUpGame
                    if (levelUpResult && levelUpResult.leveledUpPawn) {
                        const updatedPawn = levelUpResult.leveledUpPawn;
                        // Update the pawn in our localState.playerParty
                        const pawnIndex = this.localState.playerParty.findIndex(p => p.id === updatedPawn.id);
                        if (pawnIndex !== -1) {
                            this.localState.playerParty[pawnIndex] = updatedPawn;
                        }
                        this.logMessage(`${updatedPawn.name} has successfully leveled up to ${updatedPawn.level}!`, "success", false);
                    }
                    this.localState.levelUpQueue.shift(); // Remove processed pawn from queue
                    this.processLevelUpQueue(); // Process next pawn
                },
                (errorData) => { // Failure callback for LevelUpGame
                    console.error(`InnGame: LevelUpGame failed for ${pawn.name}:`, errorData);
                    this.logMessage(`Level up failed for ${pawn.name}: ${errorData.reason || 'Unknown error'}.`, "error", false);
                    this.localState.levelUpQueue.shift(); // Remove pawn from queue even on failure
                    this.processLevelUpQueue(); // Process next pawn
                },
                { pawnToLevelUp: pawn } // Pass the specific pawn to LevelUpGame
            );
        } else {
            console.error("InnGame: LevelUpGame module not found or invalid.");
            this.logMessage("Error: Level up service unavailable.", "error", false);
            this.localState.levelUpQueue.shift(); // Skip this pawn
            this.processLevelUpQueue(); // Try next
        }
    },

    logMessage: function(message, type = "info", updateImmediately = true) { /* ... (same as before) ... */ 
        this.localState.message = message;
        if (this.elements.messageDisplay) {
            this.elements.messageDisplay.textContent = message;
            if (type === "error") this.elements.messageDisplay.style.color = "#c0392b"; 
            else if (type === "success") this.elements.messageDisplay.style.color = "#27ae60";
            else this.elements.messageDisplay.style.color = "#5a3e2b"; 
        }
        // console.log("InnLog:", message); // Keep for debugging if needed
        if (updateImmediately) this.updateDisplay();
    },

    attachEventListeners: function() {
        if (this.elements.roomOptionsDisplay) {
            this.elements.roomOptionsDisplay.addEventListener('click', (event) => {
                if (event.target.classList.contains('rest-button') && !event.target.disabled) {
                    const roomKey = event.target.dataset.roomKey;
                    this.handleRest(roomKey);
                }
            });
        }

        if (this.elements.exitButton) {
            this.elements.exitButton.onclick = () => {
                if (this.localState.isLevelingUp) {
                    this.logMessage("Please wait for level-ups to complete or acknowledge them.", "error");
                    return;
                }
                this.sharedData.playerRoster = JSON.parse(JSON.stringify(this.localState.playerParty));
                console.log("InnGame: Exiting. Final sharedData:", JSON.parse(JSON.stringify(this.sharedData)));
                this.successCallback(this.sharedData);
            };
        }
    },

    destroy: function() {
        console.log("InnGame: Destroying...");
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};

if (typeof window !== 'undefined') {
    window.InnGame = InnGame; 
}

