
// // static/script.js
// // StoryGen AI - Advanced Client-side logic with Session Persistence & Typewriter Effect

// Load user from localStorage to persist session
let currentUser = JSON.parse(localStorage.getItem("storyGenUser")) || null; 
let currentStory = { title: "", story: "" };
let currentAudioUrl = null;
let uploadedFile = null;

const API_BASE = ""; 


// --- Advanced Neural Sentiment Orchestrator ---
const MOOD_CONFIG = {
    noir: { keys: ['dark', 'shadow', 'night', 'noir', 'cold', 'rain'], emoji: '🕵️', label: 'Cyber-Noir', color: '#a855f7' },
    epic: { keys: ['gold', 'ancient', 'myth', 'legend', 'crown', 'glory'], emoji: '✨', label: 'Mythic Epic', color: '#fbbf24' },
    action: { keys: ['battle', 'war', 'danger', 'run', 'fire', 'sharp'], emoji: '⚔️', label: 'High Action', color: '#ef4444' },
    zen: { keys: ['happy', 'bright', 'joy', 'peace', 'forest', 'serene'], emoji: '🌿', label: 'Serene Zen', color: '#10b981' }
};

function updateEmotionDisplay(text) {
    const pill = document.getElementById("emotionPill");
    const emoji = document.getElementById("emotionEmoji");
    const label = document.getElementById("emotionLabel");
    const root = document.documentElement;

    if (!pill || !emoji || !label) return;

    const content = text.toLowerCase();
    
    // 1. Density Analysis: Find the mood with the highest keyword count
    let dominantMood = null;
    let maxScore = 0;

    for (const [id, config] of Object.entries(MOOD_CONFIG)) {
        const score = config.keys.reduce((acc, key) => acc + (content.split(key).length - 1), 0);
        if (score > maxScore) {
            maxScore = score;
            dominantMood = config;
        }
    }

    // 2. Global UI Orchestration: If mood shifts, update everything
    if (dominantMood && maxScore > 0) {
        pill.classList.remove("hidden");
        pill.style.display = "flex";

        // Smoothly update content
        emoji.textContent = dominantMood.emoji;
        label.textContent = dominantMood.label;

        // LUXURY FEATURE: Shift global accent colors in real-time
        root.style.setProperty('--accent-purple', dominantMood.color);
        pill.style.borderColor = dominantMood.color;
        pill.style.boxShadow = `0 0 30px ${dominantMood.color}44`; // 44 is 25% opacity
    }
}

// --- Grand Architect Thread Control ---
let typewriterTimeout; 

function typeWriter(text, elementId, speed = 25) {
    const element = document.getElementById(elementId);
    if (!element || !text) return;

    clearTimeout(typewriterTimeout);
    element.textContent = "";
    let i = 0;
    element.classList.add("typing-active");

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            if (i % 10 === 0) updateEmotionDisplay(element.textContent);
            i++;
            typewriterTimeout = setTimeout(type, speed);
        } else {
            element.classList.remove("typing-active");
            updateEmotionDisplay(text);
            
            // --- NARRATIVE COMPLETE: Summon the Icon ---
            setTimeout(() => {
                showChatIcon(); 
            }, 800);
        }
    }
    type();
}

// New helper to reveal the Floating Orb
function showChatIcon() {
    const trigger = document.getElementById("chatTrigger");
    if (trigger) {
        trigger.classList.remove("hidden");
        trigger.style.display = "flex";
        // Smooth entrance animation
        setTimeout(() => trigger.classList.add("visible"), 50);
    }
}

