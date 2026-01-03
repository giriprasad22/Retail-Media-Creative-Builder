"""
Suppress PyTorch CUDA warnings globally
Add this at the start of main.py to suppress warnings throughout the app
"""
import warnings
import os

# Suppress PyTorch CUDA warnings
warnings.filterwarnings('ignore', message='.*CUDA.*')
warnings.filterwarnings('ignore', category=UserWarning, module='torch')

# Set environment variables to disable CUDA
os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
