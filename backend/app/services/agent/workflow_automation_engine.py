"""Stage 4d: Workflow Automation Engine.
Evaluates configurable rules from workflows.json based on:
- Security gate status
- Validation pass/warn/fail outcomes
- Inconsistency severity flags
- Extraction confidence thresholds
- Document type routing
Returns decision ("auto_approved", "needs_review", "escalate", "blocked"), reason, and next_action.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("securedoc.agent.workflow")

CONFIG_PATH = Path(__file__).parent / "workflows.json"


class WorkflowAutomationEngine:
    """Executes rule-based workflow automation decisions from external configuration."""

    @classmethod
    def load_config(cls) -> Dict[str, Any]:
        """Load workflow configuration from JSON."""
        if not CONFIG_PATH.exists():
            logger.warning("workflows.json not found at %s, using defaults.", CONFIG_PATH)
            return {"min_confidence_threshold": 0.80, "workflows": {}}
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Failed to parse workflows.json: %s", e)
            return {"min_confidence_threshold": 0.80, "workflows": {}}

    @classmethod
    def evaluate(
        cls,
        doc_type: str,
        security_status: str,
        validation_results: List[Dict[str, Any]],
        inconsistencies: List[Dict[str, Any]],
        extracted_fields: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Determine workflow routing, decision, rationale, and next action."""
        config = cls.load_config()
        min_threshold = float(config.get("min_confidence_threshold", 0.80))
        workflows = config.get("workflows", {})

        # Select workflow for doc_type or fallback to default
        wf_config = workflows.get(doc_type) or workflows.get("default", {})
        department = wf_config.get("department", "Document Processing Center")
        routing_code = wf_config.get("routing_code", f"WF-{doc_type.upper()[:10]}")
        rules = wf_config.get("rules", [])

        # Calculate metrics
        has_sec_failed = security_status.lower() in ("blocked", "failed", "quarantine", "quarantined")
        has_high_inconsistency = any(i.get("severity") == "high" for i in inconsistencies)
        has_med_inconsistency = any(i.get("severity") == "medium" for i in inconsistencies)
        has_val_failures = any(v.get("status") == "fail" for v in validation_results)
        has_val_warnings = any(v.get("status") == "warn" for v in validation_results)

        # Compute average extraction confidence
        fields = extracted_fields.get("fields", {})
        conf_scores = [
            float(f.get("confidence", 0.0))
            for f in fields.values()
            if isinstance(f, dict) and f.get("value") is not None
        ]
        avg_confidence = (sum(conf_scores) / len(conf_scores)) if conf_scores else 0.85
        is_low_confidence = avg_confidence < min_threshold

        # Evaluate rules in sequence
        for rule in rules:
            cond = rule.get("condition")
            if cond == "security_failed" and has_sec_failed:
                return {
                    "decision": rule.get("decision", "blocked"),
                    "reason": rule.get("reason"),
                    "next_action": rule.get("next_action"),
                    "routing_code": routing_code,
                    "department": department,
                    "average_confidence": round(avg_confidence, 2),
                    "confidence_met": False,
                }
            if cond == "high_severity_inconsistency" and (has_high_inconsistency or has_med_inconsistency):
                return {
                    "decision": rule.get("decision", "escalate"),
                    "reason": rule.get("reason"),
                    "next_action": rule.get("next_action"),
                    "routing_code": routing_code,
                    "department": department,
                    "average_confidence": round(avg_confidence, 2),
                    "confidence_met": not is_low_confidence,
                }
            if cond == "has_validation_failures" and has_val_failures:
                return {
                    "decision": rule.get("decision", "escalate"),
                    "reason": rule.get("reason"),
                    "next_action": rule.get("next_action"),
                    "routing_code": routing_code,
                    "department": department,
                    "average_confidence": round(avg_confidence, 2),
                    "confidence_met": not is_low_confidence,
                }
            if cond == "low_confidence" and is_low_confidence:
                return {
                    "decision": rule.get("decision", "needs_review"),
                    "reason": rule.get("reason"),
                    "next_action": rule.get("next_action"),
                    "routing_code": routing_code,
                    "department": department,
                    "average_confidence": round(avg_confidence, 2),
                    "confidence_met": False,
                }
            if cond == "has_validation_warnings" and has_val_warnings:
                return {
                    "decision": rule.get("decision", "needs_review"),
                    "reason": rule.get("reason"),
                    "next_action": rule.get("next_action"),
                    "routing_code": routing_code,
                    "department": department,
                    "average_confidence": round(avg_confidence, 2),
                    "confidence_met": not is_low_confidence,
                }
            if cond == "all_checks_passed" and not (has_sec_failed or has_high_inconsistency or has_val_failures or has_val_warnings or is_low_confidence):
                return {
                    "decision": rule.get("decision", "auto_approved"),
                    "reason": rule.get("reason"),
                    "next_action": rule.get("next_action"),
                    "routing_code": routing_code,
                    "department": department,
                    "average_confidence": round(avg_confidence, 2),
                    "confidence_met": True,
                }

        # Fallback decision
        return {
            "decision": "needs_review",
            "reason": "Default routing: document placed in general human review queue.",
            "next_action": "Assign to human reviewer queue for validation confirmation",
            "routing_code": routing_code,
            "department": department,
            "average_confidence": round(avg_confidence, 2),
            "confidence_met": not is_low_confidence,
        }
