"""
Layer Management Service
Manage layers for creative composition (text, image, shape layers)
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime
import uuid

from PIL import Image, ImageDraw, ImageFont
from loguru import logger


class LayerType(str, Enum):
    """Types of layers"""
    IMAGE = "image"
    TEXT = "text"
    SHAPE = "shape"
    GROUP = "group"


class BlendMode(str, Enum):
    """Layer blend modes"""
    NORMAL = "normal"
    MULTIPLY = "multiply"
    SCREEN = "screen"
    OVERLAY = "overlay"
    DARKEN = "darken"
    LIGHTEN = "lighten"


@dataclass
class Layer:
    """Single layer in creative"""
    id: str
    name: str
    type: LayerType
    visible: bool = True
    locked: bool = False
    opacity: float = 1.0  # 0.0-1.0
    blend_mode: BlendMode = BlendMode.NORMAL
    
    # Position and size
    x: int = 0
    y: int = 0
    width: int = 100
    height: int = 100
    rotation: float = 0.0  # degrees
    z_index: int = 0  # Stacking order
    
    # Layer-specific properties
    properties: Dict[str, Any] = field(default_factory=dict)
    
    # Metadata
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class TextLayer(Layer):
    """Text layer with typography"""
    def __post_init__(self):
        self.type = LayerType.TEXT
        # Text properties
        if "text" not in self.properties:
            self.properties.update({
                "text": "",
                "font_family": "Arial",
                "font_size": 24,
                "font_weight": "normal",
                "color": "#000000",
                "alignment": "left",
                "line_height": 1.5,
                "letter_spacing": 0
            })


@dataclass
class ImageLayer(Layer):
    """Image layer"""
    def __post_init__(self):
        self.type = LayerType.IMAGE
        # Image properties
        if "source" not in self.properties:
            self.properties.update({
                "source": "",  # base64 or URL
                "filters": [],
                "crop": None,
                "flip_h": False,
                "flip_v": False
            })


@dataclass
class ShapeLayer(Layer):
    """Shape layer (rectangle, circle, etc)"""
    def __post_init__(self):
        self.type = LayerType.SHAPE
        # Shape properties
        if "shape_type" not in self.properties:
            self.properties.update({
                "shape_type": "rectangle",  # rectangle, circle, polygon
                "fill_color": "#FFFFFF",
                "stroke_color": "#000000",
                "stroke_width": 1,
                "corner_radius": 0  # for rounded rectangles
            })


@dataclass
class Creative:
    """Complete creative with multiple layers"""
    id: str
    name: str
    width: int
    height: int
    layers: List[Layer] = field(default_factory=list)
    background_color: str = "#FFFFFF"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


class LayerManager:
    """
    Manage layers in creative composition
    """
    
    def __init__(self):
        """Initialize layer manager"""
        self.creatives: Dict[str, Creative] = {}
        logger.info("LayerManager initialized")
    
    # Creative management
    
    def create_creative(
        self,
        name: str,
        width: int,
        height: int,
        background_color: str = "#FFFFFF"
    ) -> Creative:
        """Create new creative canvas"""
        creative = Creative(
            id=str(uuid.uuid4()),
            name=name,
            width=width,
            height=height,
            background_color=background_color
        )
        self.creatives[creative.id] = creative
        logger.info(f"Created creative: {name} ({width}x{height})")
        return creative
    
    def get_creative(self, creative_id: str) -> Optional[Creative]:
        """Get creative by ID"""
        return self.creatives.get(creative_id)
    
    def delete_creative(self, creative_id: str) -> bool:
        """Delete creative"""
        if creative_id in self.creatives:
            del self.creatives[creative_id]
            logger.info(f"Deleted creative: {creative_id}")
            return True
        return False
    
    # Layer management
    
    def add_layer(
        self,
        creative_id: str,
        layer: Layer,
        position: Optional[int] = None
    ) -> bool:
        """
        Add layer to creative
        
        Args:
            creative_id: Creative ID
            layer: Layer to add
            position: Insert position (None = top)
            
        Returns:
            Success status
        """
        creative = self.get_creative(creative_id)
        if not creative:
            return False
        
        if position is None:
            creative.layers.append(layer)
        else:
            creative.layers.insert(position, layer)
        
        self._update_z_indices(creative)
        creative.updated_at = datetime.now().isoformat()
        
        logger.info(f"Added {layer.type.value} layer: {layer.name}")
        return True
    
    def create_text_layer(
        self,
        creative_id: str,
        text: str,
        x: int = 0,
        y: int = 0,
        font_size: int = 24,
        color: str = "#000000",
        name: Optional[str] = None
    ) -> Optional[Layer]:
        """Create and add text layer"""
        creative = self.get_creative(creative_id)
        if not creative:
            return None
        
        layer = TextLayer(
            id=str(uuid.uuid4()),
            name=name or f"Text Layer {len(creative.layers) + 1}",
            x=x,
            y=y,
            width=300,
            height=100
        )
        
        layer.properties.update({
            "text": text,
            "font_size": font_size,
            "color": color
        })
        
        self.add_layer(creative_id, layer)
        return layer
    
    def create_image_layer(
        self,
        creative_id: str,
        image_source: str,
        x: int = 0,
        y: int = 0,
        width: int = 100,
        height: int = 100,
        name: Optional[str] = None
    ) -> Optional[Layer]:
        """Create and add image layer"""
        creative = self.get_creative(creative_id)
        if not creative:
            return None
        
        layer = ImageLayer(
            id=str(uuid.uuid4()),
            name=name or f"Image Layer {len(creative.layers) + 1}",
            x=x,
            y=y,
            width=width,
            height=height
        )
        
        layer.properties["source"] = image_source
        
        self.add_layer(creative_id, layer)
        return layer
    
    def create_shape_layer(
        self,
        creative_id: str,
        shape_type: str = "rectangle",
        x: int = 0,
        y: int = 0,
        width: int = 100,
        height: int = 100,
        fill_color: str = "#FFFFFF",
        name: Optional[str] = None
    ) -> Optional[Layer]:
        """Create and add shape layer"""
        creative = self.get_creative(creative_id)
        if not creative:
            return None
        
        layer = ShapeLayer(
            id=str(uuid.uuid4()),
            name=name or f"Shape Layer {len(creative.layers) + 1}",
            x=x,
            y=y,
            width=width,
            height=height
        )
        
        layer.properties.update({
            "shape_type": shape_type,
            "fill_color": fill_color
        })
        
        self.add_layer(creative_id, layer)
        return layer
    
    def get_layer(self, creative_id: str, layer_id: str) -> Optional[Layer]:
        """Get layer by ID"""
        creative = self.get_creative(creative_id)
        if not creative:
            return None
        
        for layer in creative.layers:
            if layer.id == layer_id:
                return layer
        return None
    
    def update_layer(
        self,
        creative_id: str,
        layer_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Update layer properties"""
        layer = self.get_layer(creative_id, layer_id)
        if not layer:
            return False
        
        # Update main properties
        for key, value in updates.items():
            if key == "properties":
                # Merge properties dict
                layer.properties.update(value)
            elif hasattr(layer, key):
                setattr(layer, key, value)
        
        layer.updated_at = datetime.now().isoformat()
        
        creative = self.get_creative(creative_id)
        if creative:
            creative.updated_at = datetime.now().isoformat()
        
        logger.info(f"Updated layer: {layer.name}")
        return True
    
    def delete_layer(self, creative_id: str, layer_id: str) -> bool:
        """Delete layer"""
        creative = self.get_creative(creative_id)
        if not creative:
            return False
        
        for i, layer in enumerate(creative.layers):
            if layer.id == layer_id:
                del creative.layers[i]
                self._update_z_indices(creative)
                creative.updated_at = datetime.now().isoformat()
                logger.info(f"Deleted layer: {layer.name}")
                return True
        
        return False
    
    def duplicate_layer(self, creative_id: str, layer_id: str) -> Optional[Layer]:
        """Duplicate existing layer"""
        layer = self.get_layer(creative_id, layer_id)
        if not layer:
            return None
        
        # Create copy with new ID
        layer_dict = asdict(layer)
        layer_dict["id"] = str(uuid.uuid4())
        layer_dict["name"] = f"{layer.name} Copy"
        layer_dict["x"] = layer.x + 10  # Offset slightly
        layer_dict["y"] = layer.y + 10
        
        # Reconstruct layer based on type
        if layer.type == LayerType.TEXT:
            new_layer = TextLayer(**layer_dict)
        elif layer.type == LayerType.IMAGE:
            new_layer = ImageLayer(**layer_dict)
        elif layer.type == LayerType.SHAPE:
            new_layer = ShapeLayer(**layer_dict)
        else:
            new_layer = Layer(**layer_dict)
        
        self.add_layer(creative_id, new_layer)
        return new_layer
    
    # Layer ordering
    
    def reorder_layers(
        self,
        creative_id: str,
        layer_id: str,
        new_position: int
    ) -> bool:
        """Change layer order"""
        creative = self.get_creative(creative_id)
        if not creative:
            return False
        
        # Find layer
        layer_idx = None
        for i, layer in enumerate(creative.layers):
            if layer.id == layer_id:
                layer_idx = i
                break
        
        if layer_idx is None:
            return False
        
        # Move layer
        layer = creative.layers.pop(layer_idx)
        creative.layers.insert(new_position, layer)
        
        self._update_z_indices(creative)
        creative.updated_at = datetime.now().isoformat()
        
        logger.info(f"Reordered layer: {layer.name} to position {new_position}")
        return True
    
    def move_layer_up(self, creative_id: str, layer_id: str) -> bool:
        """Move layer up one position"""
        creative = self.get_creative(creative_id)
        if not creative:
            return False
        
        for i, layer in enumerate(creative.layers):
            if layer.id == layer_id and i < len(creative.layers) - 1:
                return self.reorder_layers(creative_id, layer_id, i + 1)
        
        return False
    
    def move_layer_down(self, creative_id: str, layer_id: str) -> bool:
        """Move layer down one position"""
        creative = self.get_creative(creative_id)
        if not creative:
            return False
        
        for i, layer in enumerate(creative.layers):
            if layer.id == layer_id and i > 0:
                return self.reorder_layers(creative_id, layer_id, i - 1)
        
        return False
    
    def move_layer_to_top(self, creative_id: str, layer_id: str) -> bool:
        """Move layer to top"""
        creative = self.get_creative(creative_id)
        if not creative:
            return False
        
        return self.reorder_layers(creative_id, layer_id, len(creative.layers) - 1)
    
    def move_layer_to_bottom(self, creative_id: str, layer_id: str) -> bool:
        """Move layer to bottom"""
        return self.reorder_layers(creative_id, layer_id, 0)
    
    # Visibility and locking
    
    def toggle_layer_visibility(self, creative_id: str, layer_id: str) -> bool:
        """Toggle layer visibility"""
        layer = self.get_layer(creative_id, layer_id)
        if layer:
            layer.visible = not layer.visible
            return True
        return False
    
    def toggle_layer_lock(self, creative_id: str, layer_id: str) -> bool:
        """Toggle layer lock status"""
        layer = self.get_layer(creative_id, layer_id)
        if layer:
            layer.locked = not layer.locked
            return True
        return False
    
    # Grouping
    
    def group_layers(
        self,
        creative_id: str,
        layer_ids: List[str],
        group_name: str = "Group"
    ) -> Optional[Layer]:
        """Group multiple layers"""
        creative = self.get_creative(creative_id)
        if not creative:
            return None
        
        # Find layers
        layers_to_group = []
        for layer_id in layer_ids:
            layer = self.get_layer(creative_id, layer_id)
            if layer:
                layers_to_group.append(layer)
        
        if not layers_to_group:
            return None
        
        # Create group layer
        group = Layer(
            id=str(uuid.uuid4()),
            name=group_name,
            type=LayerType.GROUP
        )
        
        # Store child layer IDs in properties
        group.properties["children"] = layer_ids
        
        # Add group and remove individual layers from top level
        # (In full implementation, you'd restructure the layer tree)
        self.add_layer(creative_id, group)
        
        logger.info(f"Grouped {len(layers_to_group)} layers into: {group_name}")
        return group
    
    # Helper methods
    
    def _update_z_indices(self, creative: Creative):
        """Update z-index based on layer order"""
        for i, layer in enumerate(creative.layers):
            layer.z_index = i
    
    def to_json(self, creative_id: str) -> Optional[str]:
        """Export creative to JSON"""
        creative = self.get_creative(creative_id)
        if not creative:
            return None
        
        return json.dumps(asdict(creative), indent=2)
    
    def from_json(self, json_str: str) -> Optional[Creative]:
        """Import creative from JSON"""
        try:
            data = json.loads(json_str)
            
            # Reconstruct layers based on type
            layers = []
            for layer_data in data.get("layers", []):
                layer_type = LayerType(layer_data["type"])
                
                if layer_type == LayerType.TEXT:
                    layer = TextLayer(**layer_data)
                elif layer_type == LayerType.IMAGE:
                    layer = ImageLayer(**layer_data)
                elif layer_type == LayerType.SHAPE:
                    layer = ShapeLayer(**layer_data)
                else:
                    layer = Layer(**layer_data)
                
                layers.append(layer)
            
            data["layers"] = layers
            creative = Creative(**data)
            
            self.creatives[creative.id] = creative
            return creative
            
        except Exception as e:
            logger.error(f"Failed to import creative from JSON: {e}")
            return None


# Global instance
_layer_manager = None

def get_layer_manager() -> LayerManager:
    """Get global layer manager instance"""
    global _layer_manager
    if _layer_manager is None:
        _layer_manager = LayerManager()
    return _layer_manager
