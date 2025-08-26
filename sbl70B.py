# === Imports ===
import os
import pathlib
import json
import pytesseract
from PIL import Image
#import whisper
from faster_whisper import WhisperModel
import docx
import pandas as pd
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
import tiktoken
import time

from langchain_core.runnables import Runnable, RunnableConfig

#from langchain_community.llms import Ollama
from langchain_ollama import OllamaLLM
#from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain, LLMChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema.messages import messages_from_dict, messages_to_dict
import gradio as gr
import requests
import logging

# Setup logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# === Custom CSS for Modern UI ===
CUSTOM_CSS = ""

# === Environment & Constants ===
load_dotenv()
book_folder = "books"
vectorstore_path = "vectorstore_llama3"
user_db_path = "users.json"
indexed_file_path = "indexed_files.json"
USERNAME = os.getenv("STUDYBUDDY_USER")
PASSWORD = os.getenv("STUDYBUDDY_PASS")

# Check required API keys
THETA_API_KEY = os.getenv("THETA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not THETA_API_KEY:
    logger.warning("⚠️ THETA_API_KEY not found. Theta models (Llama 70B, Deepseek R1, Stable Diffusion) will not work.")
if not OPENAI_API_KEY:
    logger.warning("⚠️ OPENAI_API_KEY not found. GPT-3.5 Turbo will not work.")

os.makedirs(book_folder, exist_ok=True)
os.makedirs(vectorstore_path, exist_ok=True)

book_content_blob = {}  # {username: text_blob}

# === Multi-Model LLM Class ===
class MultiModelLLM(Runnable):
    def __init__(self, model_name="llama_3_1_70b", temperature=0.5, top_p=0.7, max_tokens=500):
        self.model_name = model_name
        self.temperature = temperature
        self.top_p = top_p
        self.max_tokens = max_tokens
        
        # Model configurations
        self.models = {
            "llama_3_1_70b": {
                "url": "https://ondemand.thetaedgecloud.com/infer_request/llama_3_1_70b/completions",
                "api_key": os.getenv("THETA_API_KEY"),
                "type": "theta"
            },
            "deepseek_r1": {
                "url": "https://ondemand.thetaedgecloud.com/infer_request/deepseek_r1/completions",
                "api_key": os.getenv("THETA_API_KEY"),
                "type": "theta"
            },
            "gpt_3_5_turbo": {
                "url": "https://api.openai.com/v1/chat/completions",
                "api_key": os.getenv("OPENAI_API_KEY"),
                "type": "openai"
            },
            "stable_diffusion_turbo_vision": {
                "url": "https://ondemand.thetaedgecloud.com/infer_request/stable_diffusion_turbo_vision",
                "api_key": os.getenv("THETA_API_KEY"),
                "type": "theta_image"
            }
        }
        
        self.current_model = self.models.get(model_name, self.models["llama_3_1_70b"])
        self._update_headers()

    def _update_headers(self):
        if self.current_model["type"] == "theta":
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.current_model['api_key']}"
            }
        elif self.current_model["type"] == "openai":
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.current_model['api_key']}"
            }
        elif self.current_model["type"] == "theta_image":
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.current_model['api_key']}"
            }

    def switch_model(self, model_name):
        """Switch to a different model"""
        if model_name in self.models:
            # Check if API key is available for this model
            if not self.models[model_name]["api_key"]:
                logger.error(f"❌ No API key available for {model_name}")
                return False
                
            self.model_name = model_name
            self.current_model = self.models[model_name]
            self._update_headers()
            logger.info(f"🔄 Switched to model: {model_name}")
            return True
        else:
            logger.warning(f"❌ Unknown model: {model_name}")
            return False

    def invoke(self, input, config: RunnableConfig | None = None, **kwargs):
        if isinstance(input, dict) and "question" in input:
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": input["question"]}
            ]
        elif isinstance(input, list):
            messages = input
        else:
            messages = [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": str(input)}
            ]

        try:
            if self.current_model["type"] == "theta":
                return self._invoke_theta(messages)
            elif self.current_model["type"] == "openai":
                return self._invoke_openai(messages)
            elif self.current_model["type"] == "theta_image":
                # For image models, we need to handle text input differently
                if isinstance(input, dict) and "question" in input:
                    # If it's a question, we can't generate images from text queries
                    return "⚠️ This is an image generation model. Use generate_image() method for image creation, or switch to a text model for chat."
                elif isinstance(input, list):
                    # If it's a list of messages, we can't generate images from chat
                    return "⚠️ This is an image generation model. Use generate_image() method for image creation, or switch to a text model for chat."
                else:
                    # For other inputs, try to convert to string and use as image prompt
                    prompt = str(input)
                    return self.generate_image(prompt)
            else:
                return f"⚠️ Unknown model type: {self.current_model['type']}"
        except Exception as e:
            logger.error(f"[{self.model_name.upper()} ERROR] {e}")
            return f"⚠️ Error from {self.model_name} API"

    def _invoke_theta(self, messages):
        """Handle Theta Edge Cloud models (Llama 70B, Deepseek R1)"""
        if not self.current_model["api_key"]:
            return "⚠️ No API key available for Theta models. Please set THETA_API_KEY in your .env file."
            
        payload = {
            "input": {
                "messages": messages,
                "temperature": self.temperature,
                "top_p": self.top_p,
                "max_tokens": self.max_tokens,
                "stream": False
            }
        }

        try:
            response = requests.post(self.current_model["url"], headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Extract message from Theta response
            return data["body"]["infer_requests"][0]["output"]["message"]
        except requests.exceptions.Timeout:
            return "⚠️ Request timeout. The Theta API is taking too long to respond."
        except requests.exceptions.RequestException as e:
            return f"⚠️ Theta API error: {str(e)}"
        except KeyError as e:
            return f"⚠️ Unexpected response format from Theta API: {str(e)}"

    def _invoke_openai(self, messages):
        """Handle OpenAI models (GPT-3.5)"""
        if not self.current_model["api_key"]:
            return "⚠️ No API key available for OpenAI models. Please set OPENAI_API_KEY in your .env file."
            
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }

        try:
            response = requests.post(self.current_model["url"], headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()

            # Extract message from OpenAI response
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.Timeout:
            return "⚠️ Request timeout. The OpenAI API is taking too long to respond."
        except requests.exceptions.RequestException as e:
            return f"⚠️ OpenAI API error: {str(e)}"
        except KeyError as e:
            return f"⚠️ Unexpected response format from OpenAI API: {str(e)}"

    def generate_image(self, prompt, width=512, height=512, steps=25, cfg_scale=8, seed=None):
        """Generate image using Stable Diffusion Turbo Vision"""
        if self.current_model["type"] != "theta_image":
            return "⚠️ Image generation is only available with Stable Diffusion models."
            
        if not self.current_model["api_key"]:
            return "⚠️ No API key available for image generation. Please set THETA_API_KEY in your .env file."
        
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
            "wait": 30  # Wait up to 30 seconds for response
        }

        try:
            response = requests.post(self.current_model["url"], headers=self.headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            
            # Debug: Log the response structure
            logger.info(f"Image generation response: {data}")
            
            # Extract image data from response
            if "body" in data and "infer_requests" in data["body"]:
                infer_requests = data["body"]["infer_requests"]
                if infer_requests and len(infer_requests) > 0:
                    infer_request = infer_requests[0]
                    
                    # Check if image is still processing
                    if infer_request.get("state") == "processing":
                        return "⚠️ Image is still being generated. Please wait a moment and try again."
                    
                    # Check if image generation failed
                    if infer_request.get("state") == "failed":
                        error_msg = infer_request.get("error_message", "Unknown error")
                        return f"⚠️ Image generation failed: {error_msg}"
                    
                    # Check if image is ready
                    if infer_request.get("state") == "succeeded" or infer_request.get("state") == "success":
                        # Try to get image from different possible locations
                        image_data = None
                        
                        # Method 1: Check if image is directly in output.images (base64)
                        if "output" in infer_request and infer_request["output"]:
                            if "images" in infer_request["output"] and infer_request["output"]["images"]:
                                image_data = infer_request["output"]["images"][0]
                        
                        # Method 2: Check if image is available as URL (new Theta API format)
                        if not image_data and "output" in infer_request and infer_request["output"]:
                            if "image_url" in infer_request["output"]:
                                image_url = infer_request["output"]["image_url"]
                                logger.info(f"Found image URL: {image_url}")
                                
                                # Download the image from the URL
                                try:
                                    logger.info(f"Attempting to download image from URL...")
                                    img_response = requests.get(image_url, timeout=30)
                                    img_response.raise_for_status()
                                    logger.info(f"Image download successful. Status: {img_response.status_code}, Content-Type: {img_response.headers.get('content-type')}, Size: {len(img_response.content)} bytes")
                                    
                                    # Convert to base64
                                    import base64
                                    image_data = base64.b64encode(img_response.content).decode('utf-8')
                                    logger.info(f"Successfully downloaded image from URL and converted to base64. Base64 length: {len(image_data)}")
                                    
                                except Exception as e:
                                    logger.error(f"Failed to download image from URL: {e}")
                                    return f"⚠️ Failed to download generated image: {str(e)}"
                        
                        # Method 3: Check if image is in a different field
                        if not image_data and "output" in infer_request:
                            # Log the output structure to debug
                            logger.info(f"Output structure: {infer_request['output']}")
                            
                            # Try to find any base64 encoded data
                            output_str = str(infer_request["output"])
                            if "data:image" in output_str or "base64" in output_str.lower():
                                # Extract base64 data
                                import re
                                base64_match = re.search(r'data:image/[^;]+;base64,([^"]+)', output_str)
                                if base64_match:
                                    image_data = base64_match.group(1)
                        
                        if image_data:
                            return image_data
                        else:
                            logger.warning(f"No image data found in successful response: {infer_request}")
                            return "⚠️ Image generation succeeded but no image data found. The API might need more time to process the image."
                    else:
                        logger.warning(f"Unexpected infer_request state: {infer_request.get('state')}")
                        return f"⚠️ Image generation status: {infer_request.get('state')}"
                else:
                    logger.warning("No infer_requests found in response")
                    return "⚠️ No inference requests in response"
            else:
                logger.warning(f"Unexpected response structure: {data}")
                return "⚠️ Unexpected response format from image generation API"
                
        except requests.exceptions.Timeout:
            return "⚠️ Image generation timeout. The API is taking too long to respond."
        except requests.exceptions.RequestException as e:
            return f"⚠️ Image generation API error: {str(e)}"
        except KeyError as e:
            return f"⚠️ Unexpected response format from image generation API: {str(e)}"
        except Exception as e:
            logger.error(f"Unexpected error in image generation: {e}")
            return f"⚠️ Unexpected error: {str(e)}"

    def batch(self, inputs, config: RunnableConfig | None = None, **kwargs):
        return [self.invoke(input_, config=config, **kwargs) for input_ in inputs]





# === User Handling ===
def load_users():
    if os.path.exists(user_db_path):
        with open(user_db_path, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(user_db_path, 'w') as f:
        json.dump(users, f)

users = load_users()

# === Indexed Files Handling ===
def load_indexed_files():
    if os.path.exists(indexed_file_path):
        with open(indexed_file_path, 'r') as f:
            data = json.load(f)
            if isinstance(data, list):
                return set(data)
            return set(data.get("indexed_files", []))
    return set()

def save_indexed_files(indexed_files):
    with open(indexed_file_path, 'w') as f:
        json.dump({"indexed_files": list(indexed_files)}, f, indent=2)

indexed_files = load_indexed_files()


encoding = tiktoken.get_encoding("cl100k_base")  # works for most models
def get_token_count(text: str) -> int:
    return len(encoding.encode(text))


def safe_prompt_input(prompt_str, max_tokens=6000):
    while get_token_count(prompt_str) > max_tokens:
        lines = prompt_str.split("\n")
        prompt_str = "\n".join(lines[2:])
    return prompt_str


# === Authentication ===
def auth_signup(username, password):
    if username in users:
        return False
    users[username] = password
    save_users(users)
    return True

def auth_signin(username, password):
    return users.get(username) == password

# === Embedding & VectorStore ===
#embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/multi-qa-mpnet-base-dot-v1")

faiss_index_file = os.path.join(vectorstore_path, "index.faiss")
if os.path.exists(faiss_index_file):
    logger.info("Loading existing vectorstore...")
    vectorstore = FAISS.load_local(vectorstore_path, embeddings, allow_dangerous_deserialization=True)
else:
    logger.warning("No FAISS index found. Will create new vectorstore on first file upload.")
    vectorstore = None


def ingest_books_folder():
    logger.info("Scanning for new files in books/ ...")
    all_docs = []
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    global indexed_files
    model = WhisperModel("base")

    for filename in os.listdir(book_folder):
        if filename in indexed_files:
            continue

        file_path = os.path.join(book_folder, filename)
        ext = filename.lower().split(".")[-1]

        try:
            logger.info(f"Ingesting {filename} ...")

            if ext == "pdf":
                loader = PyPDFLoader(file_path)
                pages = loader.load()
                all_docs.extend(splitter.split_documents(pages))

            elif ext in ["jpg", "jpeg", "png"]:
                text = pytesseract.image_to_string(Image.open(file_path))
                all_docs.extend(splitter.create_documents([text]))

            elif ext in ["mp3", "wav", "m4a"]:
                segments, info = model.transcribe(file_path)
                result_text = " ".join([segment.text for segment in segments])
                all_docs.extend(splitter.create_documents([result_text]))

            elif ext == "docx":
                doc = docx.Document(file_path)
                text = "\n".join([para.text for para in doc.paragraphs])
                all_docs.extend(splitter.create_documents([text]))

            elif ext in ["xlsx", "xls"]:
                df = pd.read_excel(file_path, engine="openpyxl" if ext == "xlsx" else "xlrd")
                text = df.to_csv(index=False)
                all_docs.extend(splitter.create_documents([text]))

            else:
                logger.warning(f"Unsupported file type: {filename}")
                continue

            indexed_files.add(filename)

        except Exception as e:
            logger.error(f"Failed to ingest {filename}: {e}")

    if all_docs:
        global vectorstore
        if vectorstore is None:
            vectorstore = FAISS.from_documents(all_docs, embeddings)
        else:
            vectorstore.add_documents(all_docs)
        vectorstore.save_local(vectorstore_path)
        save_indexed_files(indexed_files)
        logger.info(f"Ingested {len(all_docs)} chunks.")

ingest_books_folder()

if vectorstore is not None:
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
else:
    retriever = None

#retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
#llm = Ollama(model="llama3", temperature=0)
#llm = OllamaLLM(model="llama3", temperature=0)
""" llm = ChatOpenAI(
    model_name="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    base_url="https://api.together.xyz/v1",
    openai_api_key=os.getenv("TOGETHER_API_KEY"),
    temperature=0,
    max_tokens=512
) """

llm = MultiModelLLM(
    model_name="llama_3_1_70b",
    temperature=0.5,
    top_p=0.7,
    max_tokens=500
)


# === Memory ===
class UserMemory(ConversationBufferMemory):
    class Config:
        arbitrary_types_allowed = True
        extra = "allow"

    def __init__(self, username, **kwargs):
        super().__init__(memory_key="chat_history", return_messages=True, **kwargs)
        object.__setattr__(self, "username", username)
        object.__setattr__(self, "file_path", f"chat_memory_{username}.json")
        self._load()

    def _load(self):
        if os.path.exists(self.file_path):
            with open(self.file_path, "r") as f:
                self.chat_memory.messages = messages_from_dict(json.load(f))

    def save_context(self, inputs, outputs):
        super().save_context(inputs, outputs)
        with open(self.file_path, "w") as f:
            json.dump(messages_to_dict(self.chat_memory.messages), f, indent=2)

# === Profile Detection ===
def extract_user_profile(chat_history, default_name="User"):
    profile = {"name": default_name, "interests": set()}
    for msg in chat_history:
        if hasattr(msg, "content") and isinstance(msg.content, str):
            text = msg.content.lower()
            if "my name is" in text:
                name = text.split("my name is")[1].split()[0].capitalize()
                profile["name"] = name
            if "i like" in text or "i am interested in" in text:
                interest = text.split("in")[-1].strip().capitalize()
                profile["interests"].add(interest)
    return profile

# === Prompts ===
plain_prompt = PromptTemplate.from_template(
    "You are a helpful assistant. Continue the following conversation with clarity and consistency.\n\n"
    "Chat History:\n{chat_history}\n\nUser: {question}\nAssistant:"
)

#book_prompt = PromptTemplate.from_template(
#    "You are a knowledgeable assistant that understands context in both Tamil and English.\n"
#    "Use the following context from books or files, as well as the conversation so far.\n\n"
#    "Context:\n{context}\n\nChat History:\n{chat_history}\n\nUser: {question}\nAssistant:"
#)

book_prompt = PromptTemplate.from_template("""
You are a smart tutor assistant. When the book context is available, use it to answer the user's question. If the context is insufficient, use your own knowledge and continue helping the user as best as you can.

Context:
{context}

Chat History:
{chat_history}

User: {question}
Assistant:""")



# === Upload Handler ===
def handle_file_upload(file, chat_history=None, username=None):
    global indexed_files
    try:
        filename = os.path.basename(file.name)
        if filename in indexed_files:
            return chat_history + [{"role": "user", "content": f"📎 Skipped duplicate upload `{filename}`"}, {"role": "assistant", "content": "This file is already indexed."}]

        save_path = os.path.join(book_folder, filename)
        with open(save_path, "wb") as f_out, open(file.name, "rb") as f_in:
            f_out.write(f_in.read())

        ext = filename.lower().split(".")[-1]
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        model = WhisperModel("base")

        if ext == "pdf":
            loader = PyPDFLoader(save_path)
            pages = loader.load()
            chunks = splitter.split_documents(pages)
            cleaned_pages = [p.page_content for p in pages if len(p.page_content.strip()) > 50]
            text_blob = "\n".join(cleaned_pages[:100])
            book_content_blob[username] = text_blob
            logger.info(f"book_content_blob[{username}]: {book_content_blob.get(username, '')}")
            logger.info(f"🧠 Collected preview for study plan generation: {len(text_blob.strip())} characters for user {username}")
            logger.debug(f"[TEXT_BLOB PREVIEW] {text_blob[:500]}...")

        elif ext in ["jpg", "jpeg", "png"]:
            text = pytesseract.image_to_string(Image.open(save_path))
            chunks = splitter.create_documents([text])
            text_blob = text
        elif ext in ["mp3", "wav", "m4a"]:
            segments, info = model.transcribe(save_path)
            result_text = " ".join([segment.text for segment in segments])
            chunks = splitter.create_documents([result_text])
            text_blob = result_text[:2000]
        elif ext == "docx":
            doc = docx.Document(save_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            chunks = splitter.create_documents([text])
            text_blob = text[:2000]
        elif ext in ["xlsx", "xls"]:
            df = pd.read_excel(save_path, engine="openpyxl" if ext == "xlsx" else "xlrd")
            text = df.to_csv(index=False)
            chunks = splitter.create_documents([text])
            text_blob = text[:2000]
        else:
            return chat_history + [{"role": "user", "content": f"📎 Unsupported file type: `{filename}`"}, {"role": "assistant", "content": "Currently only PDF, image, audio, Word and Excel files are supported."}]

        global vectorstore, retriever
        if vectorstore is None:
            vectorstore = FAISS.from_documents(chunks, embeddings)
        else:
            vectorstore.add_documents(chunks)

        vectorstore.save_local(vectorstore_path)
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

        indexed_files.add(filename)
        save_indexed_files(indexed_files)
        logger.info(f"indexed_files updated: {sorted(indexed_files)}")

        summary_prompt = f"Summarize the following content from the file '{filename}':\n{text_blob}"
        summary_chain = LLMChain(llm=llm, prompt=plain_prompt)
        summary = summary_chain.invoke({"question": summary_prompt,"chat_history": ""}).get("text", "")

        return chat_history + [{"role": "user", "content": f"📎 Uploaded `{filename}`"}, {"role": "assistant", "content": summary}]

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return chat_history + [{"role": "user", "content": "📎 Upload Error"}, {"role": "assistant", "content": str(e)}]

# === Chat Interface Per User ===
def get_chat_interface_for_user(username):
    memory = UserMemory(username=username)
    if retriever is None:
        logger.warning(f"[SKIP] No retriever ready for user {username}. Prompt user to upload a file.")
        def no_file_chat_fn(message, history):
            return history + [
                {"role": "assistant", "content": "⚠️ No files have been indexed yet. Please upload a book or file first."}
            ]
        return no_file_chat_fn
    qa_chain = ConversationalRetrievalChain.from_llm(llm=llm, retriever=retriever, memory=memory, combine_docs_chain_kwargs={"prompt": book_prompt})
    #simple_chain = LLMChain(llm=llm, prompt=plain_prompt, memory=memory)
    simple_chain = plain_prompt | llm
    #simple_chain = plain_prompt | llm | memory

    def chat_interface(message, history, selected_model=None):
        # Handle model switching if a new model is selected
        if selected_model and selected_model != llm.model_name:
            success = llm.switch_model(selected_model)
            if success:
                logger.info(f"🔄 Switched to {selected_model} for user {username}")
            else:
                logger.warning(f"❌ Failed to switch to {selected_model} for user {username}")
        
        chat_history = memory.chat_memory.messages
        profile = extract_user_profile(chat_history, default_name=username.capitalize())
        user_name = profile["name"]
        context_prefix = f"User Name: {profile['name']}\n"
    
        if message.lower().strip() in ["hi", "hello", "hey", "yo", "hi there"]:
            return f"Hi {user_name}! 👋 How can I assist you today?"
        
        if "schedule" in message.lower() or "study plan" in message.lower():
            logger.info(f"🗓️ User {username} asked for a study schedule")
            
            text_preview = book_content_blob.get(username, "")
            logger.info(f"[BOOK_BLOB FETCHED] {len(text_preview.strip())} characters for user {username}")
            logger.debug(f"[BOOK_BLOB SAMPLE] {text_preview[:500]}...")
            
            if not text_preview or len(text_preview.strip()) < 300:
                logger.warning(f"[SKIPPED] Study plan generation skipped for {username}: insufficient content")
                return "⚠️ This file doesn't contain enough clear content to generate a study plan. Try another or check the content pages."

            # Prompt LLM to generate plan
            prompt = f"""
            You are an educational assistant. Based on the following textbook content, create a structured study plan.
            Dynamically decide the number of study days based on content complexity and length.
            For each day, give a clear Day-wise breakdown with short informative descriptions.

            TEXT:
            {safe_prompt_input(text_preview, 6000)}
            """

            try:
                result = llm.invoke({"question": prompt})
                logger.info(f"[✅ SUCCESS] Study plan generated for user {username}")
                return result
            except Exception as e:
                logger.error(f"[ERROR] Study plan generation failed for {username}: {e}")
                return "⚠️ An error occurred while generating the study plan. Please try again later."


        if profile["interests"]:
            context_prefix += f"User Interests: {', '.join(profile['interests'])}\n"
        updated_message = f"{context_prefix}Question: {message}"

        # ✅ Prepare readable chat history string for prompt injection
        chat_history_str = "\n".join(
            [f"User: {msg.content}" if msg.type == "human" else f"Assistant: {msg.content}"
            for msg in chat_history[-6:] if hasattr(msg, "type") and hasattr(msg, "content")]
        )


        keywords = ["explain", "chapter", "lesson", "book", "pdf", "context", "derive", "summarize", "science", "history", "english", "math"]
        #docs = retriever.get_relevant_documents(updated_message)
        docs = retriever.invoke(updated_message)

        if docs:
            result = qa_chain.invoke({
                "question": updated_message,
                "chat_history": chat_history_str
            })
            return result.get("answer", str(result))
        else:
            logger.info(f"[⚠️ Fallback] Using AI model")
            response = llm.invoke([
                {"role": "system", "content": "You are a helpful teacher assistant. Answer clearly and truthfully."},
                {"role": "user", "content": updated_message}
            ])
            return response.content



    return chat_interface

# === Mic Transcription Handler ===
def transcribe_and_ask(audio_path, history, chat_fn, selected_model=None):
    try:
        if audio_path:
            model = WhisperModel("base")
            segments, info = model.transcribe(audio_path)
            question = " ".join([segment.text for segment in segments])
            logger.info(f"[MIC INPUT] Transcribed: {question}")

            if callable(chat_fn):
                # Get the assistant response as string with model selection
                answer = chat_fn(question, history, selected_model)
                return history + [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer}
                ]
            else:
                return history + [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": "⚠️ Mic input received before login. Please try again after signing in."}
                ]
        return history
    except Exception as e:
        return history + [
            {"role": "user", "content": "🎤 Mic Error"},
            {"role": "assistant", "content": str(e)}
        ]


# === Login UI ===
def login_ui():
    def login_or_signup(action, username, password):
        if action == "Sign In":
            if auth_signin(username, password):
                return "✅ Welcome back!", gr.update(visible=True), get_chat_interface_for_user(username)
            else:
                return "❌ Invalid credentials.", gr.update(visible=False), None
        else:
            if auth_signup(username, password):
                return "✅ Account created!", gr.update(visible=True), get_chat_interface_for_user(username)
            else:
                return "❌ User already exists.", gr.update(visible=False), None

    with gr.Blocks(theme=gr.themes.Soft(), title="🚀 Sane Bot ") as demo:
        # Simple Header
        gr.Markdown("### 🚀 Sane Bot")
        
        # Model information
        if THETA_API_KEY and OPENAI_API_KEY:
            gr.Markdown("**🤖 Available AI Models:** 🦙 Llama 3.1 70B | 🔍 Deepseek R1 | 🤖 GPT-3.5 Turbo")
        elif THETA_API_KEY:
            gr.Markdown("**🤖 Available AI Models:** 🦙 Llama 3.1 70B | 🔍 Deepseek R1")
        elif OPENAI_API_KEY:
            gr.Markdown("**🤖 Available AI Models:** 🤖 GPT-3.5 Turbo")
        else:
            gr.Markdown("**⚠️ Configuration Required:** Please set THETA_API_KEY and/or OPENAI_API_KEY in your .env file")

        # Check available models based on API keys
        available_models = []

        if THETA_API_KEY:
            available_models.extend(["llama_3_1_70b", "deepseek_r1", "stable_diffusion_turbo_vision"])

        if OPENAI_API_KEY:
            available_models.append("gpt_3_5_turbo")

        if not available_models:
            available_models = ["llama_3_1_70b"]  # Fallback
        
        selected_model_state = gr.State(value=available_models[0])
        
        # Login Form Section
        with gr.Row():
            with gr.Column(scale=1):
                gr.Markdown("### 🔐 Authentication")
                
                action = gr.Radio(
                    ["Sign In", "Sign Up"], 
                    label="🎯 Choose Action", 
                    value="Sign In"
                )
                username = gr.Textbox(
                    label="👤 Username", 
                    placeholder="Enter your username"
                )
                password = gr.Textbox(
                    label="🔒 Password", 
                    type="password",
                    placeholder="Enter your password"
                )
                submit_btn = gr.Button("🚀 Get Started!")
                output = gr.Textbox(
                    label="📊 Status", 
                    interactive=False
                )

            with gr.Column(scale=2):
                chat_container = gr.Column(visible=False)
                with chat_container:
                    gr.Markdown("### 🤖 AI Model Selection")
                    
                    # Model selection dropdown - only show available models
                    model_dropdown = gr.Dropdown(
                        choices=available_models,
                        value=available_models[0],
                        label="🎯 Select AI Model",
                        info="Choose your preferred AI model for responses"
                    )
                    
                    # Current model status display
                    initial_model = available_models[0]
                    model_labels = {
                        "llama_3_1_70b": "🦙 Llama 3.1 70B",
                        "deepseek_r1": "🔍 Deepseek R1",
                        "gpt_3_5_turbo": "🤖 GPT-3.5 Turbo",
                        "stable_diffusion_turbo_vision": "🎨 Stable Diffusion Turbo Vision"
                    }
                    initial_status = f"**Current Model:** {model_labels.get(initial_model, initial_model)}"
                    model_status = gr.Markdown(initial_status, label="📊 Model Status")
                    
                    gr.Markdown("### 📁 File Management")
                    
                    file_uploader = gr.File(
                        label="📎 Upload Document", 
                        file_types=[".pdf", ".jpg", ".jpeg", ".png", ".mp3", ".wav", ".m4a", ".docx", ".xlsx", ".xls"]
                    )
                    
                    gr.Markdown("### 🎨 Image Generation")
                    
                    gr.Markdown("**💡 Tip:** Select '🎨 Stable Diffusion Turbo Vision' from the model dropdown above to enable image generation!")
                    
                    with gr.Row():
                        with gr.Column(scale=2):
                            image_prompt = gr.Textbox(
                                label="🎨 Image Prompt",
                                placeholder="Describe the image you want to generate...",
                                lines=2
                            )
                        with gr.Column(scale=1):
                            image_width = gr.Slider(
                                minimum=256, maximum=1024, value=512, step=64,
                                label="📏 Width"
                            )
                            image_height = gr.Slider(
                                minimum=256, maximum=1024, value=512, step=64,
                                label="📐 Height"
                            )
                    
                    with gr.Row():
                        with gr.Column(scale=1):
                            image_steps = gr.Slider(
                                minimum=10, maximum=50, value=25, step=1,
                                label="🔄 Steps"
                            )
                            image_cfg_scale = gr.Slider(
                                minimum=1, maximum=20, value=8, step=0.5,
                                label="⚖️ CFG Scale"
                            )
                        with gr.Column(scale=1):
                            image_seed = gr.Number(
                                label="🎲 Seed (optional)",
                                value=None,
                                info="Leave empty for random"
                            )
                            generate_image_btn = gr.Button("🎨 Generate Image", variant="primary")
                    generated_image = gr.Gallery(
                        label="🎨 Generated Images",
                        columns=2,
                        object_fit="contain",
                        height="auto"
                    )
                    
                    
                    gr.Markdown("### 🎤 Voice Interaction")
                    
                    mic_input = gr.Audio(
                        type="filepath", 
                        label="🎤 Speak a Question"
                    )
                    
                    gr.Markdown("### 💬 AI Chat Interface")
                    
                    chat_ui = gr.ChatInterface(
                        fn=None, 
                        chatbot=gr.Chatbot(label="💬 Chat with AI"), 
                        fill_height=True, 
                        type="messages",
                        additional_inputs=[selected_model_state]
                    )
                    
                    chat_fn_state = gr.State(value=None)

                    mic_input.change(
                        fn=lambda audio, history, chat_fn, model: transcribe_and_ask(audio, history, chat_fn, model),
                        inputs=[mic_input, chat_ui.chatbot, chat_fn_state, selected_model_state],
                        outputs=chat_ui.chatbot
                    )

        def handle_submit(act, user, pwd):
            msg, visible, fn = login_or_signup(act, user, pwd)
            # Create a wrapper function that includes model selection
            def chat_with_model(message, history, model_state):
                return fn(message, history, model_state)
            chat_ui.fn = chat_with_model
            chat_fn_state.value = fn  # ✅ update state for mic use
            return msg, visible

        submit_btn.click(handle_submit, inputs=[action, username, password], outputs=[output, chat_container])
        
        # Update the selected model when dropdown changes
        def update_model_status(model_name):
            model_labels = {
                "llama_3_1_70b": "🦙 Llama 3.1 70B",
                "deepseek_r1": "🔍 Deepseek R1",
                "gpt_3_5_turbo": "🤖 GPT-3.5 Turbo",
                "stable_diffusion_turbo_vision": "🎨 Stable Diffusion Turbo Vision"
            }
            status_text = f"**Current Model:** {model_labels.get(model_name, model_name)}"
            return status_text, model_name  # Return both status and model name
        
        model_dropdown.change(
            fn=update_model_status,
            inputs=[model_dropdown],
            outputs=[model_status, selected_model_state]
        )
        
        # Add loading animation for file upload
        file_uploader.upload(
            fn=lambda file, history, user: handle_file_upload(file, history, user),
            inputs=[file_uploader, chat_ui.chatbot, username],
            outputs=chat_ui.chatbot
        )
        
        # Image generation function - CLEAN AND SIMPLE
        def generate_image_with_model(prompt, width, height, steps, cfg_scale, seed, model_state):
            if not prompt or prompt.strip() == "":
                return [], [{"role": "user", "content": "🎨 Image Generation Request"}, {"role": "assistant", "content": "⚠️ Please enter an image prompt."}]
            
            # Check if the selected model supports image generation
            if model_state != "stable_diffusion_turbo_vision":
                return [], [{"role": "user", "content": "🎨 Image Generation Request"}, {"role": "assistant", "content": "⚠️ Image generation is only available with Stable Diffusion Turbo Vision model. Please select it from the dropdown."}]
            
            # Create a temporary MultiModelLLM instance for image generation
            temp_llm = MultiModelLLM(model_name=model_state)
            
            # Generate the image
            result = temp_llm.generate_image(
                prompt=prompt,
                width=int(width),
                height=int(height),
                steps=int(steps),
                cfg_scale=float(cfg_scale),
                seed=int(seed) if seed else None
            )
            
            if result.startswith("⚠️"):
                return [], [{"role": "user", "content": f"🎨 Image Generation: {prompt}"}, {"role": "assistant", "content": result}]
            
            # Convert base64 to PIL Image and return directly
            try:
                import base64
                from PIL import Image
                import io
                
                # The result should already be base64 data from the API
                # Remove data:image/png;base64, prefix if present
                if isinstance(result, str) and result.startswith("data:image"):
                    result = result.split(",")[1]
                
                # Decode base64 and create PIL Image
                image_data = base64.b64decode(result)
                pil_image = Image.open(io.BytesIO(image_data))
                
                # Return PIL Image directly - Gallery can handle this natively
                return [pil_image], [{"role": "user", "content": f"🎨 Image Generation: {prompt}"}, {"role": "assistant", "content": f"✅ Image generated successfully! Prompt: {prompt}"}]
                
            except Exception as e:
                logger.error(f"Error processing generated image: {e}")
                return [], [{"role": "user", "content": f"🎨 Image Generation: {prompt}"}, {"role": "assistant", "content": f"⚠️ Error processing generated image: {str(e)}"}]
        
        # Connect image generation button - simplified
        generate_image_btn.click(
            fn=generate_image_with_model,
            inputs=[image_prompt, image_width, image_height, image_steps, image_cfg_scale, image_seed, selected_model_state],
            outputs=[generated_image, chat_ui.chatbot]
        )
        
        # Simple features info
        gr.Markdown("**✨ Features:** 📚 Document Analysis | 🎨 AI Image Generation | 🎤 Voice Input | 🤖 Multi-AI Models | 💬 Smart Chat")

    demo.load()

    return demo

# === Start App ===
demo = login_ui()
#emo.launch(auth=(USERNAME, PASSWORD),server_name="0.0.0.0", server_port=7861)
demo.launch(server_name="0.0.0.0", server_port=7861)

