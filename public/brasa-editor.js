(function () {
  "use strict";

  if (window.__brasaEditorInit) return;
  window.__brasaEditorInit = true;

  var BRAND = "#0d61ac";
  var enabled = false;
  var currentEditable = null;
  var toolbar = null;
  var imageOverlay = null;
  var labelEl = null;

  /* ── Utilities ────────────────────────────────────────────────── */

  function getElements() {
    return Array.prototype.slice.call(
      document.querySelectorAll("[data-brasa-block][data-brasa-prop]")
    );
  }

  function isImage(el) {
    return el.tagName === "IMG";
  }

  function isRichText(el) {
    return el.getAttribute("data-brasa-rich") === "true";
  }

  function sendToParent(msg) {
    window.parent.postMessage(msg, "*");
  }

  /* ── Label ────────────────────────────────────────────────────── */

  function ensureLabel() {
    if (labelEl) return;
    labelEl = document.createElement("div");
    labelEl.setAttribute("aria-hidden", "true");
    Object.assign(labelEl.style, {
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      background: BRAND,
      color: "#fff",
      fontSize: "10px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "600",
      lineHeight: "1",
      padding: "2px 5px",
      borderRadius: "2px",
      letterSpacing: "0.02em",
      display: "none",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(labelEl);
  }

  function showLabel(el) {
    ensureLabel();
    var prop = el.getAttribute("data-brasa-prop");
    labelEl.textContent = prop;
    var rect = el.getBoundingClientRect();
    labelEl.style.display = "block";
    var top = rect.top + window.scrollY - 18;
    if (top < 2) top = rect.top + window.scrollY + 2;
    labelEl.style.top = top + "px";
    labelEl.style.left = rect.left + window.scrollX + "px";
  }

  function hideLabel() {
    if (labelEl) labelEl.style.display = "none";
  }

  /* ── Toolbar (bold / italic / link) ──────────────────────────── */

  function destroyToolbar() {
    if (toolbar) {
      toolbar.remove();
      toolbar = null;
    }
  }

  function createToolbarButton(label, icon, action) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", label);
    btn.innerHTML = icon;
    Object.assign(btn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "26px",
      height: "26px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      borderRadius: "3px",
      color: "#374151",
    });
    btn.addEventListener("mouseenter", function () {
      btn.style.background = "#f3f4f6";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.background = "transparent";
    });
    btn.addEventListener("mousedown", function (e) {
      e.preventDefault();
      action();
    });
    return btn;
  }

  function showRichToolbar(el) {
    destroyToolbar();
    toolbar = document.createElement("div");
    Object.assign(toolbar.style, {
      position: "fixed",
      zIndex: "2147483646",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "5px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      display: "flex",
      alignItems: "center",
      gap: "1px",
      padding: "2px",
    });

    var boldIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>';
    var italicIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>';
    var linkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

    toolbar.appendChild(createToolbarButton("Negrito", boldIcon, function () {
      document.execCommand("bold");
    }));
    toolbar.appendChild(createToolbarButton("Italico", italicIcon, function () {
      document.execCommand("italic");
    }));
    toolbar.appendChild(createToolbarButton("Link", linkIcon, function () {
      var url = prompt("URL do link:");
      if (url) document.execCommand("createLink", false, url);
    }));

    document.body.appendChild(toolbar);
    positionToolbar(el);
  }

  function positionToolbar(el) {
    if (!toolbar) return;
    var rect = el.getBoundingClientRect();
    var tbHeight = 34;
    var top = rect.top + window.scrollY - tbHeight - 6;
    if (top < 4) top = rect.bottom + window.scrollY + 4;
    toolbar.style.top = top + "px";
    toolbar.style.left = rect.left + window.scrollX + "px";
  }

  /* ── Image overlay ────────────────────────────────────────────── */

  function destroyImageOverlay() {
    if (imageOverlay) {
      imageOverlay.remove();
      imageOverlay = null;
    }
  }

  function showImageOverlay(el) {
    destroyImageOverlay();
    imageOverlay = document.createElement("div");
    Object.assign(imageOverlay.style, {
      position: "fixed",
      zIndex: "2147483646",
      background: "rgba(13,97,172,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      borderRadius: "3px",
    });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Trocar imagem";
    Object.assign(btn.style, {
      border: "1.5px solid #fff",
      borderRadius: "4px",
      background: "transparent",
      color: "#fff",
      fontSize: "12px",
      fontWeight: "600",
      fontFamily: "system-ui, sans-serif",
      padding: "6px 14px",
      cursor: "pointer",
      letterSpacing: "0.01em",
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var blockId = el.getAttribute("data-brasa-block");
      var propKey = el.getAttribute("data-brasa-prop");
      sendToParent({ type: "brasa:media-request", blockId: blockId, propKey: propKey });
    });

    imageOverlay.appendChild(btn);
    document.body.appendChild(imageOverlay);
    positionOverlayOnEl(el);

    imageOverlay.addEventListener("click", function (e) {
      if (e.target === imageOverlay) destroyImageOverlay();
    });
  }

  function positionOverlayOnEl(el) {
    if (!imageOverlay) return;
    var rect = el.getBoundingClientRect();
    imageOverlay.style.top = (rect.top + window.scrollY) + "px";
    imageOverlay.style.left = (rect.left + window.scrollX) + "px";
    imageOverlay.style.width = rect.width + "px";
    imageOverlay.style.height = rect.height + "px";
  }

  /* ── Editing ──────────────────────────────────────────────────── */

  function startEditing(el) {
    if (currentEditable === el) return;
    stopEditing();

    currentEditable = el;
    var blockId = el.getAttribute("data-brasa-block");

    sendToParent({ type: "brasa:select", blockId: blockId });

    if (isImage(el)) {
      showImageOverlay(el);
      return;
    }

    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "false");
    el.style.outline = "2px solid " + BRAND;
    el.style.outlineOffset = "2px";
    el.focus();

    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    if (isRichText(el)) {
      showRichToolbar(el);
    }

    el.addEventListener("blur", onBlur);
    el.addEventListener("keydown", onKeydown);
  }

  function stopEditing() {
    destroyToolbar();
    destroyImageOverlay();

    if (!currentEditable) return;
    var el = currentEditable;
    currentEditable = null;

    if (isImage(el)) return;

    el.removeEventListener("blur", onBlur);
    el.removeEventListener("keydown", onKeydown);
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
    el.style.outline = "";
    el.style.outlineOffset = "";
  }

  function commitValue(el) {
    var blockId = el.getAttribute("data-brasa-block");
    var propKey = el.getAttribute("data-brasa-prop");
    var value = isRichText(el) ? el.innerHTML : el.textContent;
    sendToParent({ type: "brasa:update", blockId: blockId, propKey: propKey, value: value });
  }

  function onBlur() {
    var el = currentEditable;
    if (!el) return;
    commitValue(el);
    stopEditing();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      stopEditing();
    }
    if (e.key === "Enter" && !isRichText(currentEditable)) {
      e.preventDefault();
      if (currentEditable) commitValue(currentEditable);
      stopEditing();
    }
  }

  /* ── Hover highlighting ───────────────────────────────────────── */

  function onMouseEnter(e) {
    if (!enabled) return;
    var el = e.currentTarget;
    if (el === currentEditable) return;
    el.style.outline = "2px solid " + BRAND;
    el.style.outlineOffset = "2px";
    el.style.cursor = isImage(el) ? "pointer" : "text";
    showLabel(el);
  }

  function onMouseLeave(e) {
    if (!enabled) return;
    var el = e.currentTarget;
    if (el === currentEditable) return;
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.cursor = "";
    hideLabel();
  }

  function onClick(e) {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    startEditing(e.currentTarget);
  }

  /* ── Attach / detach listeners ────────────────────────────────── */

  function attach() {
    getElements().forEach(function (el) {
      el.addEventListener("mouseenter", onMouseEnter);
      el.addEventListener("mouseleave", onMouseLeave);
      el.addEventListener("click", onClick, true);
    });
  }

  function detach() {
    stopEditing();
    hideLabel();
    getElements().forEach(function (el) {
      el.removeEventListener("mouseenter", onMouseEnter);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("click", onClick, true);
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.cursor = "";
    });
  }

  /* ── Click outside ────────────────────────────────────────────── */

  document.addEventListener("click", function (e) {
    if (!enabled || !currentEditable) return;
    if (!currentEditable.contains(e.target)) {
      if (currentEditable) commitValue(currentEditable);
      stopEditing();
    }
  });

  /* ── Message listener ─────────────────────────────────────────── */

  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "brasa:init":
        // blocks provided for reference — DOM attributes are the source of truth
        break;

      case "brasa:enable":
        if (!enabled) {
          enabled = true;
          attach();
        }
        break;

      case "brasa:disable":
        if (enabled) {
          enabled = false;
          detach();
        }
        break;

      case "brasa:sections-update":
        // Update DOM text/image values from new props without full reload
        if (msg.blocks && Array.isArray(msg.blocks)) {
          msg.blocks.forEach(function (block) {
            var els = document.querySelectorAll('[data-brasa-block="' + block.id + '"]');
            els.forEach(function (el) {
              var propKey = el.getAttribute("data-brasa-prop");
              if (!propKey || !block.props) return;
              var newVal = block.props[propKey];
              if (newVal === undefined) return;
              if (isImage(el)) {
                if (el.src !== newVal) el.src = newVal;
              } else if (isRichText(el)) {
                if (el.innerHTML !== newVal) el.innerHTML = newVal;
              } else {
                if (el.textContent !== newVal) el.textContent = newVal;
              }
            });
          });
        }
        break;
    }
  });
})();
