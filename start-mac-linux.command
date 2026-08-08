#!/bin/bash
cd "$(dirname "$0")"
echo "Starting local server for BrahmnMitra..."
echo ""
echo "Open your browser to:  http://localhost:8000"
echo "Press Ctrl+C to stop."
echo ""
python3 -m http.server 8000
