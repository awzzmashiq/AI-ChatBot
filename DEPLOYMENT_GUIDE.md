# 🚀 Deployment Guide for Investor Demo

## Quick Start (Recommended: Vercel + Railway)

### 1. Frontend Deployment (Vercel)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy frontend
cd frontend
npm run build
vercel --prod
```

**Vercel Setup:**
- Connect your GitHub repository
- Set build command: `npm run build`
- Set output directory: `build`
- Add environment variables in Vercel dashboard

### 2. Backend Deployment (Railway)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway link
railway up
```

**Railway Setup:**
- Connect GitHub repository
- Set start command: `python app.py`
- Add environment variables in Railway dashboard

## Environment Variables for Production

### Backend (.env for Railway)
```env
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-super-secret-production-key
DEBUG=False

# Database URLs (if using external DB)
DATABASE_URL=your-production-database-url

# Google API Keys
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI/Hugging Face Keys
OPENAI_API_KEY=your-openai-api-key
HUGGINGFACE_API_TOKEN=your-hf-token

# Demo Security
DEMO_MODE=true
DEMO_CODE_1=INVESTOR_ACCESS_2024
DEMO_CODE_2=POC_SHOWCASE_KEY
DEMO_CODE_3=STARTUP_DEMO_PASS

# CORS Origins
ALLOWED_ORIGINS=https://yourapp.vercel.app,https://your-custom-domain.com
```

### Frontend (.env for Vercel)
```env
REACT_APP_API_URL=https://your-railway-app.railway.app
REACT_APP_ENVIRONMENT=production
REACT_APP_DEMO_MODE=true
```

## 🔐 Security for Demos

### Option A: Simple Access Code Protection
Add this to your frontend Login component:

```javascript
// Add demo access code input
const [demoCode, setDemoCode] = useState('');

const handleDemoAccess = () => {
  if (demoCode === 'INVESTOR_DEMO_2024') {
    // Allow access to app
    setIsAuthorized(true);
  } else {
    alert('Invalid demo access code');
  }
};
```

### Option B: IP Whitelist (Advanced)
```python
# In app.py
ALLOWED_DEMO_IPS = [
    '192.168.1.100',  # Investor office
    '203.0.113.0/24', # Conference center
]

@app.before_request
def limit_remote_addr():
    if request.remote_addr not in ALLOWED_DEMO_IPS:
        return jsonify({'error': 'Access denied'}), 403
```

## 🌐 Alternative Hosting Platforms

### Netlify + Render
```bash
# Frontend (Netlify)
cd frontend
npm run build
# Drag and drop 'build' folder to Netlify

# Backend (Render)
# Connect GitHub repo in Render dashboard
# Set build command: pip install -r requirements.txt
# Set start command: python app.py
```

### Heroku (Full Stack)
```bash
# 1. Create Procfile
echo "web: python app.py" > Procfile

# 2. Deploy
heroku create your-app-name
git push heroku main
```

### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: your-poc-app
services:
- name: backend
  source_dir: /backend
  github:
    repo: your-username/your-repo
    branch: main
  run_command: python app.py
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  
- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/your-repo
    branch: main
  build_command: npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
```

## 📊 Demo Presentation Tips

### 1. Create Demo Accounts
```python
# Add to app.py
DEMO_USERS = [
    {'email': 'demo1@investor.com', 'password': 'demo123'},
    {'email': 'demo2@investor.com', 'password': 'demo123'},
    {'email': 'demo3@investor.com', 'password': 'demo123'},
]
```

### 2. Pre-load Sample Data
```python
# Add sample documents and chats for demo
def setup_demo_data():
    demo_docs = [
        'sample_report.pdf',
        'business_plan.docx',
        'financial_projections.xlsx'
    ]
    # Pre-process these documents
```

### 3. Performance Optimization
```python
# Cache responses for demo
from functools import lru_cache

@lru_cache(maxsize=100)
def get_demo_response(query):
    # Return pre-computed responses for common queries
    pass
```

## 🔗 Custom Domain Setup

### 1. Vercel Custom Domain
```bash
# Add domain in Vercel dashboard
# Update DNS records:
# Type: CNAME, Name: www, Value: vercel-dns.com
# Type: A, Name: @, Value: 76.76.19.61
```

### 2. Railway Custom Domain
```bash
# Add domain in Railway dashboard
# Update DNS records:
# Type: CNAME, Name: api, Value: your-app.railway.app
```

## 📈 Monitoring for Demos

### Add Simple Analytics
```javascript
// In frontend
const trackDemoUsage = (action) => {
  fetch('/api/demo/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, timestamp: Date.now() })
  });
};
```

## 🎯 Investor-Specific Features

### 1. Usage Dashboard
```python
@app.route('/api/demo/stats')
def demo_stats():
    return jsonify({
        'total_users': len(demo_users),
        'documents_processed': total_docs,
        'queries_answered': total_queries,
        'uptime': get_uptime(),
    })
```

### 2. Real-time Metrics
```javascript
// Add to frontend
const DemoMetrics = () => {
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/demo/stats')
        .then(res => res.json())
        .then(setMetrics);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="demo-metrics">
      <p>Users: {metrics.total_users}</p>
      <p>Documents: {metrics.documents_processed}</p>
      <p>Queries: {metrics.queries_answered}</p>
    </div>
  );
};
```

## 🚨 Emergency Fixes

### Quick Rollback
```bash
# Vercel
vercel --prod --confirm

# Railway
railway up --service your-service
```

### Health Check Endpoint
```python
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })
```

## 📞 Support During Demo

### Add Support Chat Widget
```javascript
// Quick support for live demos
const SupportWidget = () => (
  <div className="support-widget">
    <button onClick={() => window.open('mailto:support@yourapp.com')}>
      Need Help? 📧
    </button>
  </div>
);
```

---

**💡 Pro Tip for Investors:**
- Use a custom domain like `yourcompany-demo.com`
- Create a landing page explaining the POC
- Add a simple password: "INVESTOR2024"
- Pre-load impressive sample data
- Have backup accounts ready
- Monitor usage during presentation