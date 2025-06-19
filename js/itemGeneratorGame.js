// js/itemGeneratorGame.js
const ItemGeneratorGameObject = {
    id: 'ItemGeneratorGame',
    container: null, 
    successCallback: null,
    failureCallback: null,
    sharedData: null, 

    config: {
        itemQualities: ["Worn", "Common", "Fine", "Masterwork", "Slightly Magical", "Enchanted", "Artifact"], 
        
        baseItems: {
            // --- WEAPONS (mainHand / offHand) ---
            // Basic
            "DAGGER_IRON": { name: "Iron Dagger", type: "Weapon", slot: "mainHand", damage: "1d4", handedness: 1, effects: [{ attribute: "dex", value: 1 }], description: "A basic iron dagger.", value: 2, buyPriceMultiplier: 3, allowedClasses: ["Any"] },
            "CLUB_WOOD": { name: "Wooden Club", type: "Weapon", slot: "mainHand", damage: "1d6", handedness: 1, effects: [], description: "A sturdy piece of wood.", value: 1, buyPriceMultiplier: 2, allowedClasses: ["Any"] },
            "STAFF_WOOD": { name: "Wooden Staff", type: "Weapon", slot: "mainHand", damage: "1d4", handedness: 2, effects: [{ attribute: "int", value: 1 }, { attribute: "maxMP", value: 5 }], description: "A simple mage's staff.", value: 5, buyPriceMultiplier: 2.5, allowedClasses: ["Mage", "Cleric", "Druid"] },
            "SHORTSWORD_IRON": { name: "Iron Shortsword", type: "Weapon", slot: "mainHand", damage: "1d6", handedness: 1, effects: [{ attribute: "str", value: 1 }], description: "A standard shortsword.", value: 10, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Rogue", "Archer", "Paladin"] },
            "SHORTBOW_WOOD": { name: "Wooden Shortbow", type: "Weapon", slot: "mainHand", damage: "1d6", handedness: 2, range: "medium", effects: [], description: "A simple shortbow.", value: 15, buyPriceMultiplier: 2, allowedClasses: ["Archer", "Rogue", "Warrior"] },
            "SLING_LEATHER": { name: "Leather Sling", type: "Weapon", slot: "mainHand", damage: "1d4", handedness: 1, range: "short", effects: [], description: "A simple leather sling.", value: 1, buyPriceMultiplier: 3, allowedClasses: ["Any"] },
            "SPEAR_WOOD": { name: "Wooden Spear", type: "Weapon", slot: "mainHand", damage: "1d6", handedness: 1, properties: ["thrown", "versatile (1d8)"], effects: [], description: "A sharpened wooden spear.", value: 1, buyPriceMultiplier: 2, allowedClasses: ["Any"]},

            // Medium
            "DAGGER_STEEL": { name: "Steel Dagger", type: "Weapon", slot: "mainHand", damage: "1d4+1", handedness: 1, effects: [{ attribute: "dex", value: 2 }, { attribute: "accuracyRate", value: 3}], description: "A well-balanced steel dagger.", value: 25, buyPriceMultiplier: 2.5, allowedClasses: ["Any"] },
            "MACE_STEEL": { name: "Steel Mace", type: "Weapon", slot: "mainHand", damage: "1d6+1", handedness: 1, effects: [{ attribute: "str", value: 2 }], description: "A solid steel mace.", value: 30, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Cleric", "Paladin"] },
            "HANDAXE_STEEL": { name: "Steel Handaxe", type: "Weapon", slot: "mainHand", damage: "1d6+1", handedness: 1, properties: ["thrown"], effects: [{ attribute: "str", value: 1 }], description: "A versatile steel handaxe.", value: 20, buyPriceMultiplier: 2.2, allowedClasses: ["Warrior", "Archer", "Rogue"]},
            "LONGSWORD_STEEL": { name: "Steel Longsword", type: "Weapon", slot: "mainHand", damage: "1d8", handedness: 1, properties: ["versatile (1d10)"], effects: [{ attribute: "str", value: 2 }, {attribute: "attackBonus", value: 1}], description: "A knightly longsword.", value: 50, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Paladin"] },
            "STAFF_CARVED": { name: "Carved Rowan Staff", type: "Weapon", slot: "mainHand", damage: "1d6", handedness: 2, effects: [{ attribute: "int", value: 2 }, { attribute: "wis", value: 1 }, { attribute: "maxMP", value: 15 }], description: "A staff carved with minor enchantments.", value: 75, buyPriceMultiplier: 2.2, allowedClasses: ["Mage", "Cleric", "Druid"] },
            "LONGBOW_YEW": { name: "Yew Longbow", type: "Weapon", slot: "mainHand", damage: "1d8", handedness: 2, range: "long", effects: [{attribute: "accuracyRate", value: 5}], description: "A powerful yew longbow.", value: 60, buyPriceMultiplier: 2, allowedClasses: ["Archer", "Warrior"] },
            "MORNINGSTAR_STEEL": { name: "Steel Morningstar", type: "Weapon", slot: "mainHand", damage: "1d8", handedness: 1, effects: [{attribute: "str", value: 1}, {special: "armor_piercing", value: 1}], description: "A spiked metal head on a haft.", value: 40, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Cleric", "Paladin"]},

            // Powerful
            "DAGGER_MITHRAL_SHARP": { name: "Mithral Dagger +1", type: "Weapon", slot: "mainHand", damage: "1d4+1", handedness: 1, effects: [{ attribute: "dex", value: 3 }, { attribute: "attackBonus", value: 1 }, { attribute: "accuracyRate", value: 5}], description: "An exceptionally light and sharp mithral dagger.", value: 250, buyPriceMultiplier: 2.5, allowedClasses: ["Any"] },
            "WARHAMMER_ADAMANTINE": { name: "Adamantine Warhammer", type: "Weapon", slot: "mainHand", damage: "1d10+2", handedness: 1, effects: [{ attribute: "str", value: 3 }, { attribute: "attackBonus", value: 1}, {special: "armor_piercing", value: 2}], description: "A mighty warhammer that can dent armor.", value: 400, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Paladin", "Dwarf"] },
            "STAFF_ARCHMAGE": { name: "Staff of the Archmage", type: "Weapon", slot: "mainHand", damage: "1d6+1", handedness: 2, effects: [{ attribute: "int", value: 4 }, { attribute: "maxMP", value: 30 }, {special: "spell_power", value: 2}, {attribute: "spell_crit_chance", value: 5}], description: "A potent staff crackling with arcane energy.", value: 1000, buyPriceMultiplier: 2.5, allowedClasses: ["Mage"] },
            "BOW_ELVENSUN": { name: "Elvensun Longbow", type: "Weapon", slot: "mainHand", damage: "1d8+2", handedness: 2, range: "very_long", effects: [{attribute: "dex", value: 2}, {attribute: "accuracyRate", value: 10}, {special: "true_shot", chance: 0.1}], description: "A masterfully crafted elven longbow.", value: 750, buyPriceMultiplier: 2, allowedClasses: ["Archer", "Elf"] },
            "GREATSWORD_FLAMING": { name: "Flaming Greatsword", type: "Weapon", slot: "mainHand", damage: "2d6+1", handedness: 2, effects: [{attribute: "str", value: 2}, {special: "fire_damage_on_hit", value: "1d6"}, {attribute: "attackBonus", value: 1}], description: "A massive sword wreathed in magical fire.", value: 1200, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Paladin"]},
            "COMPOSITE_LONGBOW_SPEED": { name: "Composite Longbow of Speed", type: "Weapon", slot: "mainHand", damage: "1d8+1", handedness: 2, range: "long", effects: [{attribute: "dex", value: 2}, {attribute: "speed", value: 10}, {special: "rapid_shot_enabled", value: true}], description: "A bow allowing for quicker shots.", value: 900, buyPriceMultiplier: 2.2, allowedClasses: ["Archer"]},

            // --- ARMOR (torso) ---
            "PADDED_ARMOR": { name: "Padded Armor", type: "Armor", slot: "torso", armorClassBonus: 1, effects: [], description: "Quilted layers of cloth.", value: 5, buyPriceMultiplier: 2, allowedClasses: ["Any"] },
            "LEATHER_ARMOR": { name: "Leather Armor", type: "Armor", slot: "torso", armorClassBonus: 2, effects: [], description: "Stiffened leather.", value: 10, buyPriceMultiplier: 2, allowedClasses: ["Any"] },
            "STUDDED_LEATHER_ARMOR": { name: "Studded Leather", type: "Armor", slot: "torso", armorClassBonus: 3, effects: [{attribute: "dex", value: 1}], description: "Leather reinforced with metal studs.", value: 45, buyPriceMultiplier: 1.8, allowedClasses: ["Rogue", "Archer", "Warrior"] },
            "SCALE_MAIL": { name: "Scale Mail", type: "Armor", slot: "torso", armorClassBonus: 4, effects: [{attribute: "dex_max_bonus", value: 2}, {attribute: "speed", value: -5}], description: "Armor consisting of many small, overlapping metal scales.", value: 50, buyPriceMultiplier: 1.9, allowedClasses: ["Warrior", "Cleric", "Paladin"]},
            "CHAINMAIL_BASIC": { name: "Basic Chainmail", type: "Armor", slot: "torso", armorClassBonus: 4, effects: [{attribute: "speed", value: -5}], description: "Interlocking metal rings.", value: 75, buyPriceMultiplier: 1.8, allowedClasses: ["Warrior", "Cleric", "Paladin"] },
            "PLATE_MAIL_STEEL": { name: "Steel Plate Armor", type: "Armor", slot: "torso", armorClassBonus: 6, effects: [{attribute: "speed", value: -10}, {attribute: "str", value: 1}], description: "Full plate armor offering excellent protection.", value: 600, buyPriceMultiplier: 1.5, allowedClasses: ["Warrior", "Paladin"] },
            "MAGES_ROBES_ENCHANTED": { name: "Enchanted Mage Robes", type: "Armor", slot: "torso", armorClassBonus: 1, effects: [{attribute: "int", value: 2}, {attribute: "maxMP", value: 20}, {attribute: "spell_resistance_all", value: 5}], description: "Robes woven with protective spells.", value: 300, buyPriceMultiplier: 2, allowedClasses: ["Mage"] },
            "DRAGONSCALE_MAIL_RED": { name: "Red Dragonscale Mail", type: "Armor", slot: "torso", armorClassBonus: 7, effects: [{attribute: "str", value: 2}, {attribute: "fire_resistance", value: 25}, {attribute: "cha", value: 1}], description: "Armor crafted from the scales of a red dragon.", value: 2500, buyPriceMultiplier: 1.8, allowedClasses: ["Warrior", "Paladin"]},
            "SHADOWWEAVE_TUNIC": { name: "Shadowweave Tunic", type: "Armor", slot: "torso", armorClassBonus: 2, effects: [{attribute: "dex", value: 2}, {attribute: "dodgeRate", value: 5}, {special: "stealth_bonus", value: 15}], description: "A tunic woven from strands of shadowstuff.", value: 700, buyPriceMultiplier: 2, allowedClasses: ["Rogue", "Archer"]},

            // --- SHIELDS (offHand) ---
            "BUCKLER_WOOD": { name: "Wooden Buckler", type: "Shield", slot: "offHand", armorClassBonus: 1, effects: [], description: "A small wooden shield.", value: 3, buyPriceMultiplier: 2.5, allowedClasses: ["Any"] },
            "SHIELD_STEEL_HEATER": { name: "Steel Heater Shield", type: "Shield", slot: "offHand", armorClassBonus: 2, effects: [{attribute: "dex", value: -1}], description: "A standard steel shield.", value: 20, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Cleric", "Paladin"] },
            "TOWER_SHIELD_IRON": { name: "Iron Tower Shield", type: "Shield", slot: "offHand", armorClassBonus: 3, effects: [{attribute: "dex", value: -2}, {attribute: "speed", value: -5}], description: "A massive shield offering superior cover.", value: 50, buyPriceMultiplier: 1.8, allowedClasses: ["Warrior", "Paladin"] },
            "SHIELD_MAGIC_REFLECTION": { name: "Shield of Reflection", type: "Shield", slot: "offHand", armorClassBonus: 2, effects: [{special: "spell_reflect_chance", value: 0.1}, {attribute: "wis", value: 1}], description: "A shield shimmering with protective magic.", value: 450, buyPriceMultiplier: 2, allowedClasses: ["Paladin", "Cleric"] },
            "SPELLWARD_SHIELD": { name: "Spellward Shield", type: "Shield", slot: "offHand", armorClassBonus: 2, effects: [{attribute: "spell_resistance_all", value: 10}, {attribute: "maxMP", value: 10}], description: "A shield imbued with magic-dampening properties.", value: 600, buyPriceMultiplier: 2.2, allowedClasses: ["Cleric", "Paladin", "Mage"]},

            // --- HEAD ---
            "LEATHER_CAP": { name: "Leather Cap", type: "Armor", slot: "head", armorClassBonus: 0, effects: [{attribute: "con", value: 1}], description: "A simple leather cap.", value: 2, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "SIMPLE_HOOD": { name: "Simple Hood", type: "Armor", slot: "head", effects: [{special: "stealth_bonus", value: 2}], description: "A plain hood for obscuring features.", value: 3, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "HELM_STEEL_OPEN": { name: "Open Steel Helm", type: "Armor", slot: "head", armorClassBonus: 1, effects: [], description: "A sturdy steel helmet.", value: 20, buyPriceMultiplier: 1.8, allowedClasses: ["Warrior", "Paladin", "Cleric"]},
            "CIRCLET_INTELLECT": { name: "Circlet of Intellect", type: "Armor", slot: "head", effects: [{attribute: "int", value: 2}], description: "A fine circlet that sharpens the mind.", value: 250, buyPriceMultiplier: 2, allowedClasses: ["Mage", "Scholar"]},
            "HELM_DRAGONSCALE": { name: "Dragonscale Helm", type: "Armor", slot: "head", armorClassBonus: 2, effects: [{attribute: "fire_resistance", value: 10}, {attribute: "cha", value: 1}], description: "A helm crafted from formidable dragonscales.", value: 500, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Paladin"]},
            "CROWN_WISDOM": { name: "Crown of Wisdom", type: "Armor", slot: "head", effects: [{attribute: "wis", value: 3}, {attribute: "maxMP", value: 10}], description: "A regal crown that enhances insight.", value: 700, buyPriceMultiplier: 2.2, allowedClasses: ["Cleric", "Druid", "Paladin"]},
            
            // --- HANDS ---
            "GLOVES_CLOTH": { name: "Cloth Gloves", type: "Armor", slot: "hands", effects: [], description: "Simple cloth gloves.", value: 1, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "GAUNTLETS_LEATHER": { name: "Leather Gauntlets", type: "Armor", slot: "hands", armorClassBonus: 0, effects: [{attribute: "str", value: 1}], description: "Tough leather gauntlets.", value: 15, buyPriceMultiplier: 1.8, allowedClasses: ["Any"]},
            "ARCHERS_GLOVES": { name: "Archer's Gloves", type: "Armor", slot: "hands", effects: [{attribute: "accuracyRate", value: 5, condition: "ranged_weapon"}], description: "Gloves that improve an archer's grip.", value: 100, buyPriceMultiplier: 2, allowedClasses: ["Archer", "Rogue"]},
            "GAUNTLETS_OGRE_POWER": { name: "Gauntlets of Ogre Power", type: "Armor", slot: "hands", effects: [{attribute: "str", value: 3}, {special: "bonus_carry_capacity", value: 50}], description: "Magical gauntlets granting immense strength.", value: 600, buyPriceMultiplier: 2, allowedClasses: ["Warrior", "Paladin"]},
            "GLOVES_DEXTERITY": { name: "Gloves of Dexterity +2", type: "Armor", slot: "hands", effects: [{attribute: "dex", value: 2}, {attribute: "dodgeRate", value: 3}], description: "Fine gloves enhancing agility.", value: 450, buyPriceMultiplier: 2.2, allowedClasses: ["Any"]},

            // --- FEET ---
            "BOOTS_SOFT_LEATHER": { name: "Soft Leather Boots", type: "Armor", slot: "feet", effects: [], description: "Comfortable walking boots.", value: 3, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BOOTS_STURDY_LEATHER": { name: "Sturdy Leather Boots", type: "Armor", slot: "feet", armorClassBonus: 0, effects: [{attribute: "speed", value: 5}], description: "Reinforced boots for travel.", value: 25, buyPriceMultiplier: 1.8, allowedClasses: ["Any"]},
            "BOOTS_STRIDING": { name: "Boots of Striding", type: "Armor", slot: "feet", effects: [{attribute: "speed", value: 10}], description: "Boots that lengthen one's stride.", value: 150, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BOOTS_ELVENKIND": { name: "Boots of Elvenkind", type: "Armor", slot: "feet", effects: [{attribute: "dex", value: 1}, {special: "move_silently_bonus", value: 10}], description: "Boots that allow for silent movement.", value: 400, buyPriceMultiplier: 2.2, allowedClasses: ["Rogue", "Archer", "Elf"]},
            "BOOTS_SPEED": { name: "Boots of Speed", type: "Armor", slot: "feet", effects: [{attribute: "speed", value: 15}, {attribute: "dodgeRate", value: 5}], description: "Magical boots that grant incredible swiftness.", value: 800, buyPriceMultiplier: 2, allowedClasses: ["Any"]},

            // --- AMULETS ---
            "AMULET_SIMPLE_CHARM": { name: "Simple Charm Amulet", type: "Amulet", slot: "amulet", effects: [{attribute: "cha", value: 1}], description: "A common good luck charm.", value: 10, buyPriceMultiplier: 3, allowedClasses: ["Any"]},
            "AMULET_HEALTH_MINOR": { name: "Amulet of Minor Health", type: "Amulet", slot: "amulet", effects: [{attribute: "maxHP", value: 10}], description: "Amulet that slightly boosts vitality.", value: 80, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "AMULET_NATURAL_ARMOR_1": { name: "Amulet of Natural Armor +1", type: "Amulet", slot: "amulet", effects: [{attribute: "armorClass", value: 1, type: "natural"}], description: "Enhances natural defenses.", value: 150, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "HOLY_SYMBOL_SILVER": { name: "Silver Holy Symbol", type: "Implement", slot: "amulet", effects: [{ attribute: "wis", value: 2 }, { special: "turn_undead_bonus", value: 2 }, {special: "heal_bonus_percent", value: 0.1}], description: "A finely crafted silver symbol.", value: 150, buyPriceMultiplier: 2.5, allowedClasses: ["Cleric", "Paladin"] },
            "AMULET_GREATER_HEALTH": { name: "Amulet of Greater Health", type: "Amulet", slot: "amulet", effects: [{attribute: "maxHP", value: 20}, {attribute: "con", value: 2}], description: "Significantly boosts vitality.", value: 800, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "PERIAPT_WISDOM": { name: "Periapt of Wisdom +2", type: "Amulet", slot: "amulet", effects: [{attribute: "wis", value: 2}, {attribute: "spell_resistance_all", value: 3}], description: "Enhances wisdom and mental fortitude.", value: 750, buyPriceMultiplier: 2.2, allowedClasses: ["Cleric", "Druid", "Mage", "Paladin"]},
            
            // --- RINGS (ring1, ring2) ---
            "RING_IRON_BAND": { name: "Iron Band", type: "Ring", slot: "ring1", effects: [], description: "A plain iron ring.", value: 1, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "RING_SUSTENANCE": { name: "Ring of Sustenance", type: "Ring", slot: "ring1", effects: [{special: "needs_less_food_water", value: true}], description: "Reduces the need for food and water.", value: 180, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "RING_PROTECTION_1": { name: "Ring of Protection +1", type: "Ring", slot: "ring1", effects: [{attribute: "armorClass", value: 1, type: "deflection"}], description: "A magical ring offering minor protection.", value: 200, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "RING_WIZARDRY_I": { name: "Ring of Minor Wizardry", type: "Ring", slot: "ring1", effects: [{attribute: "maxMP", value: 15}, {attribute: "int", value: 1}], description: "A ring aiding novice spellcasters.", value: 350, buyPriceMultiplier: 2, allowedClasses: ["Mage"]},
            "RING_REGENERATION_MINOR": { name: "Minor Ring of Regeneration", type: "Ring", slot: "ring2", effects: [{special: "hp_regen_per_10_sec", value: 1}], description: "Slowly mends wounds over time.", value: 700, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "RING_SPELL_STORING_LESSER": { name: "Lesser Ring of Spell Storing", type: "Ring", slot: "ring2", effects: [{special: "store_spell_levels", value: 3}], description: "Can store up to 3 levels of spells.", value: 1500, buyPriceMultiplier: 1.8, allowedClasses: ["Mage", "Cleric", "Druid"]},

            // --- CAPES ---
            "CLOAK_PATCHED": { name: "Patched Cloak", type: "Cape", slot: "cape", effects: [], description: "A worn and mended cloak.", value: 2, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "TRAVELERS_CLOAK": { name: "Traveler's Cloak", type: "Cape", slot: "cape", effects: [{attribute: "con", value: 1}, {special: "resist_exhaustion", value: 5}], description: "A durable cloak for long journeys.", value: 75, buyPriceMultiplier: 1.8, allowedClasses: ["Any"]},
            "CLOAK_PROTECTION_1": { name: "Cloak of Protection +1", type: "Cape", slot: "cape", effects: [{attribute: "armorClass", value: 1, type: "deflection"}], description: "A cloak offering minor magical defense.", value: 220, buyPriceMultiplier: 1.8, allowedClasses: ["Any"]},
            "CLOAK_ELVENKIND": { name: "Cloak of Elvenkind", type: "Cape", slot: "cape", effects: [{attribute: "dex", value: 1}, {special: "stealth_bonus", value: 10}], description: "A cloak that blends with surroundings.", value: 650, buyPriceMultiplier: 2, allowedClasses: ["Rogue", "Archer", "Elf"]},
            "CLOAK_DISPLACEMENT_MINOR": { name: "Minor Cloak of Displacement", type: "Cape", slot: "cape", effects: [{special: "miss_chance_melee", value: 0.15}], description: "The wearer appears blurred, hard to hit.", value: 1000, buyPriceMultiplier: 2, allowedClasses: ["Any"]},

            // --- BELTS ---
            "BELT_LEATHER_SIMPLE": { name: "Simple Leather Belt", type: "Belt", slot: "belt", effects: [], description: "A basic leather belt.", value: 1, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BELT_CONSTITUTION_1": { name: "Belt of Constitution +1", type: "Belt", slot: "belt", effects: [{attribute: "con", value: 1}], description: "A belt that enhances endurance.", value: 150, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BELT_STRENGTH_MIGHTY": { name: "Belt of Mighty Strength (+2)", type: "Belt", slot: "belt", effects: [{attribute: "str", value: 2}], description: "A belt that enhances physical power.", value: 300, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BELT_INCREDIBLE_DEXTERITY_2": { name: "Belt of Incredible Dexterity +2", type: "Belt", slot: "belt", effects: [{attribute: "dex", value: 2}], description: "Enhances agility and reflexes.", value: 300, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BELT_GIANT_STRENGTH_HILL": { name: "Belt of Hill Giant Strength", type: "Belt", slot: "belt", effects: [{attribute_set: "str", value: 21}], description: "Grants the wearer the strength of a hill giant (sets STR to 21).", value: 1200, buyPriceMultiplier: 1.5, allowedClasses: ["Warrior", "Paladin"]},
            
            // --- BRACERS ---
            "BRACERS_LEATHER_WRAPS": { name: "Leather Wrist Wraps", type: "Bracers", slot: "bracers", effects: [], description: "Simple wrist protection.", value: 2, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "BRACERS_ARMOR_2": { name: "Bracers of Armor +2", type: "Bracers", slot: "bracers", effects: [{attribute: "armorClass", value: 2, type: "armor"}], description: "Magical bracers that create a field of force.", value: 350, buyPriceMultiplier: 1.8, allowedClasses: ["Any"]},
            "BRACERS_DEFENSE_3": { name: "Bracers of Defense +3", type: "Bracers", slot: "bracers", effects: [{attribute: "armorClass", value: 3, type: "deflection"}], description: "Powerful defensive bracers.", value: 900, buyPriceMultiplier: 1.8, allowedClasses: ["Any"]},
            "BRACERS_ARCHERY_GREATER": { name: "Greater Bracers of Archery", type: "Bracers", slot: "bracers", effects: [{attribute: "attackBonus", value: 2, condition: "ranged_weapon"}, {attribute: "rangedDamageBonus", value: 1}], description: "Enhances skill with bows.", value: 700, buyPriceMultiplier: 2, allowedClasses: ["Archer"]},

            // --- IMPLEMENTS ---
            "WAND_MAGIC_MISSILE_5C": { name: "Wand of Magic Missiles (5 Ch.)", type: "Implement", slot: "mainHand", effects: [{special: "cast_magic_missile_lvl1", charges: 5}], description: "A wand holding a few Magic Missile spells.", value: 150, buyPriceMultiplier: 2, allowedClasses: ["Mage"]},
            "SPELLBOOK_NOVICE": { name: "Novice Spellbook", type: "Implement", slot: "offHand", effects: [{ attribute: "maxMP", value: 10 }, { special: "spell_learning_bonus", value: 0.05 }], description: "A sparsely filled tome for a budding spellcaster.", value: 25, buyPriceMultiplier: 2, allowedClasses: ["Mage"] },
            "ROD_ALERTNESS": { name: "Rod of Alertness", type: "Implement", slot: "mainHand", effects: [{attribute: "wis", value: 1}, {special: "initiative_bonus", value: 5}, {special: "detect_magic_at_will", value: true}], description: "A rod that heightens awareness.", value: 800, buyPriceMultiplier: 2, allowedClasses: ["Any"]},

            // --- CONSUMABLES ---
            "POTION_HEALING_MINOR": { name: "Minor Healing Potion", type: "Consumable", slot: null, effects: [{action: "heal", amount: "2d4+2"}], description: "A vial of reddish liquid that mends minor wounds.", value: 25, buyPriceMultiplier: 2, allowedClasses: ["Any"] },
            "POTION_HEALING_LESSER": { name: "Lesser Healing Potion", type: "Consumable", slot: null, effects: [{action: "heal", amount: "4d4+4"}], description: "A common healing draught.", value: 100, buyPriceMultiplier: 1.8, allowedClasses: ["Any"] },
            "POTION_SPEED_FLEETING": { name: "Potion of Fleeting Speed", type: "Consumable", slot: null, effects: [{attribute: "speed", value: 20, duration_rounds: 3}, {attribute: "dodgeRate", value: 10, duration_rounds: 3}], description: "Grants a temporary burst of speed.", value: 75, buyPriceMultiplier: 2, allowedClasses: ["Any"]},
            "TORCH": { name: "Torch", type: "Utility", slot: "offHand", effects: [{special: "provides_light", radius: 20}], description: "A burning torch to light up dark areas.", value: 1, buyPriceMultiplier: 3, allowedClasses: ["Any"] }
        },
        startingGearByClass: { 
            "Warrior": ["SHORTSWORD_IRON", "PADDED_ARMOR", "BUCKLER_WOOD"],
            "Archer": ["SHORTBOW_WOOD", "DAGGER_IRON", "LEATHER_ARMOR"],
            "Mage": ["STAFF_WOOD", "DAGGER_IRON"], 
            "Rogue": ["DAGGER_IRON", "LEATHER_ARMOR", "SLING_LEATHER"],
            "Cleric": ["MACE_STEEL", "HOLY_SYMBOL_WOOD", "PADDED_ARMOR"], 
            "Paladin": ["LONGSWORD_STEEL", "SHIELD_STEEL_HEATER", "CHAINMAIL_BASIC"], 
            "Druid": ["STAFF_WOOD", "LEATHER_ARMOR", "SLING_LEATHER"]         
        },
        shopStockCategories: { 
            "weapons_basic": ["DAGGER_IRON", "SHORTSWORD_IRON", "STAFF_WOOD", "SHORTBOW_WOOD", "SLING_LEATHER", "CLUB_WOOD", "SPEAR_WOOD"],
            "weapons_medium": ["DAGGER_STEEL", "MACE_STEEL", "LONGSWORD_STEEL", "STAFF_CARVED", "LONGBOW_YEW", "HANDAXE_STEEL", "MORNINGSTAR_STEEL"],
            "weapons_powerful": ["DAGGER_MITHRAL_SHARP", "WARHAMMER_ADAMANTINE", "STAFF_ARCHMAGE", "BOW_ELVENSUN", "GREATSWORD_FLAMING", "COMPOSITE_LONGBOW_SPEED"],
            "armor_basic": ["PADDED_ARMOR", "LEATHER_ARMOR", "BUCKLER_WOOD", "LEATHER_CAP", "GLOVES_CLOTH", "BOOTS_SOFT_LEATHER", "SIMPLE_HOOD", "CLOAK_PATCHED", "BELT_LEATHER_SIMPLE", "BRACERS_LEATHER_WRAPS"],
            "armor_medium": ["STUDDED_LEATHER_ARMOR", "CHAINMAIL_BASIC", "SHIELD_STEEL_HEATER", "HELM_STEEL_OPEN", "GAUNTLETS_LEATHER", "BOOTS_STURDY_LEATHER", "TRAVELERS_CLOAK", "BELT_CONSTITUTION_1", "BRACERS_ARMOR_2", "ARCHERS_GLOVES", "SCALE_MAIL"],
            "armor_powerful": ["PLATE_MAIL_STEEL", "MAGES_ROBES_ENCHANTED", "TOWER_SHIELD_IRON", "SHIELD_MAGIC_REFLECTION", "SPELLWARD_SHIELD", "HELM_DRAGONSCALE", "CROWN_WISDOM", "GAUNTLETS_OGRE_POWER", "GLOVES_DEXTERITY", "BOOTS_ELVENKIND", "BOOTS_SPEED", "CLOAK_PROTECTION_1", "CLOAK_ELVENKIND", "CLOAK_DISPLACEMENT_MINOR", "BELT_STRENGTH_MIGHTY", "BELT_INCREDIBLE_DEXTERITY_2", "BELT_GIANT_STRENGTH_HILL", "BRACERS_DEFENSE_3", "BRACERS_ARCHERY_GREATER"],
            "adventuring_gear": ["TORCH", "POTION_HEALING_MINOR", "POTION_HEALING_LESSER", "POTION_SPEED_FLEETING"],
            "magic_implements_rings_amulets": ["HOLY_SYMBOL_WOOD", "SPELLBOOK_NOVICE", "WAND_MAGIC_MISSILE_5C", "ROD_ALERTNESS", "HOLY_SYMBOL_SILVER", "AMULET_SIMPLE_CHARM", "AMULET_HEALTH_MINOR", "AMULET_NATURAL_ARMOR_1", "AMULET_GREATER_HEALTH", "PERIAPT_WISDOM", "RING_IRON_BAND", "RING_SUSTENANCE", "RING_PROTECTION_1", "RING_WIZARDRY_I", "RING_REGENERATION_MINOR"]
        }
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container; 
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData || {}; 

        try {
            const requestType = this.sharedData.requestType || "startingGear"; 
            const characterClass = this.sharedData.characterClass; 
            const characterLevel = this.sharedData.characterLevel || 1; 
            const itemCount = this.sharedData.itemCount || 8; // Default to more items for shop

            let generatedItems = [];

            if (requestType === "startingGear") {
                if (!characterClass) throw new Error("Character class not provided for starting gear generation.");
                generatedItems = this.generateStartingEquipment(characterClass, characterLevel);
            } else if (requestType === "shopStock") {
                generatedItems = this.generateShopStock(itemCount);
            } else { // Removed proceduralItem request type as it's not fully supported by current structure
                console.warn(`ItemGeneratorGame: Unknown or unsupported requestType: ${requestType}. Falling back to empty list.`);
                generatedItems = [];
                // throw new Error(`Unknown requestType for item generation: ${requestType}`);
            }
            
            if (typeof this.successCallback === 'function') {
                this.successCallback({ generatedEquipment: generatedItems });
            } else {
                console.error("ItemGeneratorGame: successCallback is not a function!");
            }

        } catch (error) {
            console.error("ItemGeneratorGame: Error during item generation:", error);
            if (typeof this.failureCallback === 'function') {
                this.failureCallback({ reason: "Item generation failed.", errorDetails: error.toString() });
            }
        }
    },

    generateShopStock: function(count) {
        const stock = [];
        const allItemKeys = Object.keys(this.config.baseItems);
        if (allItemKeys.length === 0) return [];

        let attempts = 0;
        const maxAttempts = count * 5; 

        while (stock.length < count && attempts < maxAttempts) { 
            let itemKey;
            const categoryKeys = Object.keys(this.config.shopStockCategories);
            if (categoryKeys.length > 0) {
                const randomCategoryKey = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
                const itemsInCategory = this.config.shopStockCategories[randomCategoryKey];
                if (itemsInCategory && itemsInCategory.length > 0) {
                    itemKey = itemsInCategory[Math.floor(Math.random() * itemsInCategory.length)];
                } else { 
                    itemKey = allItemKeys[Math.floor(Math.random() * allItemKeys.length)];
                }
            } else { 
                 itemKey = allItemKeys[Math.floor(Math.random() * allItemKeys.length)];
            }
            
            const itemDetails = this.getItemDetails(itemKey);
            if (itemDetails) { // Check if itemDetails is not null
                const buyPrice = Math.ceil((itemDetails.value || 1) * (itemDetails.buyPriceMultiplier || 2.5)); 
                const shopItem = this.createItemInstance(itemDetails, 1); 
                if (shopItem) { // Check if shopItem was created
                    shopItem.buyPrice = buyPrice; 
                    shopItem.quantity = (itemDetails.type === "Consumable") ? this.getRandomInt(2,5) : this.getRandomInt(1,2); 
                    
                    // Ensure unique items if not consumable, or allow some stacking for consumables
                    const alreadyStocked = stock.find(stockedItem => stockedItem.itemId === shopItem.itemId);
                    if (!alreadyStocked || itemDetails.type === "Consumable") {
                        if(alreadyStocked && itemDetails.type === "Consumable") {
                            alreadyStocked.quantity += shopItem.quantity; // Stack consumables
                        } else {
                            stock.push(shopItem);
                        }
                    }
                }
            }
            attempts++;
        }
        
        // Ensure at least some basic consumables are usually available if stock is low or missing them
        if (stock.length < count / 2 || !stock.some(item => item.itemId === "POTION_HEALING_MINOR")) {
            const potionDetails = this.getItemDetails("POTION_HEALING_MINOR");
            if (potionDetails) {
                 const buyPrice = Math.ceil((potionDetails.value || 1) * (potionDetails.buyPriceMultiplier || 2.0));
                 const shopPotion = this.createItemInstance(potionDetails,1);
                 if (shopPotion) {
                    shopPotion.buyPrice = buyPrice;
                    shopPotion.quantity = this.getRandomInt(2,4);
                    if (!stock.find(si => si.itemId === shopPotion.itemId)) { // Add only if not already there
                        stock.push(shopPotion);
                    }
                 }
            }
        }
        return stock;
    },

    generateStartingEquipment: function(characterClass, characterLevel) { 
        const items = [];
        const classGearPool = this.config.startingGearByClass[characterClass];

        if (!classGearPool || classGearPool.length === 0) {
            console.warn(`ItemGeneratorGame: No specific starting gear defined for class: ${characterClass}. Giving a generic item.`);
            const fallbackItemDetails = this.getItemDetails("DAGGER_IRON"); 
            if (fallbackItemDetails) items.push(this.createItemInstance(fallbackItemDetails));
            return items;
        }

        let availablePool = [...classGearPool];
        const slotsFilled = {};

        const tryEquip = (type, targetSlot) => {
            if (targetSlot && slotsFilled[targetSlot]) return false; // Slot already filled by a specific type

            const itemIndex = availablePool.findIndex(key => {
                const details = this.getItemDetails(key);
                return details?.type === type && (details?.slot === targetSlot || (type === "Weapon" && (details?.slot === "mainHand" || details?.slot === "offHand")));
            });

            if (itemIndex !== -1) {
                const itemKey = availablePool.splice(itemIndex, 1)[0];
                const itemDetails = this.getItemDetails(itemKey);
                if (itemDetails) {
                    items.push(this.createItemInstance(itemDetails, characterLevel));
                    slotsFilled[itemDetails.slot] = true;
                    if(itemDetails.handedness === 2 && itemDetails.slot === "mainHand") slotsFilled["offHand"] = true;
                    return true;
                }
            }
            return false;
        };

        tryEquip("Weapon", "mainHand");
        tryEquip("Armor", "torso");
        if (!slotsFilled["offHand"]) { // Only try shield if offHand is free
            tryEquip("Shield", "offHand");
        }
        
        // Add one more random item from the remaining pool if we have less than 2-3 items
        const maxStartingItems = this.getRandomInt(2,3);
        if (items.length < maxStartingItems && availablePool.length > 0) { 
             const itemKey = availablePool[Math.floor(Math.random() * availablePool.length)];
             const itemDetails = this.getItemDetails(itemKey);
             // Equip if slot is free or it's a non-slot item (like some implements/rings if not assigned a specific slot)
             if (itemDetails && (!itemDetails.slot || !slotsFilled[itemDetails.slot])) {
                 items.push(this.createItemInstance(itemDetails, characterLevel));
                 if(itemDetails.slot) slotsFilled[itemDetails.slot] = true;
             }
        }
        return items;
    },

    getItemDetails: function(itemKey) { 
        if (!itemKey) return null;
        if (this.config.baseItems.hasOwnProperty(itemKey)) {
            return JSON.parse(JSON.stringify(this.config.baseItems[itemKey])); 
        }
        console.warn(`ItemGeneratorGame: Base item with key "${itemKey}" not found.`);
        return null;
    },

    createItemInstance: function(baseItem, characterLevel = 1) { 
        if (!baseItem) return null;
        const instance = { ...baseItem }; // Creates a shallow copy
        // Deep copy effects if they exist, as they might be modified (e.g. charges on a wand)
        if (baseItem.effects) {
            instance.effects = JSON.parse(JSON.stringify(baseItem.effects));
        }
        instance.itemId = instance.itemId || baseItem.name.toUpperCase().replace(/\s+/g, '_');
        instance.instanceId = `item-${instance.itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    window.ItemGeneratorGame = ItemGeneratorGameObject; 
}

