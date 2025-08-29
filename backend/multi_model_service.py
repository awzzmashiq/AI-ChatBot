import os
import time
import requests
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MultiModelService:
    def __init__(self):
        # Model configurations
        self.models = {
            "llama_3_1_70b": {
                "url": "https://ondemand.thetaedgecloud.com/infer_request/llama_3_1_70b/completions",
                "api_key": os.getenv("THETA_API_KEY"),
                "type": "theta",
                "display_name": "🦙 Llama 3.1 70B",
                "description": "Advanced language model for complex reasoning",
                "default_max_tokens": 2000,
                "default_temperature": 0.7
            },
            "deepseek_r1": {
                "url": "https://ondemand.thetaedgecloud.com/infer_request/deepseek_r1/completions",
                "api_key": os.getenv("THETA_API_KEY"),
                "type": "theta",
                "display_name": "🔍 Deepseek R1",
                "description": "Specialized model for research and analysis"
            },
            "gpt_3_5_turbo": {
                "url": "https://api.openai.com/v1/chat/completions",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "type": "openai",
                "display_name": "🤖 GPT-3.5 Turbo",
                "description": "Fast and reliable OpenAI model"
            },
            "stable_diffusion_turbo_vision": {
                "url": "https://ondemand.thetaedgecloud.com/infer_request/stable_diffusion_turbo_vision",
                "api_key": os.getenv("THETA_API_KEY"),
                "type": "theta_image",
                "display_name": "🎨 Stable Diffusion Turbo Vision",
                "description": "AI image generation model"
            },
            "eden_ai_minimax": {
                "url": "https://api.edenai.run/v2/image/generation",
                "api_key": os.getenv("EDEN_AI_API_KEY"),
                "type": "eden_image",
                "display_name": "🌿 Eden AI Minimax",
                "description": "AI image generation using Eden AI with Minimax provider"
            }
        }
        
        self.current_model = "llama_3_1_70b"
        self._update_headers()

    def _update_headers(self):
        """Update headers based on current model"""
        model_config = self.models[self.current_model]
        if model_config["type"] in ["theta", "theta_image"]:
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {model_config['api_key']}"
            }
        elif model_config["type"] == "openai":
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {model_config['api_key']}"
            }
        elif model_config["type"] == "eden_image":
            self.headers = {
                "Authorization": f"Bearer {model_config['api_key']}"
            }

    def get_available_models(self):
        """Get list of available models with their status"""
        available_models = []
        for model_id, config in self.models.items():
            is_available = bool(config["api_key"])
            available_models.append({
                "id": model_id,
                "display_name": config["display_name"],
                "description": config["description"],
                "type": config["type"],
                "available": is_available,
                "status": "Available" if is_available else "API Key Required"
            })
        return available_models

    def switch_model(self, model_name):
        """Switch to a different model"""
        if model_name in self.models:
            model_config = self.models[model_name]
            if not model_config["api_key"]:
                logger.warning(f"No API key available for {model_name} - model will be available but may not function properly")
                # Still allow switching for testing purposes
                
            self.current_model = model_name
            self._update_headers()
            logger.info(f"Switched to model: {model_name}")
            return True, f"Successfully switched to {model_config['display_name']}"
        else:
            logger.warning(f"Unknown model: {model_name}")
            return False, f"Unknown model: {model_name}"

    def get_current_model_info(self):
        """Get current model information"""
        model_config = self.models[self.current_model]
        return {
            "id": self.current_model,
            "display_name": model_config["display_name"],
            "description": model_config["description"],
            "type": model_config["type"]
        }

    def generate_text(self, messages, temperature=0.5, top_p=0.7, max_tokens=2000):
        """Generate text response using current model"""
        model_config = self.models[self.current_model]
        
        if model_config["type"] == "theta":
            return self._generate_theta_text(messages, temperature, top_p, max_tokens)
        elif model_config["type"] == "openai":
            return self._generate_openai_text(messages, temperature, max_tokens)
        else:
            return False, f"Text generation not supported by {self.current_model}"

    def generate_image(self, prompt, width=512, height=512, steps=25, cfg_scale=8, seed=None):
        """Generate image using current image generation model with fallback options"""
        model_config = self.models[self.current_model]
        
        # Check if current model supports image generation
        if model_config["type"] not in ["theta_image", "eden_image"]:
            return False, "Image generation is only available with image generation models"
            
        if not model_config["api_key"]:
            # Try fallback image generation
            logger.info(f"No API key available for {self.current_model}, trying fallback image generation")
            return self._generate_image_fallback(prompt, width, height)
        
        # Route to appropriate image generation method based on model type
        if model_config["type"] == "theta_image":
            return self._generate_theta_image(prompt, width, height, steps, cfg_scale, seed)
        elif model_config["type"] == "eden_image":
            return self._generate_eden_image(prompt, width, height)
        else:
            return False, f"Image generation not implemented for {self.current_model}"

    def _generate_theta_image(self, prompt, width=512, height=512, steps=25, cfg_scale=8, seed=None):
        """Generate image using Theta Edge Cloud Stable Diffusion"""
        model_config = self.models[self.current_model]
        
        # Generate random seed if not provided
        if seed is None:
            seed = int(time.time() * 1000) % (2**32)
            
        payload = {
            "input": {
                "cfg_scale": cfg_scale,
                "height": height,
                "prompt": prompt,
                "sampler_index": "Euler a",
                "seed": seed,
                "steps": steps,
                "width": width
            },
            "wait": 30
        }

        try:
            logger.info(f"Starting image generation with prompt: {prompt}")
            response = requests.post(model_config["url"], headers=self.headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Image generation response: {data}")
            
            # Extract image data from response - improved handling
            if "body" in data and "infer_requests" in data["body"]:
                infer_requests = data["body"]["infer_requests"]
                if infer_requests and len(infer_requests) > 0:
                    infer_request = infer_requests[0]
                    # Store request ID for status checking
                    self._last_request_id = infer_request.get("id")
                    request_state = infer_request.get("state")
                    
                    logger.info(f"Request ID: {self._last_request_id}, State: {request_state}")
                    
                    if request_state == "processing":
                        # Image is still processing - this is normal for Theta API
                        logger.info("Image is still being generated by Theta API. This usually takes 30-60 seconds.")
                        return False, "Image generation is taking longer than expected. Please try again in a few moments."
                    
                    if request_state == "failed":
                        error_msg = infer_request.get("error_message", "Unknown error")
                        logger.error(f"Image generation failed: {error_msg}")
                        # Try fallback if Theta fails
                        logger.info("Theta API failed, trying fallback image generation")
                        return self._generate_image_fallback(prompt, width, height)
                    
                    if request_state in ["succeeded", "success", "completed"]:
                        image_data = self._extract_image_data(infer_request)
                        if image_data:
                            logger.info("Image generation successful, returning image data")
                            return True, {
                                "image_data": image_data,
                                "seed": seed,
                                "prompt": prompt
                            }
                        else:
                            logger.error("Image generation succeeded but no image data found")
                            logger.error(f"Available output keys: {list(infer_request.get('output', {}).keys())}")
                            # Try fallback if no image data
                            logger.info("No image data from Theta API, trying fallback")
                            return self._generate_image_fallback(prompt, width, height)
                    else:
                        logger.info(f"Image generation status: {request_state}")
                        # For states like "created", "assigned", etc., return processing status
                        if request_state in ["created", "assigned", "queued"]:
                            return False, "Image generation is taking longer than expected. Please try again in a few moments."
                        else:
                            return False, f"Image generation status: {request_state}"
                else:
                    logger.error("No inference requests in response")
                    return False, "No inference requests in response"
            else:
                # Try alternative response formats
                logger.info("Trying alternative response format extraction")
                image_data = self._extract_image_data_alternative(data)
                if image_data:
                    logger.info("Image generation successful using alternative format")
                    return True, {
                        "image_data": image_data,
                        "seed": seed,
                        "prompt": prompt
                    }
                else:
                    logger.error("Unexpected response format from image generation API")
                    logger.error(f"Response data: {data}")
                    # Try fallback if response format is unexpected
                    logger.info("Unexpected response format, trying fallback image generation")
                    return self._generate_image_fallback(prompt, width, height)
                
        except requests.exceptions.Timeout:
            logger.error("Image generation timeout")
            # Try fallback on timeout
            logger.info("Theta API timeout, trying fallback image generation")
            return self._generate_image_fallback(prompt, width, height)
        except requests.exceptions.RequestException as e:
            logger.error(f"Image generation API error: {e}")
            # Try fallback on API error
            logger.info("Theta API error, trying fallback image generation")
            return self._generate_image_fallback(prompt, width, height)
        except Exception as e:
            logger.error(f"Unexpected error in image generation: {e}")
            # Try fallback on unexpected error
            logger.info("Unexpected error, trying fallback image generation")
            return self._generate_image_fallback(prompt, width, height)

    def _generate_eden_image(self, prompt, width=512, height=512):
        """Generate image using Eden AI with Minimax provider"""
        model_config = self.models[self.current_model]
        
        # Eden AI payload structure
        payload = {
            "providers": "minimax",
            "text": prompt,
            "resolution": f"{width}x{height}"
        }
        
        try:
            logger.info(f"Starting Eden AI image generation with prompt: {prompt}")
            response = requests.post(model_config["url"], json=payload, headers=self.headers, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Eden AI image generation response: {data}")
            
            # Extract image data from Eden AI response
            # Eden AI can return under different provider keys
            image_data = None
            
            # Check for minimax provider first
            if "minimax" in data and "items" in data["minimax"]:
                items = data["minimax"]["items"]
                if items and len(items) > 0:
                    image_data = items[0]
                    logger.info("Found image data under minimax provider")
            
            # Check for openai provider (common fallback)
            elif "openai" in data and "items" in data["openai"]:
                items = data["openai"]["items"]
                if items and len(items) > 0:
                    image_data = items[0]
                    logger.info("Found image data under openai provider")
            
            # Check for any other provider that might have items
            else:
                for provider, provider_data in data.items():
                    if isinstance(provider_data, dict) and "items" in provider_data:
                        items = provider_data["items"]
                        if items and len(items) > 0:
                            image_data = items[0]
                            logger.info(f"Found image data under {provider} provider")
                            break
            
            if image_data:
                # Eden AI returns a URL, not base64 data
                # We need to download the image and convert to base64
                image_url = None
                
                # Check if image_data is a dictionary with image_resource_url
                if isinstance(image_data, dict) and "image_resource_url" in image_data:
                    image_url = image_data["image_resource_url"]
                    logger.info(f"Found image_resource_url in image_data: {image_url}")
                
                # If not found in image_data, look in the original response structure
                if not image_url:
                    # Look for image_resource_url in the response
                    if "minimax" in data and "items" in data["minimax"]:
                        items = data["minimax"]["items"]
                        if items and len(items) > 0:
                            item = items[0]
                            if isinstance(item, dict) and "image_resource_url" in item:
                                image_url = item["image_resource_url"]
                                logger.info(f"Found image_resource_url in minimax items: {image_url}")
                    
                    # Fallback: check openai provider
                    elif "openai" in data and "items" in data["openai"]:
                        items = data["openai"]["items"]
                        if items and len(items) > 0:
                            item = items[0]
                            if isinstance(item, dict) and "image_resource_url" in item:
                                image_url = item["image_resource_url"]
                                logger.info(f"Found image_resource_url in openai items: {image_url}")
                
                # If we found a URL, download and convert to base64
                if image_url:
                    logger.info(f"Downloading image from Eden AI URL: {image_url}")
                    try:
                        img_response = requests.get(image_url, timeout=30)
                        img_response.raise_for_status()
                        
                        import base64
                        base64_image = base64.b64encode(img_response.content).decode('utf-8')
                        logger.info("Successfully downloaded and encoded image from Eden AI URL")
                        
                        return True, {
                            "image_data": base64_image,
                            "prompt": prompt,
                            "source": "eden_ai_minimax"
                        }
                    except Exception as e:
                        logger.error(f"Failed to download image from Eden AI URL: {e}")
                        return False, f"Failed to download generated image: {str(e)}"
                else:
                    # If it's already base64 data, return as is
                    if isinstance(image_data, str) and not image_data.startswith('http'):
                        logger.info("Successfully generated image using Eden AI (base64 data)")
                        return True, {
                            "image_data": image_data,
                            "prompt": prompt,
                            "source": "eden_ai_minimax"
                        }
                    else:
                        logger.error("No image URL found in Eden AI response")
                        logger.error(f"image_data type: {type(image_data)}")
                        logger.error(f"image_data content: {image_data}")
                        return False, "No image URL found in Eden AI response"
            else:
                logger.error("No image data found in Eden AI response")
                logger.error(f"Response data: {data}")
                return False, "No image generated by Eden AI"
                
        except requests.exceptions.Timeout:
            logger.error("Eden AI image generation timeout")
            return False, "Eden AI image generation timed out. Please try again."
        except requests.exceptions.RequestException as e:
            logger.error(f"Eden AI image generation API error: {e}")
            return False, f"Eden AI API error: {str(e)}"
        except Exception as e:
            logger.error(f"Unexpected error in Eden AI image generation: {e}")
            return False, f"Unexpected error: {str(e)}"

    def _extract_image_data(self, infer_request):
        """Extract image data from inference request using multiple methods"""
        image_data = None
        
        # Method 1: Check if image is directly in output.images (base64)
        if "output" in infer_request and infer_request["output"]:
            output = infer_request["output"]
            
            # Check for images array
            if "images" in output and output["images"]:
                if isinstance(output["images"], list) and len(output["images"]) > 0:
                    image_data = output["images"][0]
                    logger.info("Found image data in output.images array")
                elif isinstance(output["images"], str):
                    image_data = output["images"]
                    logger.info("Found image data in output.images string")
            
            # Method 2: Check for image_url
            elif "image_url" in output:
                image_url = output["image_url"]
                logger.info(f"Found image URL: {image_url}")
                try:
                    logger.info("Downloading image from URL...")
                    img_response = requests.get(image_url, timeout=30)
                    img_response.raise_for_status()
                    
                    import base64
                    image_data = base64.b64encode(img_response.content).decode('utf-8')
                    logger.info("Successfully downloaded and encoded image from URL")
                    
                except Exception as e:
                    logger.error(f"Failed to download image from URL: {e}")
                    return None
            
            # Method 3: Check for any field containing "image"
            else:
                for key, value in output.items():
                    if "image" in key.lower() and value:
                        logger.info(f"Found potential image data in key: {key}")
                        if isinstance(value, str):
                            if value.startswith("data:image"):
                                # Data URL format
                                image_data = value.split(",")[1]  # Extract base64 part
                                logger.info("Extracted base64 image data from data URL")
                                break
                            elif len(value) > 100:  # Likely base64
                                image_data = value
                                logger.info("Found base64 image data")
                                break
                        elif isinstance(value, list) and len(value) > 0:
                            # Array of images
                            if isinstance(value[0], str) and len(value[0]) > 100:
                                image_data = value[0]
                                logger.info("Found base64 image data in array")
                                break
        
        return image_data

    def _extract_image_data_alternative(self, data):
        """Try alternative methods to extract image data from various response formats"""
        image_data = None
        
        # Method 1: Direct image key in root
        if "image" in data and data["image"]:
            image_data = data["image"]
            logger.info("Found image data in root.image")
        
        # Method 2: Images array in root
        elif "images" in data and data["images"]:
            if isinstance(data["images"], list) and len(data["images"]) > 0:
                image_data = data["images"][0]
                logger.info("Found image data in root.images array")
            elif isinstance(data["images"], str):
                image_data = data["images"]
                logger.info("Found image data in root.images string")
        
        # Method 3: Output or result key
        elif "output" in data:
            output = data["output"]
            if isinstance(output, str) and len(output) > 100:
                image_data = output
                logger.info("Found image data in root.output")
            elif isinstance(output, dict):
                for key, value in output.items():
                    if isinstance(value, str) and len(value) > 100:
                        image_data = value
                        logger.info(f"Found image data in root.output.{key}")
                        break
        
        # Method 4: Any top-level field that might contain image data
        else:
            for key, value in data.items():
                if isinstance(value, str) and len(value) > 100 and not key.lower() in ["error", "message", "status"]:
                    # Likely base64 image data
                    image_data = value
                    logger.info(f"Found potential image data in root.{key}")
                    break
        
        return image_data

    def _generate_image_fallback(self, prompt, width=512, height=512):
        """Fallback image generation using HuggingFace Inference API"""
        try:
            # Try HuggingFace Inference API as fallback
            hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
            if not hf_token:
                logger.info("No HuggingFace token available for fallback")
                return self._generate_placeholder_image(prompt)
            
            logger.info(f"Using HuggingFace Inference API for fallback image generation: {prompt}")
            
            # Use a free Stable Diffusion model on HuggingFace
            api_url = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5"
            headers = {"Authorization": f"Bearer {hf_token}"}
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "width": width,
                    "height": height,
                    "num_inference_steps": 20,
                    "guidance_scale": 7.5
                }
            }
            
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # HuggingFace returns image as bytes
            import base64
            image_data = base64.b64encode(response.content).decode('utf-8')
            
            logger.info("Successfully generated image using HuggingFace fallback")
            return True, {
                "image_data": image_data,
                "prompt": prompt,
                "source": "huggingface_fallback"
            }
            
        except Exception as e:
            logger.error(f"HuggingFace fallback failed: {e}")
            # Last resort - generate a placeholder image
            return self._generate_placeholder_image(prompt)

    def _generate_placeholder_image(self, prompt):
        """Generate a simple placeholder image when all else fails"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            import io
            import base64
            
            # Create a simple placeholder image
            width, height = 512, 512
            image = Image.new('RGB', (width, height), color='lightgray')
            draw = ImageDraw.Draw(image)
            
            # Try to use a default font, fallback to basic if not available
            try:
                font = ImageFont.truetype("arial.ttf", 24)
            except:
                font = ImageFont.load_default()
            
            # Wrap text
            text = f"Image placeholder for:\n{prompt}"
            lines = []
            words = text.split()
            current_line = []
            
            for word in words:
                test_line = " ".join(current_line + [word])
                bbox = draw.textbbox((0, 0), test_line, font=font)
                if bbox[2] <= width - 40:
                    current_line.append(word)
                else:
                    if current_line:
                        lines.append(" ".join(current_line))
                        current_line = [word]
                    else:
                        lines.append(word)
            
            if current_line:
                lines.append(" ".join(current_line))
            
            # Draw text
            total_height = len(lines) * 30
            start_y = (height - total_height) // 2
            
            for i, line in enumerate(lines):
                bbox = draw.textbbox((0, 0), line, font=font)
                text_width = bbox[2]
                x = (width - text_width) // 2
                y = start_y + i * 30
                draw.text((x, y), line, fill='black', font=font)
            
            # Convert to base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            image_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.info("Generated placeholder image")
            return True, {
                "image_data": image_data,
                "prompt": prompt,
                "source": "placeholder"
            }
            
        except Exception as e:
            logger.error(f"Failed to generate placeholder image: {e}")
            return False, "Image generation is currently unavailable. Please try again later."

    def check_image_status(self, request_id):
        """Check the status of an image generation request"""
        model_config = self.models[self.current_model]
        
        if model_config["type"] not in ["theta_image", "eden_image"]:
            return {"error": "Image status check is only available for image generation models"}
            
        if not model_config["api_key"]:
            return {"error": "No API key available for image generation"}
        
        # Eden AI doesn't support status checking - images are generated immediately
        if model_config["type"] == "eden_image":
            return {"error": "Eden AI generates images immediately, no status checking required"}
        
        # Construct status check URL for Theta API
        status_url = f"{model_config['url']}/status/{request_id}"
        
        try:
            logger.info(f"Checking image status for request: {request_id}")
            response = requests.get(status_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Image status response: {data}")
            
            # Parse status response
            if "state" in data:
                state = data["state"]
                if state in ["succeeded", "success", "completed"]:
                    # Image is ready, extract it
                    image_data = self._extract_image_data(data)
                    if image_data:
                        return {
                            "status": "completed",
                            "image_data": image_data,
                            "request_id": request_id
                        }
                    else:
                        return {
                            "status": "completed",
                            "error": "Image completed but no data found"
                        }
                elif state == "failed":
                    error_msg = data.get("error_message", "Unknown error")
                    return {
                        "status": "failed",
                        "error": error_msg
                    }
                else:
                    return {
                        "status": "processing",
                        "state": state
                    }
            else:
                return {"error": "Invalid status response format"}
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Image status check API error: {e}")
            return {"error": f"Failed to check image status: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error checking image status: {e}")
            return {"error": f"Unexpected error: {str(e)}"}

    def _generate_theta_text(self, messages, temperature, top_p, max_tokens):
        """Generate text using Theta Edge Cloud models"""
        model_config = self.models[self.current_model]
        logger.info(f"[DEBUG] Generating text with model: {self.current_model}")
        logger.info(f"[DEBUG] Model config: {model_config}")
        
        if not model_config["api_key"]:
            logger.error(f"[DEBUG] No API key available for Theta models")
            return False, "No API key available for Theta models"
        
        logger.info(f"[DEBUG] API key available: {bool(model_config['api_key'])}")
        logger.info(f"[DEBUG] API URL: {model_config['url']}")
        logger.info(f"[DEBUG] Headers: {self.headers}")
        logger.info(f"[DEBUG] Messages: {messages}")
            
        payload = {
            "input": {
                "messages": messages,
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens,
                "stream": False
            }
        }

        try:
            logger.info(f"[DEBUG] Making API request to: {model_config['url']}")
            logger.info(f"[DEBUG] Request payload: {payload}")
            
            response = requests.post(model_config["url"], headers=self.headers, json=payload, timeout=30)
            logger.info(f"[DEBUG] Response status: {response.status_code}")
            logger.info(f"[DEBUG] Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"[DEBUG] Response data: {data}")

            # Extract message from Theta response
            if "body" in data and "infer_requests" in data["body"]:
                infer_requests = data["body"]["infer_requests"]
                if infer_requests and len(infer_requests) > 0:
                    return True, infer_requests[0]["output"]["message"]
                else:
                    return False, "No response from Theta API"
            else:
                return False, "Unexpected response format from Theta API"
                
        except requests.exceptions.Timeout:
            return False, "Request timeout. The Theta API is taking too long to respond."
        except requests.exceptions.RequestException as e:
            return False, f"Theta API error: {str(e)}"
        except Exception as e:
            return False, f"Error generating text: {str(e)}"

    def _generate_openai_text(self, messages, temperature, max_tokens):
        """Generate text using OpenAI models"""
        model_config = self.models[self.current_model]
        if not model_config["api_key"]:
            return False, "No API key available for OpenAI models"
            
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            response = requests.post(model_config["url"], headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Extract message from OpenAI response
            if "choices" in data and len(data["choices"]) > 0:
                return True, data["choices"][0]["message"]["content"]
            else:
                return False, "No response from OpenAI API"
                
        except requests.exceptions.Timeout:
            return False, "Request timeout. The OpenAI API is taking too long to respond."
        except requests.exceptions.RequestException as e:
            return False, f"OpenAI API error: {str(e)}"
        except Exception as e:
            return False, f"Error generating text: {str(e)}"

# Global instance
multi_model_service = MultiModelService()
