# =====================================================================
#  YOUR TICKERS  —  this is the ONE file you edit.
# =====================================================================
#  The heatmap resizes itself automatically to whatever is here.
# ---------------------------------------------------------------------

# Industry: semiconductors (13 names).
# Note: "SEVA" is delisted on Yahoo — using CEVA (semiconductor IP).
TICKERS = [
    "NVDA",
    "TSM",
    "AVGO",
    "MU",
    "AMD",
    "INTC",
    "ARM",
    "MRVL",
    "QCOM",
    "NXPI",
    "LSCC",
    "SYNA",
    "CEVA",
]

# Optional: nicer company names shown in the tooltip / details panel.
NAMES = {
    "NVDA": "NVIDIA",
    "TSM":  "Taiwan Semiconductor (TSMC)",
    "AVGO": "Broadcom",
    "MU":   "Micron Technology",
    "AMD":  "AMD",
    "INTC": "Intel",
    "ARM":  "Arm Holdings",
    "MRVL": "Marvell Technology",
    "QCOM": "Qualcomm",
    "NXPI": "NXP Semiconductors",
    "LSCC": "Lattice Semiconductor",
    "SYNA": "Synaptics",
    "CEVA": "CEVA",
}

# =====================================================================
#  ETF holdings sheets (authoritative weights from the fund's website).
# =====================================================================
#  When an ETF symbol has a sheet here, fetch.py uses THESE weights
#  instead of Yahoo's auto-pulled top holdings. Tile size = weight.
#  Source: roundhillinvestments.com DRAM holdings, as of 06/09/2026.
#  (Currency hedge lines KRW/TWD ~0% are intentionally excluded.)

ETF_HOLDINGS = {
    "DRAM": [
        {"symbol": "MU",        "name": "Micron Technology Inc",        "weight_pct": 27.63},
        {"symbol": "000660.KS", "name": "SK hynix",                     "weight_pct": 27.17},
        {"symbol": "005930.KS", "name": "Samsung Electronics Co",       "weight_pct": 19.20},
        {"symbol": "285A.T",    "name": "Kioxia Holdings",              "weight_pct": 7.70},
        {"symbol": "SNDK",      "name": "Sandisk",                      "weight_pct": 5.05},
        {"symbol": "STX",       "name": "Seagate Technology Holdings",  "weight_pct": 4.09},
        {"symbol": "WDC",       "name": "Western Digital",              "weight_pct": 3.67},
        {"symbol": "2408.TW",   "name": "Nanya Technology",             "weight_pct": 3.13},
        {"symbol": "2344.TW",   "name": "Winbond Electronics",          "weight_pct": 1.82},
    ],
}
