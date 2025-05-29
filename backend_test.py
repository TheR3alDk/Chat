
import requests
import sys
import json
import time
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AICompanionTester:
    def __init__(self, base_url="https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, check_image=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        logging.info(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            else:
                logging.error(f"Unsupported method: {method}")
                self.tests_failed += 1
                return False, None

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                logging.info(f"✅ Passed - Status: {response.status_code}")
                
                # Additional check for image if requested
                if check_image and 'image' in response.json():
                    if response.json()['image']:
                        logging.info(f"✅ Image data received - Length: {len(response.json()['image'])}")
                    else:
                        logging.warning("⚠️ No image data in response")
                        
                return True, response.json()
            else:
                self.tests_failed += 1
                logging.error(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                return False, None

        except Exception as e:
            self.tests_failed += 1
            logging.error(f"❌ Failed - Error: {str(e)}")
            return False, None

    def test_health(self):
        """Test the health endpoint"""
        return self.run_test("Health Check Endpoint", "GET", "health", 200)

    def test_chat_with_image_request(self, personality, message):
        """Test chat with a message that should trigger image generation"""
        data = {
            "message": message,
            "personality": personality,
            "conversation_history": []
        }
        
        logging.info(f"Testing image request with {personality} personality: '{message}'")
        success, response = self.run_test(
            f"Chat with {personality} - Image Request", 
            "POST", 
            "chat", 
            200, 
            data=data,
            check_image=True
        )
        
        if success and response:
            has_image = response.get('image') is not None
            logging.info(f"Image in response: {'✅ Yes' if has_image else '❌ No'}")
            if has_image:
                logging.info(f"Image prompt: {response.get('image_prompt')}")
            return has_image, response
        
        return False, None

def test_self_image_generation():
    """Test the self-image generation feature with different personalities"""
    tester = AICompanionTester()
    
    # Test health endpoint first
    health_success, _ = tester.test_health()
    if not health_success:
        logging.error("Health check failed, stopping tests")
        return 1
    
    # Test cases for self-image generation
    test_cases = [
        {"personality": "best_friend", "message": "Hey bestie, can you show me what you look like?"},
        {"personality": "fantasy_rpg", "message": "Show me your ethereal form"},
        {"personality": "lover", "message": "I want to see you, darling"},
        {"personality": "therapist", "message": "I'd like to put a face to the voice"},
        {"personality": "neutral", "message": "What do you look like?"}
    ]
    
    # Run tests for each personality
    results = {}
    for test_case in test_cases:
        personality = test_case["personality"]
        message = test_case["message"]
        
        # Make two requests to test consistency
        logging.info(f"\n===== Testing {personality.upper()} =====")
        
        # First request
        has_image1, response1 = tester.test_chat_with_image_request(personality, message)
        time.sleep(1)  # Small delay between requests
        
        # Second request (to test consistency)
        has_image2, response2 = tester.test_chat_with_image_request(personality, message)
        
        results[personality] = {
            "success": has_image1 or has_image2,
            "requests": {
                "Request 1": "✅ Passed" if has_image1 else "❌ Failed",
                "Request 2": "✅ Passed" if has_image2 else "❌ Failed"
            }
        }
    
    # Print summary
    logging.info("\n===== TEST SUMMARY =====")
    logging.info(f"Total tests run: {tester.tests_run}")
    logging.info(f"Tests passed: {tester.tests_passed}")
    logging.info(f"Tests failed: {tester.tests_failed}")
    
    logging.info("\nSelf-Image Generation Results:")
    for personality, result in results.items():
        logging.info(f"- {personality.capitalize()}: {'✅ Success' if result['success'] else '❌ Failed'}")
        logging.info(f"  Multiple requests to same personality:")
        for req, status in result["requests"].items():
            logging.info(f"  - {req}: {status}")
    
    return 0 if all(result["success"] for result in results.values()) else 1

if __name__ == "__main__":
    sys.exit(test_self_image_generation())
