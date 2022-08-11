import { Action, setupWalletSelector, WalletSelector, WalletSelectorState } from "@near-wallet-selector/core";
import { BrowserWalletSignAndSendTransactionParams } from "@near-wallet-selector/core/lib/wallet";
import { setupModal, WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { utils } from "near-api-js";
import { JsonRpcProvider } from "near-api-js/lib/providers";

let walletSelector: WalletSelector
let modal: WalletSelectorModal
let walletState: WalletSelectorState

const CONTRACT: string = "meta-v2.pool.testnet"
const NODE_URL: string = "https://rpc.testnet.near.org"

window.onload = async function() {
    walletSelector = await setupWalletSelector({
        network: "testnet",
        modules: [
          setupMyNearWallet(),
        ],
    });
      
    modal = setupModal(walletSelector, {
        contractId: CONTRACT
    });

    walletState = walletSelector.store.getState()

    const loginButton = document.getElementById("login")!
    const stakeButton = document.getElementById("stake")!
    

    if(walletSelector.isSignedIn()) {
        const accountId = walletState.accounts.find((account: any) => account.active)?.accountId!;

        const nearElement = document.getElementById("n_balance")!
        const stNearElement = document.getElementById("st_balance")!

        const nearBalance = await getAccountBalance()
        const accountInfo = await viewWithoutAccount("get_account_info", {"account_id":`${accountId}`})
        
        nearElement.innerHTML = utils.format.formatNearAmount(nearBalance)
        stNearElement.innerHTML = utils.format.formatNearAmount(accountInfo.st_near)
    }

    loginButton.addEventListener("click", function(event: Event) {
        try {
            event.preventDefault()

            modal.show()
        } catch(err) {
            console.error(err)
        }
    })

    stakeButton.addEventListener("click", async function(event: Event) {
        try {
            event.preventDefault()

            if(!walletSelector.isSignedIn()) {
                alert("You are not connected")
            }

            
            const accountId = walletState.accounts.find((account: any) => account.active)?.accountId!;
            const wallet = await walletSelector.wallet()
            const action: Action[] = [
              {
                type: "FunctionCall",
                params: {
                  methodName: "deposit_and_stake",
                  args: {},
                  gas: "50 000 000 000 000".replace(/\s/g, ""),
                  deposit: "1 000 000 000 000 000 000 000 000".replace(/\s/g, ""),
                },
              },
            ]
            
            const params: BrowserWalletSignAndSendTransactionParams = {
              signerId: accountId!,
              receiverId: CONTRACT,
              actions: action,
            }
            
            wallet.signAndSendTransaction(params)
            
            // if (!this.wallet) throw Error(`contract-proxy not connected ${this.contractId} trying to call ${method}`)
            // return this.wallet.call(this.contractId, method, args, gas, attachedYoctos)
        } catch(err) {
            alert(err)
            console.error(err)
        }
    })



}

async function viewWithoutAccount(method: string, args: any = {}): Promise<any> {
    try {
        const argsAsString = JSON.stringify(args)
        let argsBase64 = Buffer.from(argsAsString).toString("base64")
        const provider = new JsonRpcProvider(NODE_URL)
        const rawResult = await provider.query({
            request_type: "call_function",
            account_id: CONTRACT,
            method_name: method,
            args_base64: argsBase64,
            finality: "optimistic",
        });
    
        // format result
        const res = JSON.parse(Buffer.from(rawResult.result).toString());
        return res
    } catch(err) {
        console.error(`Error calling function ${method} from contract ${CONTRACT} with params ${JSON.stringify(args)}`, err)
    }
    
}

async function getAccountBalance(accountId?:string):Promise<string> {
    if(!accountId) {
        accountId = walletState.accounts.find((account: any) => account.active)?.accountId!;
    }
    const body = `
        {
            "jsonrpc": "2.0",
            "id": "dontcare",
            "method": "query",
            "params": {
                "request_type": "view_account",
                "finality": "final",
                "account_id": "${accountId}"
            }
        }`
    
    const result = await fetch(
        NODE_URL,
        {
            method: "POST",
            body,
            headers: {
                'Content-Type': 'application/json'
            },
        }
    )
    const resultJson = await result.json()
    return resultJson.result.amount as string
    
    // const data = await this.walletConnection.account().getAccountBalance();
    // return data.total;
}