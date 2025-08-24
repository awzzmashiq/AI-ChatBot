import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Settings, FileText, LogOut, Plus, Sparkles } from 'lucide-react';
import ChatMessage from './ChatMessage';
import InputBar from './InputBar';
import Sidebar from './Sidebar';
import Documents from './Documents';
import StorageSettings from './StorageSettings';
import { useTheme } from '../contexts/ThemeContext';
import config from '../config';

function Chat({ user, onLogout }) {
    const [chat, setChat] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState('default');
    const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed for mobile-first
    const [showDocuments, setShowDocuments] = useState(false);
    const [showStorageSettings, setShowStorageSettings] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [funMode, setFunMode] = useState(false);
    
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
                // Ensure all messages have proper content
                const processedMessages = data.messages.map(msg => ({
                    ...msg,
                    content: typeof msg.content === 'string' 
                        ? msg.content 
                        : typeof msg.content === 'object' 
                            ? JSON.stringify(msg.content) 
                            : String(msg.content || '')
                }));
                console.log('[Chat] Processed history messages:', processedMessages);
                setChat(processedMessages);
            }
        } catch (err) {
            console.error('History load error:', err);
        }
    };

    // Load chat history when session changes
    useEffect(() => {
        loadHistory();
    }, [currentSessionId]);

    // Scroll to bottom whenever chat updates
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

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
        
        const userMessage = { role: 'user', content: messageInput };
        
        setChat(prev => [...prev, userMessage]);
        setMessageInput('');
        setIsLoading(true);
        
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    message: messageInput,
                    session_id: currentSessionId,
                    fun_mode: funMode
                })
            });
            
            if (!res.ok) {
                throw new Error('Failed to send message');
            }
            
            const data = await res.json();
            const endTime = Date.now();
            console.log(`[Frontend] Response received in ${endTime - startTime}ms`);
            console.log('[Frontend] Response data:', data);
            
            if (data.messages && data.messages.length > 0) {
                // Ensure all messages have proper content
                const processedMessages = data.messages.map(msg => ({
                    ...msg,
                    content: typeof msg.content === 'string' 
                        ? msg.content 
                        : typeof msg.content === 'object' 
                            ? JSON.stringify(msg.content) 
                            : String(msg.content || '')
                }));
                console.log('[Frontend] Processed messages:', processedMessages);
                setChat(prev => [...prev, ...processedMessages]);
            }
        } catch (err) {
            console.error('Send message error:', err);
            setChat(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, there was an error processing your request.' 
            }]);
        } finally {
            setIsLoading(false);
        }
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

    const toggleRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            window.alert('Could not access microphone');
            return;
        }

        if (recording) {
            mediaRecorderRef.current?.stop();
            setRecording(false);
        } else {
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
        setCurrentSessionId(sessionId);
    };

    const handleNewChat = (newSession) => {
        setCurrentSessionId(newSession.id);
        setChat([]);
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
                                        <ChatMessage key={index} message={message} />
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

                {/* Input Area */}
                <InputBar
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    onSend={handleSend}
                    onFileUpload={handleFileUpload}
                    onVoiceToggle={toggleRecording}
                    isLoading={isLoading}
                    isUploading={isUploading}
                    recording={recording}
                />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showDocuments && (
                    <Documents onClose={() => setShowDocuments(false)} />
                )}
                {showStorageSettings && (
                    <StorageSettings onClose={() => setShowStorageSettings(false)} />
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