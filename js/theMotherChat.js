// js/theMotherChat.js - Enhanced with Autosuggestions, Image Gallery, and Scrollable Results

const TheMotherChat = {
    id: 'theMotherChat',
    gameContainer: null,
    sharedData: null,
    elements: {
        chatLog: null,
        chatInput: null,
        sendButton: null,
        tooltipDiv: null,
        suggestionsContainer: null,
        imageContainer: null,
        motherImage: null,
        imageCounter: null,
        prevImageBtn: null,
        nextImageBtn: null,
    },
    theme: {
        inputBg: '#fff',
        inputBorderColor: '#ccc',
        buttonBg: '#8d6e63',
        buttonColor: '#fff',
        userMessageBg: '#e0f7fa',
        motherMessageBg: '#fff9c4',
        borderColor: '#c8b7a6',
        textColor: '#3e2723',
        citationColor: '#54728c',
        citationHoverColor: '#3a506b',
        definedTermColor: '#00695c',
        tooltipBg: '#333',
        tooltipColor: '#fff',
        suggestionBg: '#f5f5f5',
        suggestionHoverBg: '#e8e8e8',
        suggestionBorder: '#ddd',
        suggestionActiveColor: '#8d6e63',
        imageNavBg: '#f0f0f0',
        imageNavHoverBg: '#e0e0e0',
        // New theme colors for result carousel
        carouselNavBg: '#f8f8f8',
        carouselNavHoverBg: '#e8e8e8',
        carouselIndicatorActive: '#8d6e63',
        carouselIndicatorInactive: '#ddd',
    },

    // Image gallery properties
    motherImages: [
        'images/beings/theMother/theMother1.jpg',
        'images/beings/theMother/theMother2.jpg'
    ],
    currentImageIndex: 0,

    definitionsMap: new Map(),
    sortedDefinedTermsRegex: null,
    activeTooltipTerm: null,
    
    // Properties for autosuggestions
    allTerms: [],
    currentSuggestions: [],
    maxSuggestions: 100,
    suggestionUpdateDelay: 200,
    suggestionTimeout: null,

    // Helper to escape special characters for regex
    _escapeRegExp: function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    // Normalization for map keys and for matching
    _normalizeTermForMap: function(text) {
        if (typeof text !== 'string') return "";
        return text.toLowerCase().trim();
    },

    init: function(container, sharedGameData) {
        console.log("TheMotherChat: Initializing...");
        this.gameContainer = container;
        this.sharedData = sharedGameData;

        if (!this.gameContainer) {
            console.error("TheMotherChat: Chat container not provided!");
            return;
        }
        if (!this.sharedData || !this.sharedData.definitionsData) {
            console.warn("TheMotherChat: Definitions data not provided or empty. Tooltip feature will be limited.");
        }
        
        this._prepareDefinitions();
        this._prepareTermsForSuggestions();
        this.renderChatUI();
        this.attachEventListeners();
        this._showInitialSuggestions();
 //       this.displayMessage("You can ask a question or type a term to see its definition.", "Mother", null, true);
    },

    _prepareDefinitions: function() {
        this.definitionsMap.clear();
        if (this.sharedData && this.sharedData.definitionsData) {
            const definedTermsForRegex = [];
            this.sharedData.definitionsData.forEach(def => {
                if (def.term && def.definition) {
                    const normalizedTerm = this._normalizeTermForMap(def.term);
                    this.definitionsMap.set(normalizedTerm, def.definition);
                    definedTermsForRegex.push(this._escapeRegExp(def.term));
                }
            });

            if (definedTermsForRegex.length > 0) {
                definedTermsForRegex.sort((a, b) => b.length - a.length);
                this.sortedDefinedTermsRegex = new RegExp(`\\b(${definedTermsForRegex.join('|')})\\b`, 'gi');
                console.log("TheMotherChat: Definitions map and regex prepared.");
            } else {
                this.sortedDefinedTermsRegex = null;
                console.log("TheMotherChat: No valid definitions found to prepare regex.");
            }
        } else {
            this.sortedDefinedTermsRegex = null;
        }
    },

    _prepareTermsForSuggestions: function() {
        this.allTerms = [];
        const termFrequency = new Map();

        // Add terms from definitions
        if (this.sharedData && this.sharedData.definitionsData) {
            this.sharedData.definitionsData.forEach(def => {
                if (def.term) {
                    const term = def.term.trim();
                    if (term) {
                        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
                    }
                }
            });
        }

        // Add key terms from Q&A data
        if (this.sharedData && this.sharedData.qaData) {
            this.sharedData.qaData.forEach(qa => {
                if (qa.questions && Array.isArray(qa.questions)) {
                    qa.questions.forEach(question => {
                        // Extract key terms from questions
                        const words = question.match(/\b\w{4,}\b/g);
                        if (words) {
                            words.forEach(word => {
                                if (word.length > 3 && !this._isCommonWord(word)) {
                                    termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
                                }
                            });
                        }
                    });
                }
            });
        }

        // Convert to array and sort by frequency, then alphabetically
        this.allTerms = Array.from(termFrequency.entries())
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return a[0].localeCompare(b[0]);
            })
            .map(entry => entry[0]);

        console.log(`TheMotherChat: Prepared ${this.allTerms.length} terms for suggestions`);
    },

    _isCommonWord: function(word) {
        const commonWords = ['that', 'this', 'with', 'from', 'they', 'been', 'have', 'their', 'said', 'each', 'which', 'what', 'will', 'there', 'when', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'your', 'work', 'life', 'only', 'can', 'still', 'should', 'after', 'being', 'now', 'made', 'before', 'here', 'through', 'when', 'where', 'much', 'those', 'these', 'some', 'would', 'other'];
        return commonWords.includes(word.toLowerCase());
    },

    renderChatUI: function() {
        this.gameContainer.innerHTML = `
            <div style="display: flex; height: 100%; gap: 15px;">
                <!-- Left side: Chat interface -->
                <div id="motherChatSection" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                    <div id="motherChatLog" style="height: calc(100% - 120px); font-size:20px; overflow-y: auto; padding: 10px; border: 1px solid ${this.theme.borderColor}; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 10px; position: relative;">
                        <!-- Chat messages will appear here -->
                    </div>
                    <div id="motherSuggestionsContainer" style="height: 50px; font-size:18px; margin-bottom: 10px; overflow-x: auto; overflow-y: hidden; white-space: nowrap; padding: 5px 0; border-bottom: 1px solid ${this.theme.suggestionBorder};">
                        <!-- Suggestions will appear here -->
                    </div>
                    <div id="motherChatInputContainer" style="display: flex; height: 40px;">
                        <input type="text" id="motherChatInput" placeholder="Type your question or term..." style="flex-grow: 1; padding: 8px; border: 1px solid ${this.theme.inputBorderColor}; border-radius: 4px 0 0 4px; font-size: 1em;">
                        <button id="motherChatSendButton" style="padding: 8px 15px; background-color: ${this.theme.buttonBg}; color: ${this.theme.buttonColor}; border: none; border-radius: 0 4px 4px 0; cursor: pointer; font-size: 1em;">Send</button>
                    </div>
                </div>
                
                <!-- Right side: Mother's image -->
                <div id="motherImageSection" style="flex: 0 0 300px; display: flex; flex-direction: column; border: 1px solid ${this.theme.borderColor}; border-radius: 8px; background-color: #fafafa; padding: 15px;">
                    <div style="text-align: center; margin-bottom: 10px; font-size: 1.1em; font-weight: 600; color: ${this.theme.textColor};">
                        The Mother
                    </div>
                    
                    <div id="motherImageContainer" style="flex: 1; display: flex; justify-content: center; align-items: center; margin-bottom: 15px; background-color: white; border-radius: 6px; border: 1px solid ${this.theme.borderColor}; overflow: hidden;">
                        <img id="motherImage" src="${this.motherImages[0]}" alt="The Mother" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;">
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; background-color: ${this.theme.imageNavBg}; padding: 8px; border-radius: 6px;">
                        <button id="prevImageBtn" style="padding: 6px 12px; background-color: transparent; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; cursor: pointer; font-size: 0.9em; color: ${this.theme.textColor}; transition: background-color 0.2s ease;">
                            ◀ Prev
                        </button>
                        
                        <span id="imageCounter" style="font-size: 0.9em; color: ${this.theme.textColor}; font-weight: 500;">
                            1 of ${this.motherImages.length}
                        </span>
                        
                        <button id="nextImageBtn" style="padding: 6px 12px; background-color: transparent; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; cursor: pointer; font-size: 0.9em; color: ${this.theme.textColor}; transition: background-color 0.2s ease;">
                            Next ▶
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Get chat elements
        this.elements.chatLog = this.gameContainer.querySelector('#motherChatLog');
        this.elements.chatInput = this.gameContainer.querySelector('#motherChatInput');
        this.elements.sendButton = this.gameContainer.querySelector('#motherChatSendButton');
        this.elements.suggestionsContainer = this.gameContainer.querySelector('#motherSuggestionsContainer');
        
        // Get image elements
        this.elements.imageContainer = this.gameContainer.querySelector('#motherImageContainer');
        this.elements.motherImage = this.gameContainer.querySelector('#motherImage');
        this.elements.imageCounter = this.gameContainer.querySelector('#imageCounter');
        this.elements.prevImageBtn = this.gameContainer.querySelector('#prevImageBtn');
        this.elements.nextImageBtn = this.gameContainer.querySelector('#nextImageBtn');

        // Create the tooltip div
        this.elements.tooltipDiv = document.createElement('div');
        this.elements.tooltipDiv.id = 'motherChatTooltip';
        this.elements.tooltipDiv.style.position = 'absolute';
        this.elements.tooltipDiv.style.visibility = 'hidden';
        this.elements.tooltipDiv.style.backgroundColor = this.theme.tooltipBg;
        this.elements.tooltipDiv.style.color = this.theme.tooltipColor;
        this.elements.tooltipDiv.style.border = `1px solid ${this.theme.borderColor}`;
        this.elements.tooltipDiv.style.borderRadius = '4px';
        this.elements.tooltipDiv.style.padding = '8px 10px';
        this.elements.tooltipDiv.style.maxWidth = '300px';
        this.elements.tooltipDiv.style.fontSize = '0.9em';
        this.elements.tooltipDiv.style.zIndex = '100';
        this.elements.tooltipDiv.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
        this.elements.tooltipDiv.style.pointerEvents = 'none';
        this.gameContainer.appendChild(this.elements.tooltipDiv);
    },

    attachEventListeners: function() {
        // Chat event listeners
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.handleUserInput());
        }
        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.handleUserInput();
                }
            });
            
            this.elements.chatInput.addEventListener('input', () => {
                this._handleInputChange();
            });
            
            this.elements.chatInput.addEventListener('focus', () => {
                this._handleInputChange();
            });
        }

        // Image navigation event listeners
        if (this.elements.prevImageBtn) {
            this.elements.prevImageBtn.addEventListener('click', () => this._previousImage());
            this.elements.prevImageBtn.addEventListener('mouseenter', () => {
                this.elements.prevImageBtn.style.backgroundColor = this.theme.imageNavHoverBg;
            });
            this.elements.prevImageBtn.addEventListener('mouseleave', () => {
                this.elements.prevImageBtn.style.backgroundColor = 'transparent';
            });
        }

        if (this.elements.nextImageBtn) {
            this.elements.nextImageBtn.addEventListener('click', () => this._nextImage());
            this.elements.nextImageBtn.addEventListener('mouseenter', () => {
                this.elements.nextImageBtn.style.backgroundColor = this.theme.imageNavHoverBg;
            });
            this.elements.nextImageBtn.addEventListener('mouseleave', () => {
                this.elements.nextImageBtn.style.backgroundColor = 'transparent';
            });
        }

        // Optional: Add keyboard navigation for images when focused
        this.gameContainer.addEventListener('keydown', (event) => {
            if (event.target === this.elements.chatInput) return; // Don't interfere with chat input
            
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this._previousImage();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                this._nextImage();
            }
        });
    },

    // Image navigation methods
    _previousImage: function() {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.motherImages.length) % this.motherImages.length;
        this._updateImage();
    },

    _nextImage: function() {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.motherImages.length;
        this._updateImage();
    },

    _updateImage: function() {
        if (this.elements.motherImage && this.elements.imageCounter) {
            // Add a subtle fade effect
            this.elements.motherImage.style.opacity = '0.5';
            
            setTimeout(() => {
                this.elements.motherImage.src = this.motherImages[this.currentImageIndex];
                this.elements.imageCounter.textContent = `${this.currentImageIndex + 1} of ${this.motherImages.length}`;
                this.elements.motherImage.style.opacity = '1';
            }, 150);
        }
    },

    _handleInputChange: function() {
        clearTimeout(this.suggestionTimeout);
        this.suggestionTimeout = setTimeout(() => {
            const inputText = this.elements.chatInput.value.trim();
            this._updateSuggestions(inputText);
        }, this.suggestionUpdateDelay);
    },

    _updateSuggestions: function(inputText) {
        if (!inputText) {
            this._showInitialSuggestions();
            return;
        }

        const normalizedInput = inputText.toLowerCase();
        const matchingTerms = this.allTerms.filter(term => 
            term.toLowerCase().includes(normalizedInput) && 
            term.toLowerCase() !== normalizedInput
        );

        this.currentSuggestions = matchingTerms.slice(0, this.maxSuggestions);
        this._renderSuggestions();
    },

    _showInitialSuggestions: function() {
        this.currentSuggestions = this.allTerms.slice(0, this.maxSuggestions);
        this._renderSuggestions();
    },

    _renderSuggestions: function() {
        if (!this.elements.suggestionsContainer) return;

        this.elements.suggestionsContainer.innerHTML = '';
        
        this.currentSuggestions.forEach(term => {
            const suggestionBtn = document.createElement('button');
            suggestionBtn.textContent = term;
            suggestionBtn.style.display = 'inline-block';
            suggestionBtn.style.margin = '2px 5px 2px 0';
            suggestionBtn.style.padding = '6px 12px';
            suggestionBtn.style.backgroundColor = this.theme.suggestionBg;
            suggestionBtn.style.border = `1px solid ${this.theme.suggestionBorder}`;
            suggestionBtn.style.borderRadius = '20px';
            suggestionBtn.style.cursor = 'pointer';
            suggestionBtn.style.fontSize = '0.9em';
            suggestionBtn.style.whiteSpace = 'nowrap';
            suggestionBtn.style.transition = 'background-color 0.2s ease';
            
            suggestionBtn.addEventListener('mouseenter', () => {
                suggestionBtn.style.backgroundColor = this.theme.suggestionHoverBg;
                suggestionBtn.style.borderColor = this.theme.suggestionActiveColor;
            });
            
            suggestionBtn.addEventListener('mouseleave', () => {
                suggestionBtn.style.backgroundColor = this.theme.suggestionBg;
                suggestionBtn.style.borderColor = this.theme.suggestionBorder;
            });
            
            // MODIFIED: Changed to directly handle suggestion click instead of just filling input
            suggestionBtn.addEventListener('click', () => {
                this._handleSuggestionClick(term);
            });
            
            this.elements.suggestionsContainer.appendChild(suggestionBtn);
        });
    },

    // NEW METHOD: Handle suggestion click directly
    _handleSuggestionClick: function(term) {
        // Clear the input first
        this.elements.chatInput.value = "";
        
        // Display the user's selected term as a message
        this.displayMessage(term, "User");
        
        // Reset suggestions to show initial state
        this._showInitialSuggestions();
        
        // Search for and display the response
        const response = this.searchForResponse(term);
        setTimeout(() => { 
            if (response.isMultiple) {
                this.displayMultipleResponses(response.matches, response.searchTerm);
            } else {
                this.displayMessage(response.text, "Mother", response.citationInfo);
            }
        }, 300);
    },

    handleUserInput: function() {
        if (!this.elements.chatInput) return;
        const inputText = this.elements.chatInput.value.trim();
        if (inputText === "") return;

        this.displayMessage(inputText, "User");
        this.elements.chatInput.value = ""; 
        this._showInitialSuggestions();

        const response = this.searchForResponse(inputText);
        setTimeout(() => { 
            if (response.isMultiple) {
                this.displayMultipleResponses(response.matches, response.searchTerm);
            } else {
                this.displayMessage(response.text, "Mother", response.citationInfo);
            }
        }, 300);
    },

    _normalizeTextForSearch: function(text) {
        if (typeof text !== 'string') return "";
        return text.toLowerCase().replace(/[^\w\s'-]/gi, '').replace(/\s+/g, ' ').trim();
    },

    searchForResponse: function(inputText) {
        const normalizedInput = this._normalizeTextForSearch(inputText);
        let allMatches = [];
        // REMOVED: maxResults limit - now we show all matches

        // Search Q&A data
        if (this.sharedData && this.sharedData.qaData) {
            this.sharedData.qaData.forEach(qaItem => {
                if (qaItem.questions && Array.isArray(qaItem.questions)) {
                    qaItem.questions.forEach(question => {
                        const normalizedQuestion = this._normalizeTextForSearch(question);
                        if (normalizedQuestion.includes(normalizedInput)) {
                            let citationInfo = null;
                            if (qaItem.citation) {
                                const match = qaItem.citation.match(/^\[([^,]+),\s*(.+)\]$/);
                                if (match) {
                                    citationInfo = { text: qaItem.citation, book: match[1].trim(), chapter: match[2].trim(), answerToSearch: qaItem.answer };
                                } else { citationInfo = { text: qaItem.citation }; }
                            }
                            
                            let score = (normalizedQuestion === normalizedInput) ? 100 : normalizedInput.length;
                            allMatches.push({
                                text: qaItem.answer,
                                citationInfo: citationInfo,
                                score: score,
                                type: 'qa',
                                matchedQuestion: question
                            });
                        }
                    });
                }
            });
        }

        // Search definitions data
        if (this.sharedData && this.sharedData.definitionsData) {
            this.sharedData.definitionsData.forEach(defItem => {
                const normalizedTerm = this._normalizeTextForSearch(defItem.term);
                if (normalizedTerm.includes(normalizedInput)) {
                    let citationInfo = null;
                    if (defItem.source) {
                        const match = defItem.source.match(/^\[([^,]+),\s*(.+)\]$/);
                        if (match) {
                            citationInfo = { text: defItem.source, book: match[1].trim(), chapter: match[2].trim(), answerToSearch: defItem.term };
                        } else { citationInfo = { text: defItem.source }; }
                    }
                    
                    let score = 0;
                    if (normalizedTerm === normalizedInput) score = 100;
                    else if (normalizedTerm.startsWith(normalizedInput)) score = 50 + normalizedInput.length;
                    else score = normalizedInput.length;

                    allMatches.push({
                        text: defItem.definition,
                        citationInfo: citationInfo,
                        score: score,
                        type: 'definition',
                        term: defItem.term
                    });
                }
            });
        }

        if (allMatches.length === 0) {
            return { 
                text: "I understand you are seeking guidance. While I don't have a direct response for that specific phrasing, perhaps rephrasing your query, or exploring the 'Ask (Q&A)' or 'Definitions' sections might offer the insight you seek.", 
                citationInfo: null,
                isMultiple: false
            };
        }

        allMatches.sort((a, b) => b.score - a.score);
        // REMOVED: slice limiting - show all matches

        if (allMatches.length === 1) {
            return {
                text: allMatches[0].text,
                citationInfo: allMatches[0].citationInfo,
                isMultiple: false
            };
        }

        return {
            matches: allMatches, // Now includes all matches
            isMultiple: true,
            searchTerm: inputText
        };
    },

    _showTooltip: function(event, definitionText) {
        if (!this.elements.tooltipDiv || this.activeTooltipTerm === event.target) return;
        this.activeTooltipTerm = event.target;

        this.elements.tooltipDiv.innerHTML = definitionText.replace(/\n/g, '<br>');
        this.elements.tooltipDiv.style.visibility = 'visible';
        
        const gameRect = this.gameContainer.getBoundingClientRect();
        const termRect = event.target.getBoundingClientRect();

        let top = termRect.bottom - gameRect.top + 5 + this.elements.chatLog.scrollTop;
        let left = termRect.left - gameRect.left;

        this.elements.tooltipDiv.style.top = '0px';
        this.elements.tooltipDiv.style.left = '0px';
        const tooltipRect = this.elements.tooltipDiv.getBoundingClientRect();

        if (left + tooltipRect.width > gameRect.width - 10) {
            left = gameRect.width - tooltipRect.width - 10;
        }
        if (left < 10) {
            left = 10;
        }
        if (top + tooltipRect.height > this.elements.chatLog.clientHeight + this.elements.chatLog.offsetTop - 10 ) {
            top = termRect.top - gameRect.top - tooltipRect.height - 5 + this.elements.chatLog.scrollTop;
        }
         if (top < this.elements.chatLog.offsetTop + this.elements.chatLog.scrollTop + 5) {
            top = this.elements.chatLog.offsetTop + this.elements.chatLog.scrollTop + 5;
        }

        this.elements.tooltipDiv.style.top = `${top}px`;
        this.elements.tooltipDiv.style.left = `${left}px`;
    },

    _hideTooltip: function(event) {
        if (!this.elements.tooltipDiv) return;
        if (this.activeTooltipTerm === event.target) {
             this.activeTooltipTerm = null;
        }
        this.elements.tooltipDiv.style.visibility = 'hidden';
    },

    displayMessage: function(text, sender, citationInfo = null, isGreeting = false) {
        if (!this.elements.chatLog) return;

        const messageDiv = document.createElement('div');
        messageDiv.style.marginBottom = '10px';
        messageDiv.style.padding = '8px 12px';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.maxWidth = '80%';
        messageDiv.style.wordWrap = 'break-word';
        messageDiv.style.lineHeight = '1.5';

        const textP = document.createElement('p');
        textP.style.margin = '0';

        if (sender === "Mother" && this.sortedDefinedTermsRegex && text && !isGreeting) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            text.replace(this.sortedDefinedTermsRegex, (match, ...args) => {
                const offset = args[args.length - 2];
                
                if (offset > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
                }
                
                const termSpan = document.createElement('span');
                termSpan.textContent = match;
                termSpan.style.textDecoration = 'underline dotted';
                termSpan.style.cursor = 'help';
                termSpan.style.color = this.theme.definedTermColor;
                termSpan.style.fontWeight = '600';

                const normalizedMatch = this._normalizeTermForMap(match);
                const definition = this.definitionsMap.get(normalizedMatch);

                if (definition) {
                    termSpan.addEventListener('mouseover', (event) => this._showTooltip(event, definition));
                    termSpan.addEventListener('mouseout', (event) => this._hideTooltip(event));
                }
                fragment.appendChild(termSpan);
                lastIndex = offset + match.length;
                return match;
            });
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            textP.appendChild(fragment);
        } else {
            textP.textContent = text;
        }
        messageDiv.appendChild(textP);
        
        if (sender === "User") {
            messageDiv.style.backgroundColor = this.theme.userMessageBg;
            messageDiv.style.marginLeft = 'auto';
            messageDiv.style.textAlign = 'right';
        } else { 
            messageDiv.style.backgroundColor = this.theme.motherMessageBg;
            messageDiv.style.marginRight = 'auto';
            messageDiv.style.textAlign = 'left';

            if (citationInfo && citationInfo.text && citationInfo.book && citationInfo.chapter && this.sharedData.launchBookReader) {
                const citationSpan = document.createElement('span');
                let displayCitationText = citationInfo.text.replace(/^\[|\]$/g, '');
                citationSpan.textContent = ` (Source: ${displayCitationText})`; 
                
                citationSpan.style.fontSize = '0.8em';
                citationSpan.style.fontStyle = 'italic';
                citationSpan.style.color = this.theme.citationColor;
                citationSpan.style.cursor = 'pointer';
                citationSpan.style.textDecoration = 'underline';
                citationSpan.style.marginLeft = '5px';

citationSpan.addEventListener('click', () => {
                    this.sharedData.launchBookReader(citationInfo.book, citationInfo.chapter, citationInfo.answerToSearch);
                });
                citationSpan.addEventListener('mouseover', () => citationSpan.style.color = this.theme.citationHoverColor);

citationSpan.addEventListener('mouseout', () => citationSpan.style.color = this.theme.citationColor);



                textP.appendChild(citationSpan); 
            } else if (citationInfo && citationInfo.text && !isGreeting) { 
                const citationSpan = document.createElement('span');
                citationSpan.textContent = ` (Source: ${citationInfo.text.replace(/^\[|\]$/g, '')})`;
                citationSpan.style.fontSize = '0.8em';
                citationSpan.style.fontStyle = 'italic';
                citationSpan.style.color = this.theme.textColor; 
                citationSpan.style.marginLeft = '5px';
                textP.appendChild(citationSpan);
            }
        }


this.elements.chatLog.appendChild(messageDiv);
        this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight; 
    },

    // New method to display multiple responses with expandable interface
 
	displayMultipleResponses: function(matches, searchTerm) {
    if (!this.elements.chatLog || !matches || matches.length === 0) return;

    // Create carousel container
    const carouselDiv = document.createElement('div');
    carouselDiv.style.marginBottom = '10px';
    carouselDiv.style.padding = '12px';
    carouselDiv.style.borderRadius = '8px';
    carouselDiv.style.maxWidth = '85%';
    carouselDiv.style.marginRight = 'auto';
    carouselDiv.style.backgroundColor = this.theme.motherMessageBg;
    carouselDiv.style.border = `1px solid ${this.theme.borderColor}`;
    carouselDiv.style.position = 'relative';

    // Header with count and search term
    const headerDiv = document.createElement('div');
    headerDiv.style.marginBottom = '12px';
    headerDiv.style.fontWeight = 'bold';
    headerDiv.style.color = this.theme.textColor;
 //   headerDiv.innerHTML = `Displaying ${matches.length} result${matches.length > 1 ? 's' : ''} for "${searchTerm}":`;
    carouselDiv.appendChild(headerDiv);

    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.style.position = 'relative';
    contentDiv.style.minHeight = '100px';
    carouselDiv.appendChild(contentDiv);

    // Create navigation arrows
    const navDiv = document.createElement('div');
    navDiv.style.display = 'flex';
    navDiv.style.justifyContent = 'space-between';
    navDiv.style.marginTop = '10px';

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '❮ Previous';
    prevButton.style.padding = '6px 12px';
    prevButton.style.backgroundColor = this.theme.carouselNavBg;
    prevButton.style.border = `1px solid ${this.theme.borderColor}`;
    prevButton.style.borderRadius = '4px';
    prevButton.style.cursor = 'pointer';
    prevButton.disabled = true; // Disable initially for first item

    const nextButton = document.createElement('button');
    nextButton.innerHTML = 'Next ❯';
    nextButton.style.padding = '6px 12px';
    nextButton.style.backgroundColor = this.theme.carouselNavBg;
    nextButton.style.border = `1px solid ${this.theme.borderColor}`;
    nextButton.style.borderRadius = '4px';
    nextButton.style.cursor = 'pointer';
    if (matches.length === 1) nextButton.disabled = true;

    // Create counter
    const counterSpan = document.createElement('span');
    counterSpan.style.padding = '6px 12px';
    counterSpan.style.fontSize = '0.9em';
    counterSpan.textContent = `1 of ${matches.length}`;

    navDiv.appendChild(prevButton);
    navDiv.appendChild(counterSpan);
    navDiv.appendChild(nextButton);
    carouselDiv.appendChild(navDiv);

    // Create result container
    const resultContainer = document.createElement('div');
    resultContainer.style.position = 'relative';
    contentDiv.appendChild(resultContainer);

    // Add all results but hide all except first
    const resultDivs = [];
    matches.forEach((match, index) => {
        const resultDiv = this._createSingleResultDiv(match, index, true);
        resultDiv.style.display = index === 0 ? 'block' : 'none';
        resultContainer.appendChild(resultDiv);
        resultDivs.push(resultDiv);
    });

    // Track current index
    let currentIndex = 0;

    // Navigation functions
    const showResult = (index) => {
        resultDivs.forEach((div, i) => {
            div.style.display = i === index ? 'block' : 'none';
        });
        counterSpan.textContent = `${index + 1} of ${matches.length}`;
        prevButton.disabled = index === 0;
        nextButton.disabled = index === matches.length - 1;
    };

    prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            showResult(currentIndex);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentIndex < matches.length - 1) {
            currentIndex++;
            showResult(currentIndex);
        }
    });

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!carouselDiv.parentNode) return; // Skip if carousel is removed

        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            showResult(currentIndex);
        } else if (e.key === 'ArrowRight' && currentIndex < matches.length - 1) {
            currentIndex++;
            showResult(currentIndex);
        }
    });

    this.elements.chatLog.appendChild(carouselDiv);
    this.elements.chatLog.scrollTop = this.elements.chatLog.scrollHeight;
},

	// Helper method to create a single result div
    _createSingleResultDiv: function(match, index, isFirst) {
        const resultDiv = document.createElement('div');
        
        // Add result number and type indicator (unless it's the first one)
        if (!isFirst) {
            const resultHeader = document.createElement('div');
            resultHeader.style.fontSize = '0.85em';
            resultHeader.style.color = this.theme.citationColor;
            resultHeader.style.marginBottom = '6px';
            resultHeader.style.fontWeight = '500';
            
            let headerText = `Result ${index + 1}`;
            if (match.type === 'definition' && match.term) {
                headerText += ` - Definition of "${match.term}"`;
            } else if (match.type === 'qa' && match.matchedQuestion) {
                headerText += ` - Q&A`;
            }
            resultHeader.textContent = headerText;
            resultDiv.appendChild(resultHeader);
        }

        const textP = document.createElement('p');
        textP.style.margin = '0';
        textP.style.lineHeight = '1.5';

        // Apply term highlighting if this is a Mother response with definitions
        if (this.sortedDefinedTermsRegex && match.text) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            match.text.replace(this.sortedDefinedTermsRegex, (matchedTerm, ...args) => {
                const offset = args[args.length - 2];
                
                if (offset > lastIndex) {
                    fragment.appendChild(document.createTextNode(match.text.substring(lastIndex, offset)));
                }
                
                const termSpan = document.createElement('span');
                termSpan.textContent = matchedTerm;
                termSpan.style.textDecoration = 'underline dotted';
                termSpan.style.cursor = 'help';
                termSpan.style.color = this.theme.definedTermColor;
                termSpan.style.fontWeight = '600';

                const normalizedMatch = this._normalizeTermForMap(matchedTerm);
                const definition = this.definitionsMap.get(normalizedMatch);

                if (definition) {
                    termSpan.addEventListener('mouseover', (event) => this._showTooltip(event, definition));
                    termSpan.addEventListener('mouseout', (event) => this._hideTooltip(event));
                }
                fragment.appendChild(termSpan);
                lastIndex = offset + matchedTerm.length;
                return matchedTerm;
            });
            if (lastIndex < match.text.length) {
                fragment.appendChild(document.createTextNode(match.text.substring(lastIndex)));
            }
            textP.appendChild(fragment);
        } else {
            textP.textContent = match.text;
        }

        // Add citation if available
        if (match.citationInfo && match.citationInfo.text) {
            const citationSpan = document.createElement('span');
            let displayCitationText = match.citationInfo.text.replace(/^\[|\]$/g, '');
            citationSpan.textContent = ` (${displayCitationText})`; //source Source
            
            citationSpan.style.fontSize = '1.0em';
            citationSpan.style.fontStyle = 'italic';
            citationSpan.style.marginLeft = '5px';

            if (match.citationInfo.book && match.citationInfo.chapter && this.sharedData.launchBookReader) {
                citationSpan.style.color = this.theme.citationColor;
                citationSpan.style.cursor = 'pointer';
                citationSpan.style.textDecoration = 'underline';

                citationSpan.addEventListener('click', () => {
                    this.sharedData.launchBookReader(match.citationInfo.book, match.citationInfo.chapter, match.citationInfo.answerToSearch);
                });
                citationSpan.addEventListener('mouseover', () => citationSpan.style.color = this.theme.citationHoverColor);
                citationSpan.addEventListener('mouseout', () => citationSpan.style.color = this.theme.citationColor);
            } else {
                citationSpan.style.color = this.theme.textColor;
            }
            
            textP.appendChild(citationSpan);
        }

        resultDiv.appendChild(textP);
        return resultDiv; 
    },

    destroy: function() {
        console.log("TheMotherChat: Destroying...");
        
        // Clear timeouts
        if (this.suggestionTimeout) {
            clearTimeout(this.suggestionTimeout);
            this.suggestionTimeout = null;
        }
        
        if(this.elements.tooltipDiv && this.elements.tooltipDiv.parentNode) {
            this.elements.tooltipDiv.parentNode.removeChild(this.elements.tooltipDiv);
        }

        if (this.gameContainer) {
            this.gameContainer.innerHTML = "";
        }
        this.gameContainer = null;
        this.sharedData = null;
        this.elements = { chatLog: null, chatInput: null, sendButton: null, tooltipDiv: null, suggestionsContainer: null };
        this.definitionsMap.clear();
        this.sortedDefinedTermsRegex = null;
        this.activeTooltipTerm = null;
        this.allTerms = [];
        this.currentSuggestions = [];
    }
};
