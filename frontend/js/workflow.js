/**
 * Workflow Visualization - Shows AI generation progress
 */

const WorkflowViz = {
    // Workflow steps
    steps: [
        {
            id: 'analyze',
            title: 'Analyzing Prompt',
            description: 'Understanding your requirements',
            icon: 'brain'
        },
        {
            id: 'concept',
            title: 'Generating Concept',
            description: 'Creating visual concept',
            icon: 'lightbulb'
        },
        {
            id: 'layout',
            title: 'Planning Layout',
            description: 'Optimizing element placement',
            icon: 'th-large'
        },
        {
            id: 'background',
            title: 'Creating Background',
            description: 'Generating AI background',
            icon: 'image'
        },
        {
            id: 'elements',
            title: 'Adding Elements',
            description: 'Placing text and graphics',
            icon: 'layer-group'
        },
        {
            id: 'compliance',
            title: 'Checking Compliance',
            description: 'Validating guidelines',
            icon: 'check-circle'
        },
        {
            id: 'render',
            title: 'Rendering',
            description: 'Finalizing your creative',
            icon: 'magic'
        }
    ],

    // Current state
    currentStep: -1,
    stepStatuses: {},

    // Initialize
    init(containerId) {
        this.containerId = containerId;
        this.reset();
    },

    // Reset all steps
    reset() {
        this.currentStep = -1;
        this.stepStatuses = {};
        this.steps.forEach(step => {
            this.stepStatuses[step.id] = 'pending';
        });
        this.render();
    },

    // Set step status
    setStep(stepId, status) {
        this.stepStatuses[stepId] = status;
        
        // Update current step index
        const index = this.steps.findIndex(s => s.id === stepId);
        if (status === 'active') {
            this.currentStep = index;
        }
        
        this.render();
    },

    // Complete a step
    completeStep(stepId) {
        this.setStep(stepId, 'completed');
    },

    // Fail a step
    failStep(stepId, error) {
        this.stepStatuses[stepId] = 'error';
        this.stepErrors = this.stepErrors || {};
        this.stepErrors[stepId] = error;
        this.render();
    },

    // Start a step
    startStep(stepId) {
        // Complete previous steps
        const index = this.steps.findIndex(s => s.id === stepId);
        for (let i = 0; i < index; i++) {
            if (this.stepStatuses[this.steps[i].id] !== 'completed') {
                this.stepStatuses[this.steps[i].id] = 'completed';
            }
        }
        this.setStep(stepId, 'active');
    },

    // Get overall progress percentage
    getProgress() {
        const completed = Object.values(this.stepStatuses).filter(s => s === 'completed').length;
        return Math.round((completed / this.steps.length) * 100);
    },

    // Render workflow visualization
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const progress = this.getProgress();

        container.innerHTML = `
            <div class="workflow-viz">
                <div class="workflow-header">
                    <div class="workflow-title">
                        <i class="fas fa-cogs"></i>
                        AI Workflow
                    </div>
                    <div class="workflow-progress-text">
                        ${progress}% Complete
                    </div>
                </div>
                
                <div class="workflow-progress-bar">
                    <div class="workflow-progress-fill" style="width: ${progress}%"></div>
                </div>
                
                <div class="workflow-steps">
                    ${this.steps.map((step, index) => this.renderStep(step, index)).join('')}
                </div>
            </div>
        `;
    },

    // Render single step
    renderStep(step, index) {
        const status = this.stepStatuses[step.id] || 'pending';
        const isLast = index === this.steps.length - 1;
        
        let iconContent = '';
        switch (status) {
            case 'completed':
                iconContent = '<i class="fas fa-check"></i>';
                break;
            case 'active':
                iconContent = '<i class="fas fa-spinner fa-spin"></i>';
                break;
            case 'error':
                iconContent = '<i class="fas fa-times"></i>';
                break;
            default:
                iconContent = `<i class="fas fa-${step.icon}"></i>`;
        }

        return `
            <div class="workflow-step ${status}">
                <div class="workflow-step-indicator">
                    <div class="workflow-step-icon">
                        ${iconContent}
                    </div>
                    ${!isLast ? '<div class="workflow-step-line"></div>' : ''}
                </div>
                <div class="workflow-step-content">
                    <div class="workflow-step-title">${step.title}</div>
                    <div class="workflow-step-desc">${step.description}</div>
                    ${status === 'error' && this.stepErrors?.[step.id] ? 
                        `<div class="workflow-step-error">${this.stepErrors[step.id]}</div>` : ''}
                </div>
            </div>
        `;
    },

    // Run full workflow with callbacks
    async runWorkflow(callbacks) {
        this.reset();
        
        for (const step of this.steps) {
            this.startStep(step.id);
            
            try {
                if (callbacks[step.id]) {
                    await callbacks[step.id]();
                }
                this.completeStep(step.id);
            } catch (error) {
                this.failStep(step.id, error.message || 'An error occurred');
                throw error;
            }
        }
    }
};

