# Printing To Screen

_"The most effective debugging tool is still careful thought, coupled with judiciously placed print statements." — Brian Kernighan_

---

Printing is an important aspect of an operating system, especially in early development because it is our way to gain a visual output from our operating system. This will massively improve the interaction with our OS, and not only it will let us huge advantage in debugging, but it will also grant us the ability to display a shell, which we will do in the upcoming chapters.

## Why didn't we print until now?

If you remember the [example code](./ch01-02-booting-our-binary.md#hello-world) in the first bootable code we wrote, we did print to screen during that code.
This print utilized the `Video (int 10h)` interrupt on BIOS with the `Print Char (0xE)` function to print character by character the string 'Hello, World!' 

This was our only way to print we we were on `real mode`. And while I developed the code, I actually did use it to print single characters as errors code, So I could understand what was my program doing.

On `protected mode`, we couldn't use the BIOS anymore, So printing was much harder, and also we only turned on paging, so debugging with [QEMU monitor](https://qemu-project.gitlab.io/qemu/system/monitor.html) was much easier.

While we could have written a simple printer for each stage, it was not necessary, and it would have bloated our binary, which in the first stage had only 512 bytes, and had almost no use in the second stage. But now, on the kernel init stage, it would be really handy!.

## How to print without BIOS?

We are gonna print using the Video Graphics Array or VGA for short. This protocol as the name suggests, puts an array in memory which will represent our display. When we want to print, we simply write the content to the array, and it will automatically refresh on certain interval to display to newly provided content.

## The VGA Protocol

VGA has several 

To Be Continued...

Latest Development is at [LearnixOS](https://github.com/learnix-os/LearnixOS/)
