// js/AuroView.js (Chat-Style Definition Explorer)
// Replaces previous AuroView versions. Inspired by TheMotherChat.js
// UPGRADED to include Q&A data from aurobindo_qa.json
// UPGRADED to perform full-text search with chapter detection if no initial results are found.
// MODIFIED: Layout changed to a three-column view with suggestions on the left.
// MODIFIED: "Search in texts" option is now always available after a search.

const AuroView = {
    id: 'AuroViewChatExplorer',
    container: null,         // Main container for this module, provided by AurobindoGame
    definitionsData: [],     // All definitions loaded from JSON
    qaData: [],              // All Q&A data loaded from JSON
    searchableData: [],      // Combined and processed data for searching
    theme: null,             // Theme object from AurobindoGame
    bookFilePaths: {},       // Object mapping book abbreviations to file paths
    bookDisplayNames: {},    // Object mapping book abbreviations to full names

    elements: {
        mainLayout: null,
        chatLog: null,
        suggestionsContainer: null,
        chatInput: null,
        sendButton: null,
        imageSection: null, // For Sri Aurobindo's image
        aurobindoImage: null,
        imageCounter: null,
        prevImageBtn: null,
        nextImageBtn: null,
        tooltipDiv: null,
    },

    aurobindoImages: [
        'images/beings/sriAurobindo/Sri_Aurobindo.jpg',
        'images/beings/sriAurobindo/Sri_Aurobindo2.jpg',
        'images/beings/sriAurobindo/Sri_Aurobindo3.jpg',
        'images/beings/sriAurobindo/Sri_Aurobindo4.jpg'
    ],
    currentImageIndex: 0,

    definitionsMap: new Map(),
    sortedDefinedTermsRegex: null,
    activeTooltipTerm: null,

    allTermsForSuggestions: [],
    suggestionTimeout: null,
    suggestionUpdateDelay: 250,
    maxSuggestionsToShow: 500,

    launchBookReaderCallback: null,

    _escapeRegExp: function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    _normalizeTermForMap: function(text) {
        if (typeof text !== 'string') return "";
        return text.toLowerCase().trim();
    },

    init: function(containerElement, definitions, qaData, themeSettings, launchBookReaderFn, bookFilePaths, bookDisplayNames) {
        this.container = containerElement;
        this.definitionsData = Array.isArray(definitions) ? definitions : [];
        this.qaData = Array.isArray(qaData) ? qaData : [];
        this.theme = themeSettings || (typeof AurobindoGame !== 'undefined' ? AurobindoGame.theme : {});
        this.launchBookReaderCallback = launchBookReaderFn;
        this.bookFilePaths = bookFilePaths || {};
        this.bookDisplayNames = bookDisplayNames || {};

        console.log("AuroView (ChatExplorer): Initializing with", this.definitionsData.length, "definitions,", this.qaData.length, "Q&A pairs, and", Object.keys(this.bookFilePaths).length, "books for text search.");

        this.currentImageIndex = 0;
        this.definitionsMap.clear();
        this.allTermsForSuggestions = [];

        this._prepareSearchableData();
        this._prepareDefinitionsForTooltip();
        this._prepareTermsForSuggestions();
        this.renderUI();
        this.attachEventListeners();
        this._showInitialSuggestions();
    },

    _prepareSearchableData: function() {
        this.searchableData = [];
        if (this.definitionsData) {
            this.definitionsData.forEach(def => {
                if (def.term && def.definition) {
                    this.searchableData.push({ ...def, type: 'definition' });
                }
            });
        }
        if (this.qaData) {
            this.qaData.forEach(qaItem => {
                if (qaItem.questions && Array.isArray(qaItem.questions) && qaItem.answer) {
                    qaItem.questions.forEach(question => {
                        this.searchableData.push({
                            term: question,
                            definition: qaItem.answer,
                            source: qaItem.citation,
                            type: 'qa'
                        });
                    });
                }
            });
        }
        console.log("AuroView (ChatExplorer): Prepared", this.searchableData.length, "total searchable entries.");
    },

    _prepareDefinitionsForTooltip: function() {
        this.definitionsMap.clear();
        if (this.definitionsData) {
            const definedTermsForRegex = [];
            this.definitionsData.forEach(def => {
                if (def.term && def.definition) {
                    const normalizedTerm = this._normalizeTermForMap(def.term);
                    this.definitionsMap.set(normalizedTerm, def);
                    definedTermsForRegex.push(this._escapeRegExp(def.term));
                }
            });

            if (definedTermsForRegex.length > 0) {
                definedTermsForRegex.sort((a, b) => b.length - a.length);
                this.sortedDefinedTermsRegex = new RegExp(`\\b(${definedTermsForRegex.join('|')})\\b`, 'gi');
            } else {
                this.sortedDefinedTermsRegex = null;
            }
        }
    },

    _prepareTermsForSuggestions: function() {
        this.allTermsForSuggestions = [];
        const termFrequency = new Map();

        if (this.searchableData) {
            this.searchableData.forEach(item => {
                if (item.term) {
                    const term = item.term.trim();
                    if (term) {
                        termFrequency.set(term, (termFrequency.get(term) || 0) + 5);
                        const defKeywords = (item.definition.match(/\b[A-Z][a-z]{3,}\b/g) || []);
                        defKeywords.forEach(kw => {
                            if (!this._isCommonWord(kw)) termFrequency.set(kw.toLowerCase(), (termFrequency.get(kw.toLowerCase()) || 0) + 1);
                        });
                        const subTerms = term.split(/[\s\(-]+/);
                        subTerms.forEach(st => {
                            const cleanedSt = st.replace(/[()]/g, '').trim();
                            if (cleanedSt.length > 3 && !this._isCommonWord(cleanedSt)) {
                                termFrequency.set(cleanedSt.toLowerCase(), (termFrequency.get(cleanedSt.toLowerCase()) || 0) + 2);
                            }
                        });
                    }
                }
            });
        }

        this.allTermsForSuggestions = Array.from(termFrequency.entries())
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return a[0].localeCompare(b[0]);
            })
            .map(entry => entry[0]);

        this.allTermsForSuggestions = this.allTermsForSuggestions.map(t => t.charAt(0).toUpperCase() + t.slice(1));
        console.log("AuroView (ChatExplorer): Prepared", this.allTermsForSuggestions.length, "terms for suggestions from all data sources.");
    },

    _isCommonWord: function(word) {
        const common = new Set(['this', 'that', 'with', 'from', 'into', 'being', 'what', 'which', 'when', 'also', 'then', 'only', 'must', 'have', 'will', 'its', 'not', 'for', 'the', 'and', 'are', 'can', 'but', 'our', 'all', 'has', 'was', 'were', 'been', 'they', 'them', 'their', 'even', 'does', 'did', 'who', 'whom', 'whose', 'said', 'says']);
        return common.has(word.toLowerCase());
    },

    renderUI: function() {
        if (!this.container) {
            console.error("AuroView (ChatExplorer): Main container not set in renderUI!");
            return;
        }
        this.container.innerHTML = '';
        this.container.style.backgroundColor = this.theme.chatExplorerContainerBackgroundColor || this.theme.backgroundColor;
        this.container.style.color = this.theme.textColor;
        this.container.style.height = '100%';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.padding = '5px';
        this.container.style.boxSizing = 'border-box';

        this.elements.mainLayout = document.createElement('div');
        this.elements.mainLayout.style.display = 'flex';
        this.elements.mainLayout.style.height = '100%';
        this.elements.mainLayout.style.gap = '5px';

        // --- NEW: Left Column for Suggestions ---
        this.elements.suggestionsContainer = document.createElement('div');
        this.elements.suggestionsContainer.id = 'av_suggestionsContainer';
        Object.assign(this.elements.suggestionsContainer.style, {
            flex: '0 0 160px', // "Skinny" column, 200px width
            height: '100%',    // "Tall" - full height
            overflowY: 'auto',
            padding: '5px',
            border: `1px solid ${this.theme.borderColor}`,
            borderRadius: '8px',
            backgroundColor: this.theme.suggestionBg || '#f9f9f9',
            display: 'flex',
            flexDirection: 'column', // Stack suggestions vertically
            gap: '4px',
            boxSizing: 'border-box'
        });

        const suggestionsHeader = document.createElement('h4');
        suggestionsHeader.textContent = "Suggestions";
        Object.assign(suggestionsHeader.style, {
            margin: '0 0 5px 0',
            paddingBottom: '5px',
            textAlign: 'center',
            borderBottom: `1px solid ${this.theme.borderColor}`,
            flexShrink: '0',
            color: this.theme.textColor
        });
        this.elements.suggestionsContainer.appendChild(suggestionsHeader);

        // --- Center Column for Chat ---
        const chatSection = document.createElement('div');
        chatSection.id = 'av_chatSection';
        chatSection.style.flex = '1'; // Takes up the remaining flexible space
        chatSection.style.display = 'flex';
        chatSection.style.flexDirection = 'column';
        chatSection.style.minWidth = '0'; // Prevents flexbox overflow issues

        // Chat Log (within Center Column)
        this.elements.chatLog = document.createElement('div');
        this.elements.chatLog.id = 'av_chatLog';
        Object.assign(this.elements.chatLog.style, {
            flexGrow: '1',
            overflowY: 'auto',
            padding: '5px',
            border: `1px solid ${this.theme.borderColor}`,
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            marginBottom: '10px',
            position: 'relative' // For tooltip positioning
        });

        // Input Container (within Center Column)
        const inputContainer = document.createElement('div');
        inputContainer.id = 'av_inputContainer';
        Object.assign(inputContainer.style, { display: 'flex', height: '40px', flexShrink: '0' });

        this.elements.chatInput = document.createElement('input');
        this.elements.chatInput.type = 'text';
        this.elements.chatInput.id = 'av_chatInput';
        this.elements.chatInput.placeholder = "Explore terms (e.g., Yoga, Self)...";
        Object.assign(this.elements.chatInput.style, {
            flexGrow: '1',
            padding: '8px',
            border: `1px solid ${this.theme.borderColor}`,
            borderRadius: '4px 0 0 4px',
            fontSize: '1em'
        });

        this.elements.sendButton = document.createElement('button');
        this.elements.sendButton.id = 'av_sendButton';
        this.elements.sendButton.textContent = 'Explore';
        Object.assign(this.elements.sendButton.style, {
            padding: '8px',
            backgroundColor: this.theme.buttonColor,
            color: this.theme.activeTabTextColor || '#fff',
            border: 'none',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
            fontSize: '1em'
        });
        this.elements.sendButton.addEventListener('mouseover', () => this.elements.sendButton.style.backgroundColor = this.theme.buttonHoverColor);
        this.elements.sendButton.addEventListener('mouseout', () => this.elements.sendButton.style.backgroundColor = this.theme.buttonColor);

        inputContainer.appendChild(this.elements.chatInput);
        inputContainer.appendChild(this.elements.sendButton);

        chatSection.appendChild(this.elements.chatLog);
        chatSection.appendChild(inputContainer);


        // --- Right Column for Image ---
        this.elements.imageSection = document.createElement('div');
        this.elements.imageSection.id = 'av_imageSection';
        Object.assign(this.elements.imageSection.style, {
            flex: '0 0 250px',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${this.theme.borderColor}`,
            borderRadius: '8px',
            backgroundColor: this.theme.questionListBg || '#fafafa',
            padding: '5px'
        });

        const imageHeaderText = document.createElement('div');
        imageHeaderText.textContent = "Sri Aurobindo";
        Object.assign(imageHeaderText.style, {
            textAlign: 'center',
            marginBottom: '10px',
            fontSize: '1.1em',
            fontWeight: '600',
            color: this.theme.textColor
        });
        this.elements.imageSection.appendChild(imageHeaderText);

        this.elements.aurobindoImage = document.createElement('img');
        this.elements.aurobindoImage.id = 'av_aurobindoImage';
        this.elements.aurobindoImage.src = this.aurobindoImages[this.currentImageIndex];
        this.elements.aurobindoImage.alt = "Sri Aurobindo";
        this.elements.aurobindoImage.onerror = () => {
            this.elements.aurobindoImage.src = 'https://placehold.co/200x250/777/FFF?text=Aurobindo';
            console.warn(`AuroView: Image not found - ${this.aurobindoImages[this.currentImageIndex]}`);
        };
        Object.assign(this.elements.aurobindoImage.style, {
            maxWidth: '100%',
            maxHeight: 'calc(100% - 80px)',
            objectFit: 'contain',
            borderRadius: '4px',
            border: `1px solid ${this.theme.borderColor}`,
            backgroundColor: 'white',
            flexGrow: '1',
            marginBottom: '10px'
        });

        const imageNavDiv = document.createElement('div');
        Object.assign(imageNavDiv.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' });

        this.elements.prevImageBtn = document.createElement('button');
        this.elements.prevImageBtn.innerHTML = '&#9664; Prev';
        this.elements.nextImageBtn = document.createElement('button');
        this.elements.nextImageBtn.innerHTML = 'Next &#9654;';
        this.elements.imageCounter = document.createElement('span');

        [this.elements.prevImageBtn, this.elements.nextImageBtn].forEach(btn => {
            Object.assign(btn.style, {
                padding: '5px',
                backgroundColor: this.theme.buttonColor,
                color: this.theme.activeTabTextColor || '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em'
            });
            btn.addEventListener('mouseover', () => btn.style.backgroundColor = this.theme.buttonHoverColor);
            btn.addEventListener('mouseout', () => btn.style.backgroundColor = this.theme.buttonColor);
        });
        this.elements.imageCounter.style.fontSize = '0.9em';
        this._updateImageCounter();

        imageNavDiv.appendChild(this.elements.prevImageBtn);
        imageNavDiv.appendChild(this.elements.imageCounter);
        imageNavDiv.appendChild(this.elements.nextImageBtn);

        this.elements.imageSection.appendChild(this.elements.aurobindoImage);
        this.elements.imageSection.appendChild(imageNavDiv);

        // --- Assemble Main Layout ---
        this.elements.mainLayout.appendChild(this.elements.suggestionsContainer); // 1. Left
        this.elements.mainLayout.appendChild(chatSection);                      // 2. Center
        this.elements.mainLayout.appendChild(this.elements.imageSection);       // 3. Right
        this.container.appendChild(this.elements.mainLayout);

        // Tooltip (attached to chatLog, which is fine)
        this.elements.tooltipDiv = document.createElement('div');
        this.elements.tooltipDiv.id = 'av_tooltip';
        Object.assign(this.elements.tooltipDiv.style, {
            position: 'absolute',
            visibility: 'hidden',
            zIndex: '1000',
            backgroundColor: this.theme.tooltipBg || '#333',
            color: this.theme.tooltipColor || '#fff',
            border: `1px solid ${this.theme.borderColor}`,
            borderRadius: '4px',
            padding: '8px',
            maxWidth: '300px',
            fontSize: '0.9em',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            lineHeight: '1.4'
        });
        this.elements.chatLog.appendChild(this.elements.tooltipDiv);
    },

    attachEventListeners: function() {
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.handleUserInput());
        }
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleUserInput();
            });
            this.elements.chatInput.addEventListener('input', () => this._handleInputChangeForSuggestions());
            this.elements.chatInput.addEventListener('focus', () => this._handleInputChangeForSuggestions());
        }
        if (this.elements.prevImageBtn) {
            this.elements.prevImageBtn.addEventListener('click', () => this._previousImage());
        }
        if (this.elements.nextImageBtn) {
            this.elements.nextImageBtn.addEventListener('click', () => this._nextImage());
        }
    },

    _previousImage: function() { this.currentImageIndex = (this.currentImageIndex - 1 + this.aurobindoImages.length) % this.aurobindoImages.length; this._updateImage(); },
    _nextImage: function() { this.currentImageIndex = (this.currentImageIndex + 1) % this.aurobindoImages.length; this._updateImage(); },
    _updateImage: function() {
        if (this.elements.aurobindoImage) {
            this.elements.aurobindoImage.style.opacity = '0.5';
            setTimeout(() => {
                this.elements.aurobindoImage.src = this.aurobindoImages[this.currentImageIndex];
                this._updateImageCounter();
                this.elements.aurobindoImage.style.opacity = '1';
            }, 150);
        }
    },
    _updateImageCounter: function() { if (this.elements.imageCounter) { this.elements.imageCounter.textContent = `${this.currentImageIndex + 1} of ${this.aurobindoImages.length}`; } },
    _handleInputChangeForSuggestions: function() {
        clearTimeout(this.suggestionTimeout);
        this.suggestionTimeout = setTimeout(() => {
            const inputText = this.elements.chatInput.value.trim();
            this._updateSuggestions(inputText);
        }, this.suggestionUpdateDelay);
    },

    _updateSuggestions: function(inputText) {
        if (!this.elements.suggestionsContainer) return;

        // Clear only the suggestion buttons, not the header.
        const existingButtons = this.elements.suggestionsContainer.querySelectorAll('button');
        existingButtons.forEach(btn => btn.remove());

        let termsToShow;
        if (!inputText) {
            termsToShow = this.allTermsForSuggestions.slice(0, this.maxSuggestionsToShow);
        } else {
            const normalizedInput = inputText.toLowerCase();
            termsToShow = this.allTermsForSuggestions.filter(term =>
                term.toLowerCase().includes(normalizedInput) &&
                term.toLowerCase() !== normalizedInput
            ).slice(0, this.maxSuggestionsToShow);
        }

        termsToShow.forEach(term => {
            const btn = document.createElement('button');
            btn.textContent = term;
            Object.assign(btn.style, {
                width: '100%',
                padding: '8px 10px',
                margin: '0',
                cursor: 'pointer',
                backgroundColor: this.theme.suggestionBg || '#f0f0f0',
                color: this.theme.textColor || '#333',
                border: `1px solid ${this.theme.suggestionBorder || this.theme.borderColor}`,
                borderRadius: '5px',
                fontSize: '0.9em',
                textAlign: 'left',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s, color 0.2s'
            });
            btn.addEventListener('mouseover', () => { btn.style.backgroundColor = this.theme.suggestionHoverBg || '#e0e0e0'; btn.style.color = this.theme.activeTabTextColor || '#000'; });
            btn.addEventListener('mouseout', () => { btn.style.backgroundColor = this.theme.suggestionBg || '#f0f0f0'; btn.style.color = this.theme.textColor || '#333'; });
            btn.addEventListener('click', () => this._handleSuggestionClick(term));
            this.elements.suggestionsContainer.appendChild(btn);
        });
    },

    _showInitialSuggestions: function() { this._updateSuggestions(""); },
    _handleSuggestionClick: function(term) {
        this.elements.chatInput.value = "";
        this.displayMessage(term, "User");
        this._showInitialSuggestions();
        this.searchAndDisplay(term);
    },

    handleUserInput: function() {
        if (!this.elements.chatInput) return;
        const inputText = this.elements.chatInput.value.trim();
        if (inputText === "") return;

        this.displayMessage(inputText, "User");
        this.elements.chatInput.value = "";
        this._showInitialSuggestions();
        this.searchAndDisplay(inputText);
    },

    searchAndDisplay: function(query) {
        const normalizedQuery = this._normalizeTermForMap(query);
        let termMatches = [],
            definitionMatches = [];

        this.searchableData.forEach(item => {
            const normTerm = this._normalizeTermForMap(item.term);
            if (normTerm.includes(normalizedQuery)) {
                let score = normTerm === normalizedQuery ? 100 : (normTerm.startsWith(normalizedQuery) ? 75 : 50) + normalizedQuery.length;
                termMatches.push({ ...item, matchType: 'term', score: score });
            }
        });

        const termMatchIds = new Set(termMatches.map(tm => tm.term + tm.source));
        this.searchableData.forEach(item => {
            if (!termMatchIds.has(item.term + item.source)) {
                if (this._normalizeTermForMap(item.definition).includes(normalizedQuery)) {
                    definitionMatches.push({ ...item, matchType: 'definition', score: 10 + normalizedQuery.length });
                }
            }
        });

        const allMatches = [...termMatches, ...definitionMatches].sort((a, b) => b.score - a.score);

        if (allMatches.length === 0) {
            this._offerTextSearch(query);
        } else if (allMatches.length === 1 && allMatches[0].matchType === 'term' && allMatches[0].score >= 50) {
            this.displayMessage(allMatches[0].definition, "Aurobindo", allMatches[0], false);
            this._displayFullTextSearchButton(query); // Always show the button
        } else {
            this.displayMultipleResults(allMatches, query);
            this._displayFullTextSearchButton(query); // Always show the button
        }
    },

    // NEW: Function to consistently display the full-text search button.
    _displayFullTextSearchButton: function(query) {
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            marginTop: '10px',
            paddingLeft: '10px',
            textAlign: 'left' // Align to the left of the chat log
        });

        const searchButton = document.createElement('button');
        searchButton.textContent = `Search for "${query}" in the full texts`;
        Object.assign(searchButton.style, {
            padding: '8px 12px',
            cursor: 'pointer',
            backgroundColor: this.theme.buttonColor,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '0.9em'
        });
        searchButton.addEventListener('mouseover', () => searchButton.style.backgroundColor = this.theme.buttonHoverColor);
        searchButton.addEventListener('mouseout', () => searchButton.style.backgroundColor = this.theme.buttonColor);
        searchButton.onclick = () => {
            searchButton.textContent = 'Searching texts...';
            searchButton.disabled = true;
            searchButton.style.cursor = 'wait';
            this._performTextSearch(query);
        };
        
        buttonContainer.appendChild(searchButton);
        this.elements.chatLog.appendChild(buttonContainer);
        this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight;
    },

    // MODIFIED: Simplified to show a message and then call the new button function.
    _offerTextSearch: function(query) {
        this.displayMessage(`No specific definitions found for "${query}".`, "System", null, true);
        this._displayFullTextSearchButton(query);
    },

    _parseChapterTitle: function(line) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0 || trimmedLine.length > 150) {
            return null;
        }

        const keywords = ['CANTO', 'BOOK', 'CHAPTER', 'PART', 'SECTION'];
        const isTitle = (trimmedLine.toUpperCase() === trimmedLine && /[A-Z]/.test(trimmedLine)) ||
            keywords.some(kw => trimmedLine.toUpperCase().startsWith(kw));

        if (!isTitle) {
            return null;
        }

        let title = trimmedLine;
        const hyphenIndex = title.indexOf(' - ');
        if (hyphenIndex !== -1) {
            return title.substring(hyphenIndex + 3).trim();
        }

        const colonIndex = title.indexOf(': ');
        if (colonIndex !== -1) {
            return title.substring(colonIndex + 2).trim();
        }
        return title;
    },

    _performTextSearch: async function(query) {
        console.log(`Performing full text search for: "${query}"`);
        let textSearchResults = [];
        const lowerCaseQuery = query.toLowerCase();

        for (const key of Object.keys(this.bookFilePaths)) {
            const filePath = this.bookFilePaths[key];
            try {
                const response = await fetch(filePath);
                if (!response.ok) continue;
                const text = await response.text();
                const lines = text.split(/\r?\n/);

                let contentStartIndex = 0;
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '' && lines[i - 1].trim() !== '') {
                        contentStartIndex = i + 1;
                        break;
                    }
                }

                let currentChapter = "Unknown Chapter";
                for (let i = contentStartIndex; i < lines.length; i++) {
                    const line = lines[i];

                    const parsedTitle = this._parseChapterTitle(line);
                    if (parsedTitle) {
                        currentChapter = parsedTitle;
                    }

                    if (line.toLowerCase().includes(lowerCaseQuery)) {
                        const searchIndex = line.toLowerCase().indexOf(lowerCaseQuery);
                        const snippetStart = Math.max(0, searchIndex - 50);
                        const snippetEnd = Math.min(line.length, searchIndex + query.length + 50);
                        let snippet = line.substring(snippetStart, snippetEnd);

                        const highlightRegex = new RegExp(this._escapeRegExp(query), 'gi');
                        snippet = snippet.replace(highlightRegex, (match) => `<strong>${match}</strong>`);

                        textSearchResults.push({
                            bookAbbr: key,
                            filePath: filePath,
                            snippet: `...${snippet}...`,
                            targetString: query,
                            chapterName: currentChapter
                        });
                    }
                }
            } catch (error) {
                console.error(`Error searching in ${filePath}:`, error);
            }
        }
        this._displayTextSearchResults(textSearchResults, query);
    },

    _displayTextSearchResults: function(results, query) {
        if (results.length === 0) {
            this.displayMessage(`The term "${query}" was not found in any of the source texts.`, "System", null, true);
            return;
        }

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'av_multiple_results';
        Object.assign(resultsContainer.style, {
            backgroundColor: this.theme.motherMessageBg || '#fffde7',
            maxHeight: '83%',
            border: `1px solid ${this.theme.borderColor}`,
            borderRadius: '8px',
            padding: '5px',
            marginBottom: '5px',
            marginRight: 'auto',
            maxWidth: '95%',
            color: this.theme.textColor
        });

        const header = document.createElement('h4');
        header.textContent = `Found ${results.length} mention${results.length === 1 ? '' : 's'} of "${query}" in the texts:`;
        Object.assign(header.style, { marginTop: '4px', marginBottom: '2px', color: this.theme.textColor });
        resultsContainer.appendChild(header);

        const list = document.createElement('ul');
        Object.assign(list.style, { listStyleType: 'none', paddingLeft: '0', maxHeight: '280px', overflowY: 'auto' });

        results.forEach((result, index) => {
            const listItem = document.createElement('li');
            Object.assign(listItem.style, {
                margin: '8px',
                padding: '8px',
                borderBottom: (index < results.length - 1) ? `1px dashed ${this.theme.borderColor}` : 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
            });
            listItem.addEventListener('mouseover', () => listItem.style.backgroundColor = this.theme.suggestionHoverBg);
            listItem.addEventListener('mouseout', () => listItem.style.backgroundColor = 'transparent');

            const bookName = this.bookDisplayNames[result.bookAbbr] || result.bookAbbr;
            listItem.innerHTML = `<strong>In ${bookName} (${result.chapterName}):</strong><p style="margin: 5px 0 0 0; font-style: italic;">${result.snippet}</p>`;

            listItem.addEventListener('click', () => {
                if (typeof this.launchBookReaderCallback === 'function') {
                    this.launchBookReaderCallback(result.filePath, result.chapterName, result.targetString);
                }
            });
            list.appendChild(listItem);
        });

        resultsContainer.appendChild(list);
        this.elements.chatLog.appendChild(resultsContainer);
        this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight;
    },

    displayMessage: function(text, sender, definitionObject = null, isSystemMessage = false) {
        if (!this.elements.chatLog) return;
        const msgDiv = document.createElement('div');
        Object.assign(msgDiv.style, {
            marginBottom: '5px',
            padding: '8px',
            borderRadius: '8px',
            maxWidth: sender === "User" ? '70%' : '90%',
            wordWrap: 'break-word',
            lineHeight: '1.6'
        });

        if (sender === "Aurobindo" && definitionObject && definitionObject.type === 'qa' && !isSystemMessage) {
            const questionHeader = document.createElement('div');
            questionHeader.textContent = definitionObject.term;
            Object.assign(questionHeader.style, {
                fontWeight: 'bold',
                color: this.theme.definedTermColor || '#00695c',
                marginBottom: '5px',
                borderBottom: `1px solid ${(this.theme.borderColor || '#eee')}`,
                paddingBottom: '5px'
            });
            msgDiv.appendChild(questionHeader);
        }

        const textP = document.createElement('p');
        textP.style.margin = '0';

        if (sender !== "User" && this.sortedDefinedTermsRegex && text && !isSystemMessage) {
            this._applyTermHighlighting(textP, text);
        } else {
            textP.innerHTML = text.replace(/\n/g, '<br>');
        }
        msgDiv.appendChild(textP);

        if (sender === "User") {
            msgDiv.style.backgroundColor = this.theme.userMessageBg || '#e3f2fd';
            msgDiv.style.marginLeft = 'auto';
            msgDiv.style.textAlign = 'right';
            msgDiv.style.color = this.theme.textColor;
        } else {
            msgDiv.style.backgroundColor = isSystemMessage ? (this.theme.suggestionBg || '#f0f0f0') : (this.theme.motherMessageBg || '#fffde7');
            msgDiv.style.marginRight = 'auto';
            msgDiv.style.textAlign = 'left';
            msgDiv.style.color = this.theme.textColor;
            if (definitionObject && definitionObject.source && !isSystemMessage) {
                this._appendCitation(textP, definitionObject);
            }
        }
        this.elements.chatLog.appendChild(msgDiv);
        this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight;
        return msgDiv;
    },

    _applyTermHighlighting: function(parentElement, text) {
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        text.replace(this.sortedDefinedTermsRegex, (match, ...args) => {
            const offset = args[args.length - 2];
            if (offset > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
            }
            const termSpan = document.createElement('span');
            termSpan.textContent = match;
            Object.assign(termSpan.style, {
                textDecoration: 'underline dotted',
                cursor: 'help',
                color: this.theme.definedTermColor || '#00695c',
                fontWeight: 'bold'
            });
            const normalizedMatch = this._normalizeTermForMap(match);
            const defObj = this.definitionsMap.get(normalizedMatch);
            if (defObj) {
                termSpan.addEventListener('mouseover', (e) => this._showTooltip(e, defObj));
                termSpan.addEventListener('mouseout', (e) => this._hideTooltip(e));
            }
            fragment.appendChild(termSpan);
            lastIndex = offset + match.length;
            return match;
        });
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        parentElement.innerHTML = '';
        parentElement.appendChild(fragment);
    },

    _appendCitation: function(parentElement, definitionObject) {
        if (!definitionObject.source) return;
        const citationContainer = document.createElement('div');
        citationContainer.style.marginTop = '8px';

        const citationMatch = definitionObject.source.match(/^\[([^,]+),\s*(.+)\]$/);
        if (citationMatch && typeof this.launchBookReaderCallback === 'function') {
            const bookAbbr = citationMatch[1].trim();
            const chapterName = citationMatch[2].trim();
            const bookDisplayName = this.bookDisplayNames[bookAbbr] || bookAbbr;
            const filePath = this.bookFilePaths[bookAbbr];

            const citationSpan = document.createElement('span');
            citationSpan.innerHTML = `<span style="font-size:0.85em; font-style:italic;">(Source: ${bookDisplayName}, ${chapterName})</span>`;
            Object.assign(citationSpan.style, { color: this.theme.citationColor, cursor: 'pointer', textDecoration: 'underline' });
            citationSpan.title = `Click to open ${bookDisplayName} in the book reader`;

            if (filePath) {
                citationSpan.addEventListener('click', () => this.launchBookReaderCallback(filePath, chapterName, definitionObject.definition));
            }
            citationSpan.addEventListener('mouseover', () => citationSpan.style.color = this.theme.citationHoverColor);
            citationSpan.addEventListener('mouseout', () => citationSpan.style.color = this.theme.citationColor);
            citationContainer.appendChild(citationSpan);
        } else {
            const citationSpan = document.createElement('span');
            citationSpan.textContent = `(${definitionObject.source})`;
            Object.assign(citationSpan.style, { fontSize: '0.85em', fontStyle: 'italic', color: this.theme.citationColor });
            citationContainer.appendChild(citationSpan);
        }
        parentElement.appendChild(citationContainer);
    },

    _showTooltip: function(event, definitionObject) {
        if (!this.elements.tooltipDiv || !definitionObject) return;
        this.activeTooltipTerm = event.target;

        let tooltipHTML = `<strong style="color: ${this.theme.activeTabColor || '#00796b'}">${definitionObject.term}</strong><hr style="margin: 4px 0; border-color: ${this.theme.borderColor || '#aaa'}">`;
        tooltipHTML += definitionObject.definition.replace(/\n/g, '<br>');
        if (definitionObject.source) {
            tooltipHTML += `<br><em style="font-size:0.9em; opacity:0.8;">Source: ${definitionObject.source}</em>`;
        }
        this.elements.tooltipDiv.innerHTML = tooltipHTML;
        this.elements.tooltipDiv.style.visibility = 'visible';

        const chatLogRect = this.elements.chatLog.getBoundingClientRect();
        const termRect = event.target.getBoundingClientRect();

        let top = termRect.bottom - chatLogRect.top + this.elements.chatLog.scrollTop + 5;
        let left = termRect.left - chatLogRect.left + this.elements.chatLog.scrollLeft;

        this.elements.tooltipDiv.style.transform = 'translate(0,0)';
        const tooltipRect = this.elements.tooltipDiv.getBoundingClientRect();

        if (left + tooltipRect.width > this.elements.chatLog.clientWidth - 10) { left = this.elements.chatLog.clientWidth - tooltipRect.width - 10; }
        if (left < 0) left = 0;
        if (top + tooltipRect.height > this.elements.chatLog.scrollTop + this.elements.chatLog.clientHeight - 10) { top = termRect.top - chatLogRect.top + this.elements.chatLog.scrollTop - tooltipRect.height - 5; }
        if (top < this.elements.chatLog.scrollTop) top = this.elements.chatLog.scrollTop;

        this.elements.tooltipDiv.style.transform = `translate(${left}px, ${top}px)`;
    },

    _hideTooltip: function(event) {
        if (event.relatedTarget && this.elements.tooltipDiv.contains(event.relatedTarget)) { return; }
        if (this.activeTooltipTerm === event.target) { this.activeTooltipTerm = null; }
        if (this.elements.tooltipDiv && (!this.activeTooltipTerm || (event.relatedTarget && !this.elements.tooltipDiv.contains(event.relatedTarget)))) {
            this.elements.tooltipDiv.style.visibility = 'hidden';
        }
    },

    displayMultipleResults: function(matches, searchTerm) {
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'av_multiple_results';
        Object.assign(resultsContainer.style, {
            backgroundColor: this.theme.motherMessageBg || '#fffde7',
            maxHeight: '83%',
            border: `1px solid ${this.theme.borderColor}`,
            borderRadius: '8px',
            padding: '5px',
            marginBottom: '5px',
            marginRight: 'auto',
            maxWidth: '95%',
            color: this.theme.textColor
        });

        const header = document.createElement('h4');
        header.textContent = `Found ${matches.length} result${matches.length === 1 ? '' : 's'} for "${searchTerm}":`;
        Object.assign(header.style, { marginTop: '4px', marginBottom: '2px', color: this.theme.textColor });
        resultsContainer.appendChild(header);

        const list = document.createElement('ul');
        Object.assign(list.style, { listStyleType: 'none', paddingLeft: '0', maxHeight: '280px', overflowY: 'auto' });

        matches.forEach((match, index) => {
            const listItem = document.createElement('li');
            Object.assign(listItem.style, { margin: '8px', paddingBottom: '5px', borderBottom: (index < matches.length - 1) ? `1px dashed ${this.theme.borderColor}` : 'none' });
            const termHeader = document.createElement('div');
            const termStrong = document.createElement('strong');
            termStrong.textContent = match.term;
            termStrong.style.color = this.theme.definedTermColor || '#00695c';
            termHeader.appendChild(termStrong);

            if (match.type === 'qa') {
                const typeIndicator = document.createElement('span');
                typeIndicator.textContent = ' (Question)';
                Object.assign(typeIndicator.style, { fontSize: '0.8em', fontStyle: 'italic', opacity: '0.7', marginLeft: '5px' });
                termHeader.appendChild(typeIndicator);
            }
            if (match.matchType === 'definition') {
                const typeIndicator = document.createElement('span');
                typeIndicator.textContent = ' (keyword in text)';
                Object.assign(typeIndicator.style, { fontSize: '0.8em', fontStyle: 'italic', opacity: '0.7', marginLeft: '5px' });
                termHeader.appendChild(typeIndicator);
            }

            listItem.appendChild(termHeader);
            const defP = document.createElement('p');
            defP.style.margin = '5px 0 5px 0';
            this._applyTermHighlighting(defP, match.definition);
            listItem.appendChild(defP);
            if (match.source) { this._appendCitation(listItem, match); }
            list.appendChild(listItem);
        });
        resultsContainer.appendChild(list);
        this.elements.chatLog.appendChild(resultsContainer);
        this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight;
    },

    destroy: function() {
        console.log("AuroView (ChatExplorer): Destroying...");
        clearTimeout(this.suggestionTimeout);
        if (this.elements.tooltipDiv && this.elements.tooltipDiv.parentNode) {
            this.elements.tooltipDiv.parentNode.removeChild(this.elements.tooltipDiv);
        }
        if (this.container) { this.container.innerHTML = ""; }
        this.container = null;
        this.definitionsData = [];
        this.qaData = [];
        this.searchableData = [];
        this.theme = null;
        this.bookFilePaths = {};
        this.bookDisplayNames = {};
        this.elements = {
            mainLayout: null,
            chatLog: null,
            suggestionsContainer: null,
            chatInput: null,
            sendButton: null,
            imageSection: null,
            aurobindoImage: null,
            imageCounter: null,
            prevImageBtn: null,
            nextImageBtn: null,
            tooltipDiv: null
        };
        this.definitionsMap.clear();
        this.sortedDefinedTermsRegex = null;
        this.activeTooltipTerm = null;
        this.allTermsForSuggestions = [];
        this.launchBookReaderCallback = null;
    }
};

