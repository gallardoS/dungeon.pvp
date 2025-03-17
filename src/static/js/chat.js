/**
 * chat.js - Chat module for Dungeon PvP
 * Handles all chat-related functionality including UI interaction and WebSocket communication
 */

let lastChatTime = Date.now();
let chatFadeTimer = null;
let isChatFocused = false;
let socket = null;

/**
 * Initialize the chat module
 * @param {Object} socketInstance - The socket.io instance to use for communication
 */
function initChat(socketInstance) {
    socket = socketInstance;
    
    socket.on('chatMessage', (data) => {
        addChatMessage(data.sender, data.message, data.timestamp);
    });

    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('focus', () => {
        isChatFocused = true;
    });
    
    messageInput.addEventListener('blur', () => {
        isChatFocused = false;
    });
    
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.addEventListener('mouseenter', () => {
        showChat();
    });
    
    chatContainer.addEventListener('mouseleave', () => {
        resetChatFadeTimer();
    });

    document.getElementById('sendButton').addEventListener('click', sendChatMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

/**
 * Add a chat message to the chat container
 * @param {string} sender - The name of the message sender
 * @param {string} message - The message content
 * @param {number} timestamp - The message timestamp
 */
function addChatMessage(sender, message, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const time = new Date(timestamp);
    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    messageElement.innerHTML = `
        <span class="sender">${sender}:</span>
        ${message}
        <span class="timestamp">${timeString}</span>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    while (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
    
    lastChatTime = Date.now();
    
    document.querySelectorAll('.chat-message').forEach(msg => {
        msg.classList.remove('fading');
    });
    
    const chatContainer = document.getElementById('chatContainer');
    const chatMessagesElement = document.getElementById('chatMessages');
    
    if (chatContainer) chatContainer.classList.remove('fading');
    if (chatMessagesElement) chatMessagesElement.classList.remove('fading');
    
    resetChatFadeTimer();
}

/**
 * Reset the chat fade timer
 * This will make the chat fade out after 5 seconds of inactivity
 */
function resetChatFadeTimer() {
    if (chatFadeTimer) {
        clearTimeout(chatFadeTimer);
    }
    
    chatFadeTimer = setTimeout(() => {
        document.querySelectorAll('.chat-message').forEach(msg => {
            msg.classList.add('fading');
        });
        
        const chatContainer = document.getElementById('chatContainer');
        const chatMessages = document.getElementById('chatMessages');
        
        if (chatContainer) chatContainer.classList.add('fading');
        if (chatMessages) chatMessages.classList.add('fading');
    }, 5000);
}

/**
 * Send a chat message through the socket
 */
function sendChatMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && socket) {
        socket.emit('chatMessage', { message });
        messageInput.value = '';
        
        resetChatFadeTimer();
    }
}

/**
 * Show the chat (remove fading class)
 */
function showChat() {
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatContainer) chatContainer.classList.remove('fading');
    if (chatMessages) chatMessages.classList.remove('fading');
    
    document.querySelectorAll('.chat-message').forEach(msg => {
        msg.classList.remove('fading');
    });
    
    resetChatFadeTimer();
}

/**
 * Check if the chat input is currently focused
 * @returns {boolean} True if chat input is focused
 */
function isChatInputFocused() {
    return isChatFocused;
}

export {
    initChat,
    addChatMessage,
    sendChatMessage,
    resetChatFadeTimer,
    showChat,
    isChatInputFocused
};
