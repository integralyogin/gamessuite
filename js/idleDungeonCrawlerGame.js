// js/idleDungeonCrawlerGame.js
const IdleDungeonCrawlerGame = {
    id: 'IdleDungeonCrawlerGame',
    gameContainer: null,
    onSuccess: null,
    onFailure: null, // Though likely not used in a typical idle game segment for global failure
    sharedData: null,

    // Game State
    units: [],
    dungeons: [
        { id: 'd001', name: 'Rat Warrens', duration: 10000, xpReward: 10, loot: ['Rat Tail', 'Cheese Scrap'], deathChance: 0.05, levelReq: 1 },
        { id: 'd002', name: 'Goblin Cave', duration: 20000, xpReward: 25, loot: ['Crude Dagger', 'Goblin Ear'], deathChance: 0.1, levelReq: 2 },
        { id: 'd003', name: 'Forgotten Crypt', duration: 30000, xpReward: 50, loot: ['Ancient Bone', 'Faded Gem'], deathChance: 0.15, levelReq: 3 }
    ],
    nextUnitId: 1,
    expeditionLog: [],
    activeExpeditions: {}, // Using an object for easy lookup/removal by unitId

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.onFailure = failureCallback; // Store it, though a "global failure" might be rare for this idle game part
        this.sharedData = sharedData;

        this.units = sharedData.dungeonUnits || []; // Load units from sharedData if they exist
        this.nextUnitId = sharedData.nextDungeonUnitId || 1;
        this.expeditionLog = sharedData.dungeonExpeditionLog || [];
        // Active expeditions are not typically saved/restored in this simple setup, they'd restart.

        this.render();
        this.updateUnitsDisplay();
        this.updateDungeonDisplay();
        this.updateLogDisplay();

        console.log(`${this.id}: Initialized. Shared data:`, JSON.parse(JSON.stringify(sharedData)));
        console.log(`${this.id}: Loaded units:`, this.units);
    },

    render: function() {
        this.gameContainer.innerHTML = `
            <div id="idle-dungeon-crawler" style="width: 100%; padding: 10px; box-sizing: border-box;">
                
                <div style="display: flex; justify-content: space-around; margin: 4px;">
                    <button id="recruitUnitBtn">Recruit Unit (Cost: 50 Coins)</button>
                    <button id="completeDungeonGameBtn">Finish Expeditions & Proceed</button>
                </div>
                <p style="text-align: center;">Player Coins: <span id="playerCoinsDisplay">${this.sharedData.totalCoins || 100}</span></p>

                <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
                    <div id="unitsSection" style="width: 100%; max-width: 350px; margin: 4px; padding:2px; border: 1px solid #ccc; border-radius: 5px;">
                        <h3>Your Units</h3>
                        <div id="unitsList" style="max-height: 200px; overflow-y: auto;">
                            </div>
                    </div>

                    <div id="dungeonsSection" style="width: 100%; max-width: 350px; margin-bottom: 5px; padding:2px; border: 1px solid #ccc; border-radius: 5px;">
                        <h3>Available Dungeons</h3>
                        <div id="dungeonsList">
                            </div>
                    </div>
                </div>

                <div id="activityLogSection" style="margin: 4px; padding:2px; border: 1px solid #ccc; border-radius: 5px;">
                    <h3>Activity Log</h3>
                    <div id="expeditionLogList" style="max-height: 150px; overflow-y: auto; font-size: 0.9em;">
                        </div>
                </div>
            </div>
        `;

        document.getElementById('recruitUnitBtn').addEventListener('click', () => this.recruitUnit());
        document.getElementById('completeDungeonGameBtn').addEventListener('click', () => {
            // Pass back any relevant data, like updated unit list for persistence
            this.onSuccess({
                message: "Dungeon expeditions concluded.",
                dungeonUnits: this.units.filter(u => u.status !== 'dead'), // Only save living units
                nextDungeonUnitId: this.nextUnitId,
                dungeonExpeditionLog: this.expeditionLog,
                totalCoins: this.sharedData.totalCoins // Pass back updated coin total
            });
        });
    },

    recruitUnit: function() {
        const cost = 50;
        if ((this.sharedData.totalCoins || 100) >= cost) {
            this.sharedData.totalCoins -= cost;
            document.getElementById('playerCoinsDisplay').textContent = this.sharedData.totalCoins;

            const newUnit = {
                id: `unit-${this.nextUnitId++}`,
                name: `Recruit #${this.nextUnitId -1}`,
                level: 1,
                xp: 0,
                xpToNextLevel: 100,
                hp: 50, // Base HP
                attack: 5, // Base Attack
                status: 'idle', // 'idle', 'in_dungeon', 'dead'
                currentDungeon: null,
                loot: []
            };
            this.units.push(newUnit);
            this.addLog(`${newUnit.name} has been recruited!`);
            this.updateUnitsDisplay();
        } else {
            this.addLog("Not enough coins to recruit a new unit.");
        }
    },

    updateUnitsDisplay: function() {
        const unitsListDiv = document.getElementById('unitsList');
        if (!unitsListDiv) return;
        unitsListDiv.innerHTML = this.units.map(unit => `
            <div class="unit-card" data-unit-id="${unit.id}" style="padding: 8px; border: 1px solid #eee; margin-bottom: 5px; border-radius:3px; background-color: ${unit.status === 'dead' ? '#ffdddd' : (unit.status === 'in_dungeon' ? '#e0f7fa' : '#f9f9f9')};">
                <strong>${unit.name}</strong> (Lvl ${unit.level}) - ${unit.status.replace('_', ' ')}
                <br>XP: ${unit.xp}/${unit.xpToNextLevel} | HP: ${unit.hp} | ATK: ${unit.attack}
                ${unit.status === 'in_dungeon' ? `<br>Exploring: ${unit.currentDungeonName} (<span id="timer-${unit.id}"></span>)` : ''}
                ${unit.status === 'dead' ? '<br><span style="color:red;">Deceased</span>' : ''}
                <br>Loot: ${unit.loot.join(', ') || 'None'}
            </div>
        `).join('');
    },

    updateDungeonDisplay: function() {
        const dungeonsListDiv = document.getElementById('dungeonsList');
        if (!dungeonsListDiv) return;
        dungeonsListDiv.innerHTML = this.dungeons.map(dungeon => `
            <div class="dungeon-card" style="padding: 8px; border: 1px solid #eee; margin-bottom: 5px; border-radius:3px;">
                <strong>${dungeon.name}</strong> (Req. Lvl ${dungeon.levelReq})
                <br>Duration: ${dungeon.duration / 1000}s | Est. XP: ${dungeon.xpReward}
                <br>Potential Loot: ${dungeon.loot.join(', ')}
                <br><button class="send-btn" data-dungeon-id="${dungeon.id}" ${this.getLowestAvailableUnitLevel() < dungeon.levelReq ? 'disabled title="No suitable unit available or unit level too low"' : ''}>Send Available Unit</button>
            </div>
        `).join('');

        dungeonsListDiv.querySelectorAll('.send-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const dungeonId = e.target.getAttribute('data-dungeon-id');
                this.sendUnitToDungeon(dungeonId);
            });
        });
    },
    
    getLowestAvailableUnitLevel: function() {
        const availableUnits = this.units.filter(u => u.status === 'idle');
        if (availableUnits.length === 0) return Infinity; // No units available
        return Math.min(...availableUnits.map(u => u.level));
    },

    sendUnitToDungeon: function(dungeonId) {
        const dungeon = this.dungeons.find(d => d.id === dungeonId);
        if (!dungeon) {
            this.addLog(`Dungeon ${dungeonId} not found.`);
            return;
        }

        const availableUnit = this.units.find(u => u.status === 'idle' && u.level >= dungeon.levelReq);
        if (!availableUnit) {
            this.addLog(`No available unit meets requirements for ${dungeon.name}.`);
            this.updateDungeonDisplay(); // Re-render to update button states
            return;
        }

        availableUnit.status = 'in_dungeon';
        availableUnit.currentDungeon = dungeon.id;
        availableUnit.currentDungeonName = dungeon.name; // For display
        this.addLog(`${availableUnit.name} is venturing into ${dungeon.name}.`);
        this.updateUnitsDisplay();
        this.updateDungeonDisplay(); // Re-render to update button states as a unit is now busy

        const expeditionTime = dungeon.duration;
        let timeLeft = expeditionTime / 1000;

        this.activeExpeditions[availableUnit.id] = setInterval(() => {
            timeLeft--;
            const timerSpan = document.getElementById(`timer-${availableUnit.id}`);
            if (timerSpan) {
                timerSpan.textContent = `${timeLeft}s left`;
            }
            if (timeLeft <= 0) {
                this.completeExpedition(availableUnit.id, dungeonId);
            }
        }, 1000);

        // Initial timer display
        const timerSpan = document.getElementById(`timer-${availableUnit.id}`);
        if(timerSpan) timerSpan.textContent = `${timeLeft}s left`;


        // Simulate expedition outcome after duration
        // setTimeout(() => {
        //     this.completeExpedition(availableUnit.id, dungeonId);
        // }, dungeon.duration);
    },

    completeExpedition: function(unitId, dungeonId) {
        clearInterval(this.activeExpeditions[unitId]);
        delete this.activeExpeditions[unitId];

        const unit = this.units.find(u => u.id === unitId);
        const dungeon = this.dungeons.find(d => d.id === dungeonId);

        if (!unit || !dungeon) {
            console.error("Unit or Dungeon not found on expedition completion.");
            if(unit) unit.status = 'idle'; // Try to reset unit status
            this.updateUnitsDisplay();
            this.updateDungeonDisplay();
            return;
        }
        
        if (unit.status === 'dead') { // Unit might have died from another event, or to prevent double processing
            this.addLog(`${unit.name}'s expedition to ${dungeon.name} ended grimly (already marked as dead).`);
            this.updateUnitsDisplay();
            this.updateDungeonDisplay();
            return;
        }


        // Check for death
        if (Math.random() < dungeon.deathChance) {
            unit.status = 'dead';
            unit.hp = 0;
            this.addLog(`💀 ${unit.name} perished in ${dungeon.name}!`);
        } else {
            unit.status = 'idle';
            const xpGained = dungeon.xpReward + Math.floor(Math.random() * (dungeon.xpReward * 0.2)); // Base + up to 20% bonus
            unit.xp += xpGained;
            
            let lootFound = [];
            if (dungeon.loot && dungeon.loot.length > 0) {
                // Chance to find each loot item
                dungeon.loot.forEach(item => {
                    if (Math.random() < 0.5) { // 50% chance per item in loot table
                        lootFound.push(item);
                        unit.loot.push(item);
                    }
                });
            }

            this.addLog(`${unit.name} returned from ${dungeon.name}. Gained ${xpGained} XP. Found: ${lootFound.length > 0 ? lootFound.join(', ') : 'nothing special'}.`);

            // Check for level up
            if (unit.xp >= unit.xpToNextLevel) {
                unit.level++;
                unit.xp -= unit.xpToNextLevel;
                unit.xpToNextLevel = Math.floor(unit.xpToNextLevel * 1.5); // Increase XP for next level
                unit.hp += 10 * unit.level; // Increase HP
                unit.attack += 2 * unit.level; // Increase Attack
                this.addLog(`🌟 ${unit.name} leveled up to Level ${unit.level}!`);
            }
        }
        
        unit.currentDungeon = null;
        unit.currentDungeonName = null;
        this.updateUnitsDisplay();
        this.updateDungeonDisplay(); // Potentially enable buttons again
    },

    addLog: function(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.expeditionLog.unshift(`[${timestamp}] ${message}`); // Add to beginning for newest first
        if (this.expeditionLog.length > 50) { // Keep log size manageable
            this.expeditionLog.pop();
        }
        this.updateLogDisplay();
    },

    updateLogDisplay: function() {
        const logListDiv = document.getElementById('expeditionLogList');
        if (!logListDiv) return;
        logListDiv.innerHTML = this.expeditionLog.map(entry => `<div>${entry}</div>`).join('');
    },

    destroy: function() {
        // Clear any active intervals
        Object.values(this.activeExpeditions).forEach(intervalId => clearInterval(intervalId));
        this.activeExpeditions = {};
        
        // Preserve unit data in sharedData if needed for persistence across game sessions
        // (This is already handled in the completeDungeonGameBtn's success callback)
        this.gameContainer.innerHTML = '';
        console.log(`${this.id}: Destroyed.`);
    }
};
