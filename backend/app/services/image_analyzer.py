"""Image analysis service using computer vision."""
import cv2
import numpy as np
from PIL import Image
from colorthief import ColorThief
from typing import Dict, List, Tuple, Any
from pathlib import Path


class ImageAnalyzer:
    """Analyzes images for product detection, color extraction, and dimensions."""
    
    def analyze(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze an image and return comprehensive metadata.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary containing image analysis results
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # Load image with PIL for basic info
        pil_image = Image.open(image_path)
        width, height = pil_image.size
        mode = pil_image.mode
        
        # Load with OpenCV for advanced analysis
        cv_image = cv2.imread(image_path)
        
        # Extract colors
        dominant_colors = self._extract_colors(image_path)
        
        # Detect edges and find product bounds
        product_bounds = self._detect_product_bounds(cv_image)
        
        # Calculate image quality metrics
        quality_metrics = self._analyze_quality(cv_image)
        
        # Check for transparency
        has_transparency = mode in ('RGBA', 'LA') or 'transparency' in pil_image.info
        
        return {
            "dimensions": {"width": width, "height": height},
            "aspect_ratio": round(width / height, 2),
            "mode": mode,
            "has_transparency": has_transparency,
            "file_size_kb": round(path.stat().st_size / 1024, 2),
            "dominant_colors": dominant_colors,
            "product_bounds": product_bounds,
            "quality": quality_metrics,
            "format": pil_image.format
        }
    
    def _extract_colors(self, image_path: str, num_colors: int = 5) -> List[Dict[str, Any]]:
        """Extract dominant colors from image."""
        try:
            color_thief = ColorThief(image_path)
            palette = color_thief.get_palette(color_count=num_colors, quality=10)
            
            colors = []
            for rgb in palette:
                hex_color = '#{:02x}{:02x}{:02x}'.format(*rgb)
                colors.append({
                    "rgb": list(rgb),
                    "hex": hex_color,
                    "luminance": self._calculate_luminance(rgb)
                })
            return colors
        except Exception:
            return []
    
    def _calculate_luminance(self, rgb: Tuple[int, int, int]) -> float:
        """Calculate relative luminance of a color."""
        r, g, b = [x / 255.0 for x in rgb]
        r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
        g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
        b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
        return round(0.2126 * r + 0.7152 * g + 0.0722 * b, 4)
    
    def _detect_product_bounds(self, cv_image: np.ndarray) -> Dict[str, int]:
        """Detect the bounding box of the main product in image."""
        if cv_image is None:
            return {"x": 0, "y": 0, "width": 0, "height": 0}
        
        # Convert to grayscale
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            h, w = cv_image.shape[:2]
            return {"x": 0, "y": 0, "width": w, "height": h}
        
        # Find the largest contour (assumed to be the product)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        return {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
    
    def _analyze_quality(self, cv_image: np.ndarray) -> Dict[str, Any]:
        """Analyze image quality metrics."""
        if cv_image is None:
            return {"sharpness": 0, "brightness": 0, "contrast": 0}
        
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Sharpness (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Brightness (mean intensity)
        brightness = np.mean(gray)
        
        # Contrast (standard deviation)
        contrast = np.std(gray)
        
        return {
            "sharpness": round(float(laplacian_var), 2),
            "brightness": round(float(brightness), 2),
            "contrast": round(float(contrast), 2),
            "is_sharp": laplacian_var > 100,
            "is_well_lit": 50 < brightness < 200
        }
    
    def remove_background(self, image_path: str, output_path: str) -> str:
        """Remove background from product image."""
        try:
            from rembg import remove
            
            with open(image_path, 'rb') as inp:
                input_data = inp.read()
            
            output_data = remove(input_data)
            
            with open(output_path, 'wb') as out:
                out.write(output_data)
            
            return output_path
        except Exception as e:
            # If rembg fails, return original image
            return image_path
    
    def get_focal_point(self, image_path: str) -> Dict[str, float]:
        """Detect the focal point of the image."""
        cv_image = cv2.imread(image_path)
        if cv_image is None:
            return {"x": 0.5, "y": 0.5}
        
        h, w = cv_image.shape[:2]
        
        # Use saliency detection or fall back to center
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Find the brightest region (simple heuristic)
        blur = cv2.GaussianBlur(gray, (21, 21), 0)
        _, _, _, max_loc = cv2.minMaxLoc(blur)
        
        return {
            "x": round(max_loc[0] / w, 2),
            "y": round(max_loc[1] / h, 2)
        }
