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
