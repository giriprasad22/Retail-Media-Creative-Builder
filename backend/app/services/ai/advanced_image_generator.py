"""
Advanced Image Generation with State-of-the-Art Models
Supports SDXL, SD3, FLUX.1 - Sora-level quality without API keys

✔ 100% free
✔ No API key required
✔ Works offline
✔ Photorealistic quality
✔ Full Python support
"""

from typing import Dict, Any, Optional, List, Literal
from PIL import Image
import io
import base64
import logging
import torch
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)


class ModelType(Enum):
    """Available state-of-the-art models"""
    SDXL = "sdxl"                    # Stable Diffusion XL - Best quality, 8GB+ VRAM
    SD3 = "sd3"                      # Stable Diffusion 3 - Newest, 16GB+ VRAM
    FLUX = "flux"                    # FLUX.1 - SOTA quality, closest to Sora
    SDXL_TURBO = "sdxl_turbo"        # Fast SDXL variant
    SD_1_5 = "sd_1_5"                # Classic SD 1.5 - Low VRAM fallback


class AdvancedImageGenerator:
    """
    State-of-the-art image generation using the best free, no-API-key models.
    
    Supported Models:
    1. SDXL (Stable Diffusion XL) - Best free model, Sora-level quality
    2. SD3 (Stable Diffusion 3) - Newest, even better quality
    3. FLUX.1 - SOTA open source, extremely realistic
    
    All models are:
    ✔ 100% free
    ✔ No API key required
    ✔ Work offline
    ✔ High-quality photorealistic output
    """
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        # Pipeline cache to avoid reloading
        self._pipelines = {}
        
        # Model configurations
        self.model_configs = {
            ModelType.SDXL: {
                "name": "Stable Diffusion XL",
                "repo": "stabilityai/stable-diffusion-xl-base-1.0",
                "pipeline_class": "StableDiffusionXLPipeline",
                "vram_required": "8GB+",
                "quality": "Excellent - Sora-level",
                "speed": "Medium (~15s)",
                "features": ["Photorealistic", "High detail", "Great composition"]
            },
            ModelType.SD3: {
                "name": "Stable Diffusion 3",
                "repo": "stabilityai/stable-diffusion-3-medium",
                "pipeline_class": "StableDiffusion3Pipeline",
                "vram_required": "16GB+",
                "quality": "Exceptional - Near commercial",
                "speed": "Slower (~25s)",
                "features": ["Best quality", "Advanced understanding", "Perfect text"]
            },
            ModelType.FLUX: {
                "name": "FLUX.1",
                "repo": "black-forest-labs/FLUX.1-dev",
                "pipeline_class": "DiffusionPipeline",
                "vram_required": "12GB+",
                "quality": "SOTA - Closest to Sora",
                "speed": "Medium (~20s)",
                "features": ["Hyper-realistic", "SOTA quality", "Excellent lighting"]
            },
            ModelType.SDXL_TURBO: {
                "name": "SDXL Turbo",
                "repo": "stabilityai/sdxl-turbo",
                "pipeline_class": "AutoPipelineForText2Image",
                "vram_required": "8GB+",
                "quality": "Very Good",
                "speed": "Fast (~3s)",
                "features": ["Ultra fast", "Good quality", "Real-time capable"]
            },
            ModelType.SD_1_5: {
                "name": "Stable Diffusion 1.5",
                "repo": "runwayml/stable-diffusion-v1-5",
                "pipeline_class": "StableDiffusionPipeline",
                "vram_required": "4GB+",
                "quality": "Good",
                "speed": "Fast (~8s)",
                "features": ["Low VRAM", "Fast", "Wide compatibility"]
            }
        }
        
        logger.info(f"AdvancedImageGenerator initialized on {self.device}")
    
    def _get_pipeline(self, model_type: ModelType):
        """Get or create pipeline for specified model"""
        if model_type in self._pipelines:
            return self._pipelines[model_type]
        
        config = self.model_configs[model_type]
        logger.info(f"Loading {config['name']} from {config['repo']}...")
        
        try:
            if model_type == ModelType.SDXL:
                from diffusers import StableDiffusionXLPipeline
                pipe = StableDiffusionXLPipeline.from_pretrained(
                    config["repo"],
                    torch_dtype=self.dtype,
                    use_safetensors=True,
                    variant="fp16" if self.device == "cuda" else None
                )
                
            elif model_type == ModelType.SD3:
                from diffusers import StableDiffusion3Pipeline
                pipe = StableDiffusion3Pipeline.from_pretrained(
                    config["repo"],
                    torch_dtype=self.dtype
                )
                
            elif model_type == ModelType.FLUX:
                from diffusers import DiffusionPipeline
                pipe = DiffusionPipeline.from_pretrained(
                    config["repo"],
                    torch_dtype=self.dtype
                )
                
            elif model_type == ModelType.SDXL_TURBO:
                from diffusers import AutoPipelineForText2Image
                pipe = AutoPipelineForText2Image.from_pretrained(
                    config["repo"],
                    torch_dtype=self.dtype,
                    variant="fp16" if self.device == "cuda" else None
                )
                
            else:  # SD 1.5 fallback
                from diffusers import StableDiffusionPipeline
                pipe = StableDiffusionPipeline.from_pretrained(
                    config["repo"],
                    torch_dtype=self.dtype
                )
            
            pipe = pipe.to(self.device)
            
            # Enable memory optimizations
            if hasattr(pipe, 'enable_attention_slicing'):
                pipe.enable_attention_slicing()
            
            self._pipelines[model_type] = pipe
            logger.info(f"Successfully loaded {config['name']}")
            return pipe
            
        except Exception as e:
            logger.error(f"Failed to load {config['name']}: {e}")
            raise
    
    def _round_to_8(self, value: int) -> int:
        """Round dimension to nearest multiple of 8 (required for Stable Diffusion)"""
        return ((value + 4) // 8) * 8
    
    async def generate_with_sdxl(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
        style: str = "photorealistic"
    ) -> Dict[str, Any]:
        """
        Generate image using SDXL - Best free model, Sora-level quality
        
        ✔ 100% free
        ✔ No API key
        ✔ Photorealistic quality
        ✔ 8GB+ VRAM recommended
        """
        try:
            # Ensure dimensions are divisible by 8
            width = self._round_to_8(width)
            height = self._round_to_8(height)
            
            pipe = self._get_pipeline(ModelType.SDXL)
            
            # Enhanced prompt with user-selected style
            enhanced_prompt = self._enhance_prompt(prompt, style)
            
            # Enhanced negative prompt for high quality output
            if not negative_prompt:
                negative_prompt = (
                    "low quality, blurry, pixelated, noisy, grainy, jpeg artifacts, "
                    "watermark, signature, text overlay, logo, distorted, deformed, "
                    "disfigured, bad anatomy, bad proportions, ugly, amateur, "
                    "unprofessional, overexposed, underexposed, low resolution"
                )
            
            logger.info(f"SDXL generating with style '{style}': {enhanced_prompt[:80]}...")
            
            image = pipe(
                prompt=enhanced_prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
            ).images[0]
            
            return {
                "success": True,
                "image": image,
                "model": "SDXL",
                "model_full": "stabilityai/stable-diffusion-xl-base-1.0",
                "prompt_used": enhanced_prompt,
                "style_applied": style,
                "resolution": f"{width}x{height}"
            }
            
        except Exception as e:
            logger.error(f"SDXL generation failed: {e}")
            return {"success": False, "error": str(e), "model": "SDXL"}
    
    async def generate_with_sd3(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        num_inference_steps: int = 28,
        guidance_scale: float = 7.0,
        style: str = "cinematic"
    ) -> Dict[str, Any]:
        """
        Generate image using SD3 - Newest, exceptional quality
        
        ✔ 100% free
        ✔ No API key
        ✔ Near commercial quality
        ✔ 16GB+ VRAM recommended
        """
        try:
            # Ensure dimensions are divisible by 8
            width = self._round_to_8(width)
            height = self._round_to_8(height)
            
            pipe = self._get_pipeline(ModelType.SD3)
            
            # Enhanced prompt with user-selected style
            enhanced_prompt = self._enhance_prompt(prompt, style)
            
            # Enhanced negative prompt
            if not negative_prompt:
                negative_prompt = (
                    "low quality, blurry, pixelated, noisy, grainy, jpeg artifacts, "
                    "watermark, signature, text overlay, logo, distorted, deformed, "
                    "disfigured, bad anatomy, ugly, amateur, unprofessional"
                )
            
            logger.info(f"SD3 generating with style '{style}': {enhanced_prompt[:80]}...")
            
            image = pipe(
                prompt=enhanced_prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
            ).images[0]
            
            return {
                "success": True,
                "image": image,
                "model": "SD3",
                "model_full": "stabilityai/stable-diffusion-3-medium",
                "prompt_used": enhanced_prompt,
                "style_applied": style,
                "resolution": f"{width}x{height}"
            }
            
        except Exception as e:
            logger.error(f"SD3 generation failed: {e}")
            return {"success": False, "error": str(e), "model": "SD3"}
    
    async def generate_with_flux(
        self,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        num_inference_steps: int = 25,
        guidance_scale: float = 3.5,
        style: str = "hyper-realistic"
    ) -> Dict[str, Any]:
        """
        Generate image using FLUX.1 - SOTA, closest to Sora quality
        
        ✔ 100% free
        ✔ No API key
        ✔ Hyper-realistic output
        ✔ 12GB+ VRAM recommended
        """
        try:
            # Ensure dimensions are divisible by 8
            width = self._round_to_8(width)
            height = self._round_to_8(height)
            
            pipe = self._get_pipeline(ModelType.FLUX)
            
            # Enhanced prompt with user-selected style
            enhanced_prompt = self._enhance_prompt(prompt, style)
            
            logger.info(f"FLUX.1 generating with style '{style}': {enhanced_prompt[:80]}...")
            
            image = pipe(
                prompt=enhanced_prompt,
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
            ).images[0]
            
            return {
                "success": True,
                "image": image,
                "model": "FLUX.1",
                "model_full": "black-forest-labs/FLUX.1-dev",
                "prompt_used": enhanced_prompt,
                "style_applied": style,
                "resolution": f"{width}x{height}"
            }
            
        except Exception as e:
            logger.error(f"FLUX.1 generation failed: {e}")
            return {"success": False, "error": str(e), "model": "FLUX.1"}
    
    async def generate_auto(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        quality: Literal["fast", "balanced", "best"] = "balanced",
        style: str = "photorealistic"
    ) -> Dict[str, Any]:
        """
        Automatically select the best available model based on system capabilities.
        
        Quality levels:
        - fast: Uses SDXL Turbo for quick generation
        - balanced: Uses SDXL for good quality and speed
        - best: Tries FLUX.1 → SD3 → SDXL (falls back if not available)
        """
        if quality == "fast":
            # Try SDXL Turbo first, fallback to SD 1.5
            try:
                return await self._generate_with_turbo(prompt, width, height, style)
            except:
                return await self._generate_with_sd15(prompt, negative_prompt, width, height, style)
        
        elif quality == "balanced":
            # Use SDXL - best balance of quality and speed
            return await self.generate_with_sdxl(prompt, negative_prompt, width, height, style=style)
        
        else:  # best
            # Try models in order of quality
            for model_name, generate_func in [
                ("FLUX.1", lambda: self.generate_with_flux(prompt, width=width, height=height, style=style)),
                ("SD3", lambda: self.generate_with_sd3(prompt, width=width, height=height, style=style)),
                ("SDXL", lambda: self.generate_with_sdxl(prompt, negative_prompt, width, height, style=style))
            ]:
                try:
                    logger.info(f"Trying {model_name} for best quality with style '{style}'...")
                    result = await generate_func()
                    if result.get("success"):
                        return result
                except Exception as e:
                    logger.warning(f"{model_name} not available: {e}")
                    continue
            
            # Ultimate fallback
            return await self._generate_with_sd15(prompt, negative_prompt, width, height, style)
    
    async def _generate_with_turbo(
        self,
        prompt: str,
        width: int,
        height: int,
        style: str = "photorealistic"
    ) -> Dict[str, Any]:
        """Fast generation with SDXL Turbo"""
        # Ensure dimensions are divisible by 8
        width = self._round_to_8(width)
        height = self._round_to_8(height)
        
        pipe = self._get_pipeline(ModelType.SDXL_TURBO)
        
        # Apply style enhancement even for turbo
        enhanced_prompt = self._enhance_prompt(prompt, style)
        
        image = pipe(
            prompt=enhanced_prompt,
            num_inference_steps=4,  # Turbo needs very few steps
            guidance_scale=0.0,     # Turbo works best with 0 guidance
            width=width,
            height=height
        ).images[0]
        
        return {
            "success": True,
            "image": image,
            "model": "SDXL Turbo",
            "model_full": "stabilityai/sdxl-turbo",
            "prompt_used": enhanced_prompt,
            "style_applied": style,
            "resolution": f"{width}x{height}"
        }
    
    async def _generate_with_sd15(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        style: str = "photorealistic"
    ) -> Dict[str, Any]:
        """Fallback generation with SD 1.5"""
        # Ensure dimensions are divisible by 8
        width = self._round_to_8(width)
        height = self._round_to_8(height)
        
        pipe = self._get_pipeline(ModelType.SD_1_5)
        
        # Apply style enhancement
        enhanced_prompt = self._enhance_prompt(prompt, style)
        
        image = pipe(
            prompt=enhanced_prompt,
            negative_prompt=negative_prompt or "low quality, blurry, ugly, distorted",
            num_inference_steps=30,
            guidance_scale=7.5,
            width=min(width, 768),  # SD 1.5 works best at 512-768
            height=min(height, 768)
        ).images[0]
        
        # Upscale if needed
        if width > 768 or height > 768:
            image = image.resize((width, height), Image.Resampling.LANCZOS)
        
        return {
            "success": True,
            "image": image,
            "model": "SD 1.5",
            "model_full": "runwayml/stable-diffusion-v1-5",
            "prompt_used": enhanced_prompt,
            "style_applied": style,
            "resolution": f"{width}x{height}"
        }
    
    def _enhance_prompt(self, prompt: str, style: str = "photorealistic") -> str:
        """Enhance prompt for better quality output"""
        
        # Ultra-detailed style enhancements for professional AI image generation
        style_enhancements = {
            "photorealistic": (
                "ultra realistic photography, 8K UHD resolution, shot on Canon EOS R5 with 85mm f/1.4 lens, "
                "perfect exposure, sharp focus, beautiful shallow depth of field, natural lighting, "
                "professional studio quality, magazine cover worthy, award-winning photography, "
                "highly detailed textures, perfect color grading, HDR, ray-traced reflections"
            ),
            "cinematic": (
                "cinematic film still, dramatic movie lighting, anamorphic lens flare, "
                "professional color grading like Roger Deakins, IMAX quality, 35mm film grain texture, "
                "volumetric lighting, atmospheric depth, epic composition, blockbuster movie visual, "
                "depth of field with bokeh, dramatic shadows, golden hour lighting"
            ),
            "hyper-realistic": (
                "hyper-realistic, photorealistic 3D render, Octane render quality, "
                "ray tracing with global illumination, subsurface scattering, photorealistic materials, "
                "Unreal Engine 5 quality, physically based rendering, studio lighting setup, "
                "8K ultra high definition, micro-detail textures, perfect reflections"
            ),
            "artistic": (
                "digital art masterpiece, trending on ArtStation and Behance, "
                "highly detailed digital painting, vibrant saturated colors, "
                "award-winning illustration, concept art quality, intricate details, "
                "beautiful color palette, professional artist quality, stunning visual design"
            ),
            "commercial": (
                "professional advertising photography, commercial campaign quality, "
                "high-end product photography, studio lighting setup, marketing excellence, "
                "brand-worthy visual, clean and professional, award-winning advertisement, "
                "premium commercial aesthetic, perfect exposure and composition"
            ),
            "elegant": (
                "sophisticated elegant design, refined luxury aesthetic, timeless beauty, "
                "high fashion editorial quality, premium brand visual, subtle details, "
                "harmonious color palette, professional art direction, museum-worthy quality"
            ),
            "vibrant": (
                "vibrant bold colors, high color saturation, energetic visual impact, "
                "eye-catching design, maximum visual appeal, attention-grabbing imagery, "
                "dynamic composition, punchy contrast, lively and engaging"
            ),
            "soft": (
                "soft dreamy atmosphere, gentle pastel color palette, ethereal glow, "
                "romantic aesthetic, delicate and refined details, subtle gradient tones, "
                "peaceful mood, airy and light feel, elegant simplicity"
            ),
            "premium": (
                "luxury premium aesthetic, high-end brand quality, sophisticated design, "
                "expensive look and feel, exclusive and refined, gold accents, "
                "velvet textures, ambient lighting, opulent atmosphere"
            ),
            "modern": (
                "modern contemporary design, sleek and clean aesthetic, minimalist luxury, "
                "professional corporate visual, glass morphism effects, subtle gradients, "
                "tech-forward design, innovative visual language, cutting-edge style"
            )
        }
        
        enhancement = style_enhancements.get(style, style_enhancements["photorealistic"])
        
        # Add universal quality boosters
        quality_boost = ", masterpiece, best quality, highly detailed, intricate details, perfect composition, professional"
        
        return f"{prompt}, {enhancement}{quality_boost}"
    
    async def generate_multi_model_ensemble(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024
    ) -> Dict[str, Any]:
        """
        Generate using multiple models and combine for best results.
        
        Pipeline:
        1. SDXL for base generation
        2. SDXL Refiner for enhancement
        3. Optional: FLUX.1 for comparison
        """
        results = {
            "stages": [],
            "models_used": [],
            "final_image": None,
            "comparison_images": []
        }
        
        # Stage 1: SDXL Base
        logger.info("Stage 1: SDXL base generation...")
        sdxl_result = await self.generate_with_sdxl(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height
        )
        
        if sdxl_result.get("success"):
            results["stages"].append({
                "stage": "base",
                "model": "SDXL",
                "image": sdxl_result["image"]
            })
            results["models_used"].append("SDXL")
            base_image = sdxl_result["image"]
        else:
            raise Exception(f"Base generation failed: {sdxl_result.get('error')}")
        
        # Stage 2: SDXL Refiner
        logger.info("Stage 2: SDXL Refiner...")
        try:
            from diffusers import DiffusionPipeline
            
            refiner = DiffusionPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-refiner-1.0",
                torch_dtype=self.dtype,
                use_safetensors=True,
                variant="fp16" if self.device == "cuda" else None
            ).to(self.device)
            
            refined_image = refiner(
                prompt=self._enhance_prompt(prompt, "cinematic"),
                image=base_image,
                num_inference_steps=20,
                strength=0.3
            ).images[0]
            
            results["stages"].append({
                "stage": "refined",
                "model": "SDXL Refiner",
                "image": refined_image
            })
            results["models_used"].append("SDXL Refiner")
            results["final_image"] = refined_image
            
        except Exception as e:
            logger.warning(f"Refiner not available: {e}")
            results["final_image"] = base_image
        
        # Optional: FLUX comparison
        try:
            logger.info("Bonus: FLUX.1 comparison...")
            flux_result = await self.generate_with_flux(prompt, width=width, height=height)
            if flux_result.get("success"):
                results["comparison_images"].append({
                    "model": "FLUX.1",
                    "image": flux_result["image"]
                })
                results["models_used"].append("FLUX.1")
        except Exception as e:
            logger.info(f"FLUX.1 not available for comparison: {e}")
        
        results["metadata"] = {
            "total_models": len(results["models_used"]),
            "models": results["models_used"],
            "resolution": f"{width}x{height}"
        }
        
        return results
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get information about all available models"""
        available = []
        
        for model_type, config in self.model_configs.items():
            try:
                # Quick check if model might be loadable
                available.append({
                    "id": model_type.value,
                    "name": config["name"],
                    "repo": config["repo"],
                    "vram_required": config["vram_required"],
                    "quality": config["quality"],
                    "speed": config["speed"],
                    "features": config["features"],
                    "loaded": model_type in self._pipelines
                })
            except:
                pass
        
        return {
            "device": self.device,
            "dtype": str(self.dtype),
            "models": available,
            "recommendation": self._get_recommendation()
        }
    
    def _get_recommendation(self) -> str:
        """Get model recommendation based on system"""
        if self.device == "cpu":
            return "SD 1.5 recommended for CPU (slow but works)"
        
        try:
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            if vram >= 16:
                return "FLUX.1 or SD3 recommended for 16GB+ VRAM"
            elif vram >= 12:
                return "FLUX.1 or SDXL recommended for 12GB+ VRAM"
            elif vram >= 8:
                return "SDXL recommended for 8GB+ VRAM"
            else:
                return "SD 1.5 recommended for low VRAM"
        except:
            return "SDXL recommended (balanced quality/performance)"
    
    def clear_cache(self):
        """Clear pipeline cache to free memory"""
        self._pipelines.clear()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("Pipeline cache cleared")


# Singleton instance
_generator_instance = None

def get_advanced_generator() -> AdvancedImageGenerator:
    """Get singleton instance of AdvancedImageGenerator"""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = AdvancedImageGenerator()
    return _generator_instance
