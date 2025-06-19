// js/bitCraft.js
// A clean, reusable foundation for a 2D strategy game.
// Version 4.12: Modular Crafting System

const bitCraftGame = {
    id: 'bitCraftGame',
    container: null,
    successCallback: null,
    failureCallback: null,

    // =================================================================================
    // --- GAME STATE ---
    // =================================================================================
    canvas: null,
    sideMenu: null,
    ctx: null,
    gameLoopId: null,
    
    gameObjects: [],
    playerUnits: [],
    turrets: [], 
    summons: [], 
    selectedEntities: [], 
    hoveredObject: null, 

    camera: {
        x: 0, y: 0, zoom: 1, isFollowing: false,
        dragStart: { x: 0, y: 0 }
    },
    
    input: {
        isSelecting: false, isPanning: false,
        dragStart: { x: 0, y: 0 }, mousePos: { x: 0, y: 0 },
        keys: new Set(),
        targetingMode: null 
    },

    boundHandlers: {},

    // =================================================================================
    // --- INITIALIZATION ---
    // =================================================================================
    init: function(container, successCallback, failureCallback) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        
        console.log("bitCraftGame (v4.12 Modular Crafting): Initializing.");
        this.render();
        this.startGame();
    },

    render: function() {
        this.container.innerHTML = `
            <div id="bitcraft-container" style="position: relative; width: 100%; height: 100%; display: flex; font-family: 'Courier New', Courier, monospace;">
                <canvas id="bitcraft-canvas" style="background-color: #0d0d0d; cursor: default; flex-grow: 1;"></canvas>
                <div id="bitcraft-side-menu" style="width: 250px; height: 100%; background-color: #1f1f1f; border-left: 2px solid #333; color: #fff; padding: 15px; box-sizing: border-box; display: none; flex-shrink: 0;">
                    <div id="side-menu-content">Details will appear here.</div>
                     <button id="bitcraft-exit-btn" style="position: absolute; bottom: 10px; right: 10px; padding: 5px 10px; font-size: 12px; cursor: pointer; background-color: #522; border: 1px solid #a44; color: #fff;">Exit</button>
                </div>
            </div>
        `;
        document.getElementById('bitcraft-exit-btn').onclick = () => this.successCallback({ message: 'Exited bitCraft' });
        
        const sideMenu = document.getElementById('bitcraft-side-menu');
        sideMenu.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            if (e.target && e.target.dataset.action) {
                const action = e.target.dataset.action;
                const value = e.target.dataset.value;
                if (action === 'activate-spell') {
                    this.activateTargetingMode(value, 'spell');
                } else if (action === 'activate-build') {
                    this.activateTargetingMode(value, 'build');
                }
            }
        });
    },

    startGame: async function() {
        this.canvas = document.getElementById('bitcraft-canvas');
        this.sideMenu = document.getElementById('bitcraft-side-menu');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        MagicSystem.init();

        // Create a simple default world instead of loading from URL
        this.createDefaultWorld();
        
        if (this.playerUnits.length > 0) {
            this.camera.x = this.playerUnits[0].x;
            this.camera.y = this.playerUnits[0].y;
        } else {
            this.camera.x = this.canvas.width / 2;
            this.camera.y = this.canvas.height / 2;
        }
        
        this.addEventListeners();
        this.gameLoop();
    },
    
    createDefaultWorld: function() {
        // Create a simple default world for version 0.01
        this.gameObjects = [];
        this.playerUnits = [];
        this.turrets = [];

        // Add player units
        const playerUnit1 = {
            id: 'player_1',
            type: 'player_unit',
            x: 100,
            y: 100,
            size: 16,
            color: '#00ff00',
            speed: 2,
            health: 100,
            maxHealth: 100,
            mana: 100,
            maxMana: 100,
            manaRegen: 0.1,
            wood: 0,
            stone: 0,
            capacity: 10,
            spells: ['lightningBolt', 'teleport', 'ballLightning'],
            canBuild: ['lightningTurret'],
            target: null,
            task: 'idle',
            gatherTimer: 0
        };

        const playerUnit2 = {
            id: 'player_2',
            type: 'player_unit',
            x: 120,
            y: 120,
            size: 16,
            color: '#00ff00',
            speed: 2,
            health: 100,
            maxHealth: 100,
            mana: 100,
            maxMana: 100,
            manaRegen: 0.1,
            wood: 0,
            stone: 0,
            capacity: 10,
            spells: ['lightningBolt', 'teleport'],
            canBuild: ['lightningTurret'],
            target: null,
            task: 'idle',
            gatherTimer: 0
        };

        this.playerUnits = [playerUnit1, playerUnit2];
        this.gameObjects.push(...this.playerUnits);

        // Add resources
        for (let i = 0; i < 10; i++) {
            this.gameObjects.push({
                id: `tree_${i}`,
                type: 'tree',
                x: Math.random() * 800 + 200,
                y: Math.random() * 600 + 200,
                size: 20,
                color: '#228B22',
                trunkColor: '#654321',
                leafColor: '#2E8B57',
                wood: 10
            });
        }

        for (let i = 0; i < 8; i++) {
            this.gameObjects.push({
                id: `rock_${i}`,
                type: 'rock',
                x: Math.random() * 800 + 200,
                y: Math.random() * 600 + 200,
                size: 18,
                color: '#696969',
                stone: 8
            });
        }

        // Add training dummies
        for (let i = 0; i < 3; i++) {
            this.gameObjects.push({
                id: `dummy_${i}`,
                type: 'dummy',
                x: Math.random() * 400 + 400,
                y: Math.random() * 400 + 300,
                size: 20,
                color: '#8B4513',
                health: 50,
                maxHealth: 50
            });
        }

        // Add some grass patches for visual variety
        for (let i = 0; i < 15; i++) {
            this.gameObjects.push({
                id: `grass_${i}`,
                type: 'grass',
                x: Math.random() * 1000 + 100,
                y: Math.random() * 700 + 100,
                size: 12,
                color: '#32CD32'
            });
        }
    },

    addEventListeners: function() {
        this.boundHandlers = {
            resize: this.resizeCanvas.bind(this),
            wheel: this.handleZoom.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            keydown: this.handleKeyDown.bind(this),
            keyup: (e) => this.input.keys.delete(e.key.toLowerCase()),
            contextmenu: (e) => e.preventDefault()
        };
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
             const target = (event === 'keydown' || event === 'keyup' || event === 'resize') ? window : this.canvas;
             target.addEventListener(event, handler, false);
        }
    },

    resizeCanvas: function() {
        const container = document.getElementById('bitcraft-container');
        if (!container || !this.canvas) return;
        const menuWidth = this.sideMenu.style.display === 'block' ? this.sideMenu.offsetWidth : 0;
        this.canvas.width = container.offsetWidth - menuWidth;
        this.canvas.height = container.offsetHeight;
    },

    // =================================================================================
    // --- INPUT & UI ---
    // =================================================================================
    handleKeyDown: function(e) {
        const key = e.key.toLowerCase();
        this.input.keys.add(key);
        if (key === 'escape') {
            this.deactivateTargetingMode();
            this.selectedEntities = [];
            this.updateSideMenu();
        }

        const spellIndex = parseInt(key) - 1;
        if (!isNaN(spellIndex) && spellIndex >= 0 && spellIndex < 9) {
            if (this.selectedEntities.length === 1 && this.selectedEntities[0].spells && this.selectedEntities[0].spells.length > spellIndex) {
                 e.preventDefault(); 
                 const spellId = this.selectedEntities[0].spells[spellIndex];
                 this.activateTargetingMode(spellId, 'spell');
            }
        }
    },

    handleMouseDown: function(event) {
        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        const targetObject = this.getEntityAt(worldPos);

        if (event.button === 0) { // Left-click
            if (this.input.targetingMode) {
                if (this.input.targetingMode.type === 'spell') {
                    const spellResult = MagicSystem.castSpell(this.input.targetingMode.data.id, {
                        target: worldPos, caster: this.selectedEntities[0], targetObject: targetObject 
                    });
                     if (spellResult && spellResult.summon) {
                        this.summons.push(spellResult.summon);
                    }
                } else if (this.input.targetingMode.type === 'build') {
                    this.buildStructure(this.input.targetingMode.data, worldPos);
                }
                this.deactivateTargetingMode();
                return;
            }
            this.input.isSelecting = true;
            this.input.dragStart = worldPos;
            this.camera.isFollowing = false;
        } 
        else if (event.button === 2) { // Right-click
            if (this.input.targetingMode) {
                this.deactivateTargetingMode();
                return;
            }
            if (this.selectedEntities.some(e => e.type === 'player_unit')) {
                 for (const unit of this.selectedEntities) { 
                    if(unit.speed) { 
                        if (targetObject && (targetObject.type === 'tree' || targetObject.type === 'rock')) {
                            unit.target = targetObject; unit.task = 'gathering';
                        } else {
                            unit.target = worldPos; unit.task = 'moving';
                        }
                    }
                 }
                this.updateSideMenu();
                this.camera.isFollowing = true;
            } else { 
                this.input.isPanning = true; this.camera.isFollowing = false;
                this.camera.dragStart = { x: event.clientX / this.camera.zoom + this.camera.x, y: event.clientY / this.camera.zoom + this.camera.y };
            }
        }
    },
    
    handleMouseMove: function(event) {
        this.input.mousePos = this.screenToWorld(event.clientX, event.clientY);
        if(this.input.isPanning) {
            this.camera.x = this.camera.dragStart.x - event.clientX / this.camera.zoom;
            this.camera.y = this.camera.dragStart.y - event.clientY / this.camera.zoom;
        }
    },

    handleMouseUp: function(event) {
        if (event.button === 0 && this.input.isSelecting) {
            this.selectEntitiesInBox();
            this.input.isSelecting = false;
        } else if (event.button === 2) {
            this.input.isPanning = false;
        }
    },

    handleZoom: function(event) {
        event.preventDefault();
        const zoomIntensity = 0.1, minZoom = 0.2, maxZoom = 5;
        const wheel = event.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(wheel * zoomIntensity);
        const newZoom = this.camera.zoom * zoomFactor;

        if (newZoom < minZoom || newZoom > maxZoom) return;

        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        this.camera.x = worldPos.x - (worldPos.x - this.camera.x) / zoomFactor;
        this.camera.y = worldPos.y - (worldPos.y - this.camera.y) / zoomFactor;
        this.camera.zoom = newZoom;
    },

    selectEntitiesInBox: function() {
        this.selectedEntities = [];
        const start = this.input.dragStart, end = this.input.mousePos;
        const box = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y),
            w: Math.abs(start.x - end.x), h: Math.abs(start.y - end.y) };

        if (box.w < 5 && box.h < 5) {
            let clickedEntity = this.getEntityAt(start);
            if (clickedEntity && (clickedEntity.type === 'player_unit' || clickedEntity.type === 'lightningTurret')) {
                this.selectedEntities.push(clickedEntity);
            }
        } else {
             this.selectedEntities = this.playerUnits.filter(unit => 
                unit.x > box.x && unit.x < box.x + box.w && unit.y > box.y && unit.y < box.y + box.h
            );
        }
        this.updateSideMenu();
    },
    
    activateTargetingMode: function(id, type) {
        if (this.selectedEntities.length > 0) {
            const caster = this.selectedEntities[0];
            if (type === 'spell') {
                 const spell = MagicSystem.getSpell(id);
                if (spell && caster.mana >= spell.manaCost && !(MagicSystem.cooldowns[id] > 0)) {
                     this.input.targetingMode = { type: 'spell', data: spell };
                }
            } else if (type === 'build') {
                const blueprint = MagicSystem.getStructureBlueprint(id);
                if(blueprint && caster.wood >= blueprint.woodCost && caster.stone >= blueprint.stoneCost && caster.mana >= blueprint.manaCost && caster.spells.includes(blueprint.prerequisite)) {
                    this.input.targetingMode = { type: 'build', data: blueprint };
                } else {
                    console.log("Not enough resources or knowledge to build turret.");
                }
            }
        }
    },

    deactivateTargetingMode: function() {
        this.input.targetingMode = null;
    },

    updateSideMenu: function() {
        const contentDiv = document.getElementById('side-menu-content');
        if (!contentDiv) return;
        
        if (this.selectedEntities.length > 0) {
            let content = '';
            const entity = this.selectedEntities[0];

            if (this.selectedEntities.length === 1) {
                content += `<b>ID:</b> ${entity.id}<br>`;
                if (entity.type === 'player_unit') {
                     content += `<b>Task:</b> ${entity.task}<br><b>Mana:</b> ${Math.floor(entity.mana)}/${entity.maxMana}<br><b>Inventory:</b><br>&nbsp;&nbsp;Wood: ${entity.wood||0}, Stone: ${entity.stone||0}<hr style="border-color:#333;">`;
                    if (entity.spells.length > 0) {
                        content += '<b>Spells:</b><br>';
                        entity.spells.forEach((spellId, index) => {
                            const spell = MagicSystem.getSpell(spellId);
                            if (spell) {
                                 const onCooldown = MagicSystem.cooldowns[spellId] > 0;
                                 content += `<button data-action="activate-spell" data-value="${spellId}" ${onCooldown ? 'disabled' : ''} style="width:100%;margin-top:5px;padding:5px;cursor:pointer;background:${onCooldown?'#555':'#333'};border:1px solid #777;color:${onCooldown?'#888':'#fff'};text-align:left;">[${index+1}] ${spell.name} (${spell.manaCost}m)</button>`;
                            }
                        });
                    }
                     if (entity.canBuild.length > 0) {
                        content += '<b>Build:</b><br>';
                        entity.canBuild.forEach((buildId) => {
                            const blueprint = MagicSystem.getStructureBlueprint(buildId);
                            if (blueprint) {
                                content += `<button data-action="activate-build" data-value="${buildId}" style="width:100%;margin-top:5px;padding:5px;cursor:pointer;background:#333;border:1px solid #777;color:#fff;text-align:left;">[B] ${blueprint.name} (W:${blueprint.woodCost} S:${blueprint.stoneCost} M:${blueprint.manaCost})</button>`;
                            }
                        });
                    }
                } else if (entity.type === 'lightningTurret') {
                     content += `<b>Health:</b> ${Math.ceil(entity.health)}/${entity.maxHealth}<br><b>Damage:</b> ${entity.damage}<br><b>Range:</b> ${entity.range}<br>`;
                }

            } else { // Multiple units selected
                content = `${this.selectedEntities.length} units selected.`;
            }
            contentDiv.innerHTML = content;
            this.sideMenu.style.display = 'block';
        } else {
            this.sideMenu.style.display = 'none';
        }
        this.resizeCanvas();
    },

    // =================================================================================
    // --- UPDATE (Game Logic) ---
    // =================================================================================
    gameLoop: function() {
        if (!this.canvas) return;
        this.update();
        this.draw();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    update: function() {
        this.handleCameraPanWithKeys();
        this.updateWorldObjects();
        this.applyUnitSeparation();
        this.updateCameraFollow();
        this.updateHoverState(); 
        if(this.selectedEntities.length > 0) this.updateSideMenu();
        
        MagicSystem.update();
        this.cleanupDestroyedObjects();
    },
    
    buildStructure: function(blueprint, position) {
        const builder = this.selectedEntities[0];
        if (builder.wood >= blueprint.woodCost && builder.stone >= blueprint.stoneCost && builder.mana >= blueprint.manaCost && builder.spells.includes(blueprint.prerequisite)) {
            builder.wood -= blueprint.woodCost;
            builder.stone -= blueprint.stoneCost;
            builder.mana -= blueprint.manaCost;

            const newTurret = { ...blueprint.stats,
                id: `turret_${Math.random()}`, x: position.x, y: position.y,
            };
            this.turrets.push(newTurret);
            this.gameObjects.push(newTurret);
        } else {
            console.log("Failed to build: Missing requirements.");
        }
    },

    updateWorldObjects: function() {
        for (const obj of this.gameObjects) {
            if (obj.mana < obj.maxMana) obj.mana = Math.min(obj.maxMana, obj.mana + (obj.manaRegen || 0));
            if (obj.health < obj.maxHealth) obj.health = Math.min(obj.maxHealth, obj.health + (obj.hpRegen || 0));
            if (obj.type === 'player_unit') this.updateUnit(obj);
        }
        this.updateTurrets();
        this.updateSummons();
    },

    updateSummons: function() {
        for (let i = this.summons.length - 1; i >= 0; i--) {
            const summon = this.summons[i];
            summon.life--;
            if (summon.life <= 0) { this.summons.splice(i, 1); continue; }

            if (!summon.target || summon.target.health <= 0) {
                let closestTarget = null, min_dist = Infinity;
                for (const obj of this.gameObjects) {
                    if(obj.type === 'dummy') {
                        const dist = Math.sqrt(Math.pow(summon.x - obj.x, 2) + Math.pow(summon.y - obj.y, 2));
                        if (dist < min_dist) { min_dist = dist; closestTarget = obj; }
                    }
                }
                summon.target = closestTarget;
            }

            if (summon.target) {
                const dx = summon.target.x - summon.x, dy = summon.target.y - summon.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                let moveX = 0, moveY = 0;
                moveX += (dx / dist) * summon.speed;
                moveY += (dy / dist) * summon.speed;
                if (dist < summon.repulsionRadius) {
                    const repulsionForce = (summon.repulsionRadius - dist) * 0.1;
                    moveX -= (dx / dist) * repulsionForce;
                    moveY -= (dy / dist) * repulsionForce;
                }
                moveX += (-dy / dist) * summon.orbitalSpeed;
                moveY += (dx / dist) * summon.orbitalSpeed;
                summon.x += moveX; summon.y += moveY;
            }

            for (const pixel of summon.pixels) {
                pixel.x += pixel.vx; pixel.y += pixel.vy;
                const gravity = 0.05;
                pixel.vx -= pixel.x * gravity; pixel.vy -= pixel.y * gravity;
                pixel.vx += (Math.random() - 0.5) * 0.1;
                pixel.vy += (Math.random() - 0.5) * 0.1;
            }

            summon.attackCooldown--;
            if (summon.attackCooldown <= 0 && summon.target) {
                summon.attackCooldown = summon.attackSpeed;
                MagicSystem.spellbook.lightningBolt.cast({caster: summon, target: summon.target, targetObject: summon.target});
            }
        }
    },

    updateTurrets: function() {
        for(const turret of this.turrets) {
            turret.attackCooldown = Math.max(0, turret.attackCooldown - 1);
            if (turret.attackCooldown <= 0) {
                let closestTarget = null, min_dist = turret.range;
                for (const obj of this.gameObjects) {
                    if(obj.type === 'dummy') {
                        const dist = Math.sqrt(Math.pow(turret.x - obj.x, 2) + Math.pow(turret.y - obj.y, 2));
                        if (dist < min_dist) { min_dist = dist; closestTarget = obj; }
                    }
                }
                if (closestTarget) {
                    turret.attackCooldown = turret.attackSpeed;
                    MagicSystem.spellbook.lightningTurretShot.cast({caster: turret, target: closestTarget, targetObject: closestTarget});
                }
            }
        }
    },
    
    cleanupDestroyedObjects: function() {
        this.gameObjects = this.gameObjects.filter(obj => obj.health === undefined || obj.health > 0);
        this.playerUnits = this.playerUnits.filter(u => u.health === undefined || u.health > 0);
        this.turrets = this.turrets.filter(t => t.health === undefined || t.health > 0);
    },

    updateUnit: function(unit) {
        if (!unit.target) { if (unit.task !== 'idle') unit.task = 'idle'; return; }
        if (unit.task === 'gathering' && (!unit.target.wood || unit.target.wood <= 0) && (!unit.target.stone || unit.target.stone <= 0)) { unit.task = 'idle'; unit.target = null; return; }
        const isInventoryFull = (unit.wood + unit.stone) >= unit.capacity;
        if (unit.task === 'gathering' && isInventoryFull) { unit.task = 'idle'; unit.target = null; return; }
        const reachDistance = unit.target.size ? unit.target.size / 2 : 0;
        const dx = unit.target.x - unit.x, dy = unit.target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > reachDistance + unit.size/2) {
            unit.x += dx / dist * unit.speed;
            unit.y += dy / dist * unit.speed;
        } else { 
            if (unit.task === 'moving') { unit.target = null; } 
            else if (unit.task === 'gathering') { this.gatherResource(unit); }
        }
    },
    
    gatherResource: function(unit) {
        unit.gatherTimer = (unit.gatherTimer || 0) - 1;
        if (unit.gatherTimer <= 0) {
            unit.gatherTimer = 60;
            const resourceType = unit.target.type === 'tree' ? 'wood' : 'stone';
            if (unit.target[resourceType] > 0) {
                unit.target[resourceType]--;
                unit[resourceType]++;
            } else {
                unit.task = 'idle'; unit.target = null;
            }
        }
    },

    updateHoverState: function() {
        this.hoveredObject = null;
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            if (this.isPointInObject(this.input.mousePos, this.gameObjects[i])) {
                this.hoveredObject = this.gameObjects[i];
                return;
            }
        }
    },

    handleCameraPanWithKeys: function() {
        const panSpeed = 5 / this.camera.zoom;
        let didPan = false;
        if (this.input.keys.has('w')) { this.camera.y -= panSpeed; didPan = true; }
        if (this.input.keys.has('s')) { this.camera.y += panSpeed; didPan = true; }
        if (this.input.keys.has('a')) { this.camera.x -= panSpeed; didPan = true; }
        if (this.input.keys.has('d')) { this.camera.x += panSpeed; didPan = true; }
        if (didPan) { this.camera.isFollowing = false; }
    },
    
    applyUnitSeparation: function() {
        for (let i = 0; i < this.playerUnits.length; i++) {
            for (let j = i + 1; j < this.playerUnits.length; j++) {
                const u1 = this.playerUnits[i], u2 = this.playerUnits[j];
                const dx = u2.x - u1.x, dy = u2.y - u1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const min_dist = u1.size;

                if (dist > 0 && dist < min_dist) {
                    const overlap = (min_dist - dist) / 2;
                    const pushX = (dx / dist) * overlap, pushY = (dy / dist) * overlap;
                    u1.x -= pushX; u1.y -= pushY;
                    u2.x += pushX; u2.y += pushY;
                }
            }
        }
    },
    
    updateCameraFollow: function() {
        if (!this.camera.isFollowing || this.selectedEntities.length === 0) return;
        let totalX = 0, totalY = 0;
        let count = 0;
        for (const entity of this.selectedEntities) { 
            if(entity.speed) { // Only follow units, not buildings
                totalX += entity.x; totalY += entity.y; count++;
            }
        }
        if (count === 0) return;
        const centroid = { x: totalX / count, y: totalY / count };
        const easing = 0.05;
        this.camera.x += (centroid.x - this.camera.x) * easing;
        this.camera.y += (centroid.y - this.camera.y) * easing;
    },

    // =================================================================================
    // --- DRAW (Rendering) ---
    // =================================================================================
    draw: function() {
        if (!this.ctx) return;
        this.canvas.style.cursor = this.input.targetingMode ? 'crosshair' : 'default';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.gameObjects.sort((a, b) => a.y - b.y);

        for (const obj of this.gameObjects) { this.drawObject(obj); }
        for (const summon of this.summons) { this.drawObject(summon); }
        MagicSystem.draw(this.ctx);
        for (const entity of this.selectedEntities) { this.drawSelectionHighlight(entity); }
        if (this.input.isSelecting) { this.drawSelectionBox(); }
        
        this.ctx.restore();
        
        this.drawTooltip();
        if (this.input.targetingMode) { this.drawTargetingReticule(); }
    },
    
    drawObject: function(obj) {
        this.ctx.fillStyle = obj.color || '#ff00ff';
        switch (obj.type) {
            case 'ball_lightning':
                this.ctx.save();
                this.ctx.translate(obj.x, obj.y);
                const lifeRatio = obj.life / obj.maxLife;
                this.ctx.globalAlpha = lifeRatio;
                for(const pixel of obj.pixels) {
                    this.ctx.fillStyle = pixel.color;
                    this.ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
                }
                this.ctx.restore();
                break;
            case 'lightningTurret':
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#ffff00';
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.size / 4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'player_unit': case 'rock': case 'dummy':
                this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
                break;
            case 'tree':
                const trunkWidth = obj.size * 0.4, trunkHeight = obj.size * 1.2;
                this.ctx.fillStyle = obj.trunkColor || '#654321';
                this.ctx.fillRect(obj.x - trunkWidth / 2, obj.y - trunkHeight, trunkWidth, trunkHeight);
                this.ctx.fillStyle = obj.leafColor || '#2E8B57';
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y - trunkHeight, obj.size, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'grass':
                this.ctx.save(); this.ctx.globalAlpha = 0.6;
                this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
                this.ctx.restore();
                break;
            default:
                this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
                break;
        }

        if (obj.health !== undefined && obj.maxHealth) {
            const barWidth = obj.size * 1.5, barY = obj.y + obj.size / 2 + 5;
            const healthPercentage = obj.health / obj.maxHealth;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(obj.x - barWidth / 2, barY, barWidth, 4);
            this.ctx.fillStyle = '#f00';
            this.ctx.fillRect(obj.x - barWidth / 2, barY, barWidth * healthPercentage, 4);
        }
    },

    drawSelectionHighlight: function(entity) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2 / this.camera.zoom;
        this.ctx.beginPath();
        if(entity.type === 'player_unit') {
             this.ctx.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2);
        } else {
             this.ctx.arc(entity.x, entity.y, entity.size / 2 + 3, 0, Math.PI * 2);
        }
        this.ctx.stroke();
        
        if(entity.range) {
            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.lineWidth = 1 / this.camera.zoom;
            this.ctx.beginPath();
            this.ctx.arc(entity.x, entity.y, entity.range, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    },
    
    drawSelectionBox: function() {
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        this.ctx.lineWidth = 1 / this.camera.zoom;
        const rect = { x: Math.min(this.input.dragStart.x, this.input.mousePos.x), y: Math.min(this.input.dragStart.y, this.input.mousePos.y),
            w: Math.abs(this.input.dragStart.x - this.input.mousePos.x), h: Math.abs(this.input.dragStart.y - this.input.mousePos.y) };
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    },

    drawTooltip: function() {
        if (!this.hoveredObject || this.input.isSelecting || this.input.targetingMode) return;
        const obj = this.hoveredObject;
        let text = obj.id || obj.type || 'Object';
        if (obj.health !== undefined) text += ` (${Math.ceil(obj.health)}/${obj.maxHealth})`;
        if (obj.type === 'tree' && obj.wood !== undefined) text += ` (Wood: ${obj.wood})`;
        if (obj.type === 'rock' && obj.stone !== undefined) text += ` (Stone: ${obj.stone})`;

        const screenPos = this.worldToScreen(this.input.mousePos.x, this.input.mousePos.y);
        const tooltipX = screenPos.x + 20, tooltipY = screenPos.y + 10;
        this.ctx.font = '12px Courier New';
        const textMetrics = this.ctx.measureText(text);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(tooltipX - 5, tooltipY - 12, textMetrics.width + 10, 18);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(text, tooltipX, tooltipY);
    },
    
    drawTargetingReticule: function() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); 
        const screenPos = this.worldToScreen(this.input.mousePos.x, this.input.mousePos.y);
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, 15, 0, Math.PI * 2);
        this.ctx.moveTo(screenPos.x - 10, screenPos.y); this.ctx.lineTo(screenPos.x + 10, screenPos.y);
        this.ctx.moveTo(screenPos.x, screenPos.y - 10); this.ctx.lineTo(screenPos.x, screenPos.y + 10);
        this.ctx.stroke();
        this.ctx.restore();
    },

    // =================================================================================
    // --- HELPERS & TEARDOWN ---
    // =================================================================================
    getEntityAt: function(point, typeFilter = null) {
        const checkableObjects = [...this.turrets, ...this.playerUnits, ...this.gameObjects];
        const uniqueObjects = [...new Map(checkableObjects.map(item => [item['id'], item])).values()];
        
        for(let i = uniqueObjects.length - 1; i >= 0; i--) {
            const obj = uniqueObjects[i];
            if(typeFilter && obj.type !== typeFilter) continue;
            if (this.isPointInObject(point, obj)) return obj;
        }
        return null;
    },

    isPointInObject: function(point, object) {
        const size = object.size || 0;
        if (object.type === 'player_unit' || object.type === 'rock' || object.type === 'grass' || object.type === 'dummy' || object.type === 'lightningTurret') {
            return ( point.x > object.x - size / 2 && point.x < object.x + size / 2 &&
                     point.y > object.y - size / 2 && point.y < object.y + size / 2 );
        } else if (object.type === 'tree') {
            const leafRadius = size;
            const leafCenterY = object.y - (size * 1.2);
            const dist = Math.sqrt(Math.pow(point.x - object.x, 2) + Math.pow(point.y - leafCenterY, 2));
            return dist < leafRadius;
        }
        return false;
    },
    
    screenToWorld: function(screenX, screenY) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const y = (screenY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return { x, y };
    },

    worldToScreen: function(worldX, worldY) {
        if (!this.canvas) return { x: 0, y: 0 };
        const x = (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
        const y = (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
        return { x, y };
    },
    
    destroy: function() {
        console.log("bitCraftGame (Pixel Explorer): Destroying.");
        if (this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); }
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            const target = (event === 'keydown' || event === 'keyup' || event === 'resize') ? window : this.canvas;
            if (target) { target.removeEventListener(event, handler); }
        }
        this.canvas = null; this.container.innerHTML = '';
    }
};


