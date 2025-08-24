import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, CheckCheck } from 'lucide-react';

function ChatMessage({ message, isTyping = false }) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = React.useState(false);
    
    // Safety check: ensure content is a string
    const messageContent = typeof message.content === 'string' 
        ? message.content 
        : typeof message.content === 'object' 
            ? JSON.stringify(message.content) 
            : String(message.content || '');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
        >
            <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 max-w-[85%] sm:max-w-[75%]`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isUser 
                        ? 'bg-blue-600 dark:bg-blue-500' 
                        : 'bg-gray-700 dark:bg-gray-600'
                }`}>
                    {isUser ? (
                        <User className="w-4 h-4 text-white" />
                    ) : (
                        <Bot className="w-4 h-4 text-white" />
                    )}
                </div>

                {/* Message Bubble */}
                <div className={`relative group/message ${
                    isUser 
                        ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                } rounded-2xl px-4 py-3 shadow-sm`}>
                    {/* Copy button - only show on hover for non-user messages */}
                    {!isUser && !isTyping && (
                        <button
                            onClick={handleCopy}
                            className="absolute -top-2 -right-2 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-full p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
                            title={copied ? "Copied!" : "Copy message"}
                        >
                            {copied ? (
                                <CheckCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
                            ) : (
                                <Copy className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                            )}
                        </button>
                    )}

                    {/* Message Content */}
                    <div className={`${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                        {isTyping ? (
                            <div className="flex items-center gap-1">
                                <span>Grok is thinking</span>
                                <div className="flex gap-1 ml-2">
                                    <motion.div
                                        className="w-1 h-1 bg-current rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                                    />
                                    <motion.div
                                        className="w-1 h-1 bg-current rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                                    />
                                    <motion.div
                                        className="w-1 h-1 bg-current rounded-full"
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap break-words">
                                {messageContent}
                            </div>
                        )}
                    </div>

                    {/* Tail for message bubble */}
                    <div className={`absolute top-3 ${
                        isUser 
                            ? 'right-[-6px] border-l-blue-600 dark:border-l-blue-500' 
                            : 'left-[-6px] border-r-gray-100 dark:border-r-gray-800'
                    } w-0 h-0 border-t-[6px] border-b-[6px] border-t-transparent border-b-transparent ${
                        isUser ? 'border-l-[6px]' : 'border-r-[6px]'
                    }`} />
                </div>
            </div>
        </motion.div>
    );
}

export default ChatMessage;