// Workflow Styles (inject if not present)
if (!document.getElementById('workflow-viz-styles')) {
    const styles = document.createElement('style');
    styles.id = 'workflow-viz-styles';
    styles.textContent = `
        .workflow-viz {
            padding: var(--spacing-6);
        }

        .workflow-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--spacing-4);
        }

        .workflow-title {
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
            font-weight: var(--font-semibold);
            color: var(--text-secondary);
        }

        .workflow-progress-text {
            font-size: var(--text-sm);
            color: var(--primary-400);
            font-weight: var(--font-medium);
        }

        .workflow-progress-bar {
            height: 4px;
            background: var(--dark-border);
            border-radius: var(--radius-full);
            overflow: hidden;
            margin-bottom: var(--spacing-6);
        }

        .workflow-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-500), var(--accent-cyan));
            border-radius: var(--radius-full);
            transition: width 0.3s ease;
        }

        .workflow-steps {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-1);
        }

        .workflow-step {
            display: flex;
            gap: var(--spacing-3);
        }

        .workflow-step-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .workflow-step-icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--dark-card);
            border: 2px solid var(--dark-border);
            border-radius: 50%;
            color: var(--text-muted);
            font-size: var(--text-sm);
            flex-shrink: 0;
            transition: all var(--transition-fast);
        }

        .workflow-step-line {
            width: 2px;
            flex: 1;
            min-height: 24px;
            background: var(--dark-border);
            margin: var(--spacing-1) 0;
        }

        .workflow-step.completed .workflow-step-icon {
            background: var(--success);
            border-color: var(--success);
            color: white;
        }

        .workflow-step.completed .workflow-step-line {
            background: var(--success);
        }

        .workflow-step.active .workflow-step-icon {
            background: var(--primary-500);
            border-color: var(--primary-500);
            color: white;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        }

        .workflow-step.error .workflow-step-icon {
            background: var(--error);
            border-color: var(--error);
            color: white;
        }

        .workflow-step-content {
            padding-bottom: var(--spacing-4);
        }

        .workflow-step-title {
            font-weight: var(--font-medium);
            margin-bottom: 2px;
            transition: color var(--transition-fast);
        }

        .workflow-step.completed .workflow-step-title {
            color: var(--success);
        }

        .workflow-step.active .workflow-step-title {
            color: var(--primary-400);
        }

        .workflow-step.error .workflow-step-title {
            color: var(--error);
        }

        .workflow-step-desc {
            font-size: var(--text-sm);
            color: var(--text-muted);
        }

        .workflow-step-error {
            font-size: var(--text-xs);
            color: var(--error);
            margin-top: var(--spacing-1);
        }

        /* Compact mode */
        .workflow-viz.compact .workflow-steps {
            flex-direction: row;
            gap: 0;
        }

        .workflow-viz.compact .workflow-step {
            flex-direction: column;
            align-items: center;
            flex: 1;
        }

        .workflow-viz.compact .workflow-step-indicator {
            flex-direction: row;
            width: 100%;
        }

        .workflow-viz.compact .workflow-step-line {
            height: 2px;
            width: auto;
            flex: 1;
            min-height: 2px;
            margin: 0 0 0 var(--spacing-1);
        }

        .workflow-viz.compact .workflow-step-content {
            text-align: center;
            padding: var(--spacing-2) var(--spacing-1);
        }

        .workflow-viz.compact .workflow-step-title {
            font-size: var(--text-xs);
        }

        .workflow-viz.compact .workflow-step-desc {
            display: none;
        }
    `;
    document.head.appendChild(styles);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowViz;
}