// Guaranteed Reveal Function
function revealCharacterChat() {
    const chatOverlay = document.getElementById("charChatOverlay");
    
    if (chatOverlay) {
        // Force state change
        chatOverlay.classList.remove("hidden");
        chatOverlay.style.display = "flex"; 
        
        // Luxury Reveal Animation
        requestAnimationFrame(() => {
            chatOverlay.style.opacity = "1";
            chatOverlay.style.transform = "translateY(0) scale(1)";
        });
        
        // Initial Message from the Character
        const chatMessages = document.getElementById("chatMessages");
        if (chatMessages && chatMessages.children.length === 0) {
            appendMessage('ai', "The story has been etched into reality. I am here now—what would you like to ask me?");
        }
    } else {
        console.error("Chat Overlay element not found. Check your HTML IDs.");
    }
}
// ─── Toast helper ────────────────────────────────────────────────
function showToast(message, type = "success") {
    // 1. Target the specific ID for bottom-right placement
    const container = document.getElementById("toastContainer");
    if (!container) return;

    // 2. Create the toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    // 3. Add icons for better clarity
    const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    // 4. Append and trigger the entrance animation
    container.appendChild(toast);
    
    // Using requestAnimationFrame for smoother "show" trigger
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    // 5. Automatic cleanup
    setTimeout(() => {
        toast.classList.remove("show");
        // Wait for the slide-out animation to finish before removing from DOM
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000); // 4 seconds is standard for readable messages
}

// ─── Authentication & Session Management ────────────────────────
function toggleAuth() {
    const overlay = document.getElementById("authOverlay");
    if (overlay) overlay.classList.toggle("hidden");
}

function switchForm(mode) {
    const signIn = document.getElementById("signInForm");
    const signUp = document.getElementById("signUpForm");
    if (mode === 'signup') {
        signIn.classList.add("hidden");
        signUp.classList.remove("hidden");
    } else {
        signUp.classList.add("hidden");
        signIn.classList.remove("hidden");
    }
}

function updateUIForLogin() {
    if (currentUser) {
        const nameDisplay = document.getElementById("userNameDisplay");
        if (nameDisplay) nameDisplay.textContent = currentUser.name;

        document.getElementById("userProfile").classList.remove("hidden");
        document.getElementById("signInBtn").classList.add("hidden");

        // Update profile modal content
        document.getElementById("profileName").textContent = currentUser.name;
        document.getElementById("profileEmail").textContent = currentUser.email;
    }
}

async function handleAuth(mode) {
    const isLogin = mode === "login";
    const emailInput = document.getElementById(isLogin ? "loginEmail" : "regEmail");
    const passInput = document.getElementById(isLogin ? "loginPassword" : "regPassword");

    if (!emailInput.value || !passInput.value) {
        showToast("Please fill in all fields", "error");
        return;
    }

    const payload = { email: emailInput.value.trim(), password: passInput.value };
    if (!isLogin) payload.name = document.getElementById("regName").value.trim() || payload.email.split("@")[0];

    try {
        const resp = await fetch(`${API_BASE}/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();

        if (!resp.ok) throw new Error(data.error || "Auth failed");

        if (isLogin) {
            currentUser = { name: data.name || data.user, email: data.email };
            localStorage.setItem("storyGenUser", JSON.stringify(currentUser)); // Persistence
            updateUIForLogin();
        }
        showToast(data.message || "Welcome!", "success");
        toggleAuth();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem("storyGenUser"); // Clear persistent session
    location.reload(); // Refresh to reset all UI states
}

// ─── Profile & Gallery ───────────────────────────────────────────

function toggleDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) dropdown.classList.toggle("hidden");
}

function toggleProfileModal() {
    const modal = document.getElementById("profileModal");
    const dropdown = document.getElementById("profileDropdown");
    
    if (dropdown) dropdown.classList.add("hidden"); 
    if (modal) {
        modal.classList.toggle("hidden");
        if (!modal.classList.contains("hidden") && currentUser?.email) fetchUserStats();
    }
}

async function fetchUserStats() {
    try {
        const resp = await fetch(`/get_user_stats?email=${encodeURIComponent(currentUser.email)}`);
        const data = await resp.json();
        
        const countEl = document.getElementById("storyCount");
        const rankEl = document.getElementById("userRankBadge");
        
        countEl.textContent = data.story_count ?? 0;
        rankEl.textContent = data.rank ?? "Novice Bard";
        
        // Rank Class Integration (for Grand Architect glows)
        const rankClass = (data.rank || "Novice").toLowerCase().replace(/\s+/g, '-');
        rankEl.className = `stat-value rank-badge ${rankClass}`;
        rankEl.style.color = data.rank_color || "#94a3b8";
        
        document.getElementById("memberSince").textContent = data.joined_on ?? "—";
    } catch (e) { console.error("Stats error", e); }
}

function toggleGallery() {
    const overlay = document.getElementById("galleryOverlay");
    if (overlay) {
        overlay.classList.toggle("hidden");
        if (!overlay.classList.contains("hidden") && currentUser?.email) loadGallery();
    }
}

async function loadGallery() {
    const container = document.getElementById("galleryContent");
    container.innerHTML = "<div class='loader'>Loading your tales...</div>";

    try {
        const resp = await fetch(
            `/get_stories?email=${encodeURIComponent(currentUser.email)}`
        );

        const data = await resp.json();   // ✅ read once

        if (!resp.ok) {
            throw new Error(data.error || "Server error");
        }

        const stories = data.stories || [];

        container.innerHTML = stories.length ? "" : "<p>No stories found.</p>";

        stories.forEach(s => {
            const div = document.createElement("div");
            div.className = "gallery-item";

            div.innerHTML = `
                <button class="delete-story-btn" title="Delete Story">
                    <i class="fas fa-trash-can"></i>
                </button>
                <h4>${s.title}</h4>
                <p>${s.story.substring(0, 80)}...</p>
            `;

            div.addEventListener("click", () => {
                displayStory(s.title, s.story);
            });

            const delBtn = div.querySelector(".delete-story-btn");

            delBtn.addEventListener("click", async (e) => {
                e.stopPropagation();

                if (confirm("Are you sure you want to delete this tale?")) {
                    await deleteStory(s.title, div);
                }
            });

            container.appendChild(div);
        });

    } catch (e) {
        container.innerHTML = "Error loading gallery.";
        console.error(e);
    }
}


async function deleteStory(title, element) {

    // HARD validation before request
    if (!currentUser || !currentUser.email) {
        console.error("Delete Error: currentUser.email missing");
        showToast("User session missing. Please login again.", "error");
        return;
    }

    if (!title) {
        console.error("Delete Error: title is undefined or empty");
        showToast("Story title missing.", "error");
        return;
    }

    const payload = {
        email: currentUser.email,
        title: title
    };

    console.log("Sending delete payload:", payload);

    try {
        const resp = await fetch(`${API_BASE}/delete_story`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();
        console.log("Server response:", data);

        if (resp.ok) {
            element.classList.add("removing");
            setTimeout(() => element.remove(), 300);
            showToast("Tale deleted forever", "success");
        } else {
            showToast(data.error || "Deletion failed", "error");
        }

    } catch (e) {
        console.error("Network error:", e);
        showToast("Server error while deleting", "error");
    }
}

function shareStory(platform) {

    const storyElement = document.getElementById("storyOutput");
    
    if (!storyElement) {
        console.error("Story element not found. Add id='storyOutput' to your story container.");
        return;
    }

    const storyText = storyElement.innerText.trim();

    if (!storyText) {
        alert("No story available to share.");
        return;
    }

    const encodedText = encodeURIComponent(storyText);
    const currentUrl = encodeURIComponent(window.location.href);

    let shareUrl = "";

    switch (platform) {

        case "linkedin":
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
            break;

        case "whatsapp":
            shareUrl = `https://wa.me/?text=${encodedText}`;
            break;

        case "twitter":
            shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
            break;

        default:
            console.error("Unsupported platform:", platform);
            return;
    }

    window.open(shareUrl, "_blank");
}


// ─── Image Handling ──────────────────────────────────────────────
function initDropZone() {
    const zone = document.getElementById("dropZone");
    const input = document.getElementById("imageInput");
    if(!zone) return;
    zone.onclick = () => input.click();
    input.onchange = (e) => handleFiles(e.target.files);
    zone.ondragover = (e) => { e.preventDefault(); zone.classList.add("active"); };
    zone.ondragleave = () => zone.classList.remove("active");
    zone.ondrop = (e) => { e.preventDefault(); zone.classList.remove("active"); handleFiles(e.dataTransfer.files); };
}

function handleFiles(files) {
    if (!files[0]?.type.startsWith("image/")) return showToast("Please upload an image", "error");
    uploadedFile = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById("imagePreview").src = e.target.result;
        document.getElementById("previewContainer").classList.remove("hidden");
        document.getElementById("dropZone").classList.add("hidden");
    };
    reader.readAsDataURL(uploadedFile);
}

function resetUpload() {
    uploadedFile = null;
    document.getElementById("previewContainer").classList.add("hidden");
    document.getElementById("dropZone").classList.remove("hidden");
}


// --- Global State for Memory Retention ---
let chatHistory = []; 
// --- Advanced Narrative Sanitizer ---
function sanitizeText(text) {
    // Removes strange artifacts and ensures proper spacing for eye-comfort
    return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

async function generateStory() {
    if (!uploadedFile) return showToast("Upload an image first!", "error");

    const btn = document.getElementById("generateBtn");
    const status = document.getElementById("agentStatus");
    
    btn.disabled = true;
    status.classList.remove("hidden");

    const formData = new FormData();
    formData.append("image", uploadedFile);
    if (currentUser && currentUser.email) {
        formData.append("email", currentUser.email);
    }

    try {
        const resp = await fetch(`${API_BASE}/generate`, { method: "POST", body: formData });
        const data = await resp.json();
        
        if (!resp.ok) throw new Error(data.error);

        // --- THE FIX: Clean the story before displaying ---
        const cleanStory = sanitizeText(data.story);
        const cleanTitle = data.title.replace(/\*/g, '');

        // 1. Reveal UI
        displayStory(cleanTitle, cleanStory, true); 
        
        // 2. Start Typewriter with clean data
        typeWriter(cleanStory, "storyOutput", 25);

        // 3. Summon Chat after Narrative
        const charName = data.character_name || "The Architect";
        setTimeout(() => {
            revealCharacterChat(charName, '🕵️'); 
            appendMessage('ai', `The vision is clear now, Vinit. I am ${charName}. How shall we refine this world?`);
        }, 3000);

    } catch (err) {
        showToast("System recalibration needed. Try again.", "error");
    } finally {
        btn.disabled = false;
        setTimeout(() => status.classList.add("hidden"), 1500);
    }
}

// --- Character Chat System ---

function revealCharacterChat(name, emoji = '🎭') {
    const chatOverlay = document.getElementById("charChatOverlay");
    const charNameDisplay = document.getElementById("charName");
    const charEmojiDisplay = document.getElementById("charEmoji");

    if (charNameDisplay) charNameDisplay.textContent = name;
    if (charEmojiDisplay) charEmojiDisplay.textContent = emoji;

    chatOverlay.classList.remove("hidden");
    // Small delay to allow CSS display change before animating opacity
    setTimeout(() => {
        chatOverlay.classList.add("active");
    }, 50);
}

// --- Luxurious Message Orchestrator ---
function appendMessage(sender, text) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    // 1. Create Message Container
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${sender}-msg`;
    
    // Get current time for the luxury "Log" feel
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 2. Immersive HTML Structure
    msgDiv.innerHTML = `
        <div class="msg-meta">${sender === 'ai' ? 'NEURAL SYNC' : 'VINIT'} • ${time}</div>
        <div class="msg-content">${text}</div>
        ${sender === 'ai' ? '<div class="msg-glow"></div>' : ''}
    `;
    
    // 3. Force Initial State for Animation
    msgDiv.style.opacity = "0";
    msgDiv.style.transform = "translateY(10px)";
    
    chatMessages.appendChild(msgDiv);

    // 4. Trigger Cinematic Entrance
    requestAnimationFrame(() => {
        msgDiv.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        msgDiv.style.opacity = "1";
        msgDiv.style.transform = "translateY(0)";
    });

    // 5. Intelligent Auto-Scroll
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

async function sendChatMessage() {
    const input = document.getElementById("userMsg");
    
    // 1. Capture and Clean Input
    const text = input.value.trim();
    
    // Safety: Prevent sending empty messages or accidental auto-filled emails
    if (!text || text.includes("@")) {
        input.value = ""; 
        return;
    }

    // 2. Immediate UI Reset
    appendMessage('user', text);
    input.value = ""; // Force clear to prevent the "email" visual bug
    input.blur();    // Briefly remove focus to break browser auto-fill loops
    setTimeout(() => input.focus(), 10); // Return focus for a smooth experience

    const charName = document.getElementById("charName").textContent;
    const statusLabel = document.querySelector(".status-indicator") || document.querySelector(".status-badge");

    if (statusLabel) statusLabel.textContent = "Resonating...";

    try {
        const response = await fetch(`${API_BASE}/char-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: text, 
                character: charName, 
                history: chatHistory 
            })
        });

        if (response.status === 404) {
            console.error("Endpoint /char-chat not found on server.");
            appendMessage('ai', "System Error: Resonance path 404. Check backend.");
            return;
        }

        const data = await response.json();
        
        // 3. Cinematic AI Response
        appendMessage('ai', data.reply);
        chatHistory.push({ user: text, ai: data.reply });

    } catch (err) {
        console.error("Connection Failed:", err);
        appendMessage('ai', "The resonance is weak. My connection was interrupted.");
    } finally {
        if (statusLabel) statusLabel.textContent = "PERSONALITY LOCKED";
    }
}


