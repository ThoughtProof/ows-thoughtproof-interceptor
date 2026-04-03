import { fetch } from 'cross-fetch';

/**
 * ThoughtProof Interceptor for the Open Wallet Standard (OWS)
 */

export interface OWSWallet {
    signTransaction: (tx: any) => Promise<string>;
    sendTransaction: (tx: any) => Promise<string>;
    getAddress: () => Promise<string>;
}

export interface ThoughtProofConfig {
    apiKey: string;
    failClosed?: boolean; // Default true: Block tx if verification fails/timeouts
}

export class ThoughtProofOWSInterceptor implements OWSWallet {
    private wallet: OWSWallet;
    private config: ThoughtProofConfig;
    private tpEndpoint = 'https://thoughtproof-api.vercel.app/v1/check';

    constructor(wallet: OWSWallet, config: ThoughtProofConfig) {
        this.wallet = wallet;
        this.config = {
            failClosed: true,
            ...config
        };
    }

    async getAddress() {
        return this.wallet.getAddress();
    }

    private async verifyWithThoughtProof(tx: any): Promise<void> {
        console.log(`[ThoughtProof] Requesting multi-model verification for transaction...`);
        
        try {
            const response = await fetch(this.tpEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    claim: `Agent requesting transaction to ${tx.to} with data ${tx.data || '0x'}`,
                    speed: 'fast'
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();

            if (result.verdict === 'BLOCK') {
                console.error(`[ThoughtProof] 🚨 TRANSACTION BLOCKED!`);
                console.error(`[ThoughtProof] Reason: ${result.objections?.[0]?.description || 'Failed security consensus'}`);
                throw new Error(`ThoughtProof Security Block: ${result.objections?.[0]?.description}`);
            }

            console.log(`[ThoughtProof] ✅ Transaction APPROVED by consensus.`);
        } catch (err: any) {
            if (err.message.includes('ThoughtProof Security Block')) {
                throw err; // Always re-throw actual security blocks
            }
            
            console.error(`[ThoughtProof] Verification service error: ${err.message}`);
            
            if (this.config.failClosed) {
                throw new Error(`ThoughtProof Fail-Closed: Could not verify transaction safety. Blocking signature.`);
            } else {
                console.warn(`[ThoughtProof] Warning: Proceeding without verification (failClosed = false)`);
            }
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
