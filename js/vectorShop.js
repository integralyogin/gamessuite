/**
 * vectorShop.js - v2.1 (Turret Purchase Fixed)
 * This module allows the player to purchase and equip new ship parts.
 * v2.1 Changes:
 * - Fixed turret purchasing to allow multiple instances like weapons
 * - Turrets now use instanceIds and can be purchased multiple times
 * - Added proper turret equipping logic for multiple slots
 */
const VectorShopGame = {
    id: 'vectorShop',
    onSuccess: null,
    onFailure: null,
    gameContainer: null,
    playerData: null,
    PARTS: null,
    activeCategory: 'chassis', // Default to chassis

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback;
        this.playerData = sharedData.playerData;
        console.log("Vector Shop Initializing...");

        try {
            this.PARTS = await PartsLoader.getParts();
            if (!this.PARTS) {
                throw new Error("Parts data is null or undefined after loading.");
            }
            this.activeCategory = 'chassis'; // Reset to default on init
            this.setupUI();
            this.addEventListeners();
            this.refreshShopView();
        } catch (error) {
            console.error("Failed to initialize Vector Shop:", error);
            if (this.onFailure) {
                this.onFailure({ reason: "Could not load shop data from server." });
            }
        }
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .shop-container { display: flex; flex-direction: column; width: 100%; height: 100%; background: #1a1a2a; font-family: 'Courier New', Courier, monospace; color: white; }
                .shop-header { padding: 10px 20px; background: #111; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00aaff; }
                .shop-header h1 { margin: 0; color: #00aaff; }
                #player-credits-display { font-size: 1.5em; color: #0f0; }
                .shop-main { display: flex; flex: 1; overflow: hidden; }
                .shop-sidebar { flex: 0 0 200px; background: #111; padding: 10px; overflow-y: auto; border-right: 1px solid #444;}
                .category-button { display: block; width: 100%; padding: 15px; margin-bottom: 10px; background: #222; border: 1px solid #444; color: white; cursor: pointer; text-align: left; font-size: 1.1em; }
                .category-button.active { background: #00aaff; color: #000; font-weight: bold; }
                .shop-item-list { flex: 1; padding: 20px; overflow-y: auto; }
                .shop-item { display: flex; justify-content: space-between; align-items: center; background: #222; padding: 15px; margin-bottom: 10px; border-left: 4px solid #444; }
                .shop-item-info h4 { margin: 0 0 5px 0; color: #00aaff; }
                .shop-item-info p { margin: 0 0 10px 0; font-size: 0.9em; color: #aaa; }
                .shop-item-stats { font-size: 0.8em; color: #0f0; }
                .shop-item-actions { display: flex; flex-direction: column; gap: 5px; }
                .shop-item-actions button { font-size: 0.9em; padding: 8px 15px; cursor: pointer; border: none; min-width: 120px; text-align: center;}
                .buy-button { background: #00aaff; color: #000; }
                .buy-button:disabled { background: #555; cursor: not-allowed; }
                .equip-button { background: #2ecc71; color: #000; }
                .equipped-button { background: #95a5a6; color: #333; cursor: default; }
                .shop-footer { padding: 10px; background: #111; text-align: right; border-top: 1px solid #444; }
                .exit-button { background: #ff4400; color: white; border: 2px solid #ff6600; padding: 10px 30px; font-size: 1.2em; cursor: pointer; }
            </style>
            <div class="shop-container">
                <div class="shop-header">
                    <h1>PARTS VENDOR</h1>
                    <div id="player-credits-display">Credits: 0</div>
                </div>
                <div class="shop-main">
                    <div class="shop-sidebar" id="shop-categories"></div>
                    <div class="shop-item-list" id="shop-item-list"></div>
                </div>
                <div class="shop-footer">
                    <button id="shop-exit-btn" class="exit-button">Return to Hangar</button>
                </div>
            </div>
        `;
    },

    refreshShopView: function() {
        this.updateCredits();
        this.populateCategories();
        this.showCategory(this.activeCategory);
    },

    updateCredits: function() {
        const creditsDisplay = this.gameContainer.querySelector('#player-credits-display');
        if (creditsDisplay) {
            creditsDisplay.textContent = `Credits: ${this.playerData.credits || 0}`;
        }
    },

    populateCategories: function() {
        const container = this.gameContainer.querySelector('#shop-categories');
        container.innerHTML = '';
        if (!this.PARTS) return;

        for (const type in this.PARTS) {
            const button = document.createElement('button');
            button.className = 'category-button';
            button.textContent = type.toUpperCase();
            button.dataset.type = type;
            if (type === this.activeCategory) {
                button.classList.add('active');
            }
            container.appendChild(button);
        }
    },

    showCategory: function(category) {
        this.activeCategory = category;
        const listContainer = this.gameContainer.querySelector('#shop-item-list');
        listContainer.innerHTML = '';

        this.gameContainer.querySelectorAll('.category-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === category);
        });

        if (!this.PARTS || !this.PARTS[category]) return;

        for (const partId in this.PARTS[category]) {
            const part = this.PARTS[category][partId];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <div class="shop-item-info">
                    <h4>${part.name}</h4>
                    <p>${part.desc}</p>
                    <div class="shop-item-stats">${this.getPartStatsHTML(part)}</div>
                </div>
                <div class="shop-item-actions" id="actions-${partId}">
                    ${this.getButtonHTML(category, partId)}
                </div>
            `;
            listContainer.appendChild(itemDiv);
        }
    },

    getButtonHTML: function(type, partId) {
        const part = this.PARTS[type][partId];
        const canAfford = this.playerData.credits >= part.cost;

        // FIXED: Treat turrets like weapons (instanced parts)
        if (type === 'weapon' || type === 'turret' || type === 'drone') {
            const ownedInstances = this.playerData.owned[type]?.filter(w => w.id === partId) || [];
            let buttons = `<button class="buy-button" data-type="${type}" data-partid="${partId}" ${canAfford ? '' : 'disabled'}>Buy (${part.cost}c)</button>`;
            
            ownedInstances.forEach(instance => {
                const equippedSlots = this.playerData.equipped[type] || [];
                const slotIndex = equippedSlots.indexOf(instance.instanceId);
                
                if (slotIndex !== -1) {
                    // This instance is equipped
                    const slotLabel = this.getSlotLabel(type, slotIndex);
                    buttons += `<button class="equipped-button" disabled>Equipped (${slotLabel})</button>`;
                } else {
                    // This instance is not equipped - show available slots
                    const availableSlots = this.getAvailableSlots(type);
                    availableSlots.forEach(slot => {
                        buttons += `<button class="equip-button" data-type="${type}" data-partid="${instance.instanceId}" data-slot="${slot.index}">Equip to ${slot.label}</button>`;
                    });
                }
            });
            return buttons;
        } else {
            // Handle regular parts (chassis, engine, etc.)
            const isOwned = this.playerData.owned[type]?.includes(partId);
            if (!isOwned) {
                return `<button class="buy-button" data-type="${type}" data-partid="${partId}" ${canAfford ? '' : 'disabled'}>Buy (${part.cost}c)</button>`;
            }
            const isEquipped = this.playerData.equipped[type] === partId;
            return isEquipped ? 
                `<button class="equipped-button" disabled>Equipped</button>` : 
                `<button class="equip-button" data-type="${type}" data-partid="${partId}">Equip</button>`;
        }
    },

    getSlotLabel: function(type, slotIndex) {
        const chassis = this.PARTS.chassis[this.playerData.equipped.chassis];
        const slots = chassis.slots?.[type] || [];
        const slot = slots[slotIndex];
        return slot?.label || `${type} ${slotIndex + 1}`;
    },

    getAvailableSlots: function(type) {
        const chassis = this.PARTS.chassis[this.playerData.equipped.chassis];
        const slots = chassis.slots?.[type] || [];
        const equippedSlots = this.playerData.equipped[type] || [];
        
        const availableSlots = [];
        slots.forEach((slot, index) => {
            if (!equippedSlots[index]) {
                availableSlots.push({
                    index: index,
                    label: slot.label || `${type} ${index + 1}`
                });
            }
        });
        return availableSlots;
    },

    getPartStatsHTML: function(part) {
        // This function can be expanded to show part stats
        return "";
    },

    buyPart: function(type, partId) {
        const part = this.PARTS[type][partId];
        if (this.playerData.credits < part.cost) {
            console.log("Cannot afford part.");
            return;
        }

        this.playerData.credits -= part.cost;

        // FIXED: Handle turrets like weapons (instanced parts)
        if (type === 'weapon' || type === 'turret' || type === 'drone') {
            if (!this.playerData.owned[type]) this.playerData.owned[type] = [];
            const maxInstanceId = this.playerData.owned[type].reduce((max, w) => Math.max(max, w.instanceId), 0);
            this.playerData.owned[type].push({ id: partId, instanceId: maxInstanceId + 1 });
        } else {
            // Handle regular parts
            if (!this.playerData.owned[type]) this.playerData.owned[type] = [];
            if (!this.playerData.owned[type].includes(partId)) {
                this.playerData.owned[type].push(partId);
            }
        }
        
        console.log(`Bought ${part.name}. Remaining credits: ${this.playerData.credits}`);
        this.refreshShopView();
    },

    equipPart: function(type, partIdOrInstanceId, slot) {
        if (type === 'weapon' || type === 'turret' || type === 'drone') {
            // Handle instanced parts
            if (!this.playerData.equipped[type]) {
                this.playerData.equipped[type] = [];
            }
            this.playerData.equipped[type][slot] = partIdOrInstanceId;
        } else {
            // Handle regular parts
            this.playerData.equipped[type] = partIdOrInstanceId;
        }
        console.log(`Equipped part. Type: ${type}, ID: ${partIdOrInstanceId}, Slot: ${slot || 'N/A'}`);
        this.refreshShopView();
    },

    addEventListeners: function() {
        this.exitHandler = () => {
            if(this.onSuccess) this.onSuccess({ from: 'shop', playerData: this.playerData });
        };
        
        this.categoryClickHandler = (e) => {
            if (e.target.classList.contains('category-button')) {
                this.showCategory(e.target.dataset.type);
            }
        };
        
        this.actionClickHandler = (e) => {
            const button = e.target;
            if (button.classList.contains('buy-button')) {
                const { type, partid } = button.dataset;
                this.buyPart(type, partid);
            } else if (button.classList.contains('equip-button')) {
                const { type, partid, slot } = button.dataset;
                const id = (type === 'weapon' || type === 'turret' || type === 'drone') ? parseInt(partid, 10) : partid;
                this.equipPart(type, id, slot ? parseInt(slot, 10) : undefined);
            }
        };

        const exitButton = this.gameContainer.querySelector('#shop-exit-btn');
        if (exitButton) exitButton.addEventListener('click', this.exitHandler);

        const categoriesContainer = this.gameContainer.querySelector('#shop-categories');
        if (categoriesContainer) categoriesContainer.addEventListener('click', this.categoryClickHandler);

        const itemListContainer = this.gameContainer.querySelector('#shop-item-list');
        if(itemListContainer) itemListContainer.addEventListener('click', this.actionClickHandler);
    },

    destroy: function() {
        const exitButton = this.gameContainer.querySelector('#shop-exit-btn');
        if (exitButton) exitButton.removeEventListener('click', this.exitHandler);

        const categoriesContainer = this.gameContainer.querySelector('#shop-categories');
        if (categoriesContainer) categoriesContainer.removeEventListener('click', this.categoryClickHandler);

        const itemListContainer = this.gameContainer.querySelector('#shop-item-list');
        if(itemListContainer) itemListContainer.removeEventListener('click', this.actionClickHandler);

        this.gameContainer.innerHTML = '';
        console.log("Vector Shop Destroyed.");
    },
};


