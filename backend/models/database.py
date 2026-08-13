from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Float, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum

# DATABASE_URL = "postgresql://user:password@localhost:5432/aivoa_complaints"
DATABASE_URL = "sqlite:///./complaints.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class RiskLevel(str, enum.Enum):
    CRITICAL = "Critical"
    MAJOR = "Major"
    MINOR = "Minor"

class ComplaintStatus(str, enum.Enum):
    OPEN = "Open"
    IN_REVIEW = "In Review"
    CAPA_INITIATED = "CAPA Initiated"
    CLOSED = "Closed"

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(50), unique=True, index=True)
    
    # Customer Info
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_company = Column(String(255))
    
    # Product Info
    product_name = Column(String(255))
    batch_number = Column(String(100))
    product_code = Column(String(100))
    manufacturing_date = Column(String(50))
    expiry_date = Column(String(50))
    
    # Complaint Details
    complaint_category = Column(String(100))  # e.g. Quality, Packaging, Labeling
    complaint_description = Column(Text)
    complaint_date = Column(String(50))
    
    # AI Analysis
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.MINOR)
    risk_score = Column(Float, default=0.0)
    ai_summary = Column(Text)
    root_cause_suggestion = Column(Text)
    capa_recommendation = Column(Text)
    regulatory_flags = Column(Text)  # JSON string
    duplicate_of = Column(String(50), nullable=True)
    completeness_score = Column(Float, default=0.0)
    
    # Status
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.OPEN)
    assigned_to = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
