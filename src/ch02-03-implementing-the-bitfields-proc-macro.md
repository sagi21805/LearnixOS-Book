# Writing the Bitflags Macro

As you may recall from the previous chapter, we used a proc-macro that was called `bitfields`. In this chapter, we are going to learn about Rusts proceadural macros, and even implement this macro ourselves.

> Another great resource for this subject is the great video [Comprehending Proc Macros](https://www.youtube.com/watch?v=SMCRQj9Hbx8) by Logan Smith

## A Little Introduction to Proceadural Macros

Macros are not a new idea in programming languages, and most of them have macros in some shape or form. But what even is a macro?

If you ask wikipidia, we get the following definition. 
### [_Macro_](https://en.wikipedia.org/wiki/Macro_(computer_science))
<div style="border-left: 3px solid #ccc; padding-left: 12px;">

_A macro is a rule or pattern that specifies how a certain input should be mapped to a replacement output._

</div>

When I read this definition, the first thing that comes to mind, is that it really sounds like a function. After all, a function maps the input argument, to the output arguments, Which is exactly what a macro does. And that is exactly right, in Rust, macros (specifically proceadural macros), are indeed a specific type of functions, but lets not get ahead of ourselves.

The key differences between macros and regular functions is that macros _replace_ the inputs and the outputs, and that is not always true with functions. Secondly, macros operate on our source code instead of variables in our program.

Rust takes this definition very literally, and the definition for a proc-macro function looks like this: 

```rust
#![function!("snippets/src/lib.rs", custom_proc_macro)]
```

As you can see in this function, the input is Rusts `TokenStream` which is literally our source code, and the output is also a `TokenStream` which means it expects us to return also source code which could be the same (Like the example above), but most of the time it is not.

But what is this `TokenStream`, why not to just use strings of the source code?

Well, the main reason we are even discussing this, is that we want to manipulate the initial code in some way. Tokenizing the source code allows us to manipulate the code at a higher level which is easier to reason about. This `TokenStream` is the most basic tokenization unit that we are going to work with, and it contains a sequence of `TokenTree` nodes that represent the source code.

```rust
#![enum!("<rustc>/lib/rustlib/src/rust/library/proc_macro/src/lib.rs", TokenTree)]
```

## How Macros are Executed

As you may have noticed, macros does not behave exactly like regular functions. Another difference that they have is that they are evaluated at compile time. 

This thinking can also be used on regular functions, but not from our point of view, but from the compilers. For the compiler, regular functions are also a mapping, from some target language (in our case, Rust) to some other target language (in most cases, ASM[^1]).

For example, this function: 

```
#[unsafe(no_mangle)]
pub fn square(num: i32) -> i32 {
    num * num
}
```

would map to the following ASM code:
```x86asm,icon=@https://icons.veryicon.com/png/o/business/vscode-program-item-icon/assembly-7.png
square:
  mov     eax, edi
  imul    eax, edi
  ret
```

From this point of view, macros are not so different, but instead of a target language, they are mapped to the same language.
So this macro:

```
macro_rules! square {
    ($num:expr) => {
        $num * $num
    };
}

fn foo() -> u32 {
  let x = 42;
  square!(x)
}
```

Would map to this literal Rust code:

```
fn foo() -> u32 {
  let x = 42;
  x * x
}
```

The fact that macros operate on our source code, means that we can abstract certain logics, that regular functions cannot. For example, take a look at this macro:

```
macro_rules! unwrap_or_break {
    ($e:expr) => {
        match $e {
            Some(v) => v,
            None => break,
        }
    };
}

fn main() {
    let data = vec![Some(1), Some(2), None, Some(4)];
    let mut iter = data.into_iter();

    loop {
        let val = unwrap_or_break!(iter.next());  // breaks the loop on None
        println!("{}", val);
    }

    println!("done");
}
```

It works, because it injects the `break` expression into the code at the call site, which is something that a function just can't do.

```
fn unwrap_or_break<T>(e: Option<T>) -> T {
    match e {
        Some(v) => v,
        None => break,  // ERROR: `break` outside of a loop
    }
}
```

At this time, I hope you understand the great power of macros, and the great [code generation](https://en.wikipedia.org/wiki/Code_generation) capabilities that they enable. But, you might think rightfully think that in the examples above, we didn't have the option to insert 'coding' logic into the macro expansion. This is where procedural macros come in.

[^1]: This is actually a simplified view, compilers have intermediate representations. These representations are really usefull but out of the scope of this book. If you are like me, and this really intersts you, I will drop a great blog post which gives an example of why the intermediate representations are useful. [From Rust to Reality: The Hidden Journey of fetch_max](https://questdb.com/blog/rust-fetch-max-compiler-journey/)

## Macro Types

Just before we dive into procedural macros, lets cover up the type of macro that we already used in the examples above.

> All the syntax information about how macros are structured are taken directly from the [Offical Rust Reference](https://doc.rust-lang.org/reference/macros.html).

#### Declarative Macros

Declarative macros are the simplest type of macro, and they are the ones that we used in the examples above. They are mainly used to generate mainly simple syntax extensions, which are commonly called "macros by example".

Each macro is defined by a set of rules that specify how the macro should expand. Each rule looks a bit like a function signature that can get certain `Metavariables`. These `Metavariables` are placeholders for certain Rust syntax that are replaced with actual values when the macro is expanded.

Lets analyze the syntax of a declarative macro rule from the earlier examples.

```
/// Macros are defined using the `macro_rules!` macro, 
/// followed by the name of the macro.
macro_rules! unwrap_or_break {

    /// Each rule is defined with the "() => {}" syntax, 
    /// in the parentheses we provide the pattern to match, 
    /// which uses `Metavariables` to capture parts of the input.

    ($e:expr) => {

        /// Then, we can write 'regular' Rust code inside the macro body, 
        /// which uses the metavariables to generate the expanded code.
        match $e {
            Some(v) => v,
            None => break,
        }
    };
}
```

We will go a bit deeper then necessary on the common types of metavariables that are available. This is because later in this chapter we are going to talk about the `syn` library, which will parse Rusts syntax into similar structres.

Each metavariable starts with a `$` followed by the name of the metavariable which is used to refer to it. Then it is followed by a colon and the type of the metavariable.

The common types of metavariables are:

1. **Idents ($i:ident)** => These can be function names, variable names, type names, etc. They also include keywords like `fn`, `let`, `struct`, etc.
2. **Expressions ($e:expr)** => Expressions are things that are evaluated to a value, like `1 + 2` or `foo.bar()`.
3. **Items ($i:item)** => Items are the components of a module, for example the entire definition of a function or a struct.
4. **Statements ($s:stmt)** => Statements are the individual lines of code that make up a function or block. For example `let x = 42;` is a statement.
5. **Blocks ($b:block)** => Blocks are groups of statements that are executed on the same scope. For example `{ let y = 33; let x = 7 + y; x }` is a block.

_For a full list of available metavariable types, see the [reference](https://doc.rust-lang.org/reference/macros-by-example.html#r-macro.decl.meta.specifier)_


### Procedural Macros

Now for the real deal. Proceadural macros gives us the ability to go beyond simple syntax extensions, and allow us to write custom Rust code that will run on compile time on the macro input to consume and produce new Rust syntax (Depending on the macro type, the returned syntax will replace the input syntax, or will be added to it).

Because procedural macros are another piece of code that will run at compile time, they cannot be defined in the same crate as the code that uses them. This is becuase the Rust compiler must initialy compile the code of the macro so it will be able to run it during the compilation process. In addition, each proc macro crate, must add the following configuration to their `Cargo.toml` file, which will tell Cargo that this is a proc macro crate.

```toml
[lib]
proc-macro = true
```

As all function, these macro functions can also fail, although these functions are allowed to panic. They are encouraged to use the `compile_error!` macro to return a compile time error instead, which is the compiler form of `panic!`

To gain the `Tokenstream` type and the attributes that will be used on the macro functions, we need will use the `proc_macro` crate which is automatically linked to our crate if it is a proc macro crate.

### `function_like!()`

function like macros are very similar to declarative macros. They are invoked like a regular function and take a `TokenStream` as input and return a `TokenStream` as output.

This type of macro can be called anywhere in our code, even in global scope and is defined using the following syntax:

```
#[proc_macro]
pub fn foo(_item: TokenStream) -> TokenStream {
    "fn bar() -> u32 { 42 }".parse().unwrap()
}
```

Then it can be called like a regular function, which will create a fuction that is called `bar` which could be used in our code.

```
foo!();

fn main() {
    println!("{}", bar());
}
```

_This type of macro replaces the macro invocation with the generated code, so the macro invocation is effectively replaced with the generated code._

### `#[derive(CustomDerive)]`

Derive macros are used on On Rust items to generate code automatically. They are invoked using the `#[derive]` attribute and take the item they are applied to as input. Most of the time, derive macros are used to implement traits such as `Debug`, `Clone`, `PartialEq`, etc.

Derives may also include helper attributes, which are used to customize the generated code. 

This type of macro can be called only from structs, enums or unions.

```
#[proc_macro_derive(WithHelperAttr, attributes(helper))]
pub fn derive_with_helper_attr(_item: TokenStream) -> TokenStream {
    TokenStream::new()
}
```

And is used on a structure like this: 

```
#[derive(WithHelperAttr)]
struct Foo {
  #[helper] bar: ()
}
```

_This type of macro does not replace the macro invocation or the input item with the generated code, and the generated TokenStream is appended to the input TokenStream._

### `#[attribute(macros)]`

Attributes are used to annotate items with. They are placed before the item they are applied to and are used to customize the behavior of the item.

Attributes may also include input variables, which can be used to pass 'configuration' to the macro.

```
// The `_attr` parameter is the attribute's input variables, and the `item` parameter is the item the attribute is applied to.

#[proc_macro_attribute]
pub fn return_as_is(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}
```

And is used on a structure like this:

```
#[return_as_is]
struct Foo {
  bar: ()
}

#[return_as_is]
fn bar() { }
```

_This type of macro replaces the macro invocation and the input item with the generated code._

## Introduction to Syn and Quote

syn => Token! macro, custom keyword, typical types and enums, like Exper, Item, File. The Parse trait, Tokenstream. AST etc.

quote => ToTokens trait, quote! macro

## Defining our Macro 

## Implementing the Macro

### Struct Definition
### Single Bitfield
###
