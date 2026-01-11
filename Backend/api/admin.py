from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Loan, Covenant, TimelineEvent, RiskPrediction,
    LoanDNA, ExtractedCovenant, UploadedDocument
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin."""
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_staff']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'role', 'department']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'department')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('role', 'department')}),
    )


class CovenantInline(admin.TabularInline):
    model = Covenant
    extra = 0
    fields = ['id', 'title', 'type', 'status', 'due_date', 'threshold', 'value']
    readonly_fields = ['id']


class TimelineEventInline(admin.TabularInline):
    model = TimelineEvent
    extra = 0
    fields = ['id', 'type', 'date', 'title']
    readonly_fields = ['id']


class UploadedDocumentInline(admin.TabularInline):
    model = UploadedDocument
    extra = 0
    fields = ['id', 'filename', 'uploaded_at']
    readonly_fields = ['id', 'uploaded_at']


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    """Loan admin with inlines."""
    list_display = ['id', 'borrower', 'amount', 'currency', 'status', 'compliance_score', 'maturity_date']
    list_filter = ['status', 'currency']
    search_fields = ['id', 'borrower']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [CovenantInline, TimelineEventInline, UploadedDocumentInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'borrower', 'amount', 'currency', 'interest_rate')
        }),
        ('Dates', {
            'fields': ('start_date', 'maturity_date')
        }),
        ('Status', {
            'fields': ('status', 'compliance_score', 'risk_summary')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Covenant)
class CovenantAdmin(admin.ModelAdmin):
    """Covenant admin."""
    list_display = ['id', 'title', 'loan', 'type', 'status', 'due_date']
    list_filter = ['type', 'status']
    search_fields = ['id', 'title', 'loan__borrower']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'loan', 'title', 'type', 'description')
        }),
        ('Compliance', {
            'fields': ('status', 'due_date', 'threshold', 'value', 'frequency')
        }),
        ('Waiver Information', {
            'fields': ('waiver_reason', 'waiver_date', 'waiver_approved_by'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TimelineEvent)
class TimelineEventAdmin(admin.ModelAdmin):
    """Timeline Event admin."""
    list_display = ['id', 'title', 'loan', 'type', 'date']
    list_filter = ['type', 'date']
    search_fields = ['id', 'title', 'loan__borrower']
    readonly_fields = ['id', 'created_at']


@admin.register(RiskPrediction)
class RiskPredictionAdmin(admin.ModelAdmin):
    """Risk Prediction admin."""
    list_display = ['id', 'covenant', 'loan', 'probability', 'trend', 'created_at']
    list_filter = ['trend', 'probability']
    search_fields = ['covenant__title', 'loan__borrower']
    readonly_fields = ['id', 'created_at', 'updated_at']


class ExtractedCovenantInline(admin.TabularInline):
    model = ExtractedCovenant
    extra = 0
    fields = ['title', 'type', 'threshold', 'frequency']


@admin.register(LoanDNA)
class LoanDNAAdmin(admin.ModelAdmin):
    """Loan DNA admin."""
    list_display = ['id', 'loan', 'confidence', 'extracted_at', 'source_document']
    search_fields = ['loan__borrower', 'source_document']
    readonly_fields = ['id', 'created_at']
    inlines = [ExtractedCovenantInline]


@admin.register(ExtractedCovenant)
class ExtractedCovenantAdmin(admin.ModelAdmin):
    """Extracted Covenant admin."""
    list_display = ['id', 'title', 'loan_dna', 'type', 'threshold']
    list_filter = ['type']
    search_fields = ['title', 'loan_dna__loan__borrower']


@admin.register(UploadedDocument)
class UploadedDocumentAdmin(admin.ModelAdmin):
    """Uploaded Document admin."""
    list_display = ['id', 'filename', 'loan', 'uploaded_at']
    search_fields = ['filename', 'loan__borrower']
    readonly_fields = ['id', 'uploaded_at']
