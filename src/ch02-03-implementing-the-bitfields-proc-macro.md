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

```rust
#![enum!("<rustc>/lib/rustlib/src/rust/library/proc_macro/src/lib.rs", TokenTree)]
```

## Macro Types

### Declerative Macros
### Function Like Macros
### Derive Macros
### Attribute Macros

## Small Introduction to Syn and Quote

syn => Token! macro, custom keyword, typical types and enums, like Exper, Item, File. The Parse trait, Tokenstream. AST etc.

quote => ToTokens trait, quote! macro

## Defining our Macro 

## Implementing the Macro

### Struct Definition
### Single Bitfield
###
