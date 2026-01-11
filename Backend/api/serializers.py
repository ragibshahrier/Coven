from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import (
    Loan, Covenant, TimelineEvent, RiskPrediction, 
    LoanDNA, ExtractedCovenant, UploadedDocument
)

User = get_user_model()


# ============================================
# USER SERIALIZERS
# ============================================

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'department', 'username']
        read_only_fields = ['id']
    
    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'department'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields don't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'role', 'department']


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


# ============================================
# EXTRACTED COVENANT SERIALIZER
# ============================================

class ExtractedCovenantSerializer(serializers.ModelSerializer):
    """Serializer for covenants extracted from documents."""
    
    class Meta:
        model = ExtractedCovenant
        fields = ['title', 'type', 'threshold', 'frequency', 'description']


# ============================================
# LOAN DNA SERIALIZER
# ============================================

class LoanDNASerializer(serializers.ModelSerializer):
    """Serializer for Loan DNA (AI-extracted document data)."""
    extracted_covenants = ExtractedCovenantSerializer(many=True, read_only=True)
    key_terms = serializers.SerializerMethodField()
    extractedAt = serializers.DateField(source='extracted_at')
    sourceDocument = serializers.CharField(source='source_document')
    riskFactors = serializers.JSONField(source='risk_factors')
    extractedCovenants = ExtractedCovenantSerializer(
        source='extracted_covenants', 
        many=True, 
        read_only=True
    )
    
    class Meta:
        model = LoanDNA
        fields = [
            'extractedAt', 'sourceDocument', 'confidence', 'summary',
            'key_terms', 'extractedCovenants', 'riskFactors',
            # Keep snake_case versions for write operations
            'extracted_covenants'
        ]
    
    def get_key_terms(self, obj):
        return {
            'facilityType': obj.facility_type,
            'purpose': obj.purpose,
            'securityType': obj.security_type,
            'governingLaw': obj.governing_law,
        }


class LoanDNAWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating Loan DNA."""
    key_terms = serializers.DictField(write_only=True, required=False)
    extracted_covenants_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = LoanDNA
        fields = [
            'extracted_at', 'source_document', 'confidence', 'summary',
            'facility_type', 'purpose', 'security_type', 'governing_law',
            'risk_factors', 'key_terms', 'extracted_covenants_data'
        ]
    
    def create(self, validated_data):
        key_terms = validated_data.pop('key_terms', None)
        extracted_covenants_data = validated_data.pop('extracted_covenants_data', [])
        
        if key_terms:
            validated_data['facility_type'] = key_terms.get('facilityType', '')
            validated_data['purpose'] = key_terms.get('purpose', '')
            validated_data['security_type'] = key_terms.get('securityType', '')
            validated_data['governing_law'] = key_terms.get('governingLaw', '')
        
        loan_dna = LoanDNA.objects.create(**validated_data)
        
        for cov_data in extracted_covenants_data:
            ExtractedCovenant.objects.create(loan_dna=loan_dna, **cov_data)
        
        return loan_dna


# ============================================
# RISK PREDICTION SERIALIZER
# ============================================

class RiskPredictionSerializer(serializers.ModelSerializer):
    """Serializer for risk predictions."""
    covenantId = serializers.CharField(source='covenant.id', read_only=True)
    covenantTitle = serializers.CharField(source='covenant.title', read_only=True)
    currentValue = serializers.CharField(source='current_value')
    predictedBreachDate = serializers.CharField(source='predicted_breach_date')
    
    class Meta:
        model = RiskPrediction
        fields = [
            'covenantId', 'covenantTitle', 'currentValue', 'threshold',
            'predictedBreachDate', 'probability', 'trend', 'explanation'
        ]


class RiskPredictionWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating risk predictions."""
    covenant_id = serializers.CharField(write_only=True)
    
    class Meta:
        model = RiskPrediction
        fields = [
            'covenant_id', 'current_value', 'threshold',
            'predicted_breach_date', 'probability', 'trend', 'explanation'
        ]
    
    def create(self, validated_data):
        covenant_id = validated_data.pop('covenant_id')
        covenant = Covenant.objects.get(id=covenant_id)
        validated_data['covenant'] = covenant
        validated_data['loan'] = covenant.loan
        return RiskPrediction.objects.create(**validated_data)


# ============================================
# TIMELINE EVENT SERIALIZER
# ============================================

