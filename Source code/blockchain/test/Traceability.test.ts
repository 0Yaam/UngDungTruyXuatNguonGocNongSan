import { expect } from "chai";
import { ethers } from "hardhat";
import { Traceability } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Traceability", function () {
  let contract: Traceability;
  let owner: SignerWithAddress;
  let stranger: SignerWithAddress;

  const BATCH_ID = "BATCH-001";

  // Helper: tạo hash giống backend
  function hashData(data: object): string {
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
  }

  beforeEach(async function () {
    [owner, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Traceability");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // ─────────────────────────────────────
  //  createBatch
  // ─────────────────────────────────────
  describe("createBatch", function () {
    it("should create a new batch", async function () {
      await expect(contract.createBatch(BATCH_ID))
        .to.emit(contract, "BatchCreated")
        .withArgs(
          BATCH_ID,
          owner.address,
          anyValue
        );

      expect(await contract.batchExists(BATCH_ID)).to.be.true;
      expect(await contract.getBatchOwner(BATCH_ID)).to.equal(owner.address);
    });

    it("should revert if batch already exists", async function () {
      await contract.createBatch(BATCH_ID);
      await expect(contract.createBatch(BATCH_ID)).to.be.revertedWith(
        "Batch already exists"
      );
    });
  });

  // ─────────────────────────────────────
  //  addAction
  // ─────────────────────────────────────
  describe("addAction", function () {
    const sampleData = {
      description: "Bón phân NPK 20-20-15",
      amount: 50,
      unit: "kg",
    };

    beforeEach(async function () {
      await contract.createBatch(BATCH_ID);
    });

    it("should add action and emit event", async function () {
      const dataHash = hashData(sampleData);

      await expect(
        contract.addAction(BATCH_ID, dataHash, 1) // 1 = FERTILIZING
      )
        .to.emit(contract, "ActionAdded")
        .withArgs(
          BATCH_ID,
          dataHash,
          1,
          owner.address,
          anyValue
        );

      expect(await contract.getActionCount(BATCH_ID)).to.equal(1);
    });

    it("should revert if caller is not batch owner", async function () {
      const dataHash = hashData(sampleData);
      await expect(
        contract.connect(stranger).addAction(BATCH_ID, dataHash, 1)
      ).to.be.revertedWith("Only batch owner can perform this action");
    });

    it("should revert if batch does not exist", async function () {
      const dataHash = hashData(sampleData);
      await expect(
        contract.addAction("FAKE-BATCH", dataHash, 1)
      ).to.be.revertedWith("Batch does not exist");
    });

    it("should store multiple actions in order", async function () {
      const data1 = { description: "Gieo hạt" };
      const data2 = { description: "Tưới nước" };
      const data3 = { description: "Thu hoạch" };

      await contract.addAction(BATCH_ID, hashData(data1), 0); // SEEDING
      await contract.addAction(BATCH_ID, hashData(data2), 2); // WATERING
      await contract.addAction(BATCH_ID, hashData(data3), 4); // HARVESTING

      expect(await contract.getActionCount(BATCH_ID)).to.equal(3);

      const [, actions] = await contract.getHistory(BATCH_ID);
      expect(actions[0].actionType).to.equal(0); // SEEDING
      expect(actions[1].actionType).to.equal(2); // WATERING
      expect(actions[2].actionType).to.equal(4); // HARVESTING
    });
  });

  // ─────────────────────────────────────
  //  getHistory
  // ─────────────────────────────────────
  describe("getHistory", function () {
    it("should return owner and all actions", async function () {
      await contract.createBatch(BATCH_ID);
      const data = { description: "Bón phân" };
      await contract.addAction(BATCH_ID, hashData(data), 1);

      const [batchOwner, actions] = await contract.getHistory(BATCH_ID);
      expect(batchOwner).to.equal(owner.address);
      expect(actions.length).to.equal(1);
      expect(actions[0].dataHash).to.equal(hashData(data));
      expect(actions[0].recorder).to.equal(owner.address);
    });

    it("should revert for non-existent batch", async function () {
      await expect(contract.getHistory("FAKE")).to.be.revertedWith(
        "Batch does not exist"
      );
    });
  });

  // ─────────────────────────────────────
  //  verifyAction
  // ─────────────────────────────────────
  describe("verifyAction", function () {
    const data = { description: "Phun thuốc Regent", amount: 2, unit: "lít" };

    beforeEach(async function () {
      await contract.createBatch(BATCH_ID);
      await contract.addAction(BATCH_ID, hashData(data), 3); // PEST_CONTROL
    });

    it("should return true for matching hash", async function () {
      const matched = await contract.verifyAction(BATCH_ID, 0, hashData(data));
      expect(matched).to.be.true;
    });

    it("should return false if data was tampered", async function () {
      const tamperedData = { description: "FAKE DATA", amount: 999, unit: "tấn" };
      const matched = await contract.verifyAction(BATCH_ID, 0, hashData(tamperedData));
      expect(matched).to.be.false;
    });

    it("should revert for out-of-bounds index", async function () {
      await expect(
        contract.verifyAction(BATCH_ID, 99, hashData(data))
      ).to.be.revertedWith("Index out of bounds");
    });
  });

  // ─────────────────────────────────────
  //  Helper
  // ─────────────────────────────────────
  async function getBlockTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
  }
});
