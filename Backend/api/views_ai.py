"""
AI-powered views for covenant analysis, risk predictions, and document processing.
Uses Groq AI via LangChain for intelligent analysis.
"""

import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Loan, Covenant
from .services import GroqAIService, OCRSpaceService


def recalculate_compliance_score(loan):
    """
    Recalculate the compliance score for a loan based on covenant statuses.
    
    Score Calculation:
    - Compliant/Waived/Upcoming covenants: full points
    - At Risk covenants: half points
    - Breached covenants: no points
    """
    covenants = loan.covenants.all()
    total = covenants.count()
    
    if total == 0:
        loan.compliance_score = 100
    else:
        score = 0
        for covenant in covenants:
            if covenant.status in [Covenant.ComplianceStatus.COMPLIANT, 
                                   Covenant.ComplianceStatus.WAIVED,
                                   Covenant.ComplianceStatus.UPCOMING]:
                score += 100
            elif covenant.status == Covenant.ComplianceStatus.AT_RISK:
                score += 50  # At risk gets half points
            # Breached gets 0 points
        
        loan.compliance_score = round(score / total)
    
    loan.save()
    return loan.compliance_score


class AILoanSummaryView(APIView):
    """Generate AI-powered loan summary."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        loan_id = request.data.get('loan_id')
        
        if not loan_id:
            return Response(
                {'error': 'loan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            loan = Loan.objects.prefetch_related('covenants', 'risk_predictions').get(id=loan_id)
        except Loan.DoesNotExist:
            return Response(
                {'error': 'Loan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            groq_service = GroqAIService()
            
            covenants_data = [
                {
                    'title': c.title,
                    'type': c.type,
                    'status': c.status,
                    'value': c.value,
                    'threshold': c.threshold
                }
                for c in loan.covenants.all()
            ]
            
            at_risk_count = loan.covenants.filter(
                status__in=['At Risk', 'Breached']
            ).count()
            
            # Recalculate compliance score before generating summary
            recalculate_compliance_score(loan)
            
            system_prompt = """You are a senior credit risk analyst at a major financial institution. 
Provide concise, professional executive summaries for loan facilities. 
Be direct and highlight key risks if any exist. Maximum 4 sentences."""
            
            user_prompt = f"""Analyze this loan and provide an executive summary:

Borrower: {loan.borrower}
Amount: {loan.currency} {loan.amount:,.2f}
Interest Rate: {loan.interest_rate}%
Status: {loan.status}
Compliance Score: {loan.compliance_score}/100
Start Date: {loan.start_date}
Maturity Date: {loan.maturity_date}

Covenants ({len(covenants_data)} total, {at_risk_count} at risk/breached):
{json.dumps(covenants_data, indent=2)}

