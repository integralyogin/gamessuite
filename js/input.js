// js/input.js
// A self-contained module for handling all user input.

const InputSystem = {
    // --- State ---
    game: null,
    canvas: null,
    camera: null,
    
    isSelecting: false,
    isPanning: false,
    dragStart: { x: 0, y: 0 },
    mousePos: { x: 0, y: 0 }, // World coordinates
    keys: new Set(),
    boundHandlers: {},

    // --- Initialization ---
    init: function(gameInstance) {
        this.game = gameInstance;
        this.canvas = gameInstance.canvas;
        this.camera = gameInstance.camera;

        this.addEventListeners();
        console.log("InputSystem initialized.");
    },

    addEventListeners: function() {
        this.boundHandlers = {
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            keydown: (e) => this.keys.add(e.key.toLowerCase()),
            keyup: (e) => this.keys.delete(e.key.toLowerCase()),
            wheel: (e) => this.game.handleZoom(e), // Forward zoom to game
            contextmenu: (e) => e.preventDefault()
        };
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
             const target = (event === 'keydown' || event === 'keyup') ? window : this.canvas;
             target.addEventListener(event, handler, false);
        }
    },

    // --- Event Handlers ---
    handleMouseDown: function(event) {
        const worldPos = this.game.screenToWorld(event.clientX, event.clientY);

        if (event.button === 0) { // Left-click
            this.isSelecting = true;
            this.dragStart = worldPos;
            this.game.camera.isFollowing = false;
        } 
        else if (event.button === 2) { // Right-click
            if (this.game.selectedUnits.length > 0) {
                this.game.commandSelectedUnits(worldPos);
            } else { 
                this.isPanning = true;
                this.game.camera.isFollowing = false;
                this.camera.dragStart = { x: event.clientX / this.camera.zoom + this.camera.x, y: event.clientY / this.camera.zoom + this.camera.y };
            }
        }
    },
    
    handleMouseMove: function(event) {
        this.mousePos = this.game.screenToWorld(event.clientX, event.clientY);
        if(this.isPanning) {
            this.camera.x = this.camera.dragStart.x - event.clientX / this.camera.zoom;
            this.camera.y = this.camera.dragStart.y - event.clientY / this.camera.zoom;
        }
    },

    handleMouseUp: function(event) {
        if (event.button === 0 && this.isSelecting) {
            const selectionBox = {
                x: Math.min(this.dragStart.x, this.mousePos.x),
                y: Math.min(this.dragStart.y, this.mousePos.y),
                w: Math.abs(this.dragStart.x - this.mousePos.x),
                h: Math.abs(this.dragStart.y - this.mousePos.y)
            };
            this.game.selectEntitiesInBox(selectionBox);
            this.isSelecting = false;
        } else if (event.button === 2) {
            this.isPanning = false;
        }
    },

    // --- Teardown ---
    destroy: function() {
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            const target = (event === 'keydown' || event === 'keyup') ? window : this.canvas;
            if(target) target.removeEventListener(event, handler);
        }
        console.log("InputSystem destroyed.");
    }
};

