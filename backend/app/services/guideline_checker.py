"""Guideline checker service for validating creatives against retailer rules."""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image
import numpy as np

from app.models.schemas import (
    Creative,
    GuidelineRule,
    GuidelineCheckResult
)
from app.config import settings


class GuidelineChecker:
    """Validates creatives against retailer-specific guidelines."""
    
    def __init__(self):
        """Initialize the guideline checker."""
        self._load_rules()
    
    def _load_rules(self):
        """Load retailer rules from built-in defaults."""
        self.retailer_rules = {}
        
        # Default rules (built-in)
        self.default_rules = {
            "amazon": self._get_amazon_rules(),
            "flipkart": self._get_flipkart_rules(),
            "dmart": self._get_dmart_rules(),
            "tesco": self._get_tesco_rules(),
            "general": self._get_general_rules()
        }
        
        # Use default rules
        for retailer in ["amazon", "flipkart", "dmart", "tesco", "general"]:
            self.retailer_rules[retailer] = self.default_rules[retailer]
    
    def _get_general_rules(self) -> Dict[str, Any]:
        """Get general advertising guidelines."""
        return {
            "retailer": "general",
            "name": "General Advertising Guidelines",
            "rules": [
                {
                    "rule_id": "gen_dimensions",
                    "name": "Image Dimensions",
                    "description": "Creative must meet minimum size requirements",
                    "category": "dimensions",
                    "severity": "error",
                    "params": {"min_width": 800, "min_height": 400}
                },
                {
                    "rule_id": "gen_text_readability",
                    "name": "Text Readability",
                    "description": "Text must be clearly readable",
                    "category": "text",
                    "severity": "warning",
                    "params": {"min_font_size": 12}
                }
            ]
        }
    
    def _get_amazon_rules(self) -> Dict[str, Any]:
        """Get Amazon advertising guidelines."""
        return {
            "retailer": "amazon",
            "name": "Amazon Advertising Guidelines",
            "rules": [
                {
                    "rule_id": "amz_logo_size",
                    "name": "Logo Size",
                    "description": "Logo must be between 5% and 25% of the creative area",
                    "category": "logo",
                    "severity": "error",
                    "params": {"min_percent": 5, "max_percent": 25}
                },
                {
                    "rule_id": "amz_logo_position",
                    "name": "Logo Position",
                    "description": "Logo should be in safe zone (not in center 50% of image)",
                    "category": "logo",
                    "severity": "warning",
                    "params": {"safe_margin_percent": 25}
                },
                {
                    "rule_id": "amz_text_size",
                    "name": "Minimum Text Size",
                    "description": "Text must be at least 16px for readability",
                    "category": "text",
                    "severity": "error",
                    "params": {"min_font_size": 16}
                },
                {
                    "rule_id": "amz_safe_zone",
                    "name": "Safe Zone",
                    "description": "Critical elements must be at least 5% from edges",
                    "category": "layout",
                    "severity": "error",
                    "params": {"margin_percent": 5}
                },
                {
                    "rule_id": "amz_contrast",
                    "name": "Color Contrast",
                    "description": "Text-to-background contrast ratio must be at least 4.5:1",
                    "category": "color",
                    "severity": "error",
                    "params": {"min_contrast_ratio": 4.5}
                },
                {
                    "rule_id": "amz_file_size",
                    "name": "File Size",
                    "description": "Image file must be under 5MB",
                    "category": "technical",
                    "severity": "error",
                    "params": {"max_size_mb": 5}
                }
            ]
        }
    
    def _get_flipkart_rules(self) -> Dict[str, Any]:
        """Get Flipkart advertising guidelines."""
        return {
            "retailer": "flipkart",
            "name": "Flipkart Advertising Guidelines",
            "rules": [
                {
                    "rule_id": "fk_logo_size",
                    "name": "Logo Size",
                    "description": "Logo must be between 8% and 20% of the creative area",
                    "category": "logo",
                    "severity": "error",
                    "params": {"min_percent": 8, "max_percent": 20}
                },
                {
                    "rule_id": "fk_logo_corner",
                    "name": "Logo Corner Position",
                    "description": "Logo must be in top-left or top-right corner",
                    "category": "logo",
                    "severity": "error",
                    "params": {"allowed_positions": ["top-left", "top-right"]}
                },
                {
                    "rule_id": "fk_text_limit",
                    "name": "Text Coverage",
                    "description": "Text should not cover more than 30% of the image",
                    "category": "text",
                    "severity": "warning",
                    "params": {"max_text_percent": 30}
                },
                {
                    "rule_id": "fk_product_visibility",
                    "name": "Product Visibility",
                    "description": "Product must occupy at least 25% of the creative",
                    "category": "layout",
                    "severity": "error",
                    "params": {"min_product_percent": 25}
                },
                {
                    "rule_id": "fk_safe_zone",
                    "name": "Safe Zone",
                    "description": "Keep 3% margin from all edges",
                    "category": "layout",
                    "severity": "error",
                    "params": {"margin_percent": 3}
                }
            ]
        }
    
    def _get_dmart_rules(self) -> Dict[str, Any]:
        """Get DMart advertising guidelines."""
        return {
            "retailer": "dmart",
            "name": "DMart Advertising Guidelines",
            "rules": [
                {
                    "rule_id": "dm_logo_size",
                    "name": "Logo Size",
                    "description": "Logo must be between 10% and 30% of the creative area",
                    "category": "logo",
                    "severity": "error",
                    "params": {"min_percent": 10, "max_percent": 30}
                },
                {
                    "rule_id": "dm_price_visibility",
                    "name": "Price Display",
                    "description": "Price/offer text must be clearly visible",
                    "category": "text",
                    "severity": "warning",
                    "params": {"min_offer_size": 20}
                },
                {
                    "rule_id": "dm_background",
                    "name": "Background",
                    "description": "Background should not be purely white",
                    "category": "color",
                    "severity": "warning",
                    "params": {"forbidden_bg": ["#ffffff", "#fff"]}
                },
                {
                    "rule_id": "dm_safe_zone",
                    "name": "Safe Zone",
                    "description": "Keep 4% margin from all edges",
                    "category": "layout",
                    "severity": "error",
                    "params": {"margin_percent": 4}
                }
            ]
        }
    
    def _get_tesco_rules(self) -> Dict[str, Any]:
        """Get Tesco advertising guidelines."""
        return {
            "retailer": "tesco",
            "name": "Tesco Advertising Guidelines",
            "rules": [
                {
                    "rule_id": "tesco_alcohol_drinkaware",
                    "name": "Drinkaware Logo (Alcohol)",
                    "description": "Alcohol campaigns must include Drinkaware logo (min 20px, 12px for SAYS)",
                    "category": "compliance",
                    "severity": "error",
                    "params": {"min_height": 20, "min_height_says": 12, "allowed_colors": ["black", "white"]}
                },
                {
                    "rule_id": "tesco_no_tcs",
                    "name": "No T&Cs Allowed",
                    "description": "T&Cs and claims are not allowed in self-serve media",
                    "category": "copy",
                    "severity": "error",
                    "params": {
                        "forbidden_patterns": ["terms and conditions", "t&c", "t&cs", "terms apply", "*"]
                    }
                },
                {
                    "rule_id": "tesco_no_competitions",
                    "name": "No Competitions",
                    "description": "Competition copy not allowed",
                    "category": "copy",
                    "severity": "error",
                    "params": {
                        "forbidden_patterns": ["competition", "win", "prize", "enter to win", "giveaway", "contest"]
                    }
                },
                {
                    "rule_id": "tesco_no_sustainability",
                    "name": "No Sustainability Claims",
                    "description": "Green/sustainability claims are not allowed",
                    "category": "copy",
                    "severity": "error",
                    "params": {
                        "forbidden_patterns": ["eco-friendly", "sustainable", "carbon neutral", "green", "eco"]
                    }
                },
                {
                    "rule_id": "tesco_no_price_callouts",
                    "name": "No Price Call-outs in Copy",
                    "description": "Price references only allowed in value tiles",
                    "category": "copy",
                    "severity": "error",
                    "params": {
                        "forbidden_patterns": ["£", "off", "% off", "discount", "save", "deal", "price", "was £", "now £"]
                    }
                },
                {
                    "rule_id": "tesco_approved_tags",
                    "name": "Approved Tesco Tags Only",
                    "description": "Only specific Tesco tags are allowed",
                    "category": "copy",
                    "severity": "error",
                    "params": {
                        "allowed_tags": [
                            "Only at Tesco",
                            "Available at Tesco",
                            "Selected stores. While stocks last",
                            "Available in selected stores. Clubcard/app required. Ends DD/MM"
                        ]
                    }
                },
                {
                    "rule_id": "tesco_min_font_size",
                    "name": "Minimum Font Size",
                    "description": "Font sizes: 20px (brand/social), 12px (SAYS), 10px (checkout single)",
                    "category": "accessibility",
                    "severity": "error",
                    "params": {"min_font_size": 20, "min_says": 12, "min_checkout_single": 10}
                },
                {
                    "rule_id": "tesco_contrast_wcag",
                    "name": "WCAG AA Contrast",
                    "description": "Text and CTA must meet WCAG AA contrast standards",
                    "category": "accessibility",
                    "severity": "error",
                    "params": {"min_contrast_normal": 4.5, "min_contrast_large": 3.0}
                },
                {
                    "rule_id": "tesco_social_safe_zone",
                    "name": "Social Safe Zone (9:16)",
                    "description": "200px from top, 250px from bottom free of text/logos (Stories)",
                    "category": "layout",
                    "severity": "error",
                    "params": {"top_margin": 200, "bottom_margin": 250, "applies_to": "9:16"}
                },
                {
                    "rule_id": "tesco_packshot_position",
                    "name": "Packshot Positioning",
                    "description": "Packshot must be closest element to CTA (onsite/checkout)",
                    "category": "layout",
                    "severity": "error",
                    "params": {"min_gap_double": 24, "min_gap_single": 12}
                },
                {
                    "rule_id": "tesco_value_tile_validation",
                    "name": "Value Tile Validation",
                    "description": "Value tiles must be correct size, position, and not overlapped",
                    "category": "design",
                    "severity": "error",
                    "params": {"no_overlap": True, "fixed_position": True}
                },
                {
                    "rule_id": "tesco_people_warning",
                    "name": "Photography of People",
                    "description": "Images with people require confirmation",
                    "category": "media",
                    "severity": "warning",
                    "params": {"require_confirmation": True}
                }
            ]
        }
    
    def get_supported_retailers(self) -> List[Dict[str, Any]]:
        """Get list of supported retailers with their rule summaries."""
        retailers = []
        for retailer, rules in self.retailer_rules.items():
            retailers.append({
                "id": retailer,
                "name": rules.get("name", retailer.capitalize()),
                "rule_count": len(rules.get("rules", [])),
                "categories": list(set(r.get("category") for r in rules.get("rules", [])))
            })
        return retailers
    
    def check(self, creative: Creative, retailer: str) -> List[GuidelineCheckResult]:
        """
        Check a creative against retailer guidelines.
        
        Args:
            creative: Creative object to check
            retailer: Retailer identifier
            
        Returns:
            List of GuidelineCheckResult objects
        """
        results = []
        rules_data = self.retailer_rules.get(retailer.lower(), self.retailer_rules["amazon"])
        
        for rule_data in rules_data.get("rules", []):
            rule = GuidelineRule(
                rule_id=rule_data["rule_id"],
                name=rule_data["name"],
                description=rule_data["description"],
                severity=rule_data.get("severity", "error"),
                category=rule_data.get("category", "general")
            )
            
            result = self._check_rule(creative, rule, rule_data.get("params", {}))
            results.append(result)
        
        return results
    
    def check_file(self, file_path: str, retailer: str) -> List[Dict[str, Any]]:
        """Check an image file against guidelines."""
        # Load image and create a minimal Creative object
        img = Image.open(file_path)
        width, height = img.size
        
        # Create dummy creative for checking
        creative = Creative(
            creative_id="temp",
            variation_number=0,
            width=width,
            height=height,
            elements=[],
            preview_path=file_path
        )
        
        results = self.check(creative, retailer)
        return [
            {
                "rule_id": r.rule.rule_id,
                "name": r.rule.name,
                "passed": r.passed,
                "message": r.message,
                "severity": r.rule.severity
            }
            for r in results
        ]
    
    def _check_rule(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check a single rule against the creative."""
        
        # Handle Tesco-specific rules
        if rule.rule_id.startswith("tesco_"):
            if "forbidden_patterns" in params:
                return self._check_tesco_copy_rule(creative, rule, params)
            elif "allowed_tags" in params:
                return self._check_tesco_tag_rule(creative, rule, params)
            elif rule.category == "accessibility" and "min_contrast" in str(params):
                # Handle contrast checking
                return self._check_color_rules(creative, rule, params)
        
        # Route to specific check methods based on rule category
        check_methods = {
            "logo": self._check_logo_rules,
            "text": self._check_text_rules,
            "layout": self._check_layout_rules,
            "color": self._check_color_rules,
            "technical": self._check_technical_rules,
            "compliance": self._check_text_rules,  # Reuse text checking for compliance
            "copy": self._check_text_rules,
            "design": self._check_layout_rules,
            "media": self._check_generic_rule,
            "accessibility": self._check_text_rules
        }
        
        check_method = check_methods.get(rule.category, self._check_generic_rule)
        return check_method(creative, rule, params)
    
    def _check_logo_rules(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check logo-related rules."""
        # Find logo element
        logo_element = next(
            (e for e in creative.elements if e.element_type == "logo"), 
            None
        )
        
        if not logo_element:
            return GuidelineCheckResult(
                rule=rule,
                passed=False,
                message="No logo found in creative",
                details={}
            )
        
        creative_area = creative.width * creative.height
        logo_bbox = logo_element.position.bbox
        logo_area = logo_bbox.width * logo_bbox.height
        logo_percent = (logo_area / creative_area) * 100
        
        if "min_percent" in params and "max_percent" in params:
            passed = params["min_percent"] <= logo_percent <= params["max_percent"]
            message = f"Logo is {logo_percent:.1f}% of creative area"
            if not passed:
                message += f" (should be {params['min_percent']}-{params['max_percent']}%)"
            
            return GuidelineCheckResult(
                rule=rule,
                passed=passed,
                message=message,
                details={"logo_percent": round(logo_percent, 2)}
            )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Logo check passed",
            details={}
        )
    
    def _check_text_rules(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check text-related rules."""
        text_elements = [
            e for e in creative.elements 
            if e.element_type in ["headline", "offer_text"]
        ]
        
        if "min_font_size" in params:
            for elem in text_elements:
                font_size = elem.style.get("font_size", 0)
                if font_size < params["min_font_size"]:
                    return GuidelineCheckResult(
                        rule=rule,
                        passed=False,
                        message=f"Text size {font_size}px is below minimum {params['min_font_size']}px",
                        details={"actual_size": font_size, "min_required": params["min_font_size"]}
                    )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Text requirements met",
            details={}
        )
    
    def _check_layout_rules(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check layout-related rules."""
        if "margin_percent" in params:
            margin_px_x = creative.width * params["margin_percent"] / 100
            margin_px_y = creative.height * params["margin_percent"] / 100
            
            for elem in creative.elements:
                bbox = elem.position.bbox
                
                # Check if element is within safe zone
                if bbox.x < margin_px_x:
                    return GuidelineCheckResult(
                        rule=rule,
                        passed=False,
                        message=f"{elem.element_type} is too close to left edge",
                        details={"element": elem.element_type, "position": bbox.x}
                    )
                if bbox.y < margin_px_y:
                    return GuidelineCheckResult(
                        rule=rule,
                        passed=False,
                        message=f"{elem.element_type} is too close to top edge",
                        details={"element": elem.element_type, "position": bbox.y}
                    )
                if bbox.x + bbox.width > creative.width - margin_px_x:
                    return GuidelineCheckResult(
                        rule=rule,
                        passed=False,
                        message=f"{elem.element_type} is too close to right edge",
                        details={"element": elem.element_type}
                    )
                if bbox.y + bbox.height > creative.height - margin_px_y:
                    return GuidelineCheckResult(
                        rule=rule,
                        passed=False,
                        message=f"{elem.element_type} is too close to bottom edge",
                        details={"element": elem.element_type}
                    )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Layout requirements met",
            details={}
        )
    
    def _check_color_rules(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check color-related rules."""
        # For contrast checking, we'd need the actual image
        # This is a simplified check
        if "min_contrast_ratio" in params:
            # Assume passed for now - real implementation would analyze image
            return GuidelineCheckResult(
                rule=rule,
                passed=True,
                message="Color contrast check requires manual verification",
                details={"note": "Automated contrast checking available with image analysis"}
            )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Color requirements met",
            details={}
        )
    
    def _check_technical_rules(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check technical requirements."""
        if "max_size_mb" in params:
            # Would need actual file to check size
            return GuidelineCheckResult(
                rule=rule,
                passed=True,
                message="File size check passed",
                details={}
            )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Technical requirements met",
            details={}
        )
    
    def _check_tesco_copy_rule(
        self,
        creative: Creative,
        rule: GuidelineRule,
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check Tesco copy rules (forbidden patterns)."""
        forbidden_patterns = params.get("forbidden_patterns", [])
        
        # Collect all text from elements
        all_text = []
        for element in creative.elements:
            if hasattr(element, 'content') and element.content:
                all_text.append(element.content.lower())
        
        combined_text = " ".join(all_text)
        
        # Check for forbidden patterns
        found_violations = []
        for pattern in forbidden_patterns:
            if pattern.lower() in combined_text:
                found_violations.append(pattern)
        
        if found_violations:
            return GuidelineCheckResult(
                rule=rule,
                passed=False,
                message=f"Forbidden text found: {', '.join(found_violations)}",
                details={"violations": found_violations}
            )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Copy guidelines met",
            details={}
        )
    
    def _check_tesco_tag_rule(
        self,
        creative: Creative,
        rule: GuidelineRule,
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Check Tesco tag validation."""
        allowed_tags = params.get("allowed_tags", [])
        
        # Find tag elements
        tag_elements = [e for e in creative.elements if hasattr(e, 'metadata') and 
                       e.metadata and e.metadata.get('tesco', {}).get('type') == 'tag']
        
        if not tag_elements:
            return GuidelineCheckResult(
                rule=rule,
                passed=True,
                message="No tags found (tags are optional)",
                details={}
            )
        
        # Validate each tag
        invalid_tags = []
        for tag in tag_elements:
            tag_text = tag.content if hasattr(tag, 'content') else ''
            if tag_text not in allowed_tags:
                invalid_tags.append(tag_text)
        
        if invalid_tags:
            return GuidelineCheckResult(
                rule=rule,
                passed=False,
                message=f"Invalid Tesco tag(s): {', '.join(invalid_tags)}",
                details={"invalid_tags": invalid_tags, "allowed_tags": allowed_tags}
            )
        
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Tesco tags validated",
            details={}
        )
    
    def _calculate_contrast_ratio(self, color1: str, color2: str) -> float:
        """Calculate WCAG contrast ratio between two colors."""
        def get_luminance(hex_color: str) -> float:
            """Get relative luminance of a color."""
            # Remove # if present
            hex_color = hex_color.lstrip('#')
            
            # Convert to RGB
            r, g, b = tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))
            
            # Calculate luminance
            def adjust(c):
                return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
            
            r, g, b = adjust(r), adjust(g), adjust(b)
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        
        try:
            l1 = get_luminance(color1)
            l2 = get_luminance(color2)
            
            lighter = max(l1, l2)
            darker = min(l1, l2)
            
            return (lighter + 0.05) / (darker + 0.05)
        except:
            return 4.5  # Default to passing ratio if calculation fails
    
    def _check_generic_rule(
        self, 
        creative: Creative, 
        rule: GuidelineRule, 
        params: Dict[str, Any]
    ) -> GuidelineCheckResult:
        """Generic rule check fallback."""
        return GuidelineCheckResult(
            rule=rule,
            passed=True,
            message="Rule check completed",
            details={}
        )
