"""
Layer Auto-Creation Service
Automatically create layers from natural language prompts
"""

import asyncio
import json
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .layer_manager import get_layer_manager, Layer, TextLayer, ImageLayer, ShapeLayer
from .ai.gemini_service import get_gemini_service
try:
    from .ai.advanced_image_generator import get_advanced_generator
    IMAGE_GEN_AVAILABLE = True
except (ImportError, RuntimeError):
    get_advanced_generator = None
    IMAGE_GEN_AVAILABLE = False
from loguru import logger


@dataclass
class LayerIntent:
    """Parsed layer creation intent"""
    layer_type: str  # "text", "image", "shape"
    content: str
    position: Optional[Tuple[int, int]]
    size: Optional[Tuple[int, int]]
    style: Dict[str, any]
    priority: int  # For ordering


class LayerAutoCreator:
    """
    Automatically create layers from natural language commands
    """
    
    def __init__(self):
        """Initialize layer auto-creator"""
        self.layer_manager = get_layer_manager()
        self.gemini = get_gemini_service()
        self.image_gen = get_advanced_generator() if IMAGE_GEN_AVAILABLE else None
        
        if not IMAGE_GEN_AVAILABLE:
            logger.warning("Image generation not available - layer auto-creator will skip image layers")
        
        logger.info("LayerAutoCreator initialized")
    
    async def create_from_prompt(
        self,
        creative_id: str,
        prompt: str,
        product_name: Optional[str] = None,
        platform: str = "general"
    ) -> List[Layer]:
        """
        Create layers from natural language prompt
        
        Examples:
        - "Add headline 'Summer Sale' at the top"
        - "Create product image in center with 50% discount badge"
        - "Add red circle behind text"
        
        Args:
            creative_id: Creative canvas ID
            prompt: Natural language command
            product_name: Product context
            platform: Target platform
            
        Returns:
            List of created layers
        """
        # Parse intent using LLM
        intents = await self._parse_layer_intents(prompt, product_name)
        
        if not intents:
            logger.warning(f"Could not parse layer intent from: {prompt}")
            return []
        
        # Create layers based on intents
        created_layers = []
        
        for intent in intents:
            try:
                if intent.layer_type == "text":
                    layer = await self._create_text_layer_from_intent(
                        creative_id, intent, platform
                    )
                elif intent.layer_type == "image":
                    layer = await self._create_image_layer_from_intent(
                        creative_id, intent, product_name
                    )
                elif intent.layer_type == "shape":
                    layer = await self._create_shape_layer_from_intent(
                        creative_id, intent
                    )
                else:
                    logger.warning(f"Unknown layer type: {intent.layer_type}")
                    continue
                
                if layer:
                    created_layers.append(layer)
                    logger.info(f"Created {intent.layer_type} layer from prompt")
                
            except Exception as e:
                logger.error(f"Failed to create {intent.layer_type} layer: {e}")
        
        return created_layers
    
    async def _parse_layer_intents(
        self,
        prompt: str,
        product_name: Optional[str]
    ) -> List[LayerIntent]:
        """Parse natural language into structured layer intents"""
        
        system_prompt = """You are an expert at parsing natural language commands into layer creation instructions.
Extract all layer creation intents from the user's command.

For each layer, identify:
1. Type: text, image, or shape
2. Content: What to show/generate
3. Position: Where to place it (top, bottom, center, left, right, or coordinates)
4. Size: Dimensions if specified
5. Style: Colors, fonts, effects
6. Priority: Order of creation (1 = first)

Return JSON array of layer intents."""
        
        user_prompt = f"""
Command: "{prompt}"
{f'Product Context: {product_name}' if product_name else ''}

Parse this into layer creation intents. Examples:

Input: "Add headline 'Summer Sale' at the top in red"
Output: [{{"layer_type": "text", "content": "Summer Sale", "position": "top", "style": {{"color": "#FF0000"}}, "priority": 1}}]

Input: "Create product image in center with discount badge"
Output: [
  {{"layer_type": "image", "content": "product", "position": "center", "priority": 1}},
  {{"layer_type": "shape", "content": "discount badge", "position": "top-right", "style": {{"color": "#FF0000"}}, "priority": 2}},
  {{"layer_type": "text", "content": "50% OFF", "position": "top-right", "priority": 3}}
]

Now parse: "{prompt}"
"""
        
        try:
            response = await self.gemini.generate(
                prompt=f"{system_prompt}\n\n{user_prompt}",
                temperature=0.3,
                json_mode=True
            )
            
            if not response.success:
                logger.error(f"Gemini generation failed: {response.error}")
                return self._simple_intent_parsing(prompt)
            
            intents_data = json.loads(response.response)
            
            # Convert to LayerIntent objects
            intents = []
            for data in intents_data:
                intent = LayerIntent(
                    layer_type=data.get("layer_type", "text"),
                    content=data.get("content", ""),
                    position=self._parse_position(data.get("position")),
                    size=self._parse_size(data.get("size")),
                    style=data.get("style", {}),
                    priority=data.get("priority", 1)
                )
                intents.append(intent)
            
            # Sort by priority
            intents.sort(key=lambda x: x.priority)
            
            return intents
            
        except Exception as e:
            logger.error(f"Failed to parse layer intents: {e}")
            # Fallback: Try simple pattern matching
            return self._simple_intent_parsing(prompt)
    
    async def _create_text_layer_from_intent(
        self,
        creative_id: str,
        intent: LayerIntent,
        platform: str
    ) -> Optional[Layer]:
        """Create text layer from intent"""
        
        # Get creative dimensions
        creative = self.layer_manager.get_creative(creative_id)
        if not creative:
            return None
        
        # Determine position
        if intent.position:
            x, y = intent.position
        else:
            x, y = creative.width // 2, creative.height // 4
        
        # Get text content
        text_content = intent.content
        
        # If content is generic, generate it
        if not text_content or text_content in ["headline", "title", "tagline"]:
            generated = await self.text_gen.generate_headline(
                product_name=creative.name,
                platform=platform,
                language="english"
            )
            if generated:
                text_content = generated.text
        
        # Get style properties
        style = intent.style
        color = style.get("color", "#000000")
        font_size = style.get("font_size", 36)
        
        # Get font suggestion
        if "font_family" not in style:
            fonts = await self.font_engine.suggest_pairings(
                product_category="general",
                require_devanagari=False,
                num_suggestions=1
            )
            if fonts:
                style["font_family"] = fonts[0].headline_font.family
        
        # Create layer
        layer = self.layer_manager.create_text_layer(
            creative_id=creative_id,
            text=text_content,
            x=x,
            y=y,
            font_size=font_size,
            color=color,
            name=intent.content or "Text Layer"
        )
        
        return layer
    
    async def _create_image_layer_from_intent(
        self,
        creative_id: str,
        intent: LayerIntent,
        product_name: Optional[str]
    ) -> Optional[Layer]:
        """Create image layer from intent"""
        
        creative = self.layer_manager.get_creative(creative_id)
        if not creative:
            return None
        
        # Determine position
        if intent.position:
            x, y = intent.position
        else:
            x, y = creative.width // 4, creative.height // 4
        
        # Determine size
        if intent.size:
            width, height = intent.size
        else:
            width, height = creative.width // 2, creative.height // 2
        
        # Generate or load image
        image_source = ""
        
        if intent.content in ["product", "product image"]:
            # Generate product image
            if product_name:
                result = await self.image_gen.generate_product_image(
                    product_name=product_name,
                    product_category="general",
                    aspect_ratio="square"
                )
                if result:
                    image_source = result.base64 or result.file_path
        else:
            # Generate from description
            result = await self.image_gen.generate_from_prompt(
                prompt=intent.content,
                width=width,
                height=height
            )
            if result:
                image_source = result.base64 or result.file_path
        
        if not image_source:
            logger.warning("Failed to generate image, using placeholder")
            image_source = "placeholder"
        
        # Create layer
        layer = self.layer_manager.create_image_layer(
            creative_id=creative_id,
            image_source=image_source,
            x=x,
            y=y,
            width=width,
            height=height,
            name=intent.content or "Image Layer"
        )
        
        return layer
    
    async def _create_shape_layer_from_intent(
        self,
        creative_id: str,
        intent: LayerIntent
    ) -> Optional[Layer]:
        """Create shape layer from intent"""
        
        creative = self.layer_manager.get_creative(creative_id)
        if not creative:
            return None
        
        # Determine position
        if intent.position:
            x, y = intent.position
        else:
            x, y = 0, 0
        
        # Determine size
        if intent.size:
            width, height = intent.size
        else:
            width, height = 100, 100
        
        # Parse shape type
        shape_type = "rectangle"
        if "circle" in intent.content.lower():
            shape_type = "circle"
        elif "oval" in intent.content.lower():
            shape_type = "ellipse"
        
        # Get color
        fill_color = intent.style.get("color", intent.style.get("fill_color", "#CCCCCC"))
        
        # Create layer
        layer = self.layer_manager.create_shape_layer(
            creative_id=creative_id,
            shape_type=shape_type,
            x=x,
            y=y,
            width=width,
            height=height,
            fill_color=fill_color,
            name=intent.content or "Shape Layer"
        )
        
        return layer
    
    def _parse_position(self, position_str: Optional[str]) -> Optional[Tuple[int, int]]:
        """Parse position string to coordinates"""
        if not position_str:
            return None
        
        # Try to extract coordinates
        coords = re.findall(r'\d+', position_str)
        if len(coords) >= 2:
            return (int(coords[0]), int(coords[1]))
        
        # Named positions (will be resolved with creative dimensions)
        position_map = {
            "top": (None, 50),
            "bottom": (None, None),
            "left": (50, None),
            "right": (None, None),
            "center": (None, None),
            "top-left": (50, 50),
            "top-right": (None, 50),
            "bottom-left": (50, None),
            "bottom-right": (None, None)
        }
        
        return position_map.get(position_str.lower())
    
    def _parse_size(self, size_str: Optional[str]) -> Optional[Tuple[int, int]]:
        """Parse size string to dimensions"""
        if not size_str:
            return None
        
        # Try to extract dimensions
        dims = re.findall(r'\d+', size_str)
        if len(dims) >= 2:
            return (int(dims[0]), int(dims[1]))
        
        return None
    
    def _simple_intent_parsing(self, prompt: str) -> List[LayerIntent]:
        """Simple fallback parsing"""
        intents = []
        
        # Detect text layers
        if any(word in prompt.lower() for word in ["text", "headline", "title", "add"]):
            # Extract quoted text
            matches = re.findall(r'["\']([^"\']+)["\']', prompt)
            if matches:
                for match in matches:
                    intents.append(LayerIntent(
                        layer_type="text",
                        content=match,
                        position=None,
                        size=None,
                        style={},
                        priority=1
                    ))
        
        # Detect image layers
        if any(word in prompt.lower() for word in ["image", "photo", "picture", "product"]):
            intents.append(LayerIntent(
                layer_type="image",
                content="product",
                position=None,
                size=None,
                style={},
                priority=2
            ))
        
        return intents
    
    async def create_complete_ad(
        self,
        creative_id: str,
        product_name: str,
        platform: str = "general",
        style: str = "modern"
    ) -> List[Layer]:
        """
        Create complete ad with all layers automatically
        
        Args:
            creative_id: Creative canvas ID
            product_name: Product name
            platform: Target platform
            style: Design style (modern, minimalist, bold, elegant)
            
        Returns:
            List of all created layers
        """
        creative = self.layer_manager.get_creative(creative_id)
        if not creative:
            return []
        
        created_layers = []
        
        try:
            # 1. Background shape
            bg_layer = self.layer_manager.create_shape_layer(
                creative_id=creative_id,
                shape_type="rectangle",
                x=0,
                y=0,
                width=creative.width,
                height=creative.height,
                fill_color="#F5F5F5",
                name="Background"
            )
            if bg_layer:
                created_layers.append(bg_layer)
            
            # 2. Product image
            image_layer = await self._create_image_layer_from_intent(
                creative_id=creative_id,
                intent=LayerIntent(
                    layer_type="image",
                    content="product",
                    position=(creative.width // 2, creative.height // 2),
                    size=(creative.width // 2, creative.height // 2),
                    style={},
                    priority=2
                ),
                product_name=product_name
            )
            if image_layer:
                created_layers.append(image_layer)
            
            # 3. Headline
            headline_layer = await self._create_text_layer_from_intent(
                creative_id=creative_id,
                intent=LayerIntent(
                    layer_type="text",
                    content="headline",
                    position=(creative.width // 2, creative.height // 6),
                    size=None,
                    style={"font_size": 48, "color": "#000000"},
                    priority=3
                ),
                platform=platform
            )
            if headline_layer:
                created_layers.append(headline_layer)
            
            # 4. CTA button
            cta_layer = await self._create_text_layer_from_intent(
                creative_id=creative_id,
                intent=LayerIntent(
                    layer_type="text",
                    content="Shop Now",
                    position=(creative.width // 2, int(creative.height * 0.85)),
                    size=None,
                    style={"font_size": 24, "color": "#FFFFFF"},
                    priority=4
                ),
                platform=platform
            )
            if cta_layer:
                created_layers.append(cta_layer)
            
            logger.info(f"Created complete ad with {len(created_layers)} layers")
            
        except Exception as e:
            logger.error(f"Failed to create complete ad: {e}")
        
        return created_layers


# Global instance
_layer_auto_creator = None

def get_layer_auto_creator() -> LayerAutoCreator:
    """Get global layer auto-creator instance"""
    global _layer_auto_creator
    if _layer_auto_creator is None:
        _layer_auto_creator = LayerAutoCreator()
    return _layer_auto_creator
