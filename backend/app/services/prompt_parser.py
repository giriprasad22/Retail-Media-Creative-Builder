"""AI Prompt Parser service for understanding natural language editing commands."""
import re
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum
from dataclasses import dataclass


class EditAction(str, Enum):
    """Supported editing actions."""
    CHANGE_BACKGROUND = "change_background"
    CHANGE_COLOR = "change_color"
    RESIZE = "resize"
    MOVE = "move"
    CHANGE_FONT = "change_font"
    CHANGE_TEXT = "change_text"
    ADD_EFFECT = "add_effect"
    REMOVE = "remove"
    DUPLICATE = "duplicate"
    ROTATE = "rotate"
    FLIP = "flip"
    CHANGE_OPACITY = "change_opacity"
    ADD_BORDER = "add_border"
    ADD_SHADOW = "add_shadow"
    CROP = "crop"
    ALIGN = "align"


class TargetRegion(str, Enum):
    """Target regions that can be edited."""
    BACKGROUND = "background"
    PRODUCT = "product"
    LOGO = "logo"
    HEADLINE = "headline"
    OFFER_TEXT = "offer_text"
    ALL_TEXT = "all_text"
    ENTIRE_CANVAS = "entire_canvas"
    SELECTED = "selected"  # User-selected region


@dataclass
class ParsedCommand:
    """Parsed editing command."""
    action: EditAction
    target: TargetRegion
    parameters: Dict[str, Any]
    confidence: float
    original_prompt: str


