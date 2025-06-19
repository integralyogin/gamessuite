// js/WorldWorkshop.js
// An experimental tool for modifying game module JS files.

const WorldWorkshop = {
    id: 'WorldWorkshop',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    // State for the current file being edited
    sourceCode: null,
    moduleName: null,
    editableElements: [], // Holds info about parsed elements

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log(`WorldWorkshop: Initializing JS module editor.`);
        this.applyStyles();
        this.renderLayout();
    },

    renderLayout: function() {
        this.container.innerHTML = `
            <div class="workshop-container-js">
                <div class="ws-panel-js ws-controls-panel-js">
                    <div class="ws-header-js">
                        <h2>World Workshop</h2>
                        <p>Load and modify a game module's .js file.</p>
                    </div>
                    <div class="ws-loader-js">
                        <label for="ws-file-path-js">JS File Path:</label>
                        <input type="text" id="ws-file-path-js" placeholder="e.g., js/MountainGame.js" value="js/MountainGame.js">
                        <button id="ws-load-btn-js">Load</button>
                    </div>
                    <hr>
                    <div id="ws-editor-content-js" class="ws-editor-content-js">
                        <p class="ws-placeholder">Load a file to see editable properties.</p>
                    </div>
                </div>
                <div class="ws-panel-js ws-source-panel-js">
                    <div class="ws-panel-header-js">
                        <h3>Source Code</h3>
                        <button id="ws-copy-btn-js" style="display:none;">Copy Source</button>
                    </div>
                    <textarea id="ws-source-output-js" spellcheck="false"></textarea>
                </div>
                <div class="ws-panel-js ws-preview-panel-js">
                     <div class="ws-panel-header-js"><h3>Live Preview</h3></div>
                    <iframe id="ws-preview-iframe-js"></iframe>
                </div>
            </div>
            <div id="ws-exit-container-js">
                 <button id="WorldWorkshop-exit-btn-js">Exit Workshop</button>
            </div>
        `;
        document.getElementById('WorldWorkshop-exit-btn-js').onclick = () => this.successCallback({ message: `Returned from WorldWorkshop` });
        document.getElementById('ws-load-btn-js').onclick = () => this.loadFile();
        document.getElementById('ws-copy-btn-js').onclick = () => this.copySourceCode();
        document.getElementById('ws-source-output-js').addEventListener('input', (e) => this.handleDirectCodeEdit(e.target.value));
    },

    async loadFile() {
        const pathInput = document.getElementById('ws-file-path-js');
        const path = pathInput.value.trim();
        if (!path) return;

        try {
            const response = await fetch(`${path}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            this.sourceCode = await response.text();
            
            document.getElementById('ws-source-output-js').value = this.sourceCode;
            document.getElementById('ws-copy-btn-js').style.display = 'inline-block';

            this.parseAndRenderControls();
            this.updatePreview();

        } catch (error) {
            alert(`Failed to load file: ${path}\nError: ${error.message}`);
        }
    },
    
    parseAndRenderControls() {
        const editorContent = document.getElementById('ws-editor-content-js');
        editorContent.innerHTML = '';
        this.editableElements = [];

        // 1. Find module name
        const moduleNameMatch = this.sourceCode.match(/const\s+([a-zA-Z0-9_]+)\s*=/);
        if (!moduleNameMatch) {
            editorContent.innerHTML = '<p class="ws-error">Could not find a module definition (e.g., "const ModuleName = ...").</p>';
            return;
        }
        this.moduleName = moduleNameMatch[1];

        // 2. Find the render function's innerHTML
        const renderBlockRegex = /render:\s*function\s*\([^)]*\)\s*{[^`]*this\.container\.innerHTML\s*=\s*`([^`]*)`/s;
        const renderMatch = this.sourceCode.match(renderBlockRegex);
        
        if (!renderMatch) {
            editorContent.innerHTML = '<p class="ws-error">Could not find a standard render function with template literal `...`.</p>';
            return;
        }
        
        const htmlContent = renderMatch[1];

        // 3. Parse the HTML to find elements to make editable
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Example: Make H1 and the first P tag editable
        const h1 = tempDiv.querySelector('h1');
        if (h1) {
            this.editableElements.push({ selector: 'h1', originalContent: h1.textContent, currentContent: h1.textContent });
        }
        const p = tempDiv.querySelector('p');
        if (p) {
            this.editableElements.push({ selector: 'p', originalContent: p.textContent, currentContent: p.textContent });
        }

        // 4. Create UI for these elements
        if (this.editableElements.length === 0) {
            editorContent.innerHTML = '<p class="ws-placeholder">No standard editable elements (h1, p) found in render() method.</p>';
        } else {
            this.editableElements.forEach((el, index) => {
                const elId = `ws-dyn-editor-${index}`;
                const label = document.createElement('label');
                label.htmlFor = elId;
                label.textContent = `Content for <${el.selector}>:`;
                
                const input = document.createElement('textarea');
                input.id = elId;
                input.value = el.currentContent;
                input.dataset.index = index;
                input.oninput = (e) => this.handleControlChange(parseInt(e.target.dataset.index), e.target.value);
                
                editorContent.appendChild(label);
                editorContent.appendChild(input);
            });
        }
    },
    
    handleControlChange(elementIndex, newValue) {
        this.editableElements[elementIndex].currentContent = newValue;
        this.rebuildSourceCode();
    },
    
    handleDirectCodeEdit(newCode) {
        this.sourceCode = newCode;
        // When user types directly, re-parse the controls and update the preview
        this.parseAndRenderControls();
        this.updatePreview(); 
    },

    rebuildSourceCode() {
        let newSource = this.sourceCode;
        this.editableElements.forEach(el => {
            // This is a simple replacement. A more robust solution would use an AST.
            // It's sufficient for the template-based files this tool is intended for.
            newSource = newSource.replace(el.originalContent, el.currentContent);
        });
        document.getElementById('ws-source-output-js').value = newSource;
        this.updatePreview(newSource);
    },

    updatePreview(codeToRender = document.getElementById('ws-source-output-js').value) {
        if (!this.moduleName) return;
        const iframe = document.getElementById('ws-preview-iframe-js');
        const previewDoc = iframe.contentDocument || iframe.contentWindow.document;

        previewDoc.open();
        previewDoc.write(`
            <html>
                <head><style>body { margin: 0; font-family: sans-serif; }</style></head>
                <body>
                    <div id="preview-container" style="height:100vh; width:100vw;"></div>
                    <script type="module">
                        // Mock the escapeHtml function if it's used in the template
                        if (!String.prototype.escapeHtml) {
                            String.prototype.escapeHtml = function() { return this; };
                        }
                        
                        try {
                            // The module code to be tested
                            ${codeToRender}

                            // Runner script
                            // FIX: Directly reference the module variable, as it's in scope within the module script.
                            // Do not use window[moduleName], as 'const' in a module does not attach to the window object.
                            const gameModule = ${this.moduleName};
                            if (gameModule && typeof gameModule.init === 'function') {
                                const container = document.getElementById('preview-container');
                                // Mock callbacks
                                const success = (data) => console.log('Preview Success:', data);
                                const failure = (data) => console.log('Preview Failure:', data);
                                gameModule.init(container, success, failure, { source: 'WorldWorkshopPreview' });
                            } else {
                                document.body.innerHTML = '<p style="color:red;">Error: Module ${this.moduleName} not found or invalid.</p>';
                            }
                        } catch(e) {
                             document.body.innerHTML = \`<p style="color:red;"><b>Script Error:</b> \${e.message}</p>\`;
                             console.error(e);
                        }
                    <\/script>
                </body>
            </html>
        `);
        previewDoc.close();
    },

    copySourceCode() {
        const textToCopy = document.getElementById('ws-source-output-js').value;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const copyBtn = document.getElementById('ws-copy-btn-js');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Source'; }, 2000);
        });
    },

    applyStyles: function() {
        let style = document.getElementById('worldWorkshopStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'worldWorkshopStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .workshop-container-js { display: flex; height: calc(100% - 50px); width: 100%; font-family: sans-serif; background: #34495e; }
            .ws-panel-js { height: 100%; display: flex; flex-direction: column; }
            .ws-controls-panel-js { width: 320px; background: #ecf0f1; border-right: 2px solid #bdc3c7; }
            .ws-source-panel-js { flex-grow: 1; border-right: 2px solid #bdc3c7; }
            .ws-preview-panel-js { flex-grow: 1; background: white; }
            .ws-panel-header-js { padding: 10px; color: #ecf0f1; background: #566573; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
            .ws-controls-panel-js .ws-panel-header-js { background: none; color: inherit; }
            .ws-header-js { text-align: center; margin-bottom: 20px; padding: 15px; }
            .ws-header-js h2 { margin: 0; }
            .ws-loader-js { padding: 0 15px; }
            .ws-loader-js label, .ws-editor-content-js label { display: block; margin-bottom: 5px; font-weight: bold; }
            .ws-loader-js input { width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 10px; }
            .ws-loader-js button { width: 100%; padding: 10px; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; }
            .ws-editor-content-js { padding: 0 15px; flex-grow: 1; overflow-y: auto; }
            .ws-editor-content-js textarea { width: 100%; min-height: 80px; box-sizing: border-box; padding: 5px; margin-bottom: 15px; }
            .ws-placeholder, .ws-error { padding: 20px; text-align: center; color: #7f8c8d; }
            .ws-error { color: #c0392b; }
            #ws-source-output-js { flex-grow: 1; width: 100%; border: none; background: #2c3e50; color: #f2f2f2; font-family: monospace; font-size: 14px; padding: 10px; box-sizing: border-box; resize: none; }
            #ws-preview-iframe-js { flex-grow: 1; width: 100%; border: none; }
            #ws-copy-btn-js { background: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
            #ws-exit-container-js { position: absolute; bottom: 0; left: 0; width: 100%; padding: 10px; background: #bdc3c7; text-align: center; box-sizing: border-box; }
        `;
    },

    destroy: function() {
        console.log(`WorldWorkshop: Destroying.`);
        if (this.container) this.container.innerHTML = '';
    }
};

