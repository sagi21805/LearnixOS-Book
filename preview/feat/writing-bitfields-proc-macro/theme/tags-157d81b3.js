function applyTags() {
  const selectors = [
    "#sidebar a",
    ".sidebar a",
    "nav.sidebar a",
    "#menu-bar a",
  ];

  let links = [];
  for (const sel of selectors) {
    links = Array.from(document.querySelectorAll(sel));
    if (links.length > 0) break;
  }

  if (links.length === 0) return false; // sidebar not ready yet

  links.forEach((link) => {
    if (link.dataset.tagsApplied) return;

    if (link.innerHTML.includes("[OS]")) {
      link.innerHTML = link.innerHTML.replace(
        "[OS]",
        '<span class="tag-os">OS</span>',
      );
    }
    if (link.innerHTML.includes("[RUST]")) {
      link.innerHTML = link.innerHTML.replace(
        "[RUST]",
        '<span class="tag-rust">RUST</span>',
      );
    }

    link.dataset.tagsApplied = "true";
  });

  return true; // sidebar found and processed
}

(function () {
  const interval = setInterval(() => {
    const found = applyTags();
    if (found) clearInterval(interval);
  }, 50);

  // Safety cutoff after 10 seconds to avoid polling forever
  setTimeout(() => clearInterval(interval), 10000);
})();
