// main.js - keeps original function names and endpoints intact.
// Attach events on DOMContentLoaded and keep functions global for server integration.

(() => {
  // Expose the sessionData object globally (keeps compatibility with server-side expectations)
  window.sessionData = {
    email: '',
    businessName: '',
    tagline: '',
    logo: null,
    primaryColor: '',
    secondaryColor: '',
    description: '',
    wantHosting: true,
    conversationHistory: [],
    generatedSite: null,
    siteVersion: 0
  };

  // Element refs
  const $ = id => document.getElementById(id);
  const startBtn = $('start-btn');
  const formError = $('form-error');
  const chatSection = $('chat-section');
  const chatMessages = $('chat-messages');
  const aiThinking = $('ai-thinking');
  const chatInput = $('chat-input');
  const chatSend = $('chat-send');
  const previewFrame = $('preview-frame');
  const fullscreenModal = $('fullscreen-modal');
  const fullscreenFrame = $('fullscreen-frame');
  const fullscreenBtn = $('fullscreen-btn');
  const modalClose = $('modal-close');
  const approveBtn = $('approve-btn');
  const paymentSection = $('payment-section');
  const paymentBtn = $('payment-btn');
  const paymentStatus = $('payment-status');
  const paymentContainer = $('payment-section');
  const yearEl = document.getElementById('year');

  // Add current year in footer
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Helper to convert file to base64 (keeps original function name)
  window.fileToBase64 = function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // show message
  function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (sender === 'danny' ? 'danny' : 'user');
    const label = sender === 'danny' ? 'Danny' : 'You';
    // sanitize minimal - replace script tags
    const safeText = String(text).replace(/<script.*?>.*?<\/script>/gi, '')
      .replace(/\n/g, '<br>');
    messageDiv.innerHTML = `<strong>${label}:</strong> ${safeText}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // update preview (keeps original function name)
  window.updatePreview = function(html) {
    try {
      const iframe = previewFrame;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // disable right-click and certain dev shortcuts in preview
      iframe.contentWindow.document.addEventListener('contextmenu', e => e.preventDefault());
      iframe.contentWindow.document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','C'].includes(e.key))) e.preventDefault();
      });
    } catch (err) {
      console.warn('Preview render failed', err);
    }
  };

  // initializeConversation() - kept
  window.initializeConversation = async function() {
    const initialPrompt = `Business Name: ${window.sessionData.businessName}
Industry/Type: Based on description
Tagline: ${window.sessionData.tagline}
Colors: Primary ${window.sessionData.primaryColor}, Secondary ${window.sessionData.secondaryColor}
Logo: ${window.sessionData.logo ? 'Provided' : 'Not provided'}
Description: ${window.sessionData.description}
Hosting Preference: ${window.sessionData.wantHosting ? 'Wants free lifetime hosting' : 'Will self-host'}`;

    addMessage('user', initialPrompt);
    await callDanny('START', initialPrompt);
  };

  // callDanny() - kept
  async function callDanny(type, message) {
    try {
      aiThinking.classList.remove('hidden');
      aiThinking.setAttribute('aria-hidden','false');
      chatMessages.classList.add('loading');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, sessionData: window.sessionData })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to communicate with Danny');

      addMessage('danny', data.response || 'No response text provided');
      window.sessionData.conversationHistory = data.conversationHistory || window.sessionData.conversationHistory;

      if (data.siteHTML) {
        window.sessionData.generatedSite = data.siteHTML;
        window.sessionData.siteVersion++;
        window.updatePreview(data.siteHTML);
      }
    } catch (err) {
      $('chat-error').textContent = err.message;
    } finally {
      aiThinking.classList.add('hidden');
      aiThinking.setAttribute('aria-hidden','true');
      chatMessages.classList.remove('loading');
    }
  }

  // Public sendMessage to match original (keeps function name)
  window.sendMessage = async function() {
    const input = chatInput;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.disabled = true;
    addMessage('user', msg);
    await callDanny('CHAT', msg);
    input.disabled = false;
    input.focus();
  };

  // startBuilding() - kept and updated to use listeners (keeps function name global)
  window.startBuilding = async function() {
    formError.textContent = '';

    const email = $('email').value.trim();
    const businessName = $('businessName').value.trim();
    const tagline = $('tagline').value.trim();
    const description = $('description').value.trim();
    const primaryColor = $('primaryColor').value;
    const secondaryColor = $('secondaryColor').value;
    const logoFile = $('logoFile').files[0];
    const wantHosting = $('wantHosting').checked;

    // validation
    if (!email || !businessName || !tagline || !description) {
      formError.textContent = 'Please fill in all required fields';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      formError.textContent = 'Please enter a valid email address';
      return;
    }

    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';

    if (logoFile) {
      try {
        window.sessionData.logo = await fileToBase64(logoFile);
      } catch (err) {
        console.warn('Logo to base64 failed', err);
      }
    }

    window.sessionData.email = email;
    window.sessionData.businessName = businessName;
    window.sessionData.tagline = tagline;
    window.sessionData.primaryColor = primaryColor;
    window.sessionData.secondaryColor = secondaryColor;
    window.sessionData.description = description;
    window.sessionData.wantHosting = wantHosting;

    // Hide form and show chat
    document.getElementById('form-section').classList.add('hidden');
    chatSection.classList.remove('hidden');
    chatSection.setAttribute('aria-hidden','false');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    await window.initializeConversation();
    startBtn.disabled = false;
    startBtn.textContent = 'Start Building with Danny';
  };

  // Fullscreen open/close (kept)
  window.openFullscreen = function() {
    if (!window.sessionData.generatedSite) return;
    const iframeDoc = fullscreenFrame.contentDocument || fullscreenFrame.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(window.sessionData.generatedSite);
    iframeDoc.close();

    // disable right-click in fullscreen
    fullscreenFrame.contentWindow.document.addEventListener('contextmenu', e => e.preventDefault());
    fullscreenFrame.contentWindow.document.addEventListener('keydown', e => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','C'].includes(e.key))) e.preventDefault();
    });

    fullscreenModal.setAttribute('aria-hidden','false');
    fullscreenModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeFullscreen = function() {
    fullscreenModal.setAttribute('aria-hidden','true');
    fullscreenModal.style.display = 'none';
    document.body.style.overflow = '';
  };

  // approveDesign() - kept
  window.approveDesign = function() {
    chatSection.classList.add('hidden');
    paymentContainer.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // initiatePayment() - kept (same behavior)
  window.initiatePayment = async function() {
    try {
      paymentBtn.disabled = true;
      paymentStatus.innerHTML = '<p>Redirecting to secure payment...</p>';

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: window.sessionData.email,
          businessName: window.sessionData.businessName,
          siteHTML: window.sessionData.generatedSite,
          wantHosting: window.sessionData.wantHosting
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment initialization failed');

      const stripe = Stripe(data.publishableKey);
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err) {
      paymentStatus.innerHTML = `<p class="form-error">${err.message}</p>`;
      paymentBtn.disabled = false;
    }
  };

  // Event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Buttons
    if (startBtn) startBtn.addEventListener('click', () => window.startBuilding());
    if (chatSend) chatSend.addEventListener('click', () => window.sendMessage());
    if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') window.sendMessage(); });
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => window.openFullscreen());
    if (modalClose) modalClose.addEventListener('click', () => window.closeFullscreen());
    if (approveBtn) approveBtn.addEventListener('click', () => window.approveDesign());
    if (paymentBtn) paymentBtn.addEventListener('click', () => window.initiatePayment());

    // close modal on ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') window.closeFullscreen();
    });
  });

  // Expose some functions globally for backward compatibility (if other code calls them)
  window.callDanny = callDanny;
  window.addMessage = addMessage;
})();
