# Financial Models Reference

Excel patterns, tab structures, and formula conventions for KORA financial documents.
Always read /mnt/skills/public/xlsx/SKILL.md first — these rules are additive.

---

## Personal P&L (Monthly)

### Tab structure
```
[Assumptions] → [Monthly P&L] → [Annual Summary] → [Charts]
```

### Assumptions tab layout (rows)
```
Row 1:  [Header] ASSUMPTIONS
Row 3:  Income growth rate (MoM)     [blue]  0.0%
Row 4:  Inflation rate (expenses)    [blue]  2.5%
Row 5:  Emergency fund target        [blue]  $10,000
Row 6:  Savings rate target          [blue]  20.0%
Row 8:  [Header] TAX ASSUMPTIONS
Row 9:  Income tax rate (approx)     [blue]  25.0%
Row 11: [Header] DATA SOURCE
Row 12: Source: KORA check-in exports, [DATE]
```

### Monthly P&L columns (A through P = 12 months + total + % of income)
```
Col A:  Category label
Col B:  Jan
Col C:  Feb
...
Col M:  Dec
Col N:  [formula] Full Year Total   =SUM(B:M)
Col O:  [formula] % of Income       =N/Income_Total
```

### Standard row groups
```
INCOME
  Salary / Primary income
  Side income
  Other income
  [formula] Total Income

FIXED EXPENSES
  Rent / Mortgage
  Insurance
  Subscriptions
  Loan repayments
  [formula] Total Fixed

VARIABLE EXPENSES
  Food & Groceries
  Transport
  Health
  Entertainment
  Other
  [formula] Total Variable

[formula] Total Expenses  =Fixed + Variable
[formula] Net Income      =Total Income - Total Expenses
[formula] Savings Rate    =Net Income / Total Income
```

---

## Budget Forecast (12-Month)

### Key formulas
```excel
# Month-over-month growth (income row, month 2 onward):
=B5*(1+Assumptions!$B$3)

# Inflation-adjusted expense:
=B12*(1+Assumptions!$B$4)

# Variance (actual vs budget):
=Actual-Budget     [green text if positive, red if negative — use conditional formatting]

# Savings rate:
=MAX(0, (Income-Expenses)/Income)

# Running balance:
=Previous_Balance + Net_Income   [no circular refs — always reference prior cell]
```

### Conditional formatting rules
```
Savings rate >= 20%  → green fill (RGB 198,224,180)
Savings rate < 10%   → red fill  (RGB 255,199,206)
Variance > 0         → green text
Variance < 0         → red text (parentheses format)
```

---

## Net Worth Statement

### Tab: Net Worth
```
Col A: Category
Col B: This Year ($)   [blue for inputs, black for totals]
Col C: Last Year ($)   [blue for inputs]
Col D: [formula] Change ($)     =B-C
Col E: [formula] Change (%)     =D/ABS(C)

ASSETS
  Cash & Savings
  Investments (stocks, ETFs)
  Retirement accounts
  Real estate (estimated value)
  Other assets
  [formula] Total Assets

LIABILITIES
  Mortgage balance
  Student loans
  Personal loans
  Credit card debt
  Other liabilities
  [formula] Total Liabilities

[formula] NET WORTH = Total Assets - Total Liabilities
```

---

## Decision Log Export (KORA-specific)

### Tab: Decisions
```
Col A: Date (YYYY-MM-DD)
Col B: Type              [investment | loan | purchase | gift | avoid | other]
Col C: Description       [from decisionPoint.summary]
Col D: Amount ($)
Col E: Currency
Col F: Counterparty
Col G: Deadline
Col H: Resolved          [Yes / No / Pending]
Col I: Outcome           [from decisionPoint.outcome]
Col J: Stress Score      [0.0 – 1.0, formatted 0.0%]
Col K: Session ID        [for traceability]
```

### Tab: Summary
```
Pivot-style summary (hand-built, not Excel PivotTable — more portable):

By Type:
  Type | Count | Total $ | Avg Stress | % Resolved

Stress Quartile Distribution:
  Low (0-25%) | Medium (25-50%) | High (50-75%) | Critical (75-100%)

Monthly activity chart: bar chart, x=month, y=decision count, coloured by type
```

---

## Investment Analysis (simple DCF)

### Tab: DCF Model
```
ASSUMPTIONS (blue)
  Discount rate (WACC)
  Terminal growth rate
  Projection years

CASH FLOW PROJECTIONS
  Year | Revenue | EBIT Margin | EBIT | Tax | NOPAT | D&A | CapEx | Change in WC | FCF

VALUATION
  [formula] PV of FCFs     =NPV(WACC, FCF_range)
  [formula] Terminal Value =Last_FCF*(1+g)/(WACC-g)
  [formula] PV of TV       =TV/(1+WACC)^N
  [formula] Enterprise Value =PV_FCFs + PV_TV
  [formula] Equity Value   =EV - Net_Debt
```

### Tab: Sensitivity
```
2D sensitivity table:
  Rows: WACC ranging ±2% in 0.5% steps
  Cols: Terminal growth rate ranging ±1% in 0.25% steps
  Values: Equity Value

Use Excel's Data Table feature via openpyxl write-only mode:
  - Compute all values in Python
  - Write as static values (openpyxl doesn't support Data Table natively)
  - Apply colour gradient: low=red, mid=yellow, high=green
```

---

## Formatting constants for openpyxl

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers

# Colour constants
BLUE_FONT   = Font(color="0000FF")          # hardcoded inputs
BLACK_FONT  = Font(color="000000")          # formulas
GREEN_FONT  = Font(color="008000")          # cross-sheet links
HEADER_FILL = PatternFill("solid", fgColor="4F46E5")  # KORA indigo header
ALT_ROW     = PatternFill("solid", fgColor="F3F4F6")  # alternating row

# Number formats
CURRENCY_FMT  = '$#,##0;($#,##0);"-"'
PERCENT_FMT   = '0.0%;(0.0%);"-"'
MULTIPLE_FMT  = '0.0x'
DATE_FMT      = 'YYYY-MM-DD'

# Thin border for tables
THIN = Side(style='thin', color='CCCCCC')
TABLE_BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

# Centre alignment for headers
CENTRE = Alignment(horizontal='center', vertical='center', wrap_text=True)
```

---

## Chart conventions

- Bar charts for time series (monthly P&L, budget vs actual)
- Line charts for trend data (net worth over time, stress score trend)
- Pie/donut: only for expense category breakdown — cap at 7 slices, group remainder as "Other"
- Colour palette: use KORA indigo (`#4F46E5`) as primary, with 3-shade ramp for multi-series
- Always add data labels on the most important series
- No 3D charts — ever
