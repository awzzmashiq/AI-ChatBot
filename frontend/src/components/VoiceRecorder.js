/**
 * VoiceAssistant Component - Continuous voice conversation like Siri/Alexa
 * Handles continuous voice interaction with automatic turn-taking
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
    PhoneOff
} from 'lucide-react';
import config from '../config';

const VoiceAssistant = ({
    onTranscriptionReceived,
    onError,
    onVoiceResponse,
    isActive = false,
    onToggleActive,
    className = ""
}) => {
    // State management
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('checking');
    const [voiceLevel, setVoiceLevel] = useState(0);
    const [conversation, setConversation] = useState([]);

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

    // Voice activity detection parameters
    const SILENCE_THRESHOLD = 0.01; // Minimum voice level to detect speech
    const SILENCE_DURATION = 2000; // Stop recording after 2 seconds of silence
    const MIN_RECORDING_DURATION = 1000; // Minimum 1 second recording

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
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    }, []);

    // Permission handling for web
    const checkPermissions = async () => {
        try {
            // Check if microphone permission is available
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            setHasPermission(permissionStatus.state === 'granted');
            setPermissionStatus(permissionStatus.state);
            
            // Listen for permission changes
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
            // Web permission request
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
            setHasPermission(true);
            setPermissionStatus('granted');
        } catch (error) {
            console.error('Permission request failed:', error);
            setPermissionStatus('denied');
            onError?.('Permission request failed');
        }
    };

    // Web recording implementation
    const startWebRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            streamRef.current = stream;
            chunksRef.current = [];

            // Use WebM format for web (better compression)
            const options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/webm';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/wav';
            }

            mediaRecorderRef.current = new MediaRecorder(stream, options);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: options.mimeType });
                setRecordedAudio(blob);
                
                // Create audio URL for playback
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                
                onRecordingComplete?.(blob);
                
                if (autoTranscribe) {
                    transcribeAudio(blob);
                }
            };

            mediaRecorderRef.current.start(100); // Collect data every 100ms
            setIsRecording(true);

            // Start duration timer
            intervalRef.current = setInterval(() => {
                setDuration(prev => {
                    const newDuration = prev + 0.1;
                    if (newDuration >= maxDuration) {
                        stopRecording();
                    }
                    return newDuration;
                });
            }, 100);

        } catch (error) {
            console.error('Web recording failed:', error);
            onError?.('Recording failed: ' + error.message);
        }
    };

    // Start recording
    const startRecording = async () => {
        if (!hasPermission) {
            await requestPermission();
            return;
        }

        setDuration(0);
        await startWebRecording();
    };

    // Stop recording
    const stopRecording = async () => {
        try {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            setIsRecording(false);

        } catch (error) {
            console.error('Stop recording failed:', error);
            onError?.('Stop recording failed: ' + error.message);
        }
    };

    // Play recorded audio
    const playRecording = async () => {
        if (!recordedAudio || !audioUrl) return;

        try {
            if (!audioPlayerRef.current) {
                audioPlayerRef.current = new Audio(audioUrl);
                audioPlayerRef.current.onended = () => {
                    setIsPlaying(false);
                    setIsPaused(false);
                };
            }

            if (isPaused) {
                audioPlayerRef.current.play();
                setIsPaused(false);
            } else {
                audioPlayerRef.current.currentTime = 0;
                await audioPlayerRef.current.play();
            }
            
            setIsPlaying(true);

        } catch (error) {
            console.error('Playback failed:', error);
            onError?.('Playback failed: ' + error.message);
        }
    };

    // Pause playback
    const pausePlayback = () => {
        try {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                setIsPaused(true);
                setIsPlaying(false);
            }
        } catch (error) {
            console.error('Pause failed:', error);
        }
    };

    // Transcribe audio
    const transcribeAudio = async (audioBlob) => {
        if (!audioBlob) return;

        setIsProcessing(true);
        
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const apiBaseUrl = config.getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/voice/transcribe`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                onTranscriptionReceived?.(result.transcription, result.language, result.confidence);
            } else {
                onError?.('Transcription failed: ' + result.error);
            }

        } catch (error) {
            console.error('Transcription failed:', error);
            onError?.('Transcription failed: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Clear recording
    const clearRecording = () => {
        setRecordedAudio(null);
        setAudioUrl(null);
        setDuration(0);
        setIsPlaying(false);
        setIsPaused(false);
        
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
        }
    };

    // Format duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                        Please enable microphone access in your browser settings
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

    return (
        <div className={`voice-recorder ${className}`}>
            <div className="flex items-center gap-3">
                {/* Recording Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`
                        ${config.padding} rounded-full transition-all duration-200 relative
                        ${isRecording 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }
                        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <AnimatePresence mode="wait">
                        {isProcessing ? (
                            <motion.div
                                key="processing"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                            >
                                <Loader className={`w-4 h-4 animate-spin`} />
                            </motion.div>
                        ) : isRecording ? (
                            <motion.div
                                key="recording"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                            >
                                <Square className={`w-4 h-4`} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                            >
                                <Mic className={`w-4 h-4`} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Pulsing animation when recording */}
                    {isRecording && (
                        <motion.div
                            className="absolute inset-0 rounded-full bg-red-500"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    )}
                </motion.button>

                {/* Duration Display */}
                {(isRecording || recordedAudio) && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`${config.text} font-mono text-gray-600 dark:text-gray-400`}
                    >
                        {formatDuration(duration)}
                    </motion.div>
                )}

                {/* Playback Controls */}
                {recordedAudio && !isRecording && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={isPlaying ? pausePlayback : playRecording}
                            className={`${config.padding} bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors`}
                        >
                            {isPlaying ? (
                                <Pause className={`w-4 h-4`} />
                            ) : (
                                <Play className={`w-4 h-4`} />
                            )}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={clearRecording}
                            className={`${config.padding} bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors`}
                        >
                            <VolumeX className={`w-4 h-4`} />
                        </motion.button>
                    </motion.div>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
                    >
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default VoiceRecorder;