export enum LoanStatus {
  Active = 'Active',
  Pending = 'Pending',
  Closed = 'Closed',
}

export enum ComplianceStatus {
  Compliant = 'Compliant',
  AtRisk = 'At Risk',
  Breached = 'Breached',
  Upcoming = 'Upcoming',
  Waived = 'Waived',
}

export enum TimelineEventType {
  LoanCreated = 'Loan Created',
  CovenantAdded = 'Covenant Added',
  StatusChanged = 'Status Changed',
  WaiverGranted = 'Waiver Granted',
  PaymentReceived = 'Payment Received',
  DocumentUploaded = 'Document Uploaded',
  RiskAlert = 'Risk Alert',
  AmendmentMade = 'Amendment Made',
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description: string;
  relatedCovenantId?: string;
  metadata?: Record<string, any>;
}

export interface RiskPrediction {
  covenantId: string;
  covenantTitle: string;
  currentValue: string;
  threshold: string;
  predictedBreachDate: string;
  probability: number; // 0-100
  trend: 'improving' | 'stable' | 'deteriorating';
  explanation: string;
}

export interface LoanDNA {
  extractedAt: string;
  sourceDocument: string;
  confidence: number; // 0-100
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
}

export interface Covenant {
  id: string;
  title: string;
  type: 'Financial' | 'Reporting' | 'Affirmative' | 'Negative';
  dueDate: string;
  status: ComplianceStatus;
  value?: string;
  threshold?: string;
  description: string;
  waiverReason?: string;
  waiverDate?: string;
  waiverApprovedBy?: string;
  frequency?: string;
}

export interface Loan {
  id: string;
  borrower: string;
  amount: number;
  currency: string;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  status: LoanStatus;
  complianceScore: number;
  covenants: Covenant[];
  riskSummary?: string;
  timelineEvents: TimelineEvent[];
  loanDNA?: LoanDNA;
  riskPredictions?: RiskPrediction[];
  uploadedDocuments?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type ViewState = 'LANDING' | 'AUTH' | 'DASHBOARD' | 'LOAN_LIST' | 'LOAN_DETAIL' | 'REPORTS' | 'SETTINGS';
