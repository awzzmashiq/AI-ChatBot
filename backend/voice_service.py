"""
Voice-to-Voice Service Module
Handles speech-to-text, text-to-speech, and audio storage
"""

import os
import io
import uuid
import time
import hashlib
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import tempfile
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Audio processing
import whisper
from pydub import AudioSegment
import scipy.io.wavfile as wavfile
import numpy as np

# TTS
from TTS.api import TTS

# Storage
try:
    from b2sdk.v2 import InMemoryAccountInfo, B2Api
    B2_AVAILABLE = True
except ImportError:
    B2_AVAILABLE = False
    logging.warning("B2SDK not available, using local storage only")

from voice_config import VoiceConfig

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioProcessor:
    """Handles audio format conversion and processing"""
    
    @staticmethod
    def convert_to_wav(input_path: str, output_path: str, 
                      sample_rate: int = VoiceConfig.AUDIO_SAMPLE_RATE) -> bool:
        """Convert audio file to WAV format"""
        try:
            # Load audio with pydub (supports many formats)
            audio = AudioSegment.from_file(input_path)
            
            # Convert to mono and set sample rate
            audio = audio.set_channels(VoiceConfig.AUDIO_CHANNELS)
            audio = audio.set_frame_rate(sample_rate)
            
            # Export as WAV
            audio.export(output_path, format="wav")
            logger.info(f"Converted {input_path} to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Audio conversion failed: {e}")
            return False
    
    @staticmethod
    def validate_audio_file(file_path: str) -> Tuple[bool, str]:
        """Validate audio file format and duration"""
        try:
            audio = AudioSegment.from_file(file_path)
            duration = len(audio) / 1000  # Convert to seconds
            
            if duration > VoiceConfig.MAX_AUDIO_LENGTH:
                return False, f"Audio too long: {duration}s (max: {VoiceConfig.MAX_AUDIO_LENGTH}s)"
            
            if duration < 0.1:
                return False, "Audio too short"
            
            return True, "Valid audio file"
            
        except Exception as e:
            return False, f"Invalid audio file: {str(e)}"
    
    @staticmethod
    def normalize_audio(input_path: str, output_path: str) -> bool:
        """Normalize audio levels"""
        try:
            audio = AudioSegment.from_wav(input_path)
            
            # Normalize to -20dBFS
            normalized = audio.normalize().apply_gain(-20 - audio.dBFS)
            
            normalized.export(output_path, format="wav")
            return True
            
        except Exception as e:
            logger.error(f"Audio normalization failed: {e}")
            return False

