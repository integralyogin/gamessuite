// js/JsonDataTableRenderer.js
// Standalone JSON Data Table Renderer Plugin
// Version 3.6: Added user-configurable image thumbnail sizing.

const JsonDataTableRenderer = {
    // --- Properties ---
    currentFilePathContext: null,
    containerElement: null,
    errorDisplayElement: null,
    historyDisplayElement: null,
    navigationHistory: [],
    _resolvedLinkPathsCache: new Map(),
    _fileSearchIndex: new Map(), // For searching file names: { lowerCaseDisplayName: fullFilePath }

    // Properties for data management and sorting
    _currentTableData: [],
    _currentTableHeaders: [],
    _currentSortColumn: null,
    _currentSortDirection: 'asc',
    _currentColumnWidths: new Map(), // Store calculated widths

    // Properties for cell line clamping
    _cellLineClamp: 1, // Number of lines to show before truncating. 1 is default.
    _lineClampControls: null, // Holds references to the UI controls for clamping.

    // NEW: Properties for image sizing
    _imageSize: 50, // Default image size in pixels
    _imageSizeControls: null, // Holds references to the UI controls for image sizing.

    // --- Core Functions ---

    initRenderer: function(containerElement, errorDisplayElement = null, historyDisplayElement = null) {
        if (typeof containerElement === 'string') {
            this.containerElement = document.getElementById(containerElement);
        } else {
            this.containerElement = containerElement;
        }

        if (typeof errorDisplayElement === 'string') {
            this.errorDisplayElement = document.getElementById(errorDisplayElement);
        } else {
            this.errorDisplayElement = errorDisplayElement;
        }

        if (typeof historyDisplayElement === 'string') {
            this.historyDisplayElement = document.getElementById(historyDisplayElement);
        } else {
            this.historyDisplayElement = historyDisplayElement;
        }

        if (!this.containerElement) {
            console.error("JsonDataTableRenderer: Target container element not provided or not found.");
            if (this.errorDisplayElement) this.errorDisplayElement.textContent = "Renderer Error: Target container missing.";
            return false;
        }
        if (!this.historyDisplayElement) {
            console.warn("JsonDataTableRenderer: History display element not provided or not found. Navigation history will not be displayed.");
        }
        this._injectStyles();
        return true;
    },

    setSearchableFiles: function(fileList) {
        if (!Array.isArray(fileList)) {
            console.error("JsonDataTableRenderer: setSearchableFiles expects an array of file paths.");
            return;
        }
        this._fileSearchIndex.clear();
        fileList.forEach(filePath => {
            const displayName = this._getDisplayNameFromInput(filePath, false);
            this._fileSearchIndex.set(displayName.toLowerCase(), filePath);
        });
        console.log(`JsonDataTableRenderer: Initialized search index with ${this._fileSearchIndex.size} files.`);
    },
    
    setCellLineClamp: function(lines) {
        const newClampValue = (typeof lines === 'number' && lines > 0) ? Math.floor(lines) : 1;
        if (this._cellLineClamp === newClampValue) return; // No change

        this._cellLineClamp = newClampValue;
        console.log(`JsonDataTableRenderer: Cell line clamp set to ${this._cellLineClamp}`);

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
    
    // NEW: Public method to control image sizing
    setImageSize: function(size) {
        // Clamp the size between 40 and 300. Default to 50 if invalid.
        const newSize = Math.max(40, Math.min(300, Number(size) || 50));
        if (this._imageSize === newSize) return; // No change

        this._imageSize = newSize;
        console.log(`JsonDataTableRenderer: Image size set to ${this._imageSize}px`);

        if (this._imageSizeControls && this._imageSizeControls.input) {
            this._imageSizeControls.input.value = this._imageSize;
        }

        // Re-render the visible table body to apply the new image size
        if (this.containerElement) {
            const table = this.containerElement.querySelector('.jdt-table');
            if (table && table.tBodies[0]) {
                this._renderTableBody(table.tBodies[0]);
            }
        }
    },

    renderUrl: function(jsonUrl, clickedLinkTextForHistory = null, isInitialLoad = false) {
        if (!this.containerElement) {
            this._displayRendererError("Not initialized. Call initRenderer() first.");
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
            processedData = topLevelKeys.map(termKey => ({ ...data[termKey], 'Term': termKey }));
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
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
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
        this.historyDisplayElement.innerHTML = '';
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

        const bottomControlsContainer = document.createElement('div');
        bottomControlsContainer.className = 'jdt-bottom-controls';
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
            searchInput.placeholder = 'Search files...';
            searchInput.autocomplete = 'off';
            const suggestionSpan = document.createElement('div');
            suggestionSpan.className = 'jdt-search-suggestion';
            searchInput.oninput = (e) => this._handleAutocompleteInput(e);
            searchInput.onkeydown = (e) => this._handleAutocompleteKeydown(e);
            searchInput.onblur = (e) => { e.target.previousElementSibling.textContent = ''; };
            wrapper.appendChild(suggestionSpan);
            wrapper.appendChild(searchInput);
            searchForm.appendChild(wrapper);
            bottomControlsContainer.appendChild(searchForm);
        }
        
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
        clampInput.onchange = (e) => {
            this.setCellLineClamp(e.target.valueAsNumber);
        };
        clampControlForm.appendChild(clampLabel);
        clampControlForm.appendChild(clampInput);
        bottomControlsContainer.appendChild(clampControlForm);
        this._lineClampControls = { form: clampControlForm, input: clampInput };
        
        // NEW: Add controls for image sizing
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
        imageSizeInput.onchange = (e) => {
            this.setImageSize(e.target.valueAsNumber);
        };
        const pxLabel = document.createElement('span');
        pxLabel.textContent = 'px';
        pxLabel.className = 'jdt-control-label';
        imageSizeControlForm.appendChild(imageSizeLabel);
        imageSizeControlForm.appendChild(imageSizeInput);
        imageSizeControlForm.appendChild(pxLabel);
        bottomControlsContainer.appendChild(imageSizeControlForm);
        this._imageSizeControls = { form: imageSizeControlForm, input: imageSizeInput };
        
        this.historyDisplayElement.appendChild(bottomControlsContainer);
    },

    _handleAutocompleteInput: function(event) {
        const input = event.target;
        const suggestionEl = input.previousElementSibling;
        const term = input.value;
        const termLower = term.toLowerCase();
        suggestionEl.textContent = '';
        input.dataset.suggestion = '';
        if (term.length === 0) return;
        const matchRegex = new RegExp(`\\b${termLower}`);
        for (const [key, value] of this._fileSearchIndex.entries()) {
            if (matchRegex.test(key)) {
                const fullDisplayName = this._getDisplayNameFromInput(value, false);
                if (fullDisplayName.toLowerCase() !== termLower) {
                    suggestionEl.textContent = fullDisplayName;
                    input.dataset.suggestion = fullDisplayName;
                    return;
                }
            }
        }
    },

    _handleAutocompleteKeydown: function(event) {
        if (event.key === 'Tab' && event.target.dataset.suggestion) {
            event.preventDefault();
            event.target.value = event.target.dataset.suggestion;
            event.target.previousElementSibling.textContent = '';
            event.target.dataset.suggestion = '';
        }
    },

    async _handleFileSearch(event) {
        event.preventDefault();
        const searchInput = event.target.querySelector('.jdt-search-input');
        const searchTerm = searchInput.value.trim();
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
                console.log(`Search: Conventional path not found. Loading from index: ${filePath}`);
                this.renderUrl(filePath, searchTerm, false);
                success = true;
            }
        }
        if (success) {
            searchInput.value = '';
            searchInput.blur();
            if (searchInput.previousElementSibling) {
                searchInput.previousElementSibling.textContent = '';
            }
            searchInput.style.outline = '';
        } else {
            console.warn(`JsonDataTableRenderer: Search term '${searchTerm}' not found by convention or in file index.`);
            searchInput.style.outline = '2px solid #dc3545';
            setTimeout(() => { searchInput.style.outline = ''; }, 2500);
        }
    },

    _injectStyles: function() {
        const styleId = 'jdt-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        // UPDATED: Styles for image size and unified controls
        style.textContent = `
            .jdt-table-container {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }
            .jdt-table {
                border-collapse: separate;
                border-spacing: 0;
                width: 100%;
                table-layout: fixed;
            }
            .jdt-table th, .jdt-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e0e0e0;
                vertical-align: top;
            }
            .jdt-table td {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .jdt-clamp-wrapper {
                white-space: normal;
                text-overflow: ellipsis;
                overflow: hidden;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: var(--line-clamp-value, 1);
                word-break: break-word;
                overflow-wrap: break-word;
            }
            .jdt-table th {
                background: #f8f9fa;
                font-weight: 600;
                position: sticky;
                top: 0;
                z-index: 10;
            }
            .jdt-table tr:last-child td {
                border-bottom: none;
            }
            .jdt-table-image {
                object-fit: cover;
                border-radius: 4px;
                display: inline-block;
                margin-right: 4px;
                cursor: pointer;
            }
            .jdt-image-cell {
                width: auto;
                white-space: normal;
            }
            #jdt-hover-preview {
                position: absolute;
                z-index: 1001;
                border: 2px solid #fff;
                border-radius: 4px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                pointer-events: none;
                max-width: 400px;
                max-height: 400px;
                animation: jdt-fade-in 0.15s ease-in;
            }
            #jdt-hover-preview img {
                display: block;
                width: 100%;
                height: 100%;
                border-radius: 2px;
            }
            @keyframes jdt-fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .jdt-top-controls { margin-bottom: 8px; }
            .jdt-bottom-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 20px; }
            .jdt-history-link { color: #007bff; text-decoration: none; }
            .jdt-history-link:hover { text-decoration: underline; }
            .jdt-history-separator { color: #6c757d; margin: 0 0.5em; }
            .jdt-search-wrapper { position: relative; }
            .jdt-search-input, .jdt-control-input {
                padding: 6px 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
            }
            .jdt-control-form { display: inline-flex; align-items: center; gap: 5px; }
            .jdt-control-label { color: #555; font-size: 0.9em; }
            .jdt-control-input { width: 60px; }
            .jdt-search-suggestion {
                position: absolute;
                left: 1px;
                top: 1px;
                padding: 6px 8px;
                color: #adb5bd;
                pointer-events: none;
                white-space: nowrap;
                overflow: hidden;
            }
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
                th.classList.add(this._currentSortDirection === 'asc' ? 'jdt-sort-asc' : 'jdt-sort-desc');
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

    // UPDATED: Apply dynamic image size
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
            console.error(`JsonDataTableRenderer: Could not create a valid URL for image. Original Path: "${imgUrl}", Context: "${this.currentFilePathContext}"`, e);
            const errorSpan = document.createElement('span');
            errorSpan.textContent = '[Invalid Path]';
            parentCell.appendChild(errorSpan);
            return;
        }

        img.addEventListener('mouseenter', (event) => this._showHoverPreview(event, resolvedImgSrc));
        img.addEventListener('mouseleave', () => this._removeHoverPreview());
        img.onerror = () => {
            console.error(`JsonDataTableRenderer: Failed to load image.\n - Final URL tried: ${img.src}\n - Original path in JSON: "${imgUrl}"\n - Base path used for resolution: ${baseForRelativeLinks.href}`);
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
        } catch(e) {
            console.error(`JsonDataTableRenderer: Could not create a valid URL for link. Original Path: "${filePathToLoad}", Context: "${this.currentFilePathContext}"`, e);
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
            const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
            this._resolvedLinkPathsCache.set(url, response.ok);
            return response.ok;
        } catch (error) {
            this._resolvedLinkPathsCache.set(url, false);
            return false;
        }
    },

    _displayRendererError: function(message) {
        console.error("JsonDataTableRenderer:", message);
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

