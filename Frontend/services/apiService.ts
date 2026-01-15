/**
 * API Service for connecting frontend to Django backend
 */

// Use relative URL when running with Vite proxy, or absolute URL for production
// Update this to your deployed backend URL
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://coven.onrender.com/api'  // Your Render backend URL
  : '/api';

// Token management
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user: any) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const isAuthenticated = () => {
  return !!accessToken;
};

// Health check for backend wake-up (Render free tier spins down)
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(`${API_BASE_URL}/health/`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'healthy';
    }
    return false;
  } catch (error) {
    console.log('Backend not ready yet:', error);
    return false;
  }
};

// Generic fetch wrapper with auth
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // If 401, try to refresh token
  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });
    }
  }

  return response;
};

// Refresh access token
const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.access, data.refresh || refreshToken!);
      return true;
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }
  
  clearTokens();
  return false;
};

// ============================================
// AUTH ENDPOINTS
// ============================================

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const data = await response.json();
  setTokens(data.access, data.refresh);
  setStoredUser(data.user);
  return data;
};

export const register = async (data: RegisterData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Registration failed');
  }

  return response.json();
};

export const logout = () => {
  clearTokens();
};

export const getProfile = async () => {
  const response = await fetchWithAuth('/user/profile/');
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
};

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  role?: string;
  department?: string;
}

