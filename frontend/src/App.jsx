import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchComplaints, fetchDashboardStats, setActiveTab, setSelected,
  submitComplaint, parseDocument, analyzeComplaint, updateComplaintStatus,
  clearSubmitSuccess, clearAiAnalysis, clearParsedFields
} from "./store/complaintsSlice";

// ─── Risk Badge ─────────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const styles = {
    Critical: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" },
    Major:    { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" },
    Minor:    { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
  };
  return (
    <span style={{ ...styles[level] || styles.Minor, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
      {level || "Minor"}
    </span>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    "Open":           { bg: "#eff6ff", color: "#1d4ed8" },
    "In Review":      { bg: "#faf5ff", color: "#7e22ce" },
    "CAPA Initiated": { bg: "#fff7ed", color: "#c2410c" },
    "Closed":         { bg: "#f0fdf4", color: "#15803d" },
  };
  const s = map[status] || map["Open"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
      {status}
    </span>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent }) => (
  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", borderTop: `3px solid ${accent}` }}>
    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600, color: "#111827" }}>{value ?? "—"}</div>
  </div>
);

// ─── Dashboard Tab ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, list, loading } = useSelector(s => s.complaints);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchComplaints());
  }, []);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Complaints" value={stats?.total} accent="#6366f1" />
        <StatCard label="Open" value={stats?.open} accent="#3b82f6" />
        <StatCard label="Critical" value={stats?.critical} accent="#ef4444" />
        <StatCard label="Major" value={stats?.major} accent="#f59e0b" />
        <StatCard label="Minor" value={stats?.minor} accent="#22c55e" />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>Recent Complaints</h3>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{list.length} records</span>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>No complaints logged yet. <br />Use "Log Complaint" to add the first one.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["ID", "Customer", "Product", "Batch", "Category", "Risk", "Status", "Date"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 14px", color: "#6366f1", fontWeight: 500 }}>{c.complaint_id}</td>
                  <td style={{ padding: "10px 14px", color: "#111827" }}>{c.customer_name}</td>
                  <td style={{ padding: "10px 14px", color: "#111827" }}>{c.product_name}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7280", fontFamily: "monospace" }}>{c.batch_number || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#111827" }}>{c.complaint_category || "—"}</td>
                  <td style={{ padding: "10px 14px" }}><RiskBadge level={c.risk_level} /></td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: "10px 14px", color: "#6b7280" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── AI Copilot Panel ────────────────────────────────────────────────────────
