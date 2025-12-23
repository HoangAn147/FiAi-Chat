import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import ChatAppJSON from './ChatAppABI.json';
import './App.css';
import { FiSearch, FiEdit2, FiTrash2, FiX, FiCheck } from 'react-icons/fi'; // Thêm icon FiCheck
import { IconCall, IconCamera, IconMessage, IconSetting, IconMessageAdd, IconVideo, IconSend, IconAddSquare, IconCallChatHeader } from './assets/icons';

// --- NHỚ DÁN LẠI ĐỊA CHỈ CONTRACT ĐÚNG CỦA BẠN VÀO ĐÂY ---
const CONTRACT_ADDRESS = "0x65D2176c2168e11120F485ffF922d9F0a88fE3C3";
const CHAT_ABI = ChatAppJSON.abi;

function App() {
  const [currentAccount, setCurrentAccount] = useState("");
  const [chatContract, setChatContract] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentChats, setRecentChats] = useState([]); 
  const messagesEndRef = useRef(null);

  const [receiver, setReceiver] = useState(""); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // State quản lý Edit
  const [editingMsgIndex, setEditingMsgIndex] = useState(null); 
  const [timeTick, setTimeTick] = useState(0);

  const receiverRef = useRef(""); 
  useEffect(() => { receiverRef.current = receiver; }, [receiver]);

  // Update time loop
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(prev => prev + 1), 10000); 
    return () => clearInterval(timer);
  }, []);

  const formatTimeAgo = (timestamp) => {
      if (!timestamp) return "";
      const now = Date.now();
      const diff = now - Number(timestamp);
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 10) return "Just now";
      if (seconds < 60) return `${seconds}s ago`;
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return new Date(timestamp).toLocaleDateString();
  };

  const ADDRESS_BOOK = {
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": "David Admin",
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": "Alice Mobile",
      "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": "Bob Engineer",
  };

  const staticChats = [
    { name: "Evelyn", msg: "Hello", time: Date.now() - 1000 * 60 * 5, avatar: "/Evelyn.png" }, 
    { name: "Michael", msg: "Me too!", time: Date.now() - 1000 * 60 * 60 * 2, avatar: "/Michael.png" },
    { name: "Ava Davis", msg: "Haha 😂", time: Date.now() - 1000 * 60 * 60 * 5, avatar: "/Ava.png" },
    { name: "Robert Taylor", msg: "Sounds like a plan", time: Date.now() - 1000 * 60 * 60 * 24, avatar: "/Robert.png" }, 
    { name: "Olivia", msg: "I'll mark it on my calendar", time: Date.now() - 1000 * 60 * 60 * 48, avatar: "/Olivia.png" }
  ];

  const dummyChatData = {
    "Evelyn": [
      { sender: "Evelyn", content: "Hello! How are you doing today?", timestamp: Date.now() - 100000 },
      { sender: "me", content: "I'm doing great, thanks for asking!", timestamp: Date.now() - 90000 },
      { sender: "Evelyn", content: "Have you tried the new Vision Pro yet?", timestamp: Date.now() - 80000 },
    ],
    "Michael": [
      { sender: "Michael", content: "Hey, are we still on for the meeting?", timestamp: Date.now() - 200000 },
      { sender: "me", content: "Yes, definitely. 5 PM right?", timestamp: Date.now() - 180000 },
      { sender: "Michael", content: "Me too! See you then.", timestamp: Date.now() - 60000 },
    ],
    // ... các user khác
  };


  const getUserName = (address) => {
      if (!address) return "";
      const isStatic = staticChats.some(u => u.name === address);
      if (isStatic) return address;
      const lowerAddr = address.toLowerCase();
      if (ADDRESS_BOOK[lowerAddr]) return ADDRESS_BOOK[lowerAddr];
      if (ethers.isAddress(address)) return `User ${address.slice(0,4)}...${address.slice(-4)}`;
      return address;
  };

  const getCurrentAvatar = (addressOrName) => {
      const staticUser = staticChats.find(u => u.name === addressOrName);
      if (staticUser) return staticUser.avatar;
      return '/default.png';
  };

  const resolveSearchInput = (input) => {
      const lowerInput = input.toLowerCase();
      if (ethers.isAddress(input)) return input;
      const foundAddr = Object.keys(ADDRESS_BOOK).find(addr => 
          ADDRESS_BOOK[addr].toLowerCase().includes(lowerInput)
      );
      if (foundAddr) return foundAddr;
      const foundStatic = staticChats.find(u => u.name.toLowerCase().includes(lowerInput));
      if (foundStatic) return foundStatic.name;
      return null;
  };

  useEffect(() => {
    const savedChats = localStorage.getItem("recentChats");
    if (savedChats) {
      try { setRecentChats(JSON.parse(savedChats)); } 
      catch (error) { console.error("Lỗi đọc cache:", error); }
    }
  }, []);

