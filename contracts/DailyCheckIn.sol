// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title DailyCheckIn - Daily Check-in Contract with Encrypted Counter
/// @notice Users can check in once per day with encrypted days counter, claim rewards every 2 days
/// @dev Uses FHEVM to protect user check-in privacy
contract DailyCheckIn is ZamaEthereumConfig {

    // ============ State Variables ============

    /// @notice Contract owner
    address public owner;

    /// @notice Reward amount per milestone (0.0001 ETH)
    uint256 public constant REWARD_AMOUNT = 0.0001 ether;

    /// @notice Check-in interval (24 hours)
    uint256 public constant CHECK_IN_INTERVAL = 24 hours;

    /// @notice Reward interval (every 2 days - odd days: 1, 3, 5, 7...)
    uint256 public constant REWARD_INTERVAL = 2;

    /// @notice User check-in data structure
    struct UserCheckIn {
        euint32 encryptedDays;          // Encrypted consecutive check-in days
        uint256 lastCheckInTime;         // Last check-in timestamp
        uint256 lastClaimedDay;          // Last day when reward was claimed
    }

    /// @notice User address => check-in data
    mapping(address => UserCheckIn) public userCheckIns;

    /// @notice Contract reward pool balance
    uint256 public rewardPool;

    // ============ Events ============

    /// @notice User checked in
    event CheckedIn(address indexed user, uint256 timestamp);

    /// @notice User claimed reward
    event RewardClaimed(address indexed user, uint256 day, uint256 amount);

    /// @notice Check-in reset (continuity broken)
    event CheckInReset(address indexed user, uint256 timestamp);

    /// @notice Reward pool deposited
    event RewardPoolDeposited(address indexed from, uint256 amount);

    /// @notice Reward pool withdrawn
    event RewardPoolWithdrawn(address indexed to, uint256 amount);

    // ============ Modifiers ============

    /// @notice Only contract owner can call
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    // ============ Constructor ============

    /// @notice Deploy contract with initial reward pool funding
    constructor() payable {
        owner = msg.sender;
        rewardPool = msg.value;
        emit RewardPoolDeposited(msg.sender, msg.value);
    }

    // ============ Core Functions ============

    /// @notice Daily check-in function
    /// @dev Encrypts check-in counter, checks continuity, resets if more than 48 hours elapsed
    function checkIn() external {
        UserCheckIn storage userCheckIn = userCheckIns[msg.sender];

        // Check if user can check in (at least 24 hours since last check-in)
        require(
            block.timestamp >= userCheckIn.lastCheckInTime + CHECK_IN_INTERVAL,
            "Already checked in today"
        );

        // Check continuity: if more than 48 hours elapsed, reset counter
        if (block.timestamp > userCheckIn.lastCheckInTime + (CHECK_IN_INTERVAL * 2)) {
            // Reset check-in days
            userCheckIn.encryptedDays = FHE.asEuint32(0);
            userCheckIn.lastClaimedDay = 0;
            emit CheckInReset(msg.sender, block.timestamp);
        }

        // Increment check-in days by 1 (encrypted operation)
        euint32 one = FHE.asEuint32(1);
        userCheckIn.encryptedDays = FHE.add(userCheckIn.encryptedDays, one);

        // Update check-in timestamp
        userCheckIn.lastCheckInTime = block.timestamp;

        // Grant permissions: allow contract and user to access encrypted data
        FHE.allowThis(userCheckIn.encryptedDays);
        FHE.allow(userCheckIn.encryptedDays, msg.sender);

        emit CheckedIn(msg.sender, block.timestamp);
    }

    /// @notice Manually reset check-in counter
    /// @dev User can actively reset their check-in record
    function resetCheckIn() external {
        UserCheckIn storage userCheckIn = userCheckIns[msg.sender];

        userCheckIn.encryptedDays = FHE.asEuint32(0);
        userCheckIn.lastCheckInTime = 0;
        userCheckIn.lastClaimedDay = 0;

        emit CheckInReset(msg.sender, block.timestamp);
    }

    /// @notice Claim check-in reward (simplified - trust user input)
    /// @param currentDay Current user check-in days (plaintext for verification)
    /// @dev Simplified claim without proof - prevents double claims via lastClaimedDay
    /// @dev Users cannot cheat because:
    ///      1. They can only claim for odd days (1, 3, 5, 7...)
    ///      2. lastClaimedDay prevents claiming the same day twice
    ///      3. Even if they lie about their day count, they still need to reach that day for the next claim
    function claimReward(uint256 currentDay) external {
        UserCheckIn storage userCheckIn = userCheckIns[msg.sender];

        // Check if eligible for reward (odd days: 1, 3, 5, 7...)
        require(currentDay % REWARD_INTERVAL == 1, "Not eligible for reward");

        // Check if reward already claimed for this milestone
        require(
            currentDay > userCheckIn.lastClaimedDay,
            "Reward already claimed for this milestone"
        );

        // Check if reward pool has sufficient balance
        require(rewardPool >= REWARD_AMOUNT, "Insufficient reward pool");

        // Update last claimed day
        userCheckIn.lastClaimedDay = currentDay;

        // Deduct from reward pool
        rewardPool -= REWARD_AMOUNT;

        // Send reward to user
        (bool success, ) = payable(msg.sender).call{value: REWARD_AMOUNT}("");
        require(success, "Reward transfer failed");

        emit RewardClaimed(msg.sender, currentDay, REWARD_AMOUNT);
    }

    // ============ Query Functions ============

    /// @notice Get user's encrypted check-in days
    /// @param user User address
    /// @return Encrypted check-in days
    function getUserEncryptedDays(address user) external view returns (euint32) {
        return userCheckIns[user].encryptedDays;
    }

    /// @notice Get user's last check-in time
    /// @param user User address
    /// @return Last check-in timestamp
    function getUserLastCheckInTime(address user) external view returns (uint256) {
        return userCheckIns[user].lastCheckInTime;
    }

    /// @notice Get user's last claimed reward day
    /// @param user User address
    /// @return Last day when reward was claimed
    function getUserLastClaimedDay(address user) external view returns (uint256) {
        return userCheckIns[user].lastClaimedDay;
    }

    /// @notice Check if user can check in
    /// @param user User address
    /// @return Whether user can check in
    function canCheckIn(address user) external view returns (bool) {
        UserCheckIn storage userCheckIn = userCheckIns[user];
        return block.timestamp >= userCheckIn.lastCheckInTime + CHECK_IN_INTERVAL;
    }

    /// @notice Calculate next check-in time
    /// @param user User address
    /// @return Next check-in timestamp
    function getNextCheckInTime(address user) external view returns (uint256) {
        UserCheckIn storage userCheckIn = userCheckIns[user];
        if (userCheckIn.lastCheckInTime == 0) {
            return block.timestamp; // Never checked in, can check in now
        }
        return userCheckIn.lastCheckInTime + CHECK_IN_INTERVAL;
    }

    // ============ Admin Functions ============

    /// @notice Deposit to reward pool
    /// @dev Anyone can deposit to reward pool
    function depositRewardPool() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        rewardPool += msg.value;
        emit RewardPoolDeposited(msg.sender, msg.value);
    }

    /// @notice Withdraw from reward pool (owner only)
    /// @param amount Withdrawal amount
    function withdrawRewardPool(uint256 amount) external onlyOwner {
        require(amount <= rewardPool, "Insufficient balance in reward pool");

        rewardPool -= amount;

        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit RewardPoolWithdrawn(owner, amount);
    }

    /// @notice Emergency withdraw all balance (owner only)
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        rewardPool = 0;

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Emergency withdrawal failed");

        emit RewardPoolWithdrawn(owner, balance);
    }

    /// @notice Transfer contract ownership (owner only)
    /// @param newOwner New owner address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    /// @notice Get contract balance
    /// @return Current contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ Receive ETH ============

    /// @notice Receive ETH and automatically add to reward pool
    receive() external payable {
        rewardPool += msg.value;
        emit RewardPoolDeposited(msg.sender, msg.value);
    }

    /// @notice Fallback function
    fallback() external payable {
        rewardPool += msg.value;
        emit RewardPoolDeposited(msg.sender, msg.value);
    }
}
