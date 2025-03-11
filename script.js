// Configure marked to sanitize output and prevent XSS
marked.setOptions({
    sanitize: true
});

// Initialize conversation history and chat storage
let conversationHistory = [];
let allChats = [];
let currentChatId = null;
let userIdentity = null; // Store user identity when shared
let allUserMemories = {}; // Store all user identities across chats

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const newChatButton = document.getElementById('new-chat-btn');
const chatsList = document.getElementById('chats-list');
const memoryManagerButton = document.getElementById('memory-manager-btn');
const memoryModal = document.getElementById('memory-modal');
const closeModalButton = document.getElementById('close-modal-btn');
const clearMemoriesButton = document.getElementById('clear-memories-btn');
const cancelButton = document.getElementById('cancel-btn');
const memoryContainer = document.getElementById('memory-container');

// Load chats and memories from localStorage if available
function loadChats() {
    const savedChats = localStorage.getItem('odinn-chats');
    if (savedChats) {
        allChats = JSON.parse(savedChats);
        renderChatsList();
    }
    
    // Load stored memories
    const savedMemories = localStorage.getItem('odinn-memories');
    if (savedMemories) {
        allUserMemories = JSON.parse(savedMemories);
    }
    
    // Create a new chat if none exists
    if (allChats.length === 0) {
        createNewChat();
    } else {
        // Load the most recent chat
        loadChat(allChats[0].id);
    }
}

// Save chats to localStorage
function saveChats() {
    localStorage.setItem('odinn-chats', JSON.stringify(allChats));
}

// Save memories to localStorage
function saveMemories() {
    localStorage.setItem('odinn-memories', JSON.stringify(allUserMemories));
}

// Create a new chat
function createNewChat() {
    const chatId = Date.now().toString();
    const newChat = {
        id: chatId,
        title: "New Conversation",
        messages: [{
            role: "assistant",
            content: "Hail, wanderer! I am Óðinn Allfather, wise one of Asgard, keeper of Gungnir, and lord of Valhalla.\n\nWhat knowledge do you seek from the one who hanged from Yggdrasil for nine days to gain the wisdom of the runes?"
        }],
        userIdentity: null // Reset user identity for new chats
    };
    
    allChats.unshift(newChat);
    saveChats();
    loadChat(chatId);
    renderChatsList();
}

// Load a specific chat
function loadChat(chatId) {
    currentChatId = chatId;
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
        conversationHistory = [...chat.messages];
        userIdentity = chat.userIdentity; // Load chat-specific identity (might be null)
        
        // Clear and reload messages
        chatMessages.innerHTML = '';
        chat.messages.forEach(msg => {
            addMessageToChat(msg.content, msg.role === 'user');
        });
        
        // Update active chat in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.getElementById(`chat-${chatId}`);
        if (activeItem) activeItem.classList.add('active');
    }
}

