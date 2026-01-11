import { GoogleGenAI } from "@google/genai";
import { Loan, Covenant, LoanDNA, RiskPrediction, TimelineEvent, TimelineEventType, ComplianceStatus } from "../types";

// Initialize the API client safely. 
const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

// ============================================
// LOAN SUMMARY & ANALYSIS
// ============================================

export const generateLoanSummary = async (loan: Loan): Promise<string> => {
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const riskLevel = loan.complianceScore > 90 ? 'low' : loan.complianceScore > 75 ? 'moderate' : 'elevated';
        const atRiskCount = loan.covenants.filter(c => c.status === ComplianceStatus.AtRisk || c.status === ComplianceStatus.Breached).length;
        
        resolve(`Based on comprehensive analysis of the ${loan.borrower} credit facility, the ${(loan.amount / 1000000).toFixed(1)}M ${loan.currency} loan is currently in ${loan.status} standing with a ${riskLevel} risk profile. ${atRiskCount > 0 ? `There are ${atRiskCount} covenant(s) requiring immediate attention.` : 'All covenants are currently in compliance.'} The facility matures on ${new Date(loan.maturityDate).toLocaleDateString()}, with ${loan.covenants.length} active covenants under monitoring. ${loan.riskPredictions && loan.riskPredictions.length > 0 ? `Predictive analysis indicates potential concerns with ${loan.riskPredictions.filter(r => r.probability > 50).length} covenant(s) showing elevated breach probability.` : ''}`);
      }, 1500);
    });
  }

  try {
    const prompt = `Act as a senior credit risk analyst. Analyze the following loan data and provide a concise, professional executive summary (max 4 sentences). Highlight any risks if compliance score is below 90.
      
      Loan Data:
      Borrower: ${loan.borrower}
      Amount: ${loan.amount} ${loan.currency}
      Status: ${loan.status}
      Compliance Score: ${loan.complianceScore}
      Number of Covenants: ${loan.covenants.length}
      Active Covenants: ${JSON.stringify(loan.covenants.map(c => ({ title: c.title, status: c.status, val: c.value, limit: c.threshold })))}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    
    return response.text || "Summary unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI analysis currently unavailable due to network or configuration issues.";
  }
};

export const explainCovenantRisk = async (covenant: Covenant, loan: Loan): Promise<string> => {
  if (!ai) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const statusExplanations: Record<string, string> = {
          [ComplianceStatus.Compliant]: `The ${covenant.title} covenant is currently in full compliance. ${covenant.value ? `The current value of ${covenant.value} is within the acceptable threshold of ${covenant.threshold}.` : ''} This indicates healthy financial discipline by ${loan.borrower}. Continue regular monitoring as scheduled.`,
          [ComplianceStatus.AtRisk]: `⚠️ ATTENTION REQUIRED: The ${covenant.title} covenant is approaching breach territory. ${covenant.value ? `Current value of ${covenant.value} is dangerously close to the ${covenant.threshold} threshold.` : ''} This typically indicates deteriorating financial performance. Recommend immediate engagement with borrower to understand underlying drivers and discuss potential remediation strategies.`,
          [ComplianceStatus.Breached]: `🚨 BREACH CONFIRMED: The ${covenant.title} covenant has been breached. ${covenant.value ? `Current value of ${covenant.value} exceeds the ${covenant.threshold} threshold.` : ''} This triggers default provisions under the credit agreement. Immediate actions required: (1) Issue formal breach notification, (2) Assess cross-default implications, (3) Evaluate waiver or amendment options, (4) Review collateral position.`,
          [ComplianceStatus.Upcoming]: `The ${covenant.title} covenant test is upcoming on ${covenant.dueDate}. ${covenant.threshold ? `The borrower must demonstrate compliance with the ${covenant.threshold} threshold.` : ''} Based on historical trends and current financial position, preliminary assessment suggests ${loan.complianceScore > 85 ? 'likely compliance' : 'potential challenges'}. Recommend proactive outreach to ensure timely submission.`,
          [ComplianceStatus.Waived]: `The ${covenant.title} covenant has been waived. ${covenant.waiverReason ? `Waiver reason: ${covenant.waiverReason}.` : ''} ${covenant.waiverDate ? `Waiver was granted on ${covenant.waiverDate}` : ''} ${covenant.waiverApprovedBy ? `by ${covenant.waiverApprovedBy}` : ''}. Monitor for covenant reinstatement terms and ensure borrower meets any conditions attached to the waiver.`,
        };
        
        resolve(statusExplanations[covenant.status] || `The ${covenant.title} is a ${covenant.type.toLowerCase()} covenant that measures the borrower's ${covenant.type === 'Financial' ? 'financial health' : 'compliance with reporting obligations'}. Current status: ${covenant.status}.`);
      }, 1200);
    });
  }

  try {
    const prompt = `Explain the significance of the following financial covenant in the context of a corporate loan. Explain why a status of "${covenant.status}" is significant here. Keep it professional, concise, and educational.
      
      Covenant: ${covenant.title}
      Description: ${covenant.description}
      Current Value: ${covenant.value || 'N/A'}
      Threshold: ${covenant.threshold || 'N/A'}
      Status: ${covenant.status}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || "Explanation unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI explanation unavailable.";
  }
};

// ============================================
// DOCUMENT UPLOAD & LOAN DNA EXTRACTION
// ============================================

export const extractLoanDNA = async (fileName: string, fileContent?: string): Promise<LoanDNA> => {
  // Simulate AI processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock extraction based on filename patterns
      const isEnergy = fileName.toLowerCase().includes('energy') || fileName.toLowerCase().includes('solar');
      const isRetail = fileName.toLowerCase().includes('retail') || fileName.toLowerCase().includes('consumer');
      
      const mockDNA: LoanDNA = {
        extractedAt: new Date().toISOString().split('T')[0],
        sourceDocument: fileName,
        confidence: Math.floor(Math.random() * 15) + 85, // 85-99%
        keyTerms: {
          facilityType: isEnergy ? 'Project Finance Facility' : isRetail ? 'Asset-Based Lending' : 'Term Loan B',
          purpose: isEnergy ? 'Renewable Energy Project Development' : isRetail ? 'Inventory & Working Capital' : 'General Corporate Purposes',
          securityType: isEnergy ? 'Asset-Backed (Project Assets)' : isRetail ? 'Inventory & Receivables' : 'Senior Secured',
          governingLaw: ['New York', 'Delaware', 'English Law'][Math.floor(Math.random() * 3)],
        },
        extractedCovenants: [
          {
            title: 'Maximum Leverage Ratio',
            type: 'Financial',
            threshold: '< 4.0x',
            frequency: 'Quarterly',
            description: 'Total Net Debt to EBITDA shall not exceed 4.0x at any quarter end.',
          },
          {
            title: 'Minimum Interest Coverage',
            type: 'Financial',
            threshold: '> 2.5x',
            frequency: 'Quarterly',
            description: 'EBITDA to Interest Expense ratio must be maintained above 2.5x.',
          },
          {
            title: 'Financial Statements Delivery',
            type: 'Reporting',
            threshold: 'Within 45 days',
            frequency: 'Quarterly',
            description: 'Delivery of unaudited quarterly financial statements within 45 days of quarter end.',
          },
          {
            title: 'Annual Audited Financials',
            type: 'Reporting',
            threshold: 'Within 90 days',
            frequency: 'Annual',
            description: 'Delivery of audited annual financial statements within 90 days of fiscal year end.',
          },
          {
            title: 'No Additional Indebtedness',
            type: 'Negative',
            threshold: 'Prohibited without consent',
            frequency: 'Ongoing',
            description: 'Borrower shall not incur additional indebtedness without prior lender consent.',
          },
        ],
        riskFactors: [
          'Leverage approaching covenant threshold limits',
          isEnergy ? 'Regulatory dependency on renewable energy incentives' : 'Cyclical industry exposure',
          'Concentration risk in primary revenue streams',
          'Upcoming debt maturities may require refinancing',
          isRetail ? 'E-commerce disruption risk to traditional retail model' : 'Commodity price exposure',
        ],
        summary: `This ${isEnergy ? 'project finance' : isRetail ? 'asset-based' : 'senior secured term'} facility contains standard financial covenants with ${Math.random() > 0.5 ? 'moderate' : 'tight'} headroom. Key monitoring points include leverage ratio compliance and ${isEnergy ? 'project milestone achievements' : 'working capital management'}. The covenant package is ${Math.random() > 0.5 ? 'borrower-friendly with cure rights' : 'lender-protective with cross-default provisions'}.`,
      };
      
      resolve(mockDNA);
    }, 2500); // Simulate processing time
  });
};

// ============================================
// RISK PREDICTIONS & BREACH WARNINGS
// ============================================

export const generateRiskPredictions = async (loan: Loan): Promise<RiskPrediction[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const predictions: RiskPrediction[] = [];
      
      loan.covenants.forEach(covenant => {
        if (covenant.type === 'Financial' && covenant.threshold) {
          let probability = 0;
          let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
          let predictedBreachDate = '';
          let explanation = '';
          
          if (covenant.status === ComplianceStatus.Breached) {
            probability = 100;
            trend = 'deteriorating';
            predictedBreachDate = 'Already breached';
            explanation = `This covenant is currently in breach. Immediate remediation required. Consider waiver request or amendment negotiation.`;
          } else if (covenant.status === ComplianceStatus.AtRisk) {
            probability = Math.floor(Math.random() * 30) + 60; // 60-90%
            trend = 'deteriorating';
            const monthsToBreak = Math.floor(Math.random() * 4) + 1;
            const breachDate = new Date();
            breachDate.setMonth(breachDate.getMonth() + monthsToBreak);
            predictedBreachDate = breachDate.toISOString().split('T')[0];
            explanation = `Based on current trajectory and historical patterns, there is a ${probability}% probability of breach within ${monthsToBreak} months. Key drivers: declining EBITDA trend, stable debt levels. Recommend proactive borrower engagement.`;
          } else if (covenant.status === ComplianceStatus.Compliant) {
            probability = Math.floor(Math.random() * 25); // 0-25%
            trend = Math.random() > 0.7 ? 'improving' : 'stable';
            explanation = `Covenant currently in compliance with healthy buffer. ${trend === 'improving' ? 'Positive trend observed in underlying metrics.' : 'Stable performance expected to continue.'} Low breach probability under base case scenario.`;
          } else {
            probability = Math.floor(Math.random() * 40) + 10; // 10-50%
            trend = 'stable';
            explanation = `Upcoming covenant test. Based on preliminary data, compliance is ${probability < 30 ? 'likely' : 'uncertain'}. Continue monitoring leading indicators.`;
          }
          
          predictions.push({
            covenantId: covenant.id,
            covenantTitle: covenant.title,
            currentValue: covenant.value || 'Pending',
            threshold: covenant.threshold,
            predictedBreachDate,
            probability,
            trend,
            explanation,
          });
        }
      });
      
      resolve(predictions);
    }, 1500);
  });
};

// ============================================
// WHAT CHANGED? EXPLANATIONS
// ============================================

export const generateWhatChangedExplanation = async (loan: Loan, recentEvents: TimelineEvent[]): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (recentEvents.length === 0) {
        resolve("No significant changes detected in the recent period. The loan continues to perform as expected with all monitoring activities on schedule.");
        return;
      }
      
      const eventSummaries = recentEvents.slice(0, 5).map(event => {
        switch (event.type) {
          case TimelineEventType.StatusChanged:
            return `A covenant status change occurred on ${event.date}: ${event.description}`;
          case TimelineEventType.WaiverGranted:
            return `A waiver was granted on ${event.date}, providing temporary relief from covenant requirements.`;
          case TimelineEventType.RiskAlert:
            return `A risk alert was triggered on ${event.date}: ${event.description}`;
          case TimelineEventType.AmendmentMade:
            return `The facility was amended on ${event.date}: ${event.description}`;
          case TimelineEventType.PaymentReceived:
            return `Payment activity recorded on ${event.date}.`;
          default:
            return event.description;
        }
      });
      
      const riskTrend = loan.complianceScore > 90 ? 'improving' : loan.complianceScore > 75 ? 'stable but requires attention' : 'deteriorating';
      
      const explanation = `**Recent Activity Summary for ${loan.borrower}**\n\n${eventSummaries.join('\n\n')}\n\n**Overall Assessment:** The loan's risk profile is ${riskTrend}. ${loan.complianceScore < 85 ? 'Recommend increased monitoring frequency and proactive borrower engagement.' : 'Continue standard monitoring procedures.'}`;
      
      resolve(explanation);
    }, 1000);
  });
};

// ============================================
// TIMELINE EVENT GENERATION
// ============================================

export const generateTimelineEvent = (
  type: TimelineEventType,
  title: string,
  description: string,
  relatedCovenantId?: string
): TimelineEvent => {
  return {
    id: `evt_${Date.now()}`,
    type,
    date: new Date().toISOString().split('T')[0],
    title,
    description,
    relatedCovenantId,
  };
};
