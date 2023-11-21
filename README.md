# Setup
Clone the repository:
```shell
git clone ...
set VUE_APP_ROOT (pwd)/blog-vue
cd {$VUE_APP_ROOT}
```

Install modules:
```sh
pnpm install
```

Once the API Platform is running, review the API URLs configured in this project:
```shell
cp .env .env.local
cat .env.local
```
Compile and Hot-Reload for Development:
```shell
pnpm dev --host
```
Open browsers and point them to the app (replace the hostname/port here):
```shell
cat ~/bin/chrome
#!/usr/bin/env bash
#

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $@
```
A pair of instances to see the interactions:
```shell
chrome --user-data-dir=/tmp/alpha --no-first-run http://shodan.local:5173 &
chrome --user-data-dir=/tmp/beta --no-first-run http://shodan.local:5173 &
```

With the development tools check the network tab while visiting the "About" page or any other pages that shows resources; there should be several _graphql_ and  _mercure?topic=..._ requests.

If you see CORS errors in the javascript console, review the _cors_ directive in the _Caddyfile_, it must allow the address and port that _pnpm dev --host_ is using.
# See
Check out the docs in the _doc_ folder. These are some things that somebody might find useful:
- [GraphQL Subscription Forwarder](src/lib/urql.ts)  for urql to use the Mercure Hub. Based on [this gist by lukasluecke](https://gist.github.com/lukasluecke/0c8e2c12a955198926779a8691874c03) 
- [An EventSource](src/lib/sse.ts) to support GraphQL subscriptions but also plain Mercure Hub access from Vue.js. Uses a lot of fine-grained reactivity.
