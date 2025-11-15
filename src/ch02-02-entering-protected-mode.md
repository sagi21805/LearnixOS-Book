# Entering Protected Mode

_"With great power comes great responsibility." - Voltaire / Spider-Man_

---

After we read from disk, it will enable us to write much more code, because we are not limited to 512 bytes.
But just before we do that, we don't want to limit ourselves only to 16bit instructions.
For that we need to enter [`protected mode`](https://en.wikipedia.org/wiki/Protected_mode) which will allow us to unlock some cpu features such as 32bit instructions.

Entering protected mode requires us to initialize the [`global descriptor table`](https://wiki.osdev.org/Global_Descriptor_Table) which is a CPU structure that will be discussed in depth bellow, and toggling the protected mode bit in [`cr0`](https://en.wikipedia.org/wiki/Control_register)

## The Global Descriptor Table

This is a structure that is specific to the x86 cpu family, and it contains information about the different segments.
In general, segments are used to divide memory into logical parts and as we seen in real mode, to also translate addresses.

In protected mode, the common way to organize memory is using these segments. Because segments registers can only hold one number,
they can't hold enough information for us, and that is where the global descriptor table comes in place.
The global descriptor table is an array of structures that include information about a segment,
when we want to use our custom segment, we load it's offset to the segment register.
For example, we can create a segment for user data at index one of our table.
this segment will not hold important data for the system, and will not contain code that can be executed,
if we want to load it into the `ds` we will set it to the offset of the structure in the table.

> Instead of just revealing you the structure that is used for each segment, I want you to pause and ponder about what each segment should include.
>
> _Remember that some instructions assume segments, like mov, jmp etc. and we want segments for the kernel, users, date and code_

When I asked myself this question, I came up with the following ideas:
- What is the initial address of the segment. i.e the start address in memory where the segment starts.
- What is the end address of the segment. i.e the end address in memory where the segment ends.
- What the segment includes. i.e data segment, code segment etc.
- What is the privilege level of the segment. i.e can anyone access it or only the kernel
- For a data segment, Is the data read only, or may I modify it?
- For a code segment, Can I execute it, or not yet.

Although this first guess of what the global descriptor table includes don't include everything, It is mostly accurate!

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

All of these fields can become a struct and together they will represent a single entry.

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs limit_flags}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs gdt_entry32}}
```

Both the `AccessByte` and the `LimitFlags` and more structures throughout the book, are using one bit flags, which represents some inner settings to the cpu.
Although setting one bit flag is easy, and can be done with `1 << bit_number` to set the nth bit, we would like abstractions such as `set_<flag_name>`, which are more readable and error prone.
But, if we would do that to every flag, it will be **A LOT** of boiler plate code.
For this reason, rust provides us with an amazing macro system
> **Note:** If you are unfamiliar with macros, and especially rust macros, a little explanation will be given in this book, to read more about rust's macros, click [here](https://doc.rust-lang.org/book/ch20-05-macros.html)

So, to mitigate all of this boiler plate, will will create a `flag!` macro.
The goal of this macro is to use the flag name, and it's bit number to generate utility functions that are readable and error prone.
Our macro will look like this:

```rust, fp=shared\common\src\macros.rs
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/common/src/macros.rs flag_macro}}
```

While this macro seems complex, it will just create four functions that will help up set, unset and read the flag.

To see what this macro generated, we can you the amazing [`cargo-expand`](https://crates.io/crates/cargo-expand) tool created by [`David Tolnay`](https://github.com/dtolnay)

<details>
<summary>To see an example</summary>

A simple code like this:

```rust
struct Example(u8);

