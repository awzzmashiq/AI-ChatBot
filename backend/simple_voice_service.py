"""
Simple Voice-to-Voice Service
Handles speech recognition and text-to-speech using compatible libraries
"""

try:
    import whisper
except ImportError:
    try:
        import openai_whisper as whisper
    except ImportError:
        whisper = None
import pyttsx3
import os
import tempfile
import logging
from typing import Optional, Tuple
import pydub
import threading
import io

logger = logging.getLogger(__name__)

class SimpleVoiceService:
    def __init__(self):
        self.whisper_model = None
        self.tts_engine = None
        self.tts_lock = threading.Lock()
        self._init_whisper()
        self._init_tts()
    
    def _init_whisper(self):
        """Initialize Whisper model"""
        if whisper is None:
            logger.error("Whisper module not available")
            self.whisper_model = None
            return
            
        try:
            logger.info("Loading Whisper base model...")
            self.whisper_model = whisper.load_model("base")
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            self.whisper_model = None
    
    def _init_tts(self):
        """Initialize TTS engine"""
        try:
            logger.info("Initializing TTS engine...")
            self.tts_engine = pyttsx3.init()
            
            # Configure TTS settings
            voices = self.tts_engine.getProperty('voices')
            if voices:
                # Try to find a female voice, fallback to first available
                for voice in voices:
                    if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                        self.tts_engine.setProperty('voice', voice.id)
                        break
                else:
                    self.tts_engine.setProperty('voice', voices[0].id)
            
            # Set speech rate and volume
            self.tts_engine.setProperty('rate', 180)  # Speed of speech
            self.tts_engine.setProperty('volume', 0.9)  # Volume level (0.0 to 1.0)
            
            logger.info("TTS engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize TTS engine: {e}")
            self.tts_engine = None
    
    def transcribe_audio(self, audio_file_path: str) -> Tuple[Optional[str], Optional[str], Optional[float]]:
        """
        Transcribe audio file to text
        
        Returns:
            (transcription, language, confidence)
        """
        if not self.whisper_model:
            logger.error("Whisper model not available")
            return None, None, None
        
        try:
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            # Convert audio to wav if needed
            audio = pydub.AudioSegment.from_file(audio_file_path)
            
            # Convert to mono and 16kHz for better Whisper performance
            audio = audio.set_channels(1).set_frame_rate(16000)
            
            # Save as temporary WAV file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
                audio.export(temp_wav.name, format='wav')
                temp_wav_path = temp_wav.name
            
            try:
                # Transcribe using Whisper
                result = self.whisper_model.transcribe(temp_wav_path)
                
                transcription = result.get('text', '').strip()
                language = result.get('language', 'en')
                
                # Calculate confidence (Whisper doesn't provide direct confidence, 
                # so we estimate based on segment scores)
                segments = result.get('segments', [])
                if segments:
                    avg_confidence = sum(segment.get('no_speech_prob', 0.5) for segment in segments) / len(segments)
                    confidence = 1.0 - avg_confidence  # Invert no_speech_prob
                else:
                    confidence = 0.8  # Default confidence
                
                logger.info(f"Transcription successful: '{transcription}' (language: {language}, confidence: {confidence:.2f})")
                return transcription, language, confidence
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_wav_path):
                    os.unlink(temp_wav_path)
            
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return None, None, None
    
    def synthesize_speech(self, text: str, output_path: str) -> bool:
        """
        Convert text to speech and save as audio file
        
        Args:
            text: Text to convert to speech
            output_path: Path to save the audio file
            
        Returns:
            True if successful, False otherwise
        """
        if not self.tts_engine:
            logger.error("TTS engine not available")
            return False
        
        if not text.strip():
            logger.warning("Empty text provided for TTS")
            return False
        
        try:
            logger.info(f"Synthesizing speech for text: '{text[:50]}...'")
            
            with self.tts_lock:
                # Save to file
                self.tts_engine.save_to_file(text, output_path)
                self.tts_engine.runAndWait()
            
            # Check if file was created successfully
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                logger.info(f"Speech synthesis successful: {output_path}")
                return True
            else:
                logger.error("TTS file was not created or is empty")
                return False
                
        except Exception as e:
            logger.error(f"Error synthesizing speech: {e}")
            return False
    
    def process_voice_to_voice(self, audio_file_path: str, chat_response: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Complete voice-to-voice processing
        
        Args:
            audio_file_path: Path to input audio file
            chat_response: Text response from chat API
            
        Returns:
            (transcription, language, audio_response_path)
        """
        # Step 1: Transcribe input audio
        transcription, language, confidence = self.transcribe_audio(audio_file_path)
        
        if not transcription:
            logger.error("Failed to transcribe audio")
            return None, None, None
        
        # Step 2: Generate speech from chat response
        if chat_response and chat_response.strip():
            # Create output path for TTS
            output_dir = os.path.join(os.path.dirname(__file__), 'temp_audio')
            os.makedirs(output_dir, exist_ok=True)
            
            audio_response_path = os.path.join(output_dir, f'response_{hash(chat_response)}.wav')
            
            if self.synthesize_speech(chat_response, audio_response_path):
                return transcription, language, audio_response_path
            else:
                logger.warning("TTS failed, returning transcription only")
                return transcription, language, None
        else:
            logger.warning("No chat response provided for TTS")
            return transcription, language, None
    
    def is_available(self) -> bool:
        """Check if voice services are available"""
        return self.whisper_model is not None and self.tts_engine is not None

# Global instance
voice_service = SimpleVoiceService()
