/**
 * VoiceAssistant Component - Continuous voice conversation like Siri/Alexa
 * Handles continuous voice interaction with automatic turn-taking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
    Mic, 
    Volume2,
    Loader,
    AlertCircle,
    Phone,
    PhoneOff,
    Headphones
} from 'lucide-react';
import config from '../config';

const VoiceAssistant = ({
    onTranscriptionReceived,
    onError,
    onVoiceResponse,
    isActive = false,
    onToggleActive,
    sessionId,
    className = ""
}) => {
    // State management
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('checking');
    const [voiceLevel, setVoiceLevel] = useState(0);
    const [conversationState, setConversationState] = useState('idle'); // idle, listening, processing, speaking

    // Refs for continuous voice detection
    const mediaRecorderRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const silenceTimerRef = useRef(null);
    const voiceDetectionRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const isActiveRef = useRef(false);
    const recordingStartTime = useRef(null);

    // Voice activity detection parameters
    const SILENCE_THRESHOLD = 0.01; // Minimum voice level to detect speech
    const SILENCE_DURATION = 2000; // Stop recording after 2 seconds of silence
    const MIN_RECORDING_DURATION = 1000; // Minimum 1 second recording
    const VOICE_LEVEL_SMOOTHING = 0.8; // Smoothing factor for voice level animation

    // Update isActiveRef when isActive prop changes
    useEffect(() => {
        isActiveRef.current = isActive;
        if (isActive) {
            startVoiceAssistant();
        } else {
            stopVoiceAssistant();
        }
    }, [isActive]);

    // Initialize permissions
    useEffect(() => {
        checkPermissions();
        
        return () => {
            cleanup();
        };
    }, []);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        
        if (voiceDetectionRef.current) {
            cancelAnimationFrame(voiceDetectionRef.current);
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
        }
    }, []);

    // Permission handling for web
    const checkPermissions = async () => {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            setHasPermission(permissionStatus.state === 'granted');
            setPermissionStatus(permissionStatus.state);
            
            permissionStatus.onchange = () => {
                setHasPermission(permissionStatus.state === 'granted');
                setPermissionStatus(permissionStatus.state);
            };
        } catch (error) {
            console.error('Permission check failed:', error);
            setPermissionStatus('prompt');
        }
    };

    const requestPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            setHasPermission(true);
            setPermissionStatus('granted');
        } catch (error) {
            console.error('Permission request failed:', error);
            setPermissionStatus('denied');
            onError?.('Microphone permission denied');
        }
    };

    // Voice activity detection using Web Audio API
    const setupVoiceDetection = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            streamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            
            analyserRef.current.fftSize = 256;
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const detectVoice = () => {
                if (!isActiveRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength / 255; // Normalize to 0-1
                
                // Smooth the voice level for UI animation
                setVoiceLevel(prev => prev * VOICE_LEVEL_SMOOTHING + average * (1 - VOICE_LEVEL_SMOOTHING));

                // Voice activity detection
                if (average > SILENCE_THRESHOLD) {
                    if (!isListening && !isSpeaking && !isProcessing) {
                        startRecording();
                    }
                    
                    // Reset silence timer
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                    }
                } else if (isListening) {
                    // Start silence timer
                    if (!silenceTimerRef.current) {
                        silenceTimerRef.current = setTimeout(() => {
                            const recordingDuration = Date.now() - recordingStartTime.current;
                            if (recordingDuration >= MIN_RECORDING_DURATION) {
                                stopRecording();
                            }
                        }, SILENCE_DURATION);
                    }
                }

                voiceDetectionRef.current = requestAnimationFrame(detectVoice);
            };

            detectVoice();
        } catch (error) {
            console.error('Voice detection setup failed:', error);
            onError?.('Failed to setup voice detection: ' + error.message);
        }
    };

    // Start the voice assistant
    const startVoiceAssistant = async () => {
        if (!hasPermission) {
            await requestPermission();
            return;
        }

        setConversationState('listening');
        await setupVoiceDetection();
    };

    // Stop the voice assistant
    const stopVoiceAssistant = () => {
        setConversationState('idle');
        setIsListening(false);
        setIsSpeaking(false);
        setIsProcessing(false);
        setVoiceLevel(0);
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        cleanup();
    };

    // Start recording when voice is detected
    const startRecording = async () => {
        try {
            chunksRef.current = [];
            recordingStartTime.current = Date.now();

            // Use WebM format for web
            const options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/webm';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/wav';
            }

            mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: options.mimeType });
                processVoiceInput(blob);
            };

            mediaRecorderRef.current.start(100);
            setIsListening(true);
            setConversationState('listening');

        } catch (error) {
            console.error('Recording failed:', error);
            onError?.('Recording failed: ' + error.message);
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        setIsListening(false);
        
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    };

    // Process voice input and get AI response
    const processVoiceInput = async (audioBlob) => {
        setIsProcessing(true);
        setConversationState('processing');
        
        try {
            // Step 1: Transcribe audio
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice_input.webm');

            const apiBaseUrl = config.getApiBaseUrl();
        const transcribeResponse = await fetch(`${apiBaseUrl}/api/voice/transcribe`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const transcribeResult = await transcribeResponse.json();

            if (!transcribeResult.success) {
                throw new Error(transcribeResult.error || 'Transcription failed');
            }

            const userMessage = transcribeResult.transcription;
            
            // Add user message to chat
            onTranscriptionReceived?.(userMessage, transcribeResult.language, transcribeResult.confidence);

            // Step 2: Get AI response
            const chatResponse = await fetch(`${apiBaseUrl}/api/chat`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    voice_mode: true,
                    session_id: sessionId
                })
            });

            const chatResult = await chatResponse.json();

            if (!chatResult.messages || chatResult.messages.length === 0) {
                throw new Error('No response received from AI');
            }

            // Step 3: Convert AI response to speech
            const synthesizeResponse = await fetch(`${apiBaseUrl}/api/voice/synthesize`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: chatResult.messages[0].content,
                    language: 'en'
                })
            });

            const synthesizeResult = await synthesizeResponse.json();

            if (!synthesizeResult.success) {
                throw new Error(synthesizeResult.error || 'Speech synthesis failed');
            }

            // Step 4: Play AI response
            await playAIResponse(synthesizeResult.audio_url, chatResult.messages[0].content);

        } catch (error) {
            console.error('Voice processing failed:', error);
            onError?.('Voice processing failed: ' + error.message);
            setConversationState('listening'); // Resume listening after error
        } finally {
            setIsProcessing(false);
        }
    };

    // Play AI voice response
    const playAIResponse = async (audioUrl, responseText) => {
        try {
            setIsSpeaking(true);
            setConversationState('speaking');

            // Notify parent component about the voice response
            onVoiceResponse?.(responseText, audioUrl);

            // Create and play audio
            audioPlayerRef.current = new Audio(audioUrl);
            
            audioPlayerRef.current.onended = () => {
                setIsSpeaking(false);
                if (isActiveRef.current) {
                    setConversationState('listening');
                } else {
                    setConversationState('idle');
                }
            };

            audioPlayerRef.current.onerror = (error) => {
                console.error('Audio playback failed:', error);
                setIsSpeaking(false);
                setConversationState('listening');
            };

            await audioPlayerRef.current.play();

        } catch (error) {
            console.error('AI response playback failed:', error);
            setIsSpeaking(false);
            setConversationState('listening');
        }
    };

    // Get conversation state display
    const getStateDisplay = () => {
        switch (conversationState) {
            case 'listening':
                return { text: 'Listening...', color: 'text-green-500', icon: Mic };
            case 'processing':
                return { text: 'Processing...', color: 'text-blue-500', icon: Loader };
            case 'speaking':
                return { text: 'Speaking...', color: 'text-purple-500', icon: Volume2 };
            default:
                return { text: 'Voice Assistant Ready', color: 'text-gray-500', icon: Headphones };
        }
    };

    // Permission request UI
    if (permissionStatus === 'denied' || permissionStatus === 'blocked') {
        return (
            <div className={`flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        Microphone access required
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                        Please enable microphone access for voice conversation
                    </p>
                </div>
                <button
                    onClick={requestPermission}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                >
                    Enable
                </button>
            </div>
        );
    }

    if (permissionStatus === 'checking') {
        return (
            <div className={`flex items-center gap-2 p-3 ${className}`}>
                <Loader className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-500">Checking permissions...</span>
            </div>
        );
    }

    const stateDisplay = getStateDisplay();
    const StateIcon = stateDisplay.icon;

    return (
        <div className={`voice-assistant ${className}`}>
            {/* Main Voice Assistant Interface */}
            <div className="flex flex-col items-center gap-4 p-6">
                {/* Voice Activity Visualizer */}
                <div className="relative">
                    <motion.div
                        className="w-24 h-24 rounded-full flex items-center justify-center relative overflow-hidden"
                        style={{
                            background: isActive 
                                ? `radial-gradient(circle, rgba(59, 130, 246, ${0.3 + voiceLevel * 0.7}) 0%, rgba(59, 130, 246, 0.1) 100%)`
                                : 'rgba(156, 163, 175, 0.1)'
                        }}
                        animate={{
                            scale: isActive ? (1 + voiceLevel * 0.3) : 1,
                        }}
                        transition={{ duration: 0.1 }}
                    >
                        {/* Animated rings for voice activity */}
                        {isActive && (
                            <>
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.3, 0, 0.3],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-blue-500"
                                    animate={{
                                        scale: [1, 1.4, 1],
                                        opacity: [0.2, 0, 0.2],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: 0.5
                                    }}
                                />
                            </>
                        )}

                        {/* Main icon */}
                        <motion.div
                            animate={{
                                rotate: conversationState === 'processing' ? 360 : 0,
                            }}
                            transition={{
                                duration: conversationState === 'processing' ? 2 : 0,
                                repeat: conversationState === 'processing' ? Infinity : 0,
                                ease: "linear"
                            }}
                        >
                            <StateIcon 
                                className={`w-8 h-8 ${stateDisplay.color}`}
                            />
                        </motion.div>
                    </motion.div>

                    {/* Voice level indicator */}
                    {isActive && voiceLevel > 0.01 && (
                        <motion.div
                            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-blue-500 rounded-full"
                                        style={{
                                            height: Math.max(4, voiceLevel * 20 * (i + 1)),
                                        }}
                                        animate={{
                                            height: Math.max(4, voiceLevel * 20 * (i + 1)),
                                        }}
                                        transition={{ duration: 0.1 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* State Text */}
                <motion.div
                    key={stateDisplay.text}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                >
                    <p className={`text-lg font-medium ${stateDisplay.color}`}>
                        {stateDisplay.text}
                    </p>
                    {conversationState === 'listening' && (
                        <p className="text-sm text-gray-500 mt-1">
                            Speak naturally, I'm listening...
                        </p>
                    )}
                    {conversationState === 'processing' && (
                        <p className="text-sm text-gray-500 mt-1">
                            Understanding your message...
                        </p>
                    )}
                    {conversationState === 'speaking' && (
                        <p className="text-sm text-gray-500 mt-1">
                            Playing response...
                        </p>
                    )}
                </motion.div>

                {/* Control Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onToggleActive}
                    className={`
                        px-6 py-3 rounded-full font-medium transition-all duration-200 flex items-center gap-2
                        ${isActive 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }
                    `}
                >
                    {isActive ? (
                        <>
                            <PhoneOff className="w-4 h-4" />
                            End Conversation
                        </>
                    ) : (
                        <>
                            <Phone className="w-4 h-4" />
                            Start Voice Chat
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default VoiceAssistant;
