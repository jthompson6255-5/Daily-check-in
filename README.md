# 📅 Daily Check-in DApp with FHEVM

A decentralized daily check-in application with encrypted counter using Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine).

## 🎯 Features

- ✅ **Daily Check-in System** - Check in once every 24 hours
- ✅ **Encrypted Counter** - Your check-in days are encrypted and private
- ✅ **Reward System** - Claim 0.0001 ETH every 2 days (days 1, 3, 5, 7, 9...)
- ✅ **Continuity Check** - Automatically resets if you miss 2 consecutive days
- ✅ **Reward Pool Management** - Owner can manage reward pool, anyone can deposit

## 📋 How It Works

### Check-in Timeline

```
Day 1: Check in ✅ → Claim 0.0001 ETH reward 💰
Day 2: Check in ✅ → No reward yet
Day 3: Check in ✅ → Claim 0.0001 ETH reward 💰
Day 4: Check in ✅ → No reward yet
Day 5: Check in ✅ → Claim 0.0001 ETH reward 💰
...and so on
```

### Rules

1. **24-hour Interval** - You can only check in once every 24 hours
2. **Continuity** - If you miss 2 consecutive days (48+ hours), your counter resets to 0
3. **Rewards** - Available on odd days (1, 3, 5, 7, 9...), must claim manually
4. **Privacy** - Your check-in days count is encrypted using FHEVM

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# Add your SEPOLIA_RPC_URL and PRIVATE_KEY
```

### Compile Contract

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Deploy

```bash
# Deploy to localhost
npm run node           # Terminal 1: Start local node
npm run deploy:localhost   # Terminal 2: Deploy contract

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

## 📝 Contract Functions

### User Functions

| Function | Description | Gas Cost |
|----------|-------------|----------|
| `checkIn()` | Daily check-in | Medium |
| `claimReward(uint256 currentDay, bytes cleartexts, bytes decryptionProof)` | Claim reward | High |
| `resetCheckIn()` | Reset your check-in counter | Low |

### Query Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getUserEncryptedDays(address user)` | euint32 | Get encrypted check-in days |
| `getUserLastCheckInTime(address user)` | uint256 | Get last check-in timestamp |
| `canCheckIn(address user)` | bool | Check if user can check in now |
| `getNextCheckInTime(address user)` | uint256 | Get next available check-in time |

### Admin Functions (Owner Only)

| Function | Description |
|----------|-------------|
| `depositRewardPool()` | Deposit ETH to reward pool (anyone can call) |
| `withdrawRewardPool(uint256 amount)` | Withdraw from reward pool |
| `emergencyWithdraw()` | Emergency withdraw all funds |
| `transferOwnership(address newOwner)` | Transfer contract ownership |

## 🔐 Privacy & Security

### Privacy Protection

- Check-in days are **encrypted** using FHEVM
- Only you can decrypt and view your check-in count
- Other users cannot see your progress

### Security Features

- **24-hour cooldown** prevents multiple check-ins per day
- **Decryption proof verification** prevents reward claiming fraud
- **Continuity check** prevents gaming the system
- **Owner-only admin functions** for critical operations

## 📊 Events

```solidity
event CheckedIn(address indexed user, uint256 timestamp);
event RewardClaimed(address indexed user, uint256 day, uint256 amount);
event CheckInReset(address indexed user, uint256 timestamp);
event RewardPoolDeposited(address indexed from, uint256 amount);
event RewardPoolWithdrawn(address indexed to, uint256 amount);
```

## 🛠️ Development

### Project Structure

```
idk/
├── contracts/
│   └── DailyCheckIn.sol      # Main contract
├── scripts/
│   └── deploy.js             # Deployment script
├── test/
│   └── DailyCheckIn.test.js  # Test suite
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

### Technologies

- **Solidity 0.8.24** - Smart contract language
- **Hardhat** - Development environment
- **FHEVM 0.9.1** - Fully homomorphic encryption
- **Zama Relayer SDK** - Decryption and proof generation

## 📖 Example Usage

### Frontend Integration (Pseudo-code)

```javascript
// Check in
await contract.checkIn();

// Check if can check in
const canCheckIn = await contract.canCheckIn(userAddress);

// Get encrypted days (only user can decrypt)
const encryptedDays = await contract.getUserEncryptedDays(userAddress);

// Decrypt and claim reward
const decrypted = await fhevmInstance.decrypt(encryptedDays, userAddress);
if (decrypted % 2 === 1) {
  const proof = await generateProof(decrypted);
  await contract.claimReward(decrypted, cleartexts, proof);
}
```

## 🔧 Configuration

### Constants in Contract

```solidity
uint256 public constant REWARD_AMOUNT = 0.0001 ether;  // Reward per milestone
uint256 public constant CHECK_IN_INTERVAL = 24 hours;  // Check-in interval
uint256 public constant REWARD_INTERVAL = 2;           // Every 2 days (odd days)
```

## ⚠️ Important Notes

1. **Deployment** - Deploy with sufficient ETH for reward pool (recommended: 1+ ETH)
2. **Gas Costs** - FHEVM operations are more expensive than regular operations
3. **Continuity** - Missing 2 consecutive days will reset your progress
4. **Rewards** - You must manually claim rewards, they are not auto-distributed

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📞 Support

For questions or issues, please open an issue in the repository.

---

**Built with privacy in mind using Zama FHEVM** 🔐