const AICopilotPanel = ({ analysis, analyzing }) => {
  if (analyzing) {
    return (
      <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 12, padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#7c3aed" }}>
          <div style={{ width: 16, height: 16, border: "2px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <strong>AI Copilot is analyzing...</strong>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const riskColors = {
    Critical: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", bar: "#ef4444" },
    Major:    { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", bar: "#f59e0b" },
    Minor:    { bg: "#f0fdf4", border: "#86efac", text: "#166534", bar: "#22c55e" },
  };
  const rc = riskColors[analysis.risk_level] || riskColors.Minor;

  return (
    <div style={{ border: "1px solid #e9d5ff", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
      <div style={{ background: "#7c3aed", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <strong style={{ color: "#fff", fontSize: 14 }}>AI Copilot — Risk Assessment</strong>
        <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>Powered by Groq + LangGraph</span>
      </div>

      <div style={{ padding: 16, background: "#fff", display: "grid", gap: 12 }}>
        {/* Risk Level */}
        <div style={{ background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: rc.text, fontSize: 15 }}>Risk Level: {analysis.risk_level}</span>
            <span style={{ fontWeight: 700, color: rc.text, fontSize: 18 }}>{analysis.risk_score?.toFixed(1)}/10</span>
          </div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4 }}>
            <div style={{ width: `${(analysis.risk_score / 10) * 100}%`, height: "100%", background: rc.bar, borderRadius: 4, transition: "width 0.8s" }} />
          </div>
        </div>

        {/* Completeness */}
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>Form Completeness</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: analysis.completeness_score >= 80 ? "#15803d" : analysis.completeness_score >= 50 ? "#b45309" : "#b91c1c" }}>
              {analysis.completeness_score?.toFixed(0)}%
            </span>
          </div>
          <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3 }}>
            <div style={{ width: `${analysis.completeness_score}%`, height: "100%", background: analysis.completeness_score >= 80 ? "#22c55e" : analysis.completeness_score >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
          </div>
        </div>

        {/* Summary */}
        <Section title="📋 AI Summary" content={analysis.summary} />

        {/* Root Cause */}
        <Section title="🔍 Probable Root Cause" content={analysis.root_cause_suggestion} />

        {/* CAPA */}
        <div style={{ background: "#eff6ff", borderRadius: 10, padding: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1d4ed8", marginBottom: 6 }}>⚡ CAPA Recommendations</div>
          <div style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {analysis.capa_recommendation}
          </div>
        </div>

        {/* Regulatory Flags */}
        {analysis.regulatory_flags?.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>⚠️ Regulatory Flags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {analysis.regulatory_flags.map((f, i) => (
                <span key={i} style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, content }) => (
  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12 }}>
    <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{content || "—"}</div>
  </div>
);

// ─── Log Complaint Form ───────────────────────────────────────────────────────
const LogComplaintForm = () => {
  const dispatch = useDispatch();
  const { parsedFields, aiAnalysis, parsing, analyzing, submitting, submitSuccess } = useSelector(s => s.complaints);

  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_company: "",
    product_name: "", batch_number: "", product_code: "",
    manufacturing_date: "", expiry_date: "",
    complaint_category: "", complaint_description: "", complaint_date: "",
    assigned_to: ""
  });
  const [rawInput, setRawInput] = useState("");
  const [showRawInput, setShowRawInput] = useState(false);

  // Auto-fill form when AI parses a document
  useEffect(() => {
    if (parsedFields) {
      setForm(prev => ({
        ...prev,
        customer_name: parsedFields.customer_name || prev.customer_name,
        customer_email: parsedFields.customer_email || prev.customer_email,
        customer_company: parsedFields.customer_company || prev.customer_company,
        product_name: parsedFields.product_name || prev.product_name,
        batch_number: parsedFields.batch_number || prev.batch_number,
        complaint_category: parsedFields.complaint_category || prev.complaint_category,
        complaint_description: parsedFields.complaint_description || prev.complaint_description,
        complaint_date: parsedFields.complaint_date || prev.complaint_date,
      }));
    }
  }, [parsedFields]);

  // Clear form on success
  useEffect(() => {
    if (submitSuccess) {
      setTimeout(() => {
        setForm({ customer_name: "", customer_email: "", customer_company: "", product_name: "", batch_number: "", product_code: "", manufacturing_date: "", expiry_date: "", complaint_category: "", complaint_description: "", complaint_date: "", assigned_to: "" });
        setRawInput("");
        dispatch(clearSubmitSuccess());
        dispatch(clearParsedFields());
      }, 3000);
    }
  }, [submitSuccess]);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleParse = () => {
    if (rawInput.trim()) dispatch(parseDocument(rawInput));
  };

  const handleAnalyze = () => {
    if (form.complaint_description.trim()) {
      dispatch(analyzeComplaint({
        complaint_text: form.complaint_description,
        product_name: form.product_name,
        batch_number: form.batch_number,
        category: form.complaint_category
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitComplaint(form));
  };

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
      {/* Left: Form */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "#1e40af", padding: "14px 20px" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: 15, fontWeight: 600 }}>Log Customer Complaint</h3>
          <p style={{ margin: "2px 0 0", color: "#bfdbfe", fontSize: 12 }}>Pharmaceutical Quality Management System</p>
        </div>

        {/* AI Quick Parse */}
        <div style={{ padding: "12px 20px", background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#1d4ed8" }}>🤖 AI Quick Parse — paste email/complaint text</span>
            <button onClick={() => setShowRawInput(!showRawInput)} style={{ fontSize: 12, background: "none", border: "1px solid #93c5fd", borderRadius: 6, padding: "4px 10px", color: "#1d4ed8", cursor: "pointer" }}>
              {showRawInput ? "Hide" : "Show"}
            </button>
          </div>
          {showRawInput && (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder="Paste customer email, complaint letter, or any text here — AI will extract and auto-fill the form..."
                style={{ ...inputStyle, height: 90, resize: "vertical", marginBottom: 8 }}
              />
              <button onClick={handleParse} disabled={parsing || !rawInput.trim()} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", opacity: parsing ? 0.7 : 1 }}>
                {parsing ? "Parsing..." : "⚡ Auto-fill Form"}
              </button>
              {parsedFields && <span style={{ marginLeft: 10, fontSize: 12, color: "#15803d" }}>✓ Form auto-filled ({parsedFields.confidence ? (parsedFields.confidence * 100).toFixed(0) : "—"}% confidence)</span>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Customer Info */}
          <SectionHeader title="Customer Information" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="Customer Name *" name="customer_name" value={form.customer_name} onChange={handleChange} required />
            <Field label="Email" name="customer_email" value={form.customer_email} onChange={handleChange} type="email" />
            <Field label="Company / Hospital" name="customer_company" value={form.customer_company} onChange={handleChange} />
          </div>

          {/* Product Info */}
          <SectionHeader title="Product Information" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="Product Name *" name="product_name" value={form.product_name} onChange={handleChange} required />
            <Field label="Batch / Lot Number" name="batch_number" value={form.batch_number} onChange={handleChange} />
            <Field label="Product Code (SKU)" name="product_code" value={form.product_code} onChange={handleChange} />
            <Field label="Complaint Date" name="complaint_date" value={form.complaint_date} onChange={handleChange} type="date" />
            <Field label="Manufacturing Date" name="manufacturing_date" value={form.manufacturing_date} onChange={handleChange} type="date" />
            <Field label="Expiry Date" name="expiry_date" value={form.expiry_date} onChange={handleChange} type="date" />
          </div>

          {/* Complaint Details */}
          <SectionHeader title="Complaint Details" />
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Complaint Category</label>
            <select name="complaint_category" value={form.complaint_category} onChange={handleChange} style={inputStyle}>
              <option value="">— Select Category —</option>
              {["Quality", "Contamination", "Packaging", "Labeling", "Efficacy", "Adverse Event", "Temperature Excursion", "Other"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Complaint Description *</label>
            <textarea name="complaint_description" value={form.complaint_description} onChange={handleChange} required
              placeholder="Describe the complaint in detail..." style={{ ...inputStyle, height: 100, resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Assigned To (QA Officer)</label>
            <input name="assigned_to" value={form.assigned_to} onChange={handleChange} style={inputStyle} placeholder="e.g. Dr. Priya Sharma" />
          </div>

          {submitSuccess && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: "#15803d", fontSize: 13, fontWeight: 500 }}>
              ✓ Complaint logged successfully! AI analysis complete.
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleAnalyze} disabled={analyzing || !form.complaint_description.trim()}
              style={{ padding: "9px 18px", border: "1px solid #7c3aed", borderRadius: 8, background: "#faf5ff", color: "#7c3aed", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {analyzing ? "Analyzing..." : "🤖 Analyze Only"}
            </button>
            <button type="submit" disabled={submitting}
              style={{ flex: 1, padding: "9px 18px", border: "none", borderRadius: 8, background: "#1e40af", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Submitting + Running AI..." : "✓ Submit Complaint"}
            </button>
          </div>
        </form>
      </div>

      {/* Right: AI Copilot */}
      <div>
        <div style={{ background: "#fff", border: "1px solid #e9d5ff", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "#faf5ff", borderBottom: "1px solid #e9d5ff" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#6d28d9" }}>🤖 AI Copilot</div>
            <div style={{ fontSize: 12, color: "#8b5cf6", marginTop: 2 }}>Real-time AI analysis powered by Groq LangGraph</div>
          </div>
          <div style={{ padding: 12 }}>
            <AICopilotPanel analysis={aiAnalysis} analyzing={analyzing} />
            {!aiAnalysis && !analyzing && (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "#9ca3af" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🧬</div>
                <div style={{ fontSize: 13 }}>Fill in the complaint description and click "Analyze Only" or "Submit Complaint" to get AI-powered risk assessment, root cause analysis, and CAPA recommendations.</div>
              </div>
            )}
          </div>
        </div>

        {/* AI Workflow Diagram */}
        <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 10 }}>LangGraph AI Agent Workflow</div>
          {["Extract Fields", "Risk Classification", "Generate Summary", "Root Cause + CAPA", "Regulatory Flags", "Completeness Check"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 5 ? 0 : 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: "#374151" }}>{step}</div>
              {i < 5 && <div style={{ width: 1, height: 12, background: "#d1d5db", marginLeft: 10, marginTop: 4, marginBottom: -4, position: "relative", left: -18, top: 14 }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, name, value, onChange, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4 }}>{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} required={required}
      style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
  </div>
);

const SectionHeader = ({ title }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid #f3f4f6" }}>{title}</div>
);

// ─── Complaints List Tab ──────────────────────────────────────────────────────
const ComplaintsList = () => {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(s => s.complaints);
  const [filter, setFilter] = useState("all");
  const [selected, setSelectedLocal] = useState(null);

  useEffect(() => { dispatch(fetchComplaints()); }, []);

  const filtered = filter === "all" ? list : list.filter(c =>
    filter === "critical" ? c.risk_level === "Critical" :
    filter === "open" ? c.status === "Open" : true
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 16, alignItems: "start" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          {[["all", "All"], ["open", "Open"], ["critical", "Critical"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: "5px 14px", borderRadius: 20, border: "1px solid", fontSize: 13, cursor: "pointer",
              background: filter === v ? "#1e40af" : "#fff",
              color: filter === v ? "#fff" : "#374151",
              borderColor: filter === v ? "#1e40af" : "#d1d5db"
            }}>{l}</button>
          ))}
          <span style={{ marginLeft: "auto", color: "#6b7280", fontSize: 13, alignSelf: "center" }}>{filtered.length} records</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {["Complaint ID", "Customer", "Product", "Batch", "Category", "Risk", "Completeness", "Status", "Action"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} onClick={() => setSelectedLocal(selected?.id === c.id ? null : c)}
                style={{ background: selected?.id === c.id ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                <td style={{ padding: "9px 12px", color: "#6366f1", fontWeight: 500 }}>{c.complaint_id}</td>
                <td style={{ padding: "9px 12px" }}>{c.customer_name}</td>
                <td style={{ padding: "9px 12px" }}>{c.product_name}</td>
                <td style={{ padding: "9px 12px", color: "#6b7280", fontFamily: "monospace", fontSize: 11 }}>{c.batch_number || "—"}</td>
                <td style={{ padding: "9px 12px" }}>{c.complaint_category || "—"}</td>
                <td style={{ padding: "9px 12px" }}><RiskBadge level={c.risk_level} /></td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "#e5e7eb", borderRadius: 3 }}>
                      <div style={{ width: `${c.completeness_score}%`, height: "100%", background: c.completeness_score >= 80 ? "#22c55e" : "#f59e0b", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{c.completeness_score?.toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ padding: "9px 12px" }}><StatusBadge status={c.status} /></td>
                <td style={{ padding: "9px 12px" }}>
                  <select value={c.status} onClick={e => e.stopPropagation()}
                    onChange={e => dispatch(updateComplaintStatus({ id: c.complaint_id, status: e.target.value }))}
                    style={{ fontSize: 11, border: "1px solid #d1d5db", borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}>
                    {["Open", "In Review", "CAPA Initiated", "Closed"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>No complaints found.</div>}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", position: "sticky", top: 0 }}>
          <div style={{ background: "#1e40af", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#bfdbfe", fontSize: 11, fontWeight: 500 }}>COMPLAINT DETAIL</div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{selected.complaint_id}</div>
            </div>
            <button onClick={() => setSelectedLocal(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
          <div style={{ padding: 16, fontSize: 13 }}>
            <InfoRow label="Customer" value={selected.customer_name} />
            <InfoRow label="Company" value={selected.customer_company} />
            <InfoRow label="Product" value={selected.product_name} />
            <InfoRow label="Batch" value={selected.batch_number} mono />
            <InfoRow label="Category" value={selected.complaint_category} />
            <InfoRow label="Status" value={<StatusBadge status={selected.status} />} />
            <InfoRow label="Risk" value={<RiskBadge level={selected.risk_level} />} />
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4, fontSize: 12 }}>Complaint</div>
              <div style={{ color: "#374151", lineHeight: 1.6 }}>{selected.complaint_description}</div>
            </div>
            <AICopilotPanel analysis={{
              risk_level: selected.risk_level,
              risk_score: selected.risk_score,
              summary: selected.ai_summary,
              root_cause_suggestion: selected.root_cause_suggestion,
              capa_recommendation: selected.capa_recommendation,
              regulatory_flags: JSON.parse(selected.regulatory_flags || "[]"),
              completeness_score: selected.completeness_score,
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, mono }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
    <span style={{ color: "#6b7280", fontWeight: 500 }}>{label}</span>
    <span style={{ color: "#111827", fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? 11 : 13 }}>{value || "—"}</span>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const dispatch = useDispatch();
  const { activeTab } = useSelector(s => s.complaints);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "log", label: "Log Complaint", icon: "📝" },
    { id: "list", label: "Complaints", icon: "📋" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#f1f5f9" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#1e40af", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>AIVOA.QMS</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: -2 }}>Customer Complaint Management</div>
            </div>
          </div>
          <div style={{ height: 32, width: 1, background: "#e5e7eb" }} />
          <nav style={{ display: "flex", gap: 4 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => dispatch(setActiveTab(tab.id))}
                style={{
                  padding: "6px 14px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                  background: activeTab === tab.id ? "#eff6ff" : "transparent",
                  color: activeTab === tab.id ? "#1d4ed8" : "#6b7280"
                }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>● Live</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>21 CFR Part 11 | ICH Q10 Compliant</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "log" && <LogComplaintForm />}
        {activeTab === "list" && <ComplaintsList />}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
