"""
Tesco Compliance Utilities
Helper functions for Tesco-specific guideline validation
"""
from typing import Dict, List, Tuple, Optional, Any
import re


class TescoComplianceChecker:
    """Utilities for checking Tesco-specific compliance rules."""
    
    # Tesco brand colors
    TESCO_BLUE = "#0050AA"
    TESCO_RED = "#EE1C2E"
    
    # Forbidden patterns for copy validation
    FORBIDDEN_TCS = [
        r"terms\s+and\s+conditions",
        r"t&c[s]?",
        r"terms\s+apply",
        r"conditions\s+apply",
        r"\*"
    ]
    
    FORBIDDEN_COMPETITION = [
        r"competition",
        r"win\s",
        r"prize",
        r"enter\s+to\s+win",
        r"giveaway",
        r"contest"
    ]
    
    FORBIDDEN_SUSTAINABILITY = [
        r"eco-friendly",
        r"sustainable",
        r"carbon\s+neutral",
        r"green",
        r"environmentally\s+friendly",
        r"carbon\s+footprint",
        r"planet-friendly",
        r"climate"
    ]
    
    FORBIDDEN_CHARITY = [
        r"charity",
        r"donation",
        r"proceeds\s+go\s+to",
        r"supporting",
        r"fundraising"
    ]
    
    FORBIDDEN_PRICE_CALLOUTS = [
        r"£",
        r"\$",
        r"€",
        r"\d+%\s+off",
        r"discount",
        r"save\s+",
        r"deal",
        r"offer",
        r"sale",
        r"was\s+£",
        r"now\s+£"
    ]
    
    FORBIDDEN_GUARANTEES = [
        r"money\s*back",
        r"money-back",
        r"refund",
        r"guarantee[d]?"
    ]
    
    FORBIDDEN_CLAIMS = [
        r"\*",
        r"survey\s+says",
        r"proven",
        r"clinical",
        r"scientific",
        r"tested",
        r"award-winning",
        r"best",
        r"number\s+1",
        r"#1"
    ]
    
    # Approved Tesco tags
    APPROVED_TAGS = [
        "Only at Tesco",
        "Available at Tesco",
        "Selected stores. While stocks last"
    ]
    
    CLUBCARD_TAG_PATTERN = r"Available in selected stores\. Clubcard/app required\. Ends \d{2}/\d{2}"
    
    @staticmethod
    def check_copy_violations(text: str, category: str) -> Dict[str, Any]:
        """
        Check text for forbidden patterns.
        
        Args:
            text: Text to check
            category: Category of check (tcs, competition, sustainability, etc.)
            
        Returns:
            Dict with 'passed' bool and 'violations' list
        """
        text_lower = text.lower()
        violations = []
        
        pattern_map = {
            "tcs": TescoComplianceChecker.FORBIDDEN_TCS,
            "competition": TescoComplianceChecker.FORBIDDEN_COMPETITION,
            "sustainability": TescoComplianceChecker.FORBIDDEN_SUSTAINABILITY,
            "charity": TescoComplianceChecker.FORBIDDEN_CHARITY,
            "price_callouts": TescoComplianceChecker.FORBIDDEN_PRICE_CALLOUTS,
            "guarantees": TescoComplianceChecker.FORBIDDEN_GUARANTEES,
            "claims": TescoComplianceChecker.FORBIDDEN_CLAIMS
        }
        
        patterns = pattern_map.get(category, [])
        
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                violations.append(pattern)
        
        return {
            "passed": len(violations) == 0,
            "violations": violations,
            "category": category
        }
    
    @staticmethod
    def validate_tesco_tag(tag_text: str) -> Dict[str, Any]:
        """
        Validate if tag is an approved Tesco tag.
        
        Args:
            tag_text: Tag text to validate
            
        Returns:
            Dict with 'valid' bool and 'message' string
        """
        # Check exact match with approved tags
        if tag_text in TescoComplianceChecker.APPROVED_TAGS:
            return {"valid": True, "message": "Approved Tesco tag"}
        
        # Check Clubcard tag pattern
        if re.match(TescoComplianceChecker.CLUBCARD_TAG_PATTERN, tag_text):
            return {"valid": True, "message": "Valid Clubcard tag"}
        
        return {
            "valid": False,
            "message": f"Invalid tag. Must be one of: {', '.join(TescoComplianceChecker.APPROVED_TAGS)}"
        }
    
    @staticmethod
    def check_social_safe_zone(
        element_y: int,
        element_height: int,
        canvas_height: int,
        format_ratio: str = "9:16"
    ) -> Dict[str, Any]:
        """
        Check if element is in safe zone for social formats.
        
        Args:
            element_y: Top position of element
            element_height: Height of element
            canvas_height: Total canvas height
            format_ratio: Format ratio (e.g., "9:16")
            
        Returns:
            Dict with 'in_safe_zone' bool and details
        """
        if format_ratio != "9:16":
            return {"in_safe_zone": True, "message": "Safe zone only applies to 9:16 format"}
        
        top_margin = 200
        bottom_margin = 250
        
        element_bottom = element_y + element_height
        
        # Check if element is in restricted zones
        in_top_zone = element_y < top_margin
        in_bottom_zone = element_bottom > (canvas_height - bottom_margin)
        
        if in_top_zone or in_bottom_zone:
            return {
                "in_safe_zone": False,
                "message": f"Element must be at least {top_margin}px from top and {bottom_margin}px from bottom",
                "details": {
                    "element_y": element_y,
                    "element_bottom": element_bottom,
                    "top_violation": in_top_zone,
                    "bottom_violation": in_bottom_zone
                }
            }
        
        return {"in_safe_zone": True, "message": "Element in safe zone"}
    
    @staticmethod
    def calculate_contrast_ratio(color1: str, color2: str) -> float:
        """
        Calculate WCAG contrast ratio between two hex colors.
        
        Args:
            color1: First color (hex)
            color2: Second color (hex)
            
        Returns:
            Contrast ratio as float
        """
        def get_luminance(hex_color: str) -> float:
            """Calculate relative luminance."""
            hex_color = hex_color.lstrip('#')
            
            # Convert to RGB (0-1)
            r, g, b = tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
            
            # Adjust for gamma
            def adjust(c):
                return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
            
            r, g, b = adjust(r), adjust(g), adjust(b)
            
            # Calculate luminance
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        
        try:
            l1 = get_luminance(color1)
            l2 = get_luminance(color2)
            
            lighter = max(l1, l2)
            darker = min(l1, l2)
            
            return (lighter + 0.05) / (darker + 0.05)
        except Exception as e:
            print(f"Error calculating contrast: {e}")
            return 1.0
    
    @staticmethod
    def check_wcag_aa_compliance(
        text_color: str,
        bg_color: str,
        font_size: int,
        is_bold: bool = False
    ) -> Dict[str, Any]:
        """
        Check WCAG AA compliance for text contrast.
        
        Args:
            text_color: Text color (hex)
            bg_color: Background color (hex)
            font_size: Font size in pixels
            is_bold: Whether text is bold
            
        Returns:
            Dict with compliance info
        """
        ratio = TescoComplianceChecker.calculate_contrast_ratio(text_color, bg_color)
        
        # Large text: 18pt+ (24px+) or 14pt+ bold (18.66px+)
        is_large_text = font_size >= 24 or (is_bold and font_size >= 19)
        
        # WCAG AA requirements
        required_ratio = 3.0 if is_large_text else 4.5
        
        passes = ratio >= required_ratio
        
        return {
            "passes": passes,
            "ratio": round(ratio, 2),
            "required": required_ratio,
            "is_large_text": is_large_text,
            "message": f"Contrast ratio {ratio:.2f}:1 ({'PASS' if passes else 'FAIL'} - minimum {required_ratio}:1)"
        }
    
    @staticmethod
    def validate_value_tile(
        tile_type: str,
        position: Dict[str, int],
        canvas_width: int,
        canvas_height: int
    ) -> Dict[str, Any]:
        """
        Validate Tesco value tile positioning and size.
        
        Args:
            tile_type: Type of value tile (new, white, clubcard)
            position: Dict with x, y, width, height
            canvas_width: Canvas width
            canvas_height: Canvas height
            
        Returns:
            Dict with validation results
        """
        # Value tiles should be in top portion of creative
        ideal_y_range = (20, 100)  # Top 100px typically
        
        in_ideal_position = ideal_y_range[0] <= position['y'] <= ideal_y_range[1]
        
        # Check if tile is too small
        min_heights = {"new": 40, "white": 45, "clubcard": 60}
        min_height = min_heights.get(tile_type, 40)
        
        sufficient_height = position['height'] >= min_height
        
        return {
            "valid": in_ideal_position and sufficient_height,
            "in_ideal_position": in_ideal_position,
            "sufficient_height": sufficient_height,
            "warnings": [] if in_ideal_position and sufficient_height else [
                "Value tile should be in top 100px" if not in_ideal_position else "",
                f"Minimum height {min_height}px" if not sufficient_height else ""
            ]
        }
    
    @staticmethod
    def validate_packshot_gap(
        packshot_pos: Dict[str, int],
        cta_pos: Dict[str, int],
        format_type: str = "brand"
    ) -> Dict[str, Any]:
        """
        Validate gap between packshot and CTA.
        
        Args:
            packshot_pos: Packshot position dict with x, y, width, height
            cta_pos: CTA position dict with x, y, width, height
            format_type: Format type (brand, checkoutDoubleDensity, checkoutSingleDensity)
            
        Returns:
            Dict with validation results
        """
        min_gaps = {
            "brand": 24,
            "checkoutDoubleDensity": 24,
            "checkoutSingleDensity": 12
        }
        
        required_gap = min_gaps.get(format_type, 24)
        
        # Calculate actual gap (vertical distance)
        packshot_bottom = packshot_pos['y'] + packshot_pos['height']
        actual_gap = cta_pos['y'] - packshot_bottom
        
        sufficient_gap = actual_gap >= required_gap
        
        return {
            "valid": sufficient_gap,
            "actual_gap": actual_gap,
            "required_gap": required_gap,
            "message": f"Gap: {actual_gap}px ({'PASS' if sufficient_gap else 'FAIL'} - minimum {required_gap}px)"
        }
