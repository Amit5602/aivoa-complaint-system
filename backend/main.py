from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import complaints, ai_agent

app = FastAPI(title="AIVOA Complaint Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router, prefix="/api/complaints", tags=["complaints"])
app.include_router(ai_agent.router, prefix="/api/ai", tags=["ai"])

@app.get("/")
def root():
    return {"message": "AIVOA Complaint Management System API"}
