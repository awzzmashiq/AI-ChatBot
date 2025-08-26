/**
 * Simple Voice Assistant - Using Browser Speech APIs
 * Like modern AI assistants (ChatGPT Voice, Claude, etc.)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Mic, 
    MicOff,
    Volume2,
    VolumeX,
    Loader,
    AlertCircle,
    Phone,
    PhoneOff,
    Headphones
} from 'lucide-react';
import config from '../config';

const SimpleVoiceAssistant = ({
    onTranscriptionReceived,
    onVoiceResponse,
    onError,
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
    const [isSupported, setIsSupported] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [conversationState, setConversationState] = useState('ready'); // ready, listening, processing, speaking
    const [lastSpeechEndTime, setLastSpeechEndTime] = useState(0); // Track when speech ended

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(null);
    const isActiveRef = useRef(isActive);
    const isSpeakingRef = useRef(false); // Track speaking state to prevent transcription loops
    const lastErrorTimeRef = useRef(0); // Track when last error occurred
    const consecutiveErrorsRef = useRef(0); // Track consecutive errors
    const recentAIResponsesRef = useRef([]); // Track recent AI responses to prevent loops

    // Check browser support
    useEffect(() => {
        console.log('🔍 Checking browser support...');
        console.log('SpeechRecognition:', 'SpeechRecognition' in window);
        console.log('webkitSpeechRecognition:', 'webkitSpeechRecognition' in window);
        console.log('speechSynthesis:', 'speechSynthesis' in window);
        
        const speechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        const synthSupported = 'speechSynthesis' in window;
        
        console.log('🎯 Speech supported:', speechSupported);
        console.log('🎯 Synthesis supported:', synthSupported);
        
        setIsSupported(speechSupported && synthSupported);
        
        if (!speechSupported) {
            console.error('❌ Speech recognition not supported');
            onError?.('Speech recognition not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Configure recognition
        recognitionRef.current.continuous = true; // Keep listening
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        // Set up event handlers
        recognitionRef.current.onstart = () => {
            console.log('🎤 Speech recognition started');
            setIsListening(true);
            setConversationState('listening');
        };

        recognitionRef.current.onresult = (event) => {
            console.log('🎯 onresult called with event:', event);
            console.log('🎯 event.results:', event.results);
            console.log('🎯 event.results.length:', event.results?.length);
            
                    // Don't process results while AI is speaking to prevent feedback loops
        if (isSpeaking || isProcessing || isSpeakingRef.current) {
            console.log('📝 Ignoring speech recognition while AI is speaking/processing');
            return;
        }
        
        // Additional safety check: if we're in speaking state, don't process any results
        if (conversationState === 'speaking') {
            console.log('📝 Ignoring speech recognition while in speaking state');
            return;
        }
        
        // Additional check: if we have multiple results, it might be the AI's own speech
        // The AI's speech typically creates multiple results with increasing length
        if (event.results && event.results.length > 1) {
            const firstResult = event.results[0];
            const lastResult = event.results[event.results.length - 1];
            
            // If the first result is much shorter than the last result, it's likely AI speech
            if (firstResult && lastResult && 
                firstResult[0] && lastResult[0] &&
                firstResult[0].transcript && lastResult[0].transcript &&
                firstResult[0].transcript.length < lastResult[0].transcript.length * 0.3) {
                console.log('📝 Ignoring likely AI speech (multiple results with increasing length)');
                return;
            }
        }
            
            // Check if results array exists and has items
            if (!event.results || event.results.length === 0) {
                console.log('📝 No results available');
                return;
            }
            
            const result = event.results[event.results.length - 1];
            console.log('🎯 Last result:', result);
            console.log('🎯 result[0]:', result?.[0]);
            console.log('🎯 result[0].transcript:', result?.[0]?.transcript);
            console.log('🎯 result.isFinal:', result?.isFinal);
            console.log('🎯 result[0].confidence:', result?.[0]?.confidence);
            
            // Check if transcript exists and is valid
            if (!result || !result[0] || !result[0].transcript) {
                console.log('📝 No transcript available in result');
                return;
            }
            
            const transcript = result[0].transcript.trim();
            const confidence = result[0].confidence || 0.9;
            
            // Additional check: don't process if we're still speaking
            if (isSpeaking) {
                console.log('📝 Ignoring transcript while speaking');
                return;
            }
            
            // Check if this transcript looks like AI speech (contains AI response patterns)
            const aiSpeechPatterns = [
                /^7:30\s/i,  // Common pattern from logs
                /^i couldn't find any relevant information/i,
                /^however,?\s*i can give you/i,
                /^java\s+என்பது/i,  // Tamil text patterns
                /^வணக்கம்\s+ashik730/i,
                /^ஜாவா\s+என்பது/i,  // More Tamil patterns
                /^ஜாவா\s+பயன்றுகின்றது/i,
                /^நீங்கள்\s+வாசிப்போம்/i
            ];
            
            if (aiSpeechPatterns.some(pattern => pattern.test(transcript))) {
                console.log('📝 Ignoring likely AI speech (matches AI response patterns)');
                return;
            }
            
            // Additional check: if transcript is very long and contains AI-like content, ignore it
            if (transcript.length > 100 && (
                transcript.toLowerCase().includes('java') ||
                transcript.toLowerCase().includes('programming') ||
                transcript.toLowerCase().includes('couldn\'t find') ||
                transcript.toLowerCase().includes('however')
            )) {
                console.log('📝 Ignoring likely AI speech (long transcript with AI content)');
                return;
            }
            
            // Check if transcript is similar to recent AI responses
            const transcriptWords = transcript.toLowerCase().split(/\s+/);
            const isSimilarToAIResponse = recentAIResponsesRef.current.some(response => {
                // Check if transcript contains many words from AI response
                const commonWords = response.words.filter(word => 
                    transcriptWords.includes(word) && word.length > 3
                );
                return commonWords.length >= 3; // If 3+ common words, likely AI speech
            });
            
            if (isSimilarToAIResponse) {
                console.log('📝 Ignoring likely AI speech (similar to recent AI response)');
                return;
            }
            
            console.log('📝 Transcript:', transcript, 'Confidence:', confidence);
            setCurrentTranscript(transcript);
            
            if (result.isFinal && transcript) {
                console.log('🎯 Final transcript received, processing...');
                handleTranscription(transcript, confidence);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error('🚫 Speech recognition error:', event.error);
            console.error('🚫 Error details:', event);
            setIsListening(false);
            setConversationState('ready');
            
            if (event.error === 'not-allowed') {
                console.error('🚫 Microphone permission denied');
                onError?.('Microphone permission denied. Please allow microphone access.');
            } else if (event.error === 'no-speech') {
                console.error('🚫 No speech detected');
                onError?.('No speech detected. Please try again.');
            } else if (event.error === 'audio-capture') {
                console.error('🚫 Audio capture failed');
                onError?.('Audio capture failed. Please check your microphone.');
            } else if (event.error === 'network') {
                console.error('🚫 Network error');
                onError?.('Network error. Please check your internet connection.');
            } else {
                console.error('🚫 Unknown speech recognition error');
                onError?.(`Speech recognition error: ${event.error}`);
            }
        };

        recognitionRef.current.onend = () => {
            console.log('🎤 Speech recognition ended');
            setIsListening(false);
            if (conversationState === 'listening') {
                setConversationState('ready');
            }
        };

        // Initialize Speech Synthesis
        synthRef.current = window.speechSynthesis;
        
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    // Update isActiveRef when isActive prop changes
    useEffect(() => {
        console.log('🔄 isActive prop changed:', isActive);
        isActiveRef.current = isActive;
        if (!isActive) {
            console.log('🛑 isActive is false, stopping voice assistant');
            stopVoiceAssistant();
        }
    }, [isActive]);

    const handleTranscription = async (transcript, confidence) => {
        setIsProcessing(true);
        setConversationState('processing');
        
        try {
            // Add user message to chat
            onTranscriptionReceived?.(transcript, 'en', confidence);
            
            // Get AI response from existing chat API
            const apiBaseUrl = config.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/chat`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: transcript,
                    voice_mode: true,
                    session_id: sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`Chat API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.messages || result.messages.length === 0) {
                throw new Error('No response received from AI');
            }

            const aiResponse = result.messages[0].content;
            console.log('🤖 AI Response:', aiResponse);
            
            // Add AI response to chat
            onVoiceResponse?.(aiResponse, null);
            
            // Speak the response
            await speakText(aiResponse);
            
        } catch (error) {
            console.error('❌ Voice processing error:', error);
            onError?.(`Voice processing failed: ${error.message}`);
            setConversationState('ready');
        } finally {
            setIsProcessing(false);
        }
    };

    const speakText = async (text) => {
        if (!synthRef.current || !text.trim()) return;

        setIsSpeaking(true);
        setConversationState('speaking');
        
        // Cancel any ongoing speech
        synthRef.current.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Try to use a female voice
        const voices = synthRef.current.getVoices();
        const femaleVoice = voices.find(voice => 
            voice.name.toLowerCase().includes('female') ||
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('aria')
        );
        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }

        utterance.onstart = () => {
            console.log('🔊 Speech synthesis started');
            isSpeakingRef.current = true;
            // Aggressively stop listening while speaking to prevent feedback loops
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
                setConversationState('speaking');
            }
            
            // Record this AI response to prevent transcription loops
            const responseWords = text.toLowerCase().split(/\s+/).slice(0, 10); // First 10 words
            recentAIResponsesRef.current.push({
                words: responseWords,
                timestamp: Date.now()
            });
            
            // Keep only recent responses (last 5)
            if (recentAIResponsesRef.current.length > 5) {
                recentAIResponsesRef.current.shift();
            }
        };

        utterance.onend = () => {
            console.log('🔊 Speech synthesis ended');
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setConversationState('ready');
            setLastSpeechEndTime(Date.now()); // Record when speech ended
            
            // Reset error counter on successful completion
            consecutiveErrorsRef.current = 0;
            
            // Clean up old AI responses (older than 30 seconds)
            const now = Date.now();
            recentAIResponsesRef.current = recentAIResponsesRef.current.filter(
                response => now - response.timestamp < 30000
            );
            
            // Don't auto-restart listening to prevent feedback loops
            // Only restart after a longer delay and if conditions are right
            if (isActiveRef.current) {
                setTimeout(() => {
                    // Additional safety checks before restarting
                    if (isActiveRef.current && 
                        !isSpeaking && 
                        !isProcessing && 
                        !isSpeakingRef.current &&
                        conversationState === 'ready') {
                        console.log('🔄 Attempting to restart listening after speech...');
                        startListening();
                    } else {
                        console.log('❌ Not restarting listening - conditions not met');
                    }
                }, 3000); // Increased delay to prevent loops
            }
        };

        utterance.onerror = (event) => {
            console.error('🚫 Speech synthesis error:', event.error);
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setConversationState('ready');
            lastErrorTimeRef.current = Date.now();
            consecutiveErrorsRef.current += 1;
            onError?.(`Speech synthesis error: ${event.error}`);
            
            // Don't restart listening on error to prevent loops
            // Let the user manually restart if needed
        };

        synthRef.current.speak(utterance);
    };

    const checkMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Microphone permission granted');
            return true;
        } catch (error) {
            console.error('❌ Microphone permission denied:', error);
            onError?.('Microphone permission denied. Please allow microphone access.');
            return false;
        }
    };

    const startListening = useCallback(async () => {
        console.log('🎤 Starting listening...');
        console.log('isSupported:', isSupported);
        console.log('recognitionRef.current:', !!recognitionRef.current);
        console.log('isListening:', isListening);
        console.log('isProcessing:', isProcessing);
        console.log('isSpeaking:', isSpeaking);
        console.log('isSpeakingRef.current:', isSpeakingRef.current);
        
        // Don't start listening if there was a recent error (within last 5 seconds)
        const timeSinceLastError = Date.now() - lastErrorTimeRef.current;
        if (timeSinceLastError < 5000) {
            console.log('❌ Cannot start listening - too soon after error');
            return;
        }
        
        // Don't start listening too soon after speech ended (within last 4 seconds)
        const timeSinceLastSpeech = Date.now() - lastSpeechEndTime;
        if (timeSinceLastSpeech < 4000) {
            console.log('❌ Cannot start listening - too soon after speech ended');
            return;
        }
        
        // Don't start listening if there are too many consecutive errors
        if (consecutiveErrorsRef.current >= 3) {
            console.log('❌ Cannot start listening - too many consecutive errors');
            return;
        }
        
        // Comprehensive check for all conditions that should prevent listening
        const cannotListen = !isSupported || 
                            !recognitionRef.current || 
                            isListening || 
                            isProcessing || 
                            isSpeaking || 
                            isSpeakingRef.current ||
                            conversationState === 'speaking' ||
                            conversationState === 'processing';
                            
        if (cannotListen) {
            console.log('❌ Cannot start listening - conditions not met');
            console.log('  - isSupported:', isSupported);
            console.log('  - isListening:', isListening);
            console.log('  - isProcessing:', isProcessing);
            console.log('  - isSpeaking:', isSpeaking);
            console.log('  - isSpeakingRef.current:', isSpeakingRef.current);
            console.log('  - conversationState:', conversationState);
            return;
        }
        
        // Additional safety check: ensure we're not in any problematic state
        if (isSpeakingRef.current) {
            console.log('❌ Cannot start listening - still in speaking state');
            return;
        }
        
        // Final safety check: ensure all state variables are consistent
        if (isSpeaking || isProcessing || isListening) {
            console.log('❌ Cannot start listening - state inconsistency detected');
            return;
        }
        
        // Check microphone permission first
        const hasPermission = await checkMicrophonePermission();
        if (!hasPermission) {
            console.log('❌ No microphone permission');
            return;
        }

        try {
            console.log('✅ Starting speech recognition...');
            setCurrentTranscript('');
            recognitionRef.current.start();
        } catch (error) {
            console.error('❌ Failed to start recognition:', error);
            onError?.('Failed to start voice recognition');
        }
    }, [isSupported, isListening, isProcessing, isSpeaking]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const stopSpeaking = useCallback(() => {
        if (synthRef.current && isSpeaking) {
            synthRef.current.cancel();
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setConversationState('ready');
        }
    }, [isSpeaking]);

    const startVoiceAssistant = useCallback(() => {
        console.log('🚀 Starting voice assistant...');
        console.log('isSupported:', isSupported);
        console.log('isListening:', isListening);
        console.log('isProcessing:', isProcessing);
        console.log('isSpeaking:', isSpeaking);
        
        if (!isSupported) {
            console.error('❌ Voice features not supported');
            onError?.('Voice features not supported in this browser');
            return;
        }
        
        console.log('✅ Starting voice assistant successfully');
        setConversationState('ready');
        setTimeout(startListening, 500);
    }, [isSupported, startListening, isListening, isProcessing, isSpeaking]);

    const stopVoiceAssistant = useCallback(() => {
        stopListening();
        stopSpeaking();
        setConversationState('ready');
        setCurrentTranscript('');
        setIsProcessing(false);
        
        // Reset error counters when manually stopped
        consecutiveErrorsRef.current = 0;
        lastErrorTimeRef.current = 0;
        
        // Clear AI response tracking to prevent loops
        recentAIResponsesRef.current = [];
        setLastSpeechEndTime(0);
    }, [stopListening, stopSpeaking]);

    const toggleVoiceAssistant = useCallback(() => {
        console.log('🔄 Toggle voice assistant called');
        console.log('isActive:', isActive);
        
        if (isActive) {
            console.log('🛑 Stopping voice assistant');
            stopVoiceAssistant();
        } else {
            console.log('▶️ Starting voice assistant');
            startVoiceAssistant();
        }
        onToggleActive?.();
    }, [isActive, startVoiceAssistant, stopVoiceAssistant, onToggleActive]);

    const getStateDisplay = () => {
        switch (conversationState) {
            case 'listening':
                return {
                    icon: Mic,
                    text: 'Listening...',
                    subtext: 'Speak naturally',
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/20'
                };
            case 'processing':
                return {
                    icon: Loader,
                    text: 'Processing...',
                    subtext: 'Understanding your message',
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/20',
                    spinning: true
                };
            case 'speaking':
                return {
                    icon: Volume2,
                    text: 'Speaking...',
                    subtext: 'AI is responding',
                    color: 'text-purple-400',
                    bgColor: 'bg-purple-500/20'
                };
            default:
                return {
                    icon: Headphones,
                    text: 'Voice Assistant Ready',
                    subtext: 'Click to start conversation',
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-500/20'
                };
        }
    };

    if (!isSupported) {
        return (
            <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-8 mx-4 max-w-md w-full shadow-2xl"
                >
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Voice Not Supported
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Your browser doesn't support voice features. Please use Chrome or Edge for the best experience.
                        </p>
                        <button
                            onClick={onToggleActive}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const stateDisplay = getStateDisplay();
    const StateIcon = stateDisplay.icon;

    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-gradient-to-br from-gray-950 via-black to-gray-900 rounded-3xl p-8 mx-4 max-w-md w-full shadow-2xl border border-gray-800"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Headphones className="w-6 h-6 text-blue-400" />
                                <h2 className="text-xl font-semibold text-white">Voice Assistant</h2>
                            </div>
                            <p className="text-gray-400 text-sm">
                                Speak naturally like you're talking to Siri or Alexa
                            </p>
                        </div>

                        {/* Voice Visualizer */}
                        <div className="flex flex-col items-center mb-8">
                            <motion.div
                                className={`w-24 h-24 rounded-full flex items-center justify-center ${stateDisplay.bgColor} border-2 border-gray-700 mb-4`}
                                animate={stateDisplay.spinning ? { rotate: 360 } : {}}
                                transition={stateDisplay.spinning ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
                            >
                                <StateIcon className={`w-8 h-8 ${stateDisplay.color}`} />
                            </motion.div>
                            
                            <h3 className="text-lg font-medium text-white mb-1">
                                {stateDisplay.text}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {stateDisplay.subtext}
                            </p>
                            
                            {/* Show current transcript */}
                            {currentTranscript && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                                >
                                    <p className="text-white text-sm">"{currentTranscript}"</p>
                                </motion.div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    console.log('🔘 Button clicked!');
                                    console.log('isActive:', isActive);
                                    console.log('conversationState:', conversationState);
                                    if (conversationState === 'ready') {
                                        startVoiceAssistant();
                                    } else {
                                        stopVoiceAssistant();
                                    }
                                }}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                                    conversationState === 'ready' 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                                                 <div className="flex items-center justify-center gap-2">
                                     {conversationState === 'ready' ? (
                                         <>
                                             <Phone className="w-4 h-4" />
                                             Start Voice Chat
                                         </>
                                     ) : (
                                         <>
                                             <PhoneOff className="w-4 h-4" />
                                             Stop Voice Chat
                                         </>
                                     )}
                                 </div>
                            </motion.button>
                        </div>

                        {/* Exit Voice Mode */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                console.log('🚪 Exit Voice Mode clicked');
                                toggleVoiceAssistant();
                            }}
                            className="w-full mt-4 py-2 px-4 text-gray-400 hover:text-white transition-colors text-sm"
                        >
                            Exit Voice Mode
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SimpleVoiceAssistant;
