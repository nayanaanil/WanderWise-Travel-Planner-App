# Route Optimizer Rules Verification

## Rules to Verify

1. **Select gateways first (strict, gateway-only)**
2. **Lock them**
3. **Build ground route between gateways**
4. **Never allow gateways to appear mid-route**
5. **Never allow bases to become gateways**

---

## Current Implementation Analysis

### ✅ Rule 1: Select gateways first (strict, gateway-only)

**Status: PARTIALLY COMPLIANT**

**What works:**
- `gatewayNormalizeInput()` runs first (line 1386) and normalizes stops to gateways
- For long-haul trips, stops are resolved to gateway cities before anchor selection
- `getEligibleAnchorCandidates()` extracts candidates from normalized gateway cities (line 647)

**Issues:**
- `getEligibleAnchorCandidates()` doesn't verify gateway eligibility - it assumes `stop.city` is gateway-eligible
- Gateway normalization allows cities with physical airports to pass through without strict verification
- No explicit check that anchor candidates are strictly gateway-only (no base cities)

**Code Location:**
- `gatewayNormalizeInput()`: Lines 389-619
- `getEligibleAnchorCandidates()`: Lines 638-651

---

### ❌ Rule 2: Lock them

**Status: NOT COMPLIANT**

**What happens:**
- Anchors are selected in `selectAnchorConfigurations()` (line 1433)
- BUT: `validateAndRepairAnchors()` is called AFTER route creation (line 1546)
- This function can REPLACE anchors if they're not gateway-eligible
- Anchors are NOT locked - they can be changed after selection

**Code Location:**
- `validateAndRepairAnchors()`: Lines 108-328
- Called at: Line 1546 (base routes), Line 1669 (v2 reversed routes)

**Violation:**
Anchors should be locked after selection, but the current implementation allows post-selection repair/replacement.

---

### ❌ Rule 3: Build ground route between gateways

**Status: NOT COMPLIANT**

**What happens:**
- `buildGroundRouteBetweenAnchors()` takes `outboundAnchor` and `inboundAnchor` as parameters
- BUT: It builds routes between BASE cities (using `resolvedFrom`), not between gateways
- Ground route legs use base city identity: `(current as ResolvedStop).resolvedFrom ?? current.city` (line 1209)
- Gateways only appear as prepend/append legs if anchors differ from first/last base cities

**Code Location:**
- `buildGroundRouteBetweenAnchors()`: Lines 1103-1244
- Base city routing: Lines 1201-1219
- Gateway prepend: Lines 1183-1197
- Gateway append: Lines 1221-1241

**Violation:**
Ground route is built between BASE cities, not between gateways. Gateways only appear at route boundaries.

---

### ⚠️ Rule 4: Never allow gateways to appear mid-route

**Status: UNCLEAR / POTENTIALLY VIOLATED**

**What happens:**
- Ground route is built between base cities
- If a base city happens to be a gateway (e.g., Marrakech is both a base and a gateway), it can appear mid-route
- There's no explicit check to prevent gateways from appearing in the middle of the ground route

**Code Location:**
- `buildGroundRouteBetweenAnchors()`: Lines 1103-1244

**Potential Issue:**
If a gateway city is also a base city (e.g., user stops in Marrakech), it will appear mid-route. This may or may not be a violation depending on interpretation.

---

### ⚠️ Rule 5: Never allow bases to become gateways

**Status: UNCLEAR / POTENTIALLY VIOLATED**

**What happens:**
- `getEligibleAnchorCandidates()` uses `stop.city` (gateway city) for anchor selection (line 647)
- BUT: If a base city (resolvedFrom) is gateway-eligible, it could theoretically be selected
- The anchor selection doesn't explicitly distinguish between "this is a gateway" vs "this is a base that happens to be gateway-eligible"

**Code Location:**
- `getEligibleAnchorCandidates()`: Lines 638-651
- `selectAnchorConfigurations()`: Lines 1063-1095

**Potential Issue:**
The distinction between gateway cities and base cities is blurred. If a base city is gateway-eligible, it could be selected as an anchor.

---

## Summary

| Rule | Status | Notes |
|------|--------|-------|
| 1. Select gateways first (strict, gateway-only) | ⚠️ PARTIALLY | Gateway normalization happens first, but no strict verification |
| 2. Lock them | ❌ NOT COMPLIANT | Anchors can be repaired/replaced after selection |
| 3. Build ground route between gateways | ❌ NOT COMPLIANT | Ground route built between BASE cities, not gateways |
| 4. Never allow gateways to appear mid-route | ⚠️ UNCLEAR | No explicit prevention; gateways can appear if they're also base cities |
| 5. Never allow bases to become gateways | ⚠️ UNCLEAR | Distinction between gateway and base cities is blurred |

---

## Recommendations

1. **Enforce strict gateway-only anchor selection**: Add explicit verification in `getEligibleAnchorCandidates()` that candidates are gateway-eligible
2. **Lock anchors after selection**: Remove or restrict `validateAndRepairAnchors()` to only validate, not repair
3. **Build ground route between gateways**: Modify `buildGroundRouteBetweenAnchors()` to build routes between gateway cities, not base cities
4. **Prevent gateways mid-route**: Add validation to ensure gateways only appear at route boundaries
5. **Clarify gateway vs base distinction**: Ensure anchor selection explicitly uses gateway cities, never base cities




