(function () {
  "use strict";

  if (window.__brasaEditorInit) return;
  window.__brasaEditorInit = true;

  var BRAND = "#f97316";
  var enabled = false;
  var currentEditable = null;
  var toolbar = null;
  var imageOverlay = null;
  var labelEl = null;
  var blocksData = [];
  var schemasData = {};

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

  /* ── Auto-detection ─────────────────────────────────────────── */

  /**
   * Automatically detect editable elements inside each section container
   * by matching prop values to DOM text/image content.
   * This eliminates the need for developers to add data-brasa-* attributes manually.
   */
  function autoDetect() {
    // Remove previously auto-detected attributes
    document.querySelectorAll("[data-brasa-auto]").forEach(function (el) {
      el.removeAttribute("data-brasa-block");
      el.removeAttribute("data-brasa-prop");
      el.removeAttribute("data-brasa-rich");
      el.removeAttribute("data-brasa-auto");
    });

    blocksData.forEach(function (block) {
      var container = document.querySelector('[data-section-id="' + block.id + '"]');
      if (!container) return;

      var schema = schemasData[block.component] || {};
      var usedElements = new Set();

      // Sort props: longer values first (more specific matches)
      var entries = Object.entries(block.props || {})
        .filter(function (entry) {
          var key = entry[0];
          var val = entry[1];
          if (val === null || val === undefined || val === "") return false;
          // Skip objects/arrays — only match primitives
          if (typeof val === "object") return false;
          // Skip hidden fields
          var fieldSchema = schema[key];
          if (fieldSchema && fieldSchema.format === "hidden") return false;
          return true;
        })
        .sort(function (a, b) {
          return String(b[1]).length - String(a[1]).length;
        });

      entries.forEach(function (entry) {
        var propKey = entry[0];
        var propVal = entry[1];
        var fieldSchema = schema[propKey] || {};
        var strVal = String(propVal);

        // Skip very short values (likely to match false positives)
        if (strVal.length < 2) return;

        // Already decorated manually?
        var manual = container.querySelector(
          '[data-brasa-block="' + block.id + '"][data-brasa-prop="' + propKey + '"]:not([data-brasa-auto])'
        );
        if (manual) return;

        var matched = null;

        // Image matching: find <img> with matching src
        if (fieldSchema.format === "image" || fieldSchema.type === "string" && isUrl(strVal) && looksLikeImage(strVal)) {
          var imgs = container.querySelectorAll("img");
          for (var i = 0; i < imgs.length; i++) {
            if (usedElements.has(imgs[i])) continue;
            if (normalizeUrl(imgs[i].src) === normalizeUrl(strVal) ||
                imgs[i].getAttribute("src") === strVal) {
              matched = imgs[i];
              break;
            }
          }
        }

        // Rich text matching: find elements whose innerHTML matches
        if (!matched && (fieldSchema.format === "rich-text" || fieldSchema.format === "textarea")) {
          var richCandidates = container.querySelectorAll("div, section, article, p");
          for (var j = 0; j < richCandidates.length; j++) {
            if (usedElements.has(richCandidates[j])) continue;
            var html = richCandidates[j].innerHTML.trim();
            if (html === strVal.trim() || normalizeHtml(html) === normalizeHtml(strVal)) {
              matched = richCandidates[j];
              matched.setAttribute("data-brasa-rich", "true");
              break;
            }
          }
        }

        // URL matching: find <a> with matching href
        if (!matched && (fieldSchema.format === "url" || isUrl(strVal))) {
          var links = container.querySelectorAll("a[href]");
          for (var k = 0; k < links.length; k++) {
            if (usedElements.has(links[k])) continue;
            if (links[k].getAttribute("href") === strVal || links[k].href === strVal) {
              matched = links[k];
              break;
            }
          }
        }

        // Text matching: find deepest element whose textContent matches
        if (!matched && typeof propVal === "string") {
          matched = findTextElement(container, strVal, usedElements);
        }

        if (matched) {
          matched.setAttribute("data-brasa-block", block.id);
          matched.setAttribute("data-brasa-prop", propKey);
          matched.setAttribute("data-brasa-auto", "true");
          if (fieldSchema.format === "rich-text") {
            matched.setAttribute("data-brasa-rich", "true");
          }
          usedElements.add(matched);
        }
      });
    });
  }

  /**
   * Find the deepest element whose trimmed textContent matches the value.
   * Prefers exact matches in leaf elements over parent containers.
   */
  function findTextElement(container, value, usedElements) {
    var trimmed = value.trim();
    if (!trimmed) return null;

    var best = null;
    var bestDepth = -1;

    // Walk the DOM tree
    var walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    var node = walker.currentNode;
    while (node) {
      if (!usedElements.has(node) && node.children !== undefined) {
        var text = getDirectText(node).trim();
        if (text === trimmed) {
          var depth = getDepth(node, container);
          if (depth > bestDepth) {
            best = node;
            bestDepth = depth;
          }
        }
      }
      node = walker.nextNode();
    }

    return best;
  }

  /**
   * Get only direct text content (not from child elements).
   * Falls back to full textContent for leaf nodes.
   */
  function getDirectText(el) {
    // Leaf element — no child elements
    if (el.children.length === 0) return el.textContent || "";

    // Has children — concatenate only direct text nodes
    var text = "";
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === Node.TEXT_NODE) {
        text += el.childNodes[i].textContent;
      }
    }

    // If direct text is empty, try full textContent (common for wrapper elements)
    if (!text.trim() && el.children.length === 1) {
      return el.textContent || "";
    }

    return text;
  }

  function getDepth(el, container) {
    var depth = 0;
    var node = el;
    while (node && node !== container) {
      depth++;
      node = node.parentElement;
    }
    return depth;
  }

  function isUrl(str) {
    return /^https?:\/\//.test(str) || str.startsWith("/");
  }

  function looksLikeImage(str) {
    return /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(str);
  }

  function normalizeUrl(url) {
    try {
      return new URL(url).pathname;
    } catch (e) {
      return url;
    }
  }

  function normalizeHtml(html) {
    return html.replace(/\s+/g, " ").trim();
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
      padding: "3px 6px",
      borderRadius: "3px",
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
    var top = rect.top - 20;
    if (top < 2) top = rect.bottom + 2;
    labelEl.style.top = top + "px";
    labelEl.style.left = rect.left + "px";
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
      width: "28px",
      height: "28px",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      borderRadius: "4px",
      color: "#e5e7eb",
    });
    btn.addEventListener("mouseenter", function () {
      btn.style.background = "rgba(255,255,255,0.1)";
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
      background: "#18181b",
      border: "1px solid #27272a",
      borderRadius: "6px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      display: "flex",
      alignItems: "center",
      gap: "1px",
      padding: "3px",
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
    var tbHeight = 36;
    var top = rect.top - tbHeight - 6;
    if (top < 4) top = rect.bottom + 4;
    toolbar.style.top = top + "px";
    toolbar.style.left = rect.left + "px";
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
      background: "rgba(249,115,22,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      borderRadius: "4px",
      backdropFilter: "blur(2px)",
    });

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Trocar imagem";
    Object.assign(btn.style, {
      border: "1.5px solid rgba(255,255,255,0.8)",
      borderRadius: "6px",
      background: "rgba(0,0,0,0.2)",
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
    imageOverlay.style.top = rect.top + "px";
    imageOverlay.style.left = rect.left + "px";
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
    el.style.borderRadius = "2px";
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
    el.style.borderRadius = "";
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
    el.style.borderRadius = "2px";
    el.style.cursor = isImage(el) ? "pointer" : "text";
    showLabel(el);
  }

  function onMouseLeave(e) {
    if (!enabled) return;
    var el = e.currentTarget;
    if (el === currentEditable) return;
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.borderRadius = "";
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
      el.style.borderRadius = "";
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
        blocksData = msg.blocks || [];
        schemasData = msg.schemas || {};
        // Auto-detect editable elements after DOM is ready
        if (enabled) {
          setTimeout(function () {
            autoDetect();
            detach();
            attach();
          }, 100);
        }
        break;

      case "brasa:enable":
        if (!enabled) {
          enabled = true;
          autoDetect();
          attach();
        }
        break;

      case "brasa:disable":
        if (enabled) {
          enabled = false;
          detach();
          // Clean up auto-detected attributes
          document.querySelectorAll("[data-brasa-auto]").forEach(function (el) {
            el.removeAttribute("data-brasa-block");
            el.removeAttribute("data-brasa-prop");
            el.removeAttribute("data-brasa-rich");
            el.removeAttribute("data-brasa-auto");
          });
        }
        break;

      case "brasa:live-update":
        // Live update — blocks already updated by LivePreviewWrapper via patches.
        // We just update our internal state and re-detect editable elements.
        if (msg.blocks && Array.isArray(msg.blocks)) {
          blocksData = msg.blocks;
          if (enabled) {
            setTimeout(function () {
              autoDetect();
              detach();
              attach();
            }, 100);
          }
        }
        break;

      case "brasa:sections-update":
        // Full replace fallback
        if (msg.blocks && Array.isArray(msg.blocks)) {
          blocksData = msg.blocks;

          // Update DOM values for already-detected elements
          msg.blocks.forEach(function (block) {
            var els = document.querySelectorAll('[data-brasa-block="' + block.id + '"]');
            els.forEach(function (el) {
              if (el === currentEditable) return;
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

          if (enabled) {
            setTimeout(function () {
              autoDetect();
              detach();
              attach();
            }, 200);
          }
        }
        break;
    }
  });

  // Notify parent that the editor script is ready
  sendToParent({ type: "brasa:ready" });
})();
