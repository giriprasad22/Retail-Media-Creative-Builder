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

# ============ DISABLED FOR RAILWAY DEPLOYMENT ============
# These require torch/diffusers which are too heavy for Railway
# Stable Diffusion, Multi-model, Advanced generator - all disabled

STABLE_DIFFUSION_AVAILABLE = False
StableDiffusionService = None
get_stable_diffusion_service = None
SDBackend = None
SDModel = None
GenerationParams = None
GenerationResult = None
logger.info("Stable Diffusion disabled - not needed for Railway deployment")

MULTI_MODEL_AVAILABLE = False
MultiModelGenerator = None
logger.info("Multi-model generator disabled - not needed for Railway deployment")

ADVANCED_GENERATOR_AVAILABLE = False
get_advanced_generator = None
AdvancedImageGenerator = None
ModelType = None
logger.info("Advanced image generator disabled - not needed for Railway deployment")

# Hybrid Image Generator - disabled (requires HuggingFace API)
HybridImageGenerator = None
get_hybrid_generator = None
logger.info("Hybrid image generator disabled - no HuggingFace API")

# Free Image API - disabled (requires external APIs)
FreeImageAPI = None
get_free_image_api = None
logger.info("Free image API disabled")

__all__ = [
    # Background Removal - WORKS
    "BackgroundRemovalService",
    "get_background_removal_service",
    "RembgModel",
    "RemovalResult",
    
    # Gemini LLM Service - WORKS (if GEMINI_API_KEY set)
    "GeminiService",
    "get_gemini_service",
    "GeminiModel",
    "GeminiResponse",
    
    # Unified AI Agent - WORKS
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
    
    # Availability flags
    "STABLE_DIFFUSION_AVAILABLE",
    "MULTI_MODEL_AVAILABLE",
    "ADVANCED_GENERATOR_AVAILABLE",
]
