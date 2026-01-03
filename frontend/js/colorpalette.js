/**
 * Color Palette Generator
 * AI-powered color palette suggestions
 */

const ColorPalette = {
    // Predefined palettes
    palettes: {
        vibrant: {
            name: 'Vibrant',
            colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
        },
        professional: {
            name: 'Professional',
            colors: ['#2C3E50', '#3498DB', '#ECF0F1', '#95A5A6', '#E74C3C']
        },
        sunset: {
            name: 'Sunset',
            colors: ['#F39C12', '#E74C3C', '#9B59B6', '#34495E', '#1ABC9C']
        },
        ocean: {
            name: 'Ocean',
            colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#03045E']
        },
        forest: {
            name: 'Forest',
            colors: ['#2D5016', '#4A7C23', '#7CB342', '#AED581', '#F1F8E9']
        },
        berry: {
            name: 'Berry',
            colors: ['#4A1942', '#7B2D5B', '#B03060', '#E5446D', '#FFE5EC']
        },
        minimal: {
            name: 'Minimal',
            colors: ['#000000', '#333333', '#666666', '#999999', '#FFFFFF']
        },
        warm: {
            name: 'Warm',
            colors: ['#FF5733', '#FF8D1A', '#FFC300', '#DAF7A6', '#FFF5E6']
        },
        cool: {
            name: 'Cool',
            colors: ['#667EEA', '#764BA2', '#F093FB', '#F5576C', '#4FACFE']
        },
        pastel: {
            name: 'Pastel',
            colors: ['#FFB5E8', '#B5DEFF', '#85E3FF', '#BEFFB9', '#FFFEB5']
        },
        amazon: {
            name: 'Amazon',
            colors: ['#FF9900', '#232F3E', '#131921', '#FFFFFF', '#146EB4']
        },
        flipkart: {
            name: 'Flipkart',
            colors: ['#2874F0', '#FFE500', '#FB641B', '#FFFFFF', '#F1F3F6']
        },
        dmart: {
            name: 'DMart',
            colors: ['#E31837', '#FFC107', '#FFFFFF', '#333333', '#28A745']
        }
    },

    // Current selected colors
    selectedColors: [],

    // Callback for color selection
    onColorSelect: null,

    // Initialize
    init(onColorSelect) {
        this.onColorSelect = onColorSelect;
        this.injectStyles();
    },

    // Get palette by name
    getPalette(name) {
        return this.palettes[name];
    },

    // Generate palette from image
    async generateFromImage(imageFile) {
        return new Promise((resolve) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // Resize for faster processing
                const size = 100;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const imageData = ctx.getImageData(0, 0, size, size);
                const colors = this.extractColors(imageData, 5);
                resolve(colors);
            };

            img.src = URL.createObjectURL(imageFile);
        });
    },

    // Extract dominant colors from image data
    extractColors(imageData, count) {
        const pixels = imageData.data;
        const colorCounts = {};

        // Sample pixels
        for (let i = 0; i < pixels.length; i += 16) { // Skip every 4 pixels for speed
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // Quantize colors
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;

            const key = `${qr},${qg},${qb}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // Sort by frequency
        const sorted = Object.entries(colorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count);

        // Convert to hex
        return sorted.map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return this.rgbToHex(r, g, b);
        });
    },

    // RGB to Hex
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    // Hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    // Generate complementary color
    getComplementary(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
    },

    // Generate analogous colors
    getAnalogous(hex, count = 3) {
        const hsl = this.hexToHsl(hex);
        const colors = [];
        const step = 30;

        for (let i = 0; i < count; i++) {
            const newHue = (hsl.h + (i - Math.floor(count / 2)) * step + 360) % 360;
            colors.push(this.hslToHex(newHue, hsl.s, hsl.l));
        }

        return colors;
    },

    // Hex to HSL
    hexToHsl(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return { h: 0, s: 0, l: 0 };

        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
            h *= 360;
        }

        return { h, s: s * 100, l: l * 100 };
    },

    // HSL to Hex
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) { r = c; g = x; b = 0; }
        else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
        else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
        else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
        else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
        else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

        return this.rgbToHex(
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        );
    },

    // Get contrast color (black or white)
    getContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return '#000000';
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
    },

    // Render palette picker
    render(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const showPresets = options.showPresets !== false;
        const showGenerator = options.showGenerator !== false;
        const currentColors = options.colors || [];

        container.innerHTML = `
            <div class="color-palette-picker">
                <div class="color-palette-header">
                    <h4 class="color-palette-title">
                        <i class="fas fa-palette"></i>
                        Color Palette
                    </h4>
                </div>

                ${currentColors.length > 0 ? `
                    <div class="color-palette-current">
                        <div class="color-palette-label">Current Colors</div>
                        <div class="color-palette-colors">
                            ${currentColors.map((color, i) => `
                                <div class="color-swatch" style="background: ${color}" 
                                     data-color="${color}"
                                     onclick="ColorPalette.copyColor('${color}')">
                                    <span class="color-swatch-code">${color}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${showPresets ? `
                    <div class="color-palette-presets">
                        <div class="color-palette-label">Preset Palettes</div>
                        <div class="color-palette-grid">
                            ${Object.entries(this.palettes).map(([key, palette]) => `
                                <div class="palette-preset" onclick="ColorPalette.selectPalette('${key}')">
                                    <div class="palette-preview">
                                        ${palette.colors.slice(0, 5).map(c => 
                                            `<div class="palette-color" style="background: ${c}"></div>`
                                        ).join('')}
                                    </div>
                                    <span class="palette-name">${palette.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${showGenerator ? `
                    <div class="color-palette-generator">
                        <div class="color-palette-label">Generate from Image</div>
                        <div class="color-generator-upload">
                            <input type="file" accept="image/*" id="paletteImageInput" 
                                   onchange="ColorPalette.handleImageUpload(this.files[0])">
                            <i class="fas fa-image"></i>
                            <span>Drop image or click to upload</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Select a preset palette
    selectPalette(name) {
        const palette = this.palettes[name];
        if (!palette) return;

        this.selectedColors = [...palette.colors];
        
        if (this.onColorSelect) {
            this.onColorSelect(this.selectedColors);
        }

        Toast.success(`Applied ${palette.name} palette`);
    },

    // Handle image upload for palette generation
    async handleImageUpload(file) {
        if (!file) return;

        Toast.loading('Extracting colors...');

        try {
            const colors = await this.generateFromImage(file);
            this.selectedColors = colors;

            if (this.onColorSelect) {
                this.onColorSelect(colors);
            }

            Toast.success('Palette generated from image');
        } catch (error) {
            Toast.error('Failed to extract colors');
        }
    },

    // Copy color to clipboard
    copyColor(color) {
        navigator.clipboard.writeText(color).then(() => {
            Toast.success(`Copied ${color}`);
        }).catch(() => {
            Toast.error('Failed to copy');
        });
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('colorpalette-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'colorpalette-styles';
        styles.textContent = `
            .color-palette-picker {
                padding: var(--spacing-4);
            }

            .color-palette-header {
                margin-bottom: var(--spacing-4);
            }

            .color-palette-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-size: var(--text-lg);
                font-weight: var(--font-semibold);
            }

            .color-palette-title i {
                color: var(--primary-400);
            }

            .color-palette-label {
                font-size: var(--text-sm);
                color: var(--text-muted);
                margin-bottom: var(--spacing-3);
            }

            .color-palette-current,
            .color-palette-presets,
            .color-palette-generator {
                margin-bottom: var(--spacing-6);
            }

            .color-palette-colors {
                display: flex;
                gap: var(--spacing-2);
                flex-wrap: wrap;
            }

            .color-swatch {
                width: 48px;
                height: 48px;
                border-radius: var(--radius-lg);
                cursor: pointer;
                position: relative;
                transition: transform var(--transition-fast);
                border: 2px solid rgba(255, 255, 255, 0.1);
            }

            .color-swatch:hover {
                transform: scale(1.1);
            }

            .color-swatch-code {
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: var(--text-xs);
                color: var(--text-muted);
                white-space: nowrap;
                opacity: 0;
                transition: opacity var(--transition-fast);
            }

            .color-swatch:hover .color-swatch-code {
                opacity: 1;
            }

            .color-palette-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: var(--spacing-3);
            }

            .palette-preset {
                background: var(--dark-card);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-xl);
                padding: var(--spacing-3);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .palette-preset:hover {
                border-color: var(--primary-500);
                transform: translateY(-2px);
            }

            .palette-preview {
                display: flex;
                height: 32px;
                border-radius: var(--radius-md);
                overflow: hidden;
                margin-bottom: var(--spacing-2);
            }

            .palette-color {
                flex: 1;
            }

            .palette-name {
                font-size: var(--text-xs);
                color: var(--text-secondary);
                text-align: center;
                display: block;
            }

            .color-generator-upload {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-6);
                background: var(--dark-card);
                border: 2px dashed var(--dark-border);
                border-radius: var(--radius-xl);
                cursor: pointer;
                position: relative;
                transition: all var(--transition-fast);
            }

            .color-generator-upload:hover {
                border-color: var(--primary-400);
                background: rgba(99, 102, 241, 0.05);
            }

            .color-generator-upload input {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
            }

            .color-generator-upload i {
                font-size: 2rem;
                color: var(--primary-400);
            }

            .color-generator-upload span {
                font-size: var(--text-sm);
                color: var(--text-muted);
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ColorPalette.injectStyles();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorPalette;
}
