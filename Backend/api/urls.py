from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, UserRegistrationView, UserProfileView,
    ChangePasswordView, LoanViewSet, CovenantViewSet, TimelineEventViewSet,
    RiskPredictionViewSet, LoanDNAViewSet, DocumentUploadView,
    LoanDocumentsView, DashboardStatsView
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
    
    # Router URLs (loans, covenants, timeline-events, risk-predictions, loan-dna)
    path('', include(router.urls)),
]
