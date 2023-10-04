# Setup
```sh
pnpm install
```

Once the API Platform is running, review the API URLs configured in this project:
```shell
src/config/api.ts
```
Compile and Hot-Reload for Development:
```sh
pnpm dev --host
```
Open a browser and point it to the app (replace the hostname/port here):
```shell
open http://shodan.local:5173/ordered
```
With the development tools check the network tab; there should be several _graphql_ and  _mercure?topic=..._ requests.
Each Vue component that's responsible for a "Post" resource subscribes to changes in several fields (author, title, etc.); if this is using a modified API Platform, the topics shown in the requests should be different for each Vue component.
# POSTS
## OrderedHomeView
The component uses a GraphQL query to retrieve IDs of all the posts (pagination is disabled in the API Platform). A Vue _computed_ reference _iris_ will always have the array of IDs, even if we refetch the query.
The _template_ renders a Quasar virtual scroll, using a component _PostSummaryItem_ when it needs to show a Post. This template will react to changes in the array of IDs, and tries to do so efficiently.
With _useMercureDelta_ we have updated sets of "inserted IDs" and "deleted IDs". In the example, the component will refetch the IDs on deletion (updates the view too)  and push IDs on the top of the data on insertion (not sure about this one).
## PostSummaryItem
Doesn't do a lot. Some component lifecycle logging. Receives as props the ID of the Post and the sets of inserted and deleted IDs. Wanted to implement a delete by swiping here (iOS style).
## PostSummary
Receives the ID of a Post, and uses GraphQL to query some details, subscribe to changes on some fields, and mutations to change "Author", "Title", "Stars", and delete the resource.
The _template_ renders details and some buttons to test the GraphQL mutations. It uses a component _FieldChangeTracker_ that implements a more complex edition logic for fields "Author" and "Title".
### Subscription

# SSE
A debug component to show events coming in from Mercure, listens to the topic about Posts, any ID:
```shell
https://caddy.api-platform/posts/{id}
```
## Events
To receive some events, use the GraphQL Playground to execute operations; notice the event type is included in the message, if the modified API Platform is used.

Create a new resource:
```graphql
mutation {
  createPost(input:{
    title: "Title of the Post",
    author: "Author of the Post",
    version: "0.1.0",
    stars: 2
  }) {
    post {
      id
    }
  }
}
```
, update an existing resource:
```graphql
mutation {
  updatePost (input:{
    id:"/posts/11",
  	clientMutationId:"urn:playground:57cf9a2f",
    title:"How to..."
  }) {
    clientMutationId
  }
}
```
or delete a resource:
```graphql
mutation {
  deletePost(input:{id:"/posts/11",
  clientMutationId:"urn:playground:a8c9f426"}) {
    clientMutationId
  }
}
```
## Disconnects
When an event source gets disconnected, we try to reconnect with the last known event ID. Mercure seems to send the events we've missed.

Move into the API Platform project and setup some variables to send updates using the shell (see the API Platform project):
```shell (fish)
set CA_BUNDLE (pwd)/api/docker/ca/ca-bundle.crt
set AP_ENTRYPOINT https://caddy.api-platform.orb.local
set MERCURE_ENTRYPOINT https://caddy.api-platform.orb.local
set MERCURE_TOPICS_PREFIX https://caddy.api-platform.orb.local
open $MERCURE_ENTRYPOINT/.well-known/mercure/ui/#discover
```
Copy the JWT token and save it into another variable:
```shell (fish)
set JWT_TOKEN (pbpaste)
```
Now start publishing fake updates to the topic:
```shell
seq 1000 | while read line; \
	# source a sequence of numbers
	# timestamp
    set TS (date); \
    # data to send to Mercure
    set DTA '{"SEQ":"'$line'","ts":"'$TS'"}'; \
    # POST it to the topic
    set RESPONSE (http --verify $CA_BUNDLE -b --ignore-stdin -f POST \
	    {$MERCURE_ENTRYPOINT}/.well-known/mercure \
	    topic={$MERCURE_TOPICS_PREFIX}'/posts/1' \
	    data=$DTA \
	    "Authorization:Bearer $JWT_TOKEN" \
	    type='message'); \
	# print some feedback and response
    echo $line: '{"rq":'$DTA',"rx":{"id":"'$RESPONSE'"}}'; \
    # wait
    sleep 5; \
end
```
Notice we are using a type of 'message', just to show that the Chrome Network inspector only shows the event stream for events of that type.
After some events are received, we go offline by changing "No throttling" to "Offline". The event source should detect that and close the connection; go back to "No throttling" and after a few seconds the event source should try to reconnect and tell Mercure the ID of the last event received.