class PromptParser:
    """Parses natural language prompts into structured editing commands."""
    
    # Color name to hex mapping
    COLOR_MAP = {
        "red": "#FF0000", "green": "#00FF00", "blue": "#0000FF",
        "yellow": "#FFFF00", "orange": "#FFA500", "purple": "#800080",
        "pink": "#FFC0CB", "black": "#000000", "white": "#FFFFFF",
        "gray": "#808080", "grey": "#808080", "brown": "#A52A2A",
        "navy": "#000080", "teal": "#008080", "cyan": "#00FFFF",
        "magenta": "#FF00FF", "lime": "#00FF00", "maroon": "#800000",
        "olive": "#808000", "aqua": "#00FFFF", "silver": "#C0C0C0",
        "gold": "#FFD700", "coral": "#FF7F50", "salmon": "#FA8072",
        "turquoise": "#40E0D0", "violet": "#EE82EE", "indigo": "#4B0082",
        "beige": "#F5F5DC", "ivory": "#FFFFF0", "khaki": "#F0E68C",
        "lavender": "#E6E6FA", "mint": "#98FF98", "peach": "#FFCBA4",
        "sky blue": "#87CEEB", "light blue": "#ADD8E6", "dark blue": "#00008B",
        "light green": "#90EE90", "dark green": "#006400",
        "light gray": "#D3D3D3", "dark gray": "#A9A9A9",
    }
    
    # Font style keywords
    FONT_STYLES = {
        "bold": {"weight": "bold"},
        "italic": {"style": "italic"},
        "underline": {"decoration": "underline"},
        "normal": {"weight": "normal", "style": "normal"},
        "thin": {"weight": "100"},
        "light": {"weight": "300"},
        "medium": {"weight": "500"},
        "semibold": {"weight": "600"},
        "extrabold": {"weight": "800"},
        "uppercase": {"transform": "uppercase"},
        "lowercase": {"transform": "lowercase"},
        "capitalize": {"transform": "capitalize"},
    }
    
    # Position keywords
    POSITIONS = {
        "top-left": {"x": 0.05, "y": 0.05},
        "top-right": {"x": 0.8, "y": 0.05},
        "top-center": {"x": 0.4, "y": 0.05},
        "top": {"x": 0.4, "y": 0.05},
        "bottom-left": {"x": 0.05, "y": 0.85},
        "bottom-right": {"x": 0.8, "y": 0.85},
        "bottom-center": {"x": 0.4, "y": 0.85},
        "bottom": {"x": 0.4, "y": 0.85},
        "center": {"x": 0.4, "y": 0.4},
        "middle": {"x": 0.4, "y": 0.4},
        "left": {"x": 0.05, "y": 0.4},
        "right": {"x": 0.8, "y": 0.4},
    }
    
    # Action patterns with regex and keywords
    ACTION_PATTERNS = [
        # Background changes
        {
            "patterns": [
                r"(?:make|change|set)\s+(?:the\s+)?background\s+(?:to\s+)?(?:color\s+)?(\w+(?:\s+\w+)?)",
                r"background\s+(?:to\s+)?(\w+(?:\s+\w+)?)",
                r"(?:use|apply)\s+(\w+(?:\s+\w+)?)\s+background",
            ],
            "action": EditAction.CHANGE_BACKGROUND,
            "target": TargetRegion.BACKGROUND,
            "param_extractor": "_extract_color"
        },
        # Resize operations
        {
            "patterns": [
                r"(?:make|resize|scale)\s+(?:the\s+)?(\w+)\s+(?:to\s+)?(\d+)%?\s*(?:bigger|larger|smaller)?",
                r"(?:increase|enlarge|grow)\s+(?:the\s+)?(\w+)\s+(?:size\s+)?(?:by\s+)?(\d+)%?",
                r"(?:decrease|shrink|reduce)\s+(?:the\s+)?(\w+)\s+(?:size\s+)?(?:by\s+)?(\d+)%?",
                r"(\w+)\s+size\s+(?:to\s+)?(\d+)%",
            ],
            "action": EditAction.RESIZE,
            "param_extractor": "_extract_resize"
        },
        # Move operations
        {
            "patterns": [
                r"(?:move|place|put|position)\s+(?:the\s+)?(\w+)\s+(?:to\s+)?(?:the\s+)?(top-left|top-right|bottom-left|bottom-right|top|bottom|left|right|center|middle)",
                r"(\w+)\s+(?:to\s+)?(?:the\s+)?(top-left|top-right|bottom-left|bottom-right|top|bottom|left|right|center|middle)",
            ],
            "action": EditAction.MOVE,
            "param_extractor": "_extract_position"
        },
        # Font changes
        {
            "patterns": [
                r"(?:make|change|set)\s+(?:the\s+)?(?:font|text)\s+(?:to\s+)?(bold|italic|underline|normal|uppercase|lowercase)",
                r"(?:make|change)\s+(?:the\s+)?(\w+)\s+(?:text\s+)?(bold|italic|underline|normal)",
                r"(bold|italic|underline)\s+(?:the\s+)?(\w+)",
            ],
            "action": EditAction.CHANGE_FONT,
            "param_extractor": "_extract_font_style"
        },
        # Color changes for elements
        {
            "patterns": [
                r"(?:make|change|set)\s+(?:the\s+)?(\w+)\s+(?:color\s+)?(?:to\s+)?(\w+(?:\s+\w+)?)",
                r"(\w+)\s+(?:in\s+)?(\w+(?:\s+\w+)?)\s+color",
            ],
            "action": EditAction.CHANGE_COLOR,
            "param_extractor": "_extract_element_color"
        },
        # Text content changes
        {
            "patterns": [
                r"(?:change|set|update)\s+(?:the\s+)?(\w+)\s+(?:text\s+)?to\s+[\"'](.+)[\"']",
                r"(\w+)\s+(?:text\s+)?=\s*[\"'](.+)[\"']",
            ],
            "action": EditAction.CHANGE_TEXT,
            "param_extractor": "_extract_text_content"
        },
        # Add effects
        {
            "patterns": [
                r"(?:add|apply)\s+(?:a\s+)?(\w+)\s+(?:effect|filter)\s+(?:to\s+)?(?:the\s+)?(\w+)?",
                r"(?:add|apply)\s+(?:a\s+)?(shadow|border|glow|blur)\s+(?:to\s+)?(?:the\s+)?(\w+)?",
            ],
            "action": EditAction.ADD_EFFECT,
            "param_extractor": "_extract_effect"
        },
        # Opacity changes
        {
            "patterns": [
                r"(?:set|change|make)\s+(?:the\s+)?(\w+)\s+opacity\s+(?:to\s+)?(\d+)%?",
                r"(\w+)\s+(?:at\s+)?(\d+)%?\s+opacity",
            ],
            "action": EditAction.CHANGE_OPACITY,
            "param_extractor": "_extract_opacity"
        },
        # Rotation
        {
            "patterns": [
                r"(?:rotate|turn)\s+(?:the\s+)?(\w+)\s+(?:by\s+)?(\d+)\s*(?:degrees|deg|°)?",
            ],
            "action": EditAction.ROTATE,
            "param_extractor": "_extract_rotation"
        },
        # Flip
        {
            "patterns": [
                r"(?:flip|mirror)\s+(?:the\s+)?(\w+)\s+(horizontally|vertically|horizontal|vertical)",
            ],
            "action": EditAction.FLIP,
            "param_extractor": "_extract_flip"
        },
        # Alignment
        {
            "patterns": [
                r"(?:align|center)\s+(?:the\s+)?(\w+)\s+(horizontally|vertically|horizontal|vertical|center)",
            ],
            "action": EditAction.ALIGN,
            "param_extractor": "_extract_alignment"
        },
        # Remove element
        {
            "patterns": [
                r"(?:remove|delete|hide)\s+(?:the\s+)?(\w+)",
            ],
            "action": EditAction.REMOVE,
            "param_extractor": "_extract_target_only"
        },
    ]
    
    def __init__(self):
        """Initialize the prompt parser."""
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for efficiency."""
        for action_def in self.ACTION_PATTERNS:
            action_def["compiled"] = [
                re.compile(p, re.IGNORECASE) 
                for p in action_def["patterns"]
            ]
    
    def parse(self, prompt: str, selected_region: Optional[str] = None) -> List[ParsedCommand]:
        """
        Parse a natural language prompt into editing commands.
        
        Args:
            prompt: Natural language editing instruction
            selected_region: Currently selected region on canvas (if any)
            
        Returns:
            List of ParsedCommand objects
        """
        prompt = prompt.strip()
        commands = []
        
        # Try to match against all action patterns
        for action_def in self.ACTION_PATTERNS:
            for compiled_pattern in action_def["compiled"]:
                match = compiled_pattern.search(prompt)
                if match:
                    # Extract parameters using the specified extractor
                    extractor = getattr(self, action_def["param_extractor"])
                    result = extractor(match, prompt, selected_region)
                    
                    if result:
                        target, params, confidence = result
                        
                        # Override target if user has selected a region
                        if selected_region and target == TargetRegion.SELECTED:
                            target = self._map_region(selected_region)
                        
                        command = ParsedCommand(
                            action=action_def["action"],
                            target=target,
                            parameters=params,
                            confidence=confidence,
                            original_prompt=prompt
                        )
                        commands.append(command)
                        break
            
            if commands:
                break
        
        # If no patterns matched, try fuzzy matching
        if not commands:
            command = self._fuzzy_parse(prompt, selected_region)
            if command:
                commands.append(command)
        
        return commands
    
    def _map_region(self, region_str: str) -> TargetRegion:
        """Map a region string to TargetRegion enum."""
        region_map = {
            "background": TargetRegion.BACKGROUND,
            "product": TargetRegion.PRODUCT,
            "logo": TargetRegion.LOGO,
            "headline": TargetRegion.HEADLINE,
            "offer": TargetRegion.OFFER_TEXT,
            "offer_text": TargetRegion.OFFER_TEXT,
            "text": TargetRegion.ALL_TEXT,
            "all": TargetRegion.ENTIRE_CANVAS,
            "canvas": TargetRegion.ENTIRE_CANVAS,
        }
        return region_map.get(region_str.lower(), TargetRegion.SELECTED)
    
    def _extract_color(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract color from background change command."""
        color_str = match.group(1).lower().strip()
        
        # Check if it's a named color
        if color_str in self.COLOR_MAP:
            color = self.COLOR_MAP[color_str]
            confidence = 0.95
        # Check if it's a hex color
        elif re.match(r'^#?[0-9a-fA-F]{6}$', color_str):
            color = color_str if color_str.startswith('#') else f'#{color_str}'
            confidence = 0.98
        else:
            # Try to find closest color match
            color = self._find_closest_color(color_str)
            confidence = 0.7
        
        return (
            TargetRegion.BACKGROUND,
            {"color": color, "original_color_name": color_str},
            confidence
        )
    
    def _extract_resize(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract resize parameters."""
        groups = match.groups()
        
        # Determine target element
        target_str = groups[0].lower() if groups[0] else "selected"
        target = self._map_region(target_str)
        
        # Get scale percentage
        scale = int(groups[1]) if len(groups) > 1 and groups[1] else 100
        
        # Determine if increase or decrease
        if any(word in prompt.lower() for word in ["decrease", "shrink", "reduce", "smaller"]):
            scale = 100 - scale
        elif any(word in prompt.lower() for word in ["increase", "enlarge", "grow", "bigger", "larger"]):
            scale = 100 + scale
        
        return (
            target,
            {"scale_percent": scale},
            0.9
        )
    
    def _extract_position(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract position parameters."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        target = self._map_region(target_str)
        
        position_str = groups[1].lower() if len(groups) > 1 else "center"
        position = self.POSITIONS.get(position_str, {"x": 0.5, "y": 0.5})
        
        return (
            target,
            {"position": position, "position_name": position_str},
            0.92
        )
    
    def _extract_font_style(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract font style parameters."""
        groups = match.groups()
        
        # Find the style keyword
        style_str = None
        target_str = "all_text"
        
        for g in groups:
            if g:
                g_lower = g.lower()
                if g_lower in self.FONT_STYLES:
                    style_str = g_lower
                elif g_lower in ["headline", "offer", "text", "title"]:
                    target_str = g_lower
        
        if not style_str:
            return None
        
        target = self._map_region(target_str)
        style_params = self.FONT_STYLES[style_str]
        
        return (
            target,
            {"style": style_params, "style_name": style_str},
            0.88
        )
    
    def _extract_element_color(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract element and color for color change."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        color_str = groups[1].lower() if len(groups) > 1 else ""
        
        # Don't confuse with background
        if target_str == "background":
            return None
        
        target = self._map_region(target_str)
        
        if color_str in self.COLOR_MAP:
            color = self.COLOR_MAP[color_str]
            confidence = 0.9
        elif re.match(r'^#?[0-9a-fA-F]{6}$', color_str):
            color = color_str if color_str.startswith('#') else f'#{color_str}'
            confidence = 0.95
        else:
            color = self._find_closest_color(color_str)
            confidence = 0.65
        
        return (
            target,
            {"color": color, "original_color_name": color_str},
            confidence
        )
    
    def _extract_text_content(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract text content change."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "headline"
        new_text = groups[1] if len(groups) > 1 else ""
        
        target = self._map_region(target_str)
        
        return (
            target,
            {"text": new_text},
            0.95
        )
    
    def _extract_effect(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract effect parameters."""
        groups = match.groups()
        
        effect = groups[0].lower() if groups[0] else "shadow"
        target_str = groups[1].lower() if len(groups) > 1 and groups[1] else "selected"
        
        target = self._map_region(target_str)
        
        return (
            target,
            {"effect": effect},
            0.85
        )
    
    def _extract_opacity(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract opacity parameters."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        opacity = int(groups[1]) if len(groups) > 1 and groups[1] else 100
        
        target = self._map_region(target_str)
        
        return (
            target,
            {"opacity": min(100, max(0, opacity))},
            0.9
        )
    
    def _extract_rotation(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract rotation parameters."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        degrees = int(groups[1]) if len(groups) > 1 and groups[1] else 0
        
        target = self._map_region(target_str)
        
        return (
            target,
            {"degrees": degrees},
            0.92
        )
    
    def _extract_flip(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract flip parameters."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        direction = groups[1].lower() if len(groups) > 1 else "horizontal"
        
        target = self._map_region(target_str)
        
        # Normalize direction
        if direction in ["horizontally", "horizontal"]:
            direction = "horizontal"
        else:
            direction = "vertical"
        
        return (
            target,
            {"direction": direction},
            0.95
        )
    
    def _extract_alignment(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract alignment parameters."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        alignment = groups[1].lower() if len(groups) > 1 else "center"
        
        target = self._map_region(target_str)
        
        return (
            target,
            {"alignment": alignment},
            0.88
        )
    
    def _extract_target_only(self, match, prompt: str, selected_region: Optional[str]) -> Optional[Tuple]:
        """Extract just the target element."""
        groups = match.groups()
        
        target_str = groups[0].lower() if groups[0] else "selected"
        target = self._map_region(target_str)
        
        return (
            target,
            {},
            0.85
        )
    
    def _find_closest_color(self, color_str: str) -> str:
        """Find the closest matching color name."""
        color_str = color_str.lower()
        
        # Check for partial matches
        for name, hex_val in self.COLOR_MAP.items():
            if color_str in name or name in color_str:
                return hex_val
        
        # Default to a neutral gray
        return "#808080"
    
    def _fuzzy_parse(self, prompt: str, selected_region: Optional[str]) -> Optional[ParsedCommand]:
        """Attempt fuzzy parsing for unmatched prompts."""
        prompt_lower = prompt.lower()
        
        # Check for color-related keywords
        for color_name, color_hex in self.COLOR_MAP.items():
            if color_name in prompt_lower:
                # Determine if it's a background or element color change
                if "background" in prompt_lower:
                    return ParsedCommand(
                        action=EditAction.CHANGE_BACKGROUND,
                        target=TargetRegion.BACKGROUND,
                        parameters={"color": color_hex},
                        confidence=0.6,
                        original_prompt=prompt
                    )
                elif selected_region:
                    return ParsedCommand(
                        action=EditAction.CHANGE_COLOR,
                        target=self._map_region(selected_region),
                        parameters={"color": color_hex},
                        confidence=0.5,
                        original_prompt=prompt
                    )
        
        # Check for size-related keywords
        if any(word in prompt_lower for word in ["bigger", "larger", "increase", "grow"]):
            target = self._map_region(selected_region) if selected_region else TargetRegion.SELECTED
            return ParsedCommand(
                action=EditAction.RESIZE,
                target=target,
                parameters={"scale_percent": 120},
                confidence=0.5,
                original_prompt=prompt
            )
        
        if any(word in prompt_lower for word in ["smaller", "decrease", "shrink", "reduce"]):
            target = self._map_region(selected_region) if selected_region else TargetRegion.SELECTED
            return ParsedCommand(
                action=EditAction.RESIZE,
                target=target,
                parameters={"scale_percent": 80},
                confidence=0.5,
                original_prompt=prompt
            )
        
        return None
    
    def get_supported_commands(self) -> Dict[str, List[str]]:
        """Return a list of example commands for each action type."""
        return {
            "Background": [
                "Make the background blue",
                "Change background to #FF5733",
                "Set background color to light gray",
            ],
            "Resize": [
                "Increase product size by 20%",
                "Make logo smaller by 30%",
                "Resize headline to 150%",
            ],
            "Move": [
                "Move logo to top-right",
                "Place product in center",
                "Put headline at bottom",
            ],
            "Font Style": [
                "Make text bold",
                "Change font to italic",
                "Make headline uppercase",
            ],
            "Color": [
                "Make headline text red",
                "Change logo color to gold",
            ],
            "Effects": [
                "Add shadow to product",
                "Apply blur effect to background",
            ],
            "Other": [
                "Rotate product by 45 degrees",
                "Flip logo horizontally",
                "Set product opacity to 80%",
                "Remove offer text",
            ]
        }
