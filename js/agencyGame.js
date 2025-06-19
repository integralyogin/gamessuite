// js/agencyGame.js
const AgencyGame = {
    id: 'AgencyGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        refreshRecruitsCost: 10,
    },

    localState: {
        availableRecruits: [],
        playerRoster: [], 
        isLoadingRecruits: false
    },

    elements: {
        playerGold: null,
        availableRecruitsContainer: null,
        playerRosterContainer: null,
        rosterStatusMsg: null,
        refreshRecruitsBtn: null,
        exitGuildBtn: null,
        loadingOverlay: null 
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (!this.sharedData.playerRoster) {
            this.sharedData.playerRoster = [];
        }
        this.localState.playerRoster = this.sharedData.playerRoster;

        console.log("AgencyGame: Initializing. SharedData:", JSON.parse(JSON.stringify(this.sharedData)));

        this.renderBaseLayout();
        this.cacheElements(); 
        this.attachEventListeners();
        
        if (this.elements.refreshRecruitsBtn) {
            this.elements.refreshRecruitsBtn.dataset.initialLoad = "true";
        }

        if (this.localState.availableRecruits.length === 0) {
            this.triggerPawnGeneration();
        } else {
            this.updateDisplay(); 
        }
    },

    renderBaseLayout: function() {
        this.container.innerHTML = `
            <div class="heroes-guild-game">
                <div id="guildLoadingOverlayAG" class="guild-loading-overlay" style="display: none;">
                    <p>Generating Recruits...</p>
                </div>
                <div class="guild-header">
                    <h1>Heroes' Guild</h1>
                    <div class="player-gold">Gold: <span id="guildPlayerGoldAG">${this.sharedData.totalCoins || 0}</span></div>
                </div>

                <div class="guild-main-content">
                    <div class="recruits-section">
                        <h2>Available Recruits</h2>
                        <div id="availableRecruitsContainerAG" class="cards-container">
                            </div>
                        <button id="refreshRecruitsBtnAG" class="guild-button refresh-button">Refresh Recruits (Cost: ${this.config.refreshRecruitsCost}G)</button>
                    </div>

                    <div class="roster-section">
                        <h2>Your Roster</h2>
                        <div id="playerRosterContainerAG" class="cards-container roster-cards-display">
                            </div>
                         <p id="rosterStatusMsgAG" style="text-align: center; display: none;">Your roster is empty. Hire some heroes!</p>
                    </div>
                </div>
                <button id="exitGuildBtnAG" class="guild-button exit-button">Exit Guild</button>
            </div>
        `;
        this.applyStyles();
    },

    cacheElements: function() {
        this.elements.playerGold = document.getElementById('guildPlayerGoldAG');
        this.elements.availableRecruitsContainer = document.getElementById('availableRecruitsContainerAG');
        this.elements.playerRosterContainer = document.getElementById('playerRosterContainerAG');
        this.elements.rosterStatusMsg = document.getElementById('rosterStatusMsgAG');
        this.elements.refreshRecruitsBtn = document.getElementById('refreshRecruitsBtnAG');
        this.elements.exitGuildBtn = document.getElementById('exitGuildBtnAG');
        this.elements.loadingOverlay = document.getElementById('guildLoadingOverlayAG'); 
    },

    applyStyles: function() {
        let style = document.getElementById('heroesGuildGameStyle'); 
        if (!style) {
            style = document.createElement('style');
            style.id = 'heroesGuildGameStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .heroes-guild-game { display: flex; flex-direction: column; height: 100%; padding: 15px; box-sizing: border-box; font-family: 'Verdana', sans-serif; background-color: #f4f0e8; color: #4a3b31; position: relative; }
            .guild-loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.75); color: white; display: flex; justify-content: center; align-items: center; font-size: 1.6em; z-index: 100; }
            .guild-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #8c7b6a; margin-bottom: 15px; }
            .guild-header h1 { margin: 0; font-size: 2em; color: #5a4a3e; font-variant: small-caps; }
            .player-gold { font-size: 1.2em; font-weight: bold; }
            .guild-main-content { display: flex; flex-grow: 1; gap: 20px; overflow: hidden; }
            .recruits-section, .roster-section { flex: 1; background-color: #efe8dC; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow-y: auto; }
            .recruits-section h2, .roster-section h2 { text-align: center; margin-top: 0; margin-bottom: 15px; color: #5a4a3e; border-bottom: 1px solid #c5b8a8; padding-bottom: 8px; font-variant: small-caps;}
            .cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; flex-grow: 1; align-content: flex-start; padding: 5px; } /* Wider cards */
            .recruit-card, .roster-card { 
                background-color: #fffaf0; border: 1px solid #d4c8b8; border-radius: 6px; 
                padding: 10px; text-align: left; 
                box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                display: flex; flex-direction: column; justify-content: space-between; 
                min-height: 420px; /* Increased height significantly */
                font-size: 0.85em; 
            }
            .recruit-card h3, .roster-card h3 { margin-top: 0; margin-bottom: 5px; font-size: 1.2em; text-align: center; color: #704241; border-bottom: 1px solid #eee; padding-bottom: 5px;}
            .recruit-card p, .roster-card p { margin: 2px 0; line-height: 1.4; }
            .recruit-card .info-grid, .roster-card .info-grid {
                display: grid; grid-template-columns: 1fr 1fr; gap: 0px 8px; margin-bottom: 5px;
            }
            .recruit-card .section-title, .roster-card .section-title { font-weight: bold; margin-top: 6px; margin-bottom: 2px; color: #6a5acd; font-size: 0.9em; border-top: 1px dashed #e0dcd1; padding-top: 4px;}
            .recruit-card .attributes-grid, .roster-card .attributes-grid {
                display: grid; grid-template-columns: repeat(3, 1fr); 
                gap: 1px 5px; margin-bottom: 5px; font-size: 0.95em;
            }
            .recruit-card .attributes-grid div, .roster-card .attributes-grid div { white-space: nowrap; }
            .recruit-card .attributes-grid strong, .roster-card .attributes-grid strong { font-weight: bold; color: #4a3b31; }
            
            .recruit-card .derived-stats-grid, .roster-card .derived-stats-grid {
                display: grid; grid-template-columns: repeat(2, 1fr);
                gap: 1px 8px; margin-bottom: 5px; font-size: 0.9em;
            }

            .recruit-card .skills-list, .roster-card .skills-list,
            .recruit-card .equipment-list, .roster-card .equipment-list {
                list-style: none; padding-left: 0; margin: 3px 0; font-size: 0.9em;
                max-height: 60px; overflow-y: auto; /* Scroll for many skills/items */
            }
            .recruit-card .skills-list li, .roster-card .skills-list li,
            .recruit-card .equipment-list li, .roster-card .equipment-list li { 
                background-color: #f0e6d6; padding: 2px 4px; border-radius: 3px; 
                margin-bottom: 2px; display: inline-block; margin-right: 3px; font-size: 0.9em;
            }
            .recruit-card .equipment-list li strong, .roster-card .equipment-list li strong { color: #542a00; }

            .recruit-card .cost { font-weight: bold; text-align: center; margin: 8px 0; font-size: 1.15em; color: #38761d; }
            .guild-button { padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease; background-color: #8c7b6a; color: white; }
            .guild-button.refresh-button { margin-top: 15px; background-color: #6a8c7b; }
            .guild-button.hire-button { background-color: #a5673f; margin-top: auto; width: 100%; padding: 10px 0;}
            .guild-button.exit-button { margin-top: 20px; width: 100%; background-color: #704241; }
            .guild-button:hover { filter: brightness(110%); }
            .guild-button:disabled { background-color: #cccccc; cursor: not-allowed; }
        `;
    },

    showLoading: function(show) { /* ... (same as before) ... */ 
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
        }
        if (this.elements.refreshRecruitsBtn) {
            this.elements.refreshRecruitsBtn.disabled = show;
        }
    },

    triggerPawnGeneration: function() { /* ... (same as before) ... */ 
        if (this.localState.isLoadingRecruits) return;
        const refreshCost = this.config.refreshRecruitsCost;
        const isInitialLoad = this.elements.refreshRecruitsBtn && this.elements.refreshRecruitsBtn.dataset.initialLoad === "true";
        if (!isInitialLoad && (this.sharedData.totalCoins || 0) < refreshCost) {
            console.warn("AgencyGame: Not enough gold to refresh recruits!");
            if(this.elements.availableRecruitsContainer) {
                const feedback = this.elements.availableRecruitsContainer.querySelector('.no-gold-feedback');
                if (feedback) feedback.remove(); 
                const msg = document.createElement('p');
                msg.textContent = "Not enough gold to refresh!";
                msg.style.color = "red"; msg.className = "no-gold-feedback";
                this.elements.availableRecruitsContainer.prepend(msg);
            }
            return;
        }
        if (!isInitialLoad) { 
            this.sharedData.totalCoins = (this.sharedData.totalCoins || 0) - refreshCost;
            this.updatePlayerGoldDisplay(); 
        }
        if(this.elements.refreshRecruitsBtn) this.elements.refreshRecruitsBtn.dataset.initialLoad = "false";
        this.localState.isLoadingRecruits = true;
        this.showLoading(true);
        const pawnGeneratorModule = window.PawnGeneratorGame; 
        if (pawnGeneratorModule && typeof pawnGeneratorModule.init === 'function') {
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none'; 
            if (this.container.parentNode) { this.container.appendChild(tempContainer); } 
            else { document.body.appendChild(tempContainer); }
            const generatorSuccess = (dataFromGenerator) => {
                if (dataFromGenerator && dataFromGenerator.generatedRecruits) {
                    this.localState.availableRecruits = dataFromGenerator.generatedRecruits;
                } else {
                    this.localState.availableRecruits = []; 
                    console.warn("AgencyGame: PawnGeneratorGame did not return 'generatedRecruits' array.");
                }
                this.localState.isLoadingRecruits = false; this.showLoading(false);
                this.updateDisplay();
                if (tempContainer.parentNode) tempContainer.remove(); 
            };
            const generatorFailure = (errorData) => {
                console.error("AgencyGame: PawnGeneratorGame failed:", errorData);
                this.localState.availableRecruits = []; 
                this.localState.isLoadingRecruits = false; this.showLoading(false);
                this.updateDisplay(); 
                if (tempContainer.parentNode) tempContainer.remove();
                if(this.elements.availableRecruitsContainer) {
                    this.elements.availableRecruitsContainer.innerHTML = `<p style="color:red; text-align:center;">Error generating recruits: ${errorData.reason || 'Unknown error'}</p>`;
                 }
            };
            pawnGeneratorModule.init(tempContainer, generatorSuccess, generatorFailure, { ...this.sharedData });
        } else {
            console.error(`AgencyGame: PawnGeneratorGame module not found globally or is not a valid module.`);
            this.localState.isLoadingRecruits = false; this.showLoading(false);
            if(this.elements.availableRecruitsContainer) {
                this.elements.availableRecruitsContainer.innerHTML = '<p style="color:red; text-align:center;">Recruit generation service unavailable.</p>';
            }
        }
    },

    renderRecruits: function() {
        if (!this.elements.availableRecruitsContainer) return;
        this.elements.availableRecruitsContainer.innerHTML = '';

        const oldFeedback = this.elements.availableRecruitsContainer.querySelector('.no-gold-feedback');
        if (oldFeedback) oldFeedback.remove();

        if (this.localState.availableRecruits.length === 0 && !this.localState.isLoadingRecruits) {
            this.elements.availableRecruitsContainer.innerHTML = '<p style="text-align:center; margin-top: 20px;">No recruits currently available. Try refreshing.</p>';
            return;
        }

        this.localState.availableRecruits.forEach(recruit => {
            const card = document.createElement('div');
            card.className = 'recruit-card';
            
            let attributesHTML = '<div class="section-title">Attributes:</div><div class="attributes-grid">';
            if (recruit.attributes) {
                const attrOrder = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.attributesOrder) 
                                  ? window.PawnGeneratorGame.config.attributesOrder 
                                  : Object.keys(recruit.attributes);
                attrOrder.forEach(attr => {
                    if (recruit.attributes.hasOwnProperty(attr)){
                        attributesHTML += `<div><strong>${attr.toUpperCase()}:</strong> ${recruit.attributes[attr]}</div>`;
                    }
                });
            } else { attributesHTML += '<span>N/A</span>'; }
            attributesHTML += '</div>';

            let skillsHTML = '<div class="section-title">Skills:</div><ul class="skills-list">';
            if (recruit.skills && recruit.skills.length > 0) {
                recruit.skills.forEach(skill => { skillsHTML += `<li>${skill.name}</li>`; });
            } else { skillsHTML += '<li>None</li>'; }
            skillsHTML += '</ul>';

            let equipmentHTML = '<div class="section-title">Equipment:</div><ul class="equipment-list">';
            let hasEquipment = false;
            if (recruit.equipment) {
                for (const slot of PawnGeneratorGameObject.config.equipmentSlots) { // Iterate in defined order
                    if (recruit.equipment[slot]) {
                        equipmentHTML += `<li><strong>${slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${recruit.equipment[slot].name}</li>`;
                        hasEquipment = true;
                    }
                }
            }
            if (!hasEquipment) { equipmentHTML += '<li>None</li>'; }
            equipmentHTML += '</ul>';
            
            let derivedStatsHTML = '<div class="section-title">Combat Stats:</div><div class="derived-stats-grid">';
            derivedStatsHTML += `<div><strong>Speed:</strong> ${recruit.speed !== undefined ? recruit.speed : 'N/A'}</div>`;
            derivedStatsHTML += `<div><strong>Dodge:</strong> ${recruit.dodgeRate !== undefined ? recruit.dodgeRate + '%' : 'N/A'}</div>`;
            derivedStatsHTML += `<div><strong>Accuracy:</strong> ${recruit.accuracyRate !== undefined ? recruit.accuracyRate + '%' : 'N/A'}</div>`;
            derivedStatsHTML += `<div><strong>Melee Dmg Bonus:</strong> ${recruit.meleeDamageBonus !== undefined ? (recruit.meleeDamageBonus >= 0 ? '+' : '') + recruit.meleeDamageBonus : 'N/A'}</div>`;
            // RangedDamageBonus can be added if needed
            derivedStatsHTML += '</div>';


            card.innerHTML = `
                <h3>${recruit.name || 'N/A'}</h3>
                <div class="info-grid">
                    <p><strong>Race:</strong> ${recruit.race || 'N/A'}</p>
                    <p><strong>Class:</strong> ${recruit.class || 'N/A'} (Lvl ${recruit.level || 1})</p>
                    <p><strong>Align:</strong> ${recruit.alignment || 'N/A'}</p>
                    <p><strong>Gold:</strong> ${recruit.gold !== undefined ? recruit.gold : 'N/A'}</p>
                </div>
                <div class="info-grid">
                    <p><strong>HP:</strong> ${recruit.hp ? `${recruit.hp.current}/${recruit.hp.max}` : 'N/A'}</p>
                    <p><strong>MP:</strong> ${recruit.mp ? `${recruit.mp.current}/${recruit.mp.max}` : 'N/A'}</p>
                </div>
                 <div class="info-grid">
                    <p><strong>ATK Bonus:</strong> ${recruit.attackBonus !== undefined ? recruit.attackBonus : 'N/A'}</p>
                    <p><strong>AC:</strong> ${recruit.armorClass !== undefined ? recruit.armorClass : 'N/A'}</p>
                </div>
                ${attributesHTML}
                ${derivedStatsHTML}
                ${skillsHTML}
                ${equipmentHTML}
                <p class="cost">Cost: ${recruit.cost || 'N/A'}G</p>
                <button class="guild-button hire-button" data-recruit-id="${recruit.id}" ${ (this.sharedData.totalCoins || 0) < (recruit.cost || 9999) ? 'disabled' : '' }>Hire</button>
            `;
            this.elements.availableRecruitsContainer.appendChild(card);
        });
    },

    renderRoster: function() { 
        if (!this.elements.playerRosterContainer || !this.elements.rosterStatusMsg) return;
        this.elements.playerRosterContainer.innerHTML = '';

        if (this.localState.playerRoster.length === 0) {
            this.elements.rosterStatusMsg.style.display = 'block';
        } else {
            this.elements.rosterStatusMsg.style.display = 'none';
            this.localState.playerRoster.forEach(hero => {
                const card = document.createElement('div');
                card.className = 'roster-card'; 
                
                let attributesHTML = '<div class="section-title">Attributes:</div><div class="attributes-grid">';
                if (hero.attributes) {
                     const attrOrder = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.attributesOrder) 
                                      ? window.PawnGeneratorGame.config.attributesOrder 
                                      : Object.keys(hero.attributes);
                    attrOrder.forEach(attr => {
                         if (hero.attributes.hasOwnProperty(attr)){
                            attributesHTML += `<div><strong>${attr.toUpperCase()}:</strong> ${hero.attributes[attr]}</div>`;
                        }
                    });
                } else { attributesHTML += '<span>N/A</span>'; }
                attributesHTML += '</div>';

                let skillsHTML = '<div class="section-title">Skills:</div><ul class="skills-list">';
                if (hero.skills && hero.skills.length > 0) {
                    hero.skills.forEach(skill => { skillsHTML += `<li>${skill.name}</li>`; });
                } else { skillsHTML += '<li>None</li>'; }
                skillsHTML += '</ul>';

                let equipmentHTML = '<div class="section-title">Equipment:</div><ul class="equipment-list">';
                let hasEquipment = false;
                if (hero.equipment) {
                     for (const slot of PawnGeneratorGameObject.config.equipmentSlots) {
                        if (hero.equipment[slot]) {
                            equipmentHTML += `<li><strong>${slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> ${hero.equipment[slot].name}</li>`;
                            hasEquipment = true;
                        }
                    }
                }
                if (!hasEquipment) { equipmentHTML += '<li>None</li>'; }
                equipmentHTML += '</ul>';

                let derivedStatsHTML = '<div class="section-title">Combat Stats:</div><div class="derived-stats-grid">';
                derivedStatsHTML += `<div><strong>Speed:</strong> ${hero.speed !== undefined ? hero.speed : 'N/A'}</div>`;
                derivedStatsHTML += `<div><strong>Dodge:</strong> ${hero.dodgeRate !== undefined ? hero.dodgeRate + '%' : 'N/A'}</div>`;
                derivedStatsHTML += `<div><strong>Accuracy:</strong> ${hero.accuracyRate !== undefined ? hero.accuracyRate + '%' : 'N/A'}</div>`;
                derivedStatsHTML += `<div><strong>Melee Dmg Bonus:</strong> ${hero.meleeDamageBonus !== undefined ? (hero.meleeDamageBonus >= 0 ? '+' : '') + hero.meleeDamageBonus : 'N/A'}</div>`;
                derivedStatsHTML += '</div>';

                card.innerHTML = `
                    <h3>${hero.name || 'N/A'}</h3>
                     <div class="info-grid">
                        <p><strong>Race:</strong> ${hero.race || 'N/A'}</p>
                        <p><strong>Class:</strong> ${hero.class || 'N/A'} (Lvl ${hero.level || 1})</p>
                        <p><strong>Align:</strong> ${hero.alignment || 'N/A'}</p>
                        <p><strong>Gold:</strong> ${hero.gold !== undefined ? hero.gold : 'N/A'}</p>
                    </div>
                    <div class="info-grid">
                        <p><strong>HP:</strong> ${hero.hp ? `${hero.hp.current}/${hero.hp.max}` : 'N/A'}</p>
                        <p><strong>MP:</strong> ${hero.mp ? `${hero.mp.current}/${hero.mp.max}` : 'N/A'}</p>
                    </div>
                    <div class="info-grid">
                        <p><strong>ATK Bonus:</strong> ${hero.attackBonus !== undefined ? hero.attackBonus : 'N/A'}</p>
                        <p><strong>AC:</strong> ${hero.armorClass !== undefined ? hero.armorClass : 'N/A'}</p>
                    </div>
                    ${attributesHTML}
                    ${derivedStatsHTML}
                    ${skillsHTML}
                    ${equipmentHTML}
                `;
                this.elements.playerRosterContainer.appendChild(card);
            });
        }
    },

    updatePlayerGoldDisplay: function() { /* ... (same as before) ... */ 
        if (this.elements.playerGold) {
            this.elements.playerGold.textContent = this.sharedData.totalCoins || 0;
        }
        document.querySelectorAll('.hire-button').forEach(button => {
            const recruitId = button.dataset.recruitId;
            const recruit = this.localState.availableRecruits.find(r => r.id === recruitId);
            if (recruit) {
                button.disabled = (this.sharedData.totalCoins || 0) < (recruit.cost || 9999);
            }
        });
    },

    updateDisplay: function() { /* ... (same as before) ... */ 
        this.renderRecruits();
        this.renderRoster();
        this.updatePlayerGoldDisplay();
    },

    handleHireRecruit: function(recruitId) { /* ... (same as before) ... */ 
        const recruitIndex = this.localState.availableRecruits.findIndex(r => r.id === recruitId);
        if (recruitIndex === -1) return;
        const recruit = this.localState.availableRecruits[recruitIndex];
        if ((this.sharedData.totalCoins || 0) >= (recruit.cost || 9999)) {
            this.sharedData.totalCoins -= recruit.cost;
            const hiredHero = JSON.parse(JSON.stringify(recruit));
            this.localState.playerRoster.push(hiredHero);
            this.sharedData.playerRoster = this.localState.playerRoster; 
            this.localState.availableRecruits.splice(recruitIndex, 1);
            console.log(`Hired ${recruit.name}. Remaining gold: ${this.sharedData.totalCoins}`);
            this.updateDisplay();
        } else {
            console.warn("AgencyGame: Not enough gold to hire!");
            if(this.elements.availableRecruitsContainer) {
                const feedback = this.elements.availableRecruitsContainer.querySelector('.no-gold-feedback');
                if (feedback) feedback.remove(); 
                const msg = document.createElement('p');
                msg.textContent = "Not enough gold for this hero!";
                msg.style.color = "red"; msg.className = "no-gold-feedback"; 
                const cardWithError = this.elements.availableRecruitsContainer.querySelector(`button[data-recruit-id="${recruitId}"]`).closest('.recruit-card');
                if(cardWithError) cardWithError.appendChild(msg); else this.elements.availableRecruitsContainer.prepend(msg);
            }
        }
    },

    attachEventListeners: function() { /* ... (same as before) ... */ 
        if (this.elements.availableRecruitsContainer) {
            this.elements.availableRecruitsContainer.addEventListener('click', (event) => {
                if (event.target.classList.contains('hire-button') && !event.target.disabled) {
                    const recruitId = event.target.dataset.recruitId;
                    this.handleHireRecruit(recruitId);
                }
            });
        }
        if (this.elements.refreshRecruitsBtn) {
            this.elements.refreshRecruitsBtn.onclick = () => this.triggerPawnGeneration();
        }
        if (this.elements.exitGuildBtn) {
            this.elements.exitGuildBtn.onclick = () => {
                console.log("Exiting AgencyGame. Final sharedData:", JSON.parse(JSON.stringify(this.sharedData)));
                this.successCallback(this.sharedData);
            };
        }
    },

    destroy: function() { /* ... (same as before) ... */ 
        console.log("AgencyGame: Destroying...");
        if (this.container) this.container.innerHTML = ''; 
        this.localState.availableRecruits = [];
    }
};

