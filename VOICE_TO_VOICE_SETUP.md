# ValiNul Voice-to-Voice Setup Guide

This guide will help you set up the complete voice-to-voice functionality for the ValiNul AI Assistant, including backend dependencies, frontend components, and testing procedures.

## 🎯 Overview

The voice-to-voice feature includes:
- **Speech-to-Text (STT)**: Using Whisper for audio transcription
- **Text-to-Speech (TTS)**: Using Coqui TTS for voice synthesis
- **Audio Storage**: Backblaze B2 cloud storage or local fallback
- **Cross-Platform Support**: Web (React.js) and Android (React Native)
- **Real-time Processing**: WebSocket support for live feedback

## 🔧 Backend Setup

### 1. Install System Dependencies

#### FFmpeg Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your PATH environment variable

#### Python Dependencies

Install the voice-specific requirements:
```bash
cd backend
pip install -r requirements_voice.txt
```

### 2. Run Setup Script

Execute the automated setup script:
```bash
cd backend
python setup_voice_dependencies.py
```

This script will:
- Verify FFmpeg installation
- Download Whisper models
- Setup Coqui TTS models
- Create necessary directories
- Generate configuration files

### 3. Environment Configuration

Create or update your `.env` file with Backblaze B2 credentials:

```bash
# Backblaze B2 Storage (Optional - uses local storage if not set)
B2_APPLICATION_KEY_ID=your_application_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=valinul-audio

# Voice Settings (Optional - uses defaults)
WHISPER_MODEL=base
TTS_MODEL=tts_models/en/ljspeech/tacotron2-DDC
AUDIO_SAMPLE_RATE=16000
```

### 4. Setup Backblaze B2 (Optional)

If you want to use cloud storage for audio files:

1. **Create Backblaze B2 Account**:
   - Go to https://www.backblaze.com/b2/cloud-storage.html
   - Sign up for a free account (10GB free tier)

2. **Create Application Key**:
   - Go to "App Keys" in your B2 dashboard
   - Create a new application key
   - Note down the Key ID and Application Key

3. **Create Bucket**:
   - Go to "Buckets" in your B2 dashboard
   - Create a new bucket named `valinul-audio` (or your preferred name)
   - Set it to "Private"

4. **Update Environment Variables**:
   ```bash
   export B2_APPLICATION_KEY_ID="your_key_id"
   export B2_APPLICATION_KEY="your_application_key"
   export B2_BUCKET_NAME="valinul-audio"
   ```

### 5. Start the Backend

```bash
cd backend
python app.py
```

You should see:
```
[Flask] Voice-to-voice functionality enabled
[Whisper] Model loaded: base
[TTS] Model loaded: tts_models/en/ljspeech/tacotron2-DDC
[Storage] Using Backblaze B2 storage
```

## 🎨 Frontend Setup

### 1. Install Dependencies

For the web frontend:
```bash
cd frontend
npm install react-native-web
npm install react-native-audio-recorder-player
npm install react-native-permissions
npm install react-native-vector-icons
npm install @react-native-community/blur
npm install react-native-linear-gradient
```

### 2. Update Package.json

Add React Native for Web support to your `package.json`:

```json
{
  "dependencies": {
    "react-native-web": "^0.19.9",
    "react-native-audio-recorder-player": "^3.6.2",
    "react-native-permissions": "^3.10.1",
    "react-native-vector-icons": "^10.0.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}
```

### 3. Configure Webpack (for React Native for Web)

Create `config-overrides.js` in your frontend root:

```javascript
const { override, addWebpackAlias, addWebpackResolve } = require('customize-cra');

module.exports = override(
  addWebpackAlias({
    'react-native': 'react-native-web',
  }),
  addWebpackResolve({
    extensions: ['.web.js', '.js', '.json', '.web.jsx', '.jsx'],
  })
);
```

Install customize-cra:
```bash
npm install --save-dev customize-cra react-app-rewired
```

Update your package.json scripts:
```json
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build"
  }
}
```

### 4. Start the Frontend

```bash
cd frontend
npm start
```

## 📱 Android Setup (React Native)

### 1. Prerequisites

Ensure you have React Native development environment set up:
- Node.js 16+
- React Native CLI
- Android Studio
- Android SDK
- Java JDK

### 2. Create React Native Project

```bash
npx react-native init ValiNulVoiceChat
cd ValiNulVoiceChat
```

### 3. Install Dependencies

```bash
npm install react-native-audio-recorder-player
npm install react-native-permissions
npm install react-native-vector-icons
npm install react-native-linear-gradient
npm install @react-native-community/blur
npm install tailwind-rn
npm install react-native-animatable
```

### 4. Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 5. Link Native Dependencies

For React Native 0.60+, dependencies auto-link. For older versions:

```bash
react-native link react-native-audio-recorder-player
react-native link react-native-permissions
react-native link react-native-vector-icons
```