// --- CORE: Load danh bạ & Fix lỗi Timestamp khi F5 ---
  const loadContactsFromBlockchain = async () => {
    if (!chatContract || !currentAccount) return;
    try {
      const savedChatsStr = localStorage.getItem("recentChats");
      const savedChats = savedChatsStr ? JSON.parse(savedChatsStr) : [];
      const savedMap = {};
      savedChats.forEach(u => savedMap[u.address.toLowerCase()] = u);

      // 1. Quét Logs
      const filterIncoming = chatContract.filters.NewMessage(null, currentAccount);
      const filterOutgoing = chatContract.filters.NewMessage(currentAccount, null);

      const [logsIncoming, logsOutgoing] = await Promise.all([
        chatContract.queryFilter(filterIncoming),
        chatContract.queryFilter(filterOutgoing)
      ]);

      const allLogs = [...logsIncoming, ...logsOutgoing];
      allLogs.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.index - b.index));

      const partnerLogs = {};
      allLogs.forEach(log => {
        const sender = log.args[0];
        const to = log.args[1];
        const partner = (sender.toLowerCase() === currentAccount.toLowerCase()) ? to : sender;
        const partnerLower = partner.toLowerCase();
        if (!partnerLogs[partnerLower]) partnerLogs[partnerLower] = [];
        partnerLogs[partnerLower].push(log);
      });

      let newRecentChats = [];

      Object.keys(partnerLogs).forEach(partnerAddr => {
        const logs = partnerLogs[partnerAddr];
        const savedUser = savedMap[partnerAddr];
        
        const latestLog = logs[logs.length - 1];
        const logContent = latestLog.args[3]; 
        const headBlock = latestLog.blockNumber;
        const headIndex = latestLog.index;
        const isMeSender = latestLog.args[0].toLowerCase() === currentAccount.toLowerCase();

        let lastSeenBlock = 0;
        let lastSeenIndex = 0;
        
        // Mặc định timestamp là giờ hiện tại (cho user mới)
        let timestampToSave = Date.now(); 

        if (savedUser) {
            if (savedUser.lastSeenBlock) {
                lastSeenBlock = savedUser.lastSeenBlock;
                lastSeenIndex = savedUser.lastSeenIndex;
            } else if (savedUser.lastMessage) {
                 for (let i = logs.length - 1; i >= 0; i--) {
                     if (logs[i].args[3] === savedUser.lastMessage) {
                         lastSeenBlock = logs[i].blockNumber;
                         lastSeenIndex = logs[i].index;
                         break;
                     }
                 }
            }
            timestampToSave = savedUser.timestamp; 
        }

        let unreadCount = 0;
        logs.forEach(log => {
             const isIncoming = log.args[0].toLowerCase() !== currentAccount.toLowerCase();
             const logBlock = log.blockNumber;
             const logIndex = log.index;
             const isNewer = (logBlock > lastSeenBlock) || (logBlock === lastSeenBlock && logIndex > lastSeenIndex);
             if (isIncoming && isNewer) unreadCount++;
        });

        // Kiểm tra xem có đang mở chat với người này không?
        const isOpenChat = receiverRef.current.toLowerCase() === partnerAddr.toLowerCase();

        if (isMeSender || isOpenChat) {
            unreadCount = 0;
            lastSeenBlock = headBlock;
            lastSeenIndex = headIndex;
            
            if (!savedUser || (savedUser && savedUser.lastMessage !== logContent)) {
                 timestampToSave = Date.now();
            }
        } else {
            if (unreadCount > 0) timestampToSave = Date.now();
        }

        newRecentChats.push({
          address: partnerAddr,
          name: getUserName(partnerAddr),
          lastMessage: logContent,
          unreadCount: unreadCount,
          timestamp: timestampToSave,
          headBlock: headBlock,
          headIndex: headIndex,
          lastSeenBlock: lastSeenBlock,
          lastSeenIndex: lastSeenIndex
        });
      });

      // --- Gọi Contract để lấy trạng thái thực tế (Deleted/Edited) VÀ THỜI GIAN CHUẨN ---
      const finalChats = await Promise.all(newRecentChats.map(async (chat) => {
          try {
              const history = await chatContract.getChatHistory(chat.address);
              if (history && history.length > 0) {
                  const actualLastMsg = history[history.length - 1];
                  
                  // Update nội dung
                  if (actualLastMsg.isDeleted) {
                      chat.lastMessage = "Message deleted";
                  } else {
                      chat.lastMessage = actualLastMsg.content;
                  }
                  chat.timestamp = Number(actualLastMsg.timestamp) * 1000;
              }
          } catch (err) {
              console.warn("Lỗi tải trạng thái user:", chat.name);
          }
          return chat;
      }));
      
      finalChats.sort((a, b) => {
          if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
          return b.timestamp - a.timestamp;
      });

      setRecentChats(finalChats);
      localStorage.setItem("recentChats", JSON.stringify(finalChats));

    } catch (error) { console.error("Lỗi quét history:", error); }
  };


  // --- CORE: Select Chat & Reset Edit Mode ---
  const selectChat = (userAddress) => {
        setReceiver(userAddress); 
        setSearchQuery(""); 
        setIsSearchFocused(false);
        
        // QUAN TRỌNG: Reset chế độ sửa khi đổi user
        setEditingMsgIndex(null); 
        setInputMsg("");

        if (ethers.isAddress(userAddress)) {
            setRecentChats(prev => {
              const updatedList = prev.map(u => {
                  if (u.address.toLowerCase() === userAddress.toLowerCase()) {
                      return { 
                          ...u, 
                          unreadCount: 0, 
                          lastSeenBlock: u.headBlock || u.lastSeenBlock, 
                          lastSeenIndex: u.headIndex || u.lastSeenIndex
                      };
                  }
                  return u;
              });
              localStorage.setItem("recentChats", JSON.stringify(updatedList));
              return updatedList;
            });
            fetchChatHistory(userAddress, true);
        } else {
            const rawDummyData = dummyChatData[userAddress] || [];
            const processedMessages = rawDummyData.map(m => ({
                ...m,
                sender: m.sender === "me" ? currentAccount : m.sender
            }));
            setMessages(processedMessages);
        }
  };

  // --- ACTIONS: Delete ---
  const deleteMessage = async (index) => {
    if (!chatContract || !receiver) return;
    if (!window.confirm("Bạn có chắc muốn xóa tin nhắn này không?")) return;
    try {
        const tx = await chatContract.deleteMessage(receiver, index);
        await tx.wait();
    } catch (error) {
        console.error("Lỗi xóa:", error);
        alert("Xóa thất bại!");
    }
  };

  // --- ACTIONS: Send / Edit ---
  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !receiver || !chatContract) return;

    try {
      if (editingMsgIndex !== null) {
          // --- CASE SỬA TIN NHẮN ---
          console.log("Đang sửa tin nhắn ID:", editingMsgIndex);
          const tx = await chatContract.editMessage(receiver, editingMsgIndex, inputMsg);
          setInputMsg("");
          setEditingMsgIndex(null); // Tắt chế độ sửa ngay
          await tx.wait();
          // Event Listener sẽ tự update UI
      } else {
          // --- CASE GỬI MỚI ---
          console.log("Đang gửi tin mới...");
          const tx = await chatContract.sendMessage(receiver, inputMsg);
          setInputMsg("");
          await tx.wait();
          loadContactsFromBlockchain(); 
      }
    } catch (error) { 
        console.error(error); 
        alert(editingMsgIndex !== null ? "Sửa thất bại!" : "Gửi thất bại!"); 
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) { alert("Vui lòng cài đặt Metamask!"); return; }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setCurrentAccount(address);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CHAT_ABI, signer);
      setChatContract(contract);
    } catch (error) { console.error(error); }
  };

  const fetchChatHistory = async (partnerAddress, showLoading = true) => {
    if (!chatContract || !ethers.isAddress(partnerAddress)) return;
    try {
      if (showLoading) setIsLoading(true);
      const data = await chatContract.getChatHistory(partnerAddress);
      
      const formattedMessages = data.map((msg, index) => ({
        id: index, 
        sender: msg.sender, 
        content: msg.content, 
        timestamp: Number(msg.timestamp),
        isDeleted: msg.isDeleted,
        isEdited: msg.isEdited
      }));
      
      setMessages(prev => {
          if (prev.length !== formattedMessages.length || editingMsgIndex !== null) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
          return formattedMessages;
      });
      if (showLoading) setIsLoading(false);
    } catch (error) { console.error(error); if (showLoading) setIsLoading(false); }
  };

  // --- EVENT LISTENER ---
  useEffect(() => {
    if (!chatContract || !currentAccount) return;

    loadContactsFromBlockchain();

    const updateSidebarPreview = (partnerAddress, newContent, time = Date.now()) => {
        setRecentChats(prev => {
            const updatedList = prev.map(user => {
                if (user.address.toLowerCase() === partnerAddress.toLowerCase()) {
                    return { 
                        ...user, 
                        lastMessage: newContent,
                        timestamp: time 
                    };
                }
                return user;
            });
            localStorage.setItem("recentChats", JSON.stringify(updatedList));
            return updatedList;
        });
    };

    const onNewMessage = (sender, to, chatId, content) => {
        loadContactsFromBlockchain();
        const senderAddr = sender.toLowerCase();
        const myAddr = currentAccount.toLowerCase();
        if (receiverRef.current.toLowerCase() === senderAddr || 
            (senderAddr === myAddr && receiverRef.current.toLowerCase() === to.toLowerCase())) {
            fetchChatHistory(receiverRef.current, false);
        }
    };

    const onMessageUpdated = (sender, partner, index) => {
        const senderAddr = sender.toLowerCase();
        const partnerAddr = partner.toLowerCase();
        const myAddr = currentAccount.toLowerCase();
        
        // Reload chat nếu đang mở hội thoại này
        const otherPerson = senderAddr === myAddr ? partnerAddr : senderAddr;
        if (receiverRef.current.toLowerCase() === otherPerson) {
            fetchChatHistory(receiverRef.current, false);
        }
    };
    
    // Riêng cho Edit/Delete cần update Sidebar preview
    const onDeletedSidebar = (sender, partner) => {
        const otherPerson = sender.toLowerCase() === currentAccount.toLowerCase() ? partner : sender;
        updateSidebarPreview(otherPerson, "Message deleted");
    };
    const onEditedSidebar = (sender, partner, index, newContent) => {
        const otherPerson = sender.toLowerCase() === currentAccount.toLowerCase() ? partner : sender;
        updateSidebarPreview(otherPerson, newContent);
    };

    chatContract.on("NewMessage", onNewMessage);
    
    // Lắng nghe để reload khung chat
    chatContract.on("MessageDeleted", onMessageUpdated);
    chatContract.on("MessageEdited", onMessageUpdated);
    
    // Lắng nghe để update sidebar (tách riêng cho rõ)
    chatContract.on("MessageDeleted", (s, p, i) => onDeletedSidebar(s, p));
    chatContract.on("MessageEdited", (s, p, i, c) => onEditedSidebar(s, p, i, c));

    return () => { 
        chatContract.off("NewMessage", onNewMessage); 
        chatContract.off("MessageDeleted", onMessageUpdated);
        chatContract.off("MessageEdited", onMessageUpdated);
        chatContract.removeAllListeners("MessageDeleted"); 
        chatContract.removeAllListeners("MessageEdited");
    };
  }, [chatContract, currentAccount]);


  const filteredChats = recentChats.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resolvedSearchTarget = resolveSearchInput(searchQuery);

  return (
    <div className="app-wrapper">
      {!currentAccount ? (
        <div className="main-window" style={{ width: '500px', height: '300px', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>Fi.AI Vision</h1>
          <button className="input-pill" onClick={connectWallet} style={{ width: '200px', justifyContent: 'center', cursor: 'pointer', background: '#0A84FF', color: 'white', border: 'none' }}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          <div className="floating-nav">
            <div className="nav-group-top">
              <div className="nav-item active"><IconCall stroke="white" /></div>
              <div className="nav-item"><IconCamera stroke="white" /></div>
              <div className="nav-item"><IconMessage stroke="white" /></div>
            </div>
            <div className="nav-group-bottom">
              <div className="nav-item"><IconSetting stroke="white" /></div>
            </div>
          </div>

          <div className="main-window">
             <div className="sidebar">
                <div className="sidebar-top">
                  <div className="sidebar-title">Chats</div>
                  <div className="icon-circle-btn"><IconMessageAdd stroke="white" /></div>
                </div>

                <div className="search-pill">
                    <FiSearch style={{opacity: 0.5}} />
                    <input 
                        placeholder="Search name or address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => { setTimeout(() => setIsSearchFocused(false), 200) }}
                    />
                </div>

                <div className="user-list">
                    {searchQuery && filteredChats.length === 0 && resolvedSearchTarget && (
                         <div className="user-item" onClick={() => selectChat(resolvedSearchTarget)} style={{background: 'rgba(10, 132, 255, 0.2)'}}>
                            <div className="avatar" style={{background: '#0A84FF', display:'flex', alignItems:'center', justifyContent:'center'}}>+</div>
                            <div className="user-info">
                                <div className="name-row"><span className="u-name">Chat with {getUserName(resolvedSearchTarget)}</span></div>
                                <div className="u-msg">Click to start</div>
                            </div>
                         </div>
                    )}

                    {filteredChats.map((user, index) => (
                        <div 
                            key={index} 
                            className={`user-item ${receiver.toLowerCase() === user.address.toLowerCase() ? 'active' : ''} ${user.unreadCount > 0 ? 'has-unread' : ''}`}
                            onClick={() => selectChat(user.address)}
                        >
                            <div className="avatar" style={{backgroundImage: `url(${getCurrentAvatar(user.address)})`}}></div>
                            <div className="user-info">
                                <div className="name-row"><span className="u-name">{getUserName(user.address)}</span></div>
                                <div className="u-msg">{user.lastMessage || "Start a conversation"}</div>
                            </div>
                            <div className="meta-col">
                                 <span className="u-time">{formatTimeAgo(user.timestamp)}</span>
                                 {user.unreadCount > 0 && <div className="unread-badge">{user.unreadCount}</div>}
                            </div>
                        </div>
                    ))}
                    
                    {!searchQuery && staticChats.map((user, index) => (
                       <div key={`static-${index}`} className={`user-item`} onClick={() => selectChat(user.name)}>
                           <div className="avatar" style={{backgroundImage: `url(${user.avatar})`}}></div>
                           <div className="user-info">
                               <div className="name-row"><span className="u-name">{user.name}</span></div>
                               <div className="u-msg">{user.msg}</div>
                           </div>
                       </div>
                    ))}
                </div>
             </div>

             <div className="chat-area">
                <div className="chat-header">
                  {receiver ? (
                    <>
                      <div style={{display:'flex', alignItems:'center'}}>
                          <div className="avatar" style={{width:'40px', height:'40px', backgroundImage: `url(${getCurrentAvatar(receiver)})`}}></div>
                          <div style={{display:'flex', flexDirection:'column', marginLeft:'12px'}}>
                              <span style={{fontWeight:'700', fontSize:'1.1rem', letterSpacing:'0.5px'}}>{getUserName(receiver)}</span>
                              <span style={{fontSize:'0.8rem', opacity:0.6, marginTop:'2px'}}>Last Seen 2h ago</span>
                          </div>
                      </div>
                      <div className="header-actions">
                          <button className="header-btn"><IconVideo stroke="white" /></button>
                          <button className="header-btn"><IconCallChatHeader stroke="white" fill="none"/></button>
                      </div>
                    </>
                  ) : (
                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', opacity:0.5, fontSize:'1.1rem', fontWeight:600}}>
                        Fi.AI Messenger
                    </div>
                  )}
                </div>

                <div className="messages-list">
                    {receiver && !ethers.isAddress(receiver) && messages.length === 0 && (
                         <div style={{textAlign:'center', marginTop:'50px', opacity:0.6}}>
                            <p>No dummy data found for <b>{receiver}</b>.</p>
                        </div>
                    )}
                    
                    {messages.map((m, index) => {
                      const isMe = m.sender.toLowerCase() === currentAccount.toLowerCase();
                      
                      if (m.isDeleted) {
                          return (
                              <div key={index} className={`msg-group ${isMe ? 'sent-group' : 'received-group'}`}>
                                  <div className={`msg ${isMe ? 'sent' : 'received'} deleted`}>Message deleted</div>
                              </div>
                          )
                      }
                      
                      return (
                          <div key={index} className={`msg-group ${isMe ? 'sent-group' : 'received-group'}`}>
                              <div className={`msg ${isMe ? 'sent' : 'received'}`}>
                                  {m.content}
                                  {m.isEdited && <span className="edited-label">(edited)</span>}
                              </div>
                              {isMe && (
                                  <div className="msg-actions">
                                      <button onClick={() => {
                                          setInputMsg(m.content);
                                          setEditingMsgIndex(m.id); // Set ID tin nhắn muốn sửa
                                      }} title="Edit"><FiEdit2 size={13}/></button>
                                      <button onClick={() => deleteMessage(m.id)} title="Delete" style={{color:'#ff4d4d'}}><FiTrash2 size={13}/></button>
                                  </div>
                              )}
                          </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {receiver && !searchQuery && !isSearchFocused && (
                <div className="input-wrapper">
                    {/* Hiển thị chỉ báo ĐANG SỬA */}
                    {editingMsgIndex !== null && <div className="editing-indicator">Editing message...</div>}
                    
                    <div className="input-pill" style={editingMsgIndex !== null ? {border: '1px solid #0A84FF', boxShadow: '0 0 15px rgba(10,132,255,0.3)'} : {}}>
                        
                        {editingMsgIndex !== null ? (
                            // Nút HỦY Sửa (X)
                            <button className="plus-btn" onClick={() => {
                                setEditingMsgIndex(null);
                                setInputMsg("");
                            }} style={{background:'rgba(255,59,48,0.2)', color:'#ff3b30', border: '1px solid rgba(255,59,48,0.3)'}} title="Cancel Edit">
                                <FiX size={20} />
                            </button>
                        ) : (
                            <button className="plus-btn"><IconAddSquare /></button>
                        )}

                        <div className="input-inner-bar">
                            <input 
                                className="input-field"
                                placeholder={editingMsgIndex !== null ? "Type new content..." : `Message ${getUserName(receiver)}...`}
                                value={inputMsg}
                                onChange={e => setInputMsg(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={!ethers.isAddress(receiver)} 
                            />
                        </div>
                        <button className="send-btn-round" onClick={handleSendMessage} disabled={!ethers.isAddress(receiver)}>
                             {/* Đổi Icon Gửi thành Icon Check khi đang sửa */}
                             {editingMsgIndex !== null ? <FiCheck size={22}/> : <IconSend />}
                        </button>
                    </div>
                </div>
                )}
             </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;