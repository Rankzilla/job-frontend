from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class JobType(str, Enum):
    SEEKING_WORKER = "seeking_worker"  # Employers looking for workers
    SEEKING_WORK = "seeking_work"      # Workers looking for jobs

class JobCategory(str, Enum):
    HANDYMAN = "handyman"
    ELECTRICIAN = "electrician"
    PLUMBER = "plumber"
    PAINTER = "painter"
    ALLROUNDER = "allrounder"

class ExperienceLevel(int, Enum):
    BEGINNER = 1
    INTERMEDIATE = 2
    EXPERT = 3

# Models
class JobPosting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_type: JobType
    category: JobCategory
    name: str
    phone: str
    hourly_rate: float
    experience_level: ExperienceLevel
    description: str
    location: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class JobPostingCreate(BaseModel):
    job_type: JobType
    category: JobCategory
    name: str
    phone: str
    hourly_rate: float
    experience_level: ExperienceLevel
    description: str
    location: str

class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employer_job_id: str  # ID of "seeking_worker" job posting
    worker_job_id: str    # ID of "seeking_work" job posting
    employer_interested: bool = False
    worker_interested: bool = False
    is_matched: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    matched_at: Optional[datetime] = None

class InterestCreate(BaseModel):
    job_id: str
    interested_in_job_id: str

# Job posting endpoints
@api_router.post("/jobs", response_model=JobPosting)
async def create_job_posting(job_data: JobPostingCreate):
    job_dict = job_data.dict()
    job_obj = JobPosting(**job_dict)
    await db.job_postings.insert_one(job_obj.dict())
    return job_obj

@api_router.get("/jobs", response_model=List[JobPosting])
async def get_job_postings(job_type: Optional[JobType] = None, category: Optional[JobCategory] = None):
    query = {"is_active": True}
    if job_type:
        query["job_type"] = job_type
    if category:
        query["category"] = category
    
    jobs = await db.job_postings.find(query).sort("created_at", -1).to_list(1000)
    return [JobPosting(**job) for job in jobs]

@api_router.get("/jobs/{job_id}", response_model=JobPosting)
async def get_job_posting(job_id: str):
    job = await db.job_postings.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return JobPosting(**job)

# Matching endpoints
@api_router.get("/jobs/{job_id}/potential-matches", response_model=List[JobPosting])
async def get_potential_matches(job_id: str):
    """Get potential matches for a job posting"""
    current_job = await db.job_postings.find_one({"id": job_id})
    if not current_job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Get opposite job type for matching
    opposite_type = JobType.SEEKING_WORK if current_job["job_type"] == JobType.SEEKING_WORKER else JobType.SEEKING_WORKER
    
    # Find jobs in same category with opposite type
    query = {
        "job_type": opposite_type,
        "category": current_job["category"],
        "is_active": True,
        "id": {"$ne": job_id}  # Exclude self
    }
    
    # Get already shown interests to filter them out
    existing_matches = await db.matches.find({
        "$or": [
            {"employer_job_id": job_id},
            {"worker_job_id": job_id}
        ]
    }).to_list(1000)
    
    # Extract job IDs that have already been matched/shown
    excluded_job_ids = set()
    for match in existing_matches:
        if match["employer_job_id"] == job_id:
            excluded_job_ids.add(match["worker_job_id"])
        else:
            excluded_job_ids.add(match["employer_job_id"])
    
    if excluded_job_ids:
        query["id"] = {"$nin": list(excluded_job_ids)}
    
    potential_matches = await db.job_postings.find(query).sort("created_at", -1).to_list(50)
    return [JobPosting(**job) for job in potential_matches]

@api_router.post("/show-interest")
async def show_interest(interest: InterestCreate):
    """Show interest in a job posting"""
    job1 = await db.job_postings.find_one({"id": interest.job_id})
    job2 = await db.job_postings.find_one({"id": interest.interested_in_job_id})
    
    if not job1 or not job2:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Determine employer and worker job IDs
    if job1["job_type"] == JobType.SEEKING_WORKER:
        employer_job_id = interest.job_id
        worker_job_id = interest.interested_in_job_id
        employer_interested = True
        worker_interested = False
    else:
        employer_job_id = interest.interested_in_job_id
        worker_job_id = interest.job_id
        employer_interested = False
        worker_interested = True
    
    # Check if match already exists
    existing_match = await db.matches.find_one({
        "employer_job_id": employer_job_id,
        "worker_job_id": worker_job_id
    })
    
    if existing_match:
        # Update existing match
        update_data = {}
        if job1["job_type"] == JobType.SEEKING_WORKER:
            update_data["employer_interested"] = True
        else:
            update_data["worker_interested"] = True
        
        # Check if both are now interested
        new_employer_interested = existing_match.get("employer_interested", False) or update_data.get("employer_interested", False)
        new_worker_interested = existing_match.get("worker_interested", False) or update_data.get("worker_interested", False)
        
        if new_employer_interested and new_worker_interested:
            update_data["is_matched"] = True
            update_data["matched_at"] = datetime.utcnow()
        
        await db.matches.update_one(
            {"employer_job_id": employer_job_id, "worker_job_id": worker_job_id},
            {"$set": update_data}
        )
        
        return {"message": "Interest updated", "is_matched": update_data.get("is_matched", False)}
    else:
        # Create new match
        match_obj = Match(
            employer_job_id=employer_job_id,
            worker_job_id=worker_job_id,
            employer_interested=employer_interested,
            worker_interested=worker_interested
        )
        await db.matches.insert_one(match_obj.dict())
        return {"message": "Interest recorded", "is_matched": False}

@api_router.get("/matches/{job_id}", response_model=List[dict])
async def get_matches(job_id: str):
    """Get all matches for a job posting"""
    job = await db.job_postings.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    query = {
        "is_matched": True,
        "$or": [
            {"employer_job_id": job_id},
            {"worker_job_id": job_id}
        ]
    }
    
    matches = await db.matches.find(query).sort("matched_at", -1).to_list(1000)
    
    # Enrich matches with job details
    enriched_matches = []
    for match in matches:
        employer_job = await db.job_postings.find_one({"id": match["employer_job_id"]})
        worker_job = await db.job_postings.find_one({"id": match["worker_job_id"]})
        
        if employer_job and worker_job:
            enriched_matches.append({
                "match_id": match["id"],
                "matched_at": match["matched_at"],
                "employer": JobPosting(**employer_job).dict(),
                "worker": JobPosting(**worker_job).dict()
            })
    
    return enriched_matches

# Basic endpoints
@api_router.get("/")
async def root():
    return {"message": "Job Matching API"}

@api_router.get("/categories")
async def get_categories():
    return [{"value": cat.value, "label": cat.value.replace("_", " ").title()} for cat in JobCategory]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
