#!/bin/bash

# Deploy Study Buddy AI to Theta Edge Cloud with proper configuration
# This script fixes OAuth and WebSocket issues for Theta deployment

set -e

echo "🚀 Deploying Study Buddy AI to Theta Edge Cloud..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env file not found. Please create it with your configuration."
    exit 1
fi

# Get the Theta domain from user
echo "📝 Please enter your Theta Edge Cloud domain (e.g., your-app.tec-s1.onthetaedgecloud.com):"
read -r THETA_DOMAIN

if [ -z "$THETA_DOMAIN" ]; then
    echo "❌ Domain cannot be empty."
    exit 1
fi

# Update .env file with BASE_URL
echo "🔧 Updating .env file with BASE_URL..."
if grep -q "BASE_URL" backend/.env; then
    # Update existing BASE_URL
    sed -i.bak "s|BASE_URL=.*|BASE_URL=https://$THETA_DOMAIN|" backend/.env
else
    # Add BASE_URL if it doesn't exist
    echo "BASE_URL=https://$THETA_DOMAIN" >> backend/.env
fi

# Set production environment
if grep -q "FLASK_ENV" backend/.env; then
    sed -i.bak "s|FLASK_ENV=.*|FLASK_ENV=production|" backend/.env
else
    echo "FLASK_ENV=production" >> backend/.env
fi

echo "✅ Environment configured for Theta Edge Cloud"

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t 4901178/study-buddy-ai:latest .

# Tag for your registry (replace with your registry)
echo "🏷️ Tagging image..."
docker tag 4901178/study-buddy-ai:latest 4901178/study-buddy-ai:theta-fixed

# Push to registry
echo "📤 Pushing to Docker registry..."
docker push 4901178/study-buddy-ai:theta-fixed

# Generate Kubernetes manifest
echo "📄 Generating Kubernetes manifest..."
cat > theta-deployment-fixed.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: study-buddy-ai
  labels:
    app: study-buddy-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: study-buddy-ai
  template:
    metadata:
      labels:
        app: study-buddy-ai
    spec:
      containers:
      - name: study-buddy-ai
        image: 4901178/study-buddy-ai:theta-fixed
        ports:
        - containerPort: 5000
        env:
        - name: FLASK_ENV
          value: "production"
        - name: BASE_URL
          value: "https://$THETA_DOMAIN"
        - name: THETA_API_KEY
          valueFrom:
            secretKeyRef:
              name: study-buddy-secrets
              key: theta-api-key
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: study-buddy-secrets
              key: secret-key
        - name: GOOGLE_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: study-buddy-secrets
              key: google-client-id
        - name: GOOGLE_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: study-buddy-secrets
              key: google-client-secret
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
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: study-buddy-ai-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
  - host: $THETA_DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: study-buddy-ai-service
            port:
              number: 80
EOF

echo "✅ Deployment files generated:"
echo "   - theta-deployment-fixed.yaml"
echo "   - Updated backend/.env with BASE_URL=https://$THETA_DOMAIN"
echo ""
echo "🎯 Next steps:"
echo "1. Apply the Kubernetes manifest: kubectl apply -f theta-deployment-fixed.yaml"
echo "2. Create secrets for your API keys"
echo "3. Your app will be available at: https://$THETA_DOMAIN"
echo ""
echo "🔧 Fixed issues:"
echo "   ✅ OAuth redirect URI now uses correct domain"
echo "   ✅ WebSocket connections use correct domain"
echo "   ✅ Audio/voice chat should work properly"
echo "   ✅ Google Drive integration should work"