impl Example {
    flag!(first, 1);
    flag!(second, 2);
    flag!(third, 3);
}
```

Will be expanded to this:

```rust
struct Example(u8);
impl Example {
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn set_first(&mut self) {
        self.0 |= 1 << 1;
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag while returning self
    ///
    /// `This method is auto-generated`
    pub const fn first(self) -> Self {
        Self(self.0 | (1 << 1))
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Unset the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn unset_first(&mut self) {
        self.0 &= !(1 << 1);
    }
    /// Checks if the corresponding flag in set to 1
    ///
    /// `This method is auto-generated`
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    pub const fn is_first(&self) -> bool {
        self.0 & (1 << 1) != 0
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn set_second(&mut self) {
        self.0 |= 1 << 2;
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag while returning self
    ///
    /// `This method is auto-generated`
    pub const fn second(self) -> Self {
        Self(self.0 | (1 << 2))
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Unset the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn unset_second(&mut self) {
        self.0 &= !(1 << 2);
    }
    /// Checks if the corresponding flag in set to 1
    ///
    /// `This method is auto-generated`
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    pub const fn is_second(&self) -> bool {
        self.0 & (1 << 2) != 0
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn set_third(&mut self) {
        self.0 |= 1 << 3;
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Sets the corresponding flag while returning self
    ///
    /// `This method is auto-generated`
    pub const fn third(self) -> Self {
        Self(self.0 | (1 << 3))
    }
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    /// Unset the corresponding flag
    ///
    /// `This method is auto-generated`
    pub const fn unset_third(&mut self) {
        self.0 &= !(1 << 3);
    }
    /// Checks if the corresponding flag in set to 1
    ///
    /// `This method is auto-generated`
    #[inline]
    #[allow(dead_code)]
    #[allow(unused_attributes)]
    pub const fn is_third(&self) -> bool {
        self.0 & (1 << 3) != 0
    }
}
```
</details>

So now, without a lot of boiler plate, we can define our `AccessByte` and `LimitFlags`.
```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
impl AccessByte {
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_new}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_present}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_privilege_level}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_code_data}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_executable}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_direction}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_conforming}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_readable}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs access_byte_writable}}
}

impl LimitFlags {
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs limit_flags_new}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs limit_flags_granularity}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs limit_flags_protected}}

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs limit_flags_long}}
}
```


Now, just before creating a `new` function to our entry, we don't want each time to specify the base in three parts and the limit in two parts, instead we want the `new` function to take care of that.
This will complicate it a bit, but will provide much more friendly interface.

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs gdt_protected}}

impl GlobalDescriptorTableEntry32 {
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs gdt_entry32_new}}
}
```
## Jumping to the next stage!

Now, after understanding the global descriptor table, we want to jump to the next stage.
This will require us to create and load a temporary global descriptor table.

Each table must have at least three entries, an initial `null` entry that is filled with zeros, which is always required as the first entry, a `data` entry for the data segment so we can read and write to memory, and `code` entry so we can execute code.

Together it will all look like this:

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
impl GlobalDescriptorTableProtected {
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs gdt_default}}
}
```

If you noticed, all of the functions that we defined so far are marked with `const` this is useful because we can create our global descriptor table as a static variable, which will be in the binary.
This is useful because it will make our initialization of the global descriptor table to be in compile time.

So, the only thing left to do is to load the global descriptor table. This can be done with the `lgdt` instruction which loads the `Global Descriptor Table Register` with our table. This is a hidden register that includes information about our global descriptor table, like it's size and address in memory.

We will create a `load` function that will create this register structure, and will load it to the cpu.

```rust,fp=shared/cpu_utils/src/structures/global_descriptor_table.rs
impl GlobalDescriptorTableProtected {
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/shared/cpu_utils/src/structures/global_descriptor_table.rs gdt_load}}
}
```

Now, to apply all of the created functionality, enable protected mode, and to jump to the next stage, we add the following code to our entry function.

```rust,fp=kernel/stages/first_stage/src/main.rs
{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/kernel/stages/first_stage/src/main.rs gdt_static}}

pub fn first_stage() -> ! {

{{#webinclude https://raw.githubusercontent.com/sagi21805/LearnixOS/refs/heads/master/kernel/stages/first_stage/src/main.rs enter_protected_mode}}
}
```
