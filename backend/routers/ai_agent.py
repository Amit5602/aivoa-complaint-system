from fastapi import APIRouter, UploadFile, File
from models.schemas import ParseDocumentRequest, ParseDocumentResponse, AIAnalysisRequest, AIAnalysisResponse
from agents.complaint_agent import analyze_complaint
import json

router = APIRouter()

@router.post("/parse-document", response_model=ParseDocumentResponse)
async def parse_document(request: ParseDocumentRequest):
    """
    Parse raw text (from email/PDF/user input) and extract complaint fields using AI.
    This powers the AI Copilot 'auto-fill' feature.
    """
    result = analyze_complaint(complaint_text=request.text_content)
    extracted = result.get("extracted_fields", {})
    
    return ParseDocumentResponse(
        customer_name=extracted.get("customer_name"),
        customer_email=extracted.get("customer_email"),
        customer_company=extracted.get("customer_company"),
        product_name=extracted.get("product_name"),
        batch_number=extracted.get("batch_number"),
        complaint_category=extracted.get("complaint_category"),
        complaint_description=extracted.get("complaint_description"),
        complaint_date=extracted.get("complaint_date"),
        confidence=result.get("completeness_score", 0) / 100
    )

@router.post("/analyze", response_model=AIAnalysisResponse)
async def analyze(request: AIAnalysisRequest):
    """
    Full AI analysis of a complaint - risk, CAPA, regulatory flags, etc.
    """
    result = analyze_complaint(
        complaint_text=request.complaint_text,
        product_name=request.product_name or "",
        batch_number=request.batch_number or "",
        category=request.category or ""
    )
    
    return AIAnalysisResponse(
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        summary=result["summary"],
        root_cause_suggestion=result["root_cause_suggestion"],
        capa_recommendation=result["capa_recommendation"],
        regulatory_flags=result["regulatory_flags"],
        completeness_score=result["completeness_score"],
        extracted_fields=result["extracted_fields"],
        duplicate_ids=result["duplicate_ids"]
    )

@router.post("/upload-complaint")
async def upload_complaint_file(file: UploadFile = File(...)):
    """
    Accept PDF or text file upload, extract text, return parsed fields.
    """
    content = await file.read()
    
    if file.filename.endswith('.pdf'):
        # In production: use PyMuPDF or pdfplumber
        # For demo: treat as text
        try:
            text = content.decode('utf-8', errors='ignore')
        except:
            text = str(content)
    else:
        text = content.decode('utf-8', errors='ignore')
    
    result = analyze_complaint(complaint_text=text)
    extracted = result.get("extracted_fields", {})
    
    return {
        "extracted_fields": extracted,
        "ai_analysis": {
            "risk_level": result["risk_level"],
            "risk_score": result["risk_score"],
            "summary": result["summary"],
            "completeness_score": result["completeness_score"]
        }
    }
