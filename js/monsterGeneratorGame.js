// js/MonsterGeneratorGame.js
const MonsterGeneratorGameObject = {
    id: 'MonsterGeneratorGame',
    container: null, 
    successCallback: null,
    failureCallback: null,
    sharedData: null, 

    config: {
        monsterTypes: {
            // --- VERY EASY (CR 1/8 - 1/4) ---
            "SINGLE_CAVE_RAT": {
                name: "Cave Rat",
                description: "A lone, mangy rat, surprisingly bold for its size.",
                baseStats: { hp: 4, attack: 5, defense: 7, speed: 35 }, 
                abilities: ["Quick Scurry"],
                equipment: {}, 
                lootTable: [
                    { itemId: "RAT_TAIL_SMALL", quantity: "1", chance: 0.8, type: "Junk", value: 1 }, // Min value 1
                    { itemId: "RAT_PELT_SCRAPPY", quantity: "1", chance: 0.4, type: "Material", value: 1 } // Min value 1
                ],
                xpValue: 10,
                spriteKey: "cave_rat_single_sprite"
            },
            "GIANT_BAT": {
                name: "Giant Bat",
                description: "A large, leathery-winged bat that flits through the darkness.",
                baseStats: { hp: 10, attack: 7, defense: 9, speed: 40, fly: true },
                abilities: ["Screech (may startle nearby creatures)", "Flyby Attack (avoids opportunity attacks when moving away after attack)"],
                equipment: {},
                lootTable: [
                    { itemId: "BAT_WING_LEATHERY", quantity: "1d2", chance: 0.6, type: "Material", value: 1 },
                    { itemId: "BAT_GUANO_SMALL", quantity: "1", chance: 0.3, type: "Material", value: 1 }
                ],
                xpValue: 15,
                spriteKey: "giant_bat_sprite"
            },
            // --- EASY (CR 1/4 - 1/2) ---
            "KOBOLD_SKIRMISHER": {
                name: "Kobold Skirmisher",
                description: "A small, yipping reptilian humanoid wielding a tiny, sharp spear.",
                baseStats: { hp: 8, attack: 7, defense: 11, speed: 30 },
                abilities: ["Trap Sense (minor advantage on saves vs traps)", "Sunlight Sensitivity", "Pack Tactics (advantage on attack if ally is within 5ft of target)"],
                equipment: { mainHand: "SPEAR_TINY_SHARP" },
                lootTable: [
                    { itemId: "KOBOLD_SCALE_GREEN", quantity: "1d3", chance: 0.7, type: "Material", value: 1 },
                    { itemId: "SPEAR_TINY_SHARP", chance: 0.25, type: "Weapon", value: 1 }, 
                    { itemId: "COIN_COPPER", quantity: "2d4", chance: 0.5, type: "Currency", value: 0.01 } // Coins can have fractional values for internal logic if needed, but items for sale should be >=1
                ],
                xpValue: 20,
                spriteKey: "kobold_sprite"
            },
            "GOBLIN_CUTTER": { 
                name: "Goblin Cutter",
                description: "A small, cruel humanoid with a wicked glint in its eye, wielding a rusty blade.",
                baseStats: { hp: 12, attack: 9, defense: 12, speed: 30 },
                abilities: ["Nimble Escape (can Disengage or Hide as a bonus action)", "Prefers to attack in groups"],
                equipment: { mainHand: "SCIMITAR_RUSTY", offHand: "SHIELD_WOODEN_CRUDE" },
                lootTable: [
                    { itemId: "GOBLIN_EAR_POINTY", quantity: "1", chance: 0.8, type: "Junk", value: 1 },
                    { itemId: "SCIMITAR_RUSTY", chance: 0.3, type: "Weapon", value: 2 },
                    { itemId: "SHIELD_WOODEN_CRUDE", chance: 0.15, type: "Shield", value: 1 },
                    { itemId: "COIN_COPPER", quantity: "3d6", chance: 0.6, type: "Currency", value: 0.01 }
                ],
                xpValue: 30,
                spriteKey: "goblin_cutter_sprite" 
            },
             "CAVE_RAT_SWARM": { 
                name: "Cave Rat Swarm",
                description: "A teeming mass of chittering, disease-ridden rats.",
                baseStats: { hp: 22, attack: 10, defense: 10, speed: 30 }, 
                abilities: ["Swarm (can occupy another creature's space; move through small openings)", "Bites (1d6 piercing, DC 10 Con save or contract disease)"],
                equipment: {},
                lootTable: [{ itemId: "RAT_TAIL_SMALL", quantity: "3d4", chance: 0.9, type: "Junk", value: 1 }, { itemId: "DISEASED_RAT_CORPSE_PART", quantity: "1d2", chance: 0.5, type: "Material", value: 1 }],
                xpValue: 50, 
                spriteKey: "cave_rat_swarm_sprite"
            },
            // --- MEDIUM (CR 1/2 - 1) ---
            "SKELETON_GUARD": { 
                name: "Skeleton Guard",
                description: "Animated bones of a long-dead warrior, clattering as it moves with purpose.",
                baseStats: { hp: 18, attack: 11, defense: 13, speed: 30 },
                abilities: ["Immunity: Poison, Exhaustion", "Damage Vulnerabilities: Bludgeoning", "Damage Immunities: Poison", "Condition Immunities: Charmed, Frightened, Paralyzed, Petrified, Poisoned"],
                equipment: { mainHand: "SWORD_RUSTY_LONG", offHand: "SHIELD_BONE" },
                lootTable: [
                    { itemId: "BONE_DUST_PILE", quantity: "1", chance: 1.0, type: "Material", value: 1 },
                    { itemId: "SWORD_RUSTY_LONG", chance: 0.2, type: "Weapon", value: 3 },
                    { itemId: "SHIELD_BONE", chance: 0.1, type: "Shield", value: 2 }
                ],
                xpValue: 65,
                spriteKey: "skeleton_guard_sprite"
            },
            "GIANT_SPIDER": { 
                name: "Giant Spider",
                description: "A monstrous arachnid with venomous fangs and multiple glistening eyes.",
                baseStats: { hp: 26, attack: 13, defense: 12, speed: 30, climbSpeed: 30 },
                abilities: ["Spider Climb", "Web Sense", "Web Walker", "Poisonous Bite (DC 11 Con save, 2d8 poison on fail, half on success)", "Web (Recharge 5-6. Ranged Web Attack, DC 12 Dex save or restrained)"],
                equipment: {},
                lootTable: [
                    { itemId: "SPIDER_FANG_LARGE", quantity: "1d2", chance: 0.7, type: "Material", value: 2 }, 
                    { itemId: "SPIDER_SILK_BUNDLE", quantity: "1", chance: 0.5, type: "Material", value: 5 }, 
                    { itemId: "SPIDER_VENOM_SAC", quantity: "1", chance: 0.25, type: "Material", value: 10 }
                ],
                xpValue: 100,
                spriteKey: "giant_spider_sprite"
            },
            "ORC_RAIDER": { 
                name: "Orc Raider",
                description: "A savage green-skinned humanoid, eager for battle and plunder.",
                baseStats: { hp: 30, attack: 14, defense: 13, speed: 30 }, 
                abilities: ["Aggressive (As a bonus action on its turn, can move up to its speed toward a hostile creature it can see.)"],
                equipment: { mainHand: "AXE_ORCISH_BATTLE", torso: "LEATHER_ARMOR_CRUDE" },
                lootTable: [
                    { itemId: "ORC_EAR_NOTCHED", quantity: "1", chance: 0.8, type: "Junk", value: 1 },
                    { itemId: "AXE_ORCISH_BATTLE", chance: 0.25, type: "Weapon", value: 8 },
                    { itemId: "LEATHER_ARMOR_CRUDE", chance: 0.1, type: "Armor", value: 4 },
                    { itemId: "COIN_SILVER", quantity: "2d6", chance: 0.7, type: "Currency", value: 0.1 }
                ],
                xpValue: 120,
                spriteKey: "orc_raider_sprite"
            },
             // --- HARDER (CR 1-2) ---
            "HOBGOBLIN_SOLDIER": {
                name: "Hobgoblin Soldier",
                description: "A disciplined and militaristic humanoid, larger and tougher than a goblin, clad in well-kept gear.",
                baseStats: { hp: 33, attack: 15, defense: 16, speed: 30 }, 
                abilities: ["Martial Advantage (Once per turn, deals an extra 2d6 damage to a creature it hits if an ally of the hobgoblin is within 5 ft. of the creature and the ally isn't incapacitated.)"],
                equipment: { mainHand: "LONGSWORD_STEEL", offHand: "SHIELD_STEEL_ROUND", torso: "CHAINMAIL_HOBGOBLIN" },
                lootTable: [
                    { itemId: "HOBGOBLIN_INSIGNIA", quantity: "1", chance: 0.6, type: "Junk", value: 1 },
                    { itemId: "LONGSWORD_STEEL", chance: 0.15, type: "Weapon", value: 15 },
                    { itemId: "SHIELD_STEEL_ROUND", chance: 0.1, type: "Shield", value: 10 },
                    { itemId: "CHAINMAIL_HOBGOBLIN", chance: 0.05, type: "Armor", value: 30},
                    { itemId: "COIN_SILVER", quantity: "3d8", chance: 0.8, type: "Currency", value: 0.1 }
                ],
                xpValue: 200,
                spriteKey: "hobgoblin_soldier_sprite"
            },
            "OGRE_THUG": { 
                name: "Ogre Thug",
                description: "A large, dim-witted, and brutish giant, smelling faintly of stale ale and unwashed socks.",
                baseStats: { hp: 59, attack: 17, defense: 11, speed: 40 },
                abilities: ["Greatclub (2d8+STR bludgeoning)", "Imposing Presence"],
                equipment: { mainHand: "GREATCLUB_OGRE" },
                lootTable: [
                    { itemId: "OGRE_TOOTH_LARGE", quantity: "1", chance: 0.5, type: "Junk", value: 2 },
                    { itemId: "GREATCLUB_OGRE", chance: 0.1, type: "Weapon", value: 5 },
                    { itemId: "RAGS_FILTHY_LARGE", quantity: "1", chance: 0.7, type: "Junk", value: 1 },
                    { itemId: "COIN_GOLD_FEW", quantity: "1d6", chance: 0.3, type: "Currency", value: 1 }
                ],
                xpValue: 450,
                spriteKey: "ogre_thug_sprite"
            },
            "SHADOW_MASTIFF": { 
                name: "Shadow Mastiff",
                description: "A large, black hound made of shifting shadows, with glowing red eyes that promise a chilling demise.",
                baseStats: { hp: 44, attack: 15, defense: 13, speed: 40 },
                abilities: ["Shadow Blend (In dim light or darkness, can take the Hide action as a bonus action.)", "Keen Hearing and Smell", "Bite (deals extra 2d6 cold damage on hit)"],
                equipment: {},
                lootTable: [
                    { itemId: "SHADOW_ESSENCE_POTENT", quantity: "1", chance: 0.4, type: "Material", value: 15 },
                    { itemId: "MASTIFF_PELT_SHADOWY", quantity: "1", chance: 0.2, type: "Material", value: 8 },
                    { itemId: "GEM_OBSIDIAN_CHIP", quantity: "1d2", chance: 0.1, type: "Gem", value: 10 }
                ],
                xpValue: 450,
                spriteKey: "shadow_mastiff_sprite"
            }
        }
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData || {}; 

        try {
            const requestedType = this.sharedData.monsterType; 
            const requestedCount = this.sharedData.count || 1;
            const challengeLevel = this.sharedData.challengeLevel; 

            let generatedMonsters = [];

            if (requestedType) {
                if (!this.config.monsterTypes[requestedType]) {
                    console.warn(`MonsterGeneratorGame: Requested monster type "${requestedType}" not found. Generating random monster instead.`);
                    const monsterKeys = Object.keys(this.config.monsterTypes);
                    const randomTypeKey = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
                    const monster = this.createMonsterInstance(randomTypeKey, challengeLevel);
                    if (monster) generatedMonsters.push(monster);
                } else {
                    for (let i = 0; i < requestedCount; i++) {
                        const monster = this.createMonsterInstance(requestedType, challengeLevel);
                        if (monster) {
                            generatedMonsters.push(monster);
                        }
                    }
                }
            } else if (challengeLevel !== undefined) {
                console.warn("MonsterGeneratorGame: Challenge level based selection not fully implemented. Generating random low-tier monsters for now.");
                const lowTierMonsters = ["SINGLE_CAVE_RAT", "GIANT_BAT", "KOBOLD_SKIRMISHER", "GOBLIN_CUTTER"]; 
                const numToGen = this.sharedData.count || this.getRandomInt(1, 2 + Math.min(2, challengeLevel)); 
                for (let i = 0; i < numToGen; i++) { 
                    const randomTypeKey = lowTierMonsters[Math.floor(Math.random() * lowTierMonsters.length)];
                    const monster = this.createMonsterInstance(randomTypeKey, challengeLevel);
                    if (monster) {
                        generatedMonsters.push(monster);
                    }
                }
            } else {
                const monsterKeys = Object.keys(this.config.monsterTypes);
                const randomTypeKey = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
                const monster = this.createMonsterInstance(randomTypeKey);
                if (monster) {
                    generatedMonsters.push(monster);
                }
            }
            
            if (typeof this.successCallback === 'function') {
                this.successCallback({ generatedMonsters: generatedMonsters });
            } else {
                console.error("MonsterGeneratorGame: successCallback is not a function!");
            }

        } catch (error) {
            console.error("MonsterGeneratorGame: Error during monster generation:", error);
            if (typeof this.failureCallback === 'function') {
                this.failureCallback({ reason: "Monster generation failed.", errorDetails: error.toString() });
            }
        }
    },

    createMonsterInstance: function(typeKey, challengeLevel = 0) { 
        if (!this.config.monsterTypes.hasOwnProperty(typeKey)) {
            console.warn(`MonsterGeneratorGame: Unknown monster type key: ${typeKey}`);
            return null;
        }
        const baseMonster = this.config.monsterTypes[typeKey];
        
        const instance = JSON.parse(JSON.stringify(baseMonster)); 
        instance.instanceId = `monster-${typeKey}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        instance.baseStats = instance.baseStats || { hp: 10, attack: 5, defense: 10, speed: 30};
        
        instance.currentHP = instance.baseStats.hp;
        
        instance.equipment = JSON.parse(JSON.stringify(baseMonster.equipment || {})); 

        instance.challengeRating = challengeLevel; 
        instance.droppedLoot = []; 

        return instance;
    },

    getRandomInt: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    destroy: function() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};

if (typeof window !== 'undefined') {
    window.MonsterGeneratorGame = MonsterGeneratorGameObject;
} else {
    console.error("MonsterGeneratorGame.js: 'window' object not found. This script is intended for a browser environment.");
}
