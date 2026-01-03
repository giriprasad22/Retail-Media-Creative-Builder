/**
 * Brand Kit - Manage brand colors, fonts, logos, and assets
 */

const BrandKit = {
    // Default brand kit
    defaultKit: {
        name: 'My Brand',
        colors: {
            primary: '#6366f1',
            secondary: '#ec4899',
            accent: '#06b6d4',
            background: '#1a1a2e',
            text: '#ffffff'
        },
        fonts: {
            heading: 'Inter',
            body: 'Inter'
        },
        logos: [],
        assets: []
    },

    // Current brand kit
    currentKit: null,

    // Saved brand kits
    savedKits: [],

    // Initialize brand kit
    init() {
        this.loadFromStorage();
        if (!this.currentKit) {
            this.currentKit = { ...this.defaultKit };
        }
    },

    // Load from localStorage
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('brandKits');
            if (saved) {
                this.savedKits = JSON.parse(saved);
            }
            
            const current = localStorage.getItem('currentBrandKit');
            if (current) {
                this.currentKit = JSON.parse(current);
            }
        } catch (e) {
            console.error('Error loading brand kits:', e);
        }
    },

    // Save to localStorage
    saveToStorage() {
        try {
            localStorage.setItem('brandKits', JSON.stringify(this.savedKits));
            localStorage.setItem('currentBrandKit', JSON.stringify(this.currentKit));
        } catch (e) {
            console.error('Error saving brand kits:', e);
        }
    },

    // Get current kit
    getCurrent() {
        return this.currentKit || this.defaultKit;
    },

    // Update color
    updateColor(key, value) {
        if (!this.currentKit.colors) {
            this.currentKit.colors = {};
        }
        this.currentKit.colors[key] = value;
        this.saveToStorage();
        this.dispatchChange();
    },

    // Update font
    updateFont(key, value) {
        if (!this.currentKit.fonts) {
            this.currentKit.fonts = {};
        }
        this.currentKit.fonts[key] = value;
        this.saveToStorage();
        this.dispatchChange();
    },

    // Add logo
    addLogo(file, url) {
        if (!this.currentKit.logos) {
            this.currentKit.logos = [];
        }
        this.currentKit.logos.push({
            id: `logo-${Date.now()}`,
            name: file.name,
            url: url,
            type: file.type
        });
        this.saveToStorage();
        this.dispatchChange();
    },

    // Remove logo
    removeLogo(id) {
        if (this.currentKit.logos) {
            this.currentKit.logos = this.currentKit.logos.filter(l => l.id !== id);
            this.saveToStorage();
            this.dispatchChange();
        }
    },

    // Save current kit as new
    saveAs(name) {
        const kit = {
            ...JSON.parse(JSON.stringify(this.currentKit)),
            id: `kit-${Date.now()}`,
            name: name,
            createdAt: new Date().toISOString()
        };
        this.savedKits.push(kit);
        this.saveToStorage();
        return kit;
    },

    // Load a saved kit
    load(kitId) {
        const kit = this.savedKits.find(k => k.id === kitId);
        if (kit) {
            this.currentKit = JSON.parse(JSON.stringify(kit));
            this.saveToStorage();
            this.dispatchChange();
        }
    },

    // Delete a saved kit
    delete(kitId) {
        this.savedKits = this.savedKits.filter(k => k.id !== kitId);
        this.saveToStorage();
    },

    // Reset to default
    reset() {
        this.currentKit = { ...this.defaultKit };
        this.saveToStorage();
        this.dispatchChange();
    },

    // Dispatch change event
    dispatchChange() {
        window.dispatchEvent(new CustomEvent('brandKitChange', { 
            detail: this.currentKit 
        }));
    },

    // Render brand kit panel
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const kit = this.getCurrent();

        container.innerHTML = `
            <div class="brand-kit-panel">
                <div class="brand-kit-header">
                    <h3 class="brand-kit-title">
                        <i class="fas fa-palette"></i>
                        Brand Kit
                    </h3>
                    <div class="brand-kit-actions">
                        <button class="btn btn-ghost btn-sm" onclick="BrandKit.showSaveModal()">
                            <i class="fas fa-save"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="BrandKit.showLoadModal()">
                            <i class="fas fa-folder-open"></i>
                        </button>
                    </div>
                </div>

                <!-- Colors -->
                <div class="brand-kit-section">
                    <div class="brand-kit-section-header">
                        <span class="brand-kit-section-title">Brand Colors</span>
                    </div>
                    <div class="brand-kit-colors">
                        ${Object.entries(kit.colors || {}).map(([key, value]) => `
                            <div class="brand-color-item">
                                <div class="brand-color-swatch" style="background: ${value}">
                                    <input type="color" value="${value}" 
                                           onchange="BrandKit.updateColor('${key}', this.value)">
                                </div>
                                <span class="brand-color-label">${this.formatLabel(key)}</span>
                            </div>
                        `).join('')}
                        <button class="brand-color-add" onclick="BrandKit.addColor()">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>

                <!-- Fonts -->
                <div class="brand-kit-section">
                    <div class="brand-kit-section-header">
                        <span class="brand-kit-section-title">Typography</span>
                    </div>
                    <div class="brand-kit-fonts">
                        <div class="brand-font-item">
                            <div class="brand-font-preview">
                                <span class="brand-font-sample" style="font-family: ${kit.fonts?.heading || 'Inter'}">Aa</span>
                                <div class="brand-font-info">
                                    <span class="brand-font-name">${kit.fonts?.heading || 'Inter'}</span>
                                    <span class="brand-font-type">Heading Font</span>
                                </div>
                            </div>
                            <select class="brand-font-select" onchange="BrandKit.updateFont('heading', this.value)">
                                ${this.getFontOptions(kit.fonts?.heading)}
                            </select>
                        </div>
                        <div class="brand-font-item">
                            <div class="brand-font-preview">
                                <span class="brand-font-sample" style="font-family: ${kit.fonts?.body || 'Inter'}">Aa</span>
                                <div class="brand-font-info">
                                    <span class="brand-font-name">${kit.fonts?.body || 'Inter'}</span>
                                    <span class="brand-font-type">Body Font</span>
                                </div>
                            </div>
                            <select class="brand-font-select" onchange="BrandKit.updateFont('body', this.value)">
                                ${this.getFontOptions(kit.fonts?.body)}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Logos -->
                <div class="brand-kit-section">
                    <div class="brand-kit-section-header">
                        <span class="brand-kit-section-title">Logos</span>
                    </div>
                    <div class="brand-kit-logos">
                        ${(kit.logos || []).map(logo => `
                            <div class="brand-logo-item" data-id="${logo.id}">
                                <img src="${logo.url}" alt="${logo.name}">
                                <button class="brand-logo-remove" onclick="BrandKit.removeLogo('${logo.id}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                        <label class="brand-logo-upload">
                            <input type="file" accept="image/*" onchange="BrandKit.handleLogoUpload(this.files[0])">
                            <i class="fas fa-plus"></i>
                            <span>Add Logo</span>
                        </label>
                    </div>
                </div>

                <!-- Quick Apply -->
                <div class="brand-kit-section">
                    <button class="btn btn-primary" style="width: 100%;" onclick="BrandKit.applyToCanvas()">
                        <i class="fas fa-magic"></i>
                        Apply Brand to Canvas
                    </button>
                </div>
            </div>
        `;
    },

    // Format label
    formatLabel(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    },

    // Get font options
    getFontOptions(selected) {
        const fonts = [
            'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins',
            'Playfair Display', 'Merriweather', 'Lato', 'Oswald', 'Raleway',
            'Source Sans Pro', 'Nunito', 'Ubuntu', 'Rubik', 'Work Sans'
        ];
        
        return fonts.map(font => 
            `<option value="${font}" ${font === selected ? 'selected' : ''}>${font}</option>`
        ).join('');
    },

    // Add custom color
    addColor() {
        const key = prompt('Enter color name (e.g., highlight, border):');
        if (key) {
            this.updateColor(key.toLowerCase().replace(/\s+/g, ''), '#6366f1');
            this.render('brandKitContainer');
        }
    },

    // Handle logo upload
    async handleLogoUpload(file) {
        if (!file) return;

        try {
            const result = await API.uploadFile(file, 'logos');
            this.addLogo(file, result.file_path);
            this.render('brandKitContainer');
            Toast.success('Logo uploaded');
        } catch (error) {
            // Fallback to local URL
            const url = URL.createObjectURL(file);
            this.addLogo(file, url);
            this.render('brandKitContainer');
        }
    },

    // Apply brand to canvas
    applyToCanvas() {
        const kit = this.getCurrent();
        window.dispatchEvent(new CustomEvent('applyBrandKit', { detail: kit }));
        Toast.success('Brand applied to canvas');
    },

    // Show save modal
    showSaveModal() {
        const name = prompt('Enter a name for this brand kit:', this.currentKit.name || 'My Brand');
        if (name) {
            this.currentKit.name = name;
            const kit = this.saveAs(name);
            Toast.success(`Saved as "${name}"`);
        }
    },

    // Show load modal
    showLoadModal() {
        if (this.savedKits.length === 0) {
            Toast.info('No saved brand kits');
            return;
        }

        const kitList = this.savedKits.map(k => `${k.name} (${new Date(k.createdAt).toLocaleDateString()})`).join('\n');
        const index = prompt(`Select a brand kit (enter number):\n${this.savedKits.map((k, i) => `${i + 1}. ${k.name}`).join('\n')}`);
        
        if (index) {
            const kit = this.savedKits[parseInt(index) - 1];
            if (kit) {
                this.load(kit.id);
                this.render('brandKitContainer');
                Toast.success(`Loaded "${kit.name}"`);
            }
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    BrandKit.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrandKit;
}
