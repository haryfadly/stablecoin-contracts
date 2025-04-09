import { HardhatUserConfig } from "hardhat/config"
import { vars } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "@openzeppelin/hardhat-upgrades"
import "hardhat-dependency-compiler"

const PRIVATE_KEY = vars.get("PRIVATE_KEY")
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY")

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    holesky: {
      chainId: 17000,
      url: "https://1rpc.io/holesky",
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      holesky: ETHERSCAN_API_KEY,
    },
  },
  dependencyCompiler: {
    paths: ["@safe-global/safe-contracts/contracts/proxies/SafeProxyFactory.sol"],
  },
}

export default config
