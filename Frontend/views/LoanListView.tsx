import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronRight, Home } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Loan } from '../types';

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 50, damping: 20 } },
  },
};

interface LoanListViewProps {
  loans: Loan[];
  onNavigate: (view: any, loanId?: string) => void;
}

const LoanListView: React.FC<LoanListViewProps> = ({ loans, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoans = useMemo(() => {
    if (!searchQuery.trim()) return loans;
    return loans.filter(loan => 
      loan.borrower.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [loans, searchQuery]);

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Loans</h1>
           <p className="text-slate-400 mt-1 text-sm md:text-base">Manage all active credit facilities.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search borrower..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 bg-slate-900 border border-slate-700 text-slate-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
             </div>
             <button className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                <Filter className="w-5 h-5" />
             </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Home className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => onNavigate('DASHBOARD')} />
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">Loans</span>
      </div>

      {/* Desktop Table View */}
      <motion.div 
        className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
        variants={ANIMATION_VARIANTS.container}
        initial="hidden"
        animate="show"
      >
        <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950/50 text-slate-200 font-medium uppercase text-xs tracking-wider">
                <tr>
                    <th className="px-6 py-4">Borrower</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 hidden lg:table-cell">Interest</th>
                    <th className="px-6 py-4">Maturity</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No loans found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <motion.tr 
                        key={loan.id} 
                        variants={ANIMATION_VARIANTS.item}
                        onClick={() => onNavigate('LOAN_DETAIL', loan.id)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                        <td className="px-6 py-4">
                            <div className="font-semibold text-white text-base group-hover:text-emerald-400 transition-colors">{loan.borrower}</div>
                            <div className="text-xs">{loan.loanDNA?.keyTerms.facilityType || 'Term Loan'}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-300">
                            {loan.currency} {(loan.amount).toLocaleString()}
                        </td>
                         <td className="px-6 py-4 font-mono text-slate-300 hidden lg:table-cell">
                            {loan.interestRate}%
                        </td>
                        <td className="px-6 py-4">
                            {new Date(loan.maturityDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                             <div className="w-full bg-slate-800 rounded-full h-1.5 w-16 mb-1">
                                <div 
                                    className={`h-1.5 rounded-full ${loan.complianceScore > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                    style={{ width: `${loan.complianceScore}%` }}
                                ></div>
                             </div>
                             <span className="text-xs">{loan.complianceScore}/100</span>
                        </td>
                        <td className="px-6 py-4">
                            <StatusBadge status={loan.status} size="sm" />
                        </td>
                    </motion.tr>
                  ))
                )}
            </tbody>
        </table>
      </motion.div>

      {/* Mobile Card View */}
      <motion.div 
        className="md:hidden space-y-3"
        variants={ANIMATION_VARIANTS.container}
        initial="hidden"
        animate="show"
      >
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
            No loans found matching "{searchQuery}"
          </div>
        ) : (
          filteredLoans.map((loan) => (
            <motion.div
              key={loan.id}
              variants={ANIMATION_VARIANTS.item}
              onClick={() => onNavigate('LOAN_DETAIL', loan.id)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer active:bg-slate-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-white">{loan.borrower}</div>
                  <div className="text-xs text-slate-500">{loan.loanDNA?.keyTerms.facilityType || 'Term Loan'}</div>
                </div>
                <StatusBadge status={loan.status} size="sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <div className="text-slate-500 text-xs">Amount</div>
                  <div className="text-slate-300 font-mono">{loan.currency} {(loan.amount / 1000000).toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Interest</div>
                  <div className="text-slate-300 font-mono">{loan.interestRate}%</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Maturity</div>
                  <div className="text-slate-300">{new Date(loan.maturityDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Score</div>
                  <div className={`font-semibold ${loan.complianceScore > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {loan.complianceScore}/100
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end text-emerald-400 text-sm">
                View Details <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default LoanListView;
