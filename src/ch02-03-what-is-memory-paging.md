# What is Memory Paging?

_"The purpose of abstraction is not to be vague, but to create a new semantic level in which one can be absolutely precise." - Edsger W. Dijkstra_

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

  - **Virtual Memory** - This is the address space of our processes, because we want to make an illusion that each process has it's own address space, addresses are absolute only `inside the process`, For example, process A address 0x100 represents other region of memory then process B address 0x100.
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

###  Page Table & Page Table Entry

Just before we will translate and address, we need to understand the structure of the page table, and especially the Page Table Entry.
The page table, just like the global descriptor table, is an array of 512 page table entries.
Each entry contains a `physical address` aligned to 0x1000, that is pointing to a memory regions, and also flags that are representing configuration and permissions for this memory page.

The flags look like this
```rust,fp=shared/cpu_utils/src/structures/paging/entry_flags.rs
macro_rules! table_entry_flags {
    () => {
        // Is this entry present?
        flag!(present, 0);

        // Is this page writable?
        flag!(writable, 1);

        // Can this page be accessed from user mode
        flag!(usr_access, 2);

        // Writes go directly to memory
        flag!(write_through_cache, 3);

        // Disable cache for this page
        flag!(disable_cache, 4);

        // Bits 5-6 are used only by the CPU
        //
        // Bit 5 is the accessed bit, and is set by the cpu
        // when this entry is accessed.
        //
        // Bit 6 is the dirty bit, and is set by the cpu
        // when a write on this page occurs

        // Marks big pages blocks
        flag!(huge_page, 7);

        // Page isn't flushed from caches on address space switch
        // (PGE bit of CR4 register must be set)
        flag!(global, 8);

        // Bit 9-11 and also 52-62
        // are available and can be used by the OS to any purpose.
        // This page is holding data and is not executable
        flag!(not_executable, 63);
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
>
>
> **2.** Look on the CR3 register, for the physical address of the 4th page table.
>
>
>
> **3.** Look at the first nine bits on the address, and use them as an index for the 4th table to obtain the location of the 3rd table.
>
>
>
> **4.** Look at the next nine bits on the address, and use them as an index for the 3rd table to obtain the location of the 2nd table.
>
>
>
> **5.** Look at the next nine bits on the address, and use them as an index for the 2rd table to obtain the location of the 1nd table.
>
>
>
> **6.** Look at the next nine bits on the address, and use them as an index for the 1rd table to obtain the location of the page.
>
>
>
> **7.** Look at the remaining twelve bits, and use them as an offset inside the page.
>

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
        pub const unsafe fn new_unchecked(address: usize) -> Self {
            Self(address)
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
        pub const fn is_aligned(&self, alignment: Alignment) -> bool {
            self.0 & (alignment.as_usize() - 1) == 0
        }
        pub const fn align_up(mut self, alignment: Alignment) -> Self {
            self.0 = (self.0 + (alignment.as_usize() - 1)) & !(alignment.as_usize() - 1);
            self
        }
        pub const fn align_down(mut self, alignment: Alignment) -> Self {
            self.0 &= !(alignment.as_usize() - 1);
            self
        }
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

After creating the utilities of physical addresses and virtual addresses, and also defining some default flags, we can create a function to map an address to an entry, this function should obtain the physical address that should be mapped, and also set the flags for the entry.
```rust,fp=shared/cpu_utils/src/structures/paging/page_table_entry.rs

impl PageTableEntry {
    /// Set all of the flags to zero.
    pub const fn reset_flags(&mut self) {
        self.0 &= ENTRY_ADDRESS_MASK;
    }

    /// Set the flags without a reset to previous flags.
    pub const unsafe fn set_flags_unchecked(&mut self, flags: PageEntryFlags) {
        self.0 |= flags.as_u64()
    }

    /// Set the flags of the entry
    pub const fn set_flags(&mut self, flags: PageEntryFlags) {
        self.reset_flags();
        unsafe { self.set_flags_unchecked(flags) };
    }

    /// Map the frame address into the entry and also set the flags.
    pub const unsafe fn map_unchecked(&mut self, frame: PhysicalAddress, flags: PageEntryFlags) {
        *self = Self::empty();
        unsafe { self.set_flags_unchecked(flags) };
        self.set_present();
        // Set the new address
        self.0 |= frame.as_usize() as u64 & ENTRY_ADDRESS_MASK;
    }

