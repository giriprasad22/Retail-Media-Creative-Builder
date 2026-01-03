/**
 * Export Modal - Multi-format export with compression options
 */

const ExportModal = {
    // Export format presets
    formats: [
        {
            id: 'facebook',
            name: 'Facebook / LinkedIn',
            width: 1200,
            height: 628,
            icon: 'facebook',
            category: 'social'
        },
        {
            id: 'instagram-square',
            name: 'Instagram Square',
            width: 1080,
            height: 1080,
            icon: 'instagram',
            category: 'social'
        },
        {
            id: 'instagram-story',
            name: 'Instagram Story',
            width: 1080,
            height: 1920,
            icon: 'mobile-alt',
            category: 'social'
        },
        {
            id: 'twitter',
            name: 'Twitter / X',
            width: 1200,
            height: 675,
            icon: 'twitter',
            category: 'social'
        },
        {
            id: 'twitter-banner',
            name: 'Twitter Banner',
            width: 1500,
            height: 500,
            icon: 'twitter',
            category: 'social'
        },
        {
            id: 'amazon-product',
            name: 'Amazon Product',
            width: 1000,
            height: 1000,
            icon: 'amazon',
            category: 'marketplace'
        },
        {
            id: 'amazon-banner',
            name: 'Amazon Banner',
            width: 1940,
            height: 600,
            icon: 'amazon',
            category: 'marketplace'
        },
        {
            id: 'flipkart-banner',
            name: 'Flipkart Banner',
            width: 1410,
            height: 450,
            icon: 'shopping-bag',
            category: 'marketplace'
        },
        {
            id: 'dmart-display',
            name: 'DMart Display',
            width: 1200,
            height: 628,
            icon: 'store',
            category: 'marketplace'
        },
        {
            id: 'custom',
            name: 'Custom Size',
            width: 0,
            height: 0,
            icon: 'crop-alt',
            category: 'custom'
        }
    ],

    // Selected formats
    selectedFormats: new Set(['facebook']),

    // Export settings
    settings: {
        format: 'png',
        quality: 90,
        maxFileSize: 500, // KB
        includeBleed: false,
        namePrefix: 'creative'
    },

    // Modal state
    isOpen: false,
    canvas: null,
    elements: [],

    // Initialize
    init(canvas, elements) {
        this.canvas = canvas;
        this.elements = elements;
        this.injectStyles();
    },

    // Open modal
    open(canvas, elements) {
        if (canvas) this.canvas = canvas;
        if (elements) this.elements = elements;
        
        this.render();
        this.isOpen = true;
        document.getElementById('exportModal').classList.add('active');
    },

    // Close modal
    close() {
        this.isOpen = false;
        document.getElementById('exportModal').classList.remove('active');
    },

    // Toggle format selection
    toggleFormat(formatId) {
        if (this.selectedFormats.has(formatId)) {
            this.selectedFormats.delete(formatId);
        } else {
            this.selectedFormats.add(formatId);
        }
        this.updateFormatUI();
    },

    // Select all formats in category
    selectCategory(category) {
        this.formats.filter(f => f.category === category).forEach(f => {
            this.selectedFormats.add(f.id);
        });
        this.updateFormatUI();
    },

    // Clear all selections
    clearSelection() {
        this.selectedFormats.clear();
        this.updateFormatUI();
    },

    // Update format UI
    updateFormatUI() {
        document.querySelectorAll('.export-format-card').forEach(card => {
            const formatId = card.dataset.format;
            card.classList.toggle('selected', this.selectedFormats.has(formatId));
        });

        // Update count
        const countEl = document.getElementById('selectedCount');
        if (countEl) {
            countEl.textContent = `${this.selectedFormats.size} format(s) selected`;
        }
    },

    // Update setting
    updateSetting(key, value) {
        this.settings[key] = value;
        
        // Update quality display
        if (key === 'quality') {
            const display = document.getElementById('qualityDisplay');
            if (display) display.textContent = `${value}%`;
        }
    },

    // Export all selected formats
    async exportAll() {
        if (this.selectedFormats.size === 0) {
            Toast.warning('Please select at least one format');
            return;
        }

        const progressEl = document.getElementById('exportProgress');
        const progressBar = document.getElementById('exportProgressBar');
        const progressText = document.getElementById('exportProgressText');
        
        progressEl.style.display = 'block';
        
        let completed = 0;
        const total = this.selectedFormats.size;

        try {
            for (const formatId of this.selectedFormats) {
                const format = this.formats.find(f => f.id === formatId);
                if (!format) continue;

                progressText.textContent = `Exporting ${format.name}...`;
                
                await this.exportFormat(format);
                
                completed++;
                const progress = Math.round((completed / total) * 100);
                progressBar.style.width = `${progress}%`;
            }

            progressText.textContent = 'Export complete!';
            Toast.success(`Exported ${completed} format(s)`);
            
            setTimeout(() => {
                progressEl.style.display = 'none';
                progressBar.style.width = '0%';
            }, 2000);

        } catch (error) {
            console.error('Export failed:', error);
            Toast.error('Export failed');
            progressEl.style.display = 'none';
        }
    },

    // Export single format
    async exportFormat(format) {
        return new Promise((resolve) => {
            // Create export canvas
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = format.width || this.canvas.width;
            exportCanvas.height = format.height || this.canvas.height;
            const ctx = exportCanvas.getContext('2d');

            // Calculate scaling
            const scaleX = exportCanvas.width / this.canvas.width;
            const scaleY = exportCanvas.height / this.canvas.height;
            const scale = Math.min(scaleX, scaleY);

            // Center the content
            const offsetX = (exportCanvas.width - this.canvas.width * scale) / 2;
            const offsetY = (exportCanvas.height - this.canvas.height * scale) / 2;

            // Fill background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            // Apply transform and draw
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            ctx.drawImage(this.canvas, 0, 0);
            ctx.restore();

            // Determine MIME type and quality
            const mimeType = this.settings.format === 'png' ? 'image/png' : 'image/jpeg';
            const quality = this.settings.quality / 100;

            // Convert to blob and download
            exportCanvas.toBlob((blob) => {
                // Check file size and compress if needed
                this.compressIfNeeded(blob, mimeType, quality).then(finalBlob => {
                    const url = URL.createObjectURL(finalBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${this.settings.namePrefix}_${format.id}.${this.settings.format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                    resolve();
                });
            }, mimeType, quality);
        });
    },

    // Compress if exceeds max file size
    async compressIfNeeded(blob, mimeType, quality) {
        const maxBytes = this.settings.maxFileSize * 1024;
        
        if (blob.size <= maxBytes || mimeType === 'image/png') {
            return blob;
        }

        // Try lower quality
        let newQuality = quality * 0.8;
        while (newQuality > 0.3) {
            const canvas = await this.blobToCanvas(blob);
            const newBlob = await new Promise(r => canvas.toBlob(r, mimeType, newQuality));
            
            if (newBlob.size <= maxBytes) {
                return newBlob;
            }
            newQuality *= 0.8;
        }

        return blob;
    },

    // Convert blob to canvas
    async blobToCanvas(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas);
            };
            img.src = URL.createObjectURL(blob);
        });
    },

    // Render modal
    render() {
        // Check if modal exists, if not create it
        let modal = document.getElementById('exportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'exportModal';
            modal.className = 'export-modal-backdrop';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="export-modal">
                <div class="export-modal-header">
                    <h2 class="export-modal-title">
                        <i class="fas fa-download"></i>
                        Export Creative
                    </h2>
                    <button class="export-modal-close" onclick="ExportModal.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="export-modal-body">
                    <!-- Preview -->
                    <div class="export-preview-section">
                        <div class="export-preview-canvas">
                            <canvas id="exportPreviewCanvas"></canvas>
                        </div>
                    </div>

                    <!-- Format Selection -->
                    <div class="export-section">
                        <div class="export-section-header">
                            <h3>Select Formats</h3>
                            <div class="export-section-actions">
                                <button class="btn btn-ghost btn-xs" onclick="ExportModal.selectCategory('social')">
                                    Social
                                </button>
                                <button class="btn btn-ghost btn-xs" onclick="ExportModal.selectCategory('marketplace')">
                                    Marketplace
                                </button>
                                <button class="btn btn-ghost btn-xs" onclick="ExportModal.clearSelection()">
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div class="export-formats-grid">
                            ${this.formats.filter(f => f.id !== 'custom').map(format => `
                                <div class="export-format-card ${this.selectedFormats.has(format.id) ? 'selected' : ''}" 
                                     data-format="${format.id}"
                                     onclick="ExportModal.toggleFormat('${format.id}')">
                                    <div class="export-format-icon">
                                        <i class="fab fa-${format.icon}"></i>
                                    </div>
                                    <div class="export-format-info">
                                        <div class="export-format-name">${format.name}</div>
                                        <div class="export-format-size">${format.width} × ${format.height}</div>
                                    </div>
                                    <div class="export-format-check">
                                        <i class="fas fa-check"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="export-selected-count" id="selectedCount">
                            ${this.selectedFormats.size} format(s) selected
                        </div>
                    </div>

                    <!-- Settings -->
                    <div class="export-section">
                        <h3>Export Settings</h3>
                        <div class="export-settings-grid">
                            <div class="export-setting">
                                <label>File Format</label>
                                <select class="export-select" onchange="ExportModal.updateSetting('format', this.value)">
                                    <option value="png" ${this.settings.format === 'png' ? 'selected' : ''}>PNG (Lossless)</option>
                                    <option value="jpg" ${this.settings.format === 'jpg' ? 'selected' : ''}>JPG (Compressed)</option>
                                </select>
                            </div>
                            <div class="export-setting">
                                <label>Quality: <span id="qualityDisplay">${this.settings.quality}%</span></label>
                                <input type="range" class="export-range" min="50" max="100" 
                                       value="${this.settings.quality}"
                                       oninput="ExportModal.updateSetting('quality', parseInt(this.value))">
                            </div>
                            <div class="export-setting">
                                <label>Max File Size (KB)</label>
                                <input type="number" class="export-input" value="${this.settings.maxFileSize}"
                                       onchange="ExportModal.updateSetting('maxFileSize', parseInt(this.value))">
                            </div>
                            <div class="export-setting">
                                <label>File Name Prefix</label>
                                <input type="text" class="export-input" value="${this.settings.namePrefix}"
                                       onchange="ExportModal.updateSetting('namePrefix', this.value)">
                            </div>
                        </div>
                    </div>

                    <!-- Progress -->
                    <div class="export-progress" id="exportProgress" style="display: none;">
                        <div class="export-progress-bar">
                            <div class="export-progress-fill" id="exportProgressBar"></div>
                        </div>
                        <div class="export-progress-text" id="exportProgressText">Preparing...</div>
                    </div>
                </div>

                <div class="export-modal-footer">
                    <button class="btn btn-secondary" onclick="ExportModal.close()">
                        Cancel
                    </button>
                    <button class="btn btn-primary" onclick="ExportModal.exportAll()">
                        <i class="fas fa-download"></i>
                        Export Selected
                    </button>
                </div>
            </div>
        `;

        // Draw preview
        setTimeout(() => {
            this.drawPreview();
        }, 100);

        // Bind backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });
    },

    // Draw preview canvas
    drawPreview() {
        const previewCanvas = document.getElementById('exportPreviewCanvas');
        if (!previewCanvas || !this.canvas) return;

        const maxWidth = 400;
        const scale = maxWidth / this.canvas.width;
        
        previewCanvas.width = this.canvas.width * scale;
        previewCanvas.height = this.canvas.height * scale;

        const ctx = previewCanvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(this.canvas, 0, 0);
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('export-modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'export-modal-styles';
        styles.textContent = `
            .export-modal-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .export-modal-backdrop.active {
                opacity: 1;
                visibility: visible;
            }

            .export-modal {
                background: var(--dark-surface);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-2xl);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transform: scale(0.95);
                transition: transform 0.3s ease;
            }

            .export-modal-backdrop.active .export-modal {
                transform: scale(1);
            }

            .export-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-6);
                border-bottom: 1px solid var(--dark-border);
            }

            .export-modal-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                font-size: var(--text-xl);
                font-weight: var(--font-semibold);
            }

            .export-modal-title i {
                color: var(--primary-400);
            }

            .export-modal-close {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--dark-card);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-lg);
                color: var(--text-muted);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .export-modal-close:hover {
                background: var(--dark-border);
                color: var(--text-primary);
            }

            .export-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: var(--spacing-6);
            }

            .export-preview-section {
                margin-bottom: var(--spacing-6);
            }

            .export-preview-canvas {
                background: var(--dark-card);
                border-radius: var(--radius-xl);
                padding: var(--spacing-4);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .export-preview-canvas canvas {
                max-width: 100%;
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-lg);
            }

            .export-section {
                margin-bottom: var(--spacing-6);
            }

            .export-section h3 {
                font-size: var(--text-lg);
                font-weight: var(--font-semibold);
                margin-bottom: var(--spacing-4);
            }

            .export-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--spacing-4);
            }

            .export-section-actions {
                display: flex;
                gap: var(--spacing-2);
            }

            .export-formats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: var(--spacing-3);
            }

            .export-format-card {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-3);
                background: var(--dark-card);
                border: 2px solid var(--dark-border);
                border-radius: var(--radius-xl);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .export-format-card:hover {
                border-color: var(--primary-400);
            }

            .export-format-card.selected {
                border-color: var(--primary-500);
                background: rgba(99, 102, 241, 0.1);
            }

            .export-format-icon {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--dark-surface);
                border-radius: var(--radius-lg);
                color: var(--text-muted);
            }

            .export-format-card.selected .export-format-icon {
                color: var(--primary-400);
            }

            .export-format-info {
                flex: 1;
                min-width: 0;
            }

            .export-format-name {
                font-size: var(--text-sm);
                font-weight: var(--font-medium);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .export-format-size {
                font-size: var(--text-xs);
                color: var(--text-muted);
            }

            .export-format-check {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--dark-surface);
                border: 2px solid var(--dark-border);
                border-radius: var(--radius-md);
                color: transparent;
                transition: all var(--transition-fast);
            }

            .export-format-card.selected .export-format-check {
                background: var(--primary-500);
                border-color: var(--primary-500);
                color: white;
            }

            .export-selected-count {
                margin-top: var(--spacing-3);
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .export-settings-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-4);
            }

            .export-setting {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
            }

            .export-setting label {
                font-size: var(--text-sm);
                color: var(--text-secondary);
            }

            .export-select,
            .export-input {
                padding: var(--spacing-3);
                background: var(--dark-card);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-lg);
                color: var(--text-primary);
                font-size: var(--text-sm);
            }

            .export-select:focus,
            .export-input:focus {
                border-color: var(--primary-500);
                outline: none;
            }

            .export-range {
                width: 100%;
                height: 8px;
                background: var(--dark-card);
                border-radius: var(--radius-full);
                appearance: none;
            }

            .export-range::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                background: var(--primary-500);
                border-radius: 50%;
                cursor: pointer;
            }

            .export-progress {
                margin-top: var(--spacing-4);
            }

            .export-progress-bar {
                height: 8px;
                background: var(--dark-card);
                border-radius: var(--radius-full);
                overflow: hidden;
                margin-bottom: var(--spacing-2);
            }

            .export-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-500), var(--accent-cyan));
                border-radius: var(--radius-full);
                transition: width 0.3s ease;
            }

            .export-progress-text {
                font-size: var(--text-sm);
                color: var(--text-muted);
                text-align: center;
            }

            .export-modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: var(--spacing-3);
                padding: var(--spacing-6);
                border-top: 1px solid var(--dark-border);
            }

            @media (max-width: 768px) {
                .export-formats-grid {
                    grid-template-columns: 1fr;
                }

                .export-settings-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ExportModal.injectStyles();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportModal;
}
