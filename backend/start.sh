#!/bin/bash
set -e  # Exit on any error

echo "=== Railway Django Debug Start ==="
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "DEBUG: $DEBUG"
echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"

# Test basic Python
echo "=== Testing Python ==="
python --version

# Test Django import
echo "=== Testing Django import ==="
python -c "import django; print(f'Django version: {django.VERSION}')"

# Test settings
echo "=== Testing settings ==="
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
print('Settings loaded successfully')
"

# Test database connection
echo "=== Testing database connection ==="
python manage.py check --database

# Run migrations with verbose output
echo "=== Running migrations ==="
python manage.py migrate --verbosity=2

# Collect static files
echo "=== Collecting static files ==="
python manage.py collectstatic --noinput --verbosity=2

# Start server with debug logging
echo "=== Starting gunicorn ==="
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:$PORT \
  --log-level debug \
  --access-logfile - \
  --error-logfile - \
  --capture-output