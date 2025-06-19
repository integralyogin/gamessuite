/**
 * API Manager - Handles external API calls and data fetching
 */

class APIManager {
    constructor() {
        this.baseUrl = './';
        this.timeout = 10000;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    // Generic HTTP request method
    async request(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.timeout,
            ...options
        };

        // Add timeout support
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);
        defaultOptions.signal = controller.signal;

        try {
            const response = await fetch(url, defaultOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // GET request
    async get(url, params = {}) {
        const urlObj = new URL(url, this.baseUrl);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                urlObj.searchParams.append(key, params[key]);
            }
        });

        return this.request(urlObj.toString());
    }

    // POST request
    async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }

    // Request with retry logic
    async requestWithRetry(url, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await this.request(url, options);
            } catch (error) {
                lastError = error;
                
                if (attempt === this.retryAttempts) {
                    break;
                }
                
                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    break;
                }
                
                // Wait before retrying with exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
                );
            }
        }
        
        throw lastError;
    }

    // Load knowledge base
    async loadKnowledgeBase() {
        try {
            // Try multiple possible locations
            const possibleUrls = [
                './data/knowledge_base.json',
                './knowledge_base.json',
                './sample_data.json'
            ];

            for (const url of possibleUrls) {
                try {
                    const data = await this.get(url);
                    console.log(`✅ Loaded knowledge base from ${url}`);
                    return data;
                } catch (error) {
                    console.warn(`Failed to load from ${url}:`, error.message);
                    continue;
                }
            }

            throw new Error('No knowledge base found at any location');
        } catch (error) {
            console.error('Failed to load knowledge base:', error);
            throw error;
        }
    }

    // Add new concept via API
    async addConcept(conceptData) {
        try {
            return await this.post('add_new_term.php', {
                term: conceptData.name,
                ...conceptData
            });
        } catch (error) {
            console.error('Failed to add concept:', error);
            throw error;
        }
    }

    // Update existing concept
    async updateConcept(conceptName, conceptData) {
        try {
            return await this.put(`concepts/${encodeURIComponent(conceptName)}`, conceptData);
        } catch (error) {
            console.error('Failed to update concept:', error);
            throw error;
        }
    }

    // Delete concept
    async deleteConcept(conceptName) {
        try {
            return await this.delete(`concepts/${encodeURIComponent(conceptName)}`);
        } catch (error) {
            console.error('Failed to delete concept:', error);
            throw error;
        }
    }

    // Search concepts
    async searchConcepts(query, filters = {}) {
        try {
            return await this.get('search', {
                q: query,
                ...filters
            });
        } catch (error) {
            console.error('Failed to search concepts:', error);
            throw error;
        }
    }

    // Get concept suggestions
    async getSuggestions(query) {
        try {
            return await this.get('suggestions', { q: query });
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return [];
        }
    }

    // Generate AI content for concept
    async generateAIContent(conceptName) {
        try {
            return await this.post('generate', {
                term: conceptName,
                type: 'full'
            });
        } catch (error) {
            console.error('Failed to generate AI content:', error);
            throw error;
        }
    }

    // Get related concepts
    async getRelatedConcepts(conceptName, limit = 10) {
        try {
            return await this.get('related', {
                concept: conceptName,
                limit: limit
            });
        } catch (error) {
            console.error('Failed to get related concepts:', error);
            return [];
        }
    }

    // Export data
    async exportData(format = 'json') {
        try {
            return await this.get('export', { format });
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    // Import data
    async importData(data, format = 'json') {
        try {
            return await this.post('import', {
                data: data,
                format: format
            });
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

    // Get analytics data
    async getAnalytics(timeRange = '7d') {
        try {
            return await this.get('analytics', { range: timeRange });
        } catch (error) {
            console.error('Failed to get analytics:', error);
            return null;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await this.get('health');
            return response.status === 'ok';
        } catch (error) {
            return false;
        }
    }

    // Batch operations
    async batchRequest(requests) {
        try {
            return await this.post('batch', { requests });
        } catch (error) {
            console.error('Failed to execute batch request:', error);
            throw error;
        }
    }

    // Upload file
    async uploadFile(file, endpoint = 'upload') {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(this.baseUrl + endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to upload file:', error);
            throw error;
        }
    }

    // Download file
    async downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(downloadUrl);
            return true;
        } catch (error) {
            console.error('Failed to download file:', error);
            throw error;
        }
    }

    // WebSocket connection for real-time updates
    connectWebSocket(url, handlers = {}) {
        try {
            const ws = new WebSocket(url);
            
            ws.onopen = (event) => {
                console.log('WebSocket connected');
                if (handlers.onOpen) handlers.onOpen(event);
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (handlers.onMessage) handlers.onMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            ws.onclose = (event) => {
                console.log('WebSocket disconnected');
                if (handlers.onClose) handlers.onClose(event);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (handlers.onError) handlers.onError(error);
            };
            
            return ws;
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            throw error;
        }
    }

    // Rate limiting
    createRateLimiter(maxRequests = 10, timeWindow = 60000) {
        const requests = [];
        
        return async (fn) => {
            const now = Date.now();
            
            // Remove old requests outside the time window
            while (requests.length > 0 && requests[0] < now - timeWindow) {
                requests.shift();
            }
            
            // Check if we've exceeded the rate limit
            if (requests.length >= maxRequests) {
                const waitTime = requests[0] + timeWindow - now;
                throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
            }
            
            // Add current request timestamp
            requests.push(now);
            
            // Execute the function
            return await fn();
        };
    }

    // Request interceptors
    addRequestInterceptor(interceptor) {
        this.requestInterceptors = this.requestInterceptors || [];
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(interceptor) {
        this.responseInterceptors = this.responseInterceptors || [];
        this.responseInterceptors.push(interceptor);
    }

    // Apply interceptors
    async applyRequestInterceptors(config) {
        if (this.requestInterceptors) {
            for (const interceptor of this.requestInterceptors) {
                config = await interceptor(config);
            }
        }
        return config;
    }

    async applyResponseInterceptors(response) {
        if (this.responseInterceptors) {
            for (const interceptor of this.responseInterceptors) {
                response = await interceptor(response);
            }
        }
        return response;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}

