# Dual Voice Mode Functionality

## Overview
The application now supports two distinct voice interaction modes using the same microphone button:

1. **Voice to Text** - Traditional voice input that converts speech to text and gets a text response
2. **Voice to Voice (Assistant)** - Full voice conversation mode with AI responses spoken back

## How It Works

### UI Changes
- The microphone button now has a small dropdown arrow (ChevronDown icon)
- Clicking the mic button opens a dropdown with two options
- Each option has a clear icon and description

### Voice Modes

#### 1. Voice to Text Mode
- **Icon**: MessageSquare (blue)
- **Description**: "Speak and get text response"
- **API Endpoint**: `/api/audio` (voice input → text response)
- **Behavior**: Records audio, converts to text, sends to chat API, displays text response

#### 2. Voice Assistant Mode
- **Icon**: Headphones (purple)
- **Description**: "Full voice conversation"
- **API Endpoint**: `/api/chat` (voice-to-voice conversation)
- **Behavior**: Activates the voice assistant component for continuous voice conversation

### Technical Implementation

#### InputBar Component
- Added `currentVoiceMode` prop to track active mode
- Dropdown menu with two voice options
- Click-outside handler to close dropdown
- Visual indicators for current mode during recording

#### Chat Component
- Modified `toggleRecording` function to accept mode parameter
- `currentVoiceMode` state to track which mode is active
- Different behavior based on selected mode

#### Recording Indicators
- **Voice to Text**: Shows "Recording... Click to stop" with blue "Text" badge
- **Voice Assistant**: Shows "Voice Assistant Active..." with purple "Assistant" badge

### User Experience

1. **Click mic button** → Dropdown appears with two options
2. **Select "Voice to Text"** → Starts recording for text conversion
3. **Select "Voice Assistant"** → Activates full voice conversation mode
4. **Visual feedback** → Clear indicators show which mode is active
5. **Easy switching** → Can change modes between recordings

### Benefits

- **Single Interface**: One mic button serves both use cases
- **Clear Distinction**: Users understand the difference between modes
- **Seamless Switching**: Easy to change modes as needed
- **Visual Clarity**: Icons and colors make modes easily identifiable
- **Consistent UX**: Both modes integrate seamlessly with existing chat interface

### Future Enhancements

- Keyboard shortcuts for quick mode switching
- Mode persistence across sessions
- Customizable voice mode preferences
- Voice mode analytics and usage tracking
