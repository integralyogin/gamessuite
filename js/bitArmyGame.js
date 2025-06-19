// js/bitArmyGame.js
// A single-player military strategy game with a base health system, building spawners, and smarter AI.

const bitArmyGame = {
    id: 'bitArmyGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    // Game state
    canvas: null,
    ctx: null,
    gameLoopId: null,
    gameState: 'active', // 'active', 'gameOver'
    winner: null,
    PIXEL_SCALE: 4, // The visual size of a 1x1 unit
    gameTimeInSeconds: 0, // Tracks the progression of the match

    // Continuous building and resource model
    resourceTickCounter: 0,
    resourceTickRate: 60, // How many frames per resource tick (60 = ~1 second)
    baseResourcePerTick: 15, // Starting resources gained per tick
    selectedUnitType: null, // What unit the player has selected to place
    mousePos: { x: 0, y: 0 },
    isMouseDown: false, // Tracks if the mouse button is held down
    NO_MANS_LAND_WIDTH: 200, // Width of the central dead zone

    // Player & AI data
    player1: {
        name: 'Your Army',
        color: '#4A90E2', // Blue
        health: 2000,
        maxHealth: 2000,
        resources: 100000, // Starting resources
        units: [],
        unitSpawnArea: { x: 0, y: 0, width: 0, height: 0 }
    },
    player2: {
        name: 'Enemy AI',
        color: '#D0021B', // Red
        health: 2000,
        maxHealth: 2000,
        resources: 100000, // Starting resources
        units: [],
        unitSpawnArea: { x: 0, y: 0, width: 0, height: 0 },
        isAI: true,
        aiActionTimer: 0,
        aiActionCooldown: 5 // AI build action cooldown in frames
    },

    projectiles: [],

    unitTypes: {
        // Units
        infantry: { name: 'Infantry', cost: 10, hp: 20, damage: 2, speed: 0.8, range: 10, width: 1, height: 1, attackCooldown: 60, aggroRange: 75 },
        archer: { name: 'Archer', cost: 15, hp: 15, damage: 3, speed: 1, range: 100, width: 1, height: 1, attackCooldown: 80, aggroRange: 110 },
        pikeman: { name: 'Pikeman', cost: 20, hp: 30, damage: 4, speed: 0.7, range: 15, width: 1, height: 1, attackCooldown: 70, aggroRange: 75, bonusDamage: { cavalry: 8 } },
        cavalry: { name: 'Cavalry', cost: 25, hp: 35, damage: 3, speed: 1.5, range: 12, width: 2, height: 1, attackCooldown: 70, aggroRange: 100 },
        berserker: { name: 'Berserker', cost: 30, hp: 15, damage: 10, speed: 1.2, range: 10, width: 1, height: 1, attackCooldown: 90, aggroRange: 80 },
        catapult: { name: 'Catapult', cost: 40, hp: 30, damage: 10, speed: 0.4, range: 150, projectileSpeed: 3, width: 2, height: 2, attackCooldown: 180, splashRadius: 15, aggroRange: 160 },
        champion: { name: 'Champion', cost: 25000, hp: 1600, damage: 70, speed: 6.8, range: 14, width: 2, height: 2, attackCooldown: 1, aggroRange: 100, isChampion: true },
        // Buildings
        camp: { name: 'Camp', cost: 100, hp: 200, damage: 0, speed: 0, range: 0, width: 3, height: 3, attackCooldown: 0, aggroRange: 0, spawnCooldown: 300, unitToSpawn: 'infantry', isBuilding: true },
        archeryRange: { name: 'Archery Range', cost: 150, hp: 250, damage: 0, speed: 0, range: 0, width: 3, height: 3, attackCooldown: 0, aggroRange: 0, spawnCooldown: 400, unitToSpawn: 'archer', isBuilding: true },
        stables: { name: 'Stables', cost: 200, hp: 300, damage: 0, speed: 0, range: 0, width: 4, height: 3, attackCooldown: 0, aggroRange: 0, spawnCooldown: 500, unitToSpawn: 'cavalry', isBuilding: true }
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log(`bitArmyGame: Initializing with buildings and smarter AI.`);
        this.renderLayout();
        this.setupInitialState();
        this.attachEventListeners();

        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    setupInitialState: function() {
        this.gameState = 'active';
        this.winner = null;
        this.projectiles = [];
        this.selectedUnitType = null;
        this.isMouseDown = false;
        this.resourceTickCounter = 0;
        this.gameTimeInSeconds = 0;

        this.player1.resources = 100000;
        this.player1.units = [];
        this.player1.health = this.player1.maxHealth;
        
        this.player2.resources = 100000;
        this.player2.units = [];
        this.player2.health = this.player2.maxHealth;
        this.player2.aiActionTimer = 0;
        
        this.updateAllPlayerDisplays();
        document.getElementById('timer-display-wrapper').style.display = 'none';
        document.getElementById('game-over-message').style.display = 'none';
        
        document.querySelectorAll('.unit-btn').forEach(b => b.disabled = false);
        this.canvas.style.cursor = 'crosshair';
    },

    renderLayout: function() {
        this.container.innerHTML = `
            <div id="bit-army-container" style="display: flex; width: 100%; height: 70vh; background-color: #1a1a1a; font-family: 'Courier New', monospace; color: #fff; align-items: stretch;">
                <div id="p1-controls" class="player-controls" style="width: 150px; padding: 5px; background-color: #2a2a2e; border-right: 2px solid #000; display: flex; flex-direction: column;">
                    <h3 style="color: ${this.player1.color}; margin-top:0; flex-shrink: 0;">${this.player1.name}</h3>
                    <div style="flex-grow: 1; overflow-y: auto;">
                        <button class="unit-btn" data-player="1" data-unit="infantry">Infantry (10)</button>
                        <button class="unit-btn" data-player="1" data-unit="archer">Archer (15)</button>
                        <button class="unit-btn" data-player="1" data-unit="pikeman">Pikeman (20)</button>
                        <button class="unit-btn" data-player="1" data-unit="cavalry">Cavalry (25)</button>
                        <button class="unit-btn" data-player="1" data-unit="berserker">Berserker (30)</button>
                        <button class="unit-btn" data-player="1" data-unit="catapult">Catapult (40)</button>
                        <button class="unit-btn" data-player="1" data-unit="champion">Champion (10000)</button>
                        <hr style="border-color: #555;">
                        <button class="unit-btn" data-player="1" data-unit="camp">Camp (100)</button>
                        <button class="unit-btn" data-player="1" data-unit="archeryRange">Archery Range (150)</button>
                        <button class="unit-btn" data-player="1" data-unit="stables">Stables (200)</button>
                    </div>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; position: relative;">
                    <div id="health-display-wrapper" style="display: flex; justify-content: space-between; position: absolute; top: 10px; width: 100%; z-index: 10; padding: 0 20px; box-sizing: border-box; pointer-events: none;">
                        <div id="p1-display" style="background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 5px; text-align: left;">
                            <h3 style="margin: 0; font-size: 1.2em; color: ${this.player1.color};" id="p1-health"></h3>
                            <p style="margin: 2px 0 0 0; font-size: 0.9em; color: #FFD700;">$<span id="p1-resources"></span></p>
                        </div>
                        <div id="p2-display" style="background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 5px; text-align: right;">
                            <h3 style="margin: 0; font-size: 1.2em; color: ${this.player2.color};" id="p2-health"></h3>
                             <p style="margin: 2px 0 0 0; font-size: 0.9em; color: #FFD700;">$<span id="p2-resources"></span></p>
                        </div>
                    </div>
                    <div id="timer-display-wrapper" style="text-align: center; padding: 5px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9;">
                        <h2 id="timer-display" style="margin: 0; font-size: 1.2em;"></h2>
                    </div>
                    <canvas id="bitArmyCanvas" style="flex: 1; background-color: #3d4a34; cursor: crosshair; width: 100%; height: 100%;"></canvas>
                    <div id="game-controls" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10;">
                        <div id="game-over-message" style="display: none; background: rgba(0,0,0,0.7); padding: 20px; border-radius: 10px; text-align: center;"></div>
                    </div>
                </div>
            </div>
            <style>
                .player-controls .unit-btn { display: block; width: 100%; padding: 10px; margin-bottom: 10px; background-color: #444; color: #fff; border: 1px solid #666; cursor: pointer; text-align: left; transition: background-color 0.2s, border-color 0.2s; box-sizing: border-box; }
                .player-controls .unit-btn:hover { background-color: #555; }
                .player-controls .unit-btn:disabled { background-color: #333; color: #777; cursor: not-allowed; }
                .player-controls .unit-btn.selected { background-color: #4A90E2; border-color: #fff; }
            </style>
        `;
        this.canvas = document.getElementById('bitArmyCanvas');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        const buildAreaWidth = (this.canvas.width - this.NO_MANS_LAND_WIDTH) / 2;
        this.player1.unitSpawnArea = { x: 0, y: 0, width: buildAreaWidth, height: this.canvas.height };
        this.player2.unitSpawnArea = { x: buildAreaWidth + this.NO_MANS_LAND_WIDTH, y: 0, width: buildAreaWidth, height: this.canvas.height };
    },

    attachEventListeners: function() {
        document.querySelectorAll('.unit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const unitType = e.target.dataset.unit;
                this.selectUnitToPlace(unitType, e.target);
            });
        });
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
            if (this.isMouseDown) { this.attemptPlacementAtMouse(); }
        });
        this.canvas.addEventListener('mousedown', () => { this.isMouseDown = true; this.attemptPlacementAtMouse(); });
        this.canvas.addEventListener('mouseup', () => { this.isMouseDown = false; });
        this.canvas.addEventListener('mouseleave', () => { this.isMouseDown = false; });
    },

    selectUnitToPlace: function(unitTypeName, clickedButton) {
        if (this.gameState !== 'active') return;
        document.querySelectorAll('.unit-btn.selected').forEach(b => b.classList.remove('selected'));
        if (this.selectedUnitType === unitTypeName) {
            this.selectedUnitType = null;
        } else {
            this.selectedUnitType = unitTypeName;
            clickedButton.classList.add('selected');
        }
    },
    
    attemptPlacementAtMouse: function() {
        if (this.gameState !== 'active' || !this.selectedUnitType) return;
        const spawnArea = this.player1.unitSpawnArea;
        const unitType = this.unitTypes[this.selectedUnitType];
        const isInBounds = this.mousePos.x >= spawnArea.x && this.mousePos.x <= (spawnArea.x + spawnArea.width) && this.mousePos.y >= spawnArea.y && this.mousePos.y <= (spawnArea.y + spawnArea.height);
        if (isInBounds) {
            const canAfford = this.player1.resources >= unitType.cost;
            const isOccupied = this.isPositionOccupied(this.mousePos.x, this.mousePos.y, unitType, this.player1.units);
            if (canAfford && !isOccupied) {
                this.placeUnit(this.player1, this.selectedUnitType, this.mousePos.x, this.mousePos.y);
            }
        }
    },
    
    isPositionOccupied: function(x, y, unitToPlace, army) {
        const w1 = unitToPlace.width * this.PIXEL_SCALE;
        const h1 = unitToPlace.height * this.PIXEL_SCALE;
        const x1 = x - w1 / 2;
        const y1 = y - h1 / 2;
        for (const existingUnit of army) {
            const w2 = existingUnit.width * this.PIXEL_SCALE;
            const h2 = existingUnit.height * this.PIXEL_SCALE;
            const x2 = existingUnit.x - w2 / 2;
            const y2 = existingUnit.y - h2 / 2;
            if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) { return true; }
        }
        return false;
    },

    placeUnit: function(player, unitTypeName, x, y, isFree = false) {
        const unitType = this.unitTypes[unitTypeName];
        if (!isFree) {
            if (player.resources >= unitType.cost) {
                player.resources -= unitType.cost;
            } else { return; }
        }
        const newUnit = { id: crypto.randomUUID(), type: unitTypeName, x, y, hp: unitType.hp, maxHp: unitType.hp, ...unitType, owner: player, target: null, cooldown: 0, spawnTimer: unitType.spawnCooldown || 0 };
        player.units.push(newUnit);
        this.updateAllPlayerDisplays();
    },

    gameLoop: function() {
        this.update();
        this.draw();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    update: function() {
        if (this.gameState === 'active') {
            this.gameTimeInSeconds += (1 / 60); // Assuming 60fps
            this.resourceTickCounter++;
            if (this.resourceTickCounter >= this.resourceTickRate) {
                const currentResourceTick = this.baseResourcePerTick + Math.floor(this.gameTimeInSeconds / 20); // Increase income every 20 seconds
                this.player1.resources += currentResourceTick;
                this.player2.resources += currentResourceTick;
                this.updateAllPlayerDisplays();
                this.resourceTickCounter = 0;
            }
            this.updateArmy(this.player1, this.player2);
            this.updateArmy(this.player2, this.player1);
            this.updateAIBuilding();
            this.updateProjectiles();
            this.checkGameOver();
        }
    },

    // --- NEW AI HELPER FUNCTIONS ---
    weightedRandom: function(items, weights, available) {
        const weightedOptions = items.map((item, i) => ({ item, weight: weights[i] }))
                                     .filter(x => available.includes(x.item));
        
        if (weightedOptions.length === 0) return null;

        let totalWeight = weightedOptions.reduce((sum, opt) => sum + opt.weight, 0);
        let random = Math.random() * totalWeight;

        for (const opt of weightedOptions) {
            if (random < opt.weight) {
                return opt.item;
            }
            random -= opt.weight;
        }
        return weightedOptions[weightedOptions.length - 1].item; // Fallback
    },

    attemptAIPlacement: function(ai, unitToBuy) {
        const spawnArea = ai.unitSpawnArea;
        const unitType = this.unitTypes[unitToBuy];
        if (ai.resources < unitType.cost) return;

        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 20) {
            // For buildings, try to place them further back in the AI's zone
            const xOffset = unitType.isBuilding ? spawnArea.width * 0.5 : 0;
            const xRange = unitType.isBuilding ? spawnArea.width * 0.5 : spawnArea.width;
            
            const x = spawnArea.x + xOffset + Math.random() * xRange;
            const y = spawnArea.y + Math.random() * spawnArea.height;
            if (!this.isPositionOccupied(x, y, unitType, ai.units)) {
                this.placeUnit(ai, unitToBuy, x, y);
                placed = true;
            }
            attempts++;
        }
    },

    // --- REVISED AI LOGIC ---
    updateAIBuilding: function() {
        const ai = this.player2;
        ai.aiActionTimer--;
        if (ai.aiActionTimer > 0) return;

        ai.aiActionTimer = ai.aiActionCooldown;
        
        // --- Champion Logic ---
        // If AI base is in danger and it can afford a champion, deploy it as a top priority.
        const healthPercentage = ai.health / ai.maxHealth;
        if (healthPercentage < 0.95 && ai.resources >= this.unitTypes.champion.cost) {
            const hasChampion = ai.units.some(u => u.type === 'champion');
            if (!hasChampion) {
                console.log("AI is in danger! Deploying Champion.");
                this.attemptAIPlacement(ai, 'champion');
                ai.aiActionTimer = ai.aiActionCooldown * 10; // Add a small delay after a major decision
                return; // End AI turn, champion is the only move.
            }
        }

        const buildingCounts = { camp: 0, archeryRange: 0, stables: 0 };
        ai.units.forEach(u => {
            if (u.isBuilding && buildingCounts.hasOwnProperty(u.type)) {
                buildingCounts[u.type]++;
            }
        });
        const totalBuildings = Object.values(buildingCounts).reduce((a, b) => a + b, 0);

        let unitToBuy = null;
        // Decide if we should try to build a building this tick.
        // Chance increases over time. Capped at 8 total buildings.
        const shouldBuildBuilding = (Math.random() < (0.1 + this.gameTimeInSeconds / 600) && totalBuildings < 8);

        if (shouldBuildBuilding) {
            if (this.gameTimeInSeconds > 90 && buildingCounts.stables < 2 && ai.resources >= this.unitTypes.stables.cost) {
                unitToBuy = 'stables';
            } else if (this.gameTimeInSeconds > 45 && buildingCounts.archeryRange < 3 && ai.resources >= this.unitTypes.archeryRange.cost) {
                unitToBuy = 'archeryRange';
            } else if (buildingCounts.camp < 3 && ai.resources >= this.unitTypes.camp.cost) {
                unitToBuy = 'camp';
            }
        }
        
        // If no building was chosen, build a unit.
        if (!unitToBuy) {
            const affordableUnits = Object.keys(this.unitTypes)
                .filter(type => !this.unitTypes[type].isBuilding && !this.unitTypes[type].isChampion && this.unitTypes[type].cost <= ai.resources);

            if (affordableUnits.length > 0) {
                let choices, weights;
                if (this.gameTimeInSeconds < 45) { // Early game: cheap units
                    choices = ['infantry', 'archer', 'pikeman'];
                    weights = [0.6, 0.3, 0.1];
                } else if (this.gameTimeInSeconds < 150) { // Mid game: better mix
                    choices = ['infantry', 'archer', 'pikeman', 'cavalry', 'berserker', 'catapult'];
                    weights = [0.15, 0.25, 0.2, 0.2, 0.1, 0.1];
                } else { // Late game: powerful units
                    choices = ['cavalry', 'catapult', 'berserker', 'pikeman'];
                    weights = [0.3, 0.3, 0.25, 0.15];
                }
                unitToBuy = this.weightedRandom(choices, weights, affordableUnits);

                if (!unitToBuy) { // Fallback if weighted random fails
                    unitToBuy = affordableUnits[Math.floor(Math.random() * affordableUnits.length)];
                }
            }
        }

        if (unitToBuy) {
            this.attemptAIPlacement(ai, unitToBuy);
        }
    },

    updateProjectiles: function() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dx = p.targetX - p.x;
            const dy = p.targetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < p.speed) { // Projectile has reached its destination
                const enemyArmy = p.owner === this.player1 ? this.player2.units : this.player1.units;
                
                if (p.splashRadius) { // Splash damage (e.g., Catapult)
                    enemyArmy.forEach(unit => {
                        const splashDist = Math.sqrt(Math.pow(unit.x - p.targetX, 2) + Math.pow(unit.y - p.targetY, 2));
                        if (splashDist < p.splashRadius) { 
                            unit.hp -= p.damage;
                        }
                    });
                } else { // Single target damage (e.g., Archer)
                    for (const unit of enemyArmy) {
                        const hitDist = Math.sqrt(Math.pow(unit.x - p.targetX, 2) + Math.pow(unit.y - p.targetY, 2));
                        // Hit the first unit close to the target point
                        if (hitDist < (unit.width * this.PIXEL_SCALE)) { 
                            unit.hp -= p.damage;
                            break; // Arrow hits one target and stops
                        }
                    }
                }
                
                this.projectiles.splice(i, 1); // Remove projectile after it explodes/hits
                continue; // Go to the next projectile
            } 
            
            // Move projectile if it hasn't reached the destination
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
        }
    },

    updateArmy: function(army, enemyArmy) {
        for (let i = army.units.length - 1; i >= 0; i--) {
            const unit = army.units[i];
            if (unit.hp <= 0) {
                if (unit.target && unit.target.occupiedBy && unit.target.occupiedBy.id === unit.id) { unit.target.occupiedBy = null; }
                army.units.splice(i, 1);
                continue;
            }

            // --- Handle buildings ---
            if (unit.isBuilding) {
                unit.spawnTimer--;
                if (unit.spawnTimer <= 0) {
                    this.spawnUnitFromBuilding(unit);
                    unit.spawnTimer = unit.spawnCooldown;
                }
                continue; // Buildings don't do anything else
            }
            
            // --- Standard combat unit logic ---
            unit.cooldown = Math.max(0, unit.cooldown - 1);
            if (!unit.target || unit.target.hp <= 0) {
                if (unit.target && unit.target.occupiedBy && unit.target.occupiedBy.id === unit.id) { unit.target.occupiedBy = null; }
                unit.target = this.findClosestAvailableEnemy(unit, enemyArmy.units);
                if (unit.target) { unit.target.occupiedBy = unit; }
            }
            if (unit.target) {
                const target = unit.target;
                const distance = Math.sqrt(Math.pow(target.x - unit.x, 2) + Math.pow(target.y - unit.y, 2));
                if (distance <= unit.range) {
                    if (unit.cooldown === 0) {
                        if (unit.type === 'catapult' || unit.type === 'archer') { 
                            this.projectiles.push({ x: unit.x, y: unit.y, owner: army, damage: unit.damage, speed: unit.type === 'archer' ? 5 : unit.projectileSpeed, targetX: target.x, targetY: target.y, splashRadius: unit.splashRadius || 0 }); 
                        } 
                        else { 
                            let damageDealt = unit.damage; 
                            if (unit.bonusDamage && unit.bonusDamage[target.type]) { 
                                damageDealt = unit.bonusDamage[target.type]; 
                            } 
                            target.hp -= damageDealt; 
                        }
                        unit.cooldown = unit.attackCooldown;
                    }
                } else { 
                    const seek = { x: target.x - unit.x, y: target.y - unit.y };
                    const separation = this.getSeparationVector(unit, army.units);
                    let moveX = seek.x + separation.x * 1.5, moveY = seek.y + separation.y * 1.5;
                    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                    if (magnitude > 0) { moveX /= magnitude; moveY /= magnitude; }
                    unit.x += moveX * unit.speed;
                    unit.y += moveY * unit.speed;
                }
            } else {
                const forwardDirection = (unit.owner === this.player1) ? 1 : -1;
                const separation = this.getSeparationVector(unit, army.units);
                let moveX = forwardDirection + separation.x * 0.5, moveY = separation.y * 0.5;
                const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
                if (magnitude > 0) { moveX /= magnitude; moveY /= magnitude; }
                if(Math.abs(separation.x) < 0.5) unit.x += moveX * unit.speed;
                unit.y += moveY * unit.speed;
            }

            // --- Base Health Damage & Resource Stealing Logic ---
            let scored = false;
            let damageToBase = unit.isChampion ? 1 : 1;
            const resourceStolen = 20;

            if (unit.owner === this.player1 && unit.x > this.canvas.width) {
                this.player2.health = Math.max(0, this.player2.health - damageToBase);
                this.player2.resources = Math.max(0, this.player2.resources - resourceStolen);
                this.player1.resources += resourceStolen;
                scored = true;
            } else if (unit.owner === this.player2 && unit.x < 0) {
                this.player1.health = Math.max(0, this.player1.health - damageToBase);
                this.player1.resources = Math.max(0, this.player1.resources - resourceStolen);
                this.player2.resources += resourceStolen;
                scored = true;
            }

            if (scored) {
                this.updateAllPlayerDisplays();
                army.units.splice(i, 1);
                continue;
            }
        }
    },

    spawnUnitFromBuilding: function(building) {
        const unitToSpawn = building.unitToSpawn;
        const unitType = this.unitTypes[unitToSpawn];
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const spawnDist = (building.width / 2 + unitType.width / 2) * this.PIXEL_SCALE + 5;
            const x = building.x + Math.cos(angle) * spawnDist;
            const y = building.y + Math.sin(angle) * spawnDist;
            if (!this.isPositionOccupied(x, y, unitType, building.owner.units)) { 
                this.placeUnit(building.owner, unitToSpawn, x, y, true); // Spawned units are free
                return; 
            }
        }
    },

    getSeparationVector: function(unit, army) {
        let steer = { x: 0, y: 0 };
        let count = 0;
        const separationRadius = (unit.width * this.PIXEL_SCALE) + 10;
        for (const other of army) {
            if (unit.id === other.id || other.isBuilding) continue;
            const d = Math.sqrt(Math.pow(unit.x - other.x, 2) + Math.pow(unit.y - other.y, 2));
            if (d > 0 && d < separationRadius) { let diffX = (unit.x - other.x) / d; let diffY = (unit.y - other.y) / d; steer.x += diffX; steer.y += diffY; count++; }
        }
        if (count > 0) { steer.x /= count; steer.y /= count; }
        return steer;
    },

    findClosestAvailableEnemy: function(unit, enemyUnits) {
        let closest = null; let minDistance = Infinity;
        for (const enemy of enemyUnits) {
            const distance = Math.sqrt(Math.pow(enemy.x - unit.x, 2) + Math.pow(enemy.y - unit.y, 2));
            if (distance <= unit.aggroRange) { if (!enemy.occupiedBy || enemy.occupiedBy.hp <= 0) { if (distance < minDistance) { minDistance = distance; closest = enemy; } } }
        }
        if (!closest) { return this.findClosestEnemyInAggroRange(unit, enemyUnits); }
        return closest;
    },
    
    findClosestEnemyInAggroRange: function(unit, enemyUnits) {
        let closest = null; let minDistance = Infinity;
        for (const enemy of enemyUnits) {
            const distance = Math.sqrt(Math.pow(enemy.x - unit.x, 2) + Math.pow(enemy.y - unit.y, 2));
            if (distance < minDistance && distance <= unit.aggroRange) { minDistance = distance; closest = enemy; }
        }
        return closest;
    },

    checkGameOver: function() {
        if (this.gameState !== 'active') return;
        let winner = null;
        if (this.player1.health <= 0) { winner = this.player2; } 
        else if (this.player2.health <= 0) { winner = this.player1; }
        if (winner) { this.endGame(winner); }
    },

    endGame: function(winner) {
        this.gameState = 'gameOver';
        this.winner = winner;
        const msgDiv = document.getElementById('game-over-message');
        msgDiv.innerHTML = winner ? `<h2 style="color: ${winner.color}; margin-bottom: 10px;">${winner.name} Wins!</h2>` : `<h2 style="margin-bottom: 10px;">It's a Draw!</h2>`;
        const playAgainBtn = document.createElement('button');
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.style.cssText = "padding: 10px 20px; font-size: 1em; cursor: pointer; background-color: #4CAF50; border: 1px solid #8f8; color: #fff; margin-right: 10px;";
        playAgainBtn.onclick = () => this.setupInitialState();
        const exitBtn = document.createElement('button');
        exitBtn.textContent = 'Back to Arcade';
        exitBtn.style.cssText = "padding: 10px 20px; font-size: 1em; cursor: pointer; background-color: #fdd; border: 1px solid #800; color: #000;";
        exitBtn.onclick = () => this.successCallback({ score: 100 });
        msgDiv.appendChild(playAgainBtn);
        msgDiv.appendChild(exitBtn);
        msgDiv.style.display = 'block';
        document.querySelectorAll('.unit-btn').forEach(b => b.disabled = true);
        this.canvas.style.cursor = 'default';
    },

    updateAllPlayerDisplays: function() {
        const p1HealthEl = document.getElementById('p1-health');
        if (p1HealthEl) { p1HealthEl.textContent = `Health: ${this.player1.health}/${this.player1.maxHealth}`; }
        
        const p2HealthEl = document.getElementById('p2-health');
        if (p2HealthEl) { p2HealthEl.textContent = `Health: ${this.player2.health}/${this.player2.maxHealth}`; }
        
        const p1ResourcesEl = document.getElementById('p1-resources');
        if (p1ResourcesEl) { p1ResourcesEl.textContent = this.player1.resources; }

        const p2ResourcesEl = document.getElementById('p2-resources');
        if (p2ResourcesEl) { p2ResourcesEl.textContent = this.player2.resources; }
    },
    
    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        const noMansLandX = (this.canvas.width - this.NO_MANS_LAND_WIDTH) / 2;
        this.ctx.fillRect(noMansLandX, 0, this.NO_MANS_LAND_WIDTH, this.canvas.height);
        if (this.gameState === 'active' && this.selectedUnitType) {
            const unit = this.unitTypes[this.selectedUnitType];
            const width = unit.width * this.PIXEL_SCALE;
            const height = unit.height * this.PIXEL_SCALE;
            const spawnArea = this.player1.unitSpawnArea;
            const isInBounds = this.mousePos.x >= spawnArea.x && this.mousePos.x <= (spawnArea.x + spawnArea.width) && this.mousePos.y >= spawnArea.y && this.mousePos.y <= (spawnArea.y + spawnArea.height);
            const canAfford = this.player1.resources >= unit.cost;
            const isOccupied = isInBounds ? this.isPositionOccupied(this.mousePos.x, this.mousePos.y, unit, this.player1.units) : false;
            let previewColor = (canAfford && !isOccupied && isInBounds) ? this.player1.color : this.player2.color;
            this.ctx.globalAlpha = 0.6;
            this.ctx.fillStyle = previewColor;
            this.ctx.fillRect(this.mousePos.x - width / 2, this.mousePos.y - height / 2, width, height);
            this.ctx.globalAlpha = 1.0;
        }
        this.drawArmy(this.player1);
        this.drawArmy(this.player2);
        this.projectiles.forEach(p => {
            if (p.splashRadius > 0) { this.ctx.fillStyle = '#FFFACD'; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, this.PIXEL_SCALE, 0, Math.PI * 2); this.ctx.fill(); } 
            else { this.ctx.strokeStyle = '#CD853F'; this.ctx.lineWidth = 2; this.ctx.beginPath(); const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p.x - 10 * Math.cos(angle), p.y - 10 * Math.sin(angle)); this.ctx.stroke(); }
        });
    },

    drawArmy: function(army) {
        army.units.forEach(unit => {
            const width = unit.width * this.PIXEL_SCALE;
            const height = unit.height * this.PIXEL_SCALE;
            const x = unit.x - width / 2;
            const y = unit.y - height / 2;
            
            // Draw base unit color first
            this.ctx.fillStyle = unit.owner.color;
            this.ctx.fillRect(x, y, width, height);

            // Draw special features on top
            switch (unit.type) {
                case 'camp': this.ctx.fillStyle = '#8B4513'; this.ctx.fillRect(x,y,width,height); this.ctx.fillStyle = unit.owner.color; this.ctx.fillRect(unit.x - 2, y - 10, 4, 10); break;
                case 'archeryRange':
                    this.ctx.fillStyle = '#6B4226'; // Wood color
                    this.ctx.fillRect(x, y, width, height);
                    this.ctx.strokeStyle = '#FFFFFF'; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.arc(unit.x, y + height / 2, width / 3, -Math.PI/2, Math.PI/2); this.ctx.moveTo(unit.x, y); this.ctx.lineTo(unit.x, y + height); this.ctx.stroke();
                    break;
                case 'stables':
                    this.ctx.fillStyle = '#8B4513'; // Saddle brown
                    this.ctx.fillRect(x, y, width, height);
                    this.ctx.strokeStyle = '#C0C0C0'; this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.arc(unit.x, unit.y, width / 4, Math.PI * 0.2, Math.PI * 1.8); this.ctx.stroke();
                    break;
                case 'pikeman': this.ctx.fillStyle = '#C0C0C0'; if (unit.owner === this.player1) { this.ctx.fillRect(unit.x + width/2, unit.y - 1, width*1.5, 2); } else { this.ctx.fillRect(unit.x - width/2 - (width*1.5), unit.y - 1, width*1.5, 2); } break;
                case 'berserker': this.ctx.fillStyle = '#FF4500'; this.ctx.globalAlpha = 0.5 + (Math.sin(Date.now() / 100) * 0.2); this.ctx.beginPath(); this.ctx.arc(unit.x, unit.y, width, 0, Math.PI * 2); this.ctx.fill(); this.ctx.globalAlpha = 1.0; this.ctx.fillStyle = unit.owner.color; this.ctx.fillRect(x, y, width, height); break;
                case 'champion': this.ctx.fillStyle = '#FFD700'; this.ctx.fillRect(x, y, width, height); this.ctx.fillStyle = '#C0C0C0'; this.ctx.fillRect(unit.x - width / 6, y, width / 3, height); break;
            }
            if (unit.hp < unit.maxHp) {
                const hpBarWidth = width;
                const hpBarHeight = unit.isBuilding ? 5 : 3;
                const hpBarY = y - hpBarHeight - 2;
                this.ctx.fillStyle = '#D0021B'; this.ctx.fillRect(x, hpBarY, hpBarWidth, hpBarHeight);
                this.ctx.fillStyle = '#4CAF50'; this.ctx.fillRect(x, hpBarY, hpBarWidth * (unit.hp / unit.maxHp), hpBarHeight);
            }
        });
    },

    destroy: function() {
        console.log(`bitArmyGame: Destroying.`);
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        if (this.container) this.container.innerHTML = '';
        const keysToPreserve = ['id', 'unitTypes', 'PIXEL_SCALE', 'NO_MANS_LAND_WIDTH'];
        Object.keys(this).forEach(key => { if (typeof this[key] !== 'function' && !keysToPreserve.includes(key)) { this[key] = null; } });
    }
};

