/**
 * Settings Modal - User preferences and app configuration
 */

const SettingsModal = {
    // Default settings
    defaults: {
        general: {
            theme: 'dark',
            language: 'en',
            autoSave: true,
            autoSaveInterval: 30,
            showGrid: true,
            snapToGrid: true,
            gridSize: 10
        },
        editor: {
            defaultPlatform: 'amazon',
            showRulers: true,
            showSafeZones: true,
            highlightOverflow: true,
            undoLimit: 50,
            defaultExportFormat: 'png',
            exportQuality: 90
        },
        ai: {
            model: 'auto',
            creativity: 0.7,
            enhancePrompts: true,
            autoCheckCompliance: true,
            generateVariations: 3
        },
        notifications: {
            showToasts: true,
            toastDuration: 3000,
            soundEnabled: false,
            desktopNotifications: false
        }
    },

    // Current settings
    settings: null,

    // Active tab
    activeTab: 'general',

    // Initialize
    init() {
        this.settings = this.load();
        this.injectStyles();
    },

    // Load settings from storage
    load() {
        const saved = localStorage.getItem('rmcb_settings');
        if (saved) {
            try {
                return { ...this.defaults, ...JSON.parse(saved) };
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
        return { ...this.defaults };
    },

    // Save settings
    save() {
        localStorage.setItem('rmcb_settings', JSON.stringify(this.settings));
        
        // Apply settings
        this.apply();
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('settings-changed', { 
            detail: this.settings 
        }));

        if (typeof Toast !== 'undefined') {
            Toast.success('Settings saved');
        }
    },

    // Apply settings to UI
    apply() {
        // Theme
        document.body.dataset.theme = this.settings.general.theme;

        // Grid
        if (typeof Editor !== 'undefined' && Editor.setGrid) {
            Editor.setGrid(this.settings.general.showGrid, this.settings.general.gridSize);
        }

        // Other app-wide settings can be applied here
    },

    // Get a setting value
    get(path) {
        const parts = path.split('.');
        let value = this.settings;
        for (const part of parts) {
            value = value?.[part];
        }
        return value;
    },

    // Set a setting value
    set(path, value) {
        const parts = path.split('.');
        let obj = this.settings;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
    },

    // Reset to defaults
    reset() {
        if (confirm('Reset all settings to defaults?')) {
            this.settings = { ...this.defaults };
            this.save();
            this.renderContent();
        }
    },

    // Open modal
    open(tab = 'general') {
        this.activeTab = tab;
        
        const modal = document.createElement('div');
        modal.className = 'settings-modal-overlay';
        modal.id = 'settingsModal';
        modal.innerHTML = this.render();
        document.body.appendChild(modal);

        // Animation
        requestAnimationFrame(() => modal.classList.add('open'));

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        // Escape key
        document.addEventListener('keydown', this.handleEscape);
    },

    // Close modal
    close() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => modal.remove(), 200);
        }
        document.removeEventListener('keydown', this.handleEscape);
    },

    // Handle escape key
    handleEscape(e) {
        if (e.key === 'Escape') {
            SettingsModal.close();
        }
    },

    // Switch tab
    switchTab(tab) {
        this.activeTab = tab;
        this.renderContent();

        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    },

    // Render modal
    render() {
        return `
            <div class="settings-modal">
                <div class="settings-header">
                    <h2>
                        <i class="fas fa-cog"></i>
                        Settings
                    </h2>
                    <button class="btn btn-ghost btn-icon" onclick="SettingsModal.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="settings-body">
                    <div class="settings-sidebar">
                        <button class="settings-tab ${this.activeTab === 'general' ? 'active' : ''}" 
                                data-tab="general"
                                onclick="SettingsModal.switchTab('general')">
                            <i class="fas fa-sliders-h"></i>
                            General
                        </button>
                        <button class="settings-tab ${this.activeTab === 'editor' ? 'active' : ''}"
                                data-tab="editor"
                                onclick="SettingsModal.switchTab('editor')">
                            <i class="fas fa-edit"></i>
                            Editor
                        </button>
                        <button class="settings-tab ${this.activeTab === 'ai' ? 'active' : ''}"
                                data-tab="ai"
                                onclick="SettingsModal.switchTab('ai')">
                            <i class="fas fa-robot"></i>
                            AI Settings
                        </button>
                        <button class="settings-tab ${this.activeTab === 'notifications' ? 'active' : ''}"
                                data-tab="notifications"
                                onclick="SettingsModal.switchTab('notifications')">
                            <i class="fas fa-bell"></i>
                            Notifications
                        </button>
                        <button class="settings-tab ${this.activeTab === 'shortcuts' ? 'active' : ''}"
                                data-tab="shortcuts"
                                onclick="SettingsModal.switchTab('shortcuts')">
                            <i class="fas fa-keyboard"></i>
                            Shortcuts
                        </button>
                        <button class="settings-tab ${this.activeTab === 'about' ? 'active' : ''}"
                                data-tab="about"
                                onclick="SettingsModal.switchTab('about')">
                            <i class="fas fa-info-circle"></i>
                            About
                        </button>
                    </div>

                    <div class="settings-content" id="settingsContent">
                        ${this.renderTabContent()}
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="btn btn-ghost" onclick="SettingsModal.reset()">
                        <i class="fas fa-undo"></i>
                        Reset to Defaults
                    </button>
                    <div class="settings-footer-actions">
                        <button class="btn btn-secondary" onclick="SettingsModal.close()">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="SettingsModal.save()">
                            <i class="fas fa-check"></i>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Render content area only
    renderContent() {
        const container = document.getElementById('settingsContent');
        if (container) {
            container.innerHTML = this.renderTabContent();
        }
    },

    // Render tab content
    renderTabContent() {
        switch (this.activeTab) {
            case 'general': return this.renderGeneralTab();
            case 'editor': return this.renderEditorTab();
            case 'ai': return this.renderAITab();
            case 'notifications': return this.renderNotificationsTab();
            case 'shortcuts': return this.renderShortcutsTab();
            case 'about': return this.renderAboutTab();
            default: return '';
        }
    },

    // General tab
    renderGeneralTab() {
        const s = this.settings.general;
        return `
            <div class="settings-section">
                <h3>Appearance</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Theme</label>
                        <span class="setting-description">Choose your preferred color scheme</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('general.theme', this.value)">
                        <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="system" ${s.theme === 'system' ? 'selected' : ''}>System</option>
                    </select>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Language</label>
                        <span class="setting-description">Select interface language</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('general.language', this.value)">
                        <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
                        <option value="es" ${s.language === 'es' ? 'selected' : ''}>Español</option>
                        <option value="fr" ${s.language === 'fr' ? 'selected' : ''}>Français</option>
                        <option value="de" ${s.language === 'de' ? 'selected' : ''}>Deutsch</option>
                        <option value="hi" ${s.language === 'hi' ? 'selected' : ''}>हिंदी</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3>Auto Save</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Enable Auto Save</label>
                        <span class="setting-description">Automatically save your work</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.autoSave ? 'checked' : ''}
                               onchange="SettingsModal.set('general.autoSave', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Save Interval</label>
                        <span class="setting-description">Seconds between auto saves</span>
                    </div>
                    <input type="number" class="form-input" value="${s.autoSaveInterval}" min="10" max="300"
                           onchange="SettingsModal.set('general.autoSaveInterval', parseInt(this.value))">
                </div>
            </div>

            <div class="settings-section">
                <h3>Grid & Snapping</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Show Grid</label>
                        <span class="setting-description">Display grid on canvas</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.showGrid ? 'checked' : ''}
                               onchange="SettingsModal.set('general.showGrid', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Snap to Grid</label>
                        <span class="setting-description">Snap elements to grid lines</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.snapToGrid ? 'checked' : ''}
                               onchange="SettingsModal.set('general.snapToGrid', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Grid Size</label>
                        <span class="setting-description">Size of grid cells in pixels</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('general.gridSize', parseInt(this.value))">
                        <option value="5" ${s.gridSize === 5 ? 'selected' : ''}>5px</option>
                        <option value="10" ${s.gridSize === 10 ? 'selected' : ''}>10px</option>
                        <option value="20" ${s.gridSize === 20 ? 'selected' : ''}>20px</option>
                        <option value="25" ${s.gridSize === 25 ? 'selected' : ''}>25px</option>
                    </select>
                </div>
            </div>
        `;
    },

    // Editor tab
    renderEditorTab() {
        const s = this.settings.editor;
        return `
            <div class="settings-section">
                <h3>Default Options</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Default Platform</label>
                        <span class="setting-description">Default platform for new creatives</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('editor.defaultPlatform', this.value)">
                        <option value="amazon" ${s.defaultPlatform === 'amazon' ? 'selected' : ''}>Amazon</option>
                        <option value="flipkart" ${s.defaultPlatform === 'flipkart' ? 'selected' : ''}>Flipkart</option>
                        <option value="dmart" ${s.defaultPlatform === 'dmart' ? 'selected' : ''}>DMart</option>
                        <option value="facebook" ${s.defaultPlatform === 'facebook' ? 'selected' : ''}>Facebook</option>
                        <option value="instagram" ${s.defaultPlatform === 'instagram' ? 'selected' : ''}>Instagram</option>
                    </select>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Default Export Format</label>
                        <span class="setting-description">Default format for exports</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('editor.defaultExportFormat', this.value)">
                        <option value="png" ${s.defaultExportFormat === 'png' ? 'selected' : ''}>PNG</option>
                        <option value="jpg" ${s.defaultExportFormat === 'jpg' ? 'selected' : ''}>JPG</option>
                        <option value="webp" ${s.defaultExportFormat === 'webp' ? 'selected' : ''}>WebP</option>
                    </select>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Export Quality</label>
                        <span class="setting-description">JPEG/WebP compression quality</span>
                    </div>
                    <div class="setting-slider">
                        <input type="range" min="50" max="100" value="${s.exportQuality}"
                               oninput="document.getElementById('qualityValue').textContent = this.value + '%'"
                               onchange="SettingsModal.set('editor.exportQuality', parseInt(this.value))">
                        <span id="qualityValue">${s.exportQuality}%</span>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Canvas Helpers</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Show Rulers</label>
                        <span class="setting-description">Display rulers around canvas</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.showRulers ? 'checked' : ''}
                               onchange="SettingsModal.set('editor.showRulers', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Show Safe Zones</label>
                        <span class="setting-description">Display platform safe zones</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.showSafeZones ? 'checked' : ''}
                               onchange="SettingsModal.set('editor.showSafeZones', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Highlight Overflow</label>
                        <span class="setting-description">Warn when content overflows</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.highlightOverflow ? 'checked' : ''}
                               onchange="SettingsModal.set('editor.highlightOverflow', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section">
                <h3>History</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Undo Limit</label>
                        <span class="setting-description">Max number of undo steps</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('editor.undoLimit', parseInt(this.value))">
                        <option value="20" ${s.undoLimit === 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${s.undoLimit === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${s.undoLimit === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
            </div>
        `;
    },

    // AI tab
    renderAITab() {
        const s = this.settings.ai;
        return `
            <div class="settings-section">
                <h3>AI Model</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Model Selection</label>
                        <span class="setting-description">AI model for generation</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('ai.model', this.value)">
                        <option value="auto" ${s.model === 'auto' ? 'selected' : ''}>Auto (Recommended)</option>
                        <option value="stable-diffusion" ${s.model === 'stable-diffusion' ? 'selected' : ''}>Stable Diffusion</option>
                        <option value="dall-e" ${s.model === 'dall-e' ? 'selected' : ''}>DALL-E</option>
                        <option value="midjourney" ${s.model === 'midjourney' ? 'selected' : ''}>Midjourney</option>
                    </select>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Creativity Level</label>
                        <span class="setting-description">Higher = more creative, lower = more accurate</span>
                    </div>
                    <div class="setting-slider">
                        <input type="range" min="0" max="100" value="${Math.round(s.creativity * 100)}"
                               oninput="document.getElementById('creativityValue').textContent = this.value + '%'"
                               onchange="SettingsModal.set('ai.creativity', parseInt(this.value) / 100)">
                        <span id="creativityValue">${Math.round(s.creativity * 100)}%</span>
                    </div>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Number of Variations</label>
                        <span class="setting-description">Variations to generate per request</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('ai.generateVariations', parseInt(this.value))">
                        <option value="1" ${s.generateVariations === 1 ? 'selected' : ''}>1</option>
                        <option value="2" ${s.generateVariations === 2 ? 'selected' : ''}>2</option>
                        <option value="3" ${s.generateVariations === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${s.generateVariations === 4 ? 'selected' : ''}>4</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3>Smart Features</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Enhance Prompts</label>
                        <span class="setting-description">AI improves your prompts automatically</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.enhancePrompts ? 'checked' : ''}
                               onchange="SettingsModal.set('ai.enhancePrompts', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Auto Check Compliance</label>
                        <span class="setting-description">Automatically check platform compliance</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.autoCheckCompliance ? 'checked' : ''}
                               onchange="SettingsModal.set('ai.autoCheckCompliance', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    },

    // Notifications tab
    renderNotificationsTab() {
        const s = this.settings.notifications;
        return `
            <div class="settings-section">
                <h3>Toast Notifications</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Show Toasts</label>
                        <span class="setting-description">Display in-app notifications</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.showToasts ? 'checked' : ''}
                               onchange="SettingsModal.set('notifications.showToasts', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Toast Duration</label>
                        <span class="setting-description">How long toasts are visible</span>
                    </div>
                    <select class="form-select" onchange="SettingsModal.set('notifications.toastDuration', parseInt(this.value))">
                        <option value="2000" ${s.toastDuration === 2000 ? 'selected' : ''}>2 seconds</option>
                        <option value="3000" ${s.toastDuration === 3000 ? 'selected' : ''}>3 seconds</option>
                        <option value="5000" ${s.toastDuration === 5000 ? 'selected' : ''}>5 seconds</option>
                        <option value="10000" ${s.toastDuration === 10000 ? 'selected' : ''}>10 seconds</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3>System Notifications</h3>
                
                <div class="setting-item">
                    <div class="setting-info">
                        <label>Sound Effects</label>
                        <span class="setting-description">Play sounds for notifications</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.soundEnabled ? 'checked' : ''}
                               onchange="SettingsModal.set('notifications.soundEnabled', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <label>Desktop Notifications</label>
                        <span class="setting-description">Browser notifications when not focused</span>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" ${s.desktopNotifications ? 'checked' : ''}
                               onchange="SettingsModal.set('notifications.desktopNotifications', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    },

    // Shortcuts tab
    renderShortcutsTab() {
        const shortcuts = [
            { keys: 'Ctrl + Z', action: 'Undo' },
            { keys: 'Ctrl + Shift + Z', action: 'Redo' },
            { keys: 'Ctrl + S', action: 'Save' },
            { keys: 'Ctrl + E', action: 'Export' },
            { keys: 'Ctrl + G', action: 'Generate Creative' },
            { keys: 'Delete / Backspace', action: 'Delete Selected' },
            { keys: 'V', action: 'Select Tool' },
            { keys: 'T', action: 'Text Tool' },
            { keys: 'M', action: 'Move/Pan Tool' },
            { keys: 'Ctrl + A', action: 'Select All' },
            { keys: 'Escape', action: 'Deselect / Close Modal' },
            { keys: 'Ctrl + +', action: 'Zoom In' },
            { keys: 'Ctrl + -', action: 'Zoom Out' },
            { keys: 'Ctrl + 0', action: 'Reset Zoom' },
            { keys: 'Arrow Keys', action: 'Nudge Selected' },
            { keys: '?', action: 'Show Help' }
        ];

        return `
            <div class="settings-section">
                <h3>Keyboard Shortcuts</h3>
                <p class="setting-description" style="margin-bottom: var(--spacing-4);">
                    Quick reference for keyboard shortcuts. Shortcuts cannot be customized yet.
                </p>
                
                <div class="shortcuts-list">
                    ${shortcuts.map(s => `
                        <div class="shortcut-item">
                            <span class="shortcut-action">${s.action}</span>
                            <kbd class="shortcut-keys">${s.keys}</kbd>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // About tab
    renderAboutTab() {
        return `
            <div class="settings-section about-section">
                <div class="about-header">
                    <div class="about-logo">
                        <i class="fas fa-wand-magic-sparkles"></i>
                    </div>
                    <h2>Retail Media Creative Builder</h2>
                    <p class="version">Version 1.0.0</p>
                </div>

                <div class="about-description">
                    <p>
                        AI-powered creative generation platform for retail media advertising. 
                        Create stunning, compliant ad creatives for Amazon, Flipkart, DMart, 
                        and social media platforms in seconds.
                    </p>
                </div>

                <div class="about-links">
                    <a href="#" class="about-link">
                        <i class="fas fa-book"></i>
                        Documentation
                    </a>
                    <a href="#" class="about-link">
                        <i class="fas fa-bug"></i>
                        Report Issue
                    </a>
                    <a href="#" class="about-link">
                        <i class="fas fa-envelope"></i>
                        Contact Support
                    </a>
                </div>

                <div class="about-credits">
                    <p>Built with ❤️ for retail marketers</p>
                    <p class="text-muted">© 2024 All rights reserved</p>
                </div>
            </div>
        `;
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('settings-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'settings-styles';
        styles.textContent = `
            .settings-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity var(--transition-fast);
            }

            .settings-modal-overlay.open {
                opacity: 1;
            }

            .settings-modal {
                background: var(--dark-surface);
                border-radius: var(--radius-xl);
                width: 800px;
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                transform: scale(0.95);
                transition: transform var(--transition-fast);
            }

            .settings-modal-overlay.open .settings-modal {
                transform: scale(1);
            }

            .settings-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-6);
                border-bottom: 1px solid var(--dark-border);
            }

            .settings-header h2 {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                margin: 0;
                font-size: var(--text-xl);
            }

            .settings-header h2 i {
                color: var(--primary-400);
            }

            .settings-body {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            .settings-sidebar {
                width: 200px;
                padding: var(--spacing-4);
                border-right: 1px solid var(--dark-border);
                display: flex;
                flex-direction: column;
                gap: var(--spacing-1);
            }

            .settings-tab {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-3) var(--spacing-4);
                background: transparent;
                border: none;
                border-radius: var(--radius-lg);
                color: var(--text-secondary);
                cursor: pointer;
                transition: all var(--transition-fast);
                text-align: left;
                font-size: var(--text-sm);
            }

            .settings-tab:hover {
                background: var(--dark-card);
                color: var(--text-primary);
            }

            .settings-tab.active {
                background: rgba(99, 102, 241, 0.1);
                color: var(--primary-400);
            }

            .settings-content {
                flex: 1;
                padding: var(--spacing-6);
                overflow-y: auto;
            }

            .settings-section {
                margin-bottom: var(--spacing-8);
            }

            .settings-section h3 {
                font-size: var(--text-base);
                color: var(--text-primary);
                margin: 0 0 var(--spacing-4);
                padding-bottom: var(--spacing-2);
                border-bottom: 1px solid var(--dark-border);
            }

            .setting-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-4) 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .setting-info {
                flex: 1;
            }

            .setting-info label {
                display: block;
                font-weight: var(--font-medium);
                margin-bottom: var(--spacing-1);
            }

            .setting-description {
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .setting-slider {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
            }

            .setting-slider input[type="range"] {
                width: 120px;
            }

            .setting-slider span {
                width: 45px;
                text-align: right;
                font-size: var(--text-sm);
                color: var(--text-secondary);
            }

            .form-select, .form-input {
                padding: var(--spacing-2) var(--spacing-3);
                background: var(--dark-card);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-md);
                color: var(--text-primary);
                font-size: var(--text-sm);
                min-width: 150px;
            }

            .form-input[type="number"] {
                width: 80px;
            }

            /* Toggle Switch */
            .toggle {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 24px;
            }

            .toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: var(--dark-card);
                transition: 0.3s;
                border-radius: 24px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: 0.3s;
                border-radius: 50%;
            }

            .toggle input:checked + .toggle-slider {
                background-color: var(--primary-500);
            }

            .toggle input:checked + .toggle-slider:before {
                transform: translateX(24px);
            }

            /* Shortcuts */
            .shortcuts-list {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
            }

            .shortcut-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-3);
                background: var(--dark-card);
                border-radius: var(--radius-md);
            }

            .shortcut-action {
                font-size: var(--text-sm);
            }

            .shortcut-keys {
                padding: var(--spacing-1) var(--spacing-2);
                background: var(--dark-surface);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-sm);
                font-family: monospace;
                font-size: var(--text-xs);
            }

            /* About */
            .about-section {
                text-align: center;
            }

            .about-header {
                margin-bottom: var(--spacing-6);
            }

            .about-logo {
                width: 80px;
                height: 80px;
                margin: 0 auto var(--spacing-4);
                background: linear-gradient(135deg, var(--primary-500), var(--accent-pink));
                border-radius: var(--radius-xl);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                color: white;
            }

            .about-header h2 {
                margin: 0 0 var(--spacing-2);
            }

            .version {
                color: var(--text-muted);
            }

            .about-description {
                max-width: 400px;
                margin: 0 auto var(--spacing-6);
                color: var(--text-secondary);
            }

            .about-links {
                display: flex;
                justify-content: center;
                gap: var(--spacing-4);
                margin-bottom: var(--spacing-6);
            }

            .about-link {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                padding: var(--spacing-3) var(--spacing-4);
                background: var(--dark-card);
                border-radius: var(--radius-lg);
                color: var(--text-secondary);
                text-decoration: none;
                transition: all var(--transition-fast);
            }

            .about-link:hover {
                background: var(--primary-500);
                color: white;
            }

            .about-credits {
                color: var(--text-muted);
                font-size: var(--text-sm);
            }

            .settings-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-4) var(--spacing-6);
                border-top: 1px solid var(--dark-border);
            }

            .settings-footer-actions {
                display: flex;
                gap: var(--spacing-3);
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    SettingsModal.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModal;
}
