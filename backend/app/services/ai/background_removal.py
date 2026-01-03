"""
Background Removal Service using rembg
Removes backgrounds from product images for clean compositing.
"""

import io
import base64
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
from loguru import logger

# Try importing rembg
try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    logger.warning("rembg not installed. Install with: pip install rembg[gpu]")

# Try importing PIL
try:
    from PIL import Image, ImageFilter, ImageEnhance
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL not available")


class RembgModel:
    """Available rembg models."""
    U2NET = "u2net"
    U2NETP = "u2netp"
    U2NET_HUMAN_SEG = "u2net_human_seg"
    U2NET_CLOTH_SEG = "u2net_cloth_seg"
    SILUETA = "silueta"
    ISNET_GENERAL_USE = "isnet-general-use"
    ISNET_ANIME = "isnet-anime"


@dataclass
class RemovalResult:
    """Result of background removal."""
    success: bool
    image_base64: Optional[str]
    original_size: Tuple[int, int]
    has_alpha: bool
    processing_time: float
    model_used: str
    error: Optional[str] = None


class BackgroundRemovalService:
    """
    Background removal service for product images.
    
    Features:
    - Multiple model support (u2net, isnet, etc.)
    - Edge refinement and smoothing
    - Shadow generation for compositing
    - Transparent PNG output
    """
    
    def __init__(self, model: str = RembgModel.ISNET_GENERAL_USE):
        """
        Initialize background removal service.
        
        Args:
            model: rembg model to use
        """
        self.model_name = model
        self.session = None
        self._initialized = False
        
    def initialize(self) -> bool:
        """Initialize the removal model."""
        if self._initialized:
            return True
            
        if not REMBG_AVAILABLE:
            logger.error("rembg not available")
            return False
            
        try:
            logger.info(f"Loading background removal model: {self.model_name}")
            self.session = new_session(self.model_name)
            self._initialized = True
            logger.info("✓ Background removal model loaded")
            return True
        except Exception as e:
            logger.error(f"Failed to load rembg model: {e}")
            return False
    
    def remove_background(
        self,
        image_input: str,  # Base64 or file path
        alpha_matting: bool = True,
        post_process: bool = True,
        add_shadow: bool = False
    ) -> RemovalResult:
        """
        Remove background from an image.
        
        Args:
            image_input: Base64 encoded image or file path
            alpha_matting: Use alpha matting for better edges
            post_process: Apply post-processing (smoothing, etc.)
            add_shadow: Add drop shadow for compositing
            
        Returns:
            RemovalResult with transparent PNG
        """
        import time
        start = time.time()
        
        if not self._initialized:
            self.initialize()
            
        if not REMBG_AVAILABLE or not PIL_AVAILABLE:
            return RemovalResult(
                success=False,
                image_base64=None,
                original_size=(0, 0),
                has_alpha=False,
                processing_time=0,
                model_used=self.model_name,
                error="rembg or PIL not available"
            )
        
        try:
            # Load image
            if image_input.startswith("data:"):
                # Data URL
                image_data = base64.b64decode(image_input.split(",")[1])
                image = Image.open(io.BytesIO(image_data))
            elif len(image_input) > 500:  
                # Likely base64
                image_data = base64.b64decode(image_input)
                image = Image.open(io.BytesIO(image_data))
            else:
                # File path
                image = Image.open(image_input)
            
            original_size = image.size
            
            # Remove background
            result_image = remove(
                image,
                session=self.session,
                alpha_matting=alpha_matting,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=10
            )
            
            # Post-process
            if post_process:
                result_image = self._post_process(result_image)
            
            # Add shadow
            if add_shadow:
                result_image = self._add_shadow(result_image)
            
            # Convert to base64
            buffered = io.BytesIO()
            result_image.save(buffered, format="PNG")
            img_b64 = base64.b64encode(buffered.getvalue()).decode()
            
            elapsed = time.time() - start
            
            return RemovalResult(
                success=True,
                image_base64=img_b64,
                original_size=original_size,
                has_alpha=True,
                processing_time=elapsed,
                model_used=self.model_name
            )
            
        except Exception as e:
            logger.error(f"Background removal failed: {e}")
            return RemovalResult(
                success=False,
                image_base64=None,
                original_size=(0, 0),
                has_alpha=False,
                processing_time=time.time() - start,
                model_used=self.model_name,
                error=str(e)
            )
    
    def _post_process(self, image: "Image.Image") -> "Image.Image":
        """Apply post-processing to improve edges."""
        if not PIL_AVAILABLE:
            return image
            
        # Ensure RGBA
        if image.mode != "RGBA":
            image = image.convert("RGBA")
        
        # Get alpha channel
        r, g, b, a = image.split()
        
        # Smooth alpha edges slightly
        a = a.filter(ImageFilter.SMOOTH)
        
        # Recombine
        image = Image.merge("RGBA", (r, g, b, a))
        
        return image
    
    def _add_shadow(
        self,
        image: "Image.Image",
        offset: Tuple[int, int] = (10, 10),
        blur_radius: int = 15,
        shadow_color: Tuple[int, int, int, int] = (0, 0, 0, 100)
    ) -> "Image.Image":
        """Add a drop shadow to the image."""
        if not PIL_AVAILABLE:
            return image
            
        # Create shadow layer
        shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
        
        # Use alpha as mask for shadow
        if image.mode == "RGBA":
            _, _, _, alpha = image.split()
            
            # Create shadow from alpha
            shadow_alpha = alpha.copy()
            
            # Apply color to shadow
            shadow_layer = Image.new("RGBA", image.size, shadow_color)
            shadow_layer.putalpha(shadow_alpha)
            
            # Blur the shadow
            shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur_radius))
            
            # Create final image with offset shadow
            final_size = (
                image.width + abs(offset[0]) + blur_radius * 2,
                image.height + abs(offset[1]) + blur_radius * 2
            )
            final = Image.new("RGBA", final_size, (0, 0, 0, 0))
            
            # Paste shadow
            shadow_pos = (
                blur_radius + (offset[0] if offset[0] > 0 else 0),
                blur_radius + (offset[1] if offset[1] > 0 else 0)
            )
            final.paste(shadow_layer, shadow_pos, shadow_layer)
            
            # Paste original
            img_pos = (
                blur_radius + (-offset[0] if offset[0] < 0 else 0),
                blur_radius + (-offset[1] if offset[1] < 0 else 0)
            )
            final.paste(image, img_pos, image)
            
            return final
        
        return image
    
    def batch_remove(
        self,
        images: list,
        **kwargs
    ) -> list:
        """Remove backgrounds from multiple images."""
        results = []
        for img in images:
            result = self.remove_background(img, **kwargs)
            results.append(result)
        return results
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status."""
        return {
            "initialized": self._initialized,
            "model": self.model_name,
            "rembg_available": REMBG_AVAILABLE,
            "pil_available": PIL_AVAILABLE
        }


# Global instance
_bg_removal_service: Optional[BackgroundRemovalService] = None


def get_background_removal_service(model: str = None) -> BackgroundRemovalService:
    """Get or create the global background removal service."""
    global _bg_removal_service
    
    if _bg_removal_service is None:
        _bg_removal_service = BackgroundRemovalService(
            model=model or RembgModel.ISNET_GENERAL_USE
        )
    
    return _bg_removal_service
