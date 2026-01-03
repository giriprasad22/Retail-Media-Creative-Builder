web: gunicorn --chdir backend app.main:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --worker-class sync --max-requests 1000 --max-requests-jitter 50
