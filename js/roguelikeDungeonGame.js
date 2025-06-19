// js/RoguelikeDungeonGame.js
"use strict";

const RoguelikeDungeonGame = {
    id: 'RoguelikeDungeonGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    DOM_IDS: { /* ... (same as before) ... */
        loadingOverlay: 'dungeonLoadingOverlayRDG',
        floorTitle: 'dungeonFloorTitleRDG',
        playerGold: 'dungeonPlayerGoldRDG',
        partyDisplay: 'partyDisplayRDG',
        monsterDisplay: 'monsterDisplayRDG',
        messageLog: 'dungeonMessageLogRDG',
        actionButtons: 'dungeonActionButtonsRDG',
        styleTag: 'roguelikeDungeonGameStyle'
    },

    config: { /* ... (same as before) ... */
        maxAutoDescendFloor: 10,
        floorEncounters: [
            { message: "A narrow passage opens into a small, damp cave. You spot some movement.", possibleEncounters: [ { type: null, minCount: 0, maxCount: 0, note: "Empty Room" }, { type: null, minCount: 0, maxCount: 0, note: "Empty Room" },{ type: "SINGLE_CAVE_RAT", minCount: 1, maxCount: 1 }]},
            { message: "The air is still. You hear a faint skittering nearby.", possibleEncounters: [ { type: "SINGLE_CAVE_RAT", minCount: 1, maxCount: 2 } ]},
            { message: "This small cavern feels eerily silent, but you sense a draft from deeper within.", possibleEncounters: [ { type: null, minCount: 0, maxCount: 0, note: "Empty Room" }, { type: "SINGLE_CAVE_RAT", minCount: 2, maxCount: 3 }, { type: "GIANT_BAT", minCount: 1, maxCount: 1 }]},
            { message: "The dungeon path widens slightly. You hear the chattering of small, cowardly creatures.", possibleEncounters: [{ type: "KOBOLD_SKIRMISHER", minCount: 1, maxCount: 2 },{ type: "GIANT_BAT", minCount: 1, maxCount: 2 }]},
            { message: "A crudely fortified chamber lies ahead, guarded by goblinoids.", possibleEncounters: [{ type: "GOBLIN_CUTTER", minCount: 1, maxCount: 2 },{ type: "KOBOLD_SKIRMISHER", minCount: 2, maxCount: 3 }]},
            { message: "A foul stench assaults your nostrils. Bones litter the floor, and you hear a guttural growl.", possibleEncounters: [{ type: "CAVE_RAT_SWARM", minCount: 1, maxCount: 1 },{ type: "GOBLIN_CUTTER", minCount: 2, maxCount: 3 }]},
            { message: "Thick cobwebs hang from the ceiling, and you feel multiple eyes upon you.", possibleEncounters: [{ type: "GIANT_SPIDER", minCount: 1, maxCount: 1 }, { type: "SKELETON_GUARD", minCount: 1, maxCount: 2 }]},
            { message: "War drums echo faintly. This area looks like an Orcish outpost.", possibleEncounters: [{ type: "ORC_RAIDER", minCount: 1, maxCount: 2 },{ type: "GOBLIN_CUTTER", minCount: 1, maxCount: 3, note: "Orc's lackeys" }]},
            { message: "The architecture here is more disciplined, and heavily guarded by hobgoblins.", possibleEncounters: [{ type: "HOBGOBLIN_SOLDIER", minCount: 1, maxCount: 2 },{ type: "ORC_RAIDER", minCount: 1, maxCount: 1 }]},
            { message: "A chilling howl echoes from the darkness ahead. Unnatural shadows dance around a larger threat.", possibleEncounters: [{ type: "SHADOW_MASTIFF", minCount: 1, maxCount: 1 },{ type: "HOBGOBLIN_SOLDIER", minCount: 1, maxCount: 2 }]}
        ],
        turnDelay: 500,
        xpPerLevelMultiplier: 1.75,
        postCombatHealHPLimit: 0.90
    },

    localState: { /* ... (same as before) ... */
        playerParty: [],
        currentEncounter: [],
        isLoadingMonster: false,
        floorNumber: 1,
        isCombatActive: false,
        combatProcessor: null,
        combatTurnInterval: null
    },

    elements: { /* ... (same as before) ... */
        partyDisplay: null,
        monsterDisplay: null,
        messageLog: null,
        actionButtons: null,
        loadingOverlay: null,
        floorTitle: null,
        playerGoldDisplay: null
    },

    _createPawnForDungeon: function(pawnData) { /* ... (same as before) ... */
        const baseXPToNext = window.PawnGeneratorGame?.config?.xpToNextLevelBase ?? 100;
        const level = pawnData.level ?? 1;
        const derivedMaxHP = pawnData.derivedStats?.maxHP ?? 10;
        const derivedMaxMP = pawnData.derivedStats?.maxMP ?? 0;

        return {
            ...pawnData,
            level: level,
            xp: pawnData.xp ?? 0,
            xpToNextLevel: pawnData.xpToNextLevel ?? Math.floor(baseXPToNext * Math.pow(this.config.xpPerLevelMultiplier, level - 1)),
            hp: { current: pawnData.hp?.current ?? derivedMaxHP, max: pawnData.hp?.max ?? derivedMaxHP },
            mp: { current: pawnData.mp?.current ?? derivedMaxMP, max: pawnData.mp?.max ?? derivedMaxMP },
            skills: Array.isArray(pawnData.skills) ? pawnData.skills : [],
            actionProgress: pawnData.actionProgress ?? 0,
            instanceId: pawnData.instanceId || pawnData.id || `pawn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };
    },

    init: function(container, successCallback, failureCallback, sharedData) { /* ... (same as before) ... */
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        this.localState.playerParty = this.sharedData.playerRoster
            ? JSON.parse(JSON.stringify(this.sharedData.playerRoster)).map(pawn => this._createPawnForDungeon(pawn))
            : [];

        this.localState.currentEncounter = [];
        this.localState.floorNumber = this.sharedData.currentDungeonFloor ?? 1;
        this.localState.isCombatActive = false;
        if (this.localState.combatTurnInterval) {
            clearTimeout(this.localState.combatTurnInterval);
            this.localState.combatTurnInterval = null;
        }

        this.renderBaseLayout();
        this.cacheElements();
        this.updateHeaderDisplay();
        this.displayParty();

        if (this.localState.playerParty.length === 0) {
            this.logMessage("Your party is empty! You should visit the Heroes' Guild first.", "error");
            this.elements.actionButtons.innerHTML = `<button id="leaveDungeonBtnRDG_empty" class="dungeon-button">Leave Dungeon</button>`;
            this.attachLeaveButtonListener();
            return;
        }
        this.triggerMonsterGeneration();
    },

    renderBaseLayout: function() { /* ... (same as before) ... */
        this.container.innerHTML = `
            <div class="roguelike-dungeon-game">
                <div id="${this.DOM_IDS.loadingOverlay}" class="dungeon-loading-overlay" style="display: none;"><p>Delving Deeper...</p></div>
                <div class="dungeon-header">
                    <h2 id="${this.DOM_IDS.floorTitle}">Dungeon Floor ${this.localState.floorNumber}</h2>
                    <div id="${this.DOM_IDS.playerGold}">Gold: ${this.sharedData.totalCoins ?? 0}</div>
                </div>
                <div class="dungeon-main-content">
                    <div class="party-area">
                        <h3>Your Party</h3>
                        <div id="${this.DOM_IDS.partyDisplay}" class="character-cards-container"></div>
                    </div>
                    <div class="encounter-area">
                        <h3>Encounter</h3>
                        <div id="${this.DOM_IDS.monsterDisplay}" class="character-cards-container"></div>
                    </div>
                </div>
                <div id="${this.DOM_IDS.messageLog}" class="message-log"></div>
                <div id="${this.DOM_IDS.actionButtons}" class="action-buttons">
                    <button id="leaveDungeonBtnRDG_initial" class="dungeon-button" disabled>Prepare for battle...</button>
                </div>
            </div>`;
        this.applyStyles();
        this.logMessage(`You enter Floor ${this.localState.floorNumber} of the gloomy dungeon...`, "info");
    },

    cacheElements: function() { /* ... (same as before) ... */
        this.elements.partyDisplay = document.getElementById(this.DOM_IDS.partyDisplay);
        this.elements.monsterDisplay = document.getElementById(this.DOM_IDS.monsterDisplay);
        this.elements.messageLog = document.getElementById(this.DOM_IDS.messageLog);
        this.elements.actionButtons = document.getElementById(this.DOM_IDS.actionButtons);
        this.elements.loadingOverlay = document.getElementById(this.DOM_IDS.loadingOverlay);
        this.elements.floorTitle = document.getElementById(this.DOM_IDS.floorTitle);
        this.elements.playerGoldDisplay = document.getElementById(this.DOM_IDS.playerGold);
    },

    updateHeaderDisplay: function() { /* ... (same as before) ... */
        if (this.elements.floorTitle) this.elements.floorTitle.textContent = `Dungeon Floor ${this.localState.floorNumber}`;
        if (this.elements.playerGoldDisplay) this.elements.playerGoldDisplay.textContent = `Gold: ${this.sharedData.totalCoins ?? 0}`;
    },

    applyStyles: function() { /* ... (same as before, CSS content unchanged) ... */
        let style = document.getElementById(this.DOM_IDS.styleTag);
        if (!style) {
            style = document.createElement('style');
            style.id = this.DOM_IDS.styleTag;
            document.head.appendChild(style);
        }
        style.textContent = `
            .roguelike-dungeon-game { display: flex; flex-direction: column; height: 100%; padding: 10px; box-sizing: border-box; font-family: 'Georgia', serif; background-color: #2c1f2b; color: #dacdcc; position: relative; }
            .dungeon-loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); color: white; display: flex; justify-content: center; align-items: center; font-size: 1.6em; z-index: 100;}
            .dungeon-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #4a3b49; margin-bottom: 10px; color: #e6c3a1; }
            .dungeon-header h2 { margin: 0; font-size: 1.5em; }
            #${this.DOM_IDS.playerGold} { font-size: 1em; }
            .dungeon-main-content { display: flex; flex-grow: 1; gap: 10px; overflow: hidden; margin-bottom: 10px; }
            .party-area, .encounter-area { flex: 1; background-color: #382c37; padding: 8px; border-radius: 6px; border: 1px solid #50404f; display: flex; flex-direction: column; }
            .party-area h3, .encounter-area h3 { text-align: center; margin-top: 0; margin-bottom: 8px; color: #b0a09f; border-bottom: 1px solid #50404f; padding-bottom: 4px; font-size: 1.1em;}
            .character-cards-container { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; flex-grow: 1; padding-right: 4px; }
            .character-card, .monster-card { background-color: #453a44; border: 1px solid #5a4a59; border-radius: 4px; padding: 6px; font-size: 0.85em; margin-bottom: 4px; transition: opacity 0.3s ease, background-color 0.3s ease; }
            .character-card.defeated, .monster-card.defeated { opacity: 0.4; background-color: #252025; border-color: #302830; }
            .character-card.defeated h4, .monster-card.defeated h4 { text-decoration: line-through; color: #777; }
            .character-card h4, .monster-card h4 { margin: 0 0 4px 0; color: #e6c3a1; font-size: 1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .character-card p, .monster-card p { margin: 1px 0; font-size: 0.85em; line-height: 1.2; }
            .stat-line { display: flex; align-items: center; margin-bottom: 2px; height: 14px; }
            .stat-label { font-weight: bold; min-width: 30px; font-size: 0.8em; margin-right: 3px; }
            .stat-values { min-width: 50px; text-align: right; margin-right: 3px; font-size: 0.8em; }
            .stat-bar { flex-grow: 1; height: 8px; background-color: #732020; border-radius: 2px; border: 1px solid #4f1717; overflow: hidden; }
            .hp-bar-inner { background-color: #20a020; height: 100%; border-radius: 1px; transition: width 0.3s ease-out; }
            .mp-bar { background-color: #2a3a7a; height: 6px;} .mp-bar-inner { background-color: #6080ff; height: 100%; border-radius: 1px; }
            .xp-bar { background-color: #404070; height: 6px;} .xp-bar-inner { background-color: #8080ff; height: 100%; border-radius: 1px; }
            .action-bar { background-color: #705000; height: 6px;} .action-bar-inner { background-color: #ffa500; height: 100%; border-radius: 1px; transition: width 0.1s linear; }
            .monster-card .hp-value { font-weight: bold; color: #ffdddd; }
            .message-log { height: 100px; background-color: #1e1a1d; border: 1px solid #4a3b49; border-radius: 4px; padding: 8px; overflow-y: auto; margin-bottom: 10px; font-size: 0.9em; line-height: 1.3; }
            .message-log p { margin: 0 0 4px 0; }
            .message-log .error { color: #ff6b6b; font-weight: bold; }
            .message-log .info { color: #87ceeb; }
            .message-log .combat { color: #ffd700; }
            .message-log .victory { color: #90ee90; font-weight: bold; }
            .message-log .defeat { color: #ff7f7f; font-weight: bold; }
            .message-log .loot { color: #c0c0c0; font-style: italic; }
            .message-log .xp { color: #add8e6; }
            .message-log .levelup { color: #ffb732; font-weight: bold; animation: flash 0.5s 3; }
            .message-log .heal { color: #98fb98; }
            @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            .action-buttons { text-align: center; padding-top: 8px; border-top: 1px solid #4a3b49;}
            .dungeon-button { padding: 8px 15px; margin: 4px; font-size: 0.9em; background-color: #6a5269; color: #e0c8df; border: 1px solid #80627e; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; }
            .dungeon-button:hover:not(:disabled) { background-color: #806a7e; }
            .dungeon-button:disabled { background-color: #40323f; color: #776276; cursor: not-allowed;}
        `;
    },

    logMessage: function(message, type = "info") { /* ... (same as before) ... */
        if (!this.elements.messageLog) return;
        const p = document.createElement('p');
        p.textContent = message;
        p.className = type;
        this.elements.messageLog.appendChild(p);
        this.elements.messageLog.scrollTop = this.elements.messageLog.scrollHeight;
    },

    showLoading: function(show, message = "Loading...") { /* ... (same as before) ... */
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
            if(show && this.elements.loadingOverlay.querySelector('p')) {
                this.elements.loadingOverlay.querySelector('p').textContent = message;
            }
        }
    },

    displayParty: function() { /* ... (same as before) ... */
        if (!this.elements.partyDisplay) return;
        this.elements.partyDisplay.innerHTML = '';
        if (this.localState.playerParty.length === 0 && !this.localState.isCombatActive) {
            this.elements.partyDisplay.innerHTML = '<p>Party is empty.</p>';
            return;
        }
        const standardActionCost = window.CombatProcessorGame?.config?.STANDARD_ACTION_COST ?? 1000;

        this.localState.playerParty.forEach(member => {
            if (!member || typeof member.hp?.current === 'undefined' || typeof member.hp?.max === 'undefined') {
                console.warn("Skipping rendering party member due to missing hp data:", member); return;
            }
            const card = document.createElement('div');
            card.className = 'character-card';
            if (member.hp.current <= 0) card.classList.add('defeated');
            
            const hpPercent = member.hp.max > 0 ? (Math.max(0, member.hp.current) / member.hp.max) * 100 : 0;
            const xpPercent = (member.xpToNextLevel > 0) ? ((member.xp ?? 0) / member.xpToNextLevel) * 100 : 0;
            const mpPercent = (member.mp?.max > 0) ? (Math.max(0, member.mp.current ?? 0) / member.mp.max) * 100 : 0;
            const actionPercent = ((member.actionProgress ?? 0) / standardActionCost) * 100;
            let mpHtml = (member.mp?.max > 0) ? `
                <div class="stat-line">
                    <span class="stat-label">MP:</span><span class="stat-values">${member.mp.current ?? 0}/${member.mp.max}</span>
                    <div class="mp-bar stat-bar"><div class="mp-bar-inner" style="width: ${mpPercent}%;"></div></div>
                </div>` : '';

            card.innerHTML = `
                <h4>${member.name} (Lvl ${member.level} ${member.class})</h4>
                <div class="stat-line">
                    <span class="stat-label">HP:</span><span class="stat-values">${member.hp.current}/${member.hp.max}</span>
                    <div class="hp-bar stat-bar"><div class="hp-bar-inner" style="width: ${hpPercent}%;"></div></div>
                </div>
                ${mpHtml}
                <div class="stat-line">
                    <span class="stat-label">XP:</span><span class="stat-values">${member.xp ?? 0}/${member.xpToNextLevel ?? 'N/A'}</span>
                    <div class="xp-bar stat-bar"><div class="xp-bar-inner" style="width: ${xpPercent}%;"></div></div>
                </div>
                <div class="stat-line">
                    <span class="stat-label">AP:</span><span class="stat-values">${member.actionProgress ?? 0}/${standardActionCost}</span>
                    <div class="action-bar stat-bar"><div class="action-bar-inner" style="width: ${actionPercent}%;"></div></div>
                </div>
                <p style="font-size:0.8em; text-align:right;">ATK: ${member.attackBonus ?? 'N/A'} | AC: ${member.armorClass ?? 'N/A'}</p>`;
            this.elements.partyDisplay.appendChild(card);
        });
    },

    displayMonsters: function() { /* ... (same as before) ... */
        if (!this.elements.monsterDisplay) return;
        this.elements.monsterDisplay.innerHTML = '';
        if (this.localState.currentEncounter.length === 0 && !this.localState.isCombatActive) {
            this.elements.monsterDisplay.innerHTML = '<p>No monsters here.</p>'; return;
        }
        const standardActionCost = window.CombatProcessorGame?.config?.STANDARD_ACTION_COST ?? 1000;

        this.localState.currentEncounter.forEach(monster => {
            if (!monster || typeof monster.currentHP === 'undefined' || monster.baseStats?.hp === undefined) {
                console.warn("Skipping rendering monster due to missing data:", monster); return;
            }
            const card = document.createElement('div');
            card.className = 'monster-card';
            if (monster.currentHP <= 0) card.classList.add('defeated');
            
            const maxHP = monster.baseStats.hp;
            const hpPercent = maxHP > 0 ? (Math.max(0, monster.currentHP) / maxHP) * 100 : 0;
            const actionPercent = ((monster.actionProgress ?? 0) / standardActionCost) * 100;

            card.innerHTML = `
                <h4>${monster.name}</h4>
                <div class="stat-line">
                    <span class="stat-label hp-value">HP:</span><span class="stat-values hp-value">${monster.currentHP}/${maxHP}</span>
                    <div class="hp-bar stat-bar"><div class="hp-bar-inner" style="width: ${hpPercent}%;"></div></div>
                </div>
                <div class="stat-line">
                    <span class="stat-label">AP:</span><span class="stat-values">${monster.actionProgress ?? 0}/${standardActionCost}</span>
                    <div class="action-bar stat-bar"><div class="action-bar-inner" style="width: ${actionPercent}%;"></div></div>
                </div>
                <p style="font-size:0.8em; text-align:right;">ATK: ${monster.baseStats.attack ?? 'N/A'} | DEF: ${monster.baseStats.defense ?? 'N/A'}</p>
                <p style="font-size:0.75em; margin-top: 4px;">Abilities: ${monster.abilities?.join(', ') ?? 'None'}</p>`;
            this.elements.monsterDisplay.appendChild(card);
        });
    },

    triggerMonsterGeneration: function() { /* ... (same as before) ... */
        if (this.localState.isLoadingMonster) return;
        this.localState.isLoadingMonster = true;
        this.showLoading(true, "Encountering Foes...");

        const floorIndex = this.localState.floorNumber - 1;
        const floorConfig = this.config.floorEncounters[floorIndex];

        if (!floorConfig) {
            this.logMessage(`You've reached the end of these depths! (Floor ${this.localState.floorNumber})`, "victory");
            this.showLoading(false); this.updateActionButtonsForFinalVictory(); return;
        }
        this.logMessage(floorConfig.message || `Entering Floor ${this.localState.floorNumber}...`, "info");
        const encounterChoice = floorConfig.possibleEncounters[Math.floor(Math.random() * floorConfig.possibleEncounters.length)];

        if (encounterChoice.type === null) {
            this.localState.isLoadingMonster = false; this.showLoading(false);
            this.logMessage("This area seems quiet and undisturbed.", "info");
            this.localState.currentEncounter = []; this.displayMonsters(); this.updateActionButtonsForNoEncounter();
            const partyAtFullHealth = this.localState.playerParty.every(p => p.hp.current === p.hp.max);
            if (partyAtFullHealth && this.localState.floorNumber < this.config.maxAutoDescendFloor) {
                this.logMessage("Finding nothing of interest, you decide to press on quickly...", "info");
                setTimeout(() => {
                    this.localState.floorNumber++; this.sharedData.currentDungeonFloor = this.localState.floorNumber;
                    this.updateHeaderDisplay(); this.triggerMonsterGeneration();
                }, 1000);
            }
            return;
        }

        const monsterRequestParams = { monsterType: encounterChoice.type, count: this.getRandomInt(encounterChoice.minCount, encounterChoice.maxCount) };
        const monsterGenerator = window.MonsterGeneratorGame;

        if (monsterGenerator?.init) {
            monsterGenerator.init(null, (monsterData) => {
                this.localState.isLoadingMonster = false; this.showLoading(false);
                if (monsterData?.generatedMonsters?.length > 0) {
                    this.localState.currentEncounter = monsterData.generatedMonsters.map((m, i) => ({
                        ...m, 
                        instanceId: m.instanceId || m.id || `mon_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`
                    }));
                    this.logMessage(`Encountered: ${this.localState.currentEncounter.map(m => m.name).join(', ')}!`, "combat");
                    this.displayMonsters(); this.startCombat();
                } else {
                    this.logMessage("The path ahead is clear... (No monsters generated)", "info");
                    this.localState.currentEncounter = []; this.displayMonsters(); this.updateActionButtonsForNoEncounter();
                }
            }, (errorData) => {
                this.localState.isLoadingMonster = false; this.showLoading(false);
                console.error("RDG: MonsterGeneratorGame failed:", errorData);
                this.logMessage(`Error generating encounter: ${errorData?.reason || 'Unknown'}`, "error");
                this.localState.currentEncounter = []; this.displayMonsters(); this.updateActionButtonsForNoEncounter();
            }, monsterRequestParams);
        } else {
            this.localState.isLoadingMonster = false; this.showLoading(false);
            console.error("RDG: MonsterGeneratorGame module not found or invalid.");
            this.logMessage("Error: Monster generation service unavailable.", "error"); this.updateActionButtonsForNoEncounter();
        }
    },

    startCombat: function() {
        if (this.localState.currentEncounter.length === 0 || this.localState.playerParty.length === 0) {
            this.logMessage("Cannot start combat: no monsters or party.", "error");
            this.updateActionButtonsForNoEncounter(); return;
        }
        this.logMessage("Battle begins!", "combat");
        this.localState.isCombatActive = true;

        const combatProcessor = window.CombatProcessorGame;
        const postCombatHandler = window.PostCombatHandler; // Reference the new handler

        if (combatProcessor?.init) {
            this.localState.combatProcessor = combatProcessor;
            this.elements.actionButtons.innerHTML = '<button class="dungeon-button" disabled>Combat in progress...</button>';
            
            combatProcessor.init(null,
                () => { console.log("CombatProcessor initialized."); this.processCombatTick(); },
                (err) => { // CombatProcessor init failure
                    console.error("RDG: CombatProcessor init failed:", err);
                    const errorResult = { outcome: 'error', reason: `Combat system init failed: ${err.reason || ''}` };
                    if (postCombatHandler?.process) {
                        postCombatHandler.process(errorResult, this);
                    } else { // Fallback if PostCombatHandler is also missing
                        this.logMessage(errorResult.reason, "error");
                        this.localState.isCombatActive = false; this.updateActionButtonsForDefeat();
                        this.sharedData.playerRoster = this.localState.playerParty.map(p => JSON.parse(JSON.stringify(p)));
                    }
                },
                {
                    playerParty: this.localState.playerParty,
                    monsterGroup: this.localState.currentEncounter,
                    options: {
                        onTurnProcessed: this.handleTurnProcessed.bind(this),
                        onCombatEnd: (result) => { // Call the external PostCombatHandler
                            if (postCombatHandler?.process) {
                                postCombatHandler.process(result, this);
                            } else {
                                console.error("RDG: PostCombatHandler module not found!");
                                this.logMessage("Error: Post-combat processing module is missing.", "error");
                                this.localState.isCombatActive = false; this.updateActionButtonsForDefeat();
                                this.sharedData.playerRoster = this.localState.playerParty.map(p => JSON.parse(JSON.stringify(p)));
                            }
                        }
                    }
                }
            );
        } else {
            console.error("RDG: CombatProcessorGame module not found or invalid.");
            const errorResult = { outcome: 'error', reason: 'CombatProcessorGame module not found.' };
            if (postCombatHandler?.process) {
                postCombatHandler.process(errorResult, this);
            } else {
                this.logMessage(errorResult.reason, "error");
                this.localState.isCombatActive = false; this.updateActionButtonsForNoEncounter();
            }
        }
    },

    processCombatTick: function() { /* ... (same as before, with more robust error handling if processTick is missing) ... */
        if (!this.localState.isCombatActive || !this.localState.combatProcessor) return;
        if (typeof this.localState.combatProcessor.processTick === 'function') {
            this.localState.combatProcessor.processTick();
        } else {
            console.error("RDG: combatProcessor.processTick is not a function!");
            const errorResult = { outcome: 'error', reason: 'Combat tick function missing.' };
            if (window.PostCombatHandler?.process) { // Attempt to call the external handler
                window.PostCombatHandler.process(errorResult, this);
            } else { // Minimal fallback
                this.logMessage(errorResult.reason, "error");
                this.localState.isCombatActive = false; this.updateActionButtonsForDefeat();
                this.sharedData.playerRoster = this.localState.playerParty.map(p => JSON.parse(JSON.stringify(p)));
            }
        }
    },

    handleTurnProcessed: function(updatedCombatantsFromProcessor, newLogEntries, isCombatStillActive) { /* ... (same as before) ... */
        newLogEntries.forEach(entry => this.logMessage(entry.message || entry, entry.type || "combat"));

        const previousPlayerParty = [...this.localState.playerParty]; 
        const previousMonsters = [...this.localState.currentEncounter];

        this.localState.playerParty = updatedCombatantsFromProcessor
            .filter(c => c.isPlayerCharacter)
            .map(combatUpdate => {
                const originalPawn = previousPlayerParty.find(p => p.instanceId === combatUpdate.instanceId) ||
                                     this.sharedData.playerRoster.find(p => p.id === combatUpdate.id); 

                if (originalPawn) {
                    return { 
                        ...originalPawn, ...combatUpdate,
                        hp: { current: combatUpdate.currentHP, max: combatUpdate.maxHP ?? originalPawn.hp.max },
                        mp: { current: combatUpdate.currentMP ?? originalPawn.mp?.current ?? 0, max: combatUpdate.maxMP ?? originalPawn.mp?.max ?? 0 },
                        skills: combatUpdate.skills || originalPawn.skills || [], 
                    };
                }
                console.warn("RDG: Player update for unknown pawn:", combatUpdate); 
                return { name: combatUpdate.name || "P?", class: combatUpdate.class || "?", ...combatUpdate, hp: { current: combatUpdate.currentHP, max: combatUpdate.maxHP ?? 10 }, mp: { current: combatUpdate.currentMP ?? 0, max: combatUpdate.maxMP ?? 0 }, level: combatUpdate.level ?? 1, isPlayerCharacter: true };
            });

        this.localState.currentEncounter = updatedCombatantsFromProcessor
            .filter(c => !c.isPlayerCharacter)
            .map(combatUpdate => {
                const originalMonster = previousMonsters.find(m => m.instanceId === combatUpdate.instanceId);
                return { 
                    ...(originalMonster || {}), ...combatUpdate,
                    baseStats: { ...(originalMonster?.baseStats || {}), ...(combatUpdate.baseStats || {}), hp: combatUpdate.maxHP ?? originalMonster?.baseStats?.hp ?? combatUpdate.baseStats?.hp ?? 0 },
                    currentHP: combatUpdate.currentHP,
                };
            });

        this.displayParty(); this.displayMonsters();
        if (isCombatStillActive) {
            if (this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);
            this.localState.combatTurnInterval = setTimeout(() => this.processCombatTick(), this.config.turnDelay);
        }
    },

    // handleCombatEnd and performPostCombatHealing are now REMOVED.

    getCombatProcessorAttributeModifier: function(val) { return Math.floor(((val ?? 10) - 10) / 2); },
    updateActionButtonsForNoEncounter: function() { /* ... (same as before) ... */
        if (!this.elements.actionButtons) return;
        let exploreText = this.localState.floorNumber >= this.config.floorEncounters.length ? "No More To Explore Here" : "Explore Further";
        this.elements.actionButtons.innerHTML = `
            <button id="exploreFurtherRDG_noenc" class="dungeon-button" ${this.localState.floorNumber >= this.config.floorEncounters.length ? 'disabled' : ''}>${exploreText}</button>
            <button id="leaveDungeonBtnRDG_noenc" class="dungeon-button">Leave Dungeon</button>`;
        this.attachLeaveButtonListener();
        const exploreBtn = document.getElementById('exploreFurtherRDG_noenc');
        if(exploreBtn && !exploreBtn.disabled){
            exploreBtn.onclick = () => {
                this.logMessage("You explore further...", "info");
                this.localState.floorNumber++; this.sharedData.currentDungeonFloor = this.localState.floorNumber;
                this.updateHeaderDisplay(); this.triggerMonsterGeneration();
            };
        }
    },
    updateActionButtonsForVictory: function() { /* ... (same as before) ... */
        if (!this.elements.actionButtons) return;
        let nextBtnHTML = this.localState.floorNumber < this.config.floorEncounters.length ? 
            `<button id="nextFloorBtnRDG" class="dungeon-button">Descend</button>` : 
            `<button class="dungeon-button" disabled>Deepest Floor Cleared</button>`;
        this.elements.actionButtons.innerHTML = `${nextBtnHTML}<button id="leaveDungeonBtnRDG_victory" class="dungeon-button">Leave (Victorious)</button>`;
        this.attachLeaveButtonListener();
        const nextFloorBtn = document.getElementById('nextFloorBtnRDG');
        if(nextFloorBtn) {
            nextFloorBtn.onclick = () => {
                this.localState.floorNumber++; this.sharedData.currentDungeonFloor = this.localState.floorNumber;
                this.updateHeaderDisplay(); this.triggerMonsterGeneration();
            };
        }
    },
    updateActionButtonsForFinalVictory: function() { /* ... (same as before) ... */
        if (!this.elements.actionButtons) return;
        this.elements.actionButtons.innerHTML = `
            <button class="dungeon-button" disabled>All Floors Cleared!</button>
            <button id="leaveDungeonBtnRDG_finalvictory" class="dungeon-button">Leave (Triumphant)</button>`;
        this.attachLeaveButtonListener();
    },
    updateActionButtonsForDefeat: function() { /* ... (same as before) ... */
        if (!this.elements.actionButtons) return;
        this.elements.actionButtons.innerHTML = `<button id="leaveDungeonBtnRDG_defeat" class="dungeon-button">Return (Defeated)</button>`;
        this.attachLeaveButtonListener();
    },
    attachLeaveButtonListener: function() { /* ... (same as before) ... */
        this.elements.actionButtons.querySelectorAll('.dungeon-button[id^="leaveDungeonBtnRDG"]').forEach(btn => {
            const newBtn = btn.cloneNode(true); 
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.onclick = () => this.handleLeaveDungeon();
        });
    },
    handleLeaveDungeon: function() { /* ... (same as before) ... */
        console.log("RDG: Leaving dungeon."); this.logMessage("You leave the dungeon.", "info");
        if (this.localState.combatTurnInterval) { clearTimeout(this.localState.combatTurnInterval); this.localState.combatTurnInterval = null; }
        this.sharedData.playerRoster = this.localState.playerParty.map(p => JSON.parse(JSON.stringify(p)));
        const resultData = {
            ...this.sharedData,
            lastDungeonResult: this.localState.playerParty.some(p => p.hp?.current > 0) ? "Exited" : "Defeated",
            dungeonFloorReached: this.localState.floorNumber, currentDungeonFloor: 1
        };
        this.successCallback(resultData);
    },
    getRandomInt: function(min, max) { return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min); },
    destroy: function() { /* ... (same as before) ... */
        console.log("RDG: Destroying...");
        if (this.localState.combatTurnInterval) clearTimeout(this.localState.combatTurnInterval);
        if (this.container) this.container.innerHTML = '';
        const styleElement = document.getElementById(this.DOM_IDS.styleTag);
        if (styleElement) styleElement.remove();
    }
};
