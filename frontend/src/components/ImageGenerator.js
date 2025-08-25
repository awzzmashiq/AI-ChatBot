import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Image as ImageIcon, 
    Palette, 
    Download, 
    RefreshCw, 
    Settings,
    Sparkles,
    AlertCircle,
    CheckCircle,
    X
} from 'lucide-react';
import config from '../config';

const ImageGenerator = ({ currentModel, onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Image generation parameters
    const [width, setWidth] = useState(512);
    const [height, setHeight] = useState(512);
    const [steps, setSteps] = useState(25);
    const [cfgScale, setCfgScale] = useState(8);
    const [seed, setSeed] = useState('');

    const canGenerateImages = currentModel?.type === 'theta_image';

    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Please enter an image prompt');
            return;
        }

        if (!canGenerateImages) {
            setError('Image generation is only available with Stable Diffusion models. Please switch to a Stable Diffusion model first.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const apiBaseUrl = config.getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/models/generate-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    width: parseInt(width),
                    height: parseInt(height),
                    steps: parseInt(steps),
                    cfg_scale: parseFloat(cfgScale),
                    seed: seed ? parseInt(seed) : null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate image');
            }

            const data = await response.json();
            if (data.success) {
                setGeneratedImage({
                    imageData: data.image_data,
                    seed: data.seed,
                    prompt: data.prompt
                });
                setError(null);
            } else {
                throw new Error(data.error || 'Image generation failed');
            }
        } catch (err) {
            console.error('Image generation error:', err);
            setError(err.message);
            setGeneratedImage(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        
        try {
            // Convert base64 to blob
            const byteCharacters = atob(generatedImage.imageData);
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
            a.download = `generated-image-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
            setError('Failed to download image');
        }
    };

    const handleRandomSeed = () => {
        setSeed(Math.floor(Math.random() * 1000000).toString());
    };

    const handleClear = () => {
        setPrompt('');
        setGeneratedImage(null);
        setError(null);
        setWidth(512);
        setHeight(512);
        setSteps(25);
        setCfgScale(8);
        setSeed('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <ImageIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            AI Image Generation
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Create stunning images with Stable Diffusion
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors"
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

            {/* Model Check */}
            {!canGenerateImages && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <div>
                            <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                                Switch to Stable Diffusion Model
                            </p>
                            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                                Image generation requires a Stable Diffusion model. Please switch to "🎨 Stable Diffusion Turbo Vision" in the model selector.
                            </p>
                        </div>
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

            {/* Prompt Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image Prompt
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate... (e.g., 'A serene mountain landscape at sunset with golden clouds')"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    disabled={!canGenerateImages}
                />
            </div>

            {/* Advanced Settings */}
            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Width: {width}px
                                </label>
                                <input
                                    type="range"
                                    min="256"
                                    max="1024"
                                    step="64"
                                    value={width}
                                    onChange={(e) => setWidth(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    disabled={!canGenerateImages}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Height: {height}px
                                </label>
                                <input
                                    type="range"
                                    min="256"
                                    max="1024"
                                    step="64"
                                    value={height}
                                    onChange={(e) => setHeight(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    disabled={!canGenerateImages}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Steps: {steps}
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="50"
                                    step="1"
                                    value={steps}
                                    onChange={(e) => setSteps(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    disabled={!canGenerateImages}
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Fast</span>
                                    <span>Quality</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    CFG Scale: {cfgScale}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    step="0.5"
                                    value={cfgScale}
                                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    disabled={!canGenerateImages}
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Creative</span>
                                    <span>Focused</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Seed (optional)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={seed}
                                    onChange={(e) => setSeed(e.target.value)}
                                    placeholder="Leave empty for random"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    disabled={!canGenerateImages}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleRandomSeed}
                                    disabled={!canGenerateImages}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Generate Random Seed"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Generate Button */}
            <div className="mb-6">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateImage}
                    disabled={loading || !canGenerateImages || !prompt.trim()}
                    className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Generate Image
                        </>
                    )}
                </motion.button>
            </div>

            {/* Generated Image */}
            <AnimatePresence>
                {generatedImage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                    >
                        <div className="text-center">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                Generated Image
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {generatedImage.prompt}
                            </p>
                        </div>
                        
                        <div className="relative group">
                            <img
                                src={`data:image/png;base64,${generatedImage.imageData}`}
                                alt="Generated image"
                                className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                            
                            {/* Download overlay */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDownload}
                                    className="opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    title="Download Image"
                                >
                                    <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                </motion.button>
                            </div>
                        </div>
                        
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                            <p>Seed: {generatedImage.seed}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClear}
                    className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                    Clear
                </motion.button>
                
                {generatedImage && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownload}
                        className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

export default ImageGenerator;
