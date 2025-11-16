# XRP Wallet Providers, Custody Solutions & Transaction Monitoring Services
## Comprehensive Research Report | 2025

---

## 1. MAJOR XRP WALLET PROVIDERS

### 1.1 Xaman (formerly XUMM) - Software Wallet
**Status:** #1 self-custodial XRP Ledger wallet
**Platform:** iOS, Android, Web
**Users:** 1.5+ million downloads
**Year-to-Date Volume (2024):** $6 billion processed in payments ($510 total fees)

**Key Features:**
- Non-custodial client for XRP Ledger and Xahau
- xApp ecosystem with 3rd-party integrations
- Real-time transaction processing
- KYC integration capabilities
- Ecosystem development platform
- 8 million xApp interactions in 2024

**Strengths:**
- Lowest transaction costs in ecosystem
- Robust ecosystem for developers
- Native XRP Ledger integration
- Growing feature set with frequent updates

**Platform URL:** https://xaman.app/ (formerly xumm.app)

---

### 1.2 Ledger - Hardware Wallet
**Supported Models:**
- Ledger Nano X (Bluetooth enabled)
- Ledger Nano S Plus
- Ledger Nano S

**Key Features:**
- Secure chip protection (EAL6+)
- Cold storage for maximum security
- Multiple asset support (100+ cryptocurrencies)
- Bluetooth connectivity (Nano X)
- Hardware-based key management
- Integration with XRP Toolkit

**Strengths:**
- Industry-standard cold storage
- Maximum security for long-term holding
- Offline key storage
- Trusted by institutional users

---

### 1.3 Trezor - Hardware Wallet
**Supported Models:**
- Trezor Safe 5
- Trezor Safe 3
- Trezor Model T

**Key Features:**
- Open-source firmware (allows community audits)
- EAL6+ certified secure chips
- Native Trezor Suite support
- Cold storage architecture
- Air-gapped transaction signing

**Strengths:**
- Transparency through open-source design
- Community security audits
- Strong institutional backing
- Comprehensive documentation

---

### 1.4 SafePal - Hardware Wallet
**Model:** SafePal S1

**Key Features:**
- Air-gapped technology
- Mobile convenience with cold storage
- QR code-based transaction signing
- Native XRP support

**Strengths:**
- Affordable pricing ($40-$60 range)
- Mobile-first design
- Accessible to beginners
- Air-gap security model

---

### 1.5 XRP Toolkit
**Status:** Open-source XRP Ledger client

**Supported Integrations:**
- Ledger Nano X
- Ledger Nano S
- Keystone
- D'CENT Wallet
- Xumm App
- Account address (view-only)

**Key Feature:** Recommended combination is XRP Toolkit + Ledger for extremely secure asset management

---

## 2. WALLET API ACCESS FOR MONITORING

### 2.1 Official XRP Ledger APIs

#### XRPL.js (JavaScript/TypeScript)
**Repository:** https://github.com/XRPLF/xrpl.js
**NPM Package:** `xrpl.js`
**Documentation:** https://js.xrpl.org/

**Capabilities:**
- Account balance queries
- Transaction history retrieval
- Real-time subscription to ledger updates
- Payment path finding
- Decentralized exchange operations
- Multi-signing support
- Escrows and payment channels
- IOUs and complex payment logic

**Connection Methods:**
- WebSocket (real-time bidirectional communication)
- JSON-RPC (HTTP POST)
- Public node endpoints or self-hosted servers

**Key Methods for Monitoring:**
```
- Client.request() - General API queries
- account_tx() - Query transaction history
- account_info() - Get account details
- subscribe/unsubscribe() - Real-time monitoring
```

#### XRPL HTTP/WebSocket APIs
**Documentation:** https://xrpl.org/docs/references/http-websocket-apis/public-api-methods

**Key API Methods:**

**Account Methods:**
- `account_info` - Get account info and balances
- `account_lines` - Get trust lines
- `account_offers` - Get open offers
- `account_tx` - Get transaction history

**Ledger Methods:**
- `ledger` - Get ledger info
- `ledger_data` - Query specific ledger objects
- `ledger_closed` - Get last closed ledger

