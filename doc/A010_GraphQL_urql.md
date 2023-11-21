This is the library that provides access to GraphQL operations.
# Code
```shell
alias vfile 'open -a "Visual Studio Code"'
```
```shell
alias vfile 'open -a "Sublime Text"'
```
## Client
The library wants us to create a _client_ that will be responsible for executing operations and getting results back into our application.
```
vfile src/App.vue
```

It is a _chain_ of _exchanges_ that "forwards" operations and receives results that flow back up. I'm using several "log" exchanges to provide info in the javascript console; a pair of "net" exchanges are also inserted into the chain to signal events about "network/graphql activity" that will be shown in the UI. The other exchanges are from the library.
```
>> operations >>
>> (NET) >> CACHE >> RETRY >> (NET) >> FETCH >> SUBSCRIPTION >>
                                                  << results <<
```

For instance, the first "net" exchange sees all operations, the second one only those (queries only) that miss the cache.
## Queries
Queries and mutations are pretty straight forward. Subscriptions are much more complex.

This component contains a GraphQL Query to get the "Post" IDs, even though it will instantiate only one component to manage the first Post.
```
vfile src/views/AboutView.vue
```

Queries can have variables. This component receives as a _prop_ the ID of the resource, and uses it to request details about the resource to the GraphQL API.
```
vfile src/components/PostSummary.vue
```
## Mutations
## Subscriptions
The library needs us to configure something that will be providing results as server events arrive; that is a function that given a GraphQL subscription operation, will eventually be used to construct a _source_ of results when the library _subscribes_ to it.

In our case, we want to make one request to the API Platform in order to get a Mercure URL for the subscription. Then, we want to create an _EventSource_ (kind of) to listen for Mercure notifications and use those as results to pass through the _source_ into the library.

```
vfile src/lib/urql.ts
```

I'm also using the _extensions_ property of the results to pass extra information about the status of the event source back to the UI component.

The actual Mercure source of events is defined here:
```
vfile src/lib/sse.ts
```

Keeps track of several pieces of info, parses the data received into JSON, and tries to reconnect on error with the last known event ID, which Mercure seems to use. It also knows about the different event types the modified API Platform may send.

