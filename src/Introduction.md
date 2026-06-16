# The Learnix Operating System

_"If you can't explain it simply, you don't understand it well enough." - Albert Einstein_

---

Imagine you need to write some code to read from a file. You write a single, elegant line of Python
<code class="language-hlrs" style="filter: brightness(0.9); padding: 2px 3px; border-radius: 3px; display: inline-block;">
    <span class="hlrs-keyword">with</span> <span class="hlrs-function">open</span>(<span class="hlrs-litstr">"my_file.txt"</span>) <span class="hlrs-keyword">as</span> <span class="hlrs-variable">f</span>:
</code>
, the file opens and the content appears as if by magic. 

To the vast majority of the developers (more than 60%!) who rely on high level languages like Python and JavaScript[^1], writing code looks like this. We are all surrounded by abstractions, and have forgotten to learn the underlying implementation.
We trust our operating system to handle the context switching, the virtual memory mapping, and the I/O operations, often treating the kernel as an infallible, black box rather than a piece of software we can actually understand.

I followed the common path, starting with Python before moving to C to get a better understanding of how memory and hardware work.
I expected C to reveal the inner workings of the system, but I quickly found that calling
<code class="language-hlrs" style="filter: brightness(0.9); padding: 2px 3px; border-radius: 3px; display: inline-block;">
    <span class="hlrs-function">open</span>(<span class="hlrs-litstr">"my_file.txt"</span>, <span class="hlrs-litstr">"r"</span>);
</code>
in C is functionally very similar to calling it in Python, both are simply wrappers for an existing system call.
Instead of interacting with the hardware, I was still just asking an existing kernel to do the work for me.
When I did try to move past these abstractions to write more "bare metal" code, I met the standard frustrations of low level development, which include segmentation faults, data corruptions, and thread safety violations that are notoriously difficult to debug.

But what if we didn't have to choose between the safety of a high level language and the power that a lower level language gives us? 
Where the compiler doesn't just catch our syntax errors, but guarantees that code that should not work, will not even compile.
This includes data races or null pointer dereferences before we even hit "run".
This is the shift offered by Rust, and this is why it is the language of choice in our operating system.

Today, the "inner workings" of the operating system have become a blind spot. This lack of low level knowledge leads directly to critical security vulnerabilities. 
Furthermore, many developers are trapped using languages like C and C++ that, while powerful, are fundamentally flawed in their design, requiring humans to manually manage memory with a level of perfection that is statistically impossible to achieve.

This problem has reached a breaking point in the "AI copy paste" or "Vibe coding" culture. 
Developers increasingly rely on Large Language Models to generate code that they do not fully read or understand. 
Even in high level languages, this results in "bloatware"[^2], poor performance, and legacy systems that are impossible to debug because no one on the team knows how the underlying resources are actually being managed.

My proposed solution is to return to the core of computing and untangle the black box.
By building an operating system from scratch in Rust, we will learn to bridge the gap between high level logic and bare metal reality.
The solution isn't just to "learn a new language", but to adopt a new philosophy. 
Through this book, we will gain two primary benefits:

  1. <u>Operating system understanding</u>: We will move past the wrappers and system calls to implement our own memory allocators, paging structures, file systems, and more kernel logic.

  2. <u>Modern Safety Standards</u>: We will learn how Rust's ownership model and rich type system can eliminate entire classes of bugs that are common in C / C++ codebases.

We no longer have the luxury of ignoring the "small stuff". As the industry moves toward more complex distributed systems and edge computing, the "black box" that was once small has grown so large that we can't ignore it.
Organizations such as the U.S. Cybersecurity and Infrastructure Security Agency (CISA)[^3] and the White House[^4] issued a formal report specifically urging developers to transition to "memory safe languages" like Rust to eliminate security vulnerabilities that stem from memory unsafety.

# How to read this book & Target audience

Throughout this book, we will explore a wide range of Operating System specific concepts and Rust patterns. Even if this sounds hard, I encourage you to dive in, even if you have no prior experience with low level programming! To help you navigate these complex topics, I will provide clear, approachable explanations with highly visual elements such as animations, diagrams and colorful code blocks.

For topics that fall outside the immediate scope of this project, I will provide links to the learning materials to bridge the gap. That said, as developers, I also expect you to leverage your googling ability when you encounter a challenge :)

There are two types of chapters: 
  1. Chapters that will contain OS topics will be tagged with the <span class="tag-os">OS</span> tag.
  2. Chapters that will contain Rust topics will be tagged with the <span class="tag-rust">RUST</span> tag.

As a last note, I hope you will invest your precious time in reading this book, because I assure you it would make you a better, well rounded developer.

[^1]: [stackoverflow 2025 annual survey](https://survey.stackoverflow.co/2025/technology#most-popular-technologies-language-language)
[^2]: Software that includes many parts that are not needed and unwanted.
[^3]: [CISA Report](https://www.cisa.gov/resources-tools/resources/product-security-bad-practices)
[^4]: [White House Report](https://bidenwhitehouse.archives.gov/wp-content/uploads/2024/02/Final-ONCD-Technical-Report.pdf)

<div class="github-repo-box" data-repo="sagi21805/LearnixOS">
  <div class="repo-header">
    <div class="repo-title-group">
      <svg aria-hidden="true" height="18" viewBox="0 0 16 16" version="1.1" width="18" class="icon" fill="currentColor">
        <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
      </svg>
      <a class="repo-title-link" href="#" target="_blank" rel="noopener noreferrer">
        <span class="repo-title-text">Loading repository...</span>
      </a>
    </div>
    <div class="repo-actions">
      <a class="github-btn btn-sponsor" href="#" target="_blank" rel="noopener noreferrer">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="#bf3989" d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002Z"></path></svg>
        Sponsor
      </a>
      <a class="github-btn btn-star" href="#" target="_blank" rel="noopener noreferrer">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="#e3b341" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>
        Star
      </a>
    </div>
  </div>
  <div class="repo-body">
    <p class="repo-description">Connecting to GitHub API...</p>
  </div>
  <div class="repo-footer">
    <span class="stat-item repo-language" style="display: none;">
      <span class="language-color"></span>
      <span class="repo-language-text">Language</span>
    </span>
    <a class="stat-item link-stars" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>
      <span class="repo-stars-count">0</span>
    </a>
    <a class="stat-item link-forks" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path></svg>
      <span class="repo-forks-count">0</span>
    </a>
    <a class="stat-item link-commits" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5h-3.32Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path></svg>
      <span class="repo-commits-count">0</span>
    </a>
    <a class="stat-item link-issues" href="#" target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="icon"><path fill="currentColor" d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>
      <span class="repo-issues-count">0</span>
    </a>
  </div>
</div>
