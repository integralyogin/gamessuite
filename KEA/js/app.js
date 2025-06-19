/**
 * Enhanced Knowledge Explorer - Main Application
 * A modern, interactive knowledge visualization platform
 */

class KnowledgeExplorer {
    constructor() {
        this.data = new Map();
        this.searchIndex = [];
        this.currentConcept = null;
        this.selectedNodes = new Set();
        this.settings = {
            theme: 'light',
            animationSpeed: 1,
            autoExpand: false,
            showTooltips: true,
            layout: 'force',
            nodeSize: 20,
            linkDistance: 150
        };
        this.history = [];
        this.favorites = new Set();
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        console.log('🧠 Initializing Enhanced Knowledge Explorer...');
        
        // Show loading screen
        this.showLoading();
        
        try {
            // Load settings from localStorage
            this.loadSettings();
            
            // Initialize UI components
            this.initializeUI();
            
            // Load knowledge base
            await this.loadKnowledgeBase();
            
            // Initialize graph visualization
            this.initializeGraph();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Apply theme
            this.applyTheme();
            
            // Hide loading screen
            this.hideLoading();
            
            console.log('✅ Knowledge Explorer initialized successfully');
            this.showToast('Welcome to Knowledge Explorer!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize Knowledge Explorer:', error);
            this.showError('Failed to initialize application', error.message);
        }
    }

    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('knowledge-explorer-settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (error) {
                console.warn('Failed to load settings:', error);
            }
        }
        
        // Load favorites
        const savedFavorites = localStorage.getItem('knowledge-explorer-favorites');
        if (savedFavorites) {
            try {
                this.favorites = new Set(JSON.parse(savedFavorites));
            } catch (error) {
                console.warn('Failed to load favorites:', error);
            }
        }
        
        // Load history
        const savedHistory = localStorage.getItem('knowledge-explorer-history');
        if (savedHistory) {
            try {
                this.history = JSON.parse(savedHistory);
            } catch (error) {
                console.warn('Failed to load history:', error);
            }
        }
    }

    saveSettings() {
        localStorage.setItem('knowledge-explorer-settings', JSON.stringify(this.settings));
        localStorage.setItem('knowledge-explorer-favorites', JSON.stringify([...this.favorites]));
        localStorage.setItem('knowledge-explorer-history', JSON.stringify(this.history));
    }

    async loadKnowledgeBase() {
        try {
            // Try to load from local file first
            let response = await fetch('./data/knowledge_base.json');
            
            if (!response.ok) {
                // Fallback to original location
                response = await fetch('./knowledge_base.json');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.processKnowledgeBase(data);
            
        } catch (error) {
            console.warn('Failed to load knowledge base, using sample data:', error);
            this.loadSampleData();
        }
    }

    processKnowledgeBase(data) {
        // Convert data to internal format
        for (const [name, concept] of Object.entries(data)) {
            const processedConcept = {
                id: this.generateId(name),
                name: name,
                definitions: concept.definitions || [concept.definition || ''].filter(Boolean),
                parents: concept.parents || (concept.parent ? [concept.parent] : []),
                children: concept.children || [],
                siblings: concept.siblings || [],
                related: concept.related || [],
                category: concept.category || 'general',
                tags: concept.tags || [],
                examples: concept.examples || [],
                metadata: {
                    created: concept.created || new Date().toISOString(),
                    updated: concept.updated || new Date().toISOString(),
                    views: concept.views || 0,
                    difficulty: concept.difficulty || 1,
                    popularity: concept.popularity || 0
                }
            };
            
            this.data.set(name, processedConcept);
        }
        
        // Build search index
        this.buildSearchIndex();
        
        // Update UI
        this.updateStats();
        this.updateCategories();
        this.updateRecentAndFavorites();
        
        console.log(`📚 Loaded ${this.data.size} concepts`);
    }

    loadSampleData() {
        const sampleData = {
            'Data Science': {
                definitions: ['The field of study that combines domain expertise, programming skills, and knowledge of mathematics and statistics to extract meaningful insights from data.'],
                parents: ['Computer Science', 'Statistics', 'Mathematics'],
                children: ['Machine Learning', 'Data Analysis', 'Big Data', 'Data Visualization'],
                siblings: ['Artificial Intelligence', 'Software Engineering'],
                category: 'technology',
                tags: ['data', 'analysis', 'statistics']
            },
            'Machine Learning': {
                definitions: ['A subset of artificial intelligence that provides systems the ability to automatically learn and improve from experience without being explicitly programmed.'],
                parents: ['Data Science', 'Artificial Intelligence'],
                children: ['Deep Learning', 'Neural Networks', 'Supervised Learning', 'Unsupervised Learning'],
                siblings: ['Data Mining', 'Pattern Recognition'],
                category: 'technology',
                tags: ['AI', 'algorithms', 'learning']
            },
            'Artificial Intelligence': {
                definitions: ['The simulation of human intelligence in machines that are programmed to think and learn like humans.'],
                parents: ['Computer Science'],
                children: ['Machine Learning', 'Natural Language Processing', 'Computer Vision', 'Robotics'],
                siblings: ['Data Science', 'Cognitive Science'],
                category: 'technology',
                tags: ['AI', 'intelligence', 'automation']
            }
        };
        
        this.processKnowledgeBase(sampleData);
    }

    generateId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    buildSearchIndex() {
        this.searchIndex = Array.from(this.data.keys()).sort();
    }

    initializeUI() {
        // Initialize search
        this.searchManager = new SearchManager(this);
        
        // Initialize graph
        this.graphManager = new GraphManager(this);
        
        // Initialize UI manager
        this.uiManager = new UIManager(this);
    }

    initializeGraph() {
        this.graphManager.initialize();
        this.renderGraph();
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Settings modal
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.uiManager.showModal('settings-modal');
        });
        
        // Help modal
        document.getElementById('help-btn')?.addEventListener('click', () => {
            this.uiManager.showModal('help-modal');
        });
        
        // Export functionality
        document.getElementById('export-btn')?.addEventListener('click', () => {
            this.uiManager.showModal('export-modal');
        });
        
        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.closest('.view-btn').id.replace('-btn', ''));
            });
        });
        
        // Sidebar toggle
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.uiManager.hideModal(modal.id);
            });
        });
        
        // Settings handlers
        this.setupSettingsHandlers();
        
        // Export handlers
        this.setupExportHandlers();
    }

    setupSettingsHandlers() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.applyTheme();
                this.saveSettings();
            });
        }
        
        const animationSpeed = document.getElementById('animation-speed');
        if (animationSpeed) {
            animationSpeed.value = this.settings.animationSpeed;
            animationSpeed.addEventListener('input', (e) => {
                this.settings.animationSpeed = parseFloat(e.target.value);
                this.saveSettings();
            });
        }
        
        const autoExpand = document.getElementById('auto-expand');
        if (autoExpand) {
            autoExpand.checked = this.settings.autoExpand;
            autoExpand.addEventListener('change', (e) => {
                this.settings.autoExpand = e.target.checked;
                this.saveSettings();
            });
        }
        
        const showTooltips = document.getElementById('show-tooltips');
        if (showTooltips) {
            showTooltips.checked = this.settings.showTooltips;
            showTooltips.addEventListener('change', (e) => {
                this.settings.showTooltips = e.target.checked;
                this.saveSettings();
            });
        }
    }

    setupExportHandlers() {
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('.export-btn').dataset.format;
                this.exportData(format);
            });
        });
    }

    applyTheme() {
        const body = document.body;
        body.className = body.className.replace(/\w+-theme/g, '');
        body.classList.add(`${this.settings.theme}-theme`);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (this.settings.theme === 'dark') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
    }

    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveSettings();
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('collapsed');
    }

    switchView(viewType) {
        // Update active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${viewType}-btn`)?.classList.add('active');
        
        // Switch view panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(viewType)?.classList.add('active');
        
        // Render appropriate view
        switch (viewType) {
            case 'graph-view':
                this.renderGraph();
                break;
            case 'tree-view':
                this.renderTree();
                break;
            case 'list-view':
                this.renderList();
                break;
        }
    }

    renderGraph() {
        if (this.graphManager) {
            this.graphManager.render(this.data);
        }
    }

    renderTree() {
        // Tree view implementation
        console.log('Rendering tree view...');
    }

    renderList() {
        const grid = document.getElementById('concept-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (const [name, concept] of this.data) {
            const card = document.createElement('div');
            card.className = 'concept-card';
            card.innerHTML = `
                <h4>${name}</h4>
                <p>${concept.definitions[0] || 'No definition available'}</p>
                <div class="concept-meta">
                    <span>${concept.category}</span>
                    <span>${concept.metadata.views} views</span>
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.selectConcept(name);
            });
            
            grid.appendChild(card);
        }
    }

    selectConcept(conceptName) {
        const concept = this.data.get(conceptName);
        if (!concept) return;
        
        this.currentConcept = conceptName;
        
        // Add to history
        if (!this.history.includes(conceptName)) {
            this.history.unshift(conceptName);
            this.history = this.history.slice(0, 10); // Keep last 10
        }
        
        // Update views
        concept.metadata.views++;
        
        // Update UI
        this.updateConceptDetails(concept);
        this.updateBreadcrumb(conceptName);
        this.updateRecentAndFavorites();
        
        // Highlight in graph
        if (this.graphManager) {
            this.graphManager.highlightNode(conceptName);
        }
        
        this.saveSettings();
    }

    updateConceptDetails(concept) {
        const panel = document.getElementById('details-panel');
        const title = document.getElementById('concept-title');
        const content = document.getElementById('panel-content');
        
        if (!panel || !title || !content) return;
        
        title.textContent = concept.name;
        
        content.innerHTML = `
            <div class="concept-details">
                <div class="concept-section">
                    <h5>Definition</h5>
                    <p>${concept.definitions[0] || 'No definition available'}</p>
                </div>
                
                ${concept.parents.length > 0 ? `
                    <div class="concept-section">
                        <h5>Parent Concepts</h5>
                        <div class="concept-links">
                            ${concept.parents.map(parent => 
                                `<span class="concept-link" data-concept="${parent}">${parent}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${concept.children.length > 0 ? `
                    <div class="concept-section">
                        <h5>Child Concepts</h5>
                        <div class="concept-links">
                            ${concept.children.map(child => 
                                `<span class="concept-link" data-concept="${child}">${child}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${concept.siblings.length > 0 ? `
                    <div class="concept-section">
                        <h5>Related Concepts</h5>
                        <div class="concept-links">
                            ${concept.siblings.map(sibling => 
                                `<span class="concept-link" data-concept="${sibling}">${sibling}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="concept-section">
                    <h5>Metadata</h5>
                    <div class="concept-meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Category:</span>
                            <span class="meta-value">${concept.category}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Views:</span>
                            <span class="meta-value">${concept.metadata.views}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Difficulty:</span>
                            <span class="meta-value">${'★'.repeat(concept.metadata.difficulty)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers for concept links
        content.querySelectorAll('.concept-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const conceptName = e.target.dataset.concept;
                this.selectConcept(conceptName);
            });
        });
        
        // Update favorite button
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            const icon = favoriteBtn.querySelector('i');
            if (this.favorites.has(concept.name)) {
                icon.className = 'fas fa-heart';
                favoriteBtn.classList.add('active');
            } else {
                icon.className = 'far fa-heart';
                favoriteBtn.classList.remove('active');
            }
        }
        
        panel.classList.remove('hidden');
    }

    updateBreadcrumb(conceptName) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        
        breadcrumb.innerHTML = `
            <span class="breadcrumb-item" data-concept="home">Home</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item active">${conceptName}</span>
        `;
        
        breadcrumb.querySelectorAll('.breadcrumb-item[data-concept]').forEach(item => {
            item.addEventListener('click', (e) => {
                const concept = e.target.dataset.concept;
                if (concept === 'home') {
                    this.clearSelection();
                } else {
                    this.selectConcept(concept);
                }
            });
        });
    }

    updateStats() {
        const totalConcepts = document.getElementById('total-concepts');
        const connections = document.getElementById('connections');
        
        if (totalConcepts) {
            totalConcepts.textContent = this.data.size;
        }
        
        if (connections) {
            let connectionCount = 0;
            for (const concept of this.data.values()) {
                connectionCount += concept.parents.length + concept.children.length + concept.siblings.length;
            }
            connections.textContent = Math.floor(connectionCount / 2); // Avoid double counting
        }
    }

    updateCategories() {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) return;
        
        const categories = new Set();
        for (const concept of this.data.values()) {
            categories.add(concept.category);
        }
        
        categoriesList.innerHTML = '';
        for (const category of categories) {
            const tag = document.createElement('span');
            tag.className = 'category-tag';
            tag.textContent = category;
            tag.addEventListener('click', () => {
                this.filterByCategory(category);
            });
            categoriesList.appendChild(tag);
        }
    }

    updateRecentAndFavorites() {
        // Update recent list
        const recentList = document.getElementById('recent-list');
        if (recentList) {
            recentList.innerHTML = '';
            this.history.slice(0, 5).forEach(conceptName => {
                const item = document.createElement('div');
                item.className = 'concept-item';
                item.textContent = conceptName;
                item.addEventListener('click', () => {
                    this.selectConcept(conceptName);
                });
                recentList.appendChild(item);
            });
        }
        
        // Update favorites list
        const favoritesList = document.getElementById('favorites-list');
        if (favoritesList) {
            favoritesList.innerHTML = '';
            Array.from(this.favorites).slice(0, 5).forEach(conceptName => {
                const item = document.createElement('div');
                item.className = 'concept-item';
                item.textContent = conceptName;
                item.addEventListener('click', () => {
                    this.selectConcept(conceptName);
                });
                favoritesList.appendChild(item);
            });
        }
    }

    toggleFavorite(conceptName) {
        if (this.favorites.has(conceptName)) {
            this.favorites.delete(conceptName);
            this.showToast(`Removed ${conceptName} from favorites`, 'success');
        } else {
            this.favorites.add(conceptName);
            this.showToast(`Added ${conceptName} to favorites`, 'success');
        }
        
        this.updateRecentAndFavorites();
        this.saveSettings();
        
        // Update favorite button if this is the current concept
        if (this.currentConcept === conceptName) {
            const concept = this.data.get(conceptName);
            if (concept) {
                this.updateConceptDetails(concept);
            }
        }
    }

    clearSelection() {
        this.currentConcept = null;
        this.selectedNodes.clear();
        
        const panel = document.getElementById('details-panel');
        panel?.classList.add('hidden');
        
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = '';
        }
        
        if (this.graphManager) {
            this.graphManager.clearHighlight();
        }
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+/ - Focus search
        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }
        
        // Escape - Clear selection
        if (e.key === 'Escape') {
            this.clearSelection();
        }
        
        // Space - Center view
        if (e.key === ' ' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            if (this.graphManager) {
                this.graphManager.centerView();
            }
        }
        
        // +/- - Zoom
        if (e.key === '+' || e.key === '=') {
            if (this.graphManager) {
                this.graphManager.zoomIn();
            }
        }
        if (e.key === '-') {
            if (this.graphManager) {
                this.graphManager.zoomOut();
            }
        }
    }

    exportData(format) {
        try {
            switch (format) {
                case 'json':
                    this.exportJSON();
                    break;
                case 'png':
                    this.exportPNG();
                    break;
                case 'svg':
                    this.exportSVG();
                    break;
                case 'pdf':
                    this.exportPDF();
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast(`Export failed: ${error.message}`, 'error');
        }
    }

    exportJSON() {
        const data = Object.fromEntries(this.data);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, 'knowledge-base.json');
        this.showToast('Knowledge base exported as JSON', 'success');
    }

    exportPNG() {
        if (this.graphManager) {
            this.graphManager.exportPNG();
        }
    }

    exportSVG() {
        if (this.graphManager) {
            this.graphManager.exportSVG();
        }
    }

    exportPDF() {
        // PDF export would require additional library
        this.showToast('PDF export not yet implemented', 'warning');
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 
                    type === 'error' ? 'times-circle' : 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    showError(title, message) {
        const content = document.querySelector('.visualization-container');
        if (!content) return;
        
        content.innerHTML = `
            <div class="graph-error">
                <i class="fas fa-exclamation-triangle graph-error-icon"></i>
                <h3 class="graph-error-title">${title}</h3>
                <p class="graph-error-message">${message}</p>
                <button class="graph-error-button" onclick="location.reload()">
                    Reload Application
                </button>
            </div>
        `;
    }

    // API methods for external integration
    addConcept(name, data) {
        const concept = {
            id: this.generateId(name),
            name: name,
            ...data,
            metadata: {
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                views: 0,
                ...data.metadata
            }
        };
        
        this.data.set(name, concept);
        this.buildSearchIndex();
        this.updateStats();
        this.renderGraph();
        
        return concept;
    }

    removeConcept(name) {
        if (this.data.delete(name)) {
            this.buildSearchIndex();
            this.updateStats();
            this.renderGraph();
            return true;
        }
        return false;
    }

    updateConcept(name, data) {
        const concept = this.data.get(name);
        if (concept) {
            Object.assign(concept, data);
            concept.metadata.updated = new Date().toISOString();
            this.renderGraph();
            return concept;
        }
        return null;
    }

    search(query) {
        return this.searchManager ? this.searchManager.search(query) : [];
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.knowledgeExplorer = new KnowledgeExplorer();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnowledgeExplorer;
}

