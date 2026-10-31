import sys
sys.path.insert(0, "A:/vy26/backend")
import asyncio
from app.services.extraction.vlm_extractor import VLMExtractor
import fitz

doc = fitz.open("a:/vy26/demo_test_files/01_Apex_University_Tuition_Receipt.pdf")
text = ""
for page in doc:
    text += page.get_text()

data = VLMExtractor.regex_fallback_extraction(text)
print("Vendor:", data.vendor_name)
print("Student:", data.customer_name)
print("Invoice #:", data.invoice_number)
print("Total:", data.total_amount)
print(f"Extracted {len(data.line_items)} line items:")
for it in data.line_items:
    print(f" - {it.description} | {it.category} | {it.quantity} | ${it.unit_price} | ${it.amount}")
