import hre from "hardhat"

async function main() {
  const proxyAddress = "0x26f52c66229FfC86Aeb513370BF8bba6c81e07d0"
  const IDRP = await hre.ethers.getContractFactory("IDRP")
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, IDRP)

  console.log("Upgraded IDRP to:", await upgraded.getAddress())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
