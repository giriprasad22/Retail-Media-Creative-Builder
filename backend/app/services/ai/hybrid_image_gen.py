"""
Hybrid Image Generator - Automatically switches between local and API

LOCAL (Development):
- Uses local models (10GB)
- Unlimited generation
- Works offline

CLOUD (Deployment):
- Uses Hugging Face API
- No storage needed
- Free tier limits apply
"""

import os
import asyncio
from typing import Optional, Dict, Any
from loguru import logger
from PIL import Image
import base64
from io import BytesIO


class HybridImageGenerator:
    """
    Smart image generator that automatically chooses:
    - Local models when available (development)
    - Free APIs when deployed (cloud)
    """
    
    def __init__(self):
        self.mode = self._detect_mode()
        self.generator = self._init_generator()
        
    def _detect_mode(self) -> str:
        """Detect if running locally or in cloud"""
        
        # Check environment variable override
        force_mode = os.getenv("IMAGE_GEN_MODE", "").lower()
        if force_mode in ["local", "api"]:
            logger.info(f"Image generation mode forced to: {force_mode}")
            return force_mode
        
        # Auto-detect based on environment
        indicators = {
            "RENDER": os.getenv("RENDER"),  # Render.com
            "RAILWAY_ENVIRONMENT": os.getenv("RAILWAY_ENVIRONMENT"),  # Railway
            "VERCEL": os.getenv("VERCEL"),  # Vercel
            "DYNO": os.getenv("DYNO"),  # Heroku
            "KUBERNETES_SERVICE_HOST": os.getenv("KUBERNETES_SERVICE_HOST"),  # K8s
        }
        
        # If any cloud indicator exists, use API mode
        if any(indicators.values()):
            logger.info("☁️ Cloud environment detected - using API mode")
            return "api"
        
        # Check if local models exist
        try:
            import torch
            from diffusers import StableDiffusionPipeline
            logger.info("💻 Local environment detected - using local models")
            return "local"
        except ImportError:
            logger.info("📡 Diffusers not available - using API mode")
            return "api"
    
    def _init_generator(self):
        """Initialize appropriate generator based on mode"""
        
        if self.mode == "local":
            try:
                from .advanced_image_generator import get_advanced_generator
                logger.info("✅ Local image generator initialized")
                return get_advanced_generator()
            except Exception as e:
                logger.warning(f"Local generator failed, falling back to API: {e}")
                from .free_image_api import get_free_image_api
                self.mode = "api"
                return get_free_image_api()
        else:
            from .free_image_api import get_free_image_api
            logger.info("✅ API image generator initialized")
            return get_free_image_api()
    
    async def generate(
        self,
        prompt: str,
        model_type: str = "sdxl",
        negative_prompt: str = "blurry, low quality",
        width: int = 1024,
        height: int = 768,
        num_inference_steps: int = 25,
        guidance_scale: float = 7.5,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Generate image (automatically uses local or API)
        Returns PIL Image and metadata
        """
        logger.info(f"Generating image in {self.mode} mode with {model_type}")
        
        try:
            if self.mode == "local":
                # Local generation - returns PIL Image directly
                if hasattr(self.generator, 'generate'):
                    result = await self.generator.generate(
                        prompt=prompt,
                        model_type=model_type,
                        negative_prompt=negative_prompt,
                        width=width,
                        height=height,
                        num_inference_steps=num_inference_steps,
                        guidance_scale=guidance_scale,
                        **kwargs
                    )
                    # Convert to expected format
                    if result and result.get("success"):
                        return {
                            "success": True,
                            "image": result.get("image"),  # PIL Image
                            "model": model_type,
                            "mode": "local"
                        }
            else:
                # API generation - returns base64
                result = self.generator.generate(
                    prompt=prompt,
                    model_type=model_type,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    **kwargs
                )
                
                if result and result.get("success"):
                    # Convert base64 to PIL Image
                    image_data = base64.b64decode(result["image"])
                    image = Image.open(BytesIO(image_data))
                    
                    return {
                        "success": True,
                        "image": image,  # PIL Image
                        "model": model_type,
                        "mode": "api"
                    }
            
            return {"success": False, "error": "Generation failed"}
            
        except Exception as e:
            logger.error(f"Image generation failed in {self.mode} mode: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_background(
        self,
        prompt: str,
        style: str = "modern",
        colors: str = "vibrant",
        width: int = 1024,
        height: int = 768
    ) -> Optional[Image.Image]:
        """Generate advertising background - returns PIL Image"""
        
        try:
            result = await self.generate(
                prompt=f"professional advertising background, {prompt}, {style} style, {colors}",
                negative_prompt="text, words, letters, watermark, person, face, product, cluttered",
                width=width,
                height=height
            )
            return result["image"] if result and result.get("success") else None
                
        except Exception as e:
            logger.error(f"Background generation failed: {e}")
            return None
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get information about available models"""
        return {
            "mode": self.mode,
            "models": {
                "sdxl": "Stable Diffusion XL - Best quality",
                "sd3": "Stable Diffusion 3 - Newest",
                "flux": "FLUX.1 - State-of-the-art",
                "sdxl_turbo": "SDXL Turbo - Fast",
                "sd_1_5": "SD 1.5 - Classic"
            },
            "note": f"Currently using: {'Local models' if self.mode == 'local' else 'Free API (Hugging Face)'}"
        }


# Singleton instance
_hybrid_generator = None

def get_hybrid_generator() -> HybridImageGenerator:
    """Get singleton hybrid generator"""
    global _hybrid_generator
    if _hybrid_generator is None:
        _hybrid_generator = HybridImageGenerator()
    return _hybrid_generator
