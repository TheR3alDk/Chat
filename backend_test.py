
import requests
import sys
import time
import json

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
        
        return success

def main():
    tester = PrivateAIChatbotTester()
    
    # Test health endpoint
    health_success = tester.test_health_endpoint()
    
    # Test personalities endpoint
    personalities_success = tester.test_personalities_endpoint()
    
    # Test chat endpoint with different personalities
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
        result = tester.test_chat_endpoint(personality, message)
        chat_results.append((personality, result))
    
    # Print summary
    print("\n📊 Test Summary:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Health endpoint: {'✅ Passed' if health_success else '❌ Failed'}")
    print(f"Personalities endpoint: {'✅ Passed' if personalities_success else '❌ Failed'}")
    
    print("\nChat endpoint tests:")
    for personality, result in chat_results:
        print(f"  - {personality}: {'✅ Passed' if result else '❌ Failed'}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
