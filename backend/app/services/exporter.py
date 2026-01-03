"""Export service for generating final creative outputs."""
import uuid
import zipfile
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image
from datetime import datetime

from app.models.schemas import ImageSize, ExportFormat, ExportResult
from app.config import settings


class Exporter:
    """Handles exporting creatives in various sizes and formats."""
    
    # Standard export sizes
    STANDARD_SIZES = {
        "amazon": [
            ImageSize(width=1200, height=628, name="Product Display Ad"),
            ImageSize(width=1500, height=500, name="Brand Store Banner"),
            ImageSize(width=300, height=250, name="Medium Rectangle"),
            ImageSize(width=728, height=90, name="Leaderboard"),
            ImageSize(width=160, height=600, name="Wide Skyscraper"),
        ],
        "flipkart": [
            ImageSize(width=1410, height=450, name="Banner Large"),
            ImageSize(width=1024, height=576, name="Banner Medium"),
            ImageSize(width=800, height=800, name="Product Card"),
            ImageSize(width=320, height=480, name="Mobile Banner"),
        ],
        "dmart": [
            ImageSize(width=1920, height=600, name="Homepage Banner"),
            ImageSize(width=1200, height=400, name="Category Banner"),
            ImageSize(width=1000, height=1000, name="Product Showcase"),
            ImageSize(width=600, height=600, name="Social Square"),
        ]
    }
    
    def __init__(self):
        """Initialize the exporter."""
        self.output_dir = settings.OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def export(
        self,
        creative_ids: List[str],
        sizes: List[ImageSize] = None,
        export_format: ExportFormat = ExportFormat.PNG,
        retailer: str = None
    ) -> ExportResult:
        """
        Export creatives in specified sizes and format.
        
        Args:
            creative_ids: List of creative IDs to export
            sizes: List of target sizes (uses standard sizes if None)
            export_format: Output format (PNG, JPEG, PDF)
            retailer: Retailer name for standard sizes
            
        Returns:
            ExportResult with export details
        """
        export_id = str(uuid.uuid4())
        export_dir = self.output_dir / f"export_{export_id}"
        export_dir.mkdir(parents=True, exist_ok=True)
        
        # Get sizes
        if not sizes and retailer:
            sizes = self.STANDARD_SIZES.get(retailer.lower(), [])
        elif not sizes:
            sizes = [ImageSize(width=1200, height=628, name="Default")]
        
        exported_files = []
        total_size = 0
        
        for creative_id in creative_ids:
            # Find original creative
            original_path = self._find_creative(creative_id)
            if not original_path:
                continue
            
            # Export in each size
            for size in sizes:
                exported_path, file_size = self._export_single(
                    original_path=original_path,
                    creative_id=creative_id,
                    size=size,
                    export_format=export_format,
                    output_dir=export_dir
                )
                if exported_path:
                    exported_files.append(exported_path)
                    total_size += file_size
        
        # Create metadata file
        metadata = self._create_metadata(
            export_id=export_id,
            creative_ids=creative_ids,
            sizes=sizes,
            export_format=export_format,
            files=exported_files
        )
        metadata_path = export_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
        
        # Create ZIP archive
        zip_path = self._create_zip(export_id, export_dir, exported_files, metadata_path)
        
        return ExportResult(
            export_id=export_id,
            files=exported_files,
            download_url=f"/api/export/download/{export_id}",
            total_size_bytes=total_size
        )
    
    def _find_creative(self, creative_id: str) -> Optional[Path]:
        """Find the creative file by ID."""
        # Check for PNG first
        png_path = self.output_dir / f"{creative_id}.png"
        if png_path.exists():
            return png_path
        
        # Check for other formats
        for ext in [".jpg", ".jpeg", ".webp"]:
            path = self.output_dir / f"{creative_id}{ext}"
            if path.exists():
                return path
        
        return None
    
    def _export_single(
        self,
        original_path: Path,
        creative_id: str,
        size: ImageSize,
        export_format: ExportFormat,
        output_dir: Path
    ) -> tuple:
        """Export a single creative in a specific size and format."""
        try:
            img = Image.open(original_path)
            
            # Resize image
            resized = img.resize((size.width, size.height), Image.Resampling.LANCZOS)
            
            # Convert to RGB for JPEG
            if export_format == ExportFormat.JPEG:
                if resized.mode in ('RGBA', 'P'):
                    resized = resized.convert('RGB')
            
            # Generate filename
            size_name = size.name.replace(" ", "_").lower() if size.name else f"{size.width}x{size.height}"
            ext = export_format.value
            filename = f"{creative_id}_{size_name}.{ext}"
            output_path = output_dir / filename
            
            # Save with appropriate options
            if export_format == ExportFormat.JPEG:
                resized.save(output_path, "JPEG", quality=95, optimize=True)
            elif export_format == ExportFormat.PNG:
                resized.save(output_path, "PNG", optimize=True)
            elif export_format == ExportFormat.PDF:
                resized.convert('RGB').save(output_path, "PDF", resolution=150)
            
            file_size = output_path.stat().st_size
            return str(output_path.name), file_size
            
        except Exception as e:
            print(f"Error exporting {creative_id}: {e}")
            return None, 0
    
    def _create_metadata(
        self,
        export_id: str,
        creative_ids: List[str],
        sizes: List[ImageSize],
        export_format: ExportFormat,
        files: List[str]
    ) -> Dict[str, Any]:
        """Create metadata for the export."""
        return {
            "export_id": export_id,
            "created_at": datetime.utcnow().isoformat(),
            "creative_ids": creative_ids,
            "sizes": [
                {"width": s.width, "height": s.height, "name": s.name}
                for s in sizes
            ],
            "format": export_format.value,
            "file_count": len(files),
            "files": files
        }
    
    def _create_zip(
        self,
        export_id: str,
        export_dir: Path,
        files: List[str],
        metadata_path: Path
    ) -> Path:
        """Create a ZIP archive of exported files."""
        zip_path = self.output_dir / f"export_{export_id}.zip"
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add all exported files
            for filename in files:
                file_path = export_dir / filename
                if file_path.exists():
                    zipf.write(file_path, filename)
            
            # Add metadata
            if metadata_path.exists():
                zipf.write(metadata_path, "metadata.json")
        
        return zip_path
    
    def get_standard_sizes(self, retailer: str) -> List[Dict[str, Any]]:
        """Get standard export sizes for a retailer."""
        sizes = self.STANDARD_SIZES.get(retailer.lower(), [])
        return [
            {"width": s.width, "height": s.height, "name": s.name}
            for s in sizes
        ]
    
    def estimate_export_size(
        self,
        creative_ids: List[str],
        sizes: List[ImageSize],
        format: ExportFormat
    ) -> int:
        """Estimate the total export size in bytes."""
        # Rough estimation based on dimensions and format
        base_bytes_per_pixel = {
            ExportFormat.PNG: 3,
            ExportFormat.JPEG: 0.5,
            ExportFormat.PDF: 4
        }
        
        bytes_per_pixel = base_bytes_per_pixel.get(format, 3)
        total_pixels = sum(s.width * s.height for s in sizes) * len(creative_ids)
        
        return int(total_pixels * bytes_per_pixel)
    
    def cleanup_exports(self, older_than_hours: int = 24):
        """Clean up old export files."""
        import time
        
        cutoff_time = time.time() - (older_than_hours * 3600)
        
        for item in self.output_dir.iterdir():
            if item.name.startswith("export_"):
                if item.stat().st_mtime < cutoff_time:
                    if item.is_dir():
                        import shutil
                        shutil.rmtree(item)
                    else:
                        item.unlink()
