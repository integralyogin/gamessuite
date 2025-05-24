// js/walkingRpgGame.js
/* eslint-disable func-names  */

const WalkingRpgGame = {
    id: 'walking-rpg',
    /* -------------------------------------------------- */
    // Runtime vars
    gameContainer: null,
    successCallback: null,
    globalFailureCallback: null,
    previousData: null,

    canvas: null,
    ctx: null,
    animationId: null,

    player: null,
    keysPressed: {},
    statsDiv: null,

    inCombat: false,   // helps us pause / resume
    lastEncounterTry: 0,

    /* -------------------------------------------------- */
    init: function (gameContainer, successCallback, globalFailureCallback, previousData) {
        this.gameContainer        = gameContainer;
        this.successCallback      = successCallback;
        this.globalFailureCallback = globalFailureCallback;
        this.previousData         = previousData || {};

        // Default stats if none came from Character select
        const defaultStats = {
            name   : 'Adventurer',
            health : 100,
            attack : 10,
            defense: 5,
        };
        this.playerStats = { ...defaultStats, ...(this.previousData.characterStats || {}) };

        this.buildDOM();
        this.attachListeners();
        this.resetPlayer();

        this.loop(); // kick off animation
        console.log('[WalkingRpgGame] initialised ✔');
    },

    /* -------------------------------------------------- */
    buildDOM: function () {
        // Clear anything that was previously inside the container
        this.gameContainer.innerHTML = '';
        this.gameContainer.style.position = 'relative';

        // Stats box (top-left)
        this.statsDiv = document.createElement('div');
        this.statsDiv.style.cssText = `
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(0,0,0,0.6);
            color:#fff;
            padding: 6px 10px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
            z-index: 3;
        `;
        this.gameContainer.appendChild(this.statsDiv);
        this.refreshStatsBox(); // fills innerHTML

        // Play-field canvas
        this.canvas          = document.createElement('canvas');
        this.canvas.width    = 640;
        this.canvas.height   = 320;
        this.canvas.style.background = '#6ab04c';
        this.canvas.style.border     = '2px solid #333';
        this.gameContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    },

    refreshStatsBox: function () {
        this.statsDiv.innerHTML = `
            <strong>${this.playerStats.name}</strong><br>
            ❤️ ${this.playerStats.health}&nbsp;&nbsp;
            ⚔️ ${this.playerStats.attack}&nbsp;&nbsp;
            🛡️ ${this.playerStats.defense}
        `;
    },

    /* -------------------------------------------------- */
    resetPlayer: function () {
        this.player = {
            x: 5,
            y: this.canvas.height / 2 - 12,
            w: 24,
            h: 24,
            speed: 2.2,
        };
    },

    /* -------------------------------------------------- */
    attachListeners: function () {
        // Key listeners
        this.keyDownHandler = (e) => {
            this.keysPressed[e.key.toLowerCase()] = true;
        };
        this.keyUpHandler = (e) => {
            delete this.keysPressed[e.key.toLowerCase()];
        };

        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
    },

    detachListeners: function () {
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);
    },

    /* -------------------------------------------------- */
    loop: function () {
        this.animationId = requestAnimationFrame(() => this.loop());

        if (this.inCombat) return; // pause drawing while Combat is running

        this.update();
        this.draw();
    },

    /* -------------------------------------------------- */
    update: function () {
        const left  = this.keysPressed['arrowleft'] || this.keysPressed['a'];
        const right = this.keysPressed['arrowright'] || this.keysPressed['d'];

        if (left)  this.player.x = Math.max(0, this.player.x - this.player.speed);
        if (right) this.player.x = Math.min(
            this.canvas.width - this.player.w,
            this.player.x + this.player.speed
        );

        // Win condition – reached the far right?
        if (this.player.x + this.player.w >= this.canvas.width) {
            this.cleanUp();
            this.successCallback({ playerStats: this.playerStats });
            return;
        }

        // Every 200 ms we roll a chance for an encounter *while moving*.
        const now = performance.now();
        if (right && now - this.lastEncounterTry > 200) {
            this.lastEncounterTry = now;
            if (Math.random() < 0.02) { // 2 % chance
                this.launchEncounter();
            }
        }
    },

    draw: function () {
        const c = this.ctx;
        c.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Simple ground horizon
        c.fillStyle = '#3d9970';
        c.fillRect(0, this.canvas.height - 40, this.canvas.width, 40);

        // Player rectangle
        c.fillStyle = '#ffeaa7';
        c.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

        // A basic outline for visibility
        c.strokeStyle = '#2d3436';
        c.lineWidth = 2;
        c.strokeRect(this.player.x, this.player.y, this.player.w, this.player.h);
    },

    /* -------------------------------------------------- */
    launchEncounter: function () {
        console.log('[WalkingRpgGame] Bandit encounter!');
        this.inCombat = true;
        this.detachListeners(); // avoid double key events

        // Back up position so we can come back exactly here.
        const resumeX = this.player.x;

        // Save our canvas node so we can restore after Combat rewrites innerHTML.
        const walkingMarkup = this.gameContainer.innerHTML;

        // Build callbacks for embedded CombatGame
        const combatSuccess = (dataFromCombat) => {
            console.log('[WalkingRpgGame] Combat won, resuming walk…');
            // Update stats if Combat game returned something
            if (dataFromCombat && dataFromCombat.updatedStats) {
                this.playerStats = { ...this.playerStats, ...dataFromCombat.updatedStats };
            }
            // Restore our DOM, re-hook listeners, continue loop
            this.gameContainer.innerHTML = walkingMarkup;
            this.buildDOM();              // reconstruct statsDiv + canvas
            this.player.x = resumeX;
            this.refreshStatsBox();
            this.attachListeners();
            this.inCombat = false;
        };

        const combatDefeat = (dataFromCombat) => {
            console.warn('[WalkingRpgGame] Combat lost – propagating GAME OVER.');
            this.cleanUp();
            this.globalFailureCallback(
                dataFromCombat || { reason: 'Defeated by a bandit during travel.' }
            );
        };

        // Fire up the Combat mini-game
        CombatGame.init(
            this.gameContainer,
            combatSuccess,
            combatDefeat,
            { playerStats: this.playerStats, enemy: 'bandit' }
        );
    },

    /* -------------------------------------------------- */
    cleanUp: function () {
        cancelAnimationFrame(this.animationId);
        this.detachListeners();
        this.gameContainer.innerHTML = '';
    },

    /* Called automatically by GameManager before the next game loads */
    destroy: function () {
        this.cleanUp();
        console.log('[WalkingRpgGame] destroyed.');
    },
};
