# Voice-to-Voice Configuration
import os
from pathlib import Path

class VoiceConfig:
    # Whisper settings
    WHISPER_MODEL = "base"  # Options: tiny, base, small, medium, large
    WHISPER_DEVICE = "cpu"  # Use "cuda" if you have GPU support
    
    # TTS settings
    TTS_MODEL = "tts_models/en/ljspeech/tacotron2-DDC"
    TTS_DEVICE = "cpu"
    TTS_SPEED = 1.0
    
    # Audio settings
    AUDIO_SAMPLE_RATE = 16000
    AUDIO_CHANNELS = 1  # Mono
    AUDIO_FORMAT = "wav"
    
    # Storage settings
    TEMP_AUDIO_DIR = os.path.join(os.path.dirname(__file__), "temp_audio")
    MAX_AUDIO_LENGTH = 300  # 5 minutes max
    AUDIO_CLEANUP_INTERVAL = 3600  # Clean temp files every hour
    
    # Backblaze B2 settings (set these in your environment)
    B2_APPLICATION_KEY_ID = os.getenv("B2_APPLICATION_KEY_ID")
    B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
    B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "valinul-audio")
    B2_ENABLED = all([B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY])
    
    # Performance settings
    MAX_CONCURRENT_REQUESTS = 3
    AUDIO_CACHE_SIZE = 100  # Cache 100 TTS responses
    CACHE_TTL = 86400  # 24 hours
    
    # WebSocket settings
    REALTIME_AUDIO_ENABLED = True
    AUDIO_CHUNK_SIZE = 1024
    
    @classmethod
    def ensure_directories(cls):
        """Ensure required directories exist"""
        Path(cls.TEMP_AUDIO_DIR).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(cls.TEMP_AUDIO_DIR, "uploads")).mkdir(exist_ok=True)
        Path(os.path.join(cls.TEMP_AUDIO_DIR, "generated")).mkdir(exist_ok=True)
    
    @classmethod
    def get_temp_file_path(cls, filename, subfolder="uploads"):
        """Get a temporary file path"""
        return os.path.join(cls.TEMP_AUDIO_DIR, subfolder, filename)


