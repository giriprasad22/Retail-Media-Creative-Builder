"""
🚀 Complete Auto-Installer for Retail Media Creative Builder
Automatically installs ALL required packages, AI tools, and models
"""
import subprocess
import sys
import importlib.util
import os
import shutil
import platform

# ============================================================================
# CORE PACKAGES (Hybrid Mode - Required for API + Local)
# ============================================================================
REQUIRED_PACKAGES = [
    # ========== Web Framework ==========
    ("Flask", "flask", []),
    ("Flask-CORS", "flask_cors", []),
    ("Werkzeug", "werkzeug", []),
    
    # ========== AI/LLM Chat ==========
    ("google-genai", "google.genai", []),
    
    # ========== Background Removal AI ==========
    ("rembg", "rembg", []),
    ("onnxruntime", "onnxruntime", []),
    
    # ========== Image Processing ==========
    ("Pillow", "PIL", []),
    ("numpy", "numpy", []),
    
    # ========== HTTP & Async ==========
    ("requests", "requests", []),
    ("httpx", "httpx", []),
    ("aiohttp", "aiohttp", []),
    ("aiofiles", "aiofiles", []),
    
    # ========== Data Validation ==========
    ("pydantic", "pydantic", []),
    ("pydantic-settings", "pydantic_settings", []),
    
    # ========== Utilities ==========
    ("loguru", "loguru", []),
    ("python-multipart", "multipart", []),
    ("python-dotenv", "dotenv", []),
    ("tqdm", "tqdm", []),
    ("colorama", "colorama", []),
    
    # ========== Image Metadata ==========
    ("piexif", "piexif", []),
    
    # ========== File Type Detection ==========
    ("filetype", "filetype", []),
    
    # ========== YAML Config ==========
    ("PyYAML", "yaml", []),
]

# ============================================================================
# LOCAL IMAGE GENERATION (Optional - Only for local dev)
# Skipped in cloud environments (Render/Railway/Vercel)
# ============================================================================
LOCAL_IMAGE_GEN_PACKAGES = [
    # ========== PyTorch (10GB+ downloads) ==========
    ("torch", "torch", []),
    ("torchvision", "torchvision", []),
    
    # ========== Image Generation Models ==========
    ("diffusers", "diffusers", []),
    ("transformers", "transformers", []),
    ("accelerate", "accelerate", []),
    ("safetensors", "safetensors", []),
    ("huggingface_hub", "huggingface_hub", []),
    ("tokenizers", "tokenizers", []),
]

# ============================================================================
# OPTIONAL PACKAGES (Enhancement features)
# ============================================================================
OPTIONAL_PACKAGES = [
    # ("triton", "triton", []),  # GPU optimization - Windows incompatible
    ("scipy", "scipy", []),  # Scientific computing
    ("matplotlib", "matplotlib", []),  # Plotting
]


# ============================================================================
# TERMINAL COLORS
# ============================================================================
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    BOLD = '\033[1m'
    END = '\033[0m'


