# 🚀 Multi-Model AI Setup Guide

This guide will help you set up the multi-model AI functionality in your ValiNul application.

## 🔑 Required API Keys

### 1. Theta Edge Cloud API Key
- **Purpose**: Access to Llama 3.1 70B, Deepseek R1, and Stable Diffusion Turbo Vision
- **Get it from**: [Theta Edge Cloud](https://www.thetadata.ai/)
- **Cost**: Pay-per-use pricing
- **Environment Variable**: `THETA_API_KEY`

### 2. OpenAI API Key
- **Purpose**: Access to GPT-3.5 Turbo
- **Get it from**: [OpenAI Platform](https://platform.openai.com/)
- **Cost**: Pay-per-use pricing
- **Environment Variable**: `OPENAI_API_KEY`

## 📝 Setup Instructions

### Step 1: Create Environment File
Create a `.env` file in your `backend` directory:

```bash
cd backend
cp .env.example .env
```

### Step 2: Add Your API Keys
Edit the `.env` file and add your actual API keys:

```env
# Multi-Model AI API Keys
THETA_API_KEY=sk_theta_your_actual_key_here
OPENAI_API_KEY=sk_openai_your_actual_key_here

# Other required keys...
SECRET_KEY=your_secret_key_here
```

### Step 3: Install Dependencies
Make sure you have the required Python packages:

```bash
cd backend
pip install requests python-dotenv
```

### Step 4: Restart Backend
Restart your Flask backend to load the new environment variables:

```bash
python app.py
```

## 🤖 Available Models

### Text Generation Models
- **🦙 Llama 3.1 70B**: Advanced language model for complex reasoning
- **🔍 Deepseek R1**: Specialized model for research and analysis  
- **🤖 GPT-3.5 Turbo**: Fast and reliable OpenAI model

### Image Generation Models
- **🎨 Stable Diffusion Turbo Vision**: AI image generation with customizable parameters

## 🎯 Features

### Model Switching
- Click the 🧠 **Brain** icon in the header to open the model selector
- Choose from available models based on your API keys
- Real-time model switching without restarting the application

### Image Generation
- Click the 🎨 **Palette** icon to open the image generator
- Requires Stable Diffusion model to be selected
- Customizable parameters: width, height, steps, CFG scale, seed
- Download generated images directly

### Advanced Settings
- Temperature control for creativity vs. focus
- Max tokens for response length
- Image generation parameters
- Model-specific configurations

## 🔧 Troubleshooting

### "No API key available" Error
- Check that your `.env` file exists in the `backend` directory
- Verify API keys are correctly copied (no extra spaces)
- Restart the backend after making changes

### Model Not Switching
- Check browser console for error messages
- Verify the model is available in your API key
- Try refreshing the page

### Image Generation Not Working
- Ensure Stable Diffusion model is selected
- Check that `THETA_API_KEY` is set correctly
- Verify your Theta account has image generation access

## 💡 Tips

1. **Start with one API key** - Test with just Theta or OpenAI first
2. **Monitor usage** - Both APIs charge per request
3. **Use appropriate models** - Llama for reasoning, GPT for general chat, Stable Diffusion for images
4. **Experiment with parameters** - Adjust temperature, steps, and CFG scale for different results

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API keys are valid
3. Check the backend logs for detailed error information
4. Ensure all dependencies are installed

---

**Happy AI experimenting! 🎉**
