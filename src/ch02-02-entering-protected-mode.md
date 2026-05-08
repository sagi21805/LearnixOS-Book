# Entering Protected Mode

_"With great power comes great responsibility." - Voltaire / Spider-Man_

---

As you may recall from previous chapters, our BIOS only loads the first sector to RAM, which leaves about just shy of 512 bytes[^1].
After we read from disk, it will enable us to write much more code, because we will not be limited to 512 bytes.
But just before we do that, we don't want to limit ourselves only to 16bit instructions.
For that we need to enter [`protected mode`](https://en.wikipedia.org/wiki/Protected_mode) which will allow us to unlock some cpu features such as 32bit instructions.

[^1]: 446 bytes to be exact, this number is derived by removing the size of the partition table (64 bytes) and the size of the boot signature(2 bytes) from the sector size (512 bytes). 

Entering protected mode requires us to initialize the [`global descriptor table`](https://wiki.osdev.org/Global_Descriptor_Table) which is a CPU structure that will be discussed in depth below, and toggling the protected mode bit in [`cr0`](https://en.wikipedia.org/wiki/Control_register)


## The Global Descriptor Table

> _All the information about the global descriptor table is taken from both the [Intel Manual Volume 3A](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-3a-part-1-manual.pdf&ved=2ahUKEwjK-duH0pOUAxXvhf0HHRkeN1sQFnoECA0QAQ&usg=AOvVaw3xCH_sFKn73Bg5tPFbOzaC) section 3.4.5, and the great [osdev](https://wiki.osdev.org/GDT_Tutorial) website_

This is a structure that is specific to the x86 cpu family, and it contains information about the different segments.
In general, segments are used to divide memory into logical parts, and to translate addresses as we seen in real mode.

_Address translation with the GDT will not be wildely used in this chapter, because it will not be used throughout the OS and memory paging, which will be explained in the next chapter will be used._
_For now, think of a memory segment as a fixed size blob of contiguous physical memory_ 

In protected mode, the common way to organize memory is using these segments. Because segments registers[^2] can only hold one number,
they can't hold enough information for us, and that is where the global descriptor table comes in place.
The global descriptor table is an array of structures that include information about a segment,
when we want to use our custom segment, we load it's offset on the GDT to the segment register.
For example, we can create a segment for user data at index one of our table.
This segment will not hold important data for the system, and will not contain code that can be executed,
if we want to load it into the `ds` we will set it to the offset of the structure in the table.

_Each entry is 8 bytes long, index one will be at an offset of 8, which means we will set ds=8_

[^2]: Registers like cs, ds, gs, fs, ss etc.

> Instead of just revealing you the structure that is used for each segment, I want you to pause and ponder about what each segment should include.
>
> _Remember that some instructions assume segments, like mov, jmp etc. and we want segments for the kernel, users, data and code_

When I asked myself this question, I came up with the following ideas:
- What is the initial address of the segment. i.e the start address in memory where the segment starts.
- What is the end address of the segment. i.e the end address in memory where the segment ends.
- What the segment includes. i.e data segment, code segment etc.
- What is the privilege level of the segment. i.e can anyone access it or only the kernel
- For a data segment, Is the data read only, or may I modify it?
- For a code segment, Can I execute it, or not yet.

If you gussed something that is similar to this, you are mostly correct!

Our entry will look like this:
<figure style="margin: 0; text-align: center">
  <img src="assets/gdt_struct.svg"></img>
  <figcaption><strong>Figure 2-1:</strong> global descriptor table entry structure</figcaption>
</figure>


But what are these fields?
- **Base:** this is a 32-bit value, which is split on the entire entry and it represents the address of where the segment begins.
- **Limit:** this is a 20-bit value, which is split on the entire entry, and it represents the size of the segment.
- **Access Byte:** flags that are relevant to the memory range of the segment,
like the access privileges of this segment.
- **Flags:** general flags that are relevant for the entry fields.

All of these fields will become a struct and together they represent a single entry on our GDT.


Both the `AccessByte` and the `LimitFlags` and more structures throughout the book, are using one bit flags, which represents some inner settings to the CPU.
Although setting one bit flag is easy, and can be done with `1 << bit_number` to set the nth bit, we would like abstractions such as `set_<flag_name>`, which are more readable and less prone to errors.
But, if we would do that to every flag, it will be **A LOT** of boiler plate code.
For this reason, Rust provides us with an amazing macro system

<blockquote>

If you read through some previous version of this book, you may have seen the explanation of the [flag!](https://github.com/sagi21805/LearnixOS/blob/c6560ef225262a3cfea58d5a5eae716ddb082ff3/learnix-macros/src/lib.rs#L74) proc-macro, which was used like this:

<pre><code><span class="hlrs-keyword">impl</span> <span class="hlrs-type">AccessByte</span> {
    <span class="hlrs-macro">flag</span><span class="hlrs-macro">!</span>(<span class="hlrs-function">readable</span>, <span class="hlrs-litnum">1</span>);
}
</code></pre>

This macro was used to define thouse exactly 1 bit flags. But as it will turn out, this is not enough, and more functionality will be needed. 

</blockquote>

The problem that this macro had, is that the struct the these functions were defined on, didn't understand that it was a structure that contains bit flags, but it was rather a struct that wraps an integer type, and it has functions that is defined on it to turn specific bits. At first glance this seems almost the same. But, because the macro doesn't get as input all the information on the flags, but rather 'per flag' input, it cannot implement the [Debug](https://doc.rust-lang.org/std/fmt/trait.Debug.html) trait automatically when we want to print and look on the flags.

_More problems that are I was having, but are not a direct outcome of the initial design, is that flags sometimes contain more than 1 bit, and may contain n bits, also, certain n bit flags may have a specific set of values that are valid, and we may want to name them in an enum_

The current design of this macros, looks like this:

```rust,fp=<repo>crates/arch/x86/src/structures/global_descriptor_table.rs#L6
#![struct!("crates/arch/x86/src/structures/global_descriptor_table.rs", AccessByte)]
```

As you can see, we have the macro attribute at the top of our struct, which is called `bitfields`.

- Each field in this struct, is a flag, and as you can see, the highlighter is smart and can expand our macro, so the color of the field is the same as functions.

- The type of each field represents the flag width in bits. B1 is one bit and B20 is 20 bits.

- Some flags can have thier own attribute, which may contain r and w, which creates only read function, or write function (defaults to both)

- Flags may also contain types, which are mostly enums that contains the valid values, or even all the values but gives them a readable name.

- While this macro seems complex, it will just create the functions that will help us to set flags in a convenient way.

<blockquote>

To see what this macro generated, we can use the amazing [`cargo-expand`](https://crates.io/crates/cargo-expand) tool created by [`David Tolnay`](https://github.com/dtolnay)

<details>
<summary>For example, the expansion of the call above</summary>

```rust
#![source_file!("snippets/src/book/flag_macro_expand.rs")]
```
</details>
</blockquote>

If this macro seems really cool and complicated, that's great! because it will be fully explained and implemented in later chpaters.

_We will also define an enum that will include the protection level and the system segment type, so it would be more clear_

```rust,fp=<repo>crates/common/src/enums/general.rs
#![enum!("crates/common/src/enums/general.rs", ProtectionLevel)]
#![enum!("crates/common/src/enums/global_descriptor_table.rs", SegmentDescriptorType)]
```


Now, just before creating a `new` function to our entry, we don't want each time to specify the base in three parts and the limit in two parts, instead we want the `new` function to abstract it from us.

```rust,fp=<repo>crates/arch/x86/src/structures/global_descriptor_table.rs#L39
#![struct!("crates/arch/x86/src/structures/global_descriptor_table.rs", GlobalDescriptorTableEntry32)]
#![impl_method!("crates/arch/x86/src/structures/global_descriptor_table.rs", GlobalDescriptorTableEntry32::new)]
```
## Jumping to the next stage!

Now, after understanding the global descriptor table, we want to jump to the next stage.
This will require us to create and load a temporary global descriptor table.

Each table must have at least three entries, an initial `null` entry that is filled with zeros, which is always required as the first entry, a `data` entry for the data segment so we can read and write to memory, and `code` entry so we can execute code.

Together it will all look like this:

```rust,fp=<repo>crates/arch/x86/src/structures/global_descriptor_table.rs#L244
#![struct!("crates/arch/x86/src/structures/global_descriptor_table.rs", GlobalDescriptorTableProtected)]
#![impl_method!("crates/arch/x86/src/structures/global_descriptor_table.rs", GlobalDescriptorTableProtected::default)]
```

If you noticed, all of the functions that we defined so far are marked with `const` this is useful because we can create our global descriptor table as a static variable, which will be in the binary.
This is useful because it will make our initialization of the global descriptor table to be in compile time.

So, the only thing left to do is to load the global descriptor table. This can be done with the `lgdt` instruction which loads the `Global Descriptor Table Register` with our table. This is a hidden register that includes information about our global descriptor table, like it's size and address in memory.

We will create a `load` function that will create this register structure, and will load it to the cpu.

```rust,fp=<repo>crates/arch/x86/src/structures/global_descriptor_table.rs#L312
#![struct!("crates/arch/x86/src/structures/global_descriptor_table.rs", GlobalDescriptorTableRegister)]
#![impl_method!("crates/arch/x86/src/structures/global_descriptor_table.rs", GlobalDescriptorTableProtected::load)]
```

Now, to apply all of the created functionality, enable protected mode, and to jump to the next stage, we need to add the following code to our entry function.

But just before that, when we jump to the next stage, we need to specify the offset in the GDT of the relevant section we want to jump to, which will load the cs segment register with that value. In that case it is the `kernel_code` section, which will allow us to run code on ring0. For an easy way to specify the section, we will create an enum.

_Notice that this also contains segments of other GDT that we will use in the future_

```rust,fp=<repo>crates/common/src/enums/global_descriptor_table.rs#L8
#![enum!("crates/common/src/enums/global_descriptor_table.rs", Sections)]
```

```rust,fp=<repo>bootloader/first_stage/src/main.rs#L93
#![static!("bootloader/first_stage/src/main.rs", GLOBAL_DESCRIPTOR_TABLE)]
#![function!("bootloader/first_stage/src/main.rs", enter_protected_mode)]
```

- [x] Load the global descriptor table
