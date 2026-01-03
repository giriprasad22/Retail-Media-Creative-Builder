/**
 * Drag and Drop Upload Handler
 * Handles file uploads via drag and drop
 */

const DragDropUpload = {
    // Active drop zones
    dropZones: new Map(),

    // Global drag state
    isDragging: false,

    // Initialize
    init() {
        // Prevent default drag behaviors on document
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            document.addEventListener(event, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Global drag overlay
        document.addEventListener('dragenter', () => this.showGlobalOverlay());
        document.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
                this.hideGlobalOverlay();
            }
        });
        document.addEventListener('drop', () => this.hideGlobalOverlay());

        this.injectStyles();
    },

    // Register a drop zone
    register(element, options = {}) {
        const id = options.id || `dropzone-${Date.now()}`;
        
        const config = {
            id,
            element,
            accept: options.accept || '*',
            multiple: options.multiple !== false,
            maxSize: options.maxSize || 10 * 1024 * 1024, // 10MB default
            onDrop: options.onDrop || (() => {}),
            onError: options.onError || ((err) => console.error(err))
        };

        this.dropZones.set(id, config);
        this.setupDropZone(element, config);

        return id;
    },

    // Unregister a drop zone
    unregister(id) {
        this.dropZones.delete(id);
    },

    // Setup drop zone events
    setupDropZone(element, config) {
        element.classList.add('drop-zone');

        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!element.contains(e.relatedTarget)) {
                element.classList.remove('drag-over');
            }
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            this.handleDrop(e, config);
        });
    },

    // Handle file drop
    async handleDrop(e, config) {
        const files = this.getFilesFromEvent(e);
        
        if (!files.length) {
            config.onError({ type: 'no_files', message: 'No files dropped' });
            return;
        }

        // Filter and validate files
        const validFiles = [];
        const errors = [];

        for (const file of files) {
            // Check file type
            if (config.accept !== '*' && !this.matchesAccept(file, config.accept)) {
                errors.push({ file, type: 'type', message: `${file.name}: Invalid file type` });
                continue;
            }

            // Check file size
            if (file.size > config.maxSize) {
                errors.push({ file, type: 'size', message: `${file.name}: File too large (max ${this.formatSize(config.maxSize)})` });
                continue;
            }

            validFiles.push(file);

            // Limit to single file if not multiple
            if (!config.multiple) break;
        }

        // Report errors
        errors.forEach(err => config.onError(err));

        // Process valid files
        if (validFiles.length > 0) {
            config.onDrop(config.multiple ? validFiles : validFiles[0]);
        }
    },

    // Get files from drop event
    getFilesFromEvent(e) {
        const files = [];
        
        if (e.dataTransfer.items) {
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            }
        } else if (e.dataTransfer.files) {
            files.push(...e.dataTransfer.files);
        }

        return files;
    },

    // Check if file matches accept pattern
    matchesAccept(file, accept) {
        const patterns = accept.split(',').map(p => p.trim());
        
        for (const pattern of patterns) {
            if (pattern === '*') return true;
            if (pattern.startsWith('.')) {
                // Extension match
                if (file.name.toLowerCase().endsWith(pattern.toLowerCase())) return true;
            } else if (pattern.includes('/*')) {
                // MIME type wildcard
                const type = pattern.replace('/*', '');
                if (file.type.startsWith(type)) return true;
            } else {
                // Exact MIME type
                if (file.type === pattern) return true;
            }
        }

        return false;
    },

    // Format file size
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // Show global drag overlay
    showGlobalOverlay() {
        if (this.isDragging) return;
        this.isDragging = true;

        let overlay = document.getElementById('globalDropOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'globalDropOverlay';
            overlay.className = 'global-drop-overlay';
            overlay.innerHTML = `
                <div class="global-drop-content">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Drop files anywhere to upload</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        overlay.classList.add('active');
    },

    // Hide global drag overlay
    hideGlobalOverlay() {
        this.isDragging = false;
        const overlay = document.getElementById('globalDropOverlay');
        if (overlay) overlay.classList.remove('active');
    },

    // Create inline drop zone HTML
    createDropZone(options = {}) {
        const id = options.id || `dropzone-${Date.now()}`;
        const icon = options.icon || 'cloud-upload-alt';
        const title = options.title || 'Drop files here';
        const subtitle = options.subtitle || 'or click to browse';

        return `
            <div class="inline-drop-zone" id="${id}">
                <div class="inline-drop-zone-content">
                    <div class="inline-drop-zone-icon">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="inline-drop-zone-text">
                        <span class="inline-drop-zone-title">${title}</span>
                        <span class="inline-drop-zone-subtitle">${subtitle}</span>
                    </div>
                </div>
                <input type="file" class="inline-drop-zone-input" 
                       ${options.accept ? `accept="${options.accept}"` : ''}
                       ${options.multiple ? 'multiple' : ''}>
            </div>
        `;
    },

    // Setup inline drop zone after rendering
    setupInlineDropZone(id, onFileSelect) {
        const zone = document.getElementById(id);
        if (!zone) return;

        const input = zone.querySelector('.inline-drop-zone-input');

        // Click to browse
        zone.addEventListener('click', () => input.click());

        // File input change
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                onFileSelect(Array.from(e.target.files));
            }
        });

        // Register as drop zone
        this.register(zone, {
            id,
            accept: input.accept || '*',
            multiple: input.multiple,
            onDrop: onFileSelect,
            onError: (err) => Toast.error(err.message)
        });
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('dragdrop-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'dragdrop-styles';
        styles.textContent = `
            .drop-zone {
                transition: all var(--transition-fast);
            }

            .drop-zone.drag-over {
                background: rgba(99, 102, 241, 0.1);
                border-color: var(--primary-500) !important;
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
            }

            .global-drop-overlay {
                position: fixed;
                inset: 0;
                background: rgba(10, 10, 15, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                pointer-events: none;
            }

            .global-drop-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .global-drop-content {
                text-align: center;
                color: var(--text-primary);
            }

            .global-drop-content i {
                font-size: 4rem;
                color: var(--primary-400);
                margin-bottom: var(--spacing-6);
                animation: bounce 1s infinite;
            }

            .global-drop-content p {
                font-size: var(--text-xl);
                color: var(--text-secondary);
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            .inline-drop-zone {
                position: relative;
                border: 2px dashed var(--dark-border);
                border-radius: var(--radius-xl);
                padding: var(--spacing-8);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .inline-drop-zone:hover {
                border-color: var(--primary-400);
                background: rgba(99, 102, 241, 0.05);
            }

            .inline-drop-zone.drag-over {
                border-color: var(--primary-500);
                background: rgba(99, 102, 241, 0.1);
                border-style: solid;
            }

            .inline-drop-zone-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--spacing-4);
            }

            .inline-drop-zone-icon {
                width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--dark-card);
                border-radius: 50%;
                font-size: 1.5rem;
                color: var(--primary-400);
            }

            .inline-drop-zone-text {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--spacing-1);
            }

            .inline-drop-zone-title {
                font-weight: var(--font-semibold);
                color: var(--text-primary);
            }

            .inline-drop-zone-subtitle {
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .inline-drop-zone-input {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
            }

            /* Compact variant */
            .inline-drop-zone.compact {
                padding: var(--spacing-4);
            }

            .inline-drop-zone.compact .inline-drop-zone-content {
                flex-direction: row;
            }

            .inline-drop-zone.compact .inline-drop-zone-icon {
                width: 48px;
                height: 48px;
                font-size: 1.25rem;
            }

            .inline-drop-zone.compact .inline-drop-zone-text {
                align-items: flex-start;
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    DragDropUpload.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragDropUpload;
}
