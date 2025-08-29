# Troubleshooting Guide

## Issues Fixed

### 1. Chat Not Getting Responses
**Problem**: Chat messages are sent but no AI response is received.

**Causes**:
- Missing or invalid API key
- Backend server not running
- Network connectivity issues
- Model configuration problems

**Solutions**:

#### Check API Key Configuration
1. Run the API key test script:
   ```bash
   cd backend
   python test_api_key.py
   ```

2. Create a `.env` file in the backend directory:
   ```bash
   # Backend/.env
   THETA_API_KEY=your_actual_theta_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   SECRET_KEY=your_secret_key_here
   ```

3. Restart the backend server after adding the `.env` file

#### Check Backend Status
1. Test the health endpoint:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. Check backend logs for errors:
   ```bash
   cd backend
   python app.py
   ```

#### Test LLM Functionality
1. Use the test endpoint:
   ```bash
   curl -X POST http://localhost:5000/api/test-llm \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### 2. Chat Session Naming Not Working
**Problem**: New chat sessions are not automatically named based on the first message.

**Causes**:
- Missing session rename API call
- Frontend-backend communication issues
- Session management problems

**Solutions**:

#### Check Session Management
1. Verify sessions are being created:
   ```bash
   curl http://localhost:5000/api/sessions \
     -H "Cookie: token=your_token_here"
   ```

2. Check if session rename endpoint works:
   ```bash
   curl -X PUT http://localhost:5000/api/sessions/session_id/rename \
     -H "Content-Type: application/json" \
     -H "Cookie: token=your_token_here" \
     -d '{"name": "Test Session"}'
   ```

#### Frontend Debugging
1. Open browser developer tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls
4. Look for session rename requests

## Common Error Messages

### "No API key available for Theta models"
- **Solution**: Add `THETA_API_KEY` to your `.env` file

### "Unauthorized"
- **Solution**: Check if you're logged in and the token is valid

### "Chat request failed"
- **Solution**: Check backend logs and API key configuration

### "No response content received from server"
- **Solution**: Check if the AI model is responding properly

## Debugging Steps

### 1. Check Backend Logs
```bash
cd backend
python app.py
```
Look for:
- API key loading messages
- Request processing logs
- Error messages

### 2. Check Frontend Console
1. Open browser developer tools
2. Go to Console tab
3. Look for error messages and API call logs

### 3. Test API Endpoints
```bash
# Health check
curl http://localhost:5000/api/health

# Test LLM
curl -X POST http://localhost:5000/api/test-llm \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 4. Verify Environment Variables
```bash
cd backend
python test_api_key.py
```

## Getting Help

If you're still experiencing issues:

1. Check the backend logs for specific error messages
2. Verify your API keys are valid and have sufficient credits
3. Test with a simple message like "Hello" first
4. Check if the issue occurs with all models or just specific ones

## Quick Fix Checklist

- [ ] Backend server is running
- [ ] `.env` file exists with valid API keys
- [ ] Backend server restarted after adding `.env`
- [ ] Frontend is connecting to correct backend URL
- [ ] User is logged in (check cookies)
- [ ] No firewall/network blocking the connection



