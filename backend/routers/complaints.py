from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime

from models.database import get_db, Complaint, ComplaintStatus
from models.schemas import ComplaintCreate, ComplaintResponse
from agents.complaint_agent import analyze_complaint
import json

router = APIRouter()

def generate_complaint_id():
    now = datetime.utcnow()
    return f"CC-{now.year}-{str(uuid.uuid4().int)[:6].upper()}"

@router.post("/", response_model=ComplaintResponse)
def create_complaint(complaint: ComplaintCreate, db: Session = Depends(get_db)):
    # Run AI analysis
    ai_result = analyze_complaint(
        complaint_text=complaint.complaint_description,
        product_name=complaint.product_name or "",
        batch_number=complaint.batch_number or "",
        category=complaint.complaint_category or ""
    )
    
    # Merge extracted fields with provided data
    extracted = ai_result.get("extracted_fields", {})
    
    db_complaint = Complaint(
        complaint_id=generate_complaint_id(),
        customer_name=complaint.customer_name or extracted.get("customer_name", ""),
        customer_email=complaint.customer_email or extracted.get("customer_email"),
        customer_company=complaint.customer_company or extracted.get("customer_company"),
        product_name=complaint.product_name or extracted.get("product_name", ""),
        batch_number=complaint.batch_number or extracted.get("batch_number"),
        product_code=complaint.product_code,
        manufacturing_date=complaint.manufacturing_date or extracted.get("manufacturing_date"),
        expiry_date=complaint.expiry_date or extracted.get("expiry_date"),
        complaint_category=complaint.complaint_category or extracted.get("complaint_category"),
        complaint_description=complaint.complaint_description,
        complaint_date=complaint.complaint_date or extracted.get("complaint_date"),
        risk_level=ai_result["risk_level"],
        risk_score=ai_result["risk_score"],
        ai_summary=ai_result["summary"],
        root_cause_suggestion=ai_result["root_cause_suggestion"],
        capa_recommendation=ai_result["capa_recommendation"],
        regulatory_flags=json.dumps(ai_result["regulatory_flags"]),
        completeness_score=ai_result["completeness_score"],
        duplicate_of=ai_result["duplicate_ids"][0] if ai_result["duplicate_ids"] else None,
        assigned_to=complaint.assigned_to,
        status=ComplaintStatus.OPEN
    )
    
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint

@router.get("/", response_model=List[ComplaintResponse])
def list_complaints(
    skip: int = 0,
    limit: int = 50,
    status: str = None,
    risk_level: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if status:
        query = query.filter(Complaint.status == status)
    if risk_level:
        query = query.filter(Complaint.risk_level == risk_level)
    return query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.patch("/{complaint_id}/status")
def update_status(complaint_id: str, status: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    complaint.status = status
    db.commit()
    return {"message": "Status updated", "status": status}

@router.get("/stats/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    critical = db.query(Complaint).filter(Complaint.risk_level == "Critical").count()
    major = db.query(Complaint).filter(Complaint.risk_level == "Major").count()
    minor = db.query(Complaint).filter(Complaint.risk_level == "Minor").count()
    open_count = db.query(Complaint).filter(Complaint.status == "Open").count()
    
    return {
        "total": total,
        "critical": critical,
        "major": major,
        "minor": minor,
        "open": open_count,
        "closed": total - open_count
    }
