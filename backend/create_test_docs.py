import fitz

def generate_tuition():
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    text = """======================================================================
                  APEX UNIVERSITY OF TECHNOLOGY
             Office of the Bursar & Student Accounts
                500 University Ave, Cambridge, MA
======================================================================
OFFICIAL TUITION & FEE PAYMENT RECEIPT

Receipt Number:   REC-2026-88210
Date Issued:      October 30, 2026
Payment Status:   PAID IN FULL
Payment Method:   Electronic Wire Transfer (Ref #WT-994821)

STUDENT DETAILS:
----------------------------------------------------------------------
Student Name:     Jane Smith
Student ID:       STU-88210
Degree Program:   B.S. Computer Science & Artificial Intelligence
Academic Term:    Fall Semester 2026

TUITION & FEE BREAKDOWN:
----------------------------------------------------------------------
DESCRIPTION / ITEM CODE            CATEGORY    CREDITS / QTY   RATE       TOTAL AMOUNT
----------------------------------------------------------------------
CS-401: Advanced Agentic AI Systems    Tuition     4 Credits    $900.00    $3,600.00
CS-415: Distributed Systems & Security Tuition     4 Credits    $900.00    $3,600.00
GPU Cloud Computing Laboratory Access  Lab Fee     1 Term       $450.00      $450.00
Campus Health, Wellness & Recreation   Amenities   1 Term       $300.00      $300.00
University Library & Digital Journals Access Academic Resources 1 Term $150.00 $150.00
Dean's Merit Scholarship (Autumn Credit) Financial Aid 1 Grant -$3,250.00 -$3,250.00
----------------------------------------------------------------------
SUBTOTAL:                                                                  $4,850.00
TAX APPLICABLE (0% Educational):                                               $0.00
----------------------------------------------------------------------
TOTAL NET DUES (USD):                                                      $4,850.00
BALANCE DUE:                                                                   $0.00
======================================================================
Authorized by Bursar: Dr. Robert Vance
Verification Seal: SECURE-APEX-VERIFIED-2026
"""
    page.insert_text((30, 45), text, fontsize=8.5, fontname="courier")
    doc.save("a:/vy26/demo_test_files/01_Apex_University_Tuition_Receipt.pdf")
    doc.close()
    print("Saved 01_Apex_University_Tuition_Receipt.pdf")


def generate_po():
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    text = """APEX UNIVERSITY - PROCUREMENT & ACADEMIC SUPPLY
500 University Ave, Cambridge, MA
COMMERCIAL PURCHASE ORDER

PO Number:    PO-7788
Vendor:       Acme Industrial Supplies Inc.
Department:   AI Robotics & Computer Systems Laboratory
Order Date:   2026-10-30
Due Date:     2026-11-30
Payment Terms: Net 30 Days

PURCHASE ITEMS:
----------------------------------------------------------------------
Item Code    Description               Qty   Unit Price   Total Amount
----------------------------------------------------------------------
WIDGET-01    Industrial Widgets         10      $150.00      $1,500.00
----------------------------------------------------------------------
Subtotal:                                                $1,500.00
Tax:                                                         $0.00
Total PO Value:                                          $1,500.00
======================================================================
Receiving Warehouse: Central Campus Depot, Bay 4
Matching Status: Pre-authorized for 3-way matching
"""
    page.insert_text((40, 50), text, fontsize=10, fontname="courier")
    doc.save("a:/vy26/demo_test_files/04_Lab_Equipment_Purchase_Order.pdf")
    doc.close()
    print("Saved 04_Lab_Equipment_Purchase_Order.pdf")


if __name__ == "__main__":
    generate_tuition()
    generate_po()
