# Writing the Bitflags Macro

As you may recall from the previous chapter, we used a proc-macro that was called `bitfields`. In this chapter, we are going to learn about Rusts proceadural macros, and even implement this macro ourselves.

> Another great resource for this subject is the great video [Comprehending Proc Macros](https://www.youtube.com/watch?v=SMCRQj9Hbx8) by Logan Smith


_If you are familer with procedural macros, with `syn` and `quote`, and want to go stright to the macro implemention, click [here](#defining-our-macro)_

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

To see this more visibly, we can print our TokenStream, because it implement the `Debug` trait. Which for a simple struct would look like this: 

```text
TokenStream [
    Ident {
        ident: "struct",
        span: #0 bytes(43..49),
    },
    Ident {
        ident: "Example",
        span: #0 bytes(50..57),
    },
    Group {
        delimiter: Brace,
        stream: TokenStream [
            Ident {
                ident: "a",
                span: #0 bytes(64..65),
            },
            Punct {
                ch: ':',
                spacing: Alone,
                span: #0 bytes(65..66),
            },
            Ident {
                ident: "i32",
                span: #0 bytes(67..70),
            },
            Punct {
                ch: ',',
                spacing: Alone,
                span: #0 bytes(70..71),
            },
        ],
        span: #0 bytes(58..73),
    },
]
```

_Can you understand what is the name of the struct and its fields?_

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

Remembering our goal to write the `bitfield` macro from earlier chapter, you can already guess that we want to write an `attribute` macro. But, parsing the TokenStream we saw above is really hard, because it will require us to understand Rusts syntax tree, which can be quite complex.

Luckyly for us, the `syn` crate, written by `David Tolnay` provides a way to parse Rust syntax tree into a structured AST (Abstract Syntax Tree), which makes it easier to work with Rust source code.

### What are Abstract Syntax Trees
 
As the name suggests, this a tree like structure, that represents the syntax of a certain programming language (in our case, Rust).
Before diving right into the implementation of `syn` on Rust syntax, let's first understand what an AST is. 

We will look at a really simple program, that is writting in Python.

```python
current = 0
for item in items:
    if item > current:
        current = item
```

A simplified syntax tree for a simple program like this might look like this:

<figure style="margin: 0; text-align: center">
  <img src="assets/ast.svg"></img>
  <figcaption><strong>Figure 3-1: </strong>simplified syntax tree</figcaption>
</figure>

As you can see, in a tree like this we can have types that help us represent the syntax in our language. For example the `Assign` statement which contains a `left` and `right` side. Or the `For` loop which contains item that is being iterated over, the collection name, and the body of the loop. Then, when we want to operate on the syntax it self, for example, create the same if statement, but change the name of the item. We can simply copy the type, and change the item ident to a new one.

As you may have gussed, `syn` does the exact same thing we did with our small program, but with all the complexity of a real language. So lets see what types does it offer.

_There are a lot of types on the `syn` crate, and we will only cover some of them. Once you get the hang of it, all the other will be easy to understand._

The top level type for the AST is `syn::File`, which represents a complete Rust source file.

```rust
#![source_file!("<crateio>/syn-2.0.117/src/file.rs", 6:86)]
```

Ok, we can see that `syn::File` is made out of a list of `syn::Attribute` and `syn::Item`. But this doesn't tell us much, so let's also explore them.

```rust
#![source_file!("<crateio>/syn-2.0.117/src/attr.rs", 23:183)]
```

So we can see an attribute, like `#[derive(Debug)]`, is represented by `syn::Attribute`. Currently, we will not dive deeper into `Attribute` but we will cover more of it, when we will use it in our macro implementation.

Now let's see `syn::Item`.

```rust
#![source_file!("<crateio>/syn-2.0.117/src/item.rs", 22:101)]
```

As you can see, we have a lot of items, and I hope that you can start and recognize some of them, as an example, let's cover `ItemConst`.

```rust
#![source_file!("<crateio>/syn-2.0.117/src/item.rs", 103:118)]
```

If you have noticed closely, the order of the fields in the struct definition is the same as the order in the source code. This makes it really easy to map the AST back to the source code.

Also, as a side note, keywords like `const`, `struct` and punctuation like `:` and `=` does have types, but `syn` also provides a `Token!` macro that maps the literal token to its corresponding type.

The last type that we are going to cover is `syn::Expr`, which represents an expression from the source code. Because most of Rusts syntax is represented as expressions, `syn::Expr` is a very large type.

```rust
#![source_file!("<crateio>/syn-2.0.117/src/expr.rs", 37:269)]
```

These types are very powerfull, and help us express the language is a structured way. As a quick example, let's see how `syn::ItemStruct` is represented in the AST. In this example, we have the exact same struct, that we showed its `TokenStream` representation.

```
ItemStruct {
    attrs: [],
    vis: Visibility::Inherited,
    struct_token: Struct,
    ident: Ident {
        ident: "Example",
        span: #0 bytes(50..57),
    },
    generics: Generics {
        lt_token: None,
        params: [],
        gt_token: None,
        where_clause: None,
    },
    fields: Fields::Named {
        brace_token: Brace,
        named: [
            Field {
                attrs: [],
                vis: Visibility::Inherited,
                mutability: FieldMutability::None,
                ident: Some(
                    Ident {
                        ident: "a",
                        span: #0 bytes(64..65),
                    },
                ),
                colon_token: Some(
                    Colon,
                ),
                ty: Type::Path {
                    qself: None,
                    path: Path {
                        leading_colon: None,
                        segments: [
                            PathSegment {
                                ident: Ident {
                                    ident: "i32",
                                    span: #0 bytes(67..70),
                                },
                                arguments: PathArguments::None,
                            },
                        ],
                    },
                },
            },
            Comma,
        ],
    },
    semi_token: None,
}
```
_Can you see the name of the struct, and the type of the field in the AST?_

As you can see, what was before a list of punctionations, and idents, now have become a structured representation that is easier to work with. 

The most important thing about syn, is that we can use the types that if offers, to create new, custom types, that are not bounded to the language's AST. 

But how would syn know to parse our custom syntax into the AST types it offers? This is where the `Parse` trait comes in. When syn wants to parse our custom syntax, it will call the `parse` method from the `Parse` trait, and pass in the token stream to parse.

```rust
#![trait!("<crateio>/syn-2.0.117/src/parse.rs", Parse)]
```

We will go deepr into this, when we will create our own custom `Parse` implementation. One important thing to understand is that all of syn's types implement `Parse` themselves, so most of the time, implementing `Parse` for types that are built from syn's AST types is easy.

Up until now, we learned how to parse our source code, into a meaningful AST representation. This representation will help us to work with the syntax, and to implement our macro's logic. But, after we parsed the source code, and processed it to our needs, we need to return it back into a `TokenStream`. This is where the `quote` crate comes in.

Quoting is a term that is borrowed from lisp, and it means that we write things that looks like code, but they will actually convert into a data under the hood, or in our case the `TokenStream` type.

The `quote` crate provides a `quote!` macro that allows us to write quoted expressions.

For example, let's define a simple quoted expression that represents a struct definition:

```
quote! {
    struct Foo {
       bar: () 
    }

    fn main() {
        
    }
}
```

As you can see, it seems like we write Rust code, but actually under the hood, it is converted into a `TokenStream`.

Another great quality that this macro have, is that it supports entering variables into the quoted expression. Let's look at an example, where we change a name of a function, inside an attribute macro.

```
#[proc_macro_attribute]
pub fn change_name(_attr: TokenStream, input: TokenStream) -> TokenStream {
    let mut item_fn = syn::parse_macro_input!(input as ItemFn);

    item_fn.sig.ident = Ident::new(
        &format!("with_change_{}", item_fn.sig.ident),
        item_fn.sig.ident.span(),
    );

    quote::quote! { #item_fn }.into()
}
```

As you can see, we parsed the input with `syn` into a function item. Then, we changed the name of the function, and transferred it to the `quote!` macro with the `#` so that it would convert the variable into a `TokenStream`.

But how quote knows to convert the variable into a `TokenStream`? This is where the `ToTokens` trait comes in.

```rust
#![trait!("<crateio>/quote-1.0.45/src/to_tokens.rs", ToTokens)]
```

In this trait, the `to_tokens` method is defined, which gets a `&mut TokenStream` and appends the tokenized representation of the variable to it.

The types that are defined in `syn` already implement this trait, so they can be used with `quote!` without any additional work like in the example above that the `ItemFn` became a function definition.

## Defining our Macro 

In my opinion, the most important thing to do before we even start to code (even not specifically for macros), is to the define what we want from our program.

The main thing we wanted in the first place, is to represent a number, e.g u8, u16, u32 etc, as flags. To see a clear example look at the drawing below.

<figure style="margin: 0; text-align: center">
  <img src="assets/bitflag.svg"></img>
  <figcaption><strong>Figure 3-1: </strong>bitflag struct example</figcaption>
</figure>


In this drawing we can see six different flags. Each takes a different part inside our u16 number. 
1. Flag A is between bits 00-02
2. Flag B is between bits 02-07
3. Flag C is between bits 07-10
4. Flag D is between bits 10-12
5. Flag E is between bits 12-15
6. Flag F is between bits 15-16

For each flag, we would like to have multiple functions. 

- A getter, which return the value of the flag.
- A setter, which sets the the value of the flag.
- Clear function, which writen a clear value if defined directly to the flag. (Will be necesarry in the future)

Because we need multiple functions defined, the best Rust item suited for the job is a `struct`. Also, because a struct will wrap the entire definition, the macro will have in it's context all of the definitions of all the flags, which means we could also implement the `Debug` trait on it to print all of the flags.

Some flags will need different functions, and may also have `types`. For example think about the protection level field in the previous section. While we can just leave it as a number, most of the time, it is more convenient to have an enum, that represents the valid values. Also, some flags may not need all the functionalities of get, set and clear. For that, we want to have the ability to control which functions will be generated.

And for the last caveat, some flags will be written as absolute values on their setter function, and will return absolute value on thier getter. What does that mean? Take as an example flag `E` on the example above. The span of this flag is between bits 12-15. In most of our flag cases, we would want to write to this value numbers between the 0-7, because it is 3 bits wide. When we will set the don't shift attribute, we would want absolute value for this flag, which means the lowest value (besides from 0) will be `1 << 12` (The first bit of the flag) and highest value will be `1 << 14` where the jumps between each value will be `1 << 12`

This design for this macro, with insperation from [Proceadural Macro Workshop](https://github.com/dtolnay/proc-macro-workshop#attribute-macro-bitfield) will be a regular Rust struct, with helper attributes.

For example, this struct will represent the flags in the example above (with example helper attributes).

```
#[bitfields]
struct MyFlags {
  #[flag(r)]
  a: B2,
  b: B5,
  #[flag(rwc(30))]
  c: B3,
  #[flag(flag_type = ProtectionLevel)]
  d: B2,
  #[flag(r, dont_shift)]
  e: B3,
  f: B1,
}
```

## Implementing the Macro

### Struct Definition
### Single Bitfield
###
