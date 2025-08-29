# 🌿 Eden AI Integration Guide

This guide explains how to use the newly integrated Eden AI image generation model in your Study Buddy AI Assistant.

## 🚀 What's New

The system now includes **🌿 Eden AI Minimax** as an **image generation model** alongside the existing **🎨 Stable Diffusion Turbo Vision** model. Both models are designed specifically for creating AI-generated images.

## 🔑 Setup Requirements

### 1. Get Eden AI API Key

1. Visit [Eden AI](https://www.edenai.co/)
2. Sign up for an account
3. Navigate to your API keys section
4. Copy your API key

### 2. Configure Environment Variables

Add the following to your `.env` file in the backend directory:

```bash
# Eden AI Configuration (for image generation)
EDEN_AI_API_KEY=your_eden_ai_api_key_here
```

**Example:**
```bash
EDEN_AI_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNzkzZDcxYjctNGM3MS00MDk3LTg3ZWUtODBjYWU1Y2QyMWMxIiwidHlwZSI6ImFwaV90b2tlbiJ9.JyHWvkd0urFa2tj0rQHFGOpJpTy3ruVQyJ4PjjSumLk
```

### 3. Restart Your Application

After adding the API key, restart your Flask backend application for the changes to take effect.

## 🎨 Using Eden AI for Image Generation

### 1. Switch to Eden AI Model

1. In the frontend, click the **🧠 Brain icon** (model selector) at the top
2. Select **🌿 Eden AI Minimax** from the dropdown
3. The system will switch to Eden AI for image generation

### 2. Generate Images

Once Eden AI is selected, you can generate images by typing descriptive prompts:

**Examples:**
- `generate image of a sunset over mountains`
- `create image of a cat riding a bicycle`
- `draw a futuristic city skyline`
- `picture of a beautiful garden with flowers`

### 3. Image Specifications

- **Resolution**: Default 512x512 pixels
- **Provider**: Minimax (via Eden AI)
- **Speed**: Generally faster than Theta API
- **Quality**: High-quality AI-generated images

## 🔧 Technical Details

### Model Configuration

The Eden AI model is configured in `backend/multi_model_service.py`:

```python
"eden_ai_minimax": {
    "url": "https://api.edenai.run/v2/image/generation",
    "api_key": os.getenv("EDEN_AI_API_KEY"),
    "type": "eden_image",
    "display_name": "🌿 Eden AI Minimax",
    "description": "AI image generation using Eden AI with Minimax provider"
}
```

### API Endpoint

- **URL**: `https://api.edenai.run/v2/image/generation`
- **Method**: POST
- **Headers**: `Authorization: Bearer {API_KEY}`
- **Payload**: 
  ```json
  {
    "providers": "minimax",
    "text": "your image prompt",
    "resolution": "512x512"
  }
  ```

### Fallback Behavior

If Eden AI is unavailable or fails:
1. The system will try HuggingFace fallback (if configured)
2. If that fails, it generates a placeholder image
3. Users get clear error messages about what went wrong

## 🧪 Testing the Integration

Run the test script to verify everything is working:

```bash
cd backend
python test_eden_ai_simple.py
```

This will test:
- ✅ Model availability
- ✅ Model switching
- ✅ Image generation method routing
- ✅ Fallback behavior

## 🆚 Model Comparison

| Feature | 🎨 Stable Diffusion (Theta) | 🌿 Eden AI Minimax |
|---------|------------------------------|-------------------|
| **Speed** | 30-60 seconds | 10-30 seconds |
| **Quality** | High | High |
| **Customization** | Full (steps, CFG, seed) | Basic (resolution) |
| **Reliability** | Good | Excellent |
| **Cost** | Theta credits | Eden AI credits |

## 🚨 Troubleshooting

### Common Issues

1. **"API Key Required" status**
   - Solution: Add `EDEN_AI_API_KEY` to your `.env` file

2. **"Model not found" error**
   - Solution: Restart your Flask application after adding the API key

3. **Image generation fails**
   - Check your Eden AI account for remaining credits
   - Verify the API key is correct
   - Check the backend logs for detailed error messages

### Debug Mode

Enable debug logging in your Flask app to see detailed information about API calls and responses.

## 📚 Additional Resources

- [Eden AI Documentation](https://docs.edenai.co/)
- [Minimax Provider Info](https://www.minimax.ch/)
- [Study Buddy Backend Documentation](./README.md)

## 🤝 Contributing

If you encounter issues or want to improve the Eden AI integration:

1. Check the existing issues
2. Create a new issue with detailed information
3. Submit a pull request with your improvements

---

**Happy Image Generating! 🎨✨**
