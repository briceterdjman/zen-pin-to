// Zen Pin To : palette « Pin to » façon Arc pour Zen Browser (mod Sine).
// Option+Maj+P ouvre la liste des dossiers (avec leur arborescence) et des espaces.
// Entrée range l'onglet courant dans le dossier choisi, ou le déplace vers l'espace choisi.
(() => {
  if (window.zenPinTo || !window.gBrowser || !window.gZenWorkspaces) return;

  const FOLLOW = true; // true : on suit l'onglet quand il change d'espace.
  const HTML = "http://www.w3.org/1999/xhtml";
  const FALLBACK = ["#4a90e2", "#e67e22", "#2ecc71", "#9b59b6", "#e74c3c", "#16a085"];
  const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const h = (tag, css, text) => {
    const el = document.createElementNS(HTML, tag);
    if (css) el.style.cssText = css;
    if (text != null) el.textContent = text;
    return el;
  };

  // ---------- Données ----------
  function spaceColor(space, i) {
    const c = space.theme?.gradientColors?.[0]?.c;
    if (Array.isArray(c)) return `rgb(${c.join(",")})`;
    if (typeof c === "string" && c) return c;
    return FALLBACK[i % FALLBACK.length];
  }

  function folderPath(g) {
    const names = [];
    // Les dossiers Zen sont des <zen-folder> ; leur parent s'obtient par .group.
    for (let p = g; p?.isZenFolder; p = p.group) names.unshift(p.label);
    return names;
  }

  function folderSpace(g) {
    for (let p = g; p; p = p.group) {
      const id = p.getAttribute("zen-workspace-id");
      if (id) return id;
    }
    return null;
  }

  function buildItems(tab) {
    const spaces = gZenWorkspaces.getWorkspaces();
    const info = new Map(spaces.map((s, i) => [s.uuid, { s, i, color: spaceColor(s, i) }]));
    const current = gZenWorkspaces.activeWorkspace;
    const items = [];
    for (const g of gBrowser.tabGroups) {
      if (!g.isZenFolder || g.isLiveFolder || tab.group === g) continue;
      const sp = info.get(folderSpace(g));
      if (!sp) continue;
      const path = folderPath(g);
      items.push({ kind: "folder", g, sp, label: path.join(" › "), key: norm(sp.s.name + " " + path.join(" ")) });
    }
    // Les autres espaces, affichés en permanence sous le champ (« Déplacer vers »).
    const moves = [...info.values()]
      .filter(sp => sp.s.uuid !== tab.getAttribute("zen-workspace-id"))
      .map(sp => ({ kind: "space", sp }));
    // Espace courant d'abord, puis ordre des espaces, puis alphabétique.
    const rank = it => (it.sp.s.uuid === current ? -1 : it.sp.i);
    items.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, "fr"));
    return { items, moves, here: info.get(current) };
  }

  // ---------- Action ----------
  async function apply(it, tab) {
    if (tab.hasAttribute("zen-essential")) throw new Error("Onglet Essential : retirez-le d'abord des Essentials.");
    const target = it.sp.s.uuid;
    const changesSpace = tab.getAttribute("zen-workspace-id") !== target;
    if (it.kind === "folder") {
      if (!tab.pinned) gBrowser.pinTab(tab);
      if (changesSpace) gZenWorkspaces.moveTabToWorkspace(tab, target);
      it.g.addTabs([tab]);
    } else if (it.kind === "create") {
      if (!tab.pinned) gBrowser.pinTab(tab);
      if (changesSpace) gZenWorkspaces.moveTabToWorkspace(tab, target);
      const opts = { label: it.name, workspaceId: target };
      if (it.parent) {
        for (let p = it.parent; p; p = p.group) p.collapsed = false; // comme « Nouveau sous-dossier » de Zen
        opts.insertAfter = it.parent.groupContainer.lastElementChild;
      }
      gZenFolders.createFolder([tab], opts);
    } else {
      gZenWorkspaces.moveTabToWorkspace(tab, target);
    }
    if (FOLLOW && changesSpace) {
      await gZenWorkspaces.changeWorkspaceWithID(target);
      gBrowser.selectedTab = tab;
    }
  }

  // ---------- Interface ----------
  let ui = null;

  function close() {
    ui?.root.remove();
    ui = null;
  }

  function open() {
    if (ui) return;
    const tab = gBrowser.selectedTab;
    const { items, moves, here } = buildItems(tab);
    const root = h("div", "position:fixed;inset:0;z-index:2147483647;display:flex;justify-content:center;" +
      "align-items:flex-start;padding-top:18vh;background:rgba(0,0,0,.25);color-scheme:light dark;");
    const box = h("div", "width:440px;max-width:90vw;background:Canvas;color:CanvasText;border-radius:12px;" +
      "box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;font:13px -apple-system,system-ui,sans-serif;");
    const input = h("input", "box-sizing:border-box;width:100%;padding:12px 14px;border:0;outline:none;" +
      "border-bottom:1px solid color-mix(in srgb,CanvasText 15%,transparent);background:transparent;" +
      "color:inherit;font:inherit;font-size:15px;");
    input.placeholder = "Ranger dans…   (parent/nom pour créer un sous-dossier)";
    // Barre « Déplacer vers » : un bouton par autre espace, raccourci ⌘1, ⌘2…
    const bar = h("div", "display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 12px;" +
      "border-top:1px solid color-mix(in srgb,CanvasText 15%,transparent);font-size:12px;");
    bar.append(h("span", "opacity:.6;", "Déplacer vers"));
    moves.forEach((it, i) => {
      const chip = h("span", "display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;" +
        "cursor:default;background:color-mix(in srgb,CanvasText 8%,transparent);");
      chip.append(
        h("span", `width:8px;height:8px;border-radius:50%;background:${it.sp.color};`),
        h("span", "", it.sp.s.name),
        h("span", "opacity:.45;", i < 9 ? "⌘" + (i + 1) : ""));
      chip.addEventListener("click", () => run(it));
      bar.append(chip);
    });
    if (!moves.length) bar.style.display = "none";
    const list = h("div", "max-height:360px;overflow-y:auto;padding:4px;");
    const msg = h("div", "padding:10px 14px;opacity:.7;display:none;");
    box.append(input, list, msg, bar);
    root.append(box);
    document.body.append(root);
    ui = { root };

    let shown = [];
    let sel = 0;
    const say = (t, err) => {
      msg.textContent = t;
      msg.style.display = t ? "block" : "none";
      msg.style.color = err ? "#d33" : "";
    };

    function render() {
      const raw = input.value.trim();
      const slash = raw.lastIndexOf("/");
      let matches = [];
      let creates = [];
      if (slash >= 0) {
        // « parent/nom » : nouveau sous-dossier dans un dossier existant.
        const name = raw.slice(slash + 1).trim();
        const pq = norm(raw.slice(0, slash)).split(/\s+/).filter(Boolean);
        if (name) {
          creates = items.filter(it => pq.every(w => it.key.includes(w))).slice(0, 6).map(p =>
            ({ kind: "create", name, parent: p.g, sp: p.sp, label: `+ Nouveau dossier « ${name} » dans ${p.label}` }));
        }
      } else {
        const words = norm(raw).split(/\s+/).filter(Boolean);
        matches = items.filter(it => words.every(w => it.key.includes(w)));
        const exists = items.some(it => it.sp === here && norm(it.g.label) === norm(raw));
        if (raw && here && !exists) {
          creates = [{ kind: "create", name: raw, parent: null, sp: here, label: `+ Nouveau dossier « ${raw} »` }];
        }
      }
      shown = [...matches, ...creates];
      sel = Math.min(sel, Math.max(shown.length - 1, 0));
      list.replaceChildren();
      shown.forEach((it, i) => {
        const row = h("div", "display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:default;" +
          (i === sel ? "background:color-mix(in srgb,CanvasText 12%,transparent);" : ""));
        const dot = h("span", `width:9px;height:9px;border-radius:50%;flex:none;background:${it.sp.color};` +
          (it.kind === "space" ? "outline:2px solid " + it.sp.color + ";outline-offset:2px;" : ""));
        const label = h("span", "flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;", it.label);
        const space = h("span", "opacity:.5;font-size:11px;flex:none;", it.sp.s.name);
        row.append(dot, label, space);
        row.addEventListener("mousemove", () => { if (sel !== i) { sel = i; render(); } });
        row.addEventListener("click", () => run(it));
        list.append(row);
      });
      say(shown.length ? "" : slash >= 0 ? "Aucun dossier parent ne correspond." : "Tapez un nom de dossier.");
      list.children[sel]?.scrollIntoView({ block: "nearest" });
    }

    async function run(it) {
      try {
        await apply(it, tab);
        close();
      } catch (e) {
        console.error("[Zen Pin To]", e);
        say("Erreur : " + e.message, true);
      }
    }

    input.addEventListener("input", () => { sel = 0; render(); });
    input.addEventListener("keydown", e => {
      const k = e.key;
      const n = e.metaKey && /^Digit[1-9]$/.test(e.code) ? +e.code.slice(5) : 0;
      if (n) { if (moves[n - 1]) run(moves[n - 1]); }
      else if (k === "ArrowDown") sel = Math.min(sel + 1, shown.length - 1);
      else if (k === "ArrowUp") sel = Math.max(sel - 1, 0);
      else if (k === "Enter") { if (shown[sel]) run(shown[sel]); }
      else if (k === "Escape") close();
      else return;
      e.preventDefault();
      e.stopPropagation();
      if (ui) render();
    }, true);
    input.addEventListener("blur", () => setTimeout(() => { if (ui && document.activeElement !== input) close(); }, 150));
    root.addEventListener("mousedown", e => { if (e.target === root) close(); });
    box.addEventListener("mousedown", e => { if (e.target !== input) e.preventDefault(); }); // garde le focus

    render();
    input.focus();
  }

  // ---------- Raccourci Option+Maj+P ----------
  const cmd = () => (ui ? close() : open());
  const keyset = document.createXULElement("keyset");
  const key = document.createXULElement("key");
  key.id = "zen-pin-to-key";
  key.setAttribute("key", "P");
  key.setAttribute("modifiers", "alt,shift");
  key.addEventListener("command", cmd);
  keyset.append(key);
  document.documentElement.append(keyset);

  window.zenPinTo = { open, close };
})();