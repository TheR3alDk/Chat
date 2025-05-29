import requests
import json
import time
import sys
import uuid
from datetime import datetime, timedelta

class PersonalityScenarioTester:
    def __init__(self, base_url="https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.custom_personality_id = f"custom_{uuid.uuid4().hex[:8]}"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)

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

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_get_personalities(self):
        """Test getting available personalities"""
        success, response = self.run_test(
            "Get Personalities",
            "GET",
            "personalities",
            200
        )
        if success and 'personalities' in response:
            print(f"Available personalities: {len(response['personalities'])}")
            return True
        return False

    def test_chat_completion(self, personality="best_friend"):
        """Test chat completion API"""
        messages = [{"role": "user", "content": "Hello, how are you?"}]
        
        success, response = self.run_test(
            "Chat Completion",
            "POST",
            "chat",
            200,
            data={
                "messages": messages,
                "personality": personality,
                "max_tokens": 100,
                "temperature": 0.7
            }
        )
        
        if success and 'response' in response:
            print(f"Response received: {response['response'][:50]}...")
            return True
        return False

    def test_chat_with_scenario(self, custom_personality):
        """Test chat completion with a custom personality that has a scenario"""
        messages = [{"role": "user", "content": "Hello, how are you?"}]
        
        success, response = self.run_test(
            "Chat with Scenario",
            "POST",
            "chat",
            200,
            data={
                "messages": messages,
                "personality": custom_personality["id"],
                "custom_prompt": custom_personality["prompt"],
                "custom_personalities": [custom_personality],
                "is_first_message": True,
                "max_tokens": 100,
                "temperature": 0.7
            }
        )
        
        if success and 'response' in response:
            print(f"Response with scenario: {response['response'][:50]}...")
            return True
        return False

    def test_opening_message(self, custom_personality):
        """Test generating an opening message based on scenario"""
        success, response = self.run_test(
            "Opening Message Generation",
            "POST",
            "opening_message",
            200,
            data={
                "messages": [],
                "personality": custom_personality["id"],
                "custom_prompt": custom_personality["prompt"],
                "custom_personalities": [custom_personality],
                "max_tokens": 300,
                "temperature": 0.8
            }
        )
        
        if success and 'response' in response:
            print(f"Opening message: {response['response'][:50]}...")
            return True
        return False

    def test_proactive_message(self, personality="best_friend"):
        """Test proactive message generation"""
        success, response = self.run_test(
            "Proactive Message Generation",
            "POST",
            "proactive_message",
            200,
            data={
                "personality": personality,
                "conversation_history": [
                    {"role": "user", "content": "Hello there!"},
                    {"role": "assistant", "content": "Hi! How can I help you today?"}
                ],
                "time_since_last_message": 30  # 30 minutes
            }
        )
        
        if success and 'response' in response:
            print(f"Proactive message: {response['response'][:50]}...")
            return True
        return False

    def test_should_send_proactive(self, personality="best_friend"):
        """Test the should_send_proactive endpoint"""
        # Test with a recent timestamp (should not send)
        recent_time = datetime.utcnow().isoformat()
        success1, response1 = self.run_test(
            "Should Send Proactive (Recent)",
            "GET",
            f"should_send_proactive/{personality}?last_message_time={recent_time}",
            200
        )
        
        if success1:
            print(f"Recent message check: should_send={response1.get('should_send', 'N/A')}")
        
        # Test with an old timestamp (should send)
        old_time = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        success2, response2 = self.run_test(
            "Should Send Proactive (Old)",
            "GET",
            f"should_send_proactive/{personality}?last_message_time={old_time}",
            200
        )
        
        if success2:
            print(f"Old message check: should_send={response2.get('should_send', 'N/A')}")
        
        return success1 and success2

    def create_test_personality_with_scenario(self):
        """Create a test personality with scenario for testing"""
        test_personality = {
            "id": self.custom_personality_id,
            "name": "Maya the Barista",
            "description": "Friendly coffee shop owner",
            "emoji": "☕",
            "customImage": None,
            "prompt": "You are Maya, a cheerful and energetic female barista who owns a small coffee shop. You're passionate about coffee, love meeting new people, and always have a warm smile. You're knowledgeable about different coffee beans and brewing methods.",
            "scenario": "You're working behind the counter at your coffee shop on a busy morning. The user just walked in as a new customer. The cafe smells amazing with fresh coffee brewing, and you're excited to welcome them."
        }
        
        print(f"\n🔍 Creating test personality with ID: {test_personality['id']}")
        return test_personality

def main():
    print("🔔 Testing Custom Personality Scenario System 🔔")
    print(f"API URL: https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com/api")
    
    tester = PersonalityScenarioTester()
    
    # Run basic health check
    health_ok = tester.test_health_check()
    if not health_ok:
        print("❌ Health check failed, stopping tests")
        return 1
    
    # Get available personalities
    personalities_ok = tester.test_get_personalities()
    
    # Create test personality with scenario
    test_personality = tester.create_test_personality_with_scenario()
    
    # Test opening message generation with scenario
    opening_message_ok = tester.test_opening_message(test_personality)
    
    # Test chat with scenario context
    chat_scenario_ok = tester.test_chat_with_scenario(test_personality)
    
    # Test regular chat completion
    chat_ok = tester.test_chat_completion()
    
    # Test proactive messaging
    proactive_ok = tester.test_proactive_message()
    should_send_ok = tester.test_should_send_proactive()
    
    # Print results
    print("\n📊 Test Results:")
    print(f"Health Check: {'✅' if health_ok else '❌'}")
    print(f"Get Personalities: {'✅' if personalities_ok else '❌'}")
    print(f"Opening Message with Scenario: {'✅' if opening_message_ok else '❌'}")
    print(f"Chat with Scenario: {'✅' if chat_scenario_ok else '❌'}")
    print(f"Regular Chat Completion: {'✅' if chat_ok else '❌'}")
    print(f"Proactive Message: {'✅' if proactive_ok else '❌'}")
    print(f"Should Send Proactive: {'✅' if should_send_ok else '❌'}")
    
    print(f"\nTests passed: {tester.tests_passed}/{tester.tests_run}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
