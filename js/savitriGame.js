// js/savitriGame.js
// Based on aurobindoGame.js - V11 with sanitised quote linking

const savitriGame = {
    id: 'savitriGame',
    name: "Savitri - A Legend and a Symbol",
    theme: {
        backgroundColor: '#fde0e0', // Light Pink/Rose
        textColor: '#5c2c2c',      // Dark Maroon
        buttonColor: '#c86464',       // Muted Red
        buttonHoverColor: '#d27878',   // Lighter Red
        borderColor: '#e6a4a4',       // Soft Red
        activeTabColor: '#c86464',
        activeTabTextColor: '#ffffff',
        inactiveTabColor: '#e6a4a4',
        inactiveTabTextColor: '#5c2c2c',
        mainTabActiveBg: '#b25050',
        mainTabActiveFg: '#ffffff',
        mainTabInactiveBg: '#c86464',
        mainTabInactiveFg: '#fde0e0',
        citationColor: '#8f4646',
        citationHoverColor: '#a95c5c',
    },

    // --- Game State ---
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    activeMainTab: 'Book',
    mainTabsConfig: [
        { id: 'Book', label: 'The Book' },
        { id: 'Remedies', label: 'Maladies & Remedies' },
    ],

    savitriFilePath: 'texts/sa31.Savitri.txt',
    remediesFilePath: 'savitri_maladies_and_remedies.json',
    tocData: [], 
    remediesData: [],
    remediesSearchTerm: '', // For filtering
    remediesSortOrder: 'asc', // 'asc' or 'desc' for sorting by malady name

    // --- UI Elements ---
    mainTabsDiv: null,
    mainContentAreaDiv: null,

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log(`savitriGame: Initializing.`);
        this.activeMainTab = 'Book';
        this.remediesSearchTerm = '';
        this.remediesSortOrder = 'asc'; // Reset sort order on init
        
        await this.generateToc();
        await this.loadRemediesData();
        this.render();
    },

    generateToc: async function() {
        try {
            const response = await fetch(this.savitriFilePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const text = await response.text();
            const lines = text.split(/\r?\n/);
            this.tocData = []; 
            let currentPart = null, currentBook = null, currentCanto = null;
            const partRegex = /^Part\s+([IVXLCDM\d]+)\s*-\s*(.*)/i;
            const bookRegex = /^Canto\s+Book\d+\s*-\s*\d+:\s*(.*)/i;
            const cantoRegex = /^Canto\s+\d+\s*-\s*\d+\.\d+:\s*(.*)/i;
            const sectionRegex = /^Section\s+\w+\s*-\s*(.*)/i;

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine === '') return;
                let match;
                if ((match = trimmedLine.match(partRegex))) {
                    currentPart = { type: 'Part', title: `Part ${match[1].trim()}`, description: match[2].trim(), books: [] };
                    this.tocData.push(currentPart);
                    currentBook = null; currentCanto = null;
                } else if ((match = trimmedLine.match(bookRegex))) {
                    if (!currentPart) currentPart = { type: 'Part', title: 'Unknown Part', description: '', books: [] };
                    currentBook = { type: 'Book', title: match[1].trim(), cantos: [] };
                    currentPart.books.push(currentBook);
                    currentCanto = null;
                } else if ((match = trimmedLine.match(cantoRegex))) {
                    if (!currentBook) currentBook = { type: 'Book', title: 'Unknown Book', cantos: [] };
                    currentCanto = { type: 'Canto', title: match[1].trim(), sections: [] };
                    currentBook.cantos.push(currentCanto);
                } else if ((match = trimmedLine.match(sectionRegex))) {
                    if (currentCanto) {
                        const address = match[1].trim();
                        currentCanto.sections.push({ type: 'Section', title: address, address: address });
                    }
                }
            });
        } catch (error) {
            console.error("savitriGame: Failed to generate ToC:", error);
            this.tocData = [];
        }
    },
    
    loadRemediesData: async function() {
        try {
            const response = await fetch(this.remediesFilePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.remediesData = await response.json();
        } catch (error) {
            console.error("savitriGame: Failed to load remedies data:", error);
            this.remediesData = [];
        }
    },

    render: function() {
        if (!this.container) return;
        Object.assign(this.container.style, {
            backgroundColor: this.theme.backgroundColor, color: this.theme.textColor, height: '100%',
            display: 'flex', flexDirection: 'column', boxSizing: 'border-box', padding: '5px',
            border: `2px solid ${this.theme.borderColor}`, borderRadius: '10px'
        });
        this.container.innerHTML = `
            <div id="sg_internalWrapper" style="display: flex; flex-direction: column; height: 100%; background-color: ${this.theme.backgroundColor}; color: ${this.theme.textColor}; border-radius: 8px; overflow: hidden;">
                <div id="sg_mainTabs" style="display: flex; background-color: ${this.theme.borderColor}; padding: 3px; border-radius: 6px 6px 0 0; flex-shrink: 0;"></div>
                <div id="sg_mainContentArea" style="flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; background-color: ${this.theme.backgroundColor};"></div>
                <button id="sg_leaveButton" style="padding: 10px; font-size: 1em; background-color: ${this.theme.buttonColor}; color: white; border: none; border-radius: 0 0 6px 6px; cursor: pointer; margin-top: auto; flex-shrink: 0;">Leave Presence</button>
            </div>`;
        this.mainTabsDiv = this.container.querySelector('#sg_mainTabs');
        this.mainContentAreaDiv = this.container.querySelector('#sg_mainContentArea');
        this.renderMainTabs();
        this.renderMainContent();
        this.attachEventListeners();
    },

    renderMainTabs: function() {
        if (!this.mainTabsDiv) return;
        this.mainTabsDiv.innerHTML = '';
        this.mainTabsConfig.forEach(tabConfig => {
            const button = document.createElement('button');
            button.textContent = tabConfig.label;
            button.dataset.tabId = tabConfig.id;
            Object.assign(button.style, { padding: '8px 12px', fontSize: '1em', border: 'none', borderRadius: '4px', marginRight: '3px', cursor: 'pointer', outline: 'none', transition: 'background-color 0.2s ease, color 0.2s ease' });
            if (tabConfig.id === this.activeMainTab) {
                Object.assign(button.style, { backgroundColor: this.theme.mainTabActiveBg, color: this.theme.mainTabActiveFg, fontWeight: 'bold' });
            } else {
                Object.assign(button.style, { backgroundColor: this.theme.mainTabInactiveBg, color: this.theme.mainTabInactiveFg, fontWeight: 'normal' });
            }
            button.addEventListener('click', (e) => this.handleTabClick(e.target.dataset.tabId));
            this.mainTabsDiv.appendChild(button);
        });
    },

    handleTabClick: function(tabId) {
        if (this.activeMainTab === tabId) return;
        this.activeMainTab = tabId;
        this.renderMainTabs();
        this.renderMainContent();
    },

    renderMainContent: function() {
        if (!this.mainContentAreaDiv) return;
        this.mainContentAreaDiv.style.display = 'flex';
        if (this.activeMainTab === 'Book') {
            this.renderBookInterface();
        } else if (this.activeMainTab === 'Remedies') {
            this.renderRemediesInterface();
        } else {
            this.mainContentAreaDiv.innerHTML = `<p>Content not implemented for this tab.</p>`;
        }
    },

    renderRemediesInterface: function() {
        if (!this.mainContentAreaDiv) return;
        const sortIndicator = this.remediesSortOrder === 'asc' ? '&#9650;' : '&#9660;'; // Up or Down arrow
        let html = `
            <div style="width: 100%; display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 5px; margin-bottom: 10px; flex-shrink: 0;">
                    <input type="text" id="sg_remediesSearch" placeholder="Search for a malady or cure..." value="${this.escapeHtml(this.remediesSearchTerm)}" style="width: 100%; padding: 8px 10px; font-size: 1.1em; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div class="sg-accordion-table-header" style="display: flex; align-items: stretch; padding: 12px 15px; background-color: #eee; border: 1px solid ${this.theme.borderColor}; border-bottom: none; border-radius: 6px 6px 0 0; font-weight: bold;">
                    <div id="sg_maladySortHeader" style="width: 45%; padding-right: 15px; border-right: 1px solid #ddd; cursor: pointer;">Illness ${sortIndicator}</div>
                    <div style="width: 45%; padding-left: 15px;">Cures</div>
                    <div style="width: 10%; text-align: right;"></div>
                </div>
                <div id="sg_remediesList" style="overflow-y: auto; flex-grow: 1;">
                </div>
            </div>`;
        this.mainContentAreaDiv.innerHTML = html;

        const searchInput = this.mainContentAreaDiv.querySelector('#sg_remediesSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.remediesSearchTerm = e.target.value;
                this.populateRemediesList();
            });
        }

        const maladySortHeader = this.mainContentAreaDiv.querySelector('#sg_maladySortHeader');
        if (maladySortHeader) {
            maladySortHeader.addEventListener('click', () => {
                this.remediesSortOrder = this.remediesSortOrder === 'asc' ? 'desc' : 'asc';
                this.renderRemediesInterface(); // Re-render to update header and list
            });
        }

        this.populateRemediesList();
    },

    populateRemediesList: function() {
        const listContainer = this.mainContentAreaDiv.querySelector('#sg_remediesList');
        if (!listContainer) return;
        
        let processedData = [...this.remediesData]; // Create a mutable copy
        const searchTerm = this.remediesSearchTerm.toLowerCase();

        // 1. Sort the data
        processedData.sort((a, b) => {
            const nameA = a.malady_name.toLowerCase();
            const nameB = b.malady_name.toLowerCase();
            if (nameA < nameB) return this.remediesSortOrder === 'asc' ? -1 : 1;
            if (nameA > nameB) return this.remediesSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // 2. Filter the sorted data
        if(searchTerm) {
            processedData = processedData.filter(malady => 
                malady.malady_name.toLowerCase().includes(searchTerm) ||
                malady.description.toLowerCase().includes(searchTerm) ||
                malady.symptoms_in_text.some(s => s.toLowerCase().includes(searchTerm)) ||
                malady.remedies.some(r => r.remedy_name.toLowerCase().includes(searchTerm) || r.prescription_in_text.toLowerCase().includes(searchTerm) || r.explanation.toLowerCase().includes(searchTerm))
            );
        }

        if (!processedData || processedData.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; padding: 20px;"><em>${searchTerm ? 'No entries match your search.' : 'No remedies data loaded.'}</em></p>`;
            return;
        }

        let listHtml = '';
        processedData.forEach(malady => {
            const curePreviewHtml = malady.remedies.map(r => `<span>${this.escapeHtml(r.remedy_name)}</span>`).join('<br>');
            listHtml += `
                <div class="sg-accordion-item" data-malady-id="${malady.id}" style="border: 1px solid ${this.theme.borderColor}; border-top: none; background-color: #fff;">
                    <div class="sg-accordion-header" style="margin: 0; padding: 12px 15px; cursor: pointer; display: flex; align-items: stretch;">
                        <div style="width: 45%; padding-right: 15px; border-right: 1px solid #eee; font-size: 1.2em; display: flex; align-items: center;">${this.escapeHtml(malady.malady_name)}</div>
                        <div style="width: 45%; padding-left: 15px; font-size: 1.0em; color: ${this.theme.citationColor}; display: flex; flex-direction: column; justify-content: center;">${curePreviewHtml}</div>
                        <div style="width: 10%; text-align: right; font-size: 1.5em; display: flex; align-items: center; justify-content: flex-end;" class="sg-accordion-icon">+</div>
                    </div>
                    <div class="sg-accordion-content" data-loaded="false" style="display: none; padding: 0 15px 15px 15px; border-top: 1px solid #eee;"></div>
                </div>`;
        });
        listContainer.innerHTML = listHtml;
        listContainer.querySelectorAll('.sg-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('.sg-accordion-icon');
                const isOpen = content.style.display === 'block';

                if (isOpen) {
                    content.style.display = 'none';
                    icon.textContent = '+';
                } else {
                    if (content.dataset.loaded === 'false') {
                        const maladyId = header.parentElement.dataset.maladyId;
                        const maladyData = this.remediesData.find(m => m.id === maladyId);
                        if(maladyData) {
                            content.innerHTML = this.getRemedyContentHtml(maladyData);
                            this.attachQuoteLinkListeners(content);
                        }
                        content.dataset.loaded = 'true';
                    }
                    content.style.display = 'block';
                    icon.textContent = '−';
                }
            });
        });
    },
    
    getSearchableQuote: function(fullQuote) {
        if (!fullQuote) return "";
        let cleanQuote = fullQuote.trim().replace(/\.\.\.$/, '').trim();
        let firstLine = cleanQuote.split('\n')[0].trim();
        return firstLine;
    },

    getRemedyContentHtml: function(malady) {
        let sicknessHtml = `<div style="padding-right: 8px;">
            <p style="font-style: italic; color: #666; margin-top: 15px;">${this.escapeHtml(malady.description)}</p>
            <h4 style="color: ${this.theme.textColor}; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Symptoms in the Text</h4>`;
        malady.symptoms_in_text.forEach(symptom => {
            const searchableSymptom = this.getSearchableQuote(symptom);
            sicknessHtml += `<a href="#" class="sg-quote-link" data-section="${this.escapeHtml(malady.source_section_name)}" data-quote="${this.escapeHtml(searchableSymptom)}">
                <blockquote style="margin: 10px 0; padding: 10px; border-left: 3px solid #e6a4a4; background-color: #fdf6f6; white-space: pre-wrap; color: inherit; text-decoration: none;">${this.escapeHtml(symptom)}</blockquote>
            </a>`;
        });
        sicknessHtml += `</div>`;
        let cureHtml = `<div style="padding-left: 8px;">
            <h4 style="color: ${this.theme.textColor}; margin-top: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Cures</h4>`;
        malady.remedies.forEach((remedy) => {
            const searchablePrescription = this.getSearchableQuote(remedy.prescription_in_text);
            cureHtml += `<div style="padding-top: 15px;">
                <h5 style="margin:0; font-size: 1.1em; color:${this.theme.citationColor};">${this.escapeHtml(remedy.remedy_name)}</h5>
                <a href="#" class="sg-quote-link" data-section="${this.escapeHtml(malady.source_section_name)}" data-quote="${this.escapeHtml(searchablePrescription)}">
                    <blockquote style="margin: 10px 0; padding: 10px; border-left: 3px solid #a4cce6; background-color: #f6fafd; white-space: pre-wrap; font-weight: bold; color: inherit; text-decoration: none;">${this.escapeHtml(remedy.prescription_in_text)}</blockquote>
                </a>
                <p>${this.escapeHtml(remedy.explanation)}</p>
            </div>`;
        });
        cureHtml += `</div>`;
        return `<table style="width:100%; border-spacing: 0;"><tr style="vertical-align: top;"><td style="width: 50%;">${sicknessHtml}</td><td style="width: 50%; border-left: 1px solid #eee;">${cureHtml}</td></tr></table>`;
    },

    attachQuoteLinkListeners: function(contentElement) {
        contentElement.querySelectorAll('.sg-quote-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const section = e.currentTarget.dataset.section;
                const quote = e.currentTarget.dataset.quote;
                this.launchBookReader(section, quote);
            });
            const blockquote = link.querySelector('blockquote');
            if (blockquote) {
                    link.addEventListener('mouseover', () => blockquote.style.borderColor = this.theme.citationHoverColor);
                    link.addEventListener('mouseout', () => blockquote.style.borderColor = blockquote.style.backgroundColor === '#fdf6f6' ? '#e6a4a4' : '#a4cce6');
            }
        });
    },

    renderBookInterface: function() {
        if (!this.mainContentAreaDiv) return;
        let bookHTML = `
            <div id="sg_bookContainer" style="width:100%; color: ${this.theme.textColor}; display: flex; flex-direction: column; height: 100%;">
                <div id="sg_bookHeader" style="padding: 5px 0; text-align: center; border-bottom: 1px solid ${this.theme.borderColor}; margin-bottom: 10px; flex-shrink: 0;">
                    <h2 style="margin: 0; font-size: 1.5em;">Savitri: A Legend and a Symbol</h2>
                </div>
                <div id="sg_tocArea" style="overflow-y: auto; flex-grow: 1; background-color: #fff; border: 1px solid ${this.theme.borderColor}; border-radius: 4px; padding: 15px;">`;
        if (!this.tocData || this.tocData.length === 0) {
            bookHTML += '<h3>Table of Contents</h3><p><em>Could not be loaded.</em></p>';
        } else {
            this.tocData.forEach(part => {
                bookHTML += `<div class="sg-toc-part" style="margin-bottom: 20px;"><h3>${this.escapeHtml(part.title)}</h3>`;
                if (part.books && part.books.length > 0) {
                    bookHTML += '<ul style="list-style-type: none; padding-left: 15px;">';
                    part.books.forEach(book => {
                        bookHTML += `<li style="padding-top: 8px; font-size: 1.1em; font-weight: bold;">${this.escapeHtml(book.title)}</li>`;
                        if (book.cantos && book.cantos.length > 0) {
                            bookHTML += '<ul style="list-style-type: none; padding-left: 20px; font-weight: normal; margin-top: 5px;">';
                            book.cantos.forEach(canto => {
                                bookHTML += `<li style="padding: 5px 0;"><strong>${this.escapeHtml(canto.title)}</strong>`;
                                if (canto.sections && canto.sections.length > 0) {
                                    bookHTML += '<ul style="list-style-type: none; padding-left: 25px; margin-top: 3px;">';
                                    canto.sections.forEach(section => {
                                        bookHTML += `<li style="padding: 2px 0;"><a href="#" class="sg-read-link" data-chapter="${this.escapeHtml(section.address)}" style="color: ${this.theme.citationColor}; text-decoration: none;">${this.escapeHtml(section.title)}</a></li>`;
                                    });
                                    bookHTML += '</ul>';
                                }
                                bookHTML += `</li>`;
                            });
                            bookHTML += '</ul>';
                        }
                    });
                    bookHTML += '</ul>';
                }
                bookHTML += `</div>`;
            });
        }
        bookHTML += `</div></div>`;
        this.mainContentAreaDiv.innerHTML = bookHTML;
        this.mainContentAreaDiv.querySelectorAll('.sg-read-link').forEach(link => {
            link.addEventListener('click', (e) => { e.preventDefault(); this.launchBookReader(e.currentTarget.dataset.chapter, null); });
            link.addEventListener('mouseover', (e) => e.currentTarget.style.textDecoration = 'underline');
            link.addEventListener('mouseout', (e) => e.currentTarget.style.textDecoration = 'none');
        });
    },

    launchBookReader: function(chapterName, targetString) {
        if (typeof BookReaderGame === 'undefined' || !document.getElementById('bookReaderHost')) { this.showGameAlert("The book reader module is currently unavailable."); return; }
        if (this.container) this.container.style.display = 'none';
        console.log(`Launching reader. Chapter: ${chapterName}, Target: ${targetString}`);
        BookReaderGame.init(document.getElementById('bookReaderHost'), this.savitriFilePath, () => {
            if (this.container) this.container.style.display = 'flex'; this.renderMainTabs(); this.renderMainContent();
        }, chapterName, targetString);
    },

    showGameAlert: function(message) { alert(message); },

    attachEventListeners: function() {
        const leaveButton = this.container.querySelector('#sg_leaveButton');
        if (leaveButton) {
            leaveButton.addEventListener('mouseover', () => leaveButton.style.backgroundColor = this.theme.buttonHoverColor);
            leaveButton.addEventListener('mouseout', () => leaveButton.style.backgroundColor = this.theme.buttonColor);
            leaveButton.addEventListener('click', () => this.handleCompletion());
        }
    },

    handleCompletion: function() {
        if (this.successCallback) this.successCallback({ ...this.sharedData, savitriVisited: true });
        this.destroy();
    },

    escapeHtml: function(unsafe) {
        if (unsafe == null) return "";
        return String(unsafe).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);
    },

    destroy: function() {
        console.log(`savitriGame: Destroying.`);
        if (this.container) this.container.innerHTML = '';
        this.container = null; this.successCallback = null; this.failureCallback = null;
        this.sharedData = null; this.tocData = []; this.remediesData = [];
    }
};

