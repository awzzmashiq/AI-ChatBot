import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import Sidebar from './Sidebar';
import Documents from './Documents';
import StorageSettings from './StorageSettings';
import './Chat.css';

function Chat({ user, onLogout }) {
    const [chat, setChat] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState('default');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showDocuments, setShowDocuments] = useState(false);
    const [showStorageSettings, setShowStorageSettings] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    
    const bottomRef = useRef();
    const fileInputRef = useRef();
    const mediaRecorderRef = useRef();
    const chunksRef = useRef();

    const loadHistory = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/history?session_id=${currentSessionId}`, { credentials: 'include' });
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

    const handleSend = async () => {
        if (!messageInput.trim() || isLoading) return;
        
        const startTime = Date.now();
        console.log('[Frontend] Starting chat request at:', new Date().toISOString());
        
        const userMessage = { role: 'user', content: messageInput };
        
        setChat(prev => [...prev, userMessage]);
        setMessageInput('');
        setIsLoading(true);
        
        try {
            const res = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    message: messageInput,
                    session_id: currentSessionId
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
            const res = await fetch('http://localhost:5000/api/upload', {
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
                const res = await fetch('http://localhost:5000/api/upload/status', {
                    credentials: 'include'
                });
                if (!res.ok) return;
                
                const data = await res.json();
                if (data.success && data.messages && data.messages.length > 0) {
                    const lastMessage = data.messages[data.messages.length - 1];
                    
                    // Check if processing is complete (success or error message)
                    if (lastMessage.role === 'assistant' && 
                        (lastMessage.content.includes('✅') || lastMessage.content.includes('❌'))) {
                        // Processing is complete, update the chat directly
                        setChat(prev => {
                            // Find and replace the processing message with the completion message
                            const updatedChat = [...prev];
                            for (let i = updatedChat.length - 1; i >= 0; i--) {
                                if (updatedChat[i].role === 'assistant' && 
                                    updatedChat[i].content.includes('Processing your file')) {
                                    updatedChat[i] = lastMessage;
                                    break;
                                }
                            }
                            return updatedChat;
                        });
                        return;
                    }
                }
                
                // Continue polling if not complete
                pollCount++;
                if (pollCount < maxPolls) {
                    setTimeout(poll, 5000); // Poll every 5 seconds
                }
            } catch (err) {
                console.error('Polling error:', err);
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
                        const res = await fetch('http://localhost:5000/api/audio', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                        });
                        
                        if (!res.ok) throw new Error('Audio processing failed');
                        
                        const data = await res.json();
                        if (data.question) {
                            setMessageInput(data.question);
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
            await fetch('http://localhost:5000/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout error:', err);
        }
        onLogout();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
        e.target.value = '';
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
        <div className="chat-container">
            {/* Sidebar */}
            {sidebarOpen && (
                <div className="sidebar">
                    <Sidebar
                        user={user}
                        currentSessionId={currentSessionId}
                        onSessionChange={handleSessionChange}
                        onNewChat={handleNewChat}
                        onClose={() => setSidebarOpen(false)}
                    />
                </div>
            )}

            {/* Main Chat Area */}
            <div className="main-chat">
                {/* Header */}
                <div className="chat-header">
                    <div className="header-left">
                        <button onClick={toggleSidebar} className="menu-button">
                            ☰
                        </button>
                        <h1>Doc Smart</h1>
                        <span>Logged in as {user}</span>
                    </div>
                    <div className="header-right">
                        <button onClick={() => setShowDocuments(true)} className="header-button">
                            Documents
                        </button>
                        <button onClick={() => setShowStorageSettings(true)} className="header-button">
                            Storage
                        </button>
                        <button onClick={handleLogout} className="header-button logout">
                            Logout
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="messages-container">
                    <div className="messages">
                        {chat.length === 0 ? (
                            <div className="welcome-message">
                                <h3>Welcome to Doc Smart!</h3>
                                <p>Start a conversation or upload a document to get help with your studies.</p>
                                <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
                                    Upload Document
                                </button>
                            </div>
                        ) : (
                            chat.map((message, index) => (
                                <ChatMessage key={index} message={message} />
                            ))
                        )}
                        
                        {isLoading && (
                            <div className="loading-message">
                                <div className="loading-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="input-area">
                    <div className="input-container">
                        <textarea
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            className="message-input"
                            rows="1"
                        />
                        
                        <div className="input-buttons">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
                            />
                            
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="input-button"
                                title="Upload File"
                            >
                                {isUploading ? '⏳' : '📎'}
                            </button>
                            
                            <button
                                onClick={toggleRecording}
                                className={`input-button ${recording ? 'recording' : ''}`}
                                title={recording ? 'Stop Recording' : 'Voice Input'}
                            >
                                {recording ? '⏹️' : '🎤'}
                            </button>
                            
                            <button
                                onClick={handleSend}
                                disabled={!messageInput.trim() || isLoading}
                                className="send-button"
                                title="Send Message"
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showDocuments && (
                <Documents onClose={() => setShowDocuments(false)} />
            )}
            {showStorageSettings && (
                <StorageSettings onClose={() => setShowStorageSettings(false)} />
            )}
        </div>
    );
}

export default Chat;
