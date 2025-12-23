# Decentralized Chat Application (DApp)

Ứng dụng nhắn tin phi tập trung chạy trên mạng Ethereum (Sepolia Testnet), cho phép gửi tin nhắn thời gian thực và lưu trữ vĩnh viễn trên Blockchain. Dự án sử dụng Smart Contract có khả năng nâng cấp (Upgradeable Proxy Pattern).

## ✨ Demo / Hình ảnh minh họa

### 1. Giao diện Chat chính
Giao diện người dùng thân thiện, hiển thị lịch sử tin nhắn giữa các địa chỉ ví.

<p align="center">
  <img src="./assets/demo-chat-ui.png" alt="Giao diện Chat chính" width="800">
</p>

### 2. Tương tác với Blockchain (Metamask)
Mỗi tin nhắn gửi đi là một giao dịch trên Blockchain, được xác thực an toàn thông qua ví Metamask.

<p align="center" style="display: flex; justify-content: center; gap: 20px;">
  <img src="./assets/demo-metamask.png" alt="Xác nhận Metamask" width="400">
</p>


## 🚀 Tính năng nổi bật
* **🛡️ On-chain Data:** Mọi tin nhắn đều được lưu trữ minh bạch và không thể sửa đổi trên Ethereum Blockchain (Sepolia).
* **⚡ Real-time Updates:** Tự động cập nhật giao diện ngay khi giao dịch được xác nhận trên mạng lưới.
* **🆙 Upgradeable Smart Contract:** Áp dụng mô hình **ERC1967 Proxy**, cho phép nâng cấp logic của hợp đồng trong tương lai mà vẫn giữ nguyên địa chỉ và dữ liệu tin nhắn cũ.
* **🔐 Web3 Authentication:** Đăng nhập và xác thực người dùng thông qua ví điện tử (MetaMask).

## 🛠 Tech Stack
* **Frontend:** ReactJS (Vite), Ethers.js v6, TailwindCSS.
* **Smart Contract:** Solidity (v0.8.20).
* **Deployment & Tools:** Remix IDE, Hardhat (for local testing), OpenZeppelin Contracts.
* **Network:** Sepolia Testnet.

## 🔗 Thông tin Contract (Sepolia Testnet)
Đây là địa chỉ của hệ thống contract đang chạy trên mạng thật:

| Loại Contract | Địa chỉ (Address) | Mô tả |
| :--- | :--- | :--- |
| **Proxy (Main)** | `0x65D2176c2168e11120F485ffF922d9F0a88fE3C3` | **Địa chỉ chính** để Frontend tương tác và lưu trữ dữ liệu. |
| Implementation | `0xe826511D8D2c9C59f75A90Ae623A12A423a65Cb3 (Điền địa chỉ contract gốc nếu muốn)` | Chứa logic code hiện tại (ChatApp). |

👉 **Kiểm tra trên Explorer:** [Xem Proxy Contract trên Sepolia Etherscan](https://sepolia.etherscan.io/address/0xe826511D8D2c9C59f75A90Ae623A12A423a65Cb3#code)
*(Lưu ý: Tab "Write as Proxy" trên Etherscan cho phép tương tác trực tiếp với các hàm sendMessage, v.v.)*

## ⚙️ Hướng dẫn cài đặt và Chạy (Localhost)

Để chạy dự án này trên máy của bạn, hãy làm theo các bước sau:

### 1. Yêu cầu chuẩn bị
* [Node.js](https://nodejs.org/) (Phiên bản LTS trở lên).
* Ví [MetaMask](https://metamask.io/) cài trên trình duyệt.
* Một ít ETH trên mạng **Sepolia Testnet** để làm phí gas (Có thể lấy tại các Faucet).

### 2. Cài đặt
bash
# Clone repository về máy
git clone https://github.com/HoangAn147/FiAi-Chat.git

# Mở dự án lên

# Cài đặt các thư viện phụ thuộc
npm install

### 3. Chạy ứng dụng
Bash
npm run dev
* Sau đó truy cập vào địa chỉ local được cung cấp (thường là http://localhost:5173).
### 4. Cách sử dụng

* Đảm bảo ví MetaMask của bạn đang chọn mạng Sepolia.

* Bấm nút "Connect Wallet" trên giao diện web.

* Nhập địa chỉ ví người nhận vào ô "Receiver Address".

* Nhập nội dung và bấm Send.

* Xác nhận giao dịch trên cửa sổ MetaMask hiện ra.