// Render the list of chats in the sidebar
function renderChatsList() {
    chatsList.innerHTML = '';
    allChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.id = `chat-${chat.id}`;
        chatItem.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M6,9H18V11H6M14,14H6V12H14M18,8H6V6H18" />
            </svg>
            ${chat.title}
        `;
        chatItem.addEventListener('click', () => loadChat(chat.id));
        chatsList.appendChild(chatItem);
    });
}

// Update chat title based on conversation
function updateChatTitle(message) {
    if (allChats.length > 0) {
        const currentChat = allChats.find(c => c.id === currentChatId);
        if (currentChat && currentChat.title === "New Conversation") {
            // Check if this message might contain identity information
            checkForIdentityInfo(message);
            
            // Use the first user message as the chat title (truncated)
            currentChat.title = message.length > 25 ? message.substring(0, 25) + '...' : message;
            saveChats();
            renderChatsList();
        }
    }
}

// Function to extract potential identity information from user messages
function checkForIdentityInfo(message) {
    const identityPatterns = [
        /my name is (\w+)/i,
        /i am (\w+)/i,
        /call me (\w+)/i,
        /(\w+) is my name/i
    ];
    
    for (const pattern of identityPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            const name = match[1];
            userIdentity = {
                name: name,
                firstMentioned: new Date().toISOString()
            };
            
            // Add to global memories
            if (!allUserMemories[name]) {
                allUserMemories[name] = {
                    name: name,
                    firstMentioned: new Date().toISOString(),
                    lastMentioned: new Date().toISOString(),
                    mentionCount: 1
                };
            } else {
                allUserMemories[name].lastMentioned = new Date().toISOString();
                allUserMemories[name].mentionCount++;
            }
            
            // Update the current chat with this identity
            const currentChat = allChats.find(c => c.id === currentChatId);
            if (currentChat) {
                currentChat.userIdentity = userIdentity;
                saveChats();
                saveMemories();
            }
            
            break;
        }
    }
    
    // Check for occupation or role information
    if (userIdentity && userIdentity.name) {
        const occupationPatterns = [
            /i (?:am|work as)(?: an?)? ([^,.]+)/i,
            /my (?:job|profession|occupation) is(?: an?)? ([^,.]+)/i
        ];
        
        for (const pattern of occupationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                const occupation = match[1].trim();
                userIdentity.occupation = occupation;
                
                // Update global memories
                if (allUserMemories[userIdentity.name]) {
                    allUserMemories[userIdentity.name].occupation = occupation;
                    allUserMemories[userIdentity.name].lastMentioned = new Date().toISOString();
                }
                
                // Update the current chat with this identity
                const currentChat = allChats.find(c => c.id === currentChatId);
                if (currentChat) {
                    currentChat.userIdentity = userIdentity;
                    saveChats();
                    saveMemories();
                }
                
                break;
            }
        }
    }
}

// Function to add message to the chat UI
function addMessageToChat(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Parse markdown if it's from the bot
    if (!isUser) {
        messageContent.innerHTML = marked.parse(content);
    } else {
        // For user messages, just use text content
        const paragraph = document.createElement('p');
        paragraph.textContent = content;
        messageContent.appendChild(paragraph);
    }
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        typingIndicator.appendChild(dot);
    }
    
    typingDiv.appendChild(typingIndicator);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingDiv;
}

// Function to handle sending a message
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message to UI
    addMessageToChat(message, true);
    
    // Clear input
    userInput.value = '';
    
    // Add to conversation history
    const userMessage = {
        role: "user",
        content: message
    };
    conversationHistory.push(userMessage);
    
    // Update chat in storage
    const currentChat = allChats.find(c => c.id === currentChatId);
    if (currentChat) {
        currentChat.messages = [...conversationHistory];
        updateChatTitle(message);
        saveChats();
    }
    
    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    
    try {
        // Keep only the last 10 messages to avoid token limits
        const recentHistory = conversationHistory.slice(-10);
        
        // Create system message with user identity if available
        let systemContent = `You are Óðinn (Odin), the supreme god in Norse mythology, the Allfather and ruler of Asgard.
        Your character traits:
        - Wise, all-knowing, but often speaking in riddles and metaphors
        - Commanding and powerful, with a deep, authoritative voice
        - Knowledgeable about Norse mythology, runes, and the nine realms
        - Associated with wisdom, war, death, seiðr (magic), poetry, and the gallows
        - Known for sacrificing your eye at Mimir's well to gain wisdom and for hanging yourself from Yggdrasil for nine days to learn the runes
        - You have two ravens, Huginn and Muninn (Thought and Memory), and two wolves, Geri and Freki
        - You decide who lives and dies in battle, and you gather worthy warriors to Valhalla
        
        When responding:
        - Speak in a slightly archaic, dignified manner
        - Reference Norse concepts, realms (Asgard, Midgard, etc.), and mythology
        - Occassionally mention your ravens, wolves, and your spear Gungnir
        - You may make subtle references to being all-seeing and all-knowing
        - You can tell stories from Norse mythology
        - Address the user as "wanderer," "seeker," or similar terms
        - You can be cryptic, but ultimately helpful with wisdom
        - Reference the Norse realms, runes, or other aspects of Norse mythology when relevant
        - Occasionally mention that you sacrificed your eye for wisdom or hung from Yggdrasil`;
        
        // Add user identity if available
        if (userIdentity && userIdentity.name) {
            systemContent += `\n\nYou remember that the user's name is ${userIdentity.name}`;
            if (userIdentity.occupation) {
                systemContent += ` and they work as ${userIdentity.occupation}`;
            }
            systemContent += `. When appropriate, refer to them by name instead of "wanderer" or "seeker".`;
        }

        systemContent += `\n\nKeep responses fairly concise (1-3 paragraphs) but impactful.`;
        
        // Get AI response
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemContent
                },
                ...recentHistory
            ]
        });
        
        // Remove typing indicator
        typingIndicator.remove();
        
        // Add bot response to UI
        addMessageToChat(completion.content, false);
        
        // Add to conversation history
        const assistantMessage = {
            role: "assistant",
            content: completion.content
        };
        conversationHistory.push(assistantMessage);
        
        // Update chat in storage
        if (currentChat) {
            currentChat.messages = [...conversationHistory];
            saveChats();
        }
        
    } catch (error) {
        // Remove typing indicator
        typingIndicator.remove();
        
        // Show error message
        addMessageToChat("The ravens failed to return with my wisdom. Try again, wanderer.", false);
        console.error("Error:", error);
    }
}

