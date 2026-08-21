#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Smile CRMS - Render Deployment Verification Script${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: package.json not found in current directory${NC}"
    echo "  Please run this script from the repository root"
    exit 1
fi

echo -e "${YELLOW}📋 Checking Repository Structure...${NC}\n"

# Check for backend directory
if [ -d "backend" ]; then
    echo -e "${GREEN}✓ backend/ directory found${NC}"
else
    echo -e "${RED}✗ backend/ directory not found${NC}"
    exit 1
fi

# Check for backend package.json
if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}✓ backend/package.json found${NC}"
else
    echo -e "${RED}✗ backend/package.json not found${NC}"
    exit 1
fi

# Check for prisma schema
if [ -f "backend/prisma/schema.prisma" ]; then
    echo -e "${GREEN}✓ backend/prisma/schema.prisma found${NC}"
else
    echo -e "${RED}✗ backend/prisma/schema.prisma not found${NC}"
    exit 1
fi

# Check for Dockerfile
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✓ Dockerfile found at repository root${NC}"
elif [ -f "backend/Dockerfile" ]; then
    echo -e "${YELLOW}⚠ Dockerfile found only in backend/ directory${NC}"
    echo "  Consider moving it to repository root for Render"
fi

echo ""
echo -e "${YELLOW}🐳 Checking Docker Configuration...${NC}\n"

# Check for .dockerignore
if [ -f ".dockerignore" ]; then
    echo -e "${GREEN}✓ .dockerignore found${NC}"
else
    echo -e "${YELLOW}⚠ .dockerignore not found (not critical, but recommended)${NC}"
fi

# Check for render.yaml
if [ -f "render.yaml" ]; then
    echo -e "${GREEN}✓ render.yaml found${NC}"
else
    echo -e "${YELLOW}⚠ render.yaml not found (optional - you can configure manually)${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Checking Backend Configuration...${NC}\n"

# Check for NestJS build script
if grep -q '"build"' backend/package.json; then
    echo -e "${GREEN}✓ build script found in backend/package.json${NC}"
else
    echo -e "${RED}✗ build script not found in backend/package.json${NC}"
fi

# Check for .env.example
if [ -f ".env.example" ] || [ -f "backend/.env.example" ]; then
    echo -e "${GREEN}✓ .env.example found${NC}"
else
    echo -e "${YELLOW}⚠ .env.example not found (recommended for documentation)${NC}"
fi

echo ""
echo -e "${YELLOW}🔧 Environment Setup Check...${NC}\n"

# Check if Node is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Node.js not found (needed for local testing)${NC}"
fi

# Check if npm is installed
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
fi

# Check if Docker is installed
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓ Docker installed: $DOCKER_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ Docker not installed (needed for local Docker testing)${NC}"
fi

# Check if git is installed
if command -v git &> /dev/null; then
    echo -e "${GREEN}✓ Git installed${NC}"
else
    echo -e "${RED}✗ Git not found${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Optional Checks...${NC}\n"

# Check if Prisma is installed
if [ -d "backend/node_modules/@prisma" ]; then
    echo -e "${GREEN}✓ Prisma installed in backend/node_modules${NC}"
else
    echo -e "${YELLOW}⚠ Prisma not installed locally (will be installed during Docker build)${NC}"
fi

# Check for GitHub
if [ -d ".git" ]; then
    echo -e "${GREEN}✓ Git repository initialized${NC}"
    
    # Check for remote
    if git remote -v | grep -q "origin"; then
        echo -e "${GREEN}✓ Git remote 'origin' configured${NC}"
    else
        echo -e "${YELLOW}⚠ Git remote 'origin' not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Not a Git repository${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Verification Complete!${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Ensure all ${GREEN}✓${NC} checks passed"
echo "2. Fix any ${RED}✗${NC} errors"
echo "3. Review ${YELLOW}⚠${NC} warnings (recommended but not critical)"
echo ""
echo "To deploy to Render:"
echo "  1. git add Dockerfile .dockerignore render.yaml .env.example"
echo "  2. git commit -m 'Fix: Update Docker configuration for Render'"
echo "  3. git push origin develop"
echo "  4. Go to Render Dashboard and create new service from your repo"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
