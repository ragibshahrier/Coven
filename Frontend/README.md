# Coven - Living Loan Intelligence System

> **Covenants Made Simple.**

Coven transforms complex loan covenant management into an intuitive, AI-powered experience. Built for credit analysts, portfolio managers, and lending teams who need to monitor, track, and predict covenant compliance across their loan portfolios.

---

## 🎯 Overview

Coven is a modern loan covenant monitoring platform that combines three powerful layers of intelligence:

1. **Loan DNA** - The structural blueprint of each loan, extracted from documents
2. **Snapshot** - Real-time compliance state and covenant status
3. **Timeline** - Historical evolution and audit trail of all loan events

This three-layer architecture provides complete visibility into loan health, from origination through maturity.

---

## ✨ Features

### Core Functionality

- **Portfolio Dashboard** - At-a-glance view of total exposure, compliance metrics, and risk alerts
- **Loan Management** - Create, edit, and track loans with full lifecycle support
- **Covenant Monitoring** - Track financial, reporting, affirmative, and negative covenants
- **Status Management** - Update covenant status with full audit trail (Compliant, At Risk, Breached, Upcoming, Waived)
- **Waiver Tracking** - Document and track covenant waivers with approval workflows

### AI-Powered Intelligence

- **Document Upload & Extraction** - Upload loan agreements and automatically extract covenants, terms, and risk factors
- **Loan DNA Generation** - AI analyzes documents to create a structural blueprint of each facility
- **Risk Predictions** - Predictive analytics identify potential covenant breaches before they occur
- **Smart Summaries** - AI-generated executive summaries for each loan
- **Covenant Explanations** - Context-aware explanations of covenant significance and risk implications

### Reporting & Analytics

- **Compliance Reports** - Portfolio-wide compliance scoring and trend analysis
- **Risk Distribution** - Visual breakdown of covenant status across the portfolio
- **Maturity Analysis** - Track upcoming maturities and covenant test dates
- **Export Capabilities** - Download snapshots as CSV or print to PDF

### User Experience

- **Responsive Design** - Fully functional on desktop, tablet, and mobile devices
- **Dark Theme** - Modern, eye-friendly interface optimized for extended use
- **Smooth Animations** - Framer Motion powered transitions and micro-interactions
- **Breadcrumb Navigation** - Clear navigation hierarchy across all views

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        COVEN                                │
├─────────────────────────────────────────────────────────────┤
│  Views Layer                                                │
│  ├── LandingView      - Marketing/entry page                │
│  ├── AuthView         - Login/authentication                │
│  ├── DashboardView    - Portfolio overview                  │
│  ├── LoanListView     - Loan portfolio table                │
│  ├── LoanDetailView   - Individual loan deep-dive           │
│  ├── ReportsView      - Analytics & reporting               │
│  └── SettingsView     - User preferences                    │
├─────────────────────────────────────────────────────────────┤
│  Components Layer                                           │
│  ├── Card             - Reusable card container             │
│  ├── Input/Select     - Form components                     │
│  ├── Modal            - Dialog overlays                     │
│  └── StatusBadge      - Compliance status indicators        │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                             │
│  └── geminiService    - AI/ML functions (mock + API ready)  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── types.ts         - TypeScript interfaces               │
│  └── constants.ts     - Mock data & animation configs       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tooling |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Animations & transitions |
| **Lucide React** | Icon library |
| **Google Gemini** | AI/ML capabilities (optional) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd coven

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables (Optional)

For AI features with live Gemini API:

```bash
# Create .env file
API_KEY=your_gemini_api_key
```

> **Note:** The application works fully without an API key using intelligent mock data.

---

## 📱 Views & Navigation

### Landing Page
- Animated hero section with brand messaging
- Interactive HUD-style visual elements
- Call-to-action to enter the platform

### Authentication
- Clean login interface
- Demo mode - any credentials work

