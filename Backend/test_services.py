"""
Test script for OCR Space and Groq AI services.
Run this from the Backend directory: python test_services.py
"""

import os
import sys
import django

# Setup Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.services import GroqAIService, OCRSpaceService


def test_groq_service():
    """Test the Groq AI service."""
    print("\n" + "="*50)
    print("Testing Groq AI Service")
    print("="*50)
    
    try:
        groq = GroqAIService()
        print(f"✓ Groq service initialized")
        print(f"  Model: {groq.model_name}")
        print(f"  Temperature: {groq.temperature}")
        
        # Test simple chat
        response = groq.chat("What is a financial covenant in 2 sentences?")
        print(f"\n✓ Chat test successful:")
        print(f"  Response: {response[:200]}...")
        
        # Test document analysis
        sample_text = """
        LOAN AGREEMENT
        
        The borrower shall maintain a Debt-to-EBITDA ratio of not more than 4.0x.
        Quarterly financial statements must be delivered within 45 days of quarter end.
        The borrower shall not incur additional indebtedness exceeding $10 million.
        """
        
        analysis = groq.analyze_document(sample_text, analysis_type="covenant")
        print(f"\n✓ Document analysis test successful:")
        print(f"  Analysis type: {analysis['analysis_type']}")
        print(f"  Content preview: {analysis['content'][:200]}...")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Groq service test failed: {str(e)}")
        return False


def test_ocr_service():
    """Test the OCR Space service (requires valid API key)."""
    print("\n" + "="*50)
    print("Testing OCR Space Service")
    print("="*50)
    
    try:
        ocr = OCRSpaceService()
        print(f"✓ OCR service initialized")
        print(f"  API Key: {ocr.api_key[:10]}...")
        
        # Note: Actual OCR test requires a file
        print(f"\n✓ OCR service ready for use")
        print(f"  Available methods:")
        print(f"    - extract_text_from_file(file_path)")
        print(f"    - extract_text_from_bytes(file_content, filename)")
        print(f"    - extract_text_from_url(url)")
        
        return True
        
    except ValueError as e:
        print(f"\n⚠ OCR service not configured: {str(e)}")
        print(f"  Get a free API key at https://ocr.space/ocrapi")
        return False
    except Exception as e:
        print(f"\n✗ OCR service test failed: {str(e)}")
        return False


if __name__ == "__main__":
    print("\n" + "#"*50)
    print("# AI & OCR Services Test")
    print("#"*50)
    
    groq_ok = test_groq_service()
    ocr_ok = test_ocr_service()
    
    print("\n" + "="*50)
    print("Test Summary")
    print("="*50)
    print(f"Groq AI Service: {'✓ PASSED' if groq_ok else '✗ FAILED'}")
    print(f"OCR Space Service: {'✓ PASSED' if ocr_ok else '⚠ NEEDS CONFIG'}")
    print("")