### 6. Copy Voice Components

Copy the following files to your React Native project:
- `VoiceRecorder.js` (works with React Native for Web)
- `VoiceChat.js` (Android-specific component)

### 7. Build and Run

```bash
# Start Metro bundler
npx react-native start

# Run on Android (in a new terminal)
npx react-native run-android
```

## 🧪 Testing Guidelines

### 1. Backend Testing

#### Test Voice Endpoints

```bash
# Test transcription endpoint
curl -X POST \
  http://localhost:5000/api/voice/transcribe \
  -H 'Content-Type: multipart/form-data' \
  -F 'audio=@test_audio.wav' \
  --cookie-jar cookies.txt

# Test synthesis endpoint
curl -X POST \
  http://localhost:5000/api/voice/synthesize \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hello, this is a test of the text-to-speech system."}' \
  --cookie-jar cookies.txt

# Test voice status
curl -X GET \
  http://localhost:5000/api/voice/status \
  --cookie-jar cookies.txt
```

#### Test Audio File Processing

```bash
# Create a test audio file
ffmpeg -f lavfi -i "sine=frequency=1000:duration=5" -ar 16000 -ac 1 test_audio.wav

# Test the complete voice-to-voice pipeline
curl -X POST \
  http://localhost:5000/api/voice/process \
  -H 'Content-Type: multipart/form-data' \
  -F 'audio=@test_audio.wav' \
  --cookie-jar cookies.txt
```

### 2. Web Frontend Testing

#### Browser Compatibility

Test in multiple browsers:
- **Chrome 88+** (Recommended)
- **Firefox 84+**
- **Safari 14+** (macOS/iOS)
- **Edge 88+**

#### Test Voice Recording

1. Open your React app in the browser
2. Navigate to the chat interface
3. Click the "Voice Mode" toggle
4. Grant microphone permissions when prompted
5. Click the microphone button to start recording
6. Speak clearly for 3-5 seconds
7. Click the stop button
8. Verify transcription appears
9. Check that AI response plays automatically

#### Test Audio Playback

1. Look for voice response messages with audio icons
2. Click the audio play button
3. Verify audio plays correctly
4. Test stop/resume functionality

### 3. Android Testing

#### Emulator Testing

```bash
# Start Android emulator
emulator -avd <your_avd_name>

# Run the app
npx react-native run-android
```

#### Device Testing

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `npx react-native run-android`

#### Permission Testing

1. Install the app
2. Try to use voice recording
3. Verify permission dialog appears
4. Grant microphone permission
5. Test recording functionality
6. Verify audio recording and playback works

### 4. Performance Testing

#### Audio Quality Tests

1. **Recording Quality**:
   - Test in quiet environment
   - Test with background noise
   - Test with different speaking volumes
   - Verify 16kHz mono recording

2. **Transcription Accuracy**:
   - Test with clear speech
   - Test with accents
   - Test with technical terms
   - Check confidence scores

3. **TTS Quality**:
   - Test short responses (< 50 words)
   - Test long responses (> 200 words)
   - Test with punctuation
   - Test with special characters

#### Latency Testing

Measure end-to-end latency:
1. Start recording
2. Stop recording
3. Measure time to transcription
4. Measure time to AI response
5. Measure time to TTS generation
6. Measure time to audio playback

Target latencies:
- **Transcription**: < 2 seconds
- **AI Response**: < 5 seconds
- **TTS Generation**: < 3 seconds
- **Total End-to-End**: < 10 seconds

### 5. Error Handling Tests

#### Network Issues

1. **Offline Testing**:
   - Disconnect internet
   - Try voice recording
   - Verify graceful error handling

2. **Slow Connection**:
   - Throttle network to 3G speeds
   - Test voice-to-voice flow
   - Verify timeout handling

#### Audio Issues

1. **No Microphone**:
   - Test on device without microphone
   - Verify error message appears

2. **Permission Denied**:
   - Deny microphone permission
   - Verify graceful handling
   - Test permission request flow

3. **Audio Format Issues**:
   - Test with different audio formats
   - Verify conversion works
   - Test error handling for unsupported formats

## 🚀 Production Deployment

### 1. Backend Optimization

```bash
# Install production-optimized packages
pip install gunicorn
pip install gevent

# Start with Gunicorn
gunicorn -w 4 -k gevent --timeout 120 app:app
```

### 2. Audio File Cleanup

Set up automatic cleanup of temporary files:

```bash
# Add to crontab for hourly cleanup
0 * * * * python /path/to/backend/cleanup_temp_audio.py
```

### 3. Monitoring

Monitor voice service health:

```bash
# Check voice service status
curl http://your-domain.com/api/voice/status

# Monitor audio storage usage
curl http://your-domain.com/api/voice/storage-stats
```

### 4. Security Considerations