**Transaction Methods:**
- `tx` - Get transaction details
- `tx_history` - Get transaction history

**Subscription Methods:**
- `subscribe` - Subscribe to ledger updates
- `unsubscribe` - Stop listening to updates

**Stream Types Available:**
- Ledger streams
- Transaction streams
- Validation streams
- Specific address monitoring

#### Ripple Data API v2
**Status:** Legacy historical data API
**Use Case:** Historical analysis and trend analysis

---

### 2.2 Xaman (XUMM) SDK and API

**API Registration:** https://apps.xumm.dev/

**SDK Access:**
- NPM Package: `xumm-sdk`
- Documentation: Available in GitHub repository

**API Capabilities:**
- Sign requests (payload delivery)
- KYC information access
- XRP exchange rates
- Application authentication

**Key Features:**
- Ping method to verify API credentials
- Web app integration (works inside/outside Xaman)
- xApp delivery platform
- Developer-friendly documentation

**Use Cases:**
- Building xApps on XRPL
- Integrating Xaman wallet authentication
- Custom application signing flows

---

### 2.3 Third-Party RPC Providers

**QuickNode**
- Provides XRP Ledger RPC node endpoints
- Enhanced API tools
- Monitoring capabilities

---

## 3. TRANSACTION TRACKING SERVICES

### 3.1 XRPScan
**URL:** https://xrpscan.com/
**Status:** Leading XRP Ledger explorer

**Capabilities:**
- Real-time transaction tracking (visible within seconds)
- Account information and balances
- Token and NFT tracking
- Account rich list
- Network metrics and validators
- Amendment tracking
- AMM (Automated Market Maker) data
- API access for developers

**Monitoring Features:**
- Real-time transaction visibility
- Account balance tracking
- Network health metrics
- Rich list monitoring
- Token holder analysis

**API Access:** Available for developers

---

### 3.2 Bithomp
**URL:** https://bithomp.com/explorer/
**Status:** Trusted XRP Ledger explorer

**Capabilities:**
- Transaction scanning and status tracking
- Address balance queries
- NFT and token browsing
- Escrow and check tracking
- Offer management

**API Features (Available at docs.bithomp.com):**
- Address monitoring (transaction lists by address - paid plans)
- Watchlist management
- Token information and statistics
  - Icon and description
  - Holder count
  - 24-hour volumes
  - Price changes
  - Market cap calculations
- Account history search with CSV export
- API key management and statistics
- Free CDN for token/address images

**Paid Plans:** Required for advanced monitoring features like address transaction lists

---

### 3.3 XRPL Explorer
**URL:** https://livenet.xrpl.org/

**Capabilities:**
- Official XRPL explorer
- Account balance checking
- Transaction details
- Validator information
- Node monitoring
- Amendment tracking

---

### 3.4 Blockchair
**Status:** Multi-chain blockchain explorer with XRP support

**Capabilities:**
- Ripple/XRP blockchain exploration
- Comprehensive transaction tracking
- Advanced search functionality

---

### 3.5 Bitquery
**URL:** https://explorer.bitquery.io/ripple

**Capabilities:**
- Ripple XRP Ledger transaction search
- Address and block exploration
- Miner tracking
- Analytics charts and widgets
- Advanced transaction filtering

---

## 4. MULTI-SIG AND CUSTODY SOLUTIONS

### 4.1 Ripple Custody Platform
**Status:** Enterprise-grade custody solution
**Certifications:**
- FIPS 140-2 Level 4 certified
- ISO 27001 certified
- SOC 2 Type II compliant

**Security Architecture:**
- Multi-Party Computation (MPC) technology
- Hardware Security Modules (HSM)
- Private key splitting among multiple parties
- No single entity has unilateral control

**Key Features:**
- Bank-grade security measures
- Institutional-grade compliance
- Advanced cryptographic protocols
- Private key management options:
  - MPC-based key splitting
  - HSM integration
  - Cold storage options

**Target Clients:** Institutional crypto asset managers, custodian firms

**Recent Adoption:**
- South Korea's BDACS (August 2025) - Securing XRP and RLUSD
- Growing institutional adoption across Asia

