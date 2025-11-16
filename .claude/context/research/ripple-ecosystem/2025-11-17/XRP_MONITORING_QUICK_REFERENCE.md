# XRP Monitoring Ecosystem - Quick Reference Guide
## Services, APIs & Tools Comparison

---

## WALLET PROVIDERS QUICK LOOKUP

### Software Wallets

| Wallet | Platform | Best For | Cost | Security | xApp Support |
|--------|----------|----------|------|----------|--------------|
| **Xaman** | iOS/Android/Web | Day-to-day use | Free | Self-custody | Yes (native) |
| **GateHub** | Web | Exchange users | Free | Custodial/Hosted | Limited |
| **Uphold** | Web/Mobile | Multi-asset | Free | Custodial | No |
| **Toast Wallet** | Mobile | XRP focused | Free | Self-custody | Limited |

### Hardware Wallets

| Wallet | Cost | Security | Bluetooth | Multi-Asset | Best For |
|--------|------|----------|-----------|------------|----------|
| **Ledger Nano X** | $120 | Excellent | Yes | 100+ | Active traders |
| **Ledger Nano S Plus** | $60 | Excellent | No | 50+ | Budget conscious |
| **Trezor Safe 5** | $200 | Excellent | No | 100+ | Maximum security |
| **Trezor Model T** | $180 | Excellent | No | 100+ | Advanced users |
| **SafePal S1** | $50 | Excellent | No | 50+ | Mobile-first |

---

## API SERVICES REFERENCE

### Transaction Monitoring APIs

```
╔══════════════════════════════════════════════════════════════╗
║                  XRPL.js (Official Library)                  ║
╠══════════════════════════════════════════════════════════════╣
║ URL: https://js.xrpl.org/                                    ║
║ Language: JavaScript/TypeScript                              ║
║ Real-Time: WebSocket ✓                                       ║
║ Historical: ✓                                                ║
║ Cost: Free                                                   ║
║ Best For: Development, real-time monitoring                 ║
║ Key Methods:                                                 ║
║  • account_tx() - Get transaction history                   ║
║  • account_info() - Get balances and status                 ║
║  • subscribe() - Real-time account monitoring              ║
║  • tx() - Get specific transaction details                 ║
╚══════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════╗
║                     XRPScan API                              ║
╠══════════════════════════════════════════════════════════════╣
║ URL: https://xrpscan.com/                                    ║
║ Real-Time: Yes ✓ (seconds)                                  ║
║ Historical: ✓                                                ║
║ Cost: Free tier available                                    ║
║ Best For: Quick lookups, public data                         ║
║ Features:                                                    ║
║  • Real-time transaction tracking                           ║
║  • Rich list analytics                                      ║
║  • Network metrics                                          ║
║  • Token ecosystem data                                     ║
╚══════════════════════════════════════════════════════════════╝
```

```
╔══════════════════════════════════════════════════════════════╗
║                    Bithomp API                               ║
╠══════════════════════════════════════════════════════════════╣
║ URL: https://bithomp.com/ (API: docs.bithomp.com)           ║
║ Real-Time: Limited                                          ║
║ Historical: ✓ (Paid plan)                                   ║
║ Cost: Free tier + Premium plans                             ║
║ Best For: Detailed token analytics                          ║
║ Paid Features:                                              ║
║  • Address transaction lists                                ║
║  • Watchlist management                                     ║
║  • Token statistics                                         ║
║  • CSV export functionality                                 ║
╚══════════════════════════════════════════════════════════════╝
```

---

## REAL-TIME MONITORING SETUP

### Quick Start: Monitor Payment Incoming

**Using XRPL.js WebSocket (Recommended):**

```typescript
// 1. Install
npm install xrpl

// 2. Connect & Subscribe
import { Client } from "xrpl";

const client = new Client("wss://xrpl.ws");
await client.connect();

await client.request({
  command: "subscribe",
  accounts: ["YOUR_ADDRESS_HERE"]
});

// 3. Listen for payments
client.on("transaction", (event) => {
  if (event.transaction?.TransactionType === "Payment") {
    console.log("Payment received:", event);
  }
});
```

**Response Time:** < 1 second
**Cost:** Free (requires public node or your own)
**Reliability:** Excellent for production use

---

## ANALYTICS PLATFORMS COMPARISON

