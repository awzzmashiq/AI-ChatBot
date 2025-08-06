#!/bin/bash

# Deployment Script for Vercel + Railway
# Study Buddy AI - Investor Demo

set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Check if required CLIs are installed
check_dependencies() {
    print_color $BLUE "📋 Checking dependencies..."
    
    if ! command -v vercel &> /dev/null; then
        print_color $RED "❌ Vercel CLI not found. Installing..."
        npm install -g vercel
    else
        print_color $GREEN "✅ Vercel CLI found"
    fi
    
    if ! command -v railway &> /dev/null; then
        print_color $RED "❌ Railway CLI not found. Installing..."
        npm install -g @railway/cli
    else
        print_color $GREEN "✅ Railway CLI found"
    fi
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_color $BLUE "🎨 Deploying frontend to Vercel..."
    
    cd frontend
    
    # Build the project
    print_color $YELLOW "📦 Building React app..."
    npm install
    npm run build
    
    # Deploy to Vercel
    print_color $YELLOW "🚀 Deploying to Vercel..."
    vercel --prod --confirm
    
    cd ..
    print_color $GREEN "✅ Frontend deployed successfully!"
}

# Deploy backend to Railway
deploy_backend() {
    print_color $BLUE "⚙️ Deploying backend to Railway..."
    
    cd backend
    
    # Deploy to Railway
    print_color $YELLOW "🚀 Deploying to Railway..."
    railway up
    
    cd ..
    print_color $GREEN "✅ Backend deployed successfully!"
}

# Generate deployment summary
generate_summary() {
    print_color $BLUE "📊 Generating deployment summary..."
    
    cat > DEPLOYMENT_SUMMARY.md << EOF
# 🚀 Deployment Summary

**Date:** $(date)
**Status:** ✅ Successfully Deployed

## 🔗 URLs

### Frontend (Vercel)
- **Production URL:** https://your-app.vercel.app
- **Dashboard:** https://vercel.com/dashboard

### Backend (Railway)  
- **API URL:** https://your-app.railway.app
- **Dashboard:** https://railway.app/dashboard

## 🔑 Demo Access

### For Investors
- **Access Code 1:** INVESTOR_ACCESS_2024
- **Access Code 2:** POC_SHOWCASE_KEY
- **Access Code 3:** STARTUP_DEMO_PASS

### Demo Accounts
- **Email:** demo1@investor.com
- **Password:** demo123

## 🛠️ Next Steps

1. **Update Environment Variables:**
   - Set REACT_APP_API_URL in Vercel to your Railway URL
   - Set CORS_ORIGINS in Railway to your Vercel URL

2. **Test the Deployment:**
   - Visit your Vercel URL
   - Try logging in with demo account
   - Upload a test document
   - Test Google Drive integration

3. **Share with Investors:**
   - Send them the Vercel URL
   - Provide demo access code: INVESTOR_ACCESS_2024
   - Include demo account credentials

## 🔧 Troubleshooting

- **Frontend not loading:** Check Vercel build logs
- **API errors:** Check Railway deployment logs
- **CORS issues:** Update CORS_ORIGINS environment variable
- **Demo access:** Verify DEMO_CODE_1 environment variable

## 📞 Support

If you need help during the investor demo:
- Check Railway logs for backend issues
- Check Vercel function logs for frontend issues
- Use demo access codes for quick access
EOF

    print_color $GREEN "✅ Deployment summary created: DEPLOYMENT_SUMMARY.md"
}

# Main deployment flow
main() {
    print_color $GREEN "🚀 Study Buddy AI - Deployment Script"
    print_color $BLUE "Deploying to Vercel (Frontend) + Railway (Backend)"
    echo ""
    
    check_dependencies
    
    # Ask for confirmation
    read -p "$(echo -e ${YELLOW}Are you ready to deploy? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_color $RED "❌ Deployment cancelled"
        exit 1
    fi
    
    deploy_frontend
    deploy_backend
    generate_summary
    
    print_color $GREEN "🎉 Deployment completed successfully!"
    print_color $BLUE "📄 Check DEPLOYMENT_SUMMARY.md for next steps"
    print_color $YELLOW "💡 Don't forget to update environment variables with actual URLs"
}

# Run main function
main