export const updateProfile = async (data: ProfileUpdateData) => {
  const response = await fetchWithAuth('/user/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  const updatedUser = await response.json();
  // Update stored user
  setStoredUser(updatedUser);
  return updatedUser;
};

// ============================================
// LOAN ENDPOINTS
// ============================================

export interface LoanData {
  borrower: string;
  amount: number;
  currency: string;
  interest_rate: number;
  start_date: string;
  maturity_date: string;
  status?: string;
}

export const getLoans = async () => {
  const response = await fetchWithAuth('/loans/');
  if (!response.ok) throw new Error('Failed to fetch loans');
  const data = await response.json();
  // Handle paginated response
  return data.results || data;
};

export const getLoan = async (id: string) => {
  const response = await fetchWithAuth(`/loans/${id}/`);
  if (!response.ok) throw new Error('Failed to fetch loan');
  return response.json();
};

export const createLoan = async (loanData: LoanData) => {
  const response = await fetchWithAuth('/loans/', {
    method: 'POST',
    body: JSON.stringify(loanData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to create loan');
  }
  return response.json();
};

export const updateLoan = async (id: string, loanData: Partial<LoanData>) => {
  const response = await fetchWithAuth(`/loans/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(loanData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to update loan');
  }
  return response.json();
};

export const deleteLoan = async (id: string) => {
  const response = await fetchWithAuth(`/loans/${id}/`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete loan');
  return true;
};

// ============================================
// COVENANT ENDPOINTS
// ============================================

export interface CovenantData {
  loan_id: string;
  title: string;
  type: string;
  due_date: string;
  description: string;
  threshold?: string;
  status?: string;
  frequency?: string;
  value?: string;
  waiver_reason?: string;
  waiver_date?: string;
  waiver_approved_by?: string;
}

export const getCovenants = async (loanId?: string) => {
  const url = loanId ? `/covenants/?loan_id=${loanId}` : '/covenants/';
  const response = await fetchWithAuth(url);
  if (!response.ok) throw new Error('Failed to fetch covenants');
  const data = await response.json();
  return data.results || data;
};

export const createCovenant = async (covenantData: CovenantData) => {
  const response = await fetchWithAuth('/covenants/', {
    method: 'POST',
    body: JSON.stringify(covenantData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to create covenant');
  }
  return response.json();
};

export const updateCovenant = async (id: string, covenantData: Partial<CovenantData>) => {
  const response = await fetchWithAuth(`/covenants/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(covenantData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to update covenant');
  }
  return response.json();
};

// ============================================
// TIMELINE EVENT ENDPOINTS
// ============================================

export interface TimelineEventData {
  loan_id: string;
  type: string;
  date: string;
  title: string;
  description: string;
  related_covenant_id?: string;
  metadata?: Record<string, any>;
}

export const createTimelineEvent = async (eventData: TimelineEventData) => {
  const response = await fetchWithAuth('/timeline-events/', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to create timeline event');
  }
  return response.json();
};

// ============================================
// DASHBOARD STATS
// ============================================

export const getDashboardStats = async () => {
  const response = await fetchWithAuth('/dashboard/stats/');
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
};

// ============================================
// DOCUMENT UPLOAD
// ============================================

export const uploadDocument = async (loanId: string, file: File) => {
  const formData = new FormData();
  formData.append('loan_id', loanId);
  formData.append('file', file);
  formData.append('filename', file.name);

  const headers: HeadersInit = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/documents/upload/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to upload document');
  }
  return response.json();
};

// ============================================
// RISK PREDICTIONS
// ============================================

export interface RiskPredictionData {
  loan: string;
  covenant_id: string;
  current_value: string;
  threshold: string;
  predicted_breach_date: string;
  probability: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  explanation: string;
}

export const createRiskPrediction = async (predictionData: RiskPredictionData) => {
  const response = await fetchWithAuth('/risk-predictions/', {
    method: 'POST',
    body: JSON.stringify(predictionData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to create risk prediction');
  }
  return response.json();
};

// ============================================
// LOAN DNA
// ============================================

export interface LoanDNAData {
  loan_id: string;
  extracted_at: string;
  source_document: string;
  confidence: number;
  summary: string;
  key_terms: {
    facilityType: string;
    purpose: string;
    securityType: string;
    governingLaw: string;
  };
  extracted_covenants_data: Array<{
    title: string;
    type: string;
    threshold: string;
    frequency: string;
    description: string;
  }>;
  risk_factors: string[];
}

export const createLoanDNA = async (dnaData: LoanDNAData) => {
  const response = await fetchWithAuth('/loan-dna/', {
    method: 'POST',
    body: JSON.stringify({
      loan_id: dnaData.loan_id,
      extracted_at: dnaData.extracted_at,
      source_document: dnaData.source_document,
      confidence: dnaData.confidence,
      summary: dnaData.summary,
      facility_type: dnaData.key_terms.facilityType,
      purpose: dnaData.key_terms.purpose,
      security_type: dnaData.key_terms.securityType,
      governing_law: dnaData.key_terms.governingLaw,
      risk_factors: dnaData.risk_factors,
      extracted_covenants_data: dnaData.extracted_covenants_data,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || JSON.stringify(error) || 'Failed to create loan DNA');
  }
  return response.json();
};

// ============================================
// AI-POWERED ENDPOINTS
// ============================================

export interface AILoanSummaryResponse {
  summary: string;
  loan_id: string;
}

export interface AICovenantExplanationResponse {
  explanation: string;
  covenant_id: string;
  status: string;
}

export interface AIRiskPrediction {
  covenantId: string;
  covenantTitle: string;
  currentValue: string;
  threshold: string;
  probability: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  predictedBreachDate: string;
  explanation: string;
}

export interface AIRiskPredictionsResponse {
  predictions: AIRiskPrediction[];
  loan_id: string;
}

export interface AIWhatChangedResponse {
  explanation: string;
  loan_id: string;
  events_analyzed: number;
}

export interface AILoanDNAResponse {
  loanDNA: {
    extractedAt: string;
    sourceDocument: string;
    confidence: number;
    keyTerms: {
      facilityType: string;
      purpose: string;
      securityType: string;
      governingLaw: string;
    };
    extractedCovenants: Array<{
      title: string;
      type: 'Financial' | 'Reporting' | 'Affirmative' | 'Negative';
      threshold: string;
      frequency: string;
      description: string;
    }>;
    riskFactors: string[];
    summary: string;
  };
  loan_id: string;
}

export const getAILoanSummary = async (loanId: string): Promise<AILoanSummaryResponse> => {
  const response = await fetchWithAuth('/ai/loan-summary/', {
    method: 'POST',
    body: JSON.stringify({ loan_id: loanId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate loan summary');
  }
  return response.json();
};

export const getAICovenantExplanation = async (covenantId: string): Promise<AICovenantExplanationResponse> => {
  const response = await fetchWithAuth('/ai/covenant-explanation/', {
    method: 'POST',
    body: JSON.stringify({ covenant_id: covenantId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate covenant explanation');
  }
  return response.json();
};

export const getAIRiskPredictions = async (loanId: string): Promise<AIRiskPredictionsResponse> => {
  const response = await fetchWithAuth('/ai/risk-predictions/', {
    method: 'POST',
    body: JSON.stringify({ loan_id: loanId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate risk predictions');
  }
  return response.json();
};

export const getAIWhatChanged = async (loanId: string): Promise<AIWhatChangedResponse> => {
  const response = await fetchWithAuth('/ai/what-changed/', {
    method: 'POST',
    body: JSON.stringify({ loan_id: loanId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate what-changed explanation');
  }
  return response.json();
};

export const extractAILoanDNA = async (loanId: string, file?: File, documentText?: string): Promise<AILoanDNAResponse> => {
  if (file) {
    const formData = new FormData();
    formData.append('loan_id', loanId);
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/extract-loan-dna/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract loan DNA');
    }
    return response.json();
  } else {
    const response = await fetchWithAuth('/ai/extract-loan-dna/', {
      method: 'POST',
      body: JSON.stringify({ loan_id: loanId, document_text: documentText }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract loan DNA');
    }
    return response.json();
  }
};

// Export everything as a namespace
const apiService = {
  // Auth
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  isAuthenticated,
  getStoredUser,
  setStoredUser,
  clearTokens,
  
  // Loans
  getLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
  
  // Covenants
  getCovenants,
  createCovenant,
  updateCovenant,
  
  // Timeline
  createTimelineEvent,
  
  // Dashboard
  getDashboardStats,
  
  // Documents
  uploadDocument,
  
  // Risk Predictions
  createRiskPrediction,
  
  // Loan DNA
  createLoanDNA,
  
  // AI endpoints
  getAILoanSummary,
  getAICovenantExplanation,
  getAIRiskPredictions,
  getAIWhatChanged,
  extractAILoanDNA,
};

export default apiService;