| Platform | Specialization | Real-Time | Data Type | Price |
|----------|---------------|-----------|-----------|-------|
| **CryptoQuant** | On-chain metrics | Yes | Aggregated | Paid |
| **Scorechain** | Compliance/AML | Yes | Risk data | Enterprise |
| **Elliptic** | Risk management | Yes | Risk signals | Enterprise |
| **AWS Datasets** | Large-scale analysis | Batch | Raw data | Usage-based |

---

## CUSTODY SOLUTIONS MATRIX

### Ripple Custody Platform
```
Security Certifications:
  ✓ FIPS 140-2 Level 4
  ✓ ISO 27001
  ✓ SOC 2 Type II

Key Technology:
  ✓ Multi-Party Computation (MPC)
  ✓ Hardware Security Modules (HSM)
  ✓ Private key splitting

Use Cases:
  → Institutional asset management
  → Custody service providers
  → Large holdings (100,000+ XRP)

Integration: Direct partnership with Ripple
```

### Multi-Signature (Built-in XRPL)
```
Requirements:
  • 2-3 addresses (typically)
  • M-of-N signature scheme
  • Controlled via Account settings

Benefits:
  ✓ No single point of failure
  ✓ Requires board approval
  ✓ Reduces risk of theft

Implementation:
  • Configure via xrpl.js
  • Supported by all wallets
  • Fully decentralized
```

---

## WALLET ACTIVITY MONITORING LEVELS

### Level 1: Basic (Free)
**Tools:** XRPScan, Bithomp (free tier), XRPL Explorer

```
Capabilities:
  ✓ View transactions
  ✓ Check balances
  ✓ See token holdings
  ✓ Browse rich list
  ✗ No real-time alerts
  ✗ No historical export
  ✗ No API access
```

### Level 2: Development (Free/Low-Cost)
**Tools:** xrpl.js, Public XRPL endpoints

```
Capabilities:
  ✓ Real-time WebSocket monitoring
  ✓ Custom filtering logic
  ✓ Historical queries (limited)
  ✓ Multi-account tracking
  ✗ No institutional compliance
  ✗ Rate limited
```

### Level 3: Professional (Paid)
**Tools:** Bithomp API (paid), QuickNode, enterprise providers

```
Capabilities:
  ✓ Priority API access
  ✓ Higher rate limits
  ✓ CSV export
  ✓ Historical data access
  ✓ Custom queries
  ✓ SLA guarantees
```

### Level 4: Enterprise (Custom)
**Tools:** Ripple Custody, Elliptic, Scorechain

```
Capabilities:
  ✓ Compliance reporting
  ✓ Risk scoring
  ✓ AML integration
  ✓ Custom integrations
  ✓ Dedicated support
  ✓ Institutional grade
```

---

## TRANSACTION TYPE REFERENCE

### Monitor These Common Transaction Types

```
Payment (most important for monitoring)
  └─ Command: "Payment"
  └─ Watch for: Amount, Destination, Delivered_amount
  └─ Alert trigger: Large amounts, unusual destinations

SetRegularKey
  └─ Command: "SetRegularKey"
  └─ Watch for: Account key changes
  └─ Alert trigger: Unauthorized key changes

SetSigningKey
  └─ Command: "SigningKeySet"
  └─ Watch for: Multi-sig configuration changes
  └─ Alert trigger: Security policy changes

TrustSet
  └─ Command: "TrustSet"
  └─ Watch for: New token holdings, trust line limits
  └─ Alert trigger: Exposure to new tokens

OfferCreate / OfferCancel
  └─ Command: "OfferCreate" / "OfferCancel"
  └─ Watch for: DEX activity
  └─ Alert trigger: Large position changes
```

---

## COMMON MONITORING PATTERNS

### Pattern 1: Large Payment Alert
```
Trigger: Payment > 100,000 XRP to/from account
Action: Send email notification + log to database
Implementation: WebSocket + threshold check
Response Time: < 1 second
```

### Pattern 2: Unusual Activity Detection
```
Trigger: Transaction to new address
Action: Flag for review + capture metadata
Implementation: Track historical counterparties
Response Time: Near real-time
```

### Pattern 3: Token Exposure Monitoring
```
Trigger: New trustline established
Action: Alert team + update risk model
Implementation: Monitor TrustSet transactions
Response Time: Real-time
```

### Pattern 4: Multi-Sig Compliance Check
```
Trigger: Transaction without required signers
Action: Block transaction + escalate
Implementation: Validate signature count
Response Time: Pre-transaction
```

---

## CHOOSING THE RIGHT TOOLS

