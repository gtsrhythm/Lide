#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Error handling
set -e

# Function to check Python version
check_python_version() {
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 is not installed. Please install Python 3.7 or higher.${NC}"
        exit 1
    fi
    
    version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if (( $(echo "$version < 3.7" | bc -l) )); then
        echo -e "${RED}Python 3.7 or higher is required. Found version: $version${NC}"
        exit 1
    fi
}

# Function to setup virtual environment
setup_venv() {
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    source venv/bin/activate || {
        echo -e "${RED}Failed to activate virtual environment${NC}"
        exit 1
    }
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip install --upgrade pip
    pip install -r requirements.txt
}

# Function to create workspace
setup_workspace() {
    if [ ! -d "workspace" ]; then
        echo -e "${YELLOW}Creating workspace directory...${NC}"
        mkdir -p workspace/.backups
    fi
}

# Main execution
main() {
    local mode=$1
    
    echo -e "${GREEN}Starting LIDE setup...${NC}"
    
    # Check if clean install is requested
    if [ "$mode" == "clean" ]; then
        echo -e "${YELLOW}Performing clean install...${NC}"
        rm -rf venv
        mode="dev"
    fi
    
    # Check Python version
    check_python_version
    
    # Setup virtual environment
    setup_venv
    
    # Install dependencies
    install_deps
    
    # Setup workspace
    setup_workspace
    
    # Set Flask environment based on mode
    case $mode in
        "prod")
            echo -e "${GREEN}Starting in production mode...${NC}"
            export FLASK_ENV=production
            export FLASK_APP=app.py
            python3 -m flask run --host=0.0.0.0 --port=8000
            ;;
        "dev")
            echo -e "${GREEN}Starting in development mode...${NC}"
            export FLASK_ENV=development
            export FLASK_APP=app.py
            python3 -m flask run
            ;;
        *)
            echo -e "${GREEN}Starting in default mode...${NC}"
            export FLASK_ENV=production
            export FLASK_APP=app.py
            python3 -m flask run --host=127.0.0.1 --port=5000
            ;;
    esac
}

# Run main function with provided argument
main "$1"
