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
                "description": "Advanced language model for complex reasoning"
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

    def get_available_models(self):
        """Get list of available models with their status"""
        available_models = []
        for model_id, config in self.models.items():
            if config["api_key"]:
                available_models.append({
                    "id": model_id,
                    "display_name": config["display_name"],
                    "description": config["description"],
                    "type": config["type"]
                })
        return available_models

    def switch_model(self, model_name):
        """Switch to a different model"""
        if model_name in self.models:
            if not self.models[model_name]["api_key"]:
                logger.error(f"No API key available for {model_name}")
                return False, f"No API key available for {model_name}"
                
            self.current_model = model_name
            self._update_headers()
            logger.info(f"Switched to model: {model_name}")
            return True, f"Successfully switched to {self.models[model_name]['display_name']}"
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

    def generate_text(self, messages, temperature=0.5, top_p=0.7, max_tokens=500):
        """Generate text response using current model"""
        model_config = self.models[self.current_model]
        
        if model_config["type"] == "theta":
            return self._generate_theta_text(messages, temperature, top_p, max_tokens)
        elif model_config["type"] == "openai":
            return self._generate_openai_text(messages, temperature, max_tokens)
        else:
            return False, f"Text generation not supported by {self.current_model}"

    def generate_image(self, prompt, width=512, height=512, steps=25, cfg_scale=8, seed=None):
        """Generate image using Stable Diffusion"""
        if self.current_model != "stable_diffusion_turbo_vision":
            return False, "Image generation is only available with Stable Diffusion models"
            
        model_config = self.models[self.current_model]
        if not model_config["api_key"]:
            return False, "No API key available for image generation"
        
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
            response = requests.post(model_config["url"], headers=self.headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Image generation response: {data}")
            
            # Extract image data from response
            if "body" in data and "infer_requests" in data["body"]:
                infer_requests = data["body"]["infer_requests"]
                if infer_requests and len(infer_requests) > 0:
                    infer_request = infer_requests[0]
                    # Store request ID for status checking
                    self._last_request_id = infer_request.get("id")
                    
                    if infer_request.get("state") == "processing":
                        # Image is still processing - this is normal for Theta API
                        logger.info("Image is still being generated by Theta API. This usually takes 30-60 seconds.")
                        return False, "Image generation is taking longer than expected. Please try again in a few moments."
                    
                    if infer_request.get("state") == "failed":
                        error_msg = infer_request.get("error_message", "Unknown error")
                        return False, f"Image generation failed: {error_msg}"
                    
                    if infer_request.get("state") in ["succeeded", "success"]:
                        # Try to get image from different possible locations
                        image_data = None
                        
                        # Method 1: Check if image is directly in output.images (base64)
                        if "output" in infer_request and infer_request["output"]:
                            if "images" in infer_request["output"] and infer_request["output"]["images"]:
                                image_data = infer_request["output"]["images"][0]
                        
                        # Method 2: Check if image is available as URL
                        if not image_data and "output" in infer_request and infer_request["output"]:
                            if "image_url" in infer_request["output"]:
                                image_url = infer_request["output"]["image_url"]
                                logger.info(f"Found image URL: {image_url}")
                                
                                try:
                                    logger.info(f"Downloading image from URL...")
                                    img_response = requests.get(image_url, timeout=30)
                                    img_response.raise_for_status()
                                    
                                    import base64
                                    image_data = base64.b64encode(img_response.content).decode('utf-8')
                                    logger.info(f"Successfully downloaded image from URL")
                                    
                                except Exception as e:
                                    logger.error(f"Failed to download image from URL: {e}")
                                    return False, f"Failed to download generated image: {str(e)}"
                        
                        if image_data:
                            return True, {
                                "image_data": image_data,
                                "seed": seed,
                                "prompt": prompt
                            }
                        else:
                            return False, "Image generation succeeded but no image data found"
                    else:
                        return False, f"Image generation status: {infer_request.get('state')}"
                else:
                    return False, "No inference requests in response"
            else:
                return False, "Unexpected response format from image generation API"
                
        except requests.exceptions.Timeout:
            return False, "Image generation timeout. The API is taking too long to respond."
        except requests.exceptions.RequestException as e:
            return False, f"Image generation API error: {str(e)}"
        except Exception as e:
            logger.error(f"Unexpected error in image generation: {e}")
            return False, f"Unexpected error: {str(e)}"

    def _generate_theta_text(self, messages, temperature, top_p, max_tokens):
        """Generate text using Theta Edge Cloud models"""
        model_config = self.models[self.current_model]
        if not model_config["api_key"]:
            return False, "No API key available for Theta models"
            
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
            response = requests.post(model_config["url"], headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()

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
