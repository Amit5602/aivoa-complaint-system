import os
import json
import re
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY)

class ComplaintState(TypedDict):
    complaint_text: str
    product_name: str
    batch_number: str
    category: str
    extracted_fields: dict
    risk_level: str
    risk_score: float
    complaint_summary: str
    root_cause: str
    capa: str
    reg_flags: List[str]
    completeness_score: float
    duplicate_ids: List[str]
    current_step: str
    errors: List[str]

def call_groq(system_prompt, user_prompt, model="llama-3.1-8b-instant"):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.2, max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"ERROR: {str(e)}"

def safe_json_parse(text, fallback):
    try:
        return json.loads(text)
    except:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return fallback

def node_extract_fields(state):
    system = 'Extract complaint info. Return ONLY JSON: {"customer_name":null,"customer_email":null,"customer_company":null,"product_name":null,"batch_number":null,"manufacturing_date":null,"expiry_date":null,"complaint_category":"Quality|Packaging|Labeling|Efficacy|Contamination|Other","complaint_description":null,"complaint_date":null}'
    result = call_groq(system, f"Extract from:\n{state['complaint_text']}")
    extracted = safe_json_parse(result, {})
    if state.get("product_name"): extracted["product_name"] = state["product_name"]
    if state.get("batch_number"): extracted["batch_number"] = state["batch_number"]
    if state.get("category"): extracted["complaint_category"] = state["category"]
    state["extracted_fields"] = extracted
    state["current_step"] = "extracted"
    return state

def node_risk_classification(state):
    system = 'ICH Q9 risk expert. Return ONLY JSON: {"risk_level":"Critical|Major|Minor","risk_score":5.0}. Critical=8-10 patient safety, Major=4-7 quality defect, Minor=0-3 cosmetic'
    result = call_groq(system, f"Complaint: {state['complaint_text']}\nCategory: {state['extracted_fields'].get('complaint_category','Unknown')}")
    parsed = safe_json_parse(result, {"risk_level": "Minor", "risk_score": 2.0})
    state["risk_level"] = parsed.get("risk_level", "Minor")
    state["risk_score"] = float(parsed.get("risk_score", 2.0))
    state["current_step"] = "risk_done"
    return state

def node_gen_summary(state):
    result = call_groq("Write a 2-3 sentence QMS complaint summary. Plain text only.", f"Complaint: {state['complaint_text']}\nRisk: {state['risk_level']}")
    state["complaint_summary"] = result.strip()
    state["current_step"] = "summary_done"
    return state

def node_root_cause_capa(state):
    system = 'Pharma CAPA expert. Return ONLY JSON: {"root_cause":"2-3 sentence analysis","capa":"1. Action one\\n2. Action two\\n3. Action three\\n4. Action four"}'
    result = call_groq(system, f"Complaint: {state['complaint_text']}\nRisk: {state['risk_level']}\nProduct: {state['extracted_fields'].get('product_name','Unknown')}", model="llama-3.3-70b-versatile")
    parsed = safe_json_parse(result, {"root_cause": "Further investigation required.", "capa": "1. Initiate investigation\n2. Review batch records\n3. Risk assessment\n4. Corrective actions"})
    state["root_cause"] = parsed.get("root_cause", "Further investigation required.")
    state["capa"] = parsed.get("capa", "Initiate CAPA process.")
    state["current_step"] = "capa_done"
    return state

def node_reg_check(state):
    system = 'Pharma regulatory expert. Return ONLY JSON: {"flags":["flag1","flag2"]}. Choose from: FDA 21 CFR Part 211, ICH Q9 Risk Management, ICH Q10 Pharmaceutical QMS, EU GMP Annex 11, Schedule M India CDSCO, WHO GMP, Pharmacovigilance Required, MedWatch Report Required'
    result = call_groq(system, f"Complaint: {state['complaint_text']}\nRisk: {state['risk_level']}")
    parsed = safe_json_parse(result, {"flags": ["ICH Q10 Pharmaceutical QMS"]})
    state["reg_flags"] = parsed.get("flags", [])
    state["current_step"] = "reg_done"
    return state

def node_completeness(state):
    fields = ["customer_name","product_name","batch_number","complaint_category","complaint_description","manufacturing_date","expiry_date","complaint_date"]
    e = state["extracted_fields"]
    filled = sum(1 for f in fields if e.get(f) and e[f] not in [None,"null",""])
    state["completeness_score"] = round((filled/len(fields))*100, 1)
    state["duplicate_ids"] = []
    state["current_step"] = "complete"
    return state

def build_complaint_graph():
    g = StateGraph(ComplaintState)
    g.add_node("s1_extract", node_extract_fields)
    g.add_node("s2_risk", node_risk_classification)
    g.add_node("s3_summary", node_gen_summary)
    g.add_node("s4_capa", node_root_cause_capa)
    g.add_node("s5_reg", node_reg_check)
    g.add_node("s6_done", node_completeness)
    g.set_entry_point("s1_extract")
    g.add_edge("s1_extract","s2_risk")
    g.add_edge("s2_risk","s3_summary")
    g.add_edge("s3_summary","s4_capa")
    g.add_edge("s4_capa","s5_reg")
    g.add_edge("s5_reg","s6_done")
    g.add_edge("s6_done", END)
    return g.compile()

complaint_graph = build_complaint_graph()

def analyze_complaint(complaint_text, product_name="", batch_number="", category=""):
    initial_state = ComplaintState(
        complaint_text=complaint_text, product_name=product_name,
        batch_number=batch_number, category=category,
        extracted_fields={}, risk_level="Minor", risk_score=0.0,
        complaint_summary="", root_cause="", capa="", reg_flags=[],
        completeness_score=0.0, duplicate_ids=[], current_step="start", errors=[]
    )
    result = complaint_graph.invoke(initial_state)
    return {
        "risk_level": result["risk_level"],
        "risk_score": result["risk_score"],
        "summary": result["complaint_summary"],
        "root_cause_suggestion": result["root_cause"],
        "capa_recommendation": result["capa"],
        "regulatory_flags": result["reg_flags"],
        "completeness_score": result["completeness_score"],
        "extracted_fields": result["extracted_fields"],
        "duplicate_ids": result["duplicate_ids"]
    }
