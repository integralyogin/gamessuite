// js/theMotherGame.js

const TheMotherGame = {
    id: 'TheMotherGame',
    name: "The Mother - Base Game",
    theme: {
        backgroundColor: '#f0e4d7',
        textColor: '#3e2723',
        buttonColor: '#8d6e63',
        buttonHoverColor: '#a1887f',
        borderColor: '#c8b7a6',
        questionListBg: '#e9e0d7',
        questionHoverBg: '#d7cec5',
        activeTabColor: '#8d6e63',
        activeTabTextColor: '#ffffff',
        inactiveTabColor: '#d7cec5',
        inactiveTabTextColor: '#3e2723',
        mainTabActiveBg: '#6d4c41',
        mainTabActiveFg: '#ffffff',
        mainTabInactiveBg: '#a1887f',
        mainTabInactiveFg: '#ede7f6',
        citationColor: '#54728c',
        citationHoverColor: '#3a506b',
    },

    // --- Game State ---
    gameContainer: null,
    onSuccessCallback: null,
    onFailureCallback: null,
    sharedDataObject: null,
    qaData: [],
    definitionsData: [],
    currentAnswer: "Blessings", // For Ask tab
    currentCitation: { text: "", book: null, chapter: null, answerToSearch: null }, // For Ask tab

    activeQuestionFilter: 'All', // For Ask tab's Q&A filters
    searchTerm: '', // For Ask tab's Q&A search
    definitionsSearchTerm: '', // For Definitions tab search

    questionTabFilters: [
        { label: 'All', filterKey: 'All' },
        { label: 'How', filterKey: 'How' },
        { label: 'Should', filterKey: 'Should' },
        { label: 'What', filterKey: 'What' },
        { label: 'When', filterKey: 'When' },
        { label: 'Who', filterKey: 'Who' },
        { label: 'Why', filterKey: 'Why' }
    ],

    activeMainTab: 'Chat', // MODIFIED: Default to Chat
    mainTabsConfig: [ // MODIFIED
        { id: 'Chat', label: 'Chat' },
        { id: 'Ask', label: 'Ask (Q&A)' },
        { id: 'Definitions', label: 'Definitions' }
    ],

    bookFilePaths: {
        'wotm2': 'texts/tm_wotm2.txt',
	   'wotm3': 'texts/tm_wotm3.txt'

    },
    bookDisplayNames: {
        'wotm2': 'Words of the Mother II',
	    'wotm3': 'Words of the Mother III'

    },

    // --- UI Elements ---
    mainTabsDiv: null,
    mainContentAreaDiv: null,
    // Ask Tab UI
    answerAreaP: null,
    citationAreaDiv: null,
    questionControlsDiv: null,
    searchInput: null,
    questionTypeTabsDiv: null,
    questionListScrollAreaDiv: null,
    _boundLaunchReader: null,
    // Definitions Tab UI
    definitionsSearchInput: null,
    definitionsListDiv: null,
    // Chat Tab UI
    chatInterfaceContainer: null, // Container for TheMotherChat module

    // Flag to track if chat module is active for cleanup
    isChatModuleActive: false,


    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccessCallback = successCallback;
        this.onFailureCallback = failureCallback;
        this.sharedDataObject = sharedData;

        console.log("TheMotherGame: Initializing sanctuary.");

        this.qaData = [];
        this.definitionsData = [];
        this.activeMainTab = 'Chat'; // Default main tab
        this.activeQuestionFilter = 'All';
        this.searchTerm = '';
        this.definitionsSearchTerm = '';
        this.currentAnswer = "Blessings"; // Initial state for Ask tab
        this.currentCitation = { text: "", book: null, chapter: null, answerToSearch: null };
        this.isChatModuleActive = false;

        await this.loadQAData();
        await this.loadDefinitionsData();
        this.render();
    },

    loadQAData: async function() {
        try {
            const response = await fetch('js/theMother_qa.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, for js/theMother_qa.json`);
            }
            this.qaData = await response.json();
            console.log("TheMotherGame: Q&A data loaded successfully:", this.qaData.length);
            if (this.qaData.length === 0 && this.activeMainTab === 'Ask') {
                this.currentAnswer = "My thoughts are quiet at the moment. Perhaps stillness is the answer we seek now.";
            }
        } catch (error) {
            console.error("TheMotherGame: Failed to load Q&A data:", error);
            this.qaData = [{
                questions: ["Error: Could not load guidance."],
                answer: "My apologies, my voice is faint. The connection wavers. Please try again later.",
                citation: "[System, Error]"
            }];
            if (this.activeMainTab === 'Ask') {
                this.currentAnswer = "My apologies, my voice is faint. The connection wavers.";
            }
        }
    },

    loadDefinitionsData: async function() {
        try {
            const response = await fetch('js/theMother_definitions.json'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, for js/theMother_definitions.json`);
            }
            this.definitionsData = await response.json();
            console.log("TheMotherGame: Definitions data loaded successfully:", this.definitionsData.length);
        } catch (error) {
            console.error("TheMotherGame: Failed to load definitions data:", error);
            this.definitionsData = [{ term: "Error", definition: "Could not load definitions.", source: "[System, Error]" }];
        }
    },

    render: function() {
        if (!this.gameContainer) {
            console.error("TheMotherGame: Game container not found!");
            if (this.onFailureCallback) this.onFailureCallback({ reason: "Game container not found." });
            return;
        }

        this.gameContainer.style.backgroundColor = this.theme.backgroundColor;
        this.gameContainer.style.color = this.theme.textColor;
        this.gameContainer.style.height = '100%';
        this.gameContainer.style.display = 'flex';
        this.gameContainer.style.flexDirection = 'column';
        this.gameContainer.style.boxSizing = 'border-box';
        this.gameContainer.style.padding = '5px';
        this.gameContainer.style.border = `2px solid ${this.theme.borderColor}`;
        this.gameContainer.style.borderRadius = '10px';

        this.gameContainer.innerHTML = `
            <div id="motherInternalWrapper" style="display: flex; flex-direction: column; height: 100%; background-color: ${this.theme.backgroundColor}; color: ${this.theme.textColor}; border-radius: 8px; overflow: hidden;">
                <div id="motherMainTabs" style="display: flex; background-color: ${this.theme.borderColor}; padding: 3px; border-radius: 6px 6px 0 0;">
                </div>
                <div id="motherMainContentArea" style="flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; background-color: ${this.theme.backgroundColor};">
                </div>
                <button id="leaveSanctuaryButtonGM" style="padding: 10px; font-size: 1em; background-color: ${this.theme.buttonColor}; color: white; border: none; border-radius: 0 0 6px 6px; cursor: pointer; margin-top: auto;">Leave Sanctuary</button>
            </div>
        `;

        this.mainTabsDiv = this.gameContainer.querySelector('#motherMainTabs');
        this.mainContentAreaDiv = this.gameContainer.querySelector('#motherMainContentArea');

        this.renderMainTabs();
        this.renderMainContent();
        this.attachEventListeners();
    },

    renderMainTabs: function() {
        if (!this.mainTabsDiv) return;
        this.mainTabsDiv.innerHTML = '';

        this.mainTabsConfig.forEach(tab => {
            const button = document.createElement('button');
            button.textContent = tab.label;
            button.style.padding = '8px 15px';
            button.style.fontSize = '1em';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.marginRight = '3px';
            button.style.cursor = 'pointer';
            button.style.outline = 'none';
            button.style.transition = 'background-color 0.2s ease, color 0.2s ease';

            if (tab.id === this.activeMainTab) {
                button.style.backgroundColor = this.theme.mainTabActiveBg;
                button.style.color = this.theme.mainTabActiveFg;
                button.style.fontWeight = 'bold';
            } else {
                button.style.backgroundColor = this.theme.mainTabInactiveBg;
                button.style.color = this.theme.mainTabInactiveFg;
                button.style.fontWeight = 'normal';
            }

            button.addEventListener('click', () => {
                // If switching away from Chat tab, destroy the chat module
                if (this.activeMainTab === 'Chat' && tab.id !== 'Chat' && this.isChatModuleActive) {
                    if (typeof TheMotherChat !== 'undefined' && typeof TheMotherChat.destroy === 'function') {
                        TheMotherChat.destroy();
                        this.isChatModuleActive = false;
                        this.chatInterfaceContainer = null; // Clear reference
                        console.log("TheMotherGame: Chat module destroyed due to tab switch.");
                    }
                }
                this.activeMainTab = tab.id;
                this.renderMainTabs();
                this.renderMainContent();
            });
            this.mainTabsDiv.appendChild(button);
        });
    },

    renderMainContent: function() {
        if (!this.mainContentAreaDiv) return;
        this.mainContentAreaDiv.innerHTML = ''; // Clear previous content

        // If chat module was active but we are not rendering it now, ensure it's destroyed
        if (this.activeMainTab !== 'Chat' && this.isChatModuleActive) {
            if (typeof TheMotherChat !== 'undefined' && typeof TheMotherChat.destroy === 'function') {
                TheMotherChat.destroy();
                this.isChatModuleActive = false;
                this.chatInterfaceContainer = null;
                console.log("TheMotherGame: Chat module explicitly destroyed before rendering new tab.");
            }
        }


        if (this.activeMainTab === 'Chat') {
            this.renderChatInterface();
        } else if (this.activeMainTab === 'Ask') {
            this.renderAskInterface();
        } else if (this.activeMainTab === 'Definitions') {
            this.renderDefinitionsInterface();
        }
    },

    renderChatInterface: function() {
        if (!this.mainContentAreaDiv) return;
        
        // Create a dedicated container for the chat module if it doesn't exist
        // This div will be passed to TheMotherChat.init
        this.chatInterfaceContainer = document.createElement('div');
        this.chatInterfaceContainer.id = 'theMotherChatInterfaceContainer';
        this.chatInterfaceContainer.style.width = '100%';
        this.chatInterfaceContainer.style.height = '100%'; // Let chat module control its internal height
        this.chatInterfaceContainer.style.display = 'flex'; // Added for chat module to fill
        this.chatInterfaceContainer.style.flexDirection = 'column'; // Added for chat module
        this.mainContentAreaDiv.appendChild(this.chatInterfaceContainer);

        if (typeof TheMotherChat !== 'undefined' && typeof TheMotherChat.init === 'function') {
            const chatSharedData = {
                qaData: this.qaData,
                definitionsData: this.definitionsData,
                launchBookReader: this.launchBookReader.bind(this), // Bind context
                bookFilePaths: this.bookFilePaths,
                bookDisplayNames: this.bookDisplayNames,
                theme: this.theme // Pass theme for consistency
            };
            TheMotherChat.init(this.chatInterfaceContainer, chatSharedData);
            this.isChatModuleActive = true;
        } else {
            console.error("TheMotherGame: TheMotherChat module is not available or not loaded correctly.");
            this.chatInterfaceContainer.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Chat module could not be loaded.</p>`;
        }
    },

    renderAskInterface: function() {
        if (!this.mainContentAreaDiv) return;
        const askInterfaceHTML = `
            <div id="motherHeaderAsk" style="padding: 5px 0; text-align: center; border-bottom: 1px solid ${this.theme.borderColor}; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 1.5em; color: ${this.theme.textColor};">Ask (Q&A)</h2>
            </div>
            <div id="motherAnswerAreaAsk" style="padding: 10px; text-align: center; flex-grow: 1; overflow-y: auto; font-size: 1.15em; line-height: 1.4; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80px; background-color: #fff; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; margin-bottom:10px;">
                <p style="margin: 0;">${this.currentAnswer}</p>
                <div id="motherCitationAreaAsk" style="font-size: 0.85em; color: ${this.theme.textColor}; margin-top: 10px; cursor: default; text-decoration: none;">
                </div>
            </div>
            <div id="motherQuestionListContainerAsk" style="min-height: 150px; max-height: 300px; padding: 5px; background-color: ${this.theme.questionListBg}; display: flex; flex-direction: column; border: 1px solid ${this.theme.borderColor}; border-radius:4px;">
                <div id="motherQuestionControlsAsk" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; padding: 0 5px;">
                    <h4 style="margin: 0; font-size: 1.0em; color: ${this.theme.textColor};">Select a Question:</h4>
                    <input type="text" id="motherSearchInputAsk" placeholder="Filter questions..." value="${this.searchTerm}" style="padding: 5px 8px; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; font-size: 0.9em; width: 50%; box-sizing: border-box;">
                </div>
                <div id="motherQuestionTypeTabsAsk" style="display: flex; justify-content: start; margin-bottom: 8px; flex-wrap: wrap; gap: 5px; padding: 0 5px; border-bottom: 1px solid ${this.theme.borderColor}; padding-bottom: 5px;">
                </div>
                <div id="motherQuestionScrollAreaAsk" style="flex-grow: 1; overflow-y: auto; padding: 5px; background-color: #fff;">
                </div>
            </div>
        `;
        this.mainContentAreaDiv.innerHTML = askInterfaceHTML;

        this.answerAreaP = this.mainContentAreaDiv.querySelector('#motherAnswerAreaAsk p');
        this.citationAreaDiv = this.mainContentAreaDiv.querySelector('#motherCitationAreaAsk');
        this.questionControlsDiv = this.mainContentAreaDiv.querySelector('#motherQuestionControlsAsk');
        this.searchInput = this.mainContentAreaDiv.querySelector('#motherSearchInputAsk');
        this.questionTypeTabsDiv = this.mainContentAreaDiv.querySelector('#motherQuestionTypeTabsAsk');
        this.questionListScrollAreaDiv = this.mainContentAreaDiv.querySelector('#motherQuestionScrollAreaAsk');

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.populateAskQuestions(this.activeQuestionFilter);
            });
        } else { console.warn("Search input not found in Ask interface"); }
        
        this.updateCitationDisplay();
        this.renderQuestionTypeTabs();
        this.populateAskQuestions(this.activeQuestionFilter);
    },
    
    updateCitationDisplay: function() {
        if (!this.citationAreaDiv) return;
        if (this.currentCitation && this.currentCitation.text && this.currentCitation.book) {
            this.citationAreaDiv.innerHTML = `Source: <span id="citationLink" style="text-decoration:underline; cursor:pointer; color:${this.theme.citationColor};">${this.currentCitation.text}</span>`;
            const citationLinkElement = this.citationAreaDiv.querySelector('#citationLink');
            if (citationLinkElement) {
                if (this._boundLaunchReader) {
                    citationLinkElement.removeEventListener('click', this._boundLaunchReader);
                }
                this._boundLaunchReader = () => this.launchBookReader(
                    this.currentCitation.book,
                    this.currentCitation.chapter,
                    this.currentCitation.answerToSearch
                );
                citationLinkElement.addEventListener('click', this._boundLaunchReader);
                citationLinkElement.addEventListener('mouseover', () => citationLinkElement.style.color = this.theme.citationHoverColor);
                citationLinkElement.addEventListener('mouseout', () => citationLinkElement.style.color = this.theme.citationColor);
            }
        } else if (this.currentCitation && this.currentCitation.text) {
             this.citationAreaDiv.innerHTML = `Source: ${this.currentCitation.text}`;
        } else {
            this.citationAreaDiv.innerHTML = '';
        }
    },

    renderQuestionTypeTabs: function() { 
        if (!this.questionTypeTabsDiv) { return; }
        this.questionTypeTabsDiv.innerHTML = ''; 
        this.questionTabFilters.forEach(tabConfig => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tabConfig.label;
            tabButton.style.padding = '5px 10px'; 
            tabButton.style.cursor = 'pointer';
            tabButton.style.border = `1px solid ${this.theme.borderColor}`;
            tabButton.style.borderRadius = '4px';
            tabButton.style.fontSize = '0.85em';
            tabButton.style.backgroundColor = this.theme.inactiveTabColor;
            tabButton.style.color = this.theme.inactiveTabTextColor;
            tabButton.style.transition = 'background-color 0.2s ease, color 0.2s ease';
            if (this.activeQuestionFilter === tabConfig.filterKey) {
                tabButton.style.backgroundColor = this.theme.activeTabColor;
                tabButton.style.color = this.theme.activeTabTextColor;
                tabButton.style.fontWeight = 'bold';
            }
            tabButton.addEventListener('click', () => {
                this.activeQuestionFilter = tabConfig.filterKey;
                this.searchTerm = ''; 
                if(this.searchInput) this.searchInput.value = '';
                this.renderQuestionTypeTabs(); 
                this.populateAskQuestions(this.activeQuestionFilter); 
            });
            this.questionTypeTabsDiv.appendChild(tabButton);
        });
    },

    populateAskQuestions: function(filterKey = 'All') { 
        if (!this.questionListScrollAreaDiv) { return; }
        this.questionListScrollAreaDiv.innerHTML = ''; 
        let currentFilteredItems = [];
        if (!this.qaData || this.qaData.length === 0) {
            const noQuestionsMessage = document.createElement('div'); 
            noQuestionsMessage.textContent = "No guiding words available at this moment.";
            noQuestionsMessage.style.padding = "10px";
            noQuestionsMessage.style.textAlign = "center";
            this.questionListScrollAreaDiv.appendChild(noQuestionsMessage); return;
        }
        const validQaData = this.qaData.filter(item => item.questions && item.questions.length > 0);
        if (filterKey === 'All') { currentFilteredItems = [...validQaData]; } 
        else {
            const lowerFilterKey = filterKey.toLowerCase();
            currentFilteredItems = validQaData.filter(item => item.questions[0].toLowerCase().startsWith(lowerFilterKey));
        }
        if (this.searchTerm.trim() !== '') {
            const lowerSearchTerm = this.searchTerm.toLowerCase().trim();
            currentFilteredItems = currentFilteredItems.filter(item =>
                item.questions[0].toLowerCase().includes(lowerSearchTerm) || 
                (item.answer && item.answer.toLowerCase().includes(lowerSearchTerm))
            );
        }
        currentFilteredItems.sort((a, b) => a.questions[0].toLowerCase().localeCompare(b.questions[0].toLowerCase()));
        if (currentFilteredItems.length === 0) {
            const noMatchMessage = document.createElement('div'); 
            let messageText = `No questions found`;
            if (filterKey !== 'All') messageText += ` under "${filterKey}"`;
            if (this.searchTerm.trim() !== '') messageText += ` matching "${this.searchTerm.trim()}"`;
            messageText += `.`;
            noMatchMessage.textContent = messageText;
            noMatchMessage.style.padding = "10px";
            noMatchMessage.style.textAlign = "center";
            this.questionListScrollAreaDiv.appendChild(noMatchMessage); return;
        }
        currentFilteredItems.forEach((qaItem) => {
            const displayQuestionText = qaItem.questions[0]; 
            const questionElement = document.createElement('div');
            questionElement.textContent = displayQuestionText;
            questionElement.style.padding = '8px 6px'; 
            questionElement.style.cursor = 'pointer';
            questionElement.style.borderBottom = `1px dotted ${this.theme.borderColor}`; 
            questionElement.style.color = this.theme.textColor;
            questionElement.style.fontSize = '0.95em';
            questionElement.style.transition = 'background-color 0.2s ease';
            questionElement.addEventListener('mouseover', () => { questionElement.style.backgroundColor = this.theme.questionHoverBg; });
            questionElement.addEventListener('mouseout', () => { questionElement.style.backgroundColor = 'transparent'; });
            questionElement.addEventListener('click', () => this.handleQuestionClick(qaItem));
            this.questionListScrollAreaDiv.appendChild(questionElement);
        });
        if (this.questionListScrollAreaDiv.lastChild && this.questionListScrollAreaDiv.lastChild.style) {
           this.questionListScrollAreaDiv.lastChild.style.borderBottom = 'none';
        }
    },
    
    renderDefinitionsInterface: function() {
        if (!this.mainContentAreaDiv) return;

        let definitionsHTML = `
            <div id="motherDefsContainer" style="width:100%; color: ${this.theme.textColor};">
                <div id="motherDefsHeader" style="padding: 5px 0; text-align: center; border-bottom: 1px solid ${this.theme.borderColor}; margin-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 1.5em;">Definitions</h2>
                </div>
                <div id="motherDefsControls" style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px; padding: 0 5px;">
                    <input type="text" id="motherSearchDefsInput" placeholder="Search terms or definitions..." value="${this.definitionsSearchTerm}" style="padding: 5px 8px; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; font-size: 0.9em; width: 50%; box-sizing: border-box;">
                </div>
                <div id="motherDefinitionsListArea" style="overflow-y: auto; max-height: calc(100vh - 280px); background-color: #fff; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; padding: 10px;">
                </div>
            </div>
        `;
        this.mainContentAreaDiv.innerHTML = definitionsHTML;

        this.definitionsSearchInput = this.mainContentAreaDiv.querySelector('#motherSearchDefsInput');
        this.definitionsListDiv = this.mainContentAreaDiv.querySelector('#motherDefinitionsListArea');

        if (this.definitionsSearchInput) {
            this.definitionsSearchInput.addEventListener('input', (e) => {
                this.definitionsSearchTerm = e.target.value;
                this.populateDefinitions();
            });
        }
        this.populateDefinitions();
    },

    populateDefinitions: function() {
        if (!this.definitionsListDiv) return;
        this.definitionsListDiv.innerHTML = '';

        let filteredDefs = this.definitionsData;
        if (this.definitionsSearchTerm.trim() !== '') {
            const lowerSearch = this.definitionsSearchTerm.toLowerCase().trim();
            filteredDefs = (this.definitionsData || []).filter(def => 
                def.term.toLowerCase().includes(lowerSearch) || 
                def.definition.toLowerCase().includes(lowerSearch)
            );
        }

        filteredDefs.sort((a,b) => a.term.localeCompare(b.term));

        if (filteredDefs.length === 0) {
            this.definitionsListDiv.innerHTML = `<p style="text-align:center; padding:10px;">${this.definitionsSearchTerm.trim() !== '' ? 'No definitions match your search.' : 'No definitions loaded or available.'}</p>`;
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const thTerm = document.createElement('th');
        thTerm.textContent = 'Term';
        thTerm.style.textAlign = 'left';
        thTerm.style.padding = '8px';
        thTerm.style.borderBottom = `2px solid ${this.theme.borderColor}`;
        thTerm.style.width = '30%';
        const thDef = document.createElement('th');
        thDef.textContent = 'Definition';
        thDef.style.textAlign = 'left';
        thDef.style.padding = '8px';
        thDef.style.borderBottom = `2px solid ${this.theme.borderColor}`;
        headerRow.appendChild(thTerm);
        headerRow.appendChild(thDef);

        const tbody = table.createTBody();
        filteredDefs.forEach(def => {
            const row = tbody.insertRow();
            row.style.borderBottom = `1px dotted ${this.theme.borderColor}`;
            
            const cellTerm = row.insertCell();
            cellTerm.textContent = def.term;
            cellTerm.style.padding = '8px';
            cellTerm.style.fontWeight = 'bold';
            cellTerm.style.verticalAlign = 'top';
           
            const cellDef = row.insertCell();
            cellDef.style.padding = '8px';
            cellDef.style.verticalAlign = 'top';
            
            const defTextNode = document.createTextNode(def.definition);
            cellDef.appendChild(defTextNode);
            
            if (def.source) {
                const citationMatch = def.source.match(/^\[([^,]+),\s*(.+)\]$/);
                if (citationMatch) {
                    const bookAbbr = citationMatch[1].trim();
                    const chapterName = citationMatch[2].trim();
                    const bookDisplayName = this.bookDisplayNames[bookAbbr] || bookAbbr;

                    cellDef.appendChild(document.createElement('br')); 
                    const sourceLink = document.createElement('span');
                    sourceLink.textContent = `(Source: ${bookDisplayName}, ${chapterName})`;
                    sourceLink.style.fontSize = '0.9em';
                    sourceLink.style.fontStyle = 'italic';
                    sourceLink.style.color = this.theme.citationColor;
                    sourceLink.style.textDecoration = 'underline';
                    sourceLink.style.cursor = 'pointer';
                    
                    sourceLink.addEventListener('click', () => {
                        this.launchBookReader(bookAbbr, chapterName, def.term); 
                    });
                    sourceLink.addEventListener('mouseover', () => sourceLink.style.color = this.theme.citationHoverColor);
                    sourceLink.addEventListener('mouseout', () => sourceLink.style.color = this.theme.citationColor);
                    cellDef.appendChild(sourceLink);
                } else { 
                    cellDef.appendChild(document.createElement('br'));
                    const sourceSpan = document.createElement('span');
                    sourceSpan.textContent = ` (${def.source})`;
                    sourceSpan.style.fontSize = '0.9em';
                    sourceSpan.style.fontStyle = 'italic';
                    sourceSpan.style.color = this.theme.textColor; 
                    cellDef.appendChild(sourceSpan);
                }
            }
        });
        if (tbody.lastChild) {
             tbody.lastChild.style.borderBottom = 'none';
        }
        this.definitionsListDiv.appendChild(table);
    },

    handleQuestionClick: function(qaItem) {
        const answerText = qaItem.answer;
        this.currentAnswer = answerText;
        this.currentCitation = { text: "", book: null, chapter: null, answerToSearch: null };
        if (qaItem.citation) {
            const citationMatch = qaItem.citation.match(/^\[([^,]+),\s*(.+)\]$/);
            if (citationMatch) {
                const bookAbbr = citationMatch[1].trim();
                const chapterName = citationMatch[2].trim();
                const bookDisplayName = this.bookDisplayNames[bookAbbr] || bookAbbr;
                this.currentCitation.text = `${bookDisplayName}, ${chapterName}`;
                this.currentCitation.book = bookAbbr;
                this.currentCitation.chapter = chapterName;
                this.currentCitation.answerToSearch = qaItem.answer; 
            } else {
                this.currentCitation.text = qaItem.citation;
            }
        }
        // No need to switch main tab if already on Ask, just update content
        if (this.activeMainTab === 'Ask') {
            if (this.answerAreaP) this.answerAreaP.textContent = this.currentAnswer;
            this.updateCitationDisplay();
        } else {
            // If on another tab (e.g. Definitions) and a Q&A item was somehow triggered
            // (perhaps by future cross-tab linking), switch to Ask tab.
            this.activeMainTab = 'Ask';
            this.renderMainTabs(); 
            this.renderMainContent(); // This will call renderAskInterface
        }
    },

    launchBookReader: function(bookAbbr, chapterName, answerTextToFind) {
        console.log(`TheMotherGame: Launching reader for book: ${bookAbbr}, chapter: ${chapterName}, searching for: ${answerTextToFind ? "'" + String(answerTextToFind).substring(0,30) + "...'" : "N/A"}`);
        const filePath = this.bookFilePaths[bookAbbr];
        if (!filePath) {
            console.error(`TheMotherGame: File path for book "${bookAbbr}" not found.`);
            if (this.activeMainTab === 'Ask' && this.answerAreaP) { // Only update Ask tab's display
                this.answerAreaP.textContent = `Sorry, I could not locate the source text for "${this.bookDisplayNames[bookAbbr] || bookAbbr}".`;
                this.currentCitation = { text: "", book: null, chapter: null, answerToSearch: null };
                this.updateCitationDisplay();
            }
            return;
        }
        const bookReaderHost = document.getElementById('bookReaderHost'); 
        if (!bookReaderHost) {
            console.error("TheMotherGame: Book reader host element ('bookReaderHost') not found in the DOM.");
            return;
        }
        if (typeof BookReaderGame === 'undefined' || typeof BookReaderGame.init !== 'function') {
            console.error("TheMotherGame: BookReaderGame is not available or not properly loaded.");
            if (this.activeMainTab === 'Ask' && this.answerAreaP) {
                this.answerAreaP.textContent = "The book reader module seems to be unavailable at the moment.";
                this.currentCitation = { text: "", book: null, chapter: null, answerToSearch: null };
                this.updateCitationDisplay();
            }
            return;
        }
        BookReaderGame.init(
            bookReaderHost, 
            filePath, 
            () => { 
                console.log("BookReaderGame has been closed.");
            },
            chapterName,      
            null,             
            answerTextToFind  
        );
    },
    
    attachEventListeners: function() {
        const leaveButton = this.gameContainer.querySelector('#leaveSanctuaryButtonGM');
        if (leaveButton) {
            leaveButton.addEventListener('mouseover', () => leaveButton.style.backgroundColor = this.theme.buttonHoverColor);
            leaveButton.addEventListener('mouseout', () => leaveButton.style.backgroundColor = this.theme.buttonColor);
            leaveButton.addEventListener('click', () => this.handleCompletion());
        } else {
            console.error("TheMotherGame: 'leaveSanctuaryButtonGM' not found after render.");
        }
    },

    handleCompletion: function() {
        console.log("TheMotherGame: Leaving sanctuary.");
        const updatedSharedData = {
            ...this.sharedDataObject,
            motherVisited: true,
            lastGame: this.id,
            motherLastInteraction: (this.activeMainTab === 'Ask' ? this.currentAnswer : "Viewed Definitions/Chat") // More generic if not on Ask tab
        };
        if (this.onSuccessCallback) {
            this.onSuccessCallback(updatedSharedData);
        }
    },

    destroy: function() {
        console.log("TheMotherGame: Destroying sanctuary...");
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        // Ensure chat module is destroyed if it was active
        if (this.isChatModuleActive && typeof TheMotherChat !== 'undefined' && typeof TheMotherChat.destroy === 'function') {
            TheMotherChat.destroy();
            this.isChatModuleActive = false;
        }
        if (this.citationAreaDiv && this._boundLaunchReader) { // From Ask tab
            const citationLinkElement = this.citationAreaDiv.querySelector('#citationLink');
            if (citationLinkElement) {
                citationLinkElement.removeEventListener('click', this._boundLaunchReader);
            }
        }
        this._boundLaunchReader = null;

        this.gameContainer = null;
        this.onSuccessCallback = null;
        this.onFailureCallback = null;
        this.sharedDataObject = null;
        this.qaData = [];
        this.definitionsData = [];
        this.currentAnswer = "";
        this.currentCitation = { text: "", book: null, chapter: null, answerToSearch: null };
        this.activeQuestionFilter = 'All';
        this.searchTerm = '';
        this.definitionsSearchTerm = '';
        this.activeMainTab = 'Chat'; // Reset to default

        this.mainTabsDiv = null;
        this.mainContentAreaDiv = null;
        this.answerAreaP = null;
        this.citationAreaDiv = null;
        this.questionControlsDiv = null;
        this.searchInput = null; 
        this.questionTypeTabsDiv = null;
        this.questionListScrollAreaDiv = null;
        this.definitionsSearchInput = null;
        this.definitionsListDiv = null;
        this.chatInterfaceContainer = null;
    }
};