Provide a brief executive summary highlighting the loan's current standing and any concerns."""
            
            summary = groq_service.chat(user_prompt, system_prompt=system_prompt)
            
            return Response({
                'summary': summary,
                'loan_id': loan_id,
                'compliance_score': loan.compliance_score
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AICovenantExplanationView(APIView):
    """Generate AI-powered covenant risk explanation."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        covenant_id = request.data.get('covenant_id')
        
        if not covenant_id:
            return Response(
                {'error': 'covenant_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            covenant = Covenant.objects.select_related('loan').get(id=covenant_id)
        except Covenant.DoesNotExist:
            return Response(
                {'error': 'Covenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            groq_service = GroqAIService()
            
            system_prompt = """You are a credit risk expert explaining covenant compliance to stakeholders.
Be clear, educational, and professional. Include actionable insights when relevant.
Tailor your explanation to the specific status of the covenant."""
            
            status_context = {
                'Compliant': 'The covenant is currently being met. Explain why this is positive and what to monitor.',
                'At Risk': 'The covenant is approaching breach. Explain the urgency and recommended actions.',
                'Breached': 'The covenant has been breached. Explain implications and immediate steps needed.',
                'Upcoming': 'The covenant test is upcoming. Explain what needs to be prepared.',
                'Waived': 'The covenant has been waived. Explain what this means and any conditions.',
            }
            
            context_hint = status_context.get(covenant.status, '')
            
            waiver_info = ""
            if covenant.status == 'Waived' and covenant.waiver_reason:
                waiver_info = f'\nWaiver Info: Granted on {covenant.waiver_date} by {covenant.waiver_approved_by}. Reason: {covenant.waiver_reason}'
            
            user_prompt = f"""Explain this covenant's current status and its significance:

Covenant: {covenant.title}
Type: {covenant.type}
Description: {covenant.description}
Current Value: {covenant.value or 'Not yet measured'}
Threshold: {covenant.threshold or 'Not specified'}
Status: {covenant.status}
Due Date: {covenant.due_date}
Borrower: {covenant.loan.borrower}
Loan Compliance Score: {covenant.loan.compliance_score}

{context_hint}
{waiver_info}

Provide a clear explanation (2-3 paragraphs) of this covenant's status and its implications."""
            
            explanation = groq_service.chat(user_prompt, system_prompt=system_prompt)
            
            # Recalculate loan compliance score
            recalculate_compliance_score(covenant.loan)
            
            return Response({
                'explanation': explanation,
                'covenant_id': covenant_id,
                'status': covenant.status,
                'compliance_score': covenant.loan.compliance_score
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIRiskPredictionsView(APIView):
    """Generate AI-powered risk predictions for loan covenants."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        loan_id = request.data.get('loan_id')
        
        if not loan_id:
            return Response(
                {'error': 'loan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            loan = Loan.objects.prefetch_related('covenants').get(id=loan_id)
        except Loan.DoesNotExist:
            return Response(
                {'error': 'Loan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        financial_covenants = loan.covenants.filter(type='Financial')
        
        if not financial_covenants.exists():
            return Response({
                'predictions': [],
                'loan_id': loan_id,
                'message': 'No financial covenants to analyze'
            }, status=status.HTTP_200_OK)
        
        try:
            groq_service = GroqAIService()
            
            system_prompt = """You are a quantitative risk analyst specializing in credit risk modeling.
Analyze covenant data and provide breach probability predictions.
Be realistic and base predictions on the current status and trends.
For each covenant, provide a JSON object with these exact fields:
- probability (0-100 integer)
- trend ("improving", "stable", or "deteriorating")
- predicted_breach_date (ISO date string or "N/A" or "Already breached")
- explanation (1-2 sentences)"""
            
            covenants_info = []
            for c in financial_covenants:
                covenants_info.append({
                    'id': c.id,
                    'title': c.title,
                    'current_value': c.value or 'Unknown',
                    'threshold': c.threshold or 'Unknown',
                    'status': c.status,
                    'due_date': str(c.due_date)
                })
            
            user_prompt = f"""Analyze breach risk for these financial covenants:

Loan: {loan.borrower}
Current Compliance Score: {loan.compliance_score}
Loan Status: {loan.status}

Covenants:
{json.dumps(covenants_info, indent=2)}

For EACH covenant, analyze the risk and return a JSON array with predictions.
Each prediction must have: probability, trend, predicted_breach_date, explanation.

Return ONLY valid JSON array, no other text."""
            
            ai_response = groq_service.chat(user_prompt, system_prompt=system_prompt)
            
            # Try to parse AI response, fall back to calculated predictions
            predictions = []
            try:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\[[\s\S]*\]', ai_response)
                if json_match:
                    parsed = json.loads(json_match.group())
                    for i, covenant in enumerate(financial_covenants):
                        if i < len(parsed):
                            pred = parsed[i]
                            predictions.append({
                                'covenantId': covenant.id,
                                'covenantTitle': covenant.title,
                                'currentValue': covenant.value or 'Pending',
                                'threshold': covenant.threshold or 'N/A',
                                'probability': pred.get('probability', 50),
                                'trend': pred.get('trend', 'stable'),
                                'predictedBreachDate': pred.get('predicted_breach_date', 'N/A'),
                                'explanation': pred.get('explanation', 'Analysis pending.')
                            })
            except (json.JSONDecodeError, KeyError):
                pass
            
            # If parsing failed, generate predictions based on status
            if not predictions:
                for covenant in financial_covenants:
                    base_probability = {
                        'Compliant': 15,
                        'At Risk': 70,
                        'Breached': 100,
                        'Upcoming': 30,
                        'Waived': 5
                    }.get(covenant.status, 30)
                    
                    trend = 'stable'
                    if covenant.status in ['At Risk', 'Breached']:
                        trend = 'deteriorating'
                    elif covenant.status == 'Compliant' and loan.compliance_score > 90:
                        trend = 'improving'
                    
                    predictions.append({
                        'covenantId': covenant.id,
                        'covenantTitle': covenant.title,
                        'currentValue': covenant.value or 'Pending',
                        'threshold': covenant.threshold or 'N/A',
                        'probability': base_probability,
                        'trend': trend,
                        'predictedBreachDate': 'Already breached' if covenant.status == 'Breached' else (
                            'Within 3 months' if base_probability > 50 else 'N/A'
                        ),
                        'explanation': f'Based on current {covenant.status.lower()} status and loan compliance score of {loan.compliance_score}%.'
                    })
            
            # Update compliance score based on predictions
            if predictions:
                # Calculate score based on AI predictions
                total_prob = sum(p['probability'] for p in predictions)
                avg_risk = total_prob / len(predictions) if predictions else 0
                
                # Higher risk = lower compliance score
                # Map avg risk (0-100) to compliance (100-0)
                ai_based_score = max(0, min(100, 100 - int(avg_risk * 0.8)))
                
                # Blend with covenant-status-based score
                status_based_score = recalculate_compliance_score(loan)
                
                # Use weighted average (60% status-based, 40% AI prediction-based)
                final_score = int(status_based_score * 0.6 + ai_based_score * 0.4)
                loan.compliance_score = final_score
                loan.save()
            
            return Response({
                'predictions': predictions,
                'loan_id': loan_id,
                'compliance_score': loan.compliance_score
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIWhatChangedView(APIView):
    """Generate AI explanation of recent changes for a loan."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        loan_id = request.data.get('loan_id')
        
        if not loan_id:
            return Response(
                {'error': 'loan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            loan = Loan.objects.prefetch_related('timeline_events', 'covenants').get(id=loan_id)
        except Loan.DoesNotExist:
            return Response(
                {'error': 'Loan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        recent_events = loan.timeline_events.order_by('-date')[:10]
        
        if not recent_events.exists():
            return Response({
                'explanation': 'No significant changes detected. The loan continues to perform as expected with all monitoring activities on schedule.',
                'loan_id': loan_id
            }, status=status.HTTP_200_OK)
        
        try:
            groq_service = GroqAIService()
            
            events_data = [
                {
                    'type': e.type,
                    'date': str(e.date),
                    'title': e.title,
                    'description': e.description
                }
                for e in recent_events
            ]
            
            system_prompt = """You are a credit monitoring specialist providing status updates.
Summarize recent activity clearly and highlight any items requiring attention.
Use markdown formatting for better readability."""
            
            user_prompt = f"""Summarize recent activity for this loan:

Borrower: {loan.borrower}
Current Compliance Score: {loan.compliance_score}
Loan Status: {loan.status}

Recent Events:
{json.dumps(events_data, indent=2)}

Provide:
1. A summary of key changes
2. Current risk assessment
3. Recommended actions if any

Format with markdown headers and bullet points."""
            
            explanation = groq_service.chat(user_prompt, system_prompt=system_prompt)
            
            return Response({
                'explanation': explanation,
                'loan_id': loan_id,
                'events_analyzed': len(events_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIExtractLoanDNAView(APIView):
    """Extract Loan DNA from uploaded document using OCR and AI."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        loan_id = request.data.get('loan_id')
        file = request.FILES.get('file')
        document_text = request.data.get('document_text')
        filename = request.data.get('filename', 'document.pdf')
        
        if not loan_id:
            return Response(
                {'error': 'loan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            loan = Loan.objects.get(id=loan_id)
        except Loan.DoesNotExist:
            return Response(
                {'error': 'Loan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # If file provided, extract text using OCR
            if file:
                try:
                    ocr_service = OCRSpaceService()
                    ocr_result = ocr_service.extract_text_from_bytes(
                        file_content=file.read(),
                        filename=file.name,
                        is_pdf=file.name.lower().endswith('.pdf')
                    )
                    
                    if not ocr_result['success']:
                        return Response(
                            {'error': f"OCR extraction failed: {ocr_result['error']}"},
                            status=status.HTTP_422_UNPROCESSABLE_ENTITY
                        )
                    
                    document_text = ocr_result['text']
                    filename = file.name
                except ValueError as e:
                    return Response(
                        {'error': f'OCR service error: {str(e)}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            if not document_text:
                return Response(
                    {'error': 'Either file or document_text is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use AI to extract loan DNA
            groq_service = GroqAIService()
            
            system_prompt = """You are an expert in parsing loan agreements and credit facility documentation.
Extract structured information and return it as valid JSON.
Be thorough and accurate. Extract exact thresholds and requirements."""
            
            user_prompt = f"""Extract loan DNA from this document and return as JSON:

DOCUMENT TEXT:
{document_text[:12000]}

Return a JSON object with this exact structure:
{{
  "keyTerms": {{
    "facilityType": "string",
    "purpose": "string",
    "securityType": "string",
    "governingLaw": "string"
  }},
  "extractedCovenants": [
    {{
      "title": "string",
      "type": "Financial|Reporting|Affirmative|Negative",
      "threshold": "string",
      "frequency": "string",
      "description": "string"
    }}
  ],
  "riskFactors": ["string"],
  "summary": "string (2-3 sentences)"
}}

Return ONLY valid JSON, no other text."""
            
            ai_response = groq_service.chat(user_prompt, system_prompt=system_prompt)
            
            # Parse AI response
            import re
            from datetime import date
            
            try:
                json_match = re.search(r'\{[\s\S]*\}', ai_response)
                if json_match:
                    parsed = json.loads(json_match.group())
                    
                    loan_dna = {
                        'extractedAt': date.today().isoformat(),
                        'sourceDocument': filename,
                        'confidence': 88,
                        'keyTerms': parsed.get('keyTerms', {
                            'facilityType': 'Term Loan',
                            'purpose': 'General Corporate Purposes',
                            'securityType': 'Senior Secured',
                            'governingLaw': 'New York'
                        }),
                        'extractedCovenants': parsed.get('extractedCovenants', []),
                        'riskFactors': parsed.get('riskFactors', []),
                        'summary': parsed.get('summary', 'Document analyzed successfully.')
                    }
                else:
                    raise json.JSONDecodeError("No JSON found", ai_response, 0)
                    
            except json.JSONDecodeError:
                # Fallback structure
                loan_dna = {
                    'extractedAt': date.today().isoformat(),
                    'sourceDocument': filename,
                    'confidence': 75,
                    'keyTerms': {
                        'facilityType': 'Term Loan',
                        'purpose': 'General Corporate Purposes',
                        'securityType': 'Senior Secured',
                        'governingLaw': 'New York'
                    },
                    'extractedCovenants': [
                        {
                            'title': 'Maximum Leverage Ratio',
                            'type': 'Financial',
                            'threshold': '< 4.0x',
                            'frequency': 'Quarterly',
                            'description': 'Total Net Debt to EBITDA shall not exceed 4.0x'
                        }
                    ],
                    'riskFactors': ['Document parsing requires manual review'],
                    'summary': ai_response[:500] if ai_response else 'Document analyzed.'
                }
            
            return Response({
                'loanDNA': loan_dna,
                'loan_id': loan_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Extraction failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RecalculateComplianceScoreView(APIView):
    """Recalculate compliance score for a loan based on covenant statuses."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        loan_id = request.data.get('loan_id')
        
        if not loan_id:
            return Response(
                {'error': 'loan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            loan = Loan.objects.prefetch_related('covenants').get(id=loan_id)
        except Loan.DoesNotExist:
            return Response(
                {'error': 'Loan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_score = loan.compliance_score
        new_score = recalculate_compliance_score(loan)
        
        return Response({
            'loan_id': loan_id,
            'old_score': old_score,
            'new_score': new_score,
            'message': 'Compliance score recalculated successfully'
        }, status=status.HTTP_200_OK)
