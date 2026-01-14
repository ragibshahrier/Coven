import requests
import base64
from typing import Optional, Dict, Any
from django.conf import settings


class OCRSpaceService:
    """
    Service for extracting text from PDFs and images using OCR.space API.
    
    OCR.space provides free OCR API with support for:
    - PDF files
    - Image files (PNG, JPG, GIF, BMP)
    - URLs to documents
    """
    
    API_URL = "https://api.ocr.space/parse/image"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize OCR.space service.
        
        Args:
            api_key: OCR.space API key. If not provided, uses settings.OCRSPACE_API_KEY
        """
        self.api_key = api_key or getattr(settings, 'OCRSPACE_API_KEY', None)
        if not self.api_key:
            raise ValueError("OCR.space API key is required. Set OCRSPACE_API_KEY in settings.")
    
    def extract_text_from_file(
        self,
        file_path: str,
        language: str = "eng",
        is_pdf: bool = True,
        ocr_engine: int = 2
    ) -> Dict[str, Any]:
        """
        Extract text from a local file (PDF or image).
        
        Args:
            file_path: Path to the file
            language: OCR language (default: English)
            is_pdf: Whether the file is a PDF
            ocr_engine: OCR engine to use (1, 2, or 3)
                - Engine 1: Faster, good for simple documents
                - Engine 2: Better for complex layouts (recommended for PDFs)
                - Engine 3: For Asian languages
        
        Returns:
            Dict containing extracted text and metadata
        """
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        return self._process_file(
            file_content=file_content,
            filename=file_path.split('/')[-1].split('\\')[-1],
            language=language,
            is_pdf=is_pdf,
            ocr_engine=ocr_engine
        )
    
    def extract_text_from_bytes(
        self,
        file_content: bytes,
        filename: str,
        language: str = "eng",
        is_pdf: bool = True,
        ocr_engine: int = 2
    ) -> Dict[str, Any]:
        """
        Extract text from file bytes (for uploaded files).
        
        Args:
            file_content: Raw bytes of the file
            filename: Original filename
            language: OCR language (default: English)
            is_pdf: Whether the file is a PDF
            ocr_engine: OCR engine to use
        
        Returns:
            Dict containing extracted text and metadata
        """
        return self._process_file(
            file_content=file_content,
            filename=filename,
            language=language,
            is_pdf=is_pdf,
            ocr_engine=ocr_engine
        )
    
    def extract_text_from_url(
        self,
        url: str,
        language: str = "eng",
        is_pdf: bool = True,
        ocr_engine: int = 2
    ) -> Dict[str, Any]:
        """
        Extract text from a URL pointing to a PDF or image.
        
        Args:
            url: URL of the document
            language: OCR language
            is_pdf: Whether the file is a PDF
            ocr_engine: OCR engine to use
        
        Returns:
            Dict containing extracted text and metadata
        """
        payload = {
            'apikey': self.api_key,
            'url': url,
            'language': language,
            'isOverlayRequired': False,
            'OCREngine': ocr_engine,
            'isTable': True,  # Better table recognition
            'scale': True,    # Upscale small images
        }
        
        if is_pdf:
            payload['filetype'] = 'PDF'
        
        return self._make_request(payload)
    
    def _process_file(
        self,
        file_content: bytes,
        filename: str,
        language: str,
        is_pdf: bool,
        ocr_engine: int
    ) -> Dict[str, Any]:
        """
        Internal method to process file content.
        """
        # Encode file to base64
        base64_content = base64.b64encode(file_content).decode('utf-8')
        
        # Determine file type
        if is_pdf or filename.lower().endswith('.pdf'):
            file_type = 'PDF'
            base64_prefix = 'data:application/pdf;base64,'
        elif filename.lower().endswith('.png'):
            file_type = 'PNG'
            base64_prefix = 'data:image/png;base64,'
        elif filename.lower().endswith(('.jpg', '.jpeg')):
            file_type = 'JPG'
            base64_prefix = 'data:image/jpeg;base64,'
        else:
            file_type = 'PDF'  # Default to PDF
            base64_prefix = 'data:application/pdf;base64,'
        
        payload = {
            'apikey': self.api_key,
            'base64Image': base64_prefix + base64_content,
            'language': language,
            'isOverlayRequired': False,
            'OCREngine': ocr_engine,
            'filetype': file_type,
            'isTable': True,
            'scale': True,
        }
        
        return self._make_request(payload)
    
    def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make request to OCR.space API and process response.
        """
        try:
            response = requests.post(
                self.API_URL,
                data=payload,
                timeout=120  # PDF processing can take time
            )
            response.raise_for_status()
            result = response.json()
            
            if result.get('IsErroredOnProcessing', False):
                error_message = result.get('ErrorMessage', ['Unknown error'])
                if isinstance(error_message, list):
                    error_message = '; '.join(error_message)
                return {
                    'success': False,
                    'error': error_message,
                    'text': None,
                    'pages': []
                }
            
            # Extract text from all pages
            parsed_results = result.get('ParsedResults', [])
            pages = []
            full_text = []
            
            for i, page_result in enumerate(parsed_results):
                page_text = page_result.get('ParsedText', '')
                pages.append({
                    'page_number': i + 1,
                    'text': page_text,
                    'exit_code': page_result.get('FileParseExitCode', -1)
                })
                full_text.append(page_text)
            
            return {
                'success': True,
                'text': '\n\n'.join(full_text),
                'pages': pages,
                'processing_time': result.get('ProcessingTimeInMilliseconds', 0),
                'search_engine': result.get('SearchablePDFURL', None)
            }
            
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'OCR processing timed out. Try with a smaller document.',
                'text': None,
                'pages': []
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Request failed: {str(e)}',
                'text': None,
                'pages': []
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'text': None,
                'pages': []
            }
