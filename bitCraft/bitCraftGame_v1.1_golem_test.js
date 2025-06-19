// js/bitCraft.js
// An experimental game engine for heavy bit-based spellcasting.
// Version 5.0: The Bitomancer

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
    
    player: {
        bitomancer: null,
        mana: 100,
        maxMana: 200,
        manaRegen: 0.1, // Mana per frame
        golems: []
    },

    spellEffects: [], // For particles, explosions, etc.
    projectiles: [],

    // --- Spell State ---
    spells: {
        summonGolem: {
            isChanneling: false,
            channelTime: 0,
            maxChannelTime: 180, // 3 seconds at 60fps
            minManaCost: 50
        }
    },

    camera: { x: 0, y: 0, zoom: 1 },
    input: { isPanning: false, mousePos: { x: 0, y: 0 }, keys: new Set() },
    boundHandlers: {},

    // =================================================================================
    // --- INITIALIZATION ---
    // =================================================================================
    init: function(container, successCallback, failureCallback) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        
        console.log("bitCraftGame (v5.0 The Bitomancer): Initializing.");
        this.render();
        this.startGame();
    },

    render: function() {
        this.container.innerHTML = `
            <div id="bitcraft-container" style="position: relative; width: 100%; height: 100%; display: flex; font-family: 'Courier New', Courier, monospace; color: #fff;">
                <canvas id="bitcraft-canvas" style="background-color: #0d0d0d; cursor: default; flex-grow: 1;"></canvas>
                <div id="bitcraft-side-menu" style="width: 250px; height: 100%; background-color: #1f1f1f; border-left: 2px solid #333; padding: 15px; box-sizing: border-box;">
                    <h2>Bitomancer</h2>
                    <hr style="border-color: #333;">
                    <div style="margin-top: 10px;">
                        <span>Mana:</span>
                        <div style="background: #333; border: 1px solid #555; padding: 2px;">
                            <div id="mana-bar" style="height: 16px; background: #00ffff; width: 50%;"></div>
                        </div>
                        <p id="mana-text">100 / 200</p>
                    </div>
                    <div id="spell-info" style="margin-top: 20px;">
                        <h3>Spells</h3>
                        <p>[Hold Q] Summon Pixel Golem</p>
                        <p style="font-size: 11px; color: #aaa;">Channel mana to summon a temporary autonomous ally. The longer you channel, the more powerful the golem.</p>
                    </div>
                     <button id="bitcraft-exit-btn" style="position: absolute; bottom: 10px; right: 10px; padding: 5px 10px; font-size: 12px; cursor: pointer; background-color: #522; border: 1px solid #a44; color: #fff;">Exit</button>
                </div>
            </div>
        `;
        document.getElementById('bitcraft-exit-btn').onclick = () => this.successCallback({ message: 'Exited bitCraft' });
    },

    startGame: function() {
        this.canvas = document.getElementById('bitcraft-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();

        this.player.bitomancer = {
            id: 'bitomancer',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            size: 12,
            color: '#ffff00',
        };
        
        this.camera.x = this.player.bitomancer.x;
        this.camera.y = this.player.bitomancer.y;
        
        this.addEventListeners();
        this.gameLoop();
    },

    addEventListeners: function() {
        this.boundHandlers = {
            resize: this.resizeCanvas.bind(this),
            wheel: this.handleZoom.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            keydown: this.handleKeyDown.bind(this),
            keyup: this.handleKeyUp.bind(this),
            contextmenu: (e) => e.preventDefault()
        };
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            window.addEventListener(event, handler, false);
        }
    },

    resizeCanvas: function() {
        const container = document.getElementById('bitcraft-container');
        const menu = document.getElementById('bitcraft-side-menu');
        if (!container || !this.canvas || !menu) return;
        this.canvas.width = container.offsetWidth - menu.offsetWidth;
        this.canvas.height = container.offsetHeight;
    },

    // =================================================================================
    // --- INPUT HANDLING ---
    // =================================================================================
    handleKeyDown: function(e) {
        this.input.keys.add(e.key.toLowerCase());
        if (e.key.toLowerCase() === 'q') {
            if (this.player.mana >= this.spells.summonGolem.minManaCost) {
                this.spells.summonGolem.isChanneling = true;
            }
        }
    },

    handleKeyUp: function(e) {
        this.input.keys.delete(e.key.toLowerCase());
        if (e.key.toLowerCase() === 'q') {
            if (this.spells.summonGolem.isChanneling) {
                this.castSummonGolem();
            }
        }
    },

    handleMouseDown: function(e) {
        if (e.button === 2) {
            this.input.isPanning = true;
            this.camera.dragStart = {
                x: e.clientX / this.camera.zoom + this.camera.x,
                y: e.clientY / this.camera.zoom + this.camera.y
            };
        }
    },

    handleMouseMove: function(e) {
        if (this.input.isPanning) {
            this.camera.x = this.camera.dragStart.x - e.clientX / this.camera.zoom;
            this.camera.y = this.camera.dragStart.y - e.clientY / this.camera.zoom;
        }
    },

    handleMouseUp: function(e) {
        if (e.button === 2) { this.input.isPanning = false; }
    },

    handleZoom: function(e) {
        e.preventDefault();
        const zoomIntensity = 0.1, minZoom = 0.3, maxZoom = 4;
        const zoomDir = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(zoomDir * zoomIntensity);
        const newZoom = this.camera.zoom * zoomFactor;

        if (newZoom < minZoom || newZoom > maxZoom) return;

        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        this.camera.x = worldPos.x - (worldPos.x - this.camera.x) / zoomFactor;
        this.camera.y = worldPos.y - (worldPos.y - this.camera.y) / zoomFactor;
        this.camera.zoom = newZoom;
    },

    // =================================================================================
    // --- SPELLCASTING ---
    // =================================================================================
    updateChanneling: function() {
        if (!this.spells.summonGolem.isChanneling) return;
        
        const spell = this.spells.summonGolem;
        const manaCostPerFrame = (this.player.maxMana - spell.minManaCost) / spell.maxChannelTime;

        if (this.player.mana > manaCostPerFrame) {
            this.player.mana -= manaCostPerFrame;
            spell.channelTime = Math.min(spell.maxChannelTime, spell.channelTime + 1);

            // Visual effect: create swirling particles
            const angle = (spell.channelTime * 0.1) % (Math.PI * 2);
            const dist = 20 + Math.sin(spell.channelTime * 0.05) * 10;
            this.spellEffects.push({
                x: this.player.bitomancer.x + Math.cos(angle) * dist,
                y: this.player.bitomancer.y + Math.sin(angle) * dist,
                size: Math.random() * 3 + 1,
                life: 30,
                color: `rgba(0, 255, 255, ${Math.random()})`
            });
        } else {
            this.castSummonGolem(); // Not enough mana, cast with current power
        }
    },

    castSummonGolem: function() {
        const spell = this.spells.summonGolem;
        spell.isChanneling = false;

        const powerRatio = spell.channelTime / spell.maxChannelTime;
        
        // Golem stats are based on channel time
        const golemSize = 20 + 30 * powerRatio;
        const golemHealth = 50 + 250 * powerRatio;
        const golemLife = 300 + 600 * powerRatio; // in frames

        const golem = {
            id: `golem_${Math.random()}`,
            x: this.player.bitomancer.x,
            y: this.player.bitomancer.y - golemSize,
            size: golemSize,
            health: golemHealth,
            maxHealth: golemHealth,
            life: golemLife,
            maxLife: golemLife,
            color: '#00ffff',
            attackCooldown: 0,
            target: null, // AI will find a target
            pixels: [] // The bits that make up the golem
        };

        // Create the pixels that form the golem's body
        for (let i = 0; i < golem.size * 2; i++) {
            golem.pixels.push({
                x: (Math.random() - 0.5) * golem.size,
                y: (Math.random() - 0.5) * golem.size,
                size: Math.random() * 4 + 2
            });
        }

        this.player.golems.push(golem);
        spell.channelTime = 0; // Reset channel time
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
        this.player.mana = Math.min(this.player.maxMana, this.player.mana + this.player.manaRegen);

        this.handleCameraPanWithKeys();
        this.updateChanneling();
        this.updateGolems();
        this.updateSpellEffects();
    },
    
    updateGolems: function() {
        for (let i = this.player.golems.length - 1; i >= 0; i--) {
            const golem = this.player.golems[i];
            golem.life--;
            
            // The golem slowly decays, losing size and health
            const lifeRatio = golem.life / golem.maxLife;
            golem.size = (20 + 30 * (golem.maxHealth / 300)) * lifeRatio; // Recalculate size based on remaining life
            
            // Randomly "drip" pixels
            if(Math.random() < 0.1) {
                golem.pixels.pop();
            }

            if (golem.life <= 0) {
                this.player.golems.splice(i, 1);
            }
        }
    },

    updateSpellEffects: function() {
        for (let i = this.spellEffects.length - 1; i >= 0; i--) {
            const p = this.spellEffects[i];
            p.life--;
            if (p.life <= 0) {
                this.spellEffects.splice(i, 1);
            }
        }
    },

    handleCameraPanWithKeys: function() {
        const panSpeed = 5 / this.camera.zoom;
        if (this.input.keys.has('w')) { this.camera.y -= panSpeed; }
        if (this.input.keys.has('s')) { this.camera.y += panSpeed; }
        if (this.input.keys.has('a')) { this.camera.x -= panSpeed; }
        if (this.input.keys.has('d')) { this.camera.x += panSpeed; }
    },

    // =================================================================================
    // --- DRAW (Rendering) ---
    // =================================================================================
    draw: function() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawObject(this.player.bitomancer);
        for (const golem of this.player.golems) { this.drawGolem(golem); }
        for (const effect of this.spellEffects) { this.drawObject(effect); }
        
        this.ctx.restore();
        
        this.drawUI();
    },
    
    drawObject: function(obj) {
        this.ctx.fillStyle = obj.color;
        this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
    },
    
    drawGolem: function(golem) {
        this.ctx.save();
        this.ctx.translate(golem.x, golem.y);
        const lifeRatio = golem.life / golem.maxLife;
        
        for(const pixel of golem.pixels) {
            this.ctx.fillStyle = `rgba(0, 255, 255, ${lifeRatio * 0.8})`;
            this.ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size);
        }
        this.ctx.restore();
    },
    
    drawUI: function() {
        const manaBar = document.getElementById('mana-bar');
        const manaText = document.getElementById('mana-text');
        if (manaBar && manaText) {
            const manaRatio = this.player.mana / this.player.maxMana;
            manaBar.style.width = `${manaRatio * 100}%`;
            manaText.textContent = `${Math.floor(this.player.mana)} / ${this.player.maxMana}`;
        }
    },

    // =================================================================================
    // --- HELPERS & TEARDOWN ---
    // =================================================================================
    screenToWorld: function(screenX, screenY) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const y = (screenY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return { x, y };
    },
    
    destroy: function() {
        console.log("bitCraftGame (The Bitomancer): Destroying.");
        if (this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); }
        
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            window.removeEventListener(event, handler);
        }

        this.canvas = null;
        this.container.innerHTML = '';
    }
};

