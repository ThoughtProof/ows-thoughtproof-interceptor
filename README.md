# ThoughtProof OWS Interceptor 🛡️

**Built for the Open Wallet Standard (OWS) Hackathon**

Agents sign recklessly. They hold keys via OWS, but lack the context to know if the contract they are interacting with is a honeypot, if the slippage is too high, or if the action violates their alignment.

The **ThoughtProof OWS Interceptor** is a drop-in middleware for any OWS-compliant wallet. It connects the unified local storage format of OWS with the decentralized reasoning consensus of [ThoughtProof](https://thoughtproof.ai/).

## How it works

Before an agent can sign or send a transaction using their OWS Vault, the Interceptor intercepts the payload and requests an asynchronous verification from ThoughtProof's multi-model consensus layer (ERC-8183 / ERC-8210 compatible).

1. Agent calls `wallet.signTransaction(tx)`
2. Interceptor pauses execution and sends `tx` context to ThoughtProof
3. ThoughtProof evaluates the transaction (using LLMs, Slither, etc.)
4. If `verdict === 'BLOCK'`, the signature is cryptographically denied and the agent receives an Error with the objection.
5. If `verdict === 'APPROVE'`, the OWS wallet proceeds with signing.

## "Show, Don't Tell" - Example

```typescript
import { ThoughtProofOWSInterceptor } from 'ows-thoughtproof-interceptor';
import { getOWSWallet } from '@open-wallet-standard/core';

// 1. Get standard OWS wallet
const rawWallet = await getOWSWallet();

// 2. Wrap it with ThoughtProof Security
const secureWallet = new ThoughtProofOWSInterceptor(rawWallet);

// 3. Agent tries to buy a known rugpull token
try {
    await secureWallet.sendTransaction({
        to: "0xScamContract...",
        data: "0x..." 
    });
} catch (e) {
    // 🚨 ThoughtProof Security Block: High probability of rugpull detected by 2/3 models.
    console.error(e);
}
```

## Why this matters for OWS
OWS solves the *key management* problem (one vault, every chain). 
ThoughtProof solves the *key usage* problem (don't sign bad transactions). 
Together, they make autonomous agents enterprise-ready.
