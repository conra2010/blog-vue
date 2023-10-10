<script setup lang="ts">
import { RouterView } from 'vue-router'

import { forwardSubscription } from '@/lib/urql'
import { fetchExchange, logOpsExchange, retryExchange, logExchange, cacheExchange, otherExchange } from '@/lib/adv'
// import { cacheExchange } from '@urql/exchange-graphcache'

import { Client, mapExchange, provideClient, subscriptionExchange } from '@urql/vue';
import { devtoolsExchange } from '@urql/devtools'

import { GRAPHQL_ENTRYPOINT } from '@/config/api';

import { watch } from 'vue'
import { useNetwork, useDateFormat, useOnline } from '@vueuse/core'

import { useQuasar } from 'quasar'
import { useCounterStore } from './stores/counter';
import { pipe, toObservable } from 'wonka';
import { valueFromAST } from 'graphql';
import { signalingExchange } from './lib/adv/logExchange';

const { retry$, nextRetryString } = useCounterStore()

const foo = pipe(retry$, 
  toObservable)

foo.subscribe({
  next: (value) => console.log(value),
  complete: () => {},
  error: () => {}
})

const isOnline = useOnline()

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
    //  Google Chrome has urql dev tools, uncomment this to send data to them
    logExchange('head '),
    mapExchange({
      onError(error, operation) {
        console.log(`Operation with ${operation.key} failed: `, error)
      }
    }),
    //otherExchange('foo bar'),
    devtoolsExchange,
    logExchange('cache'),
    cacheExchange,
    // cacheExchange({}),
    logExchange('retry'),
    retryExchange({
      retryIf: (error) => { return true },
      maxNumberAttempts: 3
    }),
    logExchange('fetch'),
    fetchExchange,
    //  see lib/urql.ts
    logExchange('subs '),
    subscriptionExchange({ forwardSubscription })
  ],
  fetch: (url,opts) => fetchWithTimeout(url,opts,5000)
});

provideClient(client);

const $q = useQuasar()

watch(isOnline, () => {
  console.log('useOnline : ', isOnline.value)
  if (isOnline.value) {
    $q.notify('You are now online')
  } else {
    $q.notify({message:'You seem to be offline',type:'warning'})
  }
})
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white" height-hint="98">
      <!-- <q-toolbar>
        <q-toolbar-title>
          <q-avatar>
            <img src="https://cdn.quasar.dev/logo-v2/svg/logo-mono-white.svg">
          </q-avatar>
          Title
        </q-toolbar-title>
      </q-toolbar> -->

      <q-tabs align="left">
        <q-route-tab to="/ordered" label="Posts" />
        <q-route-tab to="/sse" label="SSE" />
        <q-route-tab to="/about" label="About" />
      </q-tabs>
    </q-header>
<!-- 
    <q-page-container>
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="$route.fullPath"></component>
        </keep-alive>
      </router-view>
    </q-page-container> -->

    <q-page-container>
      <router-view></router-view>
    </q-page-container>

    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar>
          <q-btn flat disable :label="isOnline ? 'online' : 'offline'" />
      </q-toolbar>
    </q-footer>

  </q-layout>
</template>
        <!-- <q-header>
          <q-tabs>
            <q-route-tab to="/ordered" name="posts" label="Posts" />
            <q-route-tab to="/sse" name="sse" label="SSE" />
            <q-route-tab to="/about" name="about" label="About" />
          </q-tabs>
        </q-header>

            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" :key="$route.fullPath"></component>
              </keep-alive>
            </router-view> -->

