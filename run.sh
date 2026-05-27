#!/bin/bash

# PITWALL CYBERPUNK ONE-CLICK LAUNCHER
# Designed to build, configure, and boot both Frontend and Backend concurrently with clean SIGINT cleanup.

# Activate virtual environment if present
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Ensure Homebrew and standard local paths are in the PATH on macOS (appended to avoid shadowing python/pip)
if [[ "$OSTYPE" == "darwin"* ]]; then
    export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
fi

# ANSI Color Codes for Premium Terminal UI
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear
echo -e "${CYAN}${BOLD}"
echo "====================================================================="
echo "        ____  _ __ _       __      ____                  "
echo "       / __ \(_) /| |     / /___ _/ / /                  "
echo "      / /_/ / / __/ | /| / / __ \`/ / /                   "
echo "     / ____/ / /_ | |/ |/ / /_/ / / /                    "
echo "    /_/   /_/\__/ |__/|__/\__,_/_/_/                     "
echo "                                                         "
echo "           -- CINEMATIC PEAK PERFORMANCE RECONSTRUCTION --   "
echo "====================================================================="
echo -e "${NC}"

# Function to check dependency presence
check_dep() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} $2 is not installed or not in system PATH."
        echo -e "        Please install $2 and try again."
        exit 1
    fi
}

echo -e "${CYAN}[1/4] Checking System Dependencies...${NC}"
check_dep "node" "Node.js (v18+)"
check_dep "npm" "npm package manager"
check_dep "python3" "Python 3.9+"
echo -e "${GREEN}[SUCCESS] Node.js and Python verified.${NC}\n"

# Verify Ollama running or warn
echo -e "${CYAN}[2/4] Checking Ollama AI Environment...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${GREEN}[SUCCESS] Ollama is active on port 11434.${NC}"
else
    echo -e "${YELLOW}[WARNING] Ollama is not running. Technical AI Debriefs will fallback to grounded logs.${NC}"
    echo -e "          (To enable Granite coaching, open Ollama and run: 'ollama pull granite3.1-dense:2b')\n"
fi

# Check for .env file at root
echo -e "${CYAN}[2.5/4] Loading Environment Configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[WARNING] Root '.env' file not found. Automatically creating from template '.env.example'...${NC}"
    cp .env.example .env
    echo -e "          Please update the '.env' file in the root folder with your Watson TTS credentials if desired."
else
    echo -e "${GREEN}[SUCCESS] .env configuration loaded successfully.${NC}"
fi
echo ""

echo -e "${CYAN}[3/4] Ensuring Python and Node Dependencies are Installed...${NC}"
echo -e "Installing Python requirements..."
pip3 install -r requirements.txt --quiet
echo -e "${GREEN}[SUCCESS] Python packages up to date.${NC}"

echo -e "Checking Frontend modules..."
cd frontend
npm install --no-audit --no-fund --quiet
cd ..
echo -e "${GREEN}[SUCCESS] Node modules verified.${NC}\n"

# CONCURRENT PROCESS MANAGEMENT & SIGINT TRAP
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}[SHUTDOWN] Terminating PitWall Orchestrator and Replay processes...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null
    fi
    echo -e "${GREEN}[CLEANUP COMPLETE] Goodbye, Driver.${NC}"
    exit 0
}

# Trap Ctrl+C (SIGINT) and exit cleanly
trap cleanup SIGINT

echo -e "${CYAN}[4/4] Deploying PitWall Mission Control...${NC}"

# Boot Python Backend
python3 -m backend.app > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 1.5

# Boot React Frontend dev server
cd frontend
npm run dev -- --clearScreen false > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}${BOLD}====================================================================="
echo -e "         🚀  PITWALL IS NOW FULLY DEPLOYED AND ONLINE!"
echo -e "=====================================================================${NC}"
echo -e "\n  ${BOLD}➜  Frontend (Replay Interface):${NC}  ${CYAN}${BOLD}http://localhost:5173/${NC}"
echo -e "  ${BOLD}➜  Backend (Telemetry API):${NC}     ${CYAN}${BOLD}http://localhost:8000/${NC}"
echo -e "\n${YELLOW}Press [Ctrl+C] at any time to cleanly shut down all services.${NC}\n"

# Keep the script running to hold the processes
wait
