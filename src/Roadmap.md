# Roadmap

---

#![repository_card]

This document specifies the planned topics and features that will be developed in the LearnixOS and covered by this book.

Each topic has a corresponding issue both in the book and in the OS repository. The status of each topic can be tracked using the links provided in the tables below.

> Note: This list is definitely not final, and more topics will be added as the development continues.

## Bootloader
| Feature/Topic                               | Status in OS                                     | Status in Book                                   |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Enable A20                                  | https://github.com/sagi21805/LearnixOS/issues/36 | https://github.com/sagi21805/LearnixOS-Book/issues/29 |
| Read kernel from disk                       | https://github.com/sagi21805/LearnixOS/issues/37 | https://github.com/sagi21805/LearnixOS-Book/issues/30 |
| Load and Initialize global descriptor table | https://github.com/sagi21805/LearnixOS/issues/38 | https://github.com/sagi21805/LearnixOS-Book/issues/31 |
| Enable Paging                               | https://github.com/sagi21805/LearnixOS/issues/39 | https://github.com/sagi21805/LearnixOS-Book/issues/32 |


## Memory Management
| Feature/Topic            | Status in OS                                     | Status in Book                                   |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| Obtaining Memory map     | https://github.com/sagi21805/LearnixOS/issues/40 | https://github.com/sagi21805/LearnixOS-Book/issues/33 |
| Bitmap Page Allocator    | https://github.com/sagi21805/LearnixOS/issues/41 | https://github.com/sagi21805/LearnixOS-Book/issues/34 |
| Mapping Virtual Memory   | https://github.com/sagi21805/LearnixOS/issues/42 | https://github.com/sagi21805/LearnixOS-Book/issues/35 |
| Slab Allocator           | https://github.com/sagi21805/LearnixOS/issues/43 | https://github.com/sagi21805/LearnixOS-Book/issues/36 |
| Virtual Memory Allocator | https://github.com/sagi21805/LearnixOS/issues/44 | https://github.com/sagi21805/LearnixOS-Book/issues/37 |

## Interrupt Handling

| Feature/Topic                                  | Status in OS                                     | Status in Book                                   |
| ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Load and Initialize interrupt descriptor table | https://github.com/sagi21805/LearnixOS/issues/45 | https://github.com/sagi21805/LearnixOS-Book/issues/38 |
| Interrupt handlers and the PIC                 | https://github.com/sagi21805/LearnixOS/issues/46 | https://github.com/sagi21805/LearnixOS-Book/issues/39 |
| Timer interrupt                                | https://github.com/sagi21805/LearnixOS/issues/47 | https://github.com/sagi21805/LearnixOS-Book/issues/40 |

## I/O & Drivers

| Feature/Topic                       | Status in OS                                     | Status in Book                                   |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| VGA driver                          | https://github.com/sagi21805/LearnixOS/issues/48 | https://github.com/sagi21805/LearnixOS-Book/issues/41 |
| Keyboard driver                     | https://github.com/sagi21805/LearnixOS/issues/49 | https://github.com/sagi21805/LearnixOS-Book/issues/42 |
| Memory mapped IO and Port mapped IO | X | https://github.com/sagi21805/LearnixOS-Book/issues/43 |
| Scanning PCI bus                    | https://github.com/sagi21805/LearnixOS/issues/50 | https://github.com/sagi21805/LearnixOS-Book/issues/44 |
| AHCI driver                         | https://github.com/sagi21805/LearnixOS/issues/51 | https://github.com/sagi21805/LearnixOS-Book/issues/45 |

## File System

| Feature/Topic | Status in OS                                     | Status in Book                                   |
| ------------- | ------------------------------------------------ | ------------------------------------------------ |
| FAT32         | https://github.com/sagi21805/LearnixOS/issues/52 | https://github.com/sagi21805/LearnixOS-Book/issues/46 |

## Process Management

| Feature/Topic  | Status in OS                                     | Status in Book                                   |
| -------------- | ------------------------------------------------ | ------------------------------------------------ |
| Spinlock mutex | https://github.com/sagi21805/LearnixOS/issues/53 | https://github.com/sagi21805/LearnixOS-Book/issues/47 |

## Utilities
| Feature/Topic              | Status in OS | Status in Book |
| -------------------------- | ------------ | -------------- |
| Debugging Tips             | X            | https://github.com/sagi21805/LearnixOS-Book/issues/48 |
| Build and Run the project  | X            | https://github.com/sagi21805/LearnixOS-Book/issues/49 |
| Common Error with Hardware | X            | https://github.com/sagi21805/LearnixOS-Book/issues/50 |
| Tests                      | https://github.com/sagi21805/LearnixOS/issues/54 | https://github.com/sagi21805/LearnixOS-Book/issues/51 |
