# Synchronization

_"Shared mutable state is the root of all evil."_

 ---

 #![repository_card]

Synchronization is an important concept in operating systems. This is because, one of the main goals of an operating system is to let multiple programs run concurrently on a single CPU core.

In this chapter, we are going to explore the CPU features that enable synchronization, even if the tasks run on different CPU cores.

From atomic opeartions, to memory ordering while looking at the lock prefix on x86 or the ldrex in ARM. 

In this chapter, we are not going to cover the following topics, mainly because these features requires a more mature state of our OS. If this project will go well, they will be covered in the future.

Some of these topics include:

- Condvars
- Threads
- Other OS primitives (i.e. futex, pthreads, etc)
- Implementation of Arc

If you are familier with other guides about this topics, like the famous [book](https://mara.nl/atomics/) about atomics. The following chapters in the book are going to cover most of these topics, but explain the concepts from a different angle (or so I think).
