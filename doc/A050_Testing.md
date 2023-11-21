# Mockttp
> [Mockttp](https://github.com/httptoolkit/mockttp) lets you intercept, transform or test HTTP requests as part of your test suite, or you can use Mockttp to build custom HTTP proxies that capture, inspect and/or rewrite HTTP in any other kind of way you like.

This has proven to be useful to test errors, acting as a proxy between the browser and the API Platform. The basic script is a _passthrough_ proxy:
```javascript
(async () => {
	var _ = require('lodash');
	const m = require('mockttp');
	
	const s = m.getLocal({
		https: {
			keyPath: 'app/root_ca.key',
			certPath: 'app/root_ca.pem'
		}
	});

	s.enableDebug();
	s.forUnmatchedRequest().thenPassThrough();

	await s.start();

	console.log(`server on port ${s.port}`);
})();
```

Start it:
```shell
NODE_EXTRA_CA_CERTS=$CA_BUNDLE node passThrough.test.js
```

And then tell Chrome to use the mock server port as proxy:
```shell
chrome --proxy-server=localhost:8000 --user-data=/tmp/alpha --no-first-run 
```

## Status 500 GraphQL
Let's intercept the request for a particular GraphQL operation:
```javascript
	// ...
	s.enableDebug();
	const servername = 'ukemochi.elf-basilisk.ts.net';

	s.forPost(servername + "/graphql")
		.withJsonBodyIncluding({'operationName':"FastTrackingSubscription"})
		.thenReply(500);

	s.forUnmatchedRequest().thenPassThrough();
	// ...
```

# Status 500 Twice
To test the _retry_ exchange of urql, intercept and reply twice with status 500:
```javascript
	// ...
	const servername = ...

	s.forPost(servername + "/graphql")
		.withJsonBodyIncluding({'operationName':"PostDetails"}).twice()
		.thenReply(500);

	s.forUnmatchedRequest().thenPassThrough();
	// ...
```

## Status 404 on Mercure
```javascript
	// ...
	s.forGet("/.well-known/mercure").thenReply(404);
	// ...
```

## Remove URL from reply
GraphQL subscriptions reply contain the URL to connect to Mercure in order to receive events. Let's remove that:
```javascript
	// ...
	s.forPost(servername + "/graphql")
		.withJsonBodyIncluding({'operationName':"FastTrackingSubscription"})
		.thenPassThrough({
			beforeResponse: async (response) => {
				// the real response
				const hx = response.headers;
				const rx = await response.body.getJson();
				// change body
				const prx = _.omit(rx, 'data.updatePostSubscribe.mercureUrl');
				const phx = hx;
				// new 'content-length'
				const text = JSON.stringify(prx);
				phx['content-length'] = text.length;
				// reply
				return {
					headers: phx,
					body: text
				}
			}
		});
	s.forUnmatchedRequest().thenPassThrough();
```
