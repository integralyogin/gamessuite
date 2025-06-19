// js/autoRunnerGame.js
const AutoRunnerGame = {
    id: 'AutoRunnerGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    player: null,
    monsters: [],
    gameInterval: null,
    spawnInterval: null,
    autoAttackIntervals: { melee: null, range: null, orb: null },
    score: 0,
    distanceTraveled: 0,
    monstersDefeated: 0,
    levelUpMessage: { text: '', alpha: 0, duration: 180 },
    projectiles: [],
    meleeFlash: { active: false, x: 0, y: 0, width: 0, height: 0, alpha: 0, durationFrames: 8, currentFrame: 0 },

    timeElapsed: 0, // For difficulty scaling
    difficultyLevel: 0,
    currentActualSpawnRate: 0,

    config: {
        playerSpeed: 2,
        // monsterSpeed: 0.75, // Replaced by per-type speed and difficulty scaling
        initialSpawnRate: 1500, // Renamed from spawnRate
        maxMonstersOnScreen: 10, // Increased slightly
        playerSize: { width: 30, height: 50 },
        defaultMonsterSize: { width: 80, height: 80 }, // Default, types can override
        defaultMonsterSpeed: 0.75, // Default, types can override
        groundHeight: 50,
        // baseXPPerKill: 25, // Replaced by per-monster XP
        xpToNextLevelBase: 100,
        xpLevelMultiplier: 1.2,
        statPointsPerLevel: 2,
        abilityPointsPerLevel: 10, // AP on level up
        directAbilityPointsPerKill: 10, // AP directly per kill (for testing)
        manualClickDamage: 50,

        monsterTypes: [
            { id: 'goblin', name: 'Goblin', baseHealth: 50, xp: 15, color: 'lightgreen', width: 60, height: 60, baseSpeed: 0.8, score: 10, minDifficulty: 0 },
            { id: 'orc', name: 'Orc', baseHealth: 120, xp: 30, color: 'darkseagreen', width: 75, height: 75, baseSpeed: 0.65, score: 25, minDifficulty: 2 },
            { id: 'shadowWolf', name: 'Shadow Wolf', baseHealth: 80, xp: 22, color: '#4A4A4A', width: 80, height: 50, baseSpeed: 1.1, score: 18, minDifficulty: 1, yOffset: 10 }, // Sits lower due to height
            { id: 'bat', name: 'Cave Bat', baseHealth: 35, xp: 12, color: '#636363', width: 50, height: 30, baseSpeed: 1.3, score: 8, minDifficulty: 0, yOffset: -30 }, // Spawns higher
            { id: 'stoneGolem', name: 'Stone Golem', baseHealth: 250, xp: 50, color: 'slategray', width: 90, height: 90, baseSpeed: 0.4, score: 50, minDifficulty: 4 }
        ],

        difficultyIncreaseInterval: 30000, // Increase difficulty every 30 seconds (in ms)
        initialDifficultyLevel: 0,
        maxDifficultyLevel: 10, // Max difficulty level
        difficultyHealthMultiplier: 0.15, // Per level, monsters get +15% of their base health
        difficultySpeedMultiplier: 0.07, // Per level, monsters get +7% of their base speed
        difficultySpawnRateFactor: 0.92, // Per level, spawn rate becomes 92% of initial (faster)
        minSpawnRate: 400, // Minimum spawn rate in ms

        autoMeleeBaseDamage: 15, autoMeleeDamagePerLevel: 5,
        autoMeleeBaseCooldown: 2200, autoMeleeCooldownReductionPerSpeedLevel: 200, autoMeleeMinCooldown: 50,
        autoMeleeBaseRange: 60, autoMeleeRangePerLevel: 15,

        autoRangeBaseDamage: 10, autoRangeDamagePerLevel: 4,
        autoRangeBaseCooldown: 3000, autoRangeCooldownReductionPerSpeedLevel: 250, autoRangeMinCooldown: 200,
        autoRangeBaseRange: 250, autoRangeRangePerLevel: 50,
        autoRangePiercePerLevel: 1,

        projectileSpeed: 6,

        orbBaseDamage: 8,
        orbDamagePerStrengthLevel: 3,
        orbBaseAttackCooldown: 2800,
        orbCooldownReductionPerSpeedLevel: 280,
        orbMinAttackCooldown: 70,
        orbBaseAttackRange: 300,
        orbRangePerLevel: 40,
        orbProjectileSpeed: 7,
        orbProjectileColor: 'cyan',
        orbProjectileSize: { width: 8, height: 8 },
        orbVisualSize: 15,
        orbVisualColor: 'rgba(100, 100, 255, 0.9)',
        orbArrangementRadius: 45,
        orbArrangementAngleOffset: 0
    },
    callbacks: {},
    sharedData: {},

    isPaused: false, activeSheet: null, sheetElementContainer: null,
    boundHandleMouseClick: null, boundHandleKeyDown: null,

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log("AutoRunnerGame (Monsters Upgraded): Initializing...", sharedData);
        this.gameContainer = container;
        this.callbacks.success = successCallback; this.callbacks.failure = failureCallback;
        this.sharedData = { ...sharedData };

        this.gameContainer.style.position = 'relative';
        this.gameContainer.innerHTML = `
            <style> 
                #autoRunnerCanvasEndless { border: 1px solid #111; background-color: #e0f0ff; display: block; margin: 0 auto; cursor: crosshair; }
                .autorunner-info-endless { text-align: center; margin-bottom: 10px; font-size: 0.9em; }
                .autorunner-info-endless p { margin: 3px 0; }
                .xp-bar-container { width: 150px; height: 15px; background-color: #ccc; border: 1px solid #888; border-radius: 3px; margin: 2px auto; overflow: hidden; }
                .xp-bar { width: 0%; height: 100%; background-color: #4CAF50; transition: width 0.3s ease-in-out; }
                .sheet-modal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 700px; height: 80vh; max-height: 600px; background-color: rgba(220, 225, 230, 0.98); border: 2px solid #555; border-radius: 10px; z-index: 1000; box-shadow: 0 8px 25px rgba(0,0,0,0.3); color: #333; display: flex; flex-direction: column; overflow: hidden; }
                .sheet-modal-header { padding: 10px 15px; background-color: #4a5568; color: white; border-bottom: 1px solid #2d3748; border-radius: 8px 8px 0 0; }
                .sheet-modal-header h2 { margin: 0; font-size: 1.3em; }
                .sheet-modal-controls { padding: 8px; background-color: #edf2f7; border-bottom: 1px solid #cbd5e0; text-align: center; flex-shrink: 0; }
                .sheet-modal-controls button { padding: 5px 10px; margin: 0 5px; font-size: 0.9em; border-radius: 4px; border: 1px solid #a0aec0; background-color: #f7fafc; cursor: pointer; }
                .sheet-modal-controls button:hover { background-color: #e2e8f0; }
                .sheet-modal-content-area { flex-grow: 1; position: relative; overflow: hidden; background-color: rgba(230, 255, 230, 0.85); }
                #abilitySheetPannableContent { position: relative; cursor: grab; transform-origin: 0 0; }
                #abilitySheetPannableContent.grabbing { cursor: grabbing; }
                .ability-branch { margin: 15px; padding:15px; border: 1px solid #b2dfdb; border-radius: 8px; background-color: #e0f2f1; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
                .ability-branch h3 { margin-top:0; margin-bottom: 12px; color: #00695c; font-size: 1.15em; }
                .ability-branch ul { list-style: none; padding-left: 0; } 
                .ability-branch li { padding: 10px; margin-bottom: 10px; background-color: #ffffff; border-radius: 6px; border: 1px solid #d0d0d0; }
                .ability-branch li strong:first-child { font-size: 1.05em; display: block; margin-bottom: 3px; }
                .ability-branch li p { font-size: 0.8em; margin: 4px 0 8px 0; color: #555; }
                .sheet-modal-footer { padding: 10px 15px; background-color: #edf2f7; border-top: 1px solid #cbd5e0; text-align: right; flex-shrink: 0; border-radius: 0 0 8px 8px; }
                .sheet-close-btn { padding: 8px 15px; font-size: 0.95em; background-color: #718096 !important; color: white !important; border-color: #4a5568 !important; }
                .sheet-close-btn:hover { background-color: #4a5568 !important; border-color: #2d3748 !important; }
                #levelUpNotification { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 25px; background-color: rgba(76, 175, 80, 0.95); color: white; border: none; border-radius: 8px; font-size: 1.25em; font-weight: bold; z-index: 1001; text-align: center; opacity: 0; transition: opacity 0.5s ease-in-out, transform 0.3s ease-in-out; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            </style>
            <div class="autorunner-info-endless">
                <h2>Endless Auto Runner!</h2>
                <p>Click monsters! 'C' for Character, 'A' for Abilities.</p>
                <p>Score: <span id="arScoreEndless">0</span> | Dist: <span id="arDistanceEndless">0</span>m | Defeated: <span id="arDefeatedEndless">0</span></p>
                <p>Level: <span id="arLevelEndless">1</span> (<span id="arStatPoints">0</span> SP / <span id="arAbilityPoints">0</span> AP) | Difficulty: <span id="arDifficultyLevel">0</span></p>
                <div class="xp-bar-container"><div id="arXpBar" class="xp-bar"></div></div>
                <p>XP: <span id="arXpCurrent">0</span> / <span id="arXpToNext">0</span></p>
            </div>
            <canvas id="autoRunnerCanvasEndless" width="780" height="350"></canvas>
            <div id="sheetContainerEndless"></div>
            <div id="levelUpNotification"></div>
        `;

        this.canvas = document.getElementById('autoRunnerCanvasEndless');
        this.ctx = this.canvas.getContext('2d');
        this.sheetElementContainer = document.getElementById('sheetContainerEndless');

        this.player = {
            x: 50, y: this.canvas.height - this.config.groundHeight - this.config.playerSize.height,
            width: this.config.playerSize.width, height: this.config.playerSize.height,
            color: 'darkolivegreen',
            level: this.sharedData.playerLevel || 1, xp: this.sharedData.playerXP || 0,
            xpToNextLevel: this.calculateXpToNextLevel(this.sharedData.playerLevel || 1),
            statPoints: this.sharedData.playerStatPoints || 0, abilityPoints: this.sharedData.playerAbilityPoints || 0,
            abilityLevels: this.sharedData.abilityLevels ? JSON.parse(JSON.stringify(this.sharedData.abilityLevels)) : this.getDefaultAbilityLevels(),
            
            orbs: [],
            nextOrbToAttackIndex: 0,

            effectiveMeleeDamage: 0, effectiveMeleeCooldown: Infinity, effectiveMeleeRange: 0,
            effectiveRangeDamage: 0, effectiveRangeCooldown: Infinity, effectiveRangeRange: 0, effectiveRangePierce: 0,
            effectiveOrbDamage: 0, effectiveOrbCooldown: Infinity, effectiveOrbRange: 0, effectiveOrbCount: 0,

            autoMeleeEnabled: false, autoRangeEnabled: false, orbActive: false,
            strength: this.sharedData.playerStats?.strength || 10,
            agility: this.sharedData.playerStats?.agility || 10,
            intelligence: this.sharedData.playerStats?.intelligence || 10,
        };
        this.projectiles = []; this.meleeFlash.active = false;
        this.calculateEffectiveStats();

        this.monsters = []; this.score = 0; this.distanceTraveled = 0; this.monstersDefeated = 0;
        this.isPaused = false; this.activeSheet = null; this.levelUpMessage.alpha = 0;
        
        this.timeElapsed = 0;
        this.difficultyLevel = this.config.initialDifficultyLevel;
        this.currentActualSpawnRate = Math.max(
            this.config.minSpawnRate,
            this.config.initialSpawnRate * Math.pow(this.config.difficultySpawnRateFactor, this.difficultyLevel)
        );

        this.updateUIStats();

        this.boundHandleMouseClick = this.handleMouseClick.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.canvas.addEventListener('click', this.boundHandleMouseClick);
        document.addEventListener('keydown', this.boundHandleKeyDown);
        this.startGameplay();
    },

    getDefaultAbilityLevels: function() {
        const defaultLevels = {};
        if (typeof AbilitySheetScreen === 'undefined' || !AbilitySheetScreen.availableAbilityBranches) {
            console.warn("AbilitySheetScreen structure not found for getDefaultAbilityLevels. Using minimal defaults.");
            return {
                melee: { unlocked: false, meleeDamageLevel: 0, meleeSpeedLevel: 0, meleeRangeLevel: 0 },
                range: { unlocked: false, rangeDamageLevel: 0, rangeSpeedLevel: 0, rangeRangeLevel: 0, rangePiercingLevel: 0 },
                magic: { unlocked: false, magicOrbStrengthLevel: 0, magicOrbSpeedLevel: 0, magicOrbRangeLevel: 0, magicOrbCountLevel: 0 }
            };
        }
        for (const branchKey in AbilitySheetScreen.availableAbilityBranches) {
            defaultLevels[branchKey] = { unlocked: false };
            for (const upgradeKey in AbilitySheetScreen.availableAbilityBranches[branchKey].upgrades) {
                const levelKey = upgradeKey.endsWith('Level') ? upgradeKey : upgradeKey + 'Level';
                defaultLevels[branchKey][levelKey] = 0;
            }
        }
        return defaultLevels;
    },

    calculateEffectiveStats: function() {
        const pa = this.player; const pc = this.config;
        const pal = pa.abilityLevels || this.getDefaultAbilityLevels();

        pa.autoMeleeEnabled = pal.melee?.unlocked || false;
        if(pa.autoMeleeEnabled){
            pa.effectiveMeleeDamage = pc.autoMeleeBaseDamage + ((pal.melee.meleeDamageLevel||0) * pc.autoMeleeDamagePerLevel);
            pa.effectiveMeleeCooldown = Math.max(pc.autoMeleeMinCooldown, pc.autoMeleeBaseCooldown - ((pal.melee.meleeSpeedLevel||0) * pc.autoMeleeCooldownReductionPerSpeedLevel));
            pa.effectiveMeleeRange = pc.autoMeleeBaseRange + ((pal.melee.meleeRangeLevel||0) * pc.autoMeleeRangePerLevel);
        } else { pa.effectiveMeleeDamage=0; pa.effectiveMeleeCooldown=Infinity; pa.effectiveMeleeRange=0; }

        pa.autoRangeEnabled = pal.range?.unlocked || false;
        if(pa.autoRangeEnabled){
            pa.effectiveRangeDamage = pc.autoRangeBaseDamage + ((pal.range.rangeDamageLevel||0) * pc.autoRangeDamagePerLevel);
            pa.effectiveRangeCooldown = Math.max(pc.autoRangeMinCooldown, pc.autoRangeBaseCooldown - ((pal.range.rangeSpeedLevel||0) * pc.autoRangeCooldownReductionPerSpeedLevel));
            pa.effectiveRangeRange = pc.autoRangeBaseRange + ((pal.range.rangeRangeLevel||0) * pc.autoRangeRangePerLevel);
            pa.effectiveRangePierce = (pal.range.rangePiercingLevel || 0);
        } else { pa.effectiveRangeDamage=0; pa.effectiveRangeCooldown=Infinity; pa.effectiveRangeRange=0; pa.effectiveRangePierce = 0; }
        
        pa.orbActive = pal.magic?.unlocked || false;
        if (pa.orbActive) {
            pa.effectiveOrbCount = 1 + (pal.magic.magicOrbCountLevel || 0);
            pa.effectiveOrbDamage = pc.orbBaseDamage + ((pal.magic.magicOrbStrengthLevel || 0) * pc.orbDamagePerStrengthLevel);
            pa.effectiveOrbCooldown = Math.max(pc.orbMinAttackCooldown, pc.orbBaseAttackCooldown - ((pal.magic.magicOrbSpeedLevel || 0) * pc.orbCooldownReductionPerSpeedLevel));
            pa.effectiveOrbRange = pc.orbBaseAttackRange + ((pal.magic.magicOrbRangeLevel || 0) * pc.orbRangePerLevel);
        } else {
            pa.effectiveOrbCount = 0; pa.effectiveOrbDamage = 0; pa.effectiveOrbCooldown = Infinity; pa.effectiveOrbRange = 0;
        }
        this.updateOrbArray();
        // console.log("Effective Stats: OrbActive:", pa.orbActive, "OrbCount:", pa.effectiveOrbCount, "OrbDmg:", pa.effectiveOrbDamage, "OrbCD:", pa.effectiveOrbCooldown, "OrbRange:", pa.effectiveOrbRange);
    },
    
    updateOrbArray: function() {
        const pa = this.player;
        if (!pa.orbActive || pa.effectiveOrbCount <= 0) {
            pa.orbs = [];
            return;
        }
        
        while (pa.orbs.length < pa.effectiveOrbCount) {
            const angle = (pa.orbs.length / pa.effectiveOrbCount) * 2 * Math.PI + this.config.orbArrangementAngleOffset;
            pa.orbs.push({ id: pa.orbs.length, x: 0, y: 0, angle: angle });
        }
        while (pa.orbs.length > pa.effectiveOrbCount) {
            pa.orbs.pop();
        }
        if (pa.nextOrbToAttackIndex >= pa.orbs.length) {
            pa.nextOrbToAttackIndex = 0;
        }
    },

    calculateXpToNextLevel: function(level) {
        if(level<=0)level=1;
        return Math.floor(this.config.xpToNextLevelBase*Math.pow(this.config.xpLevelMultiplier,level-1));
    },
    addXP: function(amount) {
        if(this.isPaused||!this.gameInterval)return;
        this.player.xp+=amount;
        let leveledUp=false;
        while(this.player.xp>=this.player.xpToNextLevel){
            this.player.xp-=this.player.xpToNextLevel;
            this.player.level++;
            this.player.statPoints+=this.config.statPointsPerLevel;
            this.player.abilityPoints+=this.config.abilityPointsPerLevel; // AP from level up
            this.player.xpToNextLevel=this.calculateXpToNextLevel(this.player.level);
            leveledUp=true;
        }
        if(leveledUp)this.showLevelUpNotification();
        this.updateUIStats();
    },
    showLevelUpNotification: function() {
        const notificationElement=document.getElementById('levelUpNotification');
        if(notificationElement){
            notificationElement.textContent=`LEVEL UP! You are now Level ${this.player.level}!`;
            notificationElement.style.opacity='1';
            notificationElement.style.transform='translateX(-50%) translateY(0)';
            setTimeout(()=>{
                notificationElement.style.opacity='0';
                notificationElement.style.transform='translateX(-50%) translateY(-20px)';
            },3000);
        }
    },
    updateUIStats: function() {
        document.getElementById('arScoreEndless').textContent=this.score;
        document.getElementById('arDistanceEndless').textContent=Math.floor(this.distanceTraveled);
        document.getElementById('arDefeatedEndless').textContent=this.monstersDefeated;
        document.getElementById('arLevelEndless').textContent=this.player.level;
        document.getElementById('arStatPoints').textContent=this.player.statPoints;
        document.getElementById('arAbilityPoints').textContent=this.player.abilityPoints;
        document.getElementById('arXpCurrent').textContent=this.player.xp;
        document.getElementById('arXpToNext').textContent=this.player.xpToNextLevel;
        const xpPercentage=(this.player.xp/this.player.xpToNextLevel)*100;
        document.getElementById('arXpBar').style.width=`${Math.min(100,xpPercentage)}%`;
        document.getElementById('arDifficultyLevel').textContent = this.difficultyLevel;
    },
    startGameplay: function() {
        if(this.gameInterval)clearInterval(this.gameInterval);
        if(this.spawnInterval)clearInterval(this.spawnInterval);
        this.clearAutoAttackIntervals();
        this.isPaused=false;
        this.closeSheet();
        this.gameInterval=setInterval(()=>this.gameLoop(),1000/60);
        
        this.currentActualSpawnRate = Math.max( // Ensure it's set before first spawn
            this.config.minSpawnRate,
            this.config.initialSpawnRate * Math.pow(this.config.difficultySpawnRateFactor, this.difficultyLevel)
        );
        this.spawnInterval=setInterval(()=>this.spawnMonster(), this.currentActualSpawnRate);
        this.setupAutoAttacks();
    },
    gameLoop: function() {
        if(this.isPaused||!this.gameInterval)return;
        this.update();
        this.render();
    },

    update: function() {
        this.distanceTraveled+=this.config.playerSpeed/60;
        this.timeElapsed += (1000/60); // Increment game time

        // Difficulty Scaling Logic
        const nextDifficultyThreshold = (this.difficultyLevel + 1) * this.config.difficultyIncreaseInterval;
        if (this.timeElapsed >= nextDifficultyThreshold && this.difficultyLevel < this.config.maxDifficultyLevel) {
            this.difficultyLevel++;
            console.log(`Difficulty increased to level: ${this.difficultyLevel}`);
            this.updateUIStats(); // Update difficulty display

            const newSpawnRate = Math.max(
                this.config.minSpawnRate,
                this.config.initialSpawnRate * Math.pow(this.config.difficultySpawnRateFactor, this.difficultyLevel)
            );

            if (newSpawnRate !== this.currentActualSpawnRate) {
                this.currentActualSpawnRate = newSpawnRate;
                if (this.spawnInterval) clearInterval(this.spawnInterval);
                if (!this.isPaused && this.gameInterval) { // Only if game is running
                    this.spawnInterval = setInterval(() => this.spawnMonster(), this.currentActualSpawnRate);
                    console.log(`Spawn rate updated to: ${this.currentActualSpawnRate}ms`);
                }
            }
        }


        if(this.meleeFlash.active){
            this.meleeFlash.currentFrame++;
            this.meleeFlash.alpha=1-(this.meleeFlash.currentFrame/this.meleeFlash.durationFrames);
            if(this.meleeFlash.currentFrame>=this.meleeFlash.durationFrames)this.meleeFlash.active=false;
        }
        
        if (this.player.orbActive && this.player.orbs.length > 0) {
            const pa = this.player;
            const pc = this.config;
            pa.orbs.forEach((orb, index) => {
                orb.x = pa.x + pa.width / 2 + pc.orbArrangementRadius * Math.cos(orb.angle);
                orb.y = pa.y + pa.height / 2 + pc.orbArrangementRadius * Math.sin(orb.angle);
            });
        }

        for(let i=this.projectiles.length-1;i>=0;i--){
            const p=this.projectiles[i];
            p.x+=p.speed||this.config.projectileSpeed;
            if(p.x>this.canvas.width+(p.width||0)){this.projectiles.splice(i,1);continue;}
            let currentHitCount=p.hitCount||0;
            for(let j=this.monsters.length-1;j>=0;j--){
                const m=this.monsters[j];
                if(!m) continue; // Monster might have been removed by another projectile in same frame
                if(p.alreadyHit?.has(m.id))continue; // Use monster's unique ID if available, or the object itself
                
                const projHitbox = { x: p.x, y: p.y, width: p.width || 8, height: p.height || 8 };
                const monsterHitbox = { x: m.x, y: m.y, width: m.width, height: m.height };

                if(projHitbox.x < monsterHitbox.x + monsterHitbox.width &&
                   projHitbox.x + projHitbox.width > monsterHitbox.x &&
                   projHitbox.y < monsterHitbox.y + monsterHitbox.height &&
                   projHitbox.y + projHitbox.height > monsterHitbox.y) {
                    
                    const monsterDefeated = this.damageMonster(m,j,p.damage); // damageMonster now returns if defeated
                    currentHitCount++;
                    
                    if(p.canPierce){
                        if(!p.alreadyHit)p.alreadyHit=new Set();
                        p.alreadyHit.add(m.id || m); // Store monster ID or object
                        if(currentHitCount > p.pierceCount){ 
                            this.projectiles.splice(i,1);
                            break; 
                        }
                    }else{
                        this.projectiles.splice(i,1);
                        break; 
                    }
                    if (monsterDefeated && p.canPierce && currentHitCount <= p.pierceCount) {
                        // If monster was defeated and projectile can still pierce, it continues.
                        // No special action needed here, just don't break outer loop unless pierce count exceeded or not piercing.
                    }
                }
            }
        }
        for(let i=this.monsters.length-1;i>=0;i--){
            const m=this.monsters[i];
            m.x-=m.effectiveSpeed; // Use monster's effective speed
            if(this.player.x<m.x+m.width&&this.player.x+this.player.width>m.x&&this.player.y<m.y+m.height&&this.player.y+this.player.height>m.y){
                this.triggerGameOver("Player hit by " + (m.name || "a monster") + "!");
                return;
            }
            if(m.x+m.width<0)this.monsters.splice(i,1);
        }
    },
    
    handleKeyDown: function(event) {
        if(!this.gameInterval&&!this.isPaused&&this.activeSheet===null)return;
        if(event.key.toLowerCase()==='c'){
            if(this.activeSheet==='character')this.closeSheet();else this.openSheet('character');
        }else if(event.key.toLowerCase()==='a'){
            if(this.activeSheet==='ability')this.closeSheet();else this.openSheet('ability');
        }else if(event.key==='Escape'){
            if(this.activeSheet)this.closeSheet();
        }
    },
    openSheet: function(sheetType) {
        if (this.activeSheet) this.closeSheet();
        this.isPaused = true; this.activeSheet = sheetType; this.sheetElementContainer.innerHTML = '';
        this.sharedData.playerLevel = this.player.level; this.sharedData.playerXP = this.player.xp;
        this.sharedData.playerXpToNextLevel = this.player.xpToNextLevel; this.sharedData.playerStatPoints = this.player.statPoints;
        this.sharedData.playerAbilityPoints = this.player.abilityPoints;
        if (!this.player.abilityLevels) { this.player.abilityLevels = this.getDefaultAbilityLevels(); }
        this.sharedData.abilityLevels = JSON.parse(JSON.stringify(this.player.abilityLevels));
        this.sharedData.playerStats = {
            strength: this.player.strength, agility: this.player.agility, intelligence: this.player.intelligence,
            ...(this.sharedData.playerStats || {})
        };
        let sheetObject;
        if (sheetType === 'character') {
            sheetObject = CharacterSheetScreen;
            if (typeof sheetObject.onOpen === 'function') {
                sheetObject.onOpen(this.sharedData, this.sheetElementContainer, () => this.closeSheet());
            } else if (typeof sheetObject.getContent === 'function') {
                this.sheetElementContainer.innerHTML = sheetObject.getContent(this.sharedData);
                if (typeof sheetObject.addEventListeners === 'function') {
                    sheetObject.addEventListeners(() => this.closeSheet(), this.sheetElementContainer);
                } else { console.warn("CharacterSheetScreen has getContent but no addEventListeners.");}
            } else {
                console.error("CharacterSheetScreen no valid onOpen/getContent!");
                this.isPaused=false;this.activeSheet=null;
                if(this.gameInterval===null&&this.spawnInterval===null){this.startGameplay();}
                return;
            }
        } else if (sheetType === 'ability') {
            sheetObject = AbilitySheetScreen;
            if (typeof sheetObject.onOpen === 'function') {
                sheetObject.onOpen(this.sharedData, this.sheetElementContainer, () => this.closeSheet());
            } else {
                console.error("AbilitySheetScreen no onOpen!");
                this.isPaused=false;this.activeSheet=null;
                if(this.gameInterval===null&&this.spawnInterval===null){this.startGameplay();}
                return;
            }
        } else {
            console.error("Unknown sheet type:", sheetType);
            this.isPaused=false;this.activeSheet=null;
            if(this.gameInterval===null&&this.spawnInterval===null){this.startGameplay();}
            return;
        }
        if(this.spawnInterval) clearInterval(this.spawnInterval); this.spawnInterval = null;
        if(this.gameInterval) clearInterval(this.gameInterval); this.gameInterval = null;
        this.clearAutoAttackIntervals();
        console.log(`Opened ${sheetType} sheet. Game paused.`);
    },
    closeSheet: function() {
        if(!this.activeSheet)return;
        if(this.sharedData.playerAbilityPoints!==undefined)this.player.abilityPoints=this.sharedData.playerAbilityPoints;
        if(this.sharedData.abilityLevels)this.player.abilityLevels=JSON.parse(JSON.stringify(this.sharedData.abilityLevels));
        this.calculateEffectiveStats();
        const sheetType=this.activeSheet;
        if(sheetType==='character'&&typeof CharacterSheetScreen!=='undefined'&&typeof CharacterSheetScreen.onClose==='function')CharacterSheetScreen.onClose();
        else if(sheetType==='ability'&&typeof AbilitySheetScreen!=='undefined'&&typeof AbilitySheetScreen.onClose==='function')AbilitySheetScreen.onClose();
        this.sheetElementContainer.innerHTML='';this.isPaused=false;this.activeSheet=null;
        
        // Only restart gameplay if it was previously running (indicated by callbacks.failure which implies a game mode exists)
        // and intervals are null (meaning they were cleared by openSheet)
        if(this.callbacks.failure && this.gameInterval === null && this.spawnInterval === null){
             this.startGameplay(); // This will re-initialize intervals and attacks
        }
        console.log("Sheet closed. Game resumed or ready to resume.");
        this.updateUIStats();
    },
    handleMouseClick: function(event) {
        if(this.isPaused||!this.gameInterval)return;
        const rect=this.canvas.getBoundingClientRect();
        const clickX=event.clientX-rect.left;
        const clickY=event.clientY-rect.top;
        for(let i=this.monsters.length-1;i>=0;i--){
            const monster=this.monsters[i];
            if(clickX>=monster.x&&clickX<=monster.x+monster.width&&clickY>=monster.y&&clickY<=monster.y+monster.height){
                this.damageMonster(monster,i, this.config.manualClickDamage); 
                return;
            }
        }
    },
    damageMonster: function(monster, index, damageAmount) {
        if (!monster || monster.currentHealth <= 0) return false; // Already defeated or invalid

        monster.currentHealth -= damageAmount;
        // console.log(`${monster.name || 'Monster'} took ${damageAmount} damage, health: ${monster.currentHealth}/${monster.maxHealth}`);

        if (monster.currentHealth <= 0) {
            // console.log(`${monster.name || 'Monster'} defeated!`);
            this.score += monster.scoreValue;
            this.monstersDefeated++;
            this.addXP(monster.xpValue);
            this.player.abilityPoints += this.config.directAbilityPointsPerKill; // Direct AP per kill

            this.monsters.splice(index, 1);
            this.updateUIStats(); // Update stats after kill and potential level up
            return true; // Monster was defeated
        }
        return false; // Monster still alive
    },
    
    setupAutoAttacks: function() {
        this.clearAutoAttackIntervals();
        if(this.player.autoMeleeEnabled && this.player.effectiveMeleeCooldown < Infinity){
            this.autoAttackIntervals.melee = setInterval(()=>this.performAutoMelee(), this.player.effectiveMeleeCooldown);
        }
        if(this.player.autoRangeEnabled && this.player.effectiveRangeCooldown < Infinity){
            this.autoAttackIntervals.range = setInterval(()=>this.performAutoRange(), this.player.effectiveRangeCooldown);
        }
        if(this.player.orbActive && this.player.orbs.length > 0 && this.player.effectiveOrbCooldown < Infinity) {
            this.autoAttackIntervals.orb = setInterval(()=>this.performOrbAttack(), this.player.effectiveOrbCooldown);
        }
    },
    clearAutoAttackIntervals: function() {
        if(this.autoAttackIntervals.melee)clearInterval(this.autoAttackIntervals.melee);
        if(this.autoAttackIntervals.range)clearInterval(this.autoAttackIntervals.range);
        if(this.autoAttackIntervals.orb)clearInterval(this.autoAttackIntervals.orb);
        this.autoAttackIntervals.melee=null; this.autoAttackIntervals.range=null; this.autoAttackIntervals.orb=null;
    },

    performAutoMelee: function() {
        if(this.isPaused||!this.gameInterval||!this.player.autoMeleeEnabled)return;
        for(let i=0;i<this.monsters.length;i++){ // Iterate forwards as indices might change if monster is defeated
            const monster=this.monsters[i];
            if (!monster) continue;
            const distance=monster.x-(this.player.x+this.player.width);
            if(distance>0&&distance<this.player.effectiveMeleeRange){
                this.meleeFlash.active=true;this.meleeFlash.currentFrame=0;this.meleeFlash.alpha=0.7;
                this.meleeFlash.x=this.player.x+this.player.width;
                this.meleeFlash.y=this.player.y-(this.player.effectiveMeleeRange-this.player.height)/2;
                this.meleeFlash.width=this.player.effectiveMeleeRange*0.6;
                this.meleeFlash.height=this.player.effectiveMeleeRange;
                
                // Find the actual index of the monster again in case array shifted
                const currentIndex = this.monsters.indexOf(monster);
                if (currentIndex !== -1) {
                    this.damageMonster(monster, currentIndex, this.player.effectiveMeleeDamage);
                }
                return; // Typically melee hits one target
            }
        }
    },
    performAutoRange: function() {
        if (this.isPaused || !this.gameInterval || !this.player.autoRangeEnabled) return;
        for (let i = 0; i < this.monsters.length; i++) {
            const monster = this.monsters[i];
            if (!monster) continue;
            const distance = monster.x - (this.player.x + this.player.width);
            if (distance > 0 && distance < this.player.effectiveRangeRange) {
                this.projectiles.push({
                    x: this.player.x + this.player.width, y: this.player.y + this.player.height / 2 - 2,
                    width: 10, height: 4, color: 'orange',
                    damage: this.player.effectiveRangeDamage,
                    speed: this.config.projectileSpeed,
                    canPierce: this.player.effectiveRangePierce > 0,
                    pierceCount: this.player.effectiveRangePierce,
                    hitCount: 0,
                    alreadyHit: new Set(),
                    type: 'player_range'
                });
                return;
            }
        }
    },
    performOrbAttack: function() {
        if (this.isPaused || !this.gameInterval || !this.player.orbActive || this.player.orbs.length === 0) return;

        const orbToAttack = this.player.orbs[this.player.nextOrbToAttackIndex];
        if (!orbToAttack) return;

        for (let i = 0; i < this.monsters.length; i++) {
            const monster = this.monsters[i];
            if (!monster) continue;
            const dx = monster.x + monster.width / 2 - orbToAttack.x;
            const dy = monster.y + monster.height / 2 - orbToAttack.y;
            const distanceToMonster = Math.sqrt(dx*dx + dy*dy);

            if (distanceToMonster < this.player.effectiveOrbRange) {
                // console.log(`Orb ${this.player.nextOrbToAttackIndex} Attack! Dmg:`, this.player.effectiveOrbDamage);
                this.projectiles.push({
                    x: orbToAttack.x, y: orbToAttack.y,
                    width: this.config.orbProjectileSize.width, height: this.config.orbProjectileSize.height,
                    color: this.config.orbProjectileColor,
                    damage: this.player.effectiveOrbDamage,
                    speed: this.config.orbProjectileSpeed,
                    canPierce: false, pierceCount: 0, hitCount: 0, alreadyHit: new Set(),
                    type: 'orb_shot'
                });
                this.player.nextOrbToAttackIndex = (this.player.nextOrbToAttackIndex + 1) % this.player.orbs.length;
                return;
            }
        }
    },

    spawnMonster: function() {
        if(this.isPaused||!this.spawnInterval||this.monsters.length>=this.config.maxMonstersOnScreen)return;

        const availableTypes = this.config.monsterTypes.filter(type => type.minDifficulty <= this.difficultyLevel);
        if (availableTypes.length === 0) {
            console.warn("No monster types available for current difficulty level:", this.difficultyLevel, "- defaulting to first type if possible.");
            if (this.config.monsterTypes.length > 0) {
                 availableTypes.push(this.config.monsterTypes[0]); // Fallback to ensure something spawns
            } else {
                console.error("No monster types defined in config!");
                return;
            }
        }

        const typeIndex = Math.floor(Math.random() * availableTypes.length);
        const mType = availableTypes[typeIndex];

        const monsterWidth = mType.width || this.config.defaultMonsterSize.width;
        const monsterHeight = mType.height || this.config.defaultMonsterSize.height;
        
        const yPosition = this.canvas.height - this.config.groundHeight - monsterHeight - (mType.yOffset || 0) - Math.random() * 5; // smaller random y variation

        const baseHealth = mType.baseHealth;
        const effectiveMaxHealth = Math.floor(baseHealth * (1 + (this.difficultyLevel * this.config.difficultyHealthMultiplier)));

        const baseSpeed = mType.baseSpeed || this.config.defaultMonsterSpeed;
        const effectiveSpeed = parseFloat((baseSpeed * (1 + (this.difficultyLevel * this.config.difficultySpeedMultiplier))).toFixed(2));


        const monster={
            id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Unique ID for better tracking
            type: mType.id,
            name: mType.name,
            x: this.canvas.width,
            y: yPosition,
            width: monsterWidth, height: monsterHeight,
            color: mType.color,
            baseHealth: mType.baseHealth,
            maxHealth: effectiveMaxHealth,
            currentHealth: effectiveMaxHealth,
            xpValue: mType.xp,
            scoreValue: mType.score,
            baseSpeed: mType.baseSpeed,
            effectiveSpeed: effectiveSpeed,
        };
        this.monsters.push(monster);
    },
    triggerGameOver: function(reason) {
        console.log("GAME OVER:",reason);
        if(this.gameInterval===null&&this.spawnInterval===null&&this.isPaused&&this.activeSheet===null && !this.callbacks.failure) {
            // Avoid multiple calls if already in a "game over" like state without proper callback setup (e.g. during dev)
            console.warn("TriggerGameOver called in an unusual state, game might already be effectively over or not fully started.");
            return;
        }

        this.closeSheet(); // Ensure any open sheets are closed
        if(this.gameInterval) clearInterval(this.gameInterval); this.gameInterval = null;
        if(this.spawnInterval) clearInterval(this.spawnInterval); this.spawnInterval = null;
        this.clearAutoAttackIntervals();
        
        this.isPaused=true; // Set paused after clearing intervals

        if(this.canvas&&this.boundHandleMouseClick)this.canvas.removeEventListener('click',this.boundHandleMouseClick);
        if(this.boundHandleKeyDown)document.removeEventListener('keydown',this.boundHandleKeyDown);
        // Don't null out bound handlers here if you might restart the game later without full re-init.
        // But for a definitive game over leading to callback, this is fine.

        const finalData={
            reason:reason,autorunnerScore:this.score,distanceCovered:Math.floor(this.distanceTraveled),
            monstersDefeated:this.monstersDefeated,playerLevel:this.player.level,playerXP:this.player.xp,
            playerStatPoints:this.player.statPoints,playerAbilityPoints:this.player.abilityPoints,
            abilityLevels:JSON.parse(JSON.stringify(this.player.abilityLevels)),
            playerStats:{strength:this.player.strength,agility:this.player.agility,intelligence:this.player.intelligence,}
        };
        if(this.callbacks.failure) {
            this.callbacks.failure({...this.sharedData,...finalData});
        } else {
            console.error("Game Over, but no failure callback was provided to AutoRunnerGame.init!");
        }
    },
    
    render: function() {
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        this.ctx.fillStyle='#774411'; // Ground
        this.ctx.fillRect(0,this.canvas.height-this.config.groundHeight,this.canvas.width,this.config.groundHeight);
        
        // Player
        this.ctx.fillStyle=this.player.color;
        this.ctx.fillRect(this.player.x,this.player.y,this.player.width,this.player.height);
        
        // Orbs
        if (this.player.orbActive) {
            this.player.orbs.forEach(orb => {
                this.ctx.fillStyle = this.config.orbVisualColor;
                this.ctx.beginPath();
                this.ctx.arc(orb.x, orb.y, this.config.orbVisualSize / 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }

        // Monsters & Health Bars
        this.monsters.forEach(m=>{
            this.ctx.fillStyle=m.color;
            this.ctx.fillRect(m.x,m.y,m.width,m.height);

            // Health bar
            if (m.currentHealth < m.maxHealth && m.currentHealth > 0) {
                const healthBarHeight = 6;
                const healthBarYOffset = 8; 
                const healthBarWidth = m.width * 0.8; // Make health bar slightly smaller than monster
                const healthBarX = m.x + (m.width - healthBarWidth) / 2; // Center it

                this.ctx.fillStyle = '#555'; // Background of health bar (darker red)
                this.ctx.fillRect(healthBarX, m.y - healthBarYOffset - healthBarHeight, healthBarWidth, healthBarHeight);

                const currentHealthWidth = healthBarWidth * (m.currentHealth / m.maxHealth);
                this.ctx.fillStyle = 'greenyellow'; // Foreground
                this.ctx.fillRect(healthBarX, m.y - healthBarYOffset - healthBarHeight, currentHealthWidth, healthBarHeight);
                
                this.ctx.strokeStyle = '#333'; // Border for health bar
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(healthBarX, m.y - healthBarYOffset - healthBarHeight, healthBarWidth, healthBarHeight);
            }
        });
        
        // Projectiles
        this.projectiles.forEach(p=>{this.ctx.fillStyle=p.color;this.ctx.fillRect(p.x,p.y,p.width||8,p.height||8);});
        
        // Melee Flash
        if(this.meleeFlash.active){
            this.ctx.save();
            this.ctx.fillStyle=`rgba(255,255,100,${this.meleeFlash.alpha})`;
            this.ctx.beginPath();
            this.ctx.moveTo(this.meleeFlash.x,this.meleeFlash.y);
            this.ctx.lineTo(this.meleeFlash.x+this.meleeFlash.width,this.meleeFlash.y+this.meleeFlash.height/2);
            this.ctx.lineTo(this.meleeFlash.x,this.meleeFlash.y+this.meleeFlash.height);
            this.ctx.closePath();this.ctx.fill();
            this.ctx.restore();
        }
    },
    destroy: function() {
        console.log("Destroying AutoRunner...");
        this.closeSheet(); // Ensure sheets are closed and resources potentially released
        
        clearInterval(this.gameInterval); this.gameInterval = null;
        clearInterval(this.spawnInterval); this.spawnInterval = null;
        this.clearAutoAttackIntervals();

        if(this.canvas && this.boundHandleMouseClick) this.canvas.removeEventListener('click', this.boundHandleMouseClick);
        if(this.boundHandleKeyDown) document.removeEventListener('keydown', this.boundHandleKeyDown);
        
        // It's generally safer not to null out bound methods themselves if the object might be re-initialized
        // this.boundHandleMouseClick=null; 
        // this.boundHandleKeyDown=null;

        if(this.gameContainer) this.gameContainer.innerHTML='';
        
        this.monsters=[]; this.projectiles=[]; this.player=null; this.canvas=null; this.ctx=null;
        this.sheetElementContainer=null; this.isPaused=false; this.activeSheet=null;
        this.timeElapsed = 0; this.difficultyLevel = 0;
    }
};
