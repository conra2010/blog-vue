This is a [Vue.js](https://vuejs.org/) application that uses GraphQL operations to interact with the API Platform. The UI library used is [Quasar](https://quasar.dev/) and the GraphQL library is [urql](https://github.com/urql-graphql/urql).

It expects a modified version of the API Platform (see sample project ref) with a "Post" resource and fixture data loaded.

The main Vue component is _PostSummary_. Given a Post resource ID, the component will query the details to show and create a GraphQL subscription to receive server events about changes on that resource. It uses another Vue component, _FieldChangeTracker_, that implements the edition of a field, with conflict detection when another user edits the same field in the resource. The "Delete" button does just that, and the "Like" button modifies another field.

In the component there are several badges with IDs to debug/trace what's happening. The first ID "vue:..." is a unique identifier of the Vue component instance. The next one is the resource ID in the API Platform. Then we have the "sse:..." identifier of the event source, the "subs:..." GraphQL subscription and the "urn:uuid:..." last event received.

There's also a lot of information dumped in the javascript console, mostly about GraphQL operations/results and server side events.

# About/Alt
The first two tabs contain one instance of the Vue component each, tracking the same resource in the API Platform. Notice that the GraphQL subscription ID is the same for both instances, because of the changes in the platform code.

These tabs are actually a _hack_ of the third one. The complete list of resource IDs is retrieved, but here we are only showing the first ID.

Any edition should trigger a server sent event for both instances. If we delete the resource, the list of resources is refreshed (asking the server, not using the cache) and the new first ID is shown.

# Posts
The same as the first two tabs, but a Quasar _virtual scroll_ is used to show all the IDs. One Vue component for each, with the corresponding GraphQL subscription, but only "n" are kept active at a time. Check the console while scrolling down/up.

# SSE
A simple Vue component to debug a Mercure event source.
