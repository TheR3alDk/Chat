
import requests
import sys
import time
import json
import base64
from datetime import datetime

class PrivateAIChatbotTester:
    def __init__(self, base_url="https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return success, response.json() if response.text else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check Endpoint",
            "GET",
            "health",
            200
        )
        if success:
            print(f"Health Status: {response.get('status')}")
            print(f"Service: {response.get('service')}")
        return success

    def test_personalities_endpoint(self):
        """Test the personalities endpoint"""
        success, response = self.run_test(
            "Personalities Endpoint",
            "GET",
            "personalities",
            200
        )
        if success:
            personalities = response.get('personalities', [])
            print(f"Found {len(personalities)} personalities:")
            for p in personalities:
                print(f"  - {p.get('name')} ({p.get('id')}): {p.get('description')}")
        return success

    def test_chat_endpoint(self, personality, message):
        """Test the chat endpoint with a specific personality"""
        data = {
            "messages": [{"role": "user", "content": message}],
            "personality": personality,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        success, response = self.run_test(
            f"Chat Endpoint with {personality} personality",
            "POST",
            "chat",
            200,
            data=data
        )
        
        if success:
            print(f"Message: '{message}'")
            print(f"Response: '{response.get('response')[:100]}...'")
            print(f"Personality Used: {response.get('personality_used')}")
            print(f"Timestamp: {response.get('timestamp')}")
            
            # Check if image was generated
            if response.get('image'):
                print(f"✅ Image generated successfully!")
                print(f"Image Prompt: '{response.get('image_prompt')}'")
                # Save image for inspection if needed
                # self.save_image(response.get('image'), f"test_{personality}_{datetime.now().strftime('%H%M%S')}.jpg")
            
        return success, response

    def test_chat_with_custom_personality(self, custom_prompt, message):
        """Test the chat endpoint with a custom personality"""
        data = {
            "messages": [{"role": "user", "content": message}],
            "personality": "custom_test",
            "custom_prompt": custom_prompt,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        success, response = self.run_test(
            f"Chat Endpoint with custom personality",
            "POST",
            "chat",
            200,
            data=data
        )
        
        if success:
            print(f"Custom Prompt: '{custom_prompt[:50]}...'")
            print(f"Message: '{message}'")
            print(f"Response: '{response.get('response')[:100]}...'")
            print(f"Personality Used: {response.get('personality_used')}")
            print(f"Timestamp: {response.get('timestamp')}")
            
            # Check if image was generated
            if response.get('image'):
                print(f"✅ Image generated successfully!")
                print(f"Image Prompt: '{response.get('image_prompt')}'")
        
        return success, response
    
    def test_direct_image_generation(self, prompt, style="realistic"):
        """Test the direct image generation endpoint"""
        data = {
            "prompt": prompt,
            "style": style
        }
        
        success, response = self.run_test(
            f"Direct Image Generation with style '{style}'",
            "POST",
            "generate_image",
            200,
            data=data
        )
        
        if success:
            print(f"Prompt: '{prompt}'")
            print(f"Style: '{style}'")
            print(f"Timestamp: {response.get('timestamp')}")
            
            if response.get('image'):
                print(f"✅ Image generated successfully!")
                # Save image for inspection if needed
                # self.save_image(response.get('image'), f"direct_{style}_{datetime.now().strftime('%H%M%S')}.jpg")
        
        return success, response
    
    def test_image_generation_via_chat(self, personality, image_request):
        """Test image generation through the chat endpoint"""
        print(f"\n🖼️ Testing Image Generation via Chat with {personality} personality")
        print(f"Request: '{image_request}'")
        
        success, response = self.test_chat_endpoint(personality, image_request)
        
        if success:
            if response.get('image'):
                print(f"✅ Image generation successful!")
                return True, response
            else:
                print(f"❌ No image was generated for the request")
                return False, response
        
        return False, response
    
    def save_image(self, base64_image, filename):
        """Save a base64 encoded image to a file"""
        try:
            image_data = base64.b64decode(base64_image)
            with open(filename, 'wb') as f:
                f.write(image_data)
            print(f"Image saved to {filename}")
        except Exception as e:
            print(f"Error saving image: {str(e)}")

def main():
    tester = PrivateAIChatbotTester()
    
    # Test health endpoint
    health_success = tester.test_health_endpoint()
    
    # Test personalities endpoint
    personalities_success = tester.test_personalities_endpoint()
    
    # Test basic chat functionality with different personalities
    chat_tests = [
        ("best_friend", "Hey girl, what's up?"),
        ("fantasy_rpg", "Tell me about your magical powers"),
        ("therapist", "I'm feeling stressed lately"),
        ("lover", "I missed you today"),
        ("neutral", "Help me with a work task")
    ]
    
    chat_results = []
    for personality, message in chat_tests:
        # Add a small delay between requests to avoid rate limiting
        time.sleep(1)
        result, _ = tester.test_chat_endpoint(personality, message)
        chat_results.append((personality, result))
    
    # Test with custom personality
    custom_prompt = "You are a gaming buddy who loves video games. You're enthusiastic about gaming, knowledgeable about all platforms, and always ready to discuss the latest releases and gaming strategies."
    custom_message = "What games would you recommend for someone who likes strategy games?"
    time.sleep(1)
    custom_result, _ = tester.test_chat_with_custom_personality(custom_prompt, custom_message)
    
    # Test image generation via chat with different personalities
    image_requests = [
        ("Can you draw me a sunset?", "sunset"),
        ("Create a picture of a cute cat", "cat"),
        ("Show me what a fantasy castle looks like", "castle"),
        ("Generate an image of a futuristic city", "city"),
        ("Make a picture of a peaceful forest", "forest")
    ]
    
    image_results = []
    for personality in ["best_friend", "fantasy_rpg", "lover", "therapist", "neutral"]:
        # Test one image request per personality to avoid rate limiting
        request, keyword = image_requests[len(image_results) % len(image_requests)]
        time.sleep(2)  # Longer delay for image generation
        result, response = tester.test_image_generation_via_chat(personality, request)
        image_results.append((personality, keyword, result, response))
    
    # Test direct image generation endpoint
    direct_image_tests = [
        ("A beautiful mountain landscape at sunset", "realistic"),
        ("A cute cartoon rabbit with a carrot", "cartoon"),
        ("A magical wizard casting a spell", "artistic"),
        ("A futuristic anime character with glowing eyes", "anime")
    ]
    
    direct_image_results = []
    for prompt, style in direct_image_tests:
        time.sleep(2)  # Longer delay for image generation
        result, _ = tester.test_direct_image_generation(prompt, style)
        direct_image_results.append((prompt, style, result))
    
    # Print summary
    print("\n📊 Test Summary:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Health endpoint: {'✅ Passed' if health_success else '❌ Failed'}")
    print(f"Personalities endpoint: {'✅ Passed' if personalities_success else '❌ Failed'}")
    
    print("\nBasic Chat endpoint tests:")
    for personality, result in chat_results:
        print(f"  - {personality}: {'✅ Passed' if result else '❌ Failed'}")
    print(f"  - Custom personality: {'✅ Passed' if custom_result else '❌ Failed'}")
    
    print("\nImage Generation via Chat tests:")
    for personality, keyword, result, response in image_results:
        image_prompt = response.get('image_prompt', 'No prompt')
        print(f"  - {personality} ({keyword}): {'✅ Passed' if result else '❌ Failed'}")
        if result:
            print(f"    Prompt: {image_prompt}")
    
    print("\nDirect Image Generation tests:")
    for prompt, style, result in direct_image_results:
        print(f"  - {style} style: {'✅ Passed' if result else '❌ Failed'}")
        print(f"    Prompt: {prompt[:30]}...")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
