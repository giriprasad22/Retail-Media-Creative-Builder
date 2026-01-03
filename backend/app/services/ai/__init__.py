"""
AI Services Package for Retail Media Creative Builder

This package provides advanced AI capabilities for creative generation,
compliance checking, and natural language editing.

Services:
- UnifiedAIAgent: Unified AI agent using Gemini for all capabilities
- GeminiService: Google Gemini LLM integration
- AdvancedImageGenerator: SDXL/SD3/FLUX image generation
- MultiModelGenerator: Multi-model image pipeline
- StableDiffusionService: Stable Diffusion integration
- BackgroundRemovalService: Product background removal with rembg
"""

from loguru import logger

# Background Removal
from .background_removal import (
    BackgroundRemovalService,
    get_background_removal_service,
    RembgModel,
    RemovalResult
)

# Gemini LLM Service (replaces Ollama)
from .gemini_service import (
    GeminiService,
    get_gemini_service,
    GeminiModel,
    GeminiResponse
)

# Unified AI Agent (main agent)
from .unified_agent import (
    UnifiedAIAgent,
    get_unified_agent,
    DocumentModel,
    Block,
    Patch,
    PatchOp,
    PatchOperation,
    Suggestion,
    EditIntent,
    Language
)

# Stable Diffusion (optional - may fail if diffusers not properly installed)
try:
    from .stable_diffusion import (
        StableDiffusionService,
        get_stable_diffusion_service,
        SDBackend,
        SDModel,
        GenerationParams,
        GenerationResult
    )
    STABLE_DIFFUSION_AVAILABLE = True
except (ImportError, RuntimeError) as e:
    logger.warning(f"Stable Diffusion not available: {e}")
    STABLE_DIFFUSION_AVAILABLE = False
    StableDiffusionService = None
    get_stable_diffusion_service = None
    SDBackend = None
    SDModel = None
    GenerationParams = None
    GenerationResult = None

# Multi-model generator (optional - depends on stable_diffusion)
try:
    from .multi_model_generator import (
        MultiModelGenerator
    )
    MULTI_MODEL_AVAILABLE = True
except (ImportError, RuntimeError) as e:
    logger.warning(f"Multi-model generator not available: {e}")
    MULTI_MODEL_AVAILABLE = False
    MultiModelGenerator = None

# Advanced image generator (optional - depends on diffusers)
try:
    from .advanced_image_generator import (
        get_advanced_generator,
        AdvancedImageGenerator,
        ModelType
    )
    ADVANCED_GENERATOR_AVAILABLE = True
except (ImportError, RuntimeError) as e:
    logger.warning(f"Advanced image generator not available: {e}")
    ADVANCED_GENERATOR_AVAILABLE = False
    get_advanced_generator = None
    AdvancedImageGenerator = None
    ModelType = None

# Hybrid Image Generator (AUTO-SWITCHES: Local ↔ API)
from .hybrid_image_gen import (
    HybridImageGenerator,
    get_hybrid_generator
)

# Free Image API (for cloud deployment)
from .free_image_api import (
    FreeImageAPI,
    get_free_image_api
)

__all__ = [
    # Background Removal
    "BackgroundRemovalService",
    "get_background_removal_service",
    "RembgModel",
    "RemovalResult",
    
    # Gemini LLM Service (replaces Ollama)
    "GeminiService",
    "get_gemini_service",
    "GeminiModel",
    "GeminiResponse",
    
    # Unified AI Agent
    "UnifiedAIAgent",
    "get_unified_agent",
    "DocumentModel",
    "Block",
    "Patch",
    "PatchOp",
    "PatchOperation",
    "Suggestion",
    "EditIntent",
    "Language",
    
    # Stable Diffusion
    "StableDiffusionService",
    "get_stable_diffusion_service",
    "SDBackend",
    "SDModel",
    "GenerationParams",
    "GenerationResult",
    
    # Multi-model generator (optional)
    "MultiModelGenerator",
    
    # Advanced image generator (optional)
    "get_advanced_generator",
    "AdvancedImageGenerator",
    "ModelType",
    
    # Hybrid Image Generator (recommended)
    "HybridImageGenerator",
    "get_hybrid_generator",
    
    # Free Image API
    "FreeImageAPI",
    "get_free_image_api",
    
    # Availability flags
    "STABLE_DIFFUSION_AVAILABLE",
    "MULTI_MODEL_AVAILABLE",
    "ADVANCED_GENERATOR_AVAILABLE",
]
