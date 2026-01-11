from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from datetime import date

from .models import (
    Loan, Covenant, TimelineEvent, RiskPrediction,
    LoanDNA, ExtractedCovenant, UploadedDocument
)
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoanListSerializer, LoanDetailSerializer,
    LoanWriteSerializer, CovenantSerializer, CovenantWriteSerializer,
    TimelineEventSerializer, TimelineEventWriteSerializer,
    RiskPredictionSerializer, RiskPredictionWriteSerializer,
    LoanDNASerializer, LoanDNAWriteSerializer, UploadedDocumentSerializer
)

User = get_user_model()


# ============================================
# CUSTOM JWT TOKEN SERIALIZER
# ============================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer that includes user data in response."""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user data to response
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view."""
    serializer_class = CustomTokenObtainPairSerializer


# ============================================
# USER VIEWS
# ============================================

class UserRegistrationView(generics.CreateAPIView):
    """View for user registration."""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for getting and updating user profile."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """View for changing password."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        self.request.user.set_password(serializer.validated_data['new_password'])
        self.request.user.save()
        
        return Response({
            'message': 'Password updated successfully'
        }, status=status.HTTP_200_OK)


# ============================================
# LOAN VIEWS
# ============================================

class LoanViewSet(viewsets.ModelViewSet):
    """ViewSet for Loan CRUD operations."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Loan.objects.prefetch_related(
            'covenants', 'timeline_events', 'risk_predictions',
            'uploaded_documents'
        ).select_related('loan_dna', 'created_by')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LoanListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return LoanWriteSerializer
        return LoanDetailSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        loan = serializer.save()
        
        # Create initial timeline event
        TimelineEvent.objects.create(
            loan=loan,
            type=TimelineEvent.EventType.LOAN_CREATED,
            date=date.today(),
            title='Loan Facility Created',
            description=f"New loan facility created for {loan.borrower} with principal amount of {loan.currency} {loan.amount:,.2f}."
        )
        
        return Response(
            LoanDetailSerializer(loan).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def dashboard_stats(self, request, pk=None):
        """Get dashboard statistics for a specific loan."""
        loan = self.get_object()
        
        covenants = loan.covenants.all()
        at_risk = covenants.filter(
            status__in=[Covenant.ComplianceStatus.AT_RISK, Covenant.ComplianceStatus.BREACHED]
        ).count()
        
        return Response({
            'total_covenants': covenants.count(),
            'at_risk_count': at_risk,
            'compliance_score': loan.compliance_score,
            'status': loan.status
        })


class DashboardStatsView(APIView):
    """View for getting overall dashboard statistics."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        loans = Loan.objects.prefetch_related('covenants', 'risk_predictions')
        
        total_loans = loans.count()
        total_covenants = Covenant.objects.count()
        
        at_risk_covenants = Covenant.objects.filter(
            status__in=[Covenant.ComplianceStatus.AT_RISK, Covenant.ComplianceStatus.BREACHED]
        ).count()
        
        breached_covenants = Covenant.objects.filter(
            status=Covenant.ComplianceStatus.BREACHED
        ).count()
        
        avg_score = 0
        if total_loans > 0:
            avg_score = round(
                sum(loan.compliance_score for loan in loans) / total_loans
            )
        
        # Get high risk predictions
        high_risk_predictions = []
        for loan in loans:
            for pred in loan.risk_predictions.filter(probability__gt=50):
                high_risk_predictions.append({
                    'loanId': loan.id,
                    'borrower': loan.borrower,
                    'covenantId': pred.covenant.id,
                    'covenantTitle': pred.covenant.title,
                    'probability': pred.probability,
                    'trend': pred.trend
                })
        
        high_risk_predictions.sort(key=lambda x: x['probability'], reverse=True)
        
        # Get recent events
        recent_events = TimelineEvent.objects.select_related('loan')[:5]
        recent_events_data = [
            {
                'id': event.id,
                'type': event.type,
                'date': event.date,
                'title': event.title,
                'description': event.description,
                'loanId': event.loan.id,
                'borrower': event.loan.borrower
            }
            for event in recent_events
        ]
        
        return Response({
            'totalLoans': total_loans,
            'totalCovenants': total_covenants,
            'atRiskCovenants': at_risk_covenants,
            'breachedCovenants': breached_covenants,
            'avgScore': avg_score,
            'highRiskPredictions': high_risk_predictions[:3],
            'recentEvents': recent_events_data
        })


# ============================================
# COVENANT VIEWS
# ============================================