// Memory Manager Functions
function openMemoryManager() {
    renderMemories();
    memoryModal.style.display = 'flex';
}

function closeMemoryManager() {
    memoryModal.style.display = 'none';
}

function renderMemories() {
    memoryContainer.innerHTML = '';
    
    const memories = Object.values(allUserMemories);
    
    if (memories.length === 0) {
        memoryContainer.innerHTML = '<div class="no-memories">Óðinn has not stored any memories yet.</div>';
        return;
    }
    
    memories.forEach(memory => {
        const memoryItem = document.createElement('div');
        memoryItem.className = 'memory-item';
        
        let memoryHTML = `<h3>${memory.name}</h3>`;
        memoryHTML += `<div class="memory-details">First encountered: ${new Date(memory.firstMentioned).toLocaleString()}</div>`;
        memoryHTML += `<div class="memory-details">Last mentioned: ${new Date(memory.lastMentioned).toLocaleString()}</div>`;
        memoryHTML += `<div class="memory-details">Mentions: ${memory.mentionCount}</div>`;
        
        if (memory.occupation) {
            memoryHTML += `<div class="memory-details">Occupation: ${memory.occupation}</div>`;
        }
        
        memoryItem.innerHTML = memoryHTML;
        memoryContainer.appendChild(memoryItem);
    });
}

function clearAllMemories() {
    allUserMemories = {};
    saveMemories();
    closeMemoryManager();
    
    // Reset current chat identity if needed
    if (userIdentity) {
        userIdentity = null;
        const currentChat = allChats.find(c => c.id === currentChatId);
        if (currentChat) {
            currentChat.userIdentity = null;
            saveChats();
        }
    }
    
    // Add a message that memories have been cleared
    addMessageToChat("I have cast my memories into the void, wanderer. Your identity is now unknown to me once more.", false);
}

// Event listeners
sendButton.addEventListener('click', handleSendMessage);
newChatButton.addEventListener('click', createNewChat);
memoryManagerButton.addEventListener('click', openMemoryManager);
closeModalButton.addEventListener('click', closeMemoryManager);
clearMemoriesButton.addEventListener('click', clearAllMemories);
cancelButton.addEventListener('click', closeMemoryManager);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Allow textarea to auto-resize
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight > 150 ? 150 : userInput.scrollHeight) + 'px';
});

// Load chats when the page loads
document.addEventListener('DOMContentLoaded', loadChats);

// Focus input on page load
userInput.focus();