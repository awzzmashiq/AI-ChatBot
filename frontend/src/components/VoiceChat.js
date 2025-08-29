/**
 * VoiceChat Component - Android React Native implementation
 * Handles voice-to-voice chat functionality with permissions and native audio
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    PermissionsAndroid,
    Platform,
    Alert,
    StatusBar,
    ScrollView,
    Animated,
    Dimensions
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { 
    check, 
    request, 
    PERMISSIONS, 
    RESULTS 
} from 'react-native-permissions';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

// Import vector icons
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

// Tailwind-like styling for React Native
import tw from 'tailwind-rn';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VoiceChat = ({ 
    user, 
    onLogout, 
    apiBaseUrl,
    isDarkMode = false 
}) => {
    // State management
    const [messages, setMessages] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordTime, setRecordTime] = useState('00:00');
    const [playTime, setPlayTime] = useState('00:00');
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('checking');
    const [currentPlayingMessage, setCurrentPlayingMessage] = useState(null);

    // Refs
    const audioRecorderPlayerRef = useRef(new AudioRecorderPlayer());
    const scrollViewRef = useRef(null);
    const recordingAnimation = useRef(new Animated.Value(1)).current;
    const processingAnimation = useRef(new Animated.Value(0)).current;

    // Styles
    const styles = {
        container: [
            tw('flex-1'),
            { backgroundColor: isDarkMode ? '#000000' : '#ffffff' }
        ],
        header: [
            tw('flex-row items-center justify-between px-4 py-3'),
            { 
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight + 10
            }
        ],
        headerTitle: [
            tw('text-xl font-bold'),
            { color: isDarkMode ? '#ffffff' : '#111827' }
        ],
        headerSubtitle: [
            tw('text-xs'),
            { color: isDarkMode ? '#9ca3af' : '#6b7280' }
        ],
        messagesContainer: [
            tw('flex-1 px-4 py-2')
        ],
        messageWrapper: [
            tw('mb-4')
        ],
        userMessage: [
            tw('self-end max-w-4/5 px-4 py-3 rounded-2xl'),
            { backgroundColor: '#3b82f6' }
        ],
        botMessage: [
            tw('self-start max-w-4/5 px-4 py-3 rounded-2xl'),
            { 
                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                borderWidth: 1,
                borderColor: isDarkMode ? '#4b5563' : '#e5e7eb'
            }
        ],
        messageText: [
            tw('text-base'),
            { color: '#ffffff' }
        ],
        botMessageText: [
            tw('text-base'),
            { color: isDarkMode ? '#ffffff' : '#111827' }
        ],
        voiceIndicator: [
            tw('flex-row items-center mt-2'),
            { opacity: 0.7 }
        ],
        voiceIndicatorText: [
            tw('text-xs ml-1'),
            { color: isDarkMode ? '#d1d5db' : '#6b7280' }
        ],
        voiceControls: [
            tw('flex-1 items-center justify-center py-8')
        ],
        recordButton: [
            tw('items-center justify-center rounded-full'),
            { 
                width: 80, 
                height: 80,
                marginBottom: 20
            }
        ],
        recordButtonActive: {
            backgroundColor: '#ef4444'
        },
        recordButtonInactive: {
            backgroundColor: '#3b82f6'
        },
        recordTime: [
            tw('text-lg font-mono mb-4'),
            { color: isDarkMode ? '#ffffff' : '#111827' }
        ],
        instructionText: [
            tw('text-center text-sm px-4'),
            { color: isDarkMode ? '#9ca3af' : '#6b7280' }
        ],
        processingContainer: [
            tw('items-center justify-center py-4')
        ],
        processingText: [
            tw('text-base mt-2'),
            { color: isDarkMode ? '#60a5fa' : '#3b82f6' }
        ],
        permissionContainer: [
            tw('flex-1 items-center justify-center px-6')
        ],
        permissionTitle: [
            tw('text-xl font-bold text-center mb-4'),
            { color: isDarkMode ? '#ffffff' : '#111827' }
        ],
        permissionText: [
            tw('text-base text-center mb-6'),
            { color: isDarkMode ? '#d1d5db' : '#6b7280' }
        ],
        permissionButton: [
            tw('px-6 py-3 rounded-lg'),
            { backgroundColor: '#3b82f6' }
        ],
        permissionButtonText: [
            tw('text-white font-medium text-center')
        ]
    };

    // Initialize component
    useEffect(() => {
        checkAudioPermission();
        setupAudioRecorderPlayer();
        
        return () => {
            cleanup();
        };
    }, []);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (audioRecorderPlayerRef.current) {
            audioRecorderPlayerRef.current.stopRecorder();
            audioRecorderPlayerRef.current.stopPlayer();
        }
    }, []);

    // Setup audio recorder player
    const setupAudioRecorderPlayer = () => {
        const audioRecorderPlayer = audioRecorderPlayerRef.current;
        
        audioRecorderPlayer.setSubscriptionDuration(0.1); // Update every 100ms
        
        // Recording listeners
        audioRecorderPlayer.addRecordBackListener((e) => {
            const time = audioRecorderPlayer.mmssss(Math.floor(e.currentPosition));
            setRecordTime(time);
        });

        // Playback listeners
        audioRecorderPlayer.addPlayBackListener((e) => {
            const time = audioRecorderPlayer.mmssss(Math.floor(e.currentPosition));
            setPlayTime(time);
            
            if (e.currentPosition === e.duration) {
                setIsPlaying(false);
                setCurrentPlayingMessage(null);
            }
        });
    };

    // Permission handling
    const checkAudioPermission = async () => {
        try {
            const permission = Platform.OS === 'android' 
                ? PERMISSIONS.ANDROID.RECORD_AUDIO 
                : PERMISSIONS.IOS.MICROPHONE;

            const result = await check(permission);
            
            switch (result) {
                case RESULTS.GRANTED:
                    setHasPermission(true);
                    setPermissionStatus('granted');
                    break;
                case RESULTS.DENIED:
                    setPermissionStatus('denied');
                    break;
                case RESULTS.BLOCKED:
                    setPermissionStatus('blocked');
                    break;
                default:
                    setPermissionStatus('unavailable');
            }
        } catch (error) {
            console.error('Permission check failed:', error);
            setPermissionStatus('error');
        }
    };

    const requestAudioPermission = async () => {
        try {
            const permission = Platform.OS === 'android' 
                ? PERMISSIONS.ANDROID.RECORD_AUDIO 
                : PERMISSIONS.IOS.MICROPHONE;

            const result = await request(permission);
            
            if (result === RESULTS.GRANTED) {
                setHasPermission(true);
                setPermissionStatus('granted');
            } else {
                setPermissionStatus('denied');
                Alert.alert(
                    'Permission Required',
                    'Microphone access is required for voice chat. Please enable it in settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            Alert.alert('Error', 'Failed to request microphone permission');
        }
    };

    // Recording functionality
    const startRecording = async () => {
        if (!hasPermission) {
            await requestAudioPermission();
            return;
        }

        try {
            const audioSet = {
                AudioEncoderAndroid: 'aac',
                AudioEncoding: 'aac',
                AudioSampleRate: 16000,
                AudioChannels: 1,
            };

            const result = await audioRecorderPlayerRef.current.startRecorder(
                undefined,
                audioSet
            );

            setIsRecording(true);
            setRecordTime('00:00');
            
            // Start pulsing animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(recordingAnimation, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(recordingAnimation, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

        } catch (error) {
            console.error('Recording start failed:', error);
            Alert.alert('Error', 'Failed to start recording: ' + error.message);
        }
    };

    const stopRecording = async () => {
        try {
            const result = await audioRecorderPlayerRef.current.stopRecorder();
            
            setIsRecording(false);
            recordingAnimation.stopAnimation();
            recordingAnimation.setValue(1);
            
            // Process the recorded audio
            await processVoiceInput(result);

        } catch (error) {
            console.error('Recording stop failed:', error);
            Alert.alert('Error', 'Failed to stop recording: ' + error.message);
        }
    };

    // Voice processing
    const processVoiceInput = async (audioPath) => {
        setIsProcessing(true);
        
        // Start processing animation
        Animated.loop(
            Animated.timing(processingAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ).start();

        try {
            const formData = new FormData();
            formData.append('audio', {
                uri: audioPath,
                type: 'audio/wav',
                name: 'voice_input.wav',
            });

            const response = await fetch(`${apiBaseUrl}/api/voice/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                credentials: 'include',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                // Add user message (transcription)
                const userMessage = {
                    id: Date.now(),
                    role: 'user',
                    content: result.transcription.text,
                    isVoiceInput: true,
                    confidence: result.transcription.confidence,
                    timestamp: new Date(),
                };

                // Add AI response
                const assistantMessage = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: result.response.text,
                    audioUrl: result.response.audio_url,
                    isVoiceResponse: true,
                    filename: result.response.filename,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, userMessage, assistantMessage]);

                // Auto-scroll to bottom
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);

                // Auto-play response
                if (result.response.audio_url) {
                    setTimeout(() => {
                        playAudioResponse(assistantMessage.id, result.response.audio_url);
                    }, 500);
                }

            } else {
                Alert.alert('Error', result.error || 'Voice processing failed');
            }

        } catch (error) {
            console.error('Voice processing error:', error);
            Alert.alert('Error', 'Failed to process voice input: ' + error.message);
        } finally {
            setIsProcessing(false);
            processingAnimation.stopAnimation();
            processingAnimation.setValue(0);
        }
    };

    // Audio playback
    const playAudioResponse = async (messageId, audioUrl) => {
        try {
            if (isPlaying && currentPlayingMessage === messageId) {
                // Stop current playback
                await audioRecorderPlayerRef.current.stopPlayer();
                setIsPlaying(false);
                setCurrentPlayingMessage(null);
            } else {
                // Start playback
                await audioRecorderPlayerRef.current.startPlayer(audioUrl);
                setIsPlaying(true);
                setCurrentPlayingMessage(messageId);
            }
        } catch (error) {
            console.error('Audio playback failed:', error);
            Alert.alert('Error', 'Failed to play audio response');
        }
    };

    // Format time
    const formatTime = (time) => {
        return time || '00:00';
    };

    // Render permission screen
    if (!hasPermission && permissionStatus !== 'checking') {
        return (
            <View style={styles.container}>
                <StatusBar 
                    backgroundColor={isDarkMode ? '#1f2937' : '#ffffff'} 
                    barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
                />
                
                <View style={styles.permissionContainer}>
                    <IonIcon 
                        name="mic-outline" 
                        size={80} 
                        color={isDarkMode ? '#9ca3af' : '#6b7280'} 
                    />
                    
                    <Text style={styles.permissionTitle}>
                        Microphone Access Required
                    </Text>
                    
                    <Text style={styles.permissionText}>
                        ValiNul needs access to your microphone to enable voice chat. 
                        Your audio will be processed securely to provide AI responses.
                    </Text>
                    
                    <TouchableOpacity 
                        style={styles.permissionButton}
                        onPress={requestAudioPermission}
                    >
                        <Text style={styles.permissionButtonText}>
                            Enable Microphone
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Render message item
    const renderMessage = (message) => {
        const isUser = message.role === 'user';
        const isCurrentlyPlaying = isPlaying && currentPlayingMessage === message.id;

        return (
            <View key={message.id} style={styles.messageWrapper}>
                <View style={isUser ? styles.userMessage : styles.botMessage}>
                    <Text style={isUser ? styles.messageText : styles.botMessageText}>
                        {message.content}
                    </Text>
                    
                    {/* Voice indicators */}
                    {message.isVoiceInput && (
                        <View style={styles.voiceIndicator}>
                            <IonIcon name="mic" size={12} color={isDarkMode ? '#d1d5db' : '#6b7280'} />
                            <Text style={styles.voiceIndicatorText}>
                                Voice ({Math.round(message.confidence * 100)}% confidence)
                            </Text>
                        </View>
                    )}
                    
                    {message.isVoiceResponse && message.audioUrl && (
                        <View style={styles.voiceIndicator}>
                            <TouchableOpacity 
                                onPress={() => playAudioResponse(message.id, message.audioUrl)}
                                style={tw('flex-row items-center')}
                            >
                                <IonIcon 
                                    name={isCurrentlyPlaying ? "volume-high" : "play"} 
                                    size={12} 
                                    color="#8b5cf6" 
                                />
                                <Text style={[styles.voiceIndicatorText, { color: '#8b5cf6' }]}>
                                    {isCurrentlyPlaying ? 'Playing...' : 'Tap to play audio'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar 
                backgroundColor={isDarkMode ? '#1f2937' : '#ffffff'} 
                barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
            />
            
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>ValiNul Voice Chat</Text>
                    <Text style={styles.headerSubtitle}>Welcome, {user}</Text>
                </View>
                
                <TouchableOpacity onPress={onLogout}>
                    <IonIcon 
                        name="log-out-outline" 
                        size={24} 
                        color={isDarkMode ? '#ef4444' : '#dc2626'} 
                    />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView 
                ref={scrollViewRef}
                style={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
            >
                {messages.length === 0 ? (
                    <View style={tw('flex-1 items-center justify-center py-20')}>
                        <IonIcon 
                            name="chatbubbles-outline" 
                            size={60} 
                            color={isDarkMode ? '#6b7280' : '#9ca3af'} 
                        />
                        <Text style={[styles.instructionText, tw('mt-4 text-lg')]}>
                            Welcome to Voice Chat!
                        </Text>
                        <Text style={[styles.instructionText, tw('mt-2')]}>
                            Tap the microphone to start a conversation
                        </Text>
                    </View>
                ) : (
                    messages.map(renderMessage)
                )}
            </ScrollView>

            {/* Processing Indicator */}
            {isProcessing && (
                <View style={styles.processingContainer}>
                    <Animated.View
                        style={{
                            transform: [{
                                rotate: processingAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg'],
                                }),
                            }],
                        }}
                    >
                        <IonIcon name="sync" size={24} color="#3b82f6" />
                    </Animated.View>
                    <Text style={styles.processingText}>
                        Processing your voice...
                    </Text>
                </View>
            )}

            {/* Voice Controls */}
            <LinearGradient
                colors={isDarkMode ? ['#1f2937', '#374151'] : ['#f9fafb', '#f3f4f6']}
                style={styles.voiceControls}
            >
                {/* Record Time Display */}
                {(isRecording || recordTime !== '00:00') && (
                    <Text style={styles.recordTime}>
                        {formatTime(recordTime)}
                    </Text>
                )}

                {/* Record Button */}
                <Animated.View
                    style={[
                        { transform: [{ scale: recordingAnimation }] }
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.recordButton,
                            isRecording ? styles.recordButtonActive : styles.recordButtonInactive
                        ]}
                        onPress={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing}
                    >
                        <IonIcon
                            name={isRecording ? "square" : "mic"}
                            size={32}
                            color="white"
                        />
                    </TouchableOpacity>
                </Animated.View>

                {/* Instructions */}
                <Text style={styles.instructionText}>
                    {isRecording 
                        ? "🎤 Recording... Tap to stop and send"
                        : "🎤 Tap to start voice recording"
                    }
                </Text>
            </LinearGradient>
        </View>
    );
};

export default VoiceChat;





