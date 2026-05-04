/* ============================================================
   MEMEFORGE AI – app.js
   Imgflip API Integration + AI Caption Suggestions
   ============================================================ */

'use strict';

// ─── API CONFIG ───────────────────────────────────────────────
const IMGFLIP_API = {
  getMemes:    'https://api.imgflip.com/get_memes',
  captionImg:  'https://api.imgflip.com/caption_image',
};

// ─── STATE ────────────────────────────────────────────────────
const state = {
  allMemes:      [],
  filteredMemes: [],
  selectedMeme:  null,
  gallery:       JSON.parse(localStorage.getItem('memeforge_gallery') || '[]'),
};


// ─── DOM REFS ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const templateGrid     = $('template-grid');
const searchInput      = $('search-input');
const previewImg       = $('preview-img');
const previewEmpty     = $('preview-empty');
const templateBadge    = $('template-name-badge');
const captionTop       = $('caption-top');
const captionBottom    = $('caption-bottom');
const fontSelect       = $('font-select');
const colorSelect      = $('color-select');
const imgflipUser      = $('imgflip-username');
const imgflipPass      = $('imgflip-password');
const btnForge         = $('btn-forge');
const forgeLabel       = $('forge-label');
const forgeSpinner     = $('forge-spinner');
const btnReset         = $('btn-reset');
const btnAiSuggest     = $('btn-ai-suggest');
const resultArea       = $('result-area');
const resultImg        = $('result-img');
const btnDownload      = $('btn-download');
const btnOpen          = $('btn-open');
const btnSaveGallery   = $('btn-save-gallery');
const btnMakeAnother   = $('btn-make-another');
const trendingGrid     = $('trending-grid');
const galleryGrid      = $('gallery-grid');
const galleryEmpty     = $('gallery-empty');
const btnClearGallery  = $('btn-clear-gallery');
const statTemplates    = $('stat-templates');
const templateCount    = $('template-count');
const aiModal          = $('ai-modal');
const aiModalClose     = $('ai-modal-close');
const suggestionsList  = $('suggestions-list');

// ─── INIT — defined at bottom of file (after GIF setup) ──────

// ─── BLOCKED TEMPLATES (hidden from all views) ───────────────
const BLOCKED_TEMPLATES = ['Distracted Boyfriend'];

// ─── FETCH MEMES FROM IMGFLIP API ────────────────────────────
async function fetchMemes() {
  try {
    const res  = await fetch(IMGFLIP_API.getMemes);
    const data = await res.json();

    if (!data.success) throw new Error('API returned failure');

    // Filter out blocked templates
    state.allMemes      = data.data.memes.filter(m =>
      !BLOCKED_TEMPLATES.some(b => m.name.toLowerCase() === b.toLowerCase())
    );
    state.filteredMemes = [...state.allMemes];

    // Update stat counter
    statTemplates.textContent = state.allMemes.length + '+';
    templateCount.textContent = `${state.allMemes.length} templates`;

    renderTemplateGrid(state.filteredMemes);
    renderTrending(state.allMemes.slice(0, 12));

  } catch (err) {
    templateGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444">
      ⚠️ Could not load templates. Check your internet connection.<br><small>${err.message}</small>
    </div>`;
    console.error('Imgflip API error:', err);
  }
}

// ─── RENDER TEMPLATE GRID ────────────────────────────────────
function renderTemplateGrid(memes) {
  if (!memes.length) {
    templateGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--muted)">No templates found 🤔</div>`;
    return;
  }

  templateGrid.innerHTML = memes.map((m, i) => `
    <div class="template-card" data-id="${m.id}" data-idx="${i}" role="button" tabindex="0"
         aria-label="Select ${m.name} meme template">
      <img src="${m.url}" alt="${m.name}" loading="lazy" />
      <div class="template-card-name">${m.name}</div>
    </div>
  `).join('');

  templateGrid.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => selectTemplate(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') selectTemplate(card.dataset.id); });
  });
}

// ─── SELECT TEMPLATE ─────────────────────────────────────────
function selectTemplate(id) {
  const meme = state.allMemes.find(m => m.id === id);
  if (!meme) return;

  state.selectedMeme = meme;

  // Update preview
  previewImg.src = meme.url;
  previewImg.alt = meme.name;
  previewImg.style.display = 'block';
  previewEmpty.style.display = 'none';
  templateBadge.textContent = meme.name;
  templateBadge.style.display = 'inline-block';

  // Highlight active card
  templateGrid.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  const activeCard = templateGrid.querySelector(`[data-id="${id}"]`);
  if (activeCard) {
    activeCard.classList.add('active');
    activeCard.scrollIntoView({ block: 'nearest' });
  }

  // Adjust caption inputs for box_count
  renderCaptionInputs(meme.box_count);

  // Enable buttons
  btnForge.disabled = false;
  btnAiSuggest.disabled = false;

  // Hide previous result
  resultArea.style.display = 'none';
}

// ─── DYNAMIC CAPTION INPUTS ──────────────────────────────────
function renderCaptionInputs(boxCount) {
  const section = $('caption-inputs');
  const count   = Math.min(boxCount, 4); // show up to 4
  let html = '';

  const labels = ['Top Text', 'Bottom Text', 'Third Box', 'Fourth Box'];
  for (let i = 0; i < count; i++) {
    html += `
      <div class="caption-row">
        <label for="caption-box-${i}">${labels[i] || `Box ${i + 1}`}</label>
        <input type="text" id="caption-box-${i}" class="caption-box" data-box="${i}"
               placeholder="Enter ${labels[i] || `box ${i + 1}`} text…" />
      </div>`;
  }
  section.innerHTML = html;
}

