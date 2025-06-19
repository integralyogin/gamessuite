// js/derivedStatsGame.js
const DerivedStatsGame = {
    id: 'DerivedStatsGame',
    gameContainer: null,
    successCallback: null,
    globalFailureCallback: null,
    previousData: null,
    playerName: '',

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        console.log(`${this.id}: Initializing with data:`, previousData);
        this.gameContainer = gameContainer;
        this.successCallback = successCallback;
        this.globalFailureCallback = globalFailureCallback;
        this.previousData = previousData;
        this.playerName = previousData.playerName || 'Player';

        this.processStats();
    },

    processStats: function() {
        this.gameContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; max-height: 400px; overflow-y: auto;">
                <h2>Character Advancement Complete!</h2>
                <p>Calculating comprehensive combat and utility attributes based on your core stats...</p>
                <div id="derived-stats-display" style="margin-top: 20px; padding: 15px; background-color: #e9e9e9; border-radius: 8px; text-align: left; display: inline-block; max-width: 90%;">
                    Loading detailed stats...
                </div>
            </div>
        `;

        const coreStatDefaults = {
            strength: 5, dexterity: 5, constitution: 5,
            intelligence: 5, wisdom: 5, charisma: 5
        };
        
        const baseStats = {
            ...coreStatDefaults,
            ...(this.previousData.playerStats || {}) 
        };
        
        console.log(`DEBUG: ${this.id}: Effective base stats for calculation:`, JSON.parse(JSON.stringify(baseStats)));

        const STR = baseStats.strength;
        const DEX = baseStats.dexterity;
        const CON = baseStats.constitution;
        const INT = baseStats.intelligence;
        const WIS = baseStats.wisdom;
        const CHA = baseStats.charisma;

        const derived = {
            // Core Resources
            hp: (CON * 10) + (STR * 3),
            maxHp: (CON * 10) + (STR * 3),
            mp: (INT * 8) + (WIS * 5),
            maxMp: (INT * 8) + (WIS * 5),
            sp: (CON * 6) + (DEX * 4), 
            maxSp: (CON * 6) + (DEX * 4),

            // Regeneration Rates
            hpRegenRate: Math.max(1, Math.floor(CON / 2)),
            mpRegenRate: Math.max(1, Math.floor(WIS / 2)),
            spRegenRate: Math.max(1, Math.floor(CON / 3) + Math.floor(DEX / 3)),

            // Movement
            moveSpeed: 10 + DEX,
            jumpHeight: 5 + Math.floor(DEX / 2),

            // Combat - Offense
            basePhysicalAttack: (STR * 2) + Math.floor(DEX / 2),
            baseMagicalAttack: (INT * 2) + Math.floor(WIS / 2), 
            attackSpeedRating: 50 + (DEX * 5), 
            
            // Combat - Defense
            physicalDefenseValue: CON + Math.floor(STR / 3), 
            magicalDefenseValue: WIS + Math.floor(INT / 3),  

            // Combat - Modifiers
            critChancePercent: Math.min(75, 5 + Math.floor(DEX / 2) + Math.floor(WIS / 4)), 
            critDamageBonusPercent: 50 + STR + Math.floor(INT / 3), 
            accuracyRating: 70 + (DEX * 2) + Math.floor(WIS / 2),
            evasionRating: 10 + (DEX * 2) + Math.floor(STR / 4),

            // Utility / RPG Specific
            actionPointsMax: 3 + Math.floor(DEX / 4) + Math.floor(INT / 5), 
            carryWeight: 50 + (STR * 10), 

            // Resistances (%)
            fireResistancePercent: Math.min(90, Math.floor(CON / 3) + Math.floor(WIS / 6)),
            coldResistancePercent: Math.min(90, Math.floor(CON / 3) + Math.floor(INT / 6)),
            poisonResistancePercent: Math.min(90, Math.floor(CON / 2) + Math.floor(STR / 5)),
            shockResistancePercent: Math.min(90, Math.floor(DEX / 3) + Math.floor(WIS / 6)),
            shadowResistancePercent: Math.min(90, Math.floor(WIS / 3) + Math.floor(CHA / 5)),
            holyResistancePercent: Math.min(90, Math.floor(WIS / 3) + Math.floor(CHA / 5)),

            // Skill Bonuses
            barteringBonusPercent: Math.floor(CHA / 2), 
            stealthRating: (DEX * 3) + Math.floor(INT / 4),
            lockpickingRating: (DEX * 2) + Math.floor(INT / 2),
            craftingSuccessBonusPercent: Math.floor(INT / 3) + Math.floor(WIS / 3),

            // --- NEW Physical Skills --- Ensure these lines are present and correct! ---
            climbingSkill: Math.max(0, Math.floor(STR / 2) + Math.floor(DEX / 0.5)),
            jumpingSkill: Math.max(0, Math.floor(DEX / 0.5) + Math.floor(STR / 3)),
            runningSkill: Math.max(0, Math.floor(DEX / 0.5) + Math.floor(CON / 3))
            // --- End of NEW Physical Skills ---
        };
        
        console.log(`DEBUG: ${this.id}: Calculated 'derived' object (should include new skills):`, JSON.parse(JSON.stringify(derived)));

        const newPlayerStats = { ...baseStats, ...derived };
        
        // --- CRITICAL DEBUG LOG ---
        // This will show the full playerStats object that is about to be used for display and saving.
        console.log(`DEBUG: ${this.id}: 'newPlayerStats' object before display and save:`, JSON.parse(JSON.stringify(newPlayerStats)));
        // ---

        const displayArea = this.gameContainer.querySelector('#derived-stats-display');
        if (displayArea) {
            let statsHTML = '<h4>Core Attributes:</h4>';
            statsHTML += `<p>STR: ${newPlayerStats.strength}, DEX: ${newPlayerStats.dexterity}, CON: ${newPlayerStats.constitution}, INT: ${newPlayerStats.intelligence}, WIS: ${newPlayerStats.wisdom}, CHA: ${newPlayerStats.charisma}</p>`;
            statsHTML += '<hr><h4>Resources & Regen:</h4>';
            statsHTML += `<p>HP: ${newPlayerStats.hp}/${newPlayerStats.maxHp} (+${newPlayerStats.hpRegenRate}/5s)</p>`;
            statsHTML += `<p>MP: ${newPlayerStats.mp}/${newPlayerStats.maxMp} (+${newPlayerStats.mpRegenRate}/5s)</p>`;
            statsHTML += `<p>SP: ${newPlayerStats.sp}/${newPlayerStats.maxSp} (+${newPlayerStats.spRegenRate}/5s)</p>`;
            statsHTML += '<hr><h4>Combat Stats:</h4>';
            statsHTML += `<p>Phys Atk: ${newPlayerStats.basePhysicalAttack}, Magic Atk: ${newPlayerStats.baseMagicalAttack}, Atk Speed Rating: ${newPlayerStats.attackSpeedRating}</p>`;
            statsHTML += `<p>Phys Def (PV): ${newPlayerStats.physicalDefenseValue}, Magic Def (DV): ${newPlayerStats.magicalDefenseValue}</p>`;
            statsHTML += `<p>Crit Chance: ${newPlayerStats.critChancePercent}%, Crit Bonus Dmg: +${newPlayerStats.critDamageBonusPercent}%</p>`;
            statsHTML += `<p>Accuracy: ${newPlayerStats.accuracyRating}, Evasion: ${newPlayerStats.evasionRating}</p>`;
            statsHTML += '<hr><h4>Utility & General Skills:</h4>';
            statsHTML += `<p>Move Speed: ${newPlayerStats.moveSpeed}, Jump Height: ${newPlayerStats.jumpHeight}, Max AP: ${newPlayerStats.actionPointsMax}</p>`;
            statsHTML += `<p>Carry Weight: ${newPlayerStats.carryWeight}</p>`;
            statsHTML += `<p>Barter Bonus: ${newPlayerStats.barteringBonusPercent}%, Stealth: ${newPlayerStats.stealthRating}, Lockpick: ${newPlayerStats.lockpickingRating}</p>`;
            statsHTML += `<p>Crafting Bonus: ${newPlayerStats.craftingSuccessBonusPercent}%</p>`;
            statsHTML += '<hr><h4>Physical Action Skills:</h4>';
            statsHTML += `<p>Climbing Skill: ${newPlayerStats.climbingSkill !== undefined ? newPlayerStats.climbingSkill : 'N/A'}</p>`; // Check if undefined for display
            statsHTML += `<p>Jumping Skill: ${newPlayerStats.jumpingSkill !== undefined ? newPlayerStats.jumpingSkill : 'N/A'}</p>`;
            statsHTML += `<p>Running Skill: ${newPlayerStats.runningSkill !== undefined ? newPlayerStats.runningSkill : 'N/A'}</p>`;
            statsHTML += '<hr><h4>Resistances:</h4>';
            statsHTML += `<p>Fire: ${newPlayerStats.fireResistancePercent}%, Cold: ${newPlayerStats.coldResistancePercent}%, Poison: ${newPlayerStats.poisonResistancePercent}%</p>`;
            statsHTML += `<p>Shock: ${newPlayerStats.shockResistancePercent}%, Shadow: ${newPlayerStats.shadowResistancePercent}%, Holy: ${newPlayerStats.holyResistancePercent}%</p>`;
            displayArea.innerHTML = statsHTML;
        }

        const gameSpecificData = { playerStats: newPlayerStats }; 

        // --- CRITICAL DEBUG LOG ---
        console.log(`DEBUG: ${this.id}: 'gameSpecificData' being sent to savePlayerData:`, JSON.parse(JSON.stringify(gameSpecificData)));
        // ---

        this.savePlayerData(gameSpecificData)
            .then(saveResponse => {
                console.log(`${this.id}: Player data saved response:`, saveResponse);
                setTimeout(() => {
                    const dataForManager = {
                        playerName: this.playerName,
                        gameName: this.id,
                        playerStats: newPlayerStats 
                    };
                    this.successCallback(dataForManager);
                }, 3500); 
            })
            .catch(error => {
                console.error(`${this.id}: Failed to save player data:`, error);
                setTimeout(() => {
                    const dataForManager = {
                        playerName: this.playerName,
                        gameName: this.id,
                        playerStats: newPlayerStats 
                    };
                    this.successCallback(dataForManager); 
                }, 3500);
            });
    },

    savePlayerData: async function(gameSpecificData) {
        const dataToSave = {
            playerName: this.playerName,
            gameName: this.id,
            timestamp: new Date().toISOString(),
            gameSpecificData: gameSpecificData
        };

        // --- CRITICAL DEBUG LOG ---
        console.log(`DEBUG: ${this.id}: Data being sent to PHP (dataToSave):`, JSON.parse(JSON.stringify(dataToSave)));
        // ---

        console.log(`${this.id}: Attempting to save data:`, dataToSave);

        try {
            const response = await fetch('save-player.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`${this.id}: Error saving player data:`, error);
            throw error;
        }
    },

    destroy: function() {
        console.log(`${this.id}: Destroying.`);
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
    }
};
