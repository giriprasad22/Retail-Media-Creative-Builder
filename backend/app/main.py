"""
Flask Application - Retail Media Creative Builder
Complete Flask-based backend replacing FastAPI
"""
import os
import sys
from pathlib import Path

# ==================== AUTO INSTALL PACKAGES ====================
# Run auto-installer FIRST before any other imports
def auto_install_packages():
    """Auto-install all required packages on startup"""
    try:
        from app.auto_installer import run_auto_setup
        run_auto_setup()
    except ImportError:
        # If auto_installer itself can't be imported, install basic deps
        import subprocess
        print("🔧 Installing basic dependencies...")
        basic_packages = ["flask", "flask-cors", "loguru", "pydantic", "pydantic-settings", "pillow"]
        for pkg in basic_packages:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except:
                pass
        # Try again
        try:
            from app.auto_installer import run_auto_setup
            run_auto_setup()
        except:
            print("⚠️ Auto-installer not available. Please run: pip install -r requirements.txt")

# Run auto-install when main.py is executed
if __name__ == "__main__" or True:  # Always run on import
    auto_install_packages()

# ==================== IMPORTS ====================
import warnings
warnings.filterwarnings('ignore')
os.environ['CUDA_VISIBLE_DEVICES'] = ''

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import json
import asyncio
import uuid
from functools import wraps
from loguru import logger

# Import configuration
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.config import settings

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Directories
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend"
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
OUTPUT_DIR = Path(settings.OUTPUT_DIR)

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ==================== HELPER FUNCTIONS ====================

def run_async(coro):
    """Helper to run async functions in Flask sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def get_document_data(data):
    """
    Extract and convert document data from request.
    Supports both 'doc' and 'document' keys.
    Converts frontend 'layers' format to backend 'blocks' format.
    """
    doc_data = data.get('doc') or data.get('document')
    if not doc_data:
        return None
    
    # Convert 'layers' to 'blocks' if needed (frontend compatibility)
    if 'layers' in doc_data and 'blocks' not in doc_data:
        doc_data['blocks'] = [
            {
                'id': layer.get('id', str(uuid.uuid4())),
                'type': layer.get('type', 'text'),
                'text': layer.get('content') or layer.get('text', ''),
                'style': layer.get('style', {}),
                'position': layer.get('position', {}),
                'size': layer.get('size', {})
            }
            for layer in doc_data.get('layers', [])
        ]
    
    return doc_data


def handle_errors(f):
    """Decorator for error handling."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Error in {f.__name__}: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    return decorated_function


# ==================== STATIC FILE ROUTES ====================

@app.route('/')
def index():
    """Serve frontend index page."""
    return send_file(str(FRONTEND_DIR / "index.html"))


@app.route('/editor.html')
def editor():
    """Serve editor page."""
    return send_file(str(FRONTEND_DIR / "editor.html"))


@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files."""
    return send_from_directory(str(FRONTEND_DIR / "css"), filename)


@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files."""
    return send_from_directory(str(FRONTEND_DIR / "js"), filename)


@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    """Serve uploaded files."""
    return send_from_directory(str(UPLOAD_DIR), filename)


@app.route('/outputs/<path:filename>')
def serve_outputs(filename):
    """Serve output files."""
    return send_from_directory(str(OUTPUT_DIR), filename)


@app.route('/favicon.ico')
def favicon():
    """Handle favicon requests."""
    return '', 204


# ==================== HEALTH & STATUS ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "backend": "Flask"
    })


# ==================== STUB ENDPOINTS (for frontend compatibility) ====================

@app.route('/api/history/save', methods=['POST'])
def history_save():
    """Stub endpoint for history save (handled client-side)."""
    return jsonify({"success": True, "message": "History saved locally"})


