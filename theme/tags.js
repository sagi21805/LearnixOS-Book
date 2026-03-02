document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll("#sidebar a");

  links.forEach((link) => {
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
  });
});
