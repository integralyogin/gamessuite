// js/townHubGame.js
const TownHubGame = {
    id: 'TownHubGame',
    container: null,
    successCallback: null, 
    failureCallback: null,
    sharedData: null,
    dataUrl: 'town_layout.json', // Path to the new JSON data file

    mainView: null, 
    mapContent: null, 
    subGameOverlayContainer: null, 
    subGameContentDiv: null,

    places: [], // This will be populated from the JSON file

    currentZoom: 0.8, minZoom: 0.5, maxZoom: 3,
    panX: -200, panY: -200, isPanning: false,
    lastPanPosition: { x: 0, y: 0 },
    activeSubGameModule: null,

    async init(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;
        console.log("TownHubGame: Initializing. SharedData:", JSON.parse(JSON.stringify(this.sharedData)));
        
        this.renderLayout(); // Create the basic HTML structure first

        try {
            // Load data from the external file before proceeding
            await this.loadTownData();

            // Now that data is loaded, populate the map and set up interactions
            this.populatePlaces();
            this.applyMapTransform();
            this.setupZoomPanListeners();
            if (this.subGameOverlayContainer) this.subGameOverlayContainer.style.display = 'none';
            this.toggleTownInteraction(true); 

            if (this.sharedData.lastSubGameResult && this.sharedData.lastSubGameResult.source === 'GameManagerSequence') {
                console.log("TownHubGame: Returned from a GameManager sequence. Result:", JSON.parse(JSON.stringify(this.sharedData.lastSubGameResult)));
                delete this.sharedData.lastSubGameResult;
            }
        } catch (error) {
            console.error("TownHubGame: Initialization failed due to data loading error.", error);
            // Display an error message in the container
            this.container.innerHTML = `<div style="color: red; padding: 20px;">Failed to load town data: ${error.message}</div>`;
            if (this.failureCallback) {
                this.failureCallback({ reason: "Data loading failed" });
            }
        }
    },

    async loadTownData() {
        console.log(`TownHubGame: Fetching town data from ${this.dataUrl}`);
        const response = await fetch(this.dataUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Populate places and apply map settings from the loaded data
        this.places = data.places || [];
        if (data.map_settings && this.mapContent) {
            this.mapContent.style.width = `${data.map_settings.width || 1400}px`;
            this.mapContent.style.height = `${data.map_settings.height || 1400}px`;
            this.mapContent.style.backgroundColor = data.map_settings.background_color || '#dcec08';
        }
        console.log("TownHubGame: Town data loaded successfully.");
    },

    renderLayout: function() { 
        this.container.innerHTML = ''; 
        this.container.classList.add('town-hub-container'); 
        this.container.style.position = 'relative'; 

        this.mainView = document.createElement('div');
        this.mainView.className = 'town-main-view-port'; 
        this.container.appendChild(this.mainView);

        this.mapContent = document.createElement('div');
        this.mapContent.className = 'town-map-content';
        this.mainView.appendChild(this.mapContent);

        this.subGameOverlayContainer = document.createElement('div');
        this.subGameOverlayContainer.className = 'sub-game-overlay-container';
        
        this.subGameContentDiv = document.createElement('div');
        this.subGameContentDiv.className = 'sub-game-actual-content';
        this.subGameOverlayContainer.appendChild(this.subGameContentDiv);
        
        this.container.appendChild(this.subGameOverlayContainer); 

        this.applyStyles();
    },

    applyStyles: function() {
        let style = document.getElementById('townHubGameGlobalStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'townHubGameGlobalStyle'; 
            document.head.appendChild(style);
        }
        style.textContent = `
            .town-hub-container {
                width: 100%; height: 100%;
                background-color: #334433;
                overflow: hidden;
                position: relative;
            }
            .town-main-view-port {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                overflow: hidden;
                cursor: grab;
                z-index: 1;
            }
            .town-main-view-port.panning { cursor: grabbing; }
            .town-map-content { 
                transform-origin: top left; 
                background-repeat: repeat; 
                position: relative; 
            }
            .town-place-item { 
                position: absolute; 
                border: 2px solid #8B4513; 
                background-color: rgba(245, 222, 179, 0.9); 
                border-radius: 8px; padding: 8px; text-align: center; 
                cursor: pointer; 
                transition: transform 0.1s ease, box-shadow 0.1s ease; 
                box-shadow: 3px 3px 5px rgba(0,0,0,0.3); 
                display: flex; flex-direction: column; align-items: center; 
                user-select: none;
                box-sizing: border-box; /* Ensures padding is included in width/height */
            }
            .town-place-item:hover { 
                transform: scale(1.45) translateZ(0); 
                box-shadow: 5px 5px 10px rgba(0,0,0,0.4); 
                z-index: 10; 
            }
            .town-place-item img { 
                width: 100%; height: auto;
                aspect-ratio: 1 / 1; /* Maintain a square aspect ratio */
                border-radius: 4px; object-fit: cover; 
                margin-bottom: 5px; border: 1px solid #ccaa88; 
                pointer-events: none; 
            }
            .town-place-item p.place-name { 
                font-size: 1.3em; font-weight: bold; color: #542a00; 
                margin: 0; word-wrap: break-word; 
                pointer-events: none; 
            }
            .sub-game-overlay-container { 
                position: absolute; top: 50%; left: 50%; 
                transform: translate(-50%, -50%); 
                width: 95%; height: 95%; 
                background-color: rgba(30, 30, 50, 0.85); 
                border: 3px solid #6a6a8c; 
                border-radius: 10px; 
                box-shadow: 0 0 30px rgba(0,0,0,0.6); 
                z-index: 1000;
                display: none; 
                padding: 5px; 
                box-sizing: border-box; 
            }
            .sub-game-actual-content { 
                width: 100%;
                height: 100%;
                overflow: auto; 
                background-color: #fff; 
                border-radius: 5px; 
            }
        `;
    },

    populatePlaces: function() { 
        this.mapContent.innerHTML = ''; 
        console.log("TownHubGame: Populating places. Total places:", this.places.length);
        this.places.forEach(place => {
            const placeElement = document.createElement('div');
            placeElement.className = 'town-place-item';
            placeElement.style.left = `${place.x}px`;
            placeElement.style.top = `${place.y}px`;
            // Set width and height from JSON data
            placeElement.style.width = `${place.width || 160}px`; 
            // The height of the card will be determined by its content and aspect ratio of the image
            
            placeElement.setAttribute('data-place-id', place.id); 
            
            const placeImage = document.createElement('img');
            placeImage.src = place.image;
            placeImage.alt = place.name;
            placeImage.onerror = () => { 
                placeImage.src = 'images/placeholder.png';
                console.warn(`Failed to load image: ${place.image}. Using placeholder.`);
            };

            const placeName = document.createElement('p');
            placeName.className = 'place-name';
            placeName.textContent = place.name;

            placeElement.appendChild(placeImage);
            placeElement.appendChild(placeName);

            placeElement.onclick = (e) => {
                if (this.isPanning && e.detail > 0) { 
                    return; // Ignore clicks that are likely part of a pan-drag
                }
                e.stopPropagation(); 
                this.enterPlace(place);
            };
            this.mapContent.appendChild(placeElement);
        });
    },

    // --- All other functions (setupZoomPanListeners, enterPlace, destroy, etc.) remain unchanged ---
    setupZoomPanListeners: function() { 
        this._boundHandleZoom = this.handleZoom.bind(this);
        this._boundStartPan = this.startPan.bind(this);
        this._boundDoPan = this.doPan.bind(this);
        this._boundEndPan = this.endPan.bind(this);
        this.mainView.addEventListener('wheel', this._boundHandleZoom, { passive: false });
        this.mainView.addEventListener('mousedown', this._boundStartPan);
    },
    removeZoomPanListeners: function() { 
        this.mainView.removeEventListener('wheel', this._boundHandleZoom);
        this.mainView.removeEventListener('mousedown', this._boundStartPan);
        document.removeEventListener('mousemove', this._boundDoPan); 
        document.removeEventListener('mouseup', this._boundEndPan);   
        this.mainView.classList.remove('panning');
    },
    toggleTownInteraction: function(enable) { 
        if (enable) {
            this.setupZoomPanListeners(); 
            this.mainView.style.pointerEvents = 'auto';
            this.mapContent.style.pointerEvents = 'auto'; 
        } else {
            this.removeZoomPanListeners(); 
            this.mainView.style.pointerEvents = 'none'; 
            this.mapContent.style.pointerEvents = 'none'; 
        }
    },
    handleZoom: function(event) { 
        event.preventDefault();
        const zoomSpeed = 0.1;
        const oldZoom = this.currentZoom;
        if (event.deltaY < 0) { 
            this.currentZoom = Math.min(this.maxZoom, this.currentZoom + zoomSpeed);
        } else { 
            this.currentZoom = Math.max(this.minZoom, this.currentZoom - zoomSpeed);
        }
        const rect = this.mainView.getBoundingClientRect();
        const mouseX = event.clientX - rect.left; 
        const mouseY = event.clientY - rect.top;  
        const mapXBeforeZoom = (mouseX - this.panX) / oldZoom;
        const mapYBeforeZoom = (mouseY - this.panY) / oldZoom;
        this.panX = mouseX - (mapXBeforeZoom * this.currentZoom);
        this.panY = mouseY - (mapYBeforeZoom * this.currentZoom);
        this.applyPanBoundaries();
        this.applyMapTransform();
    },
    startPan: function(event) { 
        if (event.button !== 0) return; 
        event.preventDefault(); 
        this.isPanning = true;
        this.lastPanPosition = { x: event.clientX, y: event.clientY };
        this.mainView.classList.add('panning');
        document.addEventListener('mousemove', this._boundDoPan);
        document.addEventListener('mouseup', this._boundEndPan);
    },
    doPan: function(event) { 
        if (!this.isPanning) return;
        event.preventDefault();
        const dx = event.clientX - this.lastPanPosition.x;
        const dy = event.clientY - this.lastPanPosition.y;
        this.panX += dx;
        this.panY += dy;
        this.lastPanPosition = { x: event.clientX, y: event.clientY };
        this.applyPanBoundaries();
        this.applyMapTransform();
    },
    endPan: function(event) { 
        if (!this.isPanning) return;
        this.isPanning = false; 
        this.mainView.classList.remove('panning');
        document.removeEventListener('mousemove', this._boundDoPan);
        document.removeEventListener('mouseup', this._boundEndPan);
    },
    applyPanBoundaries: function() { 
        const viewportWidth = this.mainView.clientWidth;
        const viewportHeight = this.mainView.clientHeight;
        const mapWidthScaled = this.mapContent.offsetWidth * this.currentZoom;
        const mapHeightScaled = this.mapContent.offsetHeight * this.currentZoom;
        if (mapWidthScaled < viewportWidth) {
            this.panX = (viewportWidth - mapWidthScaled) / 2;
        } else {
            this.panX = Math.min(0, Math.max(this.panX, viewportWidth - mapWidthScaled));
        }
        if (mapHeightScaled < viewportHeight) {
            this.panY = (viewportHeight - mapHeightScaled) / 2;
        } else {
            this.panY = Math.min(0, Math.max(this.panY, viewportHeight - mapHeightScaled));
        }
    },
    applyMapTransform: function() { 
        if (this.mapContent) {
            this.mapContent.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.currentZoom})`;
        }
    },
    enterPlace: function(place) {
        console.log(`TownHubGame: enterPlace called for ${place.name} (targetGameId: ${place.targetGameId})`);
        let subGameModule = null;
        const targetId = place.targetGameId;
        const globalModuleRef = window[targetId];

        if (globalModuleRef && typeof globalModuleRef === 'object' && globalModuleRef.id === targetId) {
            subGameModule = globalModuleRef;
        } else if (typeof GameManager !== 'undefined' && typeof GameManager.getModuleById === 'function') {
            subGameModule = GameManager.getModuleById(targetId);
        }

        if (subGameModule && typeof subGameModule.init === 'function') {
            this.activeSubGameModule = subGameModule;
            this.subGameContentDiv.innerHTML = ''; 
            this.subGameOverlayContainer.style.display = 'block';
            this.toggleTownInteraction(false); 
            const subGameSuccess = (data) => this.handleSubGameCompletion(data, place);
            const subGameFailure = (data) => this.handleSubGameFailure(data, place);
            try {
                subGameModule.init(this.subGameContentDiv, subGameSuccess, subGameFailure, { ...this.sharedData, currentTownPlace: place.name, launchedFrom: this.id });
            } catch (e) {
                this.handleSubGameFailure({reason: `Initialization error for ${place.name}: ${e.message || e.toString()}`}, place);
            }
        } else {
            console.error(`TownHubGame: Sub-game module for ID ${targetId} is invalid or has no init function.`);
            this.subGameContentDiv.innerHTML = `<p style="color:red;text-align:center;">Location "${place.name}" is currently unavailable.</p>`;
            const closeButton = document.createElement('button');
            closeButton.textContent = 'OK';
            closeButton.onclick = () => {
                this.subGameOverlayContainer.style.display = 'none';
                this.toggleTownInteraction(true); 
            };
            this.subGameContentDiv.appendChild(closeButton); 
            this.subGameOverlayContainer.style.display = 'block'; 
            this.toggleTownInteraction(false); 
        }
    },
    handleSubGameCompletion: function(dataFromSubGame, placeContext) { 
        if (this.activeSubGameModule && typeof this.activeSubGameModule.destroy === 'function') {
            this.activeSubGameModule.destroy();
        }
        this.activeSubGameModule = null;
        this.subGameContentDiv.innerHTML = ''; 
        this.subGameOverlayContainer.style.display = 'none';
        this.sharedData = { ...this.sharedData, ...dataFromSubGame };
        delete this.sharedData.nextGame; 
        delete this.sharedData.returnTo; 
        if (dataFromSubGame && typeof dataFromSubGame.generatedRecruits !== 'undefined') { 
            delete this.sharedData.generatedRecruits; 
        }
        this.toggleTownInteraction(true); 
    },
    handleSubGameFailure: function(dataFromFailure, placeContext) { 
        if (this.activeSubGameModule && typeof this.activeSubGameModule.destroy === 'function') {
            this.activeSubGameModule.destroy();
        }
        this.activeSubGameModule = null;
        this.subGameContentDiv.innerHTML = `<p style="color:red;text-align:center;">An issue occurred in ${placeContext.name}: ${dataFromFailure.reason || 'Unknown error'}</p>`;
        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.onclick = () => {
            this.subGameOverlayContainer.style.display = 'none';
            this.toggleTownInteraction(true);
        };
        this.subGameContentDiv.appendChild(closeButton); 
        this.subGameOverlayContainer.style.display = 'block'; 
        if (dataFromFailure && dataFromFailure.updatedSharedData) {
            this.sharedData = { ...this.sharedData, ...dataFromFailure.updatedSharedData };
        }
    },
    destroy: function() { 
        console.log("TownHubGame: Destroying...");
        this.removeZoomPanListeners();
        if (this.activeSubGameModule && typeof this.activeSubGameModule.destroy === 'function') {
            this.activeSubGameModule.destroy(); 
        }
        this.activeSubGameModule = null;
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.remove('town-hub-container');
        }
        this.mainView = null;
        this.mapContent = null;
        this.subGameOverlayContainer = null;
        this.subGameContentDiv = null; 
    }
};

