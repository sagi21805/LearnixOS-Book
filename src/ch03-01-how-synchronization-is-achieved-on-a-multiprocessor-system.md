# How Synchronization is Achieved on a Multiprocessor System

_"There are two ways of constructing a software design: One way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies." - C.A.R. Hoare_

---

#![repository_card]

## What is Our Goal

Before we even start to explain the topics of synchronization, let's first try to understand what we want to achive. 

So, first of all, we want to run multiple tasks at once, or in the realistic state of our OS, to run multiple functions concurrently. These functions share the system processor, memory and other resources that are available to the program.

When these functions run one after the other in our code, even if they share the system memory, we have some control over how they share it `safely`. For example, in Rust, the borrow checker ensures that there are only multiple immutable references to some shared data, OR a single mutable reference to the data.

This ensures that on each line of our code, the same shared resource can either read from, or write to the resource at a time.

When sharing a resource across multiple execution threads (i.e. different functions), we can't staticly ensure with the borrow checker that the same rules are enforced.
For example, if one thread tries to write to the resource, while the other read, it may read an outdated value.

## Study Case

Suppose that we have a warehouse with multiple storage units. Each storage unit can be used by a customer to store their goods. Each time a customer comes to the front desk, it may ask the cashier if there are any available storage units. If there are, the cashier will give one to the customer. Otherwise, the customer will have to wait until a storage unit becomes available.

## Semaphores

For the cashier to do it's job properly, he needs to some how keep track of the number of available storage units. In this example, we can imagine he keeps a counter, the counter will start with the amount of the available storage units. Each time a customer rents a unit, the counter is decremented, and each time a customer returns a unit, the counter is incremented.

The concept of saving an object that tracks the state of our resource is called a [`semaphore`](https://en.wikipedia.org/wiki/Semaphore_(programming)). 

> [!NOTE]
>
> Another simple example of a semaphore can be a boolean flag that indicates whether a resource is available or not.
> if B is true, the resource is available, if B is false, the resource is not available.

In Rust, a semaphore for a certain object may look something like this.
```
pub struct Object<T> {
    data: T,
    state: State,
}

pub enum State {
    Available,
    InUse,
    Unavailable,
}

impl<T> Object<T> {

  pub fn get_mut(&mut self) -> Option<&mut T> {
    if let State::Available = self.state {
      Some(&mut self.data)
    } else {
      None
    }
  }

}
```


## Atomic Operations

This solution at first sounds great, because now we can track the numbers of available storage units and decrement/increment them as needed. In fact, this solution worked so great, that our cashier is at full capacity, and can't handle any more customers. So, we hire another one.

But now we have a different problem, we have multiple cashiers, and they need to some how `sync` their count to avoid conflicts.

For this problem I can think of two solutions:

1. Split the amount of storage units to the amount of cahsiers we have, and then each cashier will keep a count of the number of storage units they are responsible for.

2. Have a `global` counter that each cashier have access that can be used only one cashier at a time. 

In the first solution, each cashier will have it's own count, and it will be independent from the rest of the cashiers. The problem with that, is that the customers are split randomly between the cashiers, and each customer will need the storage unit for an unknown amount of time. 

This means that in some edge case, some of the cashiers will not have any more storage units available, even though other cashiers might have all of thier storage units available. This will result in poor performance and customer dissatisfaction because now, for the same stream of customers, only a portion of the cashiers will be able to serve them, while the rest will be idle.

While we can think of some mechanism that cashiers can use to share thier counts with each other, this will quickly become very complicated.

For the second solution, we can have a `global` counter that each cashier have access to, but only one cashier can use it at a time. This will ensure that the counter is always consistent, and that no two cashiers will be able to modify it at the same time.

This is where `Atomic Operations` come in. Atomic operations are instructions in our CPU, that are guaranteed to be executed in one instant, and cannot be interfeared with by other instructions. Each CPU architecture has its own set of atomic operations, but the basic idea is the same.

_Later in this chapter we are going to cover both x86 and ARM architectures._

In Rust, these operations are provided by the `core::sync::atomic` module.

### Types of Atomic Operations

```
// For now the memory ordering does not matter, but it will be explained in depth later.
use core::sync::atomic::{AtomicUsize, Ordering};

static COUNTER: AtomicUsize = AtomicUsize::new(0);

// Although this function uses atomic load and store opeartions, 
// which read or write to the counter atomically.
// The addition is wrong, and still not atomic.
fn add_one() {
    let value = COUNTER.load(Ordering::Relaxed);

    // Between these lines, other core might have accessed the counter and modified it.
    // The local value is not guaranteed to be the same as the counter's value when we store.
    
    COUNTER.store(value + 1, Ordering::Relaxed);
}

fn add_two() {
    // The fetch_add operation is atomic, and will not be interrupted by other threads, because in one instruction it reads the value, adds 2, and stores it back.
    COUNTER.fetch_add(2, Ordering::Relaxed);
}
```


# Memory ordering

Explain that it is relevant in two ways, the first is the compiler to avoid certain optimizations, the second is the CPU to avoid certain reordering 

## As-If Optimizations

## Out of Order Execution

## Weak Memory Ordering

## Strong Memory Ordering

## Fetch and Modify Operations 

## Fences

## Expirment
