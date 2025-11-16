# XRP Wallet Monitoring: Technical Implementation Guide
## API Integration & Code Examples

---

## 1. XRPL.JS SETUP AND MONITORING

### 1.1 Installation and Basic Setup

```bash
npm install xrpl
# or
yarn add xrpl
```

### 1.2 Connecting to XRP Ledger

```typescript
import { Client } from "xrpl";

// Connect to mainnet
const client = new Client("wss://xrpl.ws");

// Or connect to testnet for development
const testnetClient = new Client("wss://testnet.xrpl.ws");

await client.connect();
```

### 1.3 Real-Time Account Monitoring via WebSocket

```typescript
import { Client } from "xrpl";

async function monitorAccount(address: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  // Subscribe to account activity
  await client.request({
    command: "subscribe",
    accounts: [address]
  });

  // Handle incoming messages
  client.on("transaction", (event) => {
    console.log("Transaction received:", event);

    if (event.transaction) {
      const tx = event.transaction;
      console.log(`
        Type: ${tx.TransactionType}
        Account: ${tx.Account}
        Destination: ${tx.Destination}
        Amount: ${tx.Amount}
        Fee: ${tx.Fee}
      `);
    }
  });

  // Keep connection alive
  process.on("SIGINT", async () => {
    await client.disconnect();
    process.exit(0);
  });
}

// Usage
monitorAccount("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

### 1.4 Query Account Transaction History

```typescript
import { Client } from "xrpl";

async function getTransactionHistory(
  address: string,
  limit: number = 100
) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_max: -1,
      ledger_index_min: -1,
      limit: limit
    });

    const transactions = response.result.transactions;

    for (const tx of transactions) {
      console.log(`
        Hash: ${tx.tx_json.hash}
        Type: ${tx.tx_json.TransactionType}
        Amount: ${tx.tx_json.Amount}
        Fee: ${tx.tx_json.Fee}
        Date: ${new Date((tx.tx_json.date + 946684800) * 1000)}
      `);
    }

    return transactions;
  } finally {
    await client.disconnect();
  }
}

// Usage
getTransactionHistory("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m", 50);
```

### 1.5 Get Account Information and Balances

```typescript
import { Client } from "xrpl";

async function getAccountInfo(address: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated"
    });

    const info = response.result.account_data;

    console.log(`
      Account: ${info.Account}
      Balance: ${info.Balance / 1_000_000} XRP
      Sequence: ${info.Sequence}
      Flags: ${info.Flags}
      Ledger Entry Count: ${info.OwnerCount}
      Reserve: ${info.OwnerCount * 5 + 20} XRP (calculated)
    `);

    return info;
  } finally {
    await client.disconnect();
  }
}

// Usage
getAccountInfo("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

### 1.6 Monitor Specific Transaction Types

```typescript
import { Client, LedgerEventFilter } from "xrpl";

async function monitorPaymentTransactions(watchAddress: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  // Subscribe to transactions
  await client.request({
    command: "subscribe",
    accounts: [watchAddress]
  });

  client.on("transaction", (event) => {
    if (!event.transaction) return;

    const tx = event.transaction;

    // Filter for Payment transactions
    if (tx.TransactionType === "Payment") {
      const deliveredAmount = event.meta?.delivered_amount;

      console.log(`
        ✓ Payment Received
        From: ${tx.Account}
        Amount: ${typeof deliveredAmount === "string"
          ? deliveredAmount / 1_000_000 + " XRP"
          : deliveredAmount
        }
        Hash: ${tx.hash}
      `);

      // Perform action (e.g., update database, send notification)
      handlePaymentReceived({
        from: tx.Account,
        amount: deliveredAmount,
        hash: tx.hash,
        timestamp: new Date()
      });
    }
  });

  process.on("SIGINT", async () => {
    await client.disconnect();
    process.exit(0);
  });
}

function handlePaymentReceived(payment: any) {
  // Custom logic here
  console.log("Processing payment:", payment);
}

// Usage
monitorPaymentTransactions("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

### 1.7 Monitor Multiple Accounts

```typescript
import { Client } from "xrpl";

async function monitorMultipleAccounts(addresses: string[]) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  // Subscribe to multiple accounts
  await client.request({
    command: "subscribe",
    accounts: addresses
  });

  const accountMap = new Map(
    addresses.map(addr => [addr, []])
  );

  client.on("transaction", (event) => {
    if (!event.transaction) return;

    const tx = event.transaction;
    const account = tx.Account;

    if (accountMap.has(account)) {
      const txList = accountMap.get(account) || [];
      txList.push({
        hash: tx.hash,
        type: tx.TransactionType,
        date: new Date((tx.date + 946684800) * 1000),
        amount: tx.Amount
      });

      console.log(`[${account}] Transaction: ${tx.TransactionType}`);
    }
  });

  process.on("SIGINT", async () => {
    // Summary report
    for (const [addr, txs] of accountMap) {
      console.log(`\n${addr}: ${txs.length} transactions`);
    }

    await client.disconnect();
    process.exit(0);
  });
}

