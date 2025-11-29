const { ethers } = require("hardhat");

async function main() {
  // Get the contract factory
  const DailyCheckIn = await ethers.getContractFactory("DailyCheckIn");

  // Deploy with 1 ETH as initial reward pool
  console.log("Deploying DailyCheckIn contract...");
  console.log("Initial reward pool: 0.09 ETH");

  const dailyCheckIn = await DailyCheckIn.deploy({
    value: ethers.parseEther("0.09") // 0.09ETH initial funding
  });

  await dailyCheckIn.waitForDeployment();

  console.log(`DailyCheckIn deployed to: ${await dailyCheckIn.getAddress()}`);
  console.log(`Contract owner: ${await dailyCheckIn.owner()}`);
  console.log(`Reward pool balance: ${ethers.formatEther(await dailyCheckIn.rewardPool())} ETH`);
  console.log(`Contract balance: ${ethers.formatEther(await dailyCheckIn.getContractBalance())} ETH`);

  // Verify deployment
  const rewardAmount = await dailyCheckIn.REWARD_AMOUNT();
  const checkInInterval = await dailyCheckIn.CHECK_IN_INTERVAL();

  console.log("\n=== Contract Configuration ===");
  console.log(`Reward amount: ${ethers.formatEther(rewardAmount)} ETH`);
  console.log(`Check-in interval: ${checkInInterval} seconds (${checkInInterval / 3600} hours)`);
  console.log(`Total possible rewards with current pool: ${Math.floor(Number(ethers.formatEther(await dailyCheckIn.rewardPool())) / Number(ethers.formatEther(rewardAmount)))}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });