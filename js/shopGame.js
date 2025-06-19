// js/ShopGame.js
const ShopGame = {
    id: 'ShopGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    localState: {
        playerInventory: [], 
        shopStock: [],       
        shopMessage: "Welcome to the Emporium!",
        activeTab: "sell", 
        // For sorting - future use
        sellSortCriteria: { field: 'name', order: 'asc' },
        buySortCriteria: { field: 'name', order: 'asc' }
    },

    elements: {
        inventoryDisplay: null,
        shopStockDisplay: null,
        playerGoldDisplay: null,
        shopMessageDisplay: null,
        exitButton: null,
        buyTabButton: null,
        sellTabButton: null,
        sellSection: null,
        buySection: null,
        refreshShopStockBtn: null
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (!this.sharedData.playerInventory) this.sharedData.playerInventory = [];
        if (this.sharedData.totalCoins === undefined) this.sharedData.totalCoins = 0;
        
        this.localState.playerInventory = JSON.parse(JSON.stringify(this.sharedData.playerInventory));
        this.localState.shopStock = []; 
        this.localState.activeTab = "sell"; 

        console.log("ShopGame: Initializing. SharedData:", JSON.parse(JSON.stringify(this.sharedData)));

        this.renderBaseLayout();
        this.cacheElements();
        this.stockShop(); 
        this.attachEventListeners();
    },

    renderBaseLayout: function() {
        this.container.innerHTML = `
            <div class="shop-game-container compact-shop">
                <div class="shop-header">
                    <h1>Adventurer's Emporium</h1>
                    <div class="player-gold-shop">Your Gold: <span id="shopPlayerGoldSG">${this.sharedData.totalCoins}</span></div>
                </div>
                <div id="shopMessageDisplaySG" class="shop-message">${this.localState.shopMessage}</div>
                
                <div class="shop-tabs">
                    <button id="sellTabBtnSG" class="shop-tab-button active">Sell Items</button>
                    <button id="buyTabBtnSG" class="shop-tab-button">Buy Items</button>
                </div>

                <div class="shop-main-content">
                    <div id="sellSectionShopSG" class="inventory-section-shop" style="display: flex;">
                        <h2>Your Sellable Items</h2>
                        <div class="shop-list-header">
                            <span>Name (Qty)</span>
                            <span>Type</span>
                            <span>Value</span>
                            <span>Action</span>
                        </div>
                        <div id="playerInventoryDisplayShopSG" class="item-list-container-shop"></div>
                    </div>
                    <div id="buySectionShopSG" class="inventory-section-shop" style="display: none;">
                        <h2>Items for Sale</h2>
                        <div class="shop-list-header">
                            <span>Name (Stock)</span>
                            <span>Type</span>
                            <span>Price</span>
                            <span>Action</span>
                        </div>
                        <div id="shopStockDisplayShopSG" class="item-list-container-shop"></div>
                         <button id="refreshShopStockBtnSG" class="shop-button refresh-stock-button">Refresh Stock (20G)</button>
                    </div>
                </div>

                <button id="exitShopBtnSG" class="shop-button exit-button-shop">Leave Shop</button>
            </div>
        `;
        this.applyStyles(); // Apply styles after HTML structure is in place
    },

    cacheElements: function() {
        this.elements.inventoryDisplay = document.getElementById('playerInventoryDisplayShopSG');
        this.elements.shopStockDisplay = document.getElementById('shopStockDisplayShopSG');
        this.elements.playerGoldDisplay = document.getElementById('shopPlayerGoldSG');
        this.elements.shopMessageDisplay = document.getElementById('shopMessageDisplaySG');
        this.elements.exitButton = document.getElementById('exitShopBtnSG');
        this.elements.buyTabButton = document.getElementById('buyTabBtnSG');
        this.elements.sellTabButton = document.getElementById('sellTabBtnSG');
        this.elements.sellSection = document.getElementById('sellSectionShopSG');
        this.elements.buySection = document.getElementById('buySectionShopSG');
        this.elements.refreshShopStockBtn = document.getElementById('refreshShopStockBtnSG');
    },

    applyStyles: function() { 
        let style = document.getElementById('shopGameStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'shopGameStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .shop-game-container.compact-shop { display: flex; flex-direction: column; height: 100%; padding: 5px; box-sizing: border-box; font-family: 'Verdana', sans-serif; background-color: #eaddc7; color: #4a3b31; }
            .compact-shop .shop-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #c8b7a1; margin-bottom: 5px; }
            .compact-shop .shop-header h1 { margin: 0; font-size: 1.6em; color: #6a4a35; }
            .compact-shop .player-gold-shop { font-size: 1.1em; font-weight: bold; }
            .compact-shop .shop-message { padding: 4px; margin-bottom: 5px; background-color: #f5f0e5; border: 1px dashed #d4c8b7; border-radius: 3px; text-align: center; min-height: 1.4em; font-size: 0.95em;}
            
            .compact-shop .shop-tabs { display: flex; margin-bottom: 5px; border-bottom: 1px solid #d4c8b7;}
            .compact-shop .shop-tab-button { padding: 4px; cursor: pointer; background-color: #eaddc7; border: 1px solid #d4c8b7; border-bottom: none; margin-right: 3px; border-top-left-radius: 4px; border-top-right-radius: 4px; font-size: 0.9em; color: #6a4a35;}
            .compact-shop .shop-tab-button.active { background-color: #f5f0e5; border-bottom: 1px solid #f5f0e5; font-weight: bold;}

            .compact-shop .shop-main-content { display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; } 
            .compact-shop .inventory-section-shop { background-color: #f5f0e5; padding: 10px; border-radius: 6px; box-shadow: inset 0 0 5px rgba(0,0,0,0.05); display: flex; flex-direction: column; height: 100%; }
            .compact-shop .inventory-section-shop h3 { text-align: center; margin-top: 0; margin-bottom: 4px; color: #6a4a35; border-bottom: 1px solid #d4c8b7; padding-bottom: 4px; font-size: 1.1em;}
            
            .compact-shop .shop-list-header { display: grid; grid-template-columns: 3fr 1.5fr 1fr 1.5fr; /* Adjust column ratios */ font-weight: bold; padding: 4px; border-bottom: 1px solid #d4c8b7; margin-bottom: 5px; font-size: 0.85em; }
            .compact-shop .shop-list-header span { text-align: left; }
            .compact-shop .shop-list-header span:nth-child(3), .compact-shop .shop-list-header span:nth-child(4) { text-align: center; }


            .compact-shop .item-list-container-shop { overflow-y: auto; flex-grow: 1; }
            .compact-shop .item-list-row { 
                display: grid; grid-template-columns: 6fr 1.5fr 1fr 1.5fr; /* Match header */
                padding: 4px; font-size: 0.85em; 
                border-bottom: 1px dotted #d4c8b7; 
                align-items: center;
            }
            .compact-shop .item-list-row:last-child { border-bottom: none; }
            .compact-shop .item-list-row:hover { background-color: #efe5d8; }
            .compact-shop .item-list-row span { text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .compact-shop .item-list-row .item-name-list { font-weight: bold; }
            .compact-shop .item-list-row .item-type-list { color: #776655; }
            .compact-shop .item-value-list, .compact-shop .item-buy-price-list { text-align: center; font-weight: bold; }
            .compact-shop .item-value-list { color: #228b22; }
            .compact-shop .item-buy-price-list { color: #b22222; }
            .compact-shop .item-action-list { text-align: center; }

            .compact-shop .shop-button { padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.2s ease; background-color: #c8b7a1; color: #4a3b31; margin-top: 0px; }
            .compact-shop .shop-button.sell-button-list, .compact-shop .shop-button.buy-button-list { background-color: #8fbc8f; color:white; width: auto; padding: 4px;}
            .compact-shop .shop-button.buy-button-list { background-color: #add8e6; color:#333; }
            .compact-shop .shop-button.refresh-stock-button { background-color: #deb887; color: #4a3b31; margin-top: 10px; display: block; margin-left:auto; margin-right:auto; }
            .compact-shop .exit-button-shop { background-color: #a0522d; color:white; width: 100%; margin-top: 15px; padding: 10px; }
            .compact-shop .shop-button:hover:not(:disabled) { filter: brightness(110%); }
            .compact-shop .shop-button:disabled { background-color: #cccccc; color: #777; cursor:not-allowed; }
        `;
    },
    
    getRandomInt: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    stockShop: function(isRefresh = false) { /* ... (same as before, using this.getRandomInt) ... */ 
        const itemGenerator = window.ItemGeneratorGame;
        if (itemGenerator && typeof itemGenerator.init === 'function') {
            if (isRefresh) {
                const refreshCost = 20;
                if ((this.sharedData.totalCoins || 0) < refreshCost) {
                    this.logShopMessage("Not enough gold to refresh stock!", "error");
                    return;
                }
                this.sharedData.totalCoins -= refreshCost;
                this.logShopMessage(`Stock refreshed for ${refreshCost}G.`, "info", false);
            }
            const itemCountToGenerate = this.getRandomInt(6, 12);
            itemGenerator.init(null, 
                (itemData) => {
                    if (itemData && itemData.generatedEquipment) {
                        this.localState.shopStock = itemData.generatedEquipment.map(item => ({
                            ...item,
                            buyPrice: item.buyPrice || Math.ceil((item.value || 1) * (item.buyPriceMultiplier || 2.5)) 
                        }));
                    } else {
                        this.localState.shopStock = [];
                    }
                    this.updateDisplay(); 
                },
                (error) => {
                    console.error("ShopGame: Failed to get items from ItemGeneratorGame", error);
                    this.logShopMessage("Error stocking shop. Please try again later.", "error");
                    this.updateDisplay();
                },
                { requestType: 'shopStock', itemCount: itemCountToGenerate } 
            );
        } else {
            console.error("ShopGame: ItemGeneratorGame module not found or invalid.");
            this.logShopMessage("Error: Item generation service unavailable for shop.", "error");
        }
    },

    updateDisplay: function() {
        if (this.elements.playerGoldDisplay) {
            this.elements.playerGoldDisplay.textContent = this.sharedData.totalCoins || 0;
        }
        if (this.elements.shopMessageDisplay) {
            this.elements.shopMessageDisplay.textContent = this.localState.shopMessage;
        }
        this.renderInventory();
        this.renderShopStock();
        this.updateTabDisplay();
    },

    renderInventory: function() { 
        if (!this.elements.inventoryDisplay) return;
        this.elements.inventoryDisplay.innerHTML = '';
        if (this.localState.playerInventory.length === 0) {
            this.elements.inventoryDisplay.innerHTML = '<p style="text-align:center; padding: 10px;">Your inventory is empty.</p>';
            return;
        }
        this.localState.playerInventory.forEach((item, index) => {
            if (!item) return; 
            const row = document.createElement('div');
            row.className = 'item-list-row';
            row.innerHTML = `
                <span class="item-name-list">${item.name || item.itemId} (x${item.quantity || 1})</span>
                <span class="item-type-list">${item.type || 'Misc'}</span>
                <span class="item-value-list">${item.value || 0}G</span>
                <span class="item-action-list"><button class="shop-button sell-button-list" data-item-index="${index}">Sell 1</button></span>
            `;
            this.elements.inventoryDisplay.appendChild(row);
        });
    },
    
    renderShopStock: function() {
        if (!this.elements.shopStockDisplay) return;
        this.elements.shopStockDisplay.innerHTML = '';
        if (this.localState.shopStock.length === 0) {
            this.elements.shopStockDisplay.innerHTML = '<p style="text-align:center; padding: 10px;">No items currently in stock. Try refreshing!</p>';
            return;
        }
        this.localState.shopStock.forEach((item, index) => {
            if (!item) return;
            const row = document.createElement('div');
            row.className = 'item-list-row';
            const canAfford = (this.sharedData.totalCoins || 0) >= (item.buyPrice || 0);
            // Simple display of first effect if present
            let effectDisplay = "";
            if (item.effects && item.effects.length > 0) {
                const eff = item.effects[0];
                effectDisplay = `(${eff.attribute || eff.special || 'effect'}: ${eff.value >= 0 && eff.attribute ? '+' : ''}${eff.value})`;
            }

            row.innerHTML = `
                <span class="item-name-list">${item.name || item.itemId} (x${item.quantity || 1}) <i style="font-size:0.9em; color:#999;">${effectDisplay}</i></span>
                <span class="item-type-list">${item.type || 'Misc'}</span>
                <span class="item-buy-price-list">${item.buyPrice || 'N/A'}G</span>
                <span class="item-action-list"><button class="shop-button buy-button-list" data-item-index="${index}" ${!canAfford ? 'disabled' : ''}>Buy 1</button></span>
            `;
            this.elements.shopStockDisplay.appendChild(row);
        });
    },

    handleSellItem: function(itemIndex) { /* ... (same as before) ... */ 
        if (itemIndex < 0 || itemIndex >= this.localState.playerInventory.length) {
            this.logShopMessage("Error: Could not sell item (invalid index).", "error"); return;
        }
        const itemToSell = this.localState.playerInventory[itemIndex];
        if (!itemToSell) {
            this.logShopMessage("Error: Item data missing.", "error"); return;
        }
        const sellValue = parseInt(itemToSell.value, 10) || 0; 
        if (sellValue <= 0 && itemToSell.value > 0) { 
            this.logShopMessage(`Cannot sell ${itemToSell.name || itemToSell.itemId}, it has no value.`, "error"); return; 
        }
        const currentGold = parseInt(this.sharedData.totalCoins, 10) || 0;
        this.sharedData.totalCoins = currentGold + sellValue;
        this.logShopMessage(`Sold 1x ${itemToSell.name || itemToSell.itemId} for ${sellValue}G.`, "success");
        if (itemToSell.quantity > 1) itemToSell.quantity -= 1;
        else this.localState.playerInventory.splice(itemIndex, 1);
        this.updateDisplay();
    },

    handleBuyItem: function(itemIndex) { /* ... (same as before) ... */ 
        if (itemIndex < 0 || itemIndex >= this.localState.shopStock.length) {
            this.logShopMessage("Error: Selected item not available.", "error"); return;
        }
        const itemToBuy = this.localState.shopStock[itemIndex];
        if (!itemToBuy) {
            this.logShopMessage("Error: Item data missing.", "error"); return;
        }
        const buyPrice = itemToBuy.buyPrice || 0;
        if ((this.sharedData.totalCoins || 0) < buyPrice) {
            this.logShopMessage(`Not enough gold to buy ${itemToBuy.name || itemToBuy.itemId}. You need ${buyPrice}G.`, "error"); return;
        }
        this.sharedData.totalCoins -= buyPrice;
        const existingPlayerItem = this.localState.playerInventory.find(pi => pi.itemId === itemToBuy.itemId);
        if (existingPlayerItem) existingPlayerItem.quantity = (existingPlayerItem.quantity || 0) + 1;
        else {
            const boughtItemInstance = JSON.parse(JSON.stringify(itemToBuy)); 
            boughtItemInstance.quantity = 1;
            delete boughtItemInstance.buyPrice; 
            this.localState.playerInventory.push(boughtItemInstance);
        }
        this.logShopMessage(`Bought 1x ${itemToBuy.name || itemToBuy.itemId} for ${buyPrice}G.`, "success");
        if (itemToBuy.quantity > 1) itemToBuy.quantity -= 1;
        else this.localState.shopStock.splice(itemIndex, 1);
        this.updateDisplay();
    },
    
    switchTab: function(tabName) { /* ... (same as before) ... */ 
        this.localState.activeTab = tabName;
        this.logShopMessage(tabName === "buy" ? "Browse our wares!" : "What treasures do you have for sale?", "info");
        this.updateDisplay();
    },

    updateTabDisplay: function() { /* ... (same as before) ... */ 
        if (this.localState.activeTab === "buy") {
            if(this.elements.buySection) this.elements.buySection.style.display = 'flex'; 
            if(this.elements.sellSection) this.elements.sellSection.style.display = 'none';
            if(this.elements.buyTabButton) this.elements.buyTabButton.classList.add('active');
            if(this.elements.sellTabButton) this.elements.sellTabButton.classList.remove('active');
        } else { 
            if(this.elements.buySection) this.elements.buySection.style.display = 'none';
            if(this.elements.sellSection) this.elements.sellSection.style.display = 'flex'; 
            if(this.elements.buyTabButton) this.elements.buyTabButton.classList.remove('active');
            if(this.elements.sellTabButton) this.elements.sellTabButton.classList.add('active');
        }
    },

    logShopMessage: function(message, type = "info") { /* ... (same as before) ... */ 
        this.localState.message = message;
        if (this.elements.messageDisplay) {
            this.elements.messageDisplay.textContent = message;
            if (type === "error") this.elements.messageDisplay.style.color = "red";
            else if (type === "success") this.elements.messageDisplay.style.color = "green";
            else this.elements.messageDisplay.style.color = "#5d4037"; 
        }
        if (this.sharedData.options && this.sharedData.options.suppressImmediateLogUpdate) {
            // Do nothing if suppressed
        } else {
            // this.updateDisplay(); // This might be too much, let parent call updateDisplay if needed.
        }
        console.log("ShopLog:", message);
    },

    attachEventListeners: function() { /* ... (same as before) ... */ 
        if (this.elements.inventoryDisplay) {
            this.elements.inventoryDisplay.addEventListener('click', (event) => {
                if (event.target.classList.contains('sell-button-list')) { // Updated class
                    const itemIndex = parseInt(event.target.dataset.itemIndex, 10);
                    if (!isNaN(itemIndex)) this.handleSellItem(itemIndex);
                }
            });
        }
        if (this.elements.shopStockDisplay) {
            this.elements.shopStockDisplay.addEventListener('click', (event) => {
                if (event.target.classList.contains('buy-button-list') && !event.target.disabled) { // Updated class
                    const itemIndex = parseInt(event.target.dataset.itemIndex, 10);
                    if (!isNaN(itemIndex)) this.handleBuyItem(itemIndex);
                }
            });
        }
        if (this.elements.buyTabButton) this.elements.buyTabButton.onclick = () => this.switchTab('buy');
        if (this.elements.sellTabButton) this.elements.sellTabButton.onclick = () => this.switchTab('sell');
        if (this.elements.refreshShopStockBtn) this.elements.refreshShopStockBtn.onclick = () => this.stockShop(true);
        if (this.elements.exitButton) {
            this.elements.exitButton.onclick = () => {
                this.sharedData.playerInventory = JSON.parse(JSON.stringify(this.localState.playerInventory));
                console.log("ShopGame: Exiting. Final sharedData:", JSON.parse(JSON.stringify(this.sharedData)));
                this.successCallback(this.sharedData);
            };
        }
    },

    destroy: function() { /* ... (same as before) ... */ 
        console.log("ShopGame: Destroying...");
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};

if (typeof window !== 'undefined') {
    window.ShopGame = ShopGame; 
}

