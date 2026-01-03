#!/usr/bin/env python
"""
Retail Media Creative Builder - Quick Start Script
Run this file to automatically install all dependencies and start the server.

Usage:
    python run.py
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
    
    print("\n" + "="*60)
    print("🚀 Starting server at http://localhost:8000")
    print("📂 Open http://localhost:8000 in your browser")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=8000, debug=True, use_reloader=False)
    
except KeyboardInterrupt:
    print("\n\n👋 Server stopped. Goodbye!")
except Exception as e:
    print(f"\n❌ Error starting server: {e}")
    print("\nTry running manually:")
    print("  cd backend")
    print("  pip install -r requirements.txt")
    print("  python -m flask --app app.main run --port 8000")
