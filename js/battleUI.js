// js/battleUI.js
const BattleUI = {
    id: 'BattleUI',
    container: null,
    actionCallback: null, // Called when a player submits a complete action (action + target(s))
    uiConfig: {
        showPlayerMP: true,
        showPlayerAP: true,
        showEnemyMP: false, // Typically enemies don't show MP unless it's a special mechanic
        showEnemyAP: true,
    },

    localState: {
        activeCharacterId: null, // Whose turn it is
        selectedAction: null,    // Action object selected from the menu
        isTargeting: false,      // Is the UI in targeting mode?
        currentTargets: [],      // Array of selected target IDs
        maxTargets: 1,           // How many targets the current action needs
        targetTeamType: 'ENEMY', // 'ENEMY', 'ALLY', 'ANY', 'SELF'
    },

    elements: {
        wrapper: null,
        playerTeamArea: null,
        enemyTeamArea: null,
        actionMenuArea: null,
        combatLogArea: null,
        messageOverlay: null, // For victory/defeat messages
    },

    // --- Initialization and Teardown ---
    init: function(containerElement, onActionSubmittedCallback, configOptions = {}) {
        if (!containerElement) {
            console.error("BattleUI: Container element not provided for initialization!");
            return false;
        }
        this.container = containerElement;
        this.actionCallback = onActionSubmittedCallback;
        this.uiConfig = { ...this.uiConfig, ...configOptions }; // Merge provided config

        this.localState = { // Reset local state
            activeCharacterId: null,
            selectedAction: null,
            isTargeting: false,
            currentTargets: [],
            maxTargets: 1,
            targetTeamType: 'ENEMY',
        };

        this._renderInitialLayout();
        this._applyStyles(); // Apply basic styles
        this._setupGlobalEventListeners(); // For things like clicking off targeting
        console.log("BattleUI: Initialized.");
        return true;
    },

    destroy: function() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        // Potentially remove global event listeners if any were specifically added to document/window
        this.container = null;
        this.actionCallback = null;
        this.elements = {}; // Clear cached elements
        console.log("BattleUI: Destroyed.");
    },

    // --- Core Rendering and Updates ---
    _renderInitialLayout: function() {
        this.container.innerHTML = `
            <div class="battle-ui-wrapper">
                <div class="battle-message-overlay" style="display:none;"></div>
                <div class="battle-stage">
                    <div class="battle-team-area enemy-team-area">
                        <h3>Enemies</h3>
                        <div class="combatants-container enemy-combatants"></div>
                    </div>
                    <div class="battle-team-area player-team-area">
                        <h3>Your Party</h3>
                        <div class="combatants-container player-combatants"></div>
                    </div>
                </div>
                <div class="battle-action-menu-area">
                    <p>Select an action...</p>
                </div>
                <div class="battle-combat-log-area">
                    <h4>Combat Log</h4>
                    <div class="log-messages"></div>
                </div>
            </div>
        `;
        this.elements.wrapper = this.container.querySelector('.battle-ui-wrapper');
        this.elements.playerTeamArea = this.container.querySelector('.player-combatants');
        this.elements.enemyTeamArea = this.container.querySelector('.enemy-combatants');
        this.elements.actionMenuArea = this.container.querySelector('.battle-action-menu-area');
        this.elements.combatLogArea = this.container.querySelector('.log-messages');
        this.elements.messageOverlay = this.container.querySelector('.battle-message-overlay');
    },

    updateCombatants: function(playerPartyData, enemyGroupData, activeCombatantId = null) {
        if (!this.elements.playerTeamArea || !this.elements.enemyTeamArea) {
            console.error("BattleUI: Team areas not found for updating combatants.");
            return;
        }

        this.elements.playerTeamArea.innerHTML = '';
        playerPartyData.forEach(combatant => {
            const card = this._renderCombatantCard(combatant, true, activeCombatantId === combatant.id);
            this.elements.playerTeamArea.appendChild(card);
        });

        this.elements.enemyTeamArea.innerHTML = '';
        enemyGroupData.forEach(combatant => {
            const card = this._renderCombatantCard(combatant, false, activeCombatantId === combatant.id);
            this.elements.enemyTeamArea.appendChild(card);
        });
    },

    _renderCombatantCard: function(combatant, isPlayerTeamMember, isActiveTurn) {
        const card = document.createElement('div');
        card.className = 'combatant-card';
        if (isPlayerTeamMember) card.classList.add('player-character');
        if (!isPlayerTeamMember) card.classList.add('enemy-character');
        if (isActiveTurn) card.classList.add('active-turn');
        if (combatant.hp.current <= 0) card.classList.add('defeated');

        card.dataset.id = combatant.id; // Store ID for targeting

        const hpPercent = (combatant.hp.current / combatant.hp.max) * 100;
        let mpHtml = '';
        if ((isPlayerTeamMember && this.uiConfig.showPlayerMP) || (!isPlayerTeamMember && this.uiConfig.showEnemyMP)) {
            if (combatant.mp) {
                const mpPercent = (combatant.mp.current / combatant.mp.max) * 100;
                mpHtml = `
                    <div class="stat-bar mp-bar">
                        <div class="bar-fill" style="width: ${mpPercent}%;"></div>
                        <span class="bar-text">MP: ${combatant.mp.current}/${combatant.mp.max}</span>
                    </div>
                `;
            }
        }

        let apHtml = '';
        if ((isPlayerTeamMember && this.uiConfig.showPlayerAP) || (!isPlayerTeamMember && this.uiConfig.showEnemyAP)) {
            if (combatant.ap) { // Assuming AP is 0-1000 or similar for a progress bar
                const apPercent = (combatant.ap.current / combatant.ap.max) * 100;
                apHtml = `
                    <div class="stat-bar ap-bar">
                        <div class="bar-fill" style="width: ${apPercent}%;"></div>
                        <span class="bar-text">AP: ${combatant.ap.current}/${combatant.ap.max}</span>
                    </div>
                `;
            }
        }
        
        let statusEffectsHtml = '';
        if (combatant.statusEffects && combatant.statusEffects.length > 0) {
            statusEffectsHtml = `<div class="status-effects">Status: ${combatant.statusEffects.map(se => se.name).join(', ')}</div>`;
        }

        card.innerHTML = `
            <h4>${combatant.name} ${isPlayerTeamMember && combatant.level ? `(Lvl ${combatant.level})` : ''}</h4>
            <div class="stat-bar hp-bar">
                <div class="bar-fill" style="width: ${hpPercent}%;"></div>
                <span class="bar-text">HP: ${combatant.hp.current}/${combatant.hp.max}</span>
            </div>
            ${mpHtml}
            ${apHtml}
            ${statusEffectsHtml}
        `;

        if (this.localState.isTargeting) {
            // Check if this combatant is a valid target based on this.localState.targetTeamType
            let isValidTarget = false;
            if (this.localState.targetTeamType === 'ENEMY' && !isPlayerTeamMember) isValidTarget = true;
            else if (this.localState.targetTeamType === 'ALLY' && isPlayerTeamMember) isValidTarget = true;
            else if (this.localState.targetTeamType === 'SELF' && combatant.id === this.localState.activeCharacterId) isValidTarget = true;
            else if (this.localState.targetTeamType === 'ANY') isValidTarget = true;

            if (isValidTarget && combatant.hp.current > 0) {
                card.classList.add('targetable');
                if (this.localState.currentTargets.includes(combatant.id)) {
                    card.classList.add('target-selected');
                }
            }
        }
        return card;
    },

    // --- Player Interaction ---
    displayActionMenu: function(characterId, availableActions) {
        this.localState.activeCharacterId = characterId;
        this.localState.isTargeting = false; // Reset targeting when new action menu is shown
        this.localState.selectedAction = null;
        this.localState.currentTargets = [];

        if (!this.elements.actionMenuArea) {
            console.error("BattleUI: Action menu area not found.");
            return;
        }
        this.elements.actionMenuArea.innerHTML = `<h5>${characterId}'s Turn - Choose Action:</h5>`;
        const ul = document.createElement('ul');
        ul.className = 'action-list';

        availableActions.forEach(action => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.dataset.actionId = action.id;
            // Include MP cost in name if applicable
            button.textContent = action.name + (action.mpCost ? ` (${action.mpCost}MP)` : '');
            button.title = action.description || action.name;
            if (action.mpCost && this.localState.activeCharacterId) {
                 // Find active character data to check MP - This requires BattleUI to have current combatant data or be passed it
                 // For simplicity, we assume the calling game logic already filtered actions based on MP
            }

            button.addEventListener('click', () => this._handleActionClick(action));
            li.appendChild(button);
            ul.appendChild(li);
        });
        this.elements.actionMenuArea.appendChild(ul);
        this.updateCombatantsDisplayWithTargetingState(); // Re-render cards to remove targeting highlights if any
    },

    _handleActionClick: function(action) {
        console.log("BattleUI: Action clicked -", action);
        this.localState.selectedAction = action;
        this.localState.currentTargets = []; // Clear previous targets

        if (action.targeting === 'SELF') {
            this.localState.currentTargets = [this.localState.activeCharacterId];
            this._submitAction();
        } else if (action.targeting === 'NONE' || action.targeting === 'ALL_ALLIES' || action.targeting === 'ALL_ENEMIES') {
             // No specific target selection needed from UI, CombatProcessor will handle it
            this._submitAction();
        }
        else {
            this.localState.isTargeting = true;
            this.localState.maxTargets = (action.targeting && (action.targeting.startsWith('MULTI_') || action.targeting === 'ALL_')) ? 99 : 1; // Simplified multi-target
            this.localState.targetTeamType = action.targeting.includes('ENEMY') ? 'ENEMY' : (action.targeting.includes('ALLY') ? 'ALLY' : 'ANY');
            this.elements.actionMenuArea.innerHTML = `<p>Targeting: ${action.name}. Select ${this.localState.targetTeamType.toLowerCase()}(s).</p><button id="cancel-targeting-btn">Cancel</button>`;
            document.getElementById('cancel-targeting-btn').onclick = () => this.displayActionMenu(this.localState.activeCharacterId, this.lastAvailableActions || []); // Need to store availableActions

            this.updateCombatantsDisplayWithTargetingState();
        }
    },
    
    updateCombatantsDisplayWithTargetingState: function() {
        // This function would re-call _renderCombatantCard for all combatants
        // to update their 'targetable' and 'target-selected' classes.
        // For brevity, this is a simplified concept. A full implementation would
        // iterate through cached combatant data and re-render.
        // Example: this.updateCombatants(this.cachedPlayerPartyData, this.cachedEnemyGroupData, this.localState.activeCharacterId);
        // You'd need to cache the data passed to the last updateCombatants call.
        console.log("BattleUI: Re-rendering combatants for targeting state.");
        // This is a stub; a full impl would need to access the last known party/enemy data.
    },

    _handleTargetClick: function(event) {
        if (!this.localState.isTargeting || !event.target.closest('.combatant-card.targetable')) {
            return;
        }
        const targetCard = event.target.closest('.combatant-card.targetable');
        const targetId = targetCard.dataset.id;

        if (this.localState.currentTargets.includes(targetId)) {
            this.localState.currentTargets = this.localState.currentTargets.filter(id => id !== targetId);
            targetCard.classList.remove('target-selected');
        } else {
            if (this.localState.currentTargets.length < this.localState.maxTargets) {
                this.localState.currentTargets.push(targetId);
                targetCard.classList.add('target-selected');
            }
        }

        if (this.localState.currentTargets.length >= this.localState.maxTargets) {
            this._submitAction();
        }
    },

    _submitAction: function() {
        if (this.localState.selectedAction && this.actionCallback) {
            const actionData = {
                type: this.localState.selectedAction.type || 'ACTION', // e.g. 'ATTACK', 'SPELL', 'ITEM'
                actionId: this.localState.selectedAction.id,
                casterId: this.localState.activeCharacterId,
                targetIds: [...this.localState.currentTargets], // Pass a copy
                // Include spellId or itemId if relevant from selectedAction
                spellId: this.localState.selectedAction.spellId,
                itemId: this.localState.selectedAction.itemId,
            };
            console.log("BattleUI: Submitting action -", actionData);
            this.actionCallback(actionData);
        }
        // Reset state for next turn/action
        this.localState.isTargeting = false;
        this.localState.selectedAction = null;
        this.localState.currentTargets = [];
        if (this.elements.actionMenuArea) {
            this.elements.actionMenuArea.innerHTML = '<p>Waiting for next turn...</p>';
        }
        this.updateCombatantsDisplayWithTargetingState();
    },

    _setupGlobalEventListeners: function() {
        // Listener for combatant card clicks (for targeting)
        // Using event delegation on the container
        this.container.addEventListener('click', (event) => {
            if (this.localState.isTargeting) {
                this._handleTargetClick(event);
            }
        });
    },

    // --- Feedback ---
    addCombatLogMessage: function(message, type = 'info') {
        if (!this.elements.combatLogArea) {
            // console.warn("BattleUI: Combat log area not found. Message:", message);
            return;
        }
        const p = document.createElement('p');
        p.textContent = message;
        p.className = `log-message type-${type}`;
        this.elements.combatLogArea.appendChild(p);
        this.elements.combatLogArea.scrollTop = this.elements.combatLogArea.scrollHeight; // Auto-scroll
    },

    showBattleOutcome: function(outcomeText, rewardsInfo = null) {
        if (!this.elements.messageOverlay) return;
        this.elements.messageOverlay.innerHTML = `<h2>${outcomeText}</h2>`;
        if (rewardsInfo) {
            // TODO: Format and display rewards (XP, gold, items)
            this.elements.messageOverlay.innerHTML += `<p>Rewards: ${JSON.stringify(rewardsInfo)}</p>`;
        }
        this.elements.messageOverlay.innerHTML += `<button id="battle-outcome-continue">Continue</button>`;
        this.elements.messageOverlay.style.display = 'flex';

        // The calling game module should handle what "Continue" does.
        // This button is just for the UI.
        document.getElementById('battle-outcome-continue').onclick = () => {
            this.elements.messageOverlay.style.display = 'none';
            // Optionally call a specific callback if needed, or let the parent game handle post-battle flow.
        };
    },


    // --- STYLES ---
    _applyStyles: function() {
        const styleId = 'battleUIStyles';
        if (document.getElementById(styleId)) return;

        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
            .battle-ui-wrapper { display: flex; flex-direction: column; height: 100%; background: #2c3e50; color: #ecf0f1; padding: 10px; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; position: relative; }
            .battle-message-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 100; text-align: center; padding: 20px; }
            .battle-message-overlay h2 { color: #f1c40f; margin-bottom: 15px; }
            .battle-message-overlay p { font-size: 1.1em; margin-bottom: 20px; }
            .battle-message-overlay button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; }
            
            .battle-stage { display: flex; flex-direction: column; flex-grow: 1; margin-bottom: 10px; }
            .battle-team-area { padding: 10px; border-radius: 5px; margin-bottom: 10px; }
            .enemy-team-area { background: rgba(192, 57, 43, 0.1); border: 1px solid #c0392b; }
            .player-team-area { background: rgba(41, 128, 185, 0.1); border: 1px solid #2980b9; }
            .battle-team-area h3 { margin-top: 0; margin-bottom: 8px; text-align: center; color: #bdc3c7; border-bottom: 1px solid #7f8c8d; padding-bottom: 5px; }
            .combatants-container { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }

            .combatant-card { background: #34495e; border: 1px solid #7f8c8d; border-radius: 4px; padding: 8px; width: 150px; min-height: 120px; display: flex; flex-direction: column; font-size: 0.9em; transition: transform 0.2s, box-shadow 0.2s; }
            .combatant-card.active-turn { border-color: #f1c40f; box-shadow: 0 0 10px #f1c40f; transform: scale(1.05); }
            .combatant-card.defeated { opacity: 0.5; background: #7f8c8d; }
            .combatant-card.defeated h4 { text-decoration: line-through; }
            .combatant-card h4 { margin: 0 0 5px 0; color: #ecf0f1; font-size: 1em; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .combatant-card.targetable { cursor: pointer; border-color: #2ecc71; }
            .combatant-card.targetable:hover { box-shadow: 0 0 8px #2ecc71; }
            .combatant-card.target-selected { border-color: #e67e22; background-color: #4a627a; }

            .stat-bar { background: #1f2b38; border-radius: 3px; height: 18px; margin-bottom: 4px; position: relative; overflow: hidden; border: 1px solid #566573; }
            .stat-bar .bar-fill { height: 100%; transition: width 0.3s ease-out; }
            .stat-bar .bar-text { position: absolute; left: 5px; right: 5px; top: 0; color: #fff; font-size: 0.75em; line-height: 18px; text-shadow: 1px 1px 1px #000; }
            .hp-bar .bar-fill { background: #27ae60; }
            .mp-bar .bar-fill { background: #3498db; }
            .ap-bar .bar-fill { background: #f39c12; }
            .status-effects { font-size: 0.8em; color: #bdc3c7; margin-top: 5px; text-align: center; }

            .battle-action-menu-area { background: #2c3e50; padding: 10px; border-top: 1px solid #7f8c8d; text-align: center; }
            .battle-action-menu-area h5 { margin-top: 0; margin-bottom: 10px; }
            .action-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
            .action-list button { background: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
            .action-list button:hover { background: #2980b9; }
            .action-list button:disabled { background: #7f8c8d; cursor: not-allowed; }

            .battle-combat-log-area { background: #1f2b38; padding: 10px; border-top: 1px solid #7f8c8d; height: 100px; overflow-y: auto; font-size: 0.85em; }
            .battle-combat-log-area h4 { margin-top: 0; margin-bottom: 5px; }
            .log-messages p { margin: 0 0 3px 0; line-height: 1.3; }
            .log-messages .type-damage { color: #e74c3c; }
            .log-messages .type-heal { color: #2ecc71; }
            .log-messages .type-status { color: #f1c40f; }
            .log-messages .type-info { color: #bdc3c7; }
            .log-messages .type-critical { font-weight: bold; color: #e67e22; }
        `;
        document.head.appendChild(styleElement);
    }
};

// Make it globally available for simplicity in this example context
// In a real project, you might use ES6 modules or another module system.
if (typeof window !== 'undefined') {
    window.BattleUI = BattleUI;
}
