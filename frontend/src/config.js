// Contract Configuration
export const CONTRACT_ADDRESS = '0x56Ce073d19364608d53dCa4Ed7c928C3b6A125F3'

export const SEPOLIA_CHAIN_ID = 11155111

// Infura RPC endpoint
const INFURA_API_KEY = '3ec7c6d21e764c4d9470e4be10f73658'
const INFURA_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_API_KEY}`

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
