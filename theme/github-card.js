document.querySelectorAll(".github-repo-box").forEach((box) => {
  const repoPath = box.getAttribute("data-repo");
  if (!repoPath) return;

  // Fetch 1: Standard Repo Data
  fetch(`https://api.github.com/repos/${repoPath}`)
    .then((res) => res.json())
    .then((data) => {
      box.querySelector(".repo-title-text").textContent = data.full_name;
      box.querySelector(".repo-description").textContent =
        data.description || "No description provided.";
      box.querySelector(".repo-stars-count").textContent =
        data.stargazers_count.toLocaleString();
      box.querySelector(".repo-forks-count").textContent =
        data.forks_count.toLocaleString();
      box.querySelector(".repo-issues-count").textContent =
        data.open_issues_count.toLocaleString();

      if (data.language) {
        box.querySelector(".repo-language-text").textContent = data.language;
        box.querySelector(".repo-language").style.display = "flex";

        const langColors = {
          Rust: "#dea584",
          "C++": "#f34b7d",
          C: "#555555",
          JavaScript: "#f1e05a",
          Python: "#3572A5",
        };
        if (langColors[data.language]) {
          box.querySelector(".language-color").style.backgroundColor =
            langColors[data.language];
        }
      }

      const owner = repoPath.split("/")[0];
      box.querySelector(".repo-title-link").href = data.html_url;
      box.querySelector(".btn-star").href = data.html_url;
      box.querySelector(".btn-sponsor").href =
        `https://github.com/sponsors/${owner}`;
      box.querySelector(".link-stars").href = `${data.html_url}/stargazers`;
      box.querySelector(".link-forks").href =
        `${data.html_url}/network/members`;
      box.querySelector(".link-commits").href = `${data.html_url}/commits/main`;
      box.querySelector(".link-issues").href = `${data.html_url}/issues`;
    })
    .catch((err) => {
      box.querySelector(".repo-description").textContent =
        "Failed to load repository data.";
      console.error(err);
    });

  // Fetch 2: The Commits Trick
  fetch(`https://api.github.com/repos/${repoPath}/commits?per_page=1`)
    .then((res) => {
      // If repo is completely empty, it might throw a 409
      if (!res.ok) throw new Error("Commits fetch failed");

      const link = res.headers.get("link");
      if (link) {
        // Extract the last page number from the header
        const match = link.match(/page=(\d+)>; rel="last"/);
        if (match) {
          box.querySelector(".repo-commits-count").textContent = parseInt(
            match[1],
          ).toLocaleString();
        }
      } else {
        // If there is no pagination header, there's exactly 1 commit (or 0)
        res.json().then((commits) => {
          box.querySelector(".repo-commits-count").textContent =
            commits.length.toString();
        });
      }
    })
    .catch((err) => {
      box.querySelector(".repo-commits-count").textContent = "0";
    });
});
