/**
 * Batch Generation UI
 * Generate multiple creatives at once
 */

const BatchGenerator = {
    // Queue of generation requests
    queue: [],

    // Processing state
    isProcessing: false,
    currentIndex: 0,
    results: [],

    // Initialize
    init() {
        this.injectStyles();
    },

    // Add to queue
    addToQueue(config) {
        const item = {
            id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'pending',
            ...config
        };
        this.queue.push(item);
        return item.id;
    },

    // Clear queue
    clearQueue() {
        this.queue = [];
        this.currentIndex = 0;
        this.results = [];
    },

    // Start processing queue
    async processQueue(onProgress, onComplete) {
        if (this.isProcessing) return;
        if (this.queue.length === 0) {
            Toast.warning('No items in queue');
            return;
        }

        this.isProcessing = true;
        this.currentIndex = 0;
        this.results = [];

        for (let i = 0; i < this.queue.length; i++) {
            this.currentIndex = i;
            const item = this.queue[i];

            item.status = 'processing';
            if (onProgress) onProgress(this.getProgress());

            try {
                const result = await this.generateSingle(item);
                item.status = 'completed';
                item.result = result;
                this.results.push({ id: item.id, success: true, result });
            } catch (error) {
                item.status = 'failed';
                item.error = error.message;
                this.results.push({ id: item.id, success: false, error: error.message });
            }

            if (onProgress) onProgress(this.getProgress());
        }

        this.isProcessing = false;
        if (onComplete) onComplete(this.results);
    },

    // Generate single creative
    async generateSingle(config) {
        // Simulate API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In production, this would call the actual generation API
        return {
            imageUrl: `/outputs/batch_${config.id}.png`,
            metadata: config
        };
    },

    // Get current progress
    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.queue.length,
            percentage: Math.round(((this.currentIndex + 1) / this.queue.length) * 100),
            completed: this.queue.filter(i => i.status === 'completed').length,
            failed: this.queue.filter(i => i.status === 'failed').length,
            pending: this.queue.filter(i => i.status === 'pending').length
        };
    },

    // Open batch generator modal
    openModal() {
        let modal = document.getElementById('batchModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'batchModal';
            modal.className = 'batch-modal-backdrop';
            document.body.appendChild(modal);
        }

        this.render(modal);
        modal.classList.add('active');

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    },

    // Close modal
    closeModal() {
        const modal = document.getElementById('batchModal');
        if (modal) modal.classList.remove('active');
    },

    // Render modal content
    render(container) {
        container.innerHTML = `
            <div class="batch-modal">
                <div class="batch-modal-header">
                    <h2 class="batch-modal-title">
                        <i class="fas fa-layer-group"></i>
                        Batch Generation
                    </h2>
                    <button class="batch-modal-close" onclick="BatchGenerator.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="batch-modal-body">
                    <!-- Template Selection -->
                    <div class="batch-section">
                        <h3>1. Select Base Template</h3>
                        <div class="batch-template-grid" id="batchTemplates">
                            <!-- Templates will be loaded here -->
                        </div>
                    </div>

                    <!-- Variations -->
                    <div class="batch-section">
                        <h3>2. Define Variations</h3>
                        <div class="batch-variations">
                            <div class="batch-variation-type">
                                <div class="batch-variation-header">
                                    <label class="batch-checkbox">
                                        <input type="checkbox" id="varyText" checked>
                                        <span class="batch-checkbox-mark"></span>
                                        Text Variations
                                    </label>
                                </div>
                                <div class="batch-variation-content" id="textVariations">
                                    <textarea class="batch-textarea" placeholder="Enter different headlines (one per line):

Amazing Deals Today!
Limited Time Offer
Don't Miss Out
Shop Now & Save"></textarea>
                                </div>
                            </div>

                            <div class="batch-variation-type">
                                <div class="batch-variation-header">
                                    <label class="batch-checkbox">
                                        <input type="checkbox" id="varyColors">
                                        <span class="batch-checkbox-mark"></span>
                                        Color Variations
                                    </label>
                                </div>
                                <div class="batch-variation-content" id="colorVariations">
                                    <div class="batch-color-options">
                                        <label class="batch-color-option">
                                            <input type="checkbox" checked data-palette="amazon">
                                            <span class="batch-color-preview" style="background: linear-gradient(90deg, #FF9900, #232F3E)"></span>
                                            Amazon
                                        </label>
                                        <label class="batch-color-option">
                                            <input type="checkbox" data-palette="flipkart">
                                            <span class="batch-color-preview" style="background: linear-gradient(90deg, #2874F0, #FFE500)"></span>
                                            Flipkart
                                        </label>
                                        <label class="batch-color-option">
                                            <input type="checkbox" data-palette="dmart">
                                            <span class="batch-color-preview" style="background: linear-gradient(90deg, #E31837, #FFC107)"></span>
                                            DMart
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="batch-variation-type">
                                <div class="batch-variation-header">
                                    <label class="batch-checkbox">
                                        <input type="checkbox" id="varySizes">
                                        <span class="batch-checkbox-mark"></span>
                                        Size Variations
                                    </label>
                                </div>
                                <div class="batch-variation-content" id="sizeVariations">
                                    <div class="batch-size-options">
                                        <label class="batch-size-option">
                                            <input type="checkbox" checked data-size="1200x628">
                                            1200 × 628 (Facebook)
                                        </label>
                                        <label class="batch-size-option">
                                            <input type="checkbox" data-size="1080x1080">
                                            1080 × 1080 (Square)
                                        </label>
                                        <label class="batch-size-option">
                                            <input type="checkbox" data-size="1080x1920">
                                            1080 × 1920 (Story)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Preview -->
                    <div class="batch-section">
                        <h3>3. Preview Queue</h3>
                        <div class="batch-queue-info">
                            <div class="batch-queue-stat">
                                <span class="batch-queue-stat-value" id="queueCount">0</span>
                                <span class="batch-queue-stat-label">Creatives</span>
                            </div>
                            <div class="batch-queue-stat">
                                <span class="batch-queue-stat-value" id="estimatedTime">~0 min</span>
                                <span class="batch-queue-stat-label">Estimated Time</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="BatchGenerator.calculateQueue()">
                            <i class="fas fa-calculator"></i>
                            Calculate
                        </button>
                    </div>

                    <!-- Progress (shown during processing) -->
                    <div class="batch-progress" id="batchProgress" style="display: none;">
                        <div class="batch-progress-header">
                            <span>Processing...</span>
                            <span id="progressText">0/0</span>
                        </div>
                        <div class="batch-progress-bar">
                            <div class="batch-progress-fill" id="progressFill"></div>
                        </div>
                        <div class="batch-progress-current" id="progressCurrent">
                            Preparing...
                        </div>
                    </div>

                    <!-- Results (shown after completion) -->
                    <div class="batch-results" id="batchResults" style="display: none;">
                        <h3>Results</h3>
                        <div class="batch-results-grid" id="resultsGrid">
                            <!-- Results will be rendered here -->
                        </div>
                    </div>
                </div>

                <div class="batch-modal-footer">
                    <button class="btn btn-secondary" onclick="BatchGenerator.closeModal()">
                        Cancel
                    </button>
                    <button class="btn btn-primary" id="startBatchBtn" onclick="BatchGenerator.startGeneration()">
                        <i class="fas fa-play"></i>
                        Start Generation
                    </button>
                </div>
            </div>
        `;

        this.loadTemplates();
    },

    // Load templates into selector
    loadTemplates() {
        const container = document.getElementById('batchTemplates');
        if (!container) return;

        // Use templates from TemplateLibrary if available
        if (typeof TemplateLibrary !== 'undefined') {
            const templates = TemplateLibrary.templates.slice(0, 6);
            container.innerHTML = templates.map(t => `
                <div class="batch-template-card" data-id="${t.id}">
                    <div class="batch-template-preview" style="background: var(--dark-card);">
                        <span>${t.name}</span>
                    </div>
                </div>
            `).join('');

            // Add click handlers
            container.querySelectorAll('.batch-template-card').forEach(card => {
                card.addEventListener('click', () => {
                    container.querySelectorAll('.batch-template-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.calculateQueue();
                });
            });

            // Select first by default
            container.querySelector('.batch-template-card')?.classList.add('selected');
        }
    },

    // Calculate queue size
    calculateQueue() {
        const varyText = document.getElementById('varyText')?.checked;
        const varyColors = document.getElementById('varyColors')?.checked;
        const varySizes = document.getElementById('varySizes')?.checked;

        let textCount = 1;
        if (varyText) {
            const textArea = document.querySelector('#textVariations textarea');
            const lines = textArea?.value.split('\n').filter(l => l.trim()) || [];
            textCount = Math.max(lines.length, 1);
        }

        let colorCount = 1;
        if (varyColors) {
            const checked = document.querySelectorAll('#colorVariations input:checked');
            colorCount = Math.max(checked.length, 1);
        }

        let sizeCount = 1;
        if (varySizes) {
            const checked = document.querySelectorAll('#sizeVariations input:checked');
            sizeCount = Math.max(checked.length, 1);
        }

        const total = textCount * colorCount * sizeCount;
        const estimatedMinutes = Math.ceil(total * 0.5); // ~30 seconds each

        document.getElementById('queueCount').textContent = total;
        document.getElementById('estimatedTime').textContent = `~${estimatedMinutes} min`;

        return total;
    },

    // Start batch generation
    async startGeneration() {
        const count = this.calculateQueue();
        if (count === 0) {
            Toast.warning('No variations configured');
            return;
        }

        // Build queue
        this.clearQueue();
        
        // Get variations
        const texts = ['Amazing Deals!']; // Simplified for demo
        const colors = ['amazon'];
        const sizes = [{ width: 1200, height: 628 }];

        // Create combinations
        for (const text of texts) {
            for (const color of colors) {
                for (const size of sizes) {
                    this.addToQueue({
                        headline: text,
                        colorScheme: color,
                        size
                    });
                }
            }
        }

        // Show progress
        document.getElementById('batchProgress').style.display = 'block';
        document.getElementById('startBatchBtn').disabled = true;

        // Process queue
        await this.processQueue(
            (progress) => {
                document.getElementById('progressText').textContent = 
                    `${progress.current}/${progress.total}`;
                document.getElementById('progressFill').style.width = 
                    `${progress.percentage}%`;
                document.getElementById('progressCurrent').textContent = 
                    `Generating creative ${progress.current}...`;
            },
            (results) => {
                document.getElementById('startBatchBtn').disabled = false;
                this.showResults(results);
                Toast.success(`Generated ${results.filter(r => r.success).length} creatives`);
            }
        );
    },

    // Show results
    showResults(results) {
        document.getElementById('batchResults').style.display = 'block';
        const grid = document.getElementById('resultsGrid');

        grid.innerHTML = results.map(r => `
            <div class="batch-result-card ${r.success ? 'success' : 'failed'}">
                <div class="batch-result-preview">
                    ${r.success 
                        ? '<i class="fas fa-check-circle"></i>' 
                        : '<i class="fas fa-times-circle"></i>'}
                </div>
                <div class="batch-result-info">
                    ${r.success ? 'Generated' : r.error}
                </div>
            </div>
        `).join('');
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('batch-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'batch-styles';
        styles.textContent = `
            .batch-modal-backdrop {
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

            .batch-modal-backdrop.active {
                opacity: 1;
                visibility: visible;
            }

            .batch-modal {
                background: var(--dark-surface);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-2xl);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }

            .batch-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-6);
                border-bottom: 1px solid var(--dark-border);
            }

            .batch-modal-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                font-size: var(--text-xl);
            }

            .batch-modal-title i { color: var(--primary-400); }

            .batch-modal-close {
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
            }

            .batch-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: var(--spacing-6);
            }

            .batch-section {
                margin-bottom: var(--spacing-8);
            }

            .batch-section h3 {
                font-size: var(--text-lg);
                margin-bottom: var(--spacing-4);
            }

            .batch-template-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--spacing-3);
            }

            .batch-template-card {
                padding: var(--spacing-4);
                background: var(--dark-card);
                border: 2px solid var(--dark-border);
                border-radius: var(--radius-xl);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .batch-template-card:hover {
                border-color: var(--primary-400);
            }

            .batch-template-card.selected {
                border-color: var(--primary-500);
                background: rgba(99, 102, 241, 0.1);
            }

            .batch-template-preview {
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .batch-variations {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-4);
            }

            .batch-variation-type {
                background: var(--dark-card);
                border-radius: var(--radius-xl);
                overflow: hidden;
            }

            .batch-variation-header {
                padding: var(--spacing-4);
                background: var(--dark-surface);
            }

            .batch-checkbox {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                cursor: pointer;
            }

            .batch-checkbox input { display: none; }

            .batch-checkbox-mark {
                width: 20px;
                height: 20px;
                background: var(--dark-card);
                border: 2px solid var(--dark-border);
                border-radius: var(--radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .batch-checkbox input:checked + .batch-checkbox-mark {
                background: var(--primary-500);
                border-color: var(--primary-500);
            }

            .batch-checkbox input:checked + .batch-checkbox-mark::after {
                content: '✓';
                color: white;
                font-size: var(--text-sm);
            }

            .batch-variation-content {
                padding: var(--spacing-4);
            }

            .batch-textarea {
                width: 100%;
                min-height: 100px;
                padding: var(--spacing-3);
                background: var(--dark-surface);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-lg);
                color: var(--text-primary);
                resize: vertical;
            }

            .batch-color-options,
            .batch-size-options {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-3);
            }

            .batch-color-option,
            .batch-size-option {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                padding: var(--spacing-2) var(--spacing-3);
                background: var(--dark-surface);
                border-radius: var(--radius-lg);
                cursor: pointer;
                font-size: var(--text-sm);
            }

            .batch-color-preview {
                width: 20px;
                height: 20px;
                border-radius: var(--radius-sm);
            }

            .batch-queue-info {
                display: flex;
                gap: var(--spacing-6);
                margin-bottom: var(--spacing-4);
            }

            .batch-queue-stat {
                display: flex;
                flex-direction: column;
            }

            .batch-queue-stat-value {
                font-size: var(--text-3xl);
                font-weight: var(--font-bold);
                color: var(--primary-400);
            }

            .batch-queue-stat-label {
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .batch-progress {
                margin-top: var(--spacing-6);
                padding: var(--spacing-6);
                background: var(--dark-card);
                border-radius: var(--radius-xl);
            }

            .batch-progress-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: var(--spacing-3);
            }

            .batch-progress-bar {
                height: 8px;
                background: var(--dark-surface);
                border-radius: var(--radius-full);
                overflow: hidden;
                margin-bottom: var(--spacing-3);
            }

            .batch-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-500), var(--accent-cyan));
                transition: width 0.3s ease;
            }

            .batch-progress-current {
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .batch-results-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: var(--spacing-3);
            }

            .batch-result-card {
                padding: var(--spacing-4);
                background: var(--dark-card);
                border-radius: var(--radius-lg);
                text-align: center;
            }

            .batch-result-card.success .batch-result-preview {
                color: var(--success);
            }

            .batch-result-card.failed .batch-result-preview {
                color: var(--error);
            }

            .batch-result-preview {
                font-size: 2rem;
                margin-bottom: var(--spacing-2);
            }

            .batch-result-info {
                font-size: var(--text-xs);
                color: var(--text-muted);
            }

            .batch-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: var(--spacing-3);
                padding: var(--spacing-6);
                border-top: 1px solid var(--dark-border);
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    BatchGenerator.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchGenerator;
}
