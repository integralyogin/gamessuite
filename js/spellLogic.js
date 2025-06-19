// js/spellLogic.js
"use strict";

const SpellLogic = {
    // Master list of all spells in the game
    spells: {
        "basic_attack": {
            id: "basic_attack",
            name: "Basic Attack",
            description: "A standard physical attack.",
            type: "Attack",
            mpCost: 0,
            targetType: "single_enemy",
            range: "melee",
        },
        "fireball": {
            id: "fireball",
            name: "Fireball",
            description: "Hurls a fiery orb.",
            type: "Spell",
            school: "Evocation",
            mpCost: 10,
            targetType: "single_enemy",
            range: "medium",
            damage: {
                dice: "2d6",
                type: "fire",
                statModifier: "int"
            }
        },
        "magic_missile": {
            id: "magic_missile",
            name: "Magic Missile",
            description: "Unerring bolts of force.",
            type: "Spell",
            school: "Evocation",
            mpCost: 5,
            targetType: "single_enemy",
            range: "long",
            damage: {
                dice: "1d4+1",
                type: "force",
                statModifier: null
            },
            projectiles: 3,
            alwaysHits: true
        },
        "heal_light_wounds": {
            id: "heal_light_wounds",
            name: "Heal Light Wounds",
            description: "Mends minor injuries.",
            type: "Spell",
            school: "Conjuration",
            mpCost: 8,
            targetType: "single_ally",
            range: "touch",
            healing: {
                dice: "1d8",
                statModifier: "wis"
            }
        },
        "lightning_aura": { // NEW SPELL
            id: "lightning_aura",
            name: "Lightning Aura",
            description: "An aura of crackling lightning damages all opponents each round.",
            type: "Spell",
            school: "Evocation",
            mpCost: 15,
            targetType: "self", // Aura is cast on self
            duration: 3,          // Aura (the status effect) lasts for 3 combat rounds
            effectTickTrigger: "round_start", // Defines when CombatProcessor should tick this aura's damage
            effects: [ // This spell's primary effect is to APPLY the aura status
                {
                    type: "apply_aura",                 // Instruction for executeSpell
                    auraId: "aura_lightning_damage_effect", // Unique ID for the status effect itself
                    name: "Lightning Aura (Active)",    // Name of the status effect that will appear on the caster
                    duration: 3,                      // Duration of the status effect in rounds
                    // Details for what the aura does each time it ticks (processed by CombatProcessorGame)
                    auraDetails: {
                        effectType: "damage_enemies", // Custom type for CombatProcessor to identify what to do
                        damage: {
                            dice: "1d4",
                            type: "lightning",
                            statModifier: "int"
                        },
                        targetFilter: "all_enemies" // Tells CombatProcessor who to target
                        // could add range: "short" later if range checks are implemented
                    }
                }
            ]
        }
    },

    getSpellData: function(spellId) {
        if (this.spells[spellId]) {
            return JSON.parse(JSON.stringify(this.spells[spellId]));
        }
        console.warn(`SpellLogic: Spell with ID "${spellId}" not found.`);
        return null;
    },

    calculateSpellEffectValue: function(effectDetails, casterAttributes) {
        let totalValue = 0;
        if (!effectDetails || !effectDetails.dice) { // Added check for effectDetails itself
             // console.warn("SpellLogic: calculateSpellEffectValue called with invalid effectDetails or no dice.", effectDetails);
             return 0; // Return 0 if no dice string to parse
        }

        const diceParts = String(effectDetails.dice).toLowerCase().split('d');
        let numDice = 1, dieSize = 0, flatBonusFromDiceString = 0;

        if (diceParts.length === 2) {
            numDice = parseInt(diceParts[0]) || 1;
            const dieAndBonusParts = diceParts[1].split('+');
            dieSize = parseInt(dieAndBonusParts[0]);
            if (dieAndBonusParts.length > 1) flatBonusFromDiceString = parseInt(dieAndBonusParts[1]) || 0;
        } else if (diceParts.length === 1 && !String(effectDetails.dice).includes('d')) {
            return parseInt(diceParts[0]) || 0;
        } else {
            console.warn(`SpellLogic: Invalid dice string format: ${effectDetails.dice}`);
            return 0;
        }

        if (dieSize > 0) {
            for (let i = 0; i < numDice; i++) {
                totalValue += (Math.floor(Math.random() * dieSize) + 1);
            }
        }
        totalValue += flatBonusFromDiceString;
        totalValue += (effectDetails.baseBonus || 0);

        if (effectDetails.statModifier && casterAttributes && casterAttributes[effectDetails.statModifier]) {
            const getMod = (val) => Math.floor(((val || 10) - 10) / 2);
            totalValue += getMod(casterAttributes[effectDetails.statModifier]);
        }
        
        return Math.max(0, Math.floor(totalValue));
    },

    executeSpell: function(caster, targetsArray, spellData, logFunction = console.log) {
        if (!caster || !spellData) {
            logFunction(`SpellLogic Error: Missing caster or spellData for ${spellData ? spellData.name : 'Unknown Spell'}.`);
            return { success: false, costPaid: false, caster, targets: targetsArray || [] };
        }
        // Ensure targetsArray is an array, especially for self-targeted spells
        if (spellData.targetType === 'self' && (!targetsArray || targetsArray.length === 0)) {
            targetsArray = [caster];
        } else if (!Array.isArray(targetsArray)) {
            targetsArray = targetsArray ? [targetsArray] : [];
        }


        if (caster.currentMP < spellData.mpCost) {
            logFunction(`${caster.name} tries to cast ${spellData.name} but lacks MP (${caster.currentMP.toFixed(0)}/${spellData.mpCost}).`);
            return { success: false, costPaid: false, caster, targets: targetsArray };
        }
        caster.currentMP -= spellData.mpCost;
        logFunction(`${caster.name} casts ${spellData.name} (Cost: ${spellData.mpCost} MP, Now: ${caster.currentMP.toFixed(0)}/${caster.maxMP}).`);

        let overallSuccess = false; 

        // Iterate through defined effects in the spell (e.g., direct damage, apply_aura)
        (spellData.effects || []).forEach(spellEffectDefinition => {
            if (spellEffectDefinition.type === "apply_aura") {
                if (!caster.activeEffects) caster.activeEffects = [];
                
                const existingAuraIndex = caster.activeEffects.findIndex(ae => ae.id === spellEffectDefinition.auraId);
                if (existingAuraIndex !== -1) { // Aura already exists
                    caster.activeEffects[existingAuraIndex].remainingDuration = spellEffectDefinition.duration; // Refresh duration
                    logFunction(`${caster.name}'s ${spellEffectDefinition.name} duration refreshed to ${spellEffectDefinition.duration} rounds.`);
                } else { // Apply new aura
                    caster.activeEffects.push({
                        id: spellEffectDefinition.auraId,
                        name: spellEffectDefinition.name,
                        remainingDuration: spellEffectDefinition.duration,
                        definition: spellEffectDefinition.auraDetails, // This is what CombatProcessor will use
                        casterId: caster.uniqueId, // Store who cast it
                        tickTrigger: spellData.effectTickTrigger || "round_start" // When this aura ticks
                    });
                    logFunction(`${caster.name} is now surrounded by ${spellEffectDefinition.name}! (Duration: ${spellEffectDefinition.duration} rounds)`);
                }
                overallSuccess = true; // Applying an aura is a success
            }
            // Potentially other direct effects could be here if a spell both applies an aura AND does something immediate
        });


        // Handle direct damage/healing if the spell has those top-level properties (like Fireball, Heal)
        // This part is for spells that are NOT primarily "apply_aura" or do something immediate in addition.
        if (!spellData.effects || spellData.effects.every(e => e.type !== "apply_aura")) {
            const numProjectiles = spellData.projectiles || 1;
            for (let p = 0; p < numProjectiles; p++) {
                if (numProjectiles > 1) logFunction(`  Projectile ${p + 1} of ${spellData.name}:`);

                targetsArray.forEach(target => {
                    if (!target) return;
                    let attackHits = spellData.alwaysHits || false; // For spells like Magic Missile
                    
                    // If not alwaysHits, and it's a damaging spell, assume it hits (for now, can add spell attack rolls later)
                    if (!attackHits && spellData.damage) { 
                        attackHits = true; 
                    }

                    if (spellData.damage && attackHits) {
                        if (target.currentHP <= 0 && !spellData.damage.canTargetDead) { logFunction(`  ${target.name} is already defeated.`); return; }
                        let damageDealt = this.calculateSpellEffectValue(spellData.damage, caster.attributes);
                        target.currentHP = Math.max(0, target.currentHP - damageDealt);
                        logFunction(`  ${target.name} takes ${damageDealt} ${spellData.damage.type} damage. (HP: ${target.currentHP.toFixed(0)}/${target.maxHP})`);
                        if (target.currentHP <= 0) logFunction(`  ${target.name} has been defeated!`);
                        overallSuccess = true;
                    }

                    if (spellData.healing) {
                        if (target.currentHP <= 0 && !spellData.healing.canTargetDead) { logFunction(`  Cannot heal ${target.name} (defeated).`); return; }
                        let healingDone = this.calculateSpellEffectValue(spellData.healing, caster.attributes);
                        const oldHP = target.currentHP; target.currentHP = Math.min(target.maxHP, target.currentHP + healingDone);
                        const actualHeal = target.currentHP - oldHP;
                        if(actualHeal > 0.001) logFunction(`  ${target.name} is healed for ${actualHeal.toFixed(0)} HP. (HP: ${target.currentHP.toFixed(0)}/${target.maxHP})`);
                        else if(target.currentHP === target.maxHP && oldHP === target.maxHP) logFunction(`  ${target.name} is already at full HP.`);
                        overallSuccess = true;
                    }
                });
            }
        }
        
        return { success: overallSuccess, costPaid: true, caster, targets: targetsArray };
    }
};

if (typeof window !== 'undefined') {
    window.SpellLogic = SpellLogic;
}
