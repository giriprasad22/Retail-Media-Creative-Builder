/**
 * Creative Editor - Full Canvas Editor with AI Integration
 * Handles drag-and-drop canvas editing, layer management, and AI commands
 */

class CreativeEditor {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.elements = [];
        this.selectedElement = null;
        this.currentTool = 'select';
        this.zoom = 1;
        this.history = [];
        this.historyIndex = -1;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.canvasSize = { width: 1200, height: 628 };
        this.platform = 'amazon';
        this.showSafeZones = false;
        
        // AI conversation history
        this.aiMessages = [];
        
        this.init();
    }

    init() {
        this.loadFromSession();
        this.bindEvents();
        this.setupCanvas();
        this.renderLayers();
        this.draw();
        
        // Initialize history with current state
        this.saveToHistory();
        
        // Add welcome message to AI
        this.addAIMessage('assistant', '👋 Hi! I\'m your AI design assistant. Tell me what changes you\'d like to make.');
    }

    loadFromSession() {
        // Load creative data from session storage if available
        const creativeData = sessionStorage.getItem('currentCreative');
        if (creativeData) {
            try {
                const data = JSON.parse(creativeData);
                this.elements = data.elements || [];
                this.canvasSize = data.size || { width: 1200, height: 628 };
                this.platform = data.platform || 'amazon';
                
                // Update canvas size
                this.canvas.width = this.canvasSize.width;
                this.canvas.height = this.canvasSize.height;
                
                // Update UI
                document.getElementById('canvasSize').textContent = 
                    `${this.canvasSize.width} × ${this.canvasSize.height}`;
                document.getElementById('platformInfo').textContent = 
                    this.platform.charAt(0).toUpperCase() + this.platform.slice(1);
            } catch (e) {
                console.log('Starting with fresh canvas');
                this.createDefaultElements();
            }
        } else {
            this.createDefaultElements();
        }
    }

    createDefaultElements() {
        // Create default elements for a new creative
        this.elements = [
            {
                id: 'bg-1',
                type: 'background',
                name: 'Background',
                color: '#1a1a2e',
                gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                locked: true
            },
            {
                id: 'text-1',
                type: 'text',
                name: 'Headline',
                text: 'Your Headline Here',
                x: 100,
                y: 200,
                fontSize: 56,
                fontWeight: 'bold',
                color: '#ffffff',
                fontFamily: 'Inter'
            },
            {
                id: 'text-2',
                type: 'text',
                name: 'Subheadline',
                text: 'Add your subheadline text',
                x: 100,
                y: 280,
                fontSize: 24,
                fontWeight: 'normal',
                color: '#8b8b9e',
                fontFamily: 'Inter'
            },
            {
                id: 'button-1',
                type: 'button',
                name: 'CTA Button',
                text: 'Shop Now',
                x: 100,
                y: 350,
                width: 180,
                height: 50,
                fontSize: 16,
                fontWeight: '600',
                color: '#ffffff',
                backgroundColor: '#6366f1',
                borderRadius: 25
            }
        ];
        
        this.saveToHistory();
    }

    setupCanvas() {
        // Adjust canvas container for zoom
        this.updateZoomDisplay();
    }

    bindEvents() {
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Tool buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.dataset.tool);
            });
        });
        
        // Tab switching
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}Pane`).classList.add('active');
            });
        });
        
        // AI input
        document.getElementById('aiInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAICommand();
            }
        });
        
        // AI suggestions
        document.querySelectorAll('.ai-suggestion').forEach(sug => {
            sug.addEventListener('click', () => {
                document.getElementById('aiInput').value = sug.dataset.command;
                this.sendAICommand();
            });
        });
        
        // Export format checkboxes
        document.querySelectorAll('.export-format').forEach(format => {
            format.addEventListener('click', () => {
                format.classList.toggle('selected');
                const checkbox = format.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            });
        });
        
        // Quality slider
        const qualitySlider = document.getElementById('exportQuality');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                document.getElementById('qualityValue').textContent = e.target.value + '%';
            });
        }
        
        // Safe zone toggle
        document.getElementById('safeZoneToggle').addEventListener('click', () => {
            this.toggleSafeZones();
        });
    }

    // Mouse Events
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'select' || this.currentTool === 'move') {
            const element = this.getElementAt(pos.x, pos.y);
            
            if (element) {
                this.selectElement(element);
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - (element.x || 0),
                    y: pos.y - (element.y || 0)
                };
            } else {
                this.selectElement(null);
            }
        } else if (this.currentTool === 'text') {
            this.addTextAt(pos.x, pos.y);
        }
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isDragging && this.selectedElement && !this.selectedElement.locked) {
            this.selectedElement.x = pos.x - this.dragOffset.x;
            this.selectedElement.y = pos.y - this.dragOffset.y;
            this.draw();
            this.updatePropertyPanel();
        }
    }

    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.saveToHistory();
        }
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        const element = this.getElementAt(pos.x, pos.y);
        
        if (element && (element.type === 'text' || element.type === 'button')) {
            this.editTextElement(element);
        }
    }

    onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteElement();
        } else if (e.key === 'z' && e.ctrlKey) {
            e.shiftKey ? this.redo() : this.undo();
        } else if (e.key === 'y' && e.ctrlKey) {
            this.redo();
        } else if (e.key === 'd' && e.ctrlKey) {
            e.preventDefault();
            this.duplicateElement();
        } else if (e.key === 'v') {
            this.setTool('select');
        } else if (e.key === 't') {
            this.setTool('text');
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    getElementAt(x, y) {
        // Check from top to bottom (reverse order)
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (el.type === 'background') continue;
            
            const bounds = this.getElementBounds(el);
            if (x >= bounds.x && x <= bounds.x + bounds.width &&
                y >= bounds.y && y <= bounds.y + bounds.height) {
                return el;
            }
        }
        return null;
    }

    getElementBounds(el) {
        if (el.type === 'text') {
            this.ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize}px ${el.fontFamily || 'Inter'}`;
            const metrics = this.ctx.measureText(el.text);
            return {
                x: el.x,
                y: el.y - el.fontSize,
                width: metrics.width,
                height: el.fontSize * 1.2
            };
        } else if (el.type === 'button' || el.type === 'shape' || el.type === 'image') {
            return {
                x: el.x,
                y: el.y,
                width: el.width || 100,
                height: el.height || 100
            };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    // Tool Management
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        // Update cursor
        if (tool === 'text') {
            this.canvas.style.cursor = 'text';
        } else if (tool === 'move') {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    // Element Selection
    selectElement(element) {
        this.selectedElement = element;
        this.renderLayers();
        this.updatePropertyPanel();
        this.draw();
    }

    updatePropertyPanel() {
        const noSelection = document.getElementById('noSelection');
        const props = document.getElementById('elementProperties');
        const textProps = document.getElementById('textProperties');
        const bgColorRow = document.getElementById('bgColorRow');
        
        if (!this.selectedElement) {
            noSelection.style.display = 'flex';
            props.style.display = 'none';
            return;
        }
        
        noSelection.style.display = 'none';
        props.style.display = 'block';
        
        const el = this.selectedElement;
        
        // Position
        document.getElementById('propX').value = Math.round(el.x || 0);
        document.getElementById('propY').value = Math.round(el.y || 0);
        
        // Size
        if (el.width) {
            document.getElementById('propW').value = Math.round(el.width);
            document.getElementById('propH').value = Math.round(el.height || 0);
        }
        
        // Text properties
        if (el.type === 'text' || el.type === 'button') {
            textProps.style.display = 'block';
            document.getElementById('propText').value = el.text || '';
            document.getElementById('propFontSize').value = el.fontSize || 16;
            document.getElementById('propFontWeight').value = el.fontWeight || 'normal';
        } else {
            textProps.style.display = 'none';
        }
        
        // Colors
        const color = el.color || '#ffffff';
        document.getElementById('propColor').value = color;
        document.getElementById('propColorHex').value = color;
        document.getElementById('colorPreview').style.background = color;
        
        // Background color for buttons/shapes
        if (el.type === 'button' || el.type === 'shape') {
            bgColorRow.style.display = 'flex';
            const bgColor = el.backgroundColor || '#6366f1';
            document.getElementById('propBgColor').value = bgColor;
            document.getElementById('propBgColorHex').value = bgColor;
            document.getElementById('bgColorPreview').style.background = bgColor;
        } else {
            bgColorRow.style.display = 'none';
        }
    }

    updateProperty(prop, value) {
        if (!this.selectedElement) return;
        
        if (['x', 'y', 'width', 'height', 'fontSize'].includes(prop)) {
            value = parseInt(value) || 0;
        }
        
        this.selectedElement[prop] = value;
        this.draw();
        this.saveToHistory();
        
        // Update color previews
        if (prop === 'color') {
            document.getElementById('colorPreview').style.background = value;
            document.getElementById('propColorHex').value = value;
        } else if (prop === 'backgroundColor') {
            document.getElementById('bgColorPreview').style.background = value;
            document.getElementById('propBgColorHex').value = value;
        }
    }

    // Element Operations
    addElement(type) {
        const id = `${type}-${Date.now()}`;
        let element;
        
        switch (type) {
            case 'text':
                element = {
                    id,
                    type: 'text',
                    name: 'New Text',
                    text: 'New Text',
                    x: 100 + Math.random() * 100,
                    y: 200 + Math.random() * 100,
                    fontSize: 32,
                    fontWeight: 'normal',
                    color: '#ffffff',
                    fontFamily: 'Inter'
                };
                break;
            
            case 'button':
                element = {
                    id,
                    type: 'button',
                    name: 'New Button',
                    text: 'Click Here',
                    x: 100 + Math.random() * 100,
                    y: 200 + Math.random() * 100,
                    width: 160,
                    height: 48,
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#6366f1',
                    borderRadius: 24
                };
                break;
            
            case 'shape':
                element = {
                    id,
                    type: 'shape',
                    name: 'Rectangle',
                    shape: 'rectangle',
                    x: 100 + Math.random() * 100,
                    y: 200 + Math.random() * 100,
                    width: 200,
                    height: 150,
                    backgroundColor: '#6366f1',
                    borderRadius: 8
                };
                break;
            
            case 'image':
                this.addImageElement();
                return;
        }
        
        this.elements.push(element);
        this.selectElement(element);
        this.renderLayers();
        this.draw();
        this.saveToHistory();
        Toast.success(`Added ${type}`);
    }

    addTextAt(x, y) {
        const element = {
            id: `text-${Date.now()}`,
            type: 'text',
            name: 'New Text',
            text: 'New Text',
            x,
            y,
            fontSize: 32,
            fontWeight: 'normal',
            color: '#ffffff',
            fontFamily: 'Inter'
        };
        
        this.elements.push(element);
        this.selectElement(element);
        this.setTool('select');
        this.editTextElement(element);
        this.saveToHistory();
    }

    async addImageElement() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            Toast.loading('Uploading image...');
            
            try {
                const result = await API.uploadFile(file, 'images');
                
                const img = new Image();
                img.onload = () => {
                    const maxWidth = 400;
                    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                    
                    const element = {
                        id: `image-${Date.now()}`,
                        type: 'image',
                        name: file.name,
                        src: result.file_path,
                        x: 100,
                        y: 100,
                        width: img.width * scale,
                        height: img.height * scale,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        imageData: img
                    };
                    
                    this.elements.push(element);
                    this.selectElement(element);
                    this.renderLayers();
                    this.draw();
                    this.saveToHistory();
                    Toast.success('Image added');
                };
                
                img.src = URL.createObjectURL(file);
            } catch (error) {
                Toast.error('Failed to upload image');
            }
        };
        
        input.click();
    }

    editTextElement(element) {
        const text = prompt('Enter text:', element.text);
        if (text !== null) {
            element.text = text;
            element.name = text.substring(0, 20) + (text.length > 20 ? '...' : '');
            this.draw();
            this.renderLayers();
            this.updatePropertyPanel();
            this.saveToHistory();
        }
    }

    deleteElement() {
        if (!this.selectedElement || this.selectedElement.locked) return;
        
        const index = this.elements.findIndex(el => el.id === this.selectedElement.id);
        if (index > -1) {
            this.elements.splice(index, 1);
            this.selectElement(null);
            this.renderLayers();
            this.draw();
            this.saveToHistory();
            Toast.success('Element deleted');
        }
    }

    duplicateElement() {
        if (!this.selectedElement || this.selectedElement.locked) return;
        
        const clone = JSON.parse(JSON.stringify(this.selectedElement));
        clone.id = `${clone.type}-${Date.now()}`;
        clone.x = (clone.x || 0) + 20;
        clone.y = (clone.y || 0) + 20;
        clone.name = `${clone.name} copy`;
        
        this.elements.push(clone);
        this.selectElement(clone);
        this.renderLayers();
        this.draw();
        this.saveToHistory();
        Toast.success('Element duplicated');
    }

    bringToFront() {
        if (!this.selectedElement || this.selectedElement.locked) return;
        
        const index = this.elements.findIndex(el => el.id === this.selectedElement.id);
        if (index > -1 && index < this.elements.length - 1) {
            this.elements.splice(index, 1);
            this.elements.push(this.selectedElement);
            this.renderLayers();
            this.draw();
            this.saveToHistory();
        }
    }

    sendToBack() {
        if (!this.selectedElement || this.selectedElement.locked) return;
        
        const index = this.elements.findIndex(el => el.id === this.selectedElement.id);
        if (index > 1) { // Don't go behind background
            this.elements.splice(index, 1);
            this.elements.splice(1, 0, this.selectedElement);
            this.renderLayers();
            this.draw();
            this.saveToHistory();
        }
    }

    // Drawing
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.elements.forEach(el => {
            this.drawElement(el);
        });
        
        // Draw selection
        if (this.selectedElement && this.selectedElement.type !== 'background') {
            this.drawSelection(this.selectedElement);
        }
    }

    drawElement(el) {
        const ctx = this.ctx;
        
        switch (el.type) {
            case 'background':
                if (el.gradient) {
                    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
                    gradient.addColorStop(0, '#1a1a2e');
                    gradient.addColorStop(1, '#16213e');
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = el.color || '#1a1a2e';
                }
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            
            case 'text':
                ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize}px ${el.fontFamily || 'Inter'}`;
                ctx.fillStyle = el.color || '#ffffff';
                ctx.fillText(el.text, el.x, el.y);
                break;
            
            case 'button':
                ctx.fillStyle = el.backgroundColor || '#6366f1';
                this.roundRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius || 8);
                ctx.fill();
                
                ctx.font = `${el.fontWeight || '600'} ${el.fontSize}px ${el.fontFamily || 'Inter'}`;
                ctx.fillStyle = el.color || '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, el.x + el.width / 2, el.y + el.height / 2);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                break;
            
            case 'shape':
                ctx.fillStyle = el.backgroundColor || '#6366f1';
                if (el.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(el.x + el.width / 2, el.y + el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    this.roundRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius || 0);
                    ctx.fill();
                }
                break;
            
            case 'image':
                if (el.imageData) {
                    ctx.drawImage(el.imageData, el.x, el.y, el.width, el.height);
                } else {
                    // Draw placeholder
                    ctx.fillStyle = '#2a2a4a';
                    ctx.fillRect(el.x, el.y, el.width, el.height);
                    ctx.fillStyle = '#6366f1';
                    ctx.font = '14px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText('Loading...', el.x + el.width / 2, el.y + el.height / 2);
                    ctx.textAlign = 'left';
                }
                break;
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    drawSelection(el) {
        const bounds = this.getElementBounds(el);
        const ctx = this.ctx;
        const padding = 6;
        
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + padding * 2,
            bounds.height + padding * 2
        );
        ctx.setLineDash([]);
        
        // Draw handles
        const handles = [
            { x: bounds.x - padding, y: bounds.y - padding },
            { x: bounds.x + bounds.width + padding, y: bounds.y - padding },
            { x: bounds.x - padding, y: bounds.y + bounds.height + padding },
            { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding }
        ];
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        
        handles.forEach(h => {
            ctx.beginPath();
            ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    // Layer Management
    renderLayers() {
        const container = document.getElementById('layersList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Reverse order for layer display (top layers first)
        [...this.elements].reverse().forEach(el => {
            if (el.type === 'background') return;
            
            const layer = document.createElement('div');
            layer.className = `layer-item ${this.selectedElement?.id === el.id ? 'selected' : ''}`;
            layer.draggable = true;
            layer.dataset.id = el.id;
            
            layer.innerHTML = `
                <div class="layer-icon ${el.type}">
                    <i class="fas fa-${this.getLayerIcon(el.type)}"></i>
                </div>
                <div class="layer-info">
                    <div class="layer-name">${el.name || el.text || el.type}</div>
                    <div class="layer-type">${el.type}</div>
                </div>
                <div class="layer-actions">
                    <button class="layer-action-btn" onclick="editor.toggleVisibility('${el.id}')" title="Toggle visibility">
                        <i class="fas fa-${el.hidden ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="layer-action-btn" onclick="editor.deleteElementById('${el.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            layer.addEventListener('click', () => {
                const element = this.elements.find(e => e.id === el.id);
                this.selectElement(element);
            });
            
            container.appendChild(layer);
        });
    }

    getLayerIcon(type) {
        const icons = {
            text: 'font',
            button: 'hand-pointer',
            shape: 'square',
            image: 'image'
        };
        return icons[type] || 'layer-group';
    }

    toggleVisibility(id) {
        const element = this.elements.find(el => el.id === id);
        if (element) {
            element.hidden = !element.hidden;
            this.renderLayers();
            this.draw();
        }
    }

    deleteElementById(id) {
        const index = this.elements.findIndex(el => el.id === id);
        if (index > -1) {
            if (this.selectedElement?.id === id) {
                this.selectElement(null);
            }
            this.elements.splice(index, 1);
            this.renderLayers();
            this.draw();
            this.saveToHistory();
            Toast.success('Element deleted');
        }
    }

    // Zoom Controls
    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 2);
        this.applyZoom();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.3);
        this.applyZoom();
    }

    zoomFit() {
        const area = document.getElementById('canvasArea');
        const padding = 100;
        const scaleX = (area.clientWidth - padding) / this.canvas.width;
        const scaleY = (area.clientHeight - padding) / this.canvas.height;
        this.zoom = Math.min(scaleX, scaleY, 1);
        this.applyZoom();
    }

    applyZoom() {
        const container = document.getElementById('canvasContainer');
        container.style.transform = `scale(${this.zoom})`;
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
    }

    // Safe Zones
    toggleSafeZones() {
        this.showSafeZones = !this.showSafeZones;
        const overlay = document.getElementById('safeZoneOverlay');
        overlay.classList.toggle('visible', this.showSafeZones);
        
        if (this.showSafeZones) {
            this.drawSafeZones();
        }
    }

    drawSafeZones() {
        const overlay = document.getElementById('safeZoneOverlay');
        const safeMargin = 40;
        
        overlay.innerHTML = `
            <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                <rect x="${safeMargin}" y="${safeMargin}" 
                      width="${this.canvas.width - safeMargin * 2}" 
                      height="${this.canvas.height - safeMargin * 2}"
                      fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="5,5"/>
                <text x="${safeMargin + 10}" y="${safeMargin + 20}" fill="#6366f1" font-size="12">Safe Zone</text>
            </svg>
        `;
    }

    // AI Integration
    async sendAICommand() {
        const input = document.getElementById('aiInput');
        const command = input.value.trim();
        if (!command) return;
        
        // Add user message
        this.addAIMessage('user', command);
        input.value = '';
        
        // Show loading
        const loadingId = this.addAIMessage('assistant', '<i class="fas fa-spinner fa-spin"></i> Thinking...');
        
        try {
            // Call AI API
            const result = await API.aiTranslateCommand(command, this.elements);
            
            // Remove loading message
            this.removeAIMessage(loadingId);
            
            // Apply the AI edits
            if (result.actions && result.actions.length > 0) {
                this.applyAIActions(result.actions);
                this.addAIMessage('assistant', `✨ Done! ${result.explanation || 'Applied your changes.'}`);
            } else {
                this.addAIMessage('assistant', result.explanation || 'I understood your request but no changes were needed.');
            }
        } catch (error) {
            this.removeAIMessage(loadingId);
            this.addAIMessage('assistant', '❌ Sorry, I couldn\'t process that request. Please try again.');
        }
    }

    addAIMessage(role, content) {
        const container = document.getElementById('aiMessages');
        const id = `msg-${Date.now()}`;
        
        const message = document.createElement('div');
        message.className = `ai-message ${role}`;
        message.id = id;
        message.innerHTML = `<p>${content}</p>`;
        
        container.appendChild(message);
        container.scrollTop = container.scrollHeight;
        
        return id;
    }

    removeAIMessage(id) {
        const message = document.getElementById(id);
        if (message) {
            message.remove();
        }
    }

    applyAIActions(actions) {
        actions.forEach(action => {
            switch (action.type) {
                case 'modify':
                    const element = this.elements.find(el => 
                        el.id === action.target || 
                        el.name?.toLowerCase().includes(action.target?.toLowerCase())
                    );
                    if (element) {
                        Object.assign(element, action.properties);
                    }
                    break;
                
                case 'add':
                    this.elements.push({
                        id: `${action.elementType}-${Date.now()}`,
                        ...action.properties
                    });
                    break;
                
                case 'delete':
                    const index = this.elements.findIndex(el => 
                        el.id === action.target ||
                        el.name?.toLowerCase().includes(action.target?.toLowerCase())
                    );
                    if (index > -1) {
                        this.elements.splice(index, 1);
                    }
                    break;
            }
        });
        
        this.renderLayers();
        this.draw();
        this.saveToHistory();
    }

    // History (Undo/Redo)
    saveToHistory() {
        this.historyIndex++;
        this.history = this.history.slice(0, this.historyIndex);
        this.history.push(JSON.stringify(this.elements));
        
        // Limit history
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
        
        // Update button states
        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.selectElement(null);
            this.renderLayers();
            this.draw();
            this.updateHistoryButtons();
            Toast.success('Undo');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.selectElement(null);
            this.renderLayers();
            this.draw();
            this.updateHistoryButtons();
            Toast.success('Redo');
        }
    }
    
    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
        }
    }

    // Export
    export() {
        // Switch to export tab
        document.querySelector('.panel-tab[data-tab="export"]').click();
    }

    async exportAll() {
        const formats = [];
        document.querySelectorAll('.export-format.selected').forEach(f => {
            const format = f.querySelector('input').dataset.format;
            const [width, height] = format.split('x').map(Number);
            formats.push({ width, height, name: format });
        });
        
        if (formats.length === 0) {
            Toast.warning('Please select at least one format');
            return;
        }
        
        const fileFormat = document.getElementById('exportFileFormat').value;
        const quality = parseInt(document.getElementById('exportQuality').value) / 100;
        
        Toast.loading('Exporting...');
        
        try {
            for (const format of formats) {
                await this.exportFormat(format, fileFormat, quality);
            }
            Toast.success(`Exported ${formats.length} format(s)`);
        } catch (error) {
            Toast.error('Export failed');
        }
    }

    async exportFormat(format, fileFormat, quality) {
        // Create export canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = format.width;
        exportCanvas.height = format.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Calculate scale
        const scaleX = format.width / this.canvas.width;
        const scaleY = format.height / this.canvas.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Draw scaled content
        exportCtx.scale(scale, scale);
        
        // Draw elements on export canvas
        this.elements.forEach(el => {
            this.drawElementToContext(exportCtx, el);
        });
        
        // Convert to blob and download
        const mimeType = fileFormat === 'png' ? 'image/png' : 'image/jpeg';
        
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `creative_${format.name}.${fileFormat}`;
            a.click();
            URL.revokeObjectURL(url);
        }, mimeType, quality);
    }

    drawElementToContext(ctx, el) {
        switch (el.type) {
            case 'background':
                if (el.gradient) {
                    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
                    gradient.addColorStop(0, '#1a1a2e');
                    gradient.addColorStop(1, '#16213e');
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = el.color || '#1a1a2e';
                }
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            
            case 'text':
                ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize}px ${el.fontFamily || 'Inter'}`;
                ctx.fillStyle = el.color || '#ffffff';
                ctx.fillText(el.text, el.x, el.y);
                break;
            
            case 'button':
                ctx.fillStyle = el.backgroundColor || '#6366f1';
                this.roundRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius || 8);
                ctx.fill();
                
                ctx.font = `${el.fontWeight || '600'} ${el.fontSize}px ${el.fontFamily || 'Inter'}`;
                ctx.fillStyle = el.color || '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(el.text, el.x + el.width / 2, el.y + el.height / 2);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                break;
            
            case 'shape':
                ctx.fillStyle = el.backgroundColor || '#6366f1';
                if (el.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(el.x + el.width / 2, el.y + el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    this.roundRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius || 0);
                    ctx.fill();
                }
                break;
            
            case 'image':
                if (el.imageData) {
                    ctx.drawImage(el.imageData, el.x, el.y, el.width, el.height);
                }
                break;
        }
    }

    // Compliance Check
    async checkCompliance() {
        try {
            const result = await API.checkGuidelines(this.elements, this.platform);
            const badge = document.getElementById('complianceStatus');
            
            if (result.compliant) {
                badge.className = 'compliance-badge compliant';
                badge.innerHTML = '<i class="fas fa-check-circle"></i><span>Compliant</span>';
            } else {
                badge.className = 'compliance-badge issues';
                badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${result.issues.length} Issues</span>`;
            }
            
            return result;
        } catch (error) {
            console.error('Compliance check failed:', error);
        }
    }
}

// Initialize editor
let editor;
document.addEventListener('DOMContentLoaded', () => {
    editor = new CreativeEditor();
});