class CovenantViewSet(viewsets.ModelViewSet):
    """ViewSet for Covenant CRUD operations."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Covenant.objects.select_related('loan')
        
        # Filter by loan if provided
        loan_id = self.request.query_params.get('loan_id')
        if loan_id:
            queryset = queryset.filter(loan_id=loan_id)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CovenantWriteSerializer
        return CovenantSerializer
    
    def create(self, request, *args, **kwargs):
        loan_id = request.data.get('loan_id')
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
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        covenant = serializer.save(loan=loan)
        
        # Create timeline event
        TimelineEvent.objects.create(
            loan=loan,
            type=TimelineEvent.EventType.COVENANT_ADDED,
            date=date.today(),
            title='Covenant Added',
            description=f"New {covenant.type} covenant \"{covenant.title}\" added to monitoring. Threshold: {covenant.threshold or 'N/A'}.",
            related_covenant=covenant
        )
        
        return Response(
            CovenantSerializer(covenant).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update covenant status with timeline event logging."""
        covenant = self.get_object()
        old_status = covenant.status
        
        new_status = request.data.get('status')
        current_value = request.data.get('value')
        waiver_reason = request.data.get('waiver_reason')
        
        if new_status:
            covenant.status = new_status
        if current_value:
            covenant.value = current_value
        
        if new_status == Covenant.ComplianceStatus.WAIVED:
            covenant.waiver_reason = waiver_reason
            covenant.waiver_date = date.today()
            covenant.waiver_approved_by = request.user.get_full_name() or request.user.username
        elif old_status == Covenant.ComplianceStatus.WAIVED and new_status != Covenant.ComplianceStatus.WAIVED:
            covenant.waiver_reason = None
            covenant.waiver_date = None
            covenant.waiver_approved_by = None
        
        covenant.save()
        
        # Create timeline event for status change
        if old_status != new_status:
            if new_status == Covenant.ComplianceStatus.WAIVED:
                TimelineEvent.objects.create(
                    loan=covenant.loan,
                    type=TimelineEvent.EventType.WAIVER_GRANTED,
                    date=date.today(),
                    title='Waiver Granted',
                    description=f"Waiver granted for \"{covenant.title}\" covenant. Reason: {waiver_reason or 'Not specified'}. Approved by {covenant.waiver_approved_by}.",
                    related_covenant=covenant
                )
            else:
                TimelineEvent.objects.create(
                    loan=covenant.loan,
                    type=TimelineEvent.EventType.STATUS_CHANGED,
                    date=date.today(),
                    title=f'{covenant.title} Status Changed',
                    description=f"Covenant status changed from {old_status} to {new_status}. {f'Current value: {current_value}.' if current_value else ''}",
                    related_covenant=covenant
                )
        
        # Recalculate loan compliance score
        self._recalculate_compliance_score(covenant.loan)
        
        return Response(CovenantSerializer(covenant).data)
    
    def _recalculate_compliance_score(self, loan):
        """Recalculate the compliance score for a loan."""
        covenants = loan.covenants.all()
        total = covenants.count()
        
        if total == 0:
            loan.compliance_score = 100
        else:
            compliant = covenants.filter(
                status__in=[
                    Covenant.ComplianceStatus.COMPLIANT,
                    Covenant.ComplianceStatus.WAIVED,
                    Covenant.ComplianceStatus.UPCOMING
                ]
            ).count()
            loan.compliance_score = round((compliant / total) * 100)
        
        loan.save()


# ============================================
# TIMELINE EVENT VIEWS
# ============================================

class TimelineEventViewSet(viewsets.ModelViewSet):
    """ViewSet for Timeline Event CRUD operations."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = TimelineEvent.objects.select_related('loan', 'related_covenant')
        
        loan_id = self.request.query_params.get('loan_id')
        if loan_id:
            queryset = queryset.filter(loan_id=loan_id)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TimelineEventWriteSerializer
        return TimelineEventSerializer
    
    def create(self, request, *args, **kwargs):
        loan_id = request.data.get('loan_id')
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
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(loan=loan)
        
        return Response(
            TimelineEventSerializer(event).data,
            status=status.HTTP_201_CREATED
        )


# ============================================
# RISK PREDICTION VIEWS
# ============================================

class RiskPredictionViewSet(viewsets.ModelViewSet):
    """ViewSet for Risk Prediction CRUD operations."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = RiskPrediction.objects.select_related('loan', 'covenant')
        
        loan_id = self.request.query_params.get('loan_id')
        if loan_id:
            queryset = queryset.filter(loan_id=loan_id)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RiskPredictionWriteSerializer
        return RiskPredictionSerializer


# ============================================
# LOAN DNA VIEWS
# ============================================

class LoanDNAViewSet(viewsets.ModelViewSet):
    """ViewSet for Loan DNA CRUD operations."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LoanDNA.objects.prefetch_related('extracted_covenants').select_related('loan')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LoanDNAWriteSerializer
        return LoanDNASerializer
    
    def create(self, request, *args, **kwargs):
        loan_id = request.data.get('loan_id')
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
        
        # Check if loan already has DNA
        if hasattr(loan, 'loan_dna'):
            return Response(
                {'error': 'Loan already has DNA extracted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        loan_dna = serializer.save(loan=loan)
        
        return Response(
            LoanDNASerializer(loan_dna).data,
            status=status.HTTP_201_CREATED
        )


# ============================================
# DOCUMENT UPLOAD VIEWS
# ============================================

class DocumentUploadView(generics.CreateAPIView):
    """View for uploading documents to a loan."""
    serializer_class = UploadedDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        loan_id = request.data.get('loan_id')
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
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document = UploadedDocument.objects.create(
            loan=loan,
            filename=file.name,
            file=file
        )
        
        # Create timeline event
        TimelineEvent.objects.create(
            loan=loan,
            type=TimelineEvent.EventType.DOCUMENT_UPLOADED,
            date=date.today(),
            title='Document Uploaded',
            description=f'Document "{file.name}" uploaded to loan facility.'
        )
        
        return Response(
            UploadedDocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )


class LoanDocumentsView(generics.ListAPIView):
    """View for listing documents for a specific loan."""
    serializer_class = UploadedDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        loan_id = self.kwargs.get('loan_id')
        return UploadedDocument.objects.filter(loan_id=loan_id)
