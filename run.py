#!/usr/bin/env python
"""
Retail Media Creative Builder - Quick Start Script
Run this file to automatically install all dependencies and start the server.

Usage:
    python run.py (local development)
    
For production deployment (Railway):
    gunicorn --chdir backend app.main:app --bind 0.0.0.0:$PORT
"""
import os
import sys
import subprocess

# Change to backend directory
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, "backend")
os.chdir(backend_dir)

# Add backend to path
sys.path.insert(0, backend_dir)

print("""
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🎨 RETAIL MEDIA CREATIVE BUILDER                                   ║
║   ─────────────────────────────────                                  ║
║   AI-Powered Advertising Creative Generation                         ║
║                                                                      ║
║   Features:                                                          ║
║   • SDXL, SD3, FLUX.1 Image Generation                              ║
║   • AI Chat with Google Gemini (gemini-2.5-flash)                   ║
║   • Background Removal                                               ║
║   • Multi-Platform Export                                            ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
""")

# Ensure app is a package
app_init = os.path.join(backend_dir, "app", "__init__.py")
os.makedirs(os.path.dirname(app_init), exist_ok=True)
if not os.path.exists(app_init):
    open(app_init, 'a').close()

# Run the Flask app
try:
    from app.main import app
    
    # Use Railway's PORT or default to 8000
    port = int(os.environ.get('PORT', 8000))
    
    print("\n" + "="*60)
    print(f"🚀 Starting server at http://localhost:{port}")
    print(f"📂 Open http://localhost:{port} in your browser")
    print("="*60 + "\n")
    
    # Run Flask development server (local only)
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
    
except KeyboardInterrupt:
    print("\n\n👋 Server stopped. Goodbye!")
except ImportError as e:
    print(f"\n❌ Import Error: {e}")
    print("\n⚠️  Please ensure:")
    print("  1. The file 'backend/app/main.py' exists")
    print("  2. The 'app' directory has an '__init__.py' file")
    print("  3. All dependencies are installed: pip install -r ../requirements.txt")
    print("\nAttempting fallback import...")
    try:
        import main
        app = main.app
        port = int(os.environ.get('PORT', 8000))
        print(f"\n✅ Using fallback import - Starting on port {port}")
        app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
    except Exception as fallback_error:
        print(f"❌ Fallback also failed: {fallback_error}")
        print("\nPlease check your installation.")
except Exception as e:
    print(f"\n❌ Error starting server: {e}")
    print("\nTry running manually:")
    print("  cd backend")
    print("  pip install -r ../requirements.txt")
    print("  python -m flask --app app.main run --port 8000")
