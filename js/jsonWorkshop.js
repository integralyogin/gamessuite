// js/WorldWorkshop.js
// An experimental tool for modifying game data files.

const WorldWorkshop = {
    id: 'WorldWorkshop',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    // The data of the file we are currently editing
    worldData: null,

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log(`WorldWorkshop: Initializing.`);
        this.renderLayout();
        this.applyStyles();
        this.renderControls(); // Render the initial state of the control panel
    },

    renderLayout: function() {
        this.container.innerHTML = `
            <div class="workshop-container">
                <div class="ws-panel ws-controls-panel">
                    </div>
                <div class="ws-panel ws-data-panel">
                    <div class="ws-data-header">
                        <h3>Live JSON Data</h3>
                        <button id="ws-copy-btn" style="display:none;">Copy JSON</button>
                    </div>
                    <pre id="ws-data-output">Load a JSON file to begin...</pre>
                </div>
            </div>
            <div id="ws-exit-container">
                 <button id="WorldWorkshop-exit-btn">Exit Workshop</button>
            </div>
        `;
        document.getElementById('WorldWorkshop-exit-btn').onclick = () => {
            this.successCallback({ message: `Returned from WorldWorkshop` });
        };
    },

    // Renders the left-hand panel with controls
    renderControls: function() {
        const controlsPanel = this.container.querySelector('.ws-controls-panel');
        let content = `
            <div class="ws-header">
                <h2>World Workshop</h2>
                <p>Load and modify a game data file.</p>
            </div>
            <div class="ws-loader">
                <label for="ws-file-path">JSON File Path:</label>
                <input type="text" id="ws-file-path" placeholder="e.g., town_layout.json">
                <button id="ws-load-btn">Load</button>
            </div>
            <hr>
            <div id="ws-editor-content" class="ws-editor-content"></div>
        `;
        controlsPanel.innerHTML = content;

        document.getElementById('ws-load-btn').onclick = () => this.loadFile();
    },

    // Renders the live JSON data in the right-hand panel
    renderDataDisplay: function() {
        const output = document.getElementById('ws-data-output');
        if (this.worldData) {
            output.textContent = JSON.stringify(this.worldData, null, 2);
            document.getElementById('ws-copy-btn').style.display = 'inline-block';
            document.getElementById('ws-copy-btn').onclick = () => this.copyJson();
        } else {
            output.textContent = 'Load a JSON file to begin...';
            document.getElementById('ws-copy-btn').style.display = 'none';
        }
    },
    
    // Renders a dynamic UI based on the structure of the loaded data
    renderEditor: function() {
        const editorContent = document.getElementById('ws-editor-content');
        editorContent.innerHTML = ''; // Clear previous editor

        if (!this.worldData) return;

        // For this demo, we'll specifically handle the structure of town_layout.json
        if (this.worldData.map_settings) {
            editorContent.appendChild(this.createObjectEditor('map_settings', this.worldData.map_settings));
        }

        if (Array.isArray(this.worldData.places)) {
            const placesHeader = document.createElement('h4');
            placesHeader.textContent = 'Places';
            editorContent.appendChild(placesHeader);
            
            this.worldData.places.forEach((place, index) => {
                editorContent.appendChild(this.createObjectEditor(`places[${index}]`, place, true, index));
            });
            
            const addPlaceBtn = document.createElement('button');
            addPlaceBtn.textContent = 'Add New Place';
            addPlaceBtn.className = 'ws-add-btn';
            addPlaceBtn.onclick = () => this.addPlace();
            editorContent.appendChild(addPlaceBtn);
        }
    },

    // Creates an editor 'card' for a given object
    createObjectEditor: function(title, obj, canDelete = false, index = -1) {
        const card = document.createElement('div');
        card.className = 'ws-editor-card';
        
        let cardHeader = `<h5>${title}</h5>`;
        if (canDelete) {
            cardHeader += `<button class="ws-delete-btn" data-index="${index}">Delete</button>`;
        }
        
        let fields = '';
        for (const key in obj) {
            const value = obj[key];
            const inputType = typeof value === 'number' ? 'number' : 'text';
            fields += `
                <label>${key}:
                    <input type="${inputType}" data-key="${key}" data-path="${title}" value="${this.escapeHtml(value)}">
                </label>
            `;
        }
        card.innerHTML = cardHeader + fields;
        
        // Add event listeners
        card.querySelectorAll('input').forEach(input => {
            input.onchange = (e) => this.updateProperty(e.target.dataset.path, e.target.dataset.key, e.target.value);
        });
        if (canDelete) {
            card.querySelector('.ws-delete-btn').onclick = (e) => this.deletePlace(parseInt(e.target.dataset.index));
        }
        
        return card;
    },

    // --- Data Manipulation ---

    async loadFile() {
        const pathInput = document.getElementById('ws-file-path');
        const path = pathInput.value.trim();
        if (!path) {
            alert("Please enter a file path.");
            return;
        }

        try {
            const response = await fetch(`${path}?t=${new Date().getTime()}`); // Cache-bust
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            this.worldData = await response.json();
            console.log("File loaded successfully:", this.worldData);
            
            this.renderEditor();
            this.renderDataDisplay();

        } catch (error) {
            alert(`Failed to load or parse file: ${path}\nError: ${error.message}`);
            this.worldData = null;
            this.renderEditor();
            this.renderDataDisplay();
        }
    },

    updateProperty(path, key, value) {
        // This is a simplified resolver. It works for the current demo structure.
        let targetObject;
        if (path.startsWith('places')) {
            const index = parseInt(path.match(/\[(\d+)\]/)[1]);
            targetObject = this.worldData.places[index];
        } else {
            targetObject = this.worldData[path];
        }

        // Convert back to number if original was a number
        if (typeof targetObject[key] === 'number') {
            targetObject[key] = Number(value);
        } else {
            targetObject[key] = value;
        }
        
        this.renderDataDisplay(); // Show changes live in the JSON output
    },

    addPlace() {
        if (!this.worldData || !Array.isArray(this.worldData.places)) return;
        const newPlace = {
            id: `new_place_${Date.now()}`,
            name: "A New Location",
            image: "images/placeholder.png",
            targetGameId: "UntitledGame",
            x: 100,
            y: 100,
            width: 160,
            height: 160
        };
        this.worldData.places.push(newPlace);
        this.renderEditor();
        this.renderDataDisplay();
    },

    deletePlace(index) {
        if (confirm(`Are you sure you want to delete "${this.worldData.places[index].name}"?`)) {
            this.worldData.places.splice(index, 1);
            this.renderEditor();
            this.renderDataDisplay();
        }
    },

    copyJson() {
        const textToCopy = JSON.stringify(this.worldData, null, 2);
        navigator.clipboard.writeText(textToCopy).then(() => {
            const copyBtn = document.getElementById('ws-copy-btn');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    },

    escapeHtml: function(unsafe) {
        if (unsafe == null) return "";
        return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },

    applyStyles: function() {
        let style = document.getElementById('worldWorkshopStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'worldWorkshopStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .workshop-container { display: flex; height: calc(100% - 50px); width: 100%; font-family: sans-serif; }
            .ws-panel { height: 100%; padding: 15px; box-sizing: border-box; overflow-y: auto; }
            .ws-controls-panel { width: 400px; background: #ecf0f1; border-right: 2px solid #bdc3c7; }
            .ws-data-panel { flex-grow: 1; background: #34495e; color: #f2f2f2; display: flex; flex-direction: column; }
            .ws-header, .ws-data-header { text-align: center; margin-bottom: 20px; }
            .ws-header h2 { margin: 0; }
            .ws-loader { margin-bottom: 20px; }
            .ws-loader label { display: block; margin-bottom: 5px; font-weight: bold; }
            .ws-loader input { width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 10px; }
            .ws-loader button, .ws-add-btn { width: 100%; padding: 10px; font-size: 1em; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; }
            .ws-add-btn { background-color: #27ae60; margin-top: 15px; }
            .ws-editor-card { background: white; border: 1px solid #bdc3c7; border-radius: 5px; padding: 10px; margin-bottom: 15px; }
            .ws-editor-card h5 { margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
            .ws-editor-card label { display: block; margin-bottom: 8px; font-size: 0.9em; }
            .ws-editor-card input { width: 100%; padding: 5px; box-sizing: border-box; margin-top: 3px; }
            .ws-delete-btn { background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8em; padding: 4px 8px;}
            .ws-data-header { display: flex; justify-content: space-between; align-items: center; color: #ecf0f1; padding-bottom: 10px; border-bottom: 1px solid #7f8c8d;}
            .ws-data-header h3 { margin: 0; }
            #ws-copy-btn { background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
            #ws-data-output { flex-grow: 1; background: #2c3e50; white-space: pre; font-family: monospace; font-size: 1.1em; line-height: 1.4; margin-top: 10px;}
            #ws-exit-container { position: absolute; bottom: 0; left: 0; width: 100%; padding: 10px; background: #bdc3c7; text-align: center; box-sizing: border-box; }
        `;
    },

    destroy: function() {
        console.log(`WorldWorkshop: Destroying.`);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
};

