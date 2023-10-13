<script setup lang="ts">
import { RouterView } from 'vue-router'

import { forwardSubscription } from '@/lib/urql'
import { fetchExchange, retryExchange, logExchange, cacheExchange, netExchange } from '@/lib/adv'

import { Client, mapExchange, provideClient, subscriptionExchange } from '@urql/vue';

// Only in Google Chrome ?
//
// import { devtoolsExchange } from '@urql/devtools'

import { GRAPHQL_ENTRYPOINT } from '@/config/api';

import { ref, watch } from 'vue'
import { useOnline, useEventBus, useTimeout } from '@vueuse/core'

import { useQuasar } from 'quasar'

//  check network status
//  TODO check browser support
const isOnline = useOnline()

//  will provide a 'fetch' with a timeout option to urql
async function fetchWithTimeout(
  url: RequestInfo | URL,
  opts: RequestInit | undefined,
  cfg: number
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), cfg)

  const response = await fetch(url, {
    ...opts,
    signal: controller.signal,
  })

  clearInterval(timeout)
  return response
}

//  create a urql client to execute GraphQL operations
const client = new Client({
  url: GRAPHQL_ENTRYPOINT,
  exchanges: [
    //  notifies an operation enters the chain, and a result exits the chain
    netExchange('head'),
    //  console logging
    logExchange('head ', true),
    mapExchange({
      onError(error, operation) {
        console.log(`Operation with ${operation.key} failed: `, error)
      }
    }),
    //otherExchange('foo bar'),
    //  Google Chrome has urql dev tools, uncomment this to send data to them
    // devtoolsExchange,
    logExchange('cache', true),
    cacheExchange,
    // cacheExchange({}),
    logExchange('retry', true),
    retryExchange({
      retryIf: (error) => { return true },
      maxNumberAttempts: 3
    }),
    //  notifies a GraphQL Query operation gets here, a cache miss
    netExchange('fetch', { opf: (op) => { return (op.kind === 'query') } }),
    logExchange('fetch', true),
    fetchExchange,
    logExchange('subs ', true),
    //  see lib/urql.ts
    subscriptionExchange({ forwardSubscription }),
    logExchange('tail ', true)
  ],
  fetch: (url,opts) => fetchWithTimeout(url,opts,5000)
});

provideClient(client);

//  for notifications
const $q = useQuasar()

//  detects a change in network status
watch(isOnline, () => {
  console.log('useOnline : ', isOnline.value)
  if (isOnline.value) {
    $q.notify('You are now online')
  } else {
    $q.notify({message:'You seem to be offline',type:'warning'})
  }
})

//  the urql exchanges above will notify into these some events
const hbus = useEventBus<boolean>('head')
const fbus = useEventBus<boolean>('fetch')

//  use them to animate some UI indication of GraphQL activity
const tick: number = 250
//  an 'operation' gets into the urql client
const { ready: op, start: oprx } = useTimeout(tick, { controls: true })
//  a 'result' gets back from the urql client
const { ready: rx, start: rxrx } = useTimeout(tick, { controls: true })
//  a operation for a GraphQL Query (not a mutation, nor subscription) missed the urql cache
const { ready: fx, start: fxrx } = useTimeout(tick, { controls: true })

//  events start timeouts for the UI animations
function hlistener(event: boolean) {
  if (event) {
    // console.log('[[ OP ]]')
    oprx()
  } else {
    // console.log('[[ RX ]]')
    rxrx()
  }
}

function flistener(event: boolean) {
  if (event) {
    // console.log('[[ FX ]]')
    fxrx()
  }
}

//  subscribe to events
const hsub = hbus.on(hlistener)
const fsub = fbus.on(flistener)

//  provide a 'refresh' UI button
function handleReload() {
  location.reload()
}

</script>

<template>
  <!-- top layout -->
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <q-tabs align="left">
        <q-route-tab to="/" label="Home" />
        <q-route-tab to="/about" label="About" />
        <q-route-tab to="/alt" label="Alt" />
        <q-route-tab to="/ordered" label="Posts" />
        <q-route-tab to="/sse" label="SSE" />
      </q-tabs>
    </q-header>

    <!-- use Vue router and keep components alive  -->
    <q-page-container>
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="$route.fullPath"></component>
        </keep-alive>
      </router-view>
    </q-page-container>
<!-- 
    <q-page-container>
      <router-view></router-view>
    </q-page-container> -->

    <!-- network status, GraphQL activity indicators, refresh button  -->
    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar>
          <q-btn flat disable :label="isOnline ? 'online' : 'offline'" />
          <q-badge :color="!op ? 'orange' : 'gray'">OP</q-badge>
          <q-badge :color="!rx ? 'orange' : 'gray'">RX</q-badge>
          <q-badge :color="!fx ? 'orange' : 'gray'">FX</q-badge>
          <q-btn flat round icon="refresh" color="secondary" @click="handleReload"/>
      </q-toolbar>
    </q-footer>

  </q-layout>
</template>
