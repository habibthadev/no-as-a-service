class NAASApp {
  constructor() {
    this.currentContext = "";
    this.currentTone = "gentle";
    this.isRecording = false;
    this.recognition = null;
    this.speechSynthesis = window.speechSynthesis;
    this.lastResponse = "";

    this.initializeApp();
  }

  initializeApp() {
    this.setupTheme();
    this.setupEventListeners();
    this.setupSpeechRecognition();
  }

  // Theme Management
  setupTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    this.updateThemeIcon(newTheme);
  }

  updateThemeIcon(theme) {
    const themeIcon = document.querySelector("#themeToggle i");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", theme === "light" ? "moon" : "sun");
      lucide.createIcons();
    }
  }

  // Event Listeners
  setupEventListeners() {
    // Theme toggle
    document
      .getElementById("themeToggle")
      .addEventListener("click", () => this.toggleTheme());

    // Voice recording
    document
      .getElementById("voiceBtn")
      .addEventListener("click", () => this.toggleVoiceRecording());

    // Submit button
    document
      .getElementById("submitBtn")
      .addEventListener("click", () => this.handleSubmit());

    // Enter key in textarea
    document.getElementById("textInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // Tone selector
    document.getElementById("toneSelect").addEventListener("change", (e) => {
      this.currentTone = e.target.value;
    });

    

    // Response actions
    document
      .getElementById("regenerateBtn")
      .addEventListener("click", () => this.regenerateResponse());
    document
      .getElementById("copyBtn")
      .addEventListener("click", () => this.copyResponse());
    document
      .getElementById("speakBtn")
      .addEventListener("click", () => this.speakResponse());

    // Error retry
    document
      .getElementById("retryBtn")
      .addEventListener("click", () => this.handleSubmit());
  }

  // Speech Recognition
  setupSpeechRecognition() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      this.disableVoiceFeature();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.updateVoiceButton();
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById("textInput").value = transcript;
      this.currentContext = transcript;
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.showError(
        "Speech recognition failed. Please try again or use text input."
      );
      this.isRecording = false;
      this.updateVoiceButton();
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.updateVoiceButton();
    };
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      this.showError("Speech recognition is not supported in your browser.");
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  updateVoiceButton() {
    const voiceBtn = document.getElementById("voiceBtn");
    const voiceStatus = document.getElementById("voiceStatus");

    if (this.isRecording) {
      voiceBtn.classList.add("recording");
      voiceStatus.textContent = "Recording... (tap to stop)";
    } else {
      voiceBtn.classList.remove("recording");
      voiceStatus.textContent = "Tap to record";
    }
  }

  disableVoiceFeature() {
    const voiceBtn = document.getElementById("voiceBtn");
    const voiceStatus = document.getElementById("voiceStatus");

    voiceBtn.disabled = true;
    voiceBtn.style.opacity = "0.5";
    voiceStatus.textContent = "Voice not supported";
  }

  async handleSubmit() {
    const textInput = document.getElementById("textInput");
    const context = textInput.value.trim();

    if (!context) {
      this.showError("Please enter some context or record your voice.");
      return;
    }

    this.currentContext = context;
    this.showLoading();
    this.hideError();

    try {
      const response = await this.generateNoResponse(context, this.currentTone);
      this.showResponse(response);
    } catch (error) {
      console.error("Error generating response:", error);
      this.showError(
        error.message || "Failed to generate response. Please try again."
      );
      this.hideLoading();
    }
  }

  async generateNoResponse(context, tone) {
    const prompt = this.buildPrompt(context, tone);

    try {
      const response = await fetch("/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API request failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response format from API");
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("API Error:", error);
      throw new Error(error.message || "Failed to generate response");
    }
  }

  buildPrompt(context, tone) {
    return `You are a helpful assistant that helps users say "No" politely. Given the context below, generate a warm, tactful, emotionally intelligent response that gracefully says "No" without sounding rude or robotic.

Context:
${context}

Tone: ${tone}

Guidelines:
- Sound human, kind, and firm.
- Avoid corporate jargon or AI-sounding phrases.
- Max 2–4 sentences.
- Be empathetic but clear in the refusal.
- Offer alternatives when appropriate.
- Match the requested tone (${tone}).

Generate only the "No" response, nothing else.`;
  }

  // UI State Management
  showLoading() {
    document.getElementById("loadingSection").style.display = "block";
    document.getElementById("responseSection").style.display = "none";
    document.getElementById("submitBtn").disabled = true;
  }

  hideLoading() {
    document.getElementById("loadingSection").style.display = "none";
    document.getElementById("submitBtn").disabled = false;
  }

  showResponse(responseText) {
    this.lastResponse = responseText;
    this.hideLoading();

    document.getElementById("responseText").textContent = responseText;
    document.getElementById("responseSection").style.display = "block";

    // Calculate and show tact level
    const tactLevel = this.calculateTactLevel(responseText);
    this.updateTactMeter(tactLevel);

    // Scroll to response
    document.getElementById("responseSection").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  calculateTactLevel(text) {
    // Simple heuristic for measuring tactfulness
    const lowerText = text.toLowerCase();
    let score = 50; // Base score

    // Positive indicators (increase tact)
    const positiveWords = [
      "appreciate",
      "understand",
      "grateful",
      "thank",
      "unfortunately",
      "however",
      "alternative",
      "perhaps",
      "maybe",
      "consider",
      "respect",
      "value",
    ];
    const positiveCount = positiveWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    score += positiveCount * 8;

    // Negative indicators (decrease tact)
    const negativeWords = [
      "no",
      "can't",
      "won't",
      "impossible",
      "never",
      "absolutely not",
    ];
    const negativeCount = negativeWords.filter((word) =>
      lowerText.includes(word)
    ).length;
    score -= negativeCount * 5;

    // Length bonus (longer responses tend to be more tactful)
    if (text.length > 100) score += 10;
    if (text.length > 200) score += 10;

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  updateTactMeter(level) {
    const tactFill = document.getElementById("tactFill");
    const tactValue = document.getElementById("tactValue");

    tactFill.style.width = `${level}%`;
    tactValue.textContent = `${Math.round(level)}%`;

    // Animate the fill
    setTimeout(() => {
      tactFill.style.transition = "width 1s ease-out";
    }, 100);
  }

  showError(message) {
    document.getElementById("errorMessage").textContent = message;
    document.getElementById("errorSection").style.display = "block";
    document.getElementById("loadingSection").style.display = "none";
    document.getElementById("submitBtn").disabled = false;
  }

  hideError() {
    document.getElementById("errorSection").style.display = "none";
  }

  showSuccess(message) {
    // Create a temporary success notification
    const notification = document.createElement("div");
    notification.className = "success-notification";
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Response Actions
  async regenerateResponse() {
    if (!this.currentContext) {
      this.showError("No context available to regenerate.");
      return;
    }

    this.showLoading();
    this.hideError();

    try {
      const response = await this.generateNoResponse(
        this.currentContext,
        this.currentTone
      );
      this.showResponse(response);
    } catch (error) {
      console.error("Error regenerating response:", error);
      this.showError(
        error.message || "Failed to regenerate response. Please try again."
      );
      this.hideLoading();
    }
  }

  async copyResponse() {
    if (!this.lastResponse) {
      this.showError("No response to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(this.lastResponse);
      this.showSuccess("Response copied to clipboard!");

      // Visual feedback on copy button
      const copyBtn = document.getElementById("copyBtn");
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
      lucide.createIcons();

      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        lucide.createIcons();
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      this.showError(
        "Failed to copy to clipboard. Please select and copy manually."
      );
    }
  }

  speakResponse() {
    if (!this.lastResponse) {
      this.showError("No response to speak.");
      return;
    }

    if (!this.speechSynthesis) {
      this.showError("Speech synthesis is not supported in your browser.");
      return;
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(this.lastResponse);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Visual feedback
    const speakBtn = document.getElementById("speakBtn");
    const originalText = speakBtn.innerHTML;

    utterance.onstart = () => {
      speakBtn.innerHTML = '<i data-lucide="square"></i> Stop';
      lucide.createIcons();
    };

    utterance.onend = () => {
      speakBtn.innerHTML = originalText;
      lucide.createIcons();
    };

    utterance.onerror = () => {
      speakBtn.innerHTML = originalText;
      lucide.createIcons();
      this.showError("Speech synthesis failed. Please try again.");
    };

    // Handle stop functionality
    const stopSpeech = () => {
      this.speechSynthesis.cancel();
      speakBtn.innerHTML = originalText;
      lucide.createIcons();
    };

    // Add click listener for stop functionality
    speakBtn.onclick = () => {
      if (this.speechSynthesis.speaking) {
        stopSpeech();
        // Restore original click handler
        setTimeout(() => {
          speakBtn.onclick = () => this.speakResponse();
        }, 100);
      } else {
        this.speakResponse();
      }
    };

    this.speechSynthesis.speak(utterance);
  }
}

// CSS Animations for notifications
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleSheet);

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.naasApp = new NAASApp();
});

// Error handling for unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  if (window.naasApp) {
    window.naasApp.showError("An unexpected error occurred. Please try again.");
  }
});

// Handle online/offline status
window.addEventListener("online", () => {
  if (window.naasApp) {
    window.naasApp.showSuccess("Connection restored!");
  }
});

window.addEventListener("offline", () => {
  if (window.naasApp) {
    window.naasApp.showError(
      "You are offline. Please check your internet connection."
    );
  }
});
