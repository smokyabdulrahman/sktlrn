# sktlrn
Learning sockets and mass communication by implementing a clone of [One Million Checkboxes](https://onemillioncheckboxes.com/)

# Introduction
I was facinated by the idea of [One Million Checkboxes](https://onemillioncheckboxes.com/). A simple idea, yet gathers a lot of important concepts:
- sockets (handling connection, reconnection, broadcasting and implementing your own protocol on top of it)
- data transfer optimization (using json to represnet the state of a million checkboxes to many clients isn't feasible)
- dom manipulation optimization (rendering a million dom element isn't feasible)
- rate-limiting (You don't want clients to spam the server with frequent requests)
- handling race conditions (since by the nature of the game, a lot of clients are manipulating the same thing concurrently)

Thus, I wanted to undergo the challange of building a clone while utilizing the minimum number of dependencies as I can.

# TODOs
[] Use redis to store state to scale.
[] Bulk state updates to clients instead of an update each time a checkbox is clicked.
[] Show number of checkboxes checked.
[] Once a checkbox is clicked it can't be unchecked. 
[] Prevent users from zooming out too much to not render a lot of dom elements, instead implement minimap view (100*1000 canvas showing the state of the checkboxes)
