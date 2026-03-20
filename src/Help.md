# Huge thanks for being here!

Taking the time to read through this project means the world to me. I hope you learned something valuable!

I work on this project in most of my free time! 
While it's a rewarding project, it takes a lot of work to implement all this stuff. For example, the high quality syntax highlighting which is done by a custom self written [mdbook preprocessor](https://github.com/sagi21805/mdbook-rust-highlight), or the animations that are made with [manim](https://github.com/manimCommunity/manim)

If you enjoyed what you found, there are three main ways you can help:

  1. Spread the word: A kind comment or a quick share goes a long way in helping this project grow.
    
  2. Star: Giving a star on GitHub helps the popularity of this project, and it also show me you appreciated it!

  3. Donations: If you're feeling extra generous, you can support me on [github](https://github.com/sponsors/sagi21805/). Every dollar helps!

## Current Sponsors: 

<div id="sponsors"></div>

<script>
fetch("https://sponsor-webhook.sagi21805.workers.dev/sponsors")
  .then(r => r.json())
  .then(data => {
    const container = document.getElementById("sponsors");
    const tiers = Object.entries(data);
    if (tiers.length === 0) {
      container.innerHTML = "<p>No sponsors yet be the first one!</p>";
      return;
    }
    for (const [tier, sponsors] of tiers) {
      if (sponsors.length === 0) continue;
      const section = document.createElement("div");
      section.innerHTML = `<h3>${tier}</h3>` +
        sponsors.map(s =>
          `<a href="${s.url}">@${s.login}</a>`
        ).join(", ");
      container.appendChild(section);
    }
    if (container.innerHTML === "") {
      container.innerHTML = "<p>No sponsors yet be the first one!</p>";
    }
  })
  .catch(() => {
    document.getElementById("sponsors").innerHTML =
      "<p>Could not load sponsors right now.</p>";
  });
</script>
