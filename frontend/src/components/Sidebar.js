import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    MessageSquare, 
    Edit3, 
    Trash2, 
    X, 
    Check, 
    User,
    Calendar,
    Clock,
    Sparkles
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import config from '../config';

function Sidebar({ user, currentSessionId, onSessionChange, onNewChat, onClose }) {
    const [sessions, setSessions] = useState([]);
    const [editingSession, setEditingSession] = useState(null);
    const [newSessionName, setNewSessionName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/sessions`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch sessions');
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (err) {
            console.error('Fetch sessions error:', err);
        }
    };

    const handleNewChat = async () => {
        setIsCreating(true);
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: 'New Chat' })
            });
            
            if (!res.ok) throw new Error('Failed to create session');
            
            const data = await res.json();
            if (data.session) {
                onNewChat(data.session);
                fetchSessions();
            }
        } catch (err) {
            console.error('Create session error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleRenameSession = async (sessionId, newName) => {
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/sessions/${sessionId}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newName })
            });
            
            if (!res.ok) throw new Error('Failed to rename session');
            
            const data = await res.json();
            if (data.success) {
                fetchSessions();
                setEditingSession(null);
            }
        } catch (err) {
            console.error('Rename session error:', err);
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm('Are you sure you want to delete this chat session?')) return;
        
        try {
            const apiBaseUrl = config.getApiBaseUrl();
            const res = await fetch(`${apiBaseUrl}/api/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!res.ok) throw new Error('Failed to delete session');
            
            const data = await res.json();
            if (data.success) {
                fetchSessions();
                if (currentSessionId === sessionId) {
                    onSessionChange('default');
                }
            }
        } catch (err) {
            console.error('Delete session error:', err);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">Grok Chat</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">History</p>
                        </div>
                    </div>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
                    >
                        <X className="w-5 h-5" />
                    </motion.button>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Active session
                        </p>
                    </div>
                </div>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNewChat}
                    disabled={isCreating}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    {isCreating ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <Plus className="w-4 h-4" />
                        </motion.div>
                    ) : (
                        <Plus className="w-4 h-4" />
                    )}
                    New Chat
                </motion.button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                    <AnimatePresence>
                        {sessions.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-8"
                            >
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    No conversations yet
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Start a new chat to begin
                                </p>
                            </motion.div>
                        ) : (
                            sessions.map((session, index) => (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                        currentSessionId === session.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                    onClick={() => onSessionChange(session.id)}
                                >
                                    {editingSession === session.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newSessionName}
                                                onChange={(e) => setNewSessionName(e.target.value)}
                                                onBlur={() => {
                                                    if (newSessionName.trim()) {
                                                        handleRenameSession(session.id, newSessionName.trim());
                                                    } else {
                                                        setEditingSession(null);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (newSessionName.trim()) {
                                                            handleRenameSession(session.id, newSessionName.trim());
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        setEditingSession(null);
                                                    }
                                                }}
                                                className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (newSessionName.trim()) {
                                                        handleRenameSession(session.id, newSessionName.trim());
                                                    }
                                                }}
                                                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                                            >
                                                <Check className="w-3 h-3" />
                                            </motion.button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`text-sm font-medium truncate ${
                                                        currentSessionId === session.id
                                                            ? 'text-blue-900 dark:text-blue-100'
                                                            : 'text-gray-900 dark:text-white'
                                                    }`}>
                                                        {session.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatDate(session.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSession(session.id);
                                                            setNewSessionName(session.name);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="Rename"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSession(session.id);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </motion.button>
                                                </div>
                                            </div>
                                            
                                            {currentSessionId === session.id && (
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-blue-500 rounded-r-full"
                                                />
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

export default Sidebar;