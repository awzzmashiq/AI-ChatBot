#!/bin/bash

# Study Buddy AI Assistant - Theta Edge Cloud Deployment Script

set -e

# Configuration
IMAGE_NAME="study-buddy-ai"
TAG="latest"
REGISTRY="your-registry.com"  # Replace with your Docker registry
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Study Buddy AI Assistant - Theta Edge Cloud Deployment${NC}"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f "env.production.template" ]; then
        cp env.production.template .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your actual configuration before deploying.${NC}"
        echo -e "${YELLOW}⚠️  Required variables: THETA_API_KEY, SECRET_KEY${NC}"
        exit 1
    else
        echo -e "${RED}❌ No environment template found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Validate required environment variables
source .env
if [ -z "$THETA_API_KEY" ] || [ "$THETA_API_KEY" = "your_theta_api_key_here" ]; then
    echo -e "${RED}❌ THETA_API_KEY is not set in .env file${NC}"
    exit 1
fi

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your_secure_jwt_secret_key_here" ]; then
    echo -e "${RED}❌ SECRET_KEY is not set in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment validation passed${NC}"

# Build the Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Tag for registry
echo -e "${YELLOW}🏷️  Tagging image for registry...${NC}"
docker tag ${IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}

# Push to registry
echo -e "${YELLOW}📤 Pushing to registry...${NC}"
docker push ${FULL_IMAGE_NAME}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pushed successfully to ${FULL_IMAGE_NAME}${NC}"
else
    echo -e "${RED}❌ Failed to push image${NC}"
    exit 1
fi

# Create deployment manifest for Theta Edge Cloud
echo -e "${YELLOW}📝 Creating Theta Edge Cloud deployment manifest...${NC}"

cat > theta-deployment.yaml << EOF
apiVersion: v1
kind: Pod
metadata:
  name: study-buddy-ai
  labels:
    app: study-buddy-ai
spec:
  containers:
  - name: study-buddy-ai
    image: ${FULL_IMAGE_NAME}
    ports:
    - containerPort: 5000
    env:
    - name: THETA_API_KEY
      value: "${THETA_API_KEY}"
    - name: SECRET_KEY
      value: "${SECRET_KEY}"
    - name: FLASK_ENV
      value: "production"
    - name: HOST
      value: "0.0.0.0"
    - name: PORT
      value: "5000"
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "500m"
    livenessProbe:
      httpGet:
        path: /api/check
        port: 5000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /api/check
        port: 5000
      initialDelaySeconds: 5
      periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: study-buddy-ai-service
spec:
  selector:
    app: study-buddy-ai
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: LoadBalancer
EOF

echo -e "${GREEN}✅ Deployment manifest created: theta-deployment.yaml${NC}"

# Instructions for Theta Edge Cloud
echo ""
echo -e "${GREEN}🎉 Deployment preparation completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps for Theta Edge Cloud:${NC}"
echo "1. Upload the Docker image to your Theta Edge Cloud registry"
echo "2. Deploy using the generated theta-deployment.yaml"
echo "3. Configure your domain and SSL certificates"
echo "4. Set up monitoring and logging"
echo ""
echo -e "${YELLOW}🔧 Manual deployment commands:${NC}"
echo "kubectl apply -f theta-deployment.yaml"
echo ""
echo -e "${YELLOW}📊 Check deployment status:${NC}"
echo "kubectl get pods -l app=study-buddy-ai"
echo "kubectl get services -l app=study-buddy-ai"
echo ""
echo -e "${GREEN}✨ Happy deploying!${NC}"
