import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Brain, 
    Image as ImageIcon, 
    Settings, 
    Zap, 
    CheckCircle, 
    AlertCircle,
    Palette,
    Sparkles,
    X
} from 'lucide-react';
import config from '../config';

const ModelSelector = ({ onModelChange, currentModel, onClose }) => {
    const [models, setModels] = useState([]);
    const [currentModelInfo, setCurrentModelInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        fetchAvailableModels();
    }, []);

    const fetchAvailableModels = async () => {
        try {
            setLoading(true);
            const apiBaseUrl = config.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/models`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch models');
            
            const data = await response.json();
            if (data.success) {
                setModels(data.available_models);
                setCurrentModelInfo(data.current_model);
                setError(null);
            } else {
                setError(data.error || 'Failed to fetch models');
            }
        } catch (err) {
            console.error('Error fetching models:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModelSwitch = async (modelId) => {
        try {
            setLoading(true);
            const apiBaseUrl = config.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/models/switch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ model_name: modelId })
            });
            
            if (!response.ok) throw new Error('Failed to switch model');
            
            const data = await response.json();
            if (data.success) {
                setCurrentModelInfo(data.current_model);
                onModelChange(data.current_model);
                setError(null);
            } else {
                setError(data.error || 'Failed to switch model');
            }
        } catch (err) {
            console.error('Error switching model:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getModelIcon = (modelType) => {
        switch (modelType) {
            case 'theta':
                return <Brain className="w-5 h-5" />;
            case 'openai':
                return <Zap className="w-5 h-5" />;
            case 'theta_image':
                return <ImageIcon className="w-5 h-5" />;
            default:
                return <Brain className="w-5 h-5" />;
        }
    };

    const getModelColor = (modelType) => {
        switch (modelType) {
            case 'theta':
                return 'text-blue-600 dark:text-blue-400';
            case 'openai':
                return 'text-green-600 dark:text-green-400';
            case 'theta_image':
                return 'text-purple-600 dark:text-purple-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getModelBgColor = (modelType) => {
        switch (modelType) {
            case 'theta':
                return 'bg-blue-50 dark:bg-blue-900/20';
            case 'openai':
                return 'bg-green-50 dark:bg-green-900/20';
            case 'theta_image':
                return 'bg-purple-50 dark:bg-purple-900/20';
            default:
                return 'bg-gray-50 dark:bg-gray-900/20';
        }
    };

    if (loading && models.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center p-6"
            >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading models...</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            AI Model Selection
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Choose your preferred AI model for responses
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Advanced Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </motion.button>
                    
                    {onClose && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    )}
                </div>
            </div>

            {/* Current Model Status */}
            {currentModelInfo && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`mb-6 p-4 rounded-lg border-2 ${getModelBgColor(currentModelInfo.type)} border-current ${getModelColor(currentModelInfo.type)}`}
                >
                    <div className="flex items-center gap-3">
                        {getModelIcon(currentModelInfo.type)}
                        <div className="flex-1">
                            <h4 className="font-medium">Current Model</h4>
                            <p className="text-sm opacity-80">{currentModelInfo.display_name}</p>
                            <p className="text-xs opacity-60">{currentModelInfo.description}</p>
                        </div>
                        <CheckCircle className="w-5 h-5" />
                    </div>
                </motion.div>
            )}

            {/* Error Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <span className="text-red-800 dark:text-red-200">{error}</span>
                    </div>
                </motion.div>
            )}

            {/* Available Models */}
            <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Available Models
                </h4>
                
                <AnimatePresence>
                    {models.map((model, index) => (
                        <motion.div
                            key={model.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                                currentModelInfo?.id === model.id
                                    ? `${getModelBgColor(model.type)} border-current ${getModelColor(model.type)}`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                            onClick={() => handleModelSwitch(model.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getModelBgColor(model.type)}`}>
                                    {getModelIcon(model.type)}
                                </div>
                                
                                <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 dark:text-white">
                                        {model.display_name}
                                    </h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {model.description}
                                    </p>
                                </div>
                                
                                {currentModelInfo?.id === model.id ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Advanced Settings */}
            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
                    >
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            Advanced Settings
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Temperature
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    defaultValue="0.5"
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Focused</span>
                                    <span>Creative</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Max Tokens
                                </label>
                                <input
                                    type="range"
                                    min="100"
                                    max="2000"
                                    step="100"
                                    defaultValue="500"
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Short</span>
                                    <span>Long</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Refresh Button */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchAvailableModels}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Refreshing...' : 'Refresh Models'}
                </motion.button>
            </div>
        </motion.div>
    );
};

export default ModelSelector;
