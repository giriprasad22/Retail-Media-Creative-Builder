/**
 * Layer Manager - Layer panel for canvas editor
 */

const LayerManager = {
    // Layers array (reference to editor elements)
    layers: [],

    // Selected layer id
    selectedId: null,

    // Drag state
    dragging: null,
    dragOver: null,

    // Callbacks
    onSelect: null,
    onReorder: null,
    onDelete: null,
    onVisibilityChange: null,
    onLockChange: null,

    // Initialize
    init(options = {}) {
        this.onSelect = options.onSelect || (() => {});
        this.onReorder = options.onReorder || (() => {});
        this.onDelete = options.onDelete || (() => {});
        this.onVisibilityChange = options.onVisibilityChange || (() => {});
        this.onLockChange = options.onLockChange || (() => {});
        
        this.injectStyles();
    },

    // Set layers
    setLayers(layers) {
        this.layers = layers;
        this.render();
    },

    // Select layer
    select(id) {
        this.selectedId = id;
        this.onSelect(id);
        this.render();
    },

    // Toggle visibility
    toggleVisibility(id) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            layer.visible = !layer.visible;
            this.onVisibilityChange(id, layer.visible);
            this.render();
        }
    },

    // Toggle lock
    toggleLock(id) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            layer.locked = !layer.locked;
            this.onLockChange(id, layer.locked);
            this.render();
        }
    },

    // Delete layer
    delete(id) {
        if (confirm('Delete this layer?')) {
            this.onDelete(id);
            if (this.selectedId === id) {
                this.selectedId = null;
            }
        }
    },

    // Duplicate layer
    duplicate(id) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            const newLayer = {
                ...JSON.parse(JSON.stringify(layer)),
                id: `layer-${Date.now()}`,
                name: `${layer.name} Copy`
            };
            // Insert after current layer
            const index = this.layers.indexOf(layer);
            this.layers.splice(index + 1, 0, newLayer);
            this.onReorder(this.layers);
            this.render();
        }
    },

    // Move layer up (visually down in z-order)
    moveUp(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index > 0) {
            [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
            this.onReorder(this.layers);
            this.render();
        }
    },

    // Move layer down
    moveDown(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index < this.layers.length - 1) {
            [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
            this.onReorder(this.layers);
            this.render();
        }
    },

    // Rename layer
    rename(id, newName) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            layer.name = newName;
            this.render();
        }
    },

    // Start inline rename
    startRename(id) {
        const nameEl = document.querySelector(`[data-layer-id="${id}"] .layer-name`);
        if (!nameEl) return;

        const layer = this.layers.find(l => l.id === id);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = layer.name;
        input.className = 'layer-name-input';
        
        input.onblur = () => {
            this.rename(id, input.value || layer.name);
        };
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = layer.name;
                input.blur();
            }
        };

        nameEl.replaceWith(input);
        input.focus();
        input.select();
    },

    // Handle drag start
    handleDragStart(e, id) {
        this.dragging = id;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    },

    // Handle drag over
    handleDragOver(e, id) {
        e.preventDefault();
        if (this.dragging === id) return;
        
        this.dragOver = id;
        
        // Show drop indicator
        document.querySelectorAll('.layer-item').forEach(el => {
            el.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
            target.classList.add('drag-over-top');
        } else {
            target.classList.add('drag-over-bottom');
        }
    },

    // Handle drop
    handleDrop(e, targetId) {
        e.preventDefault();
        
        if (!this.dragging || this.dragging === targetId) return;
        
        const fromIndex = this.layers.findIndex(l => l.id === this.dragging);
        const toIndex = this.layers.findIndex(l => l.id === targetId);
        
        // Remove from old position
        const [layer] = this.layers.splice(fromIndex, 1);
        
        // Insert at new position
        const adjustedIndex = fromIndex < toIndex ? toIndex : toIndex;
        this.layers.splice(adjustedIndex, 0, layer);
        
        this.onReorder(this.layers);
        this.dragging = null;
        this.dragOver = null;
        this.render();
    },

    // Handle drag end
    handleDragEnd(e) {
        this.dragging = null;
        this.dragOver = null;
        document.querySelectorAll('.layer-item').forEach(el => {
            el.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
        });
    },

    // Get layer icon based on type
    getLayerIcon(layer) {
        switch (layer.type) {
            case 'text': return '<i class="fas fa-font"></i>';
            case 'image': return '<i class="fas fa-image"></i>';
            case 'shape': return '<i class="fas fa-shapes"></i>';
            case 'rectangle': return '<i class="fas fa-square"></i>';
            case 'circle': return '<i class="fas fa-circle"></i>';
            case 'background': return '<i class="fas fa-fill"></i>';
            default: return '<i class="fas fa-layer-group"></i>';
        }
    },

    // Get layer thumbnail
    getLayerThumbnail(layer) {
        if (layer.type === 'image' && layer.src) {
            return `<img src="${layer.src}" alt="${layer.name}" class="layer-thumb-img">`;
        }
        if (layer.fill) {
            return `<div class="layer-thumb-color" style="background:${layer.fill}"></div>`;
        }
        return this.getLayerIcon(layer);
    },

    // Render
    render(containerId = 'layerPanel') {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Reverse for visual order (top = front)
        const reversed = [...this.layers].reverse();

        container.innerHTML = `
            <div class="layer-manager">
                <div class="layer-header">
                    <div class="layer-title">
                        <i class="fas fa-layer-group"></i>
                        Layers
                    </div>
                    <div class="layer-count">${this.layers.length}</div>
                </div>

                <div class="layer-list" id="layerList">
                    ${reversed.length === 0 ? `
                        <div class="layer-empty">
                            <i class="fas fa-plus-circle"></i>
                            <span>No layers yet</span>
                        </div>
                    ` : reversed.map((layer, i) => `
                        <div class="layer-item ${layer.id === this.selectedId ? 'selected' : ''} 
                                    ${layer.locked ? 'locked' : ''} 
                                    ${layer.visible === false ? 'hidden-layer' : ''}"
                             data-layer-id="${layer.id}"
                             draggable="true"
                             ondragstart="LayerManager.handleDragStart(event, '${layer.id}')"
                             ondragover="LayerManager.handleDragOver(event, '${layer.id}')"
                             ondrop="LayerManager.handleDrop(event, '${layer.id}')"
                             ondragend="LayerManager.handleDragEnd(event)"
                             onclick="LayerManager.select('${layer.id}')">
                            
                            <div class="layer-drag-handle">
                                <i class="fas fa-grip-vertical"></i>
                            </div>

                            <div class="layer-thumb">
                                ${this.getLayerThumbnail(layer)}
                            </div>

                            <div class="layer-info">
                                <span class="layer-name" ondblclick="LayerManager.startRename('${layer.id}')">${layer.name || 'Untitled'}</span>
                                <span class="layer-type">${layer.type}</span>
                            </div>

                            <div class="layer-actions">
                                <button class="layer-btn" 
                                        onclick="event.stopPropagation(); LayerManager.toggleVisibility('${layer.id}')"
                                        title="${layer.visible !== false ? 'Hide' : 'Show'}">
                                    <i class="fas fa-${layer.visible !== false ? 'eye' : 'eye-slash'}"></i>
                                </button>
                                <button class="layer-btn" 
                                        onclick="event.stopPropagation(); LayerManager.toggleLock('${layer.id}')"
                                        title="${layer.locked ? 'Unlock' : 'Lock'}">
                                    <i class="fas fa-${layer.locked ? 'lock' : 'unlock'}"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="layer-footer">
                    <button class="layer-footer-btn" onclick="LayerManager.addLayer('shape')" title="Add Shape">
                        <i class="fas fa-shapes"></i>
                    </button>
                    <button class="layer-footer-btn" onclick="LayerManager.addLayer('text')" title="Add Text">
                        <i class="fas fa-font"></i>
                    </button>
                    <button class="layer-footer-btn" onclick="LayerManager.addLayer('image')" title="Add Image">
                        <i class="fas fa-image"></i>
                    </button>
                    <span class="layer-footer-divider"></span>
                    <button class="layer-footer-btn" 
                            onclick="LayerManager.moveUp('${this.selectedId}')" 
                            title="Move Up"
                            ${!this.selectedId ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="layer-footer-btn" 
                            onclick="LayerManager.moveDown('${this.selectedId}')" 
                            title="Move Down"
                            ${!this.selectedId ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="layer-footer-btn" 
                            onclick="LayerManager.duplicate('${this.selectedId}')" 
                            title="Duplicate"
                            ${!this.selectedId ? 'disabled' : ''}>
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="layer-footer-btn danger" 
                            onclick="LayerManager.delete('${this.selectedId}')" 
                            title="Delete"
                            ${!this.selectedId ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    // Placeholder for add layer
    addLayer(type) {
        if (typeof Toast !== 'undefined') {
            Toast.info(`Add ${type} layer - integrate with Editor`);
        }
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('layer-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'layer-styles';
        styles.textContent = `
            .layer-manager {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--dark-bg);
            }

            .layer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-4);
                border-bottom: 1px solid var(--dark-border);
            }

            .layer-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-weight: var(--font-semibold);
            }

            .layer-title i {
                color: var(--primary-400);
            }

            .layer-count {
                background: var(--dark-card);
                padding: var(--spacing-1) var(--spacing-2);
                border-radius: var(--radius-full);
                font-size: var(--text-xs);
                color: var(--text-muted);
            }

            .layer-list {
                flex: 1;
                overflow-y: auto;
                padding: var(--spacing-2);
            }

            .layer-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--spacing-8);
                color: var(--text-muted);
                gap: var(--spacing-2);
            }

            .layer-item {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                padding: var(--spacing-2) var(--spacing-3);
                border-radius: var(--radius-lg);
                cursor: pointer;
                transition: all var(--transition-fast);
                margin-bottom: var(--spacing-1);
            }

            .layer-item:hover {
                background: var(--dark-card);
            }

            .layer-item.selected {
                background: rgba(99, 102, 241, 0.15);
                border: 1px solid rgba(99, 102, 241, 0.3);
            }

            .layer-item.hidden-layer {
                opacity: 0.5;
            }

            .layer-item.locked .layer-info {
                opacity: 0.7;
            }

            .layer-item.dragging {
                opacity: 0.5;
                background: var(--dark-surface);
            }

            .layer-item.drag-over-top {
                border-top: 2px solid var(--primary-500);
            }

            .layer-item.drag-over-bottom {
                border-bottom: 2px solid var(--primary-500);
            }

            .layer-drag-handle {
                color: var(--text-muted);
                cursor: grab;
                padding: var(--spacing-1);
            }

            .layer-drag-handle:active {
                cursor: grabbing;
            }

            .layer-thumb {
                width: 32px;
                height: 32px;
                border-radius: var(--radius-md);
                background: var(--dark-card);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-muted);
                overflow: hidden;
                flex-shrink: 0;
            }

            .layer-thumb-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .layer-thumb-color {
                width: 100%;
                height: 100%;
            }

            .layer-info {
                flex: 1;
                min-width: 0;
            }

            .layer-name {
                display: block;
                font-size: var(--text-sm);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .layer-name-input {
                width: 100%;
                padding: var(--spacing-1);
                background: var(--dark-card);
                border: 1px solid var(--primary-500);
                border-radius: var(--radius-sm);
                color: var(--text-primary);
                font-size: var(--text-sm);
            }

            .layer-type {
                display: block;
                font-size: var(--text-xs);
                color: var(--text-muted);
                text-transform: capitalize;
            }

            .layer-actions {
                display: flex;
                gap: var(--spacing-1);
                opacity: 0;
                transition: opacity var(--transition-fast);
            }

            .layer-item:hover .layer-actions,
            .layer-item.selected .layer-actions {
                opacity: 1;
            }

            .layer-btn {
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                border-radius: var(--radius-md);
                color: var(--text-muted);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .layer-btn:hover {
                background: var(--dark-surface);
                color: var(--text-primary);
            }

            .layer-footer {
                display: flex;
                align-items: center;
                gap: var(--spacing-1);
                padding: var(--spacing-3);
                border-top: 1px solid var(--dark-border);
                background: var(--dark-surface);
            }

            .layer-footer-btn {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--dark-card);
                border: none;
                border-radius: var(--radius-md);
                color: var(--text-secondary);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .layer-footer-btn:hover:not(:disabled) {
                background: var(--primary-500);
                color: white;
            }

            .layer-footer-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .layer-footer-btn.danger:hover:not(:disabled) {
                background: var(--error-500);
            }

            .layer-footer-divider {
                width: 1px;
                height: 20px;
                background: var(--dark-border);
                margin: 0 var(--spacing-2);
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    LayerManager.injectStyles();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayerManager;
}
