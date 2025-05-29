
import requests
import sys
import json
import time
import logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AICompanionTester:
    def __init__(self, base_url="https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, check_image=False, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        logging.info(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
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
                if response.text:
                    logging.error(f"Response: {response.text[:200]}")
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
            "messages": [{"role": "user", "content": message}],
            "personality": personality,
            "max_tokens": 1000,
            "temperature": 0.7
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
    
    def test_should_send_proactive(self, personality, last_message_time=None):
        """Test the should_send_proactive endpoint"""
        endpoint = f"should_send_proactive/{personality}"
        params = {}
        
        if last_message_time:
            params['last_message_time'] = last_message_time
            
        success, response = self.run_test(
            f"Should Send Proactive for {personality}",
            "GET",
            endpoint,
            200,
            params=params
        )
        
        if success and response:
            logging.info(f"Should send proactive: {response.get('should_send', False)}")
            return response.get('should_send', False), response
        
        return False, None
    
    def test_proactive_message(self, personality, conversation_history=None, time_since_last=0):
        """Test generating a proactive message"""
        data = {
            "personality": personality,
            "conversation_history": conversation_history or [],
            "time_since_last_message": time_since_last,
            "custom_personalities": []
        }
        
        success, response = self.run_test(
            f"Generate Proactive Message for {personality}",
            "POST",
            "proactive_message",
            200,
            data=data
        )
        
        if success and response:
            logging.info(f"Proactive message: {response.get('response', '')[:100]}...")
            return True, response
        
        return False, None

def test_proactive_messaging():
    """Test the proactive messaging feature with different personalities"""
    tester = AICompanionTester()
    
    # Test health endpoint first
    health_success, _ = tester.test_health()
    if not health_success:
        logging.error("Health check failed, stopping tests")
        return 1
    
    # Test personalities with their expected timing intervals
    personalities = {
        "lover": 15,        # 15 minutes
        "best_friend": 20,  # 20 minutes
        "fantasy_rpg": 30,  # 30 minutes
        "therapist": 45,    # 45 minutes
        "neutral": 60       # 60 minutes
    }
    
    # Test proactive timing checks
    logging.info("\n===== TESTING PROACTIVE TIMING CHECKS =====")
    timing_results = {}
    
    for personality, minutes in personalities.items():
        logging.info(f"\n----- Testing {personality.upper()} Timing -----")
        
        # Test with a recent message (should not trigger proactive)
        recent_time = datetime.utcnow().isoformat()
        should_send_recent, _ = tester.test_should_send_proactive(personality, recent_time)
        
        # Test with a message from the past (should trigger proactive)
        past_time = (datetime.utcnow() - timedelta(minutes=minutes+5)).isoformat()
        should_send_past, _ = tester.test_should_send_proactive(personality, past_time)
        
        timing_results[personality] = {
            "interval": minutes,
            "recent_message": {
                "time": recent_time,
                "should_send": should_send_recent
            },
            "past_message": {
                "time": past_time,
                "should_send": should_send_past
            }
        }
    
    # Test proactive message generation
    logging.info("\n===== TESTING PROACTIVE MESSAGE GENERATION =====")
    message_results = {}
    
    # Sample conversation history
    conversation_history = [
        {"role": "user", "content": "Hello, how are you today?"},
        {"role": "assistant", "content": "I'm doing great! How about you?"},
        {"role": "user", "content": "I'm good too, thanks for asking."}
    ]
    
    for personality in personalities.keys():
        logging.info(f"\n----- Testing {personality.upper()} Proactive Messages -----")
        
        # Test with no conversation history
        success_no_history, response_no_history = tester.test_proactive_message(
            personality, 
            None, 
            30  # 30 minutes since last message
        )
        
        # Test with conversation history
        success_with_history, response_with_history = tester.test_proactive_message(
            personality, 
            conversation_history, 
            60  # 60 minutes since last message
        )
        
        message_results[personality] = {
            "no_history": {
                "success": success_no_history,
                "message": response_no_history.get("response", "")[:50] + "..." if success_no_history else "Failed"
            },
            "with_history": {
                "success": success_with_history,
                "message": response_with_history.get("response", "")[:50] + "..." if success_with_history else "Failed"
            }
        }
    
    # Print summary
    logging.info("\n===== TEST SUMMARY =====")
    logging.info(f"Total tests run: {tester.tests_run}")
    logging.info(f"Tests passed: {tester.tests_passed}")
    logging.info(f"Tests failed: {tester.tests_failed}")
    
    logging.info("\nProactive Timing Results:")
    for personality, result in timing_results.items():
        logging.info(f"- {personality.capitalize()} (Interval: {result['interval']} minutes):")
        logging.info(f"  - Recent message: {'❌ Should not send' if not result['recent_message']['should_send'] else '⚠️ Incorrectly wants to send'}")
        logging.info(f"  - Past message: {'✅ Should send' if result['past_message']['should_send'] else '⚠️ Incorrectly does not want to send'}")
    
    logging.info("\nProactive Message Generation Results:")
    for personality, result in message_results.items():
        logging.info(f"- {personality.capitalize()}:")
        logging.info(f"  - No history: {'✅ Success' if result['no_history']['success'] else '❌ Failed'}")
        if result['no_history']['success']:
            logging.info(f"    Message: {result['no_history']['message']}")
        logging.info(f"  - With history: {'✅ Success' if result['with_history']['success'] else '❌ Failed'}")
        if result['with_history']['success']:
            logging.info(f"    Message: {result['with_history']['message']}")
    
    # Check if all tests passed
    timing_success = all(
        (not result['recent_message']['should_send'] and result['past_message']['should_send'])
        for result in timing_results.values()
    )
    
    message_success = all(
        (result['no_history']['success'] and result['with_history']['success'])
        for result in message_results.values()
    )
    
    overall_success = timing_success and message_success
    
    logging.info(f"\nOverall proactive messaging test result: {'✅ PASSED' if overall_success else '❌ FAILED'}")
    
    return 0 if overall_success else 1

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

def run_all_tests():
    """Run all test suites"""
    logging.info("\n===== RUNNING ALL TESTS =====")
    
    # Run proactive messaging tests
    logging.info("\n===== PROACTIVE MESSAGING TESTS =====")
    proactive_result = test_proactive_messaging()
    
    # Run self-image generation tests
    logging.info("\n===== SELF-IMAGE GENERATION TESTS =====")
    image_result = test_self_image_generation()
    
    # Overall result
    overall_success = proactive_result == 0 and image_result == 0
    logging.info(f"\n===== OVERALL TEST RESULT: {'✅ PASSED' if overall_success else '❌ FAILED'} =====")
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
