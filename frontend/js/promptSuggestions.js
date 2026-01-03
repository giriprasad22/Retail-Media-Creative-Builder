/**
 * Prompt Suggestions - AI prompt enhancement and suggestions
 * Now powered by LLM for intelligent suggestions
 */

const PromptSuggestions = {
    // LLM API endpoint
    apiEndpoint: '/api/ai/suggest-prompts',
    
    // Debounce timer
    debounceTimer: null,
    debounceDelay: 300,
    
    // Cache for LLM suggestions
    suggestionCache: new Map(),
    
    // Loading state
    isLoading: false,

    // Suggestion categories (fallback)
    categories: {
        products: [
            'smartphone', 'laptop', 'headphones', 'smartwatch', 'camera',
            'television', 'refrigerator', 'washing machine', 'air conditioner',
            'microwave', 'blender', 'coffee maker', 'vacuum cleaner',
            'shoes', 'clothing', 'handbag', 'jewelry', 'sunglasses',
            'furniture', 'bedding', 'kitchenware', 'home decor'
        ],
        styles: [
            'modern', 'minimalist', 'vibrant', 'elegant', 'professional',
            'playful', 'premium', 'luxurious', 'bold', 'clean',
            'festive', 'seasonal', 'trendy', 'classic', 'artistic'
        ],
        backgrounds: [
            'gradient background', 'solid color', 'abstract pattern',
            'bokeh effect', 'studio lighting', 'outdoor scene',
            'lifestyle setting', 'white background', 'dark background',
            'textured background', 'geometric shapes', 'nature scene'
        ],
        occasions: [
            'sale', 'new launch', 'festival', 'Diwali', 'Christmas',
            'New Year', 'summer sale', 'clearance', 'limited time',
            'exclusive offer', 'flash sale', 'weekend deal'
        ],
        cta: [
            'Shop Now', 'Buy Now', 'Get Yours', 'Order Today',
            'Limited Stock', 'Save Now', 'Grab Deal', 'Hurry Up',
            'Don\'t Miss', 'Act Fast', 'Learn More', 'Discover'
        ]
    },

    // Recent prompts
    recentPrompts: [],

    // Max recent prompts
    maxRecent: 10,

    // Initialize
    init() {
        this.loadRecent();
        this.injectStyles();
    },

    // Load recent prompts
    loadRecent() {
        const saved = localStorage.getItem('rmcb_recent_prompts');
        if (saved) {
            try {
                this.recentPrompts = JSON.parse(saved);
            } catch (e) {
                this.recentPrompts = [];
            }
        }
    },

    // Save recent prompt
    saveRecent(prompt) {
        if (!prompt.trim()) return;
        
        // Remove if exists
        this.recentPrompts = this.recentPrompts.filter(p => p !== prompt);
        
        // Add to front
        this.recentPrompts.unshift(prompt);
        
        // Limit
        if (this.recentPrompts.length > this.maxRecent) {
            this.recentPrompts.pop();
        }
        
        localStorage.setItem('rmcb_recent_prompts', JSON.stringify(this.recentPrompts));
    },

    // Attach to input
    attach(inputSelector, options = {}) {
        const input = document.querySelector(inputSelector);
        if (!input) return;

        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'prompt-suggestions-dropdown';
        dropdown.id = 'promptSuggestionsDropdown';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(dropdown);

        // Focus handler
        input.addEventListener('focus', () => this.show(input, dropdown));
        
        // Input handler
        input.addEventListener('input', (e) => this.handleInput(e, input, dropdown));
        
        // Blur handler (delayed to allow click)
        input.addEventListener('blur', () => {
            setTimeout(() => this.hide(dropdown), 200);
        });

        // Key handler
        input.addEventListener('keydown', (e) => this.handleKeydown(e, dropdown));

        // Submit handler
        if (options.onSubmit) {
            input.form?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveRecent(input.value);
                options.onSubmit(input.value);
            });
        }
    },

    // Show dropdown
    show(input, dropdown) {
        if (!input.value.trim()) {
            // Show recent and suggestions
            this.renderInitialSuggestions(dropdown);
        }
        dropdown.classList.add('open');
    },

    // Hide dropdown
    hide(dropdown) {
        dropdown.classList.remove('open');
    },

    // Handle input with debounced LLM calls
    handleInput(e, input, dropdown) {
        const value = input.value.toLowerCase();
        
        if (!value.trim()) {
            this.renderInitialSuggestions(dropdown);
            return;
        }

        // Clear previous debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Show local matches immediately
        const localMatches = this.findLocalMatches(value);
        this.renderMatches(dropdown, localMatches, input, true); // true = loading LLM

        // Debounce LLM call
        this.debounceTimer = setTimeout(() => {
            this.fetchLLMSuggestions(value, input, dropdown);
        }, this.debounceDelay);
    },

    // Fetch suggestions from LLM API
    async fetchLLMSuggestions(query, input, dropdown) {
        // Check cache first
        const cacheKey = query.toLowerCase().trim();
        if (this.suggestionCache.has(cacheKey)) {
            const cached = this.suggestionCache.get(cacheKey);
            this.renderLLMSuggestions(dropdown, cached, input);
            return;
        }

        this.isLoading = true;
        
        try {
            // Determine API URL
            const baseUrl = window.API?.getBaseUrl?.() || 'http://localhost:8000';
            const response = await fetch(`${baseUrl}/api/ai/suggest-prompts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    partial_prompt: query,
                    context: {
                        retailer: window.selectedRetailer || 'general',
                        recent_prompts: this.recentPrompts.slice(0, 3)
                    },
                    max_suggestions: 5
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Cache the response
                this.suggestionCache.set(cacheKey, data);
                
                // Limit cache size
                if (this.suggestionCache.size > 50) {
                    const firstKey = this.suggestionCache.keys().next().value;
                    this.suggestionCache.delete(firstKey);
                }
                
                // Render LLM suggestions
                this.renderLLMSuggestions(dropdown, data, input);
            } else {
                // Fallback to local suggestions
                console.warn('LLM suggestions unavailable, using local');
                const matches = this.findLocalMatches(query);
                this.renderMatches(dropdown, matches, input, false);
            }
        } catch (error) {
            console.warn('LLM suggestion error:', error);
            // Fallback to local suggestions
            const matches = this.findLocalMatches(query);
            this.renderMatches(dropdown, matches, input, false);
        } finally {
            this.isLoading = false;
        }
    },

    // Render LLM suggestions in dropdown
    renderLLMSuggestions(dropdown, llmData, input) {
        const html = [];
        
        // Completions section
        if (llmData.completions && llmData.completions.length > 0) {
            html.push('<div class="suggestion-section">');
            html.push('<div class="suggestion-header"><span class="icon">✨</span> AI Completions</div>');
            llmData.completions.forEach(item => {
                html.push(`<div class="suggestion-item llm-suggestion" data-value="${this.escapeHtml(item)}">
                    <span class="suggestion-icon">💡</span>
                    <span class="suggestion-text">${this.escapeHtml(item)}</span>
                    <span class="suggestion-badge ai">AI</span>
                </div>`);
            });
            html.push('</div>');
        }

        // Enhancements section
        if (llmData.enhancements && llmData.enhancements.length > 0) {
            html.push('<div class="suggestion-section">');
            html.push('<div class="suggestion-header"><span class="icon">🚀</span> Enhanced Prompts</div>');
            llmData.enhancements.forEach(item => {
                html.push(`<div class="suggestion-item llm-suggestion" data-value="${this.escapeHtml(item)}">
                    <span class="suggestion-icon">⚡</span>
                    <span class="suggestion-text">${this.escapeHtml(item)}</span>
                    <span class="suggestion-badge enhance">Enhanced</span>
                </div>`);
            });
            html.push('</div>');
        }

        // Keywords section
        if (llmData.keywords && llmData.keywords.length > 0) {
            html.push('<div class="suggestion-section">');
            html.push('<div class="suggestion-header"><span class="icon">🏷️</span> Suggested Keywords</div>');
            html.push('<div class="keyword-chips">');
            llmData.keywords.forEach(keyword => {
                html.push(`<span class="keyword-chip" data-keyword="${this.escapeHtml(keyword)}">${this.escapeHtml(keyword)}</span>`);
            });
            html.push('</div></div>');
        }

        // Local matches as fallback
        const localMatches = this.findLocalMatches(input.value.toLowerCase());
        if (localMatches.length > 0 && html.length === 0) {
            html.push('<div class="suggestion-section">');
            html.push('<div class="suggestion-header"><span class="icon">📝</span> Suggestions</div>');
            localMatches.slice(0, 5).forEach(match => {
                html.push(`<div class="suggestion-item" data-value="${this.escapeHtml(match.text)}">
                    <span class="suggestion-icon">${match.icon || '📌'}</span>
                    <span class="suggestion-text">${this.escapeHtml(match.text)}</span>
                </div>`);
            });
            html.push('</div>');
        }

        if (html.length === 0) {
            html.push('<div class="no-suggestions">No suggestions found. Try a different prompt.</div>');
        }

        dropdown.innerHTML = html.join('');
        dropdown.classList.add('open');

        // Add click handlers
        dropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.dataset.value, input, dropdown);
            });
        });

        // Add keyword chip handlers
        dropdown.querySelectorAll('.keyword-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const keyword = chip.dataset.keyword;
                const currentValue = input.value.trim();
                input.value = currentValue ? `${currentValue} ${keyword}` : keyword;
                input.dispatchEvent(new Event('input'));
            });
        });
    },

    // Escape HTML for safe rendering
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Find local matches (fast, no API call)
    findLocalMatches(query) {
        const matches = [];
        const words = query.split(/\s+/);
        const lastWord = words[words.length - 1];

        // Search all categories
        Object.entries(this.categories).forEach(([category, items]) => {
            items.forEach(item => {
                if (item.toLowerCase().includes(lastWord)) {
                    matches.push({
                        text: item,
                        category,
                        score: item.toLowerCase().startsWith(lastWord) ? 2 : 1,
                        icon: this.getCategoryIcon(category)
                    });
                }
            });
        });

        // Smart suggestions based on context
        const smartSuggestions = this.generateSmartSuggestions(query);
        smartSuggestions.forEach(s => matches.push(s));

        // Sort by score
        return matches.sort((a, b) => b.score - a.score).slice(0, 8);
    },

    // Handle keydown
    handleKeydown(e, dropdown) {
        const items = dropdown.querySelectorAll('.suggestion-item');
        const activeItem = dropdown.querySelector('.suggestion-item.active');
        let activeIndex = Array.from(items).indexOf(activeItem);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                this.setActiveItem(items, activeIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                this.setActiveItem(items, activeIndex);
                break;
            case 'Enter':
                if (activeItem) {
                    e.preventDefault();
                    activeItem.click();
                }
                break;
            case 'Escape':
                this.hide(dropdown);
                break;
        }
    },

    // Set active item
    setActiveItem(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    },

    // Find matches
    findMatches(query) {
        const matches = {
            recent: [],
            products: [],
            styles: [],
            suggestions: []
        };

        // Recent
        matches.recent = this.recentPrompts
            .filter(p => p.toLowerCase().includes(query))
            .slice(0, 3);

        // Products
        matches.products = this.categories.products
            .filter(p => p.includes(query))
            .slice(0, 5);

        // Styles
        matches.styles = this.categories.styles
            .filter(s => s.includes(query))
            .slice(0, 5);

        // Generate smart suggestions
        matches.suggestions = this.generateSmartSuggestions(query);

        return matches;
    },

    // Generate smart suggestions
    generateSmartSuggestions(query) {
        const suggestions = [];
        const words = query.split(' ');
        const lastWord = words[words.length - 1];

        // Suggest adding style
        if (words.length <= 2) {
            this.categories.styles.slice(0, 3).forEach(style => {
                suggestions.push(`${query} ${style}`);
            });
        }

        // Suggest adding background
        if (!query.includes('background')) {
            suggestions.push(`${query} with gradient background`);
            suggestions.push(`${query} on white background`);
        }

        // Suggest adding occasion
        if (!this.categories.occasions.some(o => query.includes(o.toLowerCase()))) {
            suggestions.push(`${query} for sale promotion`);
        }

        // Suggest CTA
        if (!this.categories.cta.some(c => query.toLowerCase().includes(c.toLowerCase()))) {
            suggestions.push(`${query} with "Shop Now" button`);
        }

        return suggestions.slice(0, 5);
    },

    // Render initial suggestions
    renderInitialSuggestions(dropdown) {
        dropdown.innerHTML = `
            ${this.recentPrompts.length > 0 ? `
                <div class="suggestion-section">
                    <div class="suggestion-section-title">
                        <i class="fas fa-history"></i>
                        Recent Prompts
                    </div>
                    ${this.recentPrompts.slice(0, 5).map(prompt => `
                        <div class="suggestion-item recent" onclick="PromptSuggestions.selectSuggestion('${this.escapeHtml(prompt)}')">
                            <i class="fas fa-clock"></i>
                            <span>${this.truncate(prompt, 50)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="suggestion-section">
                <div class="suggestion-section-title">
                    <i class="fas fa-lightbulb"></i>
                    Quick Start Ideas
                </div>
                ${this.getQuickStartIdeas().map(idea => `
                    <div class="suggestion-item" onclick="PromptSuggestions.selectSuggestion('${this.escapeHtml(idea)}')">
                        <i class="fas fa-magic"></i>
                        <span>${idea}</span>
                    </div>
                `).join('')}
            </div>

            <div class="suggestion-section">
                <div class="suggestion-section-title">
                    <i class="fas fa-tags"></i>
                    Popular Categories
                </div>
                <div class="suggestion-chips">
                    ${this.categories.products.slice(0, 8).map(product => `
                        <button class="suggestion-chip" onclick="PromptSuggestions.insertChip('${product}')">
                            ${product}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Render matches (with optional loading state for LLM)
    renderMatches(dropdown, matches, input, isLoadingLLM = false) {
        const hasMatches = matches.length > 0;

        if (!hasMatches && !isLoadingLLM) {
            dropdown.innerHTML = `
                <div class="suggestion-empty">
                    <i class="fas fa-search"></i>
                    <span>No suggestions found. Try a different term.</span>
                </div>
            `;
            return;
        }

        let html = '';

        // Show loading indicator for LLM
        if (isLoadingLLM) {
            html += `
                <div class="llm-loading">
                    <div class="loading-spinner-small"></div>
                    <span>Getting AI suggestions...</span>
                </div>
            `;
        }

        // Show local matches
        if (hasMatches) {
            html += `
                <div class="suggestion-section">
                    <div class="suggestion-section-title">
                        <i class="fas fa-lightbulb"></i>
                        Quick Suggestions
                    </div>
                    ${matches.slice(0, 5).map((match, i) => `
                        <div class="suggestion-item ${i === 0 && !isLoadingLLM ? 'active' : ''}" 
                             onclick="PromptSuggestions.selectSuggestion('${this.escapeHtml(match.text || match)}')">
                            <span class="suggestion-icon">${match.icon || '📌'}</span>
                            <span>${this.highlightMatch(match.text || match, input.value)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        dropdown.innerHTML = html;
        dropdown.classList.add('open');
    },

    // Quick start ideas
    getQuickStartIdeas() {
        return [
            'Premium smartphone ad with gradient background and "Buy Now" button',
            'Festive sale banner for fashion products with vibrant colors',
            'Minimalist laptop advertisement with clean white background',
            'Electronics sale promotional banner with bold typography',
            'Luxury watch showcase with elegant dark theme'
        ];
    },

    // Select suggestion
    selectSuggestion(text) {
        const input = document.querySelector('.prompt-input, #promptInput, [name="prompt"]');
        if (input) {
            input.value = text;
            input.focus();
            this.hide(document.getElementById('promptSuggestionsDropdown'));
        }
    },

    // Insert chip
    insertChip(text) {
        const input = document.querySelector('.prompt-input, #promptInput, [name="prompt"]');
        if (input) {
            const current = input.value.trim();
            input.value = current ? `${current} ${text}` : text;
            input.focus();
        }
    },

    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            products: '📦',
            styles: '🎨',
            backgrounds: '🖼️',
            occasions: '🎉',
            cta: '🔘'
        };
        return icons[category] || '📌';
    },

    // Highlight match
    highlightMatch(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    // Escape regex
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    // Escape HTML
    escapeHtml(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    },

    // Truncate
    truncate(str, length) {
        return str.length > length ? str.substring(0, length) + '...' : str;
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('prompt-suggestions-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'prompt-suggestions-styles';
        styles.textContent = `
            .prompt-suggestions-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--dark-surface);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-xl);
                margin-top: var(--spacing-2);
                max-height: 400px;
                overflow-y: auto;
                z-index: 1000;
                box-shadow: var(--shadow-2xl);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all var(--transition-fast);
            }

            .prompt-suggestions-dropdown.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .suggestion-section {
                padding: var(--spacing-3);
                border-bottom: 1px solid var(--dark-border);
            }

            .suggestion-section:last-child {
                border-bottom: none;
            }

            .suggestion-section-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-size: var(--text-xs);
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: var(--spacing-2);
                margin-bottom: var(--spacing-2);
            }

            .suggestion-section-title i {
                color: var(--primary-400);
            }

            .suggestion-item {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-3);
                border-radius: var(--radius-lg);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .suggestion-item:hover,
            .suggestion-item.active {
                background: var(--dark-card);
            }

            .suggestion-item i {
                color: var(--text-muted);
                width: 16px;
                text-align: center;
            }

            .suggestion-item span {
                flex: 1;
                font-size: var(--text-sm);
            }

            .suggestion-item mark {
                background: rgba(99, 102, 241, 0.3);
                color: var(--primary-300);
                padding: 0 2px;
                border-radius: 2px;
            }

            .suggestion-item.recent {
                color: var(--text-secondary);
            }

            .suggestion-chips {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-2);
                padding: var(--spacing-2);
            }

            .suggestion-chip {
                padding: var(--spacing-2) var(--spacing-3);
                background: var(--dark-card);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-full);
                color: var(--text-secondary);
                font-size: var(--text-xs);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .suggestion-chip:hover {
                background: var(--primary-500);
                border-color: var(--primary-500);
                color: white;
            }

            .suggestion-chip mark {
                background: transparent;
                color: var(--primary-400);
                font-weight: var(--font-semibold);
            }

            .suggestion-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--spacing-8);
                color: var(--text-muted);
                gap: var(--spacing-2);
            }

            .suggestion-empty i {
                font-size: 1.5rem;
            }

            /* LLM-specific styles */
            .llm-loading {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-3) var(--spacing-4);
                background: linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
                border-bottom: 1px solid var(--dark-border);
                color: var(--text-secondary);
                font-size: var(--text-sm);
            }

            .loading-spinner-small {
                width: 16px;
                height: 16px;
                border: 2px solid var(--dark-border);
                border-top-color: var(--primary-500);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .suggestion-header {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-size: var(--text-xs);
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: var(--spacing-2);
                margin-bottom: var(--spacing-2);
            }

            .suggestion-header .icon {
                font-size: 14px;
            }

            .suggestion-icon {
                font-size: 14px;
                min-width: 20px;
            }

            .suggestion-text {
                flex: 1;
                font-size: var(--text-sm);
            }

            .suggestion-badge {
                font-size: var(--text-xs);
                padding: 2px 8px;
                border-radius: var(--radius-full);
                font-weight: var(--font-medium);
            }

            .suggestion-badge.ai {
                background: linear-gradient(135deg, var(--primary-500), var(--secondary-500));
                color: white;
            }

            .suggestion-badge.enhance {
                background: var(--success-500);
                color: white;
            }

            .llm-suggestion {
                border-left: 3px solid var(--primary-500);
                margin-left: var(--spacing-2);
            }

            .keyword-chips {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-2);
                padding: var(--spacing-2);
            }

            .keyword-chip {
                padding: var(--spacing-1) var(--spacing-3);
                background: var(--dark-card);
                border: 1px solid var(--primary-500);
                border-radius: var(--radius-full);
                color: var(--primary-400);
                font-size: var(--text-xs);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .keyword-chip:hover {
                background: var(--primary-500);
                color: white;
            }

            .no-suggestions {
                padding: var(--spacing-6);
                text-align: center;
                color: var(--text-muted);
                font-size: var(--text-sm);
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    PromptSuggestions.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptSuggestions;
}
