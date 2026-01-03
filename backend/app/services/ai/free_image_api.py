"""
Free Image Generation API Service
Uses Hugging Face Inference API - No model downloads needed!

Perfect for cloud deployment (Render/Railway/Vercel):
- ✅ Zero storage (no 10GB models)
- ✅ 100% free (Hugging Face free tier)
- ✅ Same quality as local models
- ✅ 1000+ images/month free
"""

import os
import requests
import base64
from typing import Optional, Dict, Any, List
from loguru import logger
from io import BytesIO
from PIL import Image


class FreeImageAPI:
    """
    Free image generation using Hugging Face Inference API
    No downloads, no storage, 100% API-based
    """
    
    # Free Hugging Face models (same models as local)
    MODELS = {
        "sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
        "sd3": "stabilityai/stable-diffusion-3-medium-diffusers",
        "flux": "black-forest-labs/FLUX.1-schnell",  # Fast variant
        "sdxl_turbo": "stabilityai/sdxl-turbo",
        "sd_1_5": "runwayml/stable-diffusion-v1-5",
        "dreamshaper": "Lykon/dreamshaper-8",
        "realistic": "SG161222/Realistic_Vision_V5.1_noVAE"
    }
    
    def __init__(self):
        self.api_url = "https://api-inference.huggingface.co/models/"
        # Optional: Add HF token for faster inference (not required)
        self.hf_token = os.getenv("HF_TOKEN", "")
        logger.info("Free Image API initialized (Hugging Face)")
        
    def generate(
        self,
        prompt: str,
        model_type: str = "sdxl",
        negative_prompt: str = "blurry, low quality, distorted",
        width: int = 1024,
        height: int = 768,
        num_inference_steps: int = 25,
        guidance_scale: float = 7.5,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Generate image using Hugging Face API
        Returns dict with base64 image
        """
        try:
            model_id = self.MODELS.get(model_type, self.MODELS["sdxl"])
            url = f"{self.api_url}{model_id}"
            
            headers = {"Content-Type": "application/json"}
            if self.hf_token:
                headers["Authorization"] = f"Bearer {self.hf_token}"
            
            # Build payload
            payload = {
                "inputs": prompt,
                "parameters": {
                    "negative_prompt": negative_prompt,
                    "width": width,
                    "height": height,
                    "num_inference_steps": num_inference_steps,
                    "guidance_scale": guidance_scale
                }
            }
            
            logger.info(f"🎨 Generating image via API: {model_type}")
            
            # Make API call with retry
            max_retries = 2
            for attempt in range(max_retries):
                response = requests.post(url, headers=headers, json=payload, timeout=120)
                
                if response.status_code == 200:
                    # Success - convert to base64
                    image_bytes = response.content
                    
                    # Verify it's a valid image
                    try:
                        img = Image.open(BytesIO(image_bytes))
                        img.verify()
                        
                        # Convert to base64
                        base64_image = base64.b64encode(image_bytes).decode('utf-8')
                        
                        logger.info(f"✅ Image generated successfully ({len(image_bytes)} bytes)")
                        
                        return {
                            "success": True,
                            "image": base64_image,
                            "model": model_type,
                            "source": "huggingface_api"
                        }
                    except Exception as e:
                        logger.error(f"Invalid image data: {e}")
                        return None
                        
                elif response.status_code == 503:
                    # Model loading, retry
                    if attempt < max_retries - 1:
                        logger.warning(f"Model loading... retrying in 20s (attempt {attempt+1}/{max_retries})")
                        import time
                        time.sleep(20)
                        continue
                    else:
                        logger.error("Model failed to load after retries")
                        return None
                else:
                    logger.error(f"API error {response.status_code}: {response.text}")
                    return None
            
            return None
                
        except Exception as e:
            logger.error(f"Image generation failed: {e}")
            return None
    
    def generate_background(
        self,
        prompt: str,
        style: str = "modern",
        colors: str = "vibrant",
        width: int = 1024,
        height: int = 768
    ) -> Optional[str]:
        """Generate advertising background"""
        
        enhanced_prompt = f"""
        professional advertising background, {prompt}, {style} style,
        {colors} color palette, commercial photography,
        studio lighting, high quality, 4k, clean composition,
        empty center for product placement
        """
        
        result = self.generate(
            prompt=enhanced_prompt,
            negative_prompt="text, words, letters, watermark, person, face, product, cluttered",
            width=width,
            height=height
        )
        
        return result["image"] if result and result.get("success") else None


# Singleton instance
_free_api = None

def get_free_image_api() -> FreeImageAPI:
    """Get singleton instance"""
    global _free_api
    if _free_api is None:
        _free_api = FreeImageAPI()
    return _free_api
