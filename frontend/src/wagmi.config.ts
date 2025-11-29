import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMaskWallet, okxWallet } from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';

// Only configure injected wallets: MetaMask and OKX
// WalletConnect is not used, so projectId is not needed
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Injected Wallets',
      wallets: [
        metaMaskWallet,  // MetaMask wallet
        okxWallet,       // OKX wallet
      ],
    },
  ],
  {
    appName: 'Daily Check-in DApp',
    // projectId is not set to disable WalletConnect
  }
);

// Use Infura RPC endpoint
const INFURA_API_KEY = '3ec7c6d21e764c4d9470e4be10f73658';
const sepoliaRpcUrl = `https://sepolia.infura.io/v3/${INFURA_API_KEY}`;

export const config = createConfig({
  chains: [sepolia],
  connectors,
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
});


