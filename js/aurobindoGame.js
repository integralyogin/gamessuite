// js/aurobindoGame.js

const AurobindoGame = {
    id: 'AurobindoGame',
    name: "Sri Aurobindo - Insights",
    theme: {
        backgroundColor: '#e0f2f1', 
        textColor: '#004d40',           
        buttonColor: '#00796b',       
        buttonHoverColor: '#00897b',
        borderColor: '#4db6ac',      
        questionListBg: '#b2dfdb', 
        questionHoverBg: '#80cbc4', 
        activeTabColor: '#00796b',
        activeTabTextColor: '#ffffff',
        inactiveTabColor: '#80cbc4',
        inactiveTabTextColor: '#004d40',
        mainTabActiveBg: '#00695c', 
        mainTabActiveFg: '#ffffff',
        mainTabInactiveBg: '#00897b', 
        mainTabInactiveFg: '#e0f2f1',
        citationColor: '#004d40', 
        citationHoverColor: '#00695c',
        chatExplorerContainerBackgroundColor: '#e0f2f1', 
        userMessageBg: '#e0f7fa',
        motherMessageBg: '#fff9c4',
        definedTermColor: '#00695c',
        tooltipBg: '#333333',
        tooltipColor: '#ffffff',
        suggestionBg: '#f5f5f5',
        suggestionHoverBg: '#e8e8e8',
        suggestionBorder: '#dddddd',
    },

    // --- Game State ---
    gameContainer: null,
    onSuccessCallback: null,
    onFailureCallback: null,
    sharedDataObject: null,
    definitionsData: [],
    qaData: [], 

    definitionsSearchTerm: '', 

    activeMainTab: 'Definitions', 
    mainTabsConfig: [
        { id: 'Definitions', label: 'Definitions' },
        { id: 'AuroViewChat', label: 'Term Explorer' }
    ],
    chatExplorerActive: false,

    bookFilePaths: { 
	'EDAH': 'texts/sa12.EDAH.txt',
	 'EIPAY': 'texts/sa13.EIPAY.txt',
        'ISHA': 'texts/sa17.ISHA.txt',
	    'EOTG': 'texts/sa19.EOTG.txt',
        'TLD': 'texts/sa21.TLD.txt',
        'TSOY': 'texts/sa23.TSOY.txt',
        'THC': 'texts/sa25.THC.txt',
        'LOY1': 'texts/sa28.LOY1.txt',
        'LOY2': 'texts/sa29.LOY2.txt',
        'LOY3': 'texts/sa30.LOY3.txt',
        'SAV': 'texts/sa31.Savitri.txt',
        'TMWLOTM': 'texts/sa32.TMWLOTM.txt',
        'LOHATA': 'texts/sa35.LOHATA.txt',
        'WOTM2': 'texts/tm_wotm2.txt',
        'WOTM3': 'texts/tm_wotm3.txt'
    },
    bookDisplayNames: {
	    'EDAH': 'Essays Divine and Human',
	    'EIPAY': 'Essays in Philosophy and Yoga',
	    'EOTG': 'Essays on the Gita',
	   'ISHA': 'Isha Upanishad',
        'TLD': 'The Life Divine', 
        'THC': 'The Human Cycle',
        'TSOY': 'The Synthesis of Yoga',
        'LOY1': 'Letters on Yoga I',
        'LOY2': 'Letters on Yoga II',
        'LOY3': 'Letters on Yoga III',
        'SAV': 'Savitri',
        'TMWLOTM': 'The Mother with Letters on The Mother',
	    'LOHATA': 'Letters on Himself and the Ashram',
        'WOTM2': 'Words of the Mother II',
        'WOTM3': 'Words of the Mother III'
    },

    // --- UI Elements ---
    mainTabsDiv: null,
    definitionsSearchInput: null,
    definitionsListDiv: null,
    // NEW: References to content containers for each tab
    contentHost: null,
    definitionsContent: null,
    auroViewContent: null,


    init: async function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccessCallback = successCallback;
        this.onFailureCallback = failureCallback;
        this.sharedDataObject = sharedData;

        console.log("AurobindoGame: Initializing.");

        this.definitionsData = [];
        this.qaData = [];
        this.activeMainTab = 'Definitions'; 
        this.definitionsSearchTerm = '';
        this.chatExplorerActive = false;

        await this.loadDefinitionsData();
        await this.loadQaData();
        this.render();
    },

    loadDefinitionsData: async function() {
        try {
            const response = await fetch('js/aurobindo_definitions.json'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, for js/aurobindo_definitions.json`);
            }
            this.definitionsData = await response.json();
            console.log("AurobindoGame: Definitions data loaded successfully:", this.definitionsData.length);
        } catch (error) {
            console.error("AurobindoGame: Failed to load definitions data:", error);
            this.definitionsData = [{ term: "Error", definition: "Could not load definitions from aurobindo_definitions.json. Please check file path and format.", source: "[System, Error]" }];
        }
    },
    
    loadQaData: async function() {
        try {
            const response = await fetch('js/aurobindo_qa.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for js/aurobindo_qa.json`);
            }
            this.qaData = await response.json();
            console.log("AurobindoGame: Q&A data loaded successfully:", this.qaData.length);
        } catch (error) {
            console.error("AurobindoGame: Failed to load Q&A data:", error);
            this.qaData = []; 
        }
    },

    render: function() {
        if (!this.gameContainer) {
            console.error("AurobindoGame: Game container not found!");
            if (this.onFailureCallback) this.onFailureCallback({ reason: "Game container not found." });
            return;
        }

        Object.assign(this.gameContainer.style, {
            backgroundColor: this.theme.backgroundColor, color: this.theme.textColor,
            height: '100%', display: 'flex', flexDirection: 'column',
            boxSizing: 'border-box', padding: '5px',
            border: `2px solid ${this.theme.borderColor}`, borderRadius: '10px'
        });
        
        // MODIFIED: Added separate containers for each tab's content.
        this.gameContainer.innerHTML = `
            <div id="ag_internalWrapper" style="display: flex; flex-direction: column; height: 100%; background-color: ${this.theme.backgroundColor}; color: ${this.theme.textColor}; border-radius: 8px; overflow: hidden;">
                <div id="ag_headerBar" style="display: flex; justify-content: space-between; align-items: center; background-color: ${this.theme.borderColor}; padding: 3px; border-radius: 6px 6px 0 0; flex-shrink: 0;">
                    <div id="ag_mainTabs" style="display: flex;"></div>
                    <button id="ag_leaveButton" style="padding: 8px 12px; font-size: 1em; background-color: ${this.theme.buttonColor}; color: white; border: none; border-radius: 4px; cursor: pointer;">Leave Presence</button>
                </div>
                <div id="ag_contentHost" style="flex-grow: 1; overflow-y: auto; background-color: ${this.theme.backgroundColor}; display: flex; flex-direction: column; position: relative;">
                    <div id="ag_definitionsContent" style="height: 100%; width: 100%; position: absolute;"></div>
                    <div id="ag_auroViewContent" style="height: 100%; width: 100%; position: absolute; display: none;"></div>
                </div>
            </div>
        `;

        this.mainTabsDiv = this.gameContainer.querySelector('#ag_mainTabs');
        // NEW: Cache the content containers
        this.contentHost = this.gameContainer.querySelector('#ag_contentHost');
        this.definitionsContent = this.gameContainer.querySelector('#ag_definitionsContent');
        this.auroViewContent = this.gameContainer.querySelector('#ag_auroViewContent');

        this.renderMainTabs();
        this.renderAllContentOnce(); // MODIFIED: Call the new function to initialize content
        this.attachEventListeners();
    },

    // NEW: This function initializes all tab content once, preventing re-renders.
    renderAllContentOnce: function() {
        // Render Definitions Tab
        this.renderDefinitionsInterface(this.definitionsContent);

        // Render Term Explorer Tab
        if (typeof AuroView !== 'undefined' && typeof AuroView.init === 'function') {
            AuroView.init(
                this.auroViewContent, 
                this.definitionsData, 
                this.qaData,
                this.theme, 
                this.launchBookReader.bind(this),
                this.bookFilePaths,
                this.bookDisplayNames
            ); 
            this.chatExplorerActive = true;
        } else {
            this.auroViewContent.innerHTML = `<p style="color:red; text-align:center;">Error: The Term Explorer module is unavailable.</p>`;
        }
    },


    renderMainTabs: function() {
        if (!this.mainTabsDiv) return;
        this.mainTabsDiv.innerHTML = '';

        this.mainTabsConfig.forEach(tabConfig => {
            const button = document.createElement('button');
            button.textContent = tabConfig.label;
            button.dataset.tabId = tabConfig.id;
            Object.assign(button.style, {
                padding: '8px 12px', fontSize: '1em', border: 'none',
                borderRadius: '4px', marginRight: '3px', cursor: 'pointer',
                outline: 'none', transition: 'background-color 0.2s ease, color 0.2s ease'
            });

            if (tabConfig.id === this.activeMainTab) {
                button.style.backgroundColor = this.theme.mainTabActiveBg;
                button.style.color = this.theme.mainTabActiveFg;
                button.style.fontWeight = 'bold';
            } else { 
                button.style.backgroundColor = this.theme.mainTabInactiveBg;
                button.style.color = this.theme.mainTabInactiveFg;
                button.style.fontWeight = 'normal';
            }
            button.addEventListener('click', (e) => this.handleTabClick(e.target.dataset.tabId));
            this.mainTabsDiv.appendChild(button);
        });
    },

    // MODIFIED: This function no longer re-renders content, it just toggles visibility.
    handleTabClick: function(tabId) {
        if (this.activeMainTab === tabId) return; 

        this.activeMainTab = tabId;
        console.log(`AurobindoGame: Switched to tab: ${tabId}`);
        this.renderMainTabs();
        
        if (tabId === 'Definitions') {
            this.definitionsContent.style.display = 'block';
            this.auroViewContent.style.display = 'none';
        } else if (tabId === 'AuroViewChat') {
            this.definitionsContent.style.display = 'none';
            this.auroViewContent.style.display = 'block';
        }
    },

    // This function is no longer needed as content is rendered once.
    // renderMainContent: function() { ... }

    renderDefinitionsInterface: function(container) {
        if (!container) return;
        
        container.style.padding = '10px';
        container.style.boxSizing = 'border-box';

        const definitionsHTML = `
            <div id="ag_defsContainer" style="width:100%; height: 100%; color: ${this.theme.textColor}; display: flex; flex-direction: column;">
                <div id="ag_defsHeader" style="padding: 5px 0; text-align: center; border-bottom: 1px solid ${this.theme.borderColor}; margin-bottom: 10px; flex-shrink: 0;">
                    <h2 style="margin: 0; font-size: 1.5em;">Definitions</h2>
                </div>
                <div id="ag_defsControls" style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px; padding: 0 5px; flex-shrink: 0;">
                    <input type="text" id="ag_searchDefsInput" placeholder="Search terms or definitions..." value="${this.definitionsSearchTerm}" style="padding: 5px 8px; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; font-size: 0.9em; width: 50%; box-sizing: border-box;">
                </div>
                <div id="ag_definitionsListArea" style="overflow-y: auto; flex-grow: 1; background-color: #fff; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; padding: 10px;">
                </div>
            </div>
        `;
        container.innerHTML = definitionsHTML;

        this.definitionsSearchInput = container.querySelector('#ag_searchDefsInput');
        this.definitionsListDiv = container.querySelector('#ag_definitionsListArea');

        if (this.definitionsSearchInput) {
            this.definitionsSearchInput.addEventListener('input', (e) => {
                this.definitionsSearchTerm = e.target.value;
                this.populateDefinitions();
            });
        }
        this.populateDefinitions();
    },

    populateDefinitions: function() {
        // ... (This function remains unchanged)
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
        if (!filteredDefs || filteredDefs.length === 0) {
            this.definitionsListDiv.innerHTML = `<p style="text-align:center; padding:10px;">No definitions match your search.</p>`;
            return;
        }
        filteredDefs.sort((a,b) => a.term.localeCompare(b.term));
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headerRow.innerHTML = `<th style="text-align: left; padding: 8px; border-bottom: 2px solid ${this.theme.borderColor}; width: 30%;">Term</th><th style="text-align: left; padding: 8px; border-bottom: 2px solid ${this.theme.borderColor};">Definition</th>`;
        const tbody = table.createTBody();
        filteredDefs.forEach(def => {
            const row = tbody.insertRow();
            row.style.borderBottom = `1px dotted ${this.theme.borderColor}`;
            const cellTerm = row.insertCell();
            cellTerm.textContent = def.term;
            Object.assign(cellTerm.style, {padding: '8px', fontWeight: 'bold', verticalAlign: 'top'});
            const cellDef = row.insertCell();
            cellDef.style.padding = '8px';
            cellDef.style.verticalAlign = 'top';
            cellDef.appendChild(document.createTextNode(def.definition));
            if (def.source) {
                const citationMatch = def.source.match(/^\[([^,]+),\s*(.+)\]$/);
                if (citationMatch) {
                    const bookAbbr = citationMatch[1].trim();
                    const chapterName = citationMatch[2].trim();
                    const bookDisplayName = this.bookDisplayNames[bookAbbr] || bookAbbr;
                    cellDef.appendChild(document.createElement('br')); 
                    const sourceLink = document.createElement('span');
                    sourceLink.textContent = `(Source: ${bookDisplayName}, ${chapterName})`;
                    Object.assign(sourceLink.style, { fontSize: '0.9em', fontStyle: 'italic', color: this.theme.citationColor, textDecoration: 'underline', cursor: 'pointer' });
                    sourceLink.addEventListener('click', () => {
                        const filePath = this.bookFilePaths[bookAbbr];
                        if(filePath) { this.launchBookReader(filePath, chapterName, def.definition); } 
                        else { this.showGameAlert(`Could not find the text file for abbreviation: ${bookAbbr}`); }
                    });
                    sourceLink.addEventListener('mouseover', () => sourceLink.style.color = this.theme.citationHoverColor);
                    sourceLink.addEventListener('mouseout', () => sourceLink.style.color = this.theme.citationColor);
                    cellDef.appendChild(sourceLink);
                } else { 
                    cellDef.appendChild(document.createElement('br'));
                    const sourceSpan = document.createElement('span');
                    sourceSpan.textContent = ` (${def.source})`; 
                    Object.assign(sourceSpan.style, {fontSize: '0.9em', fontStyle: 'italic', color: this.theme.textColor});
                    cellDef.appendChild(sourceSpan);
                }
            }
        });
        this.definitionsListDiv.appendChild(table);
    },

    // MODIFIED: This function no longer destroys anything. It just hides the main view
    // and relies on the callback to un-hide it.
    launchBookReader: function(filePath, chapterName, stringToSearchInBook) { 
        console.log(`AurobindoGame: Launching reader for file: ${filePath}, chapter: ${chapterName}`);
        
        if (!filePath) {
            this.showGameAlert(`Error: Could not find the source text file.`);
            return;
        }
        
        const bookReaderHost = document.getElementById('bookReaderHost'); 
        if (!bookReaderHost) {
            this.showGameAlert("Book reader cannot be opened. Host element missing."); 
            return;
        }
        if (typeof BookReaderGame === 'undefined' || typeof BookReaderGame.init !== 'function') {
            this.showGameAlert("The book reader module is currently unavailable."); 
            return;
        }

        // Hide the main game container. Its state will be preserved.
        if (this.gameContainer) this.gameContainer.style.display = 'none';

        BookReaderGame.init(
            bookReaderHost, 
            filePath, 
            () => { // This is the 'on close' callback
                console.log("AurobindoGame: BookReaderGame has been closed. Restoring view.");
                // Simply show the main container again. Do not re-render.
                if (this.gameContainer) {
                    this.gameContainer.style.display = 'flex'; 
                }
                 if (bookReaderHost) {
                    bookReaderHost.innerHTML = '';
                    bookReaderHost.style.display = 'none';
                }
            },
            chapterName,
            stringToSearchInBook 
        );
    },

    showGameAlert: function(message) {
        console.warn("AurobindoGame Alert:", message);
        alert(message); 
    },
    
    attachEventListeners: function() {
        const leaveButton = this.gameContainer.querySelector('#ag_leaveButton');
        if (leaveButton) {
            leaveButton.addEventListener('mouseover', () => leaveButton.style.backgroundColor = this.theme.buttonHoverColor);
            leaveButton.addEventListener('mouseout', () => leaveButton.style.backgroundColor = this.theme.buttonColor);
            leaveButton.addEventListener('click', () => this.handleCompletion());
        } else {
            console.error("AurobindoGame: '#ag_leaveButton' not found after render.");
        }
    },

    handleCompletion: function() {
        console.log("AurobindoGame: Leaving presence.");
        if (this.onSuccessCallback) {
            this.onSuccessCallback(this.sharedDataObject);
        }
        this.destroy(); 
    },

    destroy: function() {
        console.log("AurobindoGame: Destroying...");

        // Also destroy AuroView explicitly if it's active.
        if (this.chatExplorerActive && typeof AuroView !== 'undefined' && typeof AuroView.destroy === 'function') {
            AuroView.destroy();
        }
        
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
        }
        
        // Reset properties
        Object.assign(this, {
            gameContainer: null, onSuccessCallback: null, onFailureCallback: null,
            sharedDataObject: null, definitionsData: [], qaData: [],
            definitionsSearchTerm: '', activeMainTab: 'Definitions', chatExplorerActive: false,
            mainTabsDiv: null, definitionsSearchInput: null, definitionsListDiv: null,
            contentHost: null, definitionsContent: null, auroViewContent: null
        });
        
        console.log("AurobindoGame: Destroyed fully.");
    }
};

