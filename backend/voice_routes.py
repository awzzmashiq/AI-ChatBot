"""
Voice-to-Voice API Routes for Flask
"""

import os
import uuid
import logging
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file, session
from werkzeug.utils import secure_filename

from voice_service import voice_service
from voice_config import VoiceConfig

# Setup logging
logger = logging.getLogger(__name__)

# Create Blueprint
voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'wav', 'webm', 'mp3', 'm4a', 'ogg'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def require_auth():
    """Check if user is authenticated"""
    if 'user' not in session:
        return False
    return True

@voice_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe audio file to text
    Accepts: WebM, WAV, MP3, M4A, OGG
    Returns: JSON with transcription
    """
    try:
        # Check authentication
        if not require_auth():
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        # Check if file is present
        if 'audio' not in request.files:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False, 
                "error": f"File type not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400
        
        # Save uploaded file
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        file_path = VoiceConfig.get_temp_file_path(filename)
        file.save(file_path)
        
        logger.info(f"Received audio file: {filename} from user: {session.get('user')}")
        
        # Get optional parameters
        language = request.form.get('language')  # Auto-detect if not provided
        
        # Process the audio
        result = voice_service.process_voice_input(
            file_path, 
            user_id=session.get('user')
        )
        
        # Cleanup uploaded file
        try:
            os.unlink(file_path)
        except:
            pass
        
        if result["success"]:
            logger.info(f"Transcription successful: {len(result['transcription'])} characters")
            return jsonify(result)
        else:
            logger.error(f"Transcription failed: {result['error']}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Transcribe endpoint error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@voice_bp.route('/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Convert text to speech
    Accepts: JSON with text
    Returns: JSON with audio URL
    """
    try:
        # Check authentication
        if not require_auth():
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        # Get JSON data
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({"success": False, "error": "Empty text provided"}), 400
        
        if len(text) > 1000:  # Limit text length
            return jsonify({"success": False, "error": "Text too long (max 1000 characters)"}), 400
        
        logger.info(f"Synthesizing speech for user: {session.get('user')}, text length: {len(text)}")
        
        # Optional parameters
        speed = data.get('speed', VoiceConfig.TTS_SPEED)
        speed = max(0.5, min(2.0, speed))  # Clamp between 0.5x and 2.0x
        
        # Generate speech
        result = voice_service.generate_voice_response(
            text,
            user_id=session.get('user')
        )
        
        if result["success"]:
            logger.info(f"Speech synthesis successful: {result['filename']}")
            return jsonify(result)
        else:
            logger.error(f"Speech synthesis failed: {result['error']}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Synthesize endpoint error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@voice_bp.route('/process', methods=['POST'])
def process_voice_to_voice():
    """
    Complete voice-to-voice pipeline
    Accepts: Audio file
    Returns: JSON with transcription and response audio URL
    """
    try:
        # Check authentication
        if not require_auth():
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        # Check if file is present
        if 'audio' not in request.files:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False, 
                "error": f"File type not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400
        
        # Save uploaded file
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        file_path = VoiceConfig.get_temp_file_path(filename)
        file.save(file_path)
        
        logger.info(f"Processing voice-to-voice for user: {session.get('user')}")
        
        # Step 1: Transcribe audio
        transcription_result = voice_service.process_voice_input(
            file_path,
            user_id=session.get('user')
        )
        
        # Cleanup uploaded file
        try:
            os.unlink(file_path)
        except:
            pass
        
        if not transcription_result["success"]:
            return jsonify(transcription_result), 500
        
        transcribed_text = transcription_result["transcription"]
        
        # Step 2: Get AI response (integrate with existing chat endpoint logic)
        # This would typically call your existing AI model
        # For now, we'll create a simple response
        
        # You can integrate this with your existing chat logic
        ai_response = f"I heard you say: {transcribed_text}. This is a voice response from ValiNul AI."
        
        # Step 3: Convert response to speech
        synthesis_result = voice_service.generate_voice_response(
            ai_response,
            user_id=session.get('user')
        )
        
        if not synthesis_result["success"]:
            return jsonify(synthesis_result), 500
        
        # Return complete result
        result = {
            "success": True,
            "transcription": {
                "text": transcribed_text,
                "language": transcription_result.get("language", "en"),
                "confidence": transcription_result.get("confidence", 0.0)
            },
            "response": {
                "text": ai_response,
                "audio_url": synthesis_result["audio_url"],
                "filename": synthesis_result["filename"]
            }
        }
        
        logger.info(f"Voice-to-voice processing completed for user: {session.get('user')}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Voice-to-voice endpoint error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

@voice_bp.route('/audio/<filename>')
def serve_audio(filename):
    """
    Serve audio files (for local storage)
    """
    try:
        # Check authentication
        if not require_auth():
            return jsonify({"error": "Authentication required"}), 401
        
        # Secure the filename
        filename = secure_filename(filename)
        
        # Check local storage first
        local_path = Path("stored_audio") / filename
        if local_path.exists():
            return send_file(
                local_path,
                mimetype="audio/wav",
                as_attachment=False,
                download_name=filename
            )
        
        # Check temp storage
        temp_path = Path(VoiceConfig.TEMP_AUDIO_DIR) / "generated" / filename
        if temp_path.exists():
            return send_file(
                temp_path,
                mimetype="audio/wav",
                as_attachment=False,
                download_name=filename
            )
        
        return jsonify({"error": "Audio file not found"}), 404
        
    except Exception as e:
        logger.error(f"Audio serve error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@voice_bp.route('/status')
def voice_status():
    """
    Get voice service status
    """
    try:
        # Check authentication
        if not require_auth():
            return jsonify({"error": "Authentication required"}), 401
        
        status = {
            "whisper_model": VoiceConfig.WHISPER_MODEL,
            "tts_model": VoiceConfig.TTS_MODEL,
            "storage_backend": "backblaze_b2" if VoiceConfig.B2_ENABLED else "local",
            "max_audio_length": VoiceConfig.MAX_AUDIO_LENGTH,
            "supported_formats": list(ALLOWED_EXTENSIONS),
            "realtime_enabled": VoiceConfig.REALTIME_AUDIO_ENABLED
        }
        
        return jsonify({"success": True, "status": status})
        
    except Exception as e:
        logger.error(f"Status endpoint error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@voice_bp.route('/cleanup', methods=['POST'])
def cleanup_temp_files():
    """
    Manually trigger cleanup of temporary files (admin only)
    """
    try:
        # Check authentication
        if not require_auth():
            return jsonify({"error": "Authentication required"}), 401
        
        # Simple admin check (you may want to implement proper admin roles)
        user = session.get('user')
        if user != 'admin':  # Adjust this based on your admin system
            return jsonify({"error": "Admin access required"}), 403
        
        voice_service.cleanup_temp_files()
        
        return jsonify({"success": True, "message": "Cleanup completed"})
        
    except Exception as e:
        logger.error(f"Cleanup endpoint error: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Error handlers
@voice_bp.errorhandler(413)
def file_too_large(error):
    """Handle file too large error"""
    return jsonify({
        "success": False,
        "error": "File too large. Maximum size exceeded."
    }), 413

@voice_bp.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    logger.error(f"Internal server error in voice routes: {error}")
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


