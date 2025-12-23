import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; 
import "@openzeppelin/hardhat-upgrades"; 

const config: HardhatUserConfig = {
  solidity: "0.8.28", 
  networks: {
    // Cấu hình mạng Localhost chuẩn để deploy
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
    },
  },
};

export default config;
