# What is Memory Paging?

_"The purpose of abstraction is not to be vague, but to create a new semantic level in which one can be absolutely precise." — Edsger W. Dijkstra_

---

In the previous section, we talked about the global descriptor table, and how segments are used to divide memory into logical parts so it is easier to manage.
Although this system worked in older 32bit operating systems, it will not be good for our operating system, but way is that?

## The Problem in Memory Segmentation

Before we define paging, let's understand what we want for our operating system memory management. 
For starters, I can think about the following things: 

- Basic permissions, i.e Read, Write and Execute
- Kernel mode and User mode.
- Every process has it's own address space.

At first glance, we may see that all of this can be achieved via segmentation, because we can create multiple segments for process code, data etc which creates the process separation, and each segment have the read, write and execute permissions, while also providing the cpu rings for kernel and user mode.
So why would we want another system for managing memory?

Let's draw a scenario, we will have three processes, A and B, and we will look at our memory, for convenience, we will manage memory at multiplications of 0x100.

<figure style="margin: 0; text-align: center">
  <img src="assets/fragmentation_example.svg"></img> 
  <figcaption><strong>Figure 2-2: </strong>simple memory layout with segmentation</figcaption>
</figure>

As we can see, every program has it's own memory, additionally, we can define segments likes coda_a, data_a, stack_a etc, so we have organization and permission control.
But this picture demonstrates a major problem that there is with segmentation, can you spot it? if not that's fine. 

Let's now assume that process B wants more memory, it asks the operating system for another 0x100 bytes. Because the bytes that are `contiguous` to this process are free, this can be done without any problem and it can just be extended. But, process A is in a problem, and it now needs another buffer of 0x400 bytes, although we do have this amount of free memory, we can't give it to him because it is not contiguous to it. This problem is called [`fragmentation`](https://en.wikipedia.org/wiki/Fragmentation_(computing)).

> So now you might ask, how can we solve this problem? 
>
> I suggest you to think how would you solve this fragmentation problem!
>
> As always, the explanation of the solution that is used today will be bellow 

## Introduction to Paging

Just before explaining how paging works, let's define some core terms.

  - **Physical Memory** - This is the actual memory that is used, and it has `absolute` addresses, and it is the address space that our hardware talks.  

  - **Virtual Memory**  - This is the address space of our processes, because we want to make an illusion that each process has it's own address space, addresses are absolute only `inside the process`, For example, process A address 0x100 represents other region of memory then process B address 0x100.
  Both of these addresses `will` translate into a different `physical address` so we can read and write data to it.

> The concept of virtual memory is not new to us. For example, when we discussed before about creating different segments for each process,
> we created a virtual memory space for each process in terms of accessing data or executing code.
> These addresses would then `translate` to a physical address as we defined in the global descriptor table

So what do we do in memory paging?

In memory paging we divide our physical memory into `pages`, and each page is exactly 4096 bytes. Then we create a `mapping` between the virtual address space, and the physical one. Each process holds a different mapping, hence a different virtual address space. 

In the figure bellow we can see this mapping, for simplification, I changed the block size to 0x100 instead of 0x1000 (4096 bytes) but the principles are still the same.

<figure style="margin: 0; text-align: center">
  <img src="assets/paging_example.svg"></img>
  <figcaption><strong>Figure 2-3: </strong>simple process memory layout using paging</figcaption>
</figure>

In this example we can see that even if process B wants more memory, it is not blocked by process A, and can just ask our operating system for more memory
and it will map it just after process A thus solving the fragmentation problem. You may also notice that I marked some memory as "Used For Paging" this is because the mapping itself takes some memory and it is not a small portion.

## How Addresses Are Translated

When we used segments we knew how to translate virtual address into a physical one. We would go to the appropriate entry in the global descriptor table, and we would take the base address of it, and add it to our virtual address, which would give us the physical address.
In paging the address translation process is a bit more complicated, and it is done with four hierarchical tables.
The official names for those tables are `Page-Map Level 4 (PML4)`, `Page Directory Pointer Table (PDT)`, `Page Directory Table (PDT)` and `Page Table (PT)`.
In this book I will not use these names because they are complicated, and I am just going to number each level, PML4 being the 4th level, and PT being the 1st level.

###  Page Table Entry

Just before we will translate and address, we need to understand the structure of the page table, and especially the Page Table Entry.
The page table, just like the global descriptor table, is an array of 512 page table entries.
Each entry contains a `physical address` aligned to 0x1000, that is pointing to a memory regions, and also flags that are representing configuration and permissions for this memory page.

The flags look like this
```rust,fp=shared/cpu_utils/src/structures/paging/entry_flags.rs
macro_rules! table_entry_flags {
    () => {
        // Is this entry present?
        common::flag!(present, 0);

        // Is this page writable?
        common::flag!(writable, 1);

        // Can this page be accessed from user mode
        common::flag!(usr_access, 2);

        // Writes go directly to memory
        common::flag!(write_through_cache, 3);

        // Disable cache for this page
        common::flag!(disable_cache, 4);

        // Marks big pages blocks
        common::flag!(huge_page, 7);

        // Page isn’t flushed from caches on address space switch 
        // (PGE bit of CR4 register must be set)
        common::flag!(global, 8);

        // Bit 9-11 and also 52-62 
        // are available and can be used by the OS to any purpose.

        // This page is holding data and is not executable
        common::flag!(not_executable, 63);
    };
}
```

and the page table entry will just be a u64, and the page table, an array of page entries of size 512
```rust,fp=shared/cpu_utils/src/structures/paging/page_table.rs
#[repr(align(4096))]
pub struct PageTable {
    pub entries: [PageTableEntry; PAGE_DIRECTORY_ENTRIES],
}

impl PageTable {
    #[inline]
    pub const fn empty() -> Self {
        Self {
            entries: [const { PageTableEntry::empty() }; PAGE_DIRECTORY_ENTRIES]
        }
    }

}
```
```rust,fp=shared/cpu_utils/src/structures/paging/page_table_entry.rs
pub struct PageTableEntry(u64);

impl PageTableEntry {
    #[inline]
    pub(crate) const fn empty() -> Self {
        Self(0)
    }

    table_entry_flags!();
}
```
Because of how addresses are translated, addresses are actually capped by 48bits, which is 256Tib of addressable memory, and if this is somehow not enough,
new processors support a 5th table hierarchy, which support 57bit address space, or 128Pib of addressable memory. 
The address the entry points to, is between bits 12 and 48. Because the pointed address is always aligned to 0x1000, only the upper 36 bits of the pointed address are saved. 

Then, to translate an address, a special hardware on the CPU, which is called the MMU (Memory Management Unit) translates the addresses with the following logic:

> **1.** If the translation value is cached, obtain it from cache and return it.
> 
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓
> 
> **2.** Look on the CR3 register, for the physical address of the 4th page table.
> 
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓
> 
> **3.** Look at the first nine bits on the address, and use them as an index for the 4th table to obtain the location of the 3rd table.
> 
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓
> 
> **4.** Look at the next nine bits on the address, and use them as an index for the 3rd table to obtain the location of the 2nd table.
> 
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓
> 
> **5.** Look at the next nine bits on the address, and use them as an index for the 2rd table to obtain the location of the 1nd table.
> 
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓
> 
> **6.** Look at the next nine bits on the address, and use them as an index for the 1rd table to obtain the location of the page.
> 
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓
> 
> **7.** Look at the remaining twelve bits, and use them as an offset inside the page.
> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓

As a diagram, this process should look like this:
<figure style="margin: 0; text-align: center">
  <img src="assets/address_translation.svg"></img>
  <figcaption><strong>Figure 2-4: </strong>Address translation</figcaption>
</figure>


## Implementing Paging 

## TLB and Caching