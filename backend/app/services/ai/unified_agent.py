"""
Unified AI Agent Orchestrator
Complete AI agent system using Google Gemini for all LLM operations.
Implements: text edit, creative rewrite, layout suggestion, style suggestion,
CTA optimization, localization, A/B generation, and auto-apply with versioning.
"""

import asyncio
import json
import uuid
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
from loguru import logger

from .gemini_service import get_gemini_service


class Language(str, Enum):
    """Supported languages"""
    ENGLISH = "en"
    HINDI = "hi"
    TELUGU = "te"
    HINGLISH = "hi-en"


class EditIntent(str, Enum):
    """Types of edit intents"""
    TEXT_EDIT = "text_edit"
    CREATIVE_REWRITE = "creative_rewrite"
    LAYOUT_SUGGESTION = "layout_suggestion"
    STYLE_SUGGESTION = "style_suggestion"
    CTA_OPTIMIZATION = "cta_optimization"
    LOCALIZATION = "localization"
    AB_GENERATION = "ab_generation"
    COLOR_CHANGE = "color_change"
    FONT_CHANGE = "font_change"
    RESIZE = "resize"
    MOVE = "move"
    DELETE = "delete"
    ADD = "add"


class PatchOperation(str, Enum):
    """Patch operation types"""
    REPLACE_TEXT = "replace_text"
    UPDATE_STYLE = "update_style"
    MOVE_BLOCK = "move_block"
    ADD_BLOCK = "add_block"
    DELETE_BLOCK = "delete_block"
    CHANGE_LAYOUT = "change_layout"


@dataclass
class Block:
    """Document block structure"""
    id: str
    type: str  # text, button, image, shape
    text: Optional[str] = None
    style: Dict[str, Any] = field(default_factory=dict)
    position: Dict[str, float] = field(default_factory=dict)
    size: Dict[str, float] = field(default_factory=dict)


@dataclass
class DocumentModel:
    """JSON-based document model for AI edits"""
    id: str
    blocks: List[Block] = field(default_factory=list)
    layout: str = "center"
    meta: Dict[str, Any] = field(default_factory=dict)
    background: Dict[str, Any] = field(default_factory=dict)
    dimensions: Dict[str, int] = field(default_factory=lambda: {"width": 1200, "height": 628})
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "blocks": [
                {
                    "id": b.id,
                    "type": b.type,
                    "text": b.text,
                    "style": b.style,
                    "position": b.position,
                    "size": b.size
                }
                for b in self.blocks
            ],
            "layout": self.layout,
            "meta": self.meta,
            "background": self.background,
            "dimensions": self.dimensions
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DocumentModel":
        blocks = [
            Block(
                id=b.get("id", str(uuid.uuid4())),
                type=b.get("type", "text"),
                text=b.get("text"),
                style=b.get("style", {}),
                position=b.get("position", {}),
                size=b.get("size", b.get("position", {}))  # Use position as fallback for size
            )
            for b in data.get("blocks", [])
        ]
        # Support both 'dimensions' and 'canvas' keys for compatibility
        dimensions = data.get("dimensions") or data.get("canvas") or {"width": 1200, "height": 628}
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            blocks=blocks,
            layout=data.get("layout", "center"),
            meta=data.get("meta", {}),
            background=data.get("background", {}),
            dimensions=dimensions
        )


@dataclass
class PatchOp:
    """Single patch operation"""
    operation: PatchOperation
    block_id: str
    data: Dict[str, Any] = field(default_factory=dict)
    reason: str = ""


@dataclass
class Patch:
    """Collection of patch operations"""
    id: str
    operations: List[PatchOp]
    timestamp: datetime
    description: str = ""
    confidence: float = 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "operations": [
                {
                    "operation": op.operation.value,
                    "block_id": op.block_id,
                    "data": op.data,
                    "reason": op.reason
                }
                for op in self.operations
            ],
            "timestamp": self.timestamp.isoformat(),
            "description": self.description,
            "confidence": self.confidence
        }


@dataclass
class Suggestion:
    """AI suggestion with variants"""
    id: str
    intent: EditIntent
    variants: List[Dict[str, Any]]
    recommended_index: int
    reason: str
    patch: Optional[Patch]
    confidence: float
    locale: Language = Language.ENGLISH


@dataclass
class DocumentVersion:
    """Document version for undo/redo"""
    version_id: str
    document: DocumentModel
    patch_applied: Optional[Patch]
    timestamp: datetime
    description: str = ""


