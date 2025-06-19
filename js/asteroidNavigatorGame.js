const AsteroidNavigatorGame = {
    id: 'asteroidNavigatorGame',
    _gameState: null,
    _config: null,
    _dom: null,
    _callbacks: null,
    _eventListeners: null,
    _animationFrameId: null,

    init: function(container, successCallback, failureCallback) {
        this._callbacks = { success: successCallback, failure: failureCallback };
        this._setupDOM(container);
        this._injectCSS();
        this._initializeState();
        this._bindEventListeners();

        // Initial content spawn
        this._generateUniverseContent(0, 0, 2000, 40);

        this._gameState.running = true;
        this._gameLoop();
        this._showMessage("Welcome! Navigate the asteroid field. Watch out for the star's gravity.", 4000);
    },

    // --- SETUP METHODS ---
    _setupDOM: function(container) {
        container.innerHTML = `
            <div class="an-game-wrapper">
                <canvas id="an-gameCanvas"></canvas>
                <div class="an-ui">
                    <div>COORDINATES: <span id="an-coordinates">0, 0</span></div>
                    <div>VELOCITY: <span id="an-velocity">0</span></div>
                    <div>HULL: <span id="an-hull">100</span>%</div>
                    <div>SCORE: <span id="an-score">0</span></div>
                </div>
                <div class="an-controls">WASD: Move | S: Brake | Mouse: Aim & Shoot / Zoom</div>
                <div id="an-message" class="an-message"></div>
                <div id="an-tooltip" class="an-tooltip"></div>
            </div>
        `;

        const canvas = container.querySelector('#an-gameCanvas');
        this._dom = {
            container: container,
            canvas: canvas,
            ctx: canvas.getContext('2d'),
            ui: {
                coordinates: container.querySelector('#an-coordinates'),
                velocity: container.querySelector('#an-velocity'),
                hull: container.querySelector('#an-hull'),
                score: container.querySelector('#an-score'),
                message: container.querySelector('#an-message'),
                tooltip: container.querySelector('#an-tooltip'),
            }
        };

        this._dom.canvas.width = container.clientWidth;
        this._dom.canvas.height = container.clientHeight;
    },

    _injectCSS: function() {
        const styleId = 'an-game-style-v2';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .an-game-wrapper { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Courier New', monospace; background: #000; }
            #an-gameCanvas { display: block; background: radial-gradient(circle at center, #001122 0%, #000000 100%); }
            .an-ui, .an-controls, .an-message, .an-tooltip { position: absolute; z-index: 10; color: #00ffff; }
            .an-ui { top: 15px; left: 15px; font-size: 1em; text-shadow: 0 0 8px #00ffff; }
            .an-controls { bottom: 15px; left: 15px; font-size: 0.8em; opacity: 0.7; }
            .an-message { top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 30, 30, 0.8); padding: 15px; border: 1px solid #00ffff; border-radius: 8px; display: none; text-shadow: 0 0 8px #00ffff; }
            .an-tooltip { background: rgba(0,0,0,0.85); color: #fff; padding: 6px 10px; border-radius: 4px; border: 1px solid #fff; font-size: 0.8em; display: none; pointer-events: none; }
        `;
        document.head.appendChild(style);
        this._dom.styleElement = style;
    },

    _initializeState: function() {
        this._config = {
            player: { size: 8, acceleration: 0.08 },
            shooting: { cooldown: 100 },
            physics: { gravityConstant: 100 },
        };

        const sun = { worldX: 0, worldY: 0, size: 100, mass: 2000 };
        const playerStartPos = { x: 2000, y: 0 };
        
        const distToSun = Math.hypot(playerStartPos.x - sun.worldX, playerStartPos.y - sun.worldY);
        const orbitalSpeed = Math.sqrt((this._config.physics.gravityConstant * sun.mass) / distToSun);

        this._gameState = {
            running: false, hull: 100, score: 0, lastShot: 0,
            player: { 
                worldX: playerStartPos.x, worldY: playerStartPos.y, 
                ...this._config.player, 
                vx: 0, vy: orbitalSpeed, 
                angle: 0, invulnerable: 0 
            },
            camera: { x: 0, y: 0, smoothing: 0.1, zoom: 0.4, minZoom: 0.1, maxZoom: 2.0 },
            sun: sun,
            keys: {},
            mouse: { x: 0, y: 0, down: false },
            bullets: [], particles: [], universeObjects: [],
        };
    },

    _bindEventListeners: function() {
        this._eventListeners = {
            keydown: (e) => this._gameState.keys[e.key.toLowerCase()] = true,
            keyup: (e) => this._gameState.keys[e.key.toLowerCase()] = false,
            mousemove: (e) => {
                const canvasRect = this._dom.canvas.getBoundingClientRect();
                this._gameState.mouse.x = e.clientX - canvasRect.left;
                this._gameState.mouse.y = e.clientY - canvasRect.top;
            },
            mousedown: () => this._gameState.mouse.down = true,
            mouseup: () => this._gameState.mouse.down = false,
            resize: () => {
                this._dom.canvas.width = this._dom.container.clientWidth;
                this._dom.canvas.height = this._dom.container.clientHeight;
            },
            wheel: (e) => {
                e.preventDefault();
                const { camera, mouse } = this._gameState;
                
                const mouseWorldBefore = this._screenToWorld(mouse.x, mouse.y);

                const zoomSpeed = 0.001;
                const newZoom = camera.zoom - e.deltaY * zoomSpeed;
                camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom));
                
                const mouseWorldAfter = this._screenToWorld(mouse.x, mouse.y);

                camera.x += mouseWorldBefore.x - mouseWorldAfter.x;
                camera.y += mouseWorldBefore.y - mouseWorldAfter.y;
            },
        };
        document.addEventListener('keydown', this._eventListeners.keydown);
        document.addEventListener('keyup', this._eventListeners.keyup);
        this._dom.canvas.addEventListener('mousemove', this._eventListeners.mousemove);
        this._dom.canvas.addEventListener('mousedown', this._eventListeners.mousedown);
        this._dom.canvas.addEventListener('mouseup', this._eventListeners.mouseup);
        window.addEventListener('resize', this._eventListeners.resize);
        this._dom.canvas.addEventListener('wheel', this._eventListeners.wheel, { passive: false });
    },

    // --- GAME LOOP & UPDATE ---
    _gameLoop: function() {
        if (!this._gameState || !this._gameState.running) return;
        this._update();
        this._render();
        this._animationFrameId = requestAnimationFrame(this._gameLoop.bind(this));
    },

    _update: function() {
        this._applyGravitationalForces();
        this._updatePlayer();
        this._updateCamera();
        this._updateEntities();
        this._handleCollisions();
        this._updateUI();
        this._updateTooltip();
        this._checkWinLossConditions();
        this._generateUniverseContent(this._gameState.player.worldX, this._gameState.player.worldY, 2500 / this._gameState.camera.zoom);
    },

    _applyGravitationalForces: function() {
        const { universeObjects, player, sun } = this._gameState;
        const G = this._config.physics.gravityConstant;
        const allMovableObjects = [...universeObjects, player];

        allMovableObjects.forEach(obj => {
            const dx = sun.worldX - obj.worldX;
            const dy = sun.worldY - obj.worldY;
            const distSq = dx * dx + dy * dy;

            if (distSq < sun.size * sun.size) return;

            const distance = Math.sqrt(distSq);
            
            const acceleration = G * sun.mass / distSq;
            
            const accelX = acceleration * (dx / distance);
            const accelY = acceleration * (dy / distance);

            obj.vx += accelX;
            obj.vy += accelY;
        });
    },

    _updatePlayer: function() {
        const { player, keys, mouse } = this._gameState;
        if (player.invulnerable > 0) player.invulnerable--;

        const mouseWorld = this._screenToWorld(mouse.x, mouse.y);
        const aimingAngle = Math.atan2(mouseWorld.y - player.worldY, mouseWorld.x - player.worldX);
        let thrustAngle = 0;
        let isThrusting = false;

        if (keys['s']) {
            const speed = Math.hypot(player.vx, player.vy);
            if (speed > 0.1) {
                const brakingAngle = Math.atan2(player.vy, player.vx) + Math.PI;
                player.angle = brakingAngle;
                
                const brakeAcceleration = player.acceleration * 1.5;
                player.vx += Math.cos(brakingAngle) * brakeAcceleration;
                player.vy += Math.sin(brakingAngle) * brakeAcceleration;
                thrustAngle = brakingAngle + Math.PI;
                isThrusting = true;
            }
        } else {
            let thrustX = 0;
            let thrustY = 0;
            if (keys['w']) { thrustY = -player.acceleration; isThrusting = true; }
            if (keys['a']) { thrustX = -player.acceleration; isThrusting = true; }
            if (keys['d']) { thrustX = player.acceleration; isThrusting = true; }

            player.vx += thrustX;
            player.vy += thrustY;
            
            if (isThrusting) {
                 thrustAngle = Math.atan2(-thrustY, -thrustX);
            }

            player.angle = aimingAngle;
        }

        if (isThrusting) {
            const exhaustX = player.worldX + Math.cos(thrustAngle) * -player.size;
            const exhaustY = player.worldY + Math.sin(thrustAngle) * -player.size;
            for(let i = 0; i < 2; i++) {
                this._gameState.particles.push(this._createParticle(exhaustX, exhaustY, '#ff9900', 'exhaust', thrustAngle));
            }
        }

        player.worldX += player.vx;
        player.worldY += player.vy;

        const now = Date.now();
        if (mouse.down && now - this._gameState.lastShot > this._config.shooting.cooldown) {
            this._gameState.bullets.push(this._createBullet(player.worldX, player.worldY, aimingAngle));
            this._gameState.lastShot = now;
            for (let i = 0; i < 3; i++) this._gameState.particles.push(this._createParticle(player.worldX, player.worldY, '#ffff00', 'spark'));
        }
    },

    _updateCamera: function() {
        const { camera, player } = this._gameState;
        camera.x += (player.worldX - camera.x) * camera.smoothing;
        camera.y += (player.worldY - camera.y) * camera.smoothing;
    },

    _updateEntities: function() {
        const { bullets, particles, universeObjects } = this._gameState;
        this._gameState.bullets = bullets.filter(b => { b.worldX += b.vx; b.worldY += b.vy; return --b.life > 0; });
        this._gameState.particles = particles.filter(p => { p.worldX += p.vx; p.worldY += p.vy; p.vx *= 0.98; p.vy *= 0.98; return --p.life > 0; });
        universeObjects.forEach(obj => { 
            obj.worldX += obj.vx;
            obj.worldY += obj.vy;
            obj.rotation += obj.rotationSpeed; 
        });
    },

    _handleCollisions: function() {
        const { player, bullets, universeObjects, particles, sun } = this._gameState;

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            for (let j = universeObjects.length - 1; j >= 0; j--) {
                const obj = universeObjects[j];
                if (this._checkCollision(bullet, obj, bullet.size, obj.size)) {
                    obj.health--;
                    obj.vx += bullet.vx * 0.01;
                    obj.vy += bullet.vy * 0.01;
                    for (let k = 0; k < 3; k++) particles.push(this._createParticle(bullet.worldX, bullet.worldY, '#aaaaaa', 'spark'));
                    if (obj.health <= 0) {
                        this._gameState.score += obj.type === 'asteroid' ? 25 : 10;
                        for (let k = 0; k < 10; k++) particles.push(this._createParticle(obj.worldX, obj.worldY, '#888888', 'explosion'));
                        universeObjects.splice(j, 1);
                    }
                    bullets.splice(i, 1);
                    break; 
                }
            }
        }

        for (let i = 0; i < universeObjects.length; i++) {
            for (let j = i + 1; j < universeObjects.length; j++) {
                const objA = universeObjects[i];
                const objB = universeObjects[j];
                if (this._checkCollision(objA, objB, objA.size, objB.size)) {
                    this._resolvePhysicsCollision(objA, objB);
                }
            }
        }

        if (player.invulnerable === 0) {
            universeObjects.forEach(obj => {
                if (this._checkCollision(player, obj, player.size, obj.size)) {
                    this._damagePlayer(obj.type === 'asteroid' ? 10 : 5);
                    this._resolvePhysicsCollision(player, obj);
                }
            });
            if (this._checkCollision(player, sun, player.size, sun.size)) {
                 this._damagePlayer(100);
            }
        }
    },
    
    _resolvePhysicsCollision: function(objA, objB) {
        const dx = objB.worldX - objA.worldX;
        const dy = objB.worldY - objA.worldY;
        let distance = Math.hypot(dx, dy);
        if (distance === 0) {
            distance = 0.1;
        }

        const normalX = dx / distance;
        const normalY = dy / distance;

        const overlap = (objA.size + objB.size) - distance;
        if (overlap > 0) {
            const massA = (objA === this._gameState.player ? 2 : 1) * objA.size * objA.size;
            const massB = (objB === this._gameState.player ? 2 : 1) * objB.size * objB.size;
            const totalMass = massA + massB;
            
            objA.worldX -= normalX * overlap * (massB / totalMass);
            objA.worldY -= normalY * overlap * (massB / totalMass);
            objB.worldX += normalX * overlap * (massA / totalMass);
            objB.worldY += normalY * overlap * (massA / totalMass);
        }

        const tangentX = -normalY;
        const tangentY = normalX;

        const tanVelA = objA.vx * tangentX + objA.vy * tangentY;
        const tanVelB = objB.vx * tangentX + objB.vy * tangentY;

        const normVelA = objA.vx * normalX + objA.vy * normalY;
        const normVelB = objB.vx * normalX + objB.vy * normalY;
        
        const massA = (objA === this._gameState.player ? 2 : 1) * objA.size * objA.size;
        const massB = (objB === this._gameState.player ? 2 : 1) * objB.size * objB.size;
        
        const restitution = 0.7;

        const newNormVelA = (normVelA * (massA - massB) + (1 + restitution) * massB * normVelB) / (massA + massB);
        const newNormVelB = (normVelA * (1 + restitution) * massA + normVelB * (massB - massA)) / (massA + massB);

        objA.vx = (tangentX * tanVelA) + (normalX * newNormVelA);
        objA.vy = (tangentY * tanVelA) + (normalY * newNormVelA);
        objB.vx = (tangentX * tanVelB) + (normalX * newNormVelB);
        objB.vy = (tangentY * tanVelB) + (normalY * newNormVelB);
    },

    _damagePlayer: function(amount) {
        if (this._gameState.player.invulnerable > 0) return;
        this._gameState.hull -= amount;
        this._gameState.player.invulnerable = 60;
        
        for (let j = 0; j < 8; j++) this._gameState.particles.push(this._createParticle(this._gameState.player.worldX, this._gameState.player.worldY, '#ff4444', 'explosion'));
    },

    _checkWinLossConditions: function() {
        if (this._gameState.hull <= 0) {
            this._gameState.hull = 0;
            this._endGame(false, { reason: 'Ship hull breached!', finalScore: this._gameState.score });
        }
    },

    _endGame: function(isSuccess, data) {
        if (!this._gameState.running) return;
        this._gameState.running = false;
        this._showMessage('GAME OVER - Final Score: ' + data.finalScore, 5000);
        setTimeout(() => {
            this._callbacks.failure(data);
            this.destroy();
        }, 3000);
    },

    // --- RENDER ---
    _render: function() {
        const { ctx, canvas } = this._dom;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        this._drawSun();
        this._drawEntities(this._gameState.universeObjects, (obj, screenPos) => this._drawUniverseObject(obj, screenPos));
        this._drawEntities(this._gameState.particles, (p, screenPos) => this._drawParticle(p, screenPos));
        this._drawPlayer();
        this._drawEntities(this._gameState.bullets, (b, screenPos) => this._drawBullet(b, screenPos));
    },

    _drawSun: function() {
        const { ctx } = this._dom;
        const { sun, camera } = this._gameState;
        const screenPos = this._worldToScreen(sun.worldX, sun.worldY);
        const size = sun.size * camera.zoom;
        
        ctx.save();
        const gradient = ctx.createRadialGradient(screenPos.x, screenPos.y, size * 0.5, screenPos.x, screenPos.y, size);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    _drawEntities: function(entities, drawFunc) {
        const { canvas } = this._dom;
        const { camera } = this._gameState;
        const padding = 100 * camera.zoom;

        entities.forEach(entity => {
            const screenPos = this._worldToScreen(entity.worldX, entity.worldY);
            if (screenPos.x > -padding && screenPos.x < canvas.width + padding &&
                screenPos.y > -padding && screenPos.y < canvas.height + padding) {
                drawFunc(entity, screenPos);
            }
        });
    },

    _drawPlayer: function() {
        const { ctx } = this._dom;
        const { player, camera } = this._gameState;
        const screenPos = this._worldToScreen(player.worldX, player.worldY);
        const size = player.size * camera.zoom;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(player.angle);

        const isDamaged = player.invulnerable > 0 && player.invulnerable % 10 < 5;
        ctx.shadowColor = isDamaged ? '#ff0000' : '#00ffff';
        ctx.strokeStyle = isDamaged ? '#ff0000' : '#ffffff';
        ctx.fillStyle = `rgba(0, 255, 255, 0.2)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(0, -size / 1.5);
        ctx.lineTo(-size / 1.5, 0);
        ctx.lineTo(0, size / 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    },

    _drawUniverseObject: function(obj, screenPos) {
        const { camera } = this._gameState;
        const colors = {
            asteroid: { fill: '#88888822', stroke: '#aaaaaa', shadow: '#666666' },
            debris: { fill: '#ff660022', stroke: '#ff8822', shadow: '#ff4400' },
        };
        const color = colors[obj.type] || colors.asteroid;

        this._dom.ctx.fillStyle = color.fill;
        this._dom.ctx.strokeStyle = color.stroke;
        this._dom.ctx.shadowColor = color.shadow;
        this._dom.ctx.lineWidth = 2;
        this._dom.ctx.shadowBlur = 10;

        this._drawPolygon(screenPos.x, screenPos.y, obj.size * camera.zoom, 8, obj.rotation, true);
    },

    _drawBullet: function(bullet, screenPos) {
        const { ctx } = this._dom;
        const { camera } = this._gameState;
        const alpha = bullet.life / 80;
        const color = '#ffff00';
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, bullet.size * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    },

    _drawParticle: function(particle, screenPos) {
        const { ctx } = this._dom;
        const { camera } = this._gameState;
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, particle.size * alpha * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    },

    // --- UTILITY METHODS ---
    _updateUI: function() {
        const { player, hull, score } = this._gameState;
        this._dom.ui.coordinates.textContent = `${Math.round(player.worldX)}, ${Math.round(player.worldY)}`;
        this._dom.ui.velocity.textContent = (Math.hypot(player.vx, player.vy)).toFixed(1);
        this._dom.ui.hull.textContent = Math.max(0, Math.round(hull));
        this._dom.ui.score.textContent = score;
    },

    _updateTooltip: function() {
        const worldCoords = this._screenToWorld(this._gameState.mouse.x, this._gameState.mouse.y);
        const mouseObject = { worldX: worldCoords.x, worldY: worldCoords.y };
        let foundObject = null;

        for (const entity of this._gameState.universeObjects) {
            if (this._checkCollision(mouseObject, entity, 0, entity.size)) {
                foundObject = entity;
                break;
            }
        }
        
        if (foundObject) {
            const name = foundObject.type.charAt(0).toUpperCase() + foundObject.type.slice(1);
            let desc = foundObject.description || '';
            if (foundObject.maxHealth) {
                 desc += ` (${foundObject.health}/${foundObject.maxHealth} HP)`;
            }
            this._dom.ui.tooltip.innerHTML = `<strong>${name}</strong><br>${desc}`;
            this._dom.ui.tooltip.style.display = 'block';
            this._dom.ui.tooltip.style.left = (this._gameState.mouse.x + 15) + 'px';
            this._dom.ui.tooltip.style.top = (this._gameState.mouse.y + 15) + 'px';
        } else {
            this._dom.ui.tooltip.style.display = 'none';
        }
    },

    _showMessage: function(text, duration = 3000) {
        if (!this._dom || !this._dom.ui.message) return;
        this._dom.ui.message.textContent = text;
        this._dom.ui.message.style.display = 'block';
        setTimeout(() => {
            if (this._dom && this._dom.ui.message) {
                this._dom.ui.message.style.display = 'none';
            }
        }, duration);
    },

    _generateUniverseContent: function(centerX, centerY, radius, count = 5) {
        const { sun } = this._gameState;
        const G = this._config.physics.gravityConstant;

        if (this._gameState.universeObjects.length > 250) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (radius * 0.8) + (Math.random() * radius * 0.2);
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            const tooClose = this._gameState.universeObjects.some(obj => Math.hypot(obj.worldX - x, obj.worldY - y) < 100);
            if (tooClose) continue;

            const rand = Math.random();
            const type = rand < 0.6 ? 'debris' : 'asteroid';
            const size = type === 'debris' ? 12 : 30;
            const health = type === 'asteroid' ? 3 : 2;
            
            const distToSun = Math.hypot(x - sun.worldX, y - sun.worldY);
            if (distToSun < sun.size * 1.5) continue; 

            const orbitalSpeed = Math.sqrt((G * sun.mass) / distToSun);
            const tangentAngle = Math.atan2(y - sun.worldY, x - sun.worldX) + Math.PI / 2;

            this._gameState.universeObjects.push({
                worldX: x, worldY: y, type, size,
                vx: Math.cos(tangentAngle) * orbitalSpeed + (Math.random() - 0.5) * 0.2,
                vy: Math.sin(tangentAngle) * orbitalSpeed + (Math.random() - 0.5) * 0.2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                health: health, maxHealth: health, 
                description: type === 'asteroid' ? 'A large, durable space rock.' : 'Smaller, weaker rock fragments.'
            });
        }
    },

    _createBullet: (x, y, angle) => {
        const { player } = AsteroidNavigatorGame._gameState;
        return {
            worldX: x, worldY: y, size: 3,
            vx: player.vx + Math.cos(angle) * 20,
            vy: player.vy + Math.sin(angle) * 20,
            life: 80,
        }
    },

    _createParticle: (x, y, color, type, angle = 0) => {
        const p = {
            worldX: x, worldY: y, color, type, life: 30, maxLife: 30,
            size: 2 + Math.random() * 2,
            vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        };
        if(type === 'explosion') { p.vx *= 2.5; p.vy *= 2.5; p.life *= 1.5; p.maxLife *= 1.5; }
        if(type === 'spark') { p.vx *= 1.5; p.vy *= 1.5; }
        if(type === 'exhaust') {
            const speed = 3 + Math.random() * 2;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = 15 + Math.random() * 10;
            p.maxLife = p.life;
            p.size = 1 + Math.random();
        }
        return p;
    },

    _worldToScreen: function(worldX, worldY) {
        if (!this._gameState || !this._dom) return { x: 0, y: 0 };
        const { camera } = this._gameState;
        const { canvas } = this._dom;
        return {
            x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
            y: (worldY - camera.y) * camera.zoom + canvas.height / 2
        };
    },

    _screenToWorld: function(screenX, screenY) {
        if (!this._gameState || !this._dom) return { x: 0, y: 0 };
        const { camera } = this._gameState;
        const { canvas } = this._dom;
        return {
            x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
            y: (screenY - canvas.height / 2) / camera.zoom + camera.y
        };
    },

    _checkCollision: (obj1, obj2, r1, r2) => {
        if (!obj1 || !obj2) return false;
        const dx = obj1.worldX - obj2.worldX;
        const dy = obj1.worldY - obj2.worldY;
        const rSum = r1 + r2;
        return (dx * dx + dy * dy) < (rSum * rSum);
    },

    _drawPolygon: function(x, y, size, sides, rotation, fill) {
        const { ctx } = this._dom;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides;
            ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * size, Math.sin(angle) * size);
        }
        ctx.closePath();
        if (fill) ctx.fill();
        ctx.stroke();
        ctx.restore();
    },

    // --- DESTRUCTION ---
    destroy: function() {
        if (this._gameState) this._gameState.running = false;
        if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);

        if (this._eventListeners) {
            document.removeEventListener('keydown', this._eventListeners.keydown);
            document.removeEventListener('keyup', this._eventListeners.keyup);
            window.removeEventListener('resize', this._eventListeners.resize);
            if (this._dom && this._dom.canvas) {
                this._dom.canvas.removeEventListener('mousemove', this._eventListeners.mousemove);
                this._dom.canvas.removeEventListener('mousedown', this._eventListeners.mousedown);
                this._dom.canvas.removeEventListener('mouseup', this._eventListeners.mouseup);
                this._dom.canvas.removeEventListener('wheel', this._eventListeners.wheel);
            }
        }

        if (this._dom) {
            if (this._dom.styleElement) this._dom.styleElement.remove();
            if (this._dom.container) this._dom.container.innerHTML = '';
        }

        this._gameState = null;
        this._config = null;
        this._dom = null;
        this._callbacks = null;
        this._eventListeners = null;
    }
};

