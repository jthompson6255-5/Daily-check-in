# 📅 Daily Check-in DApp - Frontend

A decentralized daily check-in application frontend with FHEVM encryption.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MetaMask or another EVM wallet
- Sepolia testnet ETH

### Installation

```bash
cd QIANDUAN
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 🔧 Configuration

The contract configuration is in `src/config.js`:

```javascript
export const CONTRACT_ADDRESS = '0x56Ce073d19364608d53dCa4Ed7c928C3b6A125F3'
export const SEPOLIA_CHAIN_ID = 11155111
```

## 📋 Features

### 1. Wallet Connection
- Connects to MetaMask
- Automatically switches to Sepolia network
- Displays connected wallet address

### 2. Daily Check-in
- Check in once every 24 hours
- Encrypted check-in counter using FHEVM
- Visual calendar showing check-in history

### 3. Decrypt Days
- Decrypt your encrypted check-in days
- Requires EIP-712 signature
- Shows current streak

### 4. Claim Rewards
- Automatically detects available rewards (odd days: 1, 3, 5, 7...)
- Generates decryption proof
- Claims 0.0001 ETH reward

### 5. Activity Timeline
- Shows recent check-ins
- Displays claimable rewards
- Links to Etherscan for transactions

## 🔐 FHEVM Integration

The app uses Zama's FHEVM SDK loaded from CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@zama-fhe/relayer-sdk@0.3.0-5/dist/index.umd.js"></script>
```

### Key FHEVM Functions

1. **Initialization**: `initFhevm()` - Initializes FHEVM instance
2. **Decryption**: `decryptUint32()` - Decrypts encrypted check-in days
3. **Proof Generation**: `decryptWithProof()` - Generates proof for reward claiming

## 📝 Contract Interaction Flow

### Check-in Flow
```
1. User clicks "Check In Now"
2. App calls contract.checkIn()
3. Contract increments encrypted counter
4. Transaction confirmed
5. UI updates
```

### Decrypt Flow
```
1. User clicks "Decrypt Days"
2. App gets encrypted handle from contract
3. FHEVM SDK requests user signature (EIP-712)
4. User signs message
5. SDK decrypts value
6. App displays decrypted days
```

### Claim Reward Flow
```
1. User clicks "Claim Reward"
2. App gets encrypted handle
3. SDK decrypts and generates proof
4. User signs EIP-712 message
5. App calls contract.claimReward(days, cleartexts, proof)
6. Contract verifies proof
7. Contract sends 0.0001 ETH to user
8. Transaction confirmed
```

## 🎨 UI Components

- **Streak Card**: Displays current check-in streak
- **Calendar**: Visual representation of check-in history
- **Reward Icons**: Shows unlocked achievements
- **Activity List**: Recent check-ins and rewards
- **Status Bar**: Real-time transaction status

## ⚠️ Important Notes

1. **Network**: App only works on Sepolia testnet
2. **FHEVM SDK**: Loaded from CDN, requires internet connection
3. **Signatures**: Decryption requires user to sign EIP-712 messages
4. **Gas Costs**: FHEVM operations are more expensive than regular transactions

## 🐛 Troubleshooting

### FHEVM SDK Not Loaded
- Check internet connection
- Ensure CDN script is loaded before app initialization
- Check browser console for errors

### Decryption Failed
- Ensure you've checked in at least once
- Make sure you sign the EIP-712 message
- Check that wallet is connected to Sepolia

### Transaction Failed
- Ensure you have enough Sepolia ETH for gas
- Check that you're on Sepolia network
- Wait for 24-hour cooldown between check-ins

## 📚 Tech Stack

- **React 18**: UI framework
- **Ethers.js 6**: Ethereum library
- **FHEVM SDK**: Zama's encryption SDK
- **Vite**: Build tool
- **CSS**: Custom styling

## 🔗 Links

- Contract Address: `0x56Ce073d19364608d53dCa4Ed7c928C3b6A125F3`
- Sepolia Etherscan: https://sepolia.etherscan.io/address/0x56Ce073d19364608d53dCa4Ed7c928C3b6A125F3
- FHEVM Documentation: https://docs.zama.ai/fhevm

---

**Built with privacy using Zama FHEVM** 🔐

