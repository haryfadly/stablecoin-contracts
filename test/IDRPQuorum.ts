import hre from "hardhat"
import { expect } from "chai"
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { parseUnits, Signer, TypedDataDomain, ZeroAddress } from "ethers"
import { IDRPQuorumModule } from "../typechain-types"
import { execTransaction } from "./utils/utils"

describe("IDRP Quorum", function () {
  async function contractFixture() {
    const [deployer, officer, manager, director, commissioner, depository, alice] = await hre.ethers.getSigners()

    const safeFactory = await hre.ethers.getContractFactory("Safe", deployer)
    const masterCopy = await safeFactory.deploy()

    const IDRP = await hre.ethers.getContractFactory("IDRP")
    const token = await hre.upgrades.deployProxy(IDRP, ["IDRP", "IDRP"])
    await token.waitForDeployment()

    // Deploy a new SafeProxyFactory contract
    const proxyFactory = await (await hre.ethers.getContractFactory("SafeProxyFactory", deployer)).deploy()

    // Setup the Safe, Step 1, generate transaction data
    const safeData = masterCopy.interface.encodeFunctionData("setup", [
      [await officer.getAddress()],
      1,
      ZeroAddress,
      "0x",
      ZeroAddress,
      ZeroAddress,
      0,
      ZeroAddress,
    ])

    // Read the safe address by executing the static call to createProxyWithNonce function
    const safeAddress = await proxyFactory.createProxyWithNonce.staticCall(await masterCopy.getAddress(), safeData, 0n)

    if (safeAddress === ZeroAddress) {
      throw new Error("Safe address not found")
    }

    // Setup the Safe, Step 2, execute the transaction
    await proxyFactory.createProxyWithNonce(await masterCopy.getAddress(), safeData, 0n)

    const safe = await hre.ethers.getContractAt("Safe", safeAddress)

    // Deploy the IDRPQuorumModule contract
    const module = await (
      await hre.ethers.getContractFactory("IDRPQuorumModule", deployer)
    ).deploy(safe.target, token.target, await officer.getAddress())

    // Enable the module in the safe, Step 1, generate transaction data
    const enableModuleData = masterCopy.interface.encodeFunctionData("enableModule", [module.target])

    // Enable the module in the safe, Step 2, execute the transaction
    await execTransaction([officer], safe, safe.target, 0, enableModuleData, 0)

    return {
      token,
      safe,
      module,
      deployer,
      officer,
      manager,
      director,
      commissioner,
      depository,
    }
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { token } = await loadFixture(contractFixture)

      expect(await token.name()).to.equal("IDRP")
      expect(await token.symbol()).to.equal("IDRP")
    })
  })

  describe("Module Enabled", function () {
    it("Should enable the module", async function () {
      const { safe, module } = await loadFixture(contractFixture)

      // Verify that the module is enabled
      expect(await safe.isModuleEnabled.staticCall(module.target)).to.be.true
    })
  })
})
