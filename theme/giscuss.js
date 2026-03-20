function mapMdbookThemeToGiscus(theme) {
  switch (theme) {
    case "latte":
    case "light":
    case "rust":
      return "light"; // white background
    case "ayu":
    case "coal":
    case "navy":
      return "dark";
    case "frappe":
      return "catppuccin_frappe";
    case "macchiato":
      return "catppuccin_macchiato";
    case "mocha":
      return "catppuccin_mocha";
    default:
      return "catppuccin_mocha"; // fallback
  }
}

function getCurrentTheme() {
  return localStorage.getItem("mdbook-theme");
}

function createGiscusContainer() {
  let container = document.getElementById("giscus_container");
  if (container) container.remove();

  container = document.createElement("footer");
  container.id = "giscus_container";
  container.style.marginTop = "3em";
  container.style.borderTop = "1px solid var(--fg-muted, #ccc)";
  container.style.paddingTop = "2em";

  const topText = document.createElement("div");
  topText.className = "giscus-footer-top";
  topText.innerHTML = `
        <p style="margin-bottom: 1em; font-weight: 500;">
            💬 Have questions or feedback? Leave a comment below!
        </p>
        <p style="margin-bottom: 1em; font-weight: 500;">
            ⭐ If you like this book, please consider giving a star on <a href="https://github.com/sagi21805/LearnixOS" target="_blank">github</a>
        </p>
        <p style="margin-bottom: 1em; font-weight: 500;">
            ❤️ If you enjoyed my work and want to support this project, please consider supporting on <a href="https://github.com/sponsors/sagi21805/" target = "_blank">github</a>.
        </p>
            `;
  container.appendChild(topText);

  document.querySelector("main").appendChild(container);

  setTimeout(() => {
    const bottomText = document.createElement("div");
    bottomText.className = "giscus-footer-bottom";
    bottomText.innerHTML = `
            <p style="margin-top: 2em; font-style: italic; opacity: 0.85; text-align: center;">
                Copyright © 2025 • This comments are powered by
                <a href="https://giscus.app/" target="_blank" rel="noopener noreferrer">Giscus💎</a>
            </p>
        `;
    container.appendChild(bottomText);
  }, 1500); // Delay so it appears after iframe loads

  return container;
}

function loadGiscus() {
  const container = createGiscusContainer();

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", "sagi21805/LearnixOS-Book");
  script.setAttribute("data-repo-id", "R_kgDOPD-4VA");
  script.setAttribute("data-category", "General");
  script.setAttribute("data-category-id", "DIC_kwDOPD-4VM4Cs_dl");
  script.setAttribute("data-mapping", "pathname");
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "1");
  script.setAttribute("data-input-position", "bottom");
  script.setAttribute("data-theme", mapMdbookThemeToGiscus(getCurrentTheme()));
  script.setAttribute("data-lang", "en");
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;

  container.appendChild(script);
}

loadGiscus();
const observer = new MutationObserver(() => {
  const newTheme = getCurrentTheme();
  if (newTheme !== currentTheme) {
    currentTheme = newTheme;
    loadGiscus(currentTheme);
  }
});

let currentTheme = getCurrentTheme();
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