    /// Same as map unchecked, but checking that the entry is not used
    /// and also that the address is aligned
    ///
    /// This is still not a safe function,
    /// See walkthrough documentation for more details
    pub const unsafe fn map(&mut self, frame: PhysicalAddress, flags: PageEntryFlags) {
        if !self.is_present() && frame.is_aligned(REGULAR_PAGE_ALIGNMENT) {
            unsafe { self.map_unchecked(frame, flags) };
        }
    }
}
```

After mapping an address into an entry, we should also implement the other side of the coin, which is to read the address from the entry. We will implement two core logics, one will be to read the address as is, and return the physical address, the other is based on observation that tables only map memory blocks, or other pages, so we might want instead of the address to get it as a reference of a table.

```rust,fp=shared/cpu_utils/src/structures/paging/page_table_entry.rs
impl PageTableEntry {

    /// Extract the address from the entry and return it without checking flags
    pub const unsafe fn mapped_unchecked(&self) -> PhysicalAddress {
        unsafe {
            PhysicalAddress::new_unchecked(
                (self.0 & ENTRY_ADDRESS_MASK) as usize
            )
        }
    }
    /// Return the physical address that is mapped by this entry while checking flags
    pub fn mapped(&self) -> Result<PhysicalAddress, EntryError> {
        if self.is_present() {
            unsafe { Ok(self.mapped_unchecked()) }
        } else {
            Err(EntryError::NoMapping)
        }
    }
    /// Return the physical address mapped by this table as a reference into a page table.
    pub fn mapped_table(&self) -> Result<&PageTable, EntryError> {
        // first check if the entry is mapped.
        let table = unsafe { &*self.mapped()?.translate().as_ptr::<PageTable>() };
        // then check if it is a table.
        if self.is_huge_page() && self.is_table() {
            Ok(table)
        } else {
            Err(EntryError::NotATable)
        }
    }
    // Another `mapped_table_mut` is implemented
    // This is the same functions, just with a mut reference on return
}
```

The sharp eyed people may notice that we used a function that we didn't define before, the `translate` function. For now, don't worry about it's details, they will all be discussed on the next chapter. For now just understand that when we toggle paging, the processor assumes all addresses are virtual, so if we will return the physical address the processor will assume it is virtual and will try to translate it, if we will not have a one-to-one mapping, the translation will fail and we will have some undefined behavior. The purpose of the translate function it to turn this physical address into a virtual one. How does it do that? You will have to read the next chapter to find out :)

> You may also notice that I used results, if you are unfamiliar with the topic, I would **really** recommend [A Simpler Way to See Results](https://www.youtube.com/watch?v=s5S2Ed5T-dc) which is an amazing video done by _Logan Smith_.
>
> I created this result type using the amazing [thiserror](https://docs.rs/thiserror/latest/thiserror/) crate by david tolnay to avoid a bunch of boiler plate. The create is somewhat explained in the video. The full implementation of the error enum will be in the [walkthrough](https://github.com/learnix-os/LearnixOS-Book-Walkthrough)

The last functions that we need to implement, are functions that can create our PageTable from a pointer. So far we create a function that could create an empty on a variable or a static value, but when we would create a lot of tables, or will need to dynamically create tables this function will not help us. For this reason, we will create a function that will receive a virtual address, and construct on it our page table.

```rust,fp=shared/cpu_utils/src/structures/paging/page_table.rs
#![no_std]

impl PageTable {
    pub unsafe fn empty_from_ptr(page_table_ptr: VirtualAddress) -> Option<&'static mut PageTable> {
        // Check if the address is in the correct alignment
        if !page_table_ptr.is_aligned(REGULAR_PAGE_ALIGNMENT) {
            return None;
        }
        unsafe {
            // Zero out all the entries and return as mut ptr
            ptr::write_volatile(
                page_table_ptr.as_mut_ptr::<PageTable>(),
                PageTable::empty()
            );
            return Some(&mut *page_table_ptr.as_mut_ptr::<PageTable>());
        }
    }
}
```

## Translation Lookaside Buffer

As a last note we will touch on a topic that is sometimes forgiven, which is the Translation Lookaside Buffer.

The TLB is a cache that stores our most recent translations of virtual addresses into physical ones and it is part of the MMU. This is useful because walking the page tables is a task that could take tens or even hundreds of cpu cycles, but instead obtaining the same entry from the cache, which is also called `TLB hit`, could take a few as 1 cycle because it is just a cache read.
This make the TLB _really_ useful, but it is not that simple, this is because we should know how to work with it. For example, switching page tables becomes a very expensive task, because the buffer refreshes.
Also, when we free up a page, we must call the `invlpg` instruction, which removes every page with the given address from the buffer. If we don't flush the entry it will become stale, and the cpu will still be able to translate the address even if it is not mapped anymore. This could be a cause to **a lot** of bugs and some serious security vulnerabilities.
