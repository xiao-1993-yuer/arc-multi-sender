import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arcTestnet } from './arc'
import type { TransferStatus } from './types'

const RPC_URL = 'https://rpc.testnet.arc.network'

export function getPublicClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(RPC_URL),
  })
}

export function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey)
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  })
}

export function getAddressFromPrivate(privateKey: `0x${string}`) {
  return privateKeyToAccount(privateKey).address
}

export async function getBalance(address: `0x${string}`) {
  const client = getPublicClient()
  const balance = await client.getBalance({ address })
  return formatUnits(balance, 18)
}

export async function sendUSDC(
  privateKey: `0x${string}`,
  toAddress: `0x${string}`,
  amountUSDC: string,
): Promise<{ txHash: string }> {
  const walletClient = getWalletClient(privateKey)
  const account = privateKeyToAccount(privateKey)

  const value = parseUnits(amountUSDC, 18)

  const txHash = await walletClient.sendTransaction({
    account,
    to: toAddress,
    value,
    chain: arcTestnet,
  })

  return { txHash }
}

export async function batchSend(
  privateKey: `0x${string}`,
  addresses: string[],
  amountPerAddr: string,
  onProgress: (index: number, status: TransferStatus) => void,
): Promise<TransferStatus[]> {
  const results: TransferStatus[] = addresses.map((addr) => ({
    address: addr,
    status: 'pending',
  }))

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i] as `0x${string}`

    onProgress(i, { address: addr, status: 'sending' })

    try {
      const { txHash } = await sendUSDC(privateKey, addr, amountPerAddr)
      results[i] = { address: addr, status: 'success', txHash }
      onProgress(i, results[i])
    } catch (err: any) {
      results[i] = {
        address: addr,
        status: 'error',
        error: err?.shortMessage || err?.message || 'Unknown error',
      }
      onProgress(i, results[i])
    }

    // small delay between transactions
    if (i < addresses.length - 1) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return results
}
