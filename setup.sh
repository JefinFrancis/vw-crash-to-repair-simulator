#!/bin/bash
# VW Crash-to-Repair Simulator - Setup Script

set -e  # Exit on any error

echo "🚗 Setting up VW Crash-to-Repair Simulator..."
echo "================================================"

# Check Python version
echo "Checking Python version..."
python3 --version || { echo "❌ Python 3 not found. Please install Python 3.9+"; exit 1; }

# Create virtual environment
echo "Creating Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create data directories
echo "Creating data directories..."
mkdir -p data/parts
mkdir -p data/dealers
mkdir -p data/vehicles
mkdir -p logs

# Create config directory and default config
echo "Setting up configuration..."
mkdir -p config

# Create default configuration if it doesn't exist
if [ ! -f "config/config.yaml" ]; then
    echo "Creating default configuration..."
    cat > config/config.yaml << EOL
# VW Crash-to-Repair Simulator Configuration

beamng:
  home_path: ""  # Set path to your BeamNG.tech installation
  host: "localhost"
  port: 25252
  user_folder: null

database:
  type: "json"  # json, sqlite, postgresql
  connection_string: null

api:
  host: "localhost"
  port: 8000
  debug: true
  cors_origins:
    - "http://localhost:8080"

frontend:
  host: "localhost"
  port: 8080
  static_path: "src/frontend/static"

log_level: "INFO"
data_dir: "data"
EOL
fi

# Check for BeamNG.tech installation
echo "Checking for BeamNG.tech installation..."
if [ -z "$BNG_HOME" ]; then
    echo "⚠️  BNG_HOME environment variable not set."
    echo "   Please set it to your BeamNG.tech installation path:"
    echo "   export BNG_HOME=/path/to/beamng/tech"
    echo ""
    echo "   You can also edit config/config.yaml to set the path."
else
    echo "✅ Found BNG_HOME: $BNG_HOME"
    # Update config with BNG_HOME
    sed -i "s|home_path: \"\"|home_path: \"$BNG_HOME\"|" config/config.yaml
fi

# Install BeamNG T-Cross model if zip file exists
TCROSS_ZIP="../volkswagen_tcross_v1.8.zip"
if [ -f "$TCROSS_ZIP" ]; then
    echo "Found VW T-Cross model zip file..."
    echo "📝 Manual step required:"
    echo "   1. Install the VW T-Cross model in BeamNG.tech:"
    echo "   2. Extract $TCROSS_ZIP to your BeamNG.tech/mods directory"
    echo "   3. Restart BeamNG.tech to load the new vehicle"
else
    echo "⚠️  VW T-Cross model zip not found at $TCROSS_ZIP"
    echo "   Please ensure you have the VW vehicle models for BeamNG.tech"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Install BeamNG.tech from: https://register.beamng.tech/"
echo "2. Update config/config.yaml with your BeamNG.tech path"
echo "3. Install VW vehicle models in BeamNG.tech"
echo "4. Run: ./start.sh to start the application"
echo ""
echo "For development:"
echo "  source venv/bin/activate  # Activate virtual environment"
echo "  python -m src.api.main    # Start API server"
echo ""