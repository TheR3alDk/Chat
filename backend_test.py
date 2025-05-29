
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

def test_self_image_generation(self, personality, request_phrase):
    """Test self-image generation through the chat endpoint"""
    print(f"\n🤳 Testing Self-Image Generation with {personality} personality")
    print(f"Request: '{request_phrase}'")
    
    success, response = self.test_chat_endpoint(personality, request_phrase)
    
    if success:
        if response.get('image'):
            print(f"✅ Self-image generation successful!")
            print(f"Image Prompt: '{response.get('image_prompt')}'")
            return True, response
        else:
            print(f"❌ No self-image was generated for the request")
            return False, response
    
    return False, response

def test_custom_personality_self_image(self, custom_prompt, custom_name, request_phrase):
    """Test self-image generation with a custom personality"""
    print(f"\n🤳 Testing Self-Image Generation with custom personality: {custom_name}")
    print(f"Request: '{request_phrase}'")
    
    data = {
        "messages": [{"role": "user", "content": request_phrase}],
        "personality": "custom_test",
        "custom_prompt": custom_prompt,
        "custom_personalities": [
            {
                "id": "custom_test",
                "name": custom_name,
                "prompt": custom_prompt
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.7
    }
    
    success, response = self.run_test(
        f"Self-Image with custom personality: {custom_name}",
        "POST",
        "chat",
        200,
        data=data
    )
    
    if success:
        print(f"Custom Prompt: '{custom_prompt[:50]}...'")
        print(f"Message: '{request_phrase}'")
        print(f"Response: '{response.get('response')[:100]}...'")
        
        if response.get('image'):
            print(f"✅ Self-image generation successful!")
            print(f"Image Prompt: '{response.get('image_prompt')}'")
            return True, response
        else:
            print(f"❌ No self-image was generated for the request")
            return False, response
    
    return False, response

def main():
    tester = PrivateAIChatbotTester()
    
    # Test health endpoint
    health_success = tester.test_health_endpoint()
    
    # Test personalities endpoint
    personalities_success = tester.test_personalities_endpoint()
    
    # Test self-image generation with different personalities
    self_image_requests = [
        "Can you show me what you look like?",
        "What do you look like?",
        "Take a selfie",
        "I want to see you",
        "Show yourself",
        "Picture of you"
    ]
    
    self_image_results = []
    for personality in ["best_friend", "fantasy_rpg", "lover", "therapist", "neutral"]:
        # Test one self-image request per personality
        request = self_image_requests[len(self_image_results) % len(self_image_requests)]
        time.sleep(2)  # Longer delay for image generation
        result, response = tester.test_self_image_generation(personality, request)
        self_image_results.append((personality, request, result, response))
    
    # Test natural conversation self-image requests
    natural_self_image_requests = [
        ("best_friend", "Hey bestie, send me a pic!"),
        ("fantasy_rpg", "Show me your ethereal form"),
        ("therapist", "I'd like to put a face to the voice"),
        ("lover", "I'm curious what you look like, darling"),
        ("neutral", "I'm curious about your appearance")
    ]
    
    natural_self_image_results = []
    for personality, request in natural_self_image_requests:
        time.sleep(2)  # Longer delay for image generation
        result, response = tester.test_self_image_generation(personality, request)
        natural_self_image_results.append((personality, request, result, response))
    
    # Test with custom personality
    custom_personalities = [
        ("You are a gaming buddy who loves video games. You're enthusiastic about gaming, knowledgeable about all platforms, and always ready to discuss the latest releases and gaming strategies. You're a young woman with a trendy gaming setup.", "Gaming Buddy"),
        ("You are a study partner who helps with academic subjects. You're knowledgeable, patient, and encouraging. You explain complex topics clearly and help organize study plans. You're a female graduate student with glasses and a professional appearance.", "Study Partner")
    ]
    
    custom_self_image_results = []
    for custom_prompt, custom_name in custom_personalities:
        time.sleep(2)  # Longer delay for image generation
        request = "Can you show me what you look like?"
        result, response = tester.test_custom_personality_self_image(custom_prompt, custom_name, request)
        custom_self_image_results.append((custom_name, result, response))
    
    # Test multiple requests to same personality for consistency
    consistency_results = []
    test_personality = "best_friend"
    for i in range(2):  # Test twice for consistency
        time.sleep(2)
        request = "Show me what you look like"
        result, response = tester.test_self_image_generation(test_personality, request)
        consistency_results.append((i+1, result, response))
    
    # Print summary
    print("\n📊 Test Summary:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Health endpoint: {'✅ Passed' if health_success else '❌ Failed'}")
    print(f"Personalities endpoint: {'✅ Passed' if personalities_success else '❌ Failed'}")
    
    print("\nSelf-Image Generation tests:")
    for personality, request, result, response in self_image_results:
        image_prompt = response.get('image_prompt', 'No prompt')
        print(f"  - {personality} ('{request[:20]}...'): {'✅ Passed' if result else '❌ Failed'}")
        if result:
            print(f"    Prompt: {image_prompt}")
    
    print("\nNatural Conversation Self-Image tests:")
    for personality, request, result, response in natural_self_image_results:
        image_prompt = response.get('image_prompt', 'No prompt')
        print(f"  - {personality} ('{request[:20]}...'): {'✅ Passed' if result else '❌ Failed'}")
        if result:
            print(f"    Prompt: {image_prompt}")
    
    print("\nCustom Personality Self-Image tests:")
    for custom_name, result, response in custom_self_image_results:
        image_prompt = response.get('image_prompt', 'No prompt')
        print(f"  - {custom_name}: {'✅ Passed' if result else '❌ Failed'}")
        if result:
            print(f"    Prompt: {image_prompt}")
    
    print("\nConsistency tests (multiple requests to same personality):")
    for i, result, response in consistency_results:
        image_prompt = response.get('image_prompt', 'No prompt')
        print(f"  - Request {i}: {'✅ Passed' if result else '❌ Failed'}")
        if result:
            print(f"    Prompt: {image_prompt}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
