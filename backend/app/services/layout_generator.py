"""Layout generation service for creating ad creative variations."""
import uuid
import json
from pathlib import Path
from typing import List, Dict, Any
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from app.models.schemas import (
    Creative, 
    CreativeElement, 
    CreativeRequest,
    ElementPosition,
    BoundingBox
)
from app.config import settings


class LayoutGenerator:
    """Generates multiple creative layout variations."""
    
    # Standard ad sizes per retailer
    RETAILER_SIZES = {
        "amazon": [
            {"name": "Product Display", "width": 1200, "height": 628},
            {"name": "Brand Store Banner", "width": 1500, "height": 500},
            {"name": "Sponsored Brand", "width": 1200, "height": 400},
        ],
        "flipkart": [
            {"name": "Banner Large", "width": 1410, "height": 450},
            {"name": "Banner Medium", "width": 1024, "height": 576},
            {"name": "Product Card", "width": 800, "height": 800},
        ],
        "dmart": [
            {"name": "Homepage Banner", "width": 1920, "height": 600},
            {"name": "Category Banner", "width": 1200, "height": 400},
            {"name": "Product Showcase", "width": 1000, "height": 1000},
        ]
    }
    
    # Layout templates (positioning strategies)
    LAYOUT_TEMPLATES = [
        {
            "name": "left_product",
            "product": {"x": 0.05, "y": 0.1, "w": 0.4, "h": 0.8},
            "logo": {"x": 0.05, "y": 0.05, "w": 0.15, "h": 0.1},
            "headline": {"x": 0.5, "y": 0.25, "w": 0.45, "h": 0.2},
            "offer": {"x": 0.5, "y": 0.5, "w": 0.45, "h": 0.15},
        },
        {
            "name": "right_product",
            "product": {"x": 0.55, "y": 0.1, "w": 0.4, "h": 0.8},
            "logo": {"x": 0.8, "y": 0.05, "w": 0.15, "h": 0.1},
            "headline": {"x": 0.05, "y": 0.25, "w": 0.45, "h": 0.2},
            "offer": {"x": 0.05, "y": 0.5, "w": 0.45, "h": 0.15},
        },
        {
            "name": "center_product",
            "product": {"x": 0.3, "y": 0.15, "w": 0.4, "h": 0.6},
            "logo": {"x": 0.05, "y": 0.05, "w": 0.15, "h": 0.1},
            "headline": {"x": 0.1, "y": 0.78, "w": 0.8, "h": 0.1},
            "offer": {"x": 0.3, "y": 0.88, "w": 0.4, "h": 0.08},
        },
        {
            "name": "top_product",
            "product": {"x": 0.25, "y": 0.05, "w": 0.5, "h": 0.5},
            "logo": {"x": 0.02, "y": 0.02, "w": 0.12, "h": 0.08},
            "headline": {"x": 0.1, "y": 0.58, "w": 0.8, "h": 0.15},
            "offer": {"x": 0.25, "y": 0.75, "w": 0.5, "h": 0.12},
        },
        {
            "name": "diagonal_split",
            "product": {"x": 0.5, "y": 0.05, "w": 0.45, "h": 0.9},
            "logo": {"x": 0.05, "y": 0.05, "w": 0.2, "h": 0.12},
            "headline": {"x": 0.05, "y": 0.3, "w": 0.4, "h": 0.2},
            "offer": {"x": 0.05, "y": 0.55, "w": 0.4, "h": 0.15},
        },
        {
            "name": "grid_layout",
            "product": {"x": 0.02, "y": 0.15, "w": 0.45, "h": 0.7},
            "logo": {"x": 0.52, "y": 0.05, "w": 0.2, "h": 0.12},
            "headline": {"x": 0.52, "y": 0.2, "w": 0.45, "h": 0.25},
            "offer": {"x": 0.52, "y": 0.5, "w": 0.45, "h": 0.2},
        },
    ]
    
    def __init__(self):
        """Initialize the layout generator."""
        self.output_dir = settings.OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate(self, request: CreativeRequest) -> List[Creative]:
        """
        Generate multiple creative variations based on the request.
        
        Args:
            request: CreativeRequest with all input parameters
            
        Returns:
            List of Creative objects with generated layouts
        """
        creatives = []
        retailer = request.retailer.lower()
        
        # Get sizes for retailer
        sizes = self.RETAILER_SIZES.get(retailer, self.RETAILER_SIZES["amazon"])
        
        # Load input images
        product_img = Image.open(request.product_image_path).convert("RGBA")
        logo_img = Image.open(request.logo_path).convert("RGBA")
        
        # Determine brand colors
        brand_colors = request.brand_colors if request.brand_colors else ["#1a73e8", "#ffffff"]
        
        variation_count = 0
        for size in sizes:
            for template in self.LAYOUT_TEMPLATES[:request.num_variations // len(sizes) + 1]:
                if variation_count >= request.num_variations:
                    break
                
                creative = self._generate_single_creative(
                    product_img=product_img,
                    logo_img=logo_img,
                    headline=request.headline,
                    offer_text=request.offer_text,
                    size=size,
                    template=template,
                    brand_colors=brand_colors,
                    variation_number=variation_count + 1
                )
                creatives.append(creative)
                variation_count += 1
        
        return creatives
    
    def _generate_single_creative(
        self,
        product_img: Image.Image,
        logo_img: Image.Image,
        headline: str,
        offer_text: str,
        size: Dict[str, Any],
        template: Dict[str, Any],
        brand_colors: List[str],
        variation_number: int
    ) -> Creative:
        """Generate a single creative variation."""
        creative_id = str(uuid.uuid4())
        width = size["width"]
        height = size["height"]
        
        # Create canvas with background color
        bg_color = self._hex_to_rgba(brand_colors[0] if brand_colors else "#ffffff")
        canvas = Image.new("RGBA", (width, height), bg_color)
        draw = ImageDraw.Draw(canvas)
        
        elements = []
        
        # Place product image
        product_pos = template["product"]
        product_bbox = self._calculate_bbox(product_pos, width, height)
        resized_product = self._resize_and_fit(product_img, product_bbox["width"], product_bbox["height"])
        canvas.paste(resized_product, (product_bbox["x"], product_bbox["y"]), resized_product)
        
        elements.append(CreativeElement(
            element_id=f"product_{creative_id[:8]}",
            element_type="product",
            position=ElementPosition(
                element_type="product",
                bbox=BoundingBox(**product_bbox)
            )
        ))
        
        # Place logo
        logo_pos = template["logo"]
        logo_bbox = self._calculate_bbox(logo_pos, width, height)
        resized_logo = self._resize_and_fit(logo_img, logo_bbox["width"], logo_bbox["height"])
        canvas.paste(resized_logo, (logo_bbox["x"], logo_bbox["y"]), resized_logo)
        
        elements.append(CreativeElement(
            element_id=f"logo_{creative_id[:8]}",
            element_type="logo",
            position=ElementPosition(
                element_type="logo",
                bbox=BoundingBox(**logo_bbox)
            )
        ))
        
        # Draw headline text
        headline_pos = template["headline"]
        headline_bbox = self._calculate_bbox(headline_pos, width, height)
        text_color = brand_colors[1] if len(brand_colors) > 1 else "#000000"
        
        self._draw_text(
            draw=draw,
            text=headline,
            bbox=headline_bbox,
            color=text_color,
            font_size=int(height * 0.08)
        )
        
        elements.append(CreativeElement(
            element_id=f"headline_{creative_id[:8]}",
            element_type="headline",
            position=ElementPosition(
                element_type="headline",
                bbox=BoundingBox(**headline_bbox)
            ),
            content=headline,
            style={"color": text_color, "font_size": int(height * 0.08)}
        ))
        
        # Draw offer text if provided
        if offer_text:
            offer_pos = template["offer"]
            offer_bbox = self._calculate_bbox(offer_pos, width, height)
            
            self._draw_text(
                draw=draw,
                text=offer_text,
                bbox=offer_bbox,
                color=text_color,
                font_size=int(height * 0.05)
            )
            
            elements.append(CreativeElement(
                element_id=f"offer_{creative_id[:8]}",
                element_type="offer_text",
                position=ElementPosition(
                    element_type="offer_text",
                    bbox=BoundingBox(**offer_bbox)
                ),
                content=offer_text,
                style={"color": text_color, "font_size": int(height * 0.05)}
            ))
        
        # Save the creative
        preview_filename = f"{creative_id}.png"
        preview_path = self.output_dir / preview_filename
        canvas.convert("RGB").save(preview_path, "PNG", quality=95)
        
        # Generate thumbnail
        thumb_filename = f"{creative_id}_thumb.png"
        thumb_path = self.output_dir / thumb_filename
        thumb = canvas.copy()
        thumb.thumbnail((300, 300))
        thumb.convert("RGB").save(thumb_path, "PNG")
        
        return Creative(
            creative_id=creative_id,
            variation_number=variation_number,
            width=width,
            height=height,
            elements=elements,
            preview_path=f"/outputs/{preview_filename}",
            thumbnail_path=f"/outputs/{thumb_filename}",
            score=0.0
        )
    
    def _calculate_bbox(self, pos: Dict[str, float], width: int, height: int) -> Dict[str, int]:
        """Convert relative positions to absolute pixel values."""
        return {
            "x": int(pos["x"] * width),
            "y": int(pos["y"] * height),
            "width": int(pos["w"] * width),
            "height": int(pos["h"] * height)
        }
    
    def _resize_and_fit(self, img: Image.Image, max_width: int, max_height: int) -> Image.Image:
        """Resize image to fit within bounds while maintaining aspect ratio."""
        img_copy = img.copy()
        img_copy.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        return img_copy
    
    def _hex_to_rgba(self, hex_color: str) -> tuple:
        """Convert hex color to RGBA tuple."""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 6:
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) + (255,)
        return (255, 255, 255, 255)
    
    def _draw_text(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        bbox: Dict[str, int],
        color: str,
        font_size: int
    ):
        """Draw text within a bounding box."""
        try:
            # Try to load a system font
            font = ImageFont.truetype("arial.ttf", font_size)
        except (IOError, OSError):
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", font_size)
            except (IOError, OSError):
                font = ImageFont.load_default()
        
        # Calculate text position (centered in bbox)
        text_bbox = draw.textbbox((0, 0), text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        x = bbox["x"] + (bbox["width"] - text_width) // 2
        y = bbox["y"] + (bbox["height"] - text_height) // 2
        
        # Draw text
        draw.text((x, y), text, fill=color, font=font)
    
    def get_available_sizes(self, retailer: str) -> List[Dict[str, Any]]:
        """Get available ad sizes for a retailer."""
        return self.RETAILER_SIZES.get(retailer.lower(), self.RETAILER_SIZES["amazon"])
