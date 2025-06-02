
import requests
import sys
import uuid
from datetime import datetime
import time

class JobMatchAPITester:
    def __init__(self, base_url="https://fd3c5f9f-98cc-47da-9429-5b24b297f2d8.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_job_ids = []

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
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test the API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_get_categories(self):
        """Test getting job categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        if success:
            print(f"Available categories: {response}")
        return success

    def test_create_employer_job(self):
        """Create an employer job posting"""
        job_data = {
            "job_type": "seeking_worker",
            "category": "electrician",
            "name": f"Test Employer {uuid.uuid4().hex[:8]}",
            "phone": "123-456-7890",
            "hourly_rate": 25.50,
            "experience_level": 2,
            "description": "Need an experienced electrician for home rewiring project",
            "location": "Berlin, Germany"
        }
        
        success, response = self.run_test(
            "Create Employer Job",
            "POST",
            "jobs",
            200,
            data=job_data
        )
        
        if success and 'id' in response:
            self.employer_job_id = response['id']
            self.created_job_ids.append(self.employer_job_id)
            print(f"Created employer job with ID: {self.employer_job_id}")
            return True
        return False

    def test_create_worker_job(self):
        """Create a worker job posting"""
        job_data = {
            "job_type": "seeking_work",
            "category": "electrician",
            "name": f"Test Worker {uuid.uuid4().hex[:8]}",
            "phone": "987-654-3210",
            "hourly_rate": 22.00,
            "experience_level": 3,
            "description": "Experienced electrician available for all types of electrical work",
            "location": "Berlin, Germany"
        }
        
        success, response = self.run_test(
            "Create Worker Job",
            "POST",
            "jobs",
            200,
            data=job_data
        )
        
        if success and 'id' in response:
            self.worker_job_id = response['id']
            self.created_job_ids.append(self.worker_job_id)
            print(f"Created worker job with ID: {self.worker_job_id}")
            return True
        return False

    def test_get_all_jobs(self):
        """Get all job postings"""
        success, response = self.run_test(
            "Get All Jobs",
            "GET",
            "jobs",
            200
        )
        
        if success:
            print(f"Found {len(response)} job postings")
            return True
        return False

    def test_get_job_by_id(self):
        """Get a specific job by ID"""
        if not hasattr(self, 'employer_job_id'):
            print("❌ No employer job ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Job By ID",
            "GET",
            f"jobs/{self.employer_job_id}",
            200
        )
        
        if success:
            print(f"Successfully retrieved job: {response['name']}")
            return True
        return False

    def test_get_potential_matches(self):
        """Test getting potential matches for a job"""
        if not hasattr(self, 'employer_job_id'):
            print("❌ No employer job ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Potential Matches",
            "GET",
            f"jobs/{self.employer_job_id}/potential-matches",
            200
        )
        
        if success:
            print(f"Found {len(response)} potential matches")
            return True
        return False

    def test_show_interest(self):
        """Test showing interest in a job"""
        if not hasattr(self, 'employer_job_id') or not hasattr(self, 'worker_job_id'):
            print("❌ Job IDs not available for testing interest")
            return False
            
        interest_data = {
            "job_id": self.employer_job_id,
            "interested_in_job_id": self.worker_job_id
        }
        
        success, response = self.run_test(
            "Show Interest (Employer → Worker)",
            "POST",
            "show-interest",
            200,
            data=interest_data
        )
        
        if success:
            print(f"Interest response: {response}")
            
            # Now show interest from worker to employer to create a match
            interest_data = {
                "job_id": self.worker_job_id,
                "interested_in_job_id": self.employer_job_id
            }
            
            success2, response2 = self.run_test(
                "Show Interest (Worker → Employer)",
                "POST",
                "show-interest",
                200,
                data=interest_data
            )
            
            if success2:
                print(f"Mutual interest response: {response2}")
                if response2.get('is_matched', False):
                    print("🎉 Successfully created a match!")
                return True
            return False
        return False

    def test_get_matches(self):
        """Test getting matches for a job"""
        if not hasattr(self, 'employer_job_id'):
            print("❌ No employer job ID available for testing")
            return False
            
        # Give the system a moment to process the match
        time.sleep(1)
            
        success, response = self.run_test(
            "Get Matches",
            "GET",
            f"matches/{self.employer_job_id}",
            200
        )
        
        if success:
            print(f"Found {len(response)} matches")
            if len(response) > 0:
                print(f"Match details: Employer: {response[0]['employer']['name']}, Worker: {response[0]['worker']['name']}")
            return True
        return False

def main():
    # Setup
    tester = JobMatchAPITester()
    
    # Run tests
    print("\n===== TESTING JOB MATCHING API =====\n")
    
    # Basic API tests
    tester.test_api_root()
    tester.test_get_categories()
    
    # Job posting tests
    tester.test_create_employer_job()
    tester.test_create_worker_job()
    tester.test_get_all_jobs()
    tester.test_get_job_by_id()
    
    # Matching tests
    tester.test_get_potential_matches()
    tester.test_show_interest()
    tester.test_get_matches()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