// ─── GET CAPTION VALUES ───────────────────────────────────────
function getCaptions() {
  return Array.from(document.querySelectorAll('.caption-box')).map(el => el.value.trim());
}

// ─── FORGE MEME (POST to Imgflip) ────────────────────────────
async function forgeMeme() {
  if (!state.selectedMeme) return;

  const captions  = getCaptions();
  const username  = imgflipUser.value.trim();
  const password  = imgflipPass.value.trim();
  const color     = colorSelect.value;
  const font      = fontSelect.value;

  if (!username || !password) {
    showToast('⚠️ Please enter your Imgflip credentials', 'warn'); return;
  }

  // Loading state
  forgeLabel.style.display = 'none';
  forgeSpinner.style.display = 'block';
  btnForge.disabled = true;

  try {
    const body = new URLSearchParams({
      template_id: state.selectedMeme.id,
      username,
      password,
      font,
    });

    captions.forEach((text, i) => {
      body.append(`boxes[${i}][text]`,          text);
      body.append(`boxes[${i}][color]`,         color);
      body.append(`boxes[${i}][outline_color]`, '#000000');
    });

    const res  = await fetch(IMGFLIP_API.captionImg, { method: 'POST', body });
    const data = await res.json();

    if (!data.success) throw new Error(data.error_message || 'Unknown API error');

    showResult(data.data.url, data.data.page_url);
    showToast('🎉 Meme forged successfully!', 'success');

  } catch (err) {
    console.error('Caption error:', err);
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    forgeLabel.style.display = 'inline';
    forgeSpinner.style.display = 'none';
    btnForge.disabled = false;
  }
}

// ─── SHOW RESULT ─────────────────────────────────────────────
function showResult(url, pageUrl) {
  resultImg.src        = url;
  btnDownload.href     = url;
  btnDownload.download = `meme_${Date.now()}.jpg`;
  btnOpen.href         = pageUrl;

  resultArea.style.display = 'block';
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Save reference for gallery
  resultArea.dataset.currentUrl  = url;
  resultArea.dataset.currentName = state.selectedMeme?.name || 'Meme';
}

// ─── GALLERY ─────────────────────────────────────────────────
function saveToGallery() {
  const url  = resultArea.dataset.currentUrl;
  const name = resultArea.dataset.currentName;
  if (!url) return;

  const item = { id: Date.now(), url, name, created: new Date().toLocaleDateString() };
  state.gallery.unshift(item);
  localStorage.setItem('memeforge_gallery', JSON.stringify(state.gallery));
  renderGallery();
  showToast('💾 Saved to gallery!', 'success');
}

