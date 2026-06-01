# A Minimal Bootloader

_"From a small spark may burst a mighty flame." - Dante Alighieri_

---

Writing a bootloader is not an easy task, and it can include a lot of [things](http://wiki.osdev.org/Rolling_Your_Own_Bootloader#A_list_of_things_you_might_want_to_do).
In this chapter we will write the minimal needed bootloader to load our kernel, and obtain information that is necessary for it.

In this chapter we will implement the following features:

-  Setup registers and stack
-  Enable the A20 line
-  Read the kernel from disk
-  Load the Global Descriptor Table
-  Enable Paging

These features are enough, at least for the start of our kernel. Later in the book, we will implement more features like obtaining a memory map, enabling text mode, locating the kernel in the file system, and more!
