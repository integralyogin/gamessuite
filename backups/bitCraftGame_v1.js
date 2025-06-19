// js/bitCraft.js
// A clean, reusable foundation for a 2D strategy game.
// Version 4.0: The Clean Slate

const bitCraftGame = {
    id: 'bitCraftGame',
    container: null,
    successCallback: null,
    failureCallback: null,

    // =================================================================================
    // --- GAME STATE ---
    // All variables that define the current state of the game world.
    // =================================================================================
    canvas: null,
    sideMenu: null,
    ctx: null,
    gameLoopId: null,
    
    gameObjects: [],
    playerUnits: [],
    selectedUnits: [],

    camera: {
        x: 0,
        y: 0,
        zoom: 1,
        isFollowing: false,
        dragStart: { x: 0, y: 0 }
    },
    
    input: {
        isSelecting: false,     // For selection box
        isPanning: false,       // For manual camera panning
        dragStart: { x: 0, y: 0 },
        mousePos: { x: 0, y: 0 },
        keys: new Set()
    },

    boundHandlers: {},

    // =================================================================================
    // --- INITIALIZATION ---
    // Functions to set up the game canvas, objects, and event listeners.
    // =================================================================================
    init: function(container, successCallback, failureCallback) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        
        console.log("bitCraftGame (v4.0 Clean Slate): Initializing.");
        this.render();
        this.startGame();
    },

    render: function() {
        this.container.innerHTML = `
            <div id="bitcraft-container" style="position: relative; width: 100%; height: 100%; display: flex; font-family: 'Courier New', Courier, monospace;">
                <canvas id="bitcraft-canvas" style="background-color: #0d0d0d; cursor: default; flex-grow: 1;"></canvas>
                <div id="bitcraft-side-menu" style="width: 250px; height: 100%; background-color: #1f1f1f; border-left: 2px solid #333; color: #fff; padding: 15px; box-sizing: border-box; display: none; flex-shrink: 0;">
                    <h2>Selection Details</h2>
                    <hr style="border-color: #333;">
                    <p id="side-menu-content">Details for selected units will appear here.</p>
                     <button id="bitcraft-exit-btn" style="position: absolute; bottom: 10px; right: 10px; padding: 5px 10px; font-size: 12px; cursor: pointer; background-color: #522; border: 1px solid #a44; color: #fff;">Exit</button>
                </div>
            </div>
        `;
        document.getElementById('bitcraft-exit-btn').onclick = () => this.successCallback({ message: 'Exited bitCraft' });
    },

    startGame: function() {
        this.canvas = document.getElementById('bitcraft-canvas');
        this.sideMenu = document.getElementById('bitcraft-side-menu');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();

        // Create initial units for testing
        this.playerUnits.push(this.createUnit(this.canvas.width / 2 - 30, this.canvas.height / 2, '#ffff00'));
        this.playerUnits.push(this.createUnit(this.canvas.width / 2 + 30, this.canvas.height / 2, '#00ffff'));
        this.gameObjects = [...this.playerUnits];
        
        // Center the camera
        this.camera.x = this.canvas.width / 2;
        this.camera.y = this.canvas.height / 2;
        
        this.addEventListeners();
        this.gameLoop();
    },

    createUnit: function(x, y, color) {
        return {
            id: `unit_${Math.random()}`,
            x: x, y: y, size: 10, color: color,
            target: null, speed: 2
        };
    },

    addEventListeners: function() {
        // Bind 'this' to handlers to ensure they have the correct context
        this.boundHandlers = {
            resize: this.resizeCanvas.bind(this),
            wheel: this.handleZoom.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            keydown: (e) => this.input.keys.add(e.key.toLowerCase()),
            keyup: (e) => this.input.keys.delete(e.key.toLowerCase()),
            contextmenu: (e) => e.preventDefault()
        };

        window.addEventListener('resize', this.boundHandlers.resize);
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel);
        this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
        window.addEventListener('keydown', this.boundHandlers.keydown);
        window.addEventListener('keyup', this.boundHandlers.keyup);
    },

    resizeCanvas: function() {
        const container = document.getElementById('bitcraft-container');
        if (!container || !this.canvas) return;
        
        const menuWidth = this.sideMenu.style.display === 'block' ? this.sideMenu.offsetWidth : 0;
        this.canvas.width = container.offsetWidth - menuWidth;
        this.canvas.height = container.offsetHeight;
    },

    // =================================================================================
    // --- INPUT HANDLING ---
    // All functions related to processing player input.
    // =================================================================================
    handleMouseDown: function(event) {
        const worldPos = this.screenToWorld(event.clientX, event.clientY);

        if (event.button === 0) { // Left-click: Start selection drag
            this.input.isSelecting = true;
            this.input.dragStart = worldPos;
            this.camera.isFollowing = false;
        } 
        else if (event.button === 2) { // Right-click: Issue command or start pan
            if (this.selectedUnits.length > 0) {
                 for (const unit of this.selectedUnits) { unit.target = worldPos; }
                this.camera.isFollowing = true;
            } else { 
                this.input.isPanning = true;
                this.camera.isFollowing = false;
                this.camera.dragStart.x = event.clientX / this.camera.zoom + this.camera.x;
                this.camera.dragStart.y = event.clientY / this.camera.zoom + this.camera.y;
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
        if (event.button === 0) { // Left-click release: Finalize selection
            this.selectUnitsInBox();
            this.input.isSelecting = false;
        } else if (event.button === 2) { // Right-click release: Stop panning
            this.input.isPanning = false;
        }
    },

    handleZoom: function(event) {
        event.preventDefault();
        const zoomIntensity = 0.1;
        const minZoom = 0.2;
        const maxZoom = 5;
        const wheel = event.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(wheel * zoomIntensity);

        const newZoom = this.camera.zoom * zoomFactor;
        if (newZoom < minZoom || newZoom > maxZoom) return;

        const worldPos = this.screenToWorld(event.clientX, event.clientY);
        
        this.camera.x = worldPos.x - (worldPos.x - this.camera.x) / zoomFactor;
        this.camera.y = worldPos.y - (worldPos.y - this.camera.y) / zoomFactor;
        this.camera.zoom = newZoom;
    },

    selectUnitsInBox: function() {
        this.selectedUnits = [];
        const start = this.input.dragStart;
        const end = this.input.mousePos;

        const selectionBox = {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            w: Math.abs(start.x - end.x),
            h: Math.abs(start.y - end.y)
        };

        if (selectionBox.w < 5 && selectionBox.h < 5) {
            let clickedUnit = null;
            for (let i = this.playerUnits.length - 1; i >= 0; i--) {
                if (this.isPointInObject(start, this.playerUnits[i])) {
                    clickedUnit = this.playerUnits[i];
                    break;
                }
            }
            if (clickedUnit) { this.selectedUnits.push(clickedUnit); }
        } else {
            for (const unit of this.playerUnits) {
                if (unit.x > selectionBox.x && unit.x < selectionBox.x + selectionBox.w &&
                    unit.y > selectionBox.y && unit.y < selectionBox.y + selectionBox.h) {
                    this.selectedUnits.push(unit);
                }
            }
        }
        
        if (this.selectedUnits.length > 0) {
            document.getElementById('side-menu-content').textContent = `${this.selectedUnits.length} unit(s) selected.`;
            this.sideMenu.style.display = 'block';
        } else {
            this.sideMenu.style.display = 'none';
        }
        this.resizeCanvas();
    },

    // =================================================================================
    // --- UPDATE (Game Logic) ---
    // Functions that run every frame to update the state of the game.
    // =================================================================================
    gameLoop: function() {
        if (!this.canvas) return;
        this.update();
        this.draw();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    },

    update: function() {
        this.handleCameraPanWithKeys();
        this.updateUnitMovement();
        this.applyUnitSeparation();
        this.updateCameraFollow();
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

    updateUnitMovement: function() {
         for (const unit of this.playerUnits) {
            if (unit.target) {
                const dx = unit.target.x - unit.x;
                const dy = unit.target.y - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < unit.speed) {
                    unit.x = unit.target.x;
                    unit.y = unit.target.y;
                    unit.target = null;
                } else {
                    unit.x += dx / dist * unit.speed;
                    unit.y += dy / dist * unit.speed;
                }
            }
        }
    },
    
    applyUnitSeparation: function() {
        for (let i = 0; i < this.playerUnits.length; i++) {
            for (let j = i + 1; j < this.playerUnits.length; j++) {
                const u1 = this.playerUnits[i];
                const u2 = this.playerUnits[j];
                const dx = u2.x - u1.x;
                const dy = u2.y - u1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const min_dist = u1.size; 

                if (dist > 0 && dist < min_dist) {
                    const overlap = (min_dist - dist) / 2;
                    const pushX = (dx / dist) * overlap;
                    const pushY = (dy / dist) * overlap;

                    u1.x -= pushX; u1.y -= pushY;
                    u2.x += pushX; u2.y += pushY;
                }
            }
        }
    },
    
    updateCameraFollow: function() {
        if (!this.camera.isFollowing || this.selectedUnits.length === 0) return;
        
        let totalX = 0, totalY = 0;
        for (const unit of this.selectedUnits) { totalX += unit.x; totalY += unit.y; }
        const centroid = { x: totalX / this.selectedUnits.length, y: totalY / this.selectedUnits.length };

        const easing = 0.05;
        this.camera.x += (centroid.x - this.camera.x) * easing;
        this.camera.y += (centroid.y - this.camera.y) * easing;
    },

    // =================================================================================
    // --- DRAW (Rendering) ---
    // Functions that draw the current game state to the canvas.
    // =================================================================================
    draw: function() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        for (const obj of this.gameObjects) { this.drawObject(obj); }
        for (const unit of this.selectedUnits) { this.drawSelectionHighlight(unit); }
        if (this.input.isSelecting) { this.drawSelectionBox(); }
        
        this.ctx.restore();
    },
    
    drawObject: function(obj) {
        this.ctx.fillStyle = obj.color;
        this.ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
    },

    drawSelectionHighlight: function(unit) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2 / this.camera.zoom;
        this.ctx.beginPath();
        this.ctx.arc(unit.x, unit.y, unit.size, 0, Math.PI * 2);
        this.ctx.stroke();
    },
    
    drawSelectionBox: function() {
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        this.ctx.lineWidth = 1 / this.camera.zoom;
        
        const start = this.input.dragStart;
        const end = this.input.mousePos;
        const rect = {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            w: Math.abs(start.x - end.x),
            h: Math.abs(start.y - end.y)
        };
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    },

    // =================================================================================
    // --- HELPERS & TEARDOWN ---
    // Utility functions and cleanup logic.
    // =================================================================================
    isPointInObject: function(point, object) {
        const dist = Math.sqrt(Math.pow(point.x - object.x, 2) + Math.pow(point.y - object.y, 2));
        return dist < object.size / 2;
    },
    
    screenToWorld: function(screenX, screenY) {
        if (!this.canvas) return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const y = (screenY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return { x, y };
    },
    
    destroy: function() {
        console.log("bitCraftGame (Pixel Explorer): Destroying.");
        if (this.gameLoopId) { cancelAnimationFrame(this.gameLoopId); }
        
        window.removeEventListener('resize', this.boundHandlers.resize);
        window.removeEventListener('keydown', this.boundHandlers.keydown);
        window.removeEventListener('keyup', this.boundHandlers.keyup);
        if(this.canvas) {
            this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
            this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
            this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
            this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
            this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
        }

        this.canvas = null;
        this.container.innerHTML = '';
    }
};

