# 🎨 Retail Media Creative Builder

> **AI-Powered Advertising Creative Generation Platform**

Generate professional retail media creatives with AI image generation, intelligent layouts, and multi-platform export capabilities.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Python](https://img.shields.io/badge/python-3.10+-green)

---

## ✨ Features

### 🖼️ AI Image Generation
- **SDXL** (Stable Diffusion XL) - *Recommended* - High-quality 1024px images
- **SD3** (Stable Diffusion 3) - Latest architecture
- **FLUX.1** - Fast generation
- **SDXL Turbo** - Ultra-fast generation
- **SD 1.5** - Lightweight option

### 🤖 AI Chat Assistant
- Powered by **Google Gemini API** with **gemini-2.5-flash** model
- Natural language creative editing
- Smart suggestions and automation

### 🎨 Visual Styles (10 Options)
| Style | Description |
|-------|-------------|
| Photorealistic | Ultra-realistic photography |
| Cinematic | Movie-quality dramatic lighting |
| Commercial Product | Clean e-commerce ready |
| Elegant Luxury | Premium high-end aesthetic |
| Modern Minimalist | Clean, simple, contemporary |
| Vibrant & Bold | High saturation, energetic |
| Soft & Dreamy | Ethereal, gentle lighting |
| Artistic | Creative, painterly |
| Hyper-Realistic | Maximum detail and clarity |
| Premium Studio | Professional studio lighting |

### ✂️ Background Removal
- AI-powered background removal using **rembg**
- Perfect for product isolation

### 📐 Multi-Platform Export
- Custom sizes for all platforms
- PNG, JPG, WebP formats
- Amazon, Walmart, Target, Instagram presets

---

## 🚀 Quick Start (One Command!)

### Windows
```batch
start.bat
```

### Python (Any OS)
```bash
cd backend
python run.py
```

**That's it!** The auto-installer will:
- ✅ Install all **33+ required packages** automatically
- ✅ Configure **PyTorch** (GPU if available, CPU fallback)
- ✅ Set up **AI image generation** (SDXL, SD3, FLUX.1)
- ✅ Configure **Google Gemini API** for AI chat
- ✅ Start the server at **http://localhost:8000**

---

## 📋 System Requirements

### Minimum
| Component | Requirement |
|-----------|-------------|
| OS | Windows 10/11, macOS, Linux |
| Python | 3.10 or higher |
| RAM | 8GB |
| Storage | 15GB (for AI models) |

### Recommended (For Fast Generation)
| Component | Requirement |
|-----------|-------------|
| GPU | NVIDIA RTX 3060+ with 8GB+ VRAM |
| RAM | 16GB+ |
| Storage | SSD with 30GB free |

---

## 🛠️ Installation

### Prerequisites

1. **Python 3.10+**
   ```bash
   python --version  # Should be 3.10+
   ```

### Method 1: Auto-Install (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd "Retail Media Creative Builder"

# Run (auto-installs everything!)
cd backend
python run.py
```

### Method 2: Manual Install

```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

---

## 📖 Usage Guide

### 1. Open the Application
Open your browser and go to: **http://localhost:8000**

### 2. Create a New Creative

**Step 1: Enter Product Details**
- Product Name (e.g., "Premium Coffee Maker")
- Brand Name
- Price
- Theme (Technology, Food, Fashion, Beauty, Home, Sports)

**Step 2: Choose Size**
| Size | Use Case |
|------|----------|
| 1200×624 | Landscape Banner |
| 1080×1080 | Square (Instagram) |
| 1080×1920 | Story/Portrait |
| 1504×504 | Wide Banner |
| 1200×1200 | Large Square |

**Step 3: Select AI Model**
| Model | Speed | Quality | VRAM |
|-------|-------|---------|------|
| SDXL | ~30s | ⭐⭐⭐⭐⭐ | 8GB |
| SDXL Turbo | ~5s | ⭐⭐⭐⭐ | 6GB |
| SD 1.5 | ~10s | ⭐⭐⭐ | 4GB |

**Step 4: Pick a Style**
Choose from 10 professional styles

**Step 5: Generate!**
Click "Generate Creative" and wait for AI magic ✨

### 3. Edit Your Creative
- Use **AI Chat** for natural language edits
- Drag and drop elements
- Adjust layers and text
- Apply filters and effects

### 4. Export
- Download as PNG, JPG, or WebP
- Use platform presets for perfect sizing

---

## 🔌 API Reference

### Base URL
```
http://localhost:8000
```

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate` | POST | Generate AI creative |
| `/generate-image` | POST | Generate AI image only |
| `/generate-layout` | POST | Generate layout variations |
| `/remove-background` | POST | Remove image background |
| `/chat` | POST | AI chat assistant |
| `/health` | GET | Server health check |
| `/guidelines/check` | POST | Check creative guidelines |
| `/export` | POST | Export creative |

### Example: Generate Creative

```python
import requests

response = requests.post('http://localhost:8000/generate', json={
    "product_name": "Wireless Headphones",
    "brand": "TechBrand",
    "price": "$99.99",
    "theme": "technology",
    "width": 1200,
    "height": 624,
    "style": "photorealistic"
})

result = response.json()
print(result['image_url'])
```

### Example: AI Chat

```python
import requests

response = requests.post('http://localhost:8000/chat', json={
    "message": "Make the background more vibrant"
})

print(response.json()['response'])
```

### Example: Remove Background

```python
import requests

with open('product.png', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/remove-background',
        files={'image': f}
    )
    
with open('product_nobg.png', 'wb') as f:
    f.write(response.content)
```

---

## 📁 Project Structure

```
Retail Media Creative Builder/
├── backend/
│   ├── app/
│   │   ├── main.py              # Flask server (50+ endpoints)
│   │   ├── config.py            # Configuration
│   │   ├── auto_installer.py    # Auto package installer
│   │   ├── suppress_warnings.py # Warning suppression
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── advanced_image_generator.py  # SDXL/SD3/FLUX
│   │   │   │   ├── background_removal.py        # rembg service
│   │   │   │   ├── gemini_service.py           # AI chat
│   │   │   │   ├── image_generation_service.py # Image gen wrapper
│   │   │   │   └── ...more AI services
│   │   │   ├── layer_manager.py
│   │   │   ├── layout_generator.py
│   │   │   ├── guideline_checker.py
│   │   │   └── exporter.py
│   │   └── models/
│   │       └── schemas.py       # Pydantic models
│   ├── run.py                   # Quick start script
│   ├── requirements.txt         # Python dependencies (33+)
│   ├── outputs/                 # Generated images
│   └── uploads/                 # Uploaded files
├── frontend/
│   ├── index.html              # Main creative generator
│   ├── editor.html             # Creative editor
│   ├── templates.html          # Template gallery
│   ├── css/                    # Stylesheets
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   └── animations.css
│   └── js/                     # JavaScript modules
│       ├── app.js              # Main application
│       ├── api.js              # API client
│       ├── editor.js           # Editor functionality
│       ├── layers.js           # Layer management
│       └── export.js           # Export functionality
├── start.bat                   # Windows launcher
└── README.md                   # This file
```

---

## 🎯 Platform Presets

| Platform | Size | Aspect Ratio |
|----------|------|--------------|
| Amazon Sponsored | 1200×624 | 1.92:1 |
| Amazon Hero | 1504×504 | 3:1 |
| Instagram Post | 1080×1080 | 1:1 |
| Instagram Story | 1080×1920 | 9:16 |
| Facebook Ad | 1200×628 | 1.91:1 |
| Twitter Banner | 1500×500 | 3:1 |
| Walmart | 1200×624 | 1.92:1 |
| Target | 1200×628 | 1.91:1 |

---

## 🔧 Configuration (Optional)

Create a `.env` file in the root folder with:
```env
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

```env
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true

# AI Models
DEFAULT_MODEL=sdxl
SDXL_MODEL_ID=stabilityai/stable-diffusion-xl-base-1.0

# Google Gemini API
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

---

## ❓ Troubleshooting

### Common Issues

**1. "CUDA out of memory"**
```
Solution: Use SDXL Turbo or SD 1.5 for lower VRAM usage
Or generate smaller images (1024×1024 max)
```

**2. "Gemini API Error" / AI Chat not working**
```bash
# Check .env file exists with GEMINI_API_KEY
# Get API key from: https://aistudio.google.com/app/apikey
# Add to .env:
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

**3. "First generation is slow"**
```
Normal! First run downloads the SDXL model (~6GB)
Subsequent generations are much faster
```

**4. "Port 8000 already in use"**
```powershell
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :8000
kill -9 <PID>
```

**5. "ModuleNotFoundError"**
```bash
cd backend
python run.py  # Auto-installs missing packages
```

**6. "No GPU detected"**
```
The system will use CPU mode (slower but works)
For faster generation, install NVIDIA drivers and CUDA
```

---

## 📦 Installed Packages

The auto-installer sets up these packages:

| Category | Packages |
|----------|----------|
| **Web** | Flask, Flask-CORS, Werkzeug |
| **AI Chat** | google-genai |
| **Image Gen** | diffusers, transformers, accelerate, safetensors |
| **GPU** | torch, xformers, bitsandbytes |
| **Image** | Pillow, opencv-python, scikit-image, rembg |
| **Utils** | numpy, requests, pydantic, tqdm, colorama |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing`)
6. Open a Pull Request

---

## 🙏 Acknowledgments

- **Stability AI** - Stable Diffusion models
- **Hugging Face** - Diffusers library & model hosting
- **Google Gemini API** - AI chat and creative generation
- **rembg** - Background removal

---

<p align="center">
  <b>🎨 Built with ❤️ for Retail Media Creators</b><br>
  <i>Generate stunning creatives with AI</i>
</p>
