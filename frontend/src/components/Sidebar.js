import React, { useState, useEffect } from 'react';
import './Sidebar.css';

function Sidebar({ user, currentSessionId, onSessionChange, onNewChat, onClose }) {
    const [sessions, setSessions] = useState([]);
    const [editingSession, setEditingSession] = useState(null);
    const [newSessionName, setNewSessionName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/sessions', { credentials: 'include' });
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
            const res = await fetch('http://localhost:5000/api/sessions', {
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
            const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}/rename`, {
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
            const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}`, {
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
        <div className="sidebar-container">
            {/* Header */}
            <div className="sidebar-header">
                <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <div className="user-details">
                        <h3>Chat Sessions</h3>
                        <p>{user}</p>
                    </div>
                </div>
                <button onClick={onClose} className="close-button">
                    ✕
                </button>
            </div>

            {/* New Chat Button */}
            <div className="new-chat-section">
                <button 
                    onClick={handleNewChat} 
                    disabled={isCreating}
                    className="new-chat-button"
                >
                    {isCreating ? '⏳' : '➕'} New Chat
                </button>
            </div>

            {/* Sessions List */}
            <div className="sessions-list">
                {sessions.length === 0 ? (
                    <div className="empty-sessions">
                        <div className="empty-icon">💬</div>
                        <p>No chat sessions yet</p>
                        <span>Create your first chat to get started</span>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div 
                            key={session.id} 
                            className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                            onClick={() => onSessionChange(session.id)}
                        >
                            <div className="session-content">
                                {editingSession === session.id ? (
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
                                        className="session-edit-input"
                                        autoFocus
                                    />
                                ) : (
                                    <>
                                        <div className="session-info">
                                            <span className="session-name">{session.name}</span>
                                            <span className="session-date">{formatDate(session.created_at)}</span>
                                        </div>
                                        <div className="session-actions">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSession(session.id);
                                                    setNewSessionName(session.name);
                                                }}
                                                className="action-button"
                                                title="Rename"
                                            >
                                                ✏️
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSession(session.id);
                                                }}
                                                className="action-button delete"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Sidebar; 