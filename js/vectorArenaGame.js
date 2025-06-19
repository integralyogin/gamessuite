/**
 * VectorArenaGame.js - (The Menu)
 * This module serves as the main menu for the Vector Arena experience.
 * It launches other game modules like Hangar or Combat.
 */
const VectorArenaGame = {
    id: 'vectorArena',
    onSuccess: null,
    playerData: null, 

    /**
     * Initializes the menu screen.
     */
    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback; 
        
        // If we are returning from another module, update our master player data
        if (sharedData && sharedData.playerData) {
            console.log("Menu received updated player data.");
            this.playerData = sharedData.playerData;
        } 
        // If it's the first time loading, create the initial player data
        else if (!this.playerData) {
             console.log("No player data found, creating new default data.");
             this.playerData = {
                credits: 2000, 
                owned: {
                    chassis: ['interceptor'],
                    weapon: [{ id: 'pulse_laser', instanceId: 1 }],
                    engine: ['standard_ion'],
                    shield: [], thrusters: ['maneuvering_jets'], special: [], tech: []
                },
                equipped: {
                    chassis: 'interceptor',
                    weapon: 1, 
                    weapon_secondary: null, 
                    engine: 'standard_ion',
                    shield: null, thrusters: 'maneuvering_jets', special: null, tech: null
                }
            };
        }

        this.setupUI();
        this.addEventListeners();
    },

    /**
     * Creates the HTML for the menu.
     */
    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .va-menu-container { display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; background: #000; font-family: 'Courier New', Courier, monospace; color: white; }
                .va-menu-container h1 { font-size: 3em; color: #00aaff; margin-bottom: 40px; text-shadow: 0 0 10px #00aaff; }
                .va-menu-button { background: transparent; border: 2px solid #00aaff; color: #00aaff; padding: 15px 30px; font-size: 1.5em; cursor: pointer; margin: 10px; transition: all 0.3s ease; }
                .va-menu-button:hover { background: #00aaff; color: #000; box-shadow: 0 0 15px #00aaff; }
            </style>
            <div class="va-menu-container">
                <h1>Vector Arena</h1>
                <button id="va-launch-combat-btn" class="va-menu-button">Combat</button>
                <button id="va-launch-hangar-btn" class="va-menu-button">Hangar</button>
            </div>
        `;
    },
    
    /**
     * Adds click listeners to the menu buttons.
     */
    addEventListeners: function() {
        this.launchHangarHandler = () => {
            if (this.onSuccess) {
                this.onSuccess({ nextGame: 'vectorArenaHangar', returnTo: 'vectorArena', playerData: this.playerData });
            }
        };
        
        this.launchCombatHandler = () => {
            if (this.onSuccess) {
                this.onSuccess({ nextGame: 'vectorArenaCombat', returnTo: 'vectorArena', playerData: this.playerData });
            }
        };
        
        const hangarButton = this.gameContainer.querySelector('#va-launch-hangar-btn');
        if (hangarButton) hangarButton.addEventListener('click', this.launchHangarHandler);

        const combatButton = this.gameContainer.querySelector('#va-launch-combat-btn');
        if (combatButton) combatButton.addEventListener('click', this.launchCombatHandler);
    },

    /**
     * Cleans up the game module.
     */
    destroy: function() {
        const hangarButton = this.gameContainer.querySelector('#va-launch-hangar-btn');
        if (hangarButton) hangarButton.removeEventListener('click', this.launchHangarHandler);
        const combatButton = this.gameContainer.querySelector('#va-launch-combat-btn');
        if (combatButton) combatButton.removeEventListener('click', this.launchCombatHandler);
        
        this.gameContainer.innerHTML = '';
        console.log("Vector Arena Menu Destroyed.");
    }
};

