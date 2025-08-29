/**
 * VoiceRecorder Component - React Native implementation
 * Handles audio recording and playback for React Native (Android)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
    Easing
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { 
    PERMISSIONS, 
    check, 
    request, 
    RESULTS 
} from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { tw } from 'tailwind-rn';
import LinearGradient from 'react-native-linear-gradient';

const VoiceRecorder = ({
    onRecordingComplete,
    onTranscriptionReceived,
    onError,
    maxDuration = 300, // 5 minutes
    autoTranscribe = true,
    style = {},
    size = "medium"
}) => {
    // State management
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordedUri, setRecordedUri] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('checking');

    // Refs
    const audioRecorderPlayer = useRef(new AudioRecorderPlayer());
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Size configurations
    const sizeConfig = {
        small: { iconSize: 20, buttonSize: 40, spacing: 8 },
        medium: { iconSize: 24, buttonSize: 48, spacing: 12 },
        large: { iconSize: 28, buttonSize: 56, spacing: 16 }
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Initialize permissions
    useEffect(() => {
        checkPermissions();
        
        return () => {
            cleanup();
        };
    }, []);

    // Start pulse animation when recording
    useEffect(() => {
        if (isRecording) {
            const pulse = () => {
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    if (isRecording) pulse();
                });
            };
            pulse();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isRecording]);

    // Cleanup function
    const cleanup = useCallback(async () => {
        try {
            await audioRecorderPlayer.current.stopRecorder();
            await audioRecorderPlayer.current.stopPlayer();
        } catch (error) {
            console.log('Cleanup error:', error);
        }
    }, []);

    // Permission handling for React Native
    const checkPermissions = async () => {
        try {
            const permission = PERMISSIONS.ANDROID.RECORD_AUDIO;
            const result = await check(permission);
            
            setHasPermission(result === RESULTS.GRANTED);
            setPermissionStatus(result);
        } catch (error) {
            console.error('Permission check failed:', error);
            setPermissionStatus(RESULTS.DENIED);
        }
    };

    const requestPermission = async () => {
        try {
            const permission = PERMISSIONS.ANDROID.RECORD_AUDIO;
            const result = await request(permission);
            
            setHasPermission(result === RESULTS.GRANTED);
            setPermissionStatus(result);
            
            if (result !== RESULTS.GRANTED) {
                Alert.alert(
                    'Permission Required',
                    'Microphone access is required for voice recording.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            setPermissionStatus(RESULTS.DENIED);
            onError?.('Permission request failed');
        }
    };

    // Start recording
    const startRecording = async () => {
        if (!hasPermission) {
            await requestPermission();
            return;
        }

        try {
            const audioSet = {
                AudioEncoderAndroid: 'aac',
                AudioSampleRate: 16000,
                AudioChannels: 1,
                AudioQuality: 'High',
            };

            const uri = await audioRecorderPlayer.current.startRecorder(
                undefined, // Use default path
                audioSet
            );

            audioRecorderPlayer.current.addRecordBackListener((e) => {
                const currentDuration = e.currentPosition / 1000;
                setDuration(currentDuration);
                
                if (currentDuration >= maxDuration) {
                    stopRecording();
                }
            });

            setIsRecording(true);
            setDuration(0);

        } catch (error) {
            console.error('Recording failed:', error);
            onError?.('Recording failed: ' + error.message);
        }
    };

    // Stop recording
    const stopRecording = async () => {
        try {
            const result = await audioRecorderPlayer.current.stopRecorder();
            audioRecorderPlayer.current.removeRecordBackListener();
            
            setIsRecording(false);
            setRecordedUri(result);
            
            onRecordingComplete?.(result);
            
            if (autoTranscribe) {
                transcribeAudio(result);
            }

        } catch (error) {
            console.error('Stop recording failed:', error);
            onError?.('Stop recording failed: ' + error.message);
        }
    };

    // Play recorded audio
    const playRecording = async () => {
        if (!recordedUri) return;

        try {
            await audioRecorderPlayer.current.startPlayer(recordedUri);
            
            audioRecorderPlayer.current.addPlayBackListener((e) => {
                if (e.currentPosition === e.duration) {
                    setIsPlaying(false);
                    setIsPaused(false);
                }
            });
            
            setIsPlaying(true);

        } catch (error) {
            console.error('Playback failed:', error);
            onError?.('Playback failed: ' + error.message);
        }
    };

    // Pause playback
    const pausePlayback = async () => {
        try {
            await audioRecorderPlayer.current.pausePlayer();
            setIsPaused(true);
            setIsPlaying(false);
        } catch (error) {
            console.error('Pause failed:', error);
        }
    };

    // Resume playback
    const resumePlayback = async () => {
        try {
            await audioRecorderPlayer.current.resumePlayer();
            setIsPaused(false);
            setIsPlaying(true);
        } catch (error) {
            console.error('Resume failed:', error);
        }
    };

    // Transcribe audio
    const transcribeAudio = async (audioUri) => {
        if (!audioUri) return;

        setIsProcessing(true);
        
        try {
            const formData = new FormData();
            formData.append('audio', {
                uri: audioUri,
                type: 'audio/wav',
                name: 'recording.wav',
            });

            const response = await fetch('/api/voice/transcribe', {
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
    const clearRecording = async () => {
        try {
            await audioRecorderPlayer.current.stopPlayer();
            setRecordedUri(null);
            setDuration(0);
            setIsPlaying(false);
            setIsPaused(false);
        } catch (error) {
            console.log('Clear recording error:', error);
        }
    };

    // Format duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Permission request UI
    if (permissionStatus === RESULTS.DENIED || permissionStatus === RESULTS.BLOCKED) {
        return (
            <View style={[styles.permissionContainer, style]}>
                <Icon name="mic-off" size={24} color="#ef4444" />
                <View style={styles.permissionTextContainer}>
                    <Text style={styles.permissionTitle}>
                        Microphone access required
                    </Text>
                    <Text style={styles.permissionSubtitle}>
                        Please enable microphone access to use voice recording
                    </Text>
                </View>
                <TouchableOpacity 
                    onPress={requestPermission}
                    style={styles.enableButton}
                >
                    <Text style={styles.enableButtonText}>Enable</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (permissionStatus === 'checking') {
        return (
            <View style={[styles.checkingContainer, style]}>
                <Icon name="hourglass-empty" size={16} color="#6b7280" />
                <Text style={styles.checkingText}>Checking permissions...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <View style={styles.controlsContainer}>
                {/* Recording Button */}
                <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    style={[
                        styles.recordButton,
                        { 
                            width: config.buttonSize, 
                            height: config.buttonSize,
                            backgroundColor: isRecording ? '#ef4444' : '#3b82f6'
                        },
                        isProcessing && styles.disabledButton
                    ]}
                >
                    <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                        {isProcessing ? (
                            <Icon name="hourglass-empty" size={config.iconSize} color="white" />
                        ) : isRecording ? (
                            <Icon name="stop" size={config.iconSize} color="white" />
                        ) : (
                            <Icon name="mic" size={config.iconSize} color="white" />
                        )}
                    </Animated.View>
                </TouchableOpacity>

                {/* Duration Display */}
                {(isRecording || recordedUri) && (
                    <Text style={[styles.durationText, { marginLeft: config.spacing }]}>
                        {formatDuration(duration)}
                    </Text>
                )}

                {/* Playback Controls */}
                {recordedUri && !isRecording && (
                    <View style={[styles.playbackControls, { marginLeft: config.spacing }]}>
                        <TouchableOpacity
                            onPress={
                                isPlaying 
                                    ? pausePlayback 
                                    : isPaused 
                                        ? resumePlayback 
                                        : playRecording
                            }
                            style={[
                                styles.playButton,
                                { 
                                    width: config.buttonSize * 0.8, 
                                    height: config.buttonSize * 0.8 
                                }
                            ]}
                        >
                            <Icon 
                                name={isPlaying ? "pause" : "play-arrow"} 
                                size={config.iconSize * 0.8} 
                                color="white" 
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={clearRecording}
                            style={[
                                styles.clearButton,
                                { 
                                    width: config.buttonSize * 0.8, 
                                    height: config.buttonSize * 0.8,
                                    marginLeft: config.spacing / 2
                                }
                            ]}
                        >
                            <Icon 
                                name="delete" 
                                size={config.iconSize * 0.8} 
                                color="white" 
                            />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Processing Indicator */}
                {isProcessing && (
                    <View style={[styles.processingContainer, { marginLeft: config.spacing }]}>
                        <Icon name="hourglass-empty" size={16} color="#3b82f6" />
                        <Text style={styles.processingText}>Processing...</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordButton: {
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    disabledButton: {
        opacity: 0.5,
    },
    durationText: {
        fontFamily: 'monospace',
        fontSize: 16,
        color: '#6b7280',
    },
    playbackControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        backgroundColor: '#10b981',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    clearButton: {
        backgroundColor: '#6b7280',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    processingText: {
        fontSize: 14,
        color: '#3b82f6',
        marginLeft: 4,
    },
    permissionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    permissionTextContainer: {
        flex: 1,
        marginLeft: 8,
    },
    permissionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#991b1b',
    },
    permissionSubtitle: {
        fontSize: 12,
        color: '#dc2626',
    },
    enableButton: {
        backgroundColor: '#dc2626',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    enableButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    checkingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    checkingText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 8,
    },
});

export default VoiceRecorder;






