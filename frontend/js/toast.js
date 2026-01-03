/**
 * Toast Notification System
 * Retail Media Creative Builder
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.defaultDuration = 3000;
        this.maxToasts = 5;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @returns {string} Toast ID
     */
    show(options) {
        const {
            title = '',
            message = '',
            type = 'info', // success, error, warning, info
            duration = this.defaultDuration,
            closable = true,
            icon = null,
            action = null // { label: 'Undo', onClick: () => {} }
        } = options;

        // Remove oldest toast if max reached
        if (this.toasts.length >= this.maxToasts) {
            this.dismiss(this.toasts[0].id);
        }

        const id = `toast-${Date.now()}`;
        const toast = this.createToastElement(id, { title, message, type, closable, icon, action });
        
        this.container.appendChild(toast);
        this.toasts.push({ id, element: toast });

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    createToastElement(id, { title, message, type, closable, icon, action }) {
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast ${type}`;
        
        const iconHtml = icon || this.getDefaultIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${iconHtml}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            ${action ? `
                <button class="toast-action" onclick="event.stopPropagation()">
                    ${action.label}
                </button>
            ` : ''}
            ${closable ? `
                <button class="toast-close" onclick="Toast.dismiss('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        `;

        if (action && action.onClick) {
            const actionBtn = toast.querySelector('.toast-action');
            if (actionBtn) {
                actionBtn.addEventListener('click', () => {
                    action.onClick();
                    this.dismiss(id);
                });
            }
        }

        return toast;
    }

    getDefaultIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Dismiss a toast
     * @param {string} id - Toast ID
     */
    dismiss(id) {
        const index = this.toasts.findIndex(t => t.id === id);
        if (index === -1) return;

        const { element } = this.toasts[index];
        element.style.animation = 'slideInRight 0.3s ease reverse';
        
        setTimeout(() => {
            element.remove();
            this.toasts.splice(index, 1);
        }, 300);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        [...this.toasts].forEach(t => this.dismiss(t.id));
    }

    // Convenience methods
    success(message, title = '') {
        return this.show({ message, title, type: 'success' });
    }

    error(message, title = 'Error') {
        return this.show({ message, title, type: 'error', duration: 5000 });
    }

    warning(message, title = 'Warning') {
        return this.show({ message, title, type: 'warning', duration: 4000 });
    }

    info(message, title = '') {
        return this.show({ message, title, type: 'info' });
    }

    /**
     * Show loading toast
     * @returns {Object} Object with dismiss method
     */
    loading(message = 'Loading...') {
        const id = this.show({
            message,
            type: 'info',
            duration: 0,
            closable: false,
            icon: '<div class="spinner spinner-sm"></div>'
        });
        
        return {
            id,
            dismiss: () => this.dismiss(id),
            update: (newMessage, type = 'success') => {
                this.dismiss(id);
                this.show({ message: newMessage, type });
            }
        };
    }
}

// Create global instance
const Toast = new ToastManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, Toast };
}