class UnifiedAIAgent:
    """
    Unified AI Agent using Google Gemini for all operations.
    
    Capabilities:
    - Text edit (modify content, tone, length, language)
    - Creative rewrite (generate 3 variant headlines with personas)
    - Layout suggestion (alternate placements with preview)
    - Style suggestion (fonts, sizes, color palettes with accessibility)
    - CTA optimization (different copy for objectives)
    - Localization (â‚¹ formatting, regional wording, translations)
    - A/B generation (produce A and B variants)
    - Explainability (reason for each suggestion)
    - Auto-apply / preview
    - Undo / versioning
    """
    
    # System prompts for different tasks
    SYSTEM_PROMPTS = {
        "creative_editor": """You are a creative marketing editor for Indian e-commerce banners.
Constraints:
- Max headline 10 words
- Use â‚¹ for currency (Indian Rupees)
- Respect the occasion if specified (Diwali, Holi, etc.)
- Provide 3 variants and 1 recommended final variant
- Return JSON format with: variants, recommended_index, reason, patch

Output JSON structure:
{
    "variants": [{"text": "...", "lang": "en", "tone": "..."}],
    "recommended_index": 0,
    "reason": "Brief explanation",
    "patch": {"operations": [...]}
}""",

        "layout_suggester": """You are an expert UI/UX designer for advertising layouts.
Generate layout suggestions with exact positioning for ad creatives.
Consider: visual hierarchy, balance, whitespace, platform guidelines.

Output JSON with positions as percentages (0-100):
{
    "layout_name": "text-left-product-right",
    "elements": [
        {"id": "headline", "x": 5, "y": 20, "width": 45, "height": 15},
        {"id": "cta", "x": 5, "y": 75, "width": 30, "height": 12}
    ],
    "reason": "Better visual flow",
    "confidence": 0.85
}""",

        "style_suggester": """You are a color theory and typography expert for advertising.
Suggest color palettes and fonts that align with brand identity.
Consider: contrast, accessibility (WCAG), emotional impact.

Output JSON:
{
    "color_palette": {
        "primary": "#hex",
        "secondary": "#hex",
        "accent": "#hex",
        "background": "#hex"
    },
    "fonts": {
        "headline": {"family": "...", "weight": "bold", "size": 48},
        "body": {"family": "...", "weight": "normal", "size": 16}
    },
    "accessibility_score": 0.95,
    "reason": "High contrast, festive mood"
}""",

        "localizer": """You are a localization expert for Indian languages.
Translate and adapt content for Hindi, Telugu, and Hinglish.
Preserve brand voice and marketing impact.
Use proper currency format: â‚¹1,999 (Indian Rupee)
Use proper date format for India: DD/MM/YYYY

Output JSON:
{
    "translations": {
        "en": "Original English",
        "hi": "à¤¹à¤¿à¤‚à¤¦à¥€ à¤…à¤¨à¥à¤µà¤¾à¤¦",
        "te": "à°¤à±†à°²à±à°—à± à°…à°¨à±à°µà°¾à°¦à°‚", 
        "hi-en": "Hinglish Mix"
    },
    "cultural_notes": "...",
    "confidence": 0.9
}""",

        "cta_optimizer": """You are a conversion optimization expert.
Suggest CTA copy based on campaign objective.
Consider: urgency, clarity, action orientation.

Objectives: buy, learn, subscribe, explore, save

Output JSON:
{
    "ctas": [
        {"text": "Shop Now", "objective": "buy", "urgency": "high"},
        {"text": "Explore Deals", "objective": "explore", "urgency": "medium"}
    ],
    "recommended": 0,
    "reason": "Clear action, creates urgency"
}"""
    }
    
    # Indian festival color palettes
    FESTIVAL_PALETTES = {
        "diwali": {
            "primary": "#FF6B00",  # Deep orange
            "secondary": "#FFD700",  # Gold
            "accent": "#8B0000",  # Dark red
            "background": "#1A0A00"  # Dark brown
        },
        "holi": {
            "primary": "#FF1493",  # Pink
            "secondary": "#00CED1",  # Cyan
            "accent": "#FFD700",  # Gold
            "background": "#4B0082"  # Indigo
        },
        "independence_day": {
            "primary": "#FF9933",  # Saffron
            "secondary": "#138808",  # Green
            "accent": "#000080",  # Navy
            "background": "#FFFFFF"  # White
        },
        "christmas": {
            "primary": "#C41E3A",  # Red
            "secondary": "#228B22",  # Green
            "accent": "#FFD700",  # Gold
            "background": "#FFFAFA"  # Snow white
        },
        "eid": {
            "primary": "#006400",  # Dark green
            "secondary": "#FFD700",  # Gold
            "accent": "#FFFFFF",  # White
            "background": "#1A3A1A"  # Dark green bg
        }
    }
    
    # Hinglish common phrases
    HINGLISH_PHRASES = {
        "big sale": "Badi Sale",
        "mega offer": "Mega Offer",
        "hurry up": "Jaldi Karo",
        "buy now": "Abhi Kharido",
        "shop now": "Abhi Shop Karo",
        "limited time": "Limited Time Only",
        "don't miss": "Miss Mat Karo",
        "super deal": "Super Deal",
        "best price": "Best Price Ever",
        "free delivery": "Free Delivery"
    }
    
    def __init__(self):
        """Initialize the unified agent"""
        self.gemini = None
        self._initialized = False
        
        # Version history per document
        self.document_versions: Dict[str, List[DocumentVersion]] = {}
        self.current_version_index: Dict[str, int] = {}
        
        # Suggestion cache
        self.suggestion_cache: Dict[str, Suggestion] = {}
        
        # Telemetry
        self.telemetry = {
            "total_suggestions": 0,
            "accepted_suggestions": 0,
            "rejected_suggestions": 0,
            "suggestions_by_type": {}
        }
    
    async def initialize(self) -> bool:
        """Initialize Gemini service"""
        if self._initialized:
            return True
        
        try:
            self.gemini = get_gemini_service()
            await self.gemini.initialize()
            self._initialized = True
            logger.info("âœ“ Unified AI Agent initialized with Gemini")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            return False
    
    # ==================== DOCUMENT MODEL OPERATIONS ====================
    
    def create_document(self, elements: List[Dict], meta: Dict = None) -> DocumentModel:
        """Create a document model from canvas elements"""
        blocks = []
        for el in elements:
            block = Block(
                id=el.get("id", str(uuid.uuid4())),
                type=el.get("type", "text"),
                text=el.get("text") or el.get("content"),
                style={
                    "font": el.get("fontFamily", "Inter"),
                    "size": el.get("fontSize", 24),
                    "color": el.get("color", "#ffffff"),
                    "weight": el.get("fontWeight", "normal"),
                    "align": el.get("textAlign", "left"),
                    "backgroundColor": el.get("backgroundColor")
                },
                position={
                    "x": el.get("x", 0),
                    "y": el.get("y", 0)
                },
                size={
                    "width": el.get("width", 100),
                    "height": el.get("height", 50)
                }
            )
            blocks.append(block)
        
        return DocumentModel(
            id=str(uuid.uuid4()),
            blocks=blocks,
            meta=meta or {},
            layout="custom"
        )
    
    def save_version(self, doc: DocumentModel, patch: Patch = None, description: str = ""):
        """Save a document version for undo/redo"""
        doc_id = doc.id
        
        if doc_id not in self.document_versions:
            self.document_versions[doc_id] = []
            self.current_version_index[doc_id] = -1
        
        # Remove any versions after current (for new branch)
        current_idx = self.current_version_index[doc_id]
        self.document_versions[doc_id] = self.document_versions[doc_id][:current_idx + 1]
        
        # Create new version
        version = DocumentVersion(
            version_id=str(uuid.uuid4()),
            document=DocumentModel.from_dict(doc.to_dict()),  # Deep copy
            patch_applied=patch,
            timestamp=datetime.now(),
            description=description
        )
        
        self.document_versions[doc_id].append(version)
        self.current_version_index[doc_id] = len(self.document_versions[doc_id]) - 1
        
        # Limit history to 50 versions
        if len(self.document_versions[doc_id]) > 50:
            self.document_versions[doc_id].pop(0)
            self.current_version_index[doc_id] -= 1
        
        return version.version_id
    
    def undo(self, doc_id: str) -> Optional[DocumentModel]:
        """Undo to previous version"""
        if doc_id not in self.document_versions:
            return None
        
        current_idx = self.current_version_index[doc_id]
        if current_idx > 0:
            self.current_version_index[doc_id] = current_idx - 1
            return self.document_versions[doc_id][current_idx - 1].document
        
        return None
    
    def redo(self, doc_id: str) -> Optional[DocumentModel]:
        """Redo to next version"""
        if doc_id not in self.document_versions:
            return None
        
        current_idx = self.current_version_index[doc_id]
        versions = self.document_versions[doc_id]
        
        if current_idx < len(versions) - 1:
            self.current_version_index[doc_id] = current_idx + 1
            return versions[current_idx + 1].document
        
        return None
    
    def get_history(self, doc_id: str) -> List[Dict]:
        """Get version history for a document"""
        if doc_id not in self.document_versions:
            return []
        
        return [
            {
                "version_id": v.version_id,
                "timestamp": v.timestamp.isoformat(),
                "description": v.description,
                "patch_description": v.patch_applied.description if v.patch_applied else None
            }
            for v in self.document_versions[doc_id]
        ]
    
    # ==================== PATCH OPERATIONS ====================
    
    def apply_patch(self, doc: DocumentModel, patch: Patch) -> DocumentModel:
        """Apply a patch to a document"""
        # Save current state for undo
        self.save_version(doc, patch, patch.description)
        
        for op in patch.operations:
            if op.operation == PatchOperation.REPLACE_TEXT:
                for block in doc.blocks:
                    if block.id == op.block_id:
                        block.text = op.data.get("new_text", block.text)
                        break
            
            elif op.operation == PatchOperation.UPDATE_STYLE:
                for block in doc.blocks:
                    if block.id == op.block_id:
                        block.style.update(op.data)
                        break
            
            elif op.operation == PatchOperation.MOVE_BLOCK:
                for block in doc.blocks:
                    if block.id == op.block_id:
                        block.position.update(op.data)
                        break
            
            elif op.operation == PatchOperation.ADD_BLOCK:
                new_block = Block(
                    id=op.data.get("id", str(uuid.uuid4())),
                    type=op.data.get("type", "text"),
                    text=op.data.get("text"),
                    style=op.data.get("style", {}),
                    position=op.data.get("position", {}),
                    size=op.data.get("size", {})
                )
                doc.blocks.append(new_block)
            
            elif op.operation == PatchOperation.DELETE_BLOCK:
                doc.blocks = [b for b in doc.blocks if b.id != op.block_id]
            
            elif op.operation == PatchOperation.CHANGE_LAYOUT:
                doc.layout = op.data.get("layout", doc.layout)
        
        return doc
    
    def create_patch(
        self,
        operations: List[Tuple[PatchOperation, str, Dict, str]],
        description: str = "",
        confidence: float = 1.0
    ) -> Patch:
        """Create a patch from operations"""
        patch_ops = [
            PatchOp(operation=op, block_id=bid, data=data, reason=reason)
            for op, bid, data, reason in operations
        ]
        
        return Patch(
            id=str(uuid.uuid4()),
            operations=patch_ops,
            timestamp=datetime.now(),
            description=description,
            confidence=confidence
        )
    
    # ==================== AI SUGGESTION METHODS ====================
    
    async def get_suggestions(
        self,
        doc: DocumentModel,
        intent: str,
        locale: Language = Language.ENGLISH,
        context: Dict = None
    ) -> Suggestion:
        """Get AI suggestions based on intent"""
        await self.initialize()
        
        intent_enum = EditIntent(intent) if isinstance(intent, str) else intent
        
        # Route to appropriate handler
        if intent_enum == EditIntent.CREATIVE_REWRITE:
            return await self._suggest_creative_rewrite(doc, locale, context)
        elif intent_enum == EditIntent.LAYOUT_SUGGESTION:
            return await self._suggest_layout(doc, context)
        elif intent_enum == EditIntent.STYLE_SUGGESTION:
            return await self._suggest_style(doc, context)
        elif intent_enum == EditIntent.CTA_OPTIMIZATION:
            return await self._suggest_cta(doc, context)
        elif intent_enum == EditIntent.LOCALIZATION:
            return await self._suggest_localization(doc, locale, context)
        elif intent_enum == EditIntent.AB_GENERATION:
            return await self._generate_ab_variants(doc, context)
        else:
            return await self._suggest_text_edit(doc, intent_enum, locale, context)
    
    async def _suggest_creative_rewrite(
        self,
        doc: DocumentModel,
        locale: Language,
        context: Dict = None
    ) -> Suggestion:
        """Generate 3 variant headlines with different personas"""
        context = context or {}
        
        # Find headline block
        headline_block = None
        for block in doc.blocks:
            if block.type == "text" and ("headline" in block.id.lower() or block.style.get("size", 0) > 30):
                headline_block = block
                break
        
        if not headline_block:
            headline_block = doc.blocks[0] if doc.blocks else None
        
        current_text = headline_block.text if headline_block else "Your Headline"
        occasion = context.get("occasion") or doc.meta.get("occasion", "")
        retailer = context.get("retailer") or doc.meta.get("retailer", "general")
        
        prompt = f"""Current headline: "{current_text}"
Retailer: {retailer}
Occasion: {occasion or "General sale"}
Target locale: {locale.value}

Generate 3 headline variants with different tones:
1. Urgent - Creates urgency and FOMO
2. Value-focused - Highlights savings and value (use â‚¹ for prices)
3. Premium - Sophisticated and aspirational

Requirements:
- Max 10 words each
- Use â‚¹ for currency if mentioning price
- For Hindi/Telugu, provide both original script and transliteration"""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["creative_editor"],
            json_mode=True,
            temperature=0.8
        )
        
        try:
            data = json.loads(response.response)
            variants = data.get("variants", [])
            
            # If variants are missing, create default ones
            if not variants:
                variants = [
                    {"text": f"ðŸ”¥ Flash Sale - {current_text}!", "tone": "urgent", "lang": "en"},
                    {"text": f"Save Big on {current_text}", "tone": "value", "lang": "en"},
                    {"text": f"Premium {current_text} Collection", "tone": "premium", "lang": "en"}
                ]
            
            # Create patch for recommended variant
            recommended_idx = data.get("recommended_index", 0)
            patch_ops = []
            
            if headline_block and recommended_idx < len(variants):
                patch_ops.append((
                    PatchOperation.REPLACE_TEXT,
                    headline_block.id,
                    {"new_text": variants[recommended_idx].get("text", current_text)},
                    data.get("reason", "AI recommended variant")
                ))
            
            patch = self.create_patch(
                operations=patch_ops,
                description=f"Creative rewrite: {variants[recommended_idx].get('tone', 'updated')} tone",
                confidence=data.get("confidence", 0.85)
            ) if patch_ops else None
            
            suggestion = Suggestion(
                id=str(uuid.uuid4()),
                intent=EditIntent.CREATIVE_REWRITE,
                variants=variants,
                recommended_index=recommended_idx,
                reason=data.get("reason", "AI-generated variants for better engagement"),
                patch=patch,
                confidence=data.get("confidence", 0.85),
                locale=locale
            )
            
            self._track_suggestion(EditIntent.CREATIVE_REWRITE)
            return suggestion
            
        except json.JSONDecodeError:
            # Fallback response
            return self._create_fallback_suggestion(EditIntent.CREATIVE_REWRITE, locale)
    
    async def _suggest_layout(self, doc: DocumentModel, context: Dict = None) -> Suggestion:
        """Suggest layout alternatives"""
        context = context or {}
        
        blocks_info = [
            {"id": b.id, "type": b.type, "current_position": b.position}
            for b in doc.blocks
        ]
        
        prompt = f"""Current layout elements: {json.dumps(blocks_info)}
Canvas size: {doc.dimensions}
Platform: {context.get('platform', 'general')}

Suggest 3 layout alternatives:
1. Product-left, text-right
2. Text-centered, product-bottom
3. Diagonal/dynamic arrangement

Provide exact positions as percentages (0-100) for each element."""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["layout_suggester"],
            json_mode=True,
            temperature=0.7
        )
        
        try:
            data = json.loads(response.response)
            layouts = data.get("layouts", [])
            
            if not layouts:
                layouts = [
                    {
                        "name": "text-left-product-right",
                        "description": "Classic layout with text on left",
                        "elements": {b.id: {"x": 5, "y": 20} for b in doc.blocks}
                    },
                    {
                        "name": "center-aligned",
                        "description": "Centered layout for impact",
                        "elements": {b.id: {"x": 50, "y": 50} for b in doc.blocks}
                    },
                    {
                        "name": "product-focus",
                        "description": "Product dominant layout",
                        "elements": {b.id: {"x": 60, "y": 30} for b in doc.blocks}
                    }
                ]
            
            # Create patch for recommended layout
            patch_ops = []
            recommended = layouts[0] if layouts else {}
            
            for block in doc.blocks:
                if block.id in recommended.get("elements", {}):
                    new_pos = recommended["elements"][block.id]
                    patch_ops.append((
                        PatchOperation.MOVE_BLOCK,
                        block.id,
                        {"x": new_pos.get("x", 0), "y": new_pos.get("y", 0)},
                        f"Move to {recommended.get('name', 'new')} layout position"
                    ))
            
            patch = self.create_patch(
                operations=patch_ops,
                description=f"Layout change: {recommended.get('name', 'optimized')}",
                confidence=0.8
            ) if patch_ops else None
            
            return Suggestion(
                id=str(uuid.uuid4()),
                intent=EditIntent.LAYOUT_SUGGESTION,
                variants=layouts,
                recommended_index=0,
                reason=data.get("reason", "Improved visual hierarchy"),
                patch=patch,
                confidence=0.8
            )
            
        except json.JSONDecodeError:
            return self._create_fallback_suggestion(EditIntent.LAYOUT_SUGGESTION)
    
    async def _suggest_style(self, doc: DocumentModel, context: Dict = None) -> Suggestion:
        """Suggest style changes (colors, fonts)"""
        context = context or {}
        festival = context.get("festival") or doc.meta.get("occasion")
        brand_color = context.get("brand_color")
        
        # Get festival palette if applicable
        preset_palette = self.FESTIVAL_PALETTES.get(festival.lower() if festival else "", None)
        
        prompt = f"""Current styles: {json.dumps([{b.id: b.style} for b in doc.blocks])}
Festival/Occasion: {festival or "General"}
Brand color: {brand_color or "Not specified"}

Suggest color palette and typography that:
1. Has WCAG AA accessibility (contrast ratio > 4.5:1)
2. Matches the occasion mood
3. Works well together

Include: primary, secondary, accent, background colors
Font recommendations with sizes"""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["style_suggester"],
            json_mode=True,
            temperature=0.6
        )
        
        try:
            data = json.loads(response.response)
            
            # Use preset or generated palette
            palette = preset_palette or data.get("color_palette", {
                "primary": "#6366f1",
                "secondary": "#1a1a2e",
                "accent": "#f59e0b",
                "background": "#0f0f0f"
            })
            
            fonts = data.get("fonts", {
                "headline": {"family": "Inter", "weight": "bold", "size": 48},
                "body": {"family": "Inter", "weight": "normal", "size": 16}
            })
            
            variants = [
                {
                    "name": "Recommended Style",
                    "palette": palette,
                    "fonts": fonts,
                    "accessibility_score": data.get("accessibility_score", 0.9)
                },
                {
                    "name": "High Contrast",
                    "palette": {**palette, "primary": "#ffffff", "background": "#000000"},
                    "fonts": fonts,
                    "accessibility_score": 1.0
                },
                {
                    "name": "Soft & Elegant",
                    "palette": {**palette, "primary": "#8b5cf6", "background": "#1e1b4b"},
                    "fonts": {**fonts, "headline": {**fonts.get("headline", {}), "family": "Playfair Display"}},
                    "accessibility_score": 0.85
                }
            ]
            
            # Create style update patch
            patch_ops = []
            for block in doc.blocks:
                if block.type == "text" and "headline" in block.id.lower():
                    patch_ops.append((
                        PatchOperation.UPDATE_STYLE,
                        block.id,
                        {
                            "color": palette.get("primary", "#ffffff"),
                            "font": fonts.get("headline", {}).get("family", "Inter"),
                            "size": fonts.get("headline", {}).get("size", 48)
                        },
                        "Apply recommended headline style"
                    ))
                elif block.type == "button":
                    patch_ops.append((
                        PatchOperation.UPDATE_STYLE,
                        block.id,
                        {
                            "backgroundColor": palette.get("accent", "#f59e0b"),
                            "color": "#ffffff"
                        },
                        "Apply CTA button style"
                    ))
            
            patch = self.create_patch(
                operations=patch_ops,
                description="Style update with recommended palette",
                confidence=0.85
            ) if patch_ops else None
            
            return Suggestion(
                id=str(uuid.uuid4()),
                intent=EditIntent.STYLE_SUGGESTION,
                variants=variants,
                recommended_index=0,
                reason=data.get("reason", f"Optimized for {festival or 'brand'} with high accessibility"),
                patch=patch,
                confidence=0.85
            )
            
        except json.JSONDecodeError:
            return self._create_fallback_suggestion(EditIntent.STYLE_SUGGESTION)
    
    async def _suggest_cta(self, doc: DocumentModel, context: Dict = None) -> Suggestion:
        """Optimize CTA based on objective"""
        context = context or {}
        objective = context.get("objective", "buy")
        
        # Find CTA block
        cta_block = None
        for block in doc.blocks:
            if block.type == "button" or "cta" in block.id.lower():
                cta_block = block
                break
        
        current_cta = cta_block.text if cta_block else "Shop Now"
        
        prompt = f"""Current CTA: "{current_cta}"
Objective: {objective}
Product: {context.get('product', 'General')}

Generate CTAs for different objectives:
- buy: Direct purchase action
- learn: Information seeking
- subscribe: Newsletter/membership
- save: Deal-focused

Provide urgency level (high/medium/low) for each."""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["cta_optimizer"],
            json_mode=True,
            temperature=0.7
        )
        
        try:
            data = json.loads(response.response)
            ctas = data.get("ctas", [
                {"text": "Shop Now", "objective": "buy", "urgency": "high"},
                {"text": "Explore Deals", "objective": "explore", "urgency": "medium"},
                {"text": "Learn More", "objective": "learn", "urgency": "low"},
                {"text": "Subscribe & Save", "objective": "subscribe", "urgency": "medium"}
            ])
            
            # Find CTA matching objective
            recommended_idx = 0
            for i, cta in enumerate(ctas):
                if cta.get("objective") == objective:
                    recommended_idx = i
                    break
            
            patch_ops = []
            if cta_block and recommended_idx < len(ctas):
                patch_ops.append((
                    PatchOperation.REPLACE_TEXT,
                    cta_block.id,
                    {"new_text": ctas[recommended_idx].get("text", current_cta)},
                    f"Optimized for {objective} objective"
                ))
            
            patch = self.create_patch(
                operations=patch_ops,
                description=f"CTA optimized for {objective}",
                confidence=0.9
            ) if patch_ops else None
            
            return Suggestion(
                id=str(uuid.uuid4()),
                intent=EditIntent.CTA_OPTIMIZATION,
                variants=ctas,
                recommended_index=recommended_idx,
                reason=data.get("reason", f"Optimized for {objective} conversion"),
                patch=patch,
                confidence=0.9
            )
            
        except json.JSONDecodeError:
            return self._create_fallback_suggestion(EditIntent.CTA_OPTIMIZATION)
    
    async def _suggest_localization(
        self,
        doc: DocumentModel,
        target_locale: Language,
        context: Dict = None
    ) -> Suggestion:
        """Localize content to Hindi/Telugu/Hinglish"""
        # Collect all text content
        texts = []
        for block in doc.blocks:
            if block.text:
                texts.append({"id": block.id, "text": block.text})
        
        prompt = f"""Translate/localize for {target_locale.value}:
{json.dumps(texts, indent=2)}

For Hindi (hi): Use Devanagari script
For Telugu (te): Use Telugu script  
For Hinglish (hi-en): Mix Hindi words in Roman with English

Requirements:
- Keep brand names in English
- Use â‚¹ for currency
- Adapt idioms culturally
- Provide transliteration for non-English scripts"""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["localizer"],
            json_mode=True,
            temperature=0.5
        )
        
        try:
            data = json.loads(response.response)
            translations = data.get("translations", {})
            
            variants = []
            for lang in [Language.ENGLISH, Language.HINDI, Language.TELUGU, Language.HINGLISH]:
                lang_translations = {}
                for text_item in texts:
                    text_id = text_item["id"]
                    original = text_item["text"]
                    
                    if lang == Language.ENGLISH:
                        lang_translations[text_id] = original
                    elif lang == Language.HINGLISH:
                        # Use Hinglish phrases if available
                        hinglish = original
                        for eng, hin in self.HINGLISH_PHRASES.items():
                            if eng.lower() in original.lower():
                                hinglish = original.lower().replace(eng.lower(), hin)
                        lang_translations[text_id] = translations.get(lang.value, {}).get(text_id, hinglish.title())
                    else:
                        lang_translations[text_id] = translations.get(lang.value, {}).get(text_id, original)
                
                variants.append({
                    "language": lang.value,
                    "translations": lang_translations,
                    "transliterations": data.get("transliterations", {}).get(lang.value, {})
                })
            
            # Find variant for target locale
            recommended_idx = 0
            for i, v in enumerate(variants):
                if v["language"] == target_locale.value:
                    recommended_idx = i
                    break
            
            # Create localization patch
            patch_ops = []
            recommended_variant = variants[recommended_idx]
            for block in doc.blocks:
                if block.id in recommended_variant["translations"]:
                    new_text = recommended_variant["translations"][block.id]
                    if new_text != block.text:
                        patch_ops.append((
                            PatchOperation.REPLACE_TEXT,
                            block.id,
                            {"new_text": new_text},
                            f"Localized to {target_locale.value}"
                        ))
            
            patch = self.create_patch(
                operations=patch_ops,
                description=f"Localization to {target_locale.value}",
                confidence=data.get("confidence", 0.85)
            ) if patch_ops else None
            
            return Suggestion(
                id=str(uuid.uuid4()),
                intent=EditIntent.LOCALIZATION,
                variants=variants,
                recommended_index=recommended_idx,
                reason=data.get("cultural_notes", f"Localized for {target_locale.value} audience"),
                patch=patch,
                confidence=data.get("confidence", 0.85),
                locale=target_locale
            )
            
        except json.JSONDecodeError:
            return self._create_fallback_suggestion(EditIntent.LOCALIZATION, target_locale)
    
    async def _generate_ab_variants(self, doc: DocumentModel, context: Dict = None) -> Suggestion:
        """Generate A/B test variants"""
        prompt = f"""Create A/B test variants for this creative:
{json.dumps(doc.to_dict(), indent=2)}

Generate:
- Variant A: Original with minor optimizations
- Variant B: Significant change (different headline approach, CTA, or layout)

For each variant, explain the hypothesis being tested."""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["creative_editor"],
            json_mode=True,
            temperature=0.8
        )
        
        try:
            data = json.loads(response.response)
            variants = data.get("variants", [])
            
            if len(variants) < 2:
                # Create default A/B variants
                variants = [
                    {
                        "name": "Variant A (Control)",
                        "changes": [],
                        "hypothesis": "Baseline performance"
                    },
                    {
                        "name": "Variant B (Urgency)",
                        "changes": [{"type": "headline", "text": "ðŸ”¥ Limited Time Offer!"}],
                        "hypothesis": "Urgency increases CTR"
                    }
                ]
            
            return Suggestion(
                id=str(uuid.uuid4()),
                intent=EditIntent.AB_GENERATION,
                variants=variants,
                recommended_index=0,
                reason="A/B variants ready for testing",
                patch=None,  # A/B generation doesn't auto-apply
                confidence=0.9
            )
            
        except json.JSONDecodeError:
            return self._create_fallback_suggestion(EditIntent.AB_GENERATION)
    
    async def _suggest_text_edit(
        self,
        doc: DocumentModel,
        intent: EditIntent,
        locale: Language,
        context: Dict = None
    ) -> Suggestion:
        """Handle generic text edit intents"""
        context = context or {}
        
        prompt = f"""Edit request: {context.get('instruction', 'improve text')}
Current document: {json.dumps(doc.to_dict(), indent=2)}
Locale: {locale.value}

Apply the edit and return the updated text."""

        response = await self.gemini.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["creative_editor"],
            json_mode=True,
            temperature=0.7
        )
        
        try:
            data = json.loads(response.response)
            return Suggestion(
                id=str(uuid.uuid4()),
                intent=intent,
                variants=data.get("variants", []),
                recommended_index=0,
                reason=data.get("reason", "Applied edit"),
                patch=None,
                confidence=0.8,
                locale=locale
            )
        except:
            return self._create_fallback_suggestion(intent, locale)
    
    def _create_fallback_suggestion(
        self,
        intent: EditIntent,
        locale: Language = Language.ENGLISH
    ) -> Suggestion:
        """Create fallback suggestion when AI fails"""
        return Suggestion(
            id=str(uuid.uuid4()),
            intent=intent,
            variants=[{"text": "AI suggestion unavailable", "fallback": True}],
            recommended_index=0,
            reason="Fallback suggestion - AI service temporarily unavailable",
            patch=None,
            confidence=0.5,
            locale=locale
        )
    
    def _track_suggestion(self, intent: EditIntent):
        """Track suggestion telemetry"""
        self.telemetry["total_suggestions"] += 1
        intent_key = intent.value
        if intent_key not in self.telemetry["suggestions_by_type"]:
            self.telemetry["suggestions_by_type"][intent_key] = 0
        self.telemetry["suggestions_by_type"][intent_key] += 1
    
    # ==================== MAIN INTERACTION METHOD ====================
    
    async def process_command(
        self,
        command: str,
        doc: DocumentModel,
        locale: Language = Language.ENGLISH,
        auto_apply: bool = False
    ) -> Dict[str, Any]:
        """
        Process natural language command and return suggestion.
        
        Examples:
        - "Make headline more urgent and local"
        - "Try product-left text-right layout"
        - "Suggest colors for Diwali"
        - "Generate A/B variants"
        - "Translate to Hindi"
        """
        await self.initialize()
        
        # Parse intent from command
        intent, context = await self._parse_intent(command)
        
        # Get suggestions
        suggestion = await self.get_suggestions(doc, intent, locale, context)
        
        # Auto-apply if requested and patch available
        if auto_apply and suggestion.patch:
            doc = self.apply_patch(doc, suggestion.patch)
        
        return {
            "success": True,
            "suggestion": {
                "id": suggestion.id,
                "intent": suggestion.intent.value,
                "variants": suggestion.variants,
                "recommended_index": suggestion.recommended_index,
                "reason": suggestion.reason,
                "confidence": suggestion.confidence
            },
            "patch": suggestion.patch.to_dict() if suggestion.patch else None,
            "auto_applied": auto_apply and suggestion.patch is not None,
            "updated_document": doc.to_dict() if auto_apply else None
        }
    
    async def _parse_intent(self, command: str) -> Tuple[EditIntent, Dict]:
        """Parse intent from natural language command"""
        command_lower = command.lower()
        context = {}
        
        # Urgency/tone related
        if any(word in command_lower for word in ["urgent", "urgency", "hurry", "fomo", "limited"]):
            context["tone"] = "urgent"
            return EditIntent.CREATIVE_REWRITE, context
        
        # Localization
        if any(word in command_lower for word in ["translate", "hindi", "telugu", "hinglish", "local", "localize"]):
            if "hindi" in command_lower:
                context["target_locale"] = Language.HINDI
            elif "telugu" in command_lower:
                context["target_locale"] = Language.TELUGU
            elif "hinglish" in command_lower:
                context["target_locale"] = Language.HINGLISH
            return EditIntent.LOCALIZATION, context
        
        # Layout
        if any(word in command_lower for word in ["layout", "position", "move", "arrange", "left", "right", "center"]):
            return EditIntent.LAYOUT_SUGGESTION, context
        
        # Style/Color
        if any(word in command_lower for word in ["color", "palette", "style", "font", "diwali", "holi", "festive"]):
            # Check for festivals
            for festival in self.FESTIVAL_PALETTES.keys():
                if festival in command_lower:
                    context["festival"] = festival
            return EditIntent.STYLE_SUGGESTION, context
        
        # CTA
        if any(word in command_lower for word in ["cta", "button", "call to action", "shop now", "buy"]):
            return EditIntent.CTA_OPTIMIZATION, context
        
        # A/B testing
        if any(word in command_lower for word in ["a/b", "variant", "test", "experiment"]):
            return EditIntent.AB_GENERATION, context
        
        # Default to creative rewrite
        context["instruction"] = command
        return EditIntent.CREATIVE_REWRITE, context
    
    def accept_suggestion(self, suggestion_id: str):
        """Track acceptance of a suggestion"""
        self.telemetry["accepted_suggestions"] += 1
        if suggestion_id in self.suggestion_cache:
            del self.suggestion_cache[suggestion_id]
    
    def reject_suggestion(self, suggestion_id: str):
        """Track rejection of a suggestion"""
        self.telemetry["rejected_suggestions"] += 1
        if suggestion_id in self.suggestion_cache:
            del self.suggestion_cache[suggestion_id]
    
    def get_telemetry(self) -> Dict:
        """Get telemetry data"""
        acceptance_rate = 0
        if self.telemetry["total_suggestions"] > 0:
            acceptance_rate = self.telemetry["accepted_suggestions"] / self.telemetry["total_suggestions"]
        
        return {
            **self.telemetry,
            "acceptance_rate": acceptance_rate
        }


# Singleton instance
_unified_agent: Optional[UnifiedAIAgent] = None


def get_unified_agent() -> UnifiedAIAgent:
    """Get or create the unified agent singleton"""
    global _unified_agent
    if _unified_agent is None:
        _unified_agent = UnifiedAIAgent()
    return _unified_agent

