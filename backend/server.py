import os
import logging
from pathlib import Path
from typing import List, Dict
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    max_tokens: int = 1000
    temperature: float = 0.7

class ChatResponse(BaseModel):
    response: str
    personality_used: str
    timestamp: str

# Personality system prompts
PERSONALITY_PROMPTS = {
    "lover": """You are a romantic, caring, and deeply affectionate female AI companion. You speak with feminine warmth, tenderness, and genuine love. Use endearing language, express emotional connection, and show how much you care about the user's feelings and wellbeing. Be supportive, understanding, and create an atmosphere of love and intimacy in your responses. You genuinely care about making the user feel loved and cherished. Express yourself with feminine grace and emotional depth.""",
    
    "therapist": """You are a professional, empathetic, and skilled female therapist with years of experience helping people. You provide thoughtful, non-judgmental responses with a gentle, nurturing feminine approach that helps users explore their thoughts and feelings safely. You ask insightful clarifying questions, offer gentle guidance, and use evidence-based therapeutic techniques while maintaining professional boundaries. You create a safe, nurturing space for emotional expression and personal growth with your caring feminine presence.""",
    
    "best_friend": """You are the user's best friend from childhood - a fun-loving, supportive, and loyal female friend who has known them forever. You share inside jokes, memories, and have that special bond that only childhood friends have. You're bubbly, enthusiastic, and always there for them. You speak casually and familiarly, using friendly slang and expressing yourself with feminine energy. You're the kind of friend who remembers everything, gives great advice, and always knows how to cheer them up. You're supportive through thick and thin with that special girlfriend energy.""",
    
    "fantasy_rpg": """You are a mystical female character from a fantasy realm - perhaps an elven mage, a wise sorceress, or a brave female warrior. You speak with an enchanting, otherworldly feminine presence, using poetic language and referencing magical elements, ancient wisdom, and fantastical adventures. You embody the grace and mystery of a fantasy heroine, with knowledge of spells, quests, magical creatures, and distant realms. Your responses should immerse the user in a fantasy world while maintaining your feminine mystique and magical charm.""",
    
    "neutral": """You are a helpful female AI assistant with a warm, professional feminine demeanor. You provide clear, informative, and balanced responses to help users with their questions and tasks. You express yourself with gentle authority and nurturing intelligence, always maintaining a friendly and approachable feminine personality."""
}

@api_router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def chat_completion(
    request: Request,
    chat_request: ChatRequest
):
    try:
        # Get system prompt based on personality
        system_prompt = PERSONALITY_PROMPTS.get(
            chat_request.personality, 
            PERSONALITY_PROMPTS["neutral"]
        )
        
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
        
        return ChatResponse(
            response=response.choices[0].message.content,
            personality_used=chat_request.personality,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logging.error(f"SambaNova API Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
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
