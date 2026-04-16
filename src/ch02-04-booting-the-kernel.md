# Booting the Kernel

_"A small thing. Yet it holds everything together." - J.R.R. Tolkien, paraphrased_

---

In the previous section we talked about memory paging, what it is, and how to initialize page tables. So, logically the only thing that is left to do, is to toggle on paging.

After that we can also toggle [`long mode`](https://en.wikipedia.org/wiki/Long_mode), which is another mode in the CPU, just like `protected mode` which will let us run 64-bit instructions. 

## Initializing Paging

<details><summary><span style="font-style: italic; font-size: 1.15em;">The code below assumes the following target and linker script</span></summary>

```linker,fp=<repo>build/linker_scripts/32bit.ld
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/build/linker_scripts/32bit.ld}}
```

_I leave the starting address of the next stage as an exercise for the reader (There is a really good reason to use that address)._

> **_Note:_** The code for using the linker script in the build script is the same as in stage one.

```json,fp=<repo>build/targets/32bit_target.json
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/build/targets/32bit_target.json}}
```
</details>

Like every feature of the CPU, to toggle it we just need to flip some bits on some control registers. But, in this case if we were to just toggle paging, our computer will crash instantly because of the following reasons: 

>1. Our cr3 register doesn't hold a meaningful address of a valid page table.
>2. Our current addressing assumes addresses are physical, continuous and starting at 0.
>3. We didn't set up any page table.

Problems 1 and 3 are almost the same, because after we set up a page table, we can just set cr3 to hold it's address.
But how should we set our initial table? This is where problem 2 helps us. Because until now we used physical address, we want to continue doing that at least until we can create processes. So, with that said, we want to map the start of our virtual address space, to the start of the physical address space, thus creating what is called [`identity paging`](https://wiki.osdev.org/Identity_Paging).

So firstly, let initialize our page tables.

```rust,fp=<repo>crates/arch/x86/src/structures/paging/init.rs#L15
#[cfg(target_arch = "x86")]
pub fn enable() -> Option<()> {

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/paging/init.rs initialize_page_tables}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/paging/init.rs setup_page_tables}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/paging/init.rs set_cr3}}

}
```

After we initialize the table, notice we set the L2 table to hold `huge page` offset for address 0. 

Huge page means it is bigger then the normal 4Kib size, and it is used in the case that we want to map the entire level bellow this table contiguously (eg map 0->0, 4096->4096, 8192->8192 etc..)

Instead of creating multiple tables, and wasting precious memory, we can flag the entry as `huge page`. which says to the mmu _"This entry points to a contiguous memory block and not to a table"_.

> This flag can only be put on a L2 or L3 table and it is not support on older cpu's, on L2 table the resulting page size is 2Mib (4Kib x 512 entries) and on L3 table 1Gib (2Mib * 512 entries)

## What is Long Mode?

Just before we will toggle paging on our cpu, we should enter protected mode, to do that, we need to toggle 2 things, the first is called the `physical address extension` (PAE) which is an extension for protected mode paging, which allows 32bit paging entries to be 64bit, which results in a way to access addresses above 32bit because the page table walker can access the 64bit address on the entries. This extension must be activated to access long mode, which also allows us to have 64bit instructions.

To activate PAE and Long mode, we can use this inline assembly.
```rust,fp=<repo>crates/arch/x86/src/structures/paging/init.rs#L100
#[cfg(target_arch = "x86")]
pub fn enable() -> Option<()> {

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/paging/init.rs set_cr4}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/paging/init.rs set_efermsr}}

}
```

After that, we can finally turn on paging!

Like the previous features, this also it toggled by a control register, and done via inline assembly
```rust,fp=<repo>crates/arch/x86/src/structures/paging/init.rs#L128
#[cfg(target_arch = "x86")]
pub fn enable() -> Option<()> {

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/paging/init.rs enable_paging}}

}   
```

Now, to go into long mode, we need to `far jump` just like in protected mode, with a special global descriptor table.
This table will look almost the same as our previous table, the key differences are that the `long mode` flag replaces the `protected mode` flag, and that most of the flags are not used because in this mode they are irrelevant.

_For now ignore the tss entry, it will be relevant on later chapters_

So after the changes the table will look like this:

```rust,fp=<repo>crates/arch/x86/src/structures/global_descriptor_table.rs#L277
impl GlobalDescriptorTableLong {

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/crates/arch/x86/src/structures/global_descriptor_table.rs gdt_long_default}}

}
```

## Hello Kernel!

After all that initialization we can jump to our kernel main!

All that is left to do is to call the `enable` function we created to enable paging, load the new long mode GDT, and jump to our kernel.

This can be done with the following code: 

```rust,fp=<repo>bootloader/second_stage/src/main.rs#L23
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/bootloader/second_stage/src/main.rs gdt_long}}


{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/bootloader/second_stage/src/main.rs _start}}
```

- [x] Enabling memory paging
