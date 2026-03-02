# The Learnix Operating System

_"If you can't explain it simply, you don't understand it well enough." - Albert Einstein_

---

Imagine you need to write some code to read from a file, you write a single, elegant line of Python
<code class="language-hlrs" style="filter: brightness(0.9); padding: 2px 3px; border-radius: 3px; display: inline-block;">
    <span class="hlrs-keyword">with</span> <span class="hlrs-function">open</span>(<span class="hlrs-litstr">"my_file.txt"</span>) <span class="hlrs-keyword">as</span> <span class="hlrs-variable">f</span>
</code>
and the file opens and the content appears as if by magic. 

To the vast majority of the of developers (more then 60%!) who rely on high-level languages like Python and JavaScript[^1] , writing code looks like this. We are all surrounded by abstractions, and forgot to learn the underlying implementation.
We trust our operating system to handle the context switching, the virtual memory mapping, and the I/O operations, often treating the kernel as an infallible, black-box rather than a piece of software we can actually understand.

I followed the common path, starting with Python before moving to C to get a better understanding of how memory and hardware work.
I expected C to reveal the inner workings of the system, but I quickly found that calling
<code class="language-hlrs" style="filter: brightness(0.9); padding: 2px 3px; border-radius: 3px; display: inline-block;">
    <span class="hlrs-function">open</span>(<span class="hlrs-litstr">"my_file.txt"</span>, <span class="hlrs-litstr">"r"</span>)
</code>
in C is functionally very similar to calling it in Python, both are simply wrappers for an existing system call.
Instead of interacting with the hardware, I was still just asking an existing kernel to do the work for me.
When I did try to move past these abstractions to write more "bare metal" code, I met the standard frustrations of low level development, which includes segmentation faults, data corruption, and thread safety violations that are really annoying and difficult to debug.

But what if we didn't have to choose between the safety of a high level language and the power that a lower level language gives us? 
Where the compiler doesn't just catch our syntax errors, but guarantees that code that should not work, will not even compile.
This includes data race or null pointer dereferences before we even hit "run".
This is the shift offered by Rust, and this is why it is the language of choice in our operating system.

Today, the "inner workings" of the operating system have become a blind spot. This lack of low level knowledge leads directly to critical security vulnerabilities. 
Furthermore, many developers are trapped using languages like C and C++ that, while powerful, are fundamentally flawed in their design, requiring humans to manually manage memory with a level of perfection that is statistically impossible to achieve.

This problem has reached a breaking point in the "AI copy paste" or "Vibe coding" culture. 
Developers increasingly rely on Large Language Models to generate code that they do not fully read or understand. 
Even in high level languages, this results in "bloatware"[^2], poor performance, and legacy systems that are impossible to debug because no one on the team knows how the underlying resources are actually being managed.

My proposed solutionis is to return to the core of computing and untangle the black box.
By building an operating system from scratch in Rust, we will learn to bridge the gap between high level logic and bare metal reality.
The solution isn't just to "learn a new language", but to adopt a new philosophy. 
Through this book, we will gain two primary benefits:

  1. <u>Operating system understanding</u>: We will move past the wrappers and system calls to implement our own memory allocators, paging structures, file systemsm, and more kernel logic.

  2. <u>Modern Safety Standards</u>: We will learn how Rust's ownership model and rich type system can eliminate entire classes of bugs that are common in C / C++ codebases.

We no longer have the luxury of ignoring the "small stuff". As the industry moves toward more complex distributed systems and edge computing, the "black box" that was once small, had grew so large that we can't ignore it.
Even large organizations such as the U.S. Cybersecurity and Infrastructure Security Agency (CISA)[^3] and the White House[^4] issued a formal report specifically urging developers to transition to "memory-safe languages" like Rust to eliminate security vulnerabilities that stem from memory unsafety.

As a last note, I hope you will invest your precious time in reading this book, because I assure you it would make you a better, well rounded developer.

# How to read this book & Target audience

Along this book we are going to learn a lot of OS specific concepts and Rust concepts.
As hard as this sound I encourge you to still try and learn even if you are unfamiller to low level programming at all! 
Along this book I will try to give easy to understand explanmations that will include animations and drawings.

For topics that might be outside the context of this book, links will be provided to make the transition easier, and as programers, I do expect you to know how to google your problems :)

[^1]: [stackoverflow 2025 annual survey](https://survey.stackoverflow.co/2025/technology#most-popular-technologies-language-language)
[^2]: Software that includes many parts that are not needed and unwanted.
[^3]: [CISA Report](https://www.cisa.gov/resources-tools/resources/product-security-bad-practices)
[^4]: [White House Report](https://bidenwhitehouse.archives.gov/wp-content/uploads/2024/02/Final-ONCD-Technical-Report.pdf)
