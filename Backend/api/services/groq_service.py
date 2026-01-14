from typing import Optional, List, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from django.conf import settings


class GroqAIService:
    """
    Service for interacting with Groq AI using LangChain.
    
    Provides methods for:
    - General chat completions
    - Covenant breach detection from documents
    - PDF content analysis
    - Structured data extraction
    """
    
    # Available Groq models (updated Jan 2026)
    MODELS = {
        'llama3-70b': 'llama-3.3-70b-versatile',
        'llama3-8b': 'llama-3.1-8b-instant',
        'mixtral': 'mixtral-8x7b-32768',
        'gemma': 'gemma2-9b-it',
    }
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = 'llama3-70b',
        temperature: float = 0.2
    ):
        """
        Initialize Groq AI service.
        
        Args:
            api_key: Groq API key. If not provided, uses settings.GROQ_API_KEY
            model: Model to use (llama3-70b, llama3-8b, mixtral, gemma)
            temperature: Temperature for generation (0.0 - 1.0)
        """
        self.api_key = api_key or getattr(settings, 'GROQ_API_KEY', None)
        if not self.api_key:
            raise ValueError("Groq API key is required. Set GROQ_API_KEY in settings.")
        
        self.model_name = self.MODELS.get(model, model)
        self.temperature = temperature
        self._llm = None
    
    @property
    def llm(self) -> ChatGroq:
        """Lazy initialization of the LLM."""
        if self._llm is None:
            self._llm = ChatGroq(
                model=self.model_name,
                temperature=self.temperature,
                max_retries=2,
                groq_api_key=self.api_key
            )
        return self._llm
    
    def chat(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Simple chat completion.
        
        Args:
            message: User message
            system_prompt: Optional system prompt
            history: Optional chat history [{"role": "user/assistant", "content": "..."}]
        
        Returns:
            AI response as string
        """
        messages = []
        
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        
        if history:
            for msg in history:
                if msg['role'] == 'user':
                    messages.append(HumanMessage(content=msg['content']))
                elif msg['role'] == 'assistant':
                    messages.append(AIMessage(content=msg['content']))
        
        messages.append(HumanMessage(content=message))
        
        response = self.llm.invoke(messages)
        return response.content
    
    def analyze_document(
        self,
        document_text: str,
        analysis_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Analyze a document for specific content.
        
        Args:
            document_text: The extracted text from the document
            analysis_type: Type of analysis (general, covenant, financial)
        
        Returns:
            Analysis results as dictionary
        """
        prompts = {
            "general": """Analyze the following document and provide:
1. A brief summary
2. Key points and important dates
3. Any notable financial figures or metrics
4. Document type classification

Document:
{document_text}

Provide your analysis in a structured format.""",

            "covenant": """Analyze the following loan document and identify:
1. All covenant clauses (financial ratios, reporting requirements, restrictions)
2. Specific thresholds and limits mentioned
3. Due dates or frequencies for each covenant
4. Any cure periods or grace periods mentioned

Document:
{document_text}

Extract each covenant with its details.""",

            "financial": """Extract all financial information from this document:
1. Monetary amounts and currencies
2. Interest rates
3. Financial ratios and their thresholds
4. Payment schedules
5. Fees and penalties

Document:
{document_text}

List each item with its exact value and context."""
        }
        
        prompt = prompts.get(analysis_type, prompts["general"])
        formatted_prompt = prompt.format(document_text=document_text[:15000])  # Limit context
        
        response = self.chat(formatted_prompt)
        
        return {
            "analysis_type": analysis_type,
            "content": response
        }
    
    def detect_covenant_breaches(
        self,
        document_text: str,
        covenants: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Detect potential covenant breaches from document content.
        
        Args:
            document_text: Extracted text from financial statements or reports
            covenants: List of covenants to check against
                       Each covenant should have: title, type, threshold, description
        
        Returns:
            Breach assessment for each covenant
        """
        covenant_descriptions = "\n".join([
            f"- {c.get('title', 'Unknown')}: {c.get('description', '')} "
            f"(Threshold: {c.get('threshold', 'N/A')})"
            for c in covenants
        ])
        
        system_prompt = """You are a financial analyst expert in loan covenant compliance. 
Your task is to analyze financial documents and determine if any covenants may be breached.
Be thorough but avoid false positives. Only flag potential breaches when there's clear evidence."""
        
        user_prompt = f"""Analyze the following financial document against these covenants:

COVENANTS TO CHECK:
{covenant_descriptions}

DOCUMENT CONTENT:
{document_text[:12000]}

For each covenant, provide:
1. Covenant name
2. Status: COMPLIANT, AT_RISK, or BREACHED
3. Current value found in document (if applicable)
4. Threshold requirement
5. Brief explanation

Format your response as a list of covenant assessments."""
        
        response = self.chat(user_prompt, system_prompt=system_prompt)
        
        return {
            "raw_analysis": response,
            "covenants_checked": len(covenants),
            "document_length": len(document_text)
        }
    
    def extract_covenants_from_document(
        self,
        document_text: str
    ) -> Dict[str, Any]:
        """
        Extract covenant information from a loan agreement document.
        
        Args:
            document_text: Text of the loan agreement
        
        Returns:
            Structured covenant data
        """
        system_prompt = """You are an expert in parsing loan agreements and extracting covenant information.
Extract all covenants mentioned in the document with their specific requirements."""
        
        user_prompt = f"""Extract all covenants from this loan agreement:

DOCUMENT:
{document_text[:15000]}

For each covenant found, extract:
1. Title/Name of the covenant
2. Type (Financial, Reporting, Affirmative, Negative)
3. Description of the requirement
4. Threshold or limit (if applicable)
5. Frequency (quarterly, annually, etc.)
6. Due date or timing requirements

List all covenants you can identify."""
        
        response = self.chat(user_prompt, system_prompt=system_prompt)
        
        return {
            "extracted_covenants": response,
            "source_length": len(document_text)
        }
    
    def summarize_for_risk_assessment(
        self,
        document_text: str,
        loan_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a risk assessment summary from document content.
        
        Args:
            document_text: Extracted document text
            loan_context: Optional context about the loan
        
        Returns:
            Risk assessment summary
        """
        context_info = ""
        if loan_context:
            context_info = f"""
Loan Information:
- Borrower: {loan_context.get('borrower', 'Unknown')}
- Amount: {loan_context.get('amount', 'Unknown')}
- Current Status: {loan_context.get('status', 'Unknown')}
"""
        
        system_prompt = """You are a credit risk analyst. Analyze documents and provide 
concise risk assessments focusing on compliance, financial health, and potential issues."""
        
        user_prompt = f"""Analyze this document and provide a risk assessment:
{context_info}

DOCUMENT:
{document_text[:12000]}

Provide:
1. Overall Risk Level (Low/Medium/High)
2. Key Risk Factors identified
3. Compliance concerns
4. Recommended actions
5. Summary (2-3 sentences)"""
        
        response = self.chat(user_prompt, system_prompt=system_prompt)
        
        return {
            "risk_assessment": response,
            "has_loan_context": loan_context is not None
        }
    
    def get_model_info(self) -> Dict[str, str]:
        """Get information about the current model configuration."""
        return {
            "model": self.model_name,
            "temperature": self.temperature,
            "available_models": list(self.MODELS.keys())
        }
