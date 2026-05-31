import { useState, useCallback } from 'react'
import { isAddress } from 'viem'
import { getAddressFromPrivate, getBalance, batchSend } from './transfer'
import type { TransferStatus } from './types'
import './App.css'

function App() {
  const [privateKey, setPrivateKey] = useState('')
  const [addresses, setAddresses] = useState('')
  const [amount, setAmount] = useState('0.01')
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<TransferStatus[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  const parsedAddresses = addresses
    .split('\n')
    .map((a) => a.trim())
    .filter((a) => a.length > 0)

  const validAddresses = parsedAddresses.filter((a) => isAddress(a))
  const invalidCount = parsedAddresses.length - validAddresses.length
  const totalUSDC = validAddresses.length > 0 ? (parseFloat(amount) * validAddresses.length).toFixed(4) : '0'

  const handleLoadWallet = useCallback(async () => {
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      alert('Invalid private key format (must be 0x-prefixed 32-byte hex)')
      return
    }
    try {
      const addr = getAddressFromPrivate(privateKey as `0x${string}`)
      setWalletAddress(addr)
      const bal = await getBalance(addr as `0x${string}`)
      setBalance(bal)
    } catch {
      alert('Failed to load wallet. Check your private key.')
    }
  }, [privateKey])

  const handleSend = useCallback(async () => {
    if (validAddresses.length === 0) {
      alert('No valid addresses found')
      return
    }
    if (parseFloat(amount) <= 0) {
      alert('Amount must be greater than 0')
      return
    }

    setLoading(true)
    setProgress(validAddresses.map((a) => ({ address: a, status: 'pending' })))

    try {
      await batchSend(
        privateKey as `0x${string}`,
        validAddresses,
        amount,
        (index, status) => {
          setProgress((prev) => {
            const next = [...prev]
            next[index] = status
            return next
          })
        },
      )
    } catch {
      // handled per-address
    } finally {
      setLoading(false)
      // refresh balance
      try {
        const addr = getAddressFromPrivate(privateKey as `0x${string}`)
        const bal = await getBalance(addr as `0x${string}`)
        setBalance(bal)
      } catch { /* ignore */ }
    }
  }, [privateKey, validAddresses, amount])

  const successCount = progress.filter((p) => p.status === 'success').length
  const errorCount = progress.filter((p) => p.status === 'error').length

  return (
    <div className="app">
      <header className="header">
        <h1>Arc Multi-Sender</h1>
        <p>Batch distribute USDC on Arc Testnet</p>
      </header>

      <main className="main">
        {/* Wallet Section */}
        <section className="card">
          <h2>Wallet</h2>
          <div className="input-group">
            <label>Private Key</label>
            <input
              type="password"
              placeholder="0x..."
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="input"
            />
            <button onClick={handleLoadWallet} className="btn btn-secondary" disabled={!privateKey}>
              Load Wallet
            </button>
          </div>
          {walletAddress && (
            <div className="info-row">
              <span>Address:</span>
              <span className="mono">{walletAddress}</span>
            </div>
          )}
          {balance !== null && (
            <div className="info-row">
              <span>Balance:</span>
              <span className="mono highlight">{parseFloat(balance).toFixed(4)} USDC</span>
            </div>
          )}
        </section>

        {/* Transfer Section */}
        <section className="card">
          <h2>Transfer</h2>
          <div className="input-group">
            <label>Amount per address (USDC)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
            />
          </div>
          <div className="input-group">
            <label>Recipient Addresses (one per line)</label>
            <textarea
              placeholder={"0x1234...\n0x5678...\n0xabcd..."}
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              className="textarea"
              rows={8}
            />
          </div>
          <div className="stats">
            <span>Valid: <strong>{validAddresses.length}</strong></span>
            {invalidCount > 0 && <span className="error-text">Invalid: {invalidCount}</span>}
            <span>Total: <strong>{totalUSDC} USDC</strong></span>
          </div>
          <button
            onClick={handleSend}
            className="btn btn-primary"
            disabled={loading || validAddresses.length === 0 || !privateKey}
          >
            {loading ? 'Sending...' : `Send ${totalUSDC} USDC to ${validAddresses.length} addresses`}
          </button>
        </section>

        {/* Progress Section */}
        {progress.length > 0 && (
          <section className="card">
            <h2>Progress</h2>
            <div className="stats">
              <span>Success: <strong className="success">{successCount}</strong></span>
              <span>Errors: <strong className="error-text">{errorCount}</strong></span>
              <span>Pending: <strong>{progress.length - successCount - errorCount}</strong></span>
            </div>
            <div className="progress-list">
              {progress.map((item, i) => (
                <div key={i} className={`progress-item ${item.status}`}>
                  <span className="status-icon">
                    {item.status === 'success' ? '✅' : item.status === 'error' ? '❌' : item.status === 'sending' ? '⏳' : '⬜'}
                  </span>
                  <span className="mono addr">{item.address.slice(0, 8)}...{item.address.slice(-6)}</span>
                  {item.txHash && (
                    <a
                      href={`https://testnet.arcscan.app/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      View ↗
                    </a>
                  )}
                  {item.error && <span className="error-text small">{item.error}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Built on <a href="https://docs.arc.io" target="_blank" rel="noopener noreferrer">Arc</a> | Chain ID: 5042002 | Gas: USDC</p>
      </footer>
    </div>
  )
}

export default App