function renderGallery() {
  const galleryCountBadge = document.getElementById('gallery-count-badge');

  if (!state.gallery.length) {
    galleryGrid.innerHTML = '';
    galleryEmpty.style.display = 'block';
    if (galleryCountBadge) galleryCountBadge.textContent = '0 saved';
    return;
  }

  galleryEmpty.style.display = 'none';
  if (galleryCountBadge) galleryCountBadge.textContent = `${state.gallery.length} saved`;

  galleryGrid.innerHTML = state.gallery.map(item => `
    <div class="gallery-item" id="gallery-item-${item.id}">
      <img src="${item.url}" alt="${item.name}" loading="lazy" />
      <div class="gallery-item-footer">
        <div>
          <div class="gallery-item-name">${item.name}</div>
          <div style="font-size:10px;color:var(--muted)">${item.created}</div>
        </div>
        <div class="gallery-item-actions">
          <a href="${item.url}" download class="gallery-btn" title="Download">⬇️</a>
          <button class="gallery-btn" onclick="deleteGalleryItem(${item.id})" title="Delete">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}

function deleteGalleryItem(id) {
  state.gallery = state.gallery.filter(i => i.id !== id);
  localStorage.setItem('memeforge_gallery', JSON.stringify(state.gallery));
  renderGallery();
  showToast('🗑️ Removed from gallery', 'info');
}

function clearGallery() {
  if (!state.gallery.length) return;
  if (!confirm('Clear all saved memes?')) return;
  state.gallery = [];
  localStorage.removeItem('memeforge_gallery');
  renderGallery();
  showToast('🧹 Gallery cleared', 'info');
}

// ─── TRENDING ────────────────────────────────────────────────
function renderTrending(memes) {
  const rankClass = i => i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : '';

  trendingGrid.innerHTML = memes.map((m, i) => `
    <div class="trending-card" role="button" tabindex="0"
         onclick="selectAndScroll('${m.id}')"
         onkeydown="if(event.key==='Enter') selectAndScroll('${m.id}')"
         aria-label="Use ${m.name} template">
      <div class="trending-rank ${rankClass(i)}">#${i + 1}</div>
      <img src="${m.url}" alt="${m.name}" loading="lazy" />
      <div class="trending-card-body">
        <div class="trending-card-name">${m.name}</div>
      </div>
    </div>`).join('');
}

function selectAndScroll(id) {
  selectTemplate(id);
  document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
}

// ─── AI VISION SUGGESTIONS ───────────────────────────────────
function openAiModal() {
  if (!state.selectedMeme) return;

  aiModal.style.display = 'flex';
  suggestionsList.innerHTML = '';

  // Show preview of selected template in modal
  const visionImg = document.getElementById('vision-preview-img');
  const visionName = document.getElementById('vision-template-name');
  const visionDesc = document.getElementById('vision-description');
  const scanLabel = document.getElementById('vision-scan-label');
  const scanSpinner = document.getElementById('vision-scan-spinner');
  const btnScan = document.getElementById('btn-vision-scan');

  visionImg.src = state.selectedMeme.url;
  visionName.textContent = state.selectedMeme.name;
  visionDesc.style.display = 'none';
  btnScan.disabled = false;
  scanLabel.style.display = 'inline';
  scanSpinner.style.display = 'none';
}

function closeAiModal() {
  aiModal.style.display = 'none';
}

async function scanTemplateWithVision() {
  if (!state.selectedMeme) return;

  const scanLabel = document.getElementById('vision-scan-label');
  const scanSpinner = document.getElementById('vision-scan-spinner');
  const btnScan = document.getElementById('btn-vision-scan');
  const visionDesc = document.getElementById('vision-description');
  const visionDescText = document.getElementById('vision-desc-text');

  // Loading state
  scanLabel.style.display = 'none';
  scanSpinner.style.display = 'block';
  btnScan.disabled = true;
  suggestionsList.innerHTML = '';
  visionDesc.style.display = 'none';

  try {
    const apiKey = (typeof GEMINI_CONFIG !== 'undefined') ? GEMINI_CONFIG.apiKey : '';
    if (!apiKey) {
      // Fallback to client-side if no API key
      const fallback = generateFallbackVisionSuggestions(state.selectedMeme.name);
      displayVisionResults(fallback);
      return;
    }

    // Fetch the image and convert to base64
    const imgResponse = await fetch(state.selectedMeme.url);
    const imgBlob = await imgResponse.blob();
    const base64 = await blobToBase64(imgBlob);
    const mimeType = imgBlob.type || 'image/jpeg';

    const prompt = `You are analyzing a meme template image. Look at this image carefully and:

1. Describe what you see in the image in 1-2 sentences (characters, expressions, scene, context)
2. Generate exactly 4 different caption pairs (top_text and bottom_text) that would be funny, relevant, and perfect for this specific meme template image

The captions should be:
- Directly relevant to what the image shows (the characters, their expressions, the situation)
- Humorous and relatable
- Short (max 10 words per line)
- Varied in style (mix of relatable, sarcastic, wholesome, and savage)

Return ONLY valid JSON (no markdown, no code fences):
{
  "image_description": "<what you see in the image>",
  "suggestions": [
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "<one word vibe like funny/savage/relatable/wholesome>" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "<vibe>" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "<vibe>" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "<vibe>" }
  ]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                }
              },
              { text: prompt }
            ]
          }]
        }),
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(raw);
    displayVisionResults(result);
    showToast('🔬 AI Vision scan complete!', 'success');

  } catch (err) {
    console.error('Vision scan error:', err);
    // Fallback to template-name-based suggestions
    const fallback = generateFallbackVisionSuggestions(state.selectedMeme.name);
    displayVisionResults(fallback);
    showToast('⚠️ Using smart fallback captions', 'warn');
  } finally {
    scanLabel.style.display = 'inline';
    scanSpinner.style.display = 'none';
    btnScan.disabled = false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function displayVisionResults(result) {
  const visionDesc = document.getElementById('vision-description');
  const visionDescText = document.getElementById('vision-desc-text');

  // Show image description
  if (result.image_description) {
    visionDescText.textContent = result.image_description;
    visionDesc.style.display = 'block';
  }

  // Show suggestions
  const vibeEmoji = { funny: '😂', savage: '😤', relatable: '😅', wholesome: '🥰', sarcastic: '😏', dark: '🖤', motivational: '💪', random: '🎲' };

  suggestionsList.innerHTML = (result.suggestions || []).map((s, i) => `
    <div class="suggestion-item" onclick="applySuggestion('${escapeAttr(s.top)}','${escapeAttr(s.bottom)}')"
         role="button" tabindex="0">
      <div class="suggestion-label">
        <span>${vibeEmoji[s.vibe?.toLowerCase()] || '✨'} Option ${i + 1}</span>
        <span class="suggestion-vibe-tag">${s.vibe || 'creative'}</span>
      </div>
      <div class="suggestion-top">🔝 ${s.top}</div>
      <div class="suggestion-bottom">⬇️ ${s.bottom}</div>
    </div>`).join('');
}

function generateFallbackVisionSuggestions(templateName) {
  const name = templateName.toLowerCase();
  let suggestions = [];

  if (name.includes('skeptical') || name.includes('third world')) {
    suggestions = [
      { top: "So you're telling me", bottom: "Your code worked on the first try?", vibe: "sarcastic" },
      { top: "You mean to tell me", bottom: "The meeting could've been an email?", vibe: "relatable" },
      { top: "Wait, you're saying", bottom: "You actually read the terms and conditions?", vibe: "funny" },
      { top: "So let me get this straight", bottom: "You went to bed before midnight?", vibe: "savage" },
    ];
  } else if (name.includes('yoda') || name.includes('star wars')) {
    suggestions = [
      { top: "Do or do not", bottom: "There is no try... just Stack Overflow", vibe: "funny" },
      { top: "Strong with bugs", bottom: "Your code is", vibe: "savage" },
      { top: "Sleep you must", bottom: "But one more episode you will watch", vibe: "relatable" },
      { top: "Judge me by my commits", bottom: "Do you? Hmm?", vibe: "sarcastic" },
    ];
  } else if (name.includes('look at me') || name.includes('pirate')) {
    suggestions = [
      { top: "Look at me", bottom: "I am the team lead now", vibe: "savage" },
      { top: "Look at me", bottom: "I'm the bug creator now", vibe: "funny" },
      { top: "Look at me", bottom: "I am the procrastinator now", vibe: "relatable" },
      { top: "Look at me", bottom: "I decide when we eat", vibe: "wholesome" },
    ];
  } else if (name.includes('gustin') || name.includes('grave')) {
    suggestions = [
      { top: "My motivation", bottom: "Me standing over it on Monday", vibe: "relatable" },
      { top: "My sleep schedule", bottom: "Me at 3 AM on my phone", vibe: "savage" },
      { top: "My diet plans", bottom: "Me with a pizza", vibe: "funny" },
      { top: "My free time", bottom: "Me after getting a job", vibe: "relatable" },
    ];
  } else if (name.includes('drake')) {
    suggestions = [
      { top: "Working hard", bottom: "Working smart", vibe: "relatable" },
      { top: "Reading the docs", bottom: "Asking ChatGPT", vibe: "funny" },
      { top: "Going to the gym", bottom: "Saying I'll start Monday", vibe: "relatable" },
      { top: "8 hours of sleep", bottom: "One more episode", vibe: "savage" },
    ];
  } else {
    suggestions = [
      { top: "Nobody:", bottom: "Absolutely nobody:", vibe: "funny" },
      { top: "Me pretending to work", bottom: "While scrolling memes", vibe: "relatable" },
      { top: "My brain at 3 AM", bottom: "Let's think about everything", vibe: "relatable" },
      { top: "This is fine", bottom: "Everything is fine", vibe: "sarcastic" },
    ];
  }

  return { image_description: `Meme template: ${templateName}`, suggestions };
}

function applySuggestion(top, bottom) {
  const boxes = document.querySelectorAll('.caption-box');
  if (boxes[0]) boxes[0].value = top;
  if (boxes[1]) boxes[1].value = bottom;
  closeAiModal();
  showToast('🤖 AI captions applied!', 'success');
}

function escapeAttr(str) {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ─── SEARCH ───────────────────────────────────────────────────
function handleSearch(query) {
  const q = query.toLowerCase().trim();
  state.filteredMemes = q
    ? state.allMemes.filter(m => m.name.toLowerCase().includes(q))
    : [...state.allMemes];
  renderTemplateGrid(state.filteredMemes);
}

// ─── RESET ────────────────────────────────────────────────────
function resetGenerator() {
  state.selectedMeme = null;
  previewImg.style.display = 'none';
  previewEmpty.style.display = 'block';
  templateBadge.style.display = 'none';
  $('caption-inputs').innerHTML = `
    <div class="caption-row">
      <label for="caption-box-0">Top Text</label>
      <input type="text" id="caption-box-0" class="caption-box" placeholder="Enter top text…" />
    </div>
    <div class="caption-row">
      <label for="caption-box-1">Bottom Text</label>
      <input type="text" id="caption-box-1" class="caption-box" placeholder="Enter bottom text…" />
    </div>`;
  resultArea.style.display = 'none';
  btnForge.disabled = true;
  btnAiSuggest.disabled = true;
  templateGrid.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
  showToast('🔄 Generator reset', 'info');
}

// ─── TOAST NOTIFICATION ───────────────────────────────────────
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const colors = {
    success: 'rgba(16,185,129,0.9)',
    warn:    'rgba(251,191,36,0.9)',
    error:   'rgba(239,68,68,0.9)',
    info:    'rgba(139,92,246,0.9)',
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '999',
    background: colors[type], color: '#fff',
    padding: '12px 22px', borderRadius: '12px',
    fontFamily: 'Outfit, sans-serif', fontWeight: '600', fontSize: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    animation: 'fadeInUp 0.3s ease',
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── STICKY HEADER ────────────────────────────────────────────
function handleScroll() {
  const header = $('site-header');
  if (window.scrollY > 60) {
    header.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
  } else {
    header.style.boxShadow = 'none';
  }
}

// ─── AI MEME ENGINE — CLIENT-SIDE NLU FALLBACK ───────────────
const AI_NLU = {
  emotions: {
    'funny':      { keywords: ['lol','funny','hilarious','laugh','joke','comedy','haha','lmao','rofl'], emoji: '😂' },
    'stress':     { keywords: ['stress','deadline','exam','panic','anxiety','overwhelm','pressure','rush','crunch','last minute'], emoji: '😰' },
    'sarcasm':    { keywords: ['sarcastic','sure','right','totally','obviously','clearly','wow','great','amazing','perfect'], emoji: '😏' },
    'relatable':  { keywords: ['relatable','every time','always','me when','that moment','literally','mood','same','fr','real'], emoji: '😅' },
    'sad':        { keywords: ['sad','cry','depressed','lonely','heartbreak','pain','miss','lost','tears','tragic'], emoji: '😢' },
    'angry':      { keywords: ['angry','mad','furious','rage','hate','annoyed','irritated','frustrated','pissed'], emoji: '😤' },
    'shocked':    { keywords: ['shocked','surprise','what','omg','cant believe','unexpected','jaw drop','plot twist','sudden'], emoji: '😱' },
    'happy':      { keywords: ['happy','joy','excited','celebrate','win','success','proud','awesome','yay','blessed'], emoji: '😄' },
    'tired':      { keywords: ['tired','sleep','exhausted','monday','morning','coffee','nap','lazy','fatigue','bed'], emoji: '😴' },
    'confused':   { keywords: ['confused','what','how','why','understand','lost','huh','weird','strange','makes no sense'], emoji: '🤔' },
  },
  categories: {
    'student life':    { keywords: ['assignment','exam','study','professor','class','school','college','grade','homework','lecture','student','gpa','semester'] },
    'coding':          { keywords: ['code','bug','programming','developer','stack overflow','git','deploy','compile','javascript','python','server','debug','api','error'] },
    'work life':       { keywords: ['boss','meeting','office','work','job','email','deadline','coworker','salary','overtime','promotion','monday','corporate'] },
    'relationships':   { keywords: ['friend','girlfriend','boyfriend','crush','date','love','relationship','partner','text','message','reply','ghost','ex'] },
    'daily struggle':  { keywords: ['morning','alarm','sleep','coffee','traffic','wifi','phone','battery','food','money','weather','laundry','cook'] },
    'internet culture':{ keywords: ['meme','viral','social media','instagram','twitter','tiktok','reddit','youtube','online','internet','trending','post','share'] },
    'gaming':          { keywords: ['game','gamer','play','level','boss fight','respawn','lag','noob','pro','console','pc','multiplayer','fps'] },
    'food':            { keywords: ['food','eat','hungry','pizza','snack','diet','cook','restaurant','order','delivery','lunch','dinner','breakfast'] },
  },
  templates: {
    'stress + student life':     ['Third World Skeptical Kid','Panik Kalm Panik','Running Away Balloon','Hide the Pain Harold'],
    'funny + coding':            ['Two Buttons','Star Wars Yoda','Drake Hotline Bling','Change My Mind'],
    'relatable + daily struggle':['First Time?','Bike Fall','Clown Applying Makeup','Is This A Pigeon'],
    'sarcasm + work life':       ['Mocking Spongebob','Surprised Pikachu','Roll Safe Think About It','Wait Its All'],
    'tired + daily struggle':    ['Waiting Skeleton','Tired Spongebob','Ancient Aliens','Sleeping Shaq'],
    'sad + relationships':       ['Sad Pablo Escobar','Left Exit 12 Off Ramp','Woman Yelling At Cat','Hide the Pain Harold'],
    'angry + work life':         ['Woman Yelling At Cat','Drake Hotline Bling','Boardroom Meeting Suggestion','Angry Pakistani Fan'],
    'shocked + internet culture':['Surprised Pikachu','Am I The Only One Around Here','One Does Not Simply','Wait Its All'],
    'happy + daily struggle':    ['Success Kid','Leonardo Dicaprio Cheers','Epic Handshake','Shut Up And Take My Money'],
    'confused + coding':         ['Confused Math Lady','Is This A Pigeon','Futurama Fry','Jackie Chan WTF'],
    'funny + food':              ['Boardroom Meeting Suggestion','Drake Hotline Bling','One Does Not Simply','Shut Up And Take My Money'],
    'relatable + student life':  ['Look At Me','Clown Applying Makeup','Panik Kalm Panik','Running Away Balloon'],
    'funny + relationships':     ['Grant Gustin over grave','Woman Yelling At Cat','Left Exit 12 Off Ramp','Drake Hotline Bling'],
    'sarcasm + internet culture':['Mocking Spongebob','Change My Mind','Roll Safe Think About It','Futurama Fry'],
    'stressed + coding':         ['Fine This is Fine','Panik Kalm Panik','Hide the Pain Harold','Two Buttons'],
    '_default':                  ['Drake Hotline Bling','Third World Skeptical Kid','Star Wars Yoda','Change My Mind'],
  },
  captionPatterns: {
    'stress':    [(t)=>[`Me: ${t.slice(0,30)}`, 'My brain: this is fine 🔥'], (t)=>[`${t.slice(0,35)}`, 'Why do I do this to myself']],
    'funny':     [(t)=>[`Nobody:`, `Me: ${t.slice(0,35)}`], (t)=>[`${t.slice(0,35)}`, 'And I took that personally']],
    'sarcasm':   [(t)=>[`Oh sure`, `${t.slice(0,35)} totally makes sense`], (t)=>[`${t.slice(0,35)}`, 'Said no one ever']],
    'relatable': [(t)=>[`Every single time`, `${t.slice(0,35)}`], (t)=>[`Me: ${t.slice(0,35)}`, 'Also me: *does it anyway*']],
    'sad':       [(t)=>[`${t.slice(0,35)}`, 'Pain. Just pain. 💔'], (t)=>[`When you realize`, `${t.slice(0,35)}`]],
    'angry':     [(t)=>[`${t.slice(0,35)}`, 'I have decided violence'], (t)=>[`Me trying to stay calm`, `${t.slice(0,35)}`]],
    'shocked':   [(t)=>[`Wait...`, `${t.slice(0,35)}?!`], (t)=>[`${t.slice(0,35)}`, 'Excuse me WHAT']],
    'happy':     [(t)=>[`${t.slice(0,35)}`, 'Best feeling ever 🎉'], (t)=>[`When ${t.slice(0,30)}`, 'Life is good']],
    'tired':     [(t)=>[`${t.slice(0,35)}`, 'I need 47 more hours of sleep'], (t)=>[`My energy level:`, `${t.slice(0,35)}`]],
    'confused':  [(t)=>[`${t.slice(0,35)}`, 'Visible confusion'], (t)=>[`Me trying to understand`, `${t.slice(0,35)}`]],
    '_default':  [(t)=>[`${t.slice(0,35)}`, 'It really be like that'], (t)=>[`Nobody:`, `Me: ${t.slice(0,35)}`]],
  },

  analyze(text) {
    const lower = text.toLowerCase();
    // Detect emotion
    let bestEmotion = '_default', bestEmotionScore = 0;
    for (const [emotion, data] of Object.entries(this.emotions)) {
      const score = data.keywords.filter(k => lower.includes(k)).length;
      if (score > bestEmotionScore) { bestEmotionScore = score; bestEmotion = emotion; }
    }
    if (bestEmotionScore === 0) {
      if (lower.includes('when') || lower.includes('that moment')) bestEmotion = 'relatable';
      else if (lower.includes('why') || lower.includes('how')) bestEmotion = 'confused';
      else bestEmotion = 'funny';
    }
    // Detect category
    let bestCategory = 'daily struggle', bestCatScore = 0;
    for (const [cat, data] of Object.entries(this.categories)) {
      const score = data.keywords.filter(k => lower.includes(k)).length;
      if (score > bestCatScore) { bestCatScore = score; bestCategory = cat; }
    }
    // Pick template
    const key = `${bestEmotion} + ${bestCategory}`;
    const templates = this.templates[key] || this.templates['_default'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    // Generate captions
    const patterns = this.captionPatterns[bestEmotion] || this.captionPatterns['_default'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const [topText, bottomText] = pattern(text);

    const emoji = this.emotions[bestEmotion]?.emoji || '😂';
    return {
      emotion: `${emoji} ${bestEmotion}`,
      category: bestCategory,
      template_suggestion: template,
      top_text: topText,
      bottom_text: bottomText,
    };
  }
};

// ─── GEMINI API INTEGRATION ──────────────────────────────────
async function analyzeWithGemini(text) {
  const apiKey = (typeof GEMINI_CONFIG !== 'undefined') ? GEMINI_CONFIG.apiKey : '';
  if (!apiKey) return null; // Fall back to client-side

  const prompt = `You are a meme generation AI. Analyze this text and return ONLY valid JSON (no markdown, no code fences):
"${text}"

Return JSON with these exact keys:
{
  "emotion": "<detected emotion with emoji prefix, e.g. 😂 funny>",
  "category": "<meme category, e.g. student life, coding, daily struggle>",
  "template_suggestion": "<name of a popular meme template from imgflip like: Drake Hotline Bling, Third World Skeptical Kid, Star Wars Yoda, Look At Me, Grant Gustin over grave, Change My Mind, Two Buttons, Panik Kalm Panik, etc.>",
  "top_text": "<short meme top text, max 10 words>",
  "bottom_text": "<short meme bottom text, max 12 words>"
}
Keep captions concise, humorous, and relatable. Use well-known meme templates only.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Strip markdown fences if present
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Gemini API error, using client-side fallback:', err.message);
    return null;
  }
}

// ─── MAIN AI ANALYSIS FUNCTION ────────────────────────────────
async function analyzeTextForMeme(text) {
  // Try Gemini first, fall back to client-side
  const geminiResult = await analyzeWithGemini(text);
  if (geminiResult) return geminiResult;
  return AI_NLU.analyze(text);
}

// ─── TEMPLATE MATCHING ────────────────────────────────────────
function fuzzyMatchTemplate(suggestion) {
  if (!state.allMemes.length) return null;
  const lower = suggestion.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  // Exact match first
  let match = state.allMemes.find(m => m.name.toLowerCase() === lower);
  if (match) return match;
  // Partial match
  match = state.allMemes.find(m => m.name.toLowerCase().includes(lower) || lower.includes(m.name.toLowerCase()));
  if (match) return match;
  // Word overlap
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  let bestMatch = null, bestScore = 0;
  for (const meme of state.allMemes) {
    const memeLower = meme.name.toLowerCase();
    const score = words.filter(w => memeLower.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestMatch = meme; }
  }
  return bestMatch || state.allMemes[Math.floor(Math.random() * Math.min(20, state.allMemes.length))];
}

// ─── AI MAGIC UI HANDLERS ─────────────────────────────────────
const aiTextInput    = $('ai-text-input');
const aiCharCount    = $('ai-char-count');
const btnAiGenerate  = $('btn-ai-generate');
const aiGenLabel     = $('ai-gen-label');
const aiGenSpinner   = $('ai-gen-spinner');
const aiResults      = $('ai-results');
const aiEmotion      = $('ai-emotion');
const aiCategory     = $('ai-category');
const aiTemplateSugg = $('ai-template-suggestion');
const aiTopText      = $('ai-top-text');
const aiBottomText   = $('ai-bottom-text');
const btnAiUseMeme   = $('btn-ai-use-meme');
const btnAiEdit      = $('btn-ai-edit');
const btnAiRetry     = $('btn-ai-retry');

let lastAiResult = null;

async function handleAiGenerate() {
  const text = aiTextInput.value.trim();
  if (!text) { showToast('✏️ Please describe a situation or feeling', 'warn'); return; }
  if (text.length < 5) { showToast('✏️ Please write a bit more for better results', 'warn'); return; }

  // Loading state
  aiGenLabel.style.display = 'none';
  aiGenSpinner.style.display = 'block';
  btnAiGenerate.disabled = true;
  aiResults.style.display = 'none';

  try {
    const result = await analyzeTextForMeme(text);
    lastAiResult = result;
    displayAiResults(result);
    showToast('🧠 AI analysis complete!', 'success');
  } catch (err) {
    console.error('AI analysis error:', err);
    showToast('❌ Analysis failed. Please try again.', 'error');
  } finally {
    aiGenLabel.style.display = 'inline';
    aiGenSpinner.style.display = 'none';
    btnAiGenerate.disabled = false;
  }
}

function displayAiResults(result) {
  aiEmotion.textContent = result.emotion;
  aiCategory.textContent = result.category;
  aiTemplateSugg.textContent = result.template_suggestion;
  aiTopText.textContent = result.top_text;
  aiBottomText.textContent = result.bottom_text;
  aiResults.style.display = 'block';
  aiResults.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Fetch related GIFs from Giphy
  fetchAiGifs(result);
}

async function fetchAiGifs(result) {
  const aiGifSection = $('ai-gif-section');
  const aiGifGrid = $('ai-gif-grid');
  const aiGifQuery = $('ai-gif-query');
  const apiKey = getGiphyKey();

  if (!apiKey) {
    aiGifSection.style.display = 'none';
    return;
  }

  // Build search query from emotion + category
  const emotion = result.emotion.replace(/[^\w\s]/g, '').trim();
  const query = `${emotion} ${result.category} meme`;
  aiGifQuery.textContent = `🔍 "${query}"`;
  aiGifGrid.innerHTML = '<div class="gif-loading"><div class="spinner"></div>&nbsp; Loading GIFs...</div>';
  aiGifSection.style.display = 'block';

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=8&rating=pg-13&lang=en`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || !data.data.length) {
      aiGifGrid.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">No GIFs found for this mood 😕</p>';
      return;
    }

    aiGifGrid.innerHTML = data.data.map(gif => `
      <div class="ai-gif-item">
        <img src="${gif.images.fixed_height_small.url}" alt="${gif.title}" loading="lazy" />
        <div class="gif-badge">GIF</div>
        <div class="ai-gif-item-overlay">
          <button class="gif-action-btn" onclick="window.open('${gif.url}','_blank')">🔗</button>
          <button class="gif-action-btn" onclick="copyGifUrl('${gif.images.original.url}')">📋</button>
          <button class="gif-action-btn" onclick="saveGifToGallery('${gif.images.fixed_height.url}','${(gif.title||'GIF').replace(/'/g,"\\'")}')">💾</button>
        </div>
      </div>`).join('');

  } catch (err) {
    console.warn('AI GIF fetch error:', err);
    aiGifGrid.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Could not load GIFs</p>';
  }
}

function applyAiToGenerator(autoForge) {
  if (!lastAiResult) return;
  const matched = fuzzyMatchTemplate(lastAiResult.template_suggestion);
  if (matched) {
    selectTemplate(matched.id);
    // Wait for caption inputs to render, then fill
    setTimeout(() => {
      const boxes = document.querySelectorAll('.caption-box');
      if (boxes[0]) boxes[0].value = lastAiResult.top_text;
      if (boxes[1]) boxes[1].value = lastAiResult.bottom_text;
      document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
      showToast('🚀 Template & captions applied!', 'success');
      if (autoForge) setTimeout(() => forgeMeme(), 600);
    }, 200);
  } else {
    showToast('⚠️ Could not match template. Please select one manually.', 'warn');
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
  }
}

function bindAiMagicEvents() {
  // Character counter
  aiTextInput.addEventListener('input', () => {
    aiCharCount.textContent = `${aiTextInput.value.length} / 300`;
  });
  // Generate button
  btnAiGenerate.addEventListener('click', handleAiGenerate);
  // Enter key in textarea (Ctrl+Enter or Cmd+Enter to generate)
  aiTextInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleAiGenerate(); }
  });
  // Example chips
  document.querySelectorAll('.ai-example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      aiTextInput.value = chip.dataset.text;
      aiCharCount.textContent = `${chip.dataset.text.length} / 300`;
      aiTextInput.focus();
    });
  });
  // Use meme (auto-forge)
  btnAiUseMeme.addEventListener('click', () => applyAiToGenerator(true));
  // Edit first
  btnAiEdit.addEventListener('click', () => applyAiToGenerator(false));
  // Retry
  btnAiRetry.addEventListener('click', handleAiGenerate);
}

