const TowerDefenseGame = {
    id: 'TowerDefenseGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    failureCallback: null,
    sharedData: null,
    clickListener: null,
    buildBulletTowerButtonListener: null,
    buildArcaneTowerButtonListener: null,
    boostDamageButtonListener: null,
    boostRangeButtonListener: null,
    boostFireRateButtonListener: null,

    enemies: [],
    enemySize: 30,
    enemyBaseSpeed: 0.7,
    enemyBaseHealth: 40,
    playerClickDamage: 25,

    towers: [],
    isBuildingTower: false,
    buildingTowerType: null,
    selectedTower: null,

    projectiles: [],
    projectileSpeed: 10,

    playerLives: 10,
    playerCoins: 120,

    currentWave: 0,
    waveEnemiesToSpawn: 0,
    enemiesSpawnedThisWave: 0,
    waveInProgress: false,
    timeBetweenWaves: 3000,
    waveTimerId: null,
    initialSpawnInterval: 100,
    currentSpawnInterval: 100,
    minSpawnInterval: 50,
    spawnIntervalReductionPerWave: 1,
    enemiesPerWaveBase: 8,
    enemiesPerWaveIncrease:18,
    spawnIntervalId: null,
    gameLoopId: null,
    baseLineY: 0,
    enemiesDefeatedCount: 0,

    bulletTowerBaseStats: {
        type: 'bullet',
        damage: 15,
        range: 100,
        fireInterval: 1000,
        width: 20,
        height: 20,
        color: 'blue',
        cost: 7
    },
    bulletTowerLevelProgression: [
        { level: 2, totalKillsForAutoLevelUp: 5,  damage: 22, range: 110, fireInterval: 900, color: '#66FF66', width: 22, height: 22 },
        { level: 3, totalKillsForAutoLevelUp: 20, damage: 30, range: 125, fireInterval: 800, color: '#FFD700', width: 24, height: 24 },
        { level: 4, totalKillsForAutoLevelUp: 50, damage: 40, range: 140, fireInterval: 700, color: '#FF6347', width: 26, height: 26 },
        { level: 5, totalKillsForAutoLevelUp: 80, damage: 55, range: 155, fireInterval: 600, color: '#BA55D3', width: 28, height: 28 },
        { level: 6, totalKillsForAutoLevelUp: 160, damage: 65, range: 165, fireInterval: 500, color: '#48D1CC', width: 30, height: 30 },
        { level: 7, totalKillsForAutoLevelUp: 300, damage: 75, range: 175, fireInterval: 400, color: '#3CB371', width: 32, height: 32 },
        { level: 8, totalKillsForAutoLevelUp: 500, damage: 85, range: 185, fireInterval: 300, color: '#1E90FF', width: 34, height: 34 },
        { level: 9, totalKillsForAutoLevelUp: 1000, damage: 95, range: 195, fireInterval: 200, color: '#FF4500', width: 36, height: 36 },
    ],


    arcaneTowerBaseStats: {
        type: 'arcane',
        damage: 32, 
        range: 250,
        chargeTime: 100, // CHANGED: Was 1, now 1000 milliseconds
        beamDamageInterval: 100, // This is 10ms, meaning very frequent damage ticks
        beamWidth: 4, 
        width: 20,
        height: 20,
        color: 'purple',
        cost: 12
    },
    arcaneTowerLevelProgression: [
        // Convert chargeTime from seconds to milliseconds for all levels
        { level: 2, totalKillsForAutoLevelUp: 7,  damage: 42, range: 300, chargeTime: 90, beamWidth: 8, color: '#FF00FF', width: 22, height: 22 }, // Was 0.9
        { level: 3, totalKillsForAutoLevelUp: 25, damage: 59, range: 315, chargeTime: 80, beamWidth: 16,   color: '#DA70D6', width: 24, height: 24 }, // Was 0.8
        { level: 4, totalKillsForAutoLevelUp: 60, damage: 83, range: 330, chargeTime: 70, beamWidth: 32, color: '#9932CC', width: 26, height: 26 }, // Was 0.7
        { level: 5, totalKillsForAutoLevelUp: 100,damage: 110, range: 345, chargeTime: 60, beamWidth: 64,   color: '#8A2BE2', width: 28, height: 28 }, // Was 0.6
        { level: 6, totalKillsForAutoLevelUp: 180,damage: 155, range: 355, chargeTime: 50, beamWidth: 98, color: '#9400D3', width: 30, height: 30 }, // Was 0.5
        { level: 7, totalKillsForAutoLevelUp: 320,damage: 200, range: 365, chargeTime: 40, beamWidth: 140,   color: '#BA55D3', width: 32, height: 32 }, // Was 0.4
        { level: 8, totalKillsForAutoLevelUp: 550,damage: 275, range: 375, chargeTime: 30, beamWidth: 180, color: '#4B0082', width: 34, height: 34 }, // Was 0.3
        { level: 9, totalKillsForAutoLevelUp: 1100,damage:375, range: 385, chargeTime: 20, beamWidth: 220,   color: '#800080', width: 36, height: 36 },
        { level: 10, totalKillsForAutoLevelUp: 2000,damage:505, range: 435, chargeTime: 10, beamWidth: 300,   color: '#800080', width: 40, height: 40 },
        { level: 11, totalKillsForAutoLevelUp: 4400,damage:755, range: 455, chargeTime: 5, beamWidth: 400,   color: '#800080', width: 45, height: 45 },
        { level: 12, totalKillsForAutoLevelUp: 880,damage:1255, range: 555, chargeTime: 3, beamWidth: 512,   color: '#800080', width: 50, height: 50 }

    ],

    statBoostConfig: {
        bullet: {
            damage:   { baseCost: 2, incrementPercent: 0.10, statLabel: "Damage" },
            range:    { baseCost: 2, incrementPercent: 0.10, statLabel: "Range" },
            fireRate: { baseCost: 4, incrementPercent: 0.08, statLabel: "Atk Speed" }
        },
        arcane: {
            damage:   { baseCost: 3, incrementPercent: 0.10, statLabel: "Beam DPS" },
            range:    { baseCost: 3, incrementPercent: 0.10, statLabel: "Range" },
            fireRate: { baseCost: 995, incrementPercent: 0.10, statLabel: "Fire Rate" }
        }
    },

    init: function(container, successCb, failureCb, data) {
        this.gameContainer = container;
        this.failureCallback = failureCb;
        this.sharedData = data;

        this.gameContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <p>Wave: <span id="td-wave-count">0</span> - Lives: <span id="td-lives-count">${this.playerLives}</span> | Coins: <span id="td-coins-count">${this.playerCoins}</span> | Defeated: <span id="td-defeated-count">0</span></p>
                <button id="td-build-bullet-tower-btn" style="padding: 8px 12px; margin: 5px; border-radius: 5px; background-color: #4CAF50; color: white; border: none; cursor: pointer;">Build Bullet Tower (Cost: ${this.bulletTowerBaseStats.cost})</button>
                <button id="td-build-arcane-tower-btn" style="padding: 8px 12px; margin: 5px; border-radius: 5px; background-color: #9C27B0; color: white; border: none; cursor: pointer;">Build Arcane Tower (Cost: ${this.arcaneTowerBaseStats.cost})</button>
                <p id="td-message" style="color: green; min-height: 20px; margin-top: 5px; font-weight: bold;"></p>
            </div>
            <div style="display: flex; justify-content: center; align-items: flex-start;">
                <canvas id="tdCanvas" width="600" height="500" style="border: 1px solid black; cursor: crosshair;"></canvas>
                <div id="td-tower-info-panel" style="width: 250px; margin-left: 20px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9; display: none;">
                    <h4>Selected Tower (<span id="td-stat-type">-</span>)</h4>
                    <p>Level: <span id="td-stat-level">-</span></p>
                    <p><span id="td-stat-damage-label">Damage</span>: <span id="td-stat-damage">-</span></p>
                    <p>Range: <span id="td-stat-range">-</span></p>
                    <p><span id="td-stat-firerate-label">Attack Speed</span>: <span id="td-stat-firerate">-</span></p>
                    <p id="td-stat-chargetime-label" style="display:none;">Charge Time: <span id="td-stat-chargetime">-</span>s</p>
                    <p id="td-stat-beamwidth-label" style="display:none;">Beam Width: <span id="td-stat-beamwidth">-</span>px</p>
                    <p>Kills: <span id="td-stat-kills">-</span> (<span id="td-stat-kills-for-auto">-</span> for auto Lvl Up)</p>
                    
                    <div id="td-boost-section" style="margin-top:10px; border-top: 1px solid #eee; padding-top:10px;">
                        <p style="font-weight:bold;">Coin Boosts (Retained on Main Lvl Up):</p>
                        <div class="boost-control">
                            <span><span id="td-boost-dmg-label">Damage</span> Lvl: <span id="td-boost-dmg-lvl">0</span></span>
                            <button id="td-boost-damage-btn" data-stat="damage">Boost <span id="td-boost-dmg-btn-label">Dmg</span></button>
                            <span class="cost">Cost: <span id="td-boost-dmg-cost">-</span></span>
                        </div>
                        <div class="boost-control">
                            <span>Range Lvl: <span id="td-boost-rng-lvl">0</span></span>
                            <button id="td-boost-range-btn" data-stat="range">Boost Rng</button>
                            <span class="cost">Cost: <span id="td-boost-rng-cost">-</span></span>
                        </div>
                        <div class="boost-control">
                            <span><span id="td-boost-fr-label">Atk Spd</span> Lvl: <span id="td-boost-fr-lvl">0</span></span>
                            <button id="td-boost-firerate-btn" data-stat="fireRate">Boost <span id="td-boost-fr-btn-label">Aspd</span></button>
                            <span class="cost">Cost: <span id="td-boost-fr-cost">-</span></span>
                        </div>
                    </div>
                    <p id="td-max-level-msg" style="margin-top:10px; font-weight:bold; color:green; display:none;">Max Main Level Reached!</p>
                    <button id="td-deselect-tower-btn" style="margin-top:15px; width:100%; padding: 6px;">Deselect</button>
                </div>
                <style> .boost-control { margin-bottom: 8px; font-size:0.9em;} .boost-control button { margin-left: 5px; padding: 3px 6px;} .boost-control .cost {font-size:0.9em; color: #555; margin-left:5px;} </style>
            </div>
        `;

        this.canvas = document.getElementById('tdCanvas');
        if (!this.canvas) {
             if(this.failureCallback) this.failureCallback({reason:"Canvas not found"});
             return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.baseLineY = this.canvas.height;
        this.resetGameState();
        this.updatePlayerStatsDisplay();
        this.hideTowerInfoPanel();
        document.getElementById('td-message').textContent = 'Game Starting...';

        this.clickListener = this.handleCanvasClick.bind(this);
        this.canvas.addEventListener('click', this.clickListener);

        const setupBuildButton = (buttonId, towerType) => {
            const button = document.getElementById(buttonId);
            if (button) {
                const listener = () => {
                    if (this.playerLives <= 0 || this.waveTimerId) return;
                    this.isBuildingTower = true;
                    this.buildingTowerType = towerType;
                    this.selectedTower = null;
                    this.hideTowerInfoPanel();
                    const cost = towerType === 'bullet' ? this.bulletTowerBaseStats.cost : this.arcaneTowerBaseStats.cost;
                    document.getElementById('td-message').textContent = `Click to place ${towerType} tower (Cost: ${cost}).`;
                    document.getElementById('td-message').style.color = 'blue';
                    this.canvas.style.cursor = 'copy';
                };
                button.addEventListener('click', listener);
                if (towerType === 'bullet') this.buildBulletTowerButtonListener = listener;
                else this.buildArcaneTowerButtonListener = listener;
            }
        };

        setupBuildButton('td-build-bullet-tower-btn', 'bullet');
        setupBuildButton('td-build-arcane-tower-btn', 'arcane');

        const deselectBtn = document.getElementById('td-deselect-tower-btn');
        if (deselectBtn) {
            deselectBtn.addEventListener('click', () => {
                this.selectedTower = null;
                this.hideTowerInfoPanel();
                this.canvas.style.cursor = 'crosshair';
                document.getElementById('td-message').textContent = '';
            });
        }

        this.boostDamageButtonListener = () => this.handleStatBoost('damage');
        this.boostRangeButtonListener = () => this.handleStatBoost('range');
        this.boostFireRateButtonListener = () => this.handleStatBoost('fireRate');

        document.getElementById('td-boost-damage-btn').addEventListener('click', this.boostDamageButtonListener);
        document.getElementById('td-boost-range-btn').addEventListener('click', this.boostRangeButtonListener);
        document.getElementById('td-boost-firerate-btn').addEventListener('click', this.boostFireRateButtonListener);

        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
        this.startNextWave();
    },
    
    resetGameState: function() {
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.selectedTower = null;
        this.playerLives = 10;
        this.playerCoins = 120;
        this.currentWave = 0;
        this.enemiesSpawnedThisWave = 0;
        this.waveEnemiesToSpawn = 0;
        this.waveInProgress = false;
        this.enemiesDefeatedCount = 0;
        this.isBuildingTower = false;
        this.buildingTowerType = null;
        this.currentSpawnInterval = this.initialSpawnInterval;
        if (this.waveTimerId) clearTimeout(this.waveTimerId);
        if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
        this.waveTimerId = null;
        this.spawnIntervalId = null;
    },

    startNextWave: function() {
        if (this.playerLives <= 0) return;
        this.currentWave++;
        this.waveInProgress = true;
        this.enemiesSpawnedThisWave = 0;
        this.waveEnemiesToSpawn = this.enemiesPerWaveBase + (this.currentWave - 1) * this.enemiesPerWaveIncrease;
        if (this.currentWave > 1) {
            this.currentSpawnInterval = Math.max(this.minSpawnInterval, this.initialSpawnInterval - (this.currentWave -1) * this.spawnIntervalReductionPerWave);
        } else {
            this.currentSpawnInterval = this.initialSpawnInterval;
        }
        this.updatePlayerStatsDisplay();
        const messageEl = document.getElementById('td-message');
        if(messageEl){
            messageEl.textContent = `Wave ${this.currentWave} Starting!`;
            messageEl.style.color = 'purple';
        }
        if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
        this.spawnIntervalId = setInterval(this.spawnEnemyForWave.bind(this), this.currentSpawnInterval);
    },

    spawnEnemyForWave: function() {
        if (this.playerLives <= 0 || !this.waveInProgress) {
            if (this.spawnIntervalId) {
                clearInterval(this.spawnIntervalId);
                this.spawnIntervalId = null;
            }
            return;
        }
        if (this.enemiesSpawnedThisWave < this.waveEnemiesToSpawn) {
            const x = Math.random() * (this.canvas.width - this.enemySize);
            const y = -this.enemySize;
            const healthMultiplier = Math.pow(1.15, this.currentWave - 1);
            const speedMultiplier = Math.pow(1.05, this.currentWave - 1);
            const currentHealth = this.enemyBaseHealth * healthMultiplier;
            const currentSpeed = this.enemyBaseSpeed * speedMultiplier;
            const newEnemy = {
                id: Date.now() + Math.random(),
                x: x, y: y,
                width: this.enemySize, height: this.enemySize,
                speed: currentSpeed + Math.random() * 0.2,
                health: currentHealth + Math.floor(Math.random() * (currentHealth * 0.1) - (currentHealth*0.05)),
                maxHealth: currentHealth,
                color: `hsl(${Math.random() * 360}, 70%, ${Math.max(30, 70 - this.currentWave * 2)}%)`
            };
            this.enemies.push(newEnemy);
            this.enemiesSpawnedThisWave++;
        } else {
            if (this.spawnIntervalId) {
                clearInterval(this.spawnIntervalId);
                this.spawnIntervalId = null;
            }
        }
    },

    handleCanvasClick: function(event) {
        if (this.playerLives <= 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        if (this.isBuildingTower && this.buildingTowerType) {
            if (this.waveTimerId) {
                document.getElementById('td-message').textContent = 'Wait for the next wave to start!';
                document.getElementById('td-message').style.color = 'orange';
                this.isBuildingTower = false;
                this.buildingTowerType = null;
                this.canvas.style.cursor = 'crosshair';
                return;
            }

            let towerBaseConfig;
            let towerCost;

            if (this.buildingTowerType === 'bullet') {
                towerBaseConfig = this.bulletTowerBaseStats;
            } else if (this.buildingTowerType === 'arcane') {
                towerBaseConfig = this.arcaneTowerBaseStats;
            } else {
                console.error("Unknown tower type to build:", this.buildingTowerType);
                this.isBuildingTower = false; this.buildingTowerType = null; this.canvas.style.cursor = 'crosshair'; return;
            }
            towerCost = towerBaseConfig.cost;

            if (this.playerCoins >= towerCost) {
                let newTower = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    type: this.buildingTowerType,
                    x: clickX, y: clickY,
                    level: 1, kills: 0,
                    width: towerBaseConfig.width, height: towerBaseConfig.height, color: towerBaseConfig.color,
                    damageBoostCount: 0, rangeBoostCount: 0, fireRateBoostCount: 0,
                };

                if (this.buildingTowerType === 'bullet') {
                    newTower = { ...newTower,
                        baseDamageAtLevel: towerBaseConfig.damage, baseRangeAtLevel: towerBaseConfig.range, baseFireIntervalAtLevel: towerBaseConfig.fireInterval,
                        effectiveDamage: towerBaseConfig.damage, effectiveRange: towerBaseConfig.range, effectiveFireInterval: towerBaseConfig.fireInterval,
                        lastShotTime: 0,
                    };
                } else { // arcane
                    newTower = { ...newTower,
                        baseBeamDPSAtLevel: towerBaseConfig.damage, baseRangeAtLevel: towerBaseConfig.range, baseChargeTimeAtLevel: towerBaseConfig.chargeTime,
                        baseBeamDamageInterval: towerBaseConfig.beamDamageInterval, baseBeamWidthAtLevel: towerBaseConfig.beamWidth,

                        effectiveBeamDPS: towerBaseConfig.damage, effectiveRange: towerBaseConfig.range, effectiveChargeTime: towerBaseConfig.chargeTime,
                        effectiveBeamWidth: towerBaseConfig.beamWidth,

                        isCharging: false, chargeStartTime: 0, beamActive: false,
                        beamAngle: 0, beamTargetedEnemyId: null, // For aimed beam
                        lastBeamDamageTime: 0,
                    };
                }

                this.towers.push(newTower);
                this.playerCoins -= towerCost;
                this.isBuildingTower = false; this.buildingTowerType = null;
                document.getElementById('td-message').textContent = `${newTower.type.charAt(0).toUpperCase() + newTower.type.slice(1)} tower built!`;
                document.getElementById('td-message').style.color = 'green';
                this.canvas.style.cursor = 'crosshair';
                this.updatePlayerStatsDisplay();
            } else {
                document.getElementById('td-message').textContent = 'Not enough coins!';
                document.getElementById('td-message').style.color = 'orange';
                this.isBuildingTower = false; this.buildingTowerType = null; this.canvas.style.cursor = 'crosshair';
            }
        } else { // Not building, handle selection or player attack
            let towerClicked = false;
            for (const tower of this.towers) {
                if (clickX >= tower.x - tower.width / 2 && clickX <= tower.x + tower.width / 2 &&
                    clickY >= tower.y - tower.height / 2 && clickY <= tower.y + tower.height / 2) {
                    this.selectedTower = tower;
                    this.displayTowerInfoPanel(tower);
                    this.canvas.style.cursor = 'pointer';
                    towerClicked = true;
                    document.getElementById('td-message').textContent = 'Tower selected.';
                    document.getElementById('td-message').style.color = 'DarkSlateBlue';
                    break;
                }
            }
            if (!towerClicked) {
                let enemyAttacked = false;
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const enemy = this.enemies[i];
                    if (clickX >= enemy.x && clickX <= enemy.x + enemy.width &&
                        clickY >= enemy.y && clickY <= enemy.y + enemy.height) {
                        enemy.health -= this.playerClickDamage;
                        if (enemy.health <= 0) {
                            this.handleEnemyDefeat(null, enemy, i);
                        }
                        enemyAttacked = true;
                        break;
                    }
                }
                if (!enemyAttacked && this.selectedTower) { // Clicked off a selected tower
                    this.selectedTower = null;
                    this.hideTowerInfoPanel();
                    this.canvas.style.cursor = 'crosshair';
                    document.getElementById('td-message').textContent = '';
                }
            }
        }
    },
    
    displayTowerInfoPanel: function(tower) {
        const panel = document.getElementById('td-tower-info-panel');
        if (!panel || !tower) return;

        const towerTypeDisplay = tower.type.charAt(0).toUpperCase() + tower.type.slice(1);
        document.getElementById('td-stat-type').textContent = towerTypeDisplay;
        document.getElementById('td-stat-level').textContent = tower.level;
        document.getElementById('td-stat-kills').textContent = tower.kills;

        const chargeTimeLabelEl = document.getElementById('td-stat-chargetime-label');
        const beamWidthLabelEl = document.getElementById('td-stat-beamwidth-label');
        const damageLabelEl = document.getElementById('td-stat-damage-label');
        const firerateLabelEl = document.getElementById('td-stat-firerate-label');

        if (tower.type === 'bullet') {
            damageLabelEl.textContent = this.statBoostConfig.bullet.damage.statLabel;
            firerateLabelEl.textContent = this.statBoostConfig.bullet.fireRate.statLabel;
            document.getElementById('td-stat-damage').textContent = tower.effectiveDamage.toFixed(1);
            document.getElementById('td-stat-range').textContent = tower.effectiveRange.toFixed(1);
            document.getElementById('td-stat-firerate').textContent = (1000 / tower.effectiveFireInterval).toFixed(1) + "/sec";
            chargeTimeLabelEl.style.display = 'none';
            beamWidthLabelEl.style.display = 'none';
        } else { // arcane
            damageLabelEl.textContent = this.statBoostConfig.arcane.damage.statLabel;
            firerateLabelEl.textContent = this.statBoostConfig.arcane.fireRate.statLabel;
            document.getElementById('td-stat-damage').textContent = tower.effectiveBeamDPS.toFixed(1) + " DPS";
            document.getElementById('td-stat-range').textContent = tower.effectiveRange.toFixed(1);
            document.getElementById('td-stat-firerate').textContent = (1 / (tower.effectiveChargeTime / 1000)).toFixed(1) + "/sec";
            
            chargeTimeLabelEl.style.display = 'block';
            document.getElementById('td-stat-chargetime').textContent = (tower.effectiveChargeTime / 1000).toFixed(2);
            beamWidthLabelEl.style.display = 'block';
            document.getElementById('td-stat-beamwidth').textContent = tower.effectiveBeamWidth.toFixed(1);
        }

        const progressionConfig = tower.type === 'bullet' ? this.bulletTowerLevelProgression : this.arcaneTowerLevelProgression;
        const nextMainLevelConfig = progressionConfig.find(config => config.level === tower.level + 1);
        const killsForAutoEl = document.getElementById('td-stat-kills-for-auto');
        const maxLevelMsg = document.getElementById('td-max-level-msg');

        if (nextMainLevelConfig) {
            killsForAutoEl.textContent = nextMainLevelConfig.totalKillsForAutoLevelUp;
            maxLevelMsg.style.display = 'none';
            document.getElementById('td-boost-section').style.display = 'block';
        } else {
            killsForAutoEl.textContent = "N/A";
            maxLevelMsg.style.display = 'block';
        }

        this.updateBoostButton('damage', tower);
        this.updateBoostButton('range', tower);
        this.updateBoostButton('fireRate', tower);

        panel.style.display = 'block';
    },

    updateBoostButton: function(statType, tower) {
        const towerStatConfig = this.statBoostConfig[tower.type];
        if (!towerStatConfig || !towerStatConfig[statType]) {
            console.error(`No statBoostConfig for tower type ${tower.type}, stat ${statType}`); return;
        }
        const config = towerStatConfig[statType];
        let boostLevel, costElId, levelElId, btnElId, labelElId, btnLabelElId;

        if (statType === 'damage') {
            boostLevel = tower.damageBoostCount; costElId = 'td-boost-dmg-cost'; levelElId = 'td-boost-dmg-lvl';
            btnElId = 'td-boost-damage-btn'; labelElId = 'td-boost-dmg-label'; btnLabelElId = 'td-boost-dmg-btn-label';
        } else if (statType === 'range') {
            boostLevel = tower.rangeBoostCount; costElId = 'td-boost-rng-cost'; levelElId = 'td-boost-rng-lvl';
            btnElId = 'td-boost-range-btn';
        } else { // fireRate
            boostLevel = tower.fireRateBoostCount; costElId = 'td-boost-fr-cost'; levelElId = 'td-boost-fr-lvl';
            btnElId = 'td-boost-firerate-btn'; labelElId = 'td-boost-fr-label'; btnLabelElId = 'td-boost-fr-btn-label';
        }
        
        if (labelElId && config.statLabel) document.getElementById(labelElId).textContent = config.statLabel;
        if (btnLabelElId && config.statLabel) {
            let shortLabel = config.statLabel;
            if (config.statLabel === "Beam DPS") shortLabel = "DPS";
            else if (config.statLabel === "Charge Speed") shortLabel = "Charge";
            else if (config.statLabel === "Atk Speed") shortLabel = "Atk Spd";
            document.getElementById(btnLabelElId).textContent = shortLabel;
        }

        const currentBoostCost = config.baseCost * (boostLevel + 1);
        document.getElementById(levelElId).textContent = boostLevel;
        document.getElementById(costElId).textContent = currentBoostCost;
        const btn = document.getElementById(btnElId);
        btn.disabled = this.playerCoins < currentBoostCost;
        
        let percentageText = `(+${(config.incrementPercent*100).toFixed(0)}%)`;
         if (statType === 'fireRate' && tower.type === 'arcane') {
            percentageText = `(+${(config.incrementPercent*100).toFixed(0)}% Speed)`;
        } else if (statType === 'fireRate' && tower.type === 'bullet') {
             percentageText = `(+${(config.incrementPercent*100).toFixed(0)}% Speed)`;
        }
        const currentButtonText = document.getElementById(btnElId).innerHTML.split('(')[0].trim();
        document.getElementById(btnElId).innerHTML = `${currentButtonText} ${percentageText}`;
    },

    hideTowerInfoPanel: function() {
        const panel = document.getElementById('td-tower-info-panel');
        if (panel) panel.style.display = 'none';
    },

    handleStatBoost: function(statType) {
        if (!this.selectedTower) return;
        const tower = this.selectedTower;
        const towerStatConfig = this.statBoostConfig[tower.type];
         if (!towerStatConfig || !towerStatConfig[statType]) {
            console.error(`No statBoostConfig for tower type ${tower.type}, stat ${statType} in handleStatBoost`); return;
        }
        const config = towerStatConfig[statType];
        
        let boostCountProp;
        if (statType === 'damage') boostCountProp = 'damageBoostCount';
        else if (statType === 'range') boostCountProp = 'rangeBoostCount';
        else boostCountProp = 'fireRateBoostCount';

        const currentBoostCost = config.baseCost * (tower[boostCountProp] + 1);

        if (this.playerCoins >= currentBoostCost) {
            this.playerCoins -= currentBoostCost;
            tower[boostCountProp]++;

            if (tower.type === 'bullet') {
                if (statType === 'damage') {
                    tower.effectiveDamage = tower.baseDamageAtLevel * (1 + config.incrementPercent * tower.damageBoostCount);
                } else if (statType === 'range') {
                    tower.effectiveRange = tower.baseRangeAtLevel * (1 + config.incrementPercent * tower.rangeBoostCount);
                } else { 
                    tower.effectiveFireInterval = tower.baseFireIntervalAtLevel * Math.pow((1 - config.incrementPercent), tower.fireRateBoostCount);
                    tower.effectiveFireInterval = Math.max(tower.effectiveFireInterval, 50);
                }
            } else { // arcane
                if (statType === 'damage') { 
                    tower.effectiveBeamDPS = tower.baseBeamDPSAtLevel * (1 + config.incrementPercent * tower.damageBoostCount);
                } else if (statType === 'range') {
                    tower.effectiveRange = tower.baseRangeAtLevel * (1 + config.incrementPercent * tower.rangeBoostCount);
                } else { 
                    tower.effectiveChargeTime = tower.baseChargeTimeAtLevel * Math.pow((1 - config.incrementPercent), tower.fireRateBoostCount);
                    tower.effectiveChargeTime = Math.max(tower.effectiveChargeTime, 100);
                }
            }

            this.updatePlayerStatsDisplay();
            this.displayTowerInfoPanel(tower); 
            const messageEl = document.getElementById('td-message');
            if(messageEl) {
                messageEl.textContent = `${config.statLabel} boosted!`;
                messageEl.style.color = 'DeepSkyBlue';
                setTimeout(() => {
                    if (messageEl.textContent.includes("boosted!")) {
                        messageEl.textContent = 'Tower selected.'; 
                        messageEl.style.color = 'DarkSlateBlue';
                    }
                }, 1500);
            }
        }
    },

    applyMainLevelUp: function(tower, levelConfig) {
        if (!tower || !levelConfig || tower.level >= levelConfig.level) return;
        tower.level = levelConfig.level;

        if (tower.type === 'bullet') {
            tower.baseDamageAtLevel = levelConfig.damage; tower.baseRangeAtLevel = levelConfig.range; tower.baseFireIntervalAtLevel = levelConfig.fireInterval;
            tower.effectiveDamage = tower.baseDamageAtLevel * (1 + this.statBoostConfig.bullet.damage.incrementPercent * tower.damageBoostCount);
            tower.effectiveRange = tower.baseRangeAtLevel * (1 + this.statBoostConfig.bullet.range.incrementPercent * tower.rangeBoostCount);
            tower.effectiveFireInterval = tower.baseFireIntervalAtLevel * Math.pow((1 - this.statBoostConfig.bullet.fireRate.incrementPercent), tower.fireRateBoostCount);
            tower.effectiveFireInterval = Math.max(tower.effectiveFireInterval, 50);
        } else { // arcane
            tower.baseBeamDPSAtLevel = levelConfig.damage; tower.baseRangeAtLevel = levelConfig.range; tower.baseChargeTimeAtLevel = levelConfig.chargeTime;
            tower.baseBeamWidthAtLevel = levelConfig.beamWidth !== undefined ? levelConfig.beamWidth : tower.baseBeamWidthAtLevel;

            tower.effectiveBeamDPS = tower.baseBeamDPSAtLevel * (1 + this.statBoostConfig.arcane.damage.incrementPercent * tower.damageBoostCount);
            tower.effectiveRange = tower.baseRangeAtLevel * (1 + this.statBoostConfig.arcane.range.incrementPercent * tower.rangeBoostCount);
            tower.effectiveChargeTime = tower.baseChargeTimeAtLevel * Math.pow((1 - this.statBoostConfig.arcane.fireRate.incrementPercent), tower.fireRateBoostCount);
            tower.effectiveChargeTime = Math.max(tower.effectiveChargeTime, 100);
            tower.effectiveBeamWidth = tower.baseBeamWidthAtLevel;
        }
        
        tower.color = levelConfig.color; tower.width = levelConfig.width; tower.height = levelConfig.height;

        const messageEl = document.getElementById('td-message');
        if (messageEl) {
            messageEl.textContent = `Tower reached MAIN Level ${tower.level}! (Boosts retained)`;
            messageEl.style.color = 'LawnGreen';
            setTimeout(() => {
                if (messageEl.textContent.includes("MAIN Level")) {
                    messageEl.textContent = this.selectedTower && this.selectedTower.id === tower.id ? 'Tower selected.' : '';
                    if (this.selectedTower && this.selectedTower.id === tower.id) messageEl.style.color = 'DarkSlateBlue';
                }
            }, 2500);
        }
        console.log(`Tower ${tower.id} (${tower.type}) reached MAIN Level ${tower.level}!`);

        if (this.selectedTower && this.selectedTower.id === tower.id) this.displayTowerInfoPanel(tower);
        this.checkAndApplyAutomaticMainLevelUp(tower);
    },
    
    checkAndApplyAutomaticMainLevelUp: function(tower) {
        if (!tower) return;
        const progressionConfig = tower.type === 'bullet' ? this.bulletTowerLevelProgression : this.arcaneTowerLevelProgression;
        if (tower.level >= progressionConfig[progressionConfig.length -1].level) {
            if(tower && this.selectedTower && this.selectedTower.id === tower.id) this.displayTowerInfoPanel(tower);
            return;
        }
        const nextMainLevelConfig = progressionConfig.find(config => config.level === tower.level + 1);
        if (nextMainLevelConfig && tower.kills >= nextMainLevelConfig.totalKillsForAutoLevelUp) {
            this.applyMainLevelUp(tower, nextMainLevelConfig);
        }
    },

    // --- Targeting and Collision Helpers ---
    findBestTargetForArcaneBeam: function(tower) {
        let bestTarget = null;
        let maxProgress = -1; 
        for (const enemy of this.enemies) {
            if (this.isEnemyInRange(tower, enemy)) {
                if (enemy.y > maxProgress) { // Prioritize enemy furthest along the path (largest y)
                    maxProgress = enemy.y;
                    bestTarget = enemy;
                }
            }
        }
        return bestTarget;
    },

    isEnemyInRange: function(tower, enemy) {
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const distance = Math.sqrt(Math.pow(tower.x - enemyCenterX, 2) + Math.pow(tower.y - enemyCenterY, 2));
        return distance <= tower.effectiveRange;
    },

    lineLineIntersection: function(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
        const den = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);
        if (den === 0) return null; 
        const tNum = (p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x);
        const uNum = -((p1x - p2x) * (p1y - p3y) - (p1y - p2y) * (p1x - p3x));
        const t = tNum / den;
        const u = uNum / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return { x: p1x + t * (p2x - p1x), y: p1y + t * (p2y - p1y) };
        }
        return null;
    },

    isEnemyHitByBeam: function(tower, enemy, beamEndX, beamEndY) {
        const beamStartX = tower.x;
        const beamStartY = tower.y;

        const enemyEdges = [
            { x1: enemy.x, y1: enemy.y, x2: enemy.x + enemy.width, y2: enemy.y }, // Top
            { x1: enemy.x + enemy.width, y1: enemy.y, x2: enemy.x + enemy.width, y2: enemy.y + enemy.height }, // Right
            { x1: enemy.x, y1: enemy.y + enemy.height, x2: enemy.x + enemy.width, y2: enemy.y + enemy.height }, // Bottom
            { x1: enemy.x, y1: enemy.y, x2: enemy.x, y2: enemy.y + enemy.height }  // Left
        ];

        for (const edge of enemyEdges) {
            if (this.lineLineIntersection(beamStartX, beamStartY, beamEndX, beamEndY, edge.x1, edge.y1, edge.x2, edge.y2)) {
                return true; // Beam centerline intersects an enemy edge
            }
        }

        // If no direct intersection of centerline, check proximity for beam width
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const dxBeam = beamEndX - beamStartX;
        const dyBeam = beamEndY - beamStartY;

        if (dxBeam === 0 && dyBeam === 0) return false; // Beam has no length

        // Project enemy center onto the beam line
        const t = ((enemyCenterX - beamStartX) * dxBeam + (enemyCenterY - beamStartY) * dyBeam) / (dxBeam * dxBeam + dyBeam * dyBeam);
        
        let closestX, closestY;
        if (t < 0) { // Closest point is beamStart
            closestX = beamStartX; closestY = beamStartY;
        } else if (t > 1) { // Closest point is beamEnd
            closestX = beamEndX; closestY = beamEndY;
        } else { // Closest point is on the segment
            closestX = beamStartX + t * dxBeam; closestY = beamStartY + t * dyBeam;
        }

        const distX = enemyCenterX - closestX;
        const distY = enemyCenterY - closestY;
        const distanceToSegment = Math.sqrt(distX * distX + distY * distY);

        // Consider half of enemy's smallest dimension + half beam width for a tighter check
        const enemyMinHalfDim = Math.min(enemy.width, enemy.height) / 2;
        if (distanceToSegment < enemyMinHalfDim + tower.effectiveBeamWidth / 2) {
            return true;
        }
        return false;
    },
    // --- End Helpers ---

    update: function() {
        if (this.playerLives <= 0) return;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.y += enemy.speed;
            if (enemy.y + enemy.height >= this.baseLineY) {
                this.enemies.splice(i, 1);
                this.playerLives--;
                this.updatePlayerStatsDisplay();
                if (this.playerLives <= 0) {
                    this.gameOver("You ran out of lives!"); return;
                }
            }
        }

        const currentTime = Date.now();
        this.towers.forEach(tower => {
            if (tower.type === 'bullet') {
                if (currentTime - tower.lastShotTime >= tower.effectiveFireInterval) {
                    let targetEnemy = null; let maxProgress = -1;
                    for (const enemy of this.enemies) {
                        if (this.isEnemyInRange(tower, enemy)) {
                             if (enemy.y > maxProgress) { maxProgress = enemy.y; targetEnemy = enemy; }
                        }
                    }
                    if (targetEnemy) {
                        this.projectiles.push({
                            x: tower.x, y: tower.y, targetEnemyId: targetEnemy.id, towerId: tower.id,
                            speed: this.projectileSpeed, damage: tower.effectiveDamage,
                            color: tower.color === this.bulletTowerBaseStats.color ? 'orange' : tower.color,
                            size: tower.level > 2 ? 4 : (tower.damageBoostCount > 3 ? 3.5 : 3)
                        });
                        tower.lastShotTime = currentTime;
                    }
                }
            } else if (tower.type === 'arcane') {
                if (tower.beamActive) {
                    let beamHitSomethingThisTick = false;
                    let enemiesHitThisDamageCycle = [];
                    const beamEndX = tower.x + tower.effectiveRange * Math.cos(tower.beamAngle);
                    const beamEndY = tower.y + tower.effectiveRange * Math.sin(tower.beamAngle);

                    this.enemies.forEach(enemy => {
                        if (this.isEnemyHitByBeam(tower, enemy, beamEndX, beamEndY)) {
                            beamHitSomethingThisTick = true;
                            if (currentTime - tower.lastBeamDamageTime >= tower.baseBeamDamageInterval) {
                                enemiesHitThisDamageCycle.push(enemy);
                            }
                        }
                    });

                    if (enemiesHitThisDamageCycle.length > 0) {
                        const damagePerTick = tower.effectiveBeamDPS * (tower.baseBeamDamageInterval / 1000);
                        enemiesHitThisDamageCycle.forEach(hitEnemy => {
                             // Double check enemy still exists before damaging (important if multiple beams hit same target)
                            if (this.enemies.includes(hitEnemy) && hitEnemy.health > 0) {
                                hitEnemy.health -= damagePerTick;
                                if (hitEnemy.health <= 0) {
                                    const enemyIndex = this.enemies.findIndex(e => e.id === hitEnemy.id);
                                    if (enemyIndex !== -1) {
                                        this.handleEnemyDefeat(tower, hitEnemy, enemyIndex);
                                    }
                                }
                            }
                        });
                        tower.lastBeamDamageTime = currentTime;
                    }
                    if (!beamHitSomethingThisTick) {
                        tower.beamActive = false; tower.beamTargetedEnemyId = null;
                    }
                } else if (tower.isCharging) {
                    const chargeTarget = this.enemies.find(e => e.id === tower.beamTargetedEnemyId);
                    if (!chargeTarget || currentTime - tower.chargeStartTime >= tower.effectiveChargeTime) { // Charge complete or original target gone
                        tower.isCharging = false;
                        let finalTargetForAngle = chargeTarget;
                        // If original target gone or out of range, pick current best
                        if (!finalTargetForAngle || !this.isEnemyInRange(tower, finalTargetForAngle)) {
                            finalTargetForAngle = this.findBestTargetForArcaneBeam(tower);
                        }

                        if (finalTargetForAngle) {
                            const targetCenterX = finalTargetForAngle.x + finalTargetForAngle.width / 2;
                            const targetCenterY = finalTargetForAngle.y + finalTargetForAngle.height / 2;
                            tower.beamAngle = Math.atan2(targetCenterY - tower.y, targetCenterX - tower.x);
                            tower.beamActive = true;
                            tower.lastBeamDamageTime = currentTime - tower.baseBeamDamageInterval; // Allow immediate first damage tick
                        } else {
                            tower.beamTargetedEnemyId = null; // No target, stay idle
                        }
                    }
                } else { // Idle: try to find target and start charging
                    const targetToCharge = this.findBestTargetForArcaneBeam(tower);
                    if (targetToCharge) {
                        tower.isCharging = true;
                        tower.chargeStartTime = currentTime;
                        tower.beamTargetedEnemyId = targetToCharge.id;
                    }
                }
            }
        });
        this.updateProjectiles();
    },

    updateProjectiles: function() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const target = this.enemies.find(e => e.id === p.targetEnemyId);
            if (!target || target.health <= 0) {
                this.projectiles.splice(i, 1); continue;
            }
            const targetX = target.x + target.width / 2; const targetY = target.y + target.height / 2;
            const dx = targetX - p.x; const dy = targetY - p.y;
            const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

            if (distanceToTarget <= p.speed) {
                target.health -= p.damage;
                this.projectiles.splice(i, 1);
                if (target.health <= 0) {
                    const enemyIndex = this.enemies.findIndex(e => e.id === target.id);
                    if (enemyIndex !== -1) {
                        const shootingTower = this.towers.find(t => t.id === p.towerId);
                        this.handleEnemyDefeat(shootingTower, target, enemyIndex);
                    }
                }
            } else {
                p.x += (dx / distanceToTarget) * p.speed; p.y += (dy / distanceToTarget) * p.speed;
            }
        }
    },
    
    handleEnemyDefeat: function(tower, enemy, indexOrEnemyObject) {
        let enemyIndex = -1;
        // Ensure enemy object exists before trying to find its index or health
        if (!enemy) return; 

        if (typeof indexOrEnemyObject === 'number') {
            enemyIndex = indexOrEnemyObject;
        } else {
            enemyIndex = this.enemies.indexOf(indexOrEnemyObject);
        }

        // Check if the enemy is actually in the array at the given/found index
        if (enemyIndex !== -1 && this.enemies[enemyIndex] && this.enemies[enemyIndex].id === enemy.id) {
             this.enemies.splice(enemyIndex, 1);
        } else { // If not found at index (e.g. already removed), try to find by ID again
            const stillExistsIndex = this.enemies.findIndex(e => e.id === enemy.id);
            if (stillExistsIndex !== -1) {
                this.enemies.splice(stillExistsIndex, 1);
            } else {
                 return; // Already processed or gone
            }
        }

        this.enemiesDefeatedCount++;
        this.playerCoins++;
        this.updatePlayerStatsDisplay();

        if (tower) {
            tower.kills = (tower.kills || 0) + 1;
            this.checkAndApplyAutomaticMainLevelUp(tower);
            if (this.selectedTower && this.selectedTower.id === tower.id) {
                this.displayTowerInfoPanel(tower);
            }
        }
        this.checkWaveCompletion();
    },

    checkWaveCompletion: function() {
        if (this.waveInProgress && this.enemiesSpawnedThisWave >= this.waveEnemiesToSpawn && this.enemies.length === 0) {
            this.waveInProgress = false;
            const messageEl = document.getElementById('td-message');
            if (messageEl && !messageEl.textContent.includes("Level") && !messageEl.textContent.includes("boosted")) {
                messageEl.textContent = `Wave ${this.currentWave} Cleared! Next wave incoming...`;
                messageEl.style.color = 'green';
            } else if (messageEl && (messageEl.textContent.includes("Tower selected.") || messageEl.textContent === '')){
                 messageEl.textContent = `Wave ${this.currentWave} Cleared! Next wave incoming...`;
                 messageEl.style.color = 'green';
            }
            
            if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
            this.spawnIntervalId = null;
            if (this.waveTimerId) clearTimeout(this.waveTimerId);
            this.waveTimerId = setTimeout(() => {
                this.waveTimerId = null;
                if(this.playerLives > 0) this.startNextWave();
            }, this.timeBetweenWaves);
        }
    },

    gameOver: function(reason) {
        if (this.gameLoopId === null && this.playerLives > 0) return;
        this.playerLives = 0;
        console.log("TowerDefenseGame: Game Over - ", reason);
        const messageEl = document.getElementById('td-message');
        if (messageEl) {
            messageEl.textContent = `GAME OVER: ${reason} (Survived ${this.currentWave > 0 ? this.currentWave -1 : 0} waves)`;
            messageEl.style.color = 'red';
        }
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
        if (this.waveTimerId) clearTimeout(this.waveTimerId);
        this.gameLoopId = null; this.spawnIntervalId = null; this.waveTimerId = null;
        this.isBuildingTower = false; this.buildingTowerType = null; this.selectedTower = null;
        this.hideTowerInfoPanel();
        if(this.canvas) this.canvas.style.cursor = 'default';
        
        setTimeout(() => {
            if (this.failureCallback) {
                this.failureCallback({
                    reason: reason || "No lives left.", towerDefenseLost: true,
                    wavesSurvived: this.currentWave > 0 ? this.currentWave -1 : 0,
                    enemiesDefeated: this.enemiesDefeatedCount, finalCoins: this.playerCoins
                });
            }
        }, 2000);
    },

    draw: function() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const visualBaseLine = this.baseLineY - 2;
        this.ctx.beginPath(); this.ctx.moveTo(0, visualBaseLine); this.ctx.lineTo(this.canvas.width, visualBaseLine);
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; this.ctx.lineWidth = 2; this.ctx.stroke(); this.ctx.lineWidth = 1;

        this.towers.forEach(tower => {
            this.ctx.fillStyle = (this.selectedTower && this.selectedTower.id === tower.id) ? 'cyan' : tower.color;
            this.ctx.fillRect(tower.x - tower.width / 2, tower.y - tower.height / 2, tower.width, tower.height);
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeRect(tower.x - tower.width / 2, tower.y - tower.height / 2, tower.width, tower.height);

            if (tower.type === 'arcane') {
                if (tower.isCharging) {
                    this.ctx.fillStyle = 'rgba(220, 220, 255, 0.4)';
                    const chargePercentage = Math.min(1, (Date.now() - tower.chargeStartTime) / tower.effectiveChargeTime);
                    const chargeRadius = (tower.width / 1.5) * chargePercentage;
                    this.ctx.beginPath(); this.ctx.arc(tower.x, tower.y, chargeRadius, 0, Math.PI * 2); this.ctx.fill();
                } else if (tower.beamActive) {
                    this.ctx.beginPath(); this.ctx.moveTo(tower.x, tower.y);
                    const beamEndX = tower.x + tower.effectiveRange * Math.cos(tower.beamAngle);
                    const beamEndY = tower.y + tower.effectiveRange * Math.sin(tower.beamAngle);
                    this.ctx.lineTo(beamEndX, beamEndY);
                    this.ctx.strokeStyle = tower.color === 'purple' ? 'rgba(255, 105, 180, 0.8)' : `rgba(${parseInt(tower.color.slice(1,3),16)}, ${parseInt(tower.color.slice(3,5),16)}, ${parseInt(tower.color.slice(5,7),16)}, 0.7)`; // Hot pink for purple, else derived
                    this.ctx.lineWidth = tower.effectiveBeamWidth;
                    this.ctx.stroke(); this.ctx.lineWidth = 1;
                }
            }

            if (this.selectedTower && this.selectedTower.id === tower.id) {
                this.ctx.beginPath(); this.ctx.arc(tower.x, tower.y, tower.effectiveRange, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)'; this.ctx.fillStyle = 'rgba(0, 0, 200, 0.05)';
                this.ctx.fill(); this.ctx.stroke();
            }
        });

        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = enemy.color;
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            const healthBarHeight = 5; const healthBarWidth = enemy.width;
            const healthPercentage = Math.max(0, enemy.health / enemy.maxHealth);
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(enemy.x, enemy.y - healthBarHeight - 3, healthBarWidth, healthBarHeight);
            this.ctx.fillStyle = healthPercentage > 0.6 ? '#00FF00' : healthPercentage > 0.3 ? '#FFFF00' : '#FF0000';
            this.ctx.fillRect(enemy.x, enemy.y - healthBarHeight - 3, healthBarWidth * healthPercentage, healthBarHeight);
            this.ctx.strokeStyle = '#333';
            this.ctx.strokeRect(enemy.x, enemy.y - healthBarHeight - 3, healthBarWidth, healthBarHeight);
        });

        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.color; this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this.ctx.fill();
        });
    },

    updatePlayerStatsDisplay: function() {
        const waveDisplay = document.getElementById('td-wave-count');
        if (waveDisplay) waveDisplay.textContent = this.currentWave > 0 ? this.currentWave : (this.waveInProgress || this.playerLives <=0 ? this.currentWave : "0");
        const livesDisplay = document.getElementById('td-lives-count');
        if (livesDisplay) livesDisplay.textContent = this.playerLives;
        const coinsDisplay = document.getElementById('td-coins-count');
        if (coinsDisplay) coinsDisplay.textContent = this.playerCoins;
        const defeatedDisplay = document.getElementById('td-defeated-count');
        if (defeatedDisplay) defeatedDisplay.textContent = this.enemiesDefeatedCount;
    },

    gameLoop: function() {
        if (!this.gameLoopId) return; 
        if ((!this.waveTimerId || this.waveInProgress) && this.playerLives > 0) {
            this.update();
        }
        this.draw();
        if (this.gameLoopId) {
            this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    },

    destroy: function() {
        if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
        if (this.waveTimerId) clearTimeout(this.waveTimerId);
        this.gameLoopId = null; this.spawnIntervalId = null; this.waveTimerId = null;

        if (this.canvas && this.clickListener) this.canvas.removeEventListener('click', this.clickListener);
        
        const bulletBuildBtn = document.getElementById('td-build-bullet-tower-btn');
        if (bulletBuildBtn && this.buildBulletTowerButtonListener) bulletBuildBtn.removeEventListener('click', this.buildBulletTowerButtonListener);
        const arcaneBuildBtn = document.getElementById('td-build-arcane-tower-btn');
        if (arcaneBuildBtn && this.buildArcaneTowerButtonListener) arcaneBuildBtn.removeEventListener('click', this.buildArcaneTowerButtonListener);
        this.buildBulletTowerButtonListener = null; this.buildArcaneTowerButtonListener = null;

        const boostDmgBtn = document.getElementById('td-boost-damage-btn');
        if (boostDmgBtn && this.boostDamageButtonListener) boostDmgBtn.removeEventListener('click', this.boostDamageButtonListener);
        const boostRngBtn = document.getElementById('td-boost-range-btn');
        if (boostRngBtn && this.boostRangeButtonListener) boostRngBtn.removeEventListener('click', this.boostRangeButtonListener);
        const boostFrBtn = document.getElementById('td-boost-firerate-btn');
        if (boostFrBtn && this.boostFireRateButtonListener) boostFrBtn.removeEventListener('click', this.boostFireRateButtonListener);
        this.boostDamageButtonListener = null; this.boostRangeButtonListener = null; this.boostFireRateButtonListener = null;
        
        if (this.gameContainer) this.gameContainer.innerHTML = '';
        this.resetGameState(); 
        this.canvas = null; this.ctx = null;
        console.log("TowerDefenseGame: Destroyed.");
    }
};
