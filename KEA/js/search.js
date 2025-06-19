/**
 * Search Manager - Advanced search functionality with fuzzy matching and filters
 */

class SearchManager {
    constructor(app) {
        this.app = app;
        this.searchInput = null;
        this.suggestionElement = null;
        this.clearButton = null;
        this.currentQuery = '';
        this.currentSuggestion = '';
        this.searchHistory = [];
        this.debounceTimer = null;
        this.debounceDelay = 150;
        
        this.initialize();
    }

    initialize() {
        this.searchInput = document.getElementById('search-input');
        this.suggestionElement = document.getElementById('search-suggestion');
        this.clearButton = document.getElementById('clear-search');
        
        if (!this.searchInput) {
            console.error('Search input element not found');
            return;
        }

        this.setupEventListeners();
        this.loadSearchHistory();
    }

    setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleInput(e);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        this.searchInput.addEventListener('focus', () => {
            this.handleFocus();
        });

        this.searchInput.addEventListener('blur', () => {
            this.handleBlur();
        });

        // Clear button
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterClick(e);
            });
        });
    }

    handleInput(event) {
        const query = event.target.value.trim();
        this.currentQuery = query;

        // Show/hide clear button
        if (this.clearButton) {
            this.clearButton.classList.toggle('visible', query.length > 0);
        }

        // Clear previous debounce
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Debounce search
        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.debounceDelay);
    }

    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.selectSuggestion();
                break;
            case 'Tab':
                if (this.currentSuggestion) {
                    event.preventDefault();
                    this.applySuggestion();
                }
                break;
            case 'Escape':
                this.clearSearch();
                break;
            case 'ArrowDown':
                event.preventDefault();
                // TODO: Navigate through search results
                break;
            case 'ArrowUp':
                event.preventDefault();
                // TODO: Navigate through search results
                break;
        }
    }

    handleFocus() {
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }
    }

    handleBlur() {
        // Hide suggestions after a delay to allow for clicks
        setTimeout(() => {
            this.hideSuggestion();
        }, 200);
    }

    handleFilterClick(event) {
        // Update active filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Re-perform search with new filter
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }
    }

    performSearch(query) {
        if (!query) {
            this.clearResults();
            return;
        }

        const results = this.search(query);
        this.displayResults(results);
        this.updateSuggestion(query, results);
    }

    search(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        
        let concepts = Array.from(this.app.data.values());

        // Apply filters
        switch (activeFilter) {
            case 'favorites':
                concepts = concepts.filter(concept => this.app.favorites.has(concept.name));
                break;
            case 'recent':
                concepts = concepts.filter(concept => this.app.history.includes(concept.name));
                break;
            case 'all':
            default:
                // No additional filtering
                break;
        }

        // Search algorithms
        const results = [];

        // 1. Exact matches (highest priority)
        concepts.forEach(concept => {
            if (concept.name.toLowerCase() === normalizedQuery) {
                results.push({
                    concept,
                    score: 100,
                    matchType: 'exact'
                });
            }
        });

        // 2. Starts with matches
        concepts.forEach(concept => {
            if (concept.name.toLowerCase().startsWith(normalizedQuery) && 
                !results.some(r => r.concept.id === concept.id)) {
                results.push({
                    concept,
                    score: 90,
                    matchType: 'starts-with'
                });
            }
        });

        // 3. Contains matches
        concepts.forEach(concept => {
            if (concept.name.toLowerCase().includes(normalizedQuery) && 
                !results.some(r => r.concept.id === concept.id)) {
                results.push({
                    concept,
                    score: 70,
                    matchType: 'contains'
                });
            }
        });

        // 4. Definition matches
        concepts.forEach(concept => {
            const definitionMatch = concept.definitions.some(def => 
                def.toLowerCase().includes(normalizedQuery)
            );
            if (definitionMatch && !results.some(r => r.concept.id === concept.id)) {
                results.push({
                    concept,
                    score: 50,
                    matchType: 'definition'
                });
            }
        });

        // 5. Tag matches
        concepts.forEach(concept => {
            const tagMatch = concept.tags && concept.tags.some(tag => 
                tag.toLowerCase().includes(normalizedQuery)
            );
            if (tagMatch && !results.some(r => r.concept.id === concept.id)) {
                results.push({
                    concept,
                    score: 40,
                    matchType: 'tag'
                });
            }
        });

        // 6. Fuzzy matches
        concepts.forEach(concept => {
            if (!results.some(r => r.concept.id === concept.id)) {
                const fuzzyScore = this.calculateFuzzyScore(normalizedQuery, concept.name.toLowerCase());
                if (fuzzyScore > 0.6) {
                    results.push({
                        concept,
                        score: fuzzyScore * 30,
                        matchType: 'fuzzy'
                    });
                }
            }
        });

        // Sort by score and relevance
        results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // Secondary sort by popularity/views
            return b.concept.metadata.views - a.concept.metadata.views;
        });

        return results.slice(0, 20); // Limit results
    }

    calculateFuzzyScore(query, target) {
        // Simple fuzzy matching algorithm
        if (query === target) return 1;
        if (query.length === 0) return 0;
        if (target.length === 0) return 0;

        // Levenshtein distance
        const matrix = [];
        for (let i = 0; i <= target.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= query.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= target.length; i++) {
            for (let j = 1; j <= query.length; j++) {
                if (target.charAt(i - 1) === query.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const distance = matrix[target.length][query.length];
        const maxLength = Math.max(query.length, target.length);
        return 1 - (distance / maxLength);
    }

    updateSuggestion(query, results) {
        if (!this.suggestionElement || results.length === 0) {
            this.hideSuggestion();
            return;
        }

        const topResult = results[0];
        const conceptName = topResult.concept.name;
        
        // Only show suggestion if it's a good match and different from current input
        if (topResult.score > 70 && conceptName.toLowerCase() !== query.toLowerCase()) {
            if (conceptName.toLowerCase().startsWith(query.toLowerCase())) {
                this.currentSuggestion = conceptName;
                this.suggestionElement.textContent = query + conceptName.substring(query.length);
                this.suggestionElement.style.display = 'block';
            } else {
                this.hideSuggestion();
            }
        } else {
            this.hideSuggestion();
        }
    }

    displayResults(results) {
        if (results.length === 0) {
            this.showNoResults();
            return;
        }

        // Display top result in main area
        const topResult = results[0];
        this.app.selectConcept(topResult.concept.name);

        // Display other results in sidebar or dropdown
        this.displayOtherResults(results.slice(1));
    }

    displayOtherResults(results) {
        // This could be implemented to show additional results
        // in a dropdown or sidebar section
        console.log('Other search results:', results);
    }

    showNoResults() {
        const panel = document.getElementById('details-panel');
        const content = document.getElementById('panel-content');
        
        if (panel && content) {
            document.getElementById('concept-title').textContent = 'No Results';
            content.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search no-results-icon"></i>
                    <h4>No concepts found</h4>
                    <p>Try searching for a different term or check your spelling.</p>
                    <div class="search-suggestions">
                        <h5>Suggestions:</h5>
                        <ul>
                            <li>Use broader terms</li>
                            <li>Check for typos</li>
                            <li>Try related concepts</li>
                        </ul>
                    </div>
                </div>
            `;
            panel.classList.remove('hidden');
        }
    }

    applySuggestion() {
        if (this.currentSuggestion && this.searchInput) {
            this.searchInput.value = this.currentSuggestion;
            this.currentQuery = this.currentSuggestion;
            this.hideSuggestion();
            this.performSearch(this.currentSuggestion);
        }
    }

    selectSuggestion() {
        if (this.currentSuggestion) {
            this.applySuggestion();
        } else if (this.currentQuery) {
            // Search for current query
            const results = this.search(this.currentQuery);
            if (results.length > 0) {
                this.app.selectConcept(results[0].concept.name);
                this.addToHistory(this.currentQuery);
            }
        }
    }

    hideSuggestion() {
        if (this.suggestionElement) {
            this.suggestionElement.style.display = 'none';
            this.suggestionElement.textContent = '';
        }
        this.currentSuggestion = '';
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.currentQuery = '';
        this.hideSuggestion();
        this.clearResults();
        
        if (this.clearButton) {
            this.clearButton.classList.remove('visible');
        }
    }

    clearResults() {
        // Clear the main display
        this.app.clearSelection();
    }

    addToHistory(query) {
        if (!this.searchHistory.includes(query)) {
            this.searchHistory.unshift(query);
            this.searchHistory = this.searchHistory.slice(0, 10); // Keep last 10
            this.saveSearchHistory();
        }
    }

    loadSearchHistory() {
        const saved = localStorage.getItem('knowledge-explorer-search-history');
        if (saved) {
            try {
                this.searchHistory = JSON.parse(saved);
            } catch (error) {
                console.warn('Failed to load search history:', error);
            }
        }
    }

    saveSearchHistory() {
        localStorage.setItem('knowledge-explorer-search-history', JSON.stringify(this.searchHistory));
    }

    // Public API methods
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    setQuery(query) {
        if (this.searchInput) {
            this.searchInput.value = query;
            this.currentQuery = query;
            this.performSearch(query);
        }
    }

    getQuery() {
        return this.currentQuery;
    }

    getHistory() {
        return [...this.searchHistory];
    }

    clearHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }
}

