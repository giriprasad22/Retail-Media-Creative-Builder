/**
 * API Service - Handles all communication with the backend
 * Retail Media Creative Builder
 */

class APIService {
    constructor(baseUrl = '') {
        // Use backend URL if specified, otherwise use same origin
        this.baseUrl = baseUrl || this.detectBackendUrl();
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Detect backend URL based on current environment
     */
    detectBackendUrl() {
        // If running from file:// protocol, assume backend is on localhost:8000
        if (window.location.protocol === 'file:') {
            return 'http://localhost:8000';
        }
        // If frontend is served on port 8080, backend is likely on 8000
        if (window.location.port === '8080' || window.location.port === '5500') {
            return `${window.location.protocol}//${window.location.hostname}:8000`;
        }
        // Otherwise, same origin
        return '';
    }

    /**
     * Make a fetch request with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(
                    errorData.detail || `HTTP error ${response.status}`,
                    response.status,
                    errorData
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof APIError) throw error;
            // Network error - backend might be offline
            throw new APIError(`Backend unavailable: ${error.message}`, 0, null);
        }
    }

    // ========== Health Check ==========
    
    async healthCheck() {
        return this.request('/api/health');
    }

    // ========== Prompt Parsing ==========
    
    async parsePrompt(prompt, platform = 'amazon') {
        return this.request('/parse-prompt', {
            method: 'POST',
            body: JSON.stringify({ prompt, platform })
        });
    }

    // ========== Layout Generation ==========
    
    async generateLayout(data) {
        return this.request('/generate-layout', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ========== AI Generation Endpoints ==========
    
    async aiGenerate(prompt, adType = 'banner', stylePreferences = {}) {
        return this.request('/api/ai/generate', {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                ad_type: adType,
                style_preferences: stylePreferences
            })
        });
    }

    async aiGenerateComplete(request) {
        return this.request('/api/ai/generate-complete', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async aiGetCreativeConcept(prompt, retailer = 'amazon', style = null) {
        return this.request('/api/ai/creative-concept', {
            method: 'POST',
            body: JSON.stringify({ prompt, retailer, style })
        });
    }

    async aiTranslateCommand(command, currentCanvas) {
        return this.request('/api/ai/translate-command', {
            method: 'POST',
            body: JSON.stringify({
                command,
                current_canvas: currentCanvas
            })
        });
    }

    async aiEdit(command, canvasState, retailer = 'amazon') {
        return this.request('/api/ai/edit', {
            method: 'POST',
            body: JSON.stringify({
                command,
                canvas_state: canvasState,
                retailer
            })
        });
    }

    // ========== Image Analysis ==========
    
    async analyzeImage(imageData) {
        return this.request('/api/ai/analyze-image', {
            method: 'POST',
            body: JSON.stringify({ image: imageData })
        });
    }

    // ========== Background Operations ==========
    
    async removeBackground(imageData) {
        return this.request('/api/ai/remove-background', {
            method: 'POST',
            body: JSON.stringify({ image: imageData })
        });
    }

    async generateBackground(params) {
        return this.request('/api/ai/generate-background', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }

    // ========== Guideline Checking ==========
    
    async getRetailers() {
        return this.request('/api/retailers');
    }

    async checkGuidelines(platform, layout) {
        return this.request(`/check-guidelines/${platform}`, {
            method: 'POST',
            body: JSON.stringify(layout)
        });
    }

    async aiCheckCompliance(canvasData, retailer) {
        return this.request('/api/ai/check-compliance', {
            method: 'POST',
            body: JSON.stringify({ canvas: canvasData, retailer })
        });
    }

    async aiAutoFix(canvasData, issues, retailer) {
        return this.request('/api/ai/auto-fix', {
            method: 'POST',
            body: JSON.stringify({ canvas: canvasData, issues, retailer })
        });
    }

    // ========== File Upload ==========
    
    async uploadFile(file, type = 'product') {
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = type === 'logo' ? '/api/upload/logo' : '/api/upload/product';
        
        return fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            body: formData
        }).then(res => res.json());
    }

    // ========== Export ==========
    
    async exportCreative(canvasData, formats, options = {}) {
        return this.request('/api/export/multi-format', {
            method: 'POST',
            body: JSON.stringify({
                canvas: canvasData,
                formats,
                format: options.format || 'png',
                quality: options.quality || 90
            })
        });
    }

    async exportOptimized(canvasData, maxSizeKb = 500, format = 'jpg') {
        return this.request('/api/export/optimized', {
            method: 'POST',
            body: JSON.stringify({
                canvas: canvasData,
                max_size_kb: maxSizeKb,
                format
            })
        });
    }

    // ========== Editor Session ==========
    
    async startEditorSession(data) {
        return this.request('/api/editor/start', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getEditorState(sessionId) {
        return this.request(`/api/editor/${sessionId}/state`);
    }

    async applyEdit(sessionId, editType, params) {
        return this.request(`/api/editor/${sessionId}/edit`, {
            method: 'POST',
            body: JSON.stringify({ edit_type: editType, parameters: params })
        });
    }

    // ========== Templates ==========
    
    async getTemplates(category = null, retailer = null) {
        let endpoint = '/api/templates';
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (retailer) params.append('retailer', retailer);
        if (params.toString()) endpoint += `?${params.toString()}`;
        
        return this.request(endpoint);
    }

    // ========== Workflows ==========
    
    async getWorkflowStatus(workflowId) {
        return this.request(`/api/workflow/${workflowId}/status`);
    }

    // ========== AI Agent Endpoints ==========
    
    /**
     * Get AI suggestions for the current document
     */
    async agentSuggest(document, language = 'en', focusArea = 'all') {
        return this.request('/api/ai/agent/suggest', {
            method: 'POST',
            body: JSON.stringify({
                document,
                language,
                focus_area: focusArea
            })
        });
    }

    /**
     * Process a natural language command
     */
    async agentCommand(command, document, language = 'en') {
        return this.request('/api/ai/agent/command', {
            method: 'POST',
            body: JSON.stringify({
                command,
                document,
                language
            })
        });
    }

    /**
     * Apply a patch to a document
     */
    async agentApplyPatch(docId, patch) {
        return this.request('/api/ai/agent/apply-patch', {
            method: 'POST',
            body: JSON.stringify({
                doc_id: docId,
                patch
            })
        });
    }

    /**
     * Undo the last action
     */
    async agentUndo(docId) {
        return this.request(`/api/ai/agent/undo/${docId}`, {
            method: 'POST'
        });
    }

    /**
     * Redo a previously undone action
     */
    async agentRedo(docId) {
        return this.request(`/api/ai/agent/redo/${docId}`, {
            method: 'POST'
        });
    }

    /**
     * Get document version history
     */
    async agentGetHistory(docId) {
        return this.request(`/api/ai/agent/history/${docId}`);
    }

    /**
     * Localize content to a target language
     */
    async agentLocalize(document, targetLanguage, adaptForMarket = true) {
        return this.request('/api/ai/agent/localize', {
            method: 'POST',
            body: JSON.stringify({
                document,
                target_language: targetLanguage,
                adapt_for_market: adaptForMarket
            })
        });
    }

    /**
     * Generate creative variants for A/B testing
     */
    async agentGenerateVariants(document, language = 'en', numVariants = 3) {
        return this.request('/api/ai/agent/creative-variants', {
            method: 'POST',
            body: JSON.stringify({
                document,
                language,
                num_variants: numVariants
            })
        });
    }

    /**
     * Generate A/B test variants
     */
    async agentABTest(document, language = 'en', numVariants = 3) {
        return this.request('/api/ai/agent/ab-test', {
            method: 'POST',
            body: JSON.stringify({
                document,
                language,
                num_variants: numVariants
            })
        });
    }

    /**
     * Get style suggestions for the document
     */
    async agentStyleSuggestions(document, language = 'en', festival = null) {
        return this.request('/api/ai/agent/style-suggestions', {
            method: 'POST',
            body: JSON.stringify({
                document,
                language,
                festival
            })
        });
    }

    /**
     * Get layout suggestions
     */
    async agentLayoutSuggestions(document, platform = 'ecommerce') {
        return this.request('/api/ai/agent/layout-suggestions', {
            method: 'POST',
            body: JSON.stringify({
                document,
                platform
            })
        });
    }

    /**
     * Optimize CTA elements
     */
    async agentOptimizeCTA(document, language = 'en') {
        return this.request('/api/ai/agent/cta-optimize', {
            method: 'POST',
            body: JSON.stringify({
                document,
                language
            })
        });
    }

    /**
     * Send feedback on suggestion
     */
    async agentFeedback(suggestionId, accepted, userComment = null) {
        return this.request('/api/ai/agent/feedback', {
            method: 'POST',
            body: JSON.stringify({
                suggestion_id: suggestionId,
                accepted,
                user_comment: userComment
            })
        });
    }

    /**
     * Send telemetry data
     */
    async agentTelemetry(data) {
        return this.request('/api/ai/agent/telemetry', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Create singleton instance
const api = new APIService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIService, APIError, api };
}
