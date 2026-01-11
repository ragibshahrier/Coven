import React, { useState } from 'react';
import { ViewState, Loan, Covenant, LoanStatus, ComplianceStatus, TimelineEventType, TimelineEvent, LoanDNA } from './types';
import LandingView from './views/LandingView';
import DashboardView from './views/DashboardView';
import LoanListView from './views/LoanListView';
import LoanDetailView from './views/LoanDetailView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import AuthView from './views/AuthView';
import { LayoutDashboard, List, FileText, Settings, Menu, X, Upload, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_LOANS } from './constants';
import { Modal } from './components/ui/Modal';
import { Input, Select } from './components/ui/Input';
import { extractLoanDNA, generateRiskPredictions, generateTimelineEvent } from './services/geminiService';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (v: ViewState) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar = ({ currentView, onViewChange, mobileOpen, onMobileClose }: SidebarProps) => {
  const items = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'LOAN_LIST', icon: List, label: 'Loans' },
    { id: 'REPORTS', icon: FileText, label: 'Reports' },
  ];

  const handleNavClick = (view: ViewState) => {
    onViewChange(view);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:w-20 lg:w-64
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('DASHBOARD')}>
            <img src="/brand.png" alt="Coven" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-white lg:block md:hidden tracking-tight">Coven</span>
          </div>
          <button onClick={onMobileClose} className="md:hidden p-2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                (currentView === item.id) || (currentView === 'LOAN_DETAIL' && item.id === 'LOAN_LIST')
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="lg:block md:hidden font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-900">
           <button 
             onClick={() => handleNavClick('SETTINGS')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'SETTINGS' ? 'text-emerald-400' : 'text-slate-500 hover:text-white'}`}
           >
              <Settings className="w-5 h-5" />
              <span className="lg:block md:hidden font-medium">Settings</span>
           </button>
        </div>
      </div>
    </>
  );
};

const MobileHeader = ({ onMenuClick, title }: { onMenuClick: () => void; title: string }) => (
  <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950 border-b border-slate-800 z-30 flex items-center px-4 gap-3">
    <button onClick={onMenuClick} className="p-2 text-slate-400 hover:text-white">
      <Menu className="w-5 h-5" />
    </button>
    <img src="/brand.png" alt="Coven" className="w-6 h-6 object-contain" />
    <span className="text-white font-semibold">{title}</span>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
  const [selectedLoanId, setSelectedLoanId] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal States
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isCovenantModalOpen, setIsCovenantModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [targetLoanIdForCovenant, setTargetLoanIdForCovenant] = useState<string | null>(null);
  const [editingCovenant, setEditingCovenant] = useState<{ loanId: string; covenant: Covenant } | null>(null);
  
  // Upload states
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'extracting' | 'done'>('idle');
  const [extractedDNA, setExtractedDNA] = useState<LoanDNA | null>(null);
  const [targetLoanIdForUpload, setTargetLoanIdForUpload] = useState<string | null>(null);

  // Get current page title for mobile header
  const getPageTitle = () => {
    switch(view) {
      case 'DASHBOARD': return 'Dashboard';
      case 'LOAN_LIST': return 'Loans';
      case 'LOAN_DETAIL': return 'Loan Details';
      case 'REPORTS': return 'Reports';
      case 'SETTINGS': return 'Settings';
      default: return 'Coven';
    }
  };

  // --- Actions ---

  const handleLogin = () => {
    setIsAuthenticated(true);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('AUTH');
  };

  const handleNavigate = (newView: ViewState, loanId?: string) => {
    if (loanId) setSelectedLoanId(loanId);
    setView(newView);
    window.scrollTo(0,0);
  };

  const handleSaveLoan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const now = new Date().toISOString().split('T')[0];
    const newLoan: Loan = {
        id: editingLoan ? editingLoan.id : `ln_${Date.now()}`,
        borrower: formData.get('borrower') as string,
        amount: Number(formData.get('amount')),
        currency: formData.get('currency') as string,
        interestRate: Number(formData.get('interestRate')),
        startDate: formData.get('startDate') as string,
        maturityDate: formData.get('maturityDate') as string,
        status: LoanStatus.Active,
        complianceScore: editingLoan ? editingLoan.complianceScore : 100,
        covenants: editingLoan ? editingLoan.covenants : [],
        timelineEvents: editingLoan ? editingLoan.timelineEvents : [
          {
            id: `evt_${Date.now()}`,
            type: TimelineEventType.LoanCreated,
            date: now,
            title: 'Loan Facility Created',
            description: `New loan facility created for ${formData.get('borrower')} with principal amount of ${formData.get('currency')} ${Number(formData.get('amount')).toLocaleString()}.`,
          }
        ],
        uploadedDocuments: editingLoan?.uploadedDocuments || [],
        loanDNA: editingLoan?.loanDNA,
        riskPredictions: editingLoan?.riskPredictions,
    };

    if (editingLoan) {
        // Add amendment event if editing
        const amendmentEvent: TimelineEvent = {
          id: `evt_${Date.now()}`,
          type: TimelineEventType.AmendmentMade,
          date: now,
          title: 'Loan Details Updated',
          description: `Loan facility details were updated by Admin User.`,
        };
        newLoan.timelineEvents = [...(newLoan.timelineEvents || []), amendmentEvent];
        setLoans(loans.map(l => l.id === editingLoan.id ? newLoan : l));
    } else {
        setLoans([...loans, newLoan]);
    }
    setIsLoanModalOpen(false);
    setEditingLoan(null);
  };

  const handleDeleteLoan = (id: string) => {
      setLoans(loans.filter(l => l.id !== id));
      handleNavigate('LOAN_LIST');
  };

  const handleSaveCovenant = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!targetLoanIdForCovenant) return;

      const formData = new FormData(e.currentTarget);
      const newCovenant: Covenant = {
          id: `cov_${Date.now()}`,
          title: formData.get('title') as string,
          type: formData.get('type') as any,
          dueDate: formData.get('dueDate') as string,
          description: formData.get('description') as string,
          threshold: formData.get('threshold') as string,
          status: ComplianceStatus.Upcoming,
          frequency: formData.get('frequency') as string || 'Quarterly',
      };

      const now = new Date().toISOString().split('T')[0];
      const covenantEvent: TimelineEvent = {
        id: `evt_${Date.now()}`,
        type: TimelineEventType.CovenantAdded,
        date: now,
        title: 'Covenant Added',
        description: `New ${newCovenant.type} covenant "${newCovenant.title}" added to monitoring. Threshold: ${newCovenant.threshold || 'N/A'}.`,
        relatedCovenantId: newCovenant.id,
      };

      setLoans(loans.map(l => {
          if (l.id === targetLoanIdForCovenant) {
              return { 
                ...l, 
                covenants: [...l.covenants, newCovenant],
                timelineEvents: [...(l.timelineEvents || []), covenantEvent],
              };
          }
          return l;
      }));
      setIsCovenantModalOpen(false);
  };

  const openAddLoan = () => {
      setEditingLoan(null);
      setIsLoanModalOpen(true);
  };

  const openEditLoan = (loan: Loan) => {
      setEditingLoan(loan);
      setIsLoanModalOpen(true);
  };

  const openAddCovenant = (loanId: string) => {
      setTargetLoanIdForCovenant(loanId);
      setIsCovenantModalOpen(true);
  };

  const openUpdateCovenantStatus = (loanId: string, covenant: Covenant) => {
      setEditingCovenant({ loanId, covenant });
      setIsStatusModalOpen(true);
  };

  const handleUpdateCovenantStatus = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editingCovenant) return;

      const formData = new FormData(e.currentTarget);
      const newStatus = formData.get('status') as ComplianceStatus;
      const currentValue = formData.get('currentValue') as string;
      const waiverReason = formData.get('waiverReason') as string;
      const oldStatus = editingCovenant.covenant.status;

      const now = new Date().toISOString().split('T')[0];

      setLoans(loans.map(loan => {
          if (loan.id === editingCovenant.loanId) {
              const updatedCovenants = loan.covenants.map(cov => {
                  if (cov.id === editingCovenant.covenant.id) {
                      const updated: Covenant = {
                          ...cov,
                          status: newStatus,
                          value: currentValue || cov.value,
                      };
                      if (newStatus === ComplianceStatus.Waived) {
                          updated.waiverReason = waiverReason;
                          updated.waiverDate = now;
                          updated.waiverApprovedBy = 'Admin User';
                      } else {
                          updated.waiverReason = undefined;
                          updated.waiverDate = undefined;
                          updated.waiverApprovedBy = undefined;
                      }
                      return updated;
                  }
                  return cov;
              });

              // Create timeline event for status change
              const timelineEvents = [...(loan.timelineEvents || [])];
              
              if (oldStatus !== newStatus) {
                if (newStatus === ComplianceStatus.Waived) {
                  timelineEvents.push({
                    id: `evt_${Date.now()}`,
                    type: TimelineEventType.WaiverGranted,
                    date: now,
                    title: 'Waiver Granted',
                    description: `Waiver granted for "${editingCovenant.covenant.title}" covenant. Reason: ${waiverReason || 'Not specified'}. Approved by Admin User.`,
                    relatedCovenantId: editingCovenant.covenant.id,
                  });
                } else {
                  timelineEvents.push({
                    id: `evt_${Date.now()}`,
                    type: TimelineEventType.StatusChanged,
                    date: now,
                    title: `${editingCovenant.covenant.title} Status Changed`,
                    description: `Covenant status changed from ${oldStatus} to ${newStatus}. ${currentValue ? `Current value: ${currentValue}.` : ''}`,
                    relatedCovenantId: editingCovenant.covenant.id,
                  });
                }
              }

              // Recalculate compliance score
              const totalCovenants = updatedCovenants.length;
              const compliantCount = updatedCovenants.filter(c => 
                  c.status === ComplianceStatus.Compliant || 
                  c.status === ComplianceStatus.Waived ||
                  c.status === ComplianceStatus.Upcoming
              ).length;
              const newScore = totalCovenants > 0 ? Math.round((compliantCount / totalCovenants) * 100) : 100;

              return { ...loan, covenants: updatedCovenants, complianceScore: newScore, timelineEvents };
          }
          return loan;
      }));

      setIsStatusModalOpen(false);
      setEditingCovenant(null);
  };

  // Document Upload Handlers
  const openUploadModal = (loanId: string) => {
    setTargetLoanIdForUpload(loanId);
    setUploadingFile(null);
    setUploadProgress('idle');
    setExtractedDNA(null);
    setIsUploadModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFile(file);
      setUploadProgress('idle');
      setExtractedDNA(null);
    }
  };

  const handleProcessDocument = async () => {
    if (!uploadingFile || !targetLoanIdForUpload) return;

    setUploadProgress('uploading');
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUploadProgress('extracting');

    // Extract Loan DNA
    const dna = await extractLoanDNA(uploadingFile.name);
    setExtractedDNA(dna);
    setUploadProgress('done');
  };

  const handleApplyExtractedData = async () => {
    if (!extractedDNA || !targetLoanIdForUpload) return;

    const now = new Date().toISOString().split('T')[0];

    // Generate risk predictions for the loan
    const loan = loans.find(l => l.id === targetLoanIdForUpload);
    
    setLoans(loans.map(l => {
      if (l.id === targetLoanIdForUpload) {
        // Create covenants from extracted data
        const newCovenants: Covenant[] = extractedDNA.extractedCovenants.map((ec, idx) => ({
          id: `cov_${Date.now()}_${idx}`,
          title: ec.title,
          type: ec.type,
          threshold: ec.threshold,
          description: ec.description,
          frequency: ec.frequency,
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
          status: ComplianceStatus.Upcoming,
        }));

        // Create timeline events
        const uploadEvent: TimelineEvent = {
          id: `evt_${Date.now()}_1`,
          type: TimelineEventType.DocumentUploaded,
          date: now,
          title: 'Document Uploaded & Processed',
          description: `"${uploadingFile?.name}" uploaded and processed by AI. Extracted ${extractedDNA.extractedCovenants.length} covenants with ${extractedDNA.confidence}% confidence.`,
        };

        const covenantEvent: TimelineEvent = {
          id: `evt_${Date.now()}_2`,
          type: TimelineEventType.CovenantAdded,
          date: now,
          title: 'Covenants Auto-Configured',
          description: `${newCovenants.length} covenants automatically extracted and added to monitoring: ${newCovenants.map(c => c.title).join(', ')}.`,
        };

        return {
          ...l,
          loanDNA: extractedDNA,
          covenants: [...l.covenants, ...newCovenants],
          uploadedDocuments: [...(l.uploadedDocuments || []), uploadingFile?.name || ''],
          timelineEvents: [...(l.timelineEvents || []), uploadEvent, covenantEvent],
        };
      }
      return l;
    }));

    // Generate risk predictions after a short delay
    setTimeout(async () => {
      const updatedLoan = loans.find(l => l.id === targetLoanIdForUpload);
      if (updatedLoan) {
        const predictions = await generateRiskPredictions(updatedLoan);
        setLoans(prev => prev.map(l => 
          l.id === targetLoanIdForUpload ? { ...l, riskPredictions: predictions } : l
        ));
      }
    }, 500);

    setIsUploadModalOpen(false);
    setUploadingFile(null);
    setExtractedDNA(null);
    setUploadProgress('idle');
  };

  const handleUpdateLoan = (updatedLoan: Loan) => {
    setLoans(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l));
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-200 font-sans selection:bg-emerald-500/30">
      {view === 'LANDING' ? (
        <LandingView onEnter={() => setView('AUTH')} />
      ) : !isAuthenticated ? (
         <AuthView onLogin={handleLogin} />
      ) : (
        <div className="flex">
          <Sidebar 
            currentView={view} 
            onViewChange={(v) => handleNavigate(v)} 
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />
          <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} title={getPageTitle()} />
          
          <div className="flex-1 md:ml-20 lg:ml-64 w-full transition-all duration-300 pt-14 md:pt-0">
            <AnimatePresence mode="wait">
              {view === 'DASHBOARD' && (
                <motion.div 
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <DashboardView 
                        loans={loans} 
                        onNavigate={handleNavigate} 
                        onAddLoan={openAddLoan}
                    />
                </motion.div>
              )}
              {view === 'LOAN_LIST' && (
                 <motion.div 
                    key="loan-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <LoanListView 
                        loans={loans} 
                        onNavigate={handleNavigate}
                    />
                </motion.div>
              )}
              {view === 'LOAN_DETAIL' && selectedLoanId && (
                 <motion.div 
                    key="loan-detail"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <LoanDetailView 
                        loanId={selectedLoanId} 
                        loans={loans}
                        onBack={() => handleNavigate('LOAN_LIST')} 
                        onEditLoan={openEditLoan}
                        onDeleteLoan={handleDeleteLoan}
                        onAddCovenant={openAddCovenant}
                        onUpdateCovenantStatus={openUpdateCovenantStatus}
                        onUploadDocument={openUploadModal}
                        onUpdateLoan={handleUpdateLoan}
                    />
                </motion.div>
              )}
               {view === 'REPORTS' && (
                 <motion.div 
                    key="reports"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                 >
                    <ReportsView loans={loans} />
                 </motion.div>
              )}
               {view === 'SETTINGS' && (
                 <motion.div 
                    key="settings"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                 >
                    <SettingsView onLogout={handleLogout} />
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      
      <Modal 
        isOpen={isLoanModalOpen} 
        onClose={() => setIsLoanModalOpen(false)} 
        title={editingLoan ? "Edit Loan" : "Add New Loan"}
      >
        <form onSubmit={handleSaveLoan}>
            <Input label="Borrower Name" name="borrower" defaultValue={editingLoan?.borrower} required />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Amount" name="amount" type="number" defaultValue={editingLoan?.amount} required />
                <Select label="Currency" name="currency" defaultValue={editingLoan?.currency || 'USD'} options={[
                    { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }
                ]} />
            </div>
            <Input label="Interest Rate (%)" name="interestRate" type="number" step="0.1" defaultValue={editingLoan?.interestRate} required />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Start Date" name="startDate" type="date" defaultValue={editingLoan?.startDate} required />
                <Input label="Maturity Date" name="maturityDate" type="date" defaultValue={editingLoan?.maturityDate} required />
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsLoanModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors">
                    {editingLoan ? 'Update Loan' : 'Create Loan'}
                </button>
            </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isCovenantModalOpen} 
        onClose={() => setIsCovenantModalOpen(false)} 
        title="Add Covenant"
      >
        <form onSubmit={handleSaveCovenant}>
            <Input label="Covenant Title" name="title" placeholder="e.g. Max Leverage Ratio" required />
            <Select label="Type" name="type" options={[
                { value: 'Financial', label: 'Financial' },
                { value: 'Reporting', label: 'Reporting' },
                { value: 'Affirmative', label: 'Affirmative' },
                { value: 'Negative', label: 'Negative' }
            ]} />
            <Input label="Description" name="description" placeholder="Short description of the requirement..." required />
             <div className="grid grid-cols-2 gap-4">
                <Input label="Threshold" name="threshold" placeholder="e.g. < 4.0x" />
                <Input label="Due Date" name="dueDate" type="date" required />
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsCovenantModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors">
                    Add Covenant
                </button>
            </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isStatusModalOpen} 
        onClose={() => { setIsStatusModalOpen(false); setEditingCovenant(null); }} 
        title="Update Covenant Status"
      >
        {editingCovenant && (
        <form onSubmit={handleUpdateCovenantStatus}>
            <div className="mb-4 p-3 bg-slate-800 rounded-lg">
                <div className="text-white font-medium">{editingCovenant.covenant.title}</div>
                <div className="text-sm text-slate-400">{editingCovenant.covenant.description}</div>
                {editingCovenant.covenant.threshold && (
                    <div className="text-xs text-slate-500 mt-1">Threshold: {editingCovenant.covenant.threshold}</div>
                )}
            </div>

            <Select 
                label="Compliance Status" 
                name="status" 
                defaultValue={editingCovenant.covenant.status}
                options={[
                    { value: ComplianceStatus.Compliant, label: '✓ Compliant' },
                    { value: ComplianceStatus.AtRisk, label: '⚠ At Risk' },
                    { value: ComplianceStatus.Breached, label: '✗ Breached' },
                    { value: ComplianceStatus.Upcoming, label: '◷ Upcoming' },
                    { value: ComplianceStatus.Waived, label: '↷ Waived' },
                ]} 
            />

            <Input 
                label="Current Value" 
                name="currentValue" 
                placeholder="e.g. 3.8x, Submitted, etc."
                defaultValue={editingCovenant.covenant.value}
            />

            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <label className="block text-sm font-medium text-purple-300 mb-2">
                    Waiver Reason (required if status is Waived)
                </label>
                <textarea 
                    name="waiverReason"
                    placeholder="Explain why this covenant is being waived..."
                    defaultValue={editingCovenant.covenant.waiverReason}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none h-20"
                />
                {editingCovenant.covenant.waiverDate && (
                    <div className="text-xs text-slate-500 mt-2">
                        Previously waived on {editingCovenant.covenant.waiverDate} by {editingCovenant.covenant.waiverApprovedBy}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setIsStatusModalOpen(false); setEditingCovenant(null); }} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors">
                    Update Status
                </button>
            </div>
        </form>
        )}
      </Modal>

      {/* Document Upload Modal */}
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => { setIsUploadModalOpen(false); setUploadingFile(null); setExtractedDNA(null); setUploadProgress('idle'); }} 
        title="Upload Loan Document"
      >
        <div className="space-y-4">
          {uploadProgress === 'idle' && (
            <>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-white font-medium mb-1">
                    {uploadingFile ? uploadingFile.name : 'Click to upload loan document'}
                  </p>
                  <p className="text-sm text-slate-500">PDF, DOC, DOCX, or TXT (max 10MB)</p>
                </label>
              </div>

              {uploadingFile && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">{uploadingFile.name}</div>
                    <div className="text-xs text-slate-400">{(uploadingFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)} 
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleProcessDocument}
                  disabled={!uploadingFile}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Extract with AI
                </button>
              </div>
            </>
          )}

          {(uploadProgress === 'uploading' || uploadProgress === 'extracting') && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white font-medium">
                {uploadProgress === 'uploading' ? 'Uploading document...' : 'AI is extracting loan data...'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {uploadProgress === 'extracting' && 'Analyzing covenants, terms, and risk factors'}
              </p>
            </div>
          )}

          {uploadProgress === 'done' && extractedDNA && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-white font-medium">Extraction Complete</div>
                  <div className="text-sm text-emerald-400">{extractedDNA.confidence}% confidence score</div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium">Extracted Key Terms</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">Facility:</span> <span className="text-slate-300">{extractedDNA.keyTerms.facilityType}</span></div>
                  <div><span className="text-slate-500">Purpose:</span> <span className="text-slate-300">{extractedDNA.keyTerms.purpose}</span></div>
                  <div><span className="text-slate-500">Security:</span> <span className="text-slate-300">{extractedDNA.keyTerms.securityType}</span></div>
                  <div><span className="text-slate-500">Law:</span> <span className="text-slate-300">{extractedDNA.keyTerms.governingLaw}</span></div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Extracted Covenants ({extractedDNA.extractedCovenants.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {extractedDNA.extractedCovenants.map((cov, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-slate-900 rounded">
                      <span className="text-slate-300">{cov.title}</span>
                      <span className="text-xs text-slate-500">{cov.type} • {cov.threshold}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <h4 className="text-amber-400 font-medium mb-2">Identified Risk Factors</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  {extractedDNA.riskFactors.slice(0, 3).map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500">•</span> {risk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setUploadProgress('idle'); setExtractedDNA(null); }} 
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Re-upload
                </button>
                <button 
                  onClick={handleApplyExtractedData}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Apply to Loan
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default App;
