# Voice Assistant - Siri/Alexa-like Voice Chat

## Overview

This implementation provides a **continuous voice conversation mode** similar to Siri or Alexa for your AI assistant. Users can click "Voice Mode" to enter a hands-free conversation where they speak naturally and receive voice responses automatically.

## Features

### ✅ **Hands-Free Conversation**
- Click "Voice Mode" to activate continuous voice chat
- Speak naturally - the system automatically detects when you start/stop talking
- AI responds with voice and the conversation continues seamlessly
- No need to repeatedly click record/stop buttons

### ✅ **Voice Activity Detection**
- Automatic speech detection using Web Audio API
- Smart silence detection (stops recording after 2 seconds of silence)
- Minimum recording duration (1 second) to avoid noise triggers
- Real-time voice level visualization

### ✅ **Chat Integration**
- All voice conversations appear as text messages in the chat interface
- Review what was spoken for accuracy
- Voice input messages show confidence levels and language detection
- Voice output messages include audio playback controls

### ✅ **Immersive UI**
- Full-screen voice assistant overlay when in voice mode
- Real-time voice activity visualization with animated rings
- Voice level indicator bars
- Clear conversation state indicators (Listening, Processing, Speaking)

## How It Works

### 1. **Activation**
```javascript
// Click "Voice Mode" button in the chat header
toggleVoiceMode() // Shows voice assistant overlay
```

### 2. **Voice Detection Flow**
```
User speaks → Voice detected → Recording starts automatically
↓
User stops speaking → Silence detected → Recording stops after 2 seconds
↓
Audio sent to backend → Transcribed → AI processes → Speech synthesis
↓
AI response played → Returns to listening mode
```

### 3. **Technical Implementation**

#### **Frontend (VoiceAssistant.js)**
- **Voice Activity Detection**: Uses Web Audio API with frequency analysis
- **Automatic Recording**: MediaRecorder starts/stops based on voice activity
- **Real-time Visualization**: Voice level meters and animated rings
- **State Management**: Listening → Processing → Speaking → Listening cycle

#### **Backend Integration**
- **Transcription**: `/api/voice/transcribe` endpoint
- **AI Chat**: `/api/chat` with `voice_mode: true` flag
- **Speech Synthesis**: `/api/voice/synthesize` endpoint
- **Session Management**: Maintains conversation context

## Files Changed

### Frontend Components
- **`VoiceAssistant.js`** - New continuous voice assistant component
- **`Chat.js`** - Updated to integrate voice assistant overlay
- **`ChatMessage.js`** - Shows voice indicators and audio controls

### Voice Assistant Features
```javascript
// VoiceAssistant Component Props
{
    onTranscriptionReceived: (text, language, confidence) => void,
    onVoiceResponse: (responseText, audioUrl) => void,
    onError: (error) => void,
    isActive: boolean,
    onToggleActive: () => void,
    sessionId: string,
    className?: string
}
```

## Usage Instructions

### For Users:
1. **Start Voice Chat**: Click the "Voice Mode" toggle in the chat header
2. **Begin Conversation**: Click "Start Voice Chat" in the overlay
3. **Speak Naturally**: Just start talking - recording begins automatically
4. **Listen to Response**: AI responds with voice, conversation continues
5. **End Session**: Click "End Conversation" or "Exit Voice Mode"

### For Developers:
```javascript
// Basic integration
import VoiceAssistant from './VoiceAssistant';

<VoiceAssistant
    onTranscriptionReceived={(text, lang, conf) => {
        // Add user message to chat
        addMessage({ role: 'user', content: text, isVoiceInput: true });
    }}
    onVoiceResponse={(responseText, audioUrl) => {
        // Add AI response to chat
        addMessage({ role: 'assistant', content: responseText, audioUrl });
    }}
    onError={(error) => console.error('Voice error:', error)}
    isActive={voiceActive}
    onToggleActive={toggleVoiceActive}
    sessionId={currentSessionId}
/>
```

## Voice Activity Detection Parameters

```javascript
const SILENCE_THRESHOLD = 0.01; // Minimum voice level (0-1)
const SILENCE_DURATION = 2000; // Stop after 2 seconds silence
const MIN_RECORDING_DURATION = 1000; // Minimum 1 second recording
const VOICE_LEVEL_SMOOTHING = 0.8; // Animation smoothing factor
```

## Browser Compatibility

- **Chrome/Edge**: Full support with Web Audio API
- **Firefox**: Full support
- **Safari**: Supported with user gesture requirement
- **Mobile**: Requires user interaction to start audio

## Permissions

- **Microphone Access**: Required for voice input
- **Automatic Permission Request**: Prompts user when needed
- **Permission Persistence**: Remembers user choice

## Error Handling

- **Permission Denied**: Shows help message to enable microphone
- **Network Errors**: Graceful fallback with error messages
- **Audio Playback Failures**: Silent fallback, continues conversation
- **API Failures**: Shows error in chat, allows retry

## Performance Optimizations

- **Voice Level Smoothing**: Prevents jittery UI animations
- **Efficient Voice Detection**: Uses requestAnimationFrame for smooth performance
- **Automatic Cleanup**: Properly disposes of audio resources
- **Minimal Recording**: Only records when voice is detected

## Backend Requirements

The voice assistant requires these backend endpoints:

1. **`/api/voice/transcribe`** - Convert speech to text
2. **`/api/chat`** - Process AI responses (with `voice_mode: true`)
3. **`/api/voice/synthesize`** - Convert text to speech

See `VOICE_TO_VOICE_SETUP.md` for backend implementation details.

## Testing the Feature

### Web Testing:
1. Start the frontend: `cd frontend && npm start`
2. Click "Voice Mode" in chat header
3. Allow microphone permission when prompted
4. Click "Start Voice Chat"
5. Speak naturally and verify:
   - Voice level indicators respond to your voice
   - Recording starts/stops automatically
   - Transcription appears in chat
   - AI responds with voice
   - Conversation continues hands-free

### Expected Behavior:
- **Activation**: Smooth overlay appears with voice assistant
- **Voice Detection**: Recording starts when you speak
- **Silence Detection**: Recording stops after you finish speaking
- **Processing**: Shows "Processing..." with loading animation
- **AI Response**: Plays voice response and shows text in chat
- **Continuation**: Returns to listening mode for next input

## Future Enhancements

- **Voice Commands**: "Stop listening", "Repeat that", etc.
- **Multiple Languages**: Dynamic language detection and switching
- **Voice Profiles**: User-specific voice recognition
- **Offline Mode**: Local speech recognition when available
- **Noise Cancellation**: Better voice detection in noisy environments

## Troubleshooting

### Common Issues:

1. **"Microphone access required"**
   - Solution: Click "Enable" and allow microphone permission in browser

2. **"Recording starts randomly"**
   - Solution: Adjust `SILENCE_THRESHOLD` value for your environment

3. **"AI doesn't respond"**
   - Solution: Check backend voice endpoints are running and accessible

4. **"Voice response doesn't play"**
   - Solution: Check browser autoplay policies, user interaction may be required

5. **"Conversation doesn't appear in chat"**
   - Solution: Verify `onTranscriptionReceived` and `onVoiceResponse` are properly connected

---

The voice assistant provides a natural, hands-free conversation experience that makes your AI assistant feel more like Siri or Alexa while keeping all conversations visible in the chat interface for reference.


