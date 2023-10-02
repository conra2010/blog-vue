<script setup lang="ts">
import { RouterView } from 'vue-router'

import { forwardSubscription } from '@/lib/urql'

import { Client, provideClient, cacheExchange, fetchExchange, subscriptionExchange } from '@urql/vue';
import { devtoolsExchange } from '@urql/devtools'

import { GRAPHQL_ENTRYPOINT } from '@/config/api';

import { useNetwork, useDateFormat } from '@vueuse/core'

const {isOnline} = useNetwork()

//  create a urql client to execute GraphQL operations
const client = new Client({
  url: GRAPHQL_ENTRYPOINT,
  exchanges: [
    //  Google Chrome has urql dev tools, uncomment this to send data to them
    //devtoolsExchange,
    cacheExchange, fetchExchange,
    //  see lib/urql.ts
    subscriptionExchange({ forwardSubscription })
  ],
});

provideClient(client);
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

    <q-page-container>
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="$route.fullPath"></component>
        </keep-alive>
      </router-view>
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

