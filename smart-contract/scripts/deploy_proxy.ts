import { ethers, upgrades } from "hardhat";

async function main() {
  // 1. Lấy Contract Factory
  const ChatApp = await ethers.getContractFactory("ChatApp");

  console.log("Đang deploy ChatApp Proxy (UUPS)...");

  // 2. Deploy Proxy
  const chatApp = await upgrades.deployProxy(ChatApp, [], { 
    initializer: 'initialize', 
    kind: 'uups' 
  });

  // 3. Đợi transaction hoàn tất
  await chatApp.waitForDeployment();

  // 4. Lấy địa chỉ Proxy 
  const proxyAddress = await chatApp.getAddress();
  
  console.log("----------------------------------------------------");
  console.log("✅ ChatApp Proxy đã deploy thành công tại:", proxyAddress);
  console.log("----------------------------------------------------");
  
  // (Tùy chọn) Xem địa chỉ Implementation thực tế bên trong
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("-> Implementation Address (Logic):", implementationAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});