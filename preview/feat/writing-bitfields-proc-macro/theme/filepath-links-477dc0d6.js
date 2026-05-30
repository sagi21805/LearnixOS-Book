document.addEventListener("DOMContentLoaded", () => {
  for (const span of document.querySelectorAll(".wl-filepath")) {
    const text = span.textContent?.trim();
    if (!text) continue;

    // Handle <repo>
    if (text.startsWith("<repo>")) {
      const relativePath = text.slice("<repo>".length);
      const href = `https://github.com/sagi21805/LearnixOS/blob/master/${relativePath}`;

      const a = document.createElement("a");
      a.href = href;
      a.textContent = `LearnixOS/${relativePath}`;
      a.target = "_blank";
      a.rel = "noopener";

      span.replaceWith(a);
    }

    // Handle <rust-doc>
    else if (text.startsWith("<rust-doc>")) {
      const rustPath = text.slice("<rust-doc>".length);
      const href = `https://doc.rust-lang.org/${rustPath}`;

      const a = document.createElement("a");
      a.href = href;
      a.textContent = rustPath;
      a.target = "_blank";
      a.rel = "noopener";

      span.replaceWith(a);
    }

    // Handle <rust-crate>
    else if (text.startsWith("<rust-crate>")) {
      const rustPath = text.slice("<rust-crate>".length);
      const href = `https://docs.rs/${rustPath}`;

      const a = document.createElement("a");
      a.href = href;
      a.textContent = rustPath;
      a.target = "_blank";
      a.rel = "noopener";

      span.replaceWith(a);
    }
  }
});
