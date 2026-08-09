(function () {
  // document.documentElement.clientWidth excludes the scrollbar's own width
  // (unlike window.innerWidth or the CSS `vw` unit), so this gives layout
  // code an accurate "1% of the actually-visible width" to size against —
  // see the html { scrollbar-gutter } comment in style.css for the bug this
  // avoids.
  function updateSafeViewportUnit() {
    document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth / 100 + 'px');
  }
  updateSafeViewportUnit();
  window.addEventListener('resize', updateSafeViewportUnit);

  function waitForBackend() {
    return new Promise((resolve) => {
      if (typeof window.submitLetter === 'function' && typeof window.loadRandomLetter === 'function') {
        resolve();
        return;
      }
      const onReady = () => resolve();
      window.addEventListener('loveLettersReady', onReady, { once: true });
      const checkInterval = setInterval(() => {
        if (typeof window.submitLetter === 'function' && typeof window.loadRandomLetter === 'function') {
          clearInterval(checkInterval);
          window.removeEventListener('loveLettersReady', onReady);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        window.removeEventListener('loveLettersReady', onReady);
        console.warn('Backend did not load within 5 seconds');
        resolve();
      }, 5000);
    });
  }

  function waitForTransitionEnd(el, propertyName, fallbackMs) {
    return new Promise((resolve) => {
      let settled = false;
      function onEnd(e) {
        if (e.target !== el || e.propertyName !== propertyName) return;
        finish();
      }
      function finish() {
        if (settled) return;
        settled = true;
        el.removeEventListener('transitionend', onEnd);
        resolve();
      }
      el.addEventListener('transitionend', onEnd);
      setTimeout(finish, fallbackMs);
    });
  }

  // Matches the breakpoint in style.css where the layout switches from
  // fixed-position corners + a pinned envelope to plain stacked flow.
  const mobileLayout = window.matchMedia('(max-width: 700px)');

  // Minimum breathing room to keep between the buttons row and whatever's
  // below it (the letter on mobile, or the info box when it's open).
  const CLEARANCE_GAP = 20;

  const tabsNav = document.querySelector('.tabs');
  const envelopeWrap = document.querySelector('.envelope-wrap');
  const envelope = document.getElementById('envelope');
  const paper = document.getElementById('paper');
  const paperScroll = paper.querySelector('.paper-scroll');
  const letterContent = document.getElementById('letter-content');
  const letterDate = document.getElementById('letter-date');
  const letterTextarea = document.getElementById('letter-text');
  const charCount = document.getElementById('char-count');
  const writeMessage = document.getElementById('write-message');

  const tabRead = document.getElementById('tab-read');
  const tabWrite = document.getElementById('tab-write');
  const tabReadImg = document.getElementById('tab-read-img');
  const tabWriteImg = document.getElementById('tab-write-img');
  const refreshButton = document.getElementById('refresh-button');
  const refreshButtonMobile = document.getElementById('refresh-button-mobile');
  const writeControls = document.getElementById('write-controls');
  const submitButton = document.getElementById('submit-button');

  function revealPaper() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        paper.classList.add('is-revealed');
      });
    });
  }

  function showEmptyState(message) {
    letterContent.textContent = message || 'No letters yet. Be the first to share your heart.';
    letterDate.textContent = '';
  }

  // Slides the whole paper out further when the letter is taller than its
  // always-visible window, so the full text clears envelope-front.png's
  // fold instead of being cut off or silently scrolled out of sight.
  // The cap isn't a fixed pixel value: beyond the point where
  // .paper-scroll would reach 100% of .paper's own content-box height,
  // sliding further doesn't reveal any more text (.paper is a fixed size
  // — see its overflow:hidden in style.css — so .paper-scroll can't grow
  // past that regardless), it just costs clearance for no benefit. That
  // point scales with the envelope's actual rendered size, so mobile's
  // smaller envelope gets a smaller, correctly-scaled cap instead of the
  // same fixed number as desktop. Any real excess beyond the cap still
  // scrolls via .paper-scroll's own overflow-y: auto.
  // Returns the shift amount (px, 0 or positive) so callers can react to it.
  function adjustPaperReveal() {
    paperScroll.style.height = '';
    const paddingTop = parseFloat(getComputedStyle(paper).paddingTop) || 0;
    const paddingBottom = parseFloat(getComputedStyle(paper).paddingBottom) || 0;
    const paperContentHeight = paper.clientHeight - paddingTop - paddingBottom;
    const maxUsefulShift = paperContentHeight * 0.5; // .paper-scroll's baseline is 50%
    const overflow = Math.max(0, paperScroll.scrollHeight - paperScroll.clientHeight);
    const shift = Math.min(overflow, maxUsefulShift);
    paper.style.setProperty('--reveal-shift', shift ? `-${shift}px` : '0px');
    paperScroll.style.height = shift ? `calc(50% + ${shift}px)` : '';
    return shift;
  }

  // .stage centers the envelope's own box in the viewport, but the letter
  // can slide out further above it for long letters (see adjustPaperReveal)
  // — so the true envelope+letter composition, at its tallest, sits higher
  // than that. Rather than recentering per letter (which made the envelope
  // visibly jump between short and long letters), this assumes the maximum
  // *possible* slide-out (a full envelope-height's worth, an upper bound
  // regardless of content) and pins the envelope there permanently: the
  // lowest position it would ever need, computed once and never revisited
  // except on window resize. Uses transform (not margin) so it doesn't feed
  // back into how much .stage's flex centering shifts things in the first
  // place. Desktop only — mobile uses pinEnvelopeBelowButtons instead.
  function pinEnvelopePosition() {
    if (mobileLayout.matches) {
      envelopeWrap.style.transform = '';
      return;
    }
    envelopeWrap.style.transform = 'translateY(0px)';
    const envRect = envelope.getBoundingClientRect();
    const envCenter = (envRect.top + envRect.bottom) / 2;
    const maxPossibleShift = envRect.height / 2;
    const desiredCenter = window.innerHeight / 2 + maxPossibleShift / 2;
    envelopeWrap.style.transform = `translateY(${desiredCenter - envCenter}px)`;
  }

  // Mobile lays .brand/.tabs/the envelope out in normal document flow, so
  // instead of a fixed guessed margin, this measures the buttons row's
  // actual current position (which moves when the info box opens/closes)
  // and the letter's actual current slide-out amount, then sets exactly
  // the margin-top needed so the letter's top can never rise above the
  // buttons row's bottom — recomputed on every letter change, on resize,
  // and once the info box's push-down animation finishes.
  function pinEnvelopeBelowButtons(shift) {
    if (!mobileLayout.matches) {
      envelopeWrap.style.marginTop = '';
      return;
    }
    envelopeWrap.style.marginTop = '0px';
    const tabsBottom = tabsNav.getBoundingClientRect().bottom;
    const envTop = envelope.getBoundingClientRect().top;
    const requiredEnvTop = tabsBottom + CLEARANCE_GAP + shift;
    const delta = requiredEnvTop - envTop;
    envelopeWrap.style.marginTop = delta > 0 ? `${delta}px` : '0px';
  }

  let lastShift = 0;

  async function loadAndDisplayLetter() {
    await waitForBackend();
    try {
      const result = await window.loadRandomLetter();
      if (result.success && result.letter) {
        letterContent.textContent = result.letter.content;
        letterDate.textContent = window.formatDate
          ? `Written on ${window.formatDate(result.letter.createdAt)}`
          : '';
      } else {
        showEmptyState(result.message);
      }
    } catch (err) {
      console.error('Error loading letter:', err);
      showEmptyState('Error loading letter. Please try again.');
    }
    lastShift = adjustPaperReveal();
    pinEnvelopeBelowButtons(lastShift);
  }

  pinEnvelopePosition();
  window.addEventListener('resize', () => {
    pinEnvelopePosition();
    pinEnvelopeBelowButtons(lastShift);
  });

  // Initial load: fetch a letter, then slide it out of the envelope.
  (async function init() {
    await loadAndDisplayLetter();
    revealPaper();
  })();

  // Read Next: fade the paper out completely, swap content, then slide it back out.
  let isLoadingNext = false;
  async function showNextLetter() {
    if (isLoadingNext) return;
    isLoadingNext = true;

    await waitForBackend();
    if (typeof window.refreshLettersCache === 'function') {
      window.refreshLettersCache();
    }

    paper.classList.remove('is-revealed');
    paper.classList.add('is-cycling');
    await waitForTransitionEnd(paper, 'opacity', 400);

    await loadAndDisplayLetter();
    paper.classList.remove('is-cycling');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        paper.classList.add('is-revealed');
      });
    });
    isLoadingNext = false;
  }

  // Tabs.
  function setMode(mode) {
    document.body.classList.toggle('mode-read', mode === 'read');
    document.body.classList.toggle('mode-write', mode === 'write');
    tabRead.classList.toggle('is-active', mode === 'read');
    tabWrite.classList.toggle('is-active', mode === 'write');
    // Exactly one heart is red (active) at a time, the other pink.
    tabReadImg.src = mode === 'read' ? 'assets/buttons/heart-1-red.png' : 'assets/buttons/heart-1-pink.png';
    tabWriteImg.src = mode === 'write' ? 'assets/buttons/heart-2-red.png' : 'assets/buttons/heart-2-pink.png';
    writeControls.hidden = mode !== 'write';
  }

  tabRead.addEventListener('click', () => setMode('read'));
  tabWrite.addEventListener('click', () => setMode('write'));
  refreshButton.addEventListener('click', showNextLetter);
  refreshButtonMobile.addEventListener('click', showNextLetter);

  setMode('read');

  // Character counter
  letterTextarea.addEventListener('input', () => {
    charCount.textContent = letterTextarea.value.length.toString();
  });

  // Submit
  submitButton.addEventListener('click', async () => {
    await waitForBackend();
    const content = letterTextarea.value || '';

    submitButton.disabled = true;
    const originalLabel = submitButton.innerHTML;
    submitButton.textContent = 'Sending...';

    try {
      const result = await window.submitLetter(content);
      writeMessage.innerHTML = `<span class="msg-box">${result.message}</span>`;
      setTimeout(() => { writeMessage.innerHTML = ''; }, 5000);

      if (result.success) {
        letterTextarea.value = '';
        charCount.textContent = '0';
      }
    } catch (err) {
      console.error('Error submitting letter:', err);
      writeMessage.innerHTML = `<span class="msg-box">There was an error sending your letter. Please try again.</span>`;
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  });

  // Imprint
  const imprintToggle = document.getElementById('imprint-toggle');
  const imprintPanel = document.getElementById('imprint-panel');
  const imprintClose = document.getElementById('imprint-close');

  imprintToggle.addEventListener('click', () => {
    imprintPanel.hidden = !imprintPanel.hidden;
  });
  imprintClose.addEventListener('click', () => {
    imprintPanel.hidden = true;
  });

  // Keep the tagline's box the same width as the headline above it.
  const logoEl = document.querySelector('.logo');
  const taglineEl = document.querySelector('.tagline');
  function syncTaglineWidth() {
    taglineEl.style.width = `${logoEl.getBoundingClientRect().width}px`;
  }
  syncTaglineWidth();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncTaglineWidth);
  }
  window.addEventListener('resize', syncTaglineWidth);

  // Mobile-only: the tagline is hidden behind an "info" toggle instead of
  // shown directly (see the @media (max-width: 700px) block in style.css).
  // Opening/closing it moves .tabs (it's the sibling right below), so the
  // letter's clearance below the buttons needs recomputing once that
  // push settles — otherwise the last-known margin (from before the info
  // box's height changed) could be stale.
  const taglineToggle = document.getElementById('tagline-toggle');
  const taglineClose = document.getElementById('tagline-close');
  function recheckClearanceAfterTaglineMove() {
    waitForTransitionEnd(taglineEl, 'max-height', 500).then(() => {
      pinEnvelopeBelowButtons(lastShift);
    });
  }
  taglineToggle.addEventListener('click', () => {
    taglineEl.classList.toggle('is-open');
    recheckClearanceAfterTaglineMove();
  });
  taglineClose.addEventListener('click', () => {
    taglineEl.classList.remove('is-open');
    recheckClearanceAfterTaglineMove();
  });
})();
