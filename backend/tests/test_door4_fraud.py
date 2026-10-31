"""Unit tests for Door 4 statistical fraud detection."""

import pytest
from app.services.security.door4_fraud_detection import Door4FraudDetection


def test_benford_law_distribution_natural():
    # Natural financial numbers generally conform to Benford's law
    natural_numbers = [
        125.40, 189.00, 1050.25, 1420.00, 240.10, 290.00, 310.50,
        450.00, 520.10, 680.00, 710.00, 890.00, 950.00, 1120.00,
        1850.00, 1990.00, 2300.00, 2750.00, 3400.00, 1500.00
    ]
    res = Door4FraudDetection.analyze_benford_law(natural_numbers)
    assert res["applicable"] is True
    assert res["conforms"] is True


def test_benford_law_fabricated_distribution():
    # Artificially uniform or heavily skewed non-Benford numbers (all starting with 9)
    skewed_numbers = [901.0, 912.0, 950.0, 980.0, 999.0, 920.0, 930.0, 940.0, 960.0, 970.0]
    res = Door4FraudDetection.analyze_benford_law(skewed_numbers)
    assert res["applicable"] is True
    assert res["conforms"] is False
    assert res["chi2_stat"] > res["threshold"]


def test_round_number_bias():
    res = Door4FraudDetection.check_round_numbers(5000.00, [1000.00, 2000.00, 2000.00])
    assert res["is_round_number_suspicious"] is True
    assert res["round_ratio"] == 1.0