---

### 4.2 Multi-Signature (Multi-Sig) Architecture

**Definition:** Requires multiple private keys (from different parties) to authorize a transaction

**XRP Ledger Multi-Sig Capabilities:**
- Enforced by xrpl.js library
- Support for complex multi-signing schemes
- Multiple keyholders validation
- No single point of failure

**Implementation Options:**

**1. Full Multi-Sig:**
- All signers required to authorize
- Maximum security
- Slower approval process

**2. M-of-N Multi-Sig:**
- Requires M signatures from N total signers
- Flexible approval workflows
- Balance between security and speed

**3. Partial/Hybrid Custody:**
- Multi-signature wallets
- Cryptographically-protected governance
- Cold storage integration
- Built-in compliance features

**Use Cases:**
- Corporate treasury management
- Institutional asset protection
- Fund governance structures
- DAO operations on XRPL

---

### 4.3 Security Best Practices for Institutional Custody

**Key Requirements for Providers:**
- Advanced cybersecurity protocols
- Multi-signature wallet support
- Cold storage options
- Cryptographically-protected governance
- Built-in compliance integrations
- Hardware security modules
- Private key splitting technologies
- Regular security audits

**Standard Custody & Trust:**
- Institutional custody platform
- Digital asset focus
- Enterprise-grade security

**XBTO:**
- Custody solutions for institutional crypto asset managers
- Comprehensive custody infrastructure

---

## 5. WALLET ACTIVITY ANALYTICS

### 5.1 On-Chain Metrics and Analytics Platforms

#### CryptoQuant
**URL:** https://cryptoquant.com/asset/xrp/summary

**Capabilities:**
- Daily XRP Ledger overview
- On-chain data analytics
- Price statistics
- Derivatives tracking
- DEX trading data
- Chart generation
- Trending article analysis

---

#### Scorechain
**Focus:** Blockchain analytics and compliance

**Capabilities:**
- XRP Ledger support
- Risk scoring
- AML (Anti-Money Laundering) tools
- Real-time transaction monitoring
- Compliance reporting

---

#### AWS Public Blockchain Datasets
**Platform:** AWS analytics infrastructure

**Use Cases:**
- Transaction monitoring by financial institutions
- Fraud detection
- Auditing purposes
- Large-scale data analysis

**Implementation:** Integration with AWS analytics tools for XRP Ledger data

---

### 5.2 Wallet Growth and Activity Trends (2025 Data)

**Wallet Statistics:**

1. **Whale Wallets (10,000+ XRP holdings):**
   - Record high: 317,500 wallets holding 10,000+ XRP tokens
   - Monthly growth: ~1.8% (last 30 days)
   - Consistent upward trend throughout 2025

2. **Daily Active Wallets:**
   - Range: 50,000-70,000 DAW
   - Year-over-year growth: ~25%
   - Seasonal spikes during ecosystem expansion events

3. **New Wallet Creation:**
   - Spike during RippleNet corridor launches
   - Spike during NFT platform integrations
   - Consistent baseline growth

4. **Trading Volume Metrics:**
   - Peak volume (Jan 17, 2025): $40 billion
   - DEX trading volume (Q1 2025): $800 million+
   - Year-over-year DEX growth: 61%

5. **Developer Ecosystem:**
   - Active monthly contributors: 2,800+
   - GitHub-based development
   - Growing xApp ecosystem

---

### 5.3 Monitoring Tools Available

#### XRPScan Metrics Dashboard
**URL:** https://xrpscan.com/metrics

**Available Metrics:**
- Network statistics
- Transaction volume
- Active wallet counts
- Token ecosystem data
- Validator information
- Amendment tracking
- AMM liquidity data

#### XRP Authority Analytics
**URL:** https://xrpauthority.com/blog/xrp-on-chain-metrics/

**Focus:** On-chain metrics analysis and reporting

#### Individual Explorer Analytics
- Bithomp address analytics
- XRPScan token statistics
- XRPL Explorer metrics
- Blockchair transaction analysis

---

### 5.4 Real-Time Monitoring Capabilities

