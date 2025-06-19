// IndraViewer.js
// Version 2.3: Added tooltips with definitions to suggestion tags.
// Version 2.2: Corrected suggestion order to show primary matches first.
// Version 2.1: Combined "starts with" and "sub-term" search suggestions on any input.
// Version 2.0: Added secondary search results for exact matches.
// Version 1.9: Fixed bug where clicking a suggestion tag always loaded the first autocomplete suggestion.
// Version 1.8: Differentiated sub-term suggestion tags with a unique color.
// Version 1.7: Prioritizes exact matches for sub-term suggestions, allowing "locking".
// Version 1.6: Added sub-term suggestion tags on exact search match.
// Version 1.5: Ensured 'Enter' key uses autocomplete suggestion for search.
// Version 1.4: Fixed form submission via "Enter" key.
// Version 1.3: Refactored bottom controls layout and added suggestion tags for search.
// Version 1.2: Fixed search suggestion font size inconsistency.
// Merged AcademyGame and JsonDataTableRenderer into a single component.

const AcademyGame = {
    // --- Properties ---
    id: 'AcademyGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    // File index for the search functionality
    searchableFiles: [
        'JSON/EIN.json' // Default file
    ],

    // Cached DOM elements
    elements: {
        exitButton: null,
        historyArea: null,
        errorArea: null,
        contentArea: null
    },

    // --- State Properties ---
    currentFilePathContext: null,
    navigationHistory: [],
    _searchIndexData: null, // NEW: Will hold the full search_index.json content
    _searchTermIndex: [], // Will hold terms from search_index.json
    _suggestionTagsContainer: null, // Container for suggestion tags
    _resolvedLinkPathsCache: new Map(),
    _fileSearchIndex: new Map(), // Still used for fallback file searching
    _currentTableData: [],
    _currentTableHeaders: [],
    _currentSortColumn: null,
    _currentSortDirection: 'asc',
    _currentColumnWidths: new Map(),
    _cellLineClamp: 1,
    _lineClampControls: null,
    _imageSize: 50,
    _imageSizeControls: null,

    // --- Core Methods ---

    /**
     * Initializes the IndraViewer component.
     * @param {HTMLElement} container - The element to render the viewer into.
     * @param {function} successCallback - Function to call on successful exit.
     * @param {function} failureCallback - Function to call on failure.
     * @param {object} sharedData - Data to be passed back on exit.
     */
    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log("IndraViewer v2.3: Initializing.");

        this.renderBaseLayout();
        this.cacheElements();
        this.applyStyles();
        this._injectStyles();

        this.containerElement = this.elements.contentArea;
        this.errorDisplayElement = this.elements.errorArea;
        this.historyDisplayElement = this.elements.historyArea;

        if (!this.containerElement) {
            console.error("IndraViewer: FATAL - Content area element not found.");
            return;
        }

        // Setup file and term search capabilities
        this.setSearchableFiles(this.searchableFiles);
        this._loadSearchIndex(); // Load the dedicated search terms
        
        this.attachEventListeners();

        // Load the initial JSON file
        this.renderUrl('JSON/EIN.json', 'EIN', true);
    },

    /**
     * Renders the main HTML structure for the viewer.
     */
    renderBaseLayout: function() {
        this.container.innerHTML = `
            <div class="indra-viewer-container">
                <div class="indra-viewer-header">
                    <h1>Indra</h1>
                    <button id="indraExitBtn" class="indra-viewer-button">Exit</button>
                </div>
                <div id="indraHistoryArea" class="indra-viewer-history-area"></div>
                <div id="indraErrorArea" class="indra-viewer-error-area"></div>
                <div id="indraContentArea" class="indra-viewer-content-area">
                    Initializing Indra Viewer...
                </div>
            </div>
        `;
    },

    /**
     * Caches references to key DOM elements.
     */
    cacheElements: function() {
        this.elements.exitButton = document.getElementById('indraExitBtn');
        this.elements.historyArea = document.getElementById('indraHistoryArea');
        this.elements.errorArea = document.getElementById('indraErrorArea');
        this.elements.contentArea = document.getElementById('indraContentArea');
    },

    /**
     * Applies the main CSS styles for the component layout.
     */
    applyStyles: function() {
        let style = document.getElementById('indraViewerStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'indraViewerStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .indra-viewer-container { display: flex; flex-direction: column; height: 100%; font-family: 'Arial', sans-serif; background-color: #fff; color: #2c3e50; font-size: 14px; }
            .indra-viewer-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background-color: #f8f9fa; border-bottom: 1px solid #d1d9e0; flex-shrink: 0; }
            .indra-viewer-header h1 { margin: 0; font-size: 1.7em; color: #34495e; }
            .indra-viewer-button { padding: 4px 12px; font-size: 1.3em; color: #fff; background-color: #7f8c8d; border: none; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; }
            .indra-viewer-button:hover { background-color: #6c7a7b; }
            .indra-viewer-history-area { padding: 10px 15px; background-color: #f8f9fa; border-bottom: 1px solid #d1d9e0; flex-shrink: 0; font-size: 1.3em; }

            .indra-viewer-error-area { display:none; color: red; padding: 10px; background-color: #ffebee; border: 1px solid #e57373; margin: 10px 15px 0 15px; font-weight: bold; border-radius: 4px; }
            .indra-viewer-content-area { padding: 15px; flex-grow: 1; overflow-y: auto; font-family: 'Menlo', 'Consolas', monospace; font-size: 0.95em; line-height: 1.6; color: #333; }
            /* --- CSS FOR SEARCH ALIGNMENT --- */
            .jdt-search-wrapper { 
                position: relative; 
                display: inline-block; /* Or use flex/grid on parent */
            }

            .jdt-search-input, .jdt-search-suggestion {
                margin: 0;
                padding: 6px 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-family: 'Arial', sans-serif;
                font-size: 16px;
                line-height: normal;
                box-sizing: border-box; 
                width: 220px; 
                height: 32px; 
            }

            .jdt-search-input {
                background-color: transparent; 
                position: relative;
                z-index: 2; 
            }

            .jdt-search-suggestion {
                position: absolute;
                top: 0;
                left: 0;
                color: #adb5bd;
                background-color: white; 
                pointer-events: none;
                z-index: 1; 
                white-space: nowrap;
                overflow: hidden;
            }
            .jdt-control-form { display: inline-flex; align-items: center; gap: 5px; }
            .jdt-control-label { color: #555; font-size: 0.9em; }
            .jdt-control-input { width: 60px; font-size:14px; }
            .jdt-json-link { color: #007bff; text-decoration: none; font-weight: 500; cursor: pointer; }
            .jdt-json-link:hover { text-decoration: underline; }


        /* Style for sub-term (primary) suggestions */
            .jdt-suggestion-tag.jdt-sub-suggestion-tag { background-color: #e0f2fe; color: #0c5464; border-color: #b3e5fc; }
            .jdt-suggestion-tag.jdt-sub-suggestion-tag:hover { background-color: #b3e5fc; border-color: #81d4fa; }
            /* NEW: Style for secondary (contextual) matches */
            .jdt-suggestion-tag.jdt-secondary-suggestion-tag { background-color: #6c757d; color: #fff; border-color: #5a6268; }
            .jdt-suggestion-tag.jdt-secondary-suggestion-tag:hover { background-color: #5a6268; border-color: #545b62; }
            .jdt-right-controls { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
     
        `;
    },

    /**
     * Attaches necessary event listeners.
     */
    attachEventListeners: function() {
        if (this.elements.exitButton) {
            this.elements.exitButton.onclick = () => {
                if (this.successCallback) {
                    this.successCallback(this.sharedData);
                }
            };
        }
    },

    /**
     * Cleans up the component, removing its UI and resetting state.
     */
    destroy: function() {
        console.log("IndraViewer: Destroying...");
        if (this.container) this.container.innerHTML = '';
        
        this.navigationHistory = [];
        this._searchIndexData = null;
        this._searchTermIndex = [];
        this._resolvedLinkPathsCache.clear();
        this._fileSearchIndex.clear();
        this._currentTableData = [];
        this._currentTableHeaders = [];
        
        const mainStyle = document.getElementById('indraViewerStyle');
        if (mainStyle) mainStyle.remove();
        const jdtStyle = document.getElementById('jdt-styles');
        if (jdtStyle) jdtStyle.remove();

        this.container = null;
        this.successCallback = null;
        this.failureCallback = null;
        this.sharedData = null;
    },
    
    /**
     * Loads and parses the search index file to populate autocomplete suggestions.
     */
    _loadSearchIndex: function() {
        console.log("IndraViewer: Loading search index...");
        fetch('JSON/search_index.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (typeof data === 'object' && data !== null) {
                    this._searchIndexData = data; // Keep the whole object for secondary searches
                    this._searchTermIndex = Object.keys(data);
                    console.log(`IndraViewer: Search index loaded with ${this._searchTermIndex.length} terms.`);
                } else {
                    console.warn("IndraViewer: search_index.json did not contain a valid JSON object.");
                    this._searchIndexData = {};
                }
            })
            .catch(error => {
                console.error("IndraViewer: Failed to load or parse search_index.json.", error);
                this._searchIndexData = {}; // Ensure it's an object on error
            });
    },

    // --- Data Rendering and Interaction Methods (formerly JsonDataTableRenderer) ---

    setSearchableFiles: function(fileList) {
        if (!Array.isArray(fileList)) {
            console.error("IndraViewer: setSearchableFiles expects an array of file paths.");
            return;
        }
        this._fileSearchIndex.clear();
        const uniqueFiles = [...new Set(fileList)];
        uniqueFiles.forEach(filePath => {
            const displayName = this._getDisplayNameFromInput(filePath, false);
            this._fileSearchIndex.set(displayName.toLowerCase(), filePath);
        });
        console.log(`IndraViewer: Initialized file search index with ${this._fileSearchIndex.size} files.`);
    },
    
    setCellLineClamp: function(lines) {
        const newClampValue = (typeof lines === 'number' && lines > 0) ? Math.floor(lines) : 1;
        if (this._cellLineClamp === newClampValue) return;

        this._cellLineClamp = newClampValue;
        console.log(`IndraViewer: Cell line clamp set to ${this._cellLineClamp}`);

        if (this._lineClampControls && this._lineClampControls.input) {
            this._lineClampControls.input.value = this._cellLineClamp;
        }

        if (this.containerElement) {
            const table = this.containerElement.querySelector('.jdt-table');
            if (table && table.tBodies[0]) {
                this._renderTableBody(table.tBodies[0]);
            }
        }
    },
    
    setImageSize: function(size) {
        const newSize = Math.max(40, Math.min(300, Number(size) || 50));
        if (this._imageSize === newSize) return;

        this._imageSize = newSize;
        console.log(`IndraViewer: Image size set to ${this._imageSize}px`);

        if (this._imageSizeControls && this._imageSizeControls.input) {
            this._imageSizeControls.input.value = this._imageSize;
        }

        if (this.containerElement) {
            const table = this.containerElement.querySelector('.jdt-table');
            if (table && table.tBodies[0]) {
                this._renderTableBody(table.tBodies[0]);
            }
        }
    },

    renderUrl: function(jsonUrl, clickedLinkTextForHistory = null, isInitialLoad = false) {
        if (!this.containerElement) {
            this._displayRendererError("Not initialized.");
            return;
        }

        const resolvedJsonUrlForFetch = new URL(jsonUrl, window.location.href).href;
        let currentDisplayName;

        if (isInitialLoad) {
            currentDisplayName = this._getDisplayNameFromInput(resolvedJsonUrlForFetch, false);
            this.navigationHistory = [{ displayName: currentDisplayName, filePath: resolvedJsonUrlForFetch }];
        } else {
            currentDisplayName = clickedLinkTextForHistory || this._getDisplayNameFromInput(resolvedJsonUrlForFetch, false);
            const existingIndex = this.navigationHistory.findIndex(item => item.filePath === resolvedJsonUrlForFetch);
            if (existingIndex !== -1) {
                this.navigationHistory = this.navigationHistory.slice(0, existingIndex + 1);
                this.navigationHistory[existingIndex].displayName = currentDisplayName;
            } else {
                this.navigationHistory.push({ displayName: currentDisplayName, filePath: resolvedJsonUrlForFetch });
            }
        }

        if (this.historyDisplayElement) {
            this._renderHistoryDOM();
        }

        this.containerElement.innerHTML = `<p class="jdt-loading-message">Loading ${this._escapeHtml(currentDisplayName)}...</p>`;
        if (this.errorDisplayElement) {
            this.errorDisplayElement.style.display = 'none';
        }

        fetch(resolvedJsonUrlForFetch)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                this.currentFilePathContext = resolvedJsonUrlForFetch;
                this._currentSortColumn = null;
                this._currentSortDirection = 'asc';
                this._renderDataAsTable(data, this.containerElement);
            })
            .catch(error => {
                const errorMessage = `Error loading or parsing ${this._escapeHtml(currentDisplayName)}: ${this._escapeHtml(error.message)}`;
                this._displayRendererError(errorMessage);
            });
    },

    _renderDataAsTable: function(data, parentElement) {
        parentElement.innerHTML = '';
        if (typeof data !== 'object' || data === null) {
            const pre = document.createElement('pre');
            pre.className = 'jdt-preformatted';
            pre.textContent = JSON.stringify(data, null, 2);
            parentElement.appendChild(pre);
            return;
        }

        this._processAndStoreData(data);

        if (this._currentTableHeaders.length === 0) {
            this._renderDataRecursive(data, parentElement);
            return;
        }

        this._currentColumnWidths = this._calculateColumnWidths();

        const tableContainer = document.createElement('div');
        tableContainer.className = 'jdt-table-container';
        const table = document.createElement('table');
        table.className = 'jdt-table';
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const tbody = table.createTBody();

        this._currentTableHeaders.forEach(headerKey => {
            const th = document.createElement('th');
            th.textContent = this._formatKeyAsHeader(headerKey);
            th.classList.add('jdt-sortable', 'jdt-col-' + String(headerKey).toLowerCase().replace(/[^a-z0-9]/g, '-'));
            th.dataset.sortKey = headerKey;
            th.onclick = (e) => this._sortTableByColumn(e);
            if (this._currentColumnWidths.has(headerKey)) {
                th.style.width = `${this._currentColumnWidths.get(headerKey)}px`;
            }
            headerRow.appendChild(th);
        });

        this._renderTableBody(tbody);
        this._updateHeaderSortClasses(thead);
        tableContainer.appendChild(table);
        parentElement.appendChild(tableContainer);
    },

    _calculateColumnWidths: function() {
        const headers = this._currentTableHeaders;
        const data = this._currentTableData;
        const columnWidths = new Map();
        const PADDING = 25;
        const CHAR_WIDTH_ESTIMATE = 8;
        const MIN_WIDTH = 100;
        const MAX_WIDTH = 350;

        const maxLens = {};
        headers.forEach(header => {
            maxLens[header] = this._formatKeyAsHeader(header).length;
        });

        data.forEach(row => {
            headers.forEach(header => {
                const value = row[header] ?? '';
                let valueLen = 0;

                if (this._isImageUrl(value) || header === 'imgs' || header === 'img') {
                    valueLen = 10;
                } else {
                    valueLen = (typeof value === 'object') ? JSON.stringify(value).length : String(value).length;
                }

                if (valueLen > (maxLens[header] || 0)) {
                    maxLens[header] = valueLen;
                }
            });
        });

        headers.forEach(header => {
            let width = Math.max(
                MIN_WIDTH,
                (maxLens[header] * CHAR_WIDTH_ESTIMATE) + PADDING
            );
            width = Math.min(MAX_WIDTH, width);
            columnWidths.set(header, width);
        });

        return columnWidths;
    },

    _processAndStoreData: function(data) {
        let headers = new Set();
        let processedData = [];
        const topLevelKeys = Object.keys(data);

        if (!Array.isArray(data) && topLevelKeys.length > 0 && topLevelKeys.every(key => typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key]))) {
            headers.add('Term');
            topLevelKeys.forEach(termKey => {
                Object.keys(data[termKey]).forEach(innerKey => headers.add(innerKey));
            });
            processedData = topLevelKeys.map(termKey => ({ ...data[termKey],
                'Term': termKey
            }));
        } else if (Array.isArray(data)) {
            data.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    Object.keys(item).forEach(key => headers.add(key));
                }
            });
            processedData = data.filter(item => typeof item === 'object' && item !== null);
        } else if (typeof data === 'object' && data !== null) {
            Object.keys(data).forEach(key => headers.add(key));
            processedData = [data];
        }

        const finalHeaders = Array.from(headers);
        ['Term', 'Key', 'id', 'title'].forEach(priorityKey => {
            if (finalHeaders.includes(priorityKey)) {
                finalHeaders.splice(finalHeaders.indexOf(priorityKey), 1);
                finalHeaders.unshift(priorityKey);
            }
        });

        this._currentTableHeaders = finalHeaders;
        this._currentTableData = processedData;
    },

    _renderTableBody: function(tbody) {
        tbody.innerHTML = '';
        const getHeaderClass = (headerText) => 'jdt-col-' + String(headerText).toLowerCase().replace(/[^a-z0-9]/g, '-');
        this._currentTableData.forEach(rowData => {
            const row = tbody.insertRow();
            this._currentTableHeaders.forEach(headerKey => {
                const cell = row.insertCell();
                cell.classList.add(getHeaderClass(headerKey));
                if (this._currentColumnWidths.has(headerKey)) {
                    cell.style.width = `${this._currentColumnWidths.get(headerKey)}px`;
                }
                const cellValue = rowData[headerKey];
                if (headerKey === 'Term' && typeof cellValue === 'string') {
                    const fileName = cellValue.replace(/\s+/g, '_') + '.json';
                    this._createAndAppendLinkableElement(cell, fileName, cellValue, true);
                } else {
                    this._populateCell(cell, cellValue, headerKey);
                }
            });
        });
    },

    _sortTableByColumn: function(event) {
        const th = event.currentTarget;
        const sortKey = th.dataset.sortKey;
        if (!sortKey) return;
        const directionChanged = this._currentSortColumn === sortKey;
        if (directionChanged) {
            this._currentSortDirection = this._currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this._currentSortColumn = sortKey;
            this._currentSortDirection = 'asc';
        }
        const collator = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: 'base'
        });
        const direction = this._currentSortDirection === 'asc' ? 1 : -1;
        this._currentTableData.sort((a, b) => {
            let valA = a[sortKey] ?? '';
            let valB = b[sortKey] ?? '';
            return collator.compare(String(valA), String(valB)) * direction;
        });
        const table = this.containerElement.querySelector('.jdt-table');
        if (table) {
            this._updateHeaderSortClasses(table.querySelector('thead'));
            this._renderTableBody(table.querySelector('tbody'));
        }
    },

    _renderHistoryDOM: function() {
        if (!this.historyDisplayElement) return;
        this.historyDisplayElement.innerHTML = ''; // Clear previous content

        // --- BREADCRUMBS ---
        const topControlsContainer = document.createElement('div');
        topControlsContainer.className = 'jdt-top-controls';
        const breadcrumbsContainer = document.createElement('div');
        breadcrumbsContainer.className = 'jdt-breadcrumbs-container';
        this.navigationHistory.forEach((item, index) => {
            const link = document.createElement('a');
            link.className = 'jdt-history-link';
            link.textContent = this._escapeHtml(item.displayName);
            link.href = '#';
            link.title = `Load ${this._escapeHtml(item.filePath)}`;
            link.onclick = (e) => {
                e.preventDefault();
                this.renderUrl(item.filePath, item.displayName, false);
            };
            breadcrumbsContainer.appendChild(link);
            if (index < this.navigationHistory.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'jdt-history-separator';
                separator.textContent = ' > ';
                breadcrumbsContainer.appendChild(separator);
            }
        });
        topControlsContainer.appendChild(breadcrumbsContainer);
        this.historyDisplayElement.appendChild(topControlsContainer);

        // --- BOTTOM CONTROLS (Search, Tags, Settings) ---
        const bottomControlsContainer = document.createElement('div');
        bottomControlsContainer.className = 'jdt-bottom-controls';

        // Left side container for search input and suggestion tags
        const searchAndSuggestionsWrapper = document.createElement('div');
        searchAndSuggestionsWrapper.className = 'jdt-search-suggestions-wrapper';

        if (this._fileSearchIndex.size > 0) {
            const searchForm = document.createElement('form');
            searchForm.className = 'jdt-search-form';
            searchForm.noValidate = true;
            searchForm.onsubmit = (e) => this._handleFileSearch(e);

            const wrapper = document.createElement('div');
            wrapper.className = 'jdt-search-wrapper';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'jdt-search-input';
            searchInput.placeholder = 'Search terms...';
            searchInput.autocomplete = 'off';

            const suggestionSpan = document.createElement('div');
            suggestionSpan.className = 'jdt-search-suggestion';

            searchInput.oninput = (e) => this._handleAutocompleteInput(e);
            searchInput.onkeydown = (e) => this._handleAutocompleteKeydown(e);
            searchInput.onblur = (e) => {
                e.target.previousElementSibling.textContent = '';
                // Use a timeout to allow a click on a suggestion tag to register before the tags are cleared
                setTimeout(() => this._clearSuggestionTags(), 150);
            };

            wrapper.appendChild(suggestionSpan);
            wrapper.appendChild(searchInput);
            searchForm.appendChild(wrapper);
            searchAndSuggestionsWrapper.appendChild(searchForm);

            // Container for clickable suggestion tags
            const suggestionTagsContainer = document.createElement('div');
            suggestionTagsContainer.className = 'jdt-suggestion-tags';
            this._suggestionTagsContainer = suggestionTagsContainer; // Cache the element
            searchAndSuggestionsWrapper.appendChild(suggestionTagsContainer);
        }

        // Right side container for view controls
        const rightControlsWrapper = document.createElement('div');
        rightControlsWrapper.className = 'jdt-right-controls';

        // 'Show Lines' control
        const clampControlForm = document.createElement('form');
        clampControlForm.className = 'jdt-control-form';
        clampControlForm.title = 'Set the number of text lines to show per cell before truncating.';
        clampControlForm.onsubmit = (e) => e.preventDefault();
        const clampLabel = document.createElement('label');
        clampLabel.htmlFor = 'jdt-clamp-input';
        clampLabel.textContent = 'Show Lines:';
        clampLabel.className = 'jdt-control-label';
        const clampInput = document.createElement('input');
        clampInput.type = 'number';
        clampInput.id = 'jdt-clamp-input';
        clampInput.className = 'jdt-control-input';
        clampInput.min = "1";
        clampInput.step = "1";
        clampInput.value = this._cellLineClamp;
        clampInput.onchange = (e) => this.setCellLineClamp(e.target.valueAsNumber);
        clampControlForm.appendChild(clampLabel);
        clampControlForm.appendChild(clampInput);
        rightControlsWrapper.appendChild(clampControlForm);
        this._lineClampControls = {
            form: clampControlForm,
            input: clampInput
        };

        // 'Image Size' control
        const imageSizeControlForm = document.createElement('form');
        imageSizeControlForm.className = 'jdt-control-form';
        imageSizeControlForm.title = 'Set the size of thumbnail images in cells (40-300px).';
        imageSizeControlForm.onsubmit = (e) => e.preventDefault();
        const imageSizeLabel = document.createElement('label');
        imageSizeLabel.htmlFor = 'jdt-image-size-input';
        imageSizeLabel.textContent = 'Image Size:';
        imageSizeLabel.className = 'jdt-control-label';
        const imageSizeInput = document.createElement('input');
        imageSizeInput.type = 'number';
        imageSizeInput.id = 'jdt-image-size-input';
        imageSizeInput.className = 'jdt-control-input';
        imageSizeInput.min = "40";
        imageSizeInput.max = "300";
        imageSizeInput.step = "10";
        imageSizeInput.value = this._imageSize;
        imageSizeInput.onchange = (e) => this.setImageSize(e.target.valueAsNumber);
        const pxLabel = document.createElement('span');
        pxLabel.textContent = 'px';
        pxLabel.className = 'jdt-control-label';
        imageSizeControlForm.appendChild(imageSizeLabel);
        imageSizeControlForm.appendChild(imageSizeInput);
        imageSizeControlForm.appendChild(pxLabel);
        rightControlsWrapper.appendChild(imageSizeControlForm);
        this._imageSizeControls = {
            form: imageSizeControlForm,
            input: imageSizeInput
        };

        // Append the main layout containers
        bottomControlsContainer.appendChild(searchAndSuggestionsWrapper);
        bottomControlsContainer.appendChild(rightControlsWrapper);
        this.historyDisplayElement.appendChild(bottomControlsContainer);
    },

    _handleAutocompleteInput: async function(event) {
        const input = event.target;
        const suggestionEl = input.previousElementSibling;
        const term = input.value;
        const termLower = term.toLowerCase();

        // Always clear previous state on new input
        suggestionEl.textContent = '';
        input.dataset.suggestion = '';
        this._clearSuggestionTags();

        if (term.length === 0) {
            return;
        }

        // --- 1. Find "Starts With" Matches (Primary Suggestions) ---
        const startsWithMatches = this._searchTermIndex.filter(
            indexedTerm => indexedTerm.toLowerCase().startsWith(termLower)
        );

        const primarySuggestions = startsWithMatches.map(text => ({ text, type: 'primary' }));

        // Update the inline (grey) suggestion text
        if (startsWithMatches.length > 0) {
            const firstSuggestion = startsWithMatches[0];
            // Don't show inline suggestion if the typed term is an exact match itself
            if (firstSuggestion.toLowerCase() !== termLower) {
                suggestionEl.textContent = term + firstSuggestion.substring(term.length);
                input.dataset.suggestion = firstSuggestion;
            }
        }
        
        // --- 2. If the typed term is an exact match, find its sub-terms (Secondary Suggestions) ---
        const exactMatch = this._searchTermIndex.find(indexedTerm => indexedTerm.toLowerCase() === termLower);
        
        let combinedSuggestions = primarySuggestions;

        if (exactMatch) {
            // Get sub-terms, which the user wants styled as "secondary" (darker)
            const secondarySuggestions = await this._getSubTermSuggestions(exactMatch); 
            
            // Combine and de-duplicate, ensuring primary suggestions appear first.
            const suggestionMap = new Map();
            
            // Add primary (starts with) suggestions first.
            primarySuggestions.forEach(s => suggestionMap.set(s.text.toLowerCase(), s));
            
            // Add secondary (sub-term) suggestions, but don't overwrite existing primary ones.
            secondarySuggestions.forEach(s => {
                const key = s.text.toLowerCase();
                if (!suggestionMap.has(key)) {
                    suggestionMap.set(key, s);
                }
            });

            combinedSuggestions = Array.from(suggestionMap.values());
        }
        
        this._renderSuggestionTags(combinedSuggestions.slice(0, 112));
    },

    _handleAutocompleteKeydown: function(event) {
        // 'Tab' key accepts the current suggestion
        if (event.key === 'Tab' && event.target.dataset.suggestion) {
            event.preventDefault();
            event.target.value = event.target.dataset.suggestion;
            event.target.previousElementSibling.textContent = '';
            event.target.dataset.suggestion = '';

            // Trigger input event again to update suggestions for the new, completed value.
            // This will trigger the exact match logic if applicable.
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            event.target.dispatchEvent(inputEvent);
        }
    },

    /**
     * Finds other entries in the main search index that contain a given search term.
     * @param {string} searchTerm - The term to search for within other entries.
     * @returns {string[]} An array of keys for the matching entries.
     */
    _findSecondaryMatches: function(searchTerm) {
        const matches = new Set();
        const termLower = searchTerm.toLowerCase();

        if (!this._searchIndexData || termLower.length < 2) return [];

        for (const key in this._searchIndexData) {
            // Don't match the entry against its own key
            if (key.toLowerCase() === termLower) continue;

            try {
                // Search within the stringified content of the entry
                const entryString = JSON.stringify(this._searchIndexData[key]).toLowerCase();
                if (entryString.includes(termLower)) {
                    matches.add(key);
                }
            } catch (e) {
                // Ignore potential errors during stringification
                console.warn(`Could not search within entry: ${key}`, e);
            }
        }
        // Don't include the original search term in the secondary results
        matches.delete(searchTerm);
        return Array.from(matches);
    },
    
    /**
     * Fetches a JSON file for an exact match and returns its keys as suggestion objects.
     * @param {string} matchedTerm - The search term that was an exact match (e.g., "Alchemy").
     * @returns {Promise<object[]>} A promise that resolves to an array of suggestion objects.
     */
    _getSubTermSuggestions: async function(matchedTerm) {
        const conventionalFileName = matchedTerm.replace(/\s+/g, '_') + '.json';
        const filePath = 'JSON/' + conventionalFileName;

        try {
            const exists = await this._checkUrlExists(filePath);
            if (!exists) return [];

            const response = await fetch(filePath);
            if (!response.ok) return [];

            const data = await response.json();

            // We expect the data to be an object where keys are the terms.
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                const subTerms = Object.keys(data);
                if (subTerms.length > 0) {
                    // Return the keys as suggestion objects with type 'secondary' for styling
                    return subTerms.map(text => ({ text, type: 'secondary' }));
                }
            }
        } catch (error) {
            console.error(`IndraViewer: Error fetching/parsing sub-terms from ${filePath}`, error);
        }
        return []; // Return empty array on any failure
    },

    /**
     * Renders suggestion tags in the UI from an array of suggestion objects.
     * @param {object[]} suggestions - An array of suggestion objects, e.g., [{text: '...', type: '...'}].
     */
    _renderSuggestionTags: function(suggestions) {
        this._clearSuggestionTags();
        if (!this._suggestionTagsContainer || !suggestions || suggestions.length === 0) return;

        suggestions.forEach(suggestion => {
            const tag = document.createElement('button');
            tag.type = 'button'; // Prevent form submission
            tag.className = 'jdt-suggestion-tag';

            // Add a specific class based on the suggestion type for styling
            if (suggestion.type === 'subTerm') {
                tag.classList.add('jdt-sub-suggestion-tag');
            } else if (suggestion.type === 'secondary') {
                tag.classList.add('jdt-secondary-suggestion-tag');
            }
            // The 'primary' type uses the default .jdt-suggestion-tag style

            tag.textContent = this._escapeHtml(suggestion.text);
            
            // NEW: Add tooltip with definition if it exists
            const termData = this._searchIndexData[suggestion.text];
            if (termData && termData.definition) {
                tag.title = termData.definition;
            }

            tag.onclick = () => {
                const searchInput = this.container.querySelector('.jdt-search-input');
                if (searchInput) {
                    searchInput.value = suggestion.text;

                    // Clear the stale autocomplete suggestion before searching
                    searchInput.dataset.suggestion = '';
                    if (searchInput.previousElementSibling) {
                        searchInput.previousElementSibling.textContent = '';
                    }

                    // Directly trigger the search logic for the clicked tag
                    this._handleFileSearch({
                        preventDefault: () => {},
                        target: searchInput.form
                    });
                }
            };
            this._suggestionTagsContainer.appendChild(tag);
        });
    },

    _clearSuggestionTags: function() {
        if (this._suggestionTagsContainer) {
            this._suggestionTagsContainer.innerHTML = '';
        }
    },


    async _handleFileSearch(event) {
        event.preventDefault();
        const searchInput = this.historyDisplayElement.querySelector('.jdt-search-input');
        if (!searchInput) {
            console.error("IndraViewer: Could not find the search input field.");
            return;
        }

        let searchTerm = searchInput.value.trim();
        const suggestion = searchInput.dataset.suggestion;

        // If a suggestion is available, prioritize it for the search.
        // This makes the 'Enter' key accept the suggestion and search in one step.
        if (suggestion) {
            searchTerm = suggestion;
        }

        const searchTermLower = searchTerm.toLowerCase();
        if (!searchTerm) return;

        const conventionalFileName = searchTerm.replace(/\s+/g, '_') + '.json';
        const conventionalPath = 'JSON/' + conventionalFileName;
        const conventionalFileExists = await this._checkUrlExists(conventionalPath);
        let success = false;

        if (conventionalFileExists) {
            console.log(`Search: Found high-priority file at conventional path: ${conventionalPath}. Loading it.`);
            this.renderUrl(conventionalPath, searchTerm, false);
            success = true;
        } else {
            const filePath = this._fileSearchIndex.get(searchTermLower);
            if (filePath) {
                console.log(`Search: Conventional path not found. Loading from file index: ${filePath}`);
                this.renderUrl(filePath, searchTerm, false);
                success = true;
            }
        }

        if (success) {
            searchInput.value = '';
            searchInput.blur(); // Trigger blur to hide tags
            // Explicitly and immediately clear everything related to the last search
            if (searchInput.previousElementSibling) {
                searchInput.previousElementSibling.textContent = '';
            }
            searchInput.dataset.suggestion = '';
            this._clearSuggestionTags();
            searchInput.style.outline = '';
        } else {
            console.warn(`IndraViewer: Search term '${searchTerm}' did not resolve to a known file.`);
            searchInput.style.outline = '2px solid #dc3545';
            setTimeout(() => {
                searchInput.style.outline = '';
            }, 2500);
        }
    },

    _injectStyles: function() {
        const styleId = 'jdt-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .jdt-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 4px; border: 1px solid #e0e0e0; }
            .jdt-table { border-collapse: separate; border-spacing: 0; width: 100%; table-layout: fixed; }
            .jdt-table th, .jdt-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
            .jdt-table td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .jdt-clamp-wrapper { white-space: normal; text-overflow: ellipsis; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--line-clamp-value, 1); word-break: break-word; overflow-wrap: break-word; }
            .jdt-table th { background: #f8f9fa; font-weight: 600; position: sticky; top: 0; z-index: 10; cursor: pointer; }
            .jdt-table th.jdt-sort-asc::after { content: ' ▲'; }
            .jdt-table th.jdt-sort-desc::after { content: ' ▼'; }
            .jdt-table tr:last-child td { border-bottom: none; }
            .jdt-table-image { object-fit: cover; border-radius: 4px; display: inline-block; margin-right: 4px; cursor: pointer; }
            .jdt-image-cell { width: auto; white-space: normal; }
            #jdt-hover-preview { position: absolute; z-index: 1001; border: 2px solid #fff; border-radius: 4px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); pointer-events: none; max-width: 400px; max-height: 400px; animation: jdt-fade-in 0.15s ease-in; }
            #jdt-hover-preview img { display: block; width: 100%; height: 100%; border-radius: 2px; }
            @keyframes jdt-fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            
            /* --- NEW/MODIFIED STYLES FOR CONTROLS LAYOUT --- */
            .jdt-top-controls { margin-bottom: 12px; }
            .jdt-bottom-controls { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; }
            .jdt-search-suggestions-wrapper { display: flex; flex-direction: column; gap: 8px; flex-grow: 1; }
            .jdt-suggestion-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 30px; }
            .jdt-suggestion-tag { background-color: #e9ecef; color: #495057; border: 1px solid #ced4da; border-radius: 16px; padding: 4px 12px; font-size: 13px; cursor: pointer; transition: all 0.2s ease; -webkit-appearance: none; appearance: none; }
            .jdt-suggestion-tag:hover { background-color: #dee2e6; border-color: #adb5bd; }
           /* --- END NEW/MODIFIED STYLES --- */

            .jdt-history-link { color: #007bff; text-decoration: none; }
            .jdt-history-link:hover { text-decoration: underline; }
            .jdt-history-separator { color: #6c757d; margin: 0 0.5em; }
            .jdt-control-label { color: #555; font-size: 0.9em; }
            .jdt-json-link { color: #007bff; text-decoration: none; font-weight: 500; cursor: pointer; }
            .jdt-json-link:hover { text-decoration: underline; }
        `;
        document.head.appendChild(style);
    },

    _formatKeyAsHeader: function(key) {
        return String(key).replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
    },

    _updateHeaderSortClasses: function(thead) {
        if (!thead) return;
        thead.querySelectorAll('th').forEach(th => {
            th.classList.remove('jdt-sort-asc', 'jdt-sort-desc');
            if (th.dataset.sortKey === this._currentSortColumn) {
                th.classList.add(this._currentSortDirection === 'asc' ? 'jdt-sort-desc' : 'jdt-sort-desc');
            }
        });
    },

    _populateCell: function(cell, value, headerKey) {
        const isImageColumn = headerKey === 'img' || headerKey === 'imgs';
        const imageSources = Array.isArray(value) ? value : [value];
        cell.innerHTML = '';
        if (isImageColumn && imageSources.some(src => this._isImageUrl(src))) {
            cell.classList.add('jdt-image-cell');
            imageSources.forEach(imgUrl => {
                if (this._isImageUrl(imgUrl)) {
                    this._createImageThumbnail(imgUrl, cell);
                }
            });
        } else if (typeof value === 'string' && value.toLowerCase().endsWith('.json')) {
            this._createAndAppendLinkableElement(cell, value, value, false);
        } else if (value !== undefined && value !== null) {
            const textContent = (typeof value === 'object') ? JSON.stringify(value, null, 2) : String(value);
            cell.title = textContent;
            if (typeof value === 'object') {
                cell.textContent = textContent;
                cell.style.whiteSpace = 'pre-wrap';
            } else if (this._cellLineClamp > 1) {
                const wrapper = document.createElement('div');
                wrapper.className = 'jdt-clamp-wrapper';
                wrapper.style.setProperty('--line-clamp-value', this._cellLineClamp);
                wrapper.textContent = textContent;
                cell.appendChild(wrapper);
            } else {
                cell.textContent = textContent;
            }
        } else {
            cell.textContent = '';
        }
    },

    _createImageThumbnail: function(imgUrl, parentCell) {
        const img = document.createElement('img');
        img.className = 'jdt-table-image';
        img.style.width = `${this._imageSize}px`;
        img.style.height = `${this._imageSize}px`;

        let baseForRelativeLinks;
        let resolvedImgSrc;
        try {
            baseForRelativeLinks = new URL('../', this.currentFilePathContext);
            resolvedImgSrc = new URL(imgUrl, baseForRelativeLinks).href;
            img.src = resolvedImgSrc;
        } catch (e) {
            console.error(`IndraViewer: Could not create a valid URL for image. Original Path: "${imgUrl}", Context: "${this.currentFilePathContext}"`, e);
            const errorSpan = document.createElement('span');
            errorSpan.textContent = '[Invalid Path]';
            parentCell.appendChild(errorSpan);
            return;
        }

        img.addEventListener('mouseenter', (event) => this._showHoverPreview(event, resolvedImgSrc));
        img.addEventListener('mouseleave', () => this._removeHoverPreview());
        img.onerror = () => {
            console.error(`IndraViewer: Failed to load image.\n - Final URL tried: ${img.src}\n - Original path in JSON: "${imgUrl}"\n - Base path used for resolution: ${baseForRelativeLinks.href}`);
            img.style.display = 'none';
            const errorSpan = document.createElement('span');
            errorSpan.textContent = '[Load Error]';
            parentCell.appendChild(errorSpan);
        };
        img.alt = this._getDisplayNameFromInput(imgUrl, false);
        parentCell.appendChild(img);
    },

    _showHoverPreview: function(event, src) {
        this._removeHoverPreview();
        const preview = document.createElement('div');
        preview.id = 'jdt-hover-preview';
        const previewImg = document.createElement('img');
        previewImg.src = src;
        preview.appendChild(previewImg);
        document.body.appendChild(preview);
        previewImg.onload = () => {
            const offset = 15;
            let top = event.clientY + offset;
            let left = event.clientX + offset;
            if (left + preview.offsetWidth > window.innerWidth) {
                left = event.clientX - preview.offsetWidth - offset;
            }
            if (top + preview.offsetHeight > window.innerHeight) {
                top = event.clientY - preview.offsetHeight - offset;
            }
            preview.style.top = `${top}px`;
            preview.style.left = `${left}px`;
        };
    },

    _removeHoverPreview: function() {
        const preview = document.getElementById('jdt-hover-preview');
        if (preview) {
            preview.remove();
        }
    },

    _isImageUrl: function(url) {
        return typeof url === 'string' && /\.(jpg|jpeg|png|gif|svg)$/i.test(url);
    },

    async _createAndAppendLinkableElement(parentElement, filePathToLoad, linkText, isConstructed) {
        parentElement.innerHTML = '';
        let resolvedPath;
        try {
            const baseForRelativeLinks = new URL(isConstructed ? './' : '../', this.currentFilePathContext);
            resolvedPath = new URL(filePathToLoad, baseForRelativeLinks).href;
        } catch (e) {
            console.error(`IndraViewer: Could not create a valid URL for link. Original Path: "${filePathToLoad}", Context: "${this.currentFilePathContext}"`, e);
            parentElement.textContent = this._escapeHtml(this._getDisplayNameFromInput(linkText, isConstructed));
            return;
        }
        const exists = await this._checkUrlExists(resolvedPath);
        const displayName = this._getDisplayNameFromInput(linkText, isConstructed);
        parentElement.title = this._escapeHtml(displayName);
        const content = document.createDocumentFragment();
        if (exists) {
            const link = document.createElement('a');
            link.className = 'jdt-json-link';
            link.textContent = this._escapeHtml(displayName);
            link.href = '#';
            link.title = `Load ${this._escapeHtml(filePathToLoad)}`;
            link.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.renderUrl(resolvedPath, displayName, false);
            };
            content.appendChild(link);
        } else {
            content.appendChild(document.createTextNode(this._escapeHtml(displayName)));
        }
        if (this._cellLineClamp > 1) {
            const wrapper = document.createElement('div');
            wrapper.className = 'jdt-clamp-wrapper';
            wrapper.style.setProperty('--line-clamp-value', this._cellLineClamp);
            wrapper.appendChild(content);
            parentElement.appendChild(wrapper);
        } else {
            parentElement.appendChild(content);
        }
    },

    _getDisplayNameFromInput: function(inputString, isConstructed) {
        let displayName = String(inputString || '');
        if (!isConstructed) {
            displayName = displayName.substring(displayName.lastIndexOf('/') + 1);
        }
        displayName = displayName.replace(/\.json$/i, '').replace(/[_-]+/g, ' ');
        try {
            return decodeURIComponent(displayName).trim();
        } catch (e) {
            return displayName.trim();
        }
    },

    async _checkUrlExists(url) {
        if (this._resolvedLinkPathsCache.has(url)) {
            return this._resolvedLinkPathsCache.get(url);
        }
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-cache'
            });
            this._resolvedLinkPathsCache.set(url, response.ok);
            return response.ok;
        } catch (error) {
            this._resolvedLinkPathsCache.set(url, false);
            return false;
        }
    },

    _displayRendererError: function(message) {
        console.error("IndraViewer:", message);
        if (this.containerElement) {
            this.containerElement.innerHTML = `<p class="jdt-error-message">Renderer Error: ${this._escapeHtml(message)}</p>`;
        }
        if (this.errorDisplayElement) {
            this.errorDisplayElement.textContent = `Error: ${message}`;
            this.errorDisplayElement.style.display = 'block';
        }
    },

    _escapeHtml: function(unsafe) {
        return String(unsafe ?? '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    _renderDataRecursive: function(data, parentElement) {
        const pre = document.createElement('pre');
        pre.className = 'jdt-recursive-view';
        pre.textContent = JSON.stringify(data, null, 2);
        parentElement.appendChild(pre);
    }
};

