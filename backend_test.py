
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

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
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

    def test_health_check(self):
        """Test API health check endpoint"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "health",
            200
        )
        if success:
            print(f"Health status: {response.get('status')}")
            print(f"Service: {response.get('service')}")
        return success

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

    def test_create_public_personality(self, name, description, scenario, gender="female", is_public=True, tags=None):
        """Test creating a public personality"""
        personality_id = f"test_personality_{uuid.uuid4().hex[:8]}"
        
        data = {
            "id": personality_id,
            "name": name,
            "description": description,
            "scenario": scenario,
            "emoji": "🤖",
            "customImage": "",  # Empty string instead of None
            "prompt": f"You are {name}, a {description}. {scenario}",
            "gender": gender,  # Added gender field
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

    def test_get_public_personalities_with_gender_filter(self, gender):
        """Test getting public personalities filtered by gender"""
        success, response = self.run_test(
            f"Get Public Personalities with Gender Filter ({gender})",
            "GET",
            "personalities/public",
            200,
            params={"gender": gender}
        )
        if success:
            print(f"Public personalities with gender '{gender}': {len(response.get('personalities', []))}")
            for p in response.get('personalities', [])[:5]:  # Show first 5
                print(f"  - {p.get('name')} (Gender: {p.get('gender')}, Creator: {p.get('creator_id')})")
            
            # Verify all returned personalities have the requested gender
            all_match = all(p.get('gender') == gender for p in response.get('personalities', []))
            if all_match:
                print(f"✅ All returned personalities have gender: {gender}")
            else:
                print(f"❌ Some personalities don't match the requested gender: {gender}")
                self.tests_passed -= 1  # Decrement passed tests count
                return False
        return success

    def test_get_public_personalities_with_tags_filter(self, tags):
        """Test getting public personalities filtered by tags"""
        tags_str = ",".join(tags)
        success, response = self.run_test(
            f"Get Public Personalities with Tags Filter ({tags_str})",
            "GET",
            "personalities/public",
            200,
            params={"tags": tags_str}
        )
        if success:
            print(f"Public personalities with tags '{tags_str}': {len(response.get('personalities', []))}")
            for p in response.get('personalities', [])[:5]:  # Show first 5
                print(f"  - {p.get('name')} (Tags: {p.get('tags')}, Creator: {p.get('creator_id')})")
            
            # Verify all returned personalities have at least one of the requested tags
            all_match = all(any(tag in p.get('tags', []) for tag in tags) for p in response.get('personalities', []))
            if all_match:
                print(f"✅ All returned personalities have at least one of the requested tags: {tags}")
            else:
                print(f"❌ Some personalities don't match any of the requested tags: {tags}")
                self.tests_passed -= 1  # Decrement passed tests count
                return False
        return success

    def test_get_available_tags(self):
        """Test getting available tags"""
        success, response = self.run_test(
            "Get Available Tags",
            "GET",
            "personalities/tags",
            200
        )
        if success:
            print(f"Popular tags: {len(response.get('popular_tags', []))}")
            for tag in response.get('popular_tags', [])[:5]:  # Show first 5
                print(f"  - {tag.get('tag')} (Count: {tag.get('count')})")
            
            print(f"Categories: {len(response.get('categories', []))}")
            for category in response.get('categories', [])[:3]:  # Show first 3
                print(f"  - {category.get('category')}: {', '.join(category.get('tags', []))}")
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
            print(f"Gender: {response.get('gender')}")
            print(f"Tags: {response.get('tags')}")
        return success

def main():
    # Get the backend URL from environment
    backend_url = "https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"
    
    print(f"Testing API at: {backend_url}")
    
    # Setup tester
    tester = PersonalityAPITester(backend_url)
    
    # Test API health
    tester.test_health_check()
    
    # Test getting available tags
    tester.test_get_available_tags()
    
    # Run basic tests
    tester.test_get_personalities()
    
    # Test creating public personalities with different genders
    female_id = tester.test_create_public_personality(
        name="Test Female Personality",
        description="A female test personality",
        scenario="You are testing the female personality API",
        gender="female",
        is_public=True,
        tags=["test", "female", "romantic"]
    )
    
    male_id = tester.test_create_public_personality(
        name="Test Male Personality",
        description="A male test personality",
        scenario="You are testing the male personality API",
        gender="male",
        is_public=True,
        tags=["test", "male", "gaming"]
    )
    
    # Test creating private personality
    private_id = tester.test_create_public_personality(
        name="Test Private Personality",
        description="A private test personality",
        scenario="You are testing the private personality API",
        gender="non-binary",
        is_public=False,
        tags=[]
    )
    
    # Test getting public personalities
    tester.test_get_public_personalities()
    
    # Test gender filtering
    tester.test_get_public_personalities_with_gender_filter("female")
    tester.test_get_public_personalities_with_gender_filter("male")
    
    # Test tag filtering
    tester.test_get_public_personalities_with_tags_filter(["romantic"])
    tester.test_get_public_personalities_with_tags_filter(["gaming"])
    tester.test_get_public_personalities_with_tags_filter(["romantic", "gaming"])
    
    # Test getting user personalities
    tester.test_get_user_personalities()
    
    # Test getting specific public personality
    if female_id:
        tester.test_get_specific_public_personality(female_id)
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
