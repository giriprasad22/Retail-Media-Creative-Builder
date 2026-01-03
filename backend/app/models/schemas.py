"""Pydantic schemas for API requests and responses."""
from pydantic import BaseModel, Field, computed_field
from typing import List, Optional, Dict, Any
from enum import Enum


class Retailer(str, Enum):
    """Supported retailers."""
    AMAZON = "amazon"
    FLIPKART = "flipkart"
    DMART = "dmart"


class ExportFormat(str, Enum):
    """Supported export formats."""
    PNG = "png"
    JPEG = "jpeg"
    PDF = "pdf"


class ImageSize(BaseModel):
    """Image size specification."""
    width: int
    height: int
    name: str = ""


class BoundingBox(BaseModel):
    """Bounding box for element positioning."""
    x: int
    y: int
    width: int
    height: int


class ElementPosition(BaseModel):
    """Position and properties of a creative element."""
    element_type: str  # product, logo, headline, offer_text, background
    bbox: BoundingBox
    properties: Dict[str, Any] = {}


class GuidelineRule(BaseModel):
    """A single guideline rule."""
    rule_id: str
    name: str
    description: str
    severity: str = "error"  # error, warning, info
    category: str  # logo, text, layout, color


class GuidelineCheckResult(BaseModel):
    """Result of checking a single guideline."""
    rule: GuidelineRule
    passed: bool
    message: str
    details: Dict[str, Any] = {}


class AutoFixSuggestion(BaseModel):
    """Suggested auto-fix for a guideline violation."""
    fix_id: str
    rule_id: str
    description: str
    action: str  # move, resize, recolor, reflow
    parameters: Dict[str, Any] = {}
    preview_available: bool = True


class CreativeElement(BaseModel):
    """An element within a creative."""
    element_id: str
    element_type: str
    position: ElementPosition
    content: Optional[str] = None
    style: Dict[str, Any] = {}


class Creative(BaseModel):
    """A generated creative layout."""
    creative_id: str
    variation_number: int
    width: int
    height: int
    elements: List[CreativeElement] = []
    preview_path: str = ""
    thumbnail_path: str = ""
    guideline_checks: List[GuidelineCheckResult] = []
    auto_fixes: List[AutoFixSuggestion] = []
    score: float = 0.0  # Aesthetic/compliance score
    
    @computed_field
    @property
    def is_compliant(self) -> bool:
        """Check if creative passes all error-level guidelines."""
        return all(
            check.passed or check.rule.severity != "error" 
            for check in self.guideline_checks
        )


class CreativeRequest(BaseModel):
    """Request to generate creatives."""
    product_image_path: str
    logo_path: str
    retailer: str
    headline: str
    offer_text: str = ""
    brand_colors: List[str] = []
    num_variations: int = Field(default=6, ge=1, le=12)


class CreativeResponse(BaseModel):
    """Response containing generated creatives."""
    request_id: str
    retailer: str
    creatives: List[Creative]
    
    @computed_field
    @property
    def compliant_count(self) -> int:
        """Count of compliant creatives."""
        return sum(1 for c in self.creatives if c.is_compliant)


class ExportRequest(BaseModel):
    """Request to export creatives."""
    creative_ids: List[str]
    sizes: List[ImageSize] = []
    export_format: ExportFormat = Field(default=ExportFormat.PNG, alias="format")
    include_metadata: bool = True
    
    model_config = {"populate_by_name": True}


class ExportResult(BaseModel):
    """Result of export operation."""
    export_id: str
    files: List[str]
    download_url: str
    total_size_bytes: int


# ============== Editor Schemas ==============

class EditAction(str, Enum):
    """Supported editing actions."""
    CHANGE_BACKGROUND = "change_background"
    CHANGE_COLOR = "change_color"
    RESIZE = "resize"
    MOVE = "move"
    CHANGE_FONT = "change_font"
    CHANGE_TEXT = "change_text"
    ADD_EFFECT = "add_effect"
    REMOVE = "remove"
    ROTATE = "rotate"
    FLIP = "flip"
    CHANGE_OPACITY = "change_opacity"
    ALIGN = "align"


class TargetRegion(str, Enum):
    """Target regions that can be edited."""
    BACKGROUND = "background"
    PRODUCT = "product"
    LOGO = "logo"
    HEADLINE = "headline"
    OFFER_TEXT = "offer_text"
    ALL_TEXT = "all_text"
    ENTIRE_CANVAS = "entire_canvas"
    SELECTED = "selected"


class EditPromptRequest(BaseModel):
    """Request to edit creative via natural language prompt."""
    creative_id: str
    prompt: str
    selected_region: Optional[str] = None


class EditDirectRequest(BaseModel):
    """Request to directly edit an element."""
    creative_id: str
    element_name: str
    updates: Dict[str, Any]


class StartEditorSessionRequest(BaseModel):
    """Request to start an editing session."""
    creative_id: str
    creative_path: str
    elements: Dict[str, Any]


class ParsedCommandResponse(BaseModel):
    """Parsed command from natural language."""
    action: str
    target: str
    parameters: Dict[str, Any]
    confidence: float


class EditResultResponse(BaseModel):
    """Result of an edit operation."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    preview_path: Optional[str] = None
    parsed_commands: List[ParsedCommandResponse] = []


class EditorElementInfo(BaseModel):
    """Information about an editable element."""
    element_type: str
    bbox: BoundingBox
    content: Optional[str] = None
    color: Optional[str] = None
    font_size: Optional[int] = None
    style: Dict[str, Any] = {}
    visible: bool = True
    opacity: float = 1.0
    rotation: float = 0.0


class EditorStateResponse(BaseModel):
    """Response with current editor state."""
    success: bool
    elements: Dict[str, EditorElementInfo] = {}
    canvas_size: Optional[ImageSize] = None
    background_color: str = "#FFFFFF"
    error: Optional[str] = None


class SupportedCommandsResponse(BaseModel):
    """Response with supported prompt commands."""
    commands: Dict[str, List[str]]
