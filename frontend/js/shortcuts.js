/**
 * Keyboard Shortcuts Manager
 * Handles all keyboard shortcuts across the application
 */

const KeyboardShortcuts = {
    // Registered shortcuts
    shortcuts: new Map(),

    // Active context (e.g., 'editor', 'gallery', 'modal')
    context: 'default',

    // Initialize
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.registerDefaults();
    },

    // Register a shortcut
    register(key, callback, options = {}) {
        const id = this.getShortcutId(key, options);
        this.shortcuts.set(id, {
            key,
            callback,
            description: options.description || '',
            context: options.context || 'default',
            preventDefault: options.preventDefault !== false
        });
    },

    // Unregister a shortcut
    unregister(key, options = {}) {
        const id = this.getShortcutId(key, options);
        this.shortcuts.delete(id);
    },

    // Get shortcut ID
    getShortcutId(key, options) {
        const parts = [];
        if (options.ctrl) parts.push('ctrl');
        if (options.alt) parts.push('alt');
        if (options.shift) parts.push('shift');
        if (options.meta) parts.push('meta');
        parts.push(key.toLowerCase());
        return parts.join('+');
    },

    // Handle keydown event
    handleKeyDown(e) {
        // Skip if in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Allow some shortcuts even in inputs
            if (!e.ctrlKey && !e.metaKey) return;
        }

        const id = this.getShortcutId(e.key, {
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
            meta: e.metaKey
        });

        const shortcut = this.shortcuts.get(id);
        
        if (shortcut && (shortcut.context === 'default' || shortcut.context === this.context)) {
            if (shortcut.preventDefault) {
                e.preventDefault();
            }
            shortcut.callback(e);
        }
    },

    // Set context
    setContext(context) {
        this.context = context;
    },

    // Register default shortcuts
    registerDefaults() {
        // Editor shortcuts
        this.register('z', () => {
            if (typeof aiAgent !== 'undefined' && aiAgent) {
                aiAgent.undo();
            } else if (typeof editor !== 'undefined') {
                editor.undo();
            }
        }, { ctrl: true, description: 'Undo', context: 'editor' });

        this.register('y', () => {
            if (typeof aiAgent !== 'undefined' && aiAgent) {
                aiAgent.redo();
            } else if (typeof editor !== 'undefined') {
                editor.redo();
            }
        }, { ctrl: true, description: 'Redo', context: 'editor' });

        this.register('z', () => {
            if (typeof aiAgent !== 'undefined' && aiAgent) {
                aiAgent.redo();
            } else if (typeof editor !== 'undefined') {
                editor.redo();
            }
        }, { ctrl: true, shift: true, description: 'Redo', context: 'editor' });

        this.register('d', () => {
            if (typeof editor !== 'undefined') editor.duplicateElement();
        }, { ctrl: true, description: 'Duplicate', context: 'editor' });

        this.register('Delete', () => {
            if (typeof editor !== 'undefined') editor.deleteElement();
        }, { description: 'Delete selected', context: 'editor' });

        this.register('Backspace', () => {
            if (typeof editor !== 'undefined') editor.deleteElement();
        }, { description: 'Delete selected', context: 'editor' });

        // Tool shortcuts
        this.register('v', () => {
            if (typeof editor !== 'undefined') editor.setTool('select');
        }, { description: 'Select tool', context: 'editor' });

        this.register('t', () => {
            if (typeof editor !== 'undefined') editor.setTool('text');
        }, { description: 'Text tool', context: 'editor' });

        this.register('m', () => {
            if (typeof editor !== 'undefined') editor.setTool('move');
        }, { description: 'Move tool', context: 'editor' });

        // Zoom shortcuts
        this.register('=', () => {
            if (typeof editor !== 'undefined') editor.zoomIn();
        }, { ctrl: true, description: 'Zoom in', context: 'editor' });

        this.register('-', () => {
            if (typeof editor !== 'undefined') editor.zoomOut();
        }, { ctrl: true, description: 'Zoom out', context: 'editor' });

        this.register('0', () => {
            if (typeof editor !== 'undefined') editor.zoomFit();
        }, { ctrl: true, description: 'Fit to screen', context: 'editor' });

        // Save/Export
        this.register('s', () => {
            if (typeof editor !== 'undefined') editor.save();
        }, { ctrl: true, description: 'Save', context: 'editor' });

        this.register('e', () => {
            if (typeof ExportModal !== 'undefined') {
                ExportModal.open(editor?.canvas, editor?.elements);
            }
        }, { ctrl: true, description: 'Export', context: 'editor' });

        // Escape to deselect
        this.register('Escape', () => {
            if (typeof editor !== 'undefined') {
                editor.selectElement(null);
            }
            // Close any open modals
            document.querySelectorAll('.modal-backdrop.active').forEach(m => {
                m.classList.remove('active');
            });
        }, { description: 'Deselect / Close modal' });

        // Help
        this.register('?', () => {
            this.showHelp();
        }, { shift: true, description: 'Show keyboard shortcuts' });
    },

    // Get all shortcuts for current context
    getShortcuts() {
        const result = [];
        this.shortcuts.forEach((shortcut, id) => {
            if (shortcut.context === 'default' || shortcut.context === this.context) {
                result.push({
                    id,
                    ...shortcut
                });
            }
        });
        return result;
    },

    // Format shortcut for display
    formatShortcut(id) {
        const parts = id.split('+');
        return parts.map(p => {
            switch (p) {
                case 'ctrl': return '⌘/Ctrl';
                case 'alt': return 'Alt';
                case 'shift': return '⇧';
                case 'meta': return '⌘';
                default: return p.toUpperCase();
            }
        }).join(' + ');
    },

    // Show help modal
    showHelp() {
        const shortcuts = this.getShortcuts();
        
        let modal = document.getElementById('shortcutsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'shortcutsModal';
            modal.className = 'modal-backdrop';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-keyboard"></i>
                        Keyboard Shortcuts
                    </h3>
                    <button class="modal-close" onclick="KeyboardShortcuts.hideHelp()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid">
                        ${shortcuts.map(s => `
                            <div class="shortcut-item">
                                <kbd class="shortcut-key">${this.formatShortcut(s.id)}</kbd>
                                <span class="shortcut-desc">${s.description}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideHelp();
        });
    },

    // Hide help modal
    hideHelp() {
        const modal = document.getElementById('shortcutsModal');
        if (modal) modal.classList.remove('active');
    }
};

// Inject styles
if (!document.getElementById('shortcuts-styles')) {
    const styles = document.createElement('style');
    styles.id = 'shortcuts-styles';
    styles.textContent = `
        .shortcuts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-3);
        }

        .shortcut-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-3);
            padding: var(--spacing-3);
            background: var(--dark-card);
            border-radius: var(--radius-lg);
        }

        .shortcut-key {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-1);
            padding: var(--spacing-1) var(--spacing-2);
            background: var(--dark-surface);
            border: 1px solid var(--dark-border);
            border-radius: var(--radius-md);
            font-family: monospace;
            font-size: var(--text-xs);
            color: var(--text-secondary);
            min-width: 80px;
            justify-content: center;
        }

        .shortcut-desc {
            font-size: var(--text-sm);
            color: var(--text-muted);
        }

        @media (max-width: 768px) {
            .shortcuts-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(styles);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    KeyboardShortcuts.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
}
