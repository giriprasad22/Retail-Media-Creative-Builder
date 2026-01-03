"""
Stable Diffusion Integration Service
Provides local image generation using Stable Diffusion models.
Supports AUTOMATIC1111 API, ComfyUI, and direct Diffusers integration.
"""

import os
import io
import base64
import asyncio
import aiohttp
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from loguru import logger
import json

# Try importing diffusers for local generation
try:
    from diffusers import (
        StableDiffusionPipeline,
        StableDiffusionXLPipeline,
        DiffusionPipeline,
        DPMSolverMultistepScheduler,
        EulerAncestralDiscreteScheduler
    )
    import torch
    from PIL import Image
    DIFFUSERS_AVAILABLE = True
    TORCH_AVAILABLE = True
except ImportError as e:
    DIFFUSERS_AVAILABLE = False
    TORCH_AVAILABLE = False
    torch = None
    logger.warning(f"Diffusers not installed or import error: {e}. Install with: pip install diffusers torch accelerate")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class SDBackend(str, Enum):
    """Supported Stable Diffusion backends."""
    LOCAL_DIFFUSERS = "local_diffusers"
    AUTOMATIC1111 = "automatic1111"
    COMFYUI = "comfyui"
    HUGGINGFACE_API = "huggingface_api"


class SDModel(str, Enum):
    """Supported Stable Diffusion models."""
    SD_1_5 = "runwayml/stable-diffusion-v1-5"
    SD_2_1 = "stabilityai/stable-diffusion-2-1"
    SDXL_BASE = "stabilityai/stable-diffusion-xl-base-1.0"
    OPENJOURNEY = "prompthero/openjourney-v4"
    DREAMSHAPER = "Lykon/dreamshaper-8"
    REALISTIC_VISION = "SG161222/Realistic_Vision_V5.1_noVAE"


@dataclass
class GenerationParams:
    """Parameters for image generation."""
    prompt: str
    negative_prompt: str = "blurry, low quality, distorted, text, watermark, signature"
    width: int = 1024
    height: int = 768
    num_inference_steps: int = 25
    guidance_scale: float = 7.5
    seed: int = -1
    batch_size: int = 1
    sampler: str = "DPM++ 2M Karras"


@dataclass
class GenerationResult:
    """Result of image generation."""
    success: bool
    images: List[str]  # Base64 encoded images
    seeds: List[int]
    generation_time: float
    model_used: str
    error: Optional[str] = None


