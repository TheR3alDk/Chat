import requests
import unittest
import uuid
import time
import base64
from datetime import datetime, timedelta

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://0e14580d-f2ad-4ec3-b289-ebef5440154e.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class CustomPersonalityScenarioTester(unittest.TestCase):
    """Test the Custom Personality Scenario System"""

    def setUp(self):
        """Set up test variables"""
        self.test_id = str(uuid.uuid4())[:8]
        
        # Test personality data
        self.test_personalities = [
            {
                "id": f"test_barista_{self.test_id}",
                "name": "Maya the Barista",
                "description": "Friendly coffee shop owner",
                "emoji": "☕",
                "prompt": "You are Maya, a cheerful and energetic female barista who owns a small coffee shop. You're passionate about coffee, love meeting new people, and always have a warm smile. You're knowledgeable about different coffee beans and brewing methods.",
                "scenario": "You're working behind the counter at your coffee shop on a busy morning. The user just walked in as a new customer. The cafe smells amazing with fresh coffee brewing, and you're excited to welcome them."
            },
            {
                "id": f"test_study_buddy_{self.test_id}",
                "name": "Study Buddy",
                "description": "Academic helper",
                "emoji": "📚",
                "prompt": "You are a helpful and encouraging study partner who is excellent at explaining complex topics in simple terms. You're patient, organized, and good at keeping focus on the task at hand.",
                "scenario": "You're in the university library preparing for finals with the user. You have textbooks and notes spread out on the table, and you're ready to help them understand difficult concepts."
            },
            {
                "id": f"test_no_scenario_{self.test_id}",
                "name": "No Scenario Personality",
                "description": "A personality without a scenario",
                "emoji": "🤖",
                "prompt": "You are a helpful assistant who provides clear and concise information.",
                "scenario": ""
            }
        ]
        
        print(f"\n{'='*50}")
        print(f"Starting Custom Personality Scenario Tests")
        print(f"{'='*50}")

    def test_01_get_personalities(self):
        """Test getting the list of built-in personalities"""
        print("\n📋 Testing GET /personalities endpoint...")
        
        response = requests.get(f"{API_URL}/personalities")
        
        self.assertEqual(response.status_code, 200, "Failed to get personalities")
        data = response.json()
        
        self.assertIn("personalities", data, "Response missing 'personalities' key")
        self.assertGreater(len(data["personalities"]), 0, "No personalities returned")
        
        # Check for expected personality types
        personality_ids = [p["id"] for p in data["personalities"]]
        expected_ids = ["lover", "therapist", "best_friend", "fantasy_rpg", "neutral"]
        
        for expected_id in expected_ids:
            self.assertIn(expected_id, personality_ids, f"Missing expected personality: {expected_id}")
        
        print("✅ Successfully retrieved built-in personalities")
        return data["personalities"]

    def test_02_opening_message_with_scenario(self):
        """Test generating an opening message for a personality with a scenario"""
        print("\n💬 Testing POST /opening_message endpoint with scenario...")
        
        # Use the barista personality with scenario
        test_personality = self.test_personalities[0]
        
        request_data = {
            "messages": [],
            "personality": test_personality["id"],
            "custom_personalities": [test_personality],
            "custom_prompt": test_personality["prompt"],
            "max_tokens": 300,
            "temperature": 0.8
        }
        
        response = requests.post(f"{API_URL}/opening_message", json=request_data)
        
        self.assertEqual(response.status_code, 200, f"Failed to get opening message: {response.text}")
        data = response.json()
        
        # Check response structure
        self.assertIn("response", data, "Response missing 'response' key")
        self.assertIn("personality_used", data, "Response missing 'personality_used' key")
        self.assertIn("timestamp", data, "Response missing 'timestamp' key")
        
        # Check if response mentions coffee shop or barista context
        response_text = data["response"].lower()
        scenario_keywords = ["coffee", "shop", "cafe", "barista", "brew", "morning", "welcome"]
        
        keyword_found = any(keyword in response_text for keyword in scenario_keywords)
        self.assertTrue(keyword_found, f"Opening message doesn't reference scenario context: {data['response']}")
        
        print(f"✅ Successfully generated opening message with scenario reference")
        print(f"📝 Opening message: {data['response'][:100]}...")
        return data

    def test_03_opening_message_without_scenario(self):
        """Test that personalities without scenarios don't generate opening messages"""
        print("\n🚫 Testing POST /opening_message endpoint without scenario...")
        
        # Use the personality without a scenario
        test_personality = self.test_personalities[2]
        
        request_data = {
            "messages": [],
            "personality": test_personality["id"],
            "custom_personalities": [test_personality],
            "custom_prompt": test_personality["prompt"],
            "max_tokens": 300,
            "temperature": 0.8
        }
        
        response = requests.post(f"{API_URL}/opening_message", json=request_data)
        
        # Should return 400 Bad Request since there's no scenario
        self.assertEqual(response.status_code, 400, "Expected 400 error for personality without scenario")
        
        print("✅ Correctly rejected opening message request for personality without scenario")
        return response.json()

    def test_04_chat_with_scenario_context(self):
        """Test that chat responses maintain scenario context"""
        print("\n☕ Testing POST /chat endpoint with scenario context...")
        
        # Use the barista personality with scenario
        test_personality = self.test_personalities[0]
        
        # First message to establish context
        request_data = {
            "messages": [{"role": "user", "content": "Hi there! Can you recommend a coffee?"}],
            "personality": test_personality["id"],
            "custom_personalities": [test_personality],
            "custom_prompt": test_personality["prompt"],
            "is_first_message": True,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        response = requests.post(f"{API_URL}/chat", json=request_data)
        
        self.assertEqual(response.status_code, 200, f"Failed to get chat response: {response.text}")
        data = response.json()
        
        # Check response structure
        self.assertIn("response", data, "Response missing 'response' key")
        self.assertIn("personality_used", data, "Response missing 'personality_used' key")
        
        # Check if response maintains coffee shop context
        response_text = data["response"].lower()
        scenario_keywords = ["coffee", "brew", "roast", "espresso", "latte", "beans", "shop", "cafe"]
        
        keyword_found = any(keyword in response_text for keyword in scenario_keywords)
        self.assertTrue(keyword_found, f"Chat response doesn't maintain scenario context: {data['response']}")
        
        # Follow-up message to test continued context
        follow_up_request = {
            "messages": [
                {"role": "user", "content": "Hi there! Can you recommend a coffee?"},
                {"role": "assistant", "content": data["response"]},
                {"role": "user", "content": "Tell me about your coffee shop."}
            ],
            "personality": test_personality["id"],
            "custom_personalities": [test_personality],
            "custom_prompt": test_personality["prompt"],
            "is_first_message": False,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        follow_up_response = requests.post(f"{API_URL}/chat", json=follow_up_request)
        
        self.assertEqual(follow_up_response.status_code, 200, "Failed to get follow-up chat response")
        follow_up_data = follow_up_response.json()
        
        # Check if follow-up response maintains coffee shop context
        follow_up_text = follow_up_data["response"].lower()
        shop_keywords = ["shop", "cafe", "store", "business", "customers", "coffee", "barista"]
        
        shop_keyword_found = any(keyword in follow_up_text for keyword in shop_keywords)
        self.assertTrue(shop_keyword_found, f"Follow-up response doesn't maintain scenario context: {follow_up_data['response']}")
        
        print("✅ Successfully maintained scenario context in chat responses")
        print(f"📝 Initial response: {data['response'][:100]}...")
        print(f"📝 Follow-up response: {follow_up_data['response'][:100]}...")
        return follow_up_data

    def test_05_image_generation(self):
        """Test image generation in chat"""
        print("\n🖼️ Testing image generation in chat...")
        
        # Use the barista personality with scenario
        test_personality = self.test_personalities[0]
        
        request_data = {
            "messages": [{"role": "user", "content": "Show me what your coffee shop looks like"}],
            "personality": test_personality["id"],
            "custom_personalities": [test_personality],
            "custom_prompt": test_personality["prompt"],
            "is_first_message": False,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        response = requests.post(f"{API_URL}/chat", json=request_data)
        
        self.assertEqual(response.status_code, 200, f"Failed to get chat response with image: {response.text}")
        data = response.json()
        
        # Check if image was generated (may not always generate an image, so this is a soft check)
        if "image" in data and data["image"]:
            print("✅ Successfully generated image in chat response")
            
            # Verify image is valid base64
            try:
                image_data = base64.b64decode(data["image"])
                self.assertGreater(len(image_data), 100, "Image data too small to be valid")
                print(f"✅ Image data is valid (size: {len(image_data)} bytes)")
            except Exception as e:
                self.fail(f"Invalid base64 image data: {str(e)}")
        else:
            print("⚠️ No image generated in response (this may be expected behavior)")
        
        return data

    def test_06_direct_image_generation(self):
        """Test direct image generation endpoint"""
        print("\n🎨 Testing POST /generate_image endpoint...")
        
        request_data = {
            "prompt": "A cozy coffee shop with warm lighting, coffee beans, and a friendly barista",
            "style": "realistic"
        }
        
        response = requests.post(f"{API_URL}/generate_image", json=request_data)
        
        self.assertEqual(response.status_code, 200, f"Failed to generate image: {response.text}")
        data = response.json()
        
        # Check response structure
        self.assertIn("image", data, "Response missing 'image' key")
        self.assertIn("prompt", data, "Response missing 'prompt' key")
        self.assertIn("style", data, "Response missing 'style' key")
        
        # Verify image is valid base64
        try:
            image_data = base64.b64decode(data["image"])
            self.assertGreater(len(image_data), 100, "Image data too small to be valid")
            print(f"✅ Successfully generated direct image (size: {len(image_data)} bytes)")
        except Exception as e:
            self.fail(f"Invalid base64 image data: {str(e)}")
        
        return data

    def test_07_proactive_message_check(self):
        """Test checking if it's time to send a proactive message"""
        print("\n⏰ Testing GET /should_send_proactive endpoint...")
        
        # Test with a recent timestamp (should not send)
        recent_time = datetime.utcnow().isoformat()
        response_recent = requests.get(f"{API_URL}/should_send_proactive/best_friend?last_message_time={recent_time}")
        
        self.assertEqual(response_recent.status_code, 200, "Failed to check proactive timing (recent)")
        data_recent = response_recent.json()
        
        self.assertIn("should_send", data_recent, "Response missing 'should_send' key")
        self.assertFalse(data_recent["should_send"], "Should not send proactive message for recent timestamp")
        
        # Test with an old timestamp (should send)
        old_time = (datetime.utcnow() - timedelta(minutes=30)).isoformat()
        response_old = requests.get(f"{API_URL}/should_send_proactive/best_friend?last_message_time={old_time}")
        
        self.assertEqual(response_old.status_code, 200, "Failed to check proactive timing (old)")
        data_old = response_old.json()
        
        self.assertIn("should_send", data_old, "Response missing 'should_send' key")
        # This may be true or false depending on the exact timing configuration
        print(f"✅ Successfully checked proactive timing")
        print(f"📝 Recent check result: {data_recent['should_send']}")
        print(f"📝 Old check result: {data_old['should_send']}")
        
        return data_old

    def test_08_proactive_message_generation(self):
        """Test generating a proactive message"""
        print("\n💬 Testing POST /proactive_message endpoint...")
        
        # Use the barista personality with scenario
        test_personality = self.test_personalities[0]
        
        request_data = {
            "personality": test_personality["id"],
            "custom_personalities": [test_personality],
            "custom_prompt": test_personality["prompt"],
            "conversation_history": [
                {"role": "user", "content": "Hi there!"},
                {"role": "assistant", "content": "Welcome to Maya's Coffee Shop! What can I get for you today?"},
                {"role": "user", "content": "I'll have a latte please."}
            ],
            "time_since_last_message": 20  # 20 minutes since last message
        }
        
        response = requests.post(f"{API_URL}/proactive_message", json=request_data)
        
        self.assertEqual(response.status_code, 200, f"Failed to generate proactive message: {response.text}")
        data = response.json()
        
        # Check response structure
        self.assertIn("response", data, "Response missing 'response' key")
        self.assertIn("personality_used", data, "Response missing 'personality_used' key")
        self.assertIn("timestamp", data, "Response missing 'timestamp' key")
        
        # Check if response maintains coffee shop context
        response_text = data["response"].lower()
        scenario_keywords = ["coffee", "latte", "shop", "cafe", "barista"]
        
        keyword_found = any(keyword in response_text for keyword in scenario_keywords)
        self.assertTrue(keyword_found, f"Proactive message doesn't maintain scenario context: {data['response']}")
        
        print("✅ Successfully generated proactive message with scenario context")
        print(f"📝 Proactive message: {data['response'][:100]}...")
        return data

    def test_09_comparison_with_without_scenario(self):
        """Compare responses between personalities with and without scenarios"""
        print("\n🔄 Testing comparison between personalities with and without scenarios...")
        
        # Personality with scenario (barista)
        with_scenario = self.test_personalities[0]
        
        # Personality without scenario
        without_scenario = self.test_personalities[2]
        
        # Test with scenario
        with_request = {
            "messages": [{"role": "user", "content": "Hi there! How are you today?"}],
            "personality": with_scenario["id"],
            "custom_personalities": self.test_personalities,
            "custom_prompt": with_scenario["prompt"],
            "is_first_message": True,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        with_response = requests.post(f"{API_URL}/chat", json=with_request)
        self.assertEqual(with_response.status_code, 200, "Failed to get response for personality with scenario")
        with_data = with_response.json()
        
        # Test without scenario
        without_request = {
            "messages": [{"role": "user", "content": "Hi there! How are you today?"}],
            "personality": without_scenario["id"],
            "custom_personalities": self.test_personalities,
            "custom_prompt": without_scenario["prompt"],
            "is_first_message": True,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        without_response = requests.post(f"{API_URL}/chat", json=without_request)
        self.assertEqual(without_response.status_code, 200, "Failed to get response for personality without scenario")
        without_data = without_response.json()
        
        # Check if the with-scenario response references the scenario
        with_text = with_data["response"].lower()
        scenario_keywords = ["coffee", "shop", "cafe", "barista", "brew", "morning"]
        
        with_keyword_found = any(keyword in with_text for keyword in scenario_keywords)
        
        # The without-scenario response should not reference the coffee shop
        without_text = without_data["response"].lower()
        without_keyword_found = any(keyword in without_text for keyword in scenario_keywords)
        
        print("✅ Comparison complete")
        print(f"📝 With scenario: {with_data['response'][:100]}...")
        print(f"📝 Without scenario: {without_data['response'][:100]}...")
        print(f"📊 Scenario keywords in with-scenario response: {with_keyword_found}")
        print(f"📊 Scenario keywords in without-scenario response: {without_keyword_found}")
        
        return {
            "with_scenario": with_data,
            "without_scenario": without_data,
            "with_keyword_found": with_keyword_found,
            "without_keyword_found": without_keyword_found
        }

def run_tests():
    """Run all tests and print summary"""
    suite = unittest.TestLoader().loadTestsFromTestCase(CustomPersonalityScenarioTester)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    
    print(f"\n{'='*50}")
    print(f"Test Summary:")
    print(f"  Ran {result.testsRun} tests")
    print(f"  Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"  Failures: {len(result.failures)}")
    print(f"  Errors: {len(result.errors)}")
    print(f"{'='*50}")
    
    return result

if __name__ == "__main__":
    run_tests()