class TimelineEventSerializer(serializers.ModelSerializer):
    """Serializer for timeline events."""
    relatedCovenantId = serializers.CharField(
        source='related_covenant.id', 
        allow_null=True, 
        read_only=True
    )
    
    class Meta:
        model = TimelineEvent
        fields = [
            'id', 'type', 'date', 'title', 'description',
            'relatedCovenantId', 'metadata'
        ]


class TimelineEventWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating timeline events."""
    related_covenant_id = serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = TimelineEvent
        fields = [
            'type', 'date', 'title', 'description',
            'related_covenant_id', 'metadata'
        ]
    
    def create(self, validated_data):
        related_covenant_id = validated_data.pop('related_covenant_id', None)
        if related_covenant_id:
            validated_data['related_covenant'] = Covenant.objects.get(
                id=related_covenant_id
            )
        return TimelineEvent.objects.create(**validated_data)


# ============================================
# COVENANT SERIALIZER
# ============================================

class CovenantSerializer(serializers.ModelSerializer):
    """Serializer for covenants - matches frontend format."""
    dueDate = serializers.DateField(source='due_date')
    waiverReason = serializers.CharField(
        source='waiver_reason', 
        allow_null=True, 
        required=False
    )
    waiverDate = serializers.DateField(
        source='waiver_date', 
        allow_null=True, 
        required=False
    )
    waiverApprovedBy = serializers.CharField(
        source='waiver_approved_by', 
        allow_null=True, 
        required=False
    )
    
    class Meta:
        model = Covenant
        fields = [
            'id', 'title', 'type', 'dueDate', 'status', 'value',
            'threshold', 'description', 'frequency',
            'waiverReason', 'waiverDate', 'waiverApprovedBy'
        ]
        read_only_fields = ['id']


class CovenantWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating covenants."""
    
    class Meta:
        model = Covenant
        fields = [
            'title', 'type', 'due_date', 'status', 'value',
            'threshold', 'description', 'frequency',
            'waiver_reason', 'waiver_date', 'waiver_approved_by'
        ]


# ============================================
# UPLOADED DOCUMENT SERIALIZER
# ============================================

class UploadedDocumentSerializer(serializers.ModelSerializer):
    """Serializer for uploaded documents."""
    
    class Meta:
        model = UploadedDocument
        fields = ['id', 'filename', 'file', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


# ============================================
# LOAN SERIALIZERS
# ============================================

class LoanListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for loan list views."""
    interestRate = serializers.DecimalField(
        source='interest_rate', 
        max_digits=5, 
        decimal_places=2
    )
    startDate = serializers.DateField(source='start_date')
    maturityDate = serializers.DateField(source='maturity_date')
    complianceScore = serializers.IntegerField(source='compliance_score')
    covenants_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Loan
        fields = [
            'id', 'borrower', 'amount', 'currency', 'interestRate',
            'startDate', 'maturityDate', 'status', 'complianceScore',
            'covenants_count'
        ]
    
    def get_covenants_count(self, obj):
        return obj.covenants.count()


class LoanDetailSerializer(serializers.ModelSerializer):
    """Full serializer for loan detail views - matches frontend format."""
    interestRate = serializers.DecimalField(
        source='interest_rate', 
        max_digits=5, 
        decimal_places=2
    )
    startDate = serializers.DateField(source='start_date')
    maturityDate = serializers.DateField(source='maturity_date')
    complianceScore = serializers.IntegerField(source='compliance_score')
    riskSummary = serializers.CharField(
        source='risk_summary', 
        allow_null=True, 
        required=False
    )
    covenants = CovenantSerializer(many=True, read_only=True)
    timelineEvents = TimelineEventSerializer(
        source='timeline_events', 
        many=True, 
        read_only=True
    )
    loanDNA = LoanDNASerializer(source='loan_dna', read_only=True)
    riskPredictions = RiskPredictionSerializer(
        source='risk_predictions', 
        many=True, 
        read_only=True
    )
    uploadedDocuments = serializers.SerializerMethodField()
    
    class Meta:
        model = Loan
        fields = [
            'id', 'borrower', 'amount', 'currency', 'interestRate',
            'startDate', 'maturityDate', 'status', 'complianceScore',
            'covenants', 'riskSummary', 'timelineEvents', 'loanDNA',
            'riskPredictions', 'uploadedDocuments'
        ]
    
    def get_uploadedDocuments(self, obj):
        return list(obj.uploaded_documents.values_list('filename', flat=True))


class LoanWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating loans."""
    
    class Meta:
        model = Loan
        fields = [
            'borrower', 'amount', 'currency', 'interest_rate',
            'start_date', 'maturity_date', 'status', 'compliance_score',
            'risk_summary'
        ]
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)