// ─── GIF MEMES (GIPHY API) ────────────────────────────────────
const gifSearchInput = $('gif-search-input');
const gifGrid        = $('gif-grid');
const gifGridEmpty   = $('gif-grid-empty');
const gifApiNotice   = $('gif-api-notice');
const gifLoadMore    = $('gif-load-more');
const btnGifSearch   = $('btn-gif-search');
const btnGifLoadMore = $('btn-gif-load-more');

const gifState = { query: '', offset: 0, limit: 20 };

function getGiphyKey() {
  return (typeof GIPHY_CONFIG !== 'undefined' && GIPHY_CONFIG.apiKey) ? GIPHY_CONFIG.apiKey : '';
}

async function searchGifs(query, offset = 0) {
  const apiKey = getGiphyKey();
  if (!apiKey) {
    gifApiNotice.style.display = 'block';
    gifGridEmpty.style.display = 'block';
    return;
  }
  gifApiNotice.style.display = 'none';

  if (offset === 0) {
    gifGrid.innerHTML = '<div class="gif-loading"><div class="spinner"></div>&nbsp; Loading GIFs...</div>';
    gifGridEmpty.style.display = 'none';
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${gifState.limit}&offset=${offset}&rating=pg-13&lang=en`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || !data.data.length) {
      if (offset === 0) {
        gifGrid.innerHTML = '';
        gifGridEmpty.style.display = 'block';
        gifGridEmpty.querySelector('p').textContent = `No GIFs found for "${query}" 😕`;
        gifGrid.appendChild(gifGridEmpty);
      }
      gifLoadMore.style.display = 'none';
      return;
    }

    if (offset === 0) gifGrid.innerHTML = '';
    gifGridEmpty.style.display = 'none';

    data.data.forEach(gif => {
      const item = document.createElement('div');
      item.className = 'gif-item';
      item.innerHTML = `
        <img src="${gif.images.fixed_height.url}" alt="${gif.title}" loading="lazy" />
        <div class="gif-badge">GIF</div>
        <div class="gif-item-overlay">
          <div class="gif-item-title">${gif.title || 'Untitled'}</div>
          <div class="gif-item-actions">
            <button class="gif-action-btn" onclick="window.open('${gif.url}','_blank')">🔗 Open</button>
            <button class="gif-action-btn" onclick="copyGifUrl('${gif.images.original.url}')">📋 Copy URL</button>
            <button class="gif-action-btn" onclick="saveGifToGallery('${gif.images.fixed_height.url}','${(gif.title||'GIF Meme').replace(/'/g,'\\&#39;')}')">💾 Save</button>
          </div>
        </div>`;
      gifGrid.appendChild(item);
    });

    gifState.offset = offset + data.data.length;
    gifLoadMore.style.display = (data.pagination.total_count > gifState.offset) ? 'block' : 'none';

  } catch (err) {
    console.error('Giphy API error:', err);
    if (offset === 0) {
      gifGrid.innerHTML = '';
      gifGridEmpty.style.display = 'block';
      gifGridEmpty.querySelector('p').textContent = '⚠️ Failed to load GIFs. Check your API key.';
      gifGrid.appendChild(gifGridEmpty);
    }
    showToast('❌ Giphy API error: ' + err.message, 'error');
  }
}

function copyGifUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('📋 GIF URL copied!', 'success');
  }).catch(() => {
    showToast('⚠️ Could not copy URL', 'warn');
  });
}

function saveGifToGallery(url, name) {
  const item = { id: Date.now(), url, name, created: new Date().toLocaleDateString() };
  state.gallery.unshift(item);
  localStorage.setItem('memeforge_gallery', JSON.stringify(state.gallery));
  renderGallery();
  showToast('💾 GIF saved to gallery!', 'success');
}

function handleGifSearch() {
  const q = gifSearchInput.value.trim();
  if (!q) { showToast('🔍 Enter a search term', 'warn'); return; }
  gifState.query = q;
  gifState.offset = 0;
  // Update active chip
  document.querySelectorAll('.gif-chip').forEach(c => c.classList.remove('active'));
  searchGifs(q);
}

function bindGifEvents() {
  btnGifSearch.addEventListener('click', handleGifSearch);
  gifSearchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleGifSearch();
  });
  btnGifLoadMore.addEventListener('click', () => {
    searchGifs(gifState.query, gifState.offset);
  });
  document.querySelectorAll('.gif-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.gif-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      gifSearchInput.value = '';
      gifState.query = chip.dataset.q;
      gifState.offset = 0;
      searchGifs(chip.dataset.q);
    });
  });
}

function initGifs() {
  if (!getGiphyKey()) {
    gifApiNotice.style.display = 'block';
  }
}

// ─── BIND EVENTS ─────────────────────────────────────────────
function bindEvents() {
  // Search
  searchInput.addEventListener('input', e => handleSearch(e.target.value));

  // Forge
  btnForge.addEventListener('click', forgeMeme);

  // Reset
  btnReset.addEventListener('click', resetGenerator);

  // AI Suggest (modal)
  btnAiSuggest.addEventListener('click', openAiModal);
  aiModalClose.addEventListener('click', closeAiModal);
  aiModal.addEventListener('click', e => { if (e.target === aiModal) closeAiModal(); });

  // Vision scan button
  document.getElementById('btn-vision-scan').addEventListener('click', scanTemplateWithVision);

  // Gallery
  btnSaveGallery.addEventListener('click', saveToGallery);
  btnClearGallery.addEventListener('click', clearGallery);
  btnMakeAnother.addEventListener('click', () => {
    resultArea.style.display = 'none';
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
  });

  // Scroll
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && aiModal.style.display !== 'none') closeAiModal();
  });

  // AI Magic events
  bindAiMagicEvents();

  // GIF events
  bindGifEvents();
}

// ─── INIT (updated) ──────────────────────────────────────────
async function init() {
  if (typeof IMGFLIP_CONFIG !== 'undefined') {
    imgflipUser.value = IMGFLIP_CONFIG.username || '';
    imgflipPass.value = IMGFLIP_CONFIG.password || '';
  }
  await fetchMemes();
  renderGallery();
  initGifs();
  bindEvents();
}

// ─── BOOT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
