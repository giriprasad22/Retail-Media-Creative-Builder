"""Auto-fix service for automatically correcting guideline violations."""
import uuid
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from app.models.schemas import (
    Creative,
    GuidelineCheckResult,
    AutoFixSuggestion
)
from app.config import settings


class AutoFixer:
    """Suggests and applies automatic fixes for guideline violations."""
    
    # Fix strategies for different rule violations
    FIX_STRATEGIES = {
        "logo_size": {
            "action": "resize",
            "description": "Resize logo to meet size requirements"
        },
        "logo_position": {
            "action": "move",
            "description": "Move logo to a safe zone"
        },
        "text_size": {
            "action": "resize",
            "description": "Increase text size for readability"
        },
        "safe_zone": {
            "action": "move",
            "description": "Move element away from edges"
        },
        "contrast": {
            "action": "recolor",
            "description": "Adjust text color for better contrast"
        },
        "text_coverage": {
            "action": "resize",
            "description": "Reduce text size or area"
        }
    }
    
    def __init__(self):
        """Initialize the auto-fixer."""
        self.output_dir = settings.OUTPUT_DIR
        self._pending_fixes: Dict[str, Dict[str, Any]] = {}
    
    def suggest_fixes(
        self, 
        check_results: List[GuidelineCheckResult]
    ) -> List[AutoFixSuggestion]:
        """
        Generate fix suggestions for failed guideline checks.
        
        Args:
            check_results: List of guideline check results
            
        Returns:
            List of auto-fix suggestions
        """
        suggestions = []
        
        for result in check_results:
            if result.passed:
                continue
            
            fix = self._create_fix_suggestion(result)
            if fix:
                suggestions.append(fix)
        
        return suggestions
    
    def _create_fix_suggestion(
        self, 
        check_result: GuidelineCheckResult
    ) -> Optional[AutoFixSuggestion]:
        """Create a fix suggestion for a specific violation."""
        rule = check_result.rule
        details = check_result.details
        
        # Match rule to fix strategy
        strategy = None
        for key, strat in self.FIX_STRATEGIES.items():
            if key in rule.rule_id.lower() or key in rule.category.lower():
                strategy = strat
                break
        
        if not strategy:
            strategy = {"action": "manual", "description": "Manual adjustment required"}
        
        fix_id = str(uuid.uuid4())[:8]
        
        # Build fix parameters based on the violation
        parameters = self._calculate_fix_parameters(rule, details, strategy["action"])
        
        # Store fix for later application
        self._pending_fixes[fix_id] = {
            "rule_id": rule.rule_id,
            "action": strategy["action"],
            "parameters": parameters
        }
        
        return AutoFixSuggestion(
            fix_id=fix_id,
            rule_id=rule.rule_id,
            description=strategy["description"],
            action=strategy["action"],
            parameters=parameters,
            preview_available=strategy["action"] in ["resize", "move", "recolor"]
        )
    
    def _calculate_fix_parameters(
        self,
        rule,
        details: Dict[str, Any],
        action: str
    ) -> Dict[str, Any]:
        """Calculate parameters needed to apply the fix."""
        params = {"rule_id": rule.rule_id}
        
        if action == "resize":
            if "logo" in rule.rule_id.lower():
                # Calculate new logo size
                params["target_percent"] = 15  # Middle of typical range
                params["element"] = "logo"
            elif "text" in rule.rule_id.lower():
                params["target_size"] = details.get("min_required", 20)
                params["element"] = "text"
        
        elif action == "move":
            # Calculate new position to be within safe zone
            params["margin_percent"] = 5
            if "element" in details:
                params["target_element"] = details["element"]
            else:
                params["target_element"] = "unknown"
        
        elif action == "recolor":
            # Suggest high-contrast color
            params["suggested_colors"] = ["#000000", "#ffffff", "#333333"]
        
        return params
    
    def apply_fixes(
        self,
        image_path: str,
        fix_ids: List[str]
    ) -> str:
        """
        Apply selected fixes to an image.
        
        Args:
            image_path: Path to the creative image
            fix_ids: List of fix IDs to apply
            
        Returns:
            Path to the fixed image
        """
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        
        for fix_id in fix_ids:
            if fix_id not in self._pending_fixes:
                continue
            
            fix = self._pending_fixes[fix_id]
            action = fix["action"]
            params = fix["parameters"]
            
            if action == "resize":
                img = self._apply_resize_fix(img, params)
            elif action == "move":
                img = self._apply_move_fix(img, params)
            elif action == "recolor":
                img = self._apply_recolor_fix(img, params)
        
        # Save fixed image
        fixed_id = str(uuid.uuid4())
        fixed_path = self.output_dir / f"fixed_{fixed_id}.png"
        img.convert("RGB").save(fixed_path, "PNG", quality=95)
        
        return f"/outputs/fixed_{fixed_id}.png"
    
    def _apply_resize_fix(
        self,
        img: Image.Image,
        params: Dict[str, Any]
    ) -> Image.Image:
        """Apply resize fix to an image element."""
        # This is a simplified implementation
        # In production, you'd track element positions and resize specifically
        return img
    
    def _apply_move_fix(
        self,
        img: Image.Image,
        params: Dict[str, Any]
    ) -> Image.Image:
        """Apply move fix to reposition elements."""
        # Simplified - would need element tracking in production
        return img
    
    def _apply_recolor_fix(
        self,
        img: Image.Image,
        params: Dict[str, Any]
    ) -> Image.Image:
        """Apply recolor fix to improve contrast."""
        # Simplified implementation
        return img
    
    def preview_fix(
        self,
        image_path: str,
        fix_id: str
    ) -> Optional[str]:
        """
        Generate a preview of a fix without permanently applying it.
        
        Args:
            image_path: Path to the original image
            fix_id: ID of the fix to preview
            
        Returns:
            Path to preview image or None
        """
        if fix_id not in self._pending_fixes:
            return None
        
        fix = self._pending_fixes[fix_id]
        img = Image.open(image_path).convert("RGBA")
        
        # Apply fix temporarily
        if fix["action"] == "resize":
            img = self._apply_resize_fix(img, fix["parameters"])
        elif fix["action"] == "move":
            img = self._apply_move_fix(img, fix["parameters"])
        elif fix["action"] == "recolor":
            img = self._apply_recolor_fix(img, fix["parameters"])
        
        # Save preview
        preview_path = self.output_dir / f"preview_{fix_id}.png"
        img.convert("RGB").save(preview_path, "PNG", quality=85)
        
        return f"/outputs/preview_{fix_id}.png"
    
    def get_fix_details(self, fix_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a pending fix."""
        if fix_id not in self._pending_fixes:
            return None
        return self._pending_fixes[fix_id]
    
    def clear_pending_fixes(self):
        """Clear all pending fixes."""
        self._pending_fixes.clear()
    
    def batch_suggest_fixes(
        self,
        creatives: List[Creative]
    ) -> Dict[str, List[AutoFixSuggestion]]:
        """
        Generate fix suggestions for multiple creatives.
        
        Args:
            creatives: List of Creative objects with guideline checks
            
        Returns:
            Dictionary mapping creative IDs to their fix suggestions
        """
        results = {}
        for creative in creatives:
            results[creative.creative_id] = self.suggest_fixes(creative.guideline_checks)
        return results
