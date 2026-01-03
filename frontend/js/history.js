/**
 * History Panel - Visual undo/redo history
 */

const HistoryPanel = {
    // History entries
    entries: [],

    // Current position
    position: -1,

    // Max history size
    maxSize: 50,

    // Callback for state restore
    onRestore: null,

    // Initialize
    init(onRestore) {
        this.onRestore = onRestore;
        this.injectStyles();
    },

    // Add history entry
    push(state, description, thumbnail = null) {
        // Remove any entries after current position (redo branch)
        if (this.position < this.entries.length - 1) {
            this.entries = this.entries.slice(0, this.position + 1);
        }

        // Add new entry
        this.entries.push({
            id: `history-${Date.now()}`,
            timestamp: new Date(),
            description,
            state: JSON.parse(JSON.stringify(state)), // Deep clone
            thumbnail
        });

        // Limit size
        if (this.entries.length > this.maxSize) {
            this.entries.shift();
        }

        this.position = this.entries.length - 1;
        this.render();
    },

    // Undo
    undo() {
        if (this.position <= 0) {
            Toast.info('Nothing to undo');
            return null;
        }

        this.position--;
        const entry = this.entries[this.position];
        
        if (this.onRestore) {
            this.onRestore(entry.state);
        }

        this.render();
        return entry.state;
    },

    // Redo
    redo() {
        if (this.position >= this.entries.length - 1) {
            Toast.info('Nothing to redo');
            return null;
        }

        this.position++;
        const entry = this.entries[this.position];

        if (this.onRestore) {
            this.onRestore(entry.state);
        }

        this.render();
        return entry.state;
    },

    // Go to specific entry
    goTo(index) {
        if (index < 0 || index >= this.entries.length) return;

        this.position = index;
        const entry = this.entries[this.position];

        if (this.onRestore) {
            this.onRestore(entry.state);
        }

        this.render();
        return entry.state;
    },

    // Can undo
    canUndo() {
        return this.position > 0;
    },

    // Can redo
    canRedo() {
        return this.position < this.entries.length - 1;
    },

    // Clear history
    clear() {
        this.entries = [];
        this.position = -1;
        this.render();
    },

    // Format time
    formatTime(date) {
        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    },

    // Render history panel
    render(containerId = 'historyPanel') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="history-panel">
                <div class="history-header">
                    <div class="history-title">
                        <i class="fas fa-history"></i>
                        History
                    </div>
                    <div class="history-actions">
                        <button class="btn btn-ghost btn-xs" 
                                onclick="HistoryPanel.undo()" 
                                ${!this.canUndo() ? 'disabled' : ''}>
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn btn-ghost btn-xs" 
                                onclick="HistoryPanel.redo()"
                                ${!this.canRedo() ? 'disabled' : ''}>
                            <i class="fas fa-redo"></i>
                        </button>
                    </div>
                </div>

                <div class="history-list">
                    ${this.entries.length === 0 ? `
                        <div class="history-empty">
                            <i class="fas fa-clock"></i>
                            <span>No history yet</span>
                        </div>
                    ` : this.entries.slice().reverse().map((entry, i) => {
                        const index = this.entries.length - 1 - i;
                        const isActive = index === this.position;
                        return `
                            <div class="history-item ${isActive ? 'active' : ''} ${index > this.position ? 'future' : ''}" 
                                 onclick="HistoryPanel.goTo(${index})">
                                <div class="history-item-icon">
                                    ${this.getActionIcon(entry.description)}
                                </div>
                                <div class="history-item-content">
                                    <div class="history-item-title">${entry.description}</div>
                                    <div class="history-item-time">${this.formatTime(entry.timestamp)}</div>
                                </div>
                                ${isActive ? '<div class="history-item-marker"></div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${this.entries.length > 0 ? `
                    <div class="history-footer">
                        <button class="btn btn-ghost btn-xs" onclick="HistoryPanel.clear()">
                            <i class="fas fa-trash"></i>
                            Clear History
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Get icon for action type
    getActionIcon(description) {
        const lower = description.toLowerCase();
        if (lower.includes('add')) return '<i class="fas fa-plus"></i>';
        if (lower.includes('delete') || lower.includes('remove')) return '<i class="fas fa-trash"></i>';
        if (lower.includes('move')) return '<i class="fas fa-arrows-alt"></i>';
        if (lower.includes('resize')) return '<i class="fas fa-expand"></i>';
        if (lower.includes('color') || lower.includes('style')) return '<i class="fas fa-palette"></i>';
        if (lower.includes('text')) return '<i class="fas fa-font"></i>';
        if (lower.includes('image')) return '<i class="fas fa-image"></i>';
        if (lower.includes('generate')) return '<i class="fas fa-magic"></i>';
        return '<i class="fas fa-edit"></i>';
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('history-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'history-styles';
        styles.textContent = `
            .history-panel {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .history-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-4);
                border-bottom: 1px solid var(--dark-border);
            }

            .history-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-weight: var(--font-semibold);
            }

            .history-title i {
                color: var(--primary-400);
            }

            .history-actions {
                display: flex;
                gap: var(--spacing-1);
            }

            .history-list {
                flex: 1;
                overflow-y: auto;
                padding: var(--spacing-2);
            }

            .history-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--spacing-8);
                color: var(--text-muted);
                gap: var(--spacing-2);
            }

            .history-empty i {
                font-size: 2rem;
            }

            .history-item {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-3);
                border-radius: var(--radius-lg);
                cursor: pointer;
                transition: all var(--transition-fast);
                position: relative;
            }

            .history-item:hover {
                background: var(--dark-card);
            }

            .history-item.active {
                background: rgba(99, 102, 241, 0.1);
            }

            .history-item.future {
                opacity: 0.5;
            }

            .history-item-icon {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--dark-card);
                border-radius: var(--radius-md);
                color: var(--text-muted);
                font-size: var(--text-sm);
            }

            .history-item.active .history-item-icon {
                background: var(--primary-500);
                color: white;
            }

            .history-item-content {
                flex: 1;
                min-width: 0;
            }

            .history-item-title {
                font-size: var(--text-sm);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .history-item-time {
                font-size: var(--text-xs);
                color: var(--text-muted);
            }

            .history-item-marker {
                width: 8px;
                height: 8px;
                background: var(--primary-500);
                border-radius: 50%;
            }

            .history-footer {
                padding: var(--spacing-3);
                border-top: 1px solid var(--dark-border);
                text-align: center;
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    HistoryPanel.injectStyles();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryPanel;
}
