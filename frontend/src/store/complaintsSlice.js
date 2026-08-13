import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE = 'https://aivoa-backend-4et2.onrender.com/api';

// ── Thunks ──────────────────────────────────────────────────────────────────
export const fetchComplaints = createAsyncThunk('complaints/fetchAll', async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/complaints?${params}`);
  return res.json();
});

export const submitComplaint = createAsyncThunk('complaints/submit', async (data) => {
  const res = await fetch(`${API_BASE}/complaints/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Submission failed');
  return res.json();
});

export const parseDocument = createAsyncThunk('complaints/parse', async (text) => {
  const res = await fetch(`${API_BASE}/ai/parse-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text_content: text })
  });
  return res.json();
});

export const analyzeComplaint = createAsyncThunk('complaints/analyze', async (payload) => {
  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
});

export const fetchDashboardStats = createAsyncThunk('complaints/stats', async () => {
  const res = await fetch(`${API_BASE}/complaints/stats/dashboard`);
  return res.json();
});

export const updateComplaintStatus = createAsyncThunk('complaints/updateStatus', async ({ id, status }) => {
  const res = await fetch(`${API_BASE}/complaints/${id}/status?status=${status}`, { method: 'PATCH' });
  return { id, status };
});

// ── Slice ────────────────────────────────────────────────────────────────────
const complaintsSlice = createSlice({
  name: 'complaints',
  initialState: {
    list: [],
    selected: null,
    stats: null,
    aiAnalysis: null,
    parsedFields: null,
    loading: false,
    analyzing: false,
    parsing: false,
    submitting: false,
    error: null,
    submitSuccess: false,
    activeTab: 'dashboard'
  },
  reducers: {
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    setSelected: (state, action) => { state.selected = action.payload; },
    clearAiAnalysis: (state) => { state.aiAnalysis = null; },
    clearParsedFields: (state) => { state.parsedFields = null; },
    clearSubmitSuccess: (state) => { state.submitSuccess = false; },
    clearError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    // Fetch list
    builder.addCase(fetchComplaints.pending, (s) => { s.loading = true; });
    builder.addCase(fetchComplaints.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; });
    builder.addCase(fetchComplaints.rejected, (s) => { s.loading = false; });

    // Submit
    builder.addCase(submitComplaint.pending, (s) => { s.submitting = true; s.submitSuccess = false; });
    builder.addCase(submitComplaint.fulfilled, (s, a) => {
      s.submitting = false;
      s.submitSuccess = true;
      s.list.unshift(a.payload);
      s.aiAnalysis = {
        risk_level: a.payload.risk_level,
        risk_score: a.payload.risk_score,
        summary: a.payload.ai_summary,
        root_cause_suggestion: a.payload.root_cause_suggestion,
        capa_recommendation: a.payload.capa_recommendation,
        regulatory_flags: JSON.parse(a.payload.regulatory_flags || '[]'),
        completeness_score: a.payload.completeness_score,
      };
    });
    builder.addCase(submitComplaint.rejected, (s, a) => {
      s.submitting = false;
      s.error = a.error.message;
    });

    // Parse document
    builder.addCase(parseDocument.pending, (s) => { s.parsing = true; });
    builder.addCase(parseDocument.fulfilled, (s, a) => { s.parsing = false; s.parsedFields = a.payload; });
    builder.addCase(parseDocument.rejected, (s) => { s.parsing = false; });

    // Analyze
    builder.addCase(analyzeComplaint.pending, (s) => { s.analyzing = true; });
    builder.addCase(analyzeComplaint.fulfilled, (s, a) => { s.analyzing = false; s.aiAnalysis = a.payload; });
    builder.addCase(analyzeComplaint.rejected, (s) => { s.analyzing = false; });

    // Stats
    builder.addCase(fetchDashboardStats.fulfilled, (s, a) => { s.stats = a.payload; });

    // Status update
    builder.addCase(updateComplaintStatus.fulfilled, (s, a) => {
      const c = s.list.find(x => x.complaint_id === a.payload.id);
      if (c) c.status = a.payload.status;
    });
  }
});

export const { setActiveTab, setSelected, clearAiAnalysis, clearParsedFields, clearSubmitSuccess, clearError } = complaintsSlice.actions;
export default complaintsSlice.reducer;