class SpeechToTextService:
    """Handles speech-to-text conversion using Whisper"""
    
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load Whisper model"""
        try:
            logger.info(f"Loading Whisper model: {VoiceConfig.WHISPER_MODEL}")
            self.model = whisper.load_model(
                VoiceConfig.WHISPER_MODEL,
                device=VoiceConfig.WHISPER_DEVICE
            )
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
    
    def transcribe(self, audio_path: str, language: str = None) -> Dict[str, Any]:
        """Transcribe audio file to text"""
        try:
            if not self.model:
                raise Exception("Whisper model not loaded")
            
            logger.info(f"Transcribing audio: {audio_path}")
            
            # Transcribe with Whisper
            result = self.model.transcribe(
                audio_path,
                language=language,
                fp16=False,  # Use fp32 for CPU
                verbose=False
            )
            
            transcription = {
                "text": result["text"].strip(),
                "language": result.get("language", "en"),
                "confidence": result.get("confidence", 0.0),
                "segments": result.get("segments", [])
            }
            
            logger.info(f"Transcription completed: {len(transcription['text'])} characters")
            return transcription
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise

class TextToSpeechService:
    """Handles text-to-speech conversion using Coqui TTS"""
    
    def __init__(self):
        self.tts = None
        self.cache = {}  # Simple in-memory cache
        self.load_model()
    
    def load_model(self):
        """Load TTS model"""
        try:
            logger.info(f"Loading TTS model: {VoiceConfig.TTS_MODEL}")
            self.tts = TTS(
                model_name=VoiceConfig.TTS_MODEL,
                progress_bar=False
            )
            
            if VoiceConfig.TTS_DEVICE == "cpu":
                self.tts.to("cpu")
            
            logger.info("TTS model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load TTS model: {e}")
            raise
    
    def _get_cache_key(self, text: str, speed: float) -> str:
        """Generate cache key for TTS request"""
        content = f"{text}_{speed}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def synthesize(self, text: str, output_path: str, 
                  speed: float = VoiceConfig.TTS_SPEED) -> bool:
        """Convert text to speech"""
        try:
            if not self.tts:
                raise Exception("TTS model not loaded")
            
            # Check cache
            cache_key = self._get_cache_key(text, speed)
            if cache_key in self.cache:
                logger.info("Using cached TTS result")
                with open(output_path, "wb") as f:
                    f.write(self.cache[cache_key])
                return True
            
            logger.info(f"Synthesizing speech for text: {text[:100]}...")
            
            # Generate speech
            self.tts.tts_to_file(
                text=text,
                file_path=output_path,
                speed=speed
            )
            
            # Cache the result
            if len(self.cache) < VoiceConfig.AUDIO_CACHE_SIZE:
                with open(output_path, "rb") as f:
                    self.cache[cache_key] = f.read()
            
            logger.info(f"Speech synthesis completed: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Speech synthesis failed: {e}")
            return False

class AudioStorageService:
    """Handles audio file storage (Backblaze B2 or local)"""
    
    def __init__(self):
        self.b2_api = None
        self.bucket = None
        self.setup_storage()
    
    def setup_storage(self):
        """Setup storage backend"""
        if VoiceConfig.B2_ENABLED and B2_AVAILABLE:
            try:
                logger.info("Setting up Backblaze B2 storage")
                info = InMemoryAccountInfo()
                self.b2_api = B2Api(info)
                
                self.b2_api.authorize_account(
                    "production",
                    VoiceConfig.B2_APPLICATION_KEY_ID,
                    VoiceConfig.B2_APPLICATION_KEY
                )
                
                # Get or create bucket
                try:
                    self.bucket = self.b2_api.get_bucket_by_name(VoiceConfig.B2_BUCKET_NAME)
                except:
                    self.bucket = self.b2_api.create_bucket(
                        VoiceConfig.B2_BUCKET_NAME,
                        "allPrivate"
                    )
                
                logger.info("Backblaze B2 storage initialized")
                
            except Exception as e:
                logger.warning(f"B2 setup failed, using local storage: {e}")
                self.b2_api = None
        else:
            logger.info("Using local storage")
    
    def store_audio(self, file_path: str, filename: str = None) -> Tuple[bool, str]:
        """Store audio file and return URL/path"""
        try:
            if not filename:
                filename = f"{uuid.uuid4()}.wav"
            
            if self.b2_api and self.bucket:
                # Upload to Backblaze B2
                with open(file_path, "rb") as f:
                    file_info = self.bucket.upload_bytes(
                        f.read(),
                        filename,
                        content_type="audio/wav"
                    )
                
                # Generate download URL (valid for 1 week)
                download_url = self.b2_api.get_download_url_for_fileid(file_info.id_)
                logger.info(f"Audio uploaded to B2: {filename}")
                return True, download_url
            else:
                # Local storage
                storage_dir = Path("stored_audio")
                storage_dir.mkdir(exist_ok=True)
                
                stored_path = storage_dir / filename
                import shutil
                shutil.copy2(file_path, stored_path)
                
                # Return relative path
                relative_path = f"/audio/{filename}"
                logger.info(f"Audio stored locally: {stored_path}")
                return True, relative_path
                
        except Exception as e:
            logger.error(f"Audio storage failed: {e}")
            return False, str(e)
    
    def get_audio_url(self, filename: str) -> Optional[str]:
        """Get download URL for stored audio"""
        try:
            if self.b2_api and self.bucket:
                # Find file in B2
                for file_version in self.bucket.ls(folder_to_list=""):
                    if file_version.file_name == filename:
                        return self.b2_api.get_download_url_for_fileid(file_version.id_)
                return None
            else:
                # Local storage
                local_path = Path("stored_audio") / filename
                if local_path.exists():
                    return f"/audio/{filename}"
                return None
                
        except Exception as e:
            logger.error(f"Failed to get audio URL: {e}")
            return None

class VoiceToVoiceService:
    """Main service that orchestrates voice-to-voice conversion"""
    
    def __init__(self):
        VoiceConfig.ensure_directories()
        
        self.stt_service = SpeechToTextService()
        self.tts_service = TextToSpeechService()
        self.storage_service = AudioStorageService()
        self.executor = ThreadPoolExecutor(max_workers=VoiceConfig.MAX_CONCURRENT_REQUESTS)
    
    def process_voice_input(self, audio_file_path: str, user_id: str = None) -> Dict[str, Any]:
        """Process voice input and return text transcription"""
        try:
            # Validate audio file
            is_valid, message = AudioProcessor.validate_audio_file(audio_file_path)
            if not is_valid:
                return {"success": False, "error": message}
            
            # Convert to WAV if needed
            wav_path = VoiceConfig.get_temp_file_path(f"{uuid.uuid4()}.wav")
            if not AudioProcessor.convert_to_wav(audio_file_path, wav_path):
                return {"success": False, "error": "Audio conversion failed"}
            
            # Normalize audio
            normalized_path = VoiceConfig.get_temp_file_path(f"{uuid.uuid4()}_norm.wav")
            AudioProcessor.normalize_audio(wav_path, normalized_path)
            
            # Transcribe
            transcription = self.stt_service.transcribe(normalized_path)
            
            # Cleanup
            try:
                os.unlink(wav_path)
                os.unlink(normalized_path)
            except:
                pass
            
            return {
                "success": True,
                "transcription": transcription["text"],
                "language": transcription["language"],
                "confidence": transcription.get("confidence", 0.0)
            }
            
        except Exception as e:
            logger.error(f"Voice input processing failed: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_voice_response(self, text: str, user_id: str = None) -> Dict[str, Any]:
        """Generate voice response from text"""
        try:
            # Generate unique filename
            audio_filename = f"{uuid.uuid4()}.wav"
            temp_path = VoiceConfig.get_temp_file_path(audio_filename, "generated")
            
            # Synthesize speech
            if not self.tts_service.synthesize(text, temp_path):
                return {"success": False, "error": "Speech synthesis failed"}
            
            # Store audio file
            stored, url_or_path = self.storage_service.store_audio(temp_path, audio_filename)
            
            if not stored:
                return {"success": False, "error": f"Storage failed: {url_or_path}"}
            
            # Cleanup temp file
            try:
                os.unlink(temp_path)
            except:
                pass
            
            return {
                "success": True,
                "audio_url": url_or_path,
                "filename": audio_filename,
                "text": text
            }
            
        except Exception as e:
            logger.error(f"Voice response generation failed: {e}")
            return {"success": False, "error": str(e)}
    
    def cleanup_temp_files(self):
        """Clean up old temporary files"""
        try:
            temp_dir = Path(VoiceConfig.TEMP_AUDIO_DIR)
            current_time = time.time()
            
            for file_path in temp_dir.rglob("*"):
                if file_path.is_file():
                    # Delete files older than 1 hour
                    if current_time - file_path.stat().st_mtime > 3600:
                        file_path.unlink()
                        logger.debug(f"Cleaned up temp file: {file_path}")
                        
        except Exception as e:
            logger.error(f"Temp file cleanup failed: {e}")

# Global service instance
voice_service = VoiceToVoiceService()


