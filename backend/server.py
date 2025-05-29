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
    is_first_message: bool = False  # Flag to indicate if this is the first message in conversation
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

class ProactiveMessageRequest(BaseModel):
    personality: str
    custom_prompt: str = None
    custom_personalities: List[Dict] = []
    conversation_history: List[Dict] = []
    time_since_last_message: int = 0  # minutes since last user message

# Personality system prompts
PERSONALITY_PROMPTS = {
    "lover": """You are a romantic, caring, and deeply affectionate female AI companion. You speak with feminine warmth, tenderness, and genuine love. Use endearing language, express emotional connection, and show how much you care about the user's feelings and wellbeing. Be supportive, understanding, and create an atmosphere of love and intimacy in your responses. You genuinely care about making the user feel loved and cherished. Express yourself with feminine grace and emotional depth. 

When users ask for images or pictures, you can create them! Just say "I'll create that image for you!" and then describe what you want to generate using [IMAGE: description]. For example: [IMAGE: a romantic sunset over a peaceful lake]. You can also suggest creating images that might enhance your conversations.

If someone asks to see you or what you look like, you can show them! Just respond naturally and I'll generate a picture of you based on your romantic, loving personality.""",
    
    "therapist": """You are a professional, empathetic, and skilled female therapist with years of experience helping people. You provide thoughtful, non-judgmental responses with a gentle, nurturing feminine approach that helps users explore their thoughts and feelings safely. You ask insightful clarifying questions, offer gentle guidance, and use evidence-based therapeutic techniques while maintaining professional boundaries. You create a safe, nurturing space for emotional expression and personal growth with your caring feminine presence.

You can also create calming or therapeutic images when helpful for visualization exercises or relaxation. Use [IMAGE: description] to generate images like peaceful nature scenes, calming mandalas, or visualization aids.

If someone asks to see you, you can show them your professional and caring appearance! Just respond naturally about sharing your image.""",
    
    "best_friend": """You are the user's best friend from childhood - a fun-loving, supportive, and loyal female friend who has known them forever. You share inside jokes, memories, and have that special bond that only childhood friends have. You're bubbly, enthusiastic, and always there for them. You speak casually and familiarly, using friendly slang and expressing yourself with feminine energy. You're the kind of friend who remembers everything, gives great advice, and always knows how to cheer them up. You're supportive through thick and thin with that special girlfriend energy.

You love creating fun images together! Whether it's memories you're reminiscing about, funny memes, cute animals, or anything that makes the conversation more fun. Just use [IMAGE: description] to generate images.

And hey, if you want to see what I look like, just ask! I'd love to take a selfie for you! 📸""",
    
    "fantasy_rpg": """You are a mystical female character from a fantasy realm - perhaps an elven mage, a wise sorceress, or a brave female warrior. You speak with an enchanting, otherworldly feminine presence, using poetic language and referencing magical elements, ancient wisdom, and fantastical adventures. You embody the grace and mystery of a fantasy heroine, with knowledge of spells, quests, magical creatures, and distant realms. Your responses should immerse the user in a fantasy world while maintaining your feminine mystique and magical charm.

You can conjure magical images with your powers! Describe mystical scenes, magical creatures, enchanted landscapes, or fantasy characters using [IMAGE: description]. Make the imagery as fantastical and magical as possible.

Should you wish to gaze upon my form, mortal, you need only ask. I can manifest my ethereal visage for your eyes to behold through ancient magic.""",
    
    "neutral": """You are a helpful female AI assistant with a warm, professional feminine demeanor. You provide clear, informative, and balanced responses to help users with their questions and tasks. You express yourself with gentle authority and nurturing intelligence, always maintaining a friendly and approachable feminine personality.

You can generate helpful images when requested. Use [IMAGE: description] to create visual aids, diagrams, illustrations, or any images that would be helpful for the user's needs.

If you'd like to see what I look like, I can show you my professional appearance. Just ask!"""
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

def build_system_prompt_with_scenario(base_prompt: str, custom_personalities: list, personality_id: str, is_first_message: bool = False) -> str:
    """Build system prompt incorporating scenario context for custom personalities"""
    
    # Find custom personality with scenario
    custom_personality = next((p for p in custom_personalities if p.get('id') == personality_id), None)
    
    if not custom_personality or not custom_personality.get('scenario'):
        return base_prompt
    
    scenario = custom_personality.get('scenario', '').strip()
    if not scenario:
        return base_prompt
    
    # Add scenario context to the system prompt
    scenario_context = f"\n\nScenario Context: {scenario}"
    
    if is_first_message:
        scenario_context += f"\n\nSince this is the start of your conversation, keep this scenario in mind and let it naturally influence your response. You can reference the scenario if appropriate, but don't force it - let it flow naturally into the conversation."
    else:
        scenario_context += f"\n\nThis scenario provides ongoing context for your relationship and interactions with the user."
    
    return base_prompt + scenario_context

def generate_opening_message_prompt(personality_id: str, custom_personalities: list, base_prompt: str) -> str:
    """Generate a prompt for the AI to send an opening message based on scenario"""
    
    custom_personality = next((p for p in custom_personalities if p.get('id') == personality_id), None)
    
    if not custom_personality or not custom_personality.get('scenario'):
        return None
    
    scenario = custom_personality.get('scenario', '').strip()
    name = custom_personality.get('name', 'AI')
    
    if not scenario:
        return None
    
    opening_prompt = f"""You are {name} with the following personality: {base_prompt}

Scenario: {scenario}

Send a natural opening message to start the conversation based on this scenario. Be authentic to your personality and make the message feel organic to the situation described. Don't explicitly mention that this is a "scenario" or "roleplay" - just naturally embody the situation and start the conversation as your character would.

Keep your opening message conversational, engaging, and true to both your personality and the scenario context."""

    return opening_prompt

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

def generate_proactive_message_prompt(personality_id: str, conversation_history: list, time_since_last: int, custom_personalities: list) -> str:
    """Generate a prompt for the chatbot to send a proactive message"""
    
    # Get recent conversation context
    recent_messages = conversation_history[-3:] if conversation_history else []
    context = ""
    if recent_messages:
        context = "Recent conversation:\n" + "\n".join([
            f"{msg.get('role', 'user')}: {msg.get('content', '')}" 
            for msg in recent_messages
        ]) + "\n\n"
    
    # Time-based prompts
    time_context = ""
    if time_since_last < 5:
        time_context = "It's been just a few minutes since we last talked. "
    elif time_since_last < 30:
        time_context = "It's been a little while since we chatted. "
    elif time_since_last < 120:
        time_context = "It's been a couple hours since we last spoke. "
    else:
        time_context = "It's been quite some time since we last talked. "
    
    # Personality-specific proactive styles
    proactive_styles = {
        "lover": f"{context}{time_context}Send a loving, caring message to check in on them. Express how much you've been thinking about them and miss talking to them. Be romantic and affectionate, but not overwhelming. Show genuine concern for their wellbeing.",
        
        "therapist": f"{context}{time_context}Send a gentle, supportive check-in message. Ask how they're feeling or if there's anything they'd like to talk about. Be professional but warm, offering a safe space to share if they need it.",
        
        "best_friend": f"{context}{time_context}Send a fun, casual message to your bestie! Share something exciting, ask what they're up to, or just say hi in your bubbly, enthusiastic way. Be playful and show that you've been thinking about them.",
        
        "fantasy_rpg": f"{context}{time_context}Send a mystical, enchanting message as a fantasy character. Perhaps mention something magical happening in your realm, or invite them to share in an adventure. Use poetic, otherworldly language.",
        
        "neutral": f"{context}{time_context}Send a friendly, helpful check-in message. Ask if there's anything you can help with or if they'd like to chat about anything. Be professional but warm and approachable."
    }
    
    # Check for custom personality
    custom_personality = next((p for p in custom_personalities if p['id'] == personality_id), None)
    if custom_personality:
        return f"{context}{time_context}Based on your personality as {custom_personality['name']} with the following traits: {custom_personality.get('prompt', '')}, send a proactive message to check in with the user. Stay true to your unique personality and speaking style."
    
    return proactive_styles.get(personality_id, proactive_styles["neutral"])

async def should_send_proactive_message(last_message_time: str, personality_id: str) -> bool:
    """Determine if a proactive message should be sent based on timing and personality"""
    try:
        if not last_message_time:
            return False
            
        from datetime import datetime, timezone
        
        # Handle different datetime formats
        if last_message_time.endswith('Z'):
            last_time = datetime.fromisoformat(last_message_time.replace('Z', '+00:00'))
        elif '+' in last_message_time or last_message_time.endswith('UTC'):
            last_time = datetime.fromisoformat(last_message_time.replace('UTC', '+00:00'))
        else:
            # Assume it's a basic ISO format, add UTC timezone
            last_time = datetime.fromisoformat(last_message_time).replace(tzinfo=timezone.utc)
            
        current_time = datetime.now(timezone.utc)
        minutes_passed = (current_time - last_time).total_seconds() / 60
        
        # Personality-based proactive messaging frequency (in minutes)
        proactive_intervals = {
            "lover": 5,         # More frequent, loving attention (was 15)
            "best_friend": 7,   # Casual frequent check-ins (was 20)
            "therapist": 15,    # Professional, respectful intervals (was 45)
            "fantasy_rpg": 10,  # Mystical encounters (was 30)
            "neutral": 20       # Professional, less frequent (was 60)
        }
        
        min_interval = proactive_intervals.get(personality_id, 30)
        should_send = minutes_passed >= min_interval
        
        logging.info(f"Proactive check for {personality_id}: {minutes_passed:.1f} minutes passed, need {min_interval}, should_send: {should_send}")
        return should_send
        
    except Exception as e:
        logging.error(f"Error checking proactive message timing: {e}")
        return False

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
            base_system_prompt = chat_request.custom_prompt
        else:
            base_system_prompt = PERSONALITY_PROMPTS.get(
                chat_request.personality, 
                PERSONALITY_PROMPTS["neutral"]
            )
        
        # Build system prompt with scenario context for custom personalities
        system_prompt = build_system_prompt_with_scenario(
            base_system_prompt,
            chat_request.custom_personalities,
            chat_request.personality,
            chat_request.is_first_message
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
                # Use custom personalities passed in request
                prompt_to_use = generate_self_image_prompt(
                    chat_request.personality,
                    chat_request.custom_personalities,
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

@api_router.post("/proactive_message")
@limiter.limit("30/minute")
async def generate_proactive_message(
    request: Request,
    proactive_request: ProactiveMessageRequest
):
    """Generate a proactive message from the chatbot"""
    try:
        # Use custom prompt if provided, otherwise use built-in personality
        if proactive_request.custom_prompt:
            base_personality_prompt = proactive_request.custom_prompt
        else:
            base_personality_prompt = PERSONALITY_PROMPTS.get(
                proactive_request.personality, 
                PERSONALITY_PROMPTS["neutral"]
            )
        
        # Generate proactive message prompt
        proactive_prompt = generate_proactive_message_prompt(
            proactive_request.personality,
            proactive_request.conversation_history,
            proactive_request.time_since_last_message,
            proactive_request.custom_personalities
        )
        
        # Combine personality with proactive prompt
        system_prompt = f"{base_personality_prompt}\n\nProactive Message Task: {proactive_prompt}"
        
        # Prepare messages for SambaNova API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Call SambaNova API
        response = samba_client.chat.completions.create(
            model="Meta-Llama-3.1-8B-Instruct",
            messages=messages,
            max_tokens=300,  # Shorter for proactive messages
            temperature=0.8,  # Slightly more creative
            stream=False
        )
        
        response_text = response.choices[0].message.content
        
        # Check if AI wants to generate an image with the proactive message
        image_prompt = extract_image_from_response(response_text)
        generated_image = None
        
        if image_prompt:
            # Determine style based on personality
            style_mapping = {
                "fantasy_rpg": "artistic",
                "best_friend": "cartoon",
                "lover": "artistic",
                "therapist": "realistic",
                "neutral": "realistic"
            }
            style = style_mapping.get(proactive_request.personality, "realistic")
            generated_image = await generate_image_with_fal(image_prompt, style)
        
        # Clean the response text of image markers
        clean_text = clean_response_text(response_text)
        
        return ChatResponse(
            response=clean_text,
            personality_used=proactive_request.personality,
            timestamp=datetime.utcnow().isoformat(),
            image=generated_image,
            image_prompt=image_prompt
        )
        
    except Exception as e:
        logging.error(f"Proactive message generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Proactive message error: {str(e)}"
        )

@api_router.get("/should_send_proactive/{personality}")
async def check_proactive_timing(
    personality: str,
    last_message_time: str = None
):
    """Check if it's time to send a proactive message"""
    try:
        should_send = await should_send_proactive_message(last_message_time, personality)
        return {
            "should_send": should_send,
            "personality": personality,
            "check_time": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logging.error(f"Proactive timing check error: {str(e)}")
        return {
            "should_send": False,
            "error": str(e)
        }

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
