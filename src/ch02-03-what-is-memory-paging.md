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

> In 32bit paging extension, there are only two tables but the principles are the same. and because of that only 64bit paging will be covered in this book. 
> 

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

        // Bits 5-6 are used only by the CPU
        //
        // Bit 5 is the accessed bit, and is set by the cpu
        // when this entry is accessed.
        // 
        // Bit 6 is the dirty bit, and is set by the cpu
        // when a write on this page occurs

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
In addition, when we use the top half of the address space, where the 47th bit is on, we must also set bits 63-48 to 1 because of the sign extension. 

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

Just before we will implement the core functionality of paging, we will need to create some utility structs of `VirtualAddress` and `PhysicalAddress`.
These will just be a wrapper struct of a usize.

To implement all the simple and basic functionality, we will use a macro, we don't have much boilerplate. We will also use the great [`derive_more`](https://crates.io/crites/derive_more) crate, which will provide us basic derives for operator like deref, mathematical operations.

These will be some simple functionality that we can't derive from derive more.
```rust,fp=shared/common/src/macros.rs
macro_rules! impl_common_address_functions {
    ($struct_name:ident) => {
        #[allow(non_snake_case)]
        mod ${concat(__impl_for_, $struct_name)} {
            use super::*;
            use core::ptr::Alignment;
            impl $struct_name {
                /// Create from just the usize without checking sign extension
                pub const unsafe fn new_unchecked(address: usize) -> Self {
                    Self(address)
                }
                /// Create new while preserving sign extension
                #[cfg(target_arch = "x86_64")]
                pub const fn new(address: usize) -> Self {
                    Self((address << 16) as isize >> 16)
                }
                pub const fn as_usize(&self) -> usize {
                    self.0
                }
                pub const unsafe fn as_mut_ptr<T>(&self) -> *mut T {
                    self.0 as *mut T
                }
                pub const fn as_ptr<T>(&self) -> *const T {
                    self.0 as *const T
                }
                /// Check if aligned to some alignment
                pub const fn is_aligned(&self, alignment: Alignment) -> bool {
                    self.0 & (alignment.as_usize() - 1) == 0
                }
                /// Align the address to the alignment while rounding up
                pub const fn align_up(mut self, alignment: Alignment) {
                    self.0 = {
                        (self.0 + (alignment.as_usize() - 1)) & !(alignment.as_usize() - 1);
                    }
                }
                /// Align the address to the alignment while rounding down
                pub const fn align_down(mut self, alignment: Alignment) {
                    self.0 &= !(alignment.as_usize() - 1);
                }
                /// Get the alignment of the address
                pub const fn alignment(&self) -> Alignment {
                    unsafe { Alignment::new_unchecked(1 << self.0.trailing_zeros()) }
                }
            }
        }
    };
}
```
Then, we can create our address structs and implement some more function with derive_more.

```rust,fp=shared/common/src/address_types.rs
use derive_more::{
    Add, AddAssign, AsMut, AsRef, Div, DivAssign, From, Mul, MulAssign, Sub, SubAssign,
};

#[derive(
    Clone,
    Debug,
    Add,
    AddAssign,
    Sub,
    SubAssign,
    Mul,
    MulAssign,
    Div,
    DivAssign,
    Default,
    AsMut,
    AsRef,
    From,
)]
pub struct PhysicalAddress(pub usize);

impl_common_address_functions!(PhysicalAddress);

#[derive(
    Clone,
    Debug,
    Add,
    AddAssign,
    Sub,
    SubAssign,
    Mul,
    MulAssign,
    Div,
    DivAssign,
    Default,
    AsMut,
    AsRef,
    From,
)]
pub struct VirtualAddress(pub usize);

impl_common_address_functions!(VirtualAddress);
```

<!-- # TODO CHANGE CODE BLOCKS -->

With these utility structs, we can now start implementing our paging logic. The first function that we need is a function that could map a physical page into an entry, this function should get the `physical address` to a memory block, and the flags that we want to put on this mapping. To avoid repetition, we will create a flags structure, which will help us define some default flags, and also to apply custom flags onto our entry. For now, a default flags for an entry, will contain the present flags, which is must for the entry to be counted mapped, and also the writable flags, which will make our memory also writable so we could store data in it.

```rust,fp=shared/cpu_utils/src/structures/paging/entry_flags.rs
#[derive(Debug, Clone)]
pub struct PageEntryFlags(u64);

impl PageEntryFlags {

    // Same macro used on PageTableEntry for flags.
    table_entry_flags!();

    pub const fn new() -> Self {
        Self(0)
    }

    pub const fn regular_page_flags() -> Self {
        PageEntryFlags::new().present().writable()
    }

    pub const fn as_u64(&self) -> u64 {
        self.0
    }
}
```

## TLB and Caching