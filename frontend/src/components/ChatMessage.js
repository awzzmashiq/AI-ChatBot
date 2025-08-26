import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Copy, CheckCheck, Volume2, VolumeX, Mic, Headphones } from 'lucide-react';

// Component to properly format message content with code highlighting
function MessageContent({ content }) {
    const handleCopyCode = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            console.log('Code copied to clipboard');
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };
    // Split content by code blocks (```...```)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return (
        <div>
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    // This is a code block
                    const codeContent = part.slice(3, -3);
                    const lines = codeContent.split('\n');
                    
                    // Extract language if specified
                    let language = '';
                    let code = codeContent;
                    if (lines[0] && !lines[0].includes(' ') && lines[0].length < 20) {
                        language = lines[0];
                        code = lines.slice(1).join('\n');
                    }
                    
                    return (
                        <div key={index} className="my-4 relative group">
                            {language && (
                                <div className="bg-gray-700 text-gray-300 px-3 py-1 text-xs font-mono rounded-t-lg border-b border-gray-600 flex justify-between items-center">
                                    <span>{language}</span>
                                    <button
                                        onClick={() => handleCopyCode(code)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white text-xs"
                                        title="Copy code"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <pre className={`bg-gray-900 text-gray-100 p-4 overflow-x-auto font-mono text-sm ${language ? 'rounded-b-lg' : 'rounded-lg'} relative`}>
                                <code>{code}</code>
                                {!language && (
                                    <button
                                        onClick={() => handleCopyCode(code)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                                        title="Copy code"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                )}
                            </pre>
                        </div>
                    );
                } else if (part.includes('`') && !part.startsWith('```')) {
                    // Handle inline code
                    const inlineParts = part.split(/(`[^`]+`)/g);
                    return (
                        <span key={index}>
                            {inlineParts.map((inlinePart, inlineIndex) => {
                                if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
                                    return (
                                        <code key={inlineIndex} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm font-mono">
                                            {inlinePart.slice(1, -1)}
                                        </code>
                                    );
                                }
                                return inlinePart;
                            })}
                        </span>
                    );
                } else {
                    // Regular text
                    return <span key={index}>{part}</span>;
                }
            })}
        </div>
    );
}

function ChatMessage({ message, isTyping = false }) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = React.useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
    const [audioElement, setAudioElement] = React.useState(null);
    
    // Safety check: ensure content is a string
    const messageContent = typeof message.content === 'string' 
        ? message.content 
        : typeof message.content === 'object' 
            ? JSON.stringify(message.content) 
            : String(message.content || '');
    
    // Check if message has voice features
    const isVoiceInput = message.isVoiceInput || false;
    const isVoiceResponse = message.isVoiceResponse || false;
    const hasAudio = message.audioUrl && !isUser;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handlePlayAudio = async () => {
        if (!message.audioUrl) return;

        try {
            if (isPlayingAudio && audioElement) {
                // Stop current playback
                audioElement.pause();
                audioElement.currentTime = 0;
                setIsPlayingAudio(false);
            } else {
                // Start playback
                const audio = new Audio(message.audioUrl);
                setAudioElement(audio);
                
                audio.onended = () => {
                    setIsPlayingAudio(false);
                    setAudioElement(null);
                };
                
                audio.onerror = (error) => {
                    console.error('Audio playback error:', error);
                    setIsPlayingAudio(false);
                    setAudioElement(null);
                };
                
                await audio.play();
                setIsPlayingAudio(true);
            }
        } catch (error) {
            console.error('Audio playback failed:', error);
            setIsPlayingAudio(false);
            setAudioElement(null);
        }
    };

    // Cleanup audio on unmount
    React.useEffect(() => {
        return () => {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
        };
    }, [audioElement]);

    const handleDownloadImage = (imageData, prompt) => {
        try {
            // Convert base64 to blob
            const byteCharacters = atob(imageData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `generated-image-${prompt ? prompt.replace(/[^a-zA-Z0-9]/g, '-') : Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to download image');
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
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative ${
                    isUser 
                        ? 'bg-blue-600 dark:bg-blue-500' 
                        : 'bg-gray-700 dark:bg-gray-600'
                }`}>
                    {isUser ? (
                        <User className="w-4 h-4 text-white" />
                    ) : (
                        <Bot className="w-4 h-4 text-white" />
                    )}
                    
                    {/* Voice indicators */}
                    {isVoiceInput && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                            <Mic className="w-2 h-2 text-white" />
                        </div>
                    )}
                    {isVoiceResponse && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                            <Headphones className="w-2 h-2 text-white" />
                        </div>
                    )}
                </div>

                {/* Message Bubble */}
                <div className={`relative group/message ${
                    isUser 
                        ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                } rounded-2xl px-4 py-3 shadow-sm`}>
                    {/* Action buttons - only show on hover for non-user messages */}
                    {!isUser && !isTyping && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 flex gap-1">
                            {/* Audio play button */}
                            {hasAudio && (
                                <button
                                    onClick={handlePlayAudio}
                                    className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-full p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
                                    title={isPlayingAudio ? "Stop audio" : "Play audio"}
                                >
                                    {isPlayingAudio ? (
                                        <VolumeX className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                    ) : (
                                        <Volume2 className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                    )}
                                </button>
                            )}
                            
                            {/* Copy button */}
                            <button
                                onClick={handleCopy}
                                className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-full p-1.5 shadow-md border border-gray-200 dark:border-gray-600"
                                title={copied ? "Copied!" : "Copy message"}
                            >
                                {copied ? (
                                    <CheckCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
                                ) : (
                                    <Copy className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Message Content */}
                    <div className={`${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                        {isTyping ? (
                            <div className="flex items-center gap-1">
                                <span>ValiNul is thinking</span>
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
                                <MessageContent content={messageContent} />
                                
                                {/* Voice input confidence indicator */}
                                {isVoiceInput && message.confidence !== undefined && (
                                    <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                                        <Mic className="w-3 h-3" />
                                        <span>
                                            Voice transcription ({Math.round(message.confidence * 100)}% confidence)
                                        </span>
                                    </div>
                                )}
                                
                                {/* Voice response indicator */}
                                {isVoiceResponse && hasAudio && (
                                    <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                                        <Volume2 className="w-3 h-3" />
                                        <span>Voice response available - click play button to listen</span>
                                    </div>
                                )}
                                
                                {/* Display image generation progress */}
                                {message.is_generating && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                            <div className="text-center">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                    className="w-8 h-8 mx-auto mb-3"
                                                >
                                                    🎨
                                                </motion.div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Generating image...
                                                </p>
                                                <div className="mt-2 flex justify-center">
                                                    <div className="flex gap-1">
                                                        <motion.div
                                                            className="w-1 h-1 bg-purple-500 rounded-full"
                                                            animate={{ scale: [1, 1.5, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                                        />
                                                        <motion.div
                                                            className="w-1 h-1 bg-purple-500 rounded-full"
                                                            animate={{ scale: [1, 1.5, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                                        />
                                                        <motion.div
                                                            className="w-1 h-1 bg-purple-500 rounded-full"
                                                            animate={{ scale: [1, 1.5, 1] }}
                                                            transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Display generated image if present */}
                                {message.image_data && (
                                    <div className="mt-4">
                                        <div className="relative group">
                                            <img
                                                src={`data:image/png;base64,${message.image_data}`}
                                                alt={message.image_prompt || "Generated image"}
                                                className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 max-w-md"
                                            />
                                            
                                            {/* Download overlay */}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                                <button
                                                    onClick={() => handleDownloadImage(message.image_data, message.image_prompt)}
                                                    className="opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Download Image"
                                                >
                                                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {message.image_prompt && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                                Prompt: {message.image_prompt}
                                            </p>
                                        )}
                                    </div>
                                )}
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