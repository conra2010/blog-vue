# SSE
A debug component to show events coming in from Mercure, listens to the topic about Posts, any ID:
```shell
http://{$SERVER_NAME}/posts/{id}
```
## Events
To receive some events, use the GraphQL Playground to execute operations; notice the event type is included in the message if the modified API Platform is used. Google Chrome dev tools show the event stream.

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

Move into the API Platform project and *setup some variables* to send updates using the shell (see the API Platform project).

Now start publishing fake updates to the topic:
```shell
seq 1000 | while read line; \
	# source a sequence of numbers
	# timestamp
    set TS (date); \
    # data to send to Mercure
    set DTA '{"SEQ":"'$line'","ts":"'$TS'"}'; \
    # POST it to the topic
    set RESPONSE (httpx -b --ignore-stdin -f POST \
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

After some events are received, go offline by changing "No throttling" to "Offline". The event source should detect that and close the connection; go back to "No throttling" and after a few seconds the event source should try to reconnect and tell Mercure the ID of the last event received.