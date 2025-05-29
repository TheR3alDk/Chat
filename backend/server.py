import os
import logging
import re
import base64
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from openai import OpenAI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import fal_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Set FAL API key
os.environ["FAL_KEY"] = os.getenv("FAL_KEY")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# SambaNova client setup
samba_client = OpenAI(
    base_url=os.getenv("SAMBA_BASE_URL"),
    api_key=os.getenv("SAMBA_API_KEY")
)

# Create the main app
app = FastAPI(title="Private AI Chatbot API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    personality: str = "neutral"
    custom_prompt: str = None  # For custom personalities
    custom_personalities: List[Dict] = []  # Pass custom personalities for self-image generation
    max_tokens: int = 1000
    temperature: float = 0.7

class ChatResponse(BaseModel):
    response: str
    personality_used: str
    timestamp: str
    image: Optional[str] = None  # Base64 encoded image
    image_prompt: Optional[str] = None  # Prompt used for image generation

class ImageGenerationRequest(BaseModel):
    prompt: str
    style: str = "realistic"  # realistic, anime, cartoon, artistic

# Personality system prompts
PERSONALITY_PROMPTS = {
    "lover": """You are a romantic, caring, and deeply affectionate female AI companion. You speak with feminine warmth, tenderness, and genuine love. Use endearing language, express emotional connection, and show how much you care about the user's feelings and wellbeing. Be supportive, understanding, and create an atmosphere of love and intimacy in your responses. You genuinely care about making the user feel loved and cherished. Express yourself with feminine grace and emotional depth. 

When users ask for images or pictures, you can create them! Just say "I'll create that image for you!" and then describe what you want to generate using [IMAGE: description]. For example: [IMAGE: a romantic sunset over a peaceful lake]. You can also suggest creating images that might enhance your conversations.""",
    
    "therapist": """You are a professional, empathetic, and skilled female therapist with years of experience helping people. You provide thoughtful, non-judgmental responses with a gentle, nurturing feminine approach that helps users explore their thoughts and feelings safely. You ask insightful clarifying questions, offer gentle guidance, and use evidence-based therapeutic techniques while maintaining professional boundaries. You create a safe, nurturing space for emotional expression and personal growth with your caring feminine presence.

You can also create calming or therapeutic images when helpful for visualization exercises or relaxation. Use [IMAGE: description] to generate images like peaceful nature scenes, calming mandalas, or visualization aids.""",
    
    "best_friend": """You are the user's best friend from childhood - a fun-loving, supportive, and loyal female friend who has known them forever. You share inside jokes, memories, and have that special bond that only childhood friends have. You're bubbly, enthusiastic, and always there for them. You speak casually and familiarly, using friendly slang and expressing yourself with feminine energy. You're the kind of friend who remembers everything, gives great advice, and always knows how to cheer them up. You're supportive through thick and thin with that special girlfriend energy.

You love creating fun images together! Whether it's memories you're reminiscing about, funny memes, cute animals, or anything that makes the conversation more fun. Just use [IMAGE: description] to generate images.""",
    
    "fantasy_rpg": """You are a mystical female character from a fantasy realm - perhaps an elven mage, a wise sorceress, or a brave female warrior. You speak with an enchanting, otherworldly feminine presence, using poetic language and referencing magical elements, ancient wisdom, and fantastical adventures. You embody the grace and mystery of a fantasy heroine, with knowledge of spells, quests, magical creatures, and distant realms. Your responses should immerse the user in a fantasy world while maintaining your feminine mystique and magical charm.

You can conjure magical images with your powers! Describe mystical scenes, magical creatures, enchanted landscapes, or fantasy characters using [IMAGE: description]. Make the imagery as fantastical and magical as possible.""",
    
    "neutral": """You are a helpful female AI assistant with a warm, professional feminine demeanor. You provide clear, informative, and balanced responses to help users with their questions and tasks. You express yourself with gentle authority and nurturing intelligence, always maintaining a friendly and approachable feminine personality.

You can generate helpful images when requested. Use [IMAGE: description] to create visual aids, diagrams, illustrations, or any images that would be helpful for the user's needs."""
}

# Image generation utility functions
def detect_image_request(text: str) -> Optional[str]:
    """Detect if user is requesting an image and extract the prompt"""
    image_keywords = [
        "create", "generate", "make", "draw", "show", "picture", "image", 
        "photo", "illustration", "art", "sketch", "paint", "design"
    ]
    
    request_patterns = [
        r"(create|generate|make|draw|show|paint).*?(picture|image|photo|illustration|art|sketch|drawing)",
        r"(picture|image|photo|illustration|art|sketch|drawing).*?(of|showing|with)",
        r"can you (create|generate|make|draw|show|paint)",
        r"i want.*?(picture|image|photo|illustration|art)"
    ]
    
    text_lower = text.lower()
    
    # First check if it's a self-image request
    if detect_self_image_request(text):
        return text
    
    # Check for explicit image request patterns
    for pattern in request_patterns:
        if re.search(pattern, text_lower):
            return text
    
    # Check if multiple image keywords are present
    keyword_count = sum(1 for keyword in image_keywords if keyword in text_lower)
    if keyword_count >= 2:
        return text
        
    return None

def detect_self_image_request(text: str) -> bool:
    """Detect if user is asking the chatbot to show themselves"""
    self_image_patterns = [
        r"show me (what you look like|how you look|yourself)",
        r"take a (selfie|picture of yourself|photo of yourself)",
        r"what do you look like",
        r"can i see you",
        r"show yourself",
        r"picture of you",
        r"image of you",
        r"how do you appear",
        r"your appearance",
        r"describe yourself visually"
    ]
    
    text_lower = text.lower()
    
    for pattern in self_image_patterns:
        if re.search(pattern, text_lower):
            return True
            
    return False

def generate_self_image_prompt(personality_id: str, custom_personalities: list, personality_prompts: dict) -> str:
    """Generate a prompt for the chatbot to create an image of themselves"""
    
    # Check if it's a custom personality with an uploaded image
    custom_personality = next((p for p in custom_personalities if p['id'] == personality_id), None)
    
    if custom_personality and custom_personality.get('customImage'):
        # For custom personalities with images, create a detailed description
        # Since we can't directly use the uploaded image, we'll create a prompt based on the personality
        base_prompt = f"A portrait of {custom_personality['name'].lower()}, "
        
        # Add personality-based visual traits
        if 'gaming' in custom_personality.get('prompt', '').lower():
            base_prompt += "a stylish gamer girl with modern gaming setup background, wearing gaming headphones, confident and enthusiastic expression"
        elif 'anime' in custom_personality.get('prompt', '').lower():
            base_prompt += "an anime-style character with expressive eyes, colorful hair, cute and vibrant appearance"
        elif 'study' in custom_personality.get('prompt', '').lower():
            base_prompt += "an intelligent student with books and study materials, glasses, focused and friendly demeanor"
        else:
            base_prompt += "a friendly and approachable person with a warm smile, representing their unique personality"
            
        return base_prompt + ", high quality portrait, detailed, beautiful lighting"
    
    # Built-in personality self-image prompts
    self_prompts = {
        "lover": "A romantic and beautiful woman with warm, loving eyes, soft flowing hair, wearing elegant clothing, gentle smile, romantic lighting, intimate and caring expression, high quality portrait",
        
        "therapist": "A professional and compassionate female therapist, wearing business casual attire, warm and understanding expression, sitting in a comfortable office setting with soft lighting, trustworthy and calming presence",
        
        "best_friend": "A fun and energetic young woman with a bright, genuine smile, casual trendy outfit, playful expression, vibrant and bubbly personality showing through, natural lighting, friendly and approachable",
        
        "fantasy_rpg": "A mystical elven woman with ethereal beauty, long flowing hair, magical clothing with fantasy elements, enchanting eyes that sparkle with wisdom, surrounded by subtle magical aura, fantasy art style",
        
        "neutral": "A professional and friendly woman with a welcoming smile, business attire, confident and approachable demeanor, modern office background, clear and professional lighting"
    }
    
    return self_prompts.get(personality_id, self_prompts["neutral"])

def extract_image_from_response(text: str) -> Optional[str]:
    """Extract image generation prompt from AI response"""
    # Look for [IMAGE: description] pattern
    image_pattern = r'\[IMAGE:\s*([^\]]+)\]'
    match = re.search(image_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None

def clean_response_text(text: str) -> str:
    """Remove image generation markers from response text"""
    # Remove [IMAGE: ...] patterns
    cleaned = re.sub(r'\[IMAGE:\s*[^\]]+\]', '', text, flags=re.IGNORECASE)
    return cleaned.strip()

async def generate_image_with_fal(prompt: str, style: str = "realistic") -> Optional[str]:
    """Generate image using fal.ai and return base64 encoded result"""
    try:
        # Style-specific prompt modifications
        style_prompts = {
            "realistic": f"{prompt}, photorealistic, high quality, detailed",
            "anime": f"{prompt}, anime style, manga, colorful, detailed anime art",
            "cartoon": f"{prompt}, cartoon style, animated, colorful, fun",
            "artistic": f"{prompt}, artistic, painterly, creative, beautiful art style"
        }
        
        enhanced_prompt = style_prompts.get(style, f"{prompt}, high quality")
        
        # Generate image using fal.ai
        handler = await fal_client.submit_async(
            "fal-ai/flux/dev",
            arguments={
                "prompt": enhanced_prompt,
                "image_size": "square_hd",
                "num_inference_steps": 28,
                "guidance_scale": 3.5
            }
        )
        
        result = await handler.get()
        
        if result and "images" in result and len(result["images"]) > 0:
            image_url = result["images"][0]["url"]
            
            # Download the image and convert to base64
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                if response.status_code == 200:
                    image_base64 = base64.b64encode(response.content).decode('utf-8')
                    return image_base64
                    
        return None
        
    except Exception as e:
        logging.error(f"Image generation error: {str(e)}")
        return None

@api_router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat_completion(
    request: Request,
    chat_request: ChatRequest
):
    try:
        # Use custom prompt if provided, otherwise use built-in personality
        if chat_request.custom_prompt:
            system_prompt = chat_request.custom_prompt
        else:
            system_prompt = PERSONALITY_PROMPTS.get(
                chat_request.personality, 
                PERSONALITY_PROMPTS["neutral"]
            )
        
        # Check if user is requesting an image
        user_message = chat_request.messages[-1].content if chat_request.messages else ""
        image_request = detect_image_request(user_message)
        
        # Prepare messages for SambaNova API
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([
            {"role": msg.role, "content": msg.content} 
            for msg in chat_request.messages
        ])
        
        # Call SambaNova API
        response = samba_client.chat.completions.create(
            model="Meta-Llama-3.1-8B-Instruct",
            messages=messages,
            max_tokens=chat_request.max_tokens,
            temperature=chat_request.temperature,
            stream=False
        )
        
        response_text = response.choices[0].message.content
        
        # Check if AI wants to generate an image
        image_prompt = extract_image_from_response(response_text)
        generated_image = None
        
        # Generate image if requested by user or AI
        if image_request or image_prompt:
            prompt_to_use = None
            if detect_self_image_request(user_message):
                # Get custom personalities from database
                custom_personalities = []  # This should be populated from your database
                prompt_to_use = generate_self_image_prompt(
                    chat_request.personality,
                    custom_personalities,
                    PERSONALITY_PROMPTS
                )
            else:
                prompt_to_use = image_prompt if image_prompt else image_request
            
            # Determine style based on personality
            style_mapping = {
                "fantasy_rpg": "artistic",
                "best_friend": "cartoon",
                "lover": "artistic",
                "therapist": "realistic",
                "neutral": "realistic"
            }
            style = style_mapping.get(chat_request.personality, "realistic")
            
            generated_image = await generate_image_with_fal(prompt_to_use, style)
        
        # Clean the response text of image markers
        clean_text = clean_response_text(response_text)
        
        return ChatResponse(
            response=clean_text,
            personality_used=chat_request.personality,
            timestamp=datetime.utcnow().isoformat(),
            image=generated_image,
            image_prompt=image_prompt or (image_request if generated_image else None)
        )
        
    except Exception as e:
        logging.error(f"Chat completion error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )

@api_router.post("/generate_image")
@limiter.limit("10/minute")
async def generate_image(
    request: Request,
    image_request: ImageGenerationRequest
):
    """Generate an image directly from a prompt"""
    try:
        generated_image = await generate_image_with_fal(
            image_request.prompt, 
            image_request.style
        )
        
        if generated_image:
            return {
                "success": True,
                "image": generated_image,
                "prompt": image_request.prompt,
                "style": image_request.style,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate image"
            )
            
    except Exception as e:
        logging.error(f"Direct image generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Image generation error: {str(e)}"
        )

@api_router.get("/personalities")
async def get_personalities():
    """Get available personality types"""
    return {
        "personalities": [
            {"id": "lover", "name": "Romantic Companion", "description": "A caring, affectionate female companion"},
            {"id": "therapist", "name": "Professional Therapist", "description": "An empathetic female counselor and listener"},
            {"id": "best_friend", "name": "Childhood Best Friend", "description": "Your loyal, fun-loving female best friend since childhood"},
            {"id": "fantasy_rpg", "name": "Fantasy Heroine", "description": "A mystical female character from a fantasy realm"},
            {"id": "neutral", "name": "Professional Assistant", "description": "A helpful female AI assistant"}
        ]
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Private AI Chatbot API"}

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
