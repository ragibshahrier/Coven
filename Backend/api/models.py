from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    """Custom User model with additional fields for the Coven platform."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    
    class Meta:
        db_table = 'users'
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.email})"


class Loan(models.Model):
    """Core loan facility model."""
    
    class LoanStatus(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        PENDING = 'Pending', 'Pending'
        CLOSED = 'Closed', 'Closed'

    id = models.CharField(max_length=50, primary_key=True)
    borrower = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2)
    start_date = models.DateField()
    maturity_date = models.DateField()
    status = models.CharField(
        max_length=20, 
        choices=LoanStatus.choices, 
        default=LoanStatus.ACTIVE
    )
    compliance_score = models.IntegerField(default=100)
    risk_summary = models.TextField(blank=True, null=True)
    
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='created_loans'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'loans'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.borrower} - {self.currency} {self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"ln_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class Covenant(models.Model):
    """Individual covenant tracking model."""
    
    class CovenantType(models.TextChoices):
        FINANCIAL = 'Financial', 'Financial'
        REPORTING = 'Reporting', 'Reporting'
        AFFIRMATIVE = 'Affirmative', 'Affirmative'
        NEGATIVE = 'Negative', 'Negative'

    class ComplianceStatus(models.TextChoices):
        COMPLIANT = 'Compliant', 'Compliant'
        AT_RISK = 'At Risk', 'At Risk'
        BREACHED = 'Breached', 'Breached'
        UPCOMING = 'Upcoming', 'Upcoming'
        WAIVED = 'Waived', 'Waived'

    id = models.CharField(max_length=50, primary_key=True)
    loan = models.ForeignKey(
        Loan, 
        on_delete=models.CASCADE, 
        related_name='covenants'
    )
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=CovenantType.choices)
    due_date = models.DateField()
    status = models.CharField(
        max_length=20, 
        choices=ComplianceStatus.choices, 
        default=ComplianceStatus.UPCOMING
    )
    value = models.CharField(max_length=100, blank=True, null=True)
    threshold = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField()
    frequency = models.CharField(max_length=50, blank=True, null=True)
    
    # Waiver fields
    waiver_reason = models.TextField(blank=True, null=True)
    waiver_date = models.DateField(blank=True, null=True)
    waiver_approved_by = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'covenants'
        ordering = ['due_date']

    def __str__(self):
        return f"{self.title} ({self.loan.borrower})"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"cov_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class TimelineEvent(models.Model):
    """Audit trail / activity log for loans."""
    
    class EventType(models.TextChoices):
        LOAN_CREATED = 'Loan Created', 'Loan Created'
        COVENANT_ADDED = 'Covenant Added', 'Covenant Added'
        STATUS_CHANGED = 'Status Changed', 'Status Changed'
        WAIVER_GRANTED = 'Waiver Granted', 'Waiver Granted'
        PAYMENT_RECEIVED = 'Payment Received', 'Payment Received'
        DOCUMENT_UPLOADED = 'Document Uploaded', 'Document Uploaded'
        RISK_ALERT = 'Risk Alert', 'Risk Alert'
        AMENDMENT_MADE = 'Amendment Made', 'Amendment Made'

    id = models.CharField(max_length=50, primary_key=True)
    loan = models.ForeignKey(
        Loan, 
        on_delete=models.CASCADE, 
        related_name='timeline_events'
    )
    type = models.CharField(max_length=50, choices=EventType.choices)
    date = models.DateField()
    title = models.CharField(max_length=255)
    description = models.TextField()
    related_covenant = models.ForeignKey(
        Covenant, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='timeline_events'
    )
    metadata = models.JSONField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'timeline_events'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.date}"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"evt_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class RiskPrediction(models.Model):
    """AI-generated breach warnings."""
    
    class TrendChoice(models.TextChoices):
        IMPROVING = 'improving', 'Improving'
        STABLE = 'stable', 'Stable'
        DETERIORATING = 'deteriorating', 'Deteriorating'

    id = models.CharField(max_length=50, primary_key=True)
    loan = models.ForeignKey(
        Loan, 
        on_delete=models.CASCADE, 
        related_name='risk_predictions'
    )
    covenant = models.ForeignKey(
        Covenant, 
        on_delete=models.CASCADE, 
        related_name='risk_predictions'
    )
    current_value = models.CharField(max_length=100)
    threshold = models.CharField(max_length=100, blank=True, null=True)
    predicted_breach_date = models.CharField(max_length=100, blank=True)
    probability = models.IntegerField()  # 0-100
    trend = models.CharField(max_length=20, choices=TrendChoice.choices)
    explanation = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_predictions'
        ordering = ['-probability']

    def __str__(self):
        return f"{self.covenant.title} - {self.probability}% risk"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"rp_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class LoanDNA(models.Model):
    """AI-extracted document analysis data."""
    
    id = models.CharField(max_length=50, primary_key=True)
    loan = models.OneToOneField(
        Loan, 
        on_delete=models.CASCADE, 
        related_name='loan_dna'
    )
    extracted_at = models.DateField()
    source_document = models.CharField(max_length=255)
    confidence = models.IntegerField()  # 0-100
    summary = models.TextField()
    
    # Key Terms
    facility_type = models.CharField(max_length=255)
    purpose = models.CharField(max_length=255)
    security_type = models.CharField(max_length=255)
    governing_law = models.CharField(max_length=100)
    
    # Risk factors as JSON array
    risk_factors = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'loan_dna'
        verbose_name = 'Loan DNA'
        verbose_name_plural = 'Loan DNAs'

    def __str__(self):
        return f"DNA for {self.loan.borrower}"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"dna_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class ExtractedCovenant(models.Model):
    """Covenants extracted from documents before being added to monitoring."""
    
    id = models.CharField(max_length=50, primary_key=True)
    loan_dna = models.ForeignKey(
        LoanDNA, 
        on_delete=models.CASCADE, 
        related_name='extracted_covenants'
    )
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20)
    threshold = models.CharField(max_length=100)
    frequency = models.CharField(max_length=50)
    description = models.TextField()

    class Meta:
        db_table = 'extracted_covenants'

    def __str__(self):
        return f"{self.title} (extracted)"
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"exc_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class UploadedDocument(models.Model):
    """Document file storage for loans."""
    
    id = models.CharField(max_length=50, primary_key=True)
    loan = models.ForeignKey(
        Loan, 
        on_delete=models.CASCADE, 
        related_name='uploaded_documents'
    )
    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='loan_documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'uploaded_documents'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.filename
    
    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"doc_{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)
