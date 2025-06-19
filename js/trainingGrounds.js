// js/trainingGrounds.js
"use strict";

const TrainingGroundsGame = {
    id: 'TrainingGroundsGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        STANDARD_ACTION_COST: 1000,
        dummyBaseHP: 100000,
        autoCombatTickInterval: 200, // ms
        xpPerAction: 10,
    },

    localState: {
        playerRoster: [],
        selectedChampion: null,
        selectedChampionId: null,
        trainingDummy: null,
        messageLog: [],
        currentPawnStatsSnapshot: null,
        isAutoCombatActive: false,
        autoCombatIntervalId: null,
    },

    elements: {
        rosterDisplay: null,
        championStatsDisplay: null,
        dummyDisplay: null,
        actionButtons: null,
        messageLogDisplay: null,
        autoCombatToggle: null,
        pawnAPDisplay: null,
        styleTag: 'trainingGroundsGameStyle',
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log("TrainingGroundsGame: Initializing...");
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (!this.container) { /* ... error handling ... */ return; }

        if (typeof CombatProcessorGame !== 'undefined' && CombatProcessorGame.config && CombatProcessorGame.config.STANDARD_ACTION_COST) {
            this.config.STANDARD_ACTION_COST = CombatProcessorGame.config.STANDARD_ACTION_COST;
        } else {
            console.warn("TrainingGroundsGame: CombatProcessorGame.config.STANDARD_ACTION_COST not found, using fallback:", this.config.STANDARD_ACTION_COST);
        }

        if (!this.sharedData.playerRoster) this.sharedData.playerRoster = [];
        try {
            this.localState.playerRoster = JSON.parse(JSON.stringify(this.sharedData.playerRoster.filter(p => p && p.hp && p.hp.current > 0)))
                .map(pawn => ({
                    ...pawn,
                    speed: pawn.speed || 30,
                    actionProgress: pawn.actionProgress || 0,
                    hp: { current: pawn.hp.current, max: pawn.hp.max },
                    mp: { current: pawn.mp ? pawn.mp.current : 0, max: pawn.mp ? pawn.mp.max : 0 },
                    hpRegenRate: pawn.hpRegenRate !== undefined ? pawn.hpRegenRate : 0.05, // Ensure regen rates are present
                    mpRegenRate: pawn.mpRegenRate !== undefined ? pawn.mpRegenRate : 0
                }));
        } catch (e) { /* ... error handling ... */ }

        this.localState.selectedChampion = null;
        this.localState.selectedChampionId = null;
        this.localState.isAutoCombatActive = false;
        if (this.localState.autoCombatIntervalId) clearInterval(this.localState.autoCombatIntervalId);
        this.localState.autoCombatIntervalId = null;
        this.localState.messageLog = [];
        this.localState.currentPawnStatsSnapshot = null;

        this.createTrainingDummy();
        this.renderBaseLayout();
        this.cacheElements();
        this.updateDisplay();
        this.logMessage("Welcome to the Training Grounds.", "info");
        console.log("TrainingGroundsGame: Initialization complete.");
    },

    renderBaseLayout: function() { /* ... same as before ... */
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="training-grounds-container">
                <div class="tg-header">
                    <h1>Training Grounds</h1>
                    <button id="tgExitBtn" class="tg-button tg-exit-button">Leave Training</button>
                </div>
                <div class="tg-main-layout">
                    <div class="tg-left-column">
                        <div class="tg-roster-panel">
                            <h3>Your Pawns</h3>
                            <div id="tgRosterDisplay" class="tg-list-container"></div>
                        </div>
                        <div class="tg-dummy-and-actions-panel">
                            <h3>Training Dummy & Actions</h3>
                            <div class="tg-auto-combat-controls">
                                <label for="tgAutoCombatToggle">Auto-Combat:</label>
                                <input type="checkbox" id="tgAutoCombatToggle">
                                <span id="tgPawnAPDisplay">AP: 0 / ${this.config.STANDARD_ACTION_COST}</span>
                            </div>
                            <div id="tgDummyDisplay" class="tg-dummy-info"></div>
                            <div id="tgActionButtons" class="tg-action-buttons"></div>
                        </div>
                    </div>
                    <div class="tg-stats-panel">
                        <h3>Selected Pawn Stats</h3>
                        <div id="tgChampionStatsDisplay" class="tg-stats-display">
                            <p>Select a pawn from the roster to see their full stats and available actions.</p>
                        </div>
                    </div>
                </div>
                <div class="tg-log-panel">
                    <h3>Activity Log</h3>
                    <div id="tgMessageLogDisplay" class="tg-message-log"></div>
                </div>
            </div>`;
        this.applyStyles();
    },
    applyStyles: function() { /* ... same as before ... */
        let style = document.getElementById(this.elements.styleTag);
        if (!style) {
            style = document.createElement('style');
            style.id = this.elements.styleTag;
            document.head.appendChild(style);
        }
        style.textContent = `
            .training-grounds-container { display: flex; flex-direction: column; height: 100%; max-height: 98vh; padding: 2px; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #2c3e50; color: #ecf0f1; }
            .tg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding: 5px; border-bottom: 1px solid #34495e; }
            .tg-header h1 { margin: 0; font-size: 1.3em; color: #e74c3c; }
            .tg-main-layout { display: grid; grid-template-columns: 280px 1fr; gap: 2px; flex-grow: 1; overflow: hidden; margin-bottom: 2px; }
            .tg-left-column { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
            .tg-roster-panel, .tg-dummy-and-actions-panel, .tg-stats-panel, .tg-log-panel { background-color: #34495e; padding: 5px; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; }
            .tg-roster-panel { min-height: 150px; flex-shrink: 0; }
            .tg-dummy-and-actions-panel { min-height: 280px; flex-grow: 1; }
            .tg-roster-panel h3, .tg-dummy-and-actions-panel h3, .tg-stats-panel h3, .tg-log-panel h3 { margin-top: 0; margin-bottom: 4px; color: #e74c3c; border-bottom: 1px solid #2c3e50; padding-bottom: 3px; font-size: 1.1em; }
            .tg-list-container { overflow-y: auto; flex-grow: 1; padding-right: 5px; }
            .tg-list-item { padding: 4px 6px; margin-bottom: 3px; background-color: #566573; border-radius: 3px; cursor: pointer; transition: background-color 0.15s; font-size: 0.85em; border: 1px solid #46525f; }
            .tg-list-item:hover { background-color: #6c7a89; }
            .tg-list-item.selected { background-color: #e74c3c; color: #fff; font-weight: bold; }
            .tg-stats-display { font-size: 0.8em; line-height: 1.4; overflow-y: auto; flex-grow: 1; padding-right: 5px; }
            .tg-stats-display pre { white-space: pre-wrap; word-wrap: break-word; background-color: #2c3e50; padding: 4px; border-radius: 3px; color: #bdc3c7; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 0.9em; border: 1px solid #34495e; }
            .tg-auto-combat-controls { display: flex; align-items: center; margin-bottom: 8px; padding: 5px; background-color: #2c3e50; border-radius: 3px;}
            .tg-auto-combat-controls label { margin-right: 8px; font-size: 0.9em; }
            .tg-auto-combat-controls input[type="checkbox"] { margin-right: 8px; transform: scale(1.1); }
            #tgPawnAPDisplay { font-size: 0.9em; color: #f1c40f; }
            .tg-dummy-info { margin-bottom: 5px; text-align: center; }
            .tg-dummy-info h4 {margin: 2px 0; font-size: 1em;}
            .tg-dummy-info .dummy-hp { font-size: 1.1em; font-weight: bold; color: #f1c40f; margin: 2px 0;}
            .tg-action-buttons { display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto; padding-right: 5px; flex-grow: 1; margin-top: 5px;}
            .tg-button { padding: 5px 8px; font-size: 0.85em; background-color: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; transition: background-color 0.15s; }
            .tg-button:hover:not(:disabled) { background-color: #229954; }
            .tg-button.tg-skill-button { background-color: #2980b9; }
            .tg-button.tg-skill-button:hover:not(:disabled) { background-color: #2471a3; }
            .tg-button.tg-exit-button { background-color: #c0392b; font-size: 0.9em; padding: 6px 10px;}
            .tg-button.tg-exit-button:hover:not(:disabled) { background-color: #a93226; }
            .tg-button:disabled { background-color: #7f8c8d; color: #bdc3c7; cursor: not-allowed; }
            .tg-message-log { height: 120px; background-color: #2c3e50; border: 1px solid #34495e; border-radius: 3px; padding: 4px; overflow-y: auto; font-size: 0.8em; line-height: 1.3; }
            .tg-message-log p { margin: 0 0 4px 0; }
            .tg-message-log .log-info { color: #3498db; } .tg-message-log .log-action { color: #2ecc71; }
            .tg-message-log .log-damage { color: #e74c3c; font-weight: bold; } .tg-message-log .log-stat { color: #f1c40f; }
            .tg-message-log .log-error { color: #e74c3c; font-weight: bold; } .tg-message-log .log-victory { color: #27ae60; font-weight: bold; }
            ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: #2c3e50; border-radius: 4px; }
            ::-webkit-scrollbar-thumb { background: #566573; border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: #6c7a89; }`;
    },
    cacheElements: function() { /* ... same as before ... */
        if (!this.container) return;
        this.elements.rosterDisplay = this.container.querySelector('#tgRosterDisplay');
        this.elements.championStatsDisplay = this.container.querySelector('#tgChampionStatsDisplay');
        this.elements.dummyDisplay = this.container.querySelector('#tgDummyDisplay');
        this.elements.actionButtons = this.container.querySelector('#tgActionButtons');
        this.elements.messageLogDisplay = this.container.querySelector('#tgMessageLogDisplay');
        this.elements.autoCombatToggle = this.container.querySelector('#tgAutoCombatToggle');
        this.elements.pawnAPDisplay = this.container.querySelector('#tgPawnAPDisplay');

        const exitBtn = this.container.querySelector('#tgExitBtn');
        if (exitBtn) exitBtn.onclick = () => this.handleExit();
        if (this.elements.autoCombatToggle) {
            this.elements.autoCombatToggle.onchange = () => this.toggleAutoCombat();
        } else {
            console.warn("TrainingGroundsGame: Auto-combat toggle not found in cacheElements.");
        }
    },

    updateDisplay: function() {
        this.renderRosterList();
        this.renderChampionFullStats(); // Now includes regen rates
        this.renderDummyDisplay();
        this.renderActionButtons();
        this.renderMessageLog();
        this.updatePawnAPDisplay();
        if (this.elements.autoCombatToggle) {
            this.elements.autoCombatToggle.checked = this.localState.isAutoCombatActive;
        }
    },
    updatePawnAPDisplay: function() { /* ... same as before ... */
        if (this.elements.pawnAPDisplay && this.localState.selectedChampion) {
            const progress = this.localState.selectedChampion.actionProgress || 0;
            this.elements.pawnAPDisplay.textContent = `AP: ${Math.floor(progress)} / ${this.config.STANDARD_ACTION_COST}`;
        } else if (this.elements.pawnAPDisplay) {
            this.elements.pawnAPDisplay.textContent = `AP: 0 / ${this.config.STANDARD_ACTION_COST}`;
        }
    },

    selectChampion: function(pawnId) {
        if (this.localState.isAutoCombatActive) {
            this.stopAutoCombat();
        }

        this.localState.selectedChampionId = pawnId;
        const selectedFromRoster = this.localState.playerRoster.find(p => p.id === pawnId);

        if (selectedFromRoster) {
            this.localState.selectedChampion = JSON.parse(JSON.stringify(selectedFromRoster));
            // Ensure necessary properties for display and auto-combat
            this.localState.selectedChampion.actionProgress = this.localState.selectedChampion.actionProgress || 0;
            this.localState.selectedChampion.speed = this.localState.selectedChampion.speed || 30;
            this.localState.selectedChampion.hp = this.localState.selectedChampion.hp || { current: 10, max: 10 };
            this.localState.selectedChampion.mp = this.localState.selectedChampion.mp || { current: 0, max: 0 };
            this.localState.selectedChampion.hpRegenRate = this.localState.selectedChampion.hpRegenRate !== undefined ? this.localState.selectedChampion.hpRegenRate : 0.05;
            this.localState.selectedChampion.mpRegenRate = this.localState.selectedChampion.mpRegenRate !== undefined ? this.localState.selectedChampion.mpRegenRate : 0;
            this.localState.selectedChampion.attributes = this.localState.selectedChampion.attributes || {};
            this.localState.selectedChampion.skills = this.localState.selectedChampion.skills || [];
            this.localState.selectedChampion.equipment = this.localState.selectedChampion.equipment || {};
            this.localState.selectedChampion.racialTraits = this.localState.selectedChampion.racialTraits || [];


        } else {
            this.localState.selectedChampion = null;
        }

        if (this.localState.selectedChampion) {
            const pawn = this.localState.selectedChampion;
            this.localState.currentPawnStatsSnapshot = {
                Name: pawn.name, Race: pawn.race, Class: pawn.class, Level: pawn.level,
                XP: `${pawn.xp || 0} / ${pawn.xpToNextLevel || 100}`, Alignment: pawn.alignment,
                HP: `${pawn.hp.current} / ${pawn.hp.max}`, MP: `${pawn.mp.current} / ${pawn.mp.max}`,
                HP_Regen_p_Sec: pawn.hpRegenRate.toFixed(3), // Added for display
                MP_Regen_p_Sec: pawn.mpRegenRate.toFixed(3), // Added for display
                Attributes: pawn.attributes, AttackBonus: pawn.attackBonus, ArmorClass: pawn.armorClass,
                Speed: pawn.speed, DodgeRate: `${pawn.dodgeRate}%`, AccuracyRate: `${pawn.accuracyRate}%`,
                MeleeDmgBonus: pawn.meleeDamageBonus, RangedDmgBonus: pawn.rangedDamageBonus,
                SavingThrows: pawn.savingThrows,
                CurrentAP: `${Math.floor(pawn.actionProgress)} / ${this.config.STANDARD_ACTION_COST}`,
                Skills: pawn.skills.map(s => `${s.name} (${s.type}, Cost: ${s.cost || 0} MP)`).join('; ') || "None",
                Equipment: Object.entries(pawn.equipment).filter(([, item]) => item !== null)
                    .map(([slot, item]) => `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item.name}`)
                    .join('\n') || "None",
                Gold: pawn.gold, Personality: pawn.personality, Background: pawn.background,
                RacialTraits: pawn.racialTraits.join(', ') || "None", Cost: pawn.cost
            };
            if (pawn.derivedStats) { this.localState.currentPawnStatsSnapshot.DerivedStats = pawn.derivedStats; }
            this.logMessage(`${pawn.name} selected.`, "info");
        } else {
            this.localState.currentPawnStatsSnapshot = null;
        }
        this.updateDisplay();
    },
    renderRosterList: function() { /* ... same as before ... */
        if (!this.elements.rosterDisplay) return;
        this.elements.rosterDisplay.innerHTML = '';
        if (this.localState.playerRoster.length === 0) {
            this.elements.rosterDisplay.innerHTML = '<p>No pawns available.</p>';
            return;
        }
        this.localState.playerRoster.forEach(pawn => {
            const div = document.createElement('div');
            div.className = 'tg-list-item';
            if (pawn.id === this.localState.selectedChampionId) {
                div.classList.add('selected');
            }
            div.textContent = `${pawn.name} (Lvl ${pawn.level} ${pawn.class})`;
            div.dataset.pawnId = pawn.id;
            div.onclick = () => this.selectChampion(pawn.id);
            this.elements.rosterDisplay.appendChild(div);
        });
    },
    renderChampionFullStats: function() {
        if (!this.elements.championStatsDisplay) return;
        if (this.localState.currentPawnStatsSnapshot) {
            // Update HP/MP/AP in the snapshot just before rendering if champion exists
            if (this.localState.selectedChampion) {
                const champ = this.localState.selectedChampion;
                this.localState.currentPawnStatsSnapshot.HP = `${champ.hp.current} / ${champ.hp.max}`;
                this.localState.currentPawnStatsSnapshot.MP = `${champ.mp.current} / ${champ.mp.max}`;
                this.localState.currentPawnStatsSnapshot.CurrentAP = `${Math.floor(champ.actionProgress || 0)} / ${this.config.STANDARD_ACTION_COST}`;
            }
            this.elements.championStatsDisplay.innerHTML = `<pre>${JSON.stringify(this.localState.currentPawnStatsSnapshot, null, 2)}</pre>`;
        } else {
            this.elements.championStatsDisplay.innerHTML = '<p>Select a pawn from the roster to see their full stats and available actions.</p>';
        }
    },
    createTrainingDummy: function() { /* ... same as before ... */ 
        this.localState.trainingDummy = { name: "Training Dummy", hp: { current: this.config.dummyBaseHP, max: this.config.dummyBaseHP }, armorClass: 5, isDefeated: false, };
    },
    renderDummyDisplay: function() { /* ... same as before ... */ 
        if (!this.elements.dummyDisplay || !this.localState.trainingDummy) return;
        const dummy = this.localState.trainingDummy;
        this.elements.dummyDisplay.innerHTML = `
            <h4>${dummy.name} (AC: ${dummy.armorClass})</h4>
            <p class="dummy-hp">HP: ${dummy.hp.current} / ${dummy.hp.max}</p>
            <button id="tgResetDummyBtn" class="tg-button">Reset Dummy HP</button>`;
        const resetBtn = this.container.querySelector('#tgResetDummyBtn');
        if(resetBtn) resetBtn.onclick = () => {
            if (this.localState.isAutoCombatActive) this.stopAutoCombat();
            this.createTrainingDummy();
            this.logMessage("Training Dummy HP has been reset.", "info");
            this.updateDisplay();
        };
    },
    renderActionButtons: function() { /* ... same as before ... */
        if (!this.elements.actionButtons) return;
        this.elements.actionButtons.innerHTML = ''; 
        const autoCombatActive = this.localState.isAutoCombatActive;
        if (!this.localState.selectedChampion) {
            this.elements.actionButtons.innerHTML = '<p style="text-align:center; font-style:italic; font-size:0.9em;">Select a pawn.</p>';
            if(this.elements.autoCombatToggle) this.elements.autoCombatToggle.disabled = true;
            return;
        }
        if(this.elements.autoCombatToggle) this.elements.autoCombatToggle.disabled = false;
        const pawn = this.localState.selectedChampion;
        const basicAttackBtn = document.createElement('button');
        basicAttackBtn.classList.add('tg-button');
        basicAttackBtn.textContent = "Basic Attack";
        basicAttackBtn.disabled = autoCombatActive;
        basicAttackBtn.onclick = () => this.handlePawnAction(this.localState.selectedChampion, { id: "basic_attack", name: "Basic Attack", type: "Attack", description: "A standard physical attack.", cost: 0, target: "enemy"});
        this.elements.actionButtons.appendChild(basicAttackBtn);
        if (!pawn.skills || pawn.skills.length === 0) {
            const noSkillsMsg = document.createElement('p');
            noSkillsMsg.textContent = 'No special skills.';
            noSkillsMsg.style.textAlign = 'center'; noSkillsMsg.style.fontStyle = 'italic'; noSkillsMsg.style.fontSize = '0.8em';
            this.elements.actionButtons.appendChild(noSkillsMsg);
        } else {
            pawn.skills.forEach(skill => {
                const skillBtn = document.createElement('button');
                skillBtn.classList.add('tg-button', 'tg-skill-button');
                skillBtn.textContent = `${skill.name} (${skill.type}, Cost: ${skill.cost || 0} MP)`;
                skillBtn.disabled = autoCombatActive;
                skillBtn.onclick = () => this.handlePawnAction(this.localState.selectedChampion, skill);
                if (pawn.mp.current < (skill.cost || 0) && skill.type.toLowerCase() === 'spell') {
                    skillBtn.disabled = true; skillBtn.title = "Not enough MP";
                }
                this.elements.actionButtons.appendChild(skillBtn);
            });
        }
    },

    // Auto-Combat Logic
    toggleAutoCombat: function() { /* ... same as before ... */
        if (this.elements.autoCombatToggle.checked) { this.startAutoCombat(); } else { this.stopAutoCombat(); }
    },
    startAutoCombat: function() { /* ... same as before ... */
        if (!this.localState.selectedChampion) { this.logMessage("Select a champion before starting auto-combat.", "error"); if(this.elements.autoCombatToggle) this.elements.autoCombatToggle.checked = false; return; }
        if (this.localState.isAutoCombatActive) return;
        this.localState.isAutoCombatActive = true;
        if (this.localState.selectedChampion && typeof this.localState.selectedChampion.actionProgress === 'undefined') { this.localState.selectedChampion.actionProgress = 0;}
        this.logMessage(`Auto-combat started for ${this.localState.selectedChampion.name}.`, "info");
        if (this.localState.autoCombatIntervalId) clearInterval(this.localState.autoCombatIntervalId);
        this.localState.autoCombatIntervalId = setInterval(this.processAutoCombatTick.bind(this), this.config.autoCombatTickInterval);
        this.renderActionButtons(); this.updatePawnAPDisplay();
    },
    stopAutoCombat: function() { /* ... same as before ... */
        if (!this.localState.isAutoCombatActive) return;
        this.localState.isAutoCombatActive = false;
        if (this.localState.autoCombatIntervalId) { clearInterval(this.localState.autoCombatIntervalId); this.localState.autoCombatIntervalId = null; }
        this.logMessage("Auto-combat stopped.", "info");
        this.renderActionButtons(); this.updatePawnAPDisplay();
        if (this.elements.autoCombatToggle) this.elements.autoCombatToggle.checked = false;
    },

    processAutoCombatTick: function() {
        if (!this.localState.isAutoCombatActive || !this.localState.selectedChampion) {
            this.stopAutoCombat();
            return;
        }
        
        const pawn = this.localState.selectedChampion;
        pawn.actionProgress += (pawn.speed || 30);
        this.updatePawnAPDisplay(); // Update AP bar immediately

        if (pawn.actionProgress >= this.config.STANDARD_ACTION_COST) {
            pawn.actionProgress %= this.config.STANDARD_ACTION_COST;
            
            let actionToPerform = {
                id: "basic_attack", name: "Basic Attack", type: "Attack",
                description: "A standard physical attack.", cost: 0, target: "enemy"
            };
            let actionChosenReason = " (Defaulting to Basic Attack)";

            if (this.localState.trainingDummy.hp.current <= 0) {
                 this.logMessage("Dummy at 0 HP. Auto-combat pausing action.", "info");
                 // Optionally stop auto combat fully if dummy is at 0
                 // this.stopAutoCombat(); 
                 // return; // Skip action if dummy is at 0
            } else if (pawn.skills && pawn.skills.length > 0) {
                const affordableOffensiveSpells = pawn.skills.filter(s => 
                    s.type.toLowerCase() === 'spell' &&
                    (s.target === 'enemy' || s.damageMultiplier > 0 || s.damageType) &&
                    pawn.mp.current >= (s.cost || 0)
                );

                if (affordableOffensiveSpells.length > 0) {
                    actionToPerform = affordableOffensiveSpells[Math.floor(Math.random() * affordableOffensiveSpells.length)];
                    actionChosenReason = ` (Casting ${actionToPerform.name})`;
                } else {
                    const zeroCostOffensiveSkills = pawn.skills.filter(s =>
                        s.type.toLowerCase() === 'attack' &&
                        (s.cost || 0) === 0 &&
                        (s.target === 'enemy' || s.damageMultiplier > 0)
                    );
                    if (zeroCostOffensiveSkills.length > 0) {
                        actionToPerform = zeroCostOffensiveSkills[Math.floor(Math.random() * zeroCostOffensiveSkills.length)];
                        actionChosenReason = ` (Using skill ${actionToPerform.name})`;
                    } else {
                         actionChosenReason = " (No affordable spells/skills, Basic Attack)";
                    }
                }
            } else {
                 actionChosenReason = " (No skills, Basic Attack)";
            }
            
            if (this.localState.trainingDummy.hp.current > 0 || actionToPerform.target === 'ally') { // Only perform action if dummy has HP or it's a self-target
                this.logMessage(`${pawn.name} (Auto)${actionChosenReason}.`, "action");
                this.handlePawnAction(pawn, actionToPerform); // Call action
            }

            // Update the playerRoster array with the current state of selectedChampion
            const rosterPawnIndex = this.localState.playerRoster.findIndex(rp => rp.id === pawn.id);
            if (rosterPawnIndex !== -1) {
                this.localState.playerRoster[rosterPawnIndex] = JSON.parse(JSON.stringify(pawn));
            }

            // Refresh UI elements that show pawn/dummy stats
            this.renderChampionFullStats();
            this.renderActionButtons(); // For MP changes affecting skill availability
            this.renderDummyDisplay();   // For dummy HP changes
        }
    },

    handlePawnAction: function(pawn, skill) { // pawn IS this.localState.selectedChampion
        if (!this.localState.trainingDummy) { /* ... error handling ... */ return; }
        
        // Prevent attacking a 0 HP dummy unless it's a self-targeted skill
        if (this.localState.trainingDummy.hp.current <= 0 && skill.target !== 'ally' && skill.type.toLowerCase() !== 'heal'){
            this.logMessage("Dummy at 0 HP, cannot attack. Reset dummy.", "info");
            return;
        }
        if (!pawn) { /* ... error handling ... */ return; }

        this.logMessage(`${pawn.name} uses ${skill.name}.`, "action");
    
        let damage = 0; let hitSuccess = true;
        const dummyAC = this.localState.trainingDummy.armorClass;
        const pawnAtkBonus = pawn.attackBonus || 0; // Ensure attackBonus exists
        const getRandomInt = (typeof PawnGeneratorGame !== 'undefined' && PawnGeneratorGame.getRandomInt) ? PawnGeneratorGame.getRandomInt : (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const getAttributeModifier = (typeof PawnGeneratorGame !== 'undefined' && PawnGeneratorGame.getAttributeModifier) ? PawnGeneratorGame.getAttributeModifier : (val) => Math.floor(((val || 10)-10)/2);
        const toHitRoll = getRandomInt(1, 20) + pawnAtkBonus;
    
        if (skill.type.toLowerCase() === 'attack' || skill.id === "basic_attack") {
            if (toHitRoll < dummyAC && skill.id !== "basic_attack_always_hit") { 
                this.logMessage(`${pawn.name}'s attack misses (To-Hit: ${toHitRoll} vs AC: ${dummyAC}).`, "info"); hitSuccess = false;
            } else {
                let baseDamageValue = getRandomInt(1, 6); 
                if (pawn.equipment && pawn.equipment.mainHand && pawn.equipment.mainHand.damage) {
                    const parts = pawn.equipment.mainHand.damage.split('d');
                    if (parts.length === 2) {
                        const numDice = parseInt(parts[0], 10) || 1; const dieSize = parseInt(parts[1], 10) || 6;
                        baseDamageValue = 0; for (let i = 0; i < numDice; i++) { baseDamageValue += getRandomInt(1, dieSize); }
                    }
                }
                const attributeSource = pawn.attributes || {};
                const strMod = pawn.meleeDamageBonus !== undefined ? pawn.meleeDamageBonus : getAttributeModifier(attributeSource.str || 10);
                damage = Math.max(1, baseDamageValue + strMod); damage = Math.floor(damage * (skill.damageMultiplier || 1.0));
                this.logMessage(`Physical: Base ${baseDamageValue}, Bonus ${strMod}, Mult ${skill.damageMultiplier || 1.0}. Roll ${toHitRoll} vs AC ${dummyAC}.`, "stat");
            }
        } else if (skill.type.toLowerCase() === 'spell') {
            if (pawn.mp.current < (skill.cost || 0)) { this.logMessage(`${pawn.name} lacks MP for ${skill.name}.`, "error"); return; }
            pawn.mp.current -= (skill.cost || 0); 
            this.logMessage(`${pawn.name} spends ${skill.cost || 0} MP (Now ${pawn.mp.current}/${pawn.mp.max}).`, "info");
            const attributeSource = pawn.attributes || {}; const intMod = getAttributeModifier(attributeSource.int || 10);
            let spellBase = 0; const d6 = () => getRandomInt(1,6); const d4 = () => getRandomInt(1,4);
            if (skill.id === "skill_fireball") spellBase = d6() + d6();
            else if (skill.id === "skill_magic_missile") spellBase = (d4() + 1) * (skill.hits || 1);
            else spellBase = getRandomInt(3, 8); 
            damage = Math.max(1, spellBase + intMod); damage = Math.floor(damage * (skill.damageMultiplier || 1.0));
            this.logMessage(`Spell: Base ${spellBase}, IntMod ${intMod}, Mult ${skill.damageMultiplier || 1.0}.`, "stat");
        } else if (skill.type.toLowerCase() === 'utility' || (skill.type.toLowerCase() === 'heal' && skill.target === 'ally')) {
            this.logMessage(`${skill.name} (Utility/Heal). Effect: ${skill.description}.`, "info");
            if (skill.id === "skill_heal_light") {
                if (pawn.mp.current < (skill.cost || 0) ) { this.logMessage(`${pawn.name} lacks MP for ${skill.name}.`, "error"); return; }
                pawn.mp.current -= (skill.cost || 0);
                const attributeSource = pawn.attributes || {};
                const wisMod = getAttributeModifier(attributeSource.wis || 10);
                const healAmount = skill.healingAmount || (getRandomInt(1,8) + wisMod);
                const oldHP = pawn.hp.current; pawn.hp.current = Math.min(pawn.hp.max, pawn.hp.current + healAmount);
                this.logMessage(`${pawn.name} heals self for ${pawn.hp.current - oldHP} HP (Now ${pawn.hp.current}/${pawn.hp.max}, MP ${pawn.mp.current}/${pawn.mp.max}).`, "action");
            }
        } else { this.logMessage(`Skill '${skill.name}' type '${skill.type}' not for direct damage/handled.`, "info"); }
    
        if (hitSuccess && damage > 0 && skill.target !== 'ally') {
            this.localState.trainingDummy.hp.current -= damage;
            this.logMessage(`${pawn.name}'s ${skill.name} deals ${damage} damage to Dummy.`, "damage");
            if (this.localState.trainingDummy.hp.current <= 0) {
                this.localState.trainingDummy.hp.current = 0; 
                this.logMessage("Training Dummy reached 0 HP!", "victory");
            }
        }
        // If it was a manual action (not auto-combat), update the displays.
        // Auto-combat updates displays in its own tick.
        if (!this.localState.isAutoCombatActive) {
            this.renderChampionFullStats();
            this.renderActionButtons();
            this.renderDummyDisplay();
            this.updatePawnAPDisplay(); // Update AP display too, though manual actions don't use it
        }
    },

    logMessage: function(message, type = "info") { /* ... same as before ... */ 
        this.localState.messageLog.push({ text: message, type: `log-${type}` });
        if (this.localState.messageLog.length > 100) { this.localState.messageLog.shift(); }
        this.renderMessageLog();
    },
    renderMessageLog: function() { /* ... same as before ... */ 
        if (!this.elements.messageLogDisplay) return;
        this.elements.messageLogDisplay.innerHTML = '';
        this.localState.messageLog.forEach(msg => {
            const p = document.createElement('p'); p.textContent = msg.text; p.className = msg.type;
            this.elements.messageLogDisplay.appendChild(p);
        });
        this.elements.messageLogDisplay.scrollTop = this.elements.messageLogDisplay.scrollHeight;
    },
    handleExit: function() { /* ... same as before ... */
        this.stopAutoCombat(); console.log("TrainingGroundsGame: Exiting.");
        this.localState.playerRoster.forEach(trainedPawn => {
            const sharedPawnIndex = this.sharedData.playerRoster.findIndex(sp => sp.id === trainedPawn.id);
            if (sharedPawnIndex !== -1) { this.sharedData.playerRoster[sharedPawnIndex].mp = trainedPawn.mp; }
        });
        this.successCallback(this.sharedData);
    },
    destroy: function() { /* ... same as before ... */
        this.stopAutoCombat(); console.log("TrainingGroundsGame: Destroying...");
        if (this.container) this.container.innerHTML = '';
        const styleElement = document.getElementById(this.elements.styleTag);
        if (styleElement) styleElement.remove();
        this.localState = { playerRoster: [], selectedChampion: null, selectedChampionId: null, trainingDummy: null, messageLog: [], currentPawnStatsSnapshot: null, isAutoCombatActive: false, autoCombatIntervalId: null, };
    }
};

if (typeof window !== 'undefined') {
    window.TrainingGroundsGame = TrainingGroundsGame;
}