@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Stub endpoint for templates."""
    return jsonify({"success": True, "templates": []})


@app.route('/api/upload/<path:type>', methods=['POST'])
def upload_file(type):
    """Stub endpoint for file uploads."""
    return jsonify({"success": True, "message": "Upload endpoint", "type": type})


@app.route('/api/export/<path:format>', methods=['POST'])
def export_file(format):
    """Stub endpoint for file exports."""
    return jsonify({"success": True, "message": "Export endpoint", "format": format})


# ==================== AI AGENT ROUTES ====================

@app.route('/api/ai/translate-command', methods=['POST'])
@handle_errors
def translate_command():
    """
    Translate natural language command to canvas actions.
    This is for the editor's AI assistant.
    """
    from app.services.ai.gemini_service import get_gemini_service
    
    data = request.get_json()
    command = data.get('command', '')
    current_canvas = data.get('current_canvas', [])
    
    if not command:
        return jsonify({"success": False, "error": "No command provided"}), 400
    
    # Get Gemini service
    gemini = get_gemini_service()
    
    # Create prompt for the AI to understand the command
    elements_desc = []
    for el in current_canvas:
        el_type = el.get('type', 'unknown')
        el_name = el.get('name', el.get('id', 'unnamed'))
        if el_type == 'text':
            elements_desc.append(f"- {el_name} (text): \"{el.get('text', '')}\" at ({el.get('x', 0)}, {el.get('y', 0)}), color: {el.get('color', '#fff')}, fontSize: {el.get('fontSize', 16)}")
        elif el_type == 'image':
            elements_desc.append(f"- {el_name} (image): at ({el.get('x', 0)}, {el.get('y', 0)}), size: {el.get('width', 0)}x{el.get('height', 0)}")
        elif el_type == 'button':
            elements_desc.append(f"- {el_name} (button): \"{el.get('text', '')}\" at ({el.get('x', 0)}, {el.get('y', 0)}), bgColor: {el.get('backgroundColor', '#000')}")
        elif el_type == 'background':
            elements_desc.append(f"- {el_name} (background): color: {el.get('color', '#000')}")
        else:
            elements_desc.append(f"- {el_name} ({el_type})")
    
    canvas_description = "\n".join(elements_desc) if elements_desc else "Empty canvas"
    
    prompt = f"""You are a design assistant that converts natural language commands into canvas edit actions.

Current canvas elements:
{canvas_description}

User command: "{command}"

Respond with a JSON object containing:
1. "actions": array of actions to perform. Each action has:
   - "type": "modify" | "add" | "delete"
   - "target": element name/id to modify or delete (for modify/delete)
   - "elementType": type for new elements (for add): "text" | "image" | "button" | "shape"
   - "properties": object with properties to set (color, text, x, y, fontSize, etc.)

2. "explanation": brief explanation of what you did

Examples:
- "make headline red" → {{"actions": [{{"type": "modify", "target": "Headline", "properties": {{"color": "#ff0000"}}}}], "explanation": "Changed headline color to red"}}
- "make text bigger" → {{"actions": [{{"type": "modify", "target": "Headline", "properties": {{"fontSize": 72}}}}], "explanation": "Increased headline font size"}}
- "move headline down" → {{"actions": [{{"type": "modify", "target": "Headline", "properties": {{"y": 300}}}}], "explanation": "Moved headline down"}}

Respond ONLY with valid JSON, no markdown or explanations outside the JSON."""

    async def translate():
        await gemini.initialize()
        response = await gemini.generate(prompt)
        return response
    
    try:
        response = run_async(translate())
        
        # Parse the AI response
        import json
        import re
        
        # Extract JSON from response
        response_text = response.get('response', '') if isinstance(response, dict) else str(response)
        
        # Try to find JSON in the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
            return jsonify({
                "success": True,
                "actions": result.get("actions", []),
                "explanation": result.get("explanation", "Changes applied")
            })
        else:
            return jsonify({
                "success": True,
                "actions": [],
                "explanation": response_text
            })
            
    except Exception as e:
        logger.error(f"AI translate error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "actions": [],
            "explanation": "Failed to process command"
        }), 500


@app.route('/api/ai/agent/status', methods=['GET'])
@handle_errors
def agent_status():
    """Get AI agent status and capabilities."""
    return jsonify({
        "success": True,
        "status": "ready",
        "backend": "Flask",
        "capabilities": {
            "text_edit": True,
            "creative_rewrite": True,
            "layout_suggestion": True,
            "style_suggestion": True,
            "cta_optimization": True,
            "localization": True,
            "ab_generation": True,
            "undo_redo": True,
            "versioning": True
        },
        "supported_locales": ["en", "hi", "te", "hi-en"],
        "festivals": ["diwali", "holi", "independence_day", "christmas", "eid"]
    })


@app.route('/api/ai/agent/suggest', methods=['POST'])
@handle_errors
def get_suggestions():
    """Get AI suggestions based on intent."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel, Language
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model - support both 'doc' and 'document' keys
    doc_data = data.get('doc') or data.get('document')
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    
    doc = DocumentModel.from_dict(doc_data)
    
    # Parse locale
    locale_str = data.get('locale', 'en')
    locale = Language(locale_str) if locale_str in [l.value for l in Language] else Language.ENGLISH
    
    # Get suggestions asynchronously
    async def get_suggestions_async():
        await agent.initialize()
        return await agent.get_suggestions(
            doc=doc,
            intent=data.get('intent', 'creative_rewrite'),
            locale=locale,
            context=data.get('context')
        )
    
    suggestion = run_async(get_suggestions_async())
    
    return jsonify({
        "success": True,
        "suggestion": {
            "id": suggestion.id,
            "intent": suggestion.intent.value,
            "variants": suggestion.variants,
            "recommended_index": suggestion.recommended_index,
            "reason": suggestion.reason,
            "confidence": suggestion.confidence
        },
        "patch": suggestion.patch.to_dict() if suggestion.patch else None
    })


