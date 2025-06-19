// js/pawnGeneratorGame.js
// This file MUST correctly define the global PawnGeneratorGame object.
const PawnGeneratorGameObject = {
    id: 'PawnGeneratorGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        numberOfPawnsToGenerate: 10,
        xpToNextLevelBase: 10,
        attributesOrder: ["str", "dex", "con", "int", "wis", "cha"],

        baseHpRegenPerSecond: 0.005,
        hpRegenPerConModifier: 0.002,
        minHpRegenPerSecond: 0.001,
        baseMpRegenPerSecondCaster: 0.01,
        mpRegenPerSpellStatModifier: 0.015,
        minMpRegenPerSecond: 0.0,

        races: {
            "Human": {
                name: "Human",
                attributeModifiers: {},
                special: ["Versatile", "Bonus Feat at Lvl 1 (conceptual)"],
                hitDieBonus: 0,
                baseSpeed: 30
            }
            // Add other races here if you expand your config
        },

        classes: {
            "Warrior": {
                name: "Warrior", primaryAttributes: ["str", "con"], hitDie: 10,
                baseAttackBonusPerLevel: 1, baseDefenseBonus: 2,
                savingThrowBonuses: { fortitude: 2, reflex: 0, will: 0 },
                baseAccuracy: 70, baseDodge: 5,
                startingSkillIds: ["skill_power_attack", "skill_shield_bash"], // CHANGED
                allowedAlignments: ["Lawful Good", "Lawful Neutral", "True Neutral", "Chaotic Good", "Chaotic Neutral"]
            },
            "Archer": {
                name: "Archer", primaryAttributes: ["dex", "wis"], hitDie: 8,
                baseAttackBonusPerLevel: 1, baseDefenseBonus: 1,
                savingThrowBonuses: { fortitude: 1, reflex: 2, will: 0 },
                baseAccuracy: 75, baseDodge: 10,
                startingSkillIds: ["skill_aimed_shot", "skill_track"], // CHANGED
                allowedAlignments: ["Neutral Good", "True Neutral", "Chaotic Good"]
            },
            "Mage": {
                name: "Mage", primaryAttributes: ["int", "dex"], hitDie: 4,
                baseAttackBonusPerLevel: 0.5, baseDefenseBonus: 0,
                savingThrowBonuses: { fortitude: 0, reflex: 0, will: 2 },
                mpPerAttributePoint: 2,
                baseAccuracy: 65, baseDodge: 8,
                startingSkillIds: ["fireball", "magic_missile", "lightning_aura"], // Uses IDs from SpellLogic
                allowedAlignments: ["Any"],
                isCaster: true,
                spellcastingAttribute: "int"
            },
            "Rogue": {
                name: "Rogue", primaryAttributes: ["dex", "int"], hitDie: 6,
                baseAttackBonusPerLevel: 0.75, baseDefenseBonus: 1,
                savingThrowBonuses: { fortitude: 0, reflex: 2, will: 0 },
                baseAccuracy: 75, baseDodge: 15,
                startingSkillIds: ["skill_backstab", "skill_disarm_trap"], // CHANGED
                allowedAlignments: ["Neutral", "Chaotic Neutral", "Neutral Evil", "Chaotic Evil"]
            },
            "Cleric": {
                name: "Cleric", primaryAttributes: ["wis", "cha"], hitDie: 8,
                baseAttackBonusPerLevel: 0.75, baseDefenseBonus: 1,
                savingThrowBonuses: { fortitude: 1, reflex: 0, will: 2 },
                mpPerAttributePoint: 1.5,
                baseAccuracy: 68, baseDodge: 5,
                startingSkillIds: ["heal_light_wounds", "skill_turn_undead"], // Uses IDs, one from SpellLogic
                allowedAlignments: ["Lawful Good", "Neutral Good", "Lawful Neutral", "True Neutral"],
                isCaster: true,
                spellcastingAttribute: "wis"
            }
        },
        alignments: ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"],
        equipmentSlots: ["head", "torso", "legs", "hands", "feet", "mainHand", "offHand", "ring1", "ring2", "amulet", "cape", "belt", "bracers"],
        possibleNames: ["Arin", "Bryn", "Corin", "Dara", "Elara", "Fynn", "Gwen", "Hale", "Iris", "Jorn", "Kael", "Lyra", "Milo", "Nia", "Orin", "Pria", "Quinn", "Roric", "Sari", "Teva", "Vance", "Wren", "Xyla", "Yuri", "Zane"],
        possibleSurnames: ["Stonehand", "Swiftarrow", "Shadowwalker", "Lightbringer", "Ironheart", "Silverwand", "Quickfoot", "Steelsoul", "Moonwhisper", "Sunstrider", "Riverfell", "Nightwind", "Grimshaw", "Oakhart"],
        personalityTraits: ["Brave", "Cautious", "Greedy", "Honorable", "Sarcastic", "Quiet", "Boisterous", "Curious", "Pious", "Skeptical", "Loyal", "Selfish"],
        backgroundNotes: ["Former farmer seeking adventure", "Orphaned by war", "Noble on a secret quest", "Escaped cultist", "Scholar of ancient lore", "Exiled for a minor crime", "Searching for a lost sibling"]
    },

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;
        if (typeof window.ItemGeneratorGame === 'undefined' || typeof window.ItemGeneratorGame.init !== 'function') {
            console.warn("PawnGeneratorGame init: ItemGeneratorGame not available or invalid. Pawns will be generated without items.");
        }
        try {
            const generatedPawns = await this.generatePawns();
            if (typeof this.successCallback === 'function') {
                this.successCallback({ generatedRecruits: generatedPawns });
            } else {
                console.error("PawnGeneratorGame: successCallback is not a function!");
            }
        } catch (error) {
            console.error("PawnGeneratorGame: Error during async pawn generation process:", error);
            if (typeof this.failureCallback === 'function') {
                this.failureCallback({ reason: "Pawn generation process failed.", errorDetails: error.toString() });
            } else {
                console.error("PawnGeneratorGame: failureCallback is not a function!");
            }
        }
    },

    generateRandomName: function() {
        const name = this.config.possibleNames[Math.floor(Math.random() * this.config.possibleNames.length)];
        const surname = this.config.possibleSurnames[Math.floor(Math.random() * this.config.possibleSurnames.length)];
        return `${name} ${surname}`;
    },
    getRandomInt: function(min, max) {
        min = Math.ceil(min); max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    roll4d6DropLowest: function() {
        let rolls = []; for (let i = 0; i < 4; i++) { rolls.push(this.getRandomInt(1, 6)); }
        rolls.sort((a, b) => a - b); rolls.shift(); return rolls.reduce((sum, val) => sum + val, 0);
    },
    getAttributeModifier: function(attributeValue) {
        return Math.floor(((attributeValue || 10) - 10) / 2);
    },

    generateSinglePawn: function() {
        return new Promise((resolve) => {
            const { races, classes, attributesOrder, alignments, equipmentSlots, personalityTraits, backgroundNotes } = this.config;
            const raceName = Object.keys(races)[Math.floor(Math.random() * Object.keys(races).length)];
            const raceConfig = races[raceName];
            const attributes = {};
            attributesOrder.forEach(attr => { attributes[attr] = this.roll4d6DropLowest(); });
            for (const attr in raceConfig.attributeModifiers) { if (attributes.hasOwnProperty(attr)) { attributes[attr] += raceConfig.attributeModifiers[attr]; attributes[attr] = Math.max(3, Math.min(20, attributes[attr])); } }

            const className = Object.keys(classes)[Math.floor(Math.random() * Object.keys(classes).length)];
            const classConfig = classes[className];
            let alignment = alignments[Math.floor(Math.random() * alignments.length)];
            if (classConfig.allowedAlignments && classConfig.allowedAlignments[0] !== "Any" && !classConfig.allowedAlignments.includes(alignment)) {
                alignment = classConfig.allowedAlignments[Math.floor(Math.random() * classConfig.allowedAlignments.length)];
            }

            const conModifier = this.getAttributeModifier(attributes.con);
            const intMod = this.getAttributeModifier(attributes.int);
            const wisMod = this.getAttributeModifier(attributes.wis);
            const dexMod = this.getAttributeModifier(attributes.dex); // Added for consistency
            const strMod = this.getAttributeModifier(attributes.str); // Added for consistency


            const baseHitDieRoll = this.getRandomInt(1, classConfig.hitDie);
            const maxHP = Math.max(2, baseHitDieRoll + conModifier + (raceConfig.hitDieBonus || 0));
            let maxMP = 0;
            if (classConfig.mpPerAttributePoint) {
                const primaryMpAttr = classConfig.spellcastingAttribute || classConfig.primaryAttributes.find(attr => ['int', 'wis', 'cha'].includes(attr)) || 'int';
                maxMP = Math.max(0, (this.getAttributeModifier(attributes[primaryMpAttr]) * classConfig.mpPerAttributePoint) + this.getRandomInt(0,5));
            }
             if ((className === "Cleric" || className === "Mage") && maxMP < (classConfig.mpPerAttributePoint || 1)) { maxMP = Math.max((classConfig.mpPerAttributePoint || 1), maxMP + (classConfig.mpPerAttributePoint ||1)); }


            let hpRegenRate = this.config.baseHpRegenPerSecond + (conModifier * this.config.hpRegenPerConModifier);
            hpRegenRate = Math.max(this.config.minHpRegenPerSecond, hpRegenRate);
            if (raceConfig.hpRegenModifier) { hpRegenRate += raceConfig.hpRegenModifier; }

            let mpRegenRate = this.config.minMpRegenPerSecond;
            if (classConfig.isCaster) {
                let spellStatModifier = 0;
                if (classConfig.spellcastingAttribute === "int") spellStatModifier = intMod;
                else if (classConfig.spellcastingAttribute === "wis") spellStatModifier = wisMod;
                mpRegenRate = this.config.baseMpRegenPerSecondCaster + (spellStatModifier * this.config.mpRegenPerSpellStatModifier);
                mpRegenRate = Math.max(this.config.minMpRegenPerSecond, mpRegenRate);
            }
            if (raceConfig.mpRegenModifier) { mpRegenRate += raceConfig.mpRegenModifier; }

            const pawnSkills = [];
            if (typeof SpellLogic !== 'undefined' && classConfig.startingSkillIds && classConfig.startingSkillIds.length > 0) {
                classConfig.startingSkillIds.forEach(skillId => {
                    const spellData = SpellLogic.getSpellData(skillId); // Get full data from SpellLogic
                    if (spellData) {
                         pawnSkills.push({ // Store minimal info on the pawn
                            id: spellData.id,
                            name: spellData.name,
                            type: spellData.type || "Unknown", // Fallback type
                            cost: spellData.mpCost || 0
                        });
                    } else {
                        // If not in SpellLogic, assume it's a non-spell ability ID (e.g., "skill_power_attack")
                        // Create a placeholder for it. CombatProcessor will need to handle these IDs differently if they don't use SpellLogic.executeSpell
                        const name = skillId.replace("skill_", "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                        pawnSkills.push({ id: skillId, name: name, type: "Ability", cost: 0 });
                        console.log(`PawnGenerator: Added placeholder for skill ID "${skillId}" (class ${className}) as it was not found in SpellLogic.`);
                    }
                });
            }
            // Ensure basic attack if no skills were populated or if class has no startingSkillIds
            if (pawnSkills.length === 0) {
                 const basicAttackData = (typeof SpellLogic !== 'undefined') ? SpellLogic.getSpellData("basic_attack") : null;
                 if (basicAttackData) { // If "basic_attack" is defined in SpellLogic
                    pawnSkills.push({ id: basicAttackData.id, name: basicAttackData.name, type: basicAttackData.type, cost: 0});
                 } else { // Absolute fallback if even basic_attack isn't in SpellLogic (unlikely if SpellLogic is set up)
                    pawnSkills.push({id: "basic_attack", name: "Attack", description: "A standard physical attack.", type: "Basic", cost: 0});
                 }
            }


            const equipment = {};
            equipmentSlots.forEach(slot => equipment[slot] = null);
            
            let attackAttributeValue = attributes.str; // Default
            if (classConfig.primaryAttributes && classConfig.primaryAttributes.length > 0) { // Use first primary for attack if defined
                const primaryAtt = classConfig.primaryAttributes[0];
                if (["dex", "int", "wis", "cha"].includes(primaryAtt)) { // Common attack stats other than str
                    attackAttributeValue = attributes[primaryAtt];
                }
            }
            if (className === "Archer" || className === "Rogue") attackAttributeValue = attributes.dex;
            else if (className === "Mage") attackAttributeValue = attributes.int;


            const pawn = {
                id: `pawn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: this.generateRandomName(), race: raceName, class: className, alignment,
                level: 1, xp: 0, xpToNextLevel: this.config.xpToNextLevelBase, attributes,
                hp: { current: maxHP, max: maxHP }, mp: { current: maxMP, max: maxMP },
                speed: (raceConfig.baseSpeed || 30) + (dexMod * 7),
                dodgeRate: Math.max(5, Math.min(95, (classConfig.baseDodge || 5) + dexMod * 2)),
                accuracyRate: Math.max(50, Math.min(100, (classConfig.baseAccuracy || 50) + dexMod * 3 + (className === "Archer" ? 5:0) )),
                meleeDamageBonus: strMod,
                rangedDamageBonus: dexMod,
                attackBonus: (Math.floor(1 * (classConfig.baseAttackBonusPerLevel || 0.5)) + this.getAttributeModifier(attackAttributeValue)),
                armorClass: (10 + dexMod + (classConfig.baseDefenseBonus || 0)),
                savingThrows: {
                    paralyzePoisonDeath: Math.max(1, Math.min(20, 15 - conModifier - (classConfig.savingThrowBonuses.fortitude || 0))),
                    rodStaffWand: Math.max(1, Math.min(20, 16 - wisMod - (classConfig.savingThrowBonuses.will || 0))),
                    petrifyPolymorph: Math.max(1, Math.min(20, 14 - conModifier - (classConfig.savingThrowBonuses.fortitude || 0))),
                    breathWeapon: Math.max(1, Math.min(20, 16 - dexMod - (classConfig.savingThrowBonuses.reflex || 0))),
                    spell: Math.max(1, Math.min(20, 17 - wisMod - (classConfig.savingThrowBonuses.will || 0))),
                },
                hpRegenRate: parseFloat(hpRegenRate.toFixed(3)),
                mpRegenRate: parseFloat(mpRegenRate.toFixed(3)),
                actionProgress: 0,
                skills: pawnSkills,
                equipment, gold: (this.roll4d6DropLowest() * 5),
                personality: personalityTraits[Math.floor(Math.random() * personalityTraits.length)],
                background: backgroundNotes[Math.floor(Math.random() * backgroundNotes.length)],
                racialTraits: raceConfig.special,
                cost: Math.max(30, Math.min(300, Math.floor((50 + Object.values(attributes).reduce((s,v) => s + (v-10),0)*5 + (maxHP-5)*2 + maxMP*1)/10)*10))
            };

            const itemGenerator = window.ItemGeneratorGame;
            if (itemGenerator && typeof itemGenerator.init === 'function') {
                itemGenerator.init( null, (itemData) => { if (itemData && itemData.generatedEquipment) { itemData.generatedEquipment.forEach(item => { if (item && item.slot && pawn.equipment.hasOwnProperty(item.slot)) { if (!pawn.equipment[item.slot]) { pawn.equipment[item.slot] = item; } else if (item.slot === "offHand" && pawn.equipment.mainHand && pawn.equipment.mainHand.handedness === 1 && !pawn.equipment.offHand) {pawn.equipment.offHand = item;} } }); } resolve(pawn); }, (itemError) => { console.warn(`PawnGen: ItemGen failed for ${pawn.name}.`, itemError.reason || itemError); resolve(pawn); }, { characterClass: pawn.class, characterLevel: pawn.level } );
            } else { console.warn("PawnGen: ItemGen not found. No items for", pawn.name); resolve(pawn); }
        });
    },

    generatePawns: async function() {
        const pawnPromises = []; for (let i = 0; i < this.config.numberOfPawnsToGenerate; i++) { pawnPromises.push(this.generateSinglePawn());}
        try { const pawns = await Promise.all(pawnPromises); return pawns; } catch (error) { console.error("PawnGen: Error gen pawns:", error); const settled = await Promise.allSettled(pawnPromises); return settled.filter(r => r.status === 'fulfilled').map(r => r.value); }
    },
    destroy: function() { if (this.container) { this.container.innerHTML = ''; } }
};

if (typeof window !== 'undefined') {
    window.PawnGeneratorGame = PawnGeneratorGameObject;
} else {
    console.error("PawnGeneratorGame.js: 'window' object not found.");
}
