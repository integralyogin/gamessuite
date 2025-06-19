// js/TownDesignerGame.js
// A visual editor for creating and modifying town layouts.

const TownDesignerGame = {
    id: 'TownDesignerGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    dataUrl: 'town_layout.json',

    // Core components
    mainView: null,
    mapContent: null,
    editorPanel: null,

    // Data
    layoutData: {
        map_settings: {},
        places: []
    },
    
    // State
    selectedPlaceId: null,
    isDragging: false,
    isResizing: false,
    dragResizeMode: null, // 'move', 'se-resize', etc.
    dragStartPos: { x: 0, y: 0 },
    originalPlaceRect: { x: 0, y: 0, width: 0, height: 0 },

    // Pan & Zoom
    currentZoom: 1, minZoom: 0.2, maxZoom: 2,
    panX: 0, panY: 0, isPanning: false,
    lastPanPosition: { x: 0, y: 0 },

    async init(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log("TownDesignerGame: Initializing.");
        
        try {
            await this.loadTownData();
            this.renderLayout();
            this.renderEditorPanel();
            this.redrawMap();
            this.setupListeners();
        } catch (error) {
            console.error("TownDesignerGame: Initialization failed.", error);
            this.container.innerHTML = `<div class="designer-error">Failed to load town data: ${error.message}</div>`;
        }
    },

    async loadTownData() {
        console.log(`TownDesignerGame: Fetching layout from ${this.dataUrl}?t=${new Date().getTime()}`);
        const response = await fetch(`${this.dataUrl}?t=${new Date().getTime()}`); // Cache-bust
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.layoutData = await response.json();
    },

    renderLayout() {
        this.container.innerHTML = '';
        this.container.className = 'designer-container';
        this.applyStyles();

        this.mainView = document.createElement('div');
        this.mainView.className = 'designer-main-view';
        
        this.mapContent = document.createElement('div');
        this.mapContent.className = 'designer-map-content';
        this.mapContent.style.width = `${this.layoutData.map_settings.width || 2000}px`;
        this.mapContent.style.height = `${this.layoutData.map_settings.height || 2000}px`;

        this.editorPanel = document.createElement('div');
        this.editorPanel.className = 'designer-editor-panel';
        
        this.mainView.appendChild(this.mapContent);
        this.container.appendChild(this.mainView);
        this.container.appendChild(this.editorPanel);
    },

    redrawMap() {
        if (!this.mapContent) return;
        this.mapContent.innerHTML = '';
        this.layoutData.places.forEach(place => {
            const placeEl = document.createElement('div');
            placeEl.className = 'designer-place-item';
            placeEl.dataset.id = place.id;
            placeEl.style.left = `${place.x}px`;
            placeEl.style.top = `${place.y}px`;
            placeEl.style.width = `${place.width || 160}px`;
            placeEl.style.height = `${place.height || 160}px`;

            if (place.id === this.selectedPlaceId) {
                placeEl.classList.add('selected');
                // Add resize handles for the selected item
                const handles = ['se']; // Add 'nw', 'ne', 'sw' for more handles
                handles.forEach(handlePos => {
                    const handleEl = document.createElement('div');
                    handleEl.className = `resize-handle ${handlePos}`;
                    placeEl.appendChild(handleEl);
                });
            }

            placeEl.innerHTML += `
                <img src="${place.image}" alt="${place.name}" onerror="this.src='images/placeholder.png'">
                <p>${place.name}</p>
            `;
            this.mapContent.appendChild(placeEl);
        });
        this.applyMapTransform();
    },
    
    renderEditorPanel() {
        if (!this.editorPanel) return;
        const selectedPlace = this.getSelectedPlace();
        
        let content = `
            <div class="panel-header">
                <h3>Town Designer</h3>
                <div class="panel-buttons">
                    <button id="designer-add-btn">Add Place</button>
                    <button id="designer-save-btn">Save Layout</button>
                </div>
            </div>
        `;

        if (selectedPlace) {
            content += `
                <div class="panel-content">
                    <h4>Edit: ${this.escapeHtml(selectedPlace.name)}</h4>
                    <label>ID: <input type="text" readonly value="${selectedPlace.id}"></label>
                    <label>Name: <input type="text" data-prop="name" value="${this.escapeHtml(selectedPlace.name)}"></label>
                    <label>Image URL: <input type="text" data-prop="image" value="${this.escapeHtml(selectedPlace.image)}"></label>
                    <label>Game ID: <input type="text" data-prop="targetGameId" value="${this.escapeHtml(selectedPlace.targetGameId)}"></label>
                    <label>X: <input type="number" data-prop="x" value="${selectedPlace.x}"></label>
                    <label>Y: <input type="number" data-prop="y" value="${selectedPlace.y}"></label>
                    <label>Width: <input type="number" data-prop="width" value="${selectedPlace.width}"></label>
                    <label>Height: <input type="number" data-prop="height" value="${selectedPlace.height}"></label>
                    <button id="designer-delete-btn" class="danger-btn">Delete Place</button>
                </div>
            `;
        } else {
            content += `<div class="panel-content-placeholder">Select a place to edit its properties.</div>`;
        }
        
        this.editorPanel.innerHTML = content;
        this.bindPanelListeners();
    },

    setupListeners() {
        this.mainView.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.mainView.addEventListener('wheel', this.handleZoom.bind(this), { passive: false });
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    },

    bindPanelListeners() {
        const addBtn = document.getElementById('designer-add-btn');
        if (addBtn) addBtn.onclick = () => this.addNewPlace();

        const saveBtn = document.getElementById('designer-save-btn');
        if (saveBtn) saveBtn.onclick = () => this.saveLayout();

        const deleteBtn = document.getElementById('designer-delete-btn');
        if (deleteBtn) deleteBtn.onclick = () => this.deleteSelectedPlace();
        
        this.editorPanel.querySelectorAll('input[data-prop]').forEach(input => {
            input.onchange = (e) => this.updatePlaceProperty(e.target.dataset.prop, e.target.value, e.target.type);
        });
    },

    // --- Interaction Handlers ---

    handleMouseDown(e) {
        const placeEl = e.target.closest('.designer-place-item');
        
        if (placeEl) {
            e.stopPropagation();
            const placeId = placeEl.dataset.id;
            
            // If clicking a different place, select it first
            if (placeId !== this.selectedPlaceId) {
                this.selectPlace(placeId);
            }

            this.dragStartPos = { x: e.clientX, y: e.clientY };
            const place = this.getSelectedPlace();
            this.originalPlaceRect = { x: place.x, y: place.y, width: place.width, height: place.height };

            if (e.target.classList.contains('resize-handle')) {
                this.isResizing = true;
                this.dragResizeMode = 'resize'; // Simplfied for one handle
            } else {
                this.isDragging = true;
                this.dragResizeMode = 'move';
            }

        } else {
            // Clicked on map background
            this.selectPlace(null); // Deselect
            this.isPanning = true;
            this.mainView.classList.add('panning');
            this.lastPanPosition = { x: e.clientX, y: e.clientY };
        }
    },

    handleMouseMove(e) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastPanPosition.x;
            const dy = e.clientY - this.lastPanPosition.y;
            this.panX += dx;
            this.panY += dy;
            this.lastPanPosition = { x: e.clientX, y: e.clientY };
            this.applyMapTransform();
        } else if (this.isDragging || this.isResizing) {
            const dx = (e.clientX - this.dragStartPos.x) / this.currentZoom;
            const dy = (e.clientY - this.dragStartPos.y) / this.currentZoom;
            const place = this.getSelectedPlace();

            if (this.isDragging) {
                place.x = Math.round(this.originalPlaceRect.x + dx);
                place.y = Math.round(this.originalPlaceRect.y + dy);
            } else if (this.isResizing) {
                place.width = Math.max(50, Math.round(this.originalPlaceRect.width + dx));
                place.height = Math.max(50, Math.round(this.originalPlaceRect.height + dy));
            }
            this.redrawMap();
            this.renderEditorPanel(); // Update coordinate inputs
        }
    },

    handleMouseUp(e) {
        this.isPanning = false;
        this.isDragging = false;
        this.isResizing = false;
        this.mainView.classList.remove('panning');
    },

    handleZoom(e) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const oldZoom = this.currentZoom;
        this.currentZoom = e.deltaY < 0 
            ? Math.min(this.maxZoom, oldZoom + zoomSpeed) 
            : Math.max(this.minZoom, oldZoom - zoomSpeed);

        const rect = this.mainView.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        this.panX = mouseX - ((mouseX - this.panX) / oldZoom * this.currentZoom);
        this.panY = mouseY - ((mouseY - this.panY) / oldZoom * this.currentZoom);
        
        this.applyMapTransform();
    },

    applyMapTransform() {
        if(this.mapContent) {
            this.mapContent.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.currentZoom})`;
        }
    },

    // --- Data & State Management ---

    selectPlace(placeId) {
        this.selectedPlaceId = placeId;
        this.redrawMap();
        this.renderEditorPanel();
    },

    getSelectedPlace() {
        if (!this.selectedPlaceId) return null;
        return this.layoutData.places.find(p => p.id === this.selectedPlaceId);
    },
    
    updatePlaceProperty(prop, value, type) {
        const place = this.getSelectedPlace();
        if (!place) return;

        if (type === 'number') {
            place[prop] = Number(value);
        } else {
            place[prop] = value;
        }
        
        // If a property that affects display is changed (name, image), redraw the map
        if (['name', 'image', 'x', 'y', 'width', 'height'].includes(prop)) {
            this.redrawMap();
        }
    },

    addNewPlace() {
        const newId = `place_${Date.now()}`;
        // Add new place in the center of the current view
        const centerX = (-this.panX + this.mainView.clientWidth / 2) / this.currentZoom;
        const centerY = (-this.panY + this.mainView.clientHeight / 2) / this.currentZoom;

        const newPlace = {
            id: newId,
            name: "New Place",
            image: "images/placeholder.png",
            targetGameId: "UnknownGame",
            x: Math.round(centerX - 80),
            y: Math.round(centerY - 80),
            width: 160,
            height: 160
        };
        this.layoutData.places.push(newPlace);
        this.selectPlace(newId); // Redraws map and panel
    },

    deleteSelectedPlace() {
        const place = this.getSelectedPlace();
        if (!place) return;
        
        if (confirm(`Are you sure you want to delete "${place.name}"?`)) {
            this.layoutData.places = this.layoutData.places.filter(p => p.id !== this.selectedPlaceId);
            this.selectPlace(null); // Deselect, redraws map and panel
        }
    },

    saveLayout() {
        try {
            const jsonString = JSON.stringify(this.layoutData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'town_layout.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert("Layout file 'town_layout.json' has been downloaded.\nPlease replace the existing file on your server with this new one.");

        } catch (error) {
            console.error("Failed to save layout:", error);
            alert("An error occurred while trying to generate the save file.");
        }
    },

    // --- Utilities ---
    
    escapeHtml(unsafe) {
        if (unsafe == null) return "";
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    },
    
    applyStyles() {
        let style = document.getElementById('townDesignerGameStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'townDesignerGameStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .designer-container { display: flex; width: 100%; height: 100%; background: #2c3e50; }
            .designer-main-view { flex-grow: 1; position: relative; overflow: hidden; cursor: grab; }
            .designer-main-view.panning { cursor: grabbing; }
            .designer-map-content {
                transform-origin: top left;
                position: relative;
                background-color: #34495e;
                background-image:
                    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
                background-size: 20px 20px;
            }
            .designer-place-item {
                position: absolute; border: 2px solid #95a5a6; background: rgba(236, 240, 241, 0.9);
                border-radius: 5px; padding: 5px; cursor: move; user-select: none; box-sizing: border-box;
                display: flex; flex-direction: column; align-items: center;
            }
            .designer-place-item.selected { border-color: #3498db; border-width: 3px; z-index: 10; }
            .designer-place-item img { width: 100%; height: auto; aspect-ratio: 1/1; object-fit: cover; pointer-events: none; border-radius: 3px; }
            .designer-place-item p { margin: 5px 0 0; font-size: 12px; font-weight: bold; color: #2c3e50; pointer-events: none; text-align: center; }
            .resize-handle {
                position: absolute; width: 12px; height: 12px; background: #3498db; border: 2px solid white;
                border-radius: 50%; z-index: 11;
            }
            .resize-handle.se { bottom: -8px; right: -8px; cursor: se-resize; }
            
            .designer-editor-panel {
                width: 300px; flex-shrink: 0; background: #ecf0f1; color: #2c3e50;
                display: flex; flex-direction: column; z-index: 20; box-shadow: -3px 0 10px rgba(0,0,0,0.2);
            }
            .panel-header { padding: 10px; background: #bdc3c7; border-bottom: 1px solid #95a5a6; }
            .panel-header h3 { margin: 0 0 10px; }
            .panel-buttons { display: flex; gap: 10px; }
            .panel-buttons button { flex-grow: 1; padding: 8px; border: none; border-radius: 3px; cursor: pointer; background: #3498db; color: white; font-weight: bold; }
            .panel-buttons button:hover { background: #2980b9; }
            .panel-content { padding: 10px; overflow-y: auto; flex-grow: 1; }
            .panel-content-placeholder { padding: 20px; text-align: center; color: #7f8c8d; }
            .panel-content label { display: block; margin-bottom: 12px; font-size: 12px; font-weight: bold; }
            .panel-content input { width: 100%; padding: 6px; border: 1px solid #bdc3c7; border-radius: 3px; margin-top: 3px; box-sizing: border-box; }
            .panel-content input[readonly] { background: #dfe4ea; }
            .danger-btn { width: 100%; background: #e74c3c !important; margin-top: 10px; }
            .danger-btn:hover { background: #c0392b !important; }
            .designer-error { padding: 20px; font-size: 1.2em; color: #e74c3c; text-align: center; }
        `;
    },

    destroy() {
        console.log("TownDesignerGame: Destroying...");
        // In a real app, you might want to remove the specific event listeners
        // but clearing innerHTML is often sufficient for simple cases.
        if (this.container) this.container.innerHTML = '';
    }
};