@app.route('/api/ai/agent/command', methods=['POST'])
@handle_errors
def process_command():
    """Process natural language command."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel, Language
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model - support both 'doc' and 'document' keys
    doc_data = data.get('doc') or data.get('document')
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Parse locale
    locale_str = data.get('locale', 'en')
    locale = Language(locale_str) if locale_str in [l.value for l in Language] else Language.ENGLISH
    
    # Process command
    async def process_command_async():
        await agent.initialize()
        return await agent.process_command(
            command=data['command'],
            doc=doc,
            locale=locale,
            auto_apply=data.get('auto_apply', False)
        )
    
    result = run_async(process_command_async())
    
    return jsonify(result)


@app.route('/api/ai/agent/apply-patch', methods=['POST'])
@handle_errors
def apply_patch():
    """Apply a patch to a document."""
    from app.services.ai.unified_agent import (
        get_unified_agent, DocumentModel, Patch, PatchOp, PatchOperation
    )
    from datetime import datetime
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model
    doc_data = get_document_data(data)
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Create patch from dict
    patch_data = data['patch']
    operations = [
        PatchOp(
            operation=PatchOperation(op["operation"]),
            block_id=op["block_id"],
            data=op.get("data", {}),
            reason=op.get("reason", "")
        )
        for op in patch_data.get("operations", [])
    ]
    
    patch = Patch(
        id=patch_data.get("id", ""),
        operations=operations,
        timestamp=datetime.now(),
        description=patch_data.get("description", ""),
        confidence=patch_data.get("confidence", 1.0)
    )
    
    # Apply patch
    updated_doc = agent.apply_patch(doc, patch)
    
    return jsonify({
        "success": True,
        "document": updated_doc.to_dict(),
        "version_id": agent.current_version_index.get(doc.id, 0)
    })


@app.route('/api/ai/agent/undo/<doc_id>', methods=['POST'])
@handle_errors
def undo_change(doc_id):
    """Undo last change for a document."""
    from app.services.ai.unified_agent import get_unified_agent
    
    agent = get_unified_agent()
    doc = agent.undo(doc_id)
    
    if doc:
        return jsonify({
            "success": True,
            "document": doc.to_dict(),
            "version_id": agent.current_version_index[doc_id]
        })
    else:
        return jsonify({
            "success": False,
            "message": "No more undo steps available"
        })


@app.route('/api/ai/agent/redo/<doc_id>', methods=['POST'])
@handle_errors
def redo_change(doc_id):
    """Redo last undone change for a document."""
    from app.services.ai.unified_agent import get_unified_agent
    
    agent = get_unified_agent()
    doc = agent.redo(doc_id)
    
    if doc:
        return jsonify({
            "success": True,
            "document": doc.to_dict(),
            "version_id": agent.current_version_index[doc_id]
        })
    else:
        return jsonify({
            "success": False,
            "message": "No more redo steps available"
        })


@app.route('/api/ai/agent/localize', methods=['POST'])
@handle_errors
def localize_content():
    """Localize content to a target language."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel, Language
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model
    doc_data = get_document_data(data)
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Parse target locale
    target_locale_str = data.get('target_language') or data.get('target_locale', 'hi')
    target_locale = Language(target_locale_str) if target_locale_str in [l.value for l in Language] else Language.HINDI
    
    # Localize using get_suggestions with localization intent
    async def localize_async():
        await agent.initialize()
        return await agent.get_suggestions(
            doc=doc,
            intent='localization',
            locale=target_locale,
            context=data.get('context')
        )
    
    result = run_async(localize_async())
    
    return jsonify({
        "success": True,
        "suggestion": {
            "id": result.id,
            "intent": result.intent.value,
            "variants": result.variants,
            "recommended_index": result.recommended_index,
            "reason": result.reason,
            "confidence": result.confidence
        },
        "patch": result.patch.to_dict() if result.patch else None
    })


