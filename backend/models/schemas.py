from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class ComplaintCreate(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_company: Optional[str] = None
    product_name: str
    batch_number: Optional[str] = None
    product_code: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    complaint_category: Optional[str] = None
    complaint_description: str
    complaint_date: Optional[str] = None
    assigned_to: Optional[str] = None

class ComplaintResponse(BaseModel):
    id: int
    complaint_id: str
    customer_name: str
    customer_email: Optional[str]
    customer_company: Optional[str]
    product_name: str
    batch_number: Optional[str]
    product_code: Optional[str]
    complaint_category: Optional[str]
    complaint_description: str
    risk_level: str
    risk_score: float
    ai_summary: Optional[str]
    root_cause_suggestion: Optional[str]
    capa_recommendation: Optional[str]
    regulatory_flags: Optional[str]
    duplicate_of: Optional[str]
    completeness_score: float
    status: str
    assigned_to: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AIAnalysisRequest(BaseModel):
    complaint_text: str
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    category: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    risk_level: str
    risk_score: float
    summary: str
    root_cause_suggestion: str
    capa_recommendation: str
    regulatory_flags: List[str]
    completeness_score: float
    extracted_fields: dict
    duplicate_ids: List[str]

class ParseDocumentRequest(BaseModel):
    text_content: str  # raw text from email/PDF/user input

class ParseDocumentResponse(BaseModel):
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_company: Optional[str]
    product_name: Optional[str]
    batch_number: Optional[str]
    complaint_category: Optional[str]
    complaint_description: Optional[str]
    complaint_date: Optional[str]
    confidence: float
