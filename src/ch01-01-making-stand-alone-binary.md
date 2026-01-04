# Making a Standalone Binary

_"Machines take me by surprise with great frequency." - Alan Turing_

---

The first step in making our operating system is making a program that can be compiled, and executed, without any dependency.
This is not a straightforward task, because every program that we use in our daily life uses at least one, very important dependency: `The Standard Library`.
Sometimes, this library is provided by the operating system itself, for example, libc for the Linux operating system, or the WinAPI for the Windows operating system, and most of the time it is wrapped around by our programming languages.
Its name may vary per language, but here are some popular names:

```
Rust   -> std::*
C++    -> std::*
C      -> stdlib.h, libc.so
Python -> Modules like os, sys, math
Java   -> java.*, javax.*
Go     -> fmt, os
```

This library is linked[^1] to our code by default, and provides us with the ability to access our operating system.
[^1]: Linking is the process of combining compiled software builds so they can share functions.

Most of the time, programming languages add additional functionality to their standard library. For example, the [Rust Standard library](https://doc.rust-lang.org/std/), adds the `println!` macro for printing to screen, smart collections like a `Vec`, or a `LinkedList`, as well as `Box` for safe memory management, a lot of useful traits, very smart iterators and much much more!

Unfortunately, we won't have this luxury of a library and we will need to implement it all ourselves!
But don't worry, Rust has an ace up its sleeve; it provides us with the fantastic [Core](https://doc.rust-lang.org/core/) library, which is a dependency free base for the standard library, and more over, it provides us with traits, and structures that can be linked into our own OS, for example, once we write our memory allocator[^2], we could create a `Vec` from the core library, and we can tell it to use our own allocator!
[^2]: A subsystem in our operating system that is responsible for managing memory.

So without further ado, Let's get started!

## Making a Rust Project

First, make sure you [have Rust installed](https://doc.rust-lang.org/book/ch01-01-installation.html).

Afterwards, you can create the project with the following command:
```
$ cargo init <project_name>
$ cd <project_name>
```

If you have done everything correct, your project should look like this:
```
<project_name>/
|-- Cargo.toml
|-- src
   |- main.rs
```

And the main file, should look something like this:

```rust,main.rs
fn main() {
    println!("Hello, world!");
}
```


This can easily be run on your computer with `cargo run` but, because you are running it on a regular computer, with a functioning operating system, your program uses the standard library.

> Note: In all parts of this project we are using the nightly distribution of Rust. This is because some features that we are going to use in the future are not yet stable, and are only available in nightly.
>
> There are two ways to include it, the first one, is to add `+nightly` on every cargo command, for example:
> ```
> $ cargo +nightly build
> ```
> The second option, is to create a file which will hold our default toolchain
> ```toml,fp=rust-toolchain.toml
> [toolchain]
> channel = "nightly"
> ```
> This book uses the second approach.

## Ignoring the Standard Library

As mentioned before, we don't want to depend on the standard library because it is meant for an already existing operating system. To ignore it, simply add `#![no_std]` on the top of our main file, this attribute tells the compiler that we don't want to use the standard library.

Now, if we then try to compile our crate, we get this error message:

```banner=no
error: cannot find macro `println` in this scope
 --> src/main.rs:4:5
  |
4 |     println!("Hello, world!");
  |     ^^^^^^^

error: `#[panic_handler]` function required, but not found

error: unwinding panics are not supported without std
  |
  = help: using nightly cargo,
          use -Zbuild-std with panic="abort" to avoid unwinding

  = note: since the core library is usually precompiled with panic="unwind",
          rebuilding your crate with panic="abort"
          may not be enough to fix the problem
```

When breaking this error down we see there are 3 main errors:

* Cannot find macro `println`
* `#[panic handler]` function is required
* Unwinding panics are not supported without std.

The first error is more obvious. Because we don't have our standard library, `println` does not exist, so we simply need to remove the line that uses it, the other errors will require their own sections to explain.

## Defining a Panic Handler

Rust doesn't offer a standard exception like other languages, for example, in Python an exception could be raised like this:
```python
def failing_function(x: str):
    if not isinstance(x, str):
        raise TypeError("The type of x is not string!")
```

Instead, Rust provides us with the `panic!` macro, which will call the `Panic Handler Function`. This function is very important and it will be called every time the `panic!` macro is invoked, for example:
```rust
fn main() {
    panic!("This is a custom message");
}
```
Normally, the Standard Library provides us with an implementation of the Panic Handler Function, which will typically print the line number and file in which the error occurred; however, because we are now not using the Standard Library, we need to define the implementation of the function ourselves.
This function can be any function, it just needs to include the attribute `#[panic_handler]`. This attribute is added so the compiler will know which function to use when invoking the `panic!` macro, to enforce that only one function of this type exists, and to also enforce the input argument and the output type.

If we create an empty function for the panic handler, we will get this error:
```banner=no
error[E0308]: `#[panic_handler]` function has wrong type
  --> src\main.rs:10:1
   |
10 | fn panic_handler() {}
   | ^^^^^^^^^^^^^^^^^^ incorrect number of function parameters
   |
   = note: expected signature `for<'a, 'b> fn(&'a PanicInfo<'b>) -> !`
              found signature `fn() -> ()
```

This means that it wants our function to receive a reference to a structure called `PanicInfo` and return the `!` type.

But what is this struct? and what is this weird type?

The `PanicInfo` struct includes basic information about our panic such as the location, and message. Its definition can be found in the core library:
```rust,fp=<rust-doc>core/panic/panic_info.rs

pub struct PanicInfo<'a> {
    message: &'a fmt::Arguments<'a>,
    location: &'a Location<'a>,
    can_unwind: bool,
    force_no_backtrace: bool,
}
```

The `!` type is a very special type in rust, called the `never` type, as the type name may suggest, it says that a function should **never** return, which means our program will not continue after the function is called.
In a normal operating system, this is not a problem; just print the panic message + the location, and kill the process so it will not return. But in our own OS, unfortunately, this is not possible because there is not a process that we can exit. So, how can we prove to Rust we are not returning? By endlessly looping!

So at the end, this is the definition of our handler, which results in the following code

```rust,fp=main.rs
#![no_std]
fn main() {

}

#[panic_handler]
pub fn panic_handler(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
```

This code unfortunately still doesn't compile, because we didn't handle the last error.

<details><summary><span>Some IDE's will still show an error, if you are like me, and want it to disappear, click on this text.</span></summary>

Some IDE's like VSCode, and Zed that uses rust-analyzer, will throw an error that the panic_handler function already exists.

```
found duplicate lang item `panic_impl`
the lang item is first defined in crate `std` (which `test` depends on)
...
```

Each IDE has it's own way to configure rust-analyzer to to ignore these, fixes for VSCode and Zed are shown below:

### VSCode

```json,fp=.vscode/settings.json,icon=@https://www.svgrepo.com/show/373712/json.svg
{
  "rust-analyzer.check.allTargets": false,
  "rust-analyzer.cargo.target": "x86_64-unknown-linux-gnu",
}
```

### Zed

```json,fp=.zed/settings.json,icon=@https://www.svgrepo.com/show/373712/json.svg
{
  "lsp": {
    "rust-analyzer": {
      "initialization_options": {
        "cargo": {
          "target": "x86_64-unknown-linux-gnu"
        },
        "check": {
          "allTargets": false
        }
      }
    }
  }
}
```

This works, because it tells rust-analyzer to use a target that doesn't include the standard library, and not to check other targets except the one we specified.

> Note: You might have to install the target with `rustup add target x86_64-unknown-linux-gnu`

</details>

## What is Unwinding and How to Disable It

When a program panics, usually because of an unrecoverable error, it has to stop whatever it is doing. In a normal execution environment with neighboring programs, all of the program's memory should be cleaned up so a memory leak doesn't occur. This is where _unwinding_ comes in.
When a Rust program panics, and the _panic strategy_ is to _unwind_, Rust goes up the stack of the program, and cleans up the data from each function that it encounters. However, walking back and cleaning up is a lot of work. Rust, therefore, allows you to choose the alternative of immediately aborting, which ends the program without cleaning up. This alternative is also useful in our case, where we don't have the sense of "cleaning up", because we still don't have an operating system.
So, to simply switch the panic strategy to abort, we can add the following line to our `Cargo.toml` file:

```toml,fp=Cargo.toml
[profile.dev]
panic = "abort"

[profile.release]
panic = "abort"
```

After we disabled unwinding, we can now, hopefully, try to compile our code!

But, by running `cargo run` we get the following error:
```banner=no
error: using `fn main` requires the standard library
  |
  = help: use `#![no_main]` to bypass the Rust generated entrypoint
          and declare a platform specific entrypoint yourself,
          usually with `#[no_mangle]`
```
As per usual, the Rust compiler errors are pretty clear, and they tell us exactly what we need to do to fix the problem. In this case, we need to add the `#![no_main]` attribute to our crate, and declare a platform specific entrypoint ourselves.

## Defining an Entry Point

To define an entry point, we need to understand the linker.

The linker is a program that is responsible for structuring our code into segments, setting the entry point, defining the output format, and also linking other code to our program. This configuration is controlled by a linker script. For example, a very simple linker script may look like this:
```linker,fp=linker.ld
OUTPUT_FORMAT(binary)
ENTRY(main)
```

This will set our entry point to main, and our output into a raw binary, which means the binary header[^3] of the program will not be included.
[^3]: Operating systems have their own binary header so they can understand how to treat a binary. Some common ones are [ELF](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format) and [PE](https://en.wikipedia.org/wiki/Portable_Executable)

Then, to make our linker to use this script, we mainly have two options; one is to add some arguments to our build command, and the other one is to create a [build script](https://doc.rust-lang.org/cargo/reference/build-scripts.html). In this guide, we use the following build script:
```rust,fp=build.rs
use std::path::Path;

fn main() {
    // Environment variable that stores the current working directory
    let local_path = Path::new(env!("CARGO_MANIFEST_DIR"));

    // This tells cargo to add the `-C link-arg=--script=./linker.ld` argument.
    // Which will result in linking with our code with our linker script
    println!(
        "cargo:rustc-link-arg-bins=--script={}",
        local_path.join("linker.ld").display()
    )
}
```

But, after we do all this and again, run `cargo build`, we get the same error. At first, this doesn't seem logical, because we defined a main function. But, although it is true that we defined one, we didn't consider Rust's default [mangling](https://doc.rust-lang.org/rustc/symbol-mangling/index.html).
This is a very clever idea done by Rust, and without it, things like the following wouldn't be possible:

```rust
struct A(u32);

impl A {
    pub fn new(a: u32) -> A {
        A(a)
    }
}

struct B(u32);

impl B {
    pub fn new(b: u32) -> B {
        B(b)
    }
}
```
Athough the function are defined on different structs, they have the same name, but because of mangling, the actual name of the function would be something like
```
A::new -> _ZN7mycrate1A3new17h5f3a92c8e3b0a1a2E
B::new -> _ZN7mycrate1B3new17h1c2d3e4f5a6b7c8dE
```

A similar thing is happening to our `main` function, which makes its name not exactly 'main', making the entry point not recognized.
To fix it, we can add the `#[unsafe(no_mangle)]` attribute to our main function, which will make it's name just 'main'.

Which makes this, our final main.rs file!
```rust,fp=main.rs
#![no_std]
#![no_main]

#[unsafe(no_mangle)]
fn main() {
}

#[panic_handler]
pub fn panic_handler(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
```

## Build Target

On some platforms, like MacOS, the default target is not compatible with `#![no_std]` binaries, so we need to change it to a more compatible one, like `x86_64-unknown-none`. This target ensures that the binary will be compiled for a 64 bit architecture, without any operating system.

> Note: Build targets will be discussed in more detail in the next chapter.
> You might have to install the target with `rustup target add x86_64-unknown-none`

## Including the Core Library

As a final note, you might have noticed that we are using the `PanicInfo` struct from the core library. 

To include it, without specifying it on the build command every time, we can create a cargo configuration file, and add the following lines to it:

```toml,fp=.cargo/config.toml
[unstable]
build-std = ["core"]
build-std-features = ["compiler-builtins-mem"]
unstable-options = true
```

This will tell cargo to always add the following arguments to the build command:

```
-Z build-std=core -Z build-std-features=compiler-builtins-mem -Z unstable-options
```

If you followed through, the code should now compile with the following command:

```
cargo build --target x86_64-unknown-none
``` 

Although the code compiled, it still doesn't make it bootable, which is what I will cover in the next section.
