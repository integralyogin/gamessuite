// js/libraryGame.js

const LibraryGame = {

    id: 'LibraryGame',

    container: null,

    successCallback: null,

    failureCallback: null,

    sharedData: null,

    availableBookFiles: [
        'texts/tm_wotm2.txt',
        'texts/tm_wotm3.txt',
        'texts/sa12.EDAH.txt',
        'texts/sa13.EIPAY.txt',
        'texts/sa17.ISHA.txt',
        'texts/sa19.EOTG.txt',
        'texts/sa21.TLD.txt',
        'texts/sa25.THC.txt',
        'texts/sa23.TSOY.txt',
        'texts/sa28.LOY1.txt',
        'texts/sa29.LOY2.txt',
        'texts/sa30.LOY3.txt',
        'texts/sa32.TMWLOTM.txt',
        'texts/sa31.Savitri.txt',
        'texts/sa35.LOHATA.txt'
    ],

    localState: {
        books: [],
        pawnsAssignedToStudy: {},
        selectedBookForAssignment: null,
        isReaderActive: false,
        isAssigningPawn: false,
        isComputerActive: false,
        pendingBookOpenDetails: null,
    },

    elements: {
        bookListContainer: null,
        exitButton: null,
        libraryGameWrapper: null,
        bookReaderHostElement: null,
        pawnAssignmentBanner: null,
        libraryComputerHostElement: null,
        compactSearchHostElement: null,
    },

    init: async function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;
        this.localState.isReaderActive = false;
        this.localState.isAssigningPawn = false;
        this.localState.isComputerActive = false;
        this.localState.pendingBookOpenDetails = null;

        console.log("LibraryGame: Initializing. SharedData:", JSON.parse(JSON.stringify(this.sharedData)));

        if (!this.sharedData.playerRoster) {
            this.sharedData.playerRoster = [];
        }

        this.renderBaseLayout();
        this.cacheDOMElements();
        this.applyStyles();
        this.attachEventListeners();
        
        if (this.elements.bookListContainer) {
            this.elements.bookListContainer.innerHTML = '<p class="loading-books-message-lg">Loading library catalog...</p>';
        }
        
        // Initialize compact search
        this.initializeCompactSearch();
        
        await this.loadBookCatalog();
    },

    loadBookCatalog: async function() {
        this.localState.books = [];
        const metadataPromises = this.availableBookFiles.map(filePath => this.fetchBookMetadataFromFile(filePath));
        try {
            const bookMetadatas = await Promise.all(metadataPromises);
            this.localState.books = bookMetadatas.filter(book => book !== null);
            if (this.localState.books.length === 0 && this.availableBookFiles.length > 0) {
                console.warn("LibraryGame: No valid books loaded despite having file paths.");
            }
            this.updateDisplay();
        } catch (error) {
            console.error("LibraryGame: Error loading book catalog:", error);
            if (this.elements.bookListContainer) {
                this.elements.bookListContainer.innerHTML = '<p class="error-message-lg">Failed to load library catalog.</p>';
            }
        }
    },

    fetchBookMetadataFromFile: async function(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                console.warn(`LibraryGame: Failed to fetch ${filePath}: ${response.status}`);
                return null;
            }
            const text = await response.text();
            const lines = text.split(/\r?\n/);
            if (lines.length < 6) {
                console.warn(`LibraryGame: File ${filePath} has insufficient metadata lines.`);
                return null;
            }

            // Parse the format line to understand the field order
            const formatLine = lines[0];
            const formatFields = formatLine.split(',').map(s => s.trim().toLowerCase());
            
            // Extract non-empty lines after the format line
            const contentLines = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line !== '') {
                    contentLines.push(line);
                }
                // Stop when we reach content that looks like chapter/part headers
                if (line.toLowerCase().includes('part ') || line.toLowerCase().includes('chapter ')) {
                    break;
                }
            }

            // Map the content lines to the format fields
            let metadataValues = {};
            let contentIndex = 0;
            
            for (const field of formatFields) {
                if (["author", "title", "subject", "description", "difficulty"].includes(field)) {
                    if (contentIndex < contentLines.length) {
                        metadataValues[field] = contentLines[contentIndex];
                        contentIndex++;
                    }
                }
            }

            return {
                filePath: filePath,
                title: metadataValues.title || "Unknown Title",
                author: metadataValues.author || "Unknown Author", 
                subject: metadataValues.subject || "General",
                description: metadataValues.description || "No description available.",
                difficulty: metadataValues.difficulty || "Unknown"
            };
        } catch (error) {
            console.error(`LibraryGame: Error fetching metadata for ${filePath}:`, error);
            return null;
        }
    },

    renderBaseLayout: function() {
        this.container.innerHTML = `
            <div id="libraryGameWrapper_LG" class="library-game">
                <div class="library-header">
                    <h1>THE GRAND LIBRARY</h1>
                    <div class="library-header-actions">
                        <div id="compactSearchHost_LG" class="compact-search-host"></div>
                        <button id="exitLibraryBtn_LG" class="library-button exit-button-lg">Leave Library</button>
                    </div>
                </div>
                <div class="library-main-content">
                    <div class="book-section-lg">
                        <div id="pawnAssignmentBanner_LG" class="pawn-assignment-banner-lg" style="display: none;">
                        </div>
                        <h2>AVAILABLE BOOKS</h2>
                        <div id="bookListContainer_LG" class="books-container-lg">
                        </div>
                    </div>
                </div>
            </div>
            <div id="bookReaderHost_LG" style="display: none;"></div>
            <div id="libraryComputerHost_LG" style="display: none;"></div>
        `;
    },

    cacheDOMElements: function() {
        this.elements.libraryGameWrapper = document.getElementById('libraryGameWrapper_LG');
        this.elements.bookListContainer = document.getElementById('bookListContainer_LG');
        this.elements.exitButton = document.getElementById('exitLibraryBtn_LG');
        this.elements.bookReaderHostElement = document.getElementById('bookReaderHost_LG');
        this.elements.pawnAssignmentBanner = document.getElementById('pawnAssignmentBanner_LG');
        this.elements.libraryComputerHostElement = document.getElementById('libraryComputerHost_LG');
        this.elements.compactSearchHostElement = document.getElementById('compactSearchHost_LG');
    },

    applyStyles: function() {
        let style = document.getElementById('libraryGameStyle');
        if (!style) {
            style = document.createElement('style');
            style.id = 'libraryGameStyle';
            document.head.appendChild(style);
        }
        style.textContent = `
            .library-game {
                width: 100%; height: 100%; 
                background-color: #f5f5dc; /* Beige background like original */
                color: #8b4513; /* Brown text like original */
                font-family: 'Georgia', 'Times New Roman', serif; 
                display: flex; flex-direction: column;
                overflow: hidden; position: relative;
            }
            .library-header {
                background-color: #f5f5dc; /* Same beige background */
                padding: 20px 30px; 
                border-bottom: 2px solid #8b4513; /* Brown border */
                display: flex; justify-content: space-between; align-items: center;
            }
            .library-header h1 {
                margin: 0; font-size: 2.2em; 
                color: #8b4513; /* Brown color like original */
                font-weight: bold; letter-spacing: 1px;
                text-align: center; flex-grow: 1;
            }
            .library-header-actions {
                display: flex; align-items: center; gap: 15px;
                position: absolute; right: 30px;
            }
            .compact-search-host {
                display: flex; align-items: center;
            }
            .library-button {
                padding: 8px 16px; 
                border: 1px solid #8b4513; 
                border-radius: 4px;
                background-color: #d2b48c; /* Light brown like original buttons */
                color: #8b4513; 
                cursor: pointer;
                font-size: 0.9em; 
                font-weight: bold; 
                transition: all 0.2s ease;
                text-transform: none;
            }
            .library-button:hover {
                background-color: #daa520; /* Slightly darker on hover */
            }
            .exit-button-lg {
                background-color: #cd853f; /* Darker brown for exit button */
                color: #fff;
            }
            .exit-button-lg:hover {
                background-color: #a0522d;
            }
            .library-main-content {
                flex: 1; padding: 20px 30px; overflow-y: auto; 
                background-color: #f5f5dc; /* Beige background */
            }
            .book-section-lg h2 {
                margin: 0 0 20px 0; font-size: 1.5em; 
                color: #8b4513; /* Brown color */
                text-align: center;
                border-bottom: 1px solid #8b4513; 
                padding-bottom: 10px;
            }
            .books-container-lg {
                /* Table container */
                overflow-x: auto;
            }
            .books-table-lg {
                width: 100%;
                border-collapse: collapse;
                background-color: #fff; /* White table background */
                border: 1px solid #8b4513;
            }
            .books-table-lg th {
                background-color: #f5f5dc; /* Beige header background */
                color: #8b4513;
                padding: 12px 8px;
                text-align: left;
                border: 1px solid #8b4513;
                font-weight: bold;
                font-size: 0.9em;
            }
            .books-table-lg td {
                padding: 8px;
                border: 1px solid #8b4513;
                vertical-align: top;
                background-color: #fff;
                color: #333;
                font-size: 0.85em;
                line-height: 1.3;
            }
            .books-table-lg tr:nth-child(even) td {
                background-color: #fafafa; /* Slight alternating row color */
            }
            .book-title-cell {
                font-weight: bold;
                color: #8b4513;
                min-width: 120px;
            }
            .book-author-cell {
                min-width: 100px;
            }
            .book-subject-cell {
                min-width: 80px;
            }
            .book-difficulty-cell {
                min-width: 80px;
                text-align: center;
            }
            .book-effect-cell {
                min-width: 150px;
                max-width: 200px;
            }
            .book-actions-cell {
                min-width: 120px;
                text-align: center;
            }
            .book-action-btn-lg {
                padding: 4px 8px; 
                border: 1px solid #8b4513; 
                border-radius: 3px;
                background-color: #d2b48c;
                color: #8b4513; 
                cursor: pointer;
                font-size: 0.8em; 
                margin: 2px;
                transition: all 0.2s ease;
                display: inline-block;
            }
            .read-book-btn-lg {
                background-color: #90ee90; /* Light green for read */
                border-color: #228b22;
                color: #006400;
            }
            .read-book-btn-lg:hover {
                background-color: #98fb98;
            }
            .select-book-btn-lg {
                background-color: #d2b48c; /* Tan for study */
                border-color: #8b4513;
                color: #8b4513;
            }
            .select-book-btn-lg:hover {
                background-color: #daa520;
            }
            .loading-books-message-lg, .error-message-lg {
                text-align: center; font-size: 1.2em; 
                color: #8b4513; padding: 40px;
            }
            .error-message-lg {
                color: #dc143c;
            }
            .pawn-assignment-banner-lg {
                background-color: #ffe4b5; /* Moccasin background */
                border: 2px solid #daa520; 
                border-radius: 8px;
                padding: 15px; margin-bottom: 20px; text-align: center;
                color: #8b4513;
            }
            .pawn-assignment-banner-lg h3 {
                margin: 0 0 10px 0; color: #8b4513;
            }
            .pawn-assignment-banner-lg p {
                margin: 0; color: #8b4513;
            }
            .cancel-assignment-btn-lg {
                background-color: #cd853f; 
                border-color: #a0522d; 
                color: #fff;
                margin-top: 10px;
            }
            .cancel-assignment-btn-lg:hover {
                background-color: #a0522d;
            }
            .library-main-content::-webkit-scrollbar {
                width: 12px;
            }
            .library-main-content::-webkit-scrollbar-track {
                background: #f5f5dc;
            }
            .library-main-content::-webkit-scrollbar-thumb {
                background: #d2b48c; 
                border-radius: 6px;
            }
            .library-main-content::-webkit-scrollbar-thumb:hover {
                background: #daa520;
            }
        `;
    },

    initializeCompactSearch: function() {
        if (typeof LibraryComputerGame !== 'undefined' && this.elements.compactSearchHostElement) {
            LibraryComputerGame.initCompactMode(
                this.elements.compactSearchHostElement,
                this.availableBookFiles,
                (filePath, chapterTitle, targetString) => {
                    this.handleSearchResultSelected(filePath, chapterTitle, targetString);
                }
            );
        } else {
            console.warn("LibraryGame: LibraryComputerGame not available for compact search initialization.");
        }
    },

    updateDisplay: function() {
        if (this.localState.isReaderActive || this.localState.isComputerActive) {
            if (this.elements.libraryGameWrapper) this.elements.libraryGameWrapper.style.display = 'none';
            return;
        } else {
            if (this.elements.libraryGameWrapper) this.elements.libraryGameWrapper.style.display = 'flex';
        }

        this.renderBookList();
        this.updatePawnAssignmentBanner();
    },

    renderBookList: function() {
        if (!this.elements.bookListContainer) return;

        if (this.localState.books.length === 0) {
            this.elements.bookListContainer.innerHTML = '<p class="loading-books-message-lg">No books available in the library.</p>';
            return;
        }

        // Create table structure like the original
        const tableHTML = `
            <table class="books-table-lg">
                <thead>
                    <tr>
                        <th class="book-title-header">Title</th>
                        <th class="book-author-header">Author</th>
                        <th class="book-subject-header">Subject</th>
                        <th class="book-difficulty-header">Difficulty</th>
                        <th class="book-effect-header">Effect</th>
                        <th class="book-actions-header">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.localState.books.map(book => {
                        const isAssigned = this.localState.pawnsAssignedToStudy[book.filePath];
                        const assignedPawnName = isAssigned ? isAssigned.name : null;
                        
                        // Generate effect text based on subject (like original)
                        let effectText = "Study of ";
                        if (book.subject.toLowerCase().includes('integral yoga')) {
                            effectText += "Integral Yoga";
                        } else if (book.subject.toLowerCase().includes('yoga')) {
                            effectText += "Yoga";
                        } else {
                            effectText += book.subject;
                        }
                        if (book.author && book.author !== "Unknown Author") {
                            effectText += ", " + book.author.split(' ').pop(); // Last name
                        }

                        return `
                            <tr>
                                <td class="book-title-cell">${this.escapeHTML(book.title)}</td>
                                <td class="book-author-cell">${this.escapeHTML(book.author)}</td>
                                <td class="book-subject-cell">${this.escapeHTML(book.subject)}</td>
                                <td class="book-difficulty-cell">${this.escapeHTML(book.difficulty)}</td>
                                <td class="book-effect-cell">
                                    ${this.escapeHTML(effectText)}
                                    ${assignedPawnName ? `<br><small>Assigned to: ${this.escapeHTML(assignedPawnName)}</small>` : ''}
                                </td>
                                <td class="book-actions-cell">
                                    <button class="book-action-btn-lg read-book-btn-lg" data-book-id="${this.escapeHTML(book.filePath)}">Read</button>
                                    ${!this.localState.isAssigningPawn ? 
                                        `<button class="book-action-btn-lg select-book-btn-lg" data-book-id="${this.escapeHTML(book.filePath)}">Study</button>` : 
                                        (this.localState.selectedBookForAssignment === book.filePath ? 
                                            `<button class="book-action-btn-lg select-book-btn-lg" data-book-id="${this.escapeHTML(book.filePath)}" style="background-color: #ffd700; border-color: #daa520;">Selected</button>` : 
                                            `<button class="book-action-btn-lg select-book-btn-lg" data-book-id="${this.escapeHTML(book.filePath)}">Select</button>`
                                        )
                                    }
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        this.elements.bookListContainer.innerHTML = tableHTML;
    },

    updatePawnAssignmentBanner: function() {
        if (!this.elements.pawnAssignmentBanner) return;

        if (this.localState.isAssigningPawn) {
            const selectedBook = this.localState.books.find(book => book.filePath === this.localState.selectedBookForAssignment);
            const bookTitle = selectedBook ? selectedBook.title : "Unknown Book";

            this.elements.pawnAssignmentBanner.innerHTML = `
                <h3>Assigning Book to Pawn</h3>
                <p>Selected: "${this.escapeHTML(bookTitle)}"</p>
                <p>Click on a pawn in the main game to assign this book for study.</p>
                <button class="library-button cancel-assignment-btn-lg" onclick="LibraryGame.cancelPawnAssignment()">Cancel Assignment</button>
            `;
            this.elements.pawnAssignmentBanner.style.display = 'block';
        } else {
            this.elements.pawnAssignmentBanner.style.display = 'none';
        }
    },

    attachEventListeners: function() {
        if (this.elements.exitButton) {
            this.elements.exitButton.onclick = () => {
                if (this.localState.isReaderActive && typeof BookReaderGame !== 'undefined' && BookReaderGame.isActive) { 
                    BookReaderGame.close(); 
                }
                if (this.localState.isComputerActive && typeof LibraryComputerGame !== 'undefined' && LibraryComputerGame.isActive) { 
                    LibraryComputerGame.close(); 
                }
                this.successCallback(this.sharedData);
            };
        }

        if(this.elements.libraryGameWrapper) {
            this.elements.libraryGameWrapper.addEventListener('click', (event) => {
                if (this.localState.isReaderActive || this.localState.isComputerActive) return;

                const target = event.target;
                if (target.closest('.books-container-lg')) {
                    if (target.classList.contains('select-book-btn-lg')) {
                        this.handleSelectBookForStudy(target.dataset.bookId);
                    } else if (target.classList.contains('read-book-btn-lg')) {
                        this.handleReadBook(target.dataset.bookId);
                    }
                }
            });
        }
    },

    handleSearchResultSelected: function(filePath, chapterTitle, targetString) {
        console.log(`LibraryGame: Search result selected - File: ${filePath}, Chapter: ${chapterTitle}, Target: ${targetString}`);
        
        this.localState.pendingBookOpenDetails = {
            filePath: filePath,
            chapterTitle: chapterTitle,
            targetString: targetString
        };

        this.openBookReader(filePath, chapterTitle, targetString);
    },

    openFullSearchModal: function(query) {
        if (typeof LibraryComputerGame === 'undefined' || !this.elements.libraryComputerHostElement) {
            console.error("LibraryComputerGame is not available or its host element is missing.");
            alert("The Archives Terminal is currently unavailable.");
            return;
        }

        this.localState.isComputerActive = true;
        this.localState.pendingBookOpenDetails = null;
        this.updateDisplay();

        LibraryComputerGame.init(
            this.elements.libraryComputerHostElement,
            () => {
                this.localState.isComputerActive = false;
                console.log("LibraryGame: LibraryComputerGame closed (from full search modal).");

                if (this.localState.pendingBookOpenDetails) {
                    const details = this.localState.pendingBookOpenDetails;
                    this.localState.pendingBookOpenDetails = null;
                    this.openBookReader(details.filePath, details.chapterTitle, details.targetString);
                } else {
                    this.updateDisplay();
                }
            },
            this.availableBookFiles,
            (filePath, chapterTitle, targetString) => {
                this.localState.pendingBookOpenDetails = {
                    filePath: filePath,
                    chapterTitle: chapterTitle,
                    targetString: targetString
                };
                LibraryComputerGame.close();
            }
        );

        if (query && LibraryComputerGame.elements.searchInput) {
            LibraryComputerGame.elements.searchInput.value = query;
            LibraryComputerGame.performSearch(query);
        }
    },

    handleSelectBookForStudy: function(bookFilePath) {
        if (this.localState.isAssigningPawn) {
            this.localState.selectedBookForAssignment = bookFilePath;
            this.updateDisplay();
            this.successCallback(this.sharedData);
        } else {
            this.localState.isAssigningPawn = true;
            this.localState.selectedBookForAssignment = bookFilePath;
            this.updateDisplay();
        }
    },

    cancelPawnAssignment: function() {
        this.localState.isAssigningPawn = false;
        this.localState.selectedBookForAssignment = null;
        this.updateDisplay();
    },

    handleReadBook: function(bookFilePath) {
        this.openBookReader(bookFilePath, null, null);
    },

    openBookReader: function(filePath, chapterTitle, targetString) {
        if (typeof BookReaderGame === 'undefined' || !this.elements.bookReaderHostElement) {
            console.error("BookReaderGame is not available or its host element is missing.");
            alert("The book reader is currently unavailable.");
            return;
        }

        this.localState.isReaderActive = true;
        this.updateDisplay();

        const book = this.localState.books.find(b => b.filePath === filePath);
        if (!book) {
            console.error(`LibraryGame: Book not found for filePath: ${filePath}`);
            return;
        }

        BookReaderGame.init(
            this.elements.bookReaderHostElement,
            book.filePath,
            () => {
                this.localState.isReaderActive = false;
                this.updateDisplay();
            },
            chapterTitle,
            targetString
        );
    },

    escapeHTML: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    destroy: function() {
        console.log("LibraryGame: Destroying...");
        if (this.localState.isReaderActive && typeof BookReaderGame !== 'undefined' && BookReaderGame.isActive) { 
            BookReaderGame.close(); 
        }
        if (this.localState.isComputerActive && typeof LibraryComputerGame !== 'undefined' && LibraryComputerGame.isActive) { 
            LibraryComputerGame.close(); 
        }

        if (this.container) { 
            this.container.innerHTML = ''; 
        }
        this.localState.books = [];
        this.localState.pawnsAssignedToStudy = {};
        this.localState.selectedBookForAssignment = null;
        this.localState.isReaderActive = false;
        this.localState.isAssigningPawn = false;
        this.localState.isComputerActive = false;
        this.localState.pendingBookOpenDetails = null;
    }
};


