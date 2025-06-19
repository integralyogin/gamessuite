// js/postCombatHandler.js
"use strict";

const PostCombatHandler = {
    /**
     * Performs post-combat healing, typically for clerics.
     * @param {Array} playerParty - The current player party array.
     * @param {Object} gameConfig - The game's configuration object (for heal limits, etc.).
     * @param {Function} logMessageCallback - Function to log messages to the game log.
     * @param {Function} displayPartyCallback - Function to refresh the party display.
     */
    _performHealing: function(playerParty, gameConfig, logMessageCallback, displayPartyCallback) {
        let healingWasDone = false;
        const survivingParty = playerParty.filter(p => p.hp.current > 0);

        survivingParty.forEach(member => {
            if (member.class === "Cleric" && member.skills) {
                const healSkill = member.skills.find(skill => skill.id === "skill_heal_light");
                if (healSkill) {
                    const mpCost = healSkill.cost ?? 8;
                    const healingAmount = healSkill.healingAmount ?? 15;
                    
                    let healTargets = survivingParty
                        .filter(p => p.hp.current < p.hp.max && p.hp.current < (p.hp.max * gameConfig.postCombatHealHPLimit))
                        .sort((a,b) => (a.hp.current / a.hp.max) - (b.hp.current / b.hp.max));
                    
                    if (healTargets.length === 0 && member.hp.current < member.hp.max && member.hp.current < (member.hp.max * gameConfig.postCombatHealHPLimit)) {
                        healTargets.push(member);
                    }

                    for (const target of healTargets) {
                        if (member.mp?.current >= mpCost && target.hp.current < target.hp.max) {
                            member.mp.current -= mpCost; // Mutates playerParty member
                            const oldHP = target.hp.current;
                            target.hp.current = Math.min(target.hp.max, target.hp.current + healingAmount);
                            const actualHeal = target.hp.current - oldHP;
                            if (actualHeal > 0) {
                                logMessageCallback(`${member.name} casts ${healSkill.name} on ${target.name}, restoring ${actualHeal} HP. (MP: ${member.mp.current}/${member.mp.max})`, "heal");
                                healingWasDone = true;
                            }
                        } else if (member.mp?.current < mpCost) {
                            logMessageCallback(`${member.name} lacks MP for more healing.`, "info");
                            break; 
                        }
                    }
                }
            }
        });
        if (healingWasDone) {
            displayPartyCallback(); // Refresh party display if healing occurred
        }
        // Not strictly necessary to return healingWasDone if the caller doesn't use it,
        // but kept for potential future use.
    },

    /**
     * Processes the results of a combat encounter.
     * @param {Object} combatResult - The result object from CombatProcessorGame.
     * @param {Object} game - The RoguelikeDungeonGame instance (acting as game context).
     */
    process: function(combatResult, game) {
        console.log("PostCombatHandler: Processing. Outcome:", combatResult.outcome, "XP:", combatResult.totalXpAwarded);
        game.localState.isCombatActive = false;
        if (game.localState.combatTurnInterval) {
            clearTimeout(game.localState.combatTurnInterval);
            game.localState.combatTurnInterval = null;
        }

        game.logMessage(`The battle is over. Victor: ${combatResult.outcome || 'Unknown'} ${combatResult.reason ? `(${combatResult.reason})` : ''}`, 
                        combatResult.outcome === 'player' ? 'victory' : (combatResult.outcome === 'enemy' ? 'defeat' : 'error'));

        if (combatResult.outcome === 'player') {
            game.logMessage("You are victorious!", "victory");

            // XP Distribution
            if (combatResult.totalXpAwarded > 0) {
                const survivingPartyMembers = game.localState.playerParty.filter(p => p.hp.current > 0);
                if (survivingPartyMembers.length > 0) {
                    const xpPerMember = Math.floor(combatResult.totalXpAwarded / survivingPartyMembers.length);
                    game.logMessage(`Each survivor gains ${xpPerMember} XP.`, "xp");
                    survivingPartyMembers.forEach(member => {
                        const ptu = game.localState.playerParty.find(p => p.instanceId === member.instanceId);
                        if (ptu) {
                            ptu.xp = (ptu.xp ?? 0) + xpPerMember;
                            game.logMessage(`${ptu.name} gained ${xpPerMember} XP. Total: ${ptu.xp}/${ptu.xpToNextLevel}`, "xp");
                            if (ptu.xpToNextLevel && ptu.xp >= ptu.xpToNextLevel) game.logMessage(`${ptu.name} can level up!`, "levelup");
                        }
                    });
                }
            }

            // Loot Handling
            if (combatResult.droppedLoot?.length > 0) {
                game.logMessage("Loot Found:", "loot");
                if (!game.sharedData.playerInventory) game.sharedData.playerInventory = [];
                combatResult.droppedLoot.forEach(item => {
                    game.logMessage(`- ${item.quantity}x ${item.name} (Val: ${item.value ?? 0}ea)`, "loot");
                    const existingItem = game.sharedData.playerInventory.find(invItem => invItem.itemId === item.itemId);
                    if (existingItem) existingItem.quantity += item.quantity;
                    else game.sharedData.playerInventory.push(JSON.parse(JSON.stringify(item)));
                });
            } else {
                game.logMessage("No significant loot was found.", "info");
            }

            game.displayParty(); // Refresh party display with new XP/loot effects
            game.updateHeaderDisplay(); 

            game.logMessage("The party tends to wounds...", "info");
            this._performHealing(
                game.localState.playerParty, 
                game.config, 
                game.logMessage.bind(game), // Ensure 'this' context for logMessage
                game.displayParty.bind(game)  // Ensure 'this' context for displayParty
            );

            // Decide next action
            const allLiving = game.localState.playerParty.filter(p => p.hp.current > 0);
            const partyAtFullHealth = allLiving.length > 0 && allLiving.every(p => p.hp.current === p.hp.max);

            if (partyAtFullHealth && game.localState.floorNumber < game.config.maxAutoDescendFloor) {
                game.logMessage("Refreshed, you press on...", "info");
                game.localState.floorNumber++;
                game.sharedData.currentDungeonFloor = game.localState.floorNumber;
                game.updateHeaderDisplay();
                game.showLoading(true, `Descending to Floor ${game.localState.floorNumber}...`);
                setTimeout(() => game.triggerMonsterGeneration(), 1500); // Assumes triggerMonsterGeneration is method of 'game'
            } else if (game.localState.floorNumber >= game.config.floorEncounters.length || (partyAtFullHealth && game.localState.floorNumber >= game.config.maxAutoDescendFloor)) {
                game.logMessage(`Floor ${game.localState.floorNumber} cleared! Congrats!`, "victory");
                game.updateActionButtonsForFinalVictory();
            } else {
                game.updateActionButtonsForVictory();
            }
        } else if (combatResult.outcome === 'enemy') {
            game.logMessage("Your party has been defeated.", "defeat");
            game.updateActionButtonsForDefeat();
        } else { // Error or inconclusive
            game.logMessage(`Battle ended inconclusively. ${combatResult.reason || ''}`.trim(), "error");
            game.updateActionButtonsForDefeat();
        }
        
        // Persist party state to sharedData after combat resolution
        game.sharedData.playerRoster = game.localState.playerParty.map(p => JSON.parse(JSON.stringify(p)));
    }
};

// Make PostCombatHandler globally available if you're not using ES modules
// (Assuming a browser environment)
if (typeof window !== 'undefined') {
    window.PostCombatHandler = PostCombatHandler;
}
