@echo off
setlocal enabledelayedexpansion

echo 🚀 Deploying Study Buddy AI to Theta Edge Cloud...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

REM Check if .env file exists
if not exist "backend\.env" (
    echo ❌ backend\.env file not found. Please create it with your configuration.
    exit /b 1
)

REM Get the Theta domain from user
set /p THETA_DOMAIN="📝 Please enter your Theta Edge Cloud domain (e.g., your-app.tec-s1.onthetaedgecloud.com): "

if "%THETA_DOMAIN%"=="" (
    echo ❌ Domain cannot be empty.
    exit /b 1
)

REM Update .env file with BASE_URL
echo 🔧 Updating .env file with BASE_URL...
findstr /c:"BASE_URL" backend\.env >nul
if errorlevel 1 (
    echo BASE_URL=https://%THETA_DOMAIN%>> backend\.env
) else (
    powershell -Command "(Get-Content backend\.env) -replace 'BASE_URL=.*', 'BASE_URL=https://%THETA_DOMAIN%' | Set-Content backend\.env"
)

REM Set production environment
findstr /c:"FLASK_ENV" backend\.env >nul
if errorlevel 1 (
    echo FLASK_ENV=production>> backend\.env
) else (
    powershell -Command "(Get-Content backend\.env) -replace 'FLASK_ENV=.*', 'FLASK_ENV=production' | Set-Content backend\.env"
)

echo ✅ Environment configured for Theta Edge Cloud

REM Build Docker image
echo 🔨 Building Docker image...
docker build -t 4901178/study-buddy-ai:latest .

REM Tag for your registry
echo 🏷️ Tagging image...
docker tag 4901178/study-buddy-ai:latest 4901178/study-buddy-ai:theta-fixed

REM Push to registry
echo 📤 Pushing to Docker registry...
docker push 4901178/study-buddy-ai:theta-fixed

REM Generate Kubernetes manifest
echo 📄 Generating Kubernetes manifest...
(
echo apiVersion: apps/v1
echo kind: Deployment
echo metadata:
echo   name: study-buddy-ai
echo   labels:
echo     app: study-buddy-ai
echo spec:
echo   replicas: 1
echo   selector:
echo     matchLabels:
echo       app: study-buddy-ai
echo   template:
echo     metadata:
echo       labels:
echo         app: study-buddy-ai
echo     spec:
echo       containers:
echo       - name: study-buddy-ai
echo         image: 4901178/study-buddy-ai:theta-fixed
echo         ports:
echo         - containerPort: 5000
echo         env:
echo         - name: FLASK_ENV
echo           value: "production"
echo         - name: BASE_URL
echo           value: "https://%THETA_DOMAIN%"
echo         - name: THETA_API_KEY
echo           valueFrom:
echo             secretKeyRef:
echo               name: study-buddy-secrets
echo               key: theta-api-key
echo         - name: SECRET_KEY
echo           valueFrom:
echo             secretKeyRef:
echo               name: study-buddy-secrets
echo               key: secret-key
echo         - name: GOOGLE_CLIENT_ID
echo           valueFrom:
echo             secretKeyRef:
echo               name: study-buddy-secrets
echo               key: google-client-id
echo         - name: GOOGLE_CLIENT_SECRET
echo           valueFrom:
echo             secretKeyRef:
echo               name: study-buddy-secrets
echo               key: google-client-secret
echo         resources:
echo           requests:
echo             memory: "512Mi"
echo             cpu: "250m"
echo           limits:
echo             memory: "1Gi"
echo             cpu: "500m"
echo         livenessProbe:
echo           httpGet:
echo             path: /api/check
echo             port: 5000
echo           initialDelaySeconds: 30
echo           periodSeconds: 10
echo         readinessProbe:
echo           httpGet:
echo             path: /api/check
echo             port: 5000
echo           initialDelaySeconds: 5
echo           periodSeconds: 5
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
echo   type: ClusterIP
echo ---
echo apiVersion: networking.k8s.io/v1
echo kind: Ingress
echo metadata:
echo   name: study-buddy-ai-ingress
echo   annotations:
echo     nginx.ingress.kubernetes.io/rewrite-target: /
echo     nginx.ingress.kubernetes.io/ssl-redirect: "true"
echo spec:
echo   rules:
echo   - host: %THETA_DOMAIN%
echo     http:
echo       paths:
echo       - path: /
echo         pathType: Prefix
echo         backend:
echo           service:
echo             name: study-buddy-ai-service
echo             port:
echo               number: 80
) > theta-deployment-fixed.yaml

echo ✅ Deployment files generated:
echo    - theta-deployment-fixed.yaml
echo    - Updated backend\.env with BASE_URL=https://%THETA_DOMAIN%
echo.
echo 🎯 Next steps:
echo 1. Apply the Kubernetes manifest: kubectl apply -f theta-deployment-fixed.yaml
echo 2. Create secrets for your API keys
echo 3. Your app will be available at: https://%THETA_DOMAIN%
echo.
echo 🔧 Fixed issues:
echo    ✅ OAuth redirect URI now uses correct domain
echo    ✅ WebSocket connections use correct domain
echo    ✅ Audio/voice chat should work properly
echo    ✅ Google Drive integration should work

pause
