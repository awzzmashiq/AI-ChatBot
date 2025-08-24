# 🐳 Study Buddy AI Assistant - Docker Deployment Guide

This guide will help you deploy the Study Buddy AI Assistant as a single Docker container for Theta Edge Cloud or any other container platform.

## 📋 Prerequisites

- Docker installed and running
- Theta AI API key (get one at [Theta AI](https://www.thetavideoapi.com/))
- Docker registry access (for pushing images)

## 🚀 Quick Start

### 1. Environment Setup

1. **Copy the environment template:**
   ```bash
   cp env.production.template .env
   ```

2. **Edit `.env` file with your configuration:**
   ```env
   THETA_API_KEY=your_actual_theta_api_key_here
   SECRET_KEY=your_secure_jwt_secret_key_here
   FLASK_ENV=production
   HOST=0.0.0.0
   PORT=5000
   ```

### 2. Build and Deploy

#### Option A: Using Docker Compose (Recommended for Development)
```bash
# Build and start the application
docker-compose up --build

# Run in background
docker-compose up -d --build
```

#### Option B: Using Docker Commands
```bash
# Build the image
docker build -t study-buddy-ai:latest .

# Run the container
docker run -d \
  --name study-buddy-ai \
  -p 5000:5000 \
  --env-file .env \
  study-buddy-ai:latest
```

#### Option C: Using Deployment Scripts

**Windows:**
```cmd
deploy-theta.bat
```

**Linux/macOS:**
```bash
./deploy-theta.sh
```

## 🏗️ Architecture

The Docker setup uses a multi-stage build:

1. **Stage 1 (Frontend Builder):**
   - Node.js 18 Alpine image
   - Builds React application
   - Optimizes for production

2. **Stage 2 (Production Runtime):**
   - Python 3.11 Slim image
   - Includes system dependencies (Tesseract, Poppler)
   - Serves both backend API and frontend static files
   - Runs as non-root user for security

## 📁 Container Structure

```
/app/
├── app.py                 # Flask backend
├── static/               # Built React frontend
├── requirements.txt      # Python dependencies
├── vectorstores/         # Vector database storage
├── books/               # Document storage
└── [other backend files]
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `THETA_API_KEY` | ✅ | Theta AI API key | - |
| `SECRET_KEY` | ✅ | JWT secret key | - |
| `FLASK_ENV` | ❌ | Flask environment | `production` |
| `HOST` | ❌ | Bind host | `0.0.0.0` |
| `PORT` | ❌ | Port number | `5000` |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret | - |

### Volume Mounts

For persistent data storage, mount these directories:

```bash
docker run -d \
  --name study-buddy-ai \
  -p 5000:5000 \
  -v ./data/users:/app/users \
  -v ./data/vectorstores:/app/vectorstores \
  -v ./data/books:/app/books \
  -v ./data/chat_history:/app/chat_history \
  -v ./data/chat_sessions:/app/chat_sessions \
  --env-file .env \
  study-buddy-ai:latest
```

## 🌐 Theta Edge Cloud Deployment

### 1. Build and Push Image

```bash
# Build image
docker build -t your-registry.com/study-buddy-ai:latest .

# Push to registry
docker push your-registry.com/study-buddy-ai:latest
```

### 2. Deploy to Theta Edge Cloud

1. **Use the generated deployment manifest:**
   ```bash
   kubectl apply -f theta-deployment.yaml
   ```

2. **Or create your own deployment:**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: study-buddy-ai
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
           image: your-registry.com/study-buddy-ai:latest
           ports:
           - containerPort: 5000
           env:
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
           resources:
             requests:
               memory: "512Mi"
               cpu: "250m"
             limits:
               memory: "1Gi"
               cpu: "500m"
   ```

### 3. Create Secrets

```bash
kubectl create secret generic study-buddy-secrets \
  --from-literal=theta-api-key=your_theta_api_key \
  --from-literal=secret-key=your_secret_key
```

### 4. Create Service

```yaml
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
```

## 🔍 Monitoring and Health Checks

The container includes health checks:

```bash
# Check container health
docker ps

# View logs
docker logs study-buddy-ai

# Check application health
curl http://localhost:5000/api/check
```

## 🛠️ Development

### Local Development with Docker

```bash
# Build development image
docker build -t study-buddy-ai:dev .

# Run with volume mounts for live code changes
docker run -d \
  --name study-buddy-ai-dev \
  -p 5000:5000 \
  -v $(pwd)/backend:/app \
  -v $(pwd)/frontend/build:/app/static \
  --env-file .env \
  study-buddy-ai:dev
```

### Debugging

```bash
# Access container shell
docker exec -it study-buddy-ai /bin/bash

# View real-time logs
docker logs -f study-buddy-ai

# Check resource usage
docker stats study-buddy-ai
```

## 🔒 Security Considerations

1. **Non-root user:** Container runs as `appuser` (UID 1000)
2. **Environment variables:** Sensitive data stored in environment variables
3. **Secrets management:** Use Kubernetes secrets for production
4. **Network security:** Configure firewalls and network policies
5. **Image scanning:** Regularly scan images for vulnerabilities

## 📊 Performance Optimization

### Resource Limits

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

### Scaling

```bash
# Scale horizontally
kubectl scale deployment study-buddy-ai --replicas=3

# Auto-scaling
kubectl autoscale deployment study-buddy-ai --cpu-percent=70 --min=1 --max=10
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using port 5000
   lsof -i :5000
   
   # Use different port
   docker run -p 5001:5000 study-buddy-ai:latest
   ```

2. **Permission denied:**
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 ./data
   ```

3. **Memory issues:**
   ```bash
   # Increase memory limit
   docker run --memory=2g study-buddy-ai:latest
   ```

4. **API key not working:**
   ```bash
   # Check environment variables
   docker exec study-buddy-ai env | grep THETA
   ```

### Log Analysis

```bash
# View application logs
docker logs study-buddy-ai

# Follow logs in real-time
docker logs -f study-buddy-ai

# View logs with timestamps
docker logs -t study-buddy-ai
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Theta AI API Documentation](https://www.thetavideoapi.com/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://reactjs.org/docs/)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the application logs
3. Verify environment configuration
4. Create an issue in the repository

---

**Happy Deploying! 🚀**
