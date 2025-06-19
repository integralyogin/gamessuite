/**
 * UI Manager - Handles user interface interactions, modals, and notifications
 */

class UIManager {
    constructor(app) {
        this.app = app;
        this.activeModals = new Set();
        this.notifications = [];
        this.animationSpeed = 1;
        
        this.initialize();
    }

    initialize() {
        this.setupModalHandlers();
        this.setupPanelHandlers();
        this.setupKeyboardShortcuts();
        this.setupResponsiveHandlers();
    }

    setupModalHandlers() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Close modals with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                const lastModal = Array.from(this.activeModals).pop();
                this.hideModal(lastModal);
            }
        });
    }

    setupPanelHandlers() {
        // Details panel handlers
        const favoriteBtn = document.getElementById('favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                if (this.app.currentConcept) {
                    this.app.toggleFavorite(this.app.currentConcept);
                }
            });
        }

        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareCurrentConcept();
            });
        }

        const closePanelBtn = document.getElementById('close-panel-btn');
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', () => {
                this.app.clearSelection();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.matches('input, textarea, select')) {
                return;
            }

            switch (e.key) {
                case '?':
                    e.preventDefault();
                    this.showModal('help-modal');
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showModal('settings-modal');
                    }
                    break;
                case 'e':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showModal('export-modal');
                    }
                    break;
                case 'f':
                    if (this.app.currentConcept) {
                        e.preventDefault();
                        this.app.toggleFavorite(this.app.currentConcept);
                    }
                    break;
            }
        });
    }

    setupResponsiveHandlers() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} not found`);
            return;
        }

        modal.classList.add('active');
        this.activeModals.add(modalId);

        // Focus management
        const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('active');
        this.activeModals.delete(modalId);

        // Restore body scroll if no modals are open
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }
    }

    hideAllModals() {
        this.activeModals.forEach(modalId => {
            this.hideModal(modalId);
        });
    }

    showNotification(message, type = 'info', duration = 3000, actions = []) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration,
            actions
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, duration);
        }

        return notification.id;
    }

    renderNotification(notification) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${notification.type}`;
        toast.dataset.notificationId = notification.id;

        const icon = this.getNotificationIcon(notification.type);
        
        let actionsHtml = '';
        if (notification.actions && notification.actions.length > 0) {
            actionsHtml = `
                <div class="toast-actions">
                    ${notification.actions.map(action => 
                        `<button class="toast-action" data-action="${action.id}">${action.label}</button>`
                    ).join('')}
                </div>
            `;
        }

        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${notification.message}</div>
                ${actionsHtml}
            </div>
            <button class="toast-close" onclick="window.knowledgeExplorer.uiManager.removeNotification(${notification.id})">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add action handlers
        toast.querySelectorAll('.toast-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const actionId = e.target.dataset.action;
                const action = notification.actions.find(a => a.id === actionId);
                if (action && action.handler) {
                    action.handler();
                }
                this.removeNotification(notification.id);
            });
        });

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
    }

    removeNotification(notificationId) {
        const toast = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }

        // Remove from array
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }

    shareCurrentConcept() {
        if (!this.app.currentConcept) return;

        const concept = this.app.data.get(this.app.currentConcept);
        if (!concept) return;

        const shareData = {
            title: `Knowledge Explorer - ${concept.name}`,
            text: concept.definitions[0] || 'Explore this concept in Knowledge Explorer',
            url: window.location.href + `#concept=${encodeURIComponent(concept.name)}`
        };

        if (navigator.share) {
            // Use native sharing if available
            navigator.share(shareData).catch(err => {
                console.log('Error sharing:', err);
                this.fallbackShare(shareData);
            });
        } else {
            this.fallbackShare(shareData);
        }
    }

    fallbackShare(shareData) {
        // Copy to clipboard
        const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.showNotification('Link copied to clipboard!', 'success');
            }).catch(() => {
                this.showShareModal(shareData);
            });
        } else {
            this.showShareModal(shareData);
        }
    }

    showShareModal(shareData) {
        // Create a temporary modal for sharing
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Share Concept</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="share-options">
                        <div class="share-url">
                            <label>Share URL:</label>
                            <input type="text" value="${shareData.url}" readonly>
                            <button class="copy-btn">Copy</button>
                        </div>
                        <div class="share-social">
                            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}" target="_blank" class="share-btn twitter">
                                <i class="fab fa-twitter"></i> Twitter
                            </a>
                            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}" target="_blank" class="share-btn facebook">
                                <i class="fab fa-facebook"></i> Facebook
                            </a>
                            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}" target="_blank" class="share-btn linkedin">
                                <i class="fab fa-linkedin"></i> LinkedIn
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.copy-btn').addEventListener('click', () => {
            const input = modal.querySelector('input');
            input.select();
            document.execCommand('copy');
            this.showNotification('URL copied to clipboard!', 'success');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showConfirmDialog(message, onConfirm, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirm Action</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary cancel-btn">Cancel</button>
                        <button class="btn btn-primary confirm-btn">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');

        confirmBtn.addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        });

        confirmBtn.focus();
    }

    showProgressDialog(title, message) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <div class="progress-content">
                        <div class="progress-spinner"></div>
                        <p>${message}</p>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        return {
            updateProgress: (percent) => {
                const fill = modal.querySelector('.progress-fill');
                if (fill) {
                    fill.style.width = `${percent}%`;
                }
            },
            updateMessage: (newMessage) => {
                const p = modal.querySelector('.progress-content p');
                if (p) {
                    p.textContent = newMessage;
                }
            },
            close: () => {
                modal.remove();
            }
        };
    }

    handleResize() {
        // Update graph dimensions
        if (this.app.graphManager) {
            this.app.graphManager.handleResize();
        }

        // Adjust UI for mobile
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile', isMobile);

        // Close sidebar on mobile when resizing to desktop
        if (!isMobile) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('collapsed');
            }
        }
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        document.documentElement.style.setProperty('--animation-speed', speed);
    }

    showLoadingState(element, message = 'Loading...') {
        if (!element) return;

        element.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    showErrorState(element, title, message, onRetry) {
        if (!element) return;

        const retryButton = onRetry ? `<button class="retry-btn" onclick="(${onRetry})()">Retry</button>` : '';
        
        element.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle error-icon"></i>
                <h3>${title}</h3>
                <p>${message}</p>
                ${retryButton}
            </div>
        `;
    }

    showEmptyState(element, title, message, actionText, onAction) {
        if (!element) return;

        const actionButton = onAction ? `<button class="action-btn" onclick="(${onAction})()">${actionText}</button>` : '';
        
        element.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox empty-icon"></i>
                <h3>${title}</h3>
                <p>${message}</p>
                ${actionButton}
            </div>
        `;
    }

    // Utility methods for common UI patterns
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    slideDown(element, duration = 300) {
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight;
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = (targetHeight * progress) + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }

    slideUp(element, duration = 300) {
        const startHeight = element.offsetHeight;
        const start = performance.now();
        
        element.style.overflow = 'hidden';
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = (startHeight * (1 - progress)) + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }
}

