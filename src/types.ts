export interface TransferStatus {
  address: string
  status: 'pending' | 'sending' | 'success' | 'error'
  txHash?: string
  error?: string
}
