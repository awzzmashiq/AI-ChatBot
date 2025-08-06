# 🚀 Vercel + Railway Deployment Guide

## Quick Start (15 minutes to live demo)

### Prerequisites
```bash
# Install CLIs
npm install -g vercel @railway/cli

# Login to services
vercel login
railway login
```

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 2: Deploy to Vercel
```bash
# First time deployment
vercel

# For production
vercel --prod
```

### Step 3: Configure Environment Variables in Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:
```env
REACT_APP_API_URL=https://your-railway-app.railway.app
REACT_APP_ENVIRONMENT=production
REACT_APP_DEMO_MODE=true
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

## ⚙️ Backend Deployment (Railway)

### Step 1: Create Railway Project
```bash
cd backend
railway login
railway init
```

### Step 2: Deploy Backend
```bash
railway up
```

### Step 3: Configure Environment Variables in Railway
Go to Railway Dashboard → Your Project → Variables

Add these variables:
```env
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your_super_secret_key_here
THETA_API_KEY=your_theta_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DEMO_MODE=true
DEMO_CODE_1=INVESTOR_ACCESS_2024
DEMO_CODE_2=POC_SHOWCASE_KEY
CORS_ORIGINS=https://your-vercel-app.vercel.app
PORT=5000
HOST=0.0.0.0
```

## 🔄 Link Frontend and Backend

### Update Frontend API URL
1. Copy your Railway app URL (looks like: `https://xyz.railway.app`)
2. In Vercel Dashboard → Environment Variables
3. Update `REACT_APP_API_URL` to your Railway URL
4. Redeploy frontend: `vercel --prod`

### Update Backend CORS
1. Copy your Vercel app URL (looks like: `https://xyz.vercel.app`)
2. In Railway Dashboard → Variables
3. Update `CORS_ORIGINS` to your Vercel URL
4. Railway will auto-redeploy

## 🔐 Demo Security Setup

### Option 1: Simple Access Code (Recommended)
Add a demo gate to your login page:

```javascript
// In Login.js, add before main login form
const [demoCode, setDemoCode] = useState('');
const [showDemoGate, setShowDemoGate] = useState(true);

const handleDemoAccess = () => {
  if (demoCode === 'INVESTOR_ACCESS_2024') {
    setShowDemoGate(false);
  } else {
    alert('Invalid demo access code. Contact team for access.');
  }
};

if (showDemoGate) {
  return (
    <div className="demo-gate">
      <h2>Demo Access Required</h2>
      <input 
        type="text" 
        placeholder="Enter demo access code"
        value={demoCode}
        onChange={(e) => setDemoCode(e.target.value)}
      />
      <button onClick={handleDemoAccess}>Access Demo</button>
    </div>
  );
}
```

### Option 2: Pre-created Demo Accounts
Create these accounts for investors:

```json
{
  "demo_accounts": [
    {"email": "demo1@investor.com", "password": "Demo2024!"},
    {"email": "demo2@investor.com", "password": "Demo2024!"},
    {"email": "demo3@investor.com", "password": "Demo2024!"}
  ]
}
```

## 📊 Monitoring and Analytics

### Add Simple Usage Tracking
```python
# In app.py
demo_stats = {
    "visitors": 0,
    "signups": 0,
    "uploads": 0,
    "queries": 0
}

@app.route('/api/demo/stats')
def get_demo_stats():
    return jsonify(demo_stats)

@app.route('/api/demo/track', methods=['POST'])
def track_demo_usage():
    action = request.json.get('action')
    if action in demo_stats:
        demo_stats[action] += 1
    return jsonify({"status": "tracked"})
```

## 🎯 Investor Presentation Tips

### 1. Pre-load Sample Data
Upload these documents before the demo:
- `Business_Plan_Sample.pdf`
- `Financial_Projections.xlsx`
- `Market_Research.docx`

### 2. Prepare Demo Script
```markdown
1. **Login** → Use demo account
2. **Upload Document** → Show business plan processing
3. **Ask Questions** → "What's our revenue projection?"
4. **Google Drive** → Show cloud integration
5. **Voice Chat** → Demonstrate voice interaction
6. **Multi-session** → Show conversation history
```

### 3. Have Backup Plan
- Keep local version running as backup
- Pre-record demo video as fallback
- Test all features 30 minutes before presentation

## 🚨 Troubleshooting

### Common Issues

#### Frontend not loading
```bash
# Check Vercel build logs
vercel logs

# Rebuild and redeploy
npm run build
vercel --prod
```

#### API not responding
```bash
# Check Railway logs
railway logs

# Restart service
railway restart
```

#### CORS errors
```bash
# Update CORS origins in Railway
# Add your exact Vercel URL including https://
```

#### Demo access not working
```bash
# Verify environment variables in Railway:
# - DEMO_MODE=true
# - DEMO_CODE_1=INVESTOR_ACCESS_2024
```

## 🔗 Final URLs Structure

After successful deployment:

- **Frontend:** `https://study-buddy-ai.vercel.app`
- **Backend:** `https://study-buddy-api.railway.app`
- **Demo Access:** Use code `INVESTOR_ACCESS_2024`
- **Demo Account:** `demo1@investor.com` / `Demo2024!`

## 📈 Cost Estimation

### Free Tier Limits
- **Vercel:** 100GB bandwidth, 6K build hours/month
- **Railway:** $5 credit/month (enough for demos)
- **Total:** ~$0-5/month for investor demos

### Scaling for Production
- **Vercel Pro:** $20/month
- **Railway Pro:** $20-50/month
- **Total:** ~$40-70/month for production

## 🎉 Success Checklist

Before sharing with investors:

- [ ] ✅ Frontend loads without errors
- [ ] ✅ Backend API responds to health check
- [ ] ✅ Demo login works
- [ ] ✅ File upload processes successfully
- [ ] ✅ Chat responses generate properly
- [ ] ✅ Google Drive integration functions
- [ ] ✅ Voice chat records and processes
- [ ] ✅ Demo access code works
- [ ] ✅ Mobile responsive design
- [ ] ✅ HTTPS enabled on both domains

---

**🎯 Pro Tip:** Test your deployment with the exact demo flow you'll show investors. Time the demo to stay under 10 minutes for maximum impact!