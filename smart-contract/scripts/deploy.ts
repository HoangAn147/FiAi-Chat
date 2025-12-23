import hre from "hardhat"; // <-- Đổi dòng này: Import hre thay vì { ethers }

async function main() {
  console.log("Starting deployment...");

  // Dùng hre.ethers thay vì ethers đứng một mình
  const ChatApp = await hre.ethers.getContractFactory("ChatApp");

  const chatApp = await ChatApp.deploy();

  await chatApp.waitForDeployment();

  console.log("ChatApp deployed to:", chatApp.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});