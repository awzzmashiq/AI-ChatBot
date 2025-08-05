import React from 'react';

function ChatMessage({ message }) {
    const isUser = message.role === 'user';
    
    // Safety check: ensure content is a string
    const messageContent = typeof message.content === 'string' 
        ? message.content 
        : typeof message.content === 'object' 
            ? JSON.stringify(message.content) 
            : String(message.content || '');

    return (
        <div className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
            <div className="message-content">
                {messageContent}
            </div>
        </div>
    );
}

export default ChatMessage;
