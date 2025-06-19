// js/ArmoryGame.js
const ArmoryGame = {
    id: 'ArmoryGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    localState: {
        playerRoster: [],       
        playerInventory: [],    
        selectedPawnId: null,
        selectedInventoryItemIndex: null, 
        message: "Welcome to the Armory. Select a hero and an item to equip.",
        originalPawnStats: {} 
    },

    elements: {
        rosterDisplay: null,
        pawnDetailDisplay: null,
        inventoryDisplay: null,
        playerGoldDisplay: null,
        messageDisplay: null,
        exitButton: null
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (!this.sharedData.playerRoster) this.sharedData.playerRoster = [];
        if (!this.sharedData.playerInventory) this.sharedData.playerInventory = [];
        if (this.sharedData.totalCoins === undefined) this.sharedData.totalCoins = 0;

        this.localState.playerRoster = JSON.parse(JSON.stringify(this.sharedData.playerRoster));
        this.localState.playerInventory = JSON.parse(JSON.stringify(this.sharedData.playerInventory));
        this.localState.originalPawnStats = {};
        
        this.localState.playerRoster.forEach(pawn => {
            if (pawn && pawn.id) { 
                this.localState.originalPawnStats[pawn.id] = JSON.parse(JSON.stringify(pawn));
                // Ensure essential sub-objects exist
                pawn.hp = pawn.hp || { current: (pawn.derivedStats ? pawn.derivedStats.maxHP : 10), max: (pawn.derivedStats ? pawn.derivedStats.maxHP : 10) };
                pawn.mp = pawn.mp || { current: (pawn.derivedStats ? pawn.derivedStats.maxMP : 0), max: (pawn.derivedStats ? pawn.derivedStats.maxMP : 0) };
                pawn.attributes = pawn.attributes || {}; 
                pawn.equipment = pawn.equipment || {}; 
                
                this.recalculatePawnStats(pawn); 
            } else {
                console.warn("ArmoryGame: Skipping pawn in init due to missing id:", pawn);
            }
        });
        
        this.localState.selectedPawnId = null;
        this.localState.selectedInventoryItemIndex = null;
        this.localState.message = "Select a hero from your roster, then an item from inventory to equip.";
        
        this.renderBaseLayout();
        this.cacheElements();
        this.updateDisplay(); 
        this.attachEventListeners();
    },

    renderBaseLayout: function() { 
        this.container.innerHTML = `
            <div class="armory-game-container">
                <div class="armory-header">
                    <h1>The Armory</h1>
                    <div class="player-gold-armory">Player Gold: <span id="armoryPlayerGold">${this.sharedData.totalCoins}</span></div>
                </div>
                <div id="armoryMessageDisplay" class="armory-message">${this.localState.message}</div>

                <div class="armory-main-layout">
                    <div class="armory-roster-section">
                        <h2>Your Roster</h2>
                        <div id="armoryRosterDisplay" class="armory-list-container"></div>
                    </div>
                    <div class="armory-pawn-details-section">
                        <h2>Selected Hero Details</h2>
                        <div id="armoryPawnDetailDisplay" class="pawn-details-content">
                            <p>Select a hero from the roster to see their details and equip items.</p>
                        </div>
                    </div>
                    <div class="armory-inventory-section">
                        <h2>Your Inventory</h2>
                        <div id="armoryInventoryDisplay" class="armory-list-container"></div>
                    </div>
                </div>
                <button id="exitArmoryBtn" class="armory-button exit-button-armory">Leave Armory</button>
            </div>
        `;
        this.applyStyles();
    },

    cacheElements: function() { 
        this.elements.rosterDisplay = document.getElementById('armoryRosterDisplay');
        this.elements.pawnDetailDisplay = document.getElementById('armoryPawnDetailDisplay');
        this.elements.inventoryDisplay = document.getElementById('armoryInventoryDisplay');
        this.elements.playerGoldDisplay = document.getElementById('armoryPlayerGold');
        this.elements.messageDisplay = document.getElementById('armoryMessageDisplay');
        this.elements.exitButton = document.getElementById('exitArmoryBtn');
    },

    applyStyles: function() { 
        let style = document.getElementById('armoryGameStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'armoryGameStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .armory-game-container { display: flex; flex-direction: column; height: 100%; padding: 15px; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #3c3c3c; color: #e8e8e8; }
            .armory-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #555; margin-bottom: 10px; }
            .armory-header h1 { margin: 0; font-size: 1.7em; color: #f0f0f0; }
            .player-gold-armory { font-size: 1em; }
            .armory-message { padding: 8px; margin-bottom: 10px; background-color: #4a4a4a; border: 1px solid #5f5f5f; border-radius: 4px; text-align: center; min-height: 1.5em; font-size: 0.9em;}
            .armory-main-layout { display: flex; flex-grow: 1; gap: 10px; overflow: hidden; }
            .armory-roster-section, .armory-pawn-details-section, .armory-inventory-section {
                background-color: #484848; padding: 10px; border-radius: 6px; border: 1px solid #5f5f5f;
                display: flex; flex-direction: column;
            }
            .armory-roster-section { flex: 1.2; min-width: 180px; } 
            .armory-pawn-details-section { flex: 2.5; overflow-y: auto; } 
            .armory-inventory-section { flex: 1.3; min-width: 190px; } 

            .armory-roster-section h2, .armory-pawn-details-section h2, .armory-inventory-section h2 {
                text-align: center; margin-top: 0; margin-bottom: 8px; color: #d8d8d8; font-size: 1.15em;
                border-bottom: 1px solid #5f5f5f; padding-bottom: 4px;
            }
            .armory-list-container { overflow-y: auto; flex-grow: 1; padding-right: 5px; }
            .armory-list-item { padding: 7px 10px; margin-bottom: 4px; background-color: #555; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; font-size: 0.9em; }
            .armory-list-item:hover { background-color: #666; }
            .armory-list-item.selected { background-color: #007bff; color: white; font-weight: bold; }
            
            .pawn-details-content { padding: 5px; font-size: 0.9em; }
            .pawn-details-content h3 { font-size: 1.2em; color: #00bfff; margin-top: 0; margin-bottom: 8px; text-align: center; }
            .pawn-details-content p { margin: 3px 0; line-height: 1.4; }
            .pawn-details-content .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 4px; color: #b0b0b0; font-size: 1em; border-bottom: 1px solid #5f5f5f; padding-bottom: 2px; }
            
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px 10px; margin-bottom: 8px; }
            .stats-grid div { white-space: nowrap; }
            .stats-grid strong { color: #c0c0c0; }

            .attributes-grid-armory { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 8px; margin-bottom: 8px; }
            .attributes-grid-armory div { font-size: 0.95em; }
            .attributes-grid-armory strong { color: #c0c0c0; }

            .equipment-slots-grid { display: grid; grid-template-columns: 1fr; gap: 5px; margin-top: 5px; } 
            .equipment-slot { background-color: #424242; padding: 5px 8px; border-radius: 3px; border: 1px solid #555; display: flex; justify-content: space-between; align-items: center; }
            .equipment-slot strong { color: #b0b0b0; font-size: 0.9em; }
            .equipment-slot .item-name { color: #87ceeb; font-style: italic; margin-left: 5px; flex-grow: 1; }
            .equipment-slot .empty-slot { color: #777; font-style: italic; margin-left: 5px; flex-grow: 1; }
            .equip-button-armory, .unequip-button-armory { 
                font-size: 0.75em; padding: 2px 5px; margin-left: 5px; 
                background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;
            }
            .unequip-button-armory { background-color: #dc3545; }
            .unequip-button-armory:disabled, .equip-button-armory:disabled { background-color: #6c757d; }

            .skills-list-armory { list-style: none; padding-left: 0; margin: 5px 0; }
            .skills-list-armory li { background-color: #505050; padding: 3px 6px; border-radius: 3px; margin-bottom: 3px; display: inline-block; margin-right: 4px; font-size: 0.85em; }

            .armory-button { padding: 10px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.2s ease; background-color: #6c757d; color: #fff; margin-top: 5px; }
            .exit-button-armory { background-color: #5a6268; width: 100%; margin-top: 15px; }
            .armory-button:hover { filter: brightness(115%); }
        `;
    },

    updateDisplay: function() { /* ... (same as before) ... */ 
        if (this.elements.playerGoldDisplay) this.elements.playerGoldDisplay.textContent = this.sharedData.totalCoins || 0;
        if (this.elements.messageDisplay) this.elements.messageDisplay.textContent = this.localState.message;
        this.renderRosterList();
        this.renderPlayerInventory();
        this.renderSelectedPawnDetails(); 
    },

    renderRosterList: function() { /* ... (same as before) ... */ 
        if (!this.elements.rosterDisplay) return;
        this.elements.rosterDisplay.innerHTML = '';
        if (!this.localState.playerRoster || this.localState.playerRoster.length === 0) {
            this.elements.rosterDisplay.innerHTML = '<p>No heroes in your roster.</p>';
            return;
        }
        this.localState.playerRoster.forEach(pawn => {
            const div = document.createElement('div');
            div.className = 'armory-list-item';
            if (pawn.id === this.localState.selectedPawnId) {
                div.classList.add('selected');
            }
            div.textContent = `${pawn.name} (Lvl ${pawn.level} ${pawn.class})`;
            div.dataset.pawnId = pawn.id;
            div.onclick = () => this.selectPawn(pawn.id);
            this.elements.rosterDisplay.appendChild(div);
        });
    },

    renderPlayerInventory: function() { /* ... (same as before) ... */ 
        if (!this.elements.inventoryDisplay) return;
        this.elements.inventoryDisplay.innerHTML = '';
        if (this.localState.playerInventory.length === 0) {
            this.elements.inventoryDisplay.innerHTML = '<p>Inventory is empty.</p>';
            return;
        }
        this.localState.playerInventory.forEach((item, index) => {
            if (!item) return;
            const div = document.createElement('div');
            div.className = 'armory-list-item';
            if (index === this.localState.selectedInventoryItemIndex) {
                div.classList.add('selected');
            }
            let itemText = `${item.name || item.itemId} (x${item.quantity || 1})`;
            if (item.type) itemText += ` - ${item.type}`;
            if (item.damage) itemText += ` | Dmg: ${item.damage}`;
            if (item.armorClassBonus) itemText += ` | AC: +${item.armorClassBonus}`;
            if (item.effects && item.effects.length > 0) {
                itemText += ` | Eff: ${item.effects.map(e => `${e.attribute || e.special} ${e.value >= 0 ? '+' : ''}${e.value}`).join(', ')}`;
            }
            div.textContent = itemText;
            div.dataset.itemIndex = index;
            div.onclick = () => this.selectInventoryItem(index);
            this.elements.inventoryDisplay.appendChild(div);
        });
    },

    renderSelectedPawnDetails: function() { /* ... (same as before) ... */ 
        if (!this.elements.pawnDetailDisplay) return;
        const pawn = this.localState.playerRoster.find(p => p.id === this.localState.selectedPawnId);

        if (!pawn) {
            this.elements.pawnDetailDisplay.innerHTML = '<p style="text-align:center; margin-top:20px;">Select a hero from your roster to see their details and equip items.</p>';
            return;
        }

        let attributesHTML = '';
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

        let equipmentHTML = '';
        const slotsToDisplay = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.equipmentSlots) 
                               ? window.PawnGeneratorGame.config.equipmentSlots 
                               : Object.keys(pawn.equipment || {});
        
        slotsToDisplay.forEach(slot => {
            const item = pawn.equipment ? pawn.equipment[slot] : null;
            const slotNameDisplay = slot.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            equipmentHTML += `<div class="equipment-slot">
                <span><strong>${slotNameDisplay}:</strong> 
                ${item ? `<span class="item-name">${item.name}</span>` : `<span class="empty-slot">(empty)</span>`}
                </span>
                <span>
                ${item ? `<button class="unequip-button-armory" data-pawn-id="${pawn.id}" data-slot="${slot}">Unequip</button>` 
                       : `<button class="equip-button-armory" data-pawn-id="${pawn.id}" data-slot="${slot}" ${this.localState.selectedInventoryItemIndex === null ? 'disabled' : ''}>Equip</button>`}
                </span>
            </div>`;
        });
        
        let skillsHTML = '';
        if (pawn.skills && pawn.skills.length > 0) {
            pawn.skills.forEach(skill => { skillsHTML += `<li>${skill.name}</li>`; });
        } else { skillsHTML += '<li>None</li>'; }

        this.elements.pawnDetailDisplay.innerHTML = `
            <h3>${pawn.name} - Lvl ${pawn.level} ${pawn.race} ${pawn.class}</h3>
            <div class="stats-grid">
                <div><strong>HP:</strong> ${pawn.hp.current}/${pawn.hp.max}</div>
                <div><strong>MP:</strong> ${pawn.mp ? `${pawn.mp.current}/${pawn.mp.max}` : 'N/A'}</div>
                <div><strong>ATK Bonus:</strong> ${pawn.attackBonus !== undefined ? pawn.attackBonus : 'N/A'}</div>
                <div><strong>AC:</strong> ${pawn.armorClass !== undefined ? pawn.armorClass : 'N/A'}</div>
                <div><strong>Speed:</strong> ${pawn.speed !== undefined ? pawn.speed : 'N/A'}</div>
                <div><strong>Dodge:</strong> ${pawn.dodgeRate !== undefined ? pawn.dodgeRate + '%' : 'N/A'}</div>
                <div><strong>Accuracy:</strong> ${pawn.accuracyRate !== undefined ? pawn.accuracyRate + '%' : 'N/A'}</div>
                <div><strong>Melee Dmg+:</strong> ${pawn.meleeDamageBonus !== undefined ? (pawn.meleeDamageBonus >= 0 ? '+' : '') + pawn.meleeDamageBonus : 'N/A'}</div>
            </div>
            
            <div class="section-title">Attributes:</div>
            <div class="attributes-grid-armory">${attributesHTML}</div>
            
            <div class="section-title">Equipment:</div>
            <div class="equipment-slots-grid">${equipmentHTML}</div>

            <div class="section-title">Skills:</div>
            <ul class="skills-list-armory">${skillsHTML}</ul>
            
            ${pawn.personality ? `<p><strong>Personality:</strong> ${pawn.personality}</p>` : ''}
            ${pawn.background ? `<p><strong>Background:</strong> ${pawn.background}</p>` : ''}
        `;
        this.attachEquipmentButtonListeners();
    },
    
    selectPawn: function(pawnId) { /* ... (same as before) ... */ 
        this.localState.selectedPawnId = pawnId;
        this.localState.selectedInventoryItemIndex = null; 
        const pawnName = this.localState.playerRoster.find(p=>p.id === pawnId)?.name || "Unknown Hero";
        this.logMessage(`Selected ${pawnName}. Now select an item from inventory to equip, then click 'Equip' on an empty slot.`);
        this.updateDisplay();
    },

    selectInventoryItem: function(itemIndex) { /* ... (same as before) ... */ 
        this.localState.selectedInventoryItemIndex = itemIndex;
        const item = this.localState.playerInventory[itemIndex];
        if (item) {
            this.logMessage(`Selected item: ${item.name}. Click an 'Equip' button on the pawn's sheet for a compatible slot.`);
        }
        this.updateDisplay(); 
    },

    equipSelectedItem: function(pawnId, targetSlot) { /* ... (same as before) ... */ 
        if (this.localState.selectedInventoryItemIndex === null || this.localState.selectedInventoryItemIndex >= this.localState.playerInventory.length) {
            this.logMessage("No item selected from inventory, or selection is invalid.", "error");
            return;
        }
        const pawn = this.localState.playerRoster.find(p => p.id === pawnId);
        const itemToEquip = this.localState.playerInventory[this.localState.selectedInventoryItemIndex];

        if (!pawn || !itemToEquip) {
            this.logMessage("Error: Pawn or item not found.", "error");
            return;
        }

        let canEquip = false;
        const itemType = itemToEquip.type ? itemToEquip.type.toLowerCase() : "unknown";
        const itemSlot = itemToEquip.slot ? itemToEquip.slot.toLowerCase() : null; 

        if (itemSlot === targetSlot.toLowerCase()) { 
            canEquip = true;
        } else if ((targetSlot.toLowerCase() === "mainhand" || targetSlot.toLowerCase() === "offhand")) {
            if (["weapon", "shield", "implement"].includes(itemType)) canEquip = true;
        } else if (itemType === "ring" && (targetSlot.toLowerCase() === "ring1" || targetSlot.toLowerCase() === "ring2")) {
            canEquip = true;
        } else if (itemType === "armor" && ["head", "torso", "legs", "hands", "feet", "cape", "belt", "bracers"].includes(targetSlot.toLowerCase())) {
             if (itemSlot === targetSlot.toLowerCase()) canEquip = true; 
        } else if (itemType === "amulet" && targetSlot.toLowerCase() === "amulet") {
            canEquip = true;
        }
        if (pawn.equipment.mainHand && pawn.equipment.mainHand.handedness === 2 && targetSlot.toLowerCase() === "offhand") {
            this.logMessage(`Cannot equip to Off Hand; ${pawn.equipment.mainHand.name} is two-handed.`, "error");
            return;
        }
        if (itemToEquip.handedness === 2 && targetSlot.toLowerCase() === "offhand") {
            this.logMessage(`${itemToEquip.name} is two-handed and cannot be equipped in the Off Hand.`, "error");
            return;
        }
         if (itemToEquip.handedness === 2 && targetSlot.toLowerCase() === "mainhand" && pawn.equipment.offHand) {
            this.logMessage(`Unequip ${pawn.equipment.offHand.name} from Off Hand before equipping a two-handed weapon.`, "error");
            return;
        }

        if (!canEquip) {
            this.logMessage(`Cannot equip ${itemToEquip.name} (${itemType}) into ${targetSlot}. Incompatible.`, "error");
            return;
        }

        if (pawn.equipment[targetSlot]) {
            const unequippedItem = pawn.equipment[targetSlot];
            this.localState.playerInventory.push(unequippedItem); 
            this.logMessage(`Unequipped ${unequippedItem.name} from ${targetSlot}.`, "info", false);
        }

        pawn.equipment[targetSlot] = JSON.parse(JSON.stringify(itemToEquip)); 
        if (itemToEquip.quantity > 1) {
            itemToEquip.quantity -=1;
        } else {
            this.localState.playerInventory.splice(this.localState.selectedInventoryItemIndex, 1); 
        }
        
        this.recalculatePawnStats(pawn); 
        this.logMessage(`Equipped ${itemToEquip.name} to ${pawn.name}'s ${targetSlot}. Stats updated.`, "success", false);
        
        this.localState.selectedInventoryItemIndex = null; 
        this.updateDisplay();
    },

    unequipItemFromSlot: function(pawnId, slot) { 
        const pawn = this.localState.playerRoster.find(p => p.id === pawnId);
        if (!pawn || !pawn.equipment || !pawn.equipment[slot]) {
            this.logMessage("Error: No item in that slot or pawn not found.", "error");
            return;
        }

        const unequippedItem = pawn.equipment[slot];
        this.localState.playerInventory.push(unequippedItem);
        pawn.equipment[slot] = null;

        this.recalculatePawnStats(pawn); 
        this.logMessage(`Unequipped ${unequippedItem.name} from ${pawn.name}'s ${slot}. Stats updated.`, "success", false);
        
        this.updateDisplay();
    },
    
    recalculatePawnStats: function(pawn) {
        if (!pawn || !pawn.id) {
            console.error("ArmoryGame: Cannot recalculate stats for invalid pawn object:", pawn);
            return;
        }
        
        const originalPawnData = this.localState.originalPawnStats[pawn.id];
        if (!originalPawnData || !originalPawnData.attributes) {
            console.error("ArmoryGame: Original pawn data or attributes not found for pawn ID:", pawn.id);
            if (!pawn.attributes) {
                console.error("ArmoryGame: CRITICAL - Current pawn also has no attributes for recalculation.", pawn);
                return;
            }
            console.warn("ArmoryGame: Using current pawn attributes as base for recalculation due to missing original data for ID:", pawn.id);
            // This is a fallback: it means we're calculating based on potentially already modified attributes.
            // The ideal scenario is always starting from originalPawnData.attributes.
            effectiveAttributes = JSON.parse(JSON.stringify(pawn.attributes)); 
        } else {
             effectiveAttributes = JSON.parse(JSON.stringify(originalPawnData.attributes)); // Start from PRISTINE base attributes
        }
        
        // Store current HP/MP *before* max values change, to try and preserve current values appropriately.
        const previousCurrentHP = pawn.hp ? pawn.hp.current : (effectiveAttributes.con ? effectiveAttributes.con * 2 : 10);
        const previousCurrentMP = pawn.mp ? pawn.mp.current : 0;

        // 1. Apply item effects that modify BASE ATTRIBUTES first
        for (const slot in pawn.equipment) {
            const item = pawn.equipment[slot];
            if (item && item.effects && Array.isArray(item.effects)) {
                item.effects.forEach(effect => {
                    if (effect.attribute && effectiveAttributes.hasOwnProperty(effect.attribute)) {
                        effectiveAttributes[effect.attribute] += effect.value;
                    }
                });
            }
        }
        
        // Update the pawn's main attributes property to reflect these item-modified attributes
        // This IS what will be displayed for STR, DEX, etc. and used for further calculations.
        pawn.attributes = effectiveAttributes; // effectiveAttributes is already a new object from JSON.parse(JSON.stringify(...))

        // Get class and race config (requires PawnGeneratorGame to be global and loaded)
        const classConfig = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.classes[pawn.class]) || {};
        const raceConfig = (window.PawnGeneratorGame && window.PawnGeneratorGame.config && window.PawnGeneratorGame.config.races[pawn.race]) || {};
        const getAttributeModifier = (val) => Math.floor(((val || 10) - 10) / 2);

        // --- Recalculate DERIVED stats based on NEWLY MODIFIED pawn.attributes ---
        const conModifier = getAttributeModifier(pawn.attributes.con); 
        
        // Recalculate Max HP: Start with original base HP (from HD rolls, before original CON) and apply new CON mod.
        let calculatedMaxHP = originalPawnData.hp ? originalPawnData.hp.max : (pawn.level * (classConfig.hitDie || 6)); // Fallback if originalPawnData.hp.max is missing
        if (originalPawnData.attributes && originalPawnData.attributes.con !== undefined) {
            const originalConMod = getAttributeModifier(originalPawnData.attributes.con);
            // Attempt to derive base HP before any CON mod was applied by PawnGenerator
            // This assumes HP was (BaseHPFromClassAndLevel + OriginalConMod*Level + RaceBonus)
            // So, BaseHPFromClassAndLevel = OriginalMaxHP - OriginalConMod*Level - RaceBonus
            const baseHpWithoutConAndRace = (originalPawnData.hp.max || calculatedMaxHP) - (originalConMod * pawn.level) - (raceConfig.hitDieBonus || 0);
            calculatedMaxHP = baseHpWithoutConAndRace + (conModifier * pawn.level) + (raceConfig.hitDieBonus || 0);
        } else { // Fallback if original CON is missing, less accurate
            calculatedMaxHP = (pawn.level * (classConfig.hitDie || 6)) + (conModifier * pawn.level) + (raceConfig.hitDieBonus || 0);
        }
        calculatedMaxHP = Math.max(pawn.level, calculatedMaxHP);


        let primaryMpAttributeValue = pawn.attributes.int; 
        if (classConfig.primaryAttributes) {
            const pAttr = classConfig.primaryAttributes.find(attr => ['int', 'wis', 'cha'].includes(attr)) || 'int';
            primaryMpAttributeValue = pawn.attributes[pAttr];
        }
        let calculatedMaxMP = Math.max(0, (getAttributeModifier(primaryMpAttributeValue) * (classConfig.mpPerAttributePoint || 0)));
        if (pawn.class === "Mage" || pawn.class === "Cleric") calculatedMaxMP += 5; 
        if (pawn.class === "Cleric" && calculatedMaxMP < 1 && (classConfig.mpPerAttributePoint || 0) > 0) calculatedMaxMP = 1;

        let attackAttributeValue = pawn.attributes.str;
        if (pawn.class === "Archer" || pawn.class === "Rogue") attackAttributeValue = pawn.attributes.dex;
        else if (pawn.class === "Mage") attackAttributeValue = pawn.attributes.int;
        
        pawn.attackBonus = Math.floor(pawn.level * (classConfig.baseAttackBonusPerLevel || 0.5)) + getAttributeModifier(attackAttributeValue);
        pawn.armorClass = 10 + getAttributeModifier(pawn.attributes.dex) + (classConfig.baseDefenseBonus || 0); 
        pawn.speed = (raceConfig.baseSpeed || 30) + (getAttributeModifier(pawn.attributes.dex) * 5);
        pawn.dodgeRate = Math.max(5, Math.min(95, (classConfig.baseDodge || 5) + getAttributeModifier(pawn.attributes.dex) * 2));
        pawn.accuracyRate = Math.max(50, Math.min(100, (classConfig.baseAccuracy || 65) + getAttributeModifier(pawn.attributes.dex) + (pawn.class === "Archer" ? 5 : 0)));
        pawn.meleeDamageBonus = getAttributeModifier(pawn.attributes.str);
        pawn.rangedDamageBonus = getAttributeModifier(pawn.attributes.dex);

        // Second pass: Apply direct bonuses FROM ITEMS to the derived stats
        for (const slot in pawn.equipment) {
            const item = pawn.equipment[slot];
            if (item && item.effects && Array.isArray(item.effects)) {
                item.effects.forEach(effect => {
                    if (effect.attribute === "maxHP") calculatedMaxHP += effect.value;
                    else if (effect.attribute === "maxMP") calculatedMaxMP += effect.value;
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
        
        pawn.hp.max = Math.max(1, calculatedMaxHP);
        pawn.mp.max = Math.max(0, calculatedMaxMP);

        // Restore current HP/MP, clamped by new max values.
        pawn.hp.current = Math.min(previousCurrentHP, pawn.hp.max); 
        pawn.hp.current = Math.max(0, pawn.hp.current); 
        pawn.mp.current = Math.min(previousCurrentMP, pawn.mp.max); 
        pawn.mp.current = Math.max(0, pawn.mp.current);
        if (previousCurrentHP <= 0) pawn.hp.current = 0;


        console.log(`ArmoryGame: Final Stats for ${pawn.name}: Attributes:`, pawn.attributes, `HP ${pawn.hp.current}/${pawn.hp.max}, MP ${pawn.mp.current}/${pawn.mp.max}, ATK ${pawn.attackBonus}, AC ${pawn.armorClass}, Speed ${pawn.speed}`);
    },

    logMessage: function(message, type = "info", updateImmediately = true) { /* ... (same as before) ... */ 
        this.localState.message = message;
        if (this.elements.messageDisplay) {
            this.elements.messageDisplay.textContent = message;
            if (type === "error") this.elements.messageDisplay.style.color = "#e74c3c"; 
            else if (type === "success") this.elements.messageDisplay.style.color = "#2ecc71";
            else this.elements.messageDisplay.style.color = "#e0e0e0"; 
        }
        if (updateImmediately) this.updateDisplay();
    },

    attachEventListeners: function() { /* ... (same as before) ... */ 
        if (this.elements.exitButton) {
            this.elements.exitButton.onclick = () => {
                this.sharedData.playerRoster = JSON.parse(JSON.stringify(this.localState.playerRoster));
                this.sharedData.playerInventory = JSON.parse(JSON.stringify(this.localState.playerInventory));
                console.log("ArmoryGame: Exiting. Final sharedData:", JSON.parse(JSON.stringify(this.sharedData)));
                this.successCallback(this.sharedData);
            };
        }
    },

    attachEquipmentButtonListeners: function() { /* ... (same as before) ... */ 
        const pawnDetailDiv = this.elements.pawnDetailDisplay;
        if (!pawnDetailDiv) return;

        pawnDetailDiv.querySelectorAll('.equip-button-armory').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', (event) => {
                const pawnId = event.target.dataset.pawnId;
                const slot = event.target.dataset.slot;
                this.equipSelectedItem(pawnId, slot);
            });
        });
        pawnDetailDiv.querySelectorAll('.unequip-button-armory').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', (event) => {
                const pawnId = event.target.dataset.pawnId;
                const slot = event.target.dataset.slot;
                this.unequipItemFromSlot(pawnId, slot);
            });
        });
    },

    destroy: function() { /* ... (same as before) ... */ 
        console.log("ArmoryGame: Destroying...");
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};

if (typeof window !== 'undefined') {
    window.ArmoryGame = ArmoryGame; 
}

