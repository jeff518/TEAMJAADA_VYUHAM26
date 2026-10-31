import requests
import json
import time
from pathlib import Path

BASE_URL = "http://localhost:8001"
FILES_DIR = Path("A:/vy26/demo_test_files")

def test_upload(filename, domain="EDUCATION"):
    filepath = FILES_DIR / filename
    print(f"\n=======================================================")
    print(f"Testing Upload: {filename} (Domain: {domain})")
    print(f"=======================================================")
    
    with open(filepath, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/api/v1/documents/upload",
            files={"file": (filename, f, "application/pdf")},
            data={"domain": domain}
        )
    
    if resp.status_code == 409:
        data = resp.json()
        doc_id = data.get("details", {}).get("existing_document_id") or data.get("document_id")
        print(f"Existing doc ID: {doc_id}")
    elif resp.status_code in (200, 201):
        data = resp.json()
        doc_id = data.get("document_id") or data.get("id")
        print(f"Uploaded doc ID: {doc_id}")
    else:
        print(f"Upload failed: {resp.status_code} {resp.text}")
        return None

    # Wait for processing
    for _ in range(15):
        time.sleep(1)
        tel_resp = requests.get(f"{BASE_URL}/api/v1/documents/{doc_id}/telemetry")
        if tel_resp.status_code == 200:
            tel = tel_resp.json()
            status = tel.get("status")
            final_dec = tel.get("final_decision")
            door2_dec = tel.get("door2_decision")
            if final_dec in ("ALLOW", "BLOCK") or "blocked" in status or status in ("ready_for_approval", "completed", "failed"):
                print(f"Pipeline Completed! Status: {status} | Final: {final_dec} | Door2: {door2_dec}")
                print(f"Status Message: {tel.get('status_message')}")
                print(f"Explainability: {json.dumps(tel.get('explainability'), indent=2)}")
                print(f"Classification: {json.dumps(tel.get('classification'), indent=2)}")
                return tel

    print("Timed out waiting for pipeline completion.")
    return None

if __name__ == "__main__":
    # Test 1: Tuition Receipt
    t1 = test_upload("01_Apex_University_Tuition_Receipt.pdf", "EDUCATION")
    
    # Test 2: Prompt Injection Threat
    t2 = test_upload("03_Security_Threat_Prompt_Injection.pdf", "EDUCATION")
    
    # Test 3: Lab Equipment Purchase Order
    t3 = test_upload("04_Lab_Equipment_Purchase_Order.pdf", "MARKET")
