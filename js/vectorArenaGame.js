/**
 * vectorArenaGame.js - v2.2 (Exploration Mode Added)
 * This is the main menu and hub for the Vector Arena game.
 * v2.2 Changes:
 * - Added an "Explore Sector" button to the main menu.
 * - Implemented the necessary event handler to launch the 'vectorExplore' game scene.
 * - This integrates the new exploration game mode into the primary game loop.
 */
const VectorArenaGame = {
    id: 'vectorArena',
    onSuccess: null,
    onFailure: null,
    gameContainer: null,
    playerData: null,
    PARTS: null,

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback;
        
        console.log("Vector Arena Main Menu Initializing...");

        try {
            this.PARTS = sharedData.parts || await PartsLoader.getParts();
            this.playerData = sharedData.playerData || this.loadDefaultPlayerData();
            this.setupUI();
            this.addEventListeners();
        } catch (error) {
            console.error("Failed to initialize Vector Arena:", error);
            if (this.onFailure) {
                this.onFailure({ reason: "Could not load game data." });
            }
        }
    },
    
    loadDefaultPlayerData: function() {
        // This can be replaced with loading from localStorage or a server
        return {
            credits: 50000,
            owned: {
                chassis: ['interceptor', 'juggernaut', 'mothership'],
                weapon: [
                    { id: 'pulse_laser', instanceId: 1 },
                    { id: 'spread_shot', instanceId: 2 },
                    { id: 'railgun', instanceId: 3 }
                ],
                turret: [
                    {id: 'point_defense', instanceId: 101}
                ],
                drone: [
                    {id: 'combat_drone', instanceId: 201}
                ],
                engine: ['standard_ion', 'performance_ion'],
                shield: ['basic_shield', 'heavy_shield'],
                special: ['burst_thruster'],
                tech: ['fire_rate_controller']
            },
            equipped: {
                chassis: 'interceptor',
                weapon: [1, 2, null],
                turret: [],
                drone: [],
                weaponGroups: [1, 1, 1],
                engine: 'standard_ion',
                shield: 'basic_shield',
                thrusters: null,
                special: 'burst_thruster',
                tech: null
            }
        };
    },

    setupUI: function() {
        this.gameContainer.innerHTML = `
            <style>
                .main-menu-container {
                    width: 100%; height: 100%;
                    background: #000; color: white;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    font-family: 'Courier New', Courier, monospace;
                }
                .main-menu-title {
                    font-size: 5em;
                    color: #00aaff;
                    text-shadow: 0 0 15px #00aaff;
                    margin-bottom: 50px;
                }
                .main-menu-buttons button {
                    display: block;
                    width: 300px;
                    padding: 15px;
                    margin: 10px 0;
                    font-size: 1.5em;
                    background: transparent;
                    color: #00aaff;
                    border: 2px solid #00aaff;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .main-menu-buttons button:hover {
                    background: #00aaff;
                    color: #000;
                    box-shadow: 0 0 20px #00aaff;
                }
            </style>
            <div class="main-menu-container">
                <h1 class="main-menu-title">VECTOR ARENA</h1>
                <div class="main-menu-buttons">
                    <button id="menu-combat-btn">Combat</button>
                    <button id="menu-hangar-btn">Hangar</button>
                    <button id="menu-explore-btn">Explore Sector</button>
                    <button id="menu-exit-btn">Exit</button>
                </div>
            </div>
        `;
    },

    addEventListeners: function() {
        const combatBtn = this.gameContainer.querySelector('#menu-combat-btn');
        combatBtn.addEventListener('click', () => {
            if (this.onSuccess) {
                this.onSuccess({
                    nextGame: 'vectorArenaCombat',
                    playerData: this.playerData,
                    parts: this.PARTS
                });
            }
        });

        const hangarBtn = this.gameContainer.querySelector('#menu-hangar-btn');
        hangarBtn.addEventListener('click', () => {
            if (this.onSuccess) {
                this.onSuccess({
                    nextGame: 'vectorArenaHangar',
                    playerData: this.playerData,
                    parts: this.PARTS
                });
            }
        });
        
        const exploreBtn = this.gameContainer.querySelector('#menu-explore-btn');
        exploreBtn.addEventListener('click', () => {
            if (this.onSuccess) {
                this.onSuccess({
                    nextGame: 'vectorExplore',
                    playerData: this.playerData,
                    parts: this.PARTS
                });
            }
        });

        const exitBtn = this.gameContainer.querySelector('#menu-exit-btn');
        exitBtn.addEventListener('click', () => {
            // This might exit to a higher level menu in a real game
            console.log("Exiting game...");
            if (this.onFailure) {
                this.onFailure({ reason: "User exited." });
            }
        });
    },

    destroy: function() {
        console.log("Vector Arena Menu Destroyed.");
        this.gameContainer.innerHTML = '';
    }
};

