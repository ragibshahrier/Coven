"""
Management command to seed the database with mock data matching the frontend.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import (
    Loan, Covenant, TimelineEvent, RiskPrediction, 
    LoanDNA, ExtractedCovenant
)
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with mock data matching the frontend constants.ts'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database with mock data...\n')
        
        # Clear existing data
        RiskPrediction.objects.all().delete()
        TimelineEvent.objects.all().delete()
        ExtractedCovenant.objects.all().delete()
        LoanDNA.objects.all().delete()
        Covenant.objects.all().delete()
        Loan.objects.all().delete()
        
        self.stdout.write('Cleared existing data.')
        
        # Create loans with all related data
        self.create_loan_1()
        self.create_loan_2()
        self.create_loan_3()
        self.create_loan_4()
        self.create_loan_5()
        self.create_loan_6()
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully seeded {Loan.objects.count()} loans!'))
        self.stdout.write(self.style.SUCCESS(f'  - {Covenant.objects.count()} covenants'))
        self.stdout.write(self.style.SUCCESS(f'  - {TimelineEvent.objects.count()} timeline events'))
        self.stdout.write(self.style.SUCCESS(f'  - {RiskPrediction.objects.count()} risk predictions'))
        self.stdout.write(self.style.SUCCESS(f'  - {LoanDNA.objects.count()} loan DNAs'))

    def create_loan_1(self):
        """Acme Corp Industrial - ln_001"""
        loan = Loan.objects.create(
            id='ln_001',
            borrower='Acme Corp Industrial',
            amount=Decimal('15000000'),
            currency='USD',
            interest_rate=Decimal('5.5'),
            start_date='2023-01-15',
            maturity_date='2028-01-15',
            status=Loan.LoanStatus.ACTIVE,
            compliance_score=92,
        )
        
        # Loan DNA
        dna = LoanDNA.objects.create(
            id='dna_001',
            loan=loan,
            extracted_at='2023-01-16',
            source_document='loan_agreement_acme.pdf',
            confidence=94,
            facility_type='Term Loan B',
            purpose='Working Capital & Expansion',
            security_type='Senior Secured',
            governing_law='New York',
            risk_factors=[
                'High leverage in cyclical industry',
                'Concentration risk in single market segment',
                'Upcoming capex requirements may strain cash flow',
            ],
            summary='Senior secured term loan for industrial manufacturing company with standard financial covenants. Moderate risk profile with tight leverage headroom.',
        )
        
        # Extracted covenants from DNA
        ExtractedCovenant.objects.create(
            id='exc_001', loan_dna=dna, title='Leverage Ratio', type='Financial',
            threshold='< 4.0x', frequency='Quarterly', description='Total Net Debt to EBITDA'
        )
        ExtractedCovenant.objects.create(
            id='exc_002', loan_dna=dna, title='Interest Coverage', type='Financial',
            threshold='> 2.5x', frequency='Quarterly', description='EBITDA to Interest Expense'
        )
        ExtractedCovenant.objects.create(
            id='exc_003', loan_dna=dna, title='Quarterly Financials', type='Reporting',
            threshold='Within 45 days', frequency='Quarterly', description='Unaudited financial statements'
        )
        
        # Covenants
        cov_1 = Covenant.objects.create(
            id='cov_1', loan=loan, title='Quarterly Financials', type='Reporting',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.COMPLIANT,
            description='Submission of unaudited quarterly financial statements within 45 days of quarter end.',
            frequency='Quarterly'
        )
        cov_2 = Covenant.objects.create(
            id='cov_2', loan=loan, title='Leverage Ratio', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.AT_RISK,
            value='3.9x', threshold='< 4.0x',
            description='Total Net Debt to EBITDA must not exceed 4.0x.',
            frequency='Quarterly'
        )
        cov_3 = Covenant.objects.create(
            id='cov_3', loan=loan, title='Interest Coverage', type='Financial',
            due_date='2024-06-30', status=Covenant.ComplianceStatus.UPCOMING,
            threshold='> 2.5x',
            description='EBITDA to Interest Expense ratio must be maintained above 2.5x.',
            frequency='Quarterly'
        )
        
        # Risk Predictions
        RiskPrediction.objects.create(
            id='rp_001', loan=loan, covenant=cov_2,
            current_value='3.9x', threshold='< 4.0x',
            predicted_breach_date='2024-06-30', probability=72,
            trend='deteriorating',
            explanation='Based on declining EBITDA trend (-8% QoQ) and stable debt levels, leverage ratio is projected to exceed 4.0x threshold within 2 quarters. Recommend proactive engagement with borrower.'
        )
        RiskPrediction.objects.create(
            id='rp_002', loan=loan, covenant=cov_3,
            current_value='4.2x', threshold='> 2.5x',
            predicted_breach_date='', probability=15,
            trend='stable',
            explanation='Interest coverage remains healthy with significant buffer. Low breach probability unless significant EBITDA deterioration occurs.'
        )
        
        # Timeline Events
        TimelineEvent.objects.create(
            id='evt_001', loan=loan, type=TimelineEvent.EventType.LOAN_CREATED,
            date='2023-01-15', title='Loan Facility Established',
            description='USD 15M Term Loan B facility established with Acme Corp Industrial. 5-year tenor with quarterly amortization.'
        )
        TimelineEvent.objects.create(
            id='evt_002', loan=loan, type=TimelineEvent.EventType.DOCUMENT_UPLOADED,
            date='2023-01-16', title='Loan Agreement Uploaded',
            description='Original loan agreement document uploaded and processed. AI extracted 3 covenants with 94% confidence.'
        )
        TimelineEvent.objects.create(
            id='evt_003', loan=loan, type=TimelineEvent.EventType.COVENANT_ADDED,
            date='2023-01-16', title='Covenants Configured',
            description='Financial covenants (Leverage Ratio, Interest Coverage) and Reporting covenant (Quarterly Financials) added to monitoring.'
        )
        TimelineEvent.objects.create(
            id='evt_004', loan=loan, type=TimelineEvent.EventType.STATUS_CHANGED,
            date='2023-09-30', title='Leverage Ratio Status Changed',
            description='Leverage Ratio covenant status changed from Compliant to At Risk. Current value 3.9x approaching threshold of 4.0x.',
            related_covenant=cov_2
        )
        TimelineEvent.objects.create(
            id='evt_005', loan=loan, type=TimelineEvent.EventType.RISK_ALERT,
            date='2023-10-15', title='Predictive Alert: Potential Breach',
            description='AI analysis indicates 72% probability of Leverage Ratio breach within 2 quarters based on EBITDA trend deterioration.',
            related_covenant=cov_2
        )
        
        self.stdout.write(f'  Created: {loan.borrower}')

    def create_loan_2(self):
        """Helios Energy Ltd - ln_002"""
        loan = Loan.objects.create(
            id='ln_002',
            borrower='Helios Energy Ltd',
            amount=Decimal('45000000'),
            currency='USD',
            interest_rate=Decimal('6.2'),
            start_date='2022-06-01',
            maturity_date='2027-06-01',
            status=Loan.LoanStatus.ACTIVE,
            compliance_score=78,
        )
        
        # Loan DNA
        dna = LoanDNA.objects.create(
            id='dna_002',
            loan=loan,
            extracted_at='2022-06-02',
            source_document='helios_facility_agreement.pdf',
            confidence=91,
            facility_type='Revolving Credit Facility',
            purpose='Project Finance - Solar Installation',
            security_type='Asset-Backed',
            governing_law='Delaware',
            risk_factors=[
                'Project execution risk on new installations',
                'Regulatory dependency on renewable energy incentives',
                'Weather-related revenue variability',
            ],
            summary='Asset-backed revolving facility for renewable energy company. Higher risk profile due to project execution dependencies and regulatory exposure.',
        )
        
        ExtractedCovenant.objects.create(
            id='exc_004', loan_dna=dna, title='Debt Service Coverage', type='Financial',
            threshold='> 1.25x', frequency='Quarterly', description='DSCR on rolling 12-month basis'
        )
        ExtractedCovenant.objects.create(
            id='exc_005', loan_dna=dna, title='Annual Audit', type='Reporting',
            threshold='Within 90 days', frequency='Annual', description='Audited financials by Big 4 firm'
        )
        
        # Covenants
        cov_4 = Covenant.objects.create(
            id='cov_4', loan=loan, title='Annual Audit', type='Reporting',
            due_date='2023-12-31', status=Covenant.ComplianceStatus.COMPLIANT,
            description='Audited annual financials by KPMG or equivalent.',
            frequency='Annual'
        )
        cov_5 = Covenant.objects.create(
            id='cov_5', loan=loan, title='Debt Service Coverage', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.BREACHED,
            value='1.1x', threshold='> 1.25x',
            description='DSCR must be greater than 1.25x calculated on a rolling 12-month basis.',
            frequency='Quarterly'
        )
        
        # Risk Prediction
        RiskPrediction.objects.create(
            id='rp_003', loan=loan, covenant=cov_5,
            current_value='1.1x', threshold='> 1.25x',
            predicted_breach_date='2024-01-15', probability=95,
            trend='deteriorating',
            explanation='DSCR already below threshold at 1.1x. Immediate breach confirmed. Recommend initiating waiver discussion or amendment process.'
        )
        
        # Timeline Events
        TimelineEvent.objects.create(
            id='evt_010', loan=loan, type=TimelineEvent.EventType.LOAN_CREATED,
            date='2022-06-01', title='Revolving Facility Established',
            description='USD 45M Revolving Credit Facility established for Helios Energy solar project financing.'
        )
        TimelineEvent.objects.create(
            id='evt_011', loan=loan, type=TimelineEvent.EventType.STATUS_CHANGED,
            date='2023-06-30', title='DSCR Covenant Breached',
            description='Debt Service Coverage Ratio fell to 1.1x, below the required 1.25x threshold. Breach notification sent to borrower.',
            related_covenant=cov_5
        )
        TimelineEvent.objects.create(
            id='evt_012', loan=loan, type=TimelineEvent.EventType.AMENDMENT_MADE,
            date='2023-08-15', title='Amendment 1 Executed',
            description='First amendment executed providing temporary DSCR covenant relief. New threshold of 1.1x effective through Q4 2023.'
        )
        TimelineEvent.objects.create(
            id='evt_013', loan=loan, type=TimelineEvent.EventType.RISK_ALERT,
            date='2023-11-01', title='Amendment Expiry Warning',
            description='Temporary covenant relief expires in 60 days. Current DSCR of 1.1x will breach original 1.25x threshold.',
            related_covenant=cov_5
        )
        
        self.stdout.write(f'  Created: {loan.borrower}')

    def create_loan_3(self):
        """Omni Retail Group - ln_003"""
        loan = Loan.objects.create(
            id='ln_003',
            borrower='Omni Retail Group',
            amount=Decimal('8500000'),
            currency='USD',
            interest_rate=Decimal('4.8'),
            start_date='2023-09-01',
            maturity_date='2026-09-01',
            status=Loan.LoanStatus.PENDING,
            compliance_score=100,
        )
        
        # Timeline Events
        TimelineEvent.objects.create(
            id='evt_020', loan=loan, type=TimelineEvent.EventType.LOAN_CREATED,
            date='2023-09-01', title='Loan Application Received',
            description='USD 8.5M term loan application received from Omni Retail Group. Pending document upload and covenant configuration.'
        )
        
        self.stdout.write(f'  Created: {loan.borrower}')

    def create_loan_4(self):
        """TechVenture Solutions - ln_004"""
        loan = Loan.objects.create(
            id='ln_004',
            borrower='TechVenture Solutions',
            amount=Decimal('25000000'),
            currency='USD',
            interest_rate=Decimal('7.25'),
            start_date='2023-03-15',
            maturity_date='2028-03-15',
            status=Loan.LoanStatus.ACTIVE,
            compliance_score=88,
        )
        
        # Loan DNA
        dna = LoanDNA.objects.create(
            id='dna_004',
            loan=loan,
            extracted_at='2023-03-16',
            source_document='techventure_credit_agreement.pdf',
            confidence=92,
            facility_type='Senior Term Loan',
            purpose='Acquisition Financing',
            security_type='Senior Secured - First Lien',
            governing_law='New York',
            risk_factors=[
                'High growth tech company with negative cash flow',
                'Customer concentration in top 5 accounts',
                'Integration risk from recent acquisition',
            ],
            summary='Senior secured acquisition financing for SaaS company. Elevated risk due to growth-stage profile but strong ARR trajectory provides comfort.',
        )
        
        ExtractedCovenant.objects.create(
            id='exc_006', loan_dna=dna, title='Total Leverage Ratio', type='Financial',
            threshold='< 5.0x', frequency='Quarterly', description='Total Debt to EBITDA'
        )
        ExtractedCovenant.objects.create(
            id='exc_007', loan_dna=dna, title='Fixed Charge Coverage', type='Financial',
            threshold='> 1.1x', frequency='Quarterly', description='EBITDA minus CapEx to Fixed Charges'
        )
        ExtractedCovenant.objects.create(
            id='exc_008', loan_dna=dna, title='Monthly Revenue Report', type='Reporting',
            threshold='Within 30 days', frequency='Monthly', description='Monthly revenue and ARR metrics'
        )
        
        # Covenants
        cov_tv_1 = Covenant.objects.create(
            id='cov_tv_1', loan=loan, title='Total Leverage Ratio', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.COMPLIANT,
            value='4.6x', threshold='< 5.0x',
            description='Total Debt to EBITDA must not exceed 5.0x.',
            frequency='Quarterly'
        )
        Covenant.objects.create(
            id='cov_tv_2', loan=loan, title='Fixed Charge Coverage', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.COMPLIANT,
            value='1.3x', threshold='> 1.1x',
            description='EBITDA minus CapEx to Fixed Charges ratio must exceed 1.1x.',
            frequency='Quarterly'
        )
        Covenant.objects.create(
            id='cov_tv_3', loan=loan, title='Monthly Revenue Report', type='Reporting',
            due_date='2024-02-28', status=Covenant.ComplianceStatus.COMPLIANT,
            description='Monthly submission of revenue metrics and ARR dashboard.',
            frequency='Monthly'
        )
        
        # Risk Prediction
        RiskPrediction.objects.create(
            id='rp_004', loan=loan, covenant=cov_tv_1,
            current_value='4.6x', threshold='< 5.0x',
            predicted_breach_date='2024-09-30', probability=45,
            trend='stable',
            explanation='Leverage elevated but stable. EBITDA growth expected to reduce ratio over next 2 quarters. Monitor closely.'
        )
        
        # Timeline Events
        TimelineEvent.objects.create(
            id='evt_tv_001', loan=loan, type=TimelineEvent.EventType.LOAN_CREATED,
            date='2023-03-15', title='Acquisition Facility Closed',
            description='USD 25M Senior Term Loan closed to fund acquisition of CloudSync Inc. 5-year tenor with bullet maturity.'
        )
        TimelineEvent.objects.create(
            id='evt_tv_002', loan=loan, type=TimelineEvent.EventType.DOCUMENT_UPLOADED,
            date='2023-03-16', title='Credit Agreement Processed',
            description='Credit agreement uploaded and analyzed. AI extracted 3 covenants with 92% confidence.'
        )
        TimelineEvent.objects.create(
            id='evt_tv_003', loan=loan, type=TimelineEvent.EventType.PAYMENT_RECEIVED,
            date='2023-12-15', title='Q4 Interest Payment Received',
            description='Quarterly interest payment of $453,125 received on schedule.'
        )
        
        self.stdout.write(f'  Created: {loan.borrower}')

    def create_loan_5(self):
        """Pacific Healthcare Systems - ln_005"""
        loan = Loan.objects.create(
            id='ln_005',
            borrower='Pacific Healthcare Systems',
            amount=Decimal('75000000'),
            currency='USD',
            interest_rate=Decimal('5.0'),
            start_date='2022-11-01',
            maturity_date='2029-11-01',
            status=Loan.LoanStatus.ACTIVE,
            compliance_score=96,
        )
        
        # Loan DNA
        dna = LoanDNA.objects.create(
            id='dna_005',
            loan=loan,
            extracted_at='2022-11-02',
            source_document='pacific_healthcare_facility.pdf',
            confidence=97,
            facility_type='Syndicated Term Loan',
            purpose='Hospital Expansion & Equipment',
            security_type='Senior Secured - Real Estate',
            governing_law='California',
            risk_factors=[
                'Healthcare regulatory changes could impact reimbursement',
                'Labor cost inflation in nursing staff',
                'Capital intensive expansion program',
            ],
            summary='Well-structured syndicated facility for established healthcare system. Strong credit profile with real estate collateral. Low risk.',
        )
        
        ExtractedCovenant.objects.create(
            id='exc_009', loan_dna=dna, title='Debt to Capitalization', type='Financial',
            threshold='< 60%', frequency='Quarterly', description='Total Debt to Total Capitalization'
        )
        ExtractedCovenant.objects.create(
            id='exc_010', loan_dna=dna, title='Days Cash on Hand', type='Financial',
            threshold='> 60 days', frequency='Quarterly', description='Unrestricted cash divided by daily operating expenses'
        )
        ExtractedCovenant.objects.create(
            id='exc_011', loan_dna=dna, title='Annual Audited Financials', type='Reporting',
            threshold='Within 120 days', frequency='Annual', description='Audited financials with compliance certificate'
        )
        
        # Covenants
        cov_ph_1 = Covenant.objects.create(
            id='cov_ph_1', loan=loan, title='Debt to Capitalization', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.COMPLIANT,
            value='48%', threshold='< 60%',
            description='Total Debt to Total Capitalization ratio must remain below 60%.',
            frequency='Quarterly'
        )
        Covenant.objects.create(
            id='cov_ph_2', loan=loan, title='Days Cash on Hand', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.COMPLIANT,
            value='85 days', threshold='> 60 days',
            description='Must maintain minimum 60 days cash on hand.',
            frequency='Quarterly'
        )
        Covenant.objects.create(
            id='cov_ph_3', loan=loan, title='Annual Audited Financials', type='Reporting',
            due_date='2024-04-30', status=Covenant.ComplianceStatus.UPCOMING,
            description='Submission of audited annual financials within 120 days of fiscal year end.',
            frequency='Annual'
        )
        
        # Risk Prediction
        RiskPrediction.objects.create(
            id='rp_005', loan=loan, covenant=cov_ph_1,
            current_value='48%', threshold='< 60%',
            predicted_breach_date='', probability=8,
            trend='improving',
            explanation='Strong deleveraging trend. Ratio improved from 52% to 48% over past year. Very low breach probability.'
        )
        
        # Timeline Events
        TimelineEvent.objects.create(
            id='evt_ph_001', loan=loan, type=TimelineEvent.EventType.LOAN_CREATED,
            date='2022-11-01', title='Syndicated Facility Closed',
            description='USD 75M Syndicated Term Loan closed with 5 participating lenders. Lead arranger: First National Bank.'
        )
        TimelineEvent.objects.create(
            id='evt_ph_002', loan=loan, type=TimelineEvent.EventType.STATUS_CHANGED,
            date='2023-06-30', title='All Covenants Compliant',
            description='Q2 2023 compliance certificate received. All financial covenants in compliance with healthy headroom.'
        )
        TimelineEvent.objects.create(
            id='evt_ph_003', loan=loan, type=TimelineEvent.EventType.PAYMENT_RECEIVED,
            date='2024-01-02', title='Principal + Interest Payment',
            description='Scheduled principal payment of $2.5M plus interest received. Loan balance now $67.5M.'
        )
        
        self.stdout.write(f'  Created: {loan.borrower}')

    def create_loan_6(self):
        """Metro Logistics Inc - ln_006"""
        loan = Loan.objects.create(
            id='ln_006',
            borrower='Metro Logistics Inc',
            amount=Decimal('12000000'),
            currency='EUR',
            interest_rate=Decimal('4.5'),
            start_date='2023-07-01',
            maturity_date='2026-07-01',
            status=Loan.LoanStatus.ACTIVE,
            compliance_score=65,
        )
        
        # Loan DNA
        dna = LoanDNA.objects.create(
            id='dna_006',
            loan=loan,
            extracted_at='2023-07-02',
            source_document='metro_logistics_agreement.pdf',
            confidence=89,
            facility_type='Working Capital Facility',
            purpose='Fleet Expansion & Operations',
            security_type='Asset-Backed - Fleet Vehicles',
            governing_law='English Law',
            risk_factors=[
                'Fuel price volatility impacts margins',
                'Driver shortage affecting capacity',
                'Competitive pressure from new market entrants',
                'Currency exposure on cross-border operations',
            ],
            summary='Asset-backed working capital facility for logistics company. Elevated risk due to thin margins and operational challenges. Close monitoring required.',
        )
        
        ExtractedCovenant.objects.create(
            id='exc_012', loan_dna=dna, title='Current Ratio', type='Financial',
            threshold='> 1.2x', frequency='Quarterly', description='Current Assets to Current Liabilities'
        )
        ExtractedCovenant.objects.create(
            id='exc_013', loan_dna=dna, title='EBITDA Margin', type='Financial',
            threshold='> 8%', frequency='Quarterly', description='EBITDA as percentage of Revenue'
        )
        ExtractedCovenant.objects.create(
            id='exc_014', loan_dna=dna, title='Fleet Utilization Report', type='Reporting',
            threshold='Within 15 days', frequency='Monthly', description='Monthly fleet utilization and maintenance report'
        )
        
        # Covenants
        cov_ml_1 = Covenant.objects.create(
            id='cov_ml_1', loan=loan, title='Current Ratio', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.AT_RISK,
            value='1.15x', threshold='> 1.2x',
            description='Current Assets to Current Liabilities must exceed 1.2x.',
            frequency='Quarterly'
        )
        cov_ml_2 = Covenant.objects.create(
            id='cov_ml_2', loan=loan, title='EBITDA Margin', type='Financial',
            due_date='2024-03-31', status=Covenant.ComplianceStatus.AT_RISK,
            value='7.2%', threshold='> 8%',
            description='EBITDA as percentage of Revenue must exceed 8%.',
            frequency='Quarterly'
        )
        Covenant.objects.create(
            id='cov_ml_3', loan=loan, title='Fleet Utilization Report', type='Reporting',
            due_date='2024-02-15', status=Covenant.ComplianceStatus.COMPLIANT,
            description='Monthly fleet utilization and maintenance metrics.',
            frequency='Monthly'
        )
        
        # Risk Predictions
        RiskPrediction.objects.create(
            id='rp_006', loan=loan, covenant=cov_ml_2,
            current_value='7.2%', threshold='> 8%',
            predicted_breach_date='2024-03-31', probability=82,
            trend='deteriorating',
            explanation='EBITDA margin has declined for 3 consecutive quarters due to fuel costs and wage inflation. High probability of breach at next test date.'
        )
        RiskPrediction.objects.create(
            id='rp_007', loan=loan, covenant=cov_ml_1,
            current_value='1.15x', threshold='> 1.2x',
            predicted_breach_date='2024-03-31', probability=68,
            trend='deteriorating',
            explanation='Working capital under pressure. Current ratio trending down from 1.3x to 1.15x. Recommend discussing liquidity support options.'
        )
        
        # Timeline Events
        TimelineEvent.objects.create(
            id='evt_ml_001', loan=loan, type=TimelineEvent.EventType.LOAN_CREATED,
            date='2023-07-01', title='Working Capital Facility Established',
            description='EUR 12M Working Capital Facility established for Metro Logistics fleet expansion.'
        )
        TimelineEvent.objects.create(
            id='evt_ml_002', loan=loan, type=TimelineEvent.EventType.STATUS_CHANGED,
            date='2023-12-31', title='EBITDA Margin At Risk',
            description='Q4 results show EBITDA margin of 7.2%, below 8% threshold. Status changed to At Risk.',
            related_covenant=cov_ml_2
        )
        TimelineEvent.objects.create(
            id='evt_ml_003', loan=loan, type=TimelineEvent.EventType.RISK_ALERT,
            date='2024-01-10', title='Multiple Covenant Warning',
            description='AI analysis indicates elevated breach probability for both EBITDA Margin (82%) and Current Ratio (68%) covenants.'
        )
        
        self.stdout.write(f'  Created: {loan.borrower}')
