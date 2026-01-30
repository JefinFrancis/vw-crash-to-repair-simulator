# BeamNG.tech Installation Guide for VW Crash-to-Repair Simulator

## Overview

This guide provides step-by-step instructions for installing and configuring BeamNG.tech for the VW Brand Day Crash-to-Repair Experience.

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11 64-bit or Linux (Ubuntu 20.04+)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 15GB free space minimum
- **Graphics**: DirectX 11 compatible, dedicated GPU recommended
- **Network**: Internet connection for initial download and registration

### Required Software
- Python 3.9+ (already installed via setup script)
- Git (for project management)
- Web browser (Chrome/Firefox recommended)

---

## Step 1: Register for BeamNG.tech

### 1.1 Create Research Account
1. **Go to**: https://register.beamng.tech/
2. **Fill out registration form**:
   - Organization: Object Edge (or your organization)
   - Purpose: Research/Technology Demonstration
   - Project: VW Brand Day Crash-to-Repair Simulator
   - Duration: 3 months (minimum for event)
3. **Submit application** and wait for approval email
4. **Approval time**: Typically 1-3 business days

### 1.2 Download Access
- Once approved, you'll receive download links via email
- **Download size**: ~4-6GB depending on version
- **Note**: Links are time-limited (typically 30 days)

---

## Step 2: Install BeamNG.tech

### 2.1 Windows Installation

```powershell
# Download BeamNG.tech installer
# Double-click the downloaded .exe file

# Recommended installation path:
C:\BeamNG.tech\

# During installation:
# ✅ Accept license agreement
# ✅ Choose "Complete Installation"
# ✅ Install Visual C++ redistributables if prompted
# ✅ Allow firewall exceptions
```

### 2.2 Linux Installation

```bash
# Extract downloaded archive
tar -xzf BeamNG.tech-linux-vX.XX.tar.gz

# Move to installation directory
sudo mv BeamNG.tech /opt/
sudo chown -R $USER:$USER /opt/BeamNG.tech

# Make executable
chmod +x /opt/BeamNG.tech/BeamNG.tech

# Create symlink for easy access
sudo ln -sf /opt/BeamNG.tech/BeamNG.tech /usr/local/bin/beamng-tech
```

### 2.3 Verify Installation

```bash
# Test BeamNG.tech launches
/path/to/BeamNG.tech/BeamNG.tech --help

# Should show version and options
BeamNG.tech v0.XX - Research Version
```

---

## Step 3: Configure BeamNG.tech for VW Simulator

### 3.1 Set Environment Variables

#### Windows:
```powershell
# Set BNG_HOME environment variable
setx BNG_HOME "C:\BeamNG.tech"

# Verify
echo $env:BNG_HOME
```

#### Linux:
```bash
# Add to ~/.bashrc or ~/.profile
echo 'export BNG_HOME="/opt/BeamNG.tech"' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $BNG_HOME
```

### 3.2 Update Project Configuration

```bash
# Navigate to project directory
cd /home/jefin/Desktop/VW/vw-crash-to-repair-simulator

# Edit configuration file
nano config/config.yaml

# Update BeamNG settings:
beamng:
  home_path: "/opt/BeamNG.tech"  # or "C:\BeamNG.tech" on Windows
  host: "localhost"
  port: 25252
  user_folder: null  # Will use default
```

---

## Step 4: Install VW Vehicle Models

### 4.1 T-Cross Installation

```bash
# Navigate to your VW zip file
cd /home/jefin/Desktop/VW

# Extract T-Cross model
unzip volkswagen_tcross_v1.8.zip

# Copy to BeamNG mods directory
cp -r volkswagen_tcross_v1.8/* $BNG_HOME/mods/

# Alternative: Create symlink
ln -sf /home/jefin/Desktop/VW/volkswagen_tcross_v1.8 $BNG_HOME/mods/vw_tcross
```

### 4.2 Verify Vehicle Installation

1. **Launch BeamNG.tech**:
   ```bash
   $BNG_HOME/BeamNG.tech
   ```

2. **Check vehicle list**:
   - Go to Vehicle Selector
   - Look for VW T-Cross in vehicle list
   - Should appear under "Volkswagen" brand

### 4.3 Additional VW Models (Optional)

If you have other VW models:
- **Golf**: Similar installation process
- **Passat**: Check community mods at https://beamng.com/resources/
- **Custom Models**: Can be created using BeamNG's modeling tools

---

## Step 5: Configure for Crash-to-Repair Workflow

### 5.1 BeamNG.tech Startup Settings

Create startup configuration file:

```bash
# Create config file
nano $BNG_HOME/startup.ini

# Add these settings:
[Graphics]
GraphicsAPI=DirectX11
WindowMode=Windowed
Resolution=1920x1080

[Network]
EnableTCP=true
Port=25252
Host=127.0.0.1

[Simulation]
EnableDamageSystem=true
DamageDetailLevel=High
PhysicsSteps=2000

[Logging]
LogLevel=Info
LogFile=beamng_vw_demo.log
```

### 5.2 Test BeamNG-Python Connection