### Decision Tree

```
START: What do you need to monitor?
│
├─ Individual wallet (personal use)
│  ├─ Just viewing? → Use Xaman wallet + XRPScan
│  └─ Custodial? → Use Ledger/Trezor
│
├─ Business operations
│  ├─ Real-time alerts? → Use xrpl.js + custom backend
│  ├─ Compliance required? → Use Elliptic or Scorechain
│  └─ Large volumes? → Use Bithomp API (paid)
│
├─ Institutional custody
│  ├─ Multi-signature needed? → Use XRPL multi-sig
│  ├─ Bank-grade required? → Use Ripple Custody
│  └─ Highest security? → Use Trezor Safe 5 + multi-sig
│
└─ Data analysis
   ├─ Historical trends? → Use CryptoQuant
   └─ Raw blockchain data? → Use AWS datasets or xrpl.js
```

---

## QUICK API ENDPOINT REFERENCE

### Official XRPL Endpoints
```
Mainnet WebSocket:  wss://xrpl.ws
Mainnet HTTP:       https://xrplcluster.com (HTTP-RPC)

Testnet WebSocket:  wss://testnet.xrpl.ws
Testnet HTTP:       https://testnet.xrpl.ws (HTTP-RPC)

Devnet WebSocket:   wss://sidechain-net.xrpl.ws
```

### Alternative Providers
```
QuickNode:     wss://quicknode-endpoint.com
Ripple Labs:   Multiple endpoints (documentation)
Private Nodes: Your own infrastructure
```

---

## TROUBLESHOOTING REFERENCE

### WebSocket Connection Issues
```
Problem: Connection timeout
Solution: Verify firewall, try different endpoint

Problem: Message rate limited
Solution: Reduce subscription load, add delays

Problem: Missed transactions
Solution: Use account_tx() to backfill, verify subscription active
```

### API Rate Limiting
```
Public endpoints: ~100 requests/10 seconds
Premium services: Higher limits (check provider)
Solution: Implement exponential backoff retry logic
```

### Account Not Responding
```
Problem: No transactions after subscription
Solution: Verify address format (r-address), check if account exists

Problem: Transaction missing
Solution: Check meta.TransactionResult, verify delivered_amount
```

---

## SECURITY CHECKLIST

- [ ] Use HTTPS/WSS for all connections
- [ ] Never commit API keys to version control
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting on your endpoints
- [ ] Validate all transaction data before processing
- [ ] Use multi-signature for accounts over 100,000 XRP
- [ ] Enable IP whitelisting for API access
- [ ] Regularly audit transaction logs
- [ ] Keep dependencies updated
- [ ] Test error handling scenarios

---

## RECOMMENDED SETUP FOR DIFFERENT SCENARIOS

### Small Business (< 1M XRP)
```
1. Wallet: Xaman (software) + Ledger Nano X (backup)
2. Monitoring: XRPScan for viewing
3. Alerts: Manual checks
4. Cost: $120 one-time
```

### Medium Business (1M - 10M XRP)
```
1. Wallet: Multi-sig via XRPL + Ledger/Trezor for keys
2. Monitoring: xrpl.js custom backend
3. Alerts: Real-time WebSocket monitoring
4. Compliance: Scorechain or Elliptic
5. Cost: $1000-$5000/year
```

### Enterprise (10M+ XRP)
```
1. Custody: Ripple Custody Platform
2. Multi-sig: Full XRPL multi-signature scheme
3. Monitoring: Enterprise analytics + custom implementation
4. Compliance: Dedicated AML/KYC integration
5. Support: Dedicated account management
6. Cost: Custom enterprise pricing
```

---

## RESOURCES FOR FURTHER LEARNING

### Official Documentation
- XRPL Dev Portal: https://xrpl.org/
- xrpl.js Docs: https://js.xrpl.org/
- Xaman Developers: https://xumm.app/developers

### Community Resources
- XRPL Reddit: https://www.reddit.com/r/Ripple/
- GitHub Issues: https://github.com/XRPLF/xrpl.js/issues
- Dev Community: https://dev.community/

### Learning Paths
1. Start with: Xaman wallet + XRPScan explorer
2. Move to: xrpl.js tutorial + WebSocket monitoring
3. Advance to: Custom backend implementation
4. Enterprise: Ripple Custody + multi-sig integration

---

**Quick Reference Guide | November 17, 2025**
**For Latest Updates:** Visit https://xrpl.org/docs/
