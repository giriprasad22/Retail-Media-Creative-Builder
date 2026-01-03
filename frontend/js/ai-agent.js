/**
 * AI Agent Integration for Retail Media Creative Builder
 * Comprehensive AI-powered editing with Indian e-commerce focus
 */

class AIAgentController {
    constructor(editor) {
        this.editor = editor;
        this.currentLanguage = 'en';
        this.documentId = `doc_${Date.now()}`;
        this.suggestions = [];
        this.currentSuggestionIndex = 0;
        this.abVariants = [];
        this.festivalPalettes = {
            diwali: { name: 'Diwali', icon: '🪔', colors: ['#FF9933', '#FFD700', '#800020', '#FFFFFF'] },
            holi: { name: 'Holi', icon: '🎨', colors: ['#FF1493', '#00FF00', '#FFFF00', '#FF6347'] },
            independence: { name: 'Independence Day', icon: '🇮🇳', colors: ['#FF9933', '#FFFFFF', '#138808', '#000080'] },
            christmas: { name: 'Christmas', icon: '🎄', colors: ['#C41E3A', '#228B22', '#FFD700', '#FFFFFF'] },
            eid: { name: 'Eid', icon: '🌙', colors: ['#006400', '#FFD700', '#FFFFFF', '#C0C0C0'] }
        };
        this.pendingPatch = null;
        this.isProcessing = false;
        this.telemetry = [];
        
        this.baseUrl = '/api/ai/agent';
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.renderLanguageToggle();
        this.renderFestivalPresets();
        this.renderSuggestionsPanel();
    }
    
