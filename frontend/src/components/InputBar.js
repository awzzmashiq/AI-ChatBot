import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, MicOff, StopCircle, Upload } from 'lucide-react';

function InputBar({ 
    messageInput, 
    setMessageInput, 
    onSend, 
    onFileUpload, 
    onVoiceToggle, 
    isLoading, 
    isUploading, 
    recording 
}) {
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    }, [messageInput]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileUpload(file);
        }
        e.target.value = '';
    };

    const canSend = messageInput.trim() && !isLoading;

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="max-w-4xl mx-auto">
                <div className={`relative bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 transition-all duration-200 ${
                    isFocused 
                        ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                    {/* Main input area */}
                    <div className="flex items-end gap-2 p-3">
                        {/* File upload button */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
                        />
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 disabled:opacity-50"
                            title="Upload file"
                        >
                            {isUploading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Upload className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <Paperclip className="w-5 h-5" />
                            )}
                        </motion.button>

                        {/* Text input */}
                        <div className="flex-1">
                            <textarea
                                ref={textareaRef}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Ask ValiNul anything..."
                                className="w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none border-none outline-none text-base leading-6 max-h-[120px]"
                                rows="1"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Voice recording button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onVoiceToggle}
                            className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${
                                recording
                                    ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title={recording ? "Stop recording" : "Voice input"}
                        >
                            <AnimatePresence mode="wait">
                                {recording ? (
                                    <motion.div
                                        key="recording"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <StopCircle className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="idle"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Mic className="w-5 h-5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>

                        {/* Send button */}
                        <motion.button
                            whileHover={canSend ? { scale: 1.05 } : {}}
                            whileTap={canSend ? { scale: 0.95 } : {}}
                            onClick={onSend}
                            disabled={!canSend}
                            className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${
                                canSend
                                    ? 'text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md'
                                    : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                            }`}
                            title="Send message"
                        >
                            {isLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Send className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </motion.button>
                    </div>

                    {/* Recording indicator */}
                    <AnimatePresence>
                        {recording && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-t border-gray-200 dark:border-gray-700 px-4 py-2"
                            >
                                <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="w-2 h-2 bg-red-500 rounded-full"
                                    />
                                    <span className="text-sm">Recording... Click to stop</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hint text */}
                <div className="text-center mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}

export default InputBar;