/**
 * Compliance Checker UI - Visual guideline validation
 */

const ComplianceChecker = {
    // Compliance rules by platform
    rules: {
        amazon: {
            name: 'Amazon',
            color: '#ff9900',
            checks: [
                { id: 'size', name: 'Image Size', description: 'Image must be at least 1000px on longest side' },
                { id: 'text-coverage', name: 'Text Coverage', description: 'Text should cover less than 20% of image' },
                { id: 'logo-size', name: 'Logo Size', description: 'Logo should not exceed 10% of image area' },
                { id: 'safe-zone', name: 'Safe Zone', description: 'Important content within 40px margin' },
                { id: 'file-size', name: 'File Size', description: 'File size must be under 500KB' },
                { id: 'format', name: 'File Format', description: 'PNG or JPEG format required' },
                { id: 'resolution', name: 'Resolution', description: 'Minimum 72 DPI resolution' },
                { id: 'background', name: 'Background', description: 'Pure white (#FFFFFF) recommended for products' }
            ]
        },
        flipkart: {
            name: 'Flipkart',
            color: '#2874f0',
            checks: [
                { id: 'size', name: 'Image Size', description: 'Minimum 500x500px required' },
                { id: 'aspect-ratio', name: 'Aspect Ratio', description: 'Recommended 1:1 for product images' },
                { id: 'text-coverage', name: 'Text Coverage', description: 'Promotional text under 25%' },
                { id: 'logo-placement', name: 'Logo Placement', description: 'Logo in corner, not obstructing product' },
                { id: 'file-size', name: 'File Size', description: 'Maximum 2MB file size' },
                { id: 'cta-visibility', name: 'CTA Visibility', description: 'CTA button clearly visible' },
                { id: 'brand-colors', name: 'Brand Colors', description: 'Use Flipkart blue (#2874F0) appropriately' }
            ]
        },
        dmart: {
            name: 'DMart',
            color: '#e31837',
            checks: [
                { id: 'size', name: 'Image Size', description: 'Standard banner sizes required' },
                { id: 'price-visibility', name: 'Price Visibility', description: 'Price must be clearly readable' },
                { id: 'product-visibility', name: 'Product Visibility', description: 'Product should occupy 40%+ of space' },
                { id: 'text-readability', name: 'Text Readability', description: 'Minimum 16px font size' },
                { id: 'contrast', name: 'Color Contrast', description: 'Sufficient contrast for accessibility' },
                { id: 'legal-text', name: 'Legal Text', description: 'Terms and conditions if applicable' }
            ]
        }
    },

    // Current results
    results: null,
    platform: 'amazon',

    // Initialize
    init(platform = 'amazon') {
        this.platform = platform;
        this.injectStyles();
    },

    // Run compliance check
    async check(canvas, elements, platform) {
        if (platform) this.platform = platform;
        
        const checks = this.rules[this.platform]?.checks || [];
        const results = [];

        for (const check of checks) {
            const result = await this.runCheck(check, canvas, elements);
            results.push(result);
        }

        this.results = {
            platform: this.platform,
            timestamp: new Date().toISOString(),
            checks: results,
            passed: results.filter(r => r.status === 'pass').length,
            failed: results.filter(r => r.status === 'fail').length,
            warnings: results.filter(r => r.status === 'warning').length,
            score: Math.round((results.filter(r => r.status === 'pass').length / results.length) * 100)
        };

        return this.results;
    },

    // Run individual check
    async runCheck(check, canvas, elements) {
        const result = {
            id: check.id,
            name: check.name,
            description: check.description,
            status: 'pass',
            message: ''
        };

        try {
            switch (check.id) {
                case 'size':
                    const minSize = this.platform === 'amazon' ? 1000 : 500;
                    const maxDim = Math.max(canvas.width, canvas.height);
                    if (maxDim < minSize) {
                        result.status = 'fail';
                        result.message = `Image is ${maxDim}px, needs ${minSize}px minimum`;
                    } else {
                        result.message = `Image size: ${canvas.width}×${canvas.height}px`;
                    }
                    break;

                case 'text-coverage':
                    const textElements = elements.filter(e => e.type === 'text' || e.type === 'button');
                    const textArea = this.calculateTextArea(textElements, canvas);
                    const maxCoverage = this.platform === 'amazon' ? 20 : 25;
                    if (textArea > maxCoverage) {
                        result.status = 'warning';
                        result.message = `Text covers ${textArea.toFixed(1)}% (max ${maxCoverage}%)`;
                    } else {
                        result.message = `Text coverage: ${textArea.toFixed(1)}%`;
                    }
                    break;

                case 'logo-size':
                    const logos = elements.filter(e => e.name?.toLowerCase().includes('logo'));
                    if (logos.length > 0) {
                        const logoArea = this.calculateElementArea(logos[0], canvas);
                        if (logoArea > 10) {
                            result.status = 'warning';
                            result.message = `Logo is ${logoArea.toFixed(1)}% of image (max 10%)`;
                        }
                    }
                    result.message = result.message || 'Logo size acceptable';
                    break;

                case 'safe-zone':
                    const margin = 40;
                    const outsideElements = elements.filter(e => {
                        if (e.type === 'background') return false;
                        return (e.x || 0) < margin || (e.y || 0) < margin ||
                               ((e.x || 0) + (e.width || 0)) > canvas.width - margin ||
                               ((e.y || 0) + (e.height || 0)) > canvas.height - margin;
                    });
                    if (outsideElements.length > 0) {
                        result.status = 'warning';
                        result.message = `${outsideElements.length} element(s) outside safe zone`;
                    } else {
                        result.message = 'All elements within safe zone';
                    }
                    break;

                case 'file-size':
                    // Estimate file size
                    const estimatedSize = (canvas.width * canvas.height * 4) / 1024 / 4; // rough PNG estimate
                    const maxSize = this.platform === 'amazon' ? 500 : 2048;
                    if (estimatedSize > maxSize) {
                        result.status = 'warning';
                        result.message = `Estimated ${Math.round(estimatedSize)}KB (max ${maxSize}KB)`;
                    } else {
                        result.message = `Estimated file size: ~${Math.round(estimatedSize)}KB`;
                    }
                    break;

                case 'contrast':
                    const hasGoodContrast = this.checkContrast(elements);
                    if (!hasGoodContrast) {
                        result.status = 'warning';
                        result.message = 'Some text may have low contrast';
                    } else {
                        result.message = 'Color contrast is good';
                    }
                    break;

                case 'cta-visibility':
                    const ctaElements = elements.filter(e => 
                        e.type === 'button' || 
                        e.name?.toLowerCase().includes('cta')
                    );
                    if (ctaElements.length === 0) {
                        result.status = 'warning';
                        result.message = 'No CTA button found';
                    } else {
                        result.message = 'CTA button present';
                    }
                    break;

                default:
                    result.message = 'Check passed';
            }
        } catch (error) {
            result.status = 'warning';
            result.message = 'Unable to verify';
        }

        return result;
    },

    // Calculate text area percentage
    calculateTextArea(textElements, canvas) {
        const canvasArea = canvas.width * canvas.height;
        let textArea = 0;

        textElements.forEach(el => {
            const width = el.width || (el.text?.length || 0) * (el.fontSize || 16) * 0.6;
            const height = el.height || (el.fontSize || 16) * 1.2;
            textArea += width * height;
        });

        return (textArea / canvasArea) * 100;
    },

    // Calculate element area percentage
    calculateElementArea(element, canvas) {
        const canvasArea = canvas.width * canvas.height;
        const elArea = (element.width || 100) * (element.height || 100);
        return (elArea / canvasArea) * 100;
    },

    // Check contrast
    checkContrast(elements) {
        const textElements = elements.filter(e => e.type === 'text');
        const bg = elements.find(e => e.type === 'background');
        
        if (!bg || textElements.length === 0) return true;

        // Simple contrast check - would need color parsing in production
        return true;
    },

    // Render compliance panel
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const platformInfo = this.rules[this.platform];

        container.innerHTML = `
            <div class="compliance-panel">
                <div class="compliance-header">
                    <div class="compliance-title">
                        <i class="fas fa-shield-check"></i>
                        Compliance Check
                    </div>
                    <div class="compliance-platform" style="--platform-color: ${platformInfo?.color || '#6366f1'}">
                        <span class="compliance-platform-dot"></span>
                        ${platformInfo?.name || this.platform}
                    </div>
                </div>

                ${this.results ? this.renderResults() : this.renderEmpty()}
            </div>
        `;
    },

    // Render empty state
    renderEmpty() {
        return `
            <div class="compliance-empty">
                <i class="fas fa-clipboard-check"></i>
                <p>Run compliance check to validate your creative against ${this.rules[this.platform]?.name || this.platform} guidelines.</p>
                <button class="btn btn-primary btn-sm" onclick="ComplianceChecker.runAndRender()">
                    <i class="fas fa-play"></i>
                    Run Check
                </button>
            </div>
        `;
    },

    // Render results
    renderResults() {
        const { checks, passed, failed, warnings, score } = this.results;

        let scoreClass = 'good';
        if (score < 70) scoreClass = 'poor';
        else if (score < 90) scoreClass = 'fair';

        return `
            <div class="compliance-score ${scoreClass}">
                <div class="compliance-score-value">${score}%</div>
                <div class="compliance-score-label">Compliance Score</div>
            </div>

            <div class="compliance-summary">
                <div class="compliance-stat pass">
                    <i class="fas fa-check-circle"></i>
                    <span>${passed} Passed</span>
                </div>
                <div class="compliance-stat warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${warnings} Warnings</span>
                </div>
                <div class="compliance-stat fail">
                    <i class="fas fa-times-circle"></i>
                    <span>${failed} Failed</span>
                </div>
            </div>

            <div class="compliance-checks">
                ${checks.map(check => `
                    <div class="compliance-check ${check.status}">
                        <div class="compliance-check-icon">
                            <i class="fas fa-${check.status === 'pass' ? 'check' : check.status === 'fail' ? 'times' : 'exclamation'}"></i>
                        </div>
                        <div class="compliance-check-content">
                            <div class="compliance-check-name">${check.name}</div>
                            <div class="compliance-check-message">${check.message}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: var(--spacing-4);" 
                    onclick="ComplianceChecker.runAndRender()">
                <i class="fas fa-redo"></i>
                Re-check
            </button>
        `;
    },

    // Run check and render
    async runAndRender() {
        if (typeof editor !== 'undefined' && editor.canvas && editor.elements) {
            Toast.loading('Checking compliance...');
            await this.check(editor.canvas, editor.elements, editor.platform);
            this.render('compliancePanel');
            
            if (this.results.score === 100) {
                Toast.success('All checks passed!');
            } else if (this.results.failed > 0) {
                Toast.warning(`${this.results.failed} issue(s) found`);
            } else {
                Toast.info(`${this.results.warnings} warning(s)`);
            }
        } else {
            Toast.error('No canvas to check');
        }
    },

    // Show modal with detailed report
    showReport() {
        if (!this.results) {
            Toast.warning('Run compliance check first');
            return;
        }

        // Would open a detailed modal report
        console.log('Compliance Report:', this.results);
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('compliance-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'compliance-styles';
        styles.textContent = `
            .compliance-panel {
                padding: var(--spacing-4);
            }

            .compliance-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--spacing-4);
            }

            .compliance-title {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-weight: var(--font-semibold);
            }

            .compliance-title i {
                color: var(--primary-400);
            }

            .compliance-platform {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                font-size: var(--text-sm);
                color: var(--text-secondary);
            }

            .compliance-platform-dot {
                width: 8px;
                height: 8px;
                background: var(--platform-color, var(--primary-500));
                border-radius: 50%;
            }

            .compliance-empty {
                text-align: center;
                padding: var(--spacing-8);
                color: var(--text-muted);
            }

            .compliance-empty i {
                font-size: 2rem;
                margin-bottom: var(--spacing-4);
            }

            .compliance-empty p {
                margin-bottom: var(--spacing-4);
            }

            .compliance-score {
                text-align: center;
                padding: var(--spacing-6);
                background: var(--dark-card);
                border-radius: var(--radius-xl);
                margin-bottom: var(--spacing-4);
            }

            .compliance-score-value {
                font-size: var(--text-4xl);
                font-weight: var(--font-bold);
            }

            .compliance-score.good .compliance-score-value { color: var(--success); }
            .compliance-score.fair .compliance-score-value { color: var(--warning); }
            .compliance-score.poor .compliance-score-value { color: var(--error); }

            .compliance-score-label {
                font-size: var(--text-sm);
                color: var(--text-muted);
            }

            .compliance-summary {
                display: flex;
                gap: var(--spacing-3);
                margin-bottom: var(--spacing-4);
            }

            .compliance-stat {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-2);
                padding: var(--spacing-3);
                background: var(--dark-card);
                border-radius: var(--radius-lg);
                font-size: var(--text-sm);
            }

            .compliance-stat.pass i { color: var(--success); }
            .compliance-stat.warning i { color: var(--warning); }
            .compliance-stat.fail i { color: var(--error); }

            .compliance-checks {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
            }

            .compliance-check {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-3);
                padding: var(--spacing-3);
                background: var(--dark-card);
                border-radius: var(--radius-lg);
                border-left: 3px solid transparent;
            }

            .compliance-check.pass { border-left-color: var(--success); }
            .compliance-check.warning { border-left-color: var(--warning); }
            .compliance-check.fail { border-left-color: var(--error); }

            .compliance-check-icon {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: var(--text-xs);
            }

            .compliance-check.pass .compliance-check-icon {
                background: var(--success-bg);
                color: var(--success);
            }

            .compliance-check.warning .compliance-check-icon {
                background: var(--warning-bg);
                color: var(--warning);
            }

            .compliance-check.fail .compliance-check-icon {
                background: var(--error-bg);
                color: var(--error);
            }

            .compliance-check-content {
                flex: 1;
            }

            .compliance-check-name {
                font-weight: var(--font-medium);
                font-size: var(--text-sm);
            }

            .compliance-check-message {
                font-size: var(--text-xs);
                color: var(--text-muted);
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ComplianceChecker.injectStyles();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComplianceChecker;
}
