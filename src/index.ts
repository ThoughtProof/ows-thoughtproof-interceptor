import { fetch } from 'cross-fetch';

/**
 * ThoughtProof Interceptor for the Open Wallet Standard (OWS)
 * 
 * This middleware wraps an OWS-compliant wallet. Before the wallet signs
 * a transaction, it sends the calldata to ThoughtProof's Verification Layer.
 * If the multi-model consensus returns "BLOCK" (e.g., high slippage, known rugpull),
 * the signature is denied, protecting the agent's funds.
 */

export interface OWSWallet {
    signTransaction: (tx: any) => Promise<string>;
    sendTransaction: (tx: any) => Promise<string>;
    getAddress: () => Promise<string>;
}

export class ThoughtProofOWSInterceptor implements OWSWallet {
    private wallet: OWSWallet;
    private tpEndpoint = 'https://thoughtproof-api.vercel.app/v1/check';

    constructor(wallet: OWSWallet) {
        this.wallet = wallet;
    }

    async getAddress() {
        return this.wallet.getAddress();
    }

    private async verifyWithThoughtProof(tx: any): Promise<void> {
        console.log(`[ThoughtProof] Requesting multi-model verification for transaction...`);
        
        try {
            const response = await fetch(this.tpEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claim: `Agent requesting transaction to ${tx.to} with data ${tx.data || '0x'}`,
                    speed: 'fast'
                })
            });

            const result = await response.json();

            if (result.verdict === 'BLOCK') {
                console.error(`[ThoughtProof] 🚨 TRANSACTION BLOCKED!`);
                console.error(`[ThoughtProof] Reason: ${result.objections?.[0]?.description || 'Failed security consensus'}`);
                throw new Error(`ThoughtProof Security Block: ${result.objections?.[0]?.description}`);
            }

            console.log(`[ThoughtProof] ✅ Transaction APPROVED by consensus.`);
        } catch (err: any) {
            if (err.message.includes('ThoughtProof Security Block')) {
                throw err;
            }
            console.warn(`[ThoughtProof] Verification service unreachable. Proceeding with caution.`);
        }
    }

    async signTransaction(tx: any): Promise<string> {
        await this.verifyWithThoughtProof(tx);
        return this.wallet.signTransaction(tx);
    }

    async sendTransaction(tx: any): Promise<string> {
        await this.verifyWithThoughtProof(tx);
        return this.wallet.sendTransaction(tx);
    }
}
