const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DailyCheckIn", function () {
  let dailyCheckIn;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const DailyCheckIn = await ethers.getContractFactory("DailyCheckIn");

    // Deploy with 1 ETH as reward pool
    dailyCheckIn = await DailyCheckIn.deploy({
      value: ethers.parseEther("1.0")
    });

    await dailyCheckIn.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dailyCheckIn.owner()).to.equal(owner.address);
    });

    it("Should initialize reward pool", async function () {
      expect(await dailyCheckIn.rewardPool()).to.equal(ethers.parseEther("1.0"));
    });

    it("Should have correct reward amount", async function () {
      expect(await dailyCheckIn.REWARD_AMOUNT()).to.equal(ethers.parseEther("0.0001"));
    });
  });

  describe("Check-in", function () {
    it("Should allow user to check in", async function () {
      await expect(dailyCheckIn.connect(user1).checkIn())
        .to.emit(dailyCheckIn, "CheckedIn")
        .withArgs(user1.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
    });

    it("Should prevent double check-in on same day", async function () {
      await dailyCheckIn.connect(user1).checkIn();

      await expect(dailyCheckIn.connect(user1).checkIn())
        .to.be.revertedWith("Already checked in today");
    });

    it("Should update user check-in data", async function () {
      const beforeTime = await ethers.provider.getBlock('latest').then(b => b.timestamp);

      await dailyCheckIn.connect(user1).checkIn();

      const lastCheckInTime = await dailyCheckIn.getUserLastCheckInTime(user1.address);
      expect(lastCheckInTime).to.be.greaterThan(beforeTime);
    });
  });

  describe("Reward Pool Management", function () {
    it("Should allow deposits to reward pool", async function () {
      const depositAmount = ethers.parseEther("0.5");

      await expect(dailyCheckIn.connect(user1).depositRewardPool({value: depositAmount}))
        .to.emit(dailyCheckIn, "RewardPoolDeposited")
        .withArgs(user1.address, depositAmount);

      expect(await dailyCheckIn.rewardPool()).to.equal(ethers.parseEther("1.5"));
    });

    it("Should allow owner to withdraw from reward pool", async function () {
      const withdrawAmount = ethers.parseEther("0.1");

      await expect(dailyCheckIn.connect(owner).withdrawRewardPool(withdrawAmount))
        .to.emit(dailyCheckIn, "RewardPoolWithdrawn")
        .withArgs(owner.address, withdrawAmount);

      expect(await dailyCheckIn.rewardPool()).to.equal(ethers.parseEther("0.9"));
    });

    it("Should prevent non-owner from withdrawing", async function () {
      await expect(dailyCheckIn.connect(user1).withdrawRewardPool(ethers.parseEther("0.1")))
        .to.be.revertedWith("Only owner can call this");
    });
  });

  describe("Reset Check-in", function () {
    it("Should allow user to reset their check-in", async function () {
      await dailyCheckIn.connect(user1).checkIn();

      await expect(dailyCheckIn.connect(user1).resetCheckIn())
        .to.emit(dailyCheckIn, "CheckInReset")
        .withArgs(user1.address, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      expect(await dailyCheckIn.getUserLastCheckInTime(user1.address)).to.equal(0);
    });
  });

  describe("Query Functions", function () {
    it("Should return correct check-in status", async function () {
      expect(await dailyCheckIn.canCheckIn(user1.address)).to.be.true;

      await dailyCheckIn.connect(user1).checkIn();

      expect(await dailyCheckIn.canCheckIn(user1.address)).to.be.false;
    });

    it("Should return next check-in time", async function () {
      const nextTime1 = await dailyCheckIn.getNextCheckInTime(user1.address);
      const currentTime = await ethers.provider.getBlock('latest').then(b => b.timestamp);

      expect(nextTime1).to.equal(currentTime);

      await dailyCheckIn.connect(user1).checkIn();

      const nextTime2 = await dailyCheckIn.getNextCheckInTime(user1.address);
      const checkInInterval = await dailyCheckIn.CHECK_IN_INTERVAL();
      const lastCheckInTime = await dailyCheckIn.getUserLastCheckInTime(user1.address);

      expect(nextTime2).to.equal(lastCheckInTime + checkInInterval);
    });
  });
});