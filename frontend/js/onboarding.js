/**
 * Onboarding & Help System
 */

const Onboarding = {
    // Tour steps
    steps: [
        {
            target: '#promptInput',
            title: 'Describe Your Creative',
            content: 'Start by describing what you want to create. Our AI understands natural language! Be detailed about your product, offer, colors, and style.',
            position: 'bottom'
        },
        {
            target: '#sizeSelect',
            title: 'Choose Canvas Size',
            content: 'Select the size that fits your platform - Landscape for web banners, Square for social media, or Portrait for stories.',
            position: 'bottom'
        },
        {
            target: '.upload-grid',
            title: 'Upload Your Assets',
            content: 'Optionally upload product images, logos, or backgrounds. The AI will integrate them seamlessly into your design.',
            position: 'top'
        },
        {
            target: '.generate-btn',
            title: 'Generate with AI',
            content: 'Click here to generate your creative. AI will handle layout, design, and optimization automatically. Or press Ctrl+Enter!',
            position: 'top'
        }
    ],

    // Current step
    currentStep: 0,

    // Is tour active
    isActive: false,

    // Initialize
    init() {
        console.log('Onboarding.init() called');
        this.injectStyles();
        console.log('Styles injected');
        this.checkFirstVisit();
        console.log('First visit check complete');
    },

    // Check if first visit
    checkFirstVisit() {
        const hasVisited = localStorage.getItem('rmcb_onboarded');
        console.log('Has visited before?', hasVisited);
        if (!hasVisited) {
            console.log('First visit detected - will show welcome in 1.5s');
            // Wait longer to ensure all elements are rendered
            setTimeout(() => {
                console.log('Showing welcome modal now...');
                this.showWelcome();
            }, 1500);
        } else {
            console.log('User has already been onboarded');
        }
    },

    // Show welcome modal
    showWelcome() {
        console.log('showWelcome() called');
        const modal = document.createElement('div');
        modal.className = 'onboarding-overlay';
        modal.id = 'welcomeModal';
        modal.innerHTML = `
            <div class="welcome-modal">
                <div class="welcome-icon">
                    <i class="fas fa-wand-magic-sparkles"></i>
                </div>
                <h2>Welcome to Creative Builder!</h2>
                <p>Create stunning retail media ads with the power of AI. Let us show you around.</p>
                
                <div class="welcome-features">
                    <div class="feature-item">
                        <i class="fas fa-robot"></i>
                        <span>AI-Powered Generation</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Platform Compliance</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-bolt"></i>
                        <span>Instant Export</span>
                    </div>
                </div>

                <div class="welcome-actions">
                    <button class="btn btn-secondary" onclick="Onboarding.skipTour()">
                        Skip Tour
                    </button>
                    <button class="btn btn-primary" onclick="Onboarding.startTour()">
                        <i class="fas fa-play"></i>
                        Start Tour
                    </button>
                </div>
            </div>
        `;
        console.log('Modal HTML created, appending to body');
        document.body.appendChild(modal);
        console.log('Modal appended, adding open class');
        requestAnimationFrame(() => {
            modal.classList.add('open');
            console.log('Open class added to modal');
        });
    },

    // Start tour
    startTour() {
        this.closeWelcome();
        this.isActive = true;
        this.currentStep = 0;
        
        // Small delay to ensure DOM is fully ready
        setTimeout(() => {
            console.log('Starting tour...');
            this.showStep();
        }, 300);
    },

    // Skip tour
    skipTour() {
        this.closeWelcome();
        localStorage.setItem('rmcb_onboarded', 'true');
    },

    // Close welcome modal
    closeWelcome() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => modal.remove(), 200);
        }
    },

    // Show current step
    showStep() {
        if (this.currentStep >= this.steps.length) {
            this.endTour();
            return;
        }

        const step = this.steps[this.currentStep];
        const target = document.querySelector(step.target);

        console.log(`Tour Step ${this.currentStep + 1}: Looking for '${step.target}'`, target ? '✓ Found' : '✗ Not Found');

        // Remove previous spotlight
        this.clearSpotlight();

        if (target) {
            // Add spotlight
            this.addSpotlight(target);

            // Create tooltip
            this.showTooltip(step, target);
        } else {
            // Skip this step if target not found
            console.warn(`Skipping step ${this.currentStep + 1}: Target '${step.target}' not found`);
            this.nextStep();
        }
    },

    // Add spotlight to element
    addSpotlight(target) {
        const rect = target.getBoundingClientRect();

        const spotlight = document.createElement('div');
        spotlight.className = 'tour-spotlight';
        spotlight.id = 'tourSpotlight';
        spotlight.style.cssText = `
            position: fixed;
            top: ${rect.top - 8}px;
            left: ${rect.left - 8}px;
            width: ${rect.width + 16}px;
            height: ${rect.height + 16}px;
            z-index: 9999;
        `;
        document.body.appendChild(spotlight);

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'tour-backdrop';
        backdrop.id = 'tourBackdrop';
        backdrop.onclick = () => this.nextStep();
        document.body.appendChild(backdrop);
    },

    // Show tooltip
    showTooltip(step, target) {
        const rect = target.getBoundingClientRect();

        const tooltip = document.createElement('div');
        tooltip.className = `tour-tooltip ${step.position}`;
        tooltip.id = 'tourTooltip';
        tooltip.innerHTML = `
            <div class="tour-tooltip-content">
                <h4>${step.title}</h4>
                <p>${step.content}</p>
            </div>
            <div class="tour-tooltip-footer">
                <div class="tour-progress">
                    ${this.steps.map((_, i) => `
                        <span class="progress-dot ${i === this.currentStep ? 'active' : ''}"></span>
                    `).join('')}
                </div>
                <div class="tour-actions">
                    <button class="btn btn-ghost btn-sm" onclick="Onboarding.endTour()">Skip</button>
                    <button class="btn btn-primary btn-sm" onclick="Onboarding.nextStep()">
                        ${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        `;

        // Position tooltip with fixed positioning
        const tooltipWidth = 360;
        const tooltipHeight = 180;
        let top, left;
        const margin = 20;

        switch (step.position) {
            case 'bottom':
                top = rect.bottom + margin;
                left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                break;
            case 'top':
                top = rect.top - tooltipHeight - margin;
                left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                left = rect.left - tooltipWidth - margin;
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                left = rect.right + margin;
                break;
            default:
                top = rect.bottom + margin;
                left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        }

        // Keep in viewport
        left = Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, left));
        top = Math.max(margin, Math.min(window.innerHeight - tooltipHeight - margin, top));

        tooltip.style.position = 'fixed';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.width = `${tooltipWidth}px`;
        tooltip.style.zIndex = '10001';

        document.body.appendChild(tooltip);
        requestAnimationFrame(() => tooltip.classList.add('show'));
    },

    // Clear spotlight
    clearSpotlight() {
        document.getElementById('tourSpotlight')?.remove();
        document.getElementById('tourBackdrop')?.remove();
        document.getElementById('tourTooltip')?.remove();
    },

    // Next step
    nextStep() {
        this.currentStep++;
        this.showStep();
    },

    // End tour
    endTour() {
        this.isActive = false;
        this.clearSpotlight();
        localStorage.setItem('rmcb_onboarded', 'true');

        if (typeof Toast !== 'undefined') {
            Toast.success('Tour complete! Start creating amazing ads.');
        }
    },

    // Show help panel
    showHelp() {
        const modal = document.createElement('div');
        modal.className = 'onboarding-overlay';
        modal.id = 'helpModal';
        modal.innerHTML = `
            <div class="help-modal">
                <div class="help-header">
                    <h2><i class="fas fa-question-circle"></i> Help Center</h2>
                    <button class="btn btn-ghost btn-icon" onclick="Onboarding.closeHelp()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="help-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search for help..." 
                           oninput="Onboarding.searchHelp(this.value)">
                </div>

                <div class="help-content" id="helpContent">
                    ${this.renderHelpTopics()}
                </div>

                <div class="help-footer">
                    <button class="btn btn-secondary" onclick="Onboarding.startTour()">
                        <i class="fas fa-play"></i>
                        Restart Tour
                    </button>
                    <a href="#" class="btn btn-ghost">
                        <i class="fas fa-external-link-alt"></i>
                        Full Documentation
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('open'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeHelp();
        });
    },

    // Close help
    closeHelp() {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.classList.remove('open');
            setTimeout(() => modal.remove(), 200);
        }
    },

    // Search help
    searchHelp(query) {
        const content = document.getElementById('helpContent');
        if (!content) return;
        content.innerHTML = this.renderHelpTopics(query.toLowerCase());
    },

    // Render help topics
    renderHelpTopics(filter = '') {
        const topics = [
            {
                icon: 'magic',
                title: 'Getting Started',
                items: [
                    { q: 'How do I create my first ad?', a: 'Enter a description in the prompt box and click Generate. Our AI will create an ad based on your description.' },
                    { q: 'What platforms are supported?', a: 'We support Amazon, Flipkart, DMart, Facebook, Instagram, and more retail media platforms.' },
                    { q: 'Can I use my own images?', a: 'Yes! Drag and drop images onto the canvas or use the upload button in the sidebar.' }
                ]
            },
            {
                icon: 'edit',
                title: 'Editor',
                items: [
                    { q: 'How do I edit text?', a: 'Double-click any text element to edit it. Use the sidebar for font, size, and color options.' },
                    { q: 'How do I resize elements?', a: 'Select an element and drag the corner handles. Hold Shift to maintain aspect ratio.' },
                    { q: 'Can I undo my changes?', a: 'Yes! Press Ctrl+Z to undo or use the history panel in the sidebar.' }
                ]
            },
            {
                icon: 'check-circle',
                title: 'Compliance',
                items: [
                    { q: 'What is compliance checking?', a: 'We automatically check your ad against platform guidelines including size, text coverage, and safe zones.' },
                    { q: 'How do I fix compliance issues?', a: 'Click the "Auto Fix" button or manually adjust based on the suggestions shown.' },
                    { q: 'Why is my ad flagged?', a: 'Common issues include too much text, wrong dimensions, or content in safe zones. Check the compliance panel for details.' }
                ]
            },
            {
                icon: 'download',
                title: 'Export',
                items: [
                    { q: 'What formats can I export?', a: 'Export as PNG, JPG, or WebP. You can also export for multiple platforms at once.' },
                    { q: 'Can I batch export?', a: 'Yes! Use the batch export feature to generate multiple sizes and formats automatically.' },
                    { q: 'What resolution should I use?', a: 'We recommend using the platform presets which are optimized for each platform\'s requirements.' }
                ]
            }
        ];

        return topics.map(topic => {
            const filteredItems = topic.items.filter(item => 
                !filter || 
                item.q.toLowerCase().includes(filter) || 
                item.a.toLowerCase().includes(filter)
            );

            if (filter && filteredItems.length === 0) return '';

            return `
                <div class="help-topic">
                    <div class="help-topic-header">
                        <i class="fas fa-${topic.icon}"></i>
                        <h3>${topic.title}</h3>
                    </div>
                    <div class="help-topic-items">
                        ${filteredItems.map(item => `
                            <details class="help-item">
                                <summary>${item.q}</summary>
                                <p>${item.a}</p>
                            </details>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('') || '<p class="no-results">No matching help topics found.</p>';
    },

    // Show contextual tip
    showTip(target, content, position = 'top') {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const tip = document.createElement('div');
        tip.className = `contextual-tip ${position}`;
        tip.innerHTML = `
            <div class="tip-content">${content}</div>
            <button class="tip-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Position
        switch (position) {
            case 'top':
                tip.style.bottom = `${window.innerHeight - rect.top + 8}px`;
                tip.style.left = `${rect.left + rect.width / 2}px`;
                break;
            case 'bottom':
                tip.style.top = `${rect.bottom + 8}px`;
                tip.style.left = `${rect.left + rect.width / 2}px`;
                break;
        }

        document.body.appendChild(tip);
        requestAnimationFrame(() => tip.classList.add('show'));

        // Auto dismiss after 5s
        setTimeout(() => {
            tip.classList.remove('show');
            setTimeout(() => tip.remove(), 200);
        }, 5000);
    },

    // Inject styles
    injectStyles() {
        if (document.getElementById('onboarding-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'onboarding-styles';
        styles.textContent = `
            .onboarding-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .onboarding-overlay.open {
                opacity: 1;
                pointer-events: auto;
            }

            /* Welcome Modal */
            .welcome-modal {
                background: var(--dark-surface, #12121a);
                border-radius: 16px;
                padding: 2rem;
                text-align: center;
                max-width: 480px;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .onboarding-overlay.open .welcome-modal {
                transform: scale(1);
            }

            .welcome-icon {
                width: 80px;
                height: 80px;
                margin: 0 auto 1.5rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.5rem;
                color: white;
                animation: pulse-glow 2s infinite;
            }

            .welcome-modal h2 {
                margin: 0 0 1rem;
                color: var(--text-primary, #f8fafc);
            }

            .welcome-modal p {
                color: var(--text-secondary, #94a3b8);
                margin-bottom: 1.5rem;
            }

            .welcome-features {
                display: flex;
                justify-content: center;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .feature-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: var(--dark-card, #1a1a24);
                border-radius: 12px;
                font-size: 0.875rem;
            }

            .feature-item i {
                font-size: 1.5rem;
                color: #818cf8;
            }

            .welcome-actions {
                display: flex;
                justify-content: center;
                gap: 1rem;
            }

            /* Tour */
            .tour-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 1998;
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                animation: backdropFadeIn 0.3s ease;
            }

            @keyframes backdropFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .tour-spotlight {
                position: fixed;
                border: 3px solid #6366f1;
                border-radius: 12px;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85),
                            0 0 30px rgba(99, 102, 241, 0.5),
                            inset 0 0 20px rgba(99, 102, 241, 0.1);
                z-index: 9999;
                pointer-events: none;
                animation: spotlightPulse 2s ease-in-out infinite;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes spotlightPulse {
                0%, 100% { 
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85),
                                0 0 30px rgba(99, 102, 241, 0.5),
                                inset 0 0 20px rgba(99, 102, 241, 0.1);
                    border-color: #6366f1;
                }
                50% { 
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85),
                                0 0 50px rgba(99, 102, 241, 0.8),
                                inset 0 0 30px rgba(99, 102, 241, 0.2);
                    border-color: #818cf8;
                }
            }

            .tour-tooltip {
                position: fixed;
                width: 360px;
                background: rgba(18, 18, 26, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 20px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6),
                            0 10px 40px rgba(99, 102, 241, 0.3),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
                z-index: 10001;
                opacity: 0;
                transform: scale(0.95) translateY(10px);
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .tour-tooltip.show {
                opacity: 1;
                transform: scale(1) translateY(0);
            }

            .tour-tooltip-content {
                padding: 1.5rem;
            }

            .tour-tooltip-content h4 {
                margin: 0 0 0.75rem;
                font-size: 1.25rem;
                font-weight: 600;
                color: #f8fafc;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .tour-tooltip-content p {
                margin: 0;
                color: #94a3b8;
                font-size: 0.9rem;
                line-height: 1.6;
            }

            .tour-tooltip-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem 1.5rem;
                border-top: 1px solid rgba(99, 102, 241, 0.15);
                background: linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.05) 100%);
            }

            .tour-progress {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }

            .progress-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(99, 102, 241, 0.2);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .progress-dot.active {
                background: #6366f1;
                width: 24px;
                border-radius: 4px;
                box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
            }

            .tour-actions {
                display: flex;
                gap: 0.5rem;
            }

            .tour-actions .btn {
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .tour-actions .btn:hover {
                transform: translateY(-2px);
            }

            .tour-actions .btn:active {
                transform: translateY(0);
            }

            /* Help Modal */
            .help-modal {
                background: var(--dark-surface);
                border-radius: var(--radius-xl);
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                transform: scale(0.95);
                transition: transform var(--transition-normal);
            }

            .onboarding-overlay.open .help-modal {
                transform: scale(1);
            }

            .help-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--spacing-5);
                border-bottom: 1px solid var(--dark-border);
            }

            .help-header h2 {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                margin: 0;
            }

            .help-header h2 i {
                color: var(--primary-400);
            }

            .help-search {
                padding: var(--spacing-4) var(--spacing-5);
                position: relative;
            }

            .help-search i {
                position: absolute;
                left: var(--spacing-8);
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-muted);
            }

            .help-search input {
                width: 100%;
                padding: var(--spacing-3) var(--spacing-4) var(--spacing-3) var(--spacing-10);
                background: var(--dark-card);
                border: 1px solid var(--dark-border);
                border-radius: var(--radius-lg);
                color: var(--text-primary);
            }

            .help-content {
                flex: 1;
                overflow-y: auto;
                padding: var(--spacing-5);
            }

            .help-topic {
                margin-bottom: var(--spacing-6);
            }

            .help-topic-header {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                margin-bottom: var(--spacing-3);
            }

            .help-topic-header i {
                color: var(--primary-400);
            }

            .help-topic-header h3 {
                margin: 0;
                font-size: var(--text-base);
            }

            .help-item {
                background: var(--dark-card);
                border-radius: var(--radius-lg);
                margin-bottom: var(--spacing-2);
            }

            .help-item summary {
                padding: var(--spacing-3) var(--spacing-4);
                cursor: pointer;
                font-weight: var(--font-medium);
                list-style: none;
            }

            .help-item summary::-webkit-details-marker {
                display: none;
            }

            .help-item summary::before {
                content: '+';
                margin-right: var(--spacing-3);
                color: var(--primary-400);
            }

            .help-item[open] summary::before {
                content: '-';
            }

            .help-item p {
                padding: 0 var(--spacing-4) var(--spacing-4) calc(var(--spacing-4) + 1em);
                margin: 0;
                color: var(--text-secondary);
                font-size: var(--text-sm);
            }

            .help-footer {
                display: flex;
                justify-content: space-between;
                padding: var(--spacing-4) var(--spacing-5);
                border-top: 1px solid var(--dark-border);
            }

            .no-results {
                text-align: center;
                color: var(--text-muted);
                padding: var(--spacing-8);
            }

            /* Contextual Tips */
            .contextual-tip {
                position: fixed;
                background: var(--primary-500);
                color: white;
                padding: var(--spacing-3) var(--spacing-4);
                border-radius: var(--radius-lg);
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                z-index: 1500;
                opacity: 0;
                transform: translateY(5px);
                transition: all var(--transition-fast);
                max-width: 280px;
            }

            .contextual-tip.show {
                opacity: 1;
                transform: translateY(0);
            }

            .contextual-tip.top {
                transform: translateX(-50%);
            }

            .contextual-tip.top.show {
                transform: translateX(-50%) translateY(0);
            }

            .contextual-tip.bottom::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%);
                border: 6px solid transparent;
                border-bottom-color: var(--primary-500);
            }

            .tip-content {
                flex: 1;
                font-size: var(--text-sm);
            }

            .tip-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 0;
            }

            .tip-close:hover {
                color: white;
            }

            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
                50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.8); }
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    Onboarding.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Onboarding;
}
