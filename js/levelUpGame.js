// js/LevelUpGame.js
const LevelUpGameObject = { 
    id: 'LevelUpGame',
    container: null,
    successCallback: null, 
    failureCallback: null,
    sharedData: null,      

    localState: {
        pawn: null, 
        originalPawn: null, // Pawn state *before* this level up process began
        levelUpChanges: [] 
    },

    config: {
        attributeIncreaseLevels: [4, 8, 12, 16, 20], 
        xpPerLevelMultiplier: 1.75 
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;
        this.localState.levelUpChanges = [];

        if (!this.sharedData || !this.sharedData.pawnToLevelUp) {
            console.error("LevelUpGame: No pawnToLevelUp provided in sharedData.");
            if (this.failureCallback) this.failureCallback({ reason: "No pawn provided for leveling." });
            return;
        }

        // Deep copy the pawn to modify, and keep an original copy for comparison
        this.localState.pawn = JSON.parse(JSON.stringify(this.sharedData.pawnToLevelUp));
        this.localState.originalPawn = JSON.parse(JSON.stringify(this.sharedData.pawnToLevelUp)); 

        console.log(`LevelUpGame: Initializing for ${this.localState.pawn.name} (Level ${this.localState.originalPawn.level} -> ${this.localState.originalPawn.level + 1}). XP: ${this.localState.pawn.xp}/${this.localState.originalPawn.xpToNextLevel}`);

        this.processLevelUp(); 
        this.renderDisplay(); 
    },

    processLevelUp: function() {
        const pawn = this.localState.pawn;
        const originalPawn = this.localState.originalPawn; 
        const oldLevel = originalPawn.level;

        if (pawn.xp < originalPawn.xpToNextLevel) {
            this.logChange(`${pawn.name} does not have enough XP to level up (needs ${originalPawn.xpToNextLevel}, has ${pawn.xp}). This shouldn't happen if called correctly.`);
            // Proceeding anyway for demonstration if this was somehow called.
        }

        // 1. Increment Level & Handle XP
        pawn.level = oldLevel + 1; // Set new level explicitly
        pawn.xp -= originalPawn.xpToNextLevel; 
        this.logChange(`${pawn.name} reached Level ${pawn.level}!`);

        const baseXPForNext = (window.PawnGeneratorGame && window.PawnGeneratorGame.config.xpToNextLevelBase) 
                            ? window.PawnGeneratorGame.config.xpToNextLevelBase 
                            : 100;
        pawn.xpToNextLevel = Math.floor(baseXPForNext * Math.pow(this.config.xpPerLevelMultiplier, pawn.level -1));

        // Store pre-attribute-increase derived stats for comparison
        const preAttrIncreaseStats = {
            attackBonus: pawn.attackBonus,
            armorClass: pawn.armorClass,
            speed: pawn.speed,
            dodgeRate: pawn.dodgeRate,
            accuracyRate: pawn.accuracyRate,
            meleeDamageBonus: pawn.meleeDamageBonus,
            rangedDamageBonus: pawn.rangedDamageBonus,
            maxHP: pawn.hp.max,
            maxMP: pawn.mp ? pawn.mp.max : 0
        };
        
        // --- Attribute Increase (if applicable) ---
        let attributeIncreasedThisLevel = null;
        if (this.config.attributeIncreaseLevels.includes(pawn.level)) {
            const classCfgForAttr = (window.PawnGeneratorGame && window.PawnGeneratorGame.config.classes[pawn.class]) || { primaryAttributes: Object.keys(pawn.attributes) };
            let primaryAttributes = classCfgForAttr.primaryAttributes || Object.keys(pawn.attributes);
            if (primaryAttributes.length === 0) primaryAttributes = Object.keys(pawn.attributes); 
            
            const attributeToIncrease = primaryAttributes[Math.floor(Math.random() * primaryAttributes.length)];
            if (pawn.attributes[attributeToIncrease] !== undefined) {
                pawn.attributes[attributeToIncrease]++;
                attributeIncreasedThisLevel = attributeToIncrease; // Track which one increased
                this.logChange(`${attributeToIncrease.toUpperCase()} increased by 1 to ${pawn.attributes[attributeToIncrease]}!`);
            }
        }

        // --- Recalculate ALL stats based on new level and potentially new attributes ---
        const classConfig = (window.PawnGeneratorGame && window.PawnGeneratorGame.config.classes[pawn.class]) || 
                            { hitDie: 6, primaryAttributes: ['str'], mpPerAttributePoint: 0, baseAttackBonusPerLevel: 0.5, baseDefenseBonus: 0, baseAccuracy: 65, baseDodge: 5, savingThrowBonuses: {} };
        const raceConfig = (window.PawnGeneratorGame && window.PawnGeneratorGame.config.races[pawn.race]) || 
                           { attributeModifiers: {}, hitDieBonus: 0, baseSpeed: 30 };

        // HP Increase
        const conModifier = this.getAttributeModifier(pawn.attributes.con);
        const hpRoll = this.getRandomInt(1, classConfig.hitDie);
        const hpGain = Math.max(1, hpRoll + conModifier); 
        const oldMaxHP = preAttrIncreaseStats.maxHP; // Compare against HP before this level's CON mod and HD roll
        pawn.hp.max = originalPawn.hp.max + hpGain; // Add gain to original max
        pawn.hp.current = pawn.hp.max; 
        if (pawn.hp.max !== oldMaxHP) this.logChange(`Max HP changed from ${oldMaxHP} to ${pawn.hp.max}. Fully healed!`);
        else this.logChange(`HP fully restored to ${pawn.hp.max}.`);


        // MP Increase
        if (pawn.mp && classConfig.mpPerAttributePoint) {
            const primaryMpAttribute = classConfig.primaryAttributes.find(attr => ['int', 'wis', 'cha'].includes(attr)) || 'int';
            const mpAttributeValue = pawn.attributes[primaryMpAttribute] || 10;
            let mpGainThisLevel = this.getRandomInt(1, Math.max(1, Math.floor(classConfig.mpPerAttributePoint * 1.5)));
            if (this.getAttributeModifier(mpAttributeValue) > 0) {
                 mpGainThisLevel += Math.max(1, Math.floor(this.getAttributeModifier(mpAttributeValue) * (classConfig.mpPerAttributePoint / 2)));
            }
            const oldMaxMP = preAttrIncreaseStats.maxMP;
            pawn.mp.max = (originalPawn.mp ? originalPawn.mp.max : 0) + mpGainThisLevel;
            if (pawn.class === "Cleric" && pawn.mp.max < 1) pawn.mp.max = 1;
            pawn.mp.current = pawn.mp.max; 
            if (pawn.mp.max !== oldMaxMP) this.logChange(`Max MP changed from ${oldMaxMP} to ${pawn.mp.max}. Fully restored!`);
            else if (mpGainThisLevel > 0) this.logChange(`MP fully restored to ${pawn.mp.max}.`);
        }
        
        // Recalculate Derived Stats
        const dexMod = this.getAttributeModifier(pawn.attributes.dex);
        const strMod = this.getAttributeModifier(pawn.attributes.str);
        let attackAttributeValue = pawn.attributes.str;
        if (pawn.class === "Archer" || pawn.class === "Rogue") attackAttributeValue = pawn.attributes.dex;
        else if (pawn.class === "Mage") attackAttributeValue = pawn.attributes.int;

        pawn.attackBonus = Math.floor(pawn.level * (classConfig.baseAttackBonusPerLevel || 0.5)) + this.getAttributeModifier(attackAttributeValue);
        pawn.armorClass = 10 + dexMod + (classConfig.baseDefenseBonus || 0); 
        pawn.speed = (raceConfig.baseSpeed || 30) + (dexMod * 5);
        pawn.dodgeRate = Math.max(5, Math.min(95, (classConfig.baseDodge || 5) + dexMod * 2));
        pawn.accuracyRate = Math.max(50, Math.min(100, (classConfig.baseAccuracy || 65) + dexMod + (pawn.class === "Archer" ? 5 : 0)));
        pawn.meleeDamageBonus = strMod;
        pawn.rangedDamageBonus = dexMod;
        
        // Re-apply equipment effects (direct bonuses to derived stats)
        for (const slot in pawn.equipment) {
            const item = pawn.equipment[slot];
            if (item && item.effects && Array.isArray(item.effects)) {
                item.effects.forEach(effect => {
                    // Attribute bonuses from items are ALREADY part of pawn.attributes via ArmoryGame
                    // So, we only apply direct derived stat bonuses here
                    if (effect.attribute === "maxHP") pawn.hp.max += effect.value;
                    else if (effect.attribute === "maxMP") pawn.mp.max += effect.value;
                    else if (effect.attribute === "attackBonus") pawn.attackBonus += effect.value;
                    else if (effect.attribute === "armorClass" || effect.attribute === "AC") pawn.armorClass += effect.value;
                    else if (effect.attribute === "speed") pawn.speed += effect.value;
                    else if (effect.attribute === "dodgeRate") pawn.dodgeRate += effect.value;
                    else if (effect.attribute === "accuracyRate") pawn.accuracyRate += effect.value;
                    else if (effect.attribute === "meleeDamageBonus") pawn.meleeDamageBonus += effect.value;
                    else if (effect.attribute === "rangedDamageBonus") pawn.rangedDamageBonus += effect.value;
                });
            }
            if (item && typeof item.armorClassBonus === 'number') { 
                pawn.armorClass += item.armorClassBonus;
            }
        }
        // Final clamp for HP/MP after all item effects
        pawn.hp.max = Math.max(1, pawn.hp.max);
        pawn.mp.max = Math.max(0, pawn.mp.max);
        pawn.hp.current = pawn.hp.max; 
        pawn.mp.current = pawn.mp.max;

        // Log changes in derived stats
        if (pawn.attackBonus !== preAttrIncreaseStats.attackBonus) this.logChange(`Attack Bonus changed to ${pawn.attackBonus}.`);
        if (pawn.armorClass !== preAttrIncreaseStats.armorClass) this.logChange(`Armor Class changed to ${pawn.armorClass}.`);
        if (pawn.speed !== preAttrIncreaseStats.speed) this.logChange(`Speed changed to ${pawn.speed}.`);
        if (pawn.dodgeRate !== preAttrIncreaseStats.dodgeRate) this.logChange(`Dodge Rate changed to ${pawn.dodgeRate}%.`);
        if (pawn.accuracyRate !== preAttrIncreaseStats.accuracyRate) this.logChange(`Accuracy Rate changed to ${pawn.accuracyRate}%.`);
        if (pawn.meleeDamageBonus !== preAttrIncreaseStats.meleeDamageBonus) this.logChange(`Melee Damage Bonus changed to ${pawn.meleeDamageBonus >= 0 ? '+' : ''}${pawn.meleeDamageBonus}.`);

    },

    logChange: function(message) { /* ... (same as before) ... */ 
        this.localState.levelUpChanges.push(message);
        console.log("LevelUpGame Log:", message);
    },

    renderDisplay: function() { /* ... (same as before, will now show more in changesHTML) ... */ 
        const pawn = this.localState.pawn;
        let changesHTML = this.localState.levelUpChanges.map(change => `<p class="levelup-change-item">${change}</p>`).join('');
        
        let attributesHTML = '<div class="levelup-attributes-grid">';
        if (pawn.attributes) {
            const attrOrder = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.attributesOrder) 
                              ? window.PawnGeneratorGame.config.attributesOrder 
                              : Object.keys(pawn.attributes);
            attrOrder.forEach(attr => {
                if (pawn.attributes.hasOwnProperty(attr)){
                    attributesHTML += `<div><strong>${attr.toUpperCase()}:</strong> ${pawn.attributes[attr]}</div>`;
                }
            });
        }
        attributesHTML += '</div>';

        this.container.innerHTML = `
            <div class="levelup-game-container">
                <h2>Level Up!</h2>
                <h3>${pawn.name} is now Level ${pawn.level}!</h3>
                
                <div class="levelup-section">
                    <strong class="levelup-section-title">Summary of Changes:</strong>
                    <div class="levelup-changes">${changesHTML}</div>
                </div>

                <div class="levelup-section">
                    <strong class="levelup-section-title">Updated Stats:</strong>
                    <p>HP: ${pawn.hp.current}/${pawn.hp.max} | MP: ${pawn.mp ? `${pawn.mp.current}/${pawn.mp.max}` : 'N/A'}</p>
                    <p>ATK Bonus: ${pawn.attackBonus !== undefined ? pawn.attackBonus : 'N/A'} | AC: ${pawn.armorClass !== undefined ? pawn.armorClass : 'N/A'}</p>
                    <p>Speed: ${pawn.speed !== undefined ? pawn.speed : 'N/A'} | Dodge: ${pawn.dodgeRate !== undefined ? pawn.dodgeRate + '%' : 'N/A'} | Accuracy: ${pawn.accuracyRate !== undefined ? pawn.accuracyRate + '%' : 'N/A'}</p>
                    <p>Melee Dmg Bonus: ${pawn.meleeDamageBonus !== undefined ? (pawn.meleeDamageBonus >= 0 ? '+' : '') + pawn.meleeDamageBonus : 'N/A'}</p>
                </div>

                <div class="levelup-section">
                     <strong class="levelup-section-title">Attributes:</strong>
                    ${attributesHTML}
                </div>
                <p class="levelup-xp-info">New XP Target: ${pawn.xp} / ${pawn.xpToNextLevel}</p>
                <button id="acknowledgeLevelUpBtn" class="levelup-button">Continue Adventure!</button>
            </div>
        `;
        this.applyLevelUpStyles(); 
        this.attachAcknowledgeListener();
    },
    
    applyLevelUpStyles: function() { /* ... (same as before) ... */ 
        let style = document.getElementById('levelUpGameSpecificStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'levelUpGameSpecificStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .levelup-game-container { padding: 20px; text-align: center; background-color: #2a3a4a; color: #f0f0f0; border-radius: 8px; border: 2px solid #5a7a9a; font-family: 'Verdana', sans-serif; }
            .levelup-game-container h2 { color: #ffd700; margin-bottom: 5px; font-size: 1.8em; }
            .levelup-game-container h3 { color: #c0c0c0; margin-bottom: 15px; font-size: 1.4em; }
            .levelup-section { margin-bottom: 15px; padding: 10px; background-color: #3a4a5a; border-radius: 5px; }
            .levelup-section-title { display: block; font-size: 1.1em; color: #b0c4de; margin-bottom: 8px; }
            .levelup-changes p.levelup-change-item { margin: 3px 0; font-size: 0.95em; color: #e0e0e0; }
            .levelup-attributes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; text-align: left; padding-left: 10px;}
            .levelup-attributes-grid div { font-size: 0.9em; }
            .levelup-xp-info { margin-top: 15px; font-size: 1em; color: #b0c4de; }
            .levelup-button { padding: 12px 25px; font-size: 1.1em; background-color: #28a745; color: white; border:none; border-radius: 5px; cursor: pointer; transition: background-color 0.2s ease; }
            .levelup-button:hover { background-color: #218838; }
        `;
    },

    attachAcknowledgeListener: function() { /* ... (same as before) ... */ 
        const ackButton = document.getElementById('acknowledgeLevelUpBtn');
        if (ackButton) {
            ackButton.onclick = () => {
                if (this.successCallback) {
                    this.successCallback({ leveledUpPawn: this.localState.pawn });
                }
            };
        }
    },

    getAttributeModifier: function(attributeValue) { /* ... (same as before) ... */ 
        return Math.floor(((attributeValue || 10) - 10) / 2);
    },

    getRandomInt: function(min, max) { /* ... (same as before) ... */ 
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    destroy: function() { /* ... (same as before) ... */ 
        console.log("LevelUpGame: Destroying.");
        if (this.container) this.container.innerHTML = '';
    }
};

if (typeof window !== 'undefined') {
    window.LevelUpGame = LevelUpGameObject; 
}