# Enable ANSI colors on Windows
if platform.system() == 'Windows':
    try:
        import colorama
        colorama.init()
    except:
        os.system('')


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def print_banner():
    """Print startup banner"""
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   🚀 RETAIL MEDIA CREATIVE BUILDER - HYBRID MODE SETUP 🚀                ║
║                                                                          ║
║   This will install CORE packages:                                       ║
║   ├── 🌐 Web Framework (Flask)                                           ║
║   ├── 🤖 AI Chat (Google Gemini API)                                     ║
║   ├── 🎨 Image Generation (Hugging Face API - Free)                      ║
║   ├── ✂️  Background Removal (rembg)                                      ║
║   └── 🖼️  Image Processing (Pillow)                                       ║
║                                                                          ║
║   Optional (for local dev):                                              ║
║   └── 🔥 PyTorch + Local Models (10GB+)                                  ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
{Colors.END}
""")


def is_package_installed(import_name: str) -> bool:
    """Check if a package is installed"""
    try:
        spec = importlib.util.find_spec(import_name)
        return spec is not None
    except (ModuleNotFoundError, ValueError, AttributeError):
        return False


def get_package_version(import_name: str) -> str:
    """Get installed package version"""
    try:
        if import_name == "PIL":
            import PIL
            return PIL.__version__
        elif import_name == "cv2":
            import cv2
            return cv2.__version__
        else:
            module = __import__(import_name)
            return getattr(module, '__version__', 'ok')
    except:
        return 'ok'


def run_pip_command(args: list, show_output: bool = False) -> bool:
    """Run a pip command"""
    try:
        cmd = [sys.executable, "-m", "pip"] + args
        if show_output:
            subprocess.check_call(cmd)
        else:
            subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except subprocess.CalledProcessError:
        return False


def install_package(pip_name: str, extra_args: list = None) -> bool:
    """Install a package using pip"""
    args = ["install", pip_name, "--quiet", "--disable-pip-version-check"]
    if extra_args:
        args.extend(extra_args)
    
    if run_pip_command(args):
        return True
    
    # Retry without extra args
    if extra_args:
        return run_pip_command(["install", pip_name, "--quiet"])
    
    return False


def upgrade_pip():
    """Upgrade pip to latest version"""
    print(f"  {Colors.YELLOW}⏳ Upgrading pip...{Colors.END}", end="\r")
    run_pip_command(["install", "--upgrade", "pip", "--quiet"])
    print(f"  {Colors.GREEN}✓ Pip ready{Colors.END}              ")


def install_pytorch():
    """Install PyTorch with appropriate backend (CUDA/CPU)"""
    print(f"\n{Colors.BLUE}🔥 Setting up PyTorch (AI Engine)...{Colors.END}")
    
    if is_package_installed("torch"):
        try:
            import torch
            cuda_available = torch.cuda.is_available()
            device = "CUDA" if cuda_available else "CPU"
            print(f"  {Colors.GREEN}✓ PyTorch already installed ({device}){Colors.END}")
            return True
        except:
            pass
    
    print(f"  {Colors.YELLOW}⏳ Installing PyTorch (this may take several minutes)...{Colors.END}")
    
    # Try CUDA version first (for NVIDIA GPUs)
    cuda_success = run_pip_command([
        "install", "torch", "torchvision", "torchaudio",
        "--index-url", "https://download.pytorch.org/whl/cu118",
        "--quiet"
    ])
    
    if cuda_success:
        print(f"  {Colors.GREEN}✓ PyTorch installed with CUDA support{Colors.END}")
        return True
    
    # Fallback to CPU version
    cpu_success = run_pip_command([
        "install", "torch", "torchvision", "torchaudio", "--quiet"
    ])
    
    if cpu_success:
        print(f"  {Colors.GREEN}✓ PyTorch installed (CPU version){Colors.END}")
        return True
    
    print(f"  {Colors.RED}✗ Failed to install PyTorch{Colors.END}")
    return False


def check_and_install_packages() -> dict:
    """Check and install all required packages"""
    results = {
        "already_installed": [],
        "newly_installed": [],
        "failed": []
    }
    
    # Filter out PyTorch packages (handled separately)
    packages_to_check = [
        p for p in REQUIRED_PACKAGES 
        if p[0] not in ("torch", "torchvision", "torchaudio")
    ]
    
    total = len(packages_to_check)
    print(f"\n{Colors.BLUE}📦 Checking {total} required packages...{Colors.END}\n")
    
    for i, (pip_name, import_name, extra_args) in enumerate(packages_to_check, 1):
        progress = f"[{i:2d}/{total}]"
        
        if is_package_installed(import_name):
            version = get_package_version(import_name)
            print(f"  {Colors.GREEN}✓{Colors.END} {progress} {pip_name}")
            results["already_installed"].append(pip_name)
        else:
            print(f"  {Colors.YELLOW}⏳{Colors.END} {progress} {pip_name} - installing...", end="\r")
            
            if install_package(pip_name, extra_args):
                print(f"  {Colors.GREEN}✓{Colors.END} {progress} {pip_name} - installed ✨       ")
                results["newly_installed"].append(pip_name)
            else:
                print(f"  {Colors.RED}✗{Colors.END} {progress} {pip_name} - failed              ")
                results["failed"].append(pip_name)
    
    return results


def install_optional_packages():
    """Try to install optional packages"""
    print(f"\n{Colors.BLUE}🔧 Installing optional enhancements...{Colors.END}")
    
    for pip_name, import_name, extra_args in OPTIONAL_PACKAGES:
        if is_package_installed(import_name):
            print(f"  {Colors.GREEN}✓{Colors.END} {pip_name}")
        else:
            print(f"  {Colors.YELLOW}⏳{Colors.END} {pip_name} - trying...", end="\r")
            if install_package(pip_name, extra_args):
                print(f"  {Colors.GREEN}✓{Colors.END} {pip_name} - installed        ")
            else:
                print(f"  {Colors.YELLOW}○{Colors.END} {pip_name} - skipped (optional)")


def check_gemini():
    """Check Gemini API configuration"""
    print(f"\n{Colors.BLUE}🤖 Checking Google Gemini API...{Colors.END}")
    
    try:
        from pathlib import Path
        from dotenv import load_dotenv
        
        # Load .env file
        env_path = Path(__file__).parent.parent.parent / '.env'
        if env_path.exists():
            load_dotenv(env_path)
            api_key = os.getenv('GEMINI_API_KEY')
            model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
            
            if api_key:
                print(f"  {Colors.GREEN}✓ Gemini API key configured{Colors.END}")
                print(f"  {Colors.GREEN}✓ Model: {model}{Colors.END}")
            else:
                print(f"  {Colors.YELLOW}⚠️  Gemini API key not found in .env{Colors.END}")
                print(f"  {Colors.YELLOW}   Add GEMINI_API_KEY=your_key to .env file{Colors.END}")
        else:
            print(f"  {Colors.YELLOW}⚠️  .env file not found{Colors.END}")
            print(f"  {Colors.YELLOW}   Create .env file with GEMINI_API_KEY=your_key{Colors.END}")
            
    except Exception as e:
        print(f"  {Colors.YELLOW}○ Could not check Gemini config: {e}{Colors.END}")


def check_gpu():
    """Check GPU availability"""
    print(f"\n{Colors.BLUE}🎮 Checking GPU for AI Image Generation...{Colors.END}")
    
    try:
        import torch
        
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            print(f"  {Colors.GREEN}✓ GPU: {gpu_name}{Colors.END}")
            print(f"  {Colors.GREEN}✓ VRAM: {gpu_memory:.1f} GB{Colors.END}")
            
            if gpu_memory >= 8:
                print(f"  {Colors.GREEN}✓ SDXL ready (8GB+ VRAM){Colors.END}")
            if gpu_memory >= 12:
                print(f"  {Colors.GREEN}✓ FLUX.1 ready (12GB+ VRAM){Colors.END}")
            if gpu_memory >= 16:
                print(f"  {Colors.GREEN}✓ SD3 ready (16GB+ VRAM){Colors.END}")
        else:
            print(f"  {Colors.YELLOW}○ No NVIDIA GPU - using CPU (slower but works){Colors.END}")
            
    except ImportError:
        print(f"  {Colors.YELLOW}○ PyTorch not ready yet{Colors.END}")


def setup_environment():
    """Configure environment variables"""
    print(f"\n{Colors.BLUE}⚙️  Configuring environment...{Colors.END}")
    
    os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
    os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')
    os.environ.setdefault('TRANSFORMERS_VERBOSITY', 'error')
    os.environ.setdefault('DIFFUSERS_VERBOSITY', 'error')
    
    print(f"  {Colors.GREEN}✓ Environment ready{Colors.END}")
    
    import warnings
    warnings.filterwarnings('ignore')


def print_summary(results: dict):
    """Print installation summary"""
    print(f"\n{Colors.CYAN}{'═'*70}{Colors.END}")
    print(f"{Colors.BOLD}📊 INSTALLATION SUMMARY{Colors.END}")
    print(f"{Colors.CYAN}{'═'*70}{Colors.END}")
    
    print(f"  {Colors.GREEN}✓ Already installed: {len(results['already_installed'])} packages{Colors.END}")
    print(f"  {Colors.BLUE}✓ Newly installed:   {len(results['newly_installed'])} packages{Colors.END}")
    
    if results["failed"]:
        print(f"  {Colors.RED}✗ Failed:            {len(results['failed'])} packages{Colors.END}")
        print(f"    → {', '.join(results['failed'])}")
    
    print(f"{Colors.CYAN}{'═'*70}{Colors.END}")


def detect_cloud_environment() -> bool:
    """Check if running in a cloud environment"""
    cloud_indicators = ['RENDER', 'RAILWAY_PROJECT_ID', 'VERCEL', 'DYNO', 'HEROKU']
    return any(os.getenv(indicator) for indicator in cloud_indicators)


def should_install_local_image_gen() -> bool:
    """Determine if we should install local image generation packages"""
    # Check environment variable
    mode = os.getenv('IMAGE_GEN_MODE', 'auto').lower()
    
    if mode == 'api':
        return False  # Force API mode
    elif mode == 'local':
        return True  # Force local mode
    else:  # auto mode
        # Skip local packages in cloud environments
        if detect_cloud_environment():
            print(f"  {Colors.YELLOW}ℹ️  Cloud environment detected - skipping local image gen (10GB+){Colors.END}")
            print(f"  {Colors.GREEN}✓ Using Hugging Face API instead (free, no downloads){Colors.END}")
            return False
        else:
            print(f"  {Colors.BLUE}ℹ️  Local environment - local image gen packages available{Colors.END}")
            return True


def install_local_image_gen_packages():
    """Install local image generation packages (PyTorch + diffusers)"""
    if not should_install_local_image_gen():
        return
    
    print(f"\n{Colors.BLUE}🔥 Installing Local Image Generation (Optional - 10GB+)...{Colors.END}")
    print(f"  {Colors.YELLOW}This will take 10-30 minutes and download ~10GB{Colors.END}")
    print(f"  {Colors.YELLOW}Press Ctrl+C to skip and use API mode instead{Colors.END}\n")
    
    # Install PyTorch first
    install_pytorch()
    
    # Install other local image gen packages
    for pip_name, import_name, extra_args in LOCAL_IMAGE_GEN_PACKAGES[2:]:  # Skip torch/torchvision (already installed)
        if is_package_installed(import_name):
            print(f"  {Colors.GREEN}✓{Colors.END} {pip_name}")
        else:
            print(f"  {Colors.YELLOW}⏳{Colors.END} {pip_name} - installing...", end="\r")
            if install_package(pip_name, extra_args):
                print(f"  {Colors.GREEN}✓{Colors.END} {pip_name} - installed        ")
            else:
                print(f"  {Colors.RED}✗{Colors.END} {pip_name} - failed            ")


def print_ready_message():
    """Print ready message"""
    mode = "API" if not should_install_local_image_gen() else "Hybrid"
    
    print(f"""
{Colors.GREEN}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   ✅ ALL PACKAGES INSTALLED! ({mode} Mode)                              ║
║                                                                          ║
║   🚀 Starting server at: http://localhost:8000                           ║
║                                                                          ║
║   Available AI Features:                                                 ║
║   ├── 🎨 Image Generation ({mode})                                      ║
║   ├── 🤖 AI Chat (need: Gemini API key in .env)                          ║
║   ├── ✂️  Background Removal (ready)                                      ║
║   └── 📤 Export to PNG/JPG/WebP (ready)                                  ║
║                                                                          ║
║   Image Generation Mode: {mode}                                         ║
║   {"└── Using Hugging Face API (free, no model downloads)" if mode == "API" else "└── Local models will download on first use (~6GB)"}                    ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
{Colors.END}
""")


# ============================================================================
# MAIN FUNCTION
# ============================================================================

def run_auto_setup() -> bool:
    """Run complete auto setup"""
    print_banner()
    
    # Step 1: Upgrade pip
    upgrade_pip()
    
    # Step 2: Install core required packages
    results = check_and_install_packages()
    
    # Step 3: Optionally install local image gen packages (10GB+)
    try:
        install_local_image_gen_packages()
    except KeyboardInterrupt:
        print(f"\n  {Colors.YELLOW}⏩ Skipping local image gen - will use API mode{Colors.END}")
    
    # Step 4: Try optional packages
    install_optional_packages()
    
    # Step 5: Check Gemini API
    check_gemini()
    
    # Step 6: Check GPU (only if local mode)
    if should_install_local_image_gen():
        check_gpu()
    
    # Step 7: Setup environment
    setup_environment()
    
    # Step 8: Print summary
    print_summary(results)
    
    # Step 9: Ready message
    if len(results["failed"]) <= 2:  # Allow some non-critical failures
        print_ready_message()
        return True
    else:
        print(f"\n{Colors.YELLOW}⚠️  Some packages failed. Try: pip install -r requirements.txt{Colors.END}\n")
        return False


if __name__ == "__main__":
    success = run_auto_setup()
    sys.exit(0 if success else 1)
