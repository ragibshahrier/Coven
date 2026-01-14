from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, UserRegistrationView, UserProfileView,
    ChangePasswordView, LoanViewSet, CovenantViewSet, TimelineEventViewSet,
    RiskPredictionViewSet, LoanDNAViewSet, DocumentUploadView,
    LoanDocumentsView, DashboardStatsView
)

from .views_ai import (
    AILoanSummaryView, AICovenantExplanationView, AIRiskPredictionsView,
    AIWhatChangedView, AIExtractLoanDNAView, RecalculateComplianceScoreView
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'covenants', CovenantViewSet, basename='covenant')
router.register(r'timeline-events', TimelineEventViewSet, basename='timeline-event')
router.register(r'risk-predictions', RiskPredictionViewSet, basename='risk-prediction')
router.register(r'loan-dna', LoanDNAViewSet, basename='loan-dna')

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', UserRegistrationView.as_view(), name='register'),
    
    # User endpoints
    path('user/profile/', UserProfileView.as_view(), name='user_profile'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Dashboard
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # Document upload
    path('documents/upload/', DocumentUploadView.as_view(), name='document_upload'),
    path('loans/<str:loan_id>/documents/', LoanDocumentsView.as_view(), name='loan_documents'),
    
    # AI-powered endpoints
    path('ai/loan-summary/', AILoanSummaryView.as_view(), name='ai_loan_summary'),
    path('ai/covenant-explanation/', AICovenantExplanationView.as_view(), name='ai_covenant_explanation'),
    path('ai/risk-predictions/', AIRiskPredictionsView.as_view(), name='ai_risk_predictions'),
    path('ai/what-changed/', AIWhatChangedView.as_view(), name='ai_what_changed'),
    path('ai/extract-loan-dna/', AIExtractLoanDNAView.as_view(), name='ai_extract_loan_dna'),
    path('ai/recalculate-score/', RecalculateComplianceScoreView.as_view(), name='ai_recalculate_score'),
    
    # Router URLs (loans, covenants, timeline-events, risk-predictions, loan-dna)
    path('', include(router.urls)),
]
