// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 1. IMPORT CÁC THƯ VIỆN UPGRADEABLE
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// 2. KẾ THỪA CÁC CHUẨN CẦN THIẾT
contract ChatApp is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    
    // --- STATE VARIABLES (GIỮ NGUYÊN) ---
    struct Message {
        address sender;
        uint256 timestamp;
        string content;
        bool isDeleted; 
        bool isEdited;  
    }

    event NewMessage(
        address indexed sender,
        address indexed receiver,
        bytes32 indexed chatId, 
        string content
    );

    event MessageDeleted(
        address indexed sender,
        address indexed receiver,
        uint256 index 
    );

    event MessageEdited(
        address indexed sender,
        address indexed receiver,
        uint256 index,
        string newContent 
    );

    mapping(bytes32 => Message[]) public chatHistory;

    // --- CONSTRUCTOR & INITIALIZER (THAY ĐỔI QUAN TRỌNG) ---

    // Constructor chỉ dùng để khóa implementation lại, không cho ai init trực tiếp
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // Hàm này thay thế cho constructor, chạy 1 lần khi deploy Proxy
    function initialize() public initializer {
        __Ownable_init(msg.sender); // Set người deploy là Admin
        __UUPSUpgradeable_init();
    }

    // Hàm bắt buộc phải có để bảo mật việc nâng cấp (chỉ Owner mới được up)
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- HELPER FUNCTIONS (GIỮ NGUYÊN) ---
    function getChatId(address userA, address userB) public pure returns (bytes32) {
        if (userA < userB) {
            return keccak256(abi.encodePacked(userA, userB));
        } else {
            return keccak256(abi.encodePacked(userB, userA));
        }
    }

    // --- CORE FUNCTIONS (GIỮ NGUYÊN LOGIC CỦA BẠN) ---

    function sendMessage(address receiver, string memory content) public {
        require(receiver != address(0), "Receiver must be a valid address.");
        require(bytes(content).length > 0, "Message content cannot be empty.");

        bytes32 chatId = getChatId(msg.sender, receiver);
        
        Message memory newMessage = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            content: content,
            isDeleted: false, 
            isEdited: false   
        });

        chatHistory[chatId].push(newMessage);

        emit NewMessage(msg.sender, receiver, chatId, content);
    }

    function deleteMessage(address partner, uint256 index) public {
        bytes32 chatId = getChatId(msg.sender, partner);
        
        require(index < chatHistory[chatId].length, "Message does not exist.");
        
        Message storage targetMsg = chatHistory[chatId][index];

        require(targetMsg.sender == msg.sender, "You can only delete your own messages.");
        require(!targetMsg.isDeleted, "Message is already deleted.");

        targetMsg.isDeleted = true;

        emit MessageDeleted(msg.sender, partner, index);
    }

    function editMessage(address partner, uint256 index, string memory newContent) public {
        bytes32 chatId = getChatId(msg.sender, partner);
        
        require(index < chatHistory[chatId].length, "Message does not exist.");
        require(bytes(newContent).length > 0, "Content cannot be empty.");

        Message storage targetMsg = chatHistory[chatId][index];

        require(targetMsg.sender == msg.sender, "You can only edit your own messages.");
        require(!targetMsg.isDeleted, "Cannot edit a deleted message.");

        targetMsg.content = newContent;
        targetMsg.isEdited = true;

        emit MessageEdited(msg.sender, partner, index, newContent);
    }

    function getChatHistory(address partnerAddress) public view returns (Message[] memory) {
        bytes32 chatId = getChatId(msg.sender, partnerAddress);
        return chatHistory[chatId];
    }
}