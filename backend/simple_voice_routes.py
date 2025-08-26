"""
Simple Voice-to-Voice API Routes
"""

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import tempfile
import logging
import requests
import config
from simple_voice_service import voice_service

logger = logging.getLogger(__name__)

# Create voice blueprint
voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'wav', 'webm', 'mp3', 'm4a', 'ogg'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@voice_bp.route('/process', methods=['POST'])
def process_voice_to_voice():
    """
    Complete voice-to-voice pipeline
    """
    try:
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
        
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            file.save(temp_file.name)
            temp_audio_path = temp_file.name
        
        logger.info(f"Processing voice-to-voice with file: {file.filename}")
        
        try:
            # Step 1: Transcribe audio
            transcription, language, confidence = voice_service.transcribe_audio(temp_audio_path)
            
            if not transcription:
                return jsonify({"success": False, "error": "Failed to transcribe audio"}), 500
            
            logger.info(f"Transcription: {transcription}")
            
            # Step 2: Get chat response from existing API
            chat_data = {
                'message': transcription,
                'voice_mode': True
            }
            
            # Get session_id if provided
            session_id = request.form.get('session_id', 'default')
            if session_id:
                chat_data['session_id'] = session_id
            
            # Call the existing chat API
            try:
                chat_response = requests.post(
                    'http://localhost:5000/api/chat',
                    json=chat_data,
                    cookies=request.cookies,
                    headers={'Content-Type': 'application/json'}
                )
                
                if chat_response.status_code == 200:
                    chat_result = chat_response.json()
                    ai_response_text = chat_result.get('response', 'I apologize, but I encountered an error processing your request.')
                else:
                    ai_response_text = "I'm sorry, I couldn't process your request at the moment."
                    
            except Exception as e:
                logger.error(f"Error calling chat API: {e}")
                ai_response_text = "I'm experiencing technical difficulties. Please try again."
            
            logger.info(f"AI Response: {ai_response_text}")
            
            # Step 3: Convert AI response to speech
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as response_audio_file:
                response_audio_path = response_audio_file.name
            
            success = voice_service.synthesize_speech(ai_response_text, response_audio_path)
            
            if not success or not os.path.exists(response_audio_path):
                logger.warning("TTS failed, returning text-only response")
                response_audio_url = None
            else:
                # Copy to a more permanent location
                audio_dir = os.path.join(os.path.dirname(__file__), 'temp_audio')
                os.makedirs(audio_dir, exist_ok=True)
                permanent_audio_path = os.path.join(audio_dir, f'response_{hash(ai_response_text)}.wav')
                
                try:
                    import shutil
                    shutil.move(response_audio_path, permanent_audio_path)
                    response_audio_url = f'/api/voice/audio/{os.path.basename(permanent_audio_path)}'
                except Exception as e:
                    logger.error(f"Error moving audio file: {e}")
                    response_audio_url = None
            
            # Return complete result
            result = {
                "success": True,
                "transcription": transcription,
                "language": language,
                "confidence": confidence,
                "response": ai_response_text,
                "audio_url": response_audio_url
            }
            
            logger.info("Voice-to-voice processing completed successfully")
            return jsonify(result)
            
        finally:
            # Cleanup temporary input file
            try:
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"Voice-to-voice endpoint error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@voice_bp.route('/transcribe', methods=['POST'])
def transcribe_only():
    """
    Transcribe audio to text only
    """
    try:
        logger.info("Received transcribe request")
        
        if 'audio' not in request.files:
            logger.error("No audio file in request")
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        file = request.files['audio']
        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        logger.info(f"Processing audio file: {file.filename}, size: {file.content_length} bytes")
        
        # Save uploaded file to temporary location with original extension
        file_ext = '.webm' if 'webm' in file.filename.lower() else '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            file.save(temp_file.name)
            temp_audio_path = temp_file.name
        
        logger.info(f"Saved audio to: {temp_audio_path}")
        
        try:
            logger.info("Starting transcription...")
            # Transcribe audio
            transcription, language, confidence = voice_service.transcribe_audio(temp_audio_path)
            
            logger.info(f"Transcription result: '{transcription}' (confidence: {confidence})")
            
            if not transcription:
                logger.error("Transcription returned empty result")
                return jsonify({"success": False, "error": "Failed to transcribe audio"}), 500
            
            return jsonify({
                "success": True,
                "transcription": transcription,
                "language": language,
                "confidence": confidence
            })
            
        finally:
            # Cleanup
            try:
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
                    logger.info("Cleaned up temporary file")
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temp file: {cleanup_error}")
        
    except Exception as e:
        logger.error(f"Transcribe endpoint error: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500

@voice_bp.route('/synthesize', methods=['POST'])
def synthesize_only():
    """
    Convert text to speech only
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({"success": False, "error": "Empty text provided"}), 400
        
        # Create output path
        audio_dir = os.path.join(os.path.dirname(__file__), 'temp_audio')
        os.makedirs(audio_dir, exist_ok=True)
        audio_path = os.path.join(audio_dir, f'synthesis_{hash(text)}.wav')
        
        success = voice_service.synthesize_speech(text, audio_path)
        
        if not success:
            return jsonify({"success": False, "error": "Failed to synthesize speech"}), 500
        
        audio_url = f'/api/voice/audio/{os.path.basename(audio_path)}'
        
        return jsonify({
            "success": True,
            "text": text,
            "audio_url": audio_url,
            "filename": os.path.basename(audio_path)
        })
        
    except Exception as e:
        logger.error(f"Synthesize endpoint error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@voice_bp.route('/audio/<filename>')
def serve_audio(filename):
    """
    Serve audio files
    """
    try:
        # Secure the filename
        filename = secure_filename(filename)
        
        # Check temp audio directory
        audio_dir = os.path.join(os.path.dirname(__file__), 'temp_audio')
        audio_path = os.path.join(audio_dir, filename)
        
        if os.path.exists(audio_path):
            return send_file(
                audio_path,
                mimetype="audio/wav",
                as_attachment=False
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
        return jsonify({
            "success": True,
            "available": voice_service.is_available(),
            "whisper_loaded": voice_service.whisper_model is not None,
            "tts_loaded": voice_service.tts_engine is not None,
            "supported_formats": list(ALLOWED_EXTENSIONS)
        })
        
    except Exception as e:
        logger.error(f"Status endpoint error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@voice_bp.route('/test', methods=['GET', 'POST'])
def test_endpoint():
    """
    Simple test endpoint to verify routing
    """
    try:
        return jsonify({
            "success": True,
            "message": "Voice routes are working",
            "method": request.method,
            "endpoint": "/api/voice/test"
        })
    except Exception as e:
        logger.error(f"Test endpoint error: {e}")
        return jsonify({"error": str(e)}), 500
