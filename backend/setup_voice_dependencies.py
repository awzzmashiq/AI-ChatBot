#!/usr/bin/env python3
"""
Setup script for voice-to-voice dependencies
Run this after installing the requirements in requirements_voice.txt
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_ffmpeg():
    """Check if ffmpeg is installed"""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        print("✅ FFmpeg is already installed")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ FFmpeg not found")
        return False

def install_ffmpeg():
    """Install ffmpeg based on the operating system"""
    system = platform.system().lower()
    
    if system == "linux":
        # Try different package managers
        commands = [
            "sudo apt-get update && sudo apt-get install -y ffmpeg",
            "sudo yum install -y ffmpeg",
            "sudo dnf install -y ffmpeg"
        ]
        for cmd in commands:
            if run_command(cmd, "Installing FFmpeg on Linux"):
                return True
    
    elif system == "darwin":  # macOS
        if run_command("brew install ffmpeg", "Installing FFmpeg on macOS"):
            return True
    
    elif system == "windows":
        print("⚠️  Please install FFmpeg manually on Windows:")
        print("1. Download from https://ffmpeg.org/download.html")
        print("2. Extract to a folder (e.g., C:\\ffmpeg)")
        print("3. Add C:\\ffmpeg\\bin to your PATH environment variable")
        return False
    
    return False

def setup_whisper():
    """Setup Whisper models"""
    print("\n🎤 Setting up Whisper models...")
    
    # Create models directory
    models_dir = Path("models/whisper")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Download base model (good balance of speed/accuracy)
    import whisper
    try:
        model = whisper.load_model("base")
        print("✅ Whisper base model downloaded successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to download Whisper model: {e}")
        return False

def setup_coqui_tts():
    """Setup Coqui TTS models"""
    print("\n🔊 Setting up Coqui TTS models...")
    
    # Create models directory
    models_dir = Path("models/tts")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        from TTS.api import TTS
        
        # Initialize TTS with a lightweight model
        tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", 
                  progress_bar=True)
        print("✅ Coqui TTS model downloaded successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to setup Coqui TTS: {e}")
        return False

def create_config():
    """Create voice configuration file"""
    config_content = '''# Voice-to-Voice Configuration
import os

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
    
    # Backblaze B2 settings (set these in your environment)
    B2_APPLICATION_KEY_ID = os.getenv("B2_APPLICATION_KEY_ID")
    B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
    B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "valinul-audio")
    
    # Performance settings
    MAX_CONCURRENT_REQUESTS = 3
    AUDIO_CACHE_SIZE = 100  # Cache 100 TTS responses
'''
    
    with open("voice_config.py", "w") as f:
        f.write(config_content)
    
    print("✅ Voice configuration file created")

def main():
    """Main setup function"""
    print("🎙️ ValiNul Voice-to-Voice Setup")
    print("=" * 40)
    
    success_count = 0
    total_steps = 5
    
    # Check/install FFmpeg
    if not check_ffmpeg():
        if install_ffmpeg():
            success_count += 1
    else:
        success_count += 1
    
    # Setup Whisper
    if setup_whisper():
        success_count += 1
    
    # Setup Coqui TTS
    if setup_coqui_tts():
        success_count += 1
    
    # Create temp directories
    temp_dir = Path("temp_audio")
    temp_dir.mkdir(exist_ok=True)
    print("✅ Temporary audio directory created")
    success_count += 1
    
    # Create configuration
    create_config()
    success_count += 1
    
    print(f"\n📊 Setup completed: {success_count}/{total_steps} steps successful")
    
    if success_count == total_steps:
        print("\n🎉 Voice-to-voice setup completed successfully!")
        print("\n📝 Next steps:")
        print("1. Set up Backblaze B2 credentials in your environment:")
        print("   export B2_APPLICATION_KEY_ID='your_key_id'")
        print("   export B2_APPLICATION_KEY='your_key'")
        print("   export B2_BUCKET_NAME='your_bucket_name'")
        print("2. Restart your Flask application")
        print("3. Test the voice features")
    else:
        print("\n⚠️  Some setup steps failed. Please check the errors above.")
    
    return success_count == total_steps

if __name__ == "__main__":
    sys.exit(0 if main() else 1)