#### WebSocket Subscriptions for Activity Monitoring

**Subscribe to Account Activity:**
```
- Subscribe to specific account addresses
- Receive real-time updates on incoming/outgoing transactions
- Monitor balance changes
- Track token movements (trustlines)
```

**Available Stream Types:**
- Ledger updates (new ledger closes)
- Transaction streams (for specific conditions)
- Validation streams (network consensus)
- Account-specific streams

**Implementation:**
- Connect via WebSocket to XRPL node
- Send subscribe message with account address
- Receive real-time transaction notifications
- Parse meta.delivered_amount for payment details

---

## 6. ECOSYSTEM MONITORING TOOLS

### 6.1 Developer Resources

#### Official Documentation
**XRPL Dev Portal:** https://xrpl.org/

**Covered Topics:**
- Transaction and request documentation
- API method references
- WebSocket API documentation
- Tutorial: Monitor incoming payments with WebSocket
- Code examples

#### GitHub Resources

**XRPL-Labs/XrplTxData**
- Tool to fetch XRPL transaction by hash
- Includes metadata and balance tracking
- Awaits required transactions if not yet finalized

**XRPLF/xrpl.js**
- Official JavaScript/TypeScript library
- Comprehensive documentation
- Community examples (APPLICATIONS.md)

**XRPL-Go**
- Go client for WebSocket APIs
- For Go-based applications

#### Community Platforms
- XRPL Forums
- GitHub Discussions
- Developer documentation
- Tutorial guides

---

### 6.2 Integration Patterns

#### Common Monitoring Workflows

**1. Real-Time Payment Monitoring:**
```
Connect WebSocket → Subscribe to account → Monitor transactions
→ Parse payment details → Update application
```

**2. Historical Analysis:**
```
Query account_tx → Filter by date range → Analyze patterns
→ Generate reports
```

**3. Multi-Account Monitoring:**
```
Subscribe to multiple accounts → Aggregate streams
→ Cross-account analytics
```

**4. Token & NFT Tracking:**
```
Monitor trustlines → Track token balances → Analyze liquidity
→ Monitor NFT transfers
```

---

### 6.3 Watchlist and Dashboard Features

**Bithomp Watchlist:**
- Save frequently monitored addresses
- Organize by category
- Quick access to transaction history
- Automated updates

**XRPScan Features:**
- Rich list tracking
- Top token monitoring
- Network validator tracking
- Amendment progress tracking

---

## 7. COMPARATIVE ANALYSIS

### Wallet Type Comparison

| Feature | Xaman | Ledger | Trezor | SafePal |
|---------|-------|--------|--------|---------|
| **Type** | Software | Hardware | Hardware | Hardware |
| **Security** | Self-custodial | Cold storage | Cold storage | Air-gapped |
| **Ease of Use** | Easy | Moderate | Moderate | Easy |
| **Cost** | Free | $60-$150 | $80-$200 | $40-$60 |
| **Cross-Platform** | iOS/Android/Web | USB | USB | Mobile |
| **XRP Ecosystem Integration** | Native (xApps) | Via toolkit | Via suite | Via app |
| **Institutional Grade** | Good | Excellent | Excellent | Good |

---

### API Provider Comparison

| Provider | Real-Time | Historical | Cost | Use Case |
|----------|-----------|------------|------|----------|
| **XRPL.js** | ✓ WebSocket | ✓ API | Free | Development |
| **Xaman SDK** | ✓ Limited | ✗ | Free | xApp dev |
| **XRPScan API** | ✓ Limited | ✓ | Free/Paid | Analytics |
| **Bithomp API** | ✗ | ✓ | Free/Paid | Monitoring |
| **Blockchair** | Limited | ✓ | Free/Paid | Multi-chain |

---

### Transaction Monitoring Service Comparison

| Service | Real-Time | Historical | Analytics | Compliance | Cost |
|---------|-----------|------------|-----------|-----------|------|
| **Elliptic** | ✓ | ✓ | ✓ | ✓ | Enterprise |
| **Scorechain** | ✓ | ✓ | ✓ | ✓ | Enterprise |
| **CryptoQuant** | ✓ | ✓ | ✓ | Limited | Paid |
| **XRPScan** | ✓ | ✓ | ✓ | Limited | Free/Paid |
| **Bithomp** | Limited | ✓ | ✓ | Limited | Free/Paid |

