#!/bin/bash

# VW Crash-to-Repair Simulator - Startup Script
# This script starts the complete application environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/home/jefin/Desktop/VW/vw-crash-to-repair-simulator"

echo -e "${BLUE}🚗 VW Crash-to-Repair Simulator - Iniciando...${NC}"
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Aguardando $service_name iniciar...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name está pronto!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ Timeout aguardando $service_name${NC}"
    return 1
}

# Function to stop running services
cleanup() {
    echo -e "\n${YELLOW}🛑 Parando serviços...${NC}"
    
    # Kill API server
    if [ ! -z "$API_PID" ] && kill -0 $API_PID 2>/dev/null; then
        echo "Parando API server (PID: $API_PID)"
        kill $API_PID 2>/dev/null
    fi
    
    # Kill frontend server
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Parando frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Kill any remaining python processes
    pkill -f "uvicorn.*vw-crash-to-repair" 2>/dev/null || true
    pkill -f "python.*-m http.server" 2>/dev/null || true
    
    echo -e "${GREEN}🏁 Aplicação finalizada!${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Change to project directory
cd "$PROJECT_DIR" || {
    echo -e "${RED}❌ Erro: Diretório do projeto não encontrado: $PROJECT_DIR${NC}"
    exit 1
}

echo -e "${BLUE}📁 Diretório do projeto: $PROJECT_DIR${NC}"

# Check dependencies
echo -e "\n${BLUE}🔍 Verificando dependências...${NC}"

if ! command_exists python3; then
    echo -e "${RED}❌ Python3 não encontrado${NC}"
    exit 1
fi

if [ ! -f "venv/bin/activate" ]; then
    echo -e "${RED}❌ Ambiente virtual não encontrado. Execute setup.sh primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependências OK${NC}"

# Activate virtual environment
echo -e "\n${BLUE}🐍 Ativando ambiente virtual...${NC}"
source venv/bin/activate

# Check if ports are available
echo -e "\n${BLUE}🔌 Verificando portas...${NC}"

if port_in_use 8000; then
    echo -e "${YELLOW}⚠️  Porta 8000 já está em uso (API). Tentando parar processo existente...${NC}"
    pkill -f "uvicorn.*8000" 2>/dev/null || true
    sleep 2
fi

if port_in_use 8080; then
    echo -e "${YELLOW}⚠️  Porta 8080 já está em uso (Frontend). Tentando parar processo existente...${NC}"
    pkill -f "python.*8080" 2>/dev/null || true
    sleep 2
fi

# Start API server
echo -e "\n${BLUE}🚀 Iniciando API server...${NC}"
cd src
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --log-level info &
API_PID=$!
cd ..

echo -e "${GREEN}✅ API server iniciado (PID: $API_PID)${NC}"

# Wait for API to be ready
if ! wait_for_service "http://localhost:8000/api/health" "API server"; then
    echo -e "${RED}❌ Falha ao iniciar API server${NC}"
    cleanup
    exit 1
fi

# Start frontend server
echo -e "\n${BLUE}🌐 Iniciando frontend server...${NC}"
cd src/frontend
python -m http.server 8080 &
FRONTEND_PID=$!
cd ../..

echo -e "${GREEN}✅ Frontend server iniciado (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:8080" "Frontend server"; then
    echo -e "${RED}❌ Falha ao iniciar frontend server${NC}"
    cleanup
    exit 1
fi

# Show status and URLs
echo -e "\n${GREEN}🎉 VW Crash-to-Repair Simulator está funcionando!${NC}"
echo "=================================================="
echo -e "${BLUE}📱 Interface Web:${NC}     http://localhost:8080"
echo -e "${BLUE}🔧 API Documentation:${NC} http://localhost:8000/docs"
echo -e "${BLUE}❤️  API Health Check:${NC} http://localhost:8000/api/health"
echo ""
echo -e "${YELLOW}💡 Dicas:${NC}"
echo "   • Pressione Ctrl+C para parar a aplicação"
echo "   • Verifique os logs abaixo para debug"
echo "   • Para usar o BeamNG, instale conforme docs/BEAMNG_INSTALLATION.md"
echo ""

# Check BeamNG status
echo -e "${BLUE}🎮 Verificando status do BeamNG.tech...${NC}"
BEAMNG_STATUS=$(curl -s http://localhost:8000/api/health | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('connected' if data.get('beamng_connected') else 'disconnected')
except:
    print('error')
" 2>/dev/null)

case $BEAMNG_STATUS in
    "connected")
        echo -e "${GREEN}✅ BeamNG.tech está conectado e pronto!${NC}"
        ;;
    "disconnected")
        echo -e "${YELLOW}⚠️  BeamNG.tech não está conectado${NC}"
        echo -e "${YELLOW}   → Instale e inicie conforme docs/BEAMNG_INSTALLATION.md${NC}"
        echo -e "${YELLOW}   → Use o botão 'Conectar BeamNG.tech' na interface${NC}"
        ;;
    *)
        echo -e "${RED}❌ Erro ao verificar status do BeamNG.tech${NC}"
        ;;
esac

echo ""
echo -e "${GREEN}🚗 Acesse http://localhost:8080 para começar!${NC}"
echo "=================================================="

# Show live logs (optional)
echo -e "\n${BLUE}📋 Logs em tempo real (Ctrl+C para parar):${NC}"
echo "=================================================="

# Monitor both processes and show their output
wait

# If we reach here, one of the processes died
echo -e "\n${RED}❌ Um dos serviços parou inesperadamente${NC}"
cleanup