function closeChat() {
    const chatOverlay = document.getElementById("charChatOverlay");
    chatOverlay.classList.remove("active");
    setTimeout(() => chatOverlay.classList.add("hidden"), 800);
}

function displayStory(title, story, useTypewriter = false) {
    currentStory = { title, story };
    currentAudioUrl = null; 
    document.getElementById("storyTitleDisplay").textContent = title;
    
    if (useTypewriter) {
        typeWriter(story, "storyOutput", 20); // Smooth typewriter reveal
    } else {
        document.getElementById("storyOutput").textContent = story;
    }

    document.getElementById("storyActions").classList.remove("hidden");
    document.getElementById("ratingSection").classList.remove("hidden");
}

// ─── Audio Logic ─────────────────────────────────────────────────
async function toggleAudio() {
    const player = document.getElementById("storyAudioPlayer");
    const audioBtn = document.getElementById("audioBtn");
    const icon = audioBtn.querySelector("i");

    if (currentAudioUrl) {
        if (player.paused) {
            player.play();
            icon.className = "fas fa-stop-circle";
        } else {
            player.pause();
            icon.className = "fas fa-volume-up";
        }
        return;
    }

    if (!currentStory.story) return showToast("No story to narrate", "error");

    audioBtn.disabled = true;
    icon.className = "fas fa-circle-notch fa-spin";
    showToast("Preparing your narration...", "success");

    try {
        const resp = await fetch(`${API_BASE}/generate_audio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: currentStory.story })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error();

        currentAudioUrl = data.audio_url;
        player.src = currentAudioUrl;
        player.play();
        icon.className = "fas fa-stop-circle";
    } catch (err) {
        showToast("Audio generation failed", "error");
        icon.className = "fas fa-volume-up";
    } finally {
        audioBtn.disabled = false;
    }
}

function toggleCharacterChat() {
    const chat = document.getElementById("charChatOverlay");
    const trigger = document.getElementById("chatTrigger");
    
    if (!chat) return;

    if (chat.classList.contains("hidden")) {
        // Reveal with Luxury Animation
        chat.classList.remove("hidden");
        // Use the 'active' class for your opacity/transform transitions
        setTimeout(() => chat.classList.add("active"), 10);
        
        // Hide notification ping once the user interacts
        const ping = trigger.querySelector(".notification-ping");
        if (ping) ping.style.display = "none";
        
        console.log("Chat Orchestrator Initialized.");
    } else {
        chat.classList.remove("active");
        setTimeout(() => chat.classList.add("hidden"), 800);
    }
}

// Ensure it starts hidden but ready
document.addEventListener('DOMContentLoaded', () => {
    const chat = document.getElementById("charChatOverlay");
    if(chat) chat.classList.add("hidden");
});


// ─── Utilities ───────────────────────────────────────────────────
function copyStory() {
    if (!currentStory.story) return;
    navigator.clipboard.writeText(currentStory.story);
    showToast("Copied to clipboard!", "success");
}

async function downloadPDF() {
    if (!currentStory.story) return;
    showToast("Generating PDF...", "success");
    try {
        const resp = await fetch(`${API_BASE}/download_pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentStory)
        });
        if (!resp.ok) throw new Error();
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentStory.title.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) { showToast("PDF Error", "error"); }
}

async function translateStory() {
    const lang = document.getElementById("targetLanguage").value;
    if (!currentStory.story) return;
    showToast("Translating...", "success");
    try {
        const resp = await fetch(`${API_BASE}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: currentStory.story, lang })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error();
        document.getElementById("storyOutput").textContent = data.translated_text;
        showToast("Translation complete!", "success");
    } catch (e) { showToast("Translation failed", "error"); }
}

function rateStory(stars) {
    document.querySelectorAll(".star-group i").forEach((s, i) => s.classList.toggle("active", i < stars));
    document.getElementById("ratingStatus").textContent = stars >= 4 ? "Great story!" : "Thanks for your feedback!";
}

function toggleTranslator() {
    document.getElementById("translatorBox").classList.toggle("hidden");
}

// Add this at the very bottom of your script.js
function startGeneration(storyText) {
    console.log("Orchestrating Narrative..."); // Technical log for your dev console
    
    // 1. Ensure the container is visible
    const resultSection = document.querySelector('.result-header'); 
    if(resultSection) resultSection.style.opacity = "1";

    // 2. Trigger the typewriter on your display element
    // Replace 'storyDisplay' with the ID of the div where the story text goes
    typeWriter(storyText, "storyDisplay", 25); 
}

// ─── INITIALIZATION ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    initDropZone();
    if (currentUser) {
        updateUIForLogin();
    }
    
    // Auto-close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        const dropdown = document.getElementById("profileDropdown");
        if (dropdown && !e.target.closest('.user-profile')) {
            dropdown.classList.add("hidden");
        }
    });
});