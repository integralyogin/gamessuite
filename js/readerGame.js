// js/readerGame.js

const BookReaderGame = {
    isActive: false,
    hostElement: null,
    closeCallback: null,

    elements: {
        readerWrapper: null,
        bookTitleDisplay: null,
        chapterTitleDisplay: null,
        contentDisplay: null,
        loadingMessage: null,
        tocListContainer: null,
        closeButton: null,
        navPane: null,
        resizeHandle: null,
        decreaseFontButton: null,
        increaseFontButton: null,
        currentFontSizeDisplay: null,
        searchInput: null,
        searchClearButton: null,
    },

    bookDetails: {
        mainTitle: "",
        author: "",
        subject: "",
        description: "",
        difficulty: "",
        filePath: "",
        rawContent: '',
        formatFields: [],
        hierarchyFieldNames: [],
        parsedStructure: { parts: [] },
        isSavitri: false,
    },

    currentTargetChapterTitle: null,
    currentTargetString: null,
    performSearchOnInit: false,

    isResizingToc: false, tocInitialX: 0, tocInitialWidth: 0,
    currentTocWidth: 280, minTocWidth: 20, maxTocWidth: 600,

    currentFontSizeScale: 1.3,
    baseContentFontSizeEm: 1.05,
    fontSizeStep: 0.1,
    minFontSizeScale: 0.7,
    maxFontSizeScale: 2.0,

    currentSearchTerm: '',
    searchTimeout: null,

    // --- Dictionary Feature State ---
    definitionsData: [],
    definitionsMap: null, // Will be a Map
    activeDefinitionTooltip: null, // DOM element for the current tooltip
    definitionFilePath: 'js/aurobindo_definitions.json', // Path to definitions

    styles: `
        .book-reader-overlay-brg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 20px; box-sizing: border-box; }
        .reader-app-container-brg { display: flex; width: 100%; max-width: 1200px; height: 100%; max-height: 95vh; background-color: #fdf6e3; border: 1px solid #c8b89a; box-shadow: 0 5px 20px rgba(0,0,0,0.25); border-radius: 5px; overflow: hidden; position: relative; font-family: 'Georgia', serif; color: #333; }
        .reader-close-button-brg { position: absolute; top: 2px; left: 2px; font-size: 1em; font-weight: bold; padding: 0px 8px; cursor: pointer; background-color: #e3d9c6; border: 1px solid #d2b48c; border-radius: 50%; line-height: 1.1; z-index: 10100; /* Ensure button is above tooltip */ color: #5d4037; }
        .reader-close-button-brg:hover { background-color: #d2b48c; color: white; }
        .reader-nav-pane-brg { flex-shrink: 0; background-color: #f0e8d8; overflow-y: auto; overflow-x: hidden; padding: 7px; box-sizing: border-box; position: relative; } /* width set by JS */
        .reader-nav-pane-brg.toc-hidden .toc-part-brg, .reader-nav-pane-brg.toc-hidden > h2 { display: none; }
        .reader-resize-handle-brg { width: 10px; background-color: #c8b89a; cursor: col-resize; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-left: 1px solid #d5c8b0; border-right: 1px solid #d5c8b0; }
        .reader-resize-handle-brg:hover { background-color: #b0a080; }
        .reader-resize-handle-brg::before { content: ''; width: 2px; height: 30px; background-color: rgba(0,0,0,0.2); border-radius: 1px; }
        .reader-nav-pane-brg h2 { margin-top: 0; margin-bottom: 5px; font-size: 1.3em; color: #5d4037; text-align: center; border-bottom: 1px solid #c8b89a; padding-bottom: 10px; }
        .toc-part-brg h3 { font-size: 1.1em; color: #795548; margin-top: 8px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        .toc-part-brg ul { list-style: none; padding-left: 4px; margin: 0; }
        .toc-part-brg li a { display: block; padding: 1px; text-decoration: none; color: #6a5acd; font-size: 1.15em; border-radius: 2px; transition: background-color 0.2s ease; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .toc-part-brg li a:hover { background-color: #e0dcd1; color: #483d8b; }
        .toc-part-brg li a.active { background-color: #6a5acd; color: white; font-weight: bold; }
        .reader-main-area-brg { flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
        .reader-header-brg { padding: 8px 15px; border-bottom: 1px solid #d2b48c; background-color: #e3d9c6; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; }
        .reader-title-area-brg { text-align: center; flex-grow: 1; margin-right: 10px; }
        .reader-header-brg h1 { margin: 0; font-size: 1.2em; color: #5d4037; font-weight: normal; line-height: 1.2; }
        .reader-header-brg h2 { margin: 2px 0 0 0; font-size: 1.4em; color: #795548; font-weight: bold; line-height: 1.2;}
        .reader-header-controls-brg { display: flex; align-items: center; gap: 10px; }
        .reader-search-controls-brg { display: flex; align-items: center; gap: 5px; }
        #brgSearchInput { padding: 4px 8px; border: 1px solid #c8b89a; border-radius: 3px; font-size: 0.9em; background-color: #fffdf9; width: 150px; }
        #brgSearchInput:focus { border-color: #795548; outline: none; box-shadow: 0 0 3px rgba(121, 85, 72, 0.5); }
        #brgSearchClearBtn { font-family: 'Georgia', serif; font-size: 1.2em; font-weight: bold; padding: 0px 6px; background-color: transparent; border: none; border-radius: 50%; cursor: pointer; color: #795548; line-height: 1; display: none; }
        #brgSearchClearBtn:hover { color: #5d4037; }
        mark.brg-search-highlight { background-color: #ffd250; color: #333; border-radius: 2px; padding: 0.5px 1px; box-shadow: 0 0 5px rgba(255,210,80,0.7); }
        .reader-font-controls-brg { display: flex; align-items: center; gap: 5px; }
        .reader-font-controls-brg button { font-family: 'Georgia', serif; font-size: 1.2em; font-weight: bold; padding: 2px 8px; background-color: #d4c8b8; border: 1px solid #c8b89a; border-radius: 4px; cursor: pointer; line-height: 1; color: #5d4037; min-width: 30px; }
        .reader-font-controls-brg button:hover { background-color: #c8b89a; }
        .reader-font-controls-brg button:disabled { background-color: #e0e0e0; color: #aaa; cursor: not-allowed; }
        #brgCurrentFontSizeDisplay { font-size: 0.85em; color: #5d4037; padding: 0 5px; min-width: 35px; text-align: center; font-variant-numeric: tabular-nums; }
        .reader-content-wrapper-brg { flex-grow: 1; overflow-y: auto; padding: 25px 35px; background-color: #fffdf9; line-height: 1.55; font-size: ${this.baseContentFontSizeEm}em; text-align: justify; hyphens: none; word-break: normal; overflow-wrap: normal; }
        .reader-content-wrapper-brg p { margin-top: 0; margin-bottom: 1.25em; }
        .reader-content-wrapper-brg em { font-style: italic; }
        .reader-content-wrapper-brg strong { font-weight: bold; }
        .reader-content-wrapper-brg sup { font-size: 0.7em; vertical-align: super; line-height: 0; margin-left: 1px; }
        .reader-content-wrapper-brg .savitri-verse-line { display: block; margin-bottom: 0; }
        .reader-loading-brg { text-align: center; padding: 30px; font-size: 1.2em; color: #555; flex-grow: 1; display: flex; justify-content: center; align-items: center; flex-direction: column; }
        .reader-nav-pane-brg::-webkit-scrollbar, .reader-content-wrapper-brg::-webkit-scrollbar { width: 10px; }
        .reader-nav-pane-brg::-webkit-scrollbar-track, .reader-content-wrapper-brg::-webkit-scrollbar-track { background: #f0e8d8; border-radius: 8px; }
        .reader-nav-pane-brg::-webkit-scrollbar-thumb, .reader-content-wrapper-brg::-webkit-scrollbar-thumb { background: #c8b89a; border-radius: 8px; }
        .reader-nav-pane-brg::-webkit-scrollbar-thumb:hover, .reader-content-wrapper-brg::-webkit-scrollbar-thumb:hover { background: #b0a080; }

        /* --- Styles for Dictionary Feature --- */
        .definable-word-brg { color: #00796b; /* Teal color for defined words */ text-decoration: underline; text-decoration-style: dotted; cursor: help; }
        .definable-word-brg:hover { color: #004d40; background-color: #e0f2f1; /* Light teal background on hover */ }
        .brg-definition-tooltip { position: absolute; background-color: #fffde7; /* Light yellow */ border: 1px solid #fbc02d; /* Amber border */ padding: 10px 12px; border-radius: 6px; box-shadow: 0 3px 8px rgba(0,0,0,0.2); z-index: 10005; /* Ensure tooltip is above content, below close button */ max-width: 320px; font-size: 0.9em; line-height: 1.45; color: #3E2723; /* Dark brown text */ }
        .brg-definition-tooltip h4 { margin: 0 0 8px 0; font-size: 1.05em; color: #004D40; /* Dark Teal for term */ border-bottom: 1px solid #B2DFDB; padding-bottom: 4px;}
        .brg-definition-tooltip p { margin: 0 0 8px 0; }
        .brg-definition-tooltip .source { font-size: 0.85em; font-style: italic; color: #78909C; /* Blue Grey */ margin-top: 8px; border-top: 1px dashed #CFD8DC; padding-top: 6px;}
    `,
    styleElement: null,

    escapeRegExp: function(string) {
        if (typeof string !== 'string') string = String(string);
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    escapeHtml: function(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    extractDisplayTitle: function(fullMatchedTitle, keyword) {
        if (!fullMatchedTitle || !keyword) return fullMatchedTitle || "";
        const escapedKeyword = this.escapeRegExp(keyword);
        const titlePatternWithDesc = new RegExp(`^${escapedKeyword}\\s+[^-\\s][^-]*\\s*-\\s*(.+)$`, "i");
        const matchWithDesc = fullMatchedTitle.match(titlePatternWithDesc);
        if (matchWithDesc && matchWithDesc[1]) return matchWithDesc[1].trim();
        const titlePatternOnlyId = new RegExp(`^${escapedKeyword}\\s+([^-\\s][^-]*)$`, "i");
        const matchWithOnlyId = fullMatchedTitle.match(titlePatternOnlyId);
        if (matchWithOnlyId && matchWithOnlyId[1]) return matchWithOnlyId[1].trim();
        if (fullMatchedTitle.toLowerCase().startsWith(keyword.toLowerCase())) {
            let potentialTitle = fullMatchedTitle.substring(keyword.length).trim();
            if (potentialTitle.startsWith("-")) potentialTitle = potentialTitle.substring(1).trim();
            return potentialTitle || fullMatchedTitle;
        }
        return fullMatchedTitle;
    },

    init: async function(hostElement, bookFilePath, closeCallback, targetChapterTitle = null, targetString = null) {
        console.log(`BRG: init() called. File: ${bookFilePath}, Target Chapter: ${targetChapterTitle}, Target String: "${targetString}"`);
        if (this.isActive) { this.close(); }
        this.hostElement = hostElement;
        this.bookDetails.filePath = bookFilePath;
        this.closeCallback = closeCallback;
        this.currentTargetChapterTitle = targetChapterTitle;
        this.currentTargetString = targetString;
        this.performSearchOnInit = !!targetString;
        this.definitionsMap = new Map();
        this.definitionsData = [];
        this.activeDefinitionTooltip = null;
        this.bookDetails.isSavitri = false;
        this.currentTocWidth = 280;
        this.currentFontSizeScale = 1.3;
        this.currentSearchTerm = '';
        this.injectStyles();
        this.createReaderUI();
        this.cacheElements();
        this.setTocPaneWidth(this.currentTocWidth);
        this.applyCurrentFontSize();
        if (this.elements.bookTitleDisplay) this.elements.bookTitleDisplay.textContent = "Loading Book...";
        await this.loadDefinitionsData();
        await this.loadBookContent();
        if (this.hostElement) this.hostElement.style.display = 'flex';
        this.isActive = true;
    },

    injectStyles: function() {
        if (!document.getElementById('bookReaderGameStyleBRG')) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'bookReaderGameStyleBRG';
            let updatedStyles = this.styles.replace(
                `font-size: \${this.baseContentFontSizeEm}em;`,
                `font-size: ${this.baseContentFontSizeEm}em;`
            );
            this.styleElement.textContent = updatedStyles;
            document.head.appendChild(this.styleElement);
        }
    },

    createReaderUI: function() {
        if(!this.hostElement) return;
        this.hostElement.innerHTML = '';
        this.hostElement.className = 'book-reader-overlay-brg';
        const readerWrapper = document.createElement('div');
        readerWrapper.className = 'reader-app-container-brg';
        readerWrapper.innerHTML = `
            <button class="reader-close-button-brg" title="Close Reader">&times;</button>
            <div class="reader-nav-pane-brg" id="brgNavPane">
                <div id="brgTocList"></div>
            </div>
            <div id="brgResizeHandle" class="reader-resize-handle-brg"></div>
            <div class="reader-main-area-brg">
                <div class="reader-header-brg">
                    <div class="reader-title-area-brg">
                        <h1 id="brgBookTitle"></h1>
                        <h2 id="brgChapterTitle"></h2>
                    </div>
                    <div class="reader-header-controls-brg">
                        <div class="reader-search-controls-brg">
                            <input type="text" id="brgSearchInput" placeholder="Search chapter..." title="Search in current chapter">
                            <button id="brgSearchClearBtn" title="Clear search">&times;</button>
                        </div>
                        <div id="brgFontControlsContainer" class="reader-font-controls-brg">
                            <button id="brgDecreaseFontBtn" title="Decrease font size">-</button>
                            <span id="brgCurrentFontSizeDisplay">100%</span>
                            <button id="brgIncreaseFontBtn" title="Increase font size">+</button>
                        </div>
                    </div>
                </div>
                <div id="brgLoadingMessage" class="reader-loading-brg">Loading text file...</div>
                <div id="brgContentDisplay" class="reader-content-wrapper-brg" style="display: none;"></div>
            </div>`;
        this.hostElement.appendChild(readerWrapper);
        this.elements.readerWrapper = readerWrapper;
    },

    cacheElements: function() {
        if(!this.elements.readerWrapper) return;
        this.elements.bookTitleDisplay = document.getElementById('brgBookTitle');
        this.elements.chapterTitleDisplay = document.getElementById('brgChapterTitle');
        this.elements.contentDisplay = document.getElementById('brgContentDisplay');
        this.elements.loadingMessage = document.getElementById('brgLoadingMessage');
        this.elements.tocListContainer = document.getElementById('brgTocList');
        this.elements.closeButton = this.elements.readerWrapper.querySelector('.reader-close-button-brg');
        this.elements.navPane = document.getElementById('brgNavPane');
        this.elements.resizeHandle = document.getElementById('brgResizeHandle');
        this.elements.decreaseFontButton = document.getElementById('brgDecreaseFontBtn');
        this.elements.increaseFontButton = document.getElementById('brgIncreaseFontBtn');
        this.elements.currentFontSizeDisplay = document.getElementById('brgCurrentFontSizeDisplay');
        this.elements.searchInput = document.getElementById('brgSearchInput');
        this.elements.searchClearButton = document.getElementById('brgSearchClearBtn');

        if (this.elements.closeButton) { this.elements.closeButton.onclick = () => this.close(); }
        if (this.elements.resizeHandle) { this.elements.resizeHandle.addEventListener('mousedown', this.onTocResizeMouseDown.bind(this));}
        if (this.elements.decreaseFontButton) { this.elements.decreaseFontButton.addEventListener('click', () => this.changeFontSize('decrease')); }
        if (this.elements.increaseFontButton) { this.elements.increaseFontButton.addEventListener('click', () => this.changeFontSize('increase')); }
        if (this.elements.searchInput) { this.elements.searchInput.addEventListener('input', this.handleSearchInput.bind(this)); }
        if (this.elements.searchClearButton) { this.elements.searchClearButton.onclick = this.handleClearSearch.bind(this); }
        if (this.elements.contentDisplay) {
            this.elements.contentDisplay.addEventListener('mouseover', this.handleContentMouseOver.bind(this));
            this.elements.contentDisplay.addEventListener('mouseout', this.handleContentMouseOut.bind(this));
        }
        document.addEventListener('click', this.handleDocumentClickForTooltip.bind(this), true);
    },

    close: function() {
        if (!this.isActive) return;
        document.removeEventListener('mousemove', this._boundOnTocResizeMouseMove);
        document.removeEventListener('mouseup', this._boundOnTocResizeMouseUp);
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
        this.currentSearchTerm = '';
        this.performSearchOnInit = false;
        this.currentTargetString = null;
        this.hideDefinitionTooltip();
        if (this.definitionsMap) this.definitionsMap.clear();
        this.definitionsData = [];
        document.removeEventListener('click', this.handleDocumentClickForTooltip.bind(this), true);
        if (this.hostElement) { this.hostElement.innerHTML = ''; this.hostElement.style.display = 'none';}
        const currentFilePath = this.bookDetails.filePath;
        this.bookDetails = {
            mainTitle: "", author: "", subject: "", description: "", difficulty: "",
            filePath: currentFilePath,
            rawContent: '', formatFields: [], hierarchyFieldNames: [],
            parsedStructure: { parts: [] },
            isSavitri: false
        };
        this.currentTargetChapterTitle = null;
        this.isActive = false;
        if (typeof this.closeCallback === 'function') { this.closeCallback(); }
        console.log("BRG: Closed and cleaned up.");
    },

    setTocPaneWidth: function(width) {
        const newWidth = Math.max(this.minTocWidth, Math.min(width, this.maxTocWidth));
        if (this.elements.navPane) {
            this.elements.navPane.style.width = `${newWidth}px`;
            if (newWidth <= this.minTocWidth + 35) { this.elements.navPane.classList.add('toc-hidden');}
            else { this.elements.navPane.classList.remove('toc-hidden');}
        }
        this.currentTocWidth = newWidth;
    },
    onTocResizeMouseDown: function(event) {
        event.preventDefault(); this.isResizingToc = true; this.tocInitialX = event.clientX;
        if (this.elements.navPane) { this.tocInitialWidth = this.elements.navPane.offsetWidth; } else { this.tocInitialWidth = this.currentTocWidth; }
        this._boundOnTocResizeMouseMove = this.onTocResizeMouseMove.bind(this); this._boundOnTocResizeMouseUp = this.onTocResizeMouseUp.bind(this);
        document.addEventListener('mousemove', this._boundOnTocResizeMouseMove); document.addEventListener('mouseup', this._boundOnTocResizeMouseUp);
        if (this.elements.readerWrapper) this.elements.readerWrapper.style.userSelect = 'none';
        if (this.elements.resizeHandle) this.elements.resizeHandle.style.backgroundColor = '#b0a080';
    },
    onTocResizeMouseMove: function(event) {
        if (!this.isResizingToc) return; const deltaX = event.clientX - this.tocInitialX;
        const newWidth = this.tocInitialWidth + deltaX; this.setTocPaneWidth(newWidth);
    },
    onTocResizeMouseUp: function() {
        if (!this.isResizingToc) return; this.isResizingToc = false;
        document.removeEventListener('mousemove', this._boundOnTocResizeMouseMove); document.removeEventListener('mouseup', this._boundOnTocResizeMouseUp);
        if (this.elements.readerWrapper) this.elements.readerWrapper.style.userSelect = 'auto';
        if (this.elements.resizeHandle) this.elements.resizeHandle.style.backgroundColor = '#c8b89a';
        if (this.currentTocWidth < (this.minTocWidth + 40) && this.currentTocWidth > this.minTocWidth) { this.setTocPaneWidth(this.minTocWidth); }
    },
    applyCurrentFontSize: function() {
        if (this.elements.contentDisplay) {
            const newActualSizeEm = this.baseContentFontSizeEm * this.currentFontSizeScale;
            this.elements.contentDisplay.style.fontSize = `${newActualSizeEm}em`;
        }
        if (this.elements.currentFontSizeDisplay) {
            this.elements.currentFontSizeDisplay.textContent = `${Math.round(this.currentFontSizeScale * 100)}%`;
        }
        if (this.elements.decreaseFontButton) {
            this.elements.decreaseFontButton.disabled = this.currentFontSizeScale <= this.minFontSizeScale;
        }
        if (this.elements.increaseFontButton) {
            this.elements.increaseFontButton.disabled = this.currentFontSizeScale >= this.maxFontSizeScale;
        }
    },
    changeFontSize: function(direction) {
        let newScale = this.currentFontSizeScale;
        if (direction === 'increase') { newScale += this.fontSizeStep; }
        else if (direction === 'decrease') { newScale -= this.fontSizeStep; }
        newScale = Math.max(this.minFontSizeScale, Math.min(newScale, this.maxFontSizeScale));
        newScale = Math.round(newScale * 100) / 100;
        if (newScale !== this.currentFontSizeScale) {
            this.currentFontSizeScale = newScale;
            this.applyCurrentFontSize();
        }
    },

    loadDefinitionsData: async function() {
        if (this.definitionsData.length > 0 && this.definitionsMap.size > 0) {
            console.log("BRG: Definitions already loaded.");
            return;
        }
        try {
            const response = await fetch(this.definitionFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, for ${this.definitionFilePath}`);
            }
            this.definitionsData = await response.json();
            this.definitionsMap.clear();
            this.definitionsData.forEach(def => {
                if (def && typeof def.term === 'string') {
                    this.definitionsMap.set(def.term.toLowerCase(), def);
                }
            });
            console.log("BRG: Definitions data loaded successfully:", this.definitionsMap.size, "terms.");
        } catch (error) {
            console.error("BRG: Failed to load definitions data:", error);
            this.definitionsData = [];
            if(this.definitionsMap) this.definitionsMap.clear();
        }
    },

    loadBookContent: async function() {
        console.log("BRG: loadBookContent() called.");
        if (!this.elements.loadingMessage || !this.elements.contentDisplay) {
            console.error("BRG: Loading/Content display elements not found in loadBookContent.");
            return;
        }
        this.elements.loadingMessage.style.display = 'flex';
        this.elements.contentDisplay.style.display = 'none';
        const currentFilePath = this.bookDetails.filePath;
        this.bookDetails = {
            mainTitle: "", author: "", subject: "", description: "", difficulty: "",
            filePath: currentFilePath,
            rawContent: '', formatFields: [], hierarchyFieldNames: [],
            parsedStructure: { parts: [] },
            isSavitri: false
        };

        try {
            const response = await fetch(this.bookDetails.filePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            let allLinesOriginal = text.split(/\r?\n/);
            if (allLinesOriginal.length === 0) throw new Error("Text file empty.");
            const formatLine = allLinesOriginal.shift();
            if (!formatLine) throw new Error("File missing format line.");
            this.bookDetails.formatFields = formatLine.split(',').map(s => s.trim());
            const formatFieldsLower = this.bookDetails.formatFields.map(s => s.toLowerCase());
            const knownMetadataKeywordsMap = { "author": "author", "title": "mainTitle", "subject": "subject", "description": "description", "difficulty": "difficulty" };
            let linesToShiftForMeta = [...allLinesOriginal];
            let actualLinesConsumedForMetaValues = 0;
            let metadataFieldIndex = 0;
            for (metadataFieldIndex = 0; metadataFieldIndex < formatFieldsLower.length; metadataFieldIndex++) {
                const currentFormatFieldLower = formatFieldsLower[metadataFieldIndex];
                const targetProperty = knownMetadataKeywordsMap[currentFormatFieldLower];
                if (targetProperty) {
                    let valueFound = false;
                    let linesShiftedForThisValue = 0;
                    while (linesToShiftForMeta.length > 0) {
                        const line = linesToShiftForMeta.shift();
                        linesShiftedForThisValue++;
                        if (line.trim() !== "") {
                            this.bookDetails[targetProperty] = line.trim();
                            valueFound = true;
                            break;
                        }
                    }
                    actualLinesConsumedForMetaValues += linesShiftedForThisValue;
                    if (!valueFound) {
                        console.warn(`BRG: Expected value for "${this.bookDetails.formatFields[metadataFieldIndex]}" in ${this.bookDetails.filePath}.`);
                        break;
                    }
                } else {
                    break;
                }
            }
            if (this.bookDetails.mainTitle && typeof this.bookDetails.mainTitle === 'string') {
                this.bookDetails.isSavitri = this.bookDetails.mainTitle.toLowerCase().includes("savitri");
            } else {
                this.bookDetails.isSavitri = false;
            }
            this.bookDetails.rawContent = allLinesOriginal.slice(actualLinesConsumedForMetaValues).join('\n');
            if (this.elements.bookTitleDisplay) this.elements.bookTitleDisplay.textContent = this.bookDetails.mainTitle || "Untitled";
            this.bookDetails.hierarchyFieldNames = [];
            if (metadataFieldIndex < this.bookDetails.formatFields.length) this.bookDetails.hierarchyFieldNames.push(this.bookDetails.formatFields[metadataFieldIndex]);
            if (metadataFieldIndex + 1 < this.bookDetails.formatFields.length) this.bookDetails.hierarchyFieldNames.push(this.bookDetails.formatFields[metadataFieldIndex + 1]);
            if (this.bookDetails.hierarchyFieldNames.length < 2) throw new Error(`Could not identify two hierarchy fields after metadata: "${formatLine}". Identified: ${this.bookDetails.hierarchyFieldNames.join(', ')}`);
            this.processBookContent();
            this.populateNavigation();
            console.log("BRG: Book content processed and navigation populated.");

            let chapterDisplayedByTarget = false;
            if (this.currentTargetChapterTitle && this.bookDetails.parsedStructure && this.bookDetails.parsedStructure.parts) {
                const normalizedTargetTitle = this.currentTargetChapterTitle.trim().toLowerCase();
                for (let i = 0; i < this.bookDetails.parsedStructure.parts.length; i++) {
                    const part = this.bookDetails.parsedStructure.parts[i];
                    if (part.chapters) {
                        for (let j = 0; j < part.chapters.length; j++) {
                            const chapter = part.chapters[j];
                            if (chapter.title && chapter.title.trim().toLowerCase() === normalizedTargetTitle) {
                                this.displayChapter(i, j);
                                this.setActiveTocLink(i, j);
                                chapterDisplayedByTarget = true;
                                break;
                            }
                        }
                    }
                    if (chapterDisplayedByTarget) break;
                }
                if (!chapterDisplayedByTarget) {
                    console.warn(`BRG: Target chapter "${this.currentTargetChapterTitle}" not found. Displaying first chapter.`);
                }
            }

            if (!chapterDisplayedByTarget) {
                if (this.bookDetails.parsedStructure.parts && this.bookDetails.parsedStructure.parts.length > 0 &&
                    this.bookDetails.parsedStructure.parts[0].chapters && this.bookDetails.parsedStructure.parts[0].chapters.length > 0) {
                    this.displayChapter(0, 0);
                    this.setActiveTocLink(0, 0);
                } else {
                    console.warn("BRG: Book has no parts or chapters to display.");
                    if(this.elements.contentDisplay) { this.elements.contentDisplay.innerHTML = "<p>Book empty or structure unparsed.</p>"; this.elements.contentDisplay.style.display = 'block'; }
                    if(this.elements.chapterTitleDisplay) this.elements.chapterTitleDisplay.textContent = "No Content";
                }
            }
            if (this.elements.loadingMessage) this.elements.loadingMessage.style.display = 'none';
            this.applyCurrentFontSize();
            this.currentTargetChapterTitle = null;
        } catch (error) {
            console.error("BRG: Error loading book content:", error);
            if (this.elements.loadingMessage) this.elements.loadingMessage.textContent = `Error: ${error.message}`;
            if (this.elements.contentDisplay) { this.elements.contentDisplay.innerHTML = `<p>Failed to load book: ${error.message}</p>`; this.elements.contentDisplay.style.display = 'block'; }
            if (this.elements.bookTitleDisplay) this.elements.bookTitleDisplay.textContent = "Error Loading Book";
            if (this.elements.chapterTitleDisplay) this.elements.chapterTitleDisplay.textContent = "";
        }
    },

    processBookContent: function() {
        const lines = this.bookDetails.rawContent.split(/\r?\n/);
        this.bookDetails.parsedStructure = { parts: [] };
        let currentPart = null;
        let currentChapter = null;
        let paragraphBuffer = [];
        const finalizeParagraph = () => {
            if (paragraphBuffer.length > 0 && currentChapter) {
                if (this.bookDetails.isSavitri) {
                    let savitriContentUnits = [];
                    for (const rawLine of paragraphBuffer) {
                        let lineContent = rawLine.replace(/^\d{2}\.\d{2}_\d{3}:\d{3}\s*-\s*/, '');
                        let poeticLines = lineContent.split(/\s\/\s/g);
                        let formattedPoeticLines = poeticLines.map(pLine => this.formatTextSpans(pLine));
                        savitriContentUnits.push(formattedPoeticLines.join('<br>'));
                    }
                    currentChapter.paragraphs.push(savitriContentUnits.join('<br>'));
                } else {
                    currentChapter.paragraphs.push(
                        paragraphBuffer.map(line => this.formatTextSpans(line)).join(" ")
                    );
                }
            }
            paragraphBuffer = [];
        };
        if (this.bookDetails.hierarchyFieldNames.length < 2) { console.error("BRG: Hierarchy field names not properly set."); return; }
        const level1Name = this.bookDetails.hierarchyFieldNames[0];
        const level2Name = this.bookDetails.hierarchyFieldNames[1];
        const level1Regex = new RegExp(`^(${this.escapeRegExp(level1Name)}\\s+[^-\\s][^-]*(?:\\s*-\\s*.*)?)$`, "i");
        const level2Regex = new RegExp(`^(${this.escapeRegExp(level2Name)}\\s+[^-\\s][^-]*(?:\\s*-\\s*.*)?)$`, "i");
        for (const line of lines) {
            const trimmedLine = line.trim();
            const level1Match = trimmedLine.match(level1Regex);
            const level2Match = trimmedLine.match(level2Regex);
            if (level1Match) {
                finalizeParagraph();
                const displayPartTitle = this.extractDisplayTitle(level1Match[1], level1Name);
                currentPart = { title: displayPartTitle, chapters: [] };
                this.bookDetails.parsedStructure.parts.push(currentPart);
                currentChapter = null;
            } else if (level2Match) {
                finalizeParagraph();
                if (!currentPart) {
                    currentPart = { title: `General ${level1Name}s`, chapters: [] };
                    this.bookDetails.parsedStructure.parts.push(currentPart);
                }
                const displayChapterTitle = this.extractDisplayTitle(level2Match[1], level2Name);
                currentChapter = { title: displayChapterTitle, paragraphs: [] };
                currentPart.chapters.push(currentChapter);
            } else if (trimmedLine === "") {
                finalizeParagraph();
            } else {
                if (currentChapter) {
                    paragraphBuffer.push(trimmedLine);
                    if (this.bookDetails.isSavitri && trimmedLine.endsWith('.')) {
                        finalizeParagraph();
                    }
                }
            }
        }
        finalizeParagraph();
    },
    populateNavigation: function() {
        const tocContainer = this.elements.tocListContainer; if (!tocContainer) { console.error("BRG: TOC container not found."); return; } tocContainer.innerHTML = '';
        this.bookDetails.parsedStructure.parts.forEach((part, partIndex) => {
            const partElement = document.createElement('div'); partElement.className = 'toc-part-brg';
            const partTitleElement = document.createElement('h3');
            partTitleElement.innerHTML = this.formatTextSpans(part.title);
            partElement.appendChild(partTitleElement);
            const chapterListElement = document.createElement('ul');
            part.chapters.forEach((chapter, chapterIndex) => {
                const chapterItemElement = document.createElement('li');
                const chapterLinkElement = document.createElement('a');
                chapterLinkElement.href = '#';
                chapterLinkElement.innerHTML = this.formatTextSpans(chapter.title);
                chapterLinkElement.dataset.partIndex = partIndex;
                chapterLinkElement.dataset.chapterIndex = chapterIndex;
                chapterLinkElement.onclick = (event) => {
                    event.preventDefault();
                    this.setActiveTocLink(partIndex, chapterIndex);
                    this.displayChapter(partIndex, chapterIndex);
                };
                chapterItemElement.appendChild(chapterLinkElement);
                chapterListElement.appendChild(chapterItemElement);
            });
            partElement.appendChild(chapterListElement);
            tocContainer.appendChild(partElement);
        });
    },
    setActiveTocLink: function(partIndex, chapterIndex) {
        if (!this.elements.tocListContainer) return;
        const currentActive = this.elements.tocListContainer.querySelector('a.active');
        if (currentActive) currentActive.classList.remove('active');
        const newActiveLink = this.elements.tocListContainer.querySelector(`a[data-part-index="${partIndex}"][data-chapter-index="${chapterIndex}"]`);
        if (newActiveLink) {
            newActiveLink.classList.add('active');
            newActiveLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    // =================================================================================
    // MODIFIED FUNCTION
    // =================================================================================
    displayChapter: function(partIndex, chapterIndex) {
        console.log(`BRG: displayChapter(Part: ${partIndex}, Chapter: ${chapterIndex})`);
        const part = this.bookDetails.parsedStructure.parts[partIndex];
        const chapter = part ? part.chapters[chapterIndex] : null;

        if (!chapter || !this.elements.chapterTitleDisplay || !this.elements.contentDisplay) {
            console.error("BRG: Chapter or essential display elements not found.");
            return;
        }

        this.elements.chapterTitleDisplay.innerHTML = this.formatTextSpans(chapter.title);
        let chapterHTML = "";
        if (chapter.paragraphs && chapter.paragraphs.length > 0) {
            chapter.paragraphs.forEach(paragraphContent => {
                chapterHTML += `<p>${paragraphContent}</p>\n`;
            });
        } else {
            chapterHTML = "<p><em>No content for this section.</em></p>";
        }

        this.elements.contentDisplay.innerHTML = chapterHTML;
        this.elements.contentDisplay.scrollTop = 0;
        this.elements.contentDisplay.style.display = 'block';

        let initialSearchTerm = '';
        if (this.performSearchOnInit && this.currentTargetString) {
            initialSearchTerm = this.currentTargetString;
            if (this.elements.searchInput) {
                this.elements.searchInput.value = initialSearchTerm;
                this.elements.searchClearButton.style.display = initialSearchTerm ? 'inline-block' : 'none';
            }
            this.performSearchOnInit = false; // Reset flag
            this.currentTargetString = null; // Clear target
        } else {
            initialSearchTerm = this.currentSearchTerm; // Carry over active search
        }

        // We use a short timeout to ensure the DOM is fully rendered before we
        // start manipulating it with search highlighting. This solves auto-jump issues.
        setTimeout(() => {
            this.performSearch(initialSearchTerm);
        }, 100);
    },

    formatTextSpans: function(text) {
        if (typeof text !== 'string') text = String(text);
        let safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        safeText = safeText.replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, '$1<em>$2</em>$3');
        safeText = safeText.replace(/(^|[^\w])\*([^*]+)\*([^\w]|$)/g, '$1<strong>$2</strong>$3');
        safeText = safeText.replace(/(\b\w+(?:["”’s]?))\.(?<!\d\.)(\d+)(?!\.\d)/g, '$1<sup>$2</sup>');
        return safeText;
    },

    applyDefinitionMarkings: function(containerElement) {
        if (!this.definitionsMap || this.definitionsMap.size === 0) return;
        const termsForRegex = Array.from(this.definitionsMap.keys());
        if (termsForRegex.length === 0) return;
        const escapedTerms = termsForRegex.map(term => this.escapeRegExp(term));
        const termsRegex = new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");
        const walker = document.createTreeWalker(
            containerElement,
            NodeFilter.SHOW_TEXT,
            (node) => {
                const parent = node.parentNode;
                if (!parent || parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE' ||
                    parent.classList.contains('definable-word-brg') ||
                    parent.classList.contains('brg-definition-tooltip') ) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
            false
        );
        let textNode;
        const nodesToModify = [];
        while (textNode = walker.nextNode()) {
            const textContent = textNode.nodeValue;
            let match;
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();
            let hasMatchesInNode = false;
            termsRegex.lastIndex = 0;
            while ((match = termsRegex.exec(textContent)) !== null) {
                const matchedOriginalCase = match[0];
                const matchedTermKey = match[1].toLowerCase();
                if (this.definitionsMap.has(matchedTermKey)) {
                    hasMatchesInNode = true;
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(textContent.substring(lastIndex, match.index)));
                    }
                    const span = document.createElement('span');
                    span.className = 'definable-word-brg';
                    span.dataset.term = matchedTermKey;
                    span.textContent = matchedOriginalCase;
                    fragment.appendChild(span);
                    lastIndex = termsRegex.lastIndex;
                }
            }
            if (hasMatchesInNode) {
                if (lastIndex < textContent.length) {
                    fragment.appendChild(document.createTextNode(textContent.substring(lastIndex)));
                }
                nodesToModify.push({ originalNode: textNode, replacementFragment: fragment });
            }
        }
        nodesToModify.forEach(mod => {
            if (mod.originalNode.parentNode) {
                mod.originalNode.parentNode.replaceChild(mod.replacementFragment, mod.originalNode);
            }
        });
    },

    handleContentMouseOver: function(event) {
        const target = event.target;
        if (target.classList.contains('definable-word-brg')) {
            const termKey = target.dataset.term;
            const definitionEntry = this.definitionsMap.get(termKey);
            if (definitionEntry) {
                this.showDefinitionTooltip(target, definitionEntry);
            }
        }
    },

    handleContentMouseOut: function(event) {
        const target = event.target;
        if (target.classList.contains('definable-word-brg')) {
            setTimeout(() => {
                if (this.activeDefinitionTooltip && !target.matches(':hover') && !this.activeDefinitionTooltip.matches(':hover')) {
                    this.hideDefinitionTooltip();
                }
            }, 100);
        }
    },
    
    handleDocumentClickForTooltip: function(event) {
        if (this.activeDefinitionTooltip) {
            const isClickInsideTooltip = this.activeDefinitionTooltip.contains(event.target);
            const isClickOnDefinableWord = event.target.classList.contains('definable-word-brg');
            if (!isClickInsideTooltip && !isClickOnDefinableWord) {
                this.hideDefinitionTooltip();
            }
        }
    },

    showDefinitionTooltip: function(targetElement, definitionEntry) {
        this.hideDefinitionTooltip();
        const tooltip = document.createElement('div');
        tooltip.className = 'brg-definition-tooltip';
        let content = `<h4>${this.escapeHtml(definitionEntry.term)}</h4>`;
        content += `<p>${this.escapeHtml(definitionEntry.definition)}</p>`;
        if (definitionEntry.source) {
            content += `<div class="source">Source: ${this.escapeHtml(definitionEntry.source)}</div>`;
        }
        tooltip.innerHTML = content;
        this.elements.readerWrapper.appendChild(tooltip);
        this.activeDefinitionTooltip = tooltip;
        const targetRect = targetElement.getBoundingClientRect();
        const readerRect = this.elements.readerWrapper.getBoundingClientRect();
        let top = targetRect.bottom - readerRect.top + 8;
        let left = targetRect.left - readerRect.left;
        tooltip.style.left = `${Math.max(0, left)}px`;
        tooltip.style.top = `${Math.max(0, top)}px`;
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > readerRect.right - 10) {
            left = readerRect.right - readerRect.left - tooltip.offsetWidth - 10;
            tooltip.style.left = `${Math.max(0, left)}px`;
        }
        if (tooltipRect.bottom > readerRect.bottom -10 ) {
            top = targetRect.top - readerRect.top - tooltip.offsetHeight - 8;
            tooltip.style.top = `${Math.max(0, top)}px`;
        }
         if (tooltip.offsetLeft < 5) tooltip.style.left = '5px';
         if (tooltip.offsetTop < 5) tooltip.style.top = '5px';
    },

    hideDefinitionTooltip: function() {
        if (this.activeDefinitionTooltip) {
            this.activeDefinitionTooltip.remove();
            this.activeDefinitionTooltip = null;
        }
    },

    handleSearchInput: function(event) {
        const searchTerm = event.target.value;
        if (this.elements.searchClearButton) {
            this.elements.searchClearButton.style.display = searchTerm ? 'inline-block' : 'none';
        }
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(searchTerm);
        }, 300);
    },
    handleClearSearch: function() {
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.searchClearButton) this.elements.searchClearButton.style.display = 'none';
        this.performSearch('');
    },
    
    // =================================================================================
    // MODIFIED/NEW FUNCTIONS
    // =================================================================================

    /**
     * The main function to perform a search. It now orchestrates the entire process of
     * cleaning the DOM, applying search highlights, and then reapplying definition links
     * to ensure the search works on clean, contiguous text.
     * @param {string} term The string to search for.
     */
    performSearch: function(term) {
        this.currentSearchTerm = term.trim();

        // 1. Clear all existing markings (both highlights and definitions) to get a
        // clean DOM with normalized text nodes, which is essential for searching.
        this.clearSearchHighlights();
        this.clearDefinitionMarkings();

        // 2. If there's a search term, apply the highlights to the clean DOM.
        if (this.currentSearchTerm) {
            const found = this.applySearchHighlights(this.currentSearchTerm);
            // Scroll to the first highlight before reapplying definitions.
            if (found) {
                this.scrollToFirstHighlight();
            }
        }

        // 3. ALWAYS re-apply the definition markings as the final step. This function
        // is robust enough to add spans inside or outside of the <mark> tags.
        this.applyDefinitionMarkings(this.elements.contentDisplay);
    },

    /**
     * NEW FUNCTION: Removes all definition spans from the content, unwrapping the text
     * within them and normalizing the text nodes. This is crucial for restoring
     * text contiguity before a search is performed.
     */
    clearDefinitionMarkings: function() {
        if (!this.elements.contentDisplay) return;
        const definitions = this.elements.contentDisplay.querySelectorAll('span.definable-word-brg');
        definitions.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                // Move the span's text content out to be a direct child of the parent.
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                // Remove the now-empty span.
                parent.removeChild(span);
                // Merge any adjacent text nodes that were created by this process.
                parent.normalize();
            }
        });
    },

    // =================================================================================
    // END OF MODIFIED/NEW FUNCTIONS
    // =================================================================================

    clearSearchHighlights: function() {
        if (!this.elements.contentDisplay) return;
        const highlights = this.elements.contentDisplay.querySelectorAll('mark.brg-search-highlight');
        highlights.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
                parent.normalize();
            }
        });
    },
    applySearchHighlights: function(term) {
        if (!this.elements.contentDisplay || !term) {
            return false;
        }
        const searchTerm = term.trim();
        if (searchTerm === "") {
            return false;
        }
        let matchFound = false;
        const regex = new RegExp(this.escapeRegExp(searchTerm), 'gi');
        const walker = document.createTreeWalker(
            this.elements.contentDisplay,
            NodeFilter.SHOW_TEXT,
            function(node) {
                const parentName = node.parentNode ? node.parentNode.nodeName.toUpperCase() : '';
                if (parentName === 'SCRIPT' || parentName === 'STYLE' ||
                    (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('brg-search-highlight')) ||
                    (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('brg-definition-tooltip'))
                    ) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
            false
        );
        let textNode;
        const nodesToModify = [];
        while (textNode = walker.nextNode()) {
            const textContent = textNode.nodeValue;
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();
            let localMatchFound = false;
            let matchInstance;
            regex.lastIndex = 0;
            while ((matchInstance = regex.exec(textContent)) !== null) {
                localMatchFound = true;
                matchFound = true;
                if (matchInstance.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(textContent.substring(lastIndex, matchInstance.index)));
                }
                const markElement = document.createElement('mark');
                markElement.className = 'brg-search-highlight';
                markElement.textContent = matchInstance[0];
                fragment.appendChild(markElement);
                lastIndex = regex.lastIndex;
                if (regex.lastIndex === matchInstance.index) { regex.lastIndex++; }
            }
            if (localMatchFound) {
                if (lastIndex < textContent.length) {
                    fragment.appendChild(document.createTextNode(textContent.substring(lastIndex)));
                }
                nodesToModify.push({ originalNode: textNode, replacementFragment: fragment });
            }
        }
        nodesToModify.forEach(mod => {
            if (mod.originalNode.parentNode) {
                mod.originalNode.parentNode.replaceChild(mod.replacementFragment, mod.originalNode);
            }
        });
        return matchFound;
    },
    scrollToFirstHighlight: function() {
        if (!this.elements.contentDisplay) return;
        const firstHighlight = this.elements.contentDisplay.querySelector('mark.brg-search-highlight');
        if (firstHighlight) {
            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