```bash
# Activate project virtual environment
source venv/bin/activate

# Test BeamNGpy connection
python -c "
from src.beamng import BeamNGSimulator, check_beamng_installation
import os

home_path = os.getenv('BNG_HOME')
print(f'BeamNG Home: {home_path}')
print(f'Installation Valid: {check_beamng_installation(home_path)}')

# Test connection (BeamNG must be running)
# simulator = BeamNGSimulator(home=home_path)
# print('Connection test would go here...')
"
```

---

## Step 6: Start and Test Complete System

### 6.1 Launch BeamNG.tech

```bash
# Start BeamNG.tech in background
$BNG_HOME/BeamNG.tech &

# Wait for startup (30-60 seconds)
sleep 60

# Check if running
ps aux | grep BeamNG
```

### 6.2 Start VW Simulator Application

```bash
# In project directory
./start.sh

# This will start:
# - API server on http://localhost:8000
# - Frontend on http://localhost:8080
```

### 6.3 Test Full Workflow

1. **Open browser**: http://localhost:8080
2. **Click "Conectar BeamNG.tech"**
3. **Should show**: "✅ Connected"
4. **Click "Iniciar Demonstração"**
5. **Load VW T-Cross scenario**
6. **Test crash simulation**

---

## Troubleshooting

### Common Issues and Solutions

#### 1. BeamNG.tech won't start
```bash
# Check dependencies
ldd $BNG_HOME/BeamNG.tech

# Install missing libraries (Ubuntu/Debian)
sudo apt-get install libc6 libgcc1 libstdc++6

# Check graphics drivers
glxinfo | grep OpenGL
```

#### 2. Python connection fails
```bash
# Check firewall (Linux)
sudo ufw allow 25252

# Check firewall (Windows)
# Windows Defender > Allow app through firewall > Add BeamNG.tech

# Verify port is listening
netstat -tlnp | grep 25252
```

#### 3. VW T-Cross not appearing
```bash
# Check mod installation
ls -la $BNG_HOME/mods/

# Check BeamNG logs
tail -f $BNG_HOME/beamng_vw_demo.log

# Restart BeamNG after mod installation
```

#### 4. Performance issues
```bash
# Lower graphics settings in BeamNG.tech
# Reduce physics detail level
# Close unnecessary applications
# Monitor system resources:
htop
```

### Error Codes and Solutions

| Error | Description | Solution |
|-------|-------------|----------|
| `ECONNREFUSED` | Cannot connect to BeamNG | Start BeamNG.tech first, check port 25252 |
| `FileNotFoundError` | BeamNG binary not found | Verify BNG_HOME path, check installation |
| `PermissionError` | Cannot access BeamNG directory | Check file permissions, run as correct user |
| `ModuleNotFoundError: beamngpy` | Python package missing | Run `pip install beamngpy` in venv |
| `Vehicle not found` | T-Cross model missing | Reinstall VW models, check mods directory |

---

## Event Day Checklist

### Pre-Event Setup
- [ ] BeamNG.tech installed and tested
- [ ] VW T-Cross model loaded and verified
- [ ] Python environment activated
- [ ] API server starts successfully
- [ ] Frontend loads without errors
- [ ] Full crash-to-repair workflow tested
- [ ] Backup scenarios prepared

### Event Machine Requirements
- [ ] Dedicated Windows/Linux machine
- [ ] BeamNG.tech pre-installed
- [ ] Project files deployed
- [ ] Network configured for demos
- [ ] Display outputs tested (projector/TV)
- [ ] Backup procedures documented

### Support Information
- **Brazil Support Team**: Valmor, Rene
- **Remote Support**: Available during event hours
- **Documentation**: All files in `docs/` directory
- **Logs Location**: `logs/` directory
- **Configuration**: `config/config.yaml`

---

## Performance Optimization

### Recommended Settings
```yaml
# config/config.yaml - Production settings
beamng:
  home_path: "/opt/BeamNG.tech"
  host: "localhost"  
  port: 25252
  
api:
  debug: false  # Disable debug mode for events
  
# BeamNG startup.ini
[Graphics]
WindowMode=Fullscreen
VSync=true
AntiAliasing=Low
ShadowQuality=Medium

[Simulation]
PhysicsSteps=1000  # Lower for better performance
DamageDetailLevel=Medium
```

### Monitor Performance
```bash
# Check system resources
htop

# Monitor BeamNG performance
tail -f $BNG_HOME/beamng_vw_demo.log

# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/health
```

---

## Additional Resources

### Documentation
- **BeamNG.tech Docs**: https://documentation.beamng.com/
- **BeamNGpy API**: https://documentation.beamng.com/api/beamngpy/
- **Community Forum**: https://www.beamng.com/forums/

### Support Contacts
- **BeamNG.tech Support**: licensing@beamng.gmbh
- **Technical Issues**: Via BeamNG forums (research tag)
- **Project Support**: Jefin (AI Agent Team Lead)

### Backup Plans
1. **Offline Demo Mode**: Use pre-recorded damage data
2. **Manual Input**: Allow manual damage selection
3. **Video Presentation**: Pre-recorded workflow demonstration
4. **Static Display**: Screenshots and explanation slides

---

*Last Updated: January 29, 2026*  
*Next Review: Before Event Day*