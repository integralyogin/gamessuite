// js/characterSheetScreen.js
const CharacterSheetScreen = {
    id: 'CharacterSheetScreen',

    /**
     * Generates the HTML content for the character sheet.
     * @param {Object} sharedData - Data from GameManager, potentially containing player stats.
     * @returns {string} HTML string for the character sheet.
     */
    getContent: function(sharedData) {
        const playerName = sharedData.playerName || "Hero";
        let statsHTML = "<p>No character stats loaded yet.</p>";

        if (sharedData.playerStats) {
            statsHTML = "<ul>";
            for (const stat in sharedData.playerStats) {
                statsHTML += `<li><strong>${stat.charAt(0).toUpperCase() + stat.slice(1)}:</strong> ${sharedData.playerStats[stat]}</li>`;
            }
            statsHTML += "</ul>";
        }
        
        // Basic inventory display if available
        let inventoryHTML = "";
        if (sharedData.inventory && sharedData.inventory.length > 0) {
            inventoryHTML = "<h3>Inventory:</h3><ul>";
            sharedData.inventory.forEach(item => {
                inventoryHTML += `<li>${item.name} (${item.type || 'Item'})</li>`;
            });
            inventoryHTML += "</ul>";
        } else if (sharedData.chosenItem) { // Fallback for single chosen item
             inventoryHTML = `<h3>Equipped:</h3><p>${sharedData.chosenItem.name || sharedData.chosenItem}</p>`;
        }


        return `
            <div id="characterSheetModal" class="sheet-modal" style="background-color: rgba(230, 230, 255, 0.97); border: 3px solid #4a4ae6;">
                <h2>Character Sheet</h2>
                <p><strong>Name:</strong> ${playerName}</p>
                <h3>Stats:</h3>
                ${statsHTML}
                ${inventoryHTML}
                <p style="margin-top: 15px;"><em>More details like equipment, bio, etc., will be here.</em></p>
                <button id="closeCharacterSheetBtn" class="sheet-close-btn">Close (C or Esc)</button>
            </div>
        `;
    },

    /**
     * Sets up event listeners for interactive elements within the sheet.
     * @param {Function} closeCallback - The function to call when the sheet should be closed.
     */
    addEventListeners: function(closeCallback) {
        const closeButton = document.getElementById('closeCharacterSheetBtn');
        if (closeButton) {
            closeButton.onclick = closeCallback;
        }
    },

    /**
     * Called when the character sheet is opened.
     */
    onOpen: function() {
        console.log("CharacterSheetScreen: Opened");
    },

    /**
     * Called when the character sheet is closed.
     */
    onClose: function() {
        console.log("CharacterSheetScreen: Closed");
    }
};