// Usage
const addresses = [
  "rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m",
  "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY"
];
monitorMultipleAccounts(addresses);
```

---

## 2. TRUST LINES AND TOKEN MONITORING

### 2.1 Get Account Token Balances

```typescript
import { Client } from "xrpl";

async function getTokenBalances(address: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_lines",
      account: address,
      ledger_index: "validated"
    });

    const lines = response.result.lines;

    console.log(`Tokens held by ${address}:\n`);

    for (const line of lines) {
      console.log(`
        Currency: ${line.currency}
        Issuer: ${line.account}
        Balance: ${line.balance}
        Limit: ${line.limit}
        Freeze Status: ${line.freeze ? "Frozen" : "Active"}
      `);
    }

    return lines;
  } finally {
    await client.disconnect();
  }
}

// Usage
getTokenBalances("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

### 2.2 Monitor Token Transfer Events

```typescript
import { Client } from "xrpl";

async function monitorTokenTransfers(address: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  await client.request({
    command: "subscribe",
    accounts: [address]
  });

  client.on("transaction", (event) => {
    if (!event.transaction) return;

    const tx = event.transaction;

    // Monitor Payment transactions with non-XRP amounts
    if (
      tx.TransactionType === "Payment" &&
      typeof tx.Amount !== "string"
    ) {
      const amount = tx.Amount as any;
      console.log(`
        ✓ Token Transfer
        Currency: ${amount.currency}
        Issuer: ${amount.issuer}
        Amount: ${amount.value}
        From: ${tx.Account}
      `);
    }
  });

  process.on("SIGINT", async () => {
    await client.disconnect();
    process.exit(0);
  });
}

// Usage
monitorTokenTransfers("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

---

## 3. BITHOMP API INTEGRATION

### 3.1 Query Address Information

```typescript
interface BithompAddress {
  account: string;
  balance: string;
  accountSequence: number;
  ownerCount: number;
  previousTxnID: string;
  previousTxnLgrSeq: number;
  ledgerEntryType: string;
  ledgerIndex: number;
}

async function getBithompAddressInfo(
  address: string
): Promise<BithompAddress> {
  const response = await fetch(
    `https://api.bithomp.com/v2/${address}/info`
  );
  const data = await response.json();
  return data;
}

// Usage
const info = await getBithompAddressInfo(
  "rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m"
);
console.log(info);
```

### 3.2 Get Token Information

```typescript
interface TokenInfo {
  issuer: string;
  currency: string;
  amount: string;
  holders: number;
  volume24h: string;
  price: string;
  marketCap: string;
}

async function getTokenInfo(
  issuer: string,
  currency: string
): Promise<TokenInfo> {
  const response = await fetch(
    `https://api.bithomp.com/v2/tokens/${issuer}/${currency}`
  );
  const data = await response.json();
  return data;
}

// Usage
const tokenInfo = await getTokenInfo(
  "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  "USD"
);
console.log(tokenInfo);
```

### 3.3 Monitor Address via Bithomp (Paid Plan)

```typescript
async function getAddressTransactionHistory(
  address: string,
  limit: number = 100,
  apiKey: string
): Promise<any[]> {
  const response = await fetch(
    `https://api.bithomp.com/v2/${address}/transactions?limit=${limit}`,
    {
      headers: {
        "X-API-Key": apiKey
      }
    }
  );
  const data = await response.json();
  return data.transactions;
}

// Usage (requires paid API key)
// const txs = await getAddressTransactionHistory(
//   "rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m",
//   50,
//   "your-api-key"
// );
```

---

## 4. XAMAN SDK INTEGRATION

### 4.1 Setup and Authentication

```typescript
import { XummSdk } from "xumm-sdk";

const xumm = new XummSdk({
  apiKey: "your-xumm-api-key",
  apiSecret: "your-xumm-api-secret"
});

// Verify connection
const pong = await xumm.ping();
console.log("Xumm API Status:", pong.pong);
```

### 4.2 Create Signing Request (Payload)

```typescript
async function createPaymentRequest(
  destinationAddress: string,
  amountXrp: number
) {
  const payload = await xumm.payload?.create({
    TransactionType: "Payment",
    Destination: destinationAddress,
    Amount: String(amountXrp * 1_000_000), // Convert to drops
    Account: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY" // Your account
  });

  if (payload?.success) {
    console.log("Payment request created:");
    console.log(`QR Code: ${payload.result.qr_png}`);
    console.log(`Link: ${payload.result.next.always}`);

    // Poll for signature
    await pollForSignature(payload.result.uuid);
  }
}

async function pollForSignature(uuid: string) {
  let signed = false;
  let attempts = 0;

  while (!signed && attempts < 60) {
    const status = await xumm.payload?.get(uuid);

    if (status?.result.signed) {
      console.log("Payload signed!");
      signed = true;
    } else if (status?.result.expired) {
      console.log("Payload expired");
      break;
    }

    attempts++;
    await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
  }
}

// Usage
createPaymentRequest("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m", 10);
```

---

## 5. MULTI-SIGNATURE TRANSACTION MONITORING

### 5.1 Monitor Multi-Sig Transaction Status

```typescript
import { Client } from "xrpl";

async function monitorMultiSigTransaction(txHash: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "tx",
      transaction: txHash,
      binary: false
    });

    const tx = response.result;

    console.log(`
      Multi-Sig Transaction Details:
      Status: ${tx.meta.TransactionResult}
      Signers: ${tx.SigningPubKey ? "Single-signed" : "Multi-signed"}
      Account: ${tx.Account}
      Type: ${tx.TransactionType}
    `);

    if (tx.Signers) {
      console.log(`Signers (${tx.Signers.length}):`);
      for (const signer of tx.Signers) {
        console.log(`  - ${signer.Signer.Account}`);
      }
    }

    return tx;
  } finally {
    await client.disconnect();
  }
}

