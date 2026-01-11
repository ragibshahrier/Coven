import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, RefreshCw, FileText, Activity, Trash2, Edit2, Plus, Printer, Edit3, ShieldCheck, Upload, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, History, Dna, BarChart3, Home, ChevronRight } from 'lucide-react';
import { Loan, Covenant, ComplianceStatus, TimelineEventType, RiskPrediction } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { generateLoanSummary, explainCovenantRisk, generateRiskPredictions, generateWhatChangedExplanation } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface LoanDetailViewProps {
  loanId: string;
  loans: Loan[];
  onBack: () => void;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (id: string) => void;
  onAddCovenant: (loanId: string) => void;
  onUpdateCovenantStatus: (loanId: string, covenant: Covenant) => void;
  onUploadDocument: (loanId: string) => void;
  onUpdateLoan: (loan: Loan) => void;
}

const LoanDetailView: React.FC<LoanDetailViewProps> = ({ 
  loanId, loans, onBack, onEditLoan, onDeleteLoan, onAddCovenant, 
  onUpdateCovenantStatus, onUploadDocument, onUpdateLoan 
}) => {
  const loan = loans.find(l => l.id === loanId);
  const [activeTab, setActiveTab] = useState<'SNAPSHOT' | 'TIMELINE' | 'DNA' | 'HISTORY'>('TIMELINE');
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedCovenant, setSelectedCovenant] = useState<Covenant | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [whatChanged, setWhatChanged] = useState<string>('');
  const [loadingWhatChanged, setLoadingWhatChanged] = useState(false);
  const [riskPredictions, setRiskPredictions] = useState<RiskPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    if (loan && activeTab === 'SNAPSHOT') {
      setLoadingSummary(true);
      generateLoanSummary(loan).then(text => {
        setSummary(text);
        setLoadingSummary(false);
      });
      // Load risk predictions
      if (!loan.riskPredictions || loan.riskPredictions.length === 0) {
        setLoadingPredictions(true);
        generateRiskPredictions(loan).then(predictions => {
          setRiskPredictions(predictions);
          setLoadingPredictions(false);
        });
      } else {
        setRiskPredictions(loan.riskPredictions);
      }
    }
  }, [loan, activeTab]);

  useEffect(() => {
    if (loan && activeTab === 'HISTORY') {
      setLoadingWhatChanged(true);
      const recentEvents = (loan.timelineEvents || []).slice(-10);
      generateWhatChangedExplanation(loan, recentEvents).then(text => {
        setWhatChanged(text);
        setLoadingWhatChanged(false);
      });
    }
  }, [loan, activeTab]);

  const handleCovenantClick = async (covenant: Covenant) => {
    if (selectedCovenant?.id === covenant.id) {
      setSelectedCovenant(null);
      return;
    }
    setSelectedCovenant(covenant);
    setLoadingExplanation(true);
    setAiExplanation('');
    const explanation = await explainCovenantRisk(covenant, loan!);
    setAiExplanation(explanation);
    setLoadingExplanation(false);
  };

  const handleDownloadSnapshot = () => {
    if (!loan) return;
    const csvContent = generateCSV(loan, summary, riskPredictions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${loan.borrower.replace(/\s+/g, '_')}_snapshot_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!loan) return <div className="p-8 text-center text-slate-400">Loan not found</div>;

  const tabs = [
    { id: 'TIMELINE', label: 'Timeline', icon: Clock },
    { id: 'SNAPSHOT', label: 'Snapshot', icon: BarChart3 },
    { id: 'DNA', label: 'Loan DNA', icon: Dna },
    { id: 'HISTORY', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-14 md:top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-auto md:h-16 py-3 md:py-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-white truncate">{loan.borrower}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{loan.currency} {(loan.amount / 1000000).toFixed(1)}M</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline font-mono">{loan.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            <div className="w-px h-6 bg-slate-800 mx-1 hidden md:block"></div>
            <button onClick={() => onUploadDocument(loan.id)} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Upload Document">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={() => onEditLoan(loan)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Edit Loan">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => { if(confirm('Delete this loan?')) onDeleteLoan(loan.id); }} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Home className="w-4 h-4 cursor-pointer hover:text-white" onClick={onBack} />
          <ChevronRight className="w-3 h-3" />
          <span className="cursor-pointer hover:text-white" onClick={onBack}>Loans</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">{loan.borrower}</span>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'SNAPSHOT' && (
            <SnapshotView key="snapshot" loan={loan} summary={summary} loading={loadingSummary} 
              onDownload={handleDownloadSnapshot} riskPredictions={riskPredictions} loadingPredictions={loadingPredictions} />
          )}
          {activeTab === 'TIMELINE' && (
            <TimelineView key="timeline" loan={loan} selectedCovenant={selectedCovenant} onSelectCovenant={handleCovenantClick}
              aiExplanation={aiExplanation} loadingExplanation={loadingExplanation} onAddCovenant={() => onAddCovenant(loan.id)}
              onUpdateStatus={(cov) => onUpdateCovenantStatus(loan.id, cov)} onUploadDocument={() => onUploadDocument(loan.id)} />
          )}
          {activeTab === 'DNA' && (
            <LoanDNAView key="dna" loan={loan} onUploadDocument={() => onUploadDocument(loan.id)} />
          )}
          {activeTab === 'HISTORY' && (
            <HistoryView key="history" loan={loan} whatChanged={whatChanged} loading={loadingWhatChanged} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// CSV Generator
const generateCSV = (loan: Loan, summary: string, predictions: RiskPrediction[]): string => {
  let csv = 'LOAN SNAPSHOT REPORT\n';
  csv += `Generated:,${new Date().toLocaleString()}\n\n`;
  csv += 'LOAN DETAILS\n';
  csv += `Borrower,${loan.borrower}\n`;
  csv += `Loan ID,${loan.id}\n`;
  csv += `Amount,${loan.currency} ${loan.amount.toLocaleString()}\n`;
  csv += `Interest Rate,${loan.interestRate}%\n`;
  csv += `Start Date,${loan.startDate}\n`;
  csv += `Maturity Date,${loan.maturityDate}\n`;
  csv += `Status,${loan.status}\n`;
  csv += `Compliance Score,${loan.complianceScore}/100\n\n`;
  csv += 'AI SUMMARY\n';
  csv += `"${summary.replace(/"/g, '""')}"\n\n`;
  csv += 'COVENANTS\n';
  csv += 'Title,Type,Due Date,Status,Threshold,Current Value,Description\n';
  loan.covenants.forEach(cov => {
    csv += `"${cov.title}","${cov.type}","${cov.dueDate}","${cov.status}","${cov.threshold || 'N/A'}","${cov.value || 'N/A'}","${cov.description.replace(/"/g, '""')}"\n`;
  });
  if (predictions.length > 0) {
    csv += '\nRISK PREDICTIONS\n';
    csv += 'Covenant,Probability,Trend,Predicted Breach Date,Explanation\n';
    predictions.forEach(p => {
      csv += `"${p.covenantTitle}",${p.probability}%,${p.trend},"${p.predictedBreachDate}","${p.explanation.replace(/"/g, '""')}"\n`;
    });
  }
  return csv;
};

// Snapshot View with Risk Predictions
interface SnapshotViewProps {
  loan: Loan;
  summary: string;
  loading: boolean;
  onDownload: () => void;
  riskPredictions: RiskPrediction[];
  loadingPredictions: boolean;
}

const SnapshotView: React.FC<SnapshotViewProps> = ({ loan, summary, loading, onDownload, riskPredictions, loadingPredictions }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
    <div className="flex gap-3 print:hidden">
      <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold rounded-lg transition-colors">
        <Download className="w-4 h-4" /> Download CSV
      </button>
      <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors">
        <Printer className="w-4 h-4" /> Print / PDF
      </button>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="relative overflow-hidden border-emerald-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-10 hidden md:block">
            <Activity className="w-32 h-32 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            AI Executive Summary
          </h2>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-5/6"></div>
              <div className="h-4 bg-slate-800 rounded w-4/6"></div>
            </div>
          ) : (
            <div className="text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-white prose-ul:my-2 prose-li:my-0">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
        </Card>

        {/* Risk Predictions */}
        <Card className="border-amber-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Predictive Breach Warnings
          </h3>
          {loadingPredictions ? (
            <div className="space-y-3 animate-pulse">
              {[1,2].map(i => <div key={i} className="h-20 bg-slate-800 rounded-lg"></div>)}
            </div>
          ) : riskPredictions.length === 0 ? (
            <p className="text-slate-500 text-sm">No financial covenants to analyze.</p>
          ) : (
            <div className="space-y-3">
              {riskPredictions.map((pred, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${pred.probability > 70 ? 'bg-red-500/10 border-red-500/30' : pred.probability > 40 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800 border-slate-700'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white font-medium">{pred.covenantTitle}</div>
                      <div className="text-xs text-slate-400">{pred.currentValue} vs {pred.threshold}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pred.trend === 'deteriorating' && <TrendingDown className="w-4 h-4 text-red-400" />}
                      {pred.trend === 'improving' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                      {pred.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
                      <span className={`text-sm font-bold ${pred.probability > 70 ? 'text-red-400' : pred.probability > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {pred.probability}% risk
                      </span>
                    </div>
                  </div>
                  {pred.predictedBreachDate && (
                    <div className="text-xs text-slate-500 mb-2">Predicted breach: {pred.predictedBreachDate}</div>
                  )}
                  <div className="text-sm text-slate-400 prose prose-invert prose-sm max-w-none prose-p:my-1">
                    <ReactMarkdown>{pred.explanation}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Risk Profile</h3>
          <div className="flex items-center justify-center py-6">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className={loan.complianceScore > 80 ? 'text-emerald-500' : loan.complianceScore > 60 ? 'text-amber-500' : 'text-red-500'} strokeDasharray={`${loan.complianceScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{loan.complianceScore}</span>
                <span className="text-xs text-slate-500">SCORE</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Covenants</span><span className="text-white">{loan.covenants.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">At Risk</span><span className="text-amber-400">{loan.covenants.filter(c => c.status === ComplianceStatus.AtRisk).length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Breached</span><span className="text-red-400">{loan.covenants.filter(c => c.status === ComplianceStatus.Breached).length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Documents</span><span className="text-white">{loan.uploadedDocuments?.length || 0}</span></div>
          </div>
        </Card>
      </div>
    </div>
  </motion.div>
);

// Loan DNA View
const LoanDNAView: React.FC<{ loan: Loan; onUploadDocument: () => void }> = ({ loan, onUploadDocument }) => {
  const dna = loan.loanDNA;

  if (!dna) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <Dna className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Loan DNA Extracted</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">Upload a loan document to extract key terms, covenants, and risk factors using AI.</p>
        <button onClick={onUploadDocument} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors mx-auto">
          <Upload className="w-5 h-5" /> Upload Document
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Dna className="w-6 h-6 text-emerald-400" /> Loan DNA
          </h2>
          <p className="text-slate-400 text-sm mt-1">AI-extracted structure from {dna.sourceDocument}</p>
        </div>
        <div className="text-right">
          <div className="text-emerald-400 font-bold text-lg">{dna.confidence}%</div>
          <div className="text-xs text-slate-500">Confidence</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Key Terms</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Facility Type</span>
              <span className="text-white font-medium">{dna.keyTerms.facilityType}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Purpose</span>
              <span className="text-white font-medium text-right max-w-[200px]">{dna.keyTerms.purpose}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Security Type</span>
              <span className="text-white font-medium">{dna.keyTerms.securityType}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Governing Law</span>
              <span className="text-white font-medium">{dna.keyTerms.governingLaw}</span>
            </div>
          </div>
        </Card>

        <Card className="border-amber-500/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Risk Factors
          </h3>
          <ul className="space-y-2">
            {dna.riskFactors.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-amber-500 mt-1">•</span>
                <span className="text-slate-300">{risk}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Extracted Covenants ({dna.extractedCovenants.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="text-left py-3 px-2">Covenant</th>
                <th className="text-left py-3 px-2">Type</th>
                <th className="text-left py-3 px-2">Threshold</th>
                <th className="text-left py-3 px-2">Frequency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dna.extractedCovenants.map((cov, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50">
                  <td className="py-3 px-2">
                    <div className="text-white font-medium">{cov.title}</div>
                    <div className="text-xs text-slate-500">{cov.description}</div>
                  </td>
                  <td className="py-3 px-2"><StatusBadge status={cov.type} size="sm" /></td>
                  <td className="py-3 px-2 text-slate-300 font-mono">{cov.threshold}</td>
                  <td className="py-3 px-2 text-slate-400">{cov.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-slate-900/50">
        <h3 className="text-lg font-semibold text-white mb-3">AI Summary</h3>
        <div className="text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2">
          <ReactMarkdown>{dna.summary}</ReactMarkdown>
        </div>
        <div className="mt-4 text-xs text-slate-500">Extracted on {dna.extractedAt}</div>
      </Card>
    </motion.div>
  );
};

// History View - Timeline Events
const HistoryView: React.FC<{ loan: Loan; whatChanged: string; loading: boolean }> = ({ loan, whatChanged, loading }) => {
  const events = [...(loan.timelineEvents || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.LoanCreated: return <FileText className="w-4 h-4" />;
      case TimelineEventType.CovenantAdded: return <Plus className="w-4 h-4" />;
      case TimelineEventType.StatusChanged: return <RefreshCw className="w-4 h-4" />;
      case TimelineEventType.WaiverGranted: return <ShieldCheck className="w-4 h-4" />;
      case TimelineEventType.DocumentUploaded: return <Upload className="w-4 h-4" />;
      case TimelineEventType.RiskAlert: return <AlertTriangle className="w-4 h-4" />;
      case TimelineEventType.AmendmentMade: return <Edit3 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.RiskAlert: return 'bg-red-500 text-red-400';
      case TimelineEventType.WaiverGranted: return 'bg-purple-500 text-purple-400';
      case TimelineEventType.StatusChanged: return 'bg-amber-500 text-amber-400';
      case TimelineEventType.LoanCreated: return 'bg-emerald-500 text-emerald-400';
      default: return 'bg-slate-500 text-slate-400';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* What Changed Summary */}
      <Card className="border-blue-500/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" /> What Changed?
        </h3>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            <div className="h-4 bg-slate-800 rounded w-4/6"></div>
          </div>
        ) : (
          <div className="text-slate-300 leading-relaxed text-sm prose prose-invert prose-sm max-w-none prose-p:my-2 prose-strong:text-white prose-h2:text-base prose-h2:text-white prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-2">
            <ReactMarkdown>{whatChanged}</ReactMarkdown>
          </div>
        )}
      </Card>

      {/* Timeline Events */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6">Event History</h3>
        {events.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No events recorded yet.</div>
        ) : (
          <div className="relative pl-8 border-l border-slate-800 space-y-6">
            {events.map((event, idx) => {
              const colorClass = getEventColor(event.type);
              return (
                <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="relative">
                  <div className={`absolute -left-[41px] w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass.split(' ')[0]}/20 ${colorClass.split(' ')[1]}`}>
                          {event.type}
                        </span>
                        <h4 className="text-white font-medium mt-2">{event.title}</h4>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">{new Date(event.date).toLocaleDateString()}</div>
                    </div>
                    <p className="text-sm text-slate-400">{event.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Timeline View (Covenant Timeline)
interface TimelineViewProps {
  loan: Loan;
  selectedCovenant: Covenant | null;
  onSelectCovenant: (covenant: Covenant) => void;
  aiExplanation: string;
  loadingExplanation: boolean;
  onAddCovenant: () => void;
  onUpdateStatus: (covenant: Covenant) => void;
  onUploadDocument: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ loan, selectedCovenant, onSelectCovenant, aiExplanation, loadingExplanation, onAddCovenant, onUpdateStatus, onUploadDocument }) => {
  const [showDocModal, setShowDocModal] = useState(false);
  const sortedCovenants = [...loan.covenants].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const uploadedDocs = loan.uploadedDocuments || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-white">Covenant Timeline</h2>
          <div className="flex gap-2">
            <button onClick={onUploadDocument} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm border border-slate-700 transition-colors">
              <Upload className="w-4 h-4" /> Upload Doc
            </button>
            <button onClick={onAddCovenant} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Covenant
            </button>
          </div>
        </div>

        {sortedCovenants.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 border-dashed rounded-xl">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No covenants tracked yet.</p>
            <button onClick={onAddCovenant} className="text-emerald-400 hover:underline">Add your first covenant</button>
          </div>
        ) : (
          <div className="relative pl-6 border-l border-slate-800 space-y-6">
            {sortedCovenants.map((cov, idx) => {
              const isSelected = selectedCovenant?.id === cov.id;
              const date = new Date(cov.dueDate);
              const isPast = date < new Date();
              let statusColor = 'bg-slate-500';
              if (cov.status === ComplianceStatus.Compliant) statusColor = 'bg-emerald-500';
              if (cov.status === ComplianceStatus.AtRisk) statusColor = 'bg-amber-500';
              if (cov.status === ComplianceStatus.Breached) statusColor = 'bg-red-500';
              if (cov.status === ComplianceStatus.Waived) statusColor = 'bg-purple-500';

              return (
                <motion.div key={cov.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="relative cursor-pointer" onClick={() => onSelectCovenant(cov)}>
                  <div className={`absolute -left-[29px] w-4 h-4 rounded-full border-4 border-slate-950 ${statusColor} transition-all ${isSelected ? 'scale-125 ring-4 ring-slate-800' : ''}`}></div>
                  <div className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-slate-800 border-slate-600' : 'bg-transparent border-transparent hover:bg-slate-900 hover:border-slate-800'} ${isPast && !isSelected ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div>
                        <div className="text-xs text-slate-500 font-mono">{date.toLocaleDateString()}</div>
                        <h3 className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{cov.title}</h3>
                      </div>
                      <StatusBadge status={cov.status} size="sm" />
                    </div>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-3 mt-3 border-t border-slate-700/50 text-sm grid grid-cols-3 gap-3">
                            <div><span className="block text-slate-500 text-xs">Type</span>{cov.type}</div>
                            <div><span className="block text-slate-500 text-xs">Threshold</span>{cov.threshold || 'N/A'}</div>
                            <div><span className="block text-slate-500 text-xs">Current</span><span className={cov.status === ComplianceStatus.AtRisk ? 'text-amber-400 font-bold' : ''}>{cov.value || 'Pending'}</span></div>
                          </div>
                          {cov.status === ComplianceStatus.Waived && cov.waiverReason && (
                            <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm">
                              <div className="flex items-center gap-1 text-purple-400 text-xs font-medium mb-1"><ShieldCheck className="w-3 h-3" /> Waiver</div>
                              <p className="text-slate-300 text-xs">{cov.waiverReason}</p>
                            </div>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(cov); }} className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                            <Edit3 className="w-3 h-3" /> Update Status
                          </button>
                          {/* Mobile AI */}
                          <div className="lg:hidden mt-3 pt-3 border-t border-slate-700/50">
                            <div className="text-emerald-400 text-xs font-medium mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> AI Analysis</div>
                            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 text-xs text-slate-300 prose prose-invert prose-xs max-w-none">
                              {loadingExplanation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ReactMarkdown>{aiExplanation}</ReactMarkdown>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop AI Panel */}
      <AnimatePresence>
        {selectedCovenant && (
          <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="hidden lg:block w-[380px]">
            <div className="sticky top-24 bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-700 shadow-2xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-3 text-sm font-medium"><FileText className="w-4 h-4" /> AI Analysis</div>
              <h3 className="text-white font-bold text-lg mb-2">{selectedCovenant.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{selectedCovenant.description}</p>
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-sm text-slate-300 prose prose-invert prose-sm max-w-none prose-p:my-2">
                {loadingExplanation ? <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</div> : <ReactMarkdown>{aiExplanation}</ReactMarkdown>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => onUpdateStatus(selectedCovenant)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-1">
                  <Edit3 className="w-3 h-3" /> Update
                </button>
                <button 
                  onClick={() => setShowDocModal(true)}
                  disabled={uploadedDocs.length === 0}
                  className="flex-1 py-2 border border-slate-600 hover:bg-slate-800 rounded-lg text-slate-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  View Doc {uploadedDocs.length > 0 && `(${uploadedDocs.length})`}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {showDocModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Uploaded Documents
                </h3>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {uploadedDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No documents uploaded yet.</p>
                    <button 
                      onClick={() => { setShowDocModal(false); onUploadDocument(); }}
                      className="mt-4 text-emerald-400 hover:underline"
                    >
                      Upload a document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-slate-900 rounded-lg">
                            <FileText className="w-8 h-8 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate">{doc}</h4>
                            <p className="text-sm text-slate-400 mt-1">
                              Uploaded on {loan.loanDNA?.extractedAt || 'Unknown date'}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <span className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                                AI Processed
                              </span>
                              <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">
                                {doc.split('.').pop()?.toUpperCase() || 'PDF'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Document Preview Section */}
                        <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Document Preview</div>
                          <div className="text-sm text-slate-300 space-y-2">
                            <p><strong className="text-white">Facility Type:</strong> {loan.loanDNA?.keyTerms.facilityType || 'N/A'}</p>
                            <p><strong className="text-white">Purpose:</strong> {loan.loanDNA?.keyTerms.purpose || 'N/A'}</p>
                            <p><strong className="text-white">Security:</strong> {loan.loanDNA?.keyTerms.securityType || 'N/A'}</p>
                            <p><strong className="text-white">Governing Law:</strong> {loan.loanDNA?.keyTerms.governingLaw || 'N/A'}</p>
                            <p><strong className="text-white">Covenants Extracted:</strong> {loan.loanDNA?.extractedCovenants.length || 0}</p>
                            <p><strong className="text-white">AI Confidence:</strong> {loan.loanDNA?.confidence || 0}%</p>
                          </div>
                          {loan.loanDNA?.summary && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">AI Summary</div>
                              <p className="text-sm text-slate-400">{loan.loanDNA.summary}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={() => { setShowDocModal(false); onUploadDocument(); }}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload New Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LoanDetailView;