1. **HTTPS Required**: Voice features require HTTPS in production
2. **Rate Limiting**: Implement rate limiting for voice endpoints
3. **File Size Limits**: Enforce maximum audio file sizes
4. **Content Filtering**: Consider audio content moderation

## 🐛 Troubleshooting

### Common Issues

#### 1. FFmpeg Not Found
```
Error: FFmpeg not found in PATH
```
**Solution**: Install FFmpeg and add to PATH

#### 2. Whisper Model Download Fails
```
Error: Failed to download Whisper model
```
**Solution**: 
- Check internet connection
- Try smaller model (tiny/base)
- Download manually

#### 3. TTS Model Loading Error
```
Error: Failed to load TTS model
```
**Solution**:
- Ensure sufficient RAM (4GB+ for TTS)
- Try smaller TTS model
- Check CUDA availability

#### 4. Microphone Permission Denied
```
Error: Permission denied for microphone
```
**Solution**:
- Enable microphone in browser settings
- Check system microphone permissions
- Try different browser

#### 5. Audio Playback Issues
```
Error: Audio playback failed
```
**Solution**:
- Check audio file URL
- Verify CORS headers
- Test different audio format

#### 6. Backblaze B2 Connection Failed
```
Error: Failed to connect to Backblaze B2
```
**Solution**:
- Verify API credentials
- Check bucket name
- Test network connectivity
- Fall back to local storage

### Performance Issues

#### High CPU Usage
- Use smaller Whisper model (tiny/base)
- Enable GPU acceleration if available
- Reduce concurrent requests

#### High Memory Usage
- Monitor TTS model memory usage
- Implement audio caching
- Clean up temporary files

#### Slow Response Times
- Optimize audio file sizes
- Use faster TTS models
- Implement request queuing

## 📚 API Reference

### Voice Endpoints

#### POST /api/voice/transcribe
Transcribe audio to text using Whisper.

**Request:**
- Content-Type: multipart/form-data
- Body: audio file (WebM, WAV, MP3, M4A, OGG)

**Response:**
```json
{
  "success": true,
  "transcription": "Hello world",
  "language": "en",
  "confidence": 0.95
}
```

#### POST /api/voice/synthesize
Convert text to speech using Coqui TTS.

**Request:**
```json
{
  "text": "Hello world",
  "speed": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "audio_url": "/audio/generated_speech.wav",
  "filename": "generated_speech.wav",
  "text": "Hello world"
}
```

#### POST /api/voice/process
Complete voice-to-voice pipeline.

**Request:**
- Content-Type: multipart/form-data
- Body: audio file

**Response:**
```json
{
  "success": true,
  "transcription": {
    "text": "Hello world",
    "language": "en",
    "confidence": 0.95
  },
  "response": {
    "text": "Hello! How can I help you?",
    "audio_url": "/audio/response.wav",
    "filename": "response.wav"
  }
}
```

#### GET /api/voice/status
Get voice service status and configuration.

**Response:**
```json
{
  "success": true,
  "status": {
    "whisper_model": "base",
    "tts_model": "tts_models/en/ljspeech/tacotron2-DDC",
    "storage_backend": "backblaze_b2",
    "max_audio_length": 300,
    "supported_formats": ["wav", "webm", "mp3", "m4a", "ogg"],
    "realtime_enabled": true
  }
}
```

## 🎉 Success Checklist

✅ **Backend Setup Complete**
- [ ] FFmpeg installed and accessible
- [ ] Python dependencies installed
- [ ] Whisper model downloaded
- [ ] Coqui TTS model loaded
- [ ] Voice endpoints responding
- [ ] Backblaze B2 configured (optional)

✅ **Frontend Setup Complete**
- [ ] React Native for Web configured
- [ ] Voice components integrated
- [ ] Microphone permissions working
- [ ] Audio recording functional
- [ ] Audio playback working

✅ **Android Setup Complete**
- [ ] React Native project created
- [ ] Native dependencies linked
- [ ] Permissions configured
- [ ] Voice chat component working
- [ ] Audio recording/playback functional

✅ **Testing Complete**
- [ ] Voice transcription accurate
- [ ] TTS generation working
- [ ] End-to-end voice flow functional
- [ ] Error handling working
- [ ] Performance within targets

✅ **Production Ready**
- [ ] HTTPS configured
- [ ] Rate limiting enabled
- [ ] Monitoring setup
- [ ] Backup storage configured
- [ ] Security measures in place

Congratulations! 🎉 Your ValiNul voice-to-voice system is now fully operational!

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test individual components (STT, TTS, storage)
4. Verify network connectivity and permissions
5. Check browser console for frontend errors

For additional support, refer to the component documentation:
- [Whisper Documentation](https://github.com/openai/whisper)
- [Coqui TTS Documentation](https://github.com/coqui-ai/TTS)
- [Backblaze B2 Documentation](https://www.backblaze.com/b2/docs/)
- [React Native Audio Documentation](https://github.com/hyochan/react-native-audio-recorder-player)





