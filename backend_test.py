
import requests
import sys
import uuid
from datetime import datetime

class PersonalityAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        print(f"Testing with user ID: {self.user_id}")

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
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

    def test_get_personalities(self):
        """Test getting available personalities"""
        success, response = self.run_test(
            "Get Available Personalities",
            "GET",
            "personalities",
            200
        )
        if success:
            print(f"Available personalities: {len(response.get('personalities', []))}")
            for p in response.get('personalities', []):
                print(f"  - {p.get('name')} ({p.get('id')})")
        return success

    def test_create_public_personality(self, name, description, scenario, is_public=True, tags=None):
        """Test creating a public personality"""
        personality_id = f"test_personality_{uuid.uuid4().hex[:8]}"
        
        data = {
            "id": personality_id,
            "name": name,
            "description": description,
            "scenario": scenario,
            "emoji": "🤖",
            "customImage": None,
            "prompt": f"You are {name}, a {description}. {scenario}",
            "creator_id": self.user_id,
            "is_public": is_public,
            "created_at": datetime.utcnow().isoformat(),
            "tags": tags or []
        }
        
        success, response = self.run_test(
            f"Create {'Public' if is_public else 'Private'} Personality",
            "POST",
            "personalities/public",
            200,
            data=data
        )
        
        if success:
            print(f"Created personality with ID: {response.get('personality_id')}")
            return personality_id
        return None

    def test_get_public_personalities(self):
        """Test getting public personalities"""
        success, response = self.run_test(
            "Get Public Personalities",
            "GET",
            "personalities/public",
            200
        )
        if success:
            print(f"Public personalities: {len(response.get('personalities', []))}")
            for p in response.get('personalities', [])[:5]:  # Show first 5
                print(f"  - {p.get('name')} (Creator: {p.get('creator_id')}, Tags: {p.get('tags')})")
        return success

    def test_get_user_personalities(self):
        """Test getting user's personalities"""
        success, response = self.run_test(
            "Get User Personalities",
            "GET",
            f"personalities/user/{self.user_id}",
            200
        )
        if success:
            print(f"User personalities: {len(response.get('personalities', []))}")
            for p in response.get('personalities', []):
                print(f"  - {p.get('name')} (Public: {p.get('is_public')})")
        return success

    def test_get_specific_public_personality(self, personality_id):
        """Test getting a specific public personality"""
        success, response = self.run_test(
            "Get Specific Public Personality",
            "GET",
            f"personalities/public/{personality_id}",
            200
        )
        if success:
            print(f"Retrieved personality: {response.get('name')}")
            print(f"Description: {response.get('description')}")
            print(f"Scenario: {response.get('scenario')}")
            print(f"Tags: {response.get('tags')}")
        return success

def main():
    # Get the backend URL from environment
    backend_url = "https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = PersonalityAPITester(backend_url)
    
    # Run tests
    tester.test_get_personalities()
    
    # Test creating public personality
    public_id = tester.test_create_public_personality(
        name="Test Public Personality",
        description="A test personality for API validation",
        scenario="You are testing the public personality API",
        is_public=True,
        tags=["test", "api", "public"]
    )
    
    # Test creating private personality
    private_id = tester.test_create_public_personality(
        name="Test Private Personality",
        description="A private test personality",
        scenario="You are testing the private personality API",
        is_public=False,
        tags=[]
    )
    
    # Test getting public personalities
    tester.test_get_public_personalities()
    
    # Test getting user personalities
    tester.test_get_user_personalities()
    
    # Test getting specific public personality
    if public_id:
        tester.test_get_specific_public_personality(public_id)
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