### Dashboard
- **Stats Overview** - Active loans, covenants count, at-risk items, portfolio health score
- **Active Portfolio** - Loan cards grid (75% width) showing borrower, facility type, amount, and compliance score
- **Recent Activity** - Timeline sidebar (25% width) with clickable events
- **Risk Alerts Bell** - Notification icon with badge count; click to open modal with AI-identified potential issues

### Loan List
- Searchable loan table
- Filter by borrower name
- Click any row to view details
- Mobile-optimized card view

### Loan Detail (4 Tabs)
1. **Timeline** - Chronological event history with icons
2. **Snapshot** - Current covenant status grid with update actions
3. **DNA** - Extracted loan structure and terms
4. **History** - What changed analysis and audit trail

### Reports
- Portfolio compliance breakdown
- Risk distribution charts
- Covenant type analysis

### Settings
- User profile management
- Notification preferences
- Logout functionality

---

### Status Colors
- 🟢 **Compliant** - Emerald
- 🟡 **At Risk** - Amber
- 🔴 **Breached** - Red
- 🔵 **Upcoming** - Blue
- 🟣 **Waived** - Purple

---

## 📊 Data Models

### Loan
```typescript
interface Loan {
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
  timelineEvents: TimelineEvent[];
  loanDNA?: LoanDNA;
  riskPredictions?: RiskPrediction[];
}
```

### Covenant
```typescript
interface Covenant {
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
}
```

---

## 🔧 Key Functionality

### Adding a Loan
1. Click "Add Loan" on Dashboard
2. Fill in borrower details, amount, dates
3. Loan is created with initial timeline event

### Uploading Documents
1. Navigate to Loan Detail
2. Click "Upload Document" button
3. Select PDF/DOC file
4. AI extracts covenants and terms
5. Review and apply extracted data

### Updating Covenant Status
1. Go to Loan Detail → Snapshot tab
2. Click "Update Status" on any covenant
3. Select new status
4. Add current value and waiver reason if applicable
5. Compliance score auto-recalculates

### Viewing Risk Predictions
1. Dashboard shows high-priority alerts
2. Loan Detail → DNA tab shows per-covenant predictions
3. Probability percentages and trend indicators

---

## 📁 Project Structure

```
coven/
├── App.tsx              # Main app component, routing, modals
├── index.tsx            # React entry point
├── index.html           # HTML template
├── types.ts             # TypeScript interfaces
├── constants.ts         # Mock data, animation variants
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies
│
├── components/
│   └── ui/
│       ├── Card.tsx     # Card container component
│       ├── Input.tsx    # Form input components
│       ├── Modal.tsx    # Modal dialog component
│       └── StatusBadge.tsx  # Status indicator badges
│
├── services/
│   └── geminiService.ts # AI service (mock + API)
│
├── views/
│   ├── LandingView.tsx  # Landing/marketing page
│   ├── AuthView.tsx     # Login page
│   ├── DashboardView.tsx # Main dashboard
│   ├── LoanListView.tsx # Loan portfolio list
│   ├── LoanDetailView.tsx # Individual loan view
│   ├── ReportsView.tsx  # Analytics page
│   └── SettingsView.tsx # Settings page
│
└── public/
    ├── brand.png        # Logo (square)
    └── brand_rounded.png # Logo (rounded)
```

---

## 🧪 Demo Data

The application includes realistic mock data for demonstration:

- **Acme Corp Industrial** - $15M Term Loan B, 92% compliance, At Risk leverage ratio
- **Helios Energy Ltd** - $45M Revolving Facility, 78% compliance, Breached DSCR
- **Omni Retail Group** - $8.5M Term Loan, Pending status, no covenants yet

---

## 🔮 Future Enhancements

- [ ] Backend API integration
- [ ] Real-time notifications
- [ ] Multi-user collaboration
- [ ] Document storage (S3/cloud)
- [ ] Email alerts for covenant breaches
- [ ] Custom report builder
- [ ] API for external integrations
- [ ] Audit log export

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---