@app.route('/api/ai/agent/ab-test', methods=['POST'])
@handle_errors
def generate_ab_variants():
    """Generate A/B test variants."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model
    doc_data = get_document_data(data)
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Generate variants using get_suggestions with AB test intent
    async def generate_variants_async():
        await agent.initialize()
        return await agent.get_suggestions(
            doc=doc,
            intent='ab_generation',
            locale='en',
            context=data.get('context', {})
        )
    
    result = run_async(generate_variants_async())
    
    return jsonify({
        "success": True,
        "suggestion": {
            "id": result.id,
            "intent": result.intent.value,
            "variants": result.variants,
            "recommended_index": result.recommended_index,
            "reason": result.reason,
            "confidence": result.confidence
        },
        "patch": result.patch.to_dict() if result.patch else None
    })


@app.route('/api/ai/agent/style-suggestions', methods=['POST'])
@handle_errors
def get_style_suggestions():
    """Get style and color suggestions."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model
    doc_data = get_document_data(data)
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Get suggestions using get_suggestions with style intent
    async def get_style_async():
        await agent.initialize()
        return await agent.get_suggestions(
            doc=doc,
            intent='style_suggestion',
            locale='en',
            context=data.get('context', {})
        )
    
    result = run_async(get_style_async())
    
    return jsonify({
        "success": True,
        "suggestion": {
            "id": result.id,
            "intent": result.intent.value,
            "variants": result.variants,
            "recommended_index": result.recommended_index,
            "reason": result.reason,
            "confidence": result.confidence
        },
        "patch": result.patch.to_dict() if result.patch else None
    })


@app.route('/generate-layout', methods=['POST'])
@handle_errors
def generate_layout():
    """
    Generate a layout for creative based on platform and elements.
    This is used by the frontend to create initial layouts.
    """
    data = request.get_json()
    
    platform = data.get('platform', 'general')
    creative_type = data.get('creative_type', 'banner')
    elements = data.get('elements', {})
    style = data.get('style', {})
    
    # Get dimensions based on platform
    platform_dimensions = {
        'amazon': {'width': 1200, 'height': 624},
        'flipkart': {'width': 1200, 'height': 624},
        'general': {'width': 1200, 'height': 624},
        'instagram': {'width': 1080, 'height': 1080},
        'facebook': {'width': 1200, 'height': 624},
        'twitter': {'width': 1504, 'height': 504}
    }
    
    dims = platform_dimensions.get(platform, platform_dimensions['general'])
    width, height = dims['width'], dims['height']
    
    # Generate layout with elements
    layout = {
        'id': f"layout_{uuid.uuid4().hex[:8]}",
        'dimensions': {'width': width, 'height': height},
        'elements': {
            'headline': {
                'type': 'text',
                'content': elements.get('headline', 'Your Headline'),
                'x': int(width * 0.1),
                'y': int(height * 0.2),
                'width': int(width * 0.8),
                'height': int(height * 0.15),
                'fontSize': min(int(width * 0.06), 72),
                'fontWeight': 'bold',
                'color': '#ffffff',
                'textAlign': 'center'
            },
            'discount': {
                'type': 'badge',
                'content': elements.get('discount', ''),
                'x': int(width * 0.35),
                'y': int(height * 0.45),
                'width': int(width * 0.3),
                'height': int(height * 0.1),
                'fontSize': 36,
                'color': '#ffffff',
                'background': '#10b981',
                'borderRadius': 8
            } if elements.get('discount') else None,
            'cta': {
                'type': 'button',
                'content': elements.get('cta_text', 'Shop Now'),
                'x': int(width * 0.35),
                'y': int(height * 0.7),
                'width': int(width * 0.3),
                'height': int(height * 0.1),
                'fontSize': 20,
                'color': '#ffffff',
                'background': '#6366f1',
                'borderRadius': 8
            }
        },
        'background': {
            'type': 'gradient',
            'colors': style.get('colors', ['#1a1a2e', '#6366f1'])
        }
    }
    
    # Remove None elements
    layout['elements'] = {k: v for k, v in layout['elements'].items() if v is not None}
    
    return jsonify({
        'success': True,
        'layout': layout
    })