    setupEventListeners() {
        // AI command input handler
        const aiInput = document.getElementById('aiInput');
        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.processCommand();
                }
            });
        }
        
        // Keyboard shortcuts for AI features
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+L - Toggle language
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.cycleLanguage();
            }
            // Ctrl+Shift+S - Get suggestions
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.getSuggestions();
            }
            // Ctrl+Shift+A - Generate A/B variants
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.generateABVariants();
            }
        });
    }
    
    // ============ LANGUAGE MANAGEMENT ============
    
    renderLanguageToggle() {
        const container = document.getElementById('aiLanguageToggle');
        if (!container) return;
        
        const languages = [
            { code: 'en', label: 'EN', name: 'English' },
            { code: 'hi', label: 'हि', name: 'Hindi' },
            { code: 'te', label: 'తె', name: 'Telugu' },
            { code: 'hi-en', label: 'Hi-En', name: 'Hinglish' }
        ];
        
        container.innerHTML = `
            <div class="language-toggle">
                ${languages.map(lang => `
                    <button class="lang-btn ${lang.code === this.currentLanguage ? 'active' : ''}" 
                            data-lang="${lang.code}" 
                            title="${lang.name}">
                        ${lang.label}
                    </button>
                `).join('')}
            </div>
        `;
        
        container.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setLanguage(btn.dataset.lang));
        });
    }
    
    setLanguage(lang) {
        this.currentLanguage = lang;
        this.renderLanguageToggle();
        this.addSystemMessage(`Language set to ${this.getLanguageName(lang)}`);
        this.trackTelemetry('language_change', { language: lang });
    }
    
    cycleLanguage() {
        const langs = ['en', 'hi', 'te', 'hi-en'];
        const idx = langs.indexOf(this.currentLanguage);
        this.setLanguage(langs[(idx + 1) % langs.length]);
    }
    
    getLanguageName(code) {
        const names = { en: 'English', hi: 'Hindi', te: 'Telugu', 'hi-en': 'Hinglish' };
        return names[code] || code;
    }
    
    // ============ FESTIVAL PRESETS ============
    
    renderFestivalPresets() {
        const container = document.getElementById('aiFestivalPresets');
        if (!container) return;
        
        const contentDiv = container.querySelector('.section-content') || container;
        contentDiv.innerHTML = `
            <div class="festival-presets" style="padding: 0; margin: 0; background: transparent; border: none;">
                <div class="presets-grid">
                    ${Object.entries(this.festivalPalettes).map(([key, fest]) => `
                        <button class="festival-btn" data-festival="${key}" title="${fest.name}">
                            <span class="festival-icon">${fest.icon}</span>
                            <span class="festival-name">${fest.name}</span>
                            <div class="festival-colors">
                                ${fest.colors.slice(0, 4).map(c => `<span class="color-dot" style="background:${c}"></span>`).join('')}
                            </div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        contentDiv.querySelectorAll('.festival-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyFestivalTheme(btn.dataset.festival));
        });
    }
    
    async applyFestivalTheme(festival) {
        const palette = this.festivalPalettes[festival];
        if (!palette) return;
        
        this.addSystemMessage(`🎨 Applying ${palette.name} theme...`);
        
        try {
            const result = await this.fetchAPI('/style-suggestions', {
                doc: this.getDocumentModel(),
                language: this.currentLanguage,
                festival: festival
            });
            
            if (result.success && result.styles) {
                const suggestions = result.styles.map((style, idx) => ({
                    type: 'style',
                    description: style,
                    preview: style,
                    confidence: result.confidence || 0.8,
                    patch: idx === result.recommended_index ? result.patch : null
                }));
                
                this.showSuggestionCards(suggestions, `${palette.name} Styles`);
            } else {
                // Fallback: apply palette directly
                this.applyPalette(palette.colors);
            }
            
            this.trackTelemetry('festival_theme', { festival });
        } catch (error) {
            console.error('Festival theme error:', error);
            // Fallback: apply palette directly
            this.applyPalette(palette.colors);
        }
    }
    
    applyPalette(colors) {
        if (!this.editor || !this.editor.elements) return;
        
        // Apply colors to elements
        this.editor.elements.forEach((el, idx) => {
            if (el.type === 'text' && idx < colors.length) {
                el.fill = colors[idx % colors.length];
            } else if (el.type === 'shape' && idx < colors.length) {
                el.fill = colors[(idx + 1) % colors.length];
            }
        });
        
        this.editor.draw();
        this.editor.saveToHistory();
        this.addSystemMessage('✅ Festival colors applied!');
    }
    
    // ============ AI SUGGESTIONS ============
    
    renderSuggestionsPanel() {
        const container = document.getElementById('aiSuggestionsPanel');
        if (!container) return;
        
        const contentDiv = container.querySelector('.section-content') || container;
        contentDiv.innerHTML = `
            <div class="suggestions-panel" style="padding: 0; margin: 0; background: transparent; border: none;">
                <div class="suggestions-header" style="padding: 0.5rem 0;">
                    <button class="refresh-btn" onclick="aiAgent.getSuggestions()" title="Get new suggestions" style="margin-left: auto;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                <div class="suggestions-cards" id="suggestionCards">
                    <div class="empty-suggestions">
                        <i class="fas fa-lightbulb"></i>
                        <p>Click refresh to get suggestions</p>
                    </div>
                </div>
                <div class="suggestions-nav" id="suggestionsNav" style="display: none;">
                    <button class="nav-btn prev" onclick="aiAgent.prevSuggestion()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="nav-indicator" id="suggestionIndicator">1 / 3</span>
                    <button class="nav-btn next" onclick="aiAgent.nextSuggestion()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    async getSuggestions() {
        this.addAssistantMessage('💡 Let me take a look at your design and suggest some improvements...');
        this.setProcessing(true);
        
        try {
            const result = await this.fetchAPI('/suggest', {
                doc: this.getDocumentModel(),
                intent: 'creative_rewrite',
                locale: this.currentLanguage,
                context: { focus_area: 'all' }
            });
            
            if (result.success && result.suggestion) {
                // Convert suggestion to card format
                const suggestions = result.suggestion.variants.map((variant, idx) => ({
                    type: result.suggestion.intent || 'creative',
                    description: variant,
                    preview: variant,
                    confidence: result.suggestion.confidence,
                    patch: idx === result.suggestion.recommended_index ? result.patch : null
                }));
                
                this.showSuggestionCards(suggestions, 'AI Suggestions');
                this.addAssistantMessage(`✨ Great! I found ${suggestions.length} suggestions for you. Swipe through the cards below:`);
            } else {
                this.addAssistantMessage('✅ Your creative looks great! I don\'t have any suggestions at this moment.');
            }
            
            this.trackTelemetry('get_suggestions', { count: result.suggestion?.variants?.length || 0 });
        } catch (error) {
            console.error('Suggestions error:', error);
            this.addAssistantMessage('❌ Sorry, I couldn\'t generate suggestions right now. Please try again.');
        } finally {
            this.setProcessing(false);
        }
    }
    
    showSuggestionCards(suggestions, title = 'Suggestions') {
        this.suggestions = suggestions;
        this.currentSuggestionIndex = 0;
        
        const container = document.getElementById('suggestionCards');
        const nav = document.getElementById('suggestionsNav');
        
        if (!container) return;
        
        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="empty-suggestions">
                    <i class="fas fa-check-circle"></i>
                    <p>No suggestions - your creative looks great!</p>
                </div>
            `;
            if (nav) nav.style.display = 'none';
            return;
        }
        
        this.renderCurrentSuggestion();
        
        if (nav) {
            nav.style.display = suggestions.length > 1 ? 'flex' : 'none';
            this.updateSuggestionIndicator();
        }
    }
    
    renderCurrentSuggestion() {
        const suggestion = this.suggestions[this.currentSuggestionIndex];
        if (!suggestion) return;
        
        const container = document.getElementById('suggestionCards');
        if (!container) return;
        
        const typeIcons = {
            copy: '✍️',
            layout: '📐',
            style: '🎨',
            cta: '🎯',
            localization: '🌐'
        };
        
        const icon = typeIcons[suggestion.type] || '💡';
        
        container.innerHTML = `
            <div class="suggestion-card" data-index="${this.currentSuggestionIndex}">
                <div class="suggestion-type">
                    <span class="type-icon">${icon}</span>
                    <span class="type-label">${suggestion.type || 'suggestion'}</span>
                    ${suggestion.confidence ? `<span class="confidence">${Math.round(suggestion.confidence * 100)}% confident</span>` : ''}
                </div>
                <div class="suggestion-content">
                    <p class="suggestion-text">${this.escapeHtml(suggestion.description || suggestion.text || '')}</p>
                    ${suggestion.preview ? `<div class="suggestion-preview">${this.escapeHtml(suggestion.preview)}</div>` : ''}
                </div>
                <div class="suggestion-actions">
                    <button class="action-btn preview" onclick="aiAgent.previewSuggestion(${this.currentSuggestionIndex})">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="action-btn apply" onclick="aiAgent.applySuggestion(${this.currentSuggestionIndex})">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="action-btn reject" onclick="aiAgent.rejectSuggestion(${this.currentSuggestionIndex})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    prevSuggestion() {
        if (this.currentSuggestionIndex > 0) {
            this.currentSuggestionIndex--;
            this.renderCurrentSuggestion();
            this.updateSuggestionIndicator();
        }
    }
    
    nextSuggestion() {
        if (this.currentSuggestionIndex < this.suggestions.length - 1) {
            this.currentSuggestionIndex++;
            this.renderCurrentSuggestion();
            this.updateSuggestionIndicator();
        }
    }
    
    updateSuggestionIndicator() {
        const indicator = document.getElementById('suggestionIndicator');
        if (indicator) {
            indicator.textContent = `${this.currentSuggestionIndex + 1} / ${this.suggestions.length}`;
        }
    }
    
    async previewSuggestion(index) {
        const suggestion = this.suggestions[index];
        if (!suggestion || !suggestion.patch) return;
        
        // Store current state for reverting
        this.pendingPatch = {
            suggestion,
            originalState: JSON.parse(JSON.stringify(this.editor.elements))
        };
        
        // Apply patch temporarily
        this.applyPatchToEditor(suggestion.patch);
        
        this.addAssistantMessage('👁️ Here\'s a preview! Click Apply to keep these changes or Reject to go back.');
    }
    
    async applySuggestion(index) {
        const suggestion = this.suggestions[index];
        if (!suggestion) return;
        
        this.setProcessing(true);
        
        try {
            if (suggestion.patch) {
                // Apply through backend for versioning
                const result = await this.fetchAPI('/apply-patch', {
                    doc_id: this.documentId,
                    patch: suggestion.patch
                });
                
                if (result.success) {
                    // Update local state if not already previewing
                    if (!this.pendingPatch || this.pendingPatch.suggestion !== suggestion) {
                        this.applyPatchToEditor(suggestion.patch);
                    }
                    
                    this.addAssistantMessage('✨ Perfect! I\'ve applied those changes to your design.');
                    this.trackTelemetry('suggestion_accepted', { 
                        type: suggestion.type, 
                        index 
                    });
                }
            } else {
                // Legacy: apply directly
                if (suggestion.actions) {
                    this.editor.applyAIActions(suggestion.actions);
                }
                this.addAssistantMessage('✨ Changes applied successfully!');
            }
            
            // Remove from suggestions list
            this.suggestions.splice(index, 1);
            if (this.currentSuggestionIndex >= this.suggestions.length) {
                this.currentSuggestionIndex = Math.max(0, this.suggestions.length - 1);
            }
            
            if (this.suggestions.length > 0) {
                this.renderCurrentSuggestion();
                this.updateSuggestionIndicator();
            } else {
                this.showSuggestionCards([], 'All done!');
            }
            
        } catch (error) {
            console.error('Apply suggestion error:', error);
            this.addAssistantMessage('❌ Sorry, I couldn\'t apply that suggestion. Please try again.');
        } finally {
            this.pendingPatch = null;
            this.setProcessing(false);
        }
    }
    
    rejectSuggestion(index) {
        // Revert if previewing
        if (this.pendingPatch && this.pendingPatch.suggestion === this.suggestions[index]) {
            this.editor.elements = this.pendingPatch.originalState;
            this.editor.draw();
            this.pendingPatch = null;
        }
        
        this.trackTelemetry('suggestion_rejected', { 
            type: this.suggestions[index]?.type, 
            index 
        });
        
        // Remove from list
        this.suggestions.splice(index, 1);
        if (this.currentSuggestionIndex >= this.suggestions.length) {
            this.currentSuggestionIndex = Math.max(0, this.suggestions.length - 1);
        }
        
        if (this.suggestions.length > 0) {
            this.renderCurrentSuggestion();
            this.updateSuggestionIndicator();
        } else {
            this.showSuggestionCards([], 'All done!');
        }
        
        this.addAssistantMessage('No problem! Let me know if you need anything else.');
    }
    
    // ============ COMMAND PROCESSING ============
    
    async processCommand(customCommand = null) {
        const input = document.getElementById('aiInput');
        const command = customCommand || (input ? input.value.trim() : '');
        
        if (!command) return;
        if (input) input.value = '';
        
        this.addUserMessage(command);
        this.setProcessing(true);
        
        try {
            const result = await this.fetchAPI('/command', {
                command: command,
                doc: this.getDocumentModel(),
                locale: this.currentLanguage,
                auto_apply: false
            });
            
            if (!result.success) {
                this.addAssistantMessage('❌ I couldn\'t process that command. Could you try rephrasing it?');
                return;
            }
            
            // Get natural language response
            const reason = result.suggestion?.reason || '';
            const intent = result.suggestion?.intent || '';
            
            // Apply patch if available
            if (result.patch) {
                this.applyPatchToEditor(result.patch);
                
                // Save to backend history
                await this.fetchAPI('/apply-patch', {
                    doc_id: this.documentId,
                    doc: this.getDocumentModel(),
                    patch: result.patch
                });
                
                // Natural language confirmation
                const response = reason || 'Perfect! I\'ve applied those changes to your design.';
                this.addAssistantMessage(`✨ ${response}`);
            } else if (result.suggestion?.variants && result.suggestion.variants.length > 0) {
                // Show suggestions with natural language intro
                const intro = reason || 'I have some suggestions for you. Swipe through the cards below to see different options:';
                this.addAssistantMessage(intro);
                this.showSuggestionCards([result.suggestion], 'Suggestions');
            } else {
                // Just acknowledgment
                const response = reason || 'I understand. Let me know if you need any changes!';
                this.addAssistantMessage(response);
            }
            
            this.trackTelemetry('command', { command, intent });
            
        } catch (error) {
            console.error('Command error:', error);
            this.addAssistantMessage('❌ Sorry, something went wrong. Could you try that again?');
        } finally {
            this.setProcessing(false);
        }
    }
    
    // ============ A/B VARIANTS ============
    
    async generateABVariants() {
        this.addAssistantMessage('🔬 Great! I\'m creating some A/B test variants for you. This will help you test different approaches...');
        this.setProcessing(true);
        
        try {
            const result = await this.fetchAPI('/ab-test', {
                doc: this.getDocumentModel(),
                context: {
                    language: this.currentLanguage,
                    num_variants: 3
                }
            });
            
            if (result.success) {
                // Create variants array from result
                this.abVariants = [
                    {
                        name: 'Variant A',
                        focus: 'Control',
                        changes: ['Original version'],
                        document: this.getDocumentModel()
                    },
                    {
                        name: 'Variant B',
                        focus: result.hypothesis || 'Test variant',
                        changes: result.variant_b?.split(',') || ['Modified version'],
                        document: result.variant_b_doc || this.getDocumentModel()
                    }
                ];
                
                if (result.variant_a) {
                    this.abVariants.unshift({
                        name: 'Variant A',
                        focus: 'Alternative',
                        changes: result.variant_a?.split(',') || ['Alternative version'],
                        document: result.variant_a_doc || this.getDocumentModel()
                    });
                }
                
                this.showABVariantsModal();
                this.addAssistantMessage(`🎯 Success! I created ${this.abVariants.length} A/B test variants for you. Choose the one that works best!`);
            } else {
                this.addAssistantMessage('Sorry, I couldn\'t generate variants right now. Please try again.');
            }
            
            this.trackTelemetry('ab_generate', { count: this.abVariants?.length || 0 });
            
        } catch (error) {
            console.error('A/B generation error:', error);
            this.addAssistantMessage('❌ Sorry, A/B variant generation failed. Please try again.');
        } finally {
            this.setProcessing(false);
        }
    }
    
    showABVariantsModal() {
        // Create modal if doesn't exist
        let modal = document.getElementById('abVariantsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'abVariantsModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-panel ab-variants-panel">
                <div class="modal-header">
                    <h2 class="modal-title">🔬 A/B Test Variants</h2>
                    <button class="modal-close" onclick="aiAgent.closeABModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="variants-grid">
                        ${this.abVariants.map((variant, idx) => `
                            <div class="variant-card" data-index="${idx}">
                                <div class="variant-header">
                                    <span class="variant-label">${variant.name || `Variant ${String.fromCharCode(65 + idx)}`}</span>
                                    ${variant.focus ? `<span class="variant-focus">${variant.focus}</span>` : ''}
                                </div>
                                <div class="variant-preview">
                                    ${this.renderVariantPreview(variant)}
                                </div>
                                <div class="variant-changes">
                                    ${(variant.changes || []).slice(0, 3).map(c => `
                                        <span class="change-tag">${c}</span>
                                    `).join('')}
                                </div>
                                <div class="variant-actions">
                                    <button class="action-btn apply" onclick="aiAgent.applyABVariant(${idx})">
                                        <i class="fas fa-check"></i> Use This
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    renderVariantPreview(variant) {
        // Simple text preview of changes
        const changes = [];
        if (variant.document && variant.document.blocks) {
            variant.document.blocks.forEach(block => {
                if (block.type === 'text' && block.text) {
                    changes.push(`<p class="preview-text">"${this.escapeHtml(block.text.substring(0, 50))}..."</p>`);
                }
            });
        }
        return changes.slice(0, 2).join('') || '<p class="preview-text">Modified layout</p>';
    }
    
    async applyABVariant(index) {
        const variant = this.abVariants[index];
        if (!variant) return;
        
        try {
            // Convert variant document to editor elements
            if (variant.document && variant.document.blocks) {
                this.applyDocumentToEditor(variant.document);
            }
            
            this.closeABModal();
            this.addAssistantMessage(`✨ Applied Variant ${String.fromCharCode(65 + index)}! Your design has been updated.`);
            this.trackTelemetry('ab_apply', { variant: index });
            
        } catch (error) {
            console.error('Apply variant error:', error);
            this.addAssistantMessage('❌ Sorry, I couldn\'t apply that variant. Please try again.');
        }
    }
    
    closeABModal() {
        const modal = document.getElementById('abVariantsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // ============ LOCALIZATION ============
    
    async localizeContent() {
        const targetLang = this.currentLanguage;
        if (targetLang === 'en') {
            this.addAssistantMessage('Your content is already in English! Please select another language from the toggle above.');
            return;
        }
        
        this.addAssistantMessage(`🌐 I'm translating your content to ${this.getLanguageName(targetLang)} while keeping it culturally relevant...`);
        this.setProcessing(true);
        
        try {
            const result = await this.fetchAPI('/localize', {
                doc: this.getDocumentModel(),
                target_locale: targetLang,
                context: { adapt_for_market: true }
            });
            
            if (result.success && result.patch) {
                // Apply the localization patch
                this.applyPatchToEditor(result.patch);
                this.addAssistantMessage(`✨ Done! Your content is now in ${this.getLanguageName(targetLang)}.`);
            } else if (result.success && result.suggestion?.variants) {
                // Show variants to choose from
                const suggestions = result.suggestion.variants.map((variant, idx) => ({
                    type: 'localization',
                    description: variant,
                    preview: variant,
                    confidence: result.suggestion.confidence,
                    patch: idx === result.suggestion.recommended_index ? result.patch : null
                }));
                
                this.showSuggestionCards(suggestions, `Localized to ${this.getLanguageName(targetLang)}`);
            } else {
                this.addAssistantMessage('Sorry, I couldn\'t translate the content. Please try again.');
            }
            
            this.trackTelemetry('localize', { target: targetLang });
            
        } catch (error) {
            console.error('Localization error:', error);
            this.addAssistantMessage('❌ Translation failed. Please try again.');
        } finally {
            this.setProcessing(false);
        }
    }
    
    // ============ UNDO/REDO ============
    
    async undo() {
        try {
            const result = await this.fetchAPI(`/undo/${this.documentId}`, {}, 'POST');
            
            if (result.success && result.document) {
                this.applyDocumentToEditor(result.document);
                this.addSystemMessage('↩️ Undone');
            } else {
                // Fallback to local undo
                if (this.editor && this.editor.undo) {
                    this.editor.undo();
                }
            }
            
            // Update button states
            this.updateHistoryButtons();
        } catch (error) {
            // Fallback to local undo
            if (this.editor && this.editor.undo) {
                this.editor.undo();
            }
        }
    }
    
    async redo() {
        try {
            const result = await this.fetchAPI(`/redo/${this.documentId}`, {}, 'POST');
            
            if (result.success && result.document) {
                this.applyDocumentToEditor(result.document);
                this.addSystemMessage('↪️ Redone');
            } else {
                // Fallback to local redo
                if (this.editor && this.editor.redo) {
                    this.editor.redo();
                }
            }
            
            // Update button states
            this.updateHistoryButtons();
        } catch (error) {
            // Fallback to local redo
            if (this.editor && this.editor.redo) {
                this.editor.redo();
            }
        }
    }
    
    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (this.editor) {
            if (undoBtn) {
                undoBtn.disabled = this.editor.historyIndex <= 0;
            }
            if (redoBtn) {
                redoBtn.disabled = this.editor.historyIndex >= this.editor.history.length - 1;
            }
        }
    }
    
    // ============ DOCUMENT MODEL CONVERSION ============
    
    getDocumentModel() {
        // Convert editor elements to document model
        const blocks = (this.editor?.elements || []).map((el, idx) => ({
            id: el.id || `block_${idx}`,
            type: this.mapElementType(el.type),
            text: el.text || el.content || '',
            style: {
                font_size: el.fontSize || 16,
                font_family: el.fontFamily || 'Arial',
                color: el.fill || el.color || '#000000',
                background: el.backgroundColor || 'transparent',
                font_weight: el.fontWeight || 'normal'
            },
            position: {
                x: el.x || 0,
                y: el.y || 0,
                width: el.width || 100,
                height: el.height || 50,
                z_index: el.zIndex || idx
            }
        }));
        
        return {
            id: this.documentId,
            canvas: {
                width: this.editor?.canvas?.width || 1200,
                height: this.editor?.canvas?.height || 628
            },
            blocks
        };
    }
    
    mapElementType(type) {
        const typeMap = {
            'text': 'text',
            'headline': 'headline',
            'subheadline': 'subheadline',
            'price': 'price',
            'cta': 'cta',
            'button': 'cta',
            'image': 'image',
            'shape': 'shape',
            'rectangle': 'shape',
            'background': 'background'
        };
        return typeMap[type] || 'text';
    }
    
    applyDocumentToEditor(document) {
        if (!document || !document.blocks || !this.editor) return;
        
        // Convert document blocks back to editor elements
        this.editor.elements = document.blocks.map((block, idx) => ({
            id: block.id,
            type: block.type === 'cta' ? 'button' : block.type,
            text: block.text || '',
            content: block.text || '',
            x: block.position?.x || 0,
            y: block.position?.y || 0,
            width: block.position?.width || 100,
            height: block.position?.height || 50,
            fontSize: block.style?.font_size || 16,
            fontFamily: block.style?.font_family || 'Arial',
            fill: block.style?.color || '#000000',
            color: block.style?.color || '#000000',
            backgroundColor: block.style?.background || 'transparent',
            fontWeight: block.style?.font_weight || 'normal',
            zIndex: block.position?.z_index || idx
        }));
        
        this.editor.renderLayers();
        this.editor.draw();
        this.editor.saveToHistory();
    }
    
    applyPatchToEditor(patch) {
        if (!patch || !this.editor) return;
        
        const operations = Array.isArray(patch) ? patch : [patch];
        
        operations.forEach(op => {
            switch (op.op || op.operation) {
                case 'replace_text':
                    this.applyReplaceText(op);
                    break;
                case 'update_style':
                    this.applyUpdateStyle(op);
                    break;
                case 'move_block':
                    this.applyMoveBlock(op);
                    break;
                case 'add_block':
                    this.applyAddBlock(op);
                    break;
                case 'delete_block':
                    this.applyDeleteBlock(op);
                    break;
            }
        });
        
        this.editor.renderLayers();
        this.editor.draw();
        this.editor.saveToHistory();
    }
    
    applyReplaceText(op) {
        const element = this.findElement(op.block_id || op.target);
        if (element) {
            element.text = op.new_value || op.value;
            element.content = op.new_value || op.value;
        }
    }
    
    applyUpdateStyle(op) {
        const element = this.findElement(op.block_id || op.target);
        if (element && op.style) {
            if (op.style.font_size) element.fontSize = op.style.font_size;
            if (op.style.color) {
                element.fill = op.style.color;
                element.color = op.style.color;
            }
            if (op.style.font_family) element.fontFamily = op.style.font_family;
            if (op.style.font_weight) element.fontWeight = op.style.font_weight;
            if (op.style.background) element.backgroundColor = op.style.background;
        }
    }
    
    applyMoveBlock(op) {
        const element = this.findElement(op.block_id || op.target);
        if (element && op.position) {
            if (op.position.x !== undefined) element.x = op.position.x;
            if (op.position.y !== undefined) element.y = op.position.y;
            if (op.position.width !== undefined) element.width = op.position.width;
            if (op.position.height !== undefined) element.height = op.position.height;
        }
    }
    
    applyAddBlock(op) {
        const block = op.block || op;
        this.editor.elements.push({
            id: block.id || `element_${Date.now()}`,
            type: block.type || 'text',
            text: block.text || '',
            content: block.text || '',
            x: block.position?.x || 100,
            y: block.position?.y || 100,
            width: block.position?.width || 200,
            height: block.position?.height || 50,
            fontSize: block.style?.font_size || 16,
            fontFamily: block.style?.font_family || 'Arial',
            fill: block.style?.color || '#000000',
            color: block.style?.color || '#000000'
        });
    }
    
    applyDeleteBlock(op) {
        const idx = this.editor.elements.findIndex(el => 
            el.id === (op.block_id || op.target)
        );
        if (idx > -1) {
            this.editor.elements.splice(idx, 1);
        }
    }
    
    findElement(id) {
        return this.editor?.elements?.find(el => 
            el.id === id || 
            el.name?.toLowerCase().includes(id?.toLowerCase())
        );
    }
    
    // ============ CHAT MESSAGES ============
    
    addUserMessage(text) {
        this.addMessage('user', text);
    }
    
    addAssistantMessage(text) {
        this.addMessage('assistant', text);
    }
    
    addSystemMessage(text) {
        this.addMessage('system', text);
    }
    
    addMessage(role, text) {
        const container = document.getElementById('aiMessages');
        if (!container) return;
        
        const message = document.createElement('div');
        message.className = `ai-message ${role}`;
        
        if (role === 'system') {
            message.innerHTML = `
                <div class="ai-message-content system">
                    <i class="fas fa-info-circle"></i>
                    <span>${text}</span>
                </div>
            `;
        } else {
            message.innerHTML = `
                <div class="ai-message-content">
                    ${text}
                </div>
            `;
        }
        
        container.appendChild(message);
        container.scrollTop = container.scrollHeight;
    }
    
    // ============ UTILITIES ============
    
    setProcessing(isProcessing) {
        this.isProcessing = isProcessing;
        
        const sendBtn = document.getElementById('aiSendBtn');
        const input = document.getElementById('aiInput');
        
        if (sendBtn) {
            sendBtn.disabled = isProcessing;
            sendBtn.innerHTML = isProcessing 
                ? '<i class="fas fa-spinner fa-spin"></i>' 
                : '<i class="fas fa-paper-plane"></i>';
        }
        
        if (input) {
            input.disabled = isProcessing;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async fetchAPI(endpoint, data = {}, method = 'POST') {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (method !== 'GET' && Object.keys(data).length > 0) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    trackTelemetry(action, data = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            language: this.currentLanguage,
            ...data
        };
        
        this.telemetry.push(entry);
        
        // Send to backend asynchronously
        this.fetchAPI('/telemetry', entry).catch(() => {});
    }
    
    // ============ QUICK ACTIONS ============
    
    async optimizeCTA() {
        this.addAssistantMessage('🎯 Let me optimize your call-to-action to boost conversions. I\'ll suggest some high-performing variants...');
        this.setProcessing(true);
        
        try {
            const result = await this.fetchAPI('/cta-optimize', {
                doc: this.getDocumentModel(),
                context: { objective: 'buy', language: this.currentLanguage }
            });
            
            if (result.success && result.ctas) {
                const suggestions = result.ctas.map((cta, idx) => ({
                    type: 'cta',
                    description: cta,
                    preview: cta,
                    confidence: result.confidence || 0.8,
                    patch: idx === result.recommended_index ? result.patch : null
                }));
                
                this.showSuggestionCards(suggestions, 'CTA Suggestions');
            } else {
                this.addAssistantMessage('Your CTA is already well optimized! Keep up the good work.');
            }
        } catch (error) {
            this.addAssistantMessage('❌ Sorry, I couldn\'t optimize the CTA. Please try again.');
        } finally {
            this.setProcessing(false);
        }
    }
    
    async getLayoutSuggestions() {
        this.addAssistantMessage('📐 I\'ll analyze your content and suggest some layout alternatives that might work better...');
        this.setProcessing(true);
        
        try {
            const result = await this.fetchAPI('/layout-suggestions', {
                doc: this.getDocumentModel(),
                platform: 'ecommerce'
            });
            
            if (result.success && result.layouts) {
                const suggestions = result.layouts.map((layout, idx) => ({
                    type: 'layout',
                    description: layout,
                    preview: layout,
                    confidence: result.confidence || 0.8,
                    patch: idx === result.recommended_index ? result.patch : null
                }));
                
                this.showSuggestionCards(suggestions, 'Layout Suggestions');
            } else {
                this.addAssistantMessage('Your layout looks well balanced! I don\'t have any suggestions right now.');
            }
        } catch (error) {
            this.addAssistantMessage('❌ Sorry, I couldn\'t analyze the layout. Please try again.');
        } finally {
            this.setProcessing(false);
        }
    }
}

// Global instance
let aiAgent = null;

// Initialize when editor is ready
function initAIAgent(editor) {
    aiAgent = new AIAgentController(editor);
    window.aiAgent = aiAgent;
    return aiAgent;
}

// Expose global functions for HTML onclick handlers
function sendAICommand(command) {
    if (aiAgent) {
        if (command) {
            const input = document.getElementById('aiInput');
            if (input) {
                input.value = command;
            }
        }
        aiAgent.processCommand(command);
    } else {
        console.error('AI Agent not initialized yet. Please wait a moment and try again.');
        
        // Show user-friendly message
        const messagesContainer = document.getElementById('aiMessages');
        if (messagesContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'ai-message assistant';
            errorDiv.innerHTML = `
                <div class="ai-message-content">
                    ⚠️ AI Agent is still initializing. Please wait a moment and try again.
                </div>
            `;
            messagesContainer.appendChild(errorDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Try to initialize if not already done
        if (window.editor && !aiAgent) {
            console.log('Attempting late initialization...');
            initAIAgent(window.editor);
            // Retry command after initialization
            setTimeout(() => {
                if (command) {
                    sendAICommand(command);
                }
            }, 500);
        }
    }
}
