#!/usr/bin/env bash
set -euo pipefail

echo "=== InsightFlow AI Setup ==="

python3 -c "import sys; assert sys.version_info >= (3,11), 'Python 3.11+ required'" || {
    echo "ERROR: Python 3.11+ required"
    exit 1
}

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env"
fi

cd backend
pip install -r requirements.txt

echo ""
echo "Start with: docker-compose up --build"
echo "Then seed data: docker-compose exec backend python ../scripts/seed_data.py"
echo "Dashboard: http://localhost:3000"