@app.route('/api/ai/agent/layout-suggestions', methods=['POST'])
@handle_errors
def get_layout_suggestions():
    """Get layout suggestions."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model
    doc_data = get_document_data(data)
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Get suggestions using get_suggestions with layout intent
    async def get_layout_async():
        await agent.initialize()
        return await agent.get_suggestions(
            doc=doc,
            intent='layout_suggestion',
            locale='en',
            context={'platform': data.get('platform', 'ecommerce')}
        )
    
    result = run_async(get_layout_async())
    
    return jsonify({
        "success": True,
        "suggestion": {
            "id": result.id,
            "intent": result.intent.value,
            "variants": result.variants,
            "recommended_index": result.recommended_index,
            "reason": result.reason,
            "confidence": result.confidence
        },
        "patch": result.patch.to_dict() if result.patch else None
    })


@app.route('/api/ai/agent/cta-optimize', methods=['POST'])
@handle_errors
def optimize_cta():
    """Optimize CTA text."""
    from app.services.ai.unified_agent import get_unified_agent, DocumentModel
    
    data = request.get_json()
    agent = get_unified_agent()
    
    # Create document model
    doc_data = get_document_data(data)
    if not doc_data:
        return jsonify({"success": False, "error": "Missing document data"}), 400
    doc = DocumentModel.from_dict(doc_data)
    
    # Optimize using get_suggestions with CTA intent
    async def optimize_cta_async():
        await agent.initialize()
        return await agent.get_suggestions(
            doc=doc,
            intent='cta_optimization',
            locale='en',
            context=data.get('context', {})
        )
    
    result = run_async(optimize_cta_async())
    
    return jsonify({
        "success": True,
        "suggestion": {
            "id": result.id,
            "intent": result.intent.value,
            "variants": result.variants,
            "recommended_index": result.recommended_index,
            "reason": result.reason,
            "confidence": result.confidence
        },
        "patch": result.patch.to_dict() if result.patch else None
    })


@app.route('/api/ai/agent/feedback', methods=['POST'])
@handle_errors
def submit_feedback():
    """Submit feedback on a suggestion."""
    from app.services.ai.unified_agent import get_unified_agent
    
    data = request.get_json()
    agent = get_unified_agent()
    
    if data.get('accepted', False):
        agent.accept_suggestion(data['suggestion_id'])
    else:
        agent.reject_suggestion(data['suggestion_id'])
    
    return jsonify({
        "success": True,
        "message": "Feedback recorded"
    })


@app.route('/api/ai/agent/telemetry', methods=['GET', 'POST'])
@handle_errors
def telemetry():
    """Get or save agent telemetry data."""
    from app.services.ai.unified_agent import get_unified_agent
    
    agent = get_unified_agent()
    
    if request.method == 'POST':
        # Save telemetry entry
        data = request.get_json()
        if data:
            # Just acknowledge - telemetry is tracked client-side
            return jsonify({"success": True})
    
    # GET request - return all telemetry
    return jsonify({
        "success": True,
        "telemetry": agent.get_telemetry()
    })


# ==================== AI IMAGE PROCESSING ====================

@app.route('/api/ai/remove-background', methods=['POST'])
def remove_background():
    """Remove background from image - handles both JSON and FormData."""
    try:
        from app.services.ai.background_removal import BackgroundRemovalService
        import base64
        from PIL import Image
        import io
        
        # Check if request is JSON or FormData
        if request.content_type and 'application/json' in request.content_type:
            # JSON request with base64 image
            data = request.get_json()
            image_data = data.get('image')
            image_path = data.get('image_path')
            model = data.get('model', 'u2net')
            alpha_matting = data.get('alpha_matting', False)
            
            if not image_data and not image_path:
                return jsonify({
                    "success": False,
                    "error": "No image provided"
                }), 400
            
            # Prepare image input
            if image_data:
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                image_input = image_data
            else:
                image_input = str(UPLOAD_DIR / image_path) if image_path else image_path
                
        else:
            # FormData request with file upload
            if 'file' not in request.files:
                return jsonify({
                    "success": False,
                    "error": "No file provided"
                }), 400
            
            file = request.files['file']
            model = request.form.get('model', 'u2net')
            alpha_matting = request.form.get('alpha_matting', 'false').lower() == 'true'
            
            # Read file and convert to base64
            try:
                file_bytes = file.read()
                image_input = base64.b64encode(file_bytes).decode('utf-8')
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to read file: {str(e)}"
                }), 400
        
        try:
            service = BackgroundRemovalService(model=model)
            
            # Remove background (synchronous method)
            result = service.remove_background(
                image_input=image_input,
                alpha_matting=alpha_matting,
                post_process=True,
                add_shadow=False
            )
            
            if result.success:
                return jsonify({
                    "success": True,
                    "image": f"data:image/png;base64,{result.image_base64}",
                    "original_size": result.original_size,
                    "has_alpha": result.has_alpha,
                    "processing_time": result.processing_time,
                    "model_used": result.model_used
                })
            else:
                return jsonify({
                    "success": False,
                    "error": result.error or "Background removal failed"
                }), 500
                
        except Exception as e:
            logger.error(f"Background removal processing error: {e}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    except Exception as e:
        logger.error(f"Background removal error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==================== MULTI-MODEL IMAGE GENERATION ====================

@app.route('/api/ai/generate/multi-model', methods=['POST'])
@handle_errors
def generate_multi_model_image():
    """
    Generate image using hybrid generator (API or local)
    """
    from app.services.ai.hybrid_image_gen import get_hybrid_generator
    
    data = request.get_json()
    
    # Extract parameters
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"success": False, "error": "Prompt is required"}), 400
    
    negative_prompt = data.get('negative_prompt', 'low quality, blurry, distorted, deformed, ugly')
    width = data.get('width', 1024)
    height = data.get('height', 768)
    style = data.get('style', 'professional')
    
    logger.info(f"Starting image generation: {prompt[:50]}...")
    
    # Generate with hybrid generator
    async def generate_async():
        generator = get_hybrid_generator()
        return await generator.generate(
            prompt=prompt,
            model_type="sdxl",
            negative_prompt=negative_prompt,
            width=width,
            height=height
        )
    
    try:
        result = run_async(generate_async())
        
        if result.get("success"):
            # Save final image
            output_filename = f"generated_{uuid.uuid4().hex[:8]}.png"
            output_path = OUTPUT_DIR / output_filename
            result["image"].save(output_path)
            
            return jsonify({
                "success": True,
                "image_url": f"/outputs/{output_filename}",
                "model_used": result.get("model", "sdxl"),
                "mode": result.get("mode", "hybrid"),
                "message": f"Generated using {result.get('mode', 'hybrid')} mode"
            })
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Generation failed")
            }), 500
        
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/ai/generate/pipeline-info', methods=['GET'])
@handle_errors
def get_pipeline_info():
    """Get information about the multi-model pipeline."""
    from app.services.ai.multi_model_generator import MultiModelGenerator
    
    generator = MultiModelGenerator()
    info = generator.get_pipeline_info()
    
    return jsonify({
        "success": True,
        "pipeline": info
    })


# ==================== ADVANCED IMAGE GENERATION (SDXL, SD3, FLUX) ====================

@app.route('/api/ai/generate/sdxl', methods=['POST'])
@handle_errors
def generate_with_sdxl():
    """
    Generate image using SDXL - Best free model, Sora-level quality
    
    ✔ 100% free
    ✔ No API key
    ✔ Photorealistic quality
    ✔ 8GB+ VRAM recommended (or uses free API in cloud)
    """
    from app.services.ai.hybrid_image_gen import get_hybrid_generator
    
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"success": False, "error": "Prompt is required"}), 400
    
    # Get style parameter (default to photorealistic)
    style = data.get('style', 'photorealistic')
    
    async def generate():
        generator = get_hybrid_generator()
        return await generator.generate(
            prompt=prompt,
            model_type="sdxl",
            negative_prompt=data.get('negative_prompt', ''),
            width=data.get('width', 1024),
            height=data.get('height', 1024),
            num_inference_steps=data.get('steps', 30),
            guidance_scale=data.get('guidance_scale', 7.5),
            style=style
        )
    
    result = run_async(generate())
    
    if result.get('success'):
        output_filename = f"sdxl_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / output_filename
        result["image"].save(output_path)
        
        return jsonify({
            "success": True,
            "image_url": f"/outputs/{output_filename}",
            "model": result["model"],
            "resolution": result["resolution"],
            "style_applied": result.get("style_applied", style),
            "prompt_used": result.get("prompt_used", prompt)
        })
    else:
        return jsonify(result), 500


@app.route('/api/ai/generate/sd3', methods=['POST'])
@handle_errors
def generate_with_sd3():
    """
    Generate image using SD3 - Newest, exceptional quality
    
    ✔ 100% free
    ✔ No API key
    ✔ Near commercial quality
    ✔ 16GB+ VRAM recommended (or uses free API in cloud)
    """
    from app.services.ai.hybrid_image_gen import get_hybrid_generator
    
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"success": False, "error": "Prompt is required"}), 400
    
    # Get style parameter (default to cinematic for SD3)
    style = data.get('style', 'cinematic')
    
    async def generate():
        generator = get_hybrid_generator()
        return await generator.generate(
            prompt=prompt,
            model_type="sd3",
            negative_prompt=data.get('negative_prompt', ''),
            width=data.get('width', 1024),
            height=data.get('height', 1024),
            num_inference_steps=data.get('steps', 28),
            guidance_scale=data.get('guidance_scale', 7.0)
        )
    
    result = run_async(generate())
    
    if result.get('success'):
        output_filename = f"sd3_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / output_filename
        result["image"].save(output_path)
        
        return jsonify({
            "success": True,
            "image_url": f"/outputs/{output_filename}",
            "model": result["model"],
            "resolution": result["resolution"],
            "style_applied": result.get("style_applied", style),
            "prompt_used": result.get("prompt_used", prompt)
        })
    else:
        return jsonify(result), 500


@app.route('/api/ai/generate/flux', methods=['POST'])
@handle_errors
def generate_with_flux():
    """
    Generate image using FLUX.1 - SOTA, closest to Sora quality
    
    ✔ 100% free
    ✔ No API key
    ✔ Hyper-realistic output
    ✔ 12GB+ VRAM recommended (or uses free API in cloud)
    """
    from app.services.ai.hybrid_image_gen import get_hybrid_generator
    
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"success": False, "error": "Prompt is required"}), 400
    
    # Get style parameter (default to hyper-realistic for FLUX)
    style = data.get('style', 'hyper-realistic')
    
    async def generate():
        generator = get_hybrid_generator()
        return await generator.generate(
            prompt=prompt,
            model_type="flux",
            width=data.get('width', 1024),
            height=data.get('height', 1024),
            num_inference_steps=data.get('steps', 25),
            guidance_scale=data.get('guidance_scale', 3.5)
        )
    
    result = run_async(generate())
    
    if result.get('success'):
        output_filename = f"flux_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / output_filename
        result["image"].save(output_path)
        
        return jsonify({
            "success": True,
            "image_url": f"/outputs/{output_filename}",
            "model": result["model"],
            "resolution": result["resolution"],
            "style_applied": result.get("style_applied", style),
            "prompt_used": result.get("prompt_used", prompt)
        })
    else:
        return jsonify(result), 500


@app.route('/api/ai/generate/auto', methods=['POST'])
@handle_errors
def generate_auto():
    """
    Auto-select the best available model based on system capabilities.
    
    Quality levels:
    - fast: SDXL Turbo (3s)
    - balanced: SDXL (15s)
    - best: FLUX.1 → SD3 → SDXL (tries best first, or uses API in cloud)
    """
    from app.services.ai.hybrid_image_gen import get_hybrid_generator
    
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"success": False, "error": "Prompt is required"}), 400
    
    quality = data.get('quality', 'balanced')  # fast, balanced, best
    style = data.get('style', 'photorealistic')  # User-selected visual style
    
    async def generate():
        generator = get_hybrid_generator()
        # Map quality to model type
        model_map = {"fast": "sdxl_turbo", "balanced": "sdxl", "best": "flux"}
        model_type = model_map.get(quality, "sdxl")
        
        return await generator.generate(
            prompt=prompt,
            model_type=model_type,
            negative_prompt=data.get('negative_prompt', ''),
            width=data.get('width', 1024),
            height=data.get('height', 1024)
        )
    
    result = run_async(generate())
    
    if result.get('success'):
        output_filename = f"auto_{uuid.uuid4().hex[:8]}.png"
        output_path = OUTPUT_DIR / output_filename
        result["image"].save(output_path)
        
        return jsonify({
            "success": True,
            "image_url": f"/outputs/{output_filename}",
            "model": result["model"],
            "resolution": result["resolution"],
            "style_applied": result.get("style_applied", style),
            "quality_level": quality,
            "prompt_used": result.get("prompt_used", prompt)
        })
    else:
        return jsonify(result), 500


@app.route('/api/ai/generate/models', methods=['GET'])
@handle_errors
def get_available_models():
    """Get information about all available image generation models."""
    from app.services.ai.hybrid_image_gen import get_hybrid_generator
    
    generator = get_hybrid_generator()
    models_info = generator.get_available_models()
    
    return jsonify({
        "success": True,
        **models_info
    })


# ==================== GUIDELINE CHECKING ROUTES ====================

@app.route('/api/retailers', methods=['GET'])
@handle_errors
def get_retailers():
    """Get list of supported retailers."""
    from app.services.guideline_checker import GuidelineChecker
    
    checker = GuidelineChecker()
    retailers = checker.get_supported_retailers()
    
    return jsonify({
        "success": True,
        "retailers": retailers
    })


@app.route('/check-guidelines/<platform>', methods=['POST'])
@handle_errors
def check_guidelines(platform):
    """Check creative against platform guidelines."""
    from app.services.guideline_checker import GuidelineChecker
    from app.models.schemas import Creative, CreativeElement, BoundingBox
    
    data = request.get_json()
    
    # Map platform to retailer
    retailer_map = {
        'amazon': 'amazon',
        'flipkart': 'flipkart',
        'dmart': 'dmart',
        'general': 'general'
    }
    retailer = retailer_map.get(platform, 'general')
    
    # Extract creative data
    width = data.get('width', 1200)
    height = data.get('height', 628)
    elements_data = data.get('elements', [])
    
    # Convert elements to CreativeElement objects
    elements = []
    for el in elements_data:
        try:
            bbox = BoundingBox(
                x=el.get('x', 0),
                y=el.get('y', 0),
                width=el.get('width', 0),
                height=el.get('height', 0)
            )
            element = CreativeElement(
                element_id=el.get('id', str(uuid.uuid4())),
                element_type=el.get('type', 'text'),
                content=el.get('text', '') or el.get('content', ''),
                bbox=bbox,
                style=el.get('style', {})
            )
            elements.append(element)
        except Exception as e:
            logger.warning(f"Failed to parse element: {e}")
    
    # Create Creative object
    creative = Creative(
        creative_id=data.get('id', str(uuid.uuid4())),
        variation_number=0,
        width=width,
        height=height,
        elements=elements,
        preview_path=""
    )
    
    # Run guideline check
    checker = GuidelineChecker()
    results = checker.check(creative, retailer)
    
    # Format results
    issues = []
    passed = True
    for result in results:
        if not result.passed:
            passed = False
            issues.append({
                "rule_id": result.rule.rule_id,
                "name": result.rule.name,
                "message": result.message,
                "severity": result.rule.severity,
                "category": result.rule.category
            })
    
    return jsonify({
        "success": True,
        "is_compliant": passed,
        "issues": issues,
        "total_checks": len(results),
        "passed_checks": sum(1 for r in results if r.passed)
    })


@app.route('/api/ai/check-compliance', methods=['POST'])
@handle_errors
def ai_check_compliance():
    """AI-powered compliance checking."""
    from app.services.ai.gemini_service import get_gemini_service
    
    data = request.get_json()
    canvas_data = data.get('canvas', {})
    retailer = data.get('retailer', 'general')
    
    # Extract text content for AI analysis
    text_elements = []
    for el in canvas_data.get('elements', []):
        if el.get('type') == 'text' and el.get('text'):
            text_elements.append(el['text'])
    
    combined_text = ' '.join(text_elements)
    
    if not combined_text:
        return jsonify({
            "success": True,
            "compliant": True,
            "issues": [],
            "suggestions": []
        })
    
    # Run AI compliance check
    gemini = get_gemini_service()
    result = run_async(gemini.check_compliance(combined_text, retailer))
    
    return jsonify({
        "success": True,
        **result
    })


@app.route('/api/ai/auto-fix', methods=['POST'])
@handle_errors
def ai_auto_fix():
    """Auto-fix compliance issues."""
    from app.services.auto_fixer import AutoFixer
    
    data = request.get_json()
    canvas_data = data.get('canvas', {})
    issues = data.get('issues', [])
    retailer = data.get('retailer', 'general')
    
    # Use auto-fixer service
    fixer = AutoFixer()
    fixed_canvas = run_async(fixer.fix_issues(canvas_data, issues, retailer))
    
    return jsonify({
        "success": True,
        "layout": fixed_canvas,
        "fixes_applied": len(issues)
    })


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({"error": "Internal server error"}), 500


# ==================== MAIN ====================

if __name__ == '__main__':
    # Set UTF-8 encoding for Windows console
    import sys
    if sys.platform == 'win32':
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    
    print("=" * 70)
    print(f" {settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 70)
    print(f" Frontend: {FRONTEND_DIR}")
    print(f" Uploads:  {UPLOAD_DIR}")
    print(f" Outputs:  {OUTPUT_DIR}")
    print(f" Server:   http://localhost:8000")
    print(f" Editor:   http://localhost:8000/editor.html")
    print("=" * 70)
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        app.run(
            host='0.0.0.0',
            port=8000,
            debug=False,
            threaded=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
    except Exception as e:
        print(f"\n\nServer error: {e}")
        import traceback
        traceback.print_exc()

