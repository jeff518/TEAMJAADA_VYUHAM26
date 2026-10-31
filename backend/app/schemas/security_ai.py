"""Standardized Security AI Pydantic schema for Gate 2 inspection (DocuPilot AI)."""

import enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SecurityAIStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    SUSPICIOUS = "SUSPICIOUS"


class SecurityRiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SecurityAIResult(BaseModel):
    """Standardized Security AI scan output as defined in DocuPilot AI Master Architecture."""
    status: SecurityAIStatus = Field(..., description="Overall Gate 2 status: PASS, FAIL, or SUSPICIOUS")
    risk_level: SecurityRiskLevel = Field(..., description="Calculated risk level: LOW, MEDIUM, HIGH, or CRITICAL")
    prompt_injection_detected: bool = Field(False, description="True if any prompt injection triggers were detected")
    suspicious_instructions_detected: bool = Field(False, description="True if adversarial/system override instructions found")
    confidential_data_risk: bool = Field(False, description="True if potential exfiltration or social engineering identified")
    findings: List[str] = Field(default_factory=list, description="List of specific security observations or threat indicators")
    reason: str = Field(..., description="Summary explanation for the decision")
    risk_score: int = Field(0, description="Risk score between 0 and 100")
    pattern_matches: List[str] = Field(default_factory=list, description="Regex pattern matches found")
    unicode_anomalies: List[str] = Field(default_factory=list, description="Suspicious unicode or hidden characters")
    base64_payloads: List[str] = Field(default_factory=list, description="Detected base64 payloads")
    ai_raw_analysis: Optional[Dict[str, Any]] = Field(None, description="Raw response from LLM security analyst if called")
