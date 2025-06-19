// js/CombatProcessorGame.js
"use strict";

const CombatProcessorGameObject = {
    id: 'CombatProcessorGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        STANDARD_ACTION_COST: 1000,
        MAX_COMBAT_LOG_LENGTH: 100,
        SECONDS_PER_ROUND_FOR_REGEN: 6,
    },

    localState: {
        combatants: [], // Each will have an activeEffects: [] array
        roundCount: 1,
        isCombatActive: false,
        combatLog: [],
        onTurnProcessed: null,
        onCombatEnd: null
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (!sharedData.playerParty || !sharedData.monsterGroup) {
            console.error("CombatProcessorGame: playerParty or monsterGroup missing.");
            if(this.failureCallback) this.failureCallback({reason: "Missing party or monster data."});
            return;
        }
        if (!sharedData.options || typeof sharedData.options.onTurnProcessed !== 'function' || typeof sharedData.options.onCombatEnd !== 'function') {
            console.error("CombatProcessorGame: Callbacks missing.");
            if(this.failureCallback) this.failureCallback({reason: "Missing required callbacks."});
            return;
        }
        if (typeof SpellLogic === 'undefined' || typeof SpellLogic.getSpellData !== 'function' || typeof SpellLogic.executeSpell !== 'function') {
            console.error("CombatProcessorGame: SpellLogic module is not available or is invalid!");
            if (this.failureCallback) this.failureCallback({ reason: "SpellLogic module missing or invalid." });
            return;
        }

        this.localState.onTurnProcessed = sharedData.options.onTurnProcessed;
        this.localState.onCombatEnd = sharedData.options.onCombatEnd;

        this.setupCombat();
        this.logEvent("Combat started! Round 1 begins.");

        this.localState.onTurnProcessed(
            this.getCombatantStates(),
            [...this.localState.combatLog],
            this.localState.isCombatActive,
            null
        );
        this.localState.combatLog = [];

        if (this.successCallback) {
            this.successCallback({ message: "CombatProcessor initialized." });
        }
    },

    setupCombat: function() {
        this.localState.combatants = [];
        this.localState.roundCount = 0; // Start at 0, first increment will make it 1 and trigger round 1 effects
        this.localState.isCombatActive = true;
        this.localState.combatLog = [];
        let tempCombatants = [];

        console.log("CombatProcessorGame: Setting up combatants...");

        this.sharedData.playerParty.forEach((pawn, index) => {
            const combatantPawn = JSON.parse(JSON.stringify(pawn));
            combatantPawn.isPlayerCharacter = true;
            combatantPawn.team = "player";
            combatantPawn.currentHP = (pawn.hp && pawn.hp.current !== undefined) ? pawn.hp.current : 10;
            combatantPawn.maxHP = (pawn.hp && pawn.hp.max !== undefined) ? pawn.hp.max : 10;
            combatantPawn.currentMP = (pawn.mp && pawn.mp.current !== undefined) ? pawn.mp.current : 0;
            combatantPawn.maxMP = (pawn.mp && pawn.mp.max !== undefined) ? pawn.mp.max : 0;
            combatantPawn.skills = Array.isArray(pawn.skills) ? pawn.skills : [];
            combatantPawn.speed = pawn.speed || 30;
            combatantPawn.attributes = pawn.attributes || {};
            combatantPawn.attackBonus = pawn.attackBonus !== undefined ? pawn.attackBonus : (this.getAttributeModifier(pawn.attributes.str || 10));
            combatantPawn.armorClass = pawn.armorClass !== undefined ? pawn.armorClass : 10;
            combatantPawn.actionProgress = this.getRandomInt(0, Math.floor(this.config.STANDARD_ACTION_COST / 4));
            combatantPawn.initiativeRoll = (pawn.attributes ? this.getAttributeModifier(pawn.attributes.dex || 10) : 0) + this.getRandomInt(1, 20);
            combatantPawn.uniqueId = pawn.id || `player-${index}`;
            combatantPawn.hpRegenRate = pawn.hpRegenRate || 0;
            combatantPawn.mpRegenRate = pawn.mpRegenRate || 0;
            combatantPawn.dodgeRate = pawn.dodgeRate || 5;
            combatantPawn.accuracyRate = pawn.accuracyRate || 65;
            combatantPawn.meleeDamageBonus = pawn.meleeDamageBonus !== undefined ? pawn.meleeDamageBonus : this.getAttributeModifier(pawn.attributes.str || 10);
            combatantPawn.activeEffects = Array.isArray(pawn.activeEffects) ? pawn.activeEffects : []; // Initialize activeEffects

            console.log(`CPG Pawn: ${combatantPawn.name} (Class: ${combatantPawn.class}, MP: ${combatantPawn.currentMP}/${combatantPawn.maxMP}), HPRegen: ${combatantPawn.hpRegenRate}, MPRegen: ${combatantPawn.mpRegenRate}, Skills: [${combatantPawn.skills.map(s=>s.id).join(', ')}]`);
            tempCombatants.push(combatantPawn);
        });

        this.sharedData.monsterGroup.forEach((monster, index) => {
            const combatantMonster = JSON.parse(JSON.stringify(monster));
            combatantMonster.isPlayerCharacter = false;
            combatantMonster.team = "enemy";
            combatantMonster.maxHP = monster.baseStats ? monster.baseStats.hp : (monster.currentHP || 10);
            combatantMonster.currentHP = combatantMonster.maxHP;
            combatantMonster.currentMP = monster.baseStats ? (monster.baseStats.mp || 0) : 0;
            combatantMonster.maxMP = monster.baseStats ? (monster.baseStats.mp || 0) : 0;
            combatantMonster.speed = monster.baseStats ? (monster.baseStats.speed || 30) : 30;
            combatantMonster.skills = Array.isArray(monster.skills) ? monster.skills : [];
            combatantMonster.attributes = monster.attributes || (monster.baseStats || {});
            combatantMonster.actionProgress = this.getRandomInt(0, Math.floor(this.config.STANDARD_ACTION_COST / 4));
            combatantMonster.hpRegenRate = monster.hpRegenRate || (monster.baseStats && monster.baseStats.hpRegenRate) || 0;
            combatantMonster.mpRegenRate = monster.mpRegenRate || (monster.baseStats && monster.baseStats.mpRegenRate) || 0;
            combatantMonster.attackBonus = monster.baseStats ? (monster.baseStats.attack || 5) : 5;
            combatantMonster.armorClass = monster.baseStats ? (monster.baseStats.defense || 10) : 10;
            const dexEquiv = (monster.baseStats && monster.baseStats.dex) ? monster.baseStats.dex : ((monster.baseStats && monster.baseStats.agility) ? monster.baseStats.agility : 10);
            combatantMonster.initiativeRoll = this.getAttributeModifier(dexEquiv) + this.getRandomInt(1, 20);
            combatantMonster.uniqueId = monster.instanceId || `monster-${index}`;
            combatantMonster.dodgeRate = monster.baseStats ? (monster.baseStats.dodge || 5) : 5;
            combatantMonster.accuracyRate = monster.baseStats ? (monster.baseStats.accuracy || 60) : 60;
            combatantMonster.meleeDamageBonus = monster.baseStats ? this.getAttributeModifier(monster.baseStats.str || 10) : 0;
            combatantMonster.activeEffects = Array.isArray(monster.activeEffects) ? monster.activeEffects : []; // Initialize activeEffects

            console.log(`CPG Monster: ${combatantMonster.name}, HPRegen: ${combatantMonster.hpRegenRate}, MPRegen: ${combatantMonster.mpRegenRate}, Skills: [${combatantMonster.skills.map(s=>s.id).join(', ')}]`);
            tempCombatants.push(combatantMonster);
        });
        this.localState.combatants = tempCombatants;
    },

    applyEndOfRoundRegeneration: function() {
        // ... (same as before, ensure logging uses toFixed for values)
        let regenerationOccurredThisRound = false;
        this.localState.combatants.forEach(c => {
            if (c.currentHP > 0) {
                if (c.hpRegenRate && c.hpRegenRate > 0) {
                    const hpToRegen = parseFloat((c.hpRegenRate * this.config.SECONDS_PER_ROUND_FOR_REGEN).toFixed(3));
                    if (hpToRegen > 0.001 && c.currentHP < c.maxHP) { const oldHP = c.currentHP; c.currentHP = Math.min(c.maxHP, c.currentHP + hpToRegen); if (c.currentHP > oldHP) { this.logEvent(`${c.name} regenerates ${hpToRegen.toFixed(2)} HP. (Now ${c.currentHP.toFixed(1)}/${c.maxHP})`); regenerationOccurredThisRound = true;}}}
                if (c.mpRegenRate && c.mpRegenRate > 0 && c.maxMP > 0) {
                    const mpToRegen = parseFloat((c.mpRegenRate * this.config.SECONDS_PER_ROUND_FOR_REGEN).toFixed(3));
                     if (mpToRegen > 0.001 && c.currentMP < c.maxMP) { const oldMP = c.currentMP; c.currentMP = Math.min(c.maxMP, c.currentMP + mpToRegen); if (c.currentMP > oldMP) { this.logEvent(`${c.name} regenerates ${mpToRegen.toFixed(2)} MP. (Now ${c.currentMP.toFixed(1)}/${c.maxMP})`); regenerationOccurredThisRound = true;}}}
            }
        });
        if (regenerationOccurredThisRound) { this.logEvent("--- End of Round Regeneration Complete ---"); }
    },

    processActiveEffects: function() {
        let effectAppliedThisTick = false; // To track if any effect actually ticked
        this.localState.combatants.forEach(combatantWithEffect => { // This is the one *having* the effect
            if (combatantWithEffect.currentHP <= 0 || !combatantWithEffect.activeEffects || combatantWithEffect.activeEffects.length === 0) {
                return;
            }

            let stillActiveEffects = [];
            combatantWithEffect.activeEffects.forEach(effect => {
                console.log(`CPG: Processing effect "${effect.name}" on ${combatantWithEffect.name}, duration ${effect.remainingDuration}, trigger: ${effect.tickTrigger}`);
                
                // For now, we only have "round_start" trigger from Lightning Aura example.
                // This function is called when the round increments.
                if (effect.tickTrigger === "round_start") {
                    if (effect.id === "aura_lightning_damage_effect" && effect.definition && effect.definition.effectType === "damage_enemies") {
                        this.logEvent(`${combatantWithEffect.name}'s ${effect.name} pulses!`);
                        effectAppliedThisTick = true;
                        const auraDamageDetails = effect.definition.damage;
                        // Find original caster attributes if aura applies based on caster, not current holder
                        // For self-auras like Lightning Aura, combatantWithEffect IS the caster.
                        const casterForEffect = this.localState.combatants.find(c => c.uniqueId === effect.casterId) || combatantWithEffect;

                        const opponents = this.localState.combatants.filter(opp => opp.team !== casterForEffect.team && opp.currentHP > 0);

                        if (opponents.length > 0) {
                            opponents.forEach(opponent => {
                                let damageDealt = SpellLogic.calculateSpellEffectValue(auraDamageDetails, casterForEffect.attributes);
                                opponent.currentHP = Math.max(0, opponent.currentHP - damageDealt);
                                this.logEvent(`  ${effect.name} strikes ${opponent.name} for ${damageDealt} ${auraDamageDetails.type} damage. (HP: ${opponent.currentHP.toFixed(0)}/${opponent.maxHP})`);
                                if (opponent.currentHP <= 0) {
                                    this.logEvent(`  ${opponent.name} has been defeated by ${effect.name}!`);
                                }
                            });
                        } else {
                             this.logEvent(`${casterForEffect.name}'s ${effect.name} pulses, but there are no opponents.`);
                        }
                    }
                    // Add other "round_start" effect types here
                }
                // TODO: Handle other tickTriggers like "caster_turn_start", "target_turn_start" etc.
                // These would need processActiveEffects to be called at different points in the combat flow.

                effect.remainingDuration--;
                if (effect.remainingDuration > 0) {
                    stillActiveEffects.push(effect);
                } else {
                    this.logEvent(`${combatantWithEffect.name}'s ${effect.name} has faded.`);
                }
            });
            combatantWithEffect.activeEffects = stillActiveEffects;
        });
        return effectAppliedThisTick;
    },

    processNextActionSet: function() {
        if (!this.localState.isCombatActive) { return; }
        this.localState.combatLog = [];

        // Determine if this is the start of a new conceptual round for effects
        // This happens if no one could act immediately in the *previous* call to processNextActionSet's end,
        // or if it's the very first processing cycle (roundCount starts at 0).
        let isNewRoundStart = false;
        if (this.localState.roundCount === 0) { // First ever processing cycle
            isNewRoundStart = true;
        } else {
            // Check if the *previous* cycle ended with no immediate actors.
            // This state needs to be carried or inferred.
            // Simpler: if actors list *would be* empty *before* AP gain, it's a new round start.
            // Let's refine the round increment logic for clarity.
        }

        // --- Round Start Effects ---
        // The round counter increments when no actors are left *after* actions.
        // So, `processActiveEffects` and `applyEndOfRoundRegeneration` are called *after* actions,
        // effectively being "end of current round actions / start of next round maintenance".

        this.localState.combatants.forEach(c => {
            if (c.currentHP > 0) { c.actionProgress += (c.speed || 30); }
        });

        let actors = this.localState.combatants.filter(c => c.currentHP > 0 && c.actionProgress >= this.config.STANDARD_ACTION_COST);
        actors.sort((a, b) => (b.actionProgress === a.actionProgress) ? (b.initiativeRoll - a.initiativeRoll) : (b.actionProgress - a.actionProgress));

        let combatEndedThisTick = false;
        let actionsTakenThisCycle = actors.length > 0;

        for (const activeCombatant of actors) {
            if (!this.localState.isCombatActive) break;
            if (activeCombatant.currentHP <= 0) continue;

            this.logEvent(`--- ${activeCombatant.name}'s Turn (AP: ${Math.floor(activeCombatant.actionProgress)}) ---`);
            activeCombatant.actionProgress -= this.config.STANDARD_ACTION_COST;
            let actionTaken = this.attemptComplexSkill(activeCombatant);
            if (!actionTaken) {
                this.performBasicAttack(activeCombatant);
            }
            const combatOverStatus = this.checkCombatEnd();
            if (combatOverStatus.isOver) { this.endCombat(combatOverStatus.victor); combatEndedThisTick = true; break; }
        }

        // After all actions for this "tick" are resolved, check for round end and process round-based effects
        if (this.localState.isCombatActive && !combatEndedThisTick) {
            const noImmediateActorsLeft = this.localState.combatants.filter(c => c.currentHP > 0 && c.actionProgress >= this.config.STANDARD_ACTION_COST).length === 0;

            if ((actionsTakenThisCycle || this.localState.roundCount === 0) && noImmediateActorsLeft) {
                // This signifies the end of a burst of activity, or the very start of combat before any AP gain based round advancement
                this.localState.roundCount++; // Increment round first
                this.logEvent(`--- Round ${this.localState.roundCount} begins / Effects Phase ---`);
                console.log(`CPG: Round ${this.localState.roundCount}. Processing active effects and regeneration.`);
                
                this.processActiveEffects(); // Process auras and other persistent effects
                const statusAfterEffects = this.checkCombatEnd();
                if (statusAfterEffects.isOver) {
                    this.endCombat(statusAfterEffects.victor);
                    combatEndedThisTick = true;
                } else {
                    this.applyEndOfRoundRegeneration(); // Then apply regeneration
                    const statusAfterRegen = this.checkCombatEnd(); // Check again after regen (unlikely to end combat but good practice)
                    if (statusAfterRegen.isOver) {
                        this.endCombat(statusAfterRegen.victor);
                        combatEndedThisTick = true;
                    }
                }
            }
            
            if (!combatEndedThisTick) {
                this.localState.onTurnProcessed( this.getCombatantStates(), [...this.localState.combatLog], this.localState.isCombatActive, null );
                this.localState.combatLog = [];
            }
        }
    },
    
    attemptComplexSkill: function(combatant) { /* ... same logged version from previous response ... */
        console.log(`CPG: ${combatant.name} (Class: ${combatant.class}, MP: ${combatant.currentMP.toFixed(1)}) attempting complex skill. Has skills:`, combatant.skills.map(s=>s.id));
        if (!combatant.skills || combatant.skills.length === 0 || typeof SpellLogic === 'undefined') { console.log(`CPG: ${combatant.name} has no skills or SpellLogic is unavailable.`); return false; }
        const potentialSpells = combatant.skills.map(skillInfo => { const spellData = SpellLogic.getSpellData(skillInfo.id); if (spellData) { return { ...spellData, originalSkillInfo: skillInfo }; } console.log(`CPG: Skill ID "${skillInfo.id}" for ${combatant.name} not found in SpellLogic.`); return null; }).filter(spellData => spellData !== null);
        if (potentialSpells.length === 0) { console.log(`CPG: ${combatant.name} has no skills found in SpellLogic.`); return false; }
        console.log(`CPG: ${combatant.name} has ${potentialSpells.length} potential skills from SpellLogic.`);
        let chosenSkillData = null; let chosenTargetsArray = [];
        if (combatant.isPlayerCharacter) { /* Player AI */
            if (combatant.class === "Cleric") { /* Cleric Heal AI */
                const healSpellData = potentialSpells.find(s => s.id === "heal_light_wounds" && combatant.currentMP >= (s.mpCost || 0));
                console.log(`CPG Cleric: Checking heal. Found:`, healSpellData ? healSpellData.name : "None", `MP: ${combatant.currentMP.toFixed(1)}/${healSpellData ? (healSpellData.mpCost || 0) : '-'}`);
                if (healSpellData) { const potentialTargets = this.localState.combatants.filter(c => c.isPlayerCharacter && c.team === combatant.team && c.currentHP > 0 && c.currentHP < (c.maxHP * 0.85)).sort((a,b)=>(a.currentHP/a.maxHP)-(b.currentHP/b.maxHP)); console.log(`CPG Cleric: Potential heal targets: ${potentialTargets.length}`); if (potentialTargets.length > 0) { chosenSkillData = healSpellData; chosenTargetsArray = [potentialTargets[0]]; console.log(`CPG Cleric: Chose to heal ${potentialTargets[0].name} with ${chosenSkillData.name}.`);}}
            }
            if (!chosenSkillData && (combatant.class === "Mage" || combatant.class === "Cleric")) { /* Offensive/Aura Spells */
                const affordableSpells = potentialSpells.filter( s => s.type === "Spell" && combatant.currentMP >= (s.mpCost || 0) && (s.damage || s.targetType === "self" && s.effects && s.effects.some(e => e.type === "apply_aura"))); // Added aura check
                console.log(`CPG ${combatant.class}: Found ${affordableSpells.length} affordable spells (incl auras).`);
                if (affordableSpells.length > 0) {
                    const spellToCast = affordableSpells[Math.floor(Math.random() * affordableSpells.length)];
                    if (spellToCast.targetType === "self") { // Handles self-cast auras
                        chosenSkillData = spellToCast; chosenTargetsArray = [combatant]; 
                        console.log(`CPG ${combatant.class}: Chose to cast self-spell ${chosenSkillData.name}.`);
                    } else if (spellToCast.damage && spellToCast.targetType && spellToCast.targetType.includes("enemy")) { // Direct damage spells
                        const opponents = this.localState.combatants.filter(c => c.team !== combatant.team && c.currentHP > 0);
                        console.log(`CPG ${combatant.class}: Found ${opponents.length} opponents for offensive spell.`);
                        if (opponents.length > 0) { chosenSkillData = spellToCast; chosenTargetsArray = [opponents[Math.floor(Math.random() * opponents.length)]]; console.log(`CPG ${combatant.class}: Chose to cast ${chosenSkillData.name} on ${chosenTargetsArray[0].name}.`);}
                    }
                }
            }
        } else { /* Monster AI */
            const affordableMonsterSkills = potentialSpells.filter(s => (s.damage || s.healing || (s.effects && s.effects.some(e => e.type === "apply_aura"))) && combatant.currentMP >= (s.mpCost || 0));
            console.log(`CPG Monster ${combatant.name}: Found ${affordableMonsterSkills.length} affordable skills.`);
            if(affordableMonsterSkills.length > 0){ const skillToUse = affordableMonsterSkills[Math.floor(Math.random()*affordableMonsterSkills.length)];
                if(skillToUse.targetType === "self"){ chosenSkillData = skillToUse; chosenTargetsArray = [combatant]; console.log(`CPG Monster ${combatant.name}: Chose self-cast ${chosenSkillData.name}.`);}
                else if(skillToUse.damage && skillToUse.targetType && skillToUse.targetType.includes("enemy")){ const opponents = this.localState.combatants.filter(c=>c.team !== combatant.team && c.currentHP > 0); if(opponents.length>0){chosenSkillData = skillToUse; chosenTargetsArray = [opponents[Math.floor(Math.random()*opponents.length)]]; console.log(`CPG Monster ${combatant.name}: Chose ${chosenSkillData.name} on ${chosenTargetsArray[0].name}.`);}}
            }
        }
        if (chosenSkillData && chosenTargetsArray.length > 0) { console.log(`CPG: Executing skill ${chosenSkillData.name} for ${combatant.name} on ${chosenTargetsArray.map(t=>t.name).join(',')}.`); const execResult = SpellLogic.executeSpell(combatant, chosenTargetsArray, chosenSkillData, this.logEvent.bind(this)); return execResult.success; }
        console.log(`CPG: ${combatant.name} did not choose a complex skill.`); return false;
    },

    performBasicAttack: function(attacker) { /* ... same ... */
        const opponents = this.localState.combatants.filter(c => c.team !== attacker.team && c.currentHP > 0); if (opponents.length === 0) { this.logEvent(`${attacker.name} has no targets for Basic Attack.`); return; } const target = opponents[Math.floor(Math.random() * opponents.length)]; this.logEvent(`${attacker.name} targets ${target.name} with a Basic Attack.`); const targetDodgeRate = target.dodgeRate || 5; if (this.getRandomInt(1, 100) <= targetDodgeRate) { this.logEvent(`${target.name} dodges!`); return; } const attackerAccuracyRate = attacker.accuracyRate || 65; if (this.getRandomInt(1, 100) > attackerAccuracyRate) { this.logEvent(`${attacker.name} misses!`); return; } const attackRoll = this.getRandomInt(1, 20); const attackerAttackBonus = attacker.attackBonus || 0; const toHit = attackRoll + attackerAttackBonus; const targetAC = target.armorClass || 10; let damage = 0; if (attackRoll === 20) { this.logEvent(`Critical Hit! (${toHit} vs AC ${targetAC})`); damage = (attacker.isPlayerCharacter ? this.getRandomInt(1,6) : this.getRandomInt(1,3)) + (attacker.meleeDamageBonus || 0); damage = Math.max(1, damage) * 2; } else if (attackRoll === 1) { this.logEvent(`Critical Miss! (${toHit} vs AC ${targetAC})`); return; } else if (toHit >= targetAC) { this.logEvent(`Hit! (${toHit} vs AC ${targetAC})`); damage = (attacker.isPlayerCharacter ? this.getRandomInt(1,6) : this.getRandomInt(1,3)) + (attacker.meleeDamageBonus || 0); damage = Math.max(1, damage); } else { this.logEvent(`Miss! (${toHit} vs AC ${targetAC})`); return; } target.currentHP = Math.max(0, target.currentHP - damage); this.logEvent(`${target.name} takes ${damage} damage. (HP: ${target.currentHP.toFixed(1)}/${target.maxHP})`); if (target.currentHP <= 0) { this.logEvent(`${target.name} has been defeated!`); }
    },

    processTick: function() { this.processNextActionSet(); },
    endCombat: function(victor) { /* ... same ... */ this.localState.isCombatActive = false; this.logEvent(`Combat Over! ${victor === 'player' ? 'Players have won!' : 'Monsters have won!'}`); let totalXpAwarded = 0; let droppedLootItems = []; if (victor === 'player') { const defeatedMonstersOriginalData = this.sharedData.monsterGroup.filter(om => { const cv = this.localState.combatants.find(c => c.uniqueId === om.instanceId && !c.isPlayerCharacter); return cv && cv.currentHP <= 0; }); defeatedMonstersOriginalData.forEach(md => { totalXpAwarded += (md.xpValue || 0); this.logEvent(`${md.name} defeated, awarding ${md.xpValue || 0} XP.`); /* ... loot ... */ }); } this.localState.onCombatEnd({ survivors: this.localState.combatants.filter(c => c.currentHP > 0).map(c => { const { onTurnProcessed, onCombatEnd, ...cleaned } = c; return JSON.parse(JSON.stringify(cleaned)); }), outcome: victor, log: [...this.localState.combatLog], totalXpAwarded: totalXpAwarded, droppedLoot: droppedLootItems }); this.localState.combatLog = []; },
    checkCombatEnd: function() { /* ... same ... */ const ap = this.localState.combatants.filter(c=>c.isPlayerCharacter && c.currentHP>0); const am = this.localState.combatants.filter(c=>!c.isPlayerCharacter && c.currentHP >0); if(ap.length === 0) return {isOver:true, victor:"enemy"}; if(am.length === 0) return {isOver:true, victor:"player"}; return {isOver:false, victor:null};},
    getCombatantStates: function() {return JSON.parse(JSON.stringify(this.localState.combatants));},
    logEvent: function(message) { if(this.localState.combatLog.length >= this.config.MAX_COMBAT_LOG_LENGTH){this.localState.combatLog.shift(); } this.localState.combatLog.push(message);},
    getAttributeModifier: function(val){ return Math.floor(((val||10)-10)/2);},
    getRandomInt: function(min,max){min=Math.ceil(min);max=Math.floor(max); return Math.floor(Math.random()*(max-min+1))+min;},
    destroy: function(){ console.log("CPG: Destroying."); this.localState={combatants:[],roundCount:1,isCombatActive:false,combatLog:[],onTurnProcessed:null,onCombatEnd:null};}
};

if (typeof window !== 'undefined') {
    window.CombatProcessorGame = CombatProcessorGameObject;
}
