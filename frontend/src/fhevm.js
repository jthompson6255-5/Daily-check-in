// Use FHEVM SDK from CDN (window.fhevm)
let fhevmInstance = null

/**
 * Initialize FHEVM instance
 * @param {Object} provider - Optional ethereum provider (for OKX wallet support)
 */
export const initFhevm = async (provider = null) => {
  if (fhevmInstance) {
    return fhevmInstance
  }

  // Check for both uppercase and lowercase versions of RelayerSDK
  const sdk = window.RelayerSDK || window.relayerSDK

  if (!sdk) {
    throw new Error('RelayerSDK not loaded. Please ensure the CDN script is loaded.')
  }

  try {
    const { initSDK, createInstance, SepoliaConfig } = sdk

    // Initialize SDK with CDN
    await initSDK()
    console.log('✅ FHEVM SDK initialized with CDN')

    // Use provided provider or fallback to window.ethereum
    // This allows us to use OKX wallet provider when connected
    const networkProvider = provider || window.ethereum
    
    if (!networkProvider) {
      throw new Error('No ethereum provider found')
    }

    // Create instance with Sepolia config and the correct provider
    const config = { ...SepoliaConfig, network: networkProvider }

    fhevmInstance = await createInstance(config)
    console.log('✅ FHEVM instance created successfully with provider:', networkProvider)

    return fhevmInstance
  } catch (error) {
    console.error('Failed to initialize FHEVM:', error)
    throw error
  }
}

/**
 * Get FHEVM instance
 */
export const getFhevmInstance = () => {
  if (!fhevmInstance) {
    // Try to get from window if not in module scope
    const sdk = window.RelayerSDK || window.relayerSDK
    if (sdk && sdk.getInstance) {
      return sdk.getInstance()
    }
    throw new Error('FHEVM instance not initialized. Call initFhevm() first.')
  }
  return fhevmInstance
}

/**
 * Set FHEVM instance (for external use)
 */
export const setFhevmInstance = (instance) => {
  fhevmInstance = instance
}

/**
 * Create encrypted input for contract
 */
export const createEncryptedInput = async (contractAddress, userAddress) => {
  const instance = getFhevmInstance()
  return instance.createEncryptedInput(contractAddress, userAddress)
}

/**
 * Decrypt encrypted uint32 value (user decryption with EIP-712 signature)
 */
export const decryptUint32 = async (handle, contractAddress, signer) => {
  const instance = getFhevmInstance()

  try {
    console.log('🔐 Using EIP-712 user decryption for handle:', handle)

    // Generate keypair for decryption
    const keypair = instance.generateKeypair()

    const handleContractPairs = [
      {
        handle: handle,
        contractAddress: contractAddress,
      },
    ]

    const startTimeStamp = Math.floor(Date.now() / 1000).toString()
    const durationDays = "10"
    const contractAddresses = [contractAddress]

    // Create EIP-712 typed data
    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    )

    // Request user to sign EIP-712 message
    const signature = await signer.signTypedData(
      eip712.domain,
      {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      eip712.message
    )

    // User decrypt with signature
    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      await signer.getAddress(),
      startTimeStamp,
      durationDays
    )

    return Number(result[handle])
  } catch (error) {
    console.error('Decryption failed:', error)
    throw error
  }
}

/**
 * Decrypt multiple handles and generate proof (for claim reward)
 */
export const decryptWithProof = async (handle, contractAddress, signer) => {
  const instance = getFhevmInstance()

  try {
    console.log('🔐 Generating decryption proof for handle:', handle)

    // Generate keypair for decryption
    const keypair = instance.generateKeypair()

    const handleContractPairs = [
      {
        handle: handle,
        contractAddress: contractAddress,
      },
    ]

    const startTimeStamp = Math.floor(Date.now() / 1000).toString()
    const durationDays = "10"
    const contractAddresses = [contractAddress]

    // Create EIP-712 typed data
    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    )

    // Request user to sign EIP-712 message
    const signature = await signer.signTypedData(
      eip712.domain,
      {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      eip712.message
    )

    // User decrypt with signature
    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      await signer.getAddress(),
      startTimeStamp,
      durationDays
    )

    console.log('🔓 Decryption result:', result)

    // Extract values from result
    let decryptedValue
    let cleartexts
    let decryptionProof

    if (result && typeof result === 'object') {
      // SDK 0.3.0-5 format
      if (result.clearValues && typeof result.clearValues === 'object') {
        decryptedValue = Number(result.clearValues[handle])
      } else {
        decryptedValue = Number(result[handle])
      }

      // Get ABI encoded cleartexts and proof
      cleartexts = result.abiEncodedClearValues || result.cleartexts
      decryptionProof = result.decryptionProof

      console.log('✅ Decrypted value:', decryptedValue)
      console.log('✅ Cleartexts:', cleartexts)
      console.log('✅ Proof:', decryptionProof)
    }

    return {
      decryptedValue,
      cleartexts,
      decryptionProof
    }
  } catch (error) {
    console.error('Decryption with proof failed:', error)
    throw error
  }
}

/**
 * Reencrypt encrypted value for viewing
 */
export const reencrypt = async (handle, contractAddress, userAddress, signer) => {
  const instance = getFhevmInstance()

  try {
    // Create EIP-712 signature for reencryption
    const { publicKey, signature } = await instance.generateToken({
      verifyingContract: contractAddress,
      address: userAddress
    })

    // Reencrypt the value
    const reencrypted = await instance.reencrypt(
      handle,
      publicKey,
      signature.signature,
      contractAddress,
      userAddress
    )

    return reencrypted
  } catch (error) {
    console.error('Reencryption failed:', error)
    throw error
  }
}
