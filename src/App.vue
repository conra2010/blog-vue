<script setup lang="ts">
  import { RouterView } from 'vue-router'

  import { forwardSubscription } from '@/lib/urql'

  import { Client, provideClient, cacheExchange, fetchExchange, subscriptionExchange } from '@urql/vue';
  import { devtoolsExchange } from '@urql/devtools'

  import { GRAPHQL_ENTRYPOINT } from '@/config/api';

  const client = new Client({
    url: GRAPHQL_ENTRYPOINT,
    exchanges: [
      //altDebugExchange,
      devtoolsExchange,
      cacheExchange, fetchExchange,
      subscriptionExchange({forwardSubscription})
    ],
  });

  provideClient(client);
</script>

<template>
  <div class="v-cloak">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" :key="$route.fullPath"></component>
      </keep-alive>
    </router-view>
  </div>
</template>
