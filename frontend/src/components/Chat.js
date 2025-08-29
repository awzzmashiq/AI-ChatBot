import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Settings, FileText, LogOut, Plus, Sparkles, Brain, Headphones, MessageCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import InputBar from './InputBar';
import Sidebar from './Sidebar';
import Documents from './Documents';
import StorageSettings from './StorageSettings';
import ModelSelector from './ModelSelector';
import SimpleVoiceAssistant from './SimpleVoiceAssistant';

import { useTheme } from '../contexts/ThemeContext';
import config from '../config';

function Chat({ user, onLogout }) {
    const [chat, setChat] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(() => {
        // Try to restore last session from localStorage, fallback to 'default'
        const saved = localStorage.getItem(`lastSessionId_${user}`);
        return saved || 'default';
    });
    const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed for mobile-first
    const [showDocuments, setShowDocuments] = useState(false);
    const [showStorageSettings, setShowStorageSettings] = useState(false);
    const [showModelSelector, setShowModelSelector] = useState(false);


    const [currentModel, setCurrentModel] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [funMode, setFunMode] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);
    const [voiceConversationActive, setVoiceConversationActive] = useState(false);
    const [currentVoiceMode, setCurrentVoiceMode] = useState('text'); // 'text' or 'assistant'
    const [newMessageIds, setNewMessageIds] = useState(new Set()); // Track which messages are new
    
    const { isDark, toggleTheme } = useTheme();
    const bottomRef = useRef();
    const fileInputRef = useRef();
    const mediaRecorderRef = useRef();
    const chunksRef = useRef();

    const loadHistory = async () => {
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/history?session_id=${currentSessionId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load history');
            const data = await res.json();
            console.log('[Chat] History loaded:', data);
            if (data.messages) {
                // Ensure all messages have proper content and add IDs if missing
                const processedMessages = data.messages.map((msg, index) => ({
                    ...msg,
                    id: msg.id || `history_${index}_${Date.now()}`, // Add ID for history messages
                    content: typeof msg.content === 'string' 
                        ? msg.content 
                        : typeof msg.content === 'object' 
                            ? JSON.stringify(msg.content) 
                            : String(msg.content || '')
                }));
                console.log('[Chat] Processed history messages:', processedMessages);
                setChat(processedMessages);
                
                // Clear new message IDs when loading history (these are old messages)
                setNewMessageIds(new Set());
            }
        } catch (err) {
            console.error('History load error:', err);
        }
    };

    // Initialize session on component mount
    useEffect(() => {
        const initializeSession = async () => {
            // If currentSessionId is 'default', try to load the most recent session
            if (currentSessionId === 'default') {
                try {
                    const apiBaseUrl = config.getApiBaseUrl();
                    const res = await fetch(`${apiBaseUrl}/api/sessions`, { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        const sessions = data.sessions || [];
                        
                        // If there are existing sessions, load the most recent one
                        if (sessions.length > 0) {
                            const mostRecentSession = sessions[sessions.length - 1]; // Newest is usually last
                            console.log('[Chat] Loading most recent session:', mostRecentSession.id);
                            setCurrentSessionId(mostRecentSession.id);
                            localStorage.setItem(`lastSessionId_${user}`, mostRecentSession.id);
                            return; // Don't load history twice
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch sessions for initialization:', err);
                }
            }
            
            // Load history for current session
            loadHistory();
        };
        
        initializeSession();
    }, []); // Only run on mount

    // Load chat history when session changes (but not on initial mount)
    useEffect(() => {
        if (currentSessionId !== 'default') {
            loadHistory();
        }
    }, [currentSessionId]);

    // Scroll to bottom whenever chat updates
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    // Set up global functions for session management
    useEffect(() => {
        // Make refreshSessions available globally for session naming
        window.refreshSessions = () => {
            // This will be called by the sidebar to refresh sessions
            console.log('[Chat] Global refreshSessions called');
        };
        
        // Also make a function to trigger sidebar refresh
        window.triggerSidebarRefresh = () => {
            console.log('[Chat] Triggering sidebar refresh');
            // Dispatch a custom event that the sidebar can listen to
            window.dispatchEvent(new CustomEvent('sessionRenamed'));
        };
        
        // Function to remove messages from new messages set after typing effect
        window.removeFromNewMessages = (messageId) => {
            setNewMessageIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(messageId);
                return newSet;
            });
        };
        
        return () => {
            delete window.refreshSessions;
            delete window.triggerSidebarRefresh;
            delete window.removeFromNewMessages;
        };
    }, []);

    // Close sidebar on large screens by default
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSend = async () => {
        if (!messageInput.trim() || isLoading) return;
        
        const startTime = Date.now();
        console.log('[Frontend] Starting chat request at:', new Date().toISOString());
        
        const userMessage = { 
            role: 'user', 
            content: messageInput,
            id: Date.now().toString() // Add unique ID
        };
        
        setChat(prev => [...prev, userMessage]);
        const currentMessage = messageInput; // Store the message before clearing
        setMessageInput('');
        setIsLoading(true);
        
        // If this is the first message and we're using the default session, create a new session
        let sessionToUse = currentSessionId;
        if (chat.length === 0 && currentSessionId === 'default') {
            try {
                console.log('[Chat] Creating new session for first message');
                const apiBaseUrl = config.getApiBaseUrl();
                const res = await fetch(`${apiBaseUrl}/api/sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.session) {
                        sessionToUse = data.session.id;
                        setCurrentSessionId(sessionToUse);
                        localStorage.setItem(`lastSessionId_${user}`, sessionToUse);
                        // Set access time for new session
                        const now = new Date().toISOString();
                        localStorage.setItem(`sessionLastAccess_${sessionToUse}`, now);
                        console.log('[Chat] New session created:', sessionToUse);
                        
                        // Trigger sidebar refresh to show the new session
                        if (window.triggerSidebarRefresh) {
                            window.triggerSidebarRefresh();
                        }
                    }
                } else {
                    console.error('[Chat] Failed to create new session');
                }
            } catch (err) {
                console.error('[Chat] Error creating new session:', err);
            }
        }
        
        // Auto-name the session if this is the first message and it doesn't already have a meaningful name
        console.log('[Chat] Session naming check:', { 
            chatLength: chat.length, 
            currentSessionId: sessionToUse, 
            messageInput: currentMessage.substring(0, 50) + '...' 
        });
        
        if (chat.length === 0 && sessionToUse && sessionToUse !== 'default') {
            const autoName = generateSessionName(currentMessage);
            console.log('[Chat] Attempting to auto-name session:', { 
                sessionToUse, 
                currentMessage, 
                autoName, 
                chatLength: chat.length 
            });
            
            // Only update if the generated name is different from "New Chat"
            if (autoName !== 'New Chat') {
                // Update session name asynchronously
                setTimeout(async () => {
                    try {
                        const apiBaseUrl = config.getApiBaseUrl();
                        console.log('[Chat] Renaming session', sessionToUse, 'to:', autoName);
                        
                        const res = await fetch(`${apiBaseUrl}/api/sessions/${sessionToUse}/rename`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ name: autoName })
                        });
                        
                        if (res.ok) {
                            console.log('[Chat] Session renamed successfully to:', autoName);
                            // Trigger a refresh of the sidebar sessions
                            if (window.triggerSidebarRefresh) {
                                window.triggerSidebarRefresh();
                            }
                        } else {
                            const errorData = await res.json().catch(() => ({}));
                            console.error('[Chat] Failed to rename session:', res.status, errorData);
                        }
                    } catch (err) {
                        console.error('Failed to rename session:', err);
                    }
                }, 1000); // Small delay to ensure message is processed
            }
        } else {
            console.log('[Chat] Session naming condition NOT met:', { 
                chatLength: chat.length, 
                sessionToUse, 
                isDefault: sessionToUse === 'default',
                hasSessionId: !!sessionToUse
            });
        }
        
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: currentMessage,
                    session_id: sessionToUse,
                    model: currentModel?.id || 'default'
                })
            });
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            console.log('[Frontend] Chat response received at:', new Date().toISOString());
            console.log('[Frontend] Response time:', Date.now() - startTime, 'ms');
            console.log('[Frontend] Response data:', data);
            
            if (data.messages && data.messages.length > 0) {
                const assistantMessage = data.messages[0];
                
                // Check if this is an image generation response
                if (assistantMessage.image_data) {
                    console.log('[Frontend] Image generation successful, adding image message');
                    const messageId = Date.now().toString();
                    setChat(prev => [...prev, {
                        ...assistantMessage,
                        timestamp: new Date().toISOString(),
                        id: messageId
                    }]);
                } else if (data.is_processing && data.request_id) {
                    console.log('[Frontend] Image is processing, starting polling for:', data.request_id);
                    // Image is being processed, add processing message and start polling
                    const messageId = Date.now().toString();
                    const processingMessage = {
                        ...assistantMessage,
                        timestamp: new Date().toISOString(),
                        id: messageId
                    };
                    
                    setChat(prev => [...prev, processingMessage]);
                    
                    // Start polling for image status
                    pollImageStatus(data.request_id, processingMessage);
                } else {
                    console.log('[Frontend] Regular text response, adding message');
                    // Regular text response - add with typing effect
                    const messageId = Date.now().toString();
                    const messageWithTyping = {
                        ...assistantMessage,
                        timestamp: new Date().toISOString(),
                        id: messageId
                    };
                    
                    setChat(prev => [...prev, messageWithTyping]);
                    
                    // Mark this message as new for typing effect
                    setNewMessageIds(prev => new Set([...prev, messageId]));
                }
            } else if (data.response) {
                // Fallback for old response format
                const messageId = Date.now().toString();
                const assistantMessage = { 
                    role: 'assistant', 
                    content: data.response,
                    timestamp: new Date(),
                    id: messageId
                };
                
                setChat(prev => [...prev, assistantMessage]);
                
                // Mark this message as new for typing effect
                setNewMessageIds(prev => new Set([...prev, messageId]));
            } else {
                throw new Error('No response content received from server');
            }
            
            // Update session access time after successful message exchange
            const now = new Date().toISOString();
            localStorage.setItem(`sessionLastAccess_${sessionToUse}`, now);
        } catch (err) {
            console.error('Chat error:', err);
            const messageId = Date.now().toString();
            const errorMessage = { 
                role: 'assistant', 
                content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
                timestamp: new Date(),
                isError: true,
                id: messageId
            };
            
            setChat(prev => [...prev, errorMessage]);
            
            // Mark this message as new for typing effect
            setNewMessageIds(prev => new Set([...prev, messageId]));
        } finally {
            setIsLoading(false);
        }
    };

    // Function to generate automatic session names based on message content
    const generateSessionName = (message) => {
        if (!message || typeof message !== 'string') {
            return 'New Chat';
        }
        
        const trimmedMessage = message.trim();
        
        // If message is empty or very short, use default name
        if (trimmedMessage.length === 0) {
            return 'New Chat';
        }
        
        // Handle common technical topics with better names
        const lowerMessage = trimmedMessage.toLowerCase();
        
        // Blockchain and crypto topics
        if (lowerMessage.includes('blockchain')) {
            return 'Blockchain Discussion';
        }
        if (lowerMessage.includes('cryptocurrency') || lowerMessage.includes('crypto')) {
            return 'Cryptocurrency Chat';
        }
        if (lowerMessage.includes('bitcoin') || lowerMessage.includes('ethereum')) {
            return 'Crypto Discussion';
        }
        
        // AI and tech topics
        if (lowerMessage.includes('artificial intelligence') || lowerMessage.includes('ai')) {
            return 'AI Discussion';
        }
        if (lowerMessage.includes('machine learning') || lowerMessage.includes('ml')) {
            return 'Machine Learning Chat';
        }
        if (lowerMessage.includes('programming') || lowerMessage.includes('coding')) {
            return 'Programming Discussion';
        }
        
        // If message is very short, use it directly
        if (trimmedMessage.length <= 30) {
            return trimmedMessage;
        }
        
        // Extract first sentence or first 30 characters
        const firstSentence = trimmedMessage.split(/[.!?]/)[0];
        if (firstSentence && firstSentence.length <= 30 && firstSentence.length > 0) {
            return firstSentence;
        }
        
        // If still too long, truncate to 30 characters and add ellipsis
        return trimmedMessage.substring(0, 27) + '...';
    };

    const pollImageStatus = async (requestId, processingMessage) => {
        const maxAttempts = 30; // Poll for up to 3 minutes (6s intervals)
        let attempts = 0;
        
        const poll = async () => {
            try {
                attempts++;
                console.log(`[Frontend] Polling image status, attempt ${attempts}/${maxAttempts}`);
                
                const apiBaseUrl = config.getApiBaseUrl();
                const res = await fetch(`${apiBaseUrl}/api/models/check-image-status/${requestId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (!res.ok) {
                    throw new Error('Failed to check image status');
                }
                
                const data = await res.json();
                console.log('[Frontend] Image status:', data);
                
                if (data.success && data.status === 'completed' && data.image_data) {
                    // Image is ready! Update the processing message with the actual image
                    console.log('[Frontend] Image ready, updating message');
                    setChat(prev => prev.map(msg => 
                        msg === processingMessage ? {
                            ...msg,
                            content: `I've generated an image based on your request: '${msg.image_prompt}'`,
                            image_data: data.image_data,
                            is_generating: false
                        } : msg
                    ));
                    return; // Stop polling
                } else if (data.success && (data.status === 'processing' || data.status === 'assigned' || data.status === 'created' || data.status === 'queued')) {
                    // Still processing, continue polling
                    console.log(`[Frontend] Image still processing, status: ${data.status}`);
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 6000); // Poll every 6 seconds
                    } else {
                        // Max attempts reached
                        console.log('[Frontend] Max polling attempts reached');
                        setChat(prev => prev.map(msg => 
                            msg === processingMessage ? {
                                ...msg,
                                content: "Image generation is taking longer than expected. Please try again later.",
                                is_generating: false
                            } : msg
                        ));
                    }
                } else if (data.success && data.status === 'failed') {
                    // Failed
                    console.log('[Frontend] Image generation failed');
                    setChat(prev => prev.map(msg => 
                        msg === processingMessage ? {
                            ...msg,
                            content: `Image generation failed. Error: ${data.error || 'Unknown error'}`,
                            is_generating: false
                        } : msg
                    ));
                } else if (data.success && data.status === 'completed' && !data.image_data) {
                    // Completed but no image data
                    console.log('[Frontend] Image completed but no data found');
                    setChat(prev => prev.map(msg => 
                        msg === processingMessage ? {
                            ...msg,
                            content: `Image generation completed but no image was found. Please try again.`,
                            is_generating: false
                        } : msg
                    ));
                } else {
                    // Other status or error
                    console.log(`[Frontend] Unexpected status: ${data.status}, error: ${data.error}`);
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 6000); // Continue polling for unexpected states
                    } else {
                        setChat(prev => prev.map(msg => 
                            msg === processingMessage ? {
                                ...msg,
                                content: `Image generation status unclear. Please try again.`,
                                is_generating: false
                            } : msg
                        ));
                    }
                }
            } catch (error) {
                console.error('[Frontend] Image status poll error:', error);
                if (attempts < maxAttempts) {
                    setTimeout(poll, 6000); // Retry on error
                } else {
                    console.log('[Frontend] Max polling attempts reached after error');
                    setChat(prev => prev.map(msg => 
                        msg === processingMessage ? {
                            ...msg,
                            content: "Failed to check image generation status. Please try again.",
                            is_generating: false
                        } : msg
                    ));
                }
            }
        };
        
        // Start polling after 6 seconds
        setTimeout(poll, 6000);
    };

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);
        
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/upload?session_id=${currentSessionId}`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!res.ok) {
                throw new Error('Upload failed');
            }
            const data = await res.json();
            if (data.messages) {
                // Add the processing messages to chat
                setChat(prev => [...prev, ...data.messages]);
                
                // Start polling for processing updates
                pollForProcessingUpdates();
            }
        } catch (err) {
            console.error('Upload error:', err);
            setChat(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, there was an error uploading your file.' 
            }]);
        } finally {
            setIsUploading(false);
        }
    };

    const pollForProcessingUpdates = () => {
        let pollCount = 0;
        const maxPolls = 60; // Poll for up to 5 minutes (60 * 5 seconds)
        
        const poll = async () => {
            try {
                console.log(`[Frontend] Polling for upload status in session: ${currentSessionId}`);
                const apiBaseUrl = config.getApiBaseUrl();
                const res = await fetch(`${apiBaseUrl}/api/upload/status?session_id=${currentSessionId}`, {
                    credentials: 'include'
                });
                if (!res.ok) {
                    console.log('[Frontend] Status endpoint not available yet');
                    return;
                }
                
                const data = await res.json();
                console.log(`[Frontend] Status response for session ${currentSessionId}:`, data);
                
                if (data.status === 'completed') {
                    console.log(`[Frontend] Processing completed in session ${currentSessionId}, reloading chat`);
                    // Reload the chat to get the updated messages
                    loadHistory();
                    return;
                } else if (data.status === 'failed') {
                    console.log(`[Frontend] Processing failed in session ${currentSessionId}, reloading chat`);
                    // Reload the chat to get the error message
                    loadHistory();
                    return;
                } else if (data.status === 'processing') {
                    console.log(`[Frontend] Still processing in session ${currentSessionId}...`);
                }
                
                // Continue polling if not complete
                pollCount++;
                if (pollCount < maxPolls) {
                    setTimeout(poll, 3000); // Poll every 3 seconds
                } else {
                    console.log(`[Frontend] Polling timeout for session ${currentSessionId}, reloading chat`);
                    loadHistory(); // Final reload to get any updates
                }
            } catch (err) {
                console.error(`[Frontend] Polling error for session ${currentSessionId}:`, err);
                // On error, try to reload chat after a delay
                setTimeout(() => loadHistory(), 5000);
            }
        };
        
        // Start polling after 2 seconds
        setTimeout(poll, 2000);
    };

    const toggleRecording = async (mode = 'text') => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            window.alert('Could not access microphone');
            return;
        }

        if (recording) {
            mediaRecorderRef.current?.stop();
            setRecording(false);
            return;
        }

        // Handle different voice modes
        if (mode === 'assistant') {
            // Voice-to-voice mode - activate the voice assistant
            setVoiceMode(true);
            setVoiceConversationActive(true);
            setCurrentVoiceMode('assistant');
            console.log('Activating voice conversation mode');
            return;
        }

        // Voice-to-text mode - use the existing recording logic
        setCurrentVoiceMode('text');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'recording.wav');
                
                try {
                    const apiBaseUrl = config.getApiBaseUrl();
                    const res = await fetch(`${apiBaseUrl}/api/audio?session_id=${currentSessionId}`, {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });
                    
                    if (!res.ok) throw new Error('Audio processing failed');
                    
                    const data = await res.json();
                    if (data.messages && data.messages.length > 0) {
                        // Add the messages to the chat
                        setChat(prev => [...prev, ...data.messages]);
                        
                        // Auto-name the session if this is the first message and it doesn't already have a meaningful name
                        if (chat.length === 0 && currentSessionId !== 'default') {
                            // Extract the user message content for naming
                            const userMessage = data.messages.find(msg => msg.role === 'user');
                            if (userMessage && userMessage.content) {
                                const autoName = generateSessionName(userMessage.content);
                                // Only update if the generated name is different from "New Chat"
                                if (autoName !== 'New Chat') {
                                    // Update session name asynchronously
                                    setTimeout(() => {
                                        if (window.updateSessionName) {
                                            window.updateSessionName(currentSessionId, autoName);
                                        }
                                    }, 1000); // Small delay to ensure message is processed
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Audio processing error:', err);
                    window.alert('Could not process audio');
                }
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (err) {
            console.error('Recording error:', err);
            window.alert('Could not start recording');
        }
    };

    const handleModelChange = (newModel) => {
        setCurrentModel(newModel);
        console.log('[Chat] Model changed to:', newModel);
    };

    // Voice-to-Voice functionality

    const handleVoiceTranscription = (transcription, language, confidence) => {
        console.log('Voice transcription received:', { transcription, language, confidence });
        
        // Add user message to chat
        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: transcription,
            timestamp: new Date(),
            isVoiceInput: true,
            confidence: confidence,
            language: language
        };

        setChat(prev => [...prev, userMsg]);
        
        // Auto-name the session if this is the first message and it doesn't already have a meaningful name
        if (chat.length === 0 && currentSessionId !== 'default') {
            const autoName = generateSessionName(transcription);
            // Only update if the generated name is different from "New Chat"
            if (autoName !== 'New Chat') {
                // Update session name asynchronously
                setTimeout(async () => {
                    try {
                        const apiBaseUrl = config.getApiBaseUrl();
                        const res = await fetch(`${apiBaseUrl}/api/sessions/${currentSessionId}/rename`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ name: autoName })
                        });
                        
                        if (res.ok) {
                            console.log('[Chat] Session renamed to:', autoName);
                            // Trigger a refresh of the sidebar sessions
                            if (window.triggerSidebarRefresh) {
                                window.triggerSidebarRefresh();
                            }
                        }
                    } catch (err) {
                        console.error('Failed to rename session:', err);
                    }
                }, 1000); // Small delay to ensure message is processed
            }
        }
    };

    const handleVoiceResponse = (responseText, audioUrl) => {
        // Add AI response to chat with audio
        const aiMsg = {
            id: Date.now() + 1,
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
            isVoiceOutput: true,
            audioUrl: audioUrl
        };

        setChat(prev => [...prev, aiMsg]);
    };

    const handleVoiceError = (error) => {
        console.error('Voice error:', error);
        setChat(prev => [...prev, {
            role: 'assistant',
            content: `Voice error: ${error}`,
            timestamp: new Date(),
            isError: true
        }]);
    };

    const playVoiceResponse = (audioUrl) => {
        try {
            const audio = new Audio(audioUrl);
            audio.play().catch(error => {
                console.error('Audio playback failed:', error);
            });
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    };

    const toggleVoiceMode = () => {
        setVoiceMode(!voiceMode);
        setVoiceConversationActive(!voiceMode);
        
        if (!voiceMode) {
            // Entering voice mode - show full voice assistant interface
            console.log('Activating voice conversation mode');
        } else {
            // Exiting voice mode
            console.log('Deactivating voice conversation mode');
        }
    };

    const handleLogout = async () => {
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            await fetch(`${apiBaseUrl}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout error:', err);
        }
        onLogout();
    };

    const handleSessionChange = (sessionId) => {
        console.log('[Chat] Session changed to:', sessionId);
        setCurrentSessionId(sessionId);
        // Save current session to localStorage for persistence across refreshes
        localStorage.setItem(`lastSessionId_${user}`, sessionId);
        // Update session access time to keep it at the top
        const now = new Date().toISOString();
        localStorage.setItem(`sessionLastAccess_${sessionId}`, now);
    };

    const handleNewChat = (newSession) => {
        console.log('[Chat] Creating new chat with session:', newSession);
        setCurrentSessionId(newSession.id);
        setChat([]);
        // Save new session to localStorage
        localStorage.setItem(`lastSessionId_${user}`, newSession.id);
        // Set access time for new session to keep it at the top
        const now = new Date().toISOString();
        localStorage.setItem(`sessionLastAccess_${newSession.id}`, now);
        console.log('[Chat] New chat created - Session ID:', newSession.id, 'Chat length:', 0);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex h-screen bg-white dark:bg-black">
            {/* Sidebar Overlay for Mobile */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                            className="fixed left-0 top-0 bottom-0 w-80 z-50 lg:relative lg:z-auto"
                        >
                            <Sidebar
                                user={user}
                                currentSessionId={currentSessionId}
                                onSessionChange={handleSessionChange}
                                onNewChat={handleNewChat}
                                onClose={() => setSidebarOpen(false)}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleSidebar}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                aria-label="Toggle sidebar"
                            >
                                <Menu className="w-5 h-5" />
                            </motion.button>
                            
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">ValiNul</h1>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Voice Mode Toggle */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleVoiceMode}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                                    voiceMode
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                                title="Toggle voice-to-voice mode"
                            >
                                {voiceMode ? (
                                    <>
                                        <Headphones className="w-3 h-3" />
                                        Voice Mode
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-3 h-3" />
                                        Text Mode
                                    </>
                                )}
                            </motion.button>

                            {/* Fun Mode Toggle */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFunMode(!funMode)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                                    funMode
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                                title="Toggle fun mode for witty responses"
                            >
                                {funMode ? '🎭 Fun Mode' : '📖 Regular Mode'}
                            </motion.button>

                            {/* Theme Toggle */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleTheme}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Toggle theme"
                            >
                                {isDark ? '☀️' : '🌙'}
                            </motion.button>

                            {/* Documents */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowDocuments(true)}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="View documents"
                            >
                                <FileText className="w-5 h-5" />
                            </motion.button>

                            {/* Model Selector */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowModelSelector(true)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="AI Model Selection"
                            >
                                <Brain className="w-5 h-5" />
                            </motion.button>

                            {/* Current Model Indicator */}
                            <div className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                                {currentModel ? (
                                    <span className="flex items-center gap-1">
                                        {currentModel.type === 'theta_image' ? '🎨' : '🤖'} {currentModel.display_name || 'Model'}
                                    </span>
                                ) : (
                                    'Loading...'
                                )}
                            </div>

                            {/* Storage Settings */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowStorageSettings(true)}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Storage settings"
                            >
                                <Settings className="w-5 h-5" />
                            </motion.button>

                            {/* Logout */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleLogout}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
                    <div className="max-w-4xl mx-auto px-4 py-6">
                        <AnimatePresence>
                            {chat.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-20"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        Welcome to ValiNul
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                        Your AI assistant ready to help with anything. Start a conversation or upload a document to get started.
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors shadow-lg hover:shadow-xl"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Upload Document
                                    </motion.button>
                                </motion.div>
                            ) : (
                                <>
                                    {chat.map((message, index) => (
                                        <ChatMessage 
                                            key={message.id || index} 
                                            message={message} 
                                            isNewMessage={newMessageIds.has(message.id)}
                                        />
                                    ))}
                                    
                                    {isLoading && (
                                        <ChatMessage 
                                            message={{ role: 'assistant', content: '' }} 
                                            isTyping={true}
                                        />
                                    )}
                                </>
                            )}
                        </AnimatePresence>
                        
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Image Mode Hint */}
                {currentModel?.type === 'theta_image' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-4 py-2 text-center"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                            🎨 <span>Image Generation Mode Active</span>
                        </div>
                    </motion.div>
                )}



                {/* Voice Assistant Overlay */}
                <AnimatePresence>
                    {voiceMode && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full mx-4"
                            >
                                {/* Voice Assistant Header */}
                                <div className="border-b border-gray-200 dark:border-gray-700 p-6 text-center">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <Headphones className="w-4 h-4 text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            Voice Assistant
                                        </h2>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Speak naturally like you're talking to Siri or Alexa
                                    </p>
                                </div>

                                {/* Voice Assistant Component */}
                                <SimpleVoiceAssistant
                                    onTranscriptionReceived={handleVoiceTranscription}
                                    onVoiceResponse={handleVoiceResponse}
                                    onError={handleVoiceError}
                                    isActive={voiceConversationActive}
                                    onToggleActive={() => setVoiceConversationActive(!voiceConversationActive)}
                                    sessionId={currentSessionId}
                                />

                                {/* Close Button */}
                                <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-center">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={toggleVoiceMode}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Exit Voice Mode
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Area (hidden in voice mode) */}
                {!voiceMode && (
                    <InputBar
                        messageInput={messageInput}
                        setMessageInput={setMessageInput}
                        onSend={handleSend}
                        onFileUpload={handleFileUpload}
                        onVoiceToggle={toggleRecording}
                        isLoading={isLoading}
                        isUploading={isUploading}
                        recording={recording}
                        currentModel={currentModel}
                        currentVoiceMode={currentVoiceMode}
                    />
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showDocuments && (
                    <Documents onClose={() => setShowDocuments(false)} />
                )}
                {showStorageSettings && (
                    <StorageSettings onClose={() => setShowStorageSettings(false)} />
                )}
                {showModelSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModelSelector(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <ModelSelector 
                                onModelChange={handleModelChange}
                                currentModel={currentModel}
                                onClose={() => setShowModelSelector(false)}
                            />
                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Hidden file input for upload from welcome screen */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        handleFileUpload(file);
                    }
                    e.target.value = '';
                }}
                className="hidden"
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
            />
        </div>
    );
}

export default Chat;