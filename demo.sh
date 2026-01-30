#!/bin/bash

# VW Crash-to-Repair Simulator - Demo Script
# This script demonstrates the API capabilities

API_BASE="http://localhost:8001"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚗 VW Crash-to-Repair Simulator - Demo${NC}"
echo "======================================="

# Function to check API response
check_api() {
    local endpoint=$1
    local description=$2
    
    echo -e "${YELLOW}Testing:${NC} $description"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_BASE$endpoint")
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - $endpoint"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ FAILED${NC} - HTTP $http_code"
        echo "$body"
    fi
    echo ""
}

# Function to test POST endpoint
test_post() {
    local endpoint=$1
    local data=$2
    local description=$3
    
    echo -e "${YELLOW}Testing:${NC} $description"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_BASE$endpoint")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ SUCCESS${NC} - $endpoint"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ FAILED${NC} - HTTP $http_code"
        echo "$body"
    fi
    echo ""
}

echo -e "${BLUE}1. Health Check${NC}"
echo "==============="
check_api "/api/health" "System health check"

echo -e "${BLUE}2. BeamNG Connection${NC}"
echo "==================="
test_post "/api/health/connect" "{}" "BeamNG.tech connection"

echo -e "${BLUE}3. Scenario Loading${NC}"
echo "=================="
test_post "/api/health/scenario" '{"vehicle": "vw_tcross", "scenario": "crash_test"}' "Load VW T-Cross scenario"

echo -e "${BLUE}4. Damage Analysis${NC}"
echo "=================="
test_post "/api/damage/analyze" '{"vehicle_id": "vw_tcross_001", "simulation_id": "demo_crash"}' "Analyze vehicle damage"

echo -e "${BLUE}5. Repair Estimates${NC}"
echo "==================="
test_post "/api/estimates/calculate" '{
    "vehicle_id": "vw_tcross_001",
    "damage_report": {
        "damage_components": [
            {"name": "Para-choque Dianteiro", "severity": "high"},
            {"name": "Farol Esquerdo", "severity": "medium"}
        ]
    },
    "location": "SP"
}' "Calculate repair estimate"

echo -e "${BLUE}6. Dealer Search${NC}"
echo "================"
test_post "/api/dealers/search" '{
    "location": "São Paulo",
    "services": ["crash_repair"],
    "parts_availability": ["VW-2GA807221", "VW-2GA941005B"]
}' "Search for VW dealers"

echo -e "${BLUE}7. Appointment Booking${NC}"
echo "======================"
test_post "/api/appointments/schedule" '{
    "dealer_id": "vw_sp_001",
    "customer": {
        "name": "Demo Cliente",
        "email": "demo@test.com",
        "phone": "(11) 99999-9999"
    },
    "service_type": "crash_repair",
    "preferred_date": "2026-01-31"
}' "Schedule service appointment"

echo -e "${GREEN}🎉 Demo completed!${NC}"
echo ""
echo -e "${BLUE}Frontend Demo:${NC}"
echo "• Open http://localhost:8080 in your browser"
echo "• Click through the complete workflow"
echo "• Test with and without BeamNG.tech connected"
echo ""
echo -e "${BLUE}API Documentation:${NC}"
echo "• Full API docs: http://localhost:8000/docs"
echo "• Interactive testing available in Swagger UI"