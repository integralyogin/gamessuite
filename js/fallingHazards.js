const FallingHazardsGame = {
    id: 'falling-hazards-game',
    animationFrameId: null,
    player: null, // This will store player properties {x, y_css_bottom, width, height, speed}
    playerElement: null, // Reference to the player DOM element
    hazards: [],
    spawnInterval: null,
    gameTimeLimit: 20000, // 20 seconds to survive
    elapsedTime: 0,
    gameRoot: null,
    gameWidth: 0,
    gameHeight: 0,
    score: 0,

    boundKeyDownHandler: null,
    boundKeyUpHandler: null,
    keys: {},

    init: function(gameContainer, successCallback, globalFailureCallback, previousData) {
        console.log("Initializing Falling Hazards Game. Received data:", previousData);
        this.hazards = [];
        this.elapsedTime = 0;
        this.score = 0;
        this.keys = {};

        gameContainer.innerHTML = `
            <div class="falling-hazards-root" id="hazardsRoot">
                <div class="fh-player" id="fhPlayer"></div>
                <div class="fh-timer" id="fhTimer">Time: 0s</div>
                <div class="fh-instructions">Dodge for ${this.gameTimeLimit / 1000} seconds! Left/Right Arrows to move.</div>
            </div>
        `;

        this.gameRoot = document.getElementById('hazardsRoot');
        this.playerElement = document.getElementById('fhPlayer'); // Corrected to use this.playerElement
        this.timerElement = document.getElementById('fhTimer');
        
        this.gameWidth = this.gameRoot.clientWidth;
        this.gameHeight = this.gameRoot.clientHeight;

        this.player = {
            x: this.gameWidth / 2 - 15,
            y_css_bottom: 20, // y position from the bottom of the game area
            width: 30,
            height: 30,
            speed: 5
        };
        this.playerElement.style.left = this.player.x + 'px';
        this.playerElement.style.bottom = this.player.y_css_bottom + 'px';

        this.boundKeyDownHandler = (e) => { this.keys[e.key] = true; };
        this.boundKeyUpHandler = (e) => { this.keys[e.key] = false; };
        document.addEventListener('keydown', this.boundKeyDownHandler);
        document.addEventListener('keyup', this.boundKeyUpHandler);

        this.spawnInterval = setInterval(() => this.spawnHazard(), 1000);

        let lastFrameTime = performance.now();
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;
            this.elapsedTime += deltaTime;

            this.timerElement.textContent = `Time: ${Math.floor(this.elapsedTime / 1000)}s / ${this.gameTimeLimit / 1000}s`;

            if (this.keys['ArrowLeft'] && this.player.x > 0) {
                this.player.x -= this.player.speed;
            }
            if (this.keys['ArrowRight'] && this.player.x < this.gameWidth - this.player.width) {
                this.player.x += this.player.speed;
            }
            this.playerElement.style.left = this.player.x + 'px';

            // Player's bounding box (coordinates from the top-left of gameRoot)
            const playerLeft = this.player.x;
            const playerRight = this.player.x + this.player.width;
            // Convert player's y_css_bottom to y from top for collision
            const playerVisualTop = this.gameHeight - this.player.y_css_bottom - this.player.height;
            const playerVisualBottom = this.gameHeight - this.player.y_css_bottom;


            for (let i = this.hazards.length - 1; i >= 0; i--) {
                const hazard = this.hazards[i];
                
                // --- FIX: Make hazard fall DOWNWARDS ---
                hazard.y += hazard.speed; // Increase y (CSS top) to move down
                hazard.element.style.top = hazard.y + 'px';

                // Hazard's bounding box (coordinates from the top-left of gameRoot)
                const hazardLeft = hazard.x_css_left; // x is already css left
                const hazardRight = hazard.x_css_left + hazard.width;
                const hazardVisualTop = hazard.y; // y is already css top
                const hazardVisualBottom = hazard.y + hazard.height;

                // --- FIX: Corrected Collision Detection ---
                if (
                    playerRight > hazardLeft &&    // Player's right edge is past hazard's left edge
                    playerLeft < hazardRight &&     // Player's left edge is before hazard's right edge
                    playerVisualBottom > hazardVisualTop && // Player's bottom edge is below hazard's top edge
                    playerVisualTop < hazardVisualBottom    // Player's top edge is above hazard's bottom edge
                ) {
                    console.log("Collision! Game Over.");
                    this.destroy();
                    globalFailureCallback({ reason: "Hit by a falling hazard!" });
                    return; 
                }

                if (hazard.y > this.gameHeight) { // Hazard is off-screen (below)
                    hazard.element.remove();
                    this.hazards.splice(i, 1);
                    this.score++;
                }
            }

            if (this.elapsedTime >= this.gameTimeLimit) {
                console.log("Survived Falling Hazards!");
                this.destroy();
                successCallback({ fallingHazardsResult: "Survived", score: this.score });
                return;
            }

            this.animationFrameId = requestAnimationFrame(gameLoop);
        };
        this.animationFrameId = requestAnimationFrame(gameLoop);
    },

    spawnHazard: function() {
        if (!this.gameRoot || this.hazards.length > 15) return;

        const hazardElement = document.createElement('div');
        hazardElement.classList.add('fh-hazard');
        const size = Math.random() * 20 + 15;
        const xPosition = Math.random() * (this.gameWidth - size);
        
        hazardElement.style.width = size + 'px';
        hazardElement.style.height = size + 'px';
        hazardElement.style.left = xPosition + 'px';
        hazardElement.style.top = '-40px'; // Start above screen

        this.gameRoot.appendChild(hazardElement);

        this.hazards.push({
            element: hazardElement,
            x_css_left: xPosition, // Store CSS left position
            y: -40,              // Store CSS top position
            width: size,
            height: size,
            speed: Math.random() * 2 + 2.5 // Speed between 2.5 and 4.5
        });
    },

    destroy: function() {
        // ... (destroy logic remains the same)
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        if (this.boundKeyDownHandler) {
            document.removeEventListener('keydown', this.boundKeyDownHandler);
            this.boundKeyDownHandler = null;
        }
        if (this.boundKeyUpHandler) {
            document.removeEventListener('keyup', this.boundKeyUpHandler);
            this.boundKeyUpHandler = null;
        }
        this.hazards.forEach(h => {
            if (h.element && h.element.parentNode) { // Check if element exists and is in DOM
                h.element.remove();
            }
        });
        this.hazards = [];
        this.keys = {};
        console.log("FallingHazardsGame resources cleaned up.");
    }
};
