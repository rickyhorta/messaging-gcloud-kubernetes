import React, { useCallback, useState, useEffect, useRef } from "react";
import "../App.css";

function ChatPage({ onLogout }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const chatWindowRef = useRef(null);
  const shouldScrollRef = useRef(false);

  const BASE_URL = "/api";

  const getToken = () => (localStorage.getItem("token") || "").trim();

  // Fetch user's chats -> left sidebar

  const fetchChats = useCallback(async () => {
    try {
      const token = getToken();

      if (!token) {
          console.warn("Token not found.");
          return; 
      }

      const res = await fetch(`${BASE_URL}/chats/me`, {
      headers: { Authorization: token },
    });

    if (!res.ok) throw new Error("Failed to fetch chats");

    const data = await res.json();
    setChats(data);

    } catch (err) {
      console.warn("⚠️ Backend not reachable");
    }
  }, []);

  useEffect(() => {

    const token = localStorage.getItem("token");

    // Decode JWT to get user ID
    if (token) {
      try {

        const jwt = token.trim().split(' ')[1];
        const payloadBase64 = jwt.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
                
               
        const userId = payload.user_id || payload.sub; 
          if (userId) {
            setCurrentUserId(parseInt(userId, 10)); 
        }
      }catch (err) {
      console.error("Failed to decode token:", err);
      }
    }
  }, []);


  // Fetch messages for a specific chat
  const fetchMessages = useCallback(async (chatId) => {

    const token = getToken();
    if (!token) {return;}

    try {
      const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`, { 
        headers: { Authorization: token },
      });

      if(!res.ok) throw new Error("Failed to fetch messages");

      const messagesData = await res.json();
      setMessages(messagesData);
    } catch (err) {
      console.warn("⚠️ Backend not reachable");
    }
  }, []);

  useEffect(() => {
    fetchChats();
    if (selectedChat) fetchMessages(selectedChat.id);

    const interval = setInterval(() => {
      fetchChats();
      if (selectedChat) fetchMessages(selectedChat.id);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [selectedChat, fetchChats, fetchMessages]);

  // Jump to the newest message once, when a chat is opened
  useEffect(() => {
    if (!shouldScrollRef.current) return;
    const el = chatWindowRef.current;
    if (el && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
      shouldScrollRef.current = false;
    }
  }, [messages.length]);

  //  --------------------------------------
  //               Functions
  // ---------------------------------------

  // Send message
const handleSend = async () => {
  if (message.trim() === "" || !selectedChat) return;

  const token = getToken();
  if (!token) {
    console.error("Authentication token not found.");
    return;
  }

  
  const messageContent = message.trim();
  setMessage(""); 

  try {
    const res = await fetch(`${BASE_URL}/chats/${selectedChat.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ content: messageContent }),
    });

    if (!res.ok) throw new Error("Failed to send message");

    const newMessage = await res.json();
    
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === selectedChat.id);
      if (chatIndex !== -1) {
        const updatedChat = { ...prevChats[chatIndex], updated_at: new Date().toISOString() };
        const otherChats = prevChats.filter(c => c.id !== selectedChat.id);
    
        const newChats = [...otherChats, updatedChat].sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
        );
        return newChats;
      }
      return prevChats;
    });


  } catch (err) {
    console.error("Error sending message:", err);
    alert("Error sending message. Please check the backend connection.");
    // Opcional: Reverter o message state se falhar
    setMessage(messageContent);
  }
};


  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    if (typeof onLogout === "function") onLogout();
  };

  //New chat
  const handleStartNewChat = async () => {
    setIsNewChatOpen(true);

    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: token },
    });

      if (!res.ok) throw new Error("Failed to fetch users");
      const allUsers = await res.json();

      const filteredUsers = allUsers.filter(user => user.id !== currentUserId);
        
       setUsers(filteredUsers);
    } catch (err) {
      console.warn("⚠️ Backend not reachable");
    }
  };

  const closeNewChat = () => {
    setIsNewChatOpen(false);
    setSelectedUsers([]);
  };
  
  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };


  // Create chat
  const handleCreateChat = async () => {

    if (selectedUsers.length === 0) {
      alert("Please select at least one user to vibe with!");
      return;
    }

    try {
      const token = getToken();

      const res = await fetch(`${BASE_URL}/chats`, {
        method: "POST",
        headers: {  
          "Content-Type": "application/json",
          Authorization: token, 
        },
        body: JSON.stringify({ user_ids: selectedUsers, name: null}), 
      });

      if (!res.ok) throw new Error("Failed to create chat");

      const newChat = await res.json();
      setChats((prev) => [...prev, newChat]);
      alert(`✨ Started vibing with: ${newChat.name}`);

      handleSelectChat(newChat);

      } catch (err) {
      console.warn("⚠️ Backend not reachable");
      }

    closeNewChat();
  };
  
  //handle chat selection
  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    shouldScrollRef.current = true;
    // Clear unread from chat in list 
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
    );
    // Fetch messages for the selected chat
    fetchMessages(chat.id);
  };



  // ---------------------------------------
  //               RENDER
  // ---------------------------------------
  return (
    <div className="App">
      <div className="chat-container">

        {/* Sidebar - Left side */}
        <div className="chat-sidebar">
          <h3>VIBES</h3> 

          {/* LISTA DE CHATS*/}
          <div className="chat-list">
            {chats.map((chat) => (
              <div key={chat.id} 
              className={`chat-item ${selectedChat && selectedChat.id === chat.id ? 'active' : ''}`}
              onClick={() => handleSelectChat(chat)}
            >
              {chat.name}
              {chat.unread_count > 0 && (!selectedChat || selectedChat.id !== chat.id) && (
                  <span
                    style={{
                      background: "#e03131",
                      color: "white",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      marginLeft: "8px",
                    }}
                  >
                    {chat.unread_count}
                  </span>
                )}

            </div>
          ))}
        </div>

          <div className="sidebar-buttons">
            <button className="start-chat" onClick={handleStartNewChat}>
              Start New Chat
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>


        {/*-------------- Main chat area--------------------- */}

        <div className="chat-main">
          
          <div className="chat-header">
            {selectedChat ? (
              <h4>{selectedChat.name}</h4>
            ) : (
            <h4>Select a Vibe to start chatting!</h4>
          )}
          </div>
          
          <div className="chat-window" ref={chatWindowRef}>
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id || i}
                  className={`chat-message ${isMine ? 'mine' : 'theirs'}`}
                >
                {!isMine && (
                <strong className="username">
                    {msg.user_username || msg.user}<br></br>
                </strong> 
                )
                }
                {msg.content || msg.text}
             </div>
              )
            }
            )}
          </div>
          
          {/* MESSAGE INPUT*/ }
          {selectedChat ? (
            <div className="chat-input">
              <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            />
            <button className="send-button" onClick={handleSend}> Send </button>
          </div>
          ) : (
          <div className="chat-input-placeholder"></div>
        )}
      </div>
    </div>

      {/*--------------- Modal-------------- */}
      {isNewChatOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h4>Who do you want to vibe with?</h4>

            <div style={{ marginTop: "10px" }}>
              {users.map((user) => (
                <label
                  key={user.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                  {user.username}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="cancel" onClick={closeNewChat}>Cancel</button>
              <button className="startVibing" onClick={handleCreateChat}>Start Vibing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
