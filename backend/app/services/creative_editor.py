"""Creative Editor service for applying region-based modifications to creatives."""
import uuid
import json
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np
from dataclasses import dataclass, asdict

from app.config import settings
from app.services.prompt_parser import PromptParser, ParsedCommand, EditAction, TargetRegion


@dataclass
class EditOperation:
    """Represents a single edit operation."""
    operation_id: str
    action: str
    target: str
    parameters: Dict[str, Any]
    timestamp: str
    applied: bool = False


@dataclass
class CreativeState:
    """Represents the current state of a creative being edited."""
    creative_id: str
    original_path: str
    current_path: str
    width: int
    height: int
    elements: Dict[str, Dict[str, Any]]
    edit_history: List[EditOperation]
    background_color: str = "#FFFFFF"


class CreativeEditor:
    """Handles region-based editing of creatives."""
    
    def __init__(self):
        """Initialize the creative editor."""
        self.output_dir = settings.OUTPUT_DIR
        self.prompt_parser = PromptParser()
        self._active_sessions: Dict[str, CreativeState] = {}
        
        # Default fonts
        self.font_paths = {
            "regular": self._get_font_path("regular"),
            "bold": self._get_font_path("bold"),
            "italic": self._get_font_path("italic"),
        }
    
    def _get_font_path(self, style: str) -> str:
        """Get system font path based on style."""
        # Try common font locations
        font_options = {
            "regular": ["arial.ttf", "DejaVuSans.ttf", "Helvetica.ttf"],
            "bold": ["arialbd.ttf", "DejaVuSans-Bold.ttf", "Helvetica-Bold.ttf"],
            "italic": ["ariali.ttf", "DejaVuSans-Oblique.ttf", "Helvetica-Oblique.ttf"],
        }
        
        for font_name in font_options.get(style, font_options["regular"]):
            try:
                ImageFont.truetype(font_name, 12)
                return font_name
            except:
                continue
        
        return None  # Will use default
    
    def start_editing_session(
        self, 
        creative_id: str, 
        creative_path: str,
        elements: Dict[str, Dict[str, Any]],
        width: int = 1200,
        height: int = 628
    ) -> CreativeState:
        """
        Start an editing session for a creative.
        
        Args:
            creative_id: Unique identifier for the creative
            creative_path: Path to the creative image (optional)
            elements: Dictionary of element positions and properties
            width: Canvas width (default 1200)
            height: Canvas height (default 628)
            
        Returns:
            CreativeState object
        """
        session_id = str(uuid.uuid4())[:8]
        working_path = self.output_dir / f"edit_{creative_id}_{session_id}.png"
        
        # Try to load existing image, or create a blank canvas
        try:
            if creative_path and Path(creative_path).exists():
                img = Image.open(creative_path)
                img.save(str(working_path))
                img_width, img_height = img.width, img.height
            else:
                # Create a blank canvas
                img = Image.new("RGBA", (width, height), (26, 26, 46, 255))  # Dark background
                img.save(str(working_path))
                img_width, img_height = width, height
        except Exception as e:
            # Fallback: create blank canvas
            img = Image.new("RGBA", (width, height), (26, 26, 46, 255))
            img.save(str(working_path))
            img_width, img_height = width, height
        
        state = CreativeState(
            creative_id=creative_id,
            original_path=creative_path or str(working_path),
            current_path=str(working_path),
            width=img_width,
            height=img_height,
            elements=elements,
            edit_history=[]
        )
        
        self._active_sessions[creative_id] = state
        return state
    
    def get_session(self, creative_id: str) -> Optional[CreativeState]:
        """Get an active editing session."""
        return self._active_sessions.get(creative_id)
    
    def process_prompt(
        self, 
        creative_id: str, 
        prompt: str,
        selected_region: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a natural language prompt and apply edits.
        
        Args:
            creative_id: ID of the creative being edited
            prompt: Natural language editing instruction
            selected_region: Currently selected region on canvas
            
        Returns:
            Result dictionary with success status and preview
        """
        session = self._active_sessions.get(creative_id)
        if not session:
            return {"success": False, "error": "No active editing session"}
        
        # Parse the prompt
        commands = self.prompt_parser.parse(prompt, selected_region)
        
        if not commands:
            return {
                "success": False, 
                "error": "Could not understand the command",
                "suggestions": self.prompt_parser.get_supported_commands()
            }
        
        results = []
        for command in commands:
            result = self._apply_command(session, command)
            results.append(result)
        
        # Generate preview
        preview_path = self._generate_preview(session)
        
        return {
            "success": all(r["success"] for r in results),
            "results": results,
            "preview_path": preview_path,
            "parsed_commands": [
                {
                    "action": cmd.action.value,
                    "target": cmd.target.value,
                    "parameters": cmd.parameters,
                    "confidence": cmd.confidence
                }
                for cmd in commands
            ]
        }
    
    def _apply_command(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Apply a single parsed command to the creative."""
        action_handlers = {
            EditAction.CHANGE_BACKGROUND: self._apply_background_change,
            EditAction.CHANGE_COLOR: self._apply_color_change,
            EditAction.RESIZE: self._apply_resize,
            EditAction.MOVE: self._apply_move,
            EditAction.CHANGE_FONT: self._apply_font_change,
            EditAction.CHANGE_TEXT: self._apply_text_change,
            EditAction.ADD_EFFECT: self._apply_effect,
            EditAction.CHANGE_OPACITY: self._apply_opacity,
            EditAction.ROTATE: self._apply_rotation,
            EditAction.FLIP: self._apply_flip,
            EditAction.REMOVE: self._apply_remove,
            EditAction.ALIGN: self._apply_alignment,
        }
        
        handler = action_handlers.get(command.action)
        if not handler:
            return {"success": False, "error": f"Unsupported action: {command.action}"}
        
        try:
            result = handler(session, command)
            
            # Record operation
            operation = EditOperation(
                operation_id=str(uuid.uuid4())[:8],
                action=command.action.value,
                target=command.target.value,
                parameters=command.parameters,
                timestamp=str(uuid.uuid4()),  # Would be actual timestamp
                applied=result.get("success", False)
            )
            session.edit_history.append(operation)
            
            return result
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _apply_background_change(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Change the background color of the creative."""
        color = command.parameters.get("color", "#FFFFFF")
        
        # Load current image
        img = Image.open(session.current_path).convert("RGBA")
        
        # Create new background
        background = Image.new("RGBA", (session.width, session.height), color)
        
        # If we have element masks, preserve them
        # For now, we'll do a simple composite assuming product/logo have transparency
        if img.mode == "RGBA":
            # Use alpha channel to composite
            background.paste(img, (0, 0), img)
        else:
            background = img
        
        # Save updated image
        background.save(session.current_path, "PNG")
        session.background_color = color
        
        return {
            "success": True,
            "message": f"Background changed to {color}",
            "color": color
        }
    
    def _apply_color_change(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Change the color of a specific element."""
        target = command.target.value
        color = command.parameters.get("color", "#000000")
        
        element = session.elements.get(target)
        if not element:
            return {"success": False, "error": f"Element '{target}' not found"}
        
        # Load image
        img = Image.open(session.current_path).convert("RGBA")
        
        # Get element bounds
        bbox = element.get("bbox", {})
        x, y = bbox.get("x", 0), bbox.get("y", 0)
        w, h = bbox.get("width", 100), bbox.get("height", 100)
        
        # For text elements, redraw with new color
        if target in ["headline", "offer_text", "all_text"]:
            draw = ImageDraw.Draw(img)
            text = element.get("content", "")
            font_size = element.get("font_size", 32)
            
            try:
                font = ImageFont.truetype(self.font_paths["regular"], font_size)
            except:
                font = ImageFont.load_default()
            
            # Clear old text area with background
            draw.rectangle([x, y, x + w, y + h], fill=session.background_color)
            
            # Draw new text
            draw.text((x, y), text, fill=color, font=font)
            
            # Update element color in session
            element["color"] = color
        
        img.save(session.current_path, "PNG")
        
        return {
            "success": True,
            "message": f"Changed {target} color to {color}",
            "target": target,
            "color": color
        }
    
    def _apply_resize(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Resize an element."""
        target = command.target.value
        scale = command.parameters.get("scale_percent", 100) / 100.0
        
        element = session.elements.get(target)
        if not element:
            return {"success": False, "error": f"Element '{target}' not found"}
        
        # Update element dimensions
        bbox = element.get("bbox", {})
        old_w, old_h = bbox.get("width", 100), bbox.get("height", 100)
        
        new_w = int(old_w * scale)
        new_h = int(old_h * scale)
        
        # Center the scaled element
        center_x = bbox.get("x", 0) + old_w // 2
        center_y = bbox.get("y", 0) + old_h // 2
        
        new_x = center_x - new_w // 2
        new_y = center_y - new_h // 2
        
        # Update bounds
        element["bbox"] = {
            "x": max(0, new_x),
            "y": max(0, new_y),
            "width": new_w,
            "height": new_h
        }
        
        # Regenerate the creative with new element sizes
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Resized {target} to {int(scale * 100)}%",
            "target": target,
            "new_size": {"width": new_w, "height": new_h}
        }
    
    def _apply_move(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Move an element to a new position."""
        target = command.target.value
        position = command.parameters.get("position", {"x": 0.5, "y": 0.5})
        position_name = command.parameters.get("position_name", "center")
        
        element = session.elements.get(target)
        if not element:
            return {"success": False, "error": f"Element '{target}' not found"}
        
        bbox = element.get("bbox", {})
        elem_w = bbox.get("width", 100)
        elem_h = bbox.get("height", 100)
        
        # Calculate new position
        new_x = int(position["x"] * session.width)
        new_y = int(position["y"] * session.height)
        
        # Ensure element stays within bounds
        new_x = max(0, min(new_x, session.width - elem_w))
        new_y = max(0, min(new_y, session.height - elem_h))
        
        element["bbox"]["x"] = new_x
        element["bbox"]["y"] = new_y
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Moved {target} to {position_name}",
            "target": target,
            "new_position": {"x": new_x, "y": new_y}
        }
    
    def _apply_font_change(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Change font style of text elements."""
        target = command.target.value
        style = command.parameters.get("style", {})
        style_name = command.parameters.get("style_name", "normal")
        
        # Get target elements
        if target == "all_text":
            targets = ["headline", "offer_text"]
        else:
            targets = [target]
        
        for t in targets:
            element = session.elements.get(t)
            if element and element.get("element_type") in ["headline", "offer_text", "text"]:
                element["style"] = {**element.get("style", {}), **style}
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Changed font style to {style_name}",
            "targets": targets,
            "style": style
        }
    
    def _apply_text_change(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Change the text content of an element."""
        target = command.target.value
        new_text = command.parameters.get("text", "")
        
        element = session.elements.get(target)
        if not element:
            return {"success": False, "error": f"Element '{target}' not found"}
        
        element["content"] = new_text
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Changed {target} text",
            "target": target,
            "new_text": new_text
        }
    
    def _apply_effect(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Apply an effect to an element or the entire creative."""
        target = command.target.value
        effect = command.parameters.get("effect", "shadow")
        
        img = Image.open(session.current_path).convert("RGBA")
        
        effect_handlers = {
            "shadow": self._add_shadow_effect,
            "blur": self._add_blur_effect,
            "glow": self._add_glow_effect,
            "sharpen": self._add_sharpen_effect,
        }
        
        handler = effect_handlers.get(effect)
        if handler:
            img = handler(img, session, target)
            img.save(session.current_path, "PNG")
            
            return {
                "success": True,
                "message": f"Applied {effect} effect to {target}",
                "effect": effect,
                "target": target
            }
        
        return {"success": False, "error": f"Unknown effect: {effect}"}
    
    def _add_shadow_effect(self, img: Image.Image, session: CreativeState, target: str) -> Image.Image:
        """Add drop shadow effect."""
        # Create shadow layer
        shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        
        if target in session.elements:
            element = session.elements[target]
            bbox = element.get("bbox", {})
            x, y = bbox.get("x", 0), bbox.get("y", 0)
            w, h = bbox.get("width", 100), bbox.get("height", 100)
            
            # Draw shadow rectangle
            draw = ImageDraw.Draw(shadow)
            shadow_offset = 5
            draw.rectangle(
                [x + shadow_offset, y + shadow_offset, x + w + shadow_offset, y + h + shadow_offset],
                fill=(0, 0, 0, 100)
            )
            
            # Blur shadow
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
        
        # Composite shadow under original
        result = Image.alpha_composite(shadow, img)
        return result
    
    def _add_blur_effect(self, img: Image.Image, session: CreativeState, target: str) -> Image.Image:
        """Add blur effect."""
        if target == "background":
            # Blur only background, preserve elements
            blurred = img.filter(ImageFilter.GaussianBlur(radius=5))
            return blurred
        return img.filter(ImageFilter.GaussianBlur(radius=3))
    
    def _add_glow_effect(self, img: Image.Image, session: CreativeState, target: str) -> Image.Image:
        """Add glow effect."""
        # Create glow by blurring a brightened copy
        enhancer = ImageEnhance.Brightness(img)
        bright = enhancer.enhance(1.5)
        glow = bright.filter(ImageFilter.GaussianBlur(radius=10))
        
        # Blend with original
        return Image.blend(img, glow, 0.3)
    
    def _add_sharpen_effect(self, img: Image.Image, session: CreativeState, target: str) -> Image.Image:
        """Add sharpen effect."""
        return img.filter(ImageFilter.SHARPEN)
    
    def _apply_opacity(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Change opacity of an element."""
        target = command.target.value
        opacity = command.parameters.get("opacity", 100) / 100.0
        
        element = session.elements.get(target)
        if element:
            element["opacity"] = opacity
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Set {target} opacity to {int(opacity * 100)}%",
            "target": target,
            "opacity": opacity
        }
    
    def _apply_rotation(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Rotate an element."""
        target = command.target.value
        degrees = command.parameters.get("degrees", 0)
        
        element = session.elements.get(target)
        if element:
            element["rotation"] = element.get("rotation", 0) + degrees
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Rotated {target} by {degrees} degrees",
            "target": target,
            "rotation": degrees
        }
    
    def _apply_flip(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Flip an element."""
        target = command.target.value
        direction = command.parameters.get("direction", "horizontal")
        
        element = session.elements.get(target)
        if element:
            element["flip"] = direction
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Flipped {target} {direction}ly",
            "target": target,
            "direction": direction
        }
    
    def _apply_remove(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Remove an element from the creative."""
        target = command.target.value
        
        if target in session.elements:
            session.elements[target]["visible"] = False
            
            # Regenerate creative
            self._regenerate_creative(session)
            
            return {
                "success": True,
                "message": f"Removed {target}",
                "target": target
            }
        
        return {"success": False, "error": f"Element '{target}' not found"}
    
    def _apply_alignment(self, session: CreativeState, command: ParsedCommand) -> Dict[str, Any]:
        """Align an element."""
        target = command.target.value
        alignment = command.parameters.get("alignment", "center")
        
        element = session.elements.get(target)
        if not element:
            return {"success": False, "error": f"Element '{target}' not found"}
        
        bbox = element.get("bbox", {})
        elem_w = bbox.get("width", 100)
        elem_h = bbox.get("height", 100)
        
        if alignment in ["horizontal", "center"]:
            new_x = (session.width - elem_w) // 2
            element["bbox"]["x"] = new_x
        
        if alignment in ["vertical", "center"]:
            new_y = (session.height - elem_h) // 2
            element["bbox"]["y"] = new_y
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Aligned {target} {alignment}",
            "target": target,
            "alignment": alignment
        }
    
    def _regenerate_creative(self, session: CreativeState):
        """Regenerate the creative image based on current element states."""
        # Create base image
        img = Image.new("RGBA", (session.width, session.height), session.background_color)
        draw = ImageDraw.Draw(img)
        
        # Draw each visible element
        for elem_name, elem_data in session.elements.items():
            if not elem_data.get("visible", True):
                continue
            
            elem_type = elem_data.get("element_type", "")
            bbox = elem_data.get("bbox", {})
            x, y = bbox.get("x", 0), bbox.get("y", 0)
            w, h = bbox.get("width", 100), bbox.get("height", 100)
            
            if elem_type in ["product", "logo"]:
                # Load and paste image
                image_path = elem_data.get("image_path")
                if image_path and Path(image_path).exists():
                    elem_img = Image.open(image_path).convert("RGBA")
                    
                    # Apply rotation if any
                    rotation = elem_data.get("rotation", 0)
                    if rotation:
                        elem_img = elem_img.rotate(rotation, expand=True, resample=Image.BICUBIC)
                    
                    # Apply flip if any
                    flip = elem_data.get("flip")
                    if flip == "horizontal":
                        elem_img = elem_img.transpose(Image.FLIP_LEFT_RIGHT)
                    elif flip == "vertical":
                        elem_img = elem_img.transpose(Image.FLIP_TOP_BOTTOM)
                    
                    # Resize to fit bbox
                    elem_img = elem_img.resize((w, h), Image.LANCZOS)
                    
                    # Apply opacity
                    opacity = elem_data.get("opacity", 1.0)
                    if opacity < 1.0:
                        alpha = elem_img.split()[3]
                        alpha = alpha.point(lambda p: int(p * opacity))
                        elem_img.putalpha(alpha)
                    
                    img.paste(elem_img, (x, y), elem_img)
            
            elif elem_type in ["headline", "offer_text"]:
                # Draw text
                text = elem_data.get("content", "")
                color = elem_data.get("color", "#000000")
                font_size = elem_data.get("font_size", 32)
                style = elem_data.get("style", {})
                
                # Choose font based on style
                font_key = "regular"
                if style.get("weight") == "bold":
                    font_key = "bold"
                elif style.get("style") == "italic":
                    font_key = "italic"
                
                try:
                    font = ImageFont.truetype(self.font_paths[font_key], font_size)
                except:
                    font = ImageFont.load_default()
                
                # Apply text transform
                transform = style.get("transform")
                if transform == "uppercase":
                    text = text.upper()
                elif transform == "lowercase":
                    text = text.lower()
                elif transform == "capitalize":
                    text = text.title()
                
                draw.text((x, y), text, fill=color, font=font)
        
        # Save regenerated image
        img.save(session.current_path, "PNG")
    
    def _generate_preview(self, session: CreativeState) -> str:
        """Generate a preview image and return its path."""
        # Create thumbnail for preview
        preview_path = self.output_dir / f"preview_{session.creative_id}.png"
        
        img = Image.open(session.current_path)
        
        # Create preview at reasonable size
        max_size = (800, 600)
        img.thumbnail(max_size, Image.LANCZOS)
        img.save(str(preview_path), "PNG")
        
        return f"/outputs/preview_{session.creative_id}.png"
    
    def undo(self, creative_id: str) -> Dict[str, Any]:
        """Undo the last edit operation."""
        session = self._active_sessions.get(creative_id)
        if not session:
            return {"success": False, "error": "No active session"}
        
        if not session.edit_history:
            return {"success": False, "error": "Nothing to undo"}
        
        # Remove last operation
        session.edit_history.pop()
        
        # Reset to original and replay all operations
        # (Simplified - in production would use snapshots)
        img = Image.open(session.original_path)
        img.save(session.current_path)
        
        return {
            "success": True,
            "message": "Undid last operation",
            "preview_path": self._generate_preview(session)
        }
    
    def get_elements(self, creative_id: str) -> Dict[str, Any]:
        """Get all elements and their current states for a creative."""
        session = self._active_sessions.get(creative_id)
        if not session:
            return {"success": False, "error": "No active session"}
        
        return {
            "success": True,
            "elements": session.elements,
            "canvas_size": {"width": session.width, "height": session.height},
            "background_color": session.background_color
        }
    
    def update_element(
        self, 
        creative_id: str, 
        element_name: str, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Directly update an element's properties."""
        session = self._active_sessions.get(creative_id)
        if not session:
            return {"success": False, "error": "No active session"}
        
        if element_name not in session.elements:
            return {"success": False, "error": f"Element '{element_name}' not found"}
        
        # Update element
        for key, value in updates.items():
            if key == "bbox":
                session.elements[element_name]["bbox"].update(value)
            else:
                session.elements[element_name][key] = value
        
        # Regenerate creative
        self._regenerate_creative(session)
        
        return {
            "success": True,
            "message": f"Updated {element_name}",
            "preview_path": self._generate_preview(session)
        }
    
    def save_creative(self, creative_id: str) -> Dict[str, Any]:
        """Save the current state as the final creative."""
        session = self._active_sessions.get(creative_id)
        if not session:
            return {"success": False, "error": "No active session"}
        
        # Generate final output path
        final_path = self.output_dir / f"final_{creative_id}.png"
        
        # Copy current state to final
        img = Image.open(session.current_path)
        img.save(str(final_path), "PNG")
        
        return {
            "success": True,
            "message": "Creative saved",
            "final_path": f"/outputs/final_{creative_id}.png",
            "edit_count": len(session.edit_history)
        }
    
    def end_session(self, creative_id: str) -> Dict[str, Any]:
        """End an editing session and clean up."""
        if creative_id in self._active_sessions:
            session = self._active_sessions.pop(creative_id)
            
            # Optionally clean up temporary files
            # Path(session.current_path).unlink(missing_ok=True)
            
            return {"success": True, "message": "Session ended"}
        
        return {"success": False, "error": "No active session"}