class StableDiffusionService:
    """
    Unified Stable Diffusion service supporting multiple backends.
    
    Features:
    - Local generation with Diffusers
    - AUTOMATIC1111 WebUI API integration
    - ComfyUI API integration
    - HuggingFace Inference API
    - Optimized prompts for ad creatives
    """
    
    # Advanced multi-layer design templates
    ADVANCED_STYLE_TEMPLATES = {
        'modern_layered': "layered composition, depth of field, foreground and background separation, professional studio lighting, volumetric effects, {prompt}, cinematic depth, 3D perspective, floating elements, dynamic composition, rule of thirds, golden ratio layout",
        'premium_depth': "premium multi-layer design, sophisticated depth mapping, parallax effect, {prompt}, professional color grading, studio quality lighting, atmospheric perspective, bokeh highlights, lens flare accents, depth layering",
        'dynamic_motion': "dynamic motion design, kinetic typography, {prompt}, flowing elements, speed lines, motion blur effects, energetic composition, diagonal leading lines, Z-axis depth, layer stacking",
        'minimalist_pro': "ultra-modern minimalist design, negative space mastery, {prompt}, asymmetric balance, brutalist layout, monochromatic with accent color, geometric precision, floating UI elements, glassmorphism",
        'festive_luxury': "luxurious festive design, {prompt}, multi-layered light effects, bokeh particles, golden hour lighting, volumetric god rays, particle system, atmospheric haze, depth blur, premium materials",
        'tech_future': "futuristic tech aesthetic, {prompt}, holographic overlays, neon accents, cyberpunk elements, grid systems, HUD interfaces, scan lines, digital particles, glitch effects, tech noir lighting",
        'organic_flow': "organic flowing design, {prompt}, gradient meshes, fluid dynamics, morphing shapes, soft shadows, ambient occlusion, subsurface scattering, natural depth, atmospheric layers",
        'editorial_pro': "editorial magazine layout, {prompt}, sophisticated typography, grid system, white space balance, editorial photography style, studio lighting setup, professional retouching, visual hierarchy"
    }
    
    # Layer composition enhancers
    LAYER_ENHANCERS = {
        'background': "deep background layer, environmental depth, atmospheric perspective, soft focus background, contextual scenery",
        'midground': "mid-layer elements, product placement zone, hero image area, focal point layer, sharp focus zone",
        'foreground': "foreground overlay elements, depth indicators, frame elements, decorative foreground, bokeh foreground",
        'effects': "light rays, particle effects, glow overlays, lens flare, atmospheric effects, volumetric lighting",
        'typography': "floating typography, 3D text effects, dynamic text placement, kinetic type animation, text depth layers"
    }
    
    # Professional composition rules
    COMPOSITION_RULES = [
        "rule of thirds composition",
        "golden ratio spiral",
        "fibonacci sequence layout",
        "dynamic symmetry",
        "leading lines composition",
        "frame within frame",
        "visual weight balance",
        "Z-pattern layout",
        "F-pattern design"
    ]
    
    # Ad-optimized prompt templates
    AD_PROMPT_TEMPLATES = {
        "product_background": """
            professional product photography background, {style}, 
            studio lighting, clean composition, advertising quality,
            high resolution, commercial photography, {mood},
            empty center area for product placement, {colors}
        """,
        "banner_background": """
            advertising banner background, {style}, 
            modern design, professional marketing material,
            {mood}, gradient overlays, {colors},
            space for text and product, commercial quality
        """,
        "festive_background": """
            festive celebration background, {festival} theme,
            vibrant decorations, lights and bokeh effects,
            {colors}, joyful atmosphere, traditional elements,
            empty center for content, advertising quality
        """,
        "sale_background": """
            dynamic sale promotional background, {style},
            eye-catching design, bold and energetic,
            {colors}, sense of urgency, retail marketing,
            space for offer text and product
        """,
        "premium_background": """
            luxury premium background, elegant and sophisticated,
            {style}, high-end aesthetic, {colors},
            subtle textures, refined design, exclusive feel,
            space for product showcase
        """
    }
    
    # Negative prompts for clean ad backgrounds
    AD_NEGATIVE_PROMPTS = {
        "default": """
            text, words, letters, numbers, watermark, signature, logo,
            human, person, face, hands, body parts,
            blurry, low quality, distorted, deformed,
            ugly, bad anatomy, amateur, poorly drawn
        """,
        "product": """
            text, watermark, blurry, distorted, multiple products,
            cluttered, busy background, distracting elements
        """,
        "clean": """
            text, letters, numbers, watermark, signature, logo,
            busy, cluttered, noisy, complex, detailed objects
        """
    }
    
    def __init__(
        self,
        backend: SDBackend = SDBackend.LOCAL_DIFFUSERS,
        model: SDModel = SDModel.SD_1_5,
        api_url: str = None,
        api_key: str = None
    ):
        """
        Initialize Stable Diffusion service.
        
        Args:
            backend: Which backend to use
            model: Which model to load (for local)
            api_url: API URL for AUTOMATIC1111 or ComfyUI
            api_key: API key for HuggingFace
        """
        self.backend = backend
        self.model_id = model.value if isinstance(model, SDModel) else model
        self.api_url = api_url or "http://127.0.0.1:7860"
        self.api_key = api_key or os.environ.get("HF_API_KEY", "")
        
        self.pipeline = None
        self.device = None
        if TORCH_AVAILABLE and torch is not None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._initialized = False
        
    async def initialize(self) -> bool:
        """Initialize the generation backend."""
        if self._initialized:
            return True
            
        try:
            if self.backend == SDBackend.LOCAL_DIFFUSERS:
                return await self._init_local_diffusers()
            elif self.backend == SDBackend.AUTOMATIC1111:
                return await self._check_automatic1111()
            elif self.backend == SDBackend.COMFYUI:
                return await self._check_comfyui()
            elif self.backend == SDBackend.HUGGINGFACE_API:
                return True  # No init needed
                
        except Exception as e:
            logger.error(f"Failed to initialize SD backend: {e}")
            return False
    
    async def _init_local_diffusers(self) -> bool:
        """Initialize local Diffusers pipeline."""
        if not DIFFUSERS_AVAILABLE:
            logger.error("Diffusers not available")
            return False
            
        try:
            logger.info(f"Loading Stable Diffusion model: {self.model_id}")
            
            # Load appropriate pipeline
            if "xl" in self.model_id.lower():
                self.pipeline = StableDiffusionXLPipeline.from_pretrained(
                    self.model_id,
                    torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                    use_safetensors=True,
                    variant="fp16" if self.device == "cuda" else None
                )
            else:
                self.pipeline = StableDiffusionPipeline.from_pretrained(
                    self.model_id,
                    torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                    safety_checker=None
                )
            
            # Optimize scheduler
            self.pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                self.pipeline.scheduler.config
            )
            
            # Move to device
            self.pipeline = self.pipeline.to(self.device)
            
            # Enable memory optimizations
            self.pipeline.enable_attention_slicing()
            
            # Note: xformers disabled for compatibility
            # Works with CPU and CUDA without additional dependencies
            
            self._initialized = True
            logger.info(f"✓ Stable Diffusion loaded on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load SD model: {e}")
            return False
    
    async def _check_automatic1111(self) -> bool:
        """Check if AUTOMATIC1111 API is available."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_url}/sdapi/v1/options", timeout=5) as resp:
                    if resp.status == 200:
                        self._initialized = True
                        logger.info("✓ AUTOMATIC1111 API available")
                        return True
        except:
            pass
        logger.warning("AUTOMATIC1111 API not available")
        return False
    
    async def _check_comfyui(self) -> bool:
        """Check if ComfyUI API is available."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_url}/system_stats", timeout=5) as resp:
                    if resp.status == 200:
                        self._initialized = True
                        logger.info("✓ ComfyUI API available")
                        return True
        except:
            pass
        logger.warning("ComfyUI API not available")
        return False
    
    async def generate(self, params: GenerationParams) -> GenerationResult:
        """
        Generate images using the configured backend.
        
        Args:
            params: Generation parameters
            
        Returns:
            GenerationResult with base64 encoded images
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            if self.backend == SDBackend.LOCAL_DIFFUSERS:
                return await self._generate_local(params)
            elif self.backend == SDBackend.AUTOMATIC1111:
                return await self._generate_automatic1111(params)
            elif self.backend == SDBackend.COMFYUI:
                return await self._generate_comfyui(params)
            elif self.backend == SDBackend.HUGGINGFACE_API:
                return await self._generate_huggingface(params)
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return GenerationResult(
                success=False,
                images=[],
                seeds=[],
                generation_time=0,
                model_used=self.model_id,
                error=str(e)
            )
    
    async def _generate_local(self, params: GenerationParams) -> GenerationResult:
        """Generate using local Diffusers pipeline."""
        import time
        start = time.time()
        
        # Set seed
        generator = None
        seed = params.seed if params.seed > 0 else torch.randint(0, 2**32, (1,)).item()
        if DIFFUSERS_AVAILABLE:
            generator = torch.Generator(device=self.device).manual_seed(seed)
        
        # Generate
        result = self.pipeline(
            prompt=params.prompt,
            negative_prompt=params.negative_prompt,
            width=params.width,
            height=params.height,
            num_inference_steps=params.num_inference_steps,
            guidance_scale=params.guidance_scale,
            generator=generator,
            num_images_per_prompt=params.batch_size
        )
        
        # Convert to base64
        images_b64 = []
        for img in result.images:
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            img_b64 = base64.b64encode(buffered.getvalue()).decode()
            images_b64.append(img_b64)
        
        elapsed = time.time() - start
        
        return GenerationResult(
            success=True,
            images=images_b64,
            seeds=[seed],
            generation_time=elapsed,
            model_used=self.model_id
        )
    
    async def _generate_automatic1111(self, params: GenerationParams) -> GenerationResult:
        """Generate using AUTOMATIC1111 API."""
        import time
        start = time.time()
        
        payload = {
            "prompt": params.prompt,
            "negative_prompt": params.negative_prompt,
            "width": params.width,
            "height": params.height,
            "steps": params.num_inference_steps,
            "cfg_scale": params.guidance_scale,
            "seed": params.seed if params.seed > 0 else -1,
            "batch_size": params.batch_size,
            "sampler_name": params.sampler
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.api_url}/sdapi/v1/txt2img",
                json=payload,
                timeout=300
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    elapsed = time.time() - start
                    return GenerationResult(
                        success=True,
                        images=data["images"],
                        seeds=[data.get("seed", -1)],
                        generation_time=elapsed,
                        model_used="automatic1111"
                    )
                else:
                    error = await resp.text()
                    return GenerationResult(
                        success=False,
                        images=[],
                        seeds=[],
                        generation_time=0,
                        model_used="automatic1111",
                        error=error
                    )
    
    async def _generate_comfyui(self, params: GenerationParams) -> GenerationResult:
        """Generate using ComfyUI API (simplified workflow)."""
        # ComfyUI requires workflow JSON - this is a simplified version
        # For full implementation, use ComfyUI workflow templates
        logger.warning("ComfyUI generation requires custom workflow setup")
        return GenerationResult(
            success=False,
            images=[],
            seeds=[],
            generation_time=0,
            model_used="comfyui",
            error="ComfyUI requires workflow configuration"
        )
    
    async def _generate_huggingface(self, params: GenerationParams) -> GenerationResult:
        """Generate using HuggingFace Inference API."""
        import time
        start = time.time()
        
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {"inputs": params.prompt}
        
        api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=120
            ) as resp:
                if resp.status == 200:
                    image_bytes = await resp.read()
                    img_b64 = base64.b64encode(image_bytes).decode()
                    elapsed = time.time() - start
                    return GenerationResult(
                        success=True,
                        images=[img_b64],
                        seeds=[-1],
                        generation_time=elapsed,
                        model_used=self.model_id
                    )
                else:
                    error = await resp.text()
                    return GenerationResult(
                        success=False,
                        images=[],
                        seeds=[],
                        generation_time=0,
                        model_used=self.model_id,
                        error=error
                    )
    
    def build_ad_prompt(
        self,
        template_type: str,
        style: str = "modern",
        mood: str = "professional",
        colors: List[str] = None,
        festival: str = None,
        custom_additions: str = ""
    ) -> str:
        """
        Build an optimized prompt for ad background generation.
        
        Args:
            template_type: Type of background (product, banner, festive, sale, premium)
            style: Visual style
            mood: Mood/atmosphere
            colors: Color scheme
            festival: Festival name for festive backgrounds
            custom_additions: Additional prompt text
            
        Returns:
            Optimized prompt string
        """
        template = self.AD_PROMPT_TEMPLATES.get(
            f"{template_type}_background",
            self.AD_PROMPT_TEMPLATES["banner_background"]
        )
        
        # Format colors
        color_str = ""
        if colors:
            color_str = f"color scheme with {', '.join(colors)}"
        
        # Build prompt
        prompt = template.format(
            style=style,
            mood=mood,
            colors=color_str,
            festival=festival or "celebration"
        )
        
        if custom_additions:
            prompt = f"{prompt}, {custom_additions}"
        
        # Clean up whitespace
        prompt = " ".join(prompt.split())
        
        return prompt
    
    def get_negative_prompt(self, type: str = "default") -> str:
        """Get appropriate negative prompt."""
        prompt = self.AD_NEGATIVE_PROMPTS.get(type, self.AD_NEGATIVE_PROMPTS["default"])
        return " ".join(prompt.split())
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status."""
        gpu_available = False
        if TORCH_AVAILABLE and torch is not None:
            gpu_available = torch.cuda.is_available()
        return {
            "initialized": self._initialized,
            "backend": self.backend.value,
            "model": self.model_id,
            "device": self.device,
            "diffusers_available": DIFFUSERS_AVAILABLE,
            "gpu_available": gpu_available
        }


# Global instance
_sd_service: Optional[StableDiffusionService] = None


def get_stable_diffusion_service(
    backend: SDBackend = None,
    model: SDModel = None
) -> StableDiffusionService:
    """Get or create the global Stable Diffusion service."""
    global _sd_service
    
    if _sd_service is None:
        # Try to detect best available backend
        if backend is None:
            if DIFFUSERS_AVAILABLE and torch.cuda.is_available():
                backend = SDBackend.LOCAL_DIFFUSERS
            else:
                backend = SDBackend.AUTOMATIC1111
        
        if model is None:
            model = SDModel.SD_1_5
            
        _sd_service = StableDiffusionService(backend=backend, model=model)
    
    return _sd_service