// Usage
monitorMultiSigTransaction(
  "E3FE6EA123D4BFF9B34CCAF8DA40D8834C2BA06E7B6B3EBF94BBA85D42CEF8AC"
);
```

### 5.2 Validate Multi-Sig Requirements

```typescript
import { Client } from "xrpl";

async function checkMultiSigningRequirements(address: string) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_info",
      account: address
    });

    const account = response.result.account_data;
    const signingPublicKey = account.SigningPubKey;

    console.log(`
      ${address} Configuration:
      Has Multi-Sig: ${signingPublicKey === "" ? "Yes" : "No"}
      Owner Count: ${account.OwnerCount || 0}
    `);

    // Get SignerList for multi-sig accounts
    if (!signingPublicKey || signingPublicKey === "") {
      const signerListResponse = await client.request({
        command: "account_objects",
        account: address,
        type: "signerlist"
      });

      const signerList = signerListResponse.result.account_objects[0];
      if (signerList) {
        console.log(`
          SignerQuorum: ${signerList.SignerQuorum}
          Signers: ${signerList.SignerEntries.length}
        `);
      }
    }

    return account;
  } finally {
    await client.disconnect();
  }
}

// Usage
checkMultiSigningRequirements("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

---

## 6. ANALYTICS AND REPORTING

### 6.1 Build Transaction Summary Report

```typescript
import { Client } from "xrpl";

interface TransactionSummary {
  totalTransactions: number;
  totalReceived: number;
  totalSent: number;
  uniqueCounterparties: Set<string>;
  transactionsByType: Map<string, number>;
  dateRange: { from: Date; to: Date };
}

async function generateTransactionReport(
  address: string,
  limit: number = 1000
): Promise<TransactionSummary> {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_tx",
      account: address,
      limit: limit
    });

    const transactions = response.result.transactions;
    const summary: TransactionSummary = {
      totalTransactions: transactions.length,
      totalReceived: 0,
      totalSent: 0,
      uniqueCounterparties: new Set(),
      transactionsByType: new Map(),
      dateRange: {
        from: new Date(),
        to: new Date()
      }
    };

    for (const tx of transactions) {
      const txObj = tx.tx_json;

      // Count by type
      const type = txObj.TransactionType;
      summary.transactionsByType.set(
        type,
        (summary.transactionsByType.get(type) || 0) + 1
      );

      // Track counterparties and amounts
      if (txObj.TransactionType === "Payment") {
        const amount = typeof txObj.Amount === "string"
          ? parseInt(txObj.Amount) / 1_000_000
          : parseFloat(txObj.Amount.value);

        if (txObj.Destination === address) {
          summary.totalReceived += amount;
          summary.uniqueCounterparties.add(txObj.Account);
        } else {
          summary.totalSent += amount;
          summary.uniqueCounterparties.add(txObj.Destination);
        }
      }

      // Update date range
      const txDate = new Date((txObj.date + 946684800) * 1000);
      if (txDate < summary.dateRange.from) {
        summary.dateRange.from = txDate;
      }
      if (txDate > summary.dateRange.to) {
        summary.dateRange.to = txDate;
      }
    }

    return summary;
  } finally {
    await client.disconnect();
  }
}

// Usage and Report Generation
async function printTransactionReport(address: string) {
  const summary = await generateTransactionReport(address);

  console.log(`
    ═══════════════════════════════════
    TRANSACTION SUMMARY REPORT
    Account: ${address}
    ═══════════════════════════════════

    Total Transactions: ${summary.totalTransactions}
    Total Received: ${summary.totalReceived} XRP
    Total Sent: ${summary.totalSent} XRP
    Net Flow: ${summary.totalReceived - summary.totalSent} XRP
    Unique Counterparties: ${summary.uniqueCounterparties.size}

    Date Range: ${summary.dateRange.from.toISOString()} to ${summary.dateRange.to.toISOString()}

    Transactions by Type:
  `);

  for (const [type, count] of summary.transactionsByType) {
    console.log(`    ${type}: ${count}`);
  }
}

printTransactionReport("rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m");
```

### 6.2 Export Transaction Data to CSV

```typescript
import { Client } from "xrpl";
import { writeFileSync } from "fs";

async function exportTransactionsToCSV(
  address: string,
  filename: string,
  limit: number = 1000
) {
  const client = new Client("wss://xrpl.ws");
  await client.connect();

  try {
    const response = await client.request({
      command: "account_tx",
      account: address,
      limit: limit
    });

    const transactions = response.result.transactions;

    // Build CSV header
    let csv = "Hash,Date,Type,From,To,Amount,Fee,Status\n";

    // Add rows
    for (const tx of transactions) {
      const txObj = tx.tx_json;
      const date = new Date((txObj.date + 946684800) * 1000)
        .toISOString();

      let amount = "N/A";
      if (typeof txObj.Amount === "string") {
        amount = (parseInt(txObj.Amount) / 1_000_000).toString();
      } else if (txObj.Amount) {
        amount = txObj.Amount.value || "N/A";
      }

      const fee = (parseInt(txObj.Fee || "0") / 1_000_000).toString();
      const status = tx.meta?.TransactionResult || "Unknown";

      csv += `"${txObj.hash}","${date}","${txObj.TransactionType}","${txObj.Account}","${txObj.Destination || "N/A"}","${amount}","${fee}","${status}"\n`;
    }

    writeFileSync(filename, csv);
    console.log(`✓ Transactions exported to ${filename}`);
  } finally {
    await client.disconnect();
  }
}

// Usage
exportTransactionsToCSV(
  "rN7n7otQDd6FczFgLdlqtyMVrT6v4Eq11m",
  "transactions.csv"
);
```

---

## 7. ERROR HANDLING AND BEST PRACTICES

### 7.1 Robust Connection Management

```typescript
import { Client } from "xrpl";

class RobustXRPLClient {
  private client: Client;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(url: string = "wss://xrpl.ws") {
    this.client = new Client(url);
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.client.on("error", (error) => {
      console.error("XRPL Client Error:", error);
      this.handleReconnect();
    });

    this.client.on("disconnected", () => {
      console.log("Disconnected from XRPL");
      this.handleReconnect();
    });
  }

  private async handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      await new Promise(r => setTimeout(r, delay));

      try {
        await this.client.connect();
        console.log("Reconnected successfully");
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    }
  }

  async request(command: any) {
    try {
      return await this.client.request(command);
    } catch (error) {
      console.error("Request failed:", error);
      throw error;
    }
  }

  async disconnect() {
    await this.client.disconnect();
  }
}

// Usage
const client = new RobustXRPLClient();
// ... use client for monitoring
```

### 7.2 Rate Limiting

```typescript
class RateLimitedXRPL {
  private requestCount = 0;
  private lastReset = Date.now();
  private readonly maxRequests = 100; // Adjust based on your plan
  private readonly resetInterval = 10000; // 10 seconds

  async request(client: Client, command: any) {
    const now = Date.now();

    // Reset counter if interval has passed
    if (now - this.lastReset > this.resetInterval) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    // Check rate limit
    if (this.requestCount >= this.maxRequests) {
      const waitTime = this.resetInterval - (now - this.lastReset);
      console.log(`Rate limited. Waiting ${waitTime}ms...`);
      await new Promise(r => setTimeout(r, waitTime));
      return this.request(client, command); // Retry
    }

    this.requestCount++;
    return await client.request(command);
  }
}
```

---

## 8. DEPLOYMENT CONSIDERATIONS

### 8.1 Production Environment Variables

```typescript
// .env.example
XRPL_ENDPOINT=wss://xrpl.ws
XAMAN_API_KEY=your_key
XAMAN_API_SECRET=your_secret
BITHOMP_API_KEY=your_key
MONITORED_ADDRESSES=address1,address2,address3
LOG_LEVEL=info
ALERT_EMAIL=ops@example.com
```

### 8.2 Monitoring Stack

```typescript
// Recommended setup for production
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname"
    }
  }
});

// Use logger throughout your application
logger.info("Starting XRP monitoring service");
logger.warn("Address transaction limit approaching");
logger.error("Failed to connect to XRPL", { error: err });
```

---

**Implementation Guide Compiled:** November 17, 2025
**TypeScript Version:** 5.0+
**Node.js Minimum:** 16.x
