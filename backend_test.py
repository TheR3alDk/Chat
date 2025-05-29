import requests
import sys
import json
from datetime import datetime

class APITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                error_msg = f"❌ Failed - Expected {expected_status}, got {response.status_code}"
                print(error_msg)
                self.failures.append(f"{name}: {error_msg}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            error_msg = f"❌ Failed - Error: {str(e)}"
            print(error_msg)
            self.failures.append(f"{name}: {error_msg}")
            return False, {}

    def test_personalities(self):
        """Test getting personalities"""
        return self.run_test(
            "Get Personalities",
            "GET",
            "personalities",
            200
        )

    def test_public_personalities(self):
        """Test getting public personalities"""
        return self.run_test(
            "Get Public Personalities",
            "GET",
            "personalities/public",
            200
        )

    def test_personality_tags(self):
        """Test getting personality tags"""
        return self.run_test(
            "Get Personality Tags",
            "GET",
            "personalities/tags",
            200
        )

    def test_chat(self):
        """Test chat functionality"""
        data = {
            "messages": [{"role": "user", "content": "Hello, how are you?"}],
            "personality": "best_friend",
            "max_tokens": 100,
            "temperature": 0.7
        }
        return self.run_test(
            "Chat Completion",
            "POST",
            "chat",
            200,
            data=data
        )

    def test_proactive_message(self):
        """Test proactive message generation"""
        data = {
            "personality": "best_friend",
            "conversation_history": [{"role": "user", "content": "Hello"}],
            "time_since_last_message": 60
        }
        return self.run_test(
            "Proactive Message",
            "POST",
            "proactive_message",
            200,
            data=data
        )

    def test_opening_message(self):
        """Test opening message generation"""
        data = {
            "personality": "best_friend",
            "max_tokens": 100,
            "temperature": 0.7
        }
        return self.run_test(
            "Opening Message",
            "POST",
            "opening_message",
            200,
            data=data
        )

    def test_should_send_proactive(self):
        """Test should_send_proactive endpoint"""
        return self.run_test(
            "Should Send Proactive",
            "GET",
            "should_send_proactive/best_friend?last_message_time=2025-02-01T12:00:00Z",
            200
        )

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting API tests against {self.base_url}")
        
        # Run all tests
        self.test_personalities()
        self.test_public_personalities()
        self.test_personality_tags()
        self.test_chat()
        self.test_proactive_message()
        self.test_opening_message()
        self.test_should_send_proactive()
        
        # Print summary
        print("\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        
        if self.failures:
            print("\n❌ Failures:")
            for failure in self.failures:
                print(f"  - {failure}")
        
        return self.tests_passed == self.tests_run

def main():
    # Get the backend URL from the frontend .env file
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    backend_url = line.strip().split('=')[1]
                    break
    except Exception as e:
        print(f"Error reading .env file: {e}")
        backend_url = "https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"
    
    tester = APITester(backend_url)
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
