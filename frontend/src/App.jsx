import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import './App.css'
import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from './config'
import { initFhevm, decryptUint32, decryptWithProof, setFhevmInstance as setModuleFhevmInstance } from './fhevm'
import DailyCheckInABI from './DailyCheckIn.abi.json'

function App() {
  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()

  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [fhevmInstance, setFhevmInstance] = useState(null)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [checkedDays, setCheckedDays] = useState(new Set())
  const [isTodayChecked, setIsTodayChecked] = useState(false)
  const [canCheckIn, setCanCheckIn] = useState(false)
  const [lastCheckInTime, setLastCheckInTime] = useState(0)
  const [lastClaimedDay, setLastClaimedDay] = useState(0)
  const [nextCheckInTime, setNextCheckInTime] = useState(0)
  const [recentActivity, setRecentActivity] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptedDays, setDecryptedDays] = useState(null)
  const [status, setStatus] = useState('')
  const [today] = useState(new Date())
  const prevChainIdRef = useRef(null)

  // Get current month information
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Initialize Provider, Signer, Contract and FHEVM when wallet connects
  useEffect(() => {
    if (!isConnected || !address || !walletClient) {
      setProvider(null)
      setSigner(null)
      setContract(null)
      setFhevmInstance(null)
      return
    }

    const initializeWallet = async () => {
      try {
        setIsLoading(true)
        setStatus('Initializing wallet connection...')

        // Detect the correct provider based on connected wallet
        // OKX wallet uses window.okxwallet, MetaMask uses window.ethereum
        let ethereumProvider = null
        
        // Check walletClient to determine which wallet is connected
        const walletName = walletClient?.name?.toLowerCase() || ''
        const walletId = walletClient?.id?.toLowerCase() || ''
        const win = window
        
        console.log('[Wallet] Detecting provider', { walletName, walletId, hasOkx: !!win.okxwallet, hasEthereum: !!win.ethereum })
        
        // Check for OKX wallet first (if OKX is connected or available)
        // OKX wallet provider can be at window.okxwallet.ethereum or window.okxwallet
        if (walletName.includes('okx') || walletId.includes('okx') || win.okxwallet) {
          // Try window.okxwallet.ethereum first (most common)
          if (win.okxwallet?.ethereum) {
            ethereumProvider = win.okxwallet.ethereum
            console.log('[Wallet] Using OKX wallet provider (okxwallet.ethereum)')
          } 
          // Fallback to window.okxwallet directly
          else if (win.okxwallet) {
            ethereumProvider = win.okxwallet
            console.log('[Wallet] Using OKX wallet provider (okxwallet)')
          }
        }
        
        // Fallback to MetaMask or other injected wallets
        if (!ethereumProvider && win.ethereum) {
          ethereumProvider = win.ethereum
          console.log('[Wallet] Using window.ethereum provider')
        }
        
        if (!ethereumProvider) {
          throw new Error('No ethereum provider found. Please install MetaMask or OKX wallet.')
        }

        // Create BrowserProvider and Signer
        const newProvider = new BrowserProvider(ethereumProvider)
        
        // Check if user rejected the connection request
        let newSigner
        try {
          newSigner = await newProvider.getSigner()
        } catch (signerError) {
          // Handle user rejection or connection errors
          if (signerError?.code === 4001 || signerError?.message?.includes('rejected') || signerError?.message?.includes('User rejected')) {
            setStatus('⚠️ Connection rejected. Please try connecting again.')
            setIsLoading(false)
            return
          }
          // Handle "could not coalesce" error (multiple pending requests)
          if (signerError?.code === -32002 || signerError?.message?.includes('coalesce')) {
            setStatus('⚠️ Please wait for the previous connection request to complete.')
            setIsLoading(false)
            return
          }
          throw signerError
        }

        setProvider(newProvider)
        setSigner(newSigner)

        // Initialize contract
        const contractInstance = new Contract(CONTRACT_ADDRESS, DailyCheckInABI, newSigner)
        setContract(contractInstance)

        setStatus('Wallet connected! Initializing FHEVM...')

        // Initialize FHEVM after wallet connection (pass the correct provider)
        try {
          const instance = await initFhevm(ethereumProvider)
          setFhevmInstance(instance)

          // Also set in fhevm.js module
          setModuleFhevmInstance(instance)

          console.log('FHEVM initialized successfully')
          setStatus('✅ Wallet connected and FHEVM initialized!')
        } catch (fhevmError) {
          console.error('Failed to initialize FHEVM:', fhevmError)
          setStatus('⚠️ Wallet connected but FHEVM initialization failed. Decryption may not work.')
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error)
        
        // Better error messages for common errors
        if (error?.code === 4001 || error?.message?.includes('rejected') || error?.message?.includes('User rejected')) {
          setStatus('⚠️ Connection rejected. Please try connecting again.')
        } else if (error?.code === -32002 || error?.message?.includes('coalesce')) {
          setStatus('⚠️ Please wait for the previous connection request to complete.')
        } else {
          setStatus(`Failed to initialize wallet: ${error.message || 'Unknown error'}`)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeWallet()
  }, [isConnected, address, walletClient])

  // Check if user can check in
  const checkCanCheckIn = useCallback(async () => {
    if (!contract || !address) return

    try {
      const canCheck = await contract.canCheckIn(address)
      const lastTime = await contract.getUserLastCheckInTime(address)
      const nextTime = await contract.getNextCheckInTime(address)
      const lastClaimed = await contract.getUserLastClaimedDay(address)

      setCanCheckIn(canCheck)
      setLastCheckInTime(Number(lastTime))
      setNextCheckInTime(Number(nextTime))
      setLastClaimedDay(Number(lastClaimed))
      setIsTodayChecked(!canCheck && lastTime > 0)

      // Don't update calendar or streak - user needs to decrypt first
      // Calendar will only update after decryption
    } catch (error) {
      console.error('Failed to check check-in status:', error)
    }
  }, [contract, address, today])

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!contract || !address) return

    try {
      await checkCanCheckIn()
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }, [contract, address, checkCanCheckIn])

  // Handle check-in
  const handleCheckIn = async () => {
    if (!contract || !canCheckIn) {
      setStatus('Cannot check in. Please wait for cooldown period.')
      return
    }

    try {
      setIsLoading(true)
      setStatus('Submitting check-in transaction...')

      const tx = await contract.checkIn()
      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}..., waiting for confirmation...`)

      const receipt = await tx.wait()

      setStatus('✅ Check-in successful!')
      setIsTodayChecked(true)
      setCanCheckIn(false)

      // Don't update calendar - user needs to decrypt first to see check-in days

      // Add activity record
      const now = new Date()
      const newActivity = {
        id: Date.now(),
        type: 'checkin',
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        txHash: receipt.hash
      }
      setRecentActivity(prev => [newActivity, ...prev])

      // Reload data
      await loadUserData()

      // Prompt to decrypt to see check-in days
      setStatus('✅ Check-in successful! Your check-in is encrypted. Click "Decrypt Days" to view your progress.')
    } catch (error) {
      console.error('Check-in failed:', error)
      setStatus(`❌ Check-in failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle decrypt
  const handleDecrypt = async () => {
    if (!contract || !address || !signer) {
      setStatus('Please connect wallet first')
      return
    }

    if (!fhevmInstance) {
      setStatus('FHEVM not initialized. Please reconnect your wallet.')
      return
    }

    try {
      setIsDecrypting(true)
      setStatus('Decrypting check-in days... (please sign the message)')

      // Get encrypted days handle
      const encryptedDays = await contract.getUserEncryptedDays(address)
      console.log('Encrypted days handle:', encryptedDays)

      // Decrypt using FHEVM SDK
      const decrypted = await decryptUint32(encryptedDays, CONTRACT_ADDRESS, signer)

      setDecryptedDays(Number(decrypted))
      setCurrentStreak(Number(decrypted))

      // Update calendar with decrypted check-in history
      const newCheckedDays = new Set()
      const daysNum = Number(decrypted)

      // Mark the last 'daysNum' days as checked in calendar
      for (let i = 0; i < daysNum; i++) {
        const checkDate = new Date()
        checkDate.setDate(checkDate.getDate() - i)
        newCheckedDays.add(checkDate.toDateString())
      }
      setCheckedDays(newCheckedDays)

      setStatus(`✅ Decryption successful! You have checked in ${decrypted} consecutive days.`)

      // Check if user can claim reward
      if (daysNum > 0 && daysNum % 2 === 1 && daysNum > lastClaimedDay) {
        setStatus(`🎁 Congratulations! You can claim reward for day ${daysNum}!`)

        // Add reward activity
        const now = new Date()
        const rewardActivity = {
          id: Date.now() + 1,
          type: 'reward',
          title: 'Rewards Unlocked!',
          description: `Day ${daysNum} Reward (0.0001 ETH)`,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          claimed: false,
          days: daysNum
        }
        setRecentActivity(prev => [rewardActivity, ...prev])
      }
    } catch (error) {
      console.error('Decryption failed:', error)
      setStatus(`❌ Decryption failed: ${error.message}`)
    } finally {
      setIsDecrypting(false)
    }
  }

  // Claim reward
  const handleClaimReward = async (activityId, days) => {
    if (!contract || !address || !signer || !fhevmInstance) {
      setStatus('Please connect wallet first')
      return
    }

    try {
      setIsLoading(true)
      setStatus('Generating decryption proof...')

      // Get encrypted days handle
      const encryptedDays = await contract.getUserEncryptedDays(address)

      // Decrypt with proof
      const { cleartexts, decryptionProof } = await decryptWithProof(
        encryptedDays,
        CONTRACT_ADDRESS,
        signer
      )

      setStatus('Submitting claim transaction...')

      // Call claimReward
      const tx = await contract.claimReward(days, cleartexts, decryptionProof)
      setStatus(`Transaction sent: ${tx.hash.slice(0, 10)}..., waiting for confirmation...`)

      const receipt = await tx.wait()

      setStatus('🎉 Reward claimed successfully! 0.0001 ETH sent to your wallet.')

      // Update activity
      setRecentActivity(prev =>
        prev.map(activity =>
          activity.id === activityId
            ? { ...activity, claimed: true, txHash: receipt.hash }
            : activity
        )
      )

      // Reload data
      await loadUserData()
    } catch (error) {
      console.error('Claim reward failed:', error)
      setStatus(`❌ Claim failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for chain changes (only reload when chain actually changes, not on every block)
  useEffect(() => {
    if (isConnected && chainId) {
      // Check if chain actually changed
      if (prevChainIdRef.current !== null && prevChainIdRef.current !== chainId) {
        console.log('Chain changed, reloading...', { from: prevChainIdRef.current, to: chainId })
        window.location.reload()
        return
      }
      
      // Store current chain ID
      prevChainIdRef.current = chainId
    }
  }, [chainId, isConnected])

  // Load user data
  useEffect(() => {
    if (contract && address) {
      loadUserData()
    }
  }, [contract, address, loadUserData])

  // Reward icons data
  const rewardIcons = [
    { icon: '🚀', name: 'Rocket', unlocked: currentStreak >= 1 },
    { icon: '💧', name: 'Droplet', unlocked: currentStreak >= 3 },
    { icon: '⚔️', name: 'Swords', unlocked: currentStreak >= 5 },
    { icon: '👑', name: 'Crown', unlocked: currentStreak >= 7 },
    { icon: '💎', name: 'Diamond', unlocked: currentStreak >= 9 }
  ]

  // Generate calendar days array
  const calendarDays = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateStr = date.toDateString()
    calendarDays.push({
      day,
      date: dateStr,
      isChecked: checkedDays.has(dateStr),
      isToday: day === today.getDate()
    })
  }

  // Format time remaining until next check-in
  const getTimeRemaining = () => {
    if (!nextCheckInTime || nextCheckInTime <= Date.now() / 1000) {
      return 'Available now'
    }

    const remaining = nextCheckInTime - (Date.now() / 1000)
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)

    return `${hours}h ${minutes}m`
  }

  return (
    <div className="app-container">
      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
          <div className="header-section">
            <h1 className="main-title">Daily Check-in</h1>
            <p className="subtitle">Build your habit, one day at a time.</p>
            <p className="contract-info">
              Contract: {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}
            </p>
          </div>

          {/* Connect Wallet Button */}
          {!isConnected && (
            <div className="connect-wallet-container">
              <ConnectButton />
            </div>
          )}

          {isConnected && address && (
            <>
              {/* Current Streak Card */}
              <div className="streak-card">
                <div className="streak-label">CURRENT STREAK</div>
                <div className="streak-value">
                  <span className="streak-number">{currentStreak}</span>
                  <span className="streak-text">days</span>
                </div>
                {currentStreak === 0 && !isTodayChecked && (
                  <div className="streak-hint">! Check in now to start your streak</div>
                )}
                {isTodayChecked && (
                  <div className="checked-badge">
                    <span className="check-icon">✓</span>
                    <span>Checked in today</span>
                  </div>
                )}
                {!canCheckIn && !isTodayChecked && (
                  <div className="cooldown-info">
                    Next check-in: {getTimeRemaining()}
                  </div>
                )}
              </div>

              {/* Check In Button */}
              <button
                className={`checkin-button ${isTodayChecked ? 'checked-in' : ''}`}
                onClick={handleCheckIn}
                disabled={isTodayChecked || !canCheckIn || isLoading}
              >
                {isLoading ? 'Processing...' : isTodayChecked ? '✓ Checked In Today' : 'Check In Now'}
              </button>

              {/* Decrypt Button */}
              <button
                className="decrypt-button"
                onClick={handleDecrypt}
                disabled={isDecrypting || !address || isLoading}
              >
                {isDecrypting ? 'Decrypting...' : decryptedDays !== null ? `🔓 Days: ${decryptedDays}` : '🔐 Decrypt Days'}
              </button>

              {/* Rewards Section */}
              <div className="rewards-section">
                <div className="rewards-header">
                  <h3 className="rewards-title">YOUR REWARDS</h3>
                  <span className="rewards-subtitle">Unlock by checking in</span>
                </div>
                <div className="rewards-grid">
                  {rewardIcons.map((reward, index) => (
                    <div
                      key={index}
                      className={`reward-icon ${reward.unlocked ? 'unlocked' : 'locked'}`}
                      title={`${reward.name} - Day ${(index * 2) + 1}`}
                    >
                      {reward.icon}
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Info */}
              <div className="account-info">
                <div className="account-label">Connected Wallet</div>
                <div className="account-address">{address.slice(0, 6)}...{address.slice(-4)}</div>
                <div className="network-badge">Sepolia Testnet</div>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Calendar */}
        <div className="right-column">
          <div className="calendar-header">
            <h2 className="calendar-title">
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>

          <div className="calendar-weekdays">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((dayData, index) => {
              if (dayData === null) {
                return <div key={`empty-${index}`} className="calendar-day empty"></div>
              }

              const { day, isChecked, isToday } = dayData
              const showChecked = isChecked
              const showToday = isToday && !isChecked

              return (
                <div
                  key={day}
                  className={`calendar-day ${showChecked ? 'checked' : ''} ${showToday ? 'today' : ''}`}
                >
                  {day}
                </div>
              )
            })}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-dot checked"></div>
              <span>Checked In</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot today"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - Recent Activity */}
      <div className="activity-section">
        <div className="activity-header">
          <h2 className="activity-title">Recent Activity</h2>
          <span className="activity-count">{recentActivity.length} Total</span>
        </div>
        <div className="activity-content">
          {recentActivity.length === 0 ? (
            <div className="empty-activity">
              <p>No check-in history yet.</p>
              <p>Start your streak today!</p>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  {activity.type === 'reward' ? (
                    <div className="reward-activity-card">
                      <div className="reward-card-content">
                        <div className="reward-icon-large">🎁</div>
                        <div className="reward-text">
                          <div className="reward-title">{activity.title}</div>
                          <div className="reward-description">{activity.description}</div>
                        </div>
                        {!activity.claimed && (
                          <button
                            className="claim-button"
                            onClick={() => handleClaimReward(activity.id, activity.days)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Claiming...' : 'Claim Reward'}
                          </button>
                        )}
                        {activity.claimed && (
                          <button className="claim-button claimed" disabled>
                            ✓ Claimed
                          </button>
                        )}
                      </div>
                      <div className="activity-timestamp">
                        <span className="timestamp-dot"></span>
                        <span className="timestamp-date">{activity.date}</span>
                        <span className="timestamp-time">{activity.time}</span>
                        {activity.txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            View TX
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="checkin-activity-item">
                      <div className="activity-timestamp">
                        <span className="timestamp-dot"></span>
                        <span className="timestamp-date">{activity.date}</span>
                        <span className="timestamp-time">{activity.time}</span>
                        {activity.txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            View TX
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {status && (
        <div className="status-bar">
          {status}
        </div>
      )}
    </div>
  )
}

export default App
