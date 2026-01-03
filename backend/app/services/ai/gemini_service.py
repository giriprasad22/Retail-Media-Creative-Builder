"""
Google Gemini LLM Integration Service
Provides AI-powered creative suggestions, layout generation, and text content using Google Gemini API.
"""

import asyncio
import json
import os
from typing import Dict, Any, List, Optional, AsyncGenerator
from dataclasses import dataclass, asdict
from enum import Enum
from loguru import logger
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    # Load from project root .env file
    env_path = Path(__file__).parent.parent.parent.parent.parent / '.env'
    load_dotenv(env_path)
except ImportError:
    logger.warning("python-dotenv not installed. Using system environment variables only.")

try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-genai library not installed. Run: pip install google-genai")


class GeminiModel(str, Enum):
    """Available Gemini models for different tasks."""
    GEMINI_2_5_FLASH = "gemini-2.5-flash"  # Recommended: Latest and fastest
    GEMINI_2_FLASH = "gemini-2.0-flash-exp"
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"


@dataclass
class GeminiResponse:
    """Response from Gemini API."""
    success: bool
    response: str
    model: str
    total_duration: Optional[int] = None
    eval_count: Optional[int] = None
    error: Optional[str] = None


class GeminiService:
    """
    Google Gemini LLM Service for AI-powered creative generation.
    
    Features:
    - Creative headline/copy suggestions
    - Layout recommendations
    - Color palette suggestions
    - Compliance text checking
    - Image understanding
    - Streaming responses
    """
    
    # System prompts for different tasks
    SYSTEM_PROMPTS = {
        "creative_suggestion": """You are an expert advertising creative director. 
Generate compelling ad copy, headlines, and creative suggestions for retail marketing.
Always provide multiple options and explain why each would be effective.
Focus on: clarity, urgency, brand alignment, and call-to-action effectiveness.
Output in JSON format when asked.""",

        "layout_generator": """You are an expert UI/UX designer specializing in advertising layouts.
Generate layout suggestions with exact positioning coordinates for ad creatives.
Consider: visual hierarchy, balance, whitespace, and retailer guidelines.
Always output valid JSON with x, y, width, height for each element.""",

        "compliance_checker": """You are a retail advertising compliance expert.
Check ad copy and creative elements against retailer guidelines.
Flag any issues with: misleading claims, prohibited words, trademark violations, pricing rules.
Be specific about what needs to change and why.""",

        "color_palette": """You are a color theory expert for advertising design.
Suggest color palettes that align with brand identity and campaign mood.
Consider: contrast, accessibility, emotional impact, and retailer brand guidelines.
Output hex color codes with explanations.""",

        "image_analyzer": """You are analyzing an image for advertising creative purposes.
Describe: main subject, colors, composition, quality, and suitability for ads.
Suggest improvements and identify any compliance issues."""
    }
    
    # Creative templates for different campaign types
    CAMPAIGN_TEMPLATES = {
        "sale": {
            "headlines": [
                "{discount}% OFF - Limited Time!",
                "MEGA SALE: Save Big on {product}",
                "Flash Deal: {discount}% Off Everything",
                "Don't Miss Out - {discount}% Discount"
            ],
            "ctas": ["Shop Now", "Grab Deal", "Buy Now", "Save Today"],
            "mood": "urgent, exciting, bold"
        },
        "festive": {
            "headlines": [
                "Celebrate {festival} with Amazing Deals",
                "{festival} Special: Up to {discount}% Off",
                "Festive Season Sale is Here!",
                "Spread Joy with {festival} Offers"
            ],
            "ctas": ["Celebrate Now", "Shop Festive", "Get Festive Deals", "Unwrap Offers"],
            "mood": "joyful, celebratory, warm"
        },
        "new_arrival": {
            "headlines": [
                "Just Arrived: {product}",
                "NEW: Discover {product}",
                "Fresh Arrivals You'll Love",
                "Be First to Get {product}"
            ],
            "ctas": ["Explore Now", "Discover", "Shop New", "See What's New"],
            "mood": "fresh, exciting, exclusive"
        },
        "premium": {
            "headlines": [
                "Experience Premium Quality",
                "Luxury Meets Value",
                "The Finest {product} Collection",
                "Elevate Your Style"
            ],
            "ctas": ["Explore Collection", "Discover Luxury", "Shop Premium", "Experience Now"],
            "mood": "elegant, sophisticated, exclusive"
        }
    }
    
    def __init__(self, api_key: str = None, default_model: str = None):
        """
        Initialize Gemini service.
        
        Args:
            api_key: Google Gemini API key (reads from GEMINI_API_KEY env var if not provided)
            default_model: Default model to use (reads from GEMINI_MODEL env var if not provided)
        """
        # Load from environment variables if not provided
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.default_model = default_model or os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        self._client = None
        self._initialized = False
        
        if not self.api_key or self.api_key == 'your_api_key_here':
            logger.warning("⚠️  No valid GEMINI_API_KEY found! Set it in .env file or environment variable.")
        
        logger.info(f"Gemini service configured with model: {self.default_model}")
    
    async def initialize(self) -> bool:
        """Initialize Gemini client."""
        if not GEMINI_AVAILABLE:
            logger.warning("google-genai library not installed")
            return False
            
        try:
            # Configure API key - using exact structure from reference
            self._client = genai.Client(api_key=self.api_key)
            self._initialized = True
            logger.info(f"✓ Gemini connected. Using model: {self.default_model}")
            return True
        except Exception as e:
            logger.warning(f"Gemini not available: {e}")
        return False
    
    async def generate(
        self,
        prompt: str,
        system: str = None,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        json_mode: bool = False
    ) -> GeminiResponse:
        """
        Generate text using Gemini.
        
        Args:
            prompt: User prompt
            system: System prompt
            model: Model to use
            temperature: Creativity (0-1)
            max_tokens: Max response length
            json_mode: Request JSON output
        """
        if not GEMINI_AVAILABLE:
            return GeminiResponse(
                success=False,
                response="",
                model=model or self.default_model,
                error="google-genai library not installed"
            )
        
        if not self._initialized:
            await self.initialize()
            
        model = model or self.default_model
        
        try:
            # Build the full prompt with system context
            full_prompt = prompt
            if system:
                full_prompt = f"{system}\n\n{prompt}"
            
            if json_mode:
                full_prompt += "\n\nRespond ONLY with valid JSON, no markdown or code blocks."
            
            # Call Gemini API
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._client.models.generate_content(
                    model=model,
                    contents=full_prompt
                )
            )
            
            response_text = response.text
            
            return GeminiResponse(
                success=True,
                response=response_text,
                model=model
            )
            
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            return GeminiResponse(
                success=False,
                response="",
                model=model,
                error=str(e)
            )
    
    async def generate_stream(
        self,
        prompt: str,
        system: str = None,
        model: str = None,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """
        Generate text using Gemini with streaming.
        
        Args:
            prompt: User prompt
            system: System prompt
            model: Model to use
            temperature: Creativity (0-1)
            
        Yields:
            Chunks of generated text
        """
        if not GEMINI_AVAILABLE or not self._initialized:
            yield "Error: Gemini not available"
            return
        
        model = model or self.default_model
        
        try:
            # Build full prompt
            full_prompt = prompt
            if system:
                full_prompt = f"{system}\n\n{prompt}"
            
            # For now, use non-streaming and yield the result
            # Gemini streaming support can be added when available
            response = await self.generate(full_prompt, model=model, temperature=temperature)
            
            if response.success:
                # Simulate streaming by yielding chunks
                text = response.response
                chunk_size = 50
                for i in range(0, len(text), chunk_size):
                    yield text[i:i+chunk_size]
                    await asyncio.sleep(0.05)  # Small delay for streaming effect
            else:
                yield f"Error: {response.error}"
                
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def generate_creative_suggestions(
        self,
        product: str,
        theme: str = "sale",
        target_audience: str = "general",
        tone: str = "professional"
    ) -> Dict[str, Any]:
        """
        Generate creative suggestions for a product.
        
        Args:
            product: Product name/description
            theme: Campaign theme (sale, festive, new_arrival, premium)
            target_audience: Target audience description
            tone: Desired tone (professional, casual, urgent, luxurious)
            
        Returns:
            Dict with headlines, subheadlines, CTAs, and descriptions
        """
        template = self.CAMPAIGN_TEMPLATES.get(theme, self.CAMPAIGN_TEMPLATES["sale"])
        
        prompt = f"""Generate creative advertising copy for:
Product: {product}
Theme: {theme}
Target Audience: {target_audience}
Tone: {tone}
Campaign Mood: {template['mood']}

Provide:
1. 5 headline options (punchy, attention-grabbing)
2. 3 subheadline options (support the headline)
3. 5 CTA options (action-oriented)
4. Short description (2-3 sentences)

Output as JSON with keys: headlines, subheadlines, ctas, description"""

        response = await self.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["creative_suggestion"],
            json_mode=True
        )
        
        if response.success:
            try:
                # Try to parse JSON from response
                import re
                json_match = re.search(r'\{[\s\S]*\}', response.response)
                if json_match:
                    return json.loads(json_match.group())
            except:
                pass
        
        # Fallback to template-based
        return {
            "headlines": template["headlines"],
            "subheadlines": ["Limited time offer", "While stocks last", "Exclusive deal"],
            "ctas": template["ctas"],
            "description": f"Exciting {theme} campaign for {product}."
        }
    
    async def generate_layout_suggestion(
        self,
        width: int,
        height: int,
        elements: List[str],
        platform: str = "ecommerce"
    ) -> Dict[str, Any]:
        """
        Generate layout positioning suggestions.
        
        Args:
            width: Canvas width
            height: Canvas height
            elements: List of elements to position (headline, product, cta, etc.)
            platform: Platform type (ecommerce, social, display)
            
        Returns:
            Dict with element positions
        """
        prompt = f"""Design a {platform} ad layout for {width}x{height}px canvas.

Elements to position: {', '.join(elements)}

For each element, provide:
- x, y coordinates (top-left corner)
- width, height dimensions
- z-index (layering)
- alignment suggestion

Consider:
- Visual hierarchy (most important elements prominent)
- Balance and whitespace
- Platform best practices
- Safe zones (avoid edges)

Output as JSON with element names as keys."""

        response = await self.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["layout_generator"],
            json_mode=True
        )
        
        if response.success:
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', response.response)
                if json_match:
                    return json.loads(json_match.group())
            except:
                pass
        
        # Fallback layout
        return {
            "headline": {"x": 50, "y": 100, "width": width-100, "height": 80, "z": 2},
            "product": {"x": width//2-150, "y": height//2-150, "width": 300, "height": 300, "z": 1},
            "cta": {"x": 50, "y": height-120, "width": 200, "height": 60, "z": 3}
        }
    
    async def check_compliance(
        self,
        text: str,
        retailer: str = "general"
    ) -> Dict[str, Any]:
        """
        Check text for compliance with advertising guidelines.
        
        Args:
            text: Text to check
            retailer: Retailer name (amazon, flipkart, dmart, general)
            
        Returns:
            Dict with compliance results
        """
        prompt = f"""Check this advertising text for compliance:

Text: "{text}"
Retailer: {retailer}

Check for:
1. Misleading claims
2. Prohibited words (best, #1, guaranteed, etc.)
3. Price claim accuracy
4. Trademark issues
5. Grammar and spelling

Output as JSON with:
- compliant: true/false
- issues: list of issues found
- suggestions: list of corrections"""

        response = await self.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["compliance_checker"],
            json_mode=True
        )
        
        if response.success:
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', response.response)
                if json_match:
                    return json.loads(json_match.group())
            except:
                pass
        
        return {
            "compliant": True,
            "issues": [],
            "suggestions": []
        }
    
    async def suggest_color_palette(
        self,
        brand_name: str,
        mood: str = "professional",
        primary_color: str = None
    ) -> Dict[str, Any]:
        """
        Suggest color palette for a brand/campaign.
        
        Args:
            brand_name: Brand name
            mood: Desired mood (professional, vibrant, elegant, etc.)
            primary_color: Optional primary color to build around
            
        Returns:
            Dict with color palette
        """
        prompt = f"""Suggest a color palette for:

Brand: {brand_name}
Mood: {mood}
{f'Primary Color: {primary_color}' if primary_color else ''}

Provide:
- 5 colors (primary, secondary, accent, background, text)
- Hex codes
- Usage suggestions
- Accessibility notes (WCAG contrast)

Output as JSON."""

        response = await self.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPTS["color_palette"],
            json_mode=True
        )
        
        if response.success:
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', response.response)
                if json_match:
                    return json.loads(json_match.group())
            except:
                pass
        
        # Fallback palette
        return {
            "colors": {
                "primary": "#6366f1",
                "secondary": "#8b5cf6",
                "accent": "#10b981",
                "background": "#1a1a2e",
                "text": "#ffffff"
            },
            "usage": {
                "primary": "Main brand color, CTAs",
                "secondary": "Highlights, accents",
                "accent": "Success states, offers",
                "background": "Canvas background",
                "text": "Primary text"
            }
        }


# Global instance
_gemini_service = None

def get_gemini_service() -> GeminiService:
    """Get or create global Gemini service instance."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
