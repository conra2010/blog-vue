<script setup lang="ts">
  import { RouterView } from 'vue-router'

  import { forwardSubscription } from '@/lib/urql'

  import { Client, provideClient, cacheExchange, fetchExchange, subscriptionExchange } from '@urql/vue';
  import { devtoolsExchange } from '@urql/devtools'

  import { GRAPHQL_ENTRYPOINT } from '@/config/api';
  //  create a urql client to execute GraphQL operations
  const client = new Client({
    url: GRAPHQL_ENTRYPOINT,
    exchanges: [
      //  Google Chrome has urql dev tools, uncomment this to send data to them
      //devtoolsExchange,
      cacheExchange, fetchExchange,
      //  see lib/urql.ts
      subscriptionExchange({forwardSubscription})
    ],
  });

  provideClient(client);
</script>

<template>
  <div class="q-pa-md">
    <q-toolbar class="bg-primary text-white q-my-md shadow-2">
      <q-btn flat round dense icon="menu" class="q-mr-sm" />
      <q-separator dark vertical inset />
      <q-btn stretch flat label="Home" to="/" />
      <q-separator dark vertical inset />
      <q-btn stretch flat label="Ordered" to="/ordered" />
      <q-separator dark vertical inset />
      <q-btn stretch flat label="Table" to="/table" />
      <q-separator dark vertical inset />
      <q-btn stretch flat label="Test" to="/test" />
      <q-space />
      <q-separator dark vertical />
      <q-btn stretch flat label="SSE" to="/sse" />
      <q-separator dark vertical />
      <q-btn stretch flat label="About" to="/about"/>
    </q-toolbar>
  </div>
  <div class="v-cloak">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" :key="$route.fullPath"></component>
      </keep-alive>
    </router-view>
  </div>
</template>
