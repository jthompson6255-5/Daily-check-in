// Contract Configuration
export const CONTRACT_ADDRESS = '0x178333B276DdBC6eBb45C3C550bf9547b2ec943B'

export const SEPOLIA_CHAIN_ID = 11155111

// Public Infura RPC endpoint (safe to expose in frontend)
// Note: This is a public RPC endpoint, rate-limited per IP
const INFURA_RPC_URL = 'https://sepolia.infura.io/v3/3ec7c6d21e764c4d9470e4be10f73658'

export const CHAIN_CONFIG = {
  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
  chainName: 'Sepolia Test Network',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: [INFURA_RPC_URL],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
}

export const REWARD_AMOUNT = '0.0001' // ETH
export const CHECK_IN_INTERVAL = 24 * 60 * 60 // 24 hours in seconds