---

## 8. IMPLEMENTATION RECOMMENDATIONS

### For Individual Users
1. **Short-term holding:** Use Xaman wallet
2. **Long-term storage:** Ledger Nano X or Trezor Safe 5
3. **Multi-wallet strategy:** Xaman + Hardware wallet

### For Businesses
1. **Real-time monitoring:** XRPL.js + WebSocket API
2. **Historical analysis:** XRPScan or Bithomp APIs
3. **Compliance:** Elliptic or Scorechain
4. **Multi-asset custody:** Ripple Custody platform

### For Developers
1. **Application development:** xrpl.js library
2. **xApp ecosystem:** Xaman SDK
3. **Custom monitoring:** XRPL WebSocket API
4. **Data analysis:** CryptoQuant or AWS datasets

### For Institutions
1. **Custody solution:** Ripple Custody (FIPS 140-2 L4 certified)
2. **Multi-sig setup:** XRPL multi-signature architecture
3. **Compliance monitoring:** Elliptic or Scorechain
4. **Transaction monitoring:** Enterprise analytics platforms

---

## 9. KEY RESOURCES & DOCUMENTATION

### Official Websites
- **XRPL Documentation:** https://xrpl.org/
- **Xaman Wallet:** https://xaman.app/
- **Ledger:** https://www.ledger.com/
- **Trezor:** https://trezor.io/

### Developer Resources
- **xrpl.js GitHub:** https://github.com/XRPLF/xrpl.js
- **xrpl.js Docs:** https://js.xrpl.org/
- **Bithomp API Docs:** https://docs.bithomp.com/
- **Xaman Developers:** https://xumm.app/developers

### Block Explorers
- **XRPScan:** https://xrpscan.com/
- **Bithomp:** https://bithomp.com/
- **XRPL Explorer:** https://livenet.xrpl.org/
- **Bitquery:** https://explorer.bitquery.io/ripple

### Analytics Platforms
- **CryptoQuant:** https://cryptoquant.com/
- **Scorechain:** https://www.scorechain.com/
- **AWS Datasets:** AWS console (blockchain datasets)

### Custody Solutions
- **Ripple Custody:** https://ripple.com/solutions/digital-asset-custody/
- **Standard Custody & Trust:** https://www.standardcustody.com/
- **XBTO:** https://www.xbto.com/

---

## 10. 2025 ECOSYSTEM HIGHLIGHTS

**Market Growth:**
- Xaman processed $6 billion in 2024 with only $510 in total fees
- 1.5+ million Xaman wallet users
- Daily active wallets averaging 50,000-70,000 (25% YoY growth)
- 317,500 wallets holding 10,000+ XRP (record high)
- 2,800+ active monthly developer contributors

**Development Trends:**
- Growing institutional custody adoption
- Multi-chain analytics expansion
- Enhanced compliance tooling
- xApp ecosystem expansion
- WebSocket API performance improvements

**Regulatory Environment:**
- Increasing compliance focus
- Multi-sig adoption by institutions
- Cold storage preferred for large holdings
- Custody platform standardization

---

## 11. SECURITY CONSIDERATIONS

### For Self-Custody
- Hardware wallet recommended for holdings over 100,000 XRP
- Multi-signature architecture for corporate accounts
- Cold storage for 80%+ of holdings
- Regular security audits

### For Institutional Custody
- FIPS 140-2 Level 4 certification minimum
- ISO 27001 compliance required
- SOC 2 Type II audit
- Regular penetration testing
- Multiple redundancy layers

### For API Integration
- Rate limiting implementation
- Key rotation policies
- Webhook verification
- Encrypted connections (TLS 1.3+)
- IP whitelisting

---

**Research Compiled:** November 17, 2025
**Last Updated:** November 17, 2025
**Information Accuracy:** Based on latest 2024-2025 data and documentation
