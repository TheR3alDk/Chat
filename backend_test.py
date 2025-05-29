
import requests
import sys
import time
import base64
from datetime import datetime

class AICompanionTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.custom_personality_id = None
        self.custom_personality_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_custom_personality(self):
        """Create a custom personality with an image"""
        # Create a test image (base64 encoded small colored square)
        image_data = "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJAARPrP+kkAAAAAElFTkSuQmCC"
        
        # Create a unique personality ID
        personality_id = f"test_personality_{int(time.time())}"
        
        # Personality data
        personality_data = {
            "id": personality_id,
            "name": "Test Personality with Image",
            "description": "A test personality with a custom image for background blur testing",
            "emoji": "🧪",
            "customImage": f"data:image/png;base64,{image_data}",
            "prompt": "You are a helpful test assistant for testing the blurry background feature.",
            "scenario": "You are helping test the blurry background feature in a chat application.",
            "gender": "non-binary",
            "isPublic": True,
            "tags": ["test", "background", "blur"]
        }
        
        self.custom_personality_data = personality_data
        self.custom_personality_id = personality_id
        
        print(f"\n🔍 Creating custom personality with ID: {personality_id}")
        return personality_data

    def test_chat_with_personality(self, personality_id, message="Hello, how are you?"):
        """Test chatting with a personality"""
        data = {
            "messages": [{"role": "user", "content": message}],
            "personality": personality_id,
            "custom_personalities": [self.custom_personality_data] if self.custom_personality_data else [],
            "is_first_message": True,
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        success, response = self.run_test(
            f"Chat with {personality_id}",
            "POST",
            "chat",
            200,
            data=data
        )
        
        if success:
            print(f"Response from {personality_id}: {response.get('response', '')[:100]}...")
        
        return success, response

def main():
    # Get the backend URL from environment or use default
    backend_url = "https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"
    
    # Setup tester
    tester = AICompanionTester(backend_url)
    
    # Test built-in personalities
    print("\n===== Testing Built-in Personalities (should use solid black background) =====")
    built_in_personalities = ["lover", "therapist", "best_friend", "fantasy_rpg", "neutral"]
    
    for personality in built_in_personalities:
        tester.test_chat_with_personality(personality)
    
    # Create and test custom personality with image
    print("\n===== Testing Custom Personality with Image (should use blurred background) =====")
    custom_personality = tester.create_custom_personality()
    tester.test_chat_with_personality(tester.custom_personality_id)
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
