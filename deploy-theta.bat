@echo off
setlocal enabledelayedexpansion

REM Study Buddy AI Assistant - Theta Edge Cloud Deployment Script (Windows)

echo 🚀 Study Buddy AI Assistant - Theta Edge Cloud Deployment
echo ==================================================

REM Configuration
set IMAGE_NAME=study-buddy-ai
set TAG=latest
set REGISTRY=your-registry.com
set FULL_IMAGE_NAME=%REGISTRY%/%IMAGE_NAME%:%TAG%

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from template...
    if exist "env.production.template" (
        copy env.production.template .env >nul
        echo ⚠️  Please edit .env file with your actual configuration before deploying.
        echo ⚠️  Required variables: THETA_API_KEY, SECRET_KEY
        exit /b 1
    ) else (
        echo ❌ No environment template found. Please create .env file manually.
        exit /b 1
    )
)

echo ✅ Environment validation passed

REM Build the Docker image
echo 🔨 Building Docker image...
docker build -t %IMAGE_NAME%:%TAG% .

if errorlevel 1 (
    echo ❌ Docker build failed
    exit /b 1
)

echo ✅ Docker image built successfully

REM Tag for registry
echo 🏷️  Tagging image for registry...
docker tag %IMAGE_NAME%:%TAG% %FULL_IMAGE_NAME%

REM Push to registry
echo 📤 Pushing to registry...
docker push %FULL_IMAGE_NAME%

if errorlevel 1 (
    echo ❌ Failed to push image
    exit /b 1
)

echo ✅ Image pushed successfully to %FULL_IMAGE_NAME%

REM Create deployment manifest for Theta Edge Cloud
echo 📝 Creating Theta Edge Cloud deployment manifest...

(
echo apiVersion: v1
echo kind: Pod
echo metadata:
echo   name: study-buddy-ai
echo   labels:
echo     app: study-buddy-ai
echo spec:
echo   containers:
echo   - name: study-buddy-ai
echo     image: %FULL_IMAGE_NAME%
echo     ports:
echo     - containerPort: 5000
echo     env:
echo     - name: THETA_API_KEY
echo       value: "your_theta_api_key_here"
echo     - name: SECRET_KEY
echo       value: "your_secure_jwt_secret_key_here"
echo     - name: FLASK_ENV
echo       value: "production"
echo     - name: HOST
echo       value: "0.0.0.0"
echo     - name: PORT
echo       value: "5000"
echo     resources:
echo       requests:
echo         memory: "512Mi"
echo         cpu: "250m"
echo       limits:
echo         memory: "1Gi"
echo         cpu: "500m"
echo     livenessProbe:
echo       httpGet:
echo         path: /api/check
echo         port: 5000
echo       initialDelaySeconds: 30
echo       periodSeconds: 10
echo     readinessProbe:
echo       httpGet:
echo         path: /api/check
echo         port: 5000
echo       initialDelaySeconds: 5
echo       periodSeconds: 5
echo ---
echo apiVersion: v1
echo kind: Service
echo metadata:
echo   name: study-buddy-ai-service
echo spec:
echo   selector:
echo     app: study-buddy-ai
echo   ports:
echo   - protocol: TCP
echo     port: 80
echo     targetPort: 5000
echo   type: LoadBalancer
) > theta-deployment.yaml

echo ✅ Deployment manifest created: theta-deployment.yaml

echo.
echo 🎉 Deployment preparation completed!
echo.
echo 📋 Next steps for Theta Edge Cloud:
echo 1. Upload the Docker image to your Theta Edge Cloud registry
echo 2. Deploy using the generated theta-deployment.yaml
echo 3. Configure your domain and SSL certificates
echo 4. Set up monitoring and logging
echo.
echo 🔧 Manual deployment commands:
echo kubectl apply -f theta-deployment.yaml
echo.
echo 📊 Check deployment status:
echo kubectl get pods -l app=study-buddy-ai
echo kubectl get services -l app=study-buddy-ai
echo.
echo ✨ Happy deploying!

pause
