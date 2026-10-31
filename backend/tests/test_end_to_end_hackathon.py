"""End-to-End Test Suite for all Hackathon Stages and Demo Documents."""

import asyncio
from pathlib import Path
from app.services.pipeline_orchestrator import PipelineOrchestrator
from app.services.handoff_service import HandoffService


async def test_all_scenarios():
    HandoffService.clear_store()
    demo_dir = Path("A:/vy26/demo_test_files")

    test_cases = [
        ("doc-01-clean", "01_Clean_Invoice.txt", "auto_approved"),
        ("doc-02-wrong-total", "02_Invoice_Wrong_Total.txt", "escalate"),
        ("doc-03-missing-field", "03_Form_Missing_Required_Field.txt", "escalate"),
        ("doc-04a-batch", "04A_Batch_Student_Record.txt", "auto_approved"),
        ("doc-04b-batch-conflict", "04B_Batch_Conflicting_Student_Record.txt", "escalate"),
        ("doc-06-csv", "07_Department_Expense_Report.csv", "auto_approved"),
        ("doc-07-security-threat", "07_Security_Failure_Prompt_Injection.txt", "blocked"),
    ]

    print("\n=======================================================")
    print("RUNNING END-TO-END HACKATHON PIPELINE VERIFICATION")
    print("=======================================================\n")

    for doc_id, fname, expected_decision in test_cases:
        fpath = demo_dir / fname
        if not fpath.exists():
            print(f"[MISSING] {fname}")
            continue

        res = await PipelineOrchestrator.process_document(doc_id, str(fpath), fname)
        sec = res["security"]["status"]
        dec = res["workflow_decision"]["decision"]
        incs = len(res["inconsistencies"])
        timings = res["timings"].get("total_ms", 0)

        print(f"File: {fname}")
        print(f"  -> Security Gate : {sec.upper()}")
        print(f"  -> Workflow Dec  : {dec.upper()} (Expected: {expected_decision.upper()})")
        print(f"  -> Issues/Incons : {incs} flagged")
        print(f"  -> Next Action   : {res['workflow_decision'].get('next_action')}")
        print(f"  -> Total Time    : {timings} ms\n")

    summary = HandoffService.get_summary_stats()
    print("=======================================================")
    print("SUMMARY COUNTERS IN HANDOFF REPOSITORY")
    print("=======================================================")
    for k, v in summary.items():
        print(f"  {k:22}: {v}")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(test_all_scenarios())
