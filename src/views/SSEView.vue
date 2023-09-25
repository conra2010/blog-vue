<script setup lang="ts">
import { ref } from 'vue'

import { MERCURE_WELL_KNOWN } from '@/config/api';
import { useMercureEventSource } from '@/lib/sse'

const es = useMercureEventSource(MERCURE_WELL_KNOWN + '?topic=https://caddy.ap.orb.local/posts/{id}%23{op}')

const target = ref(MERCURE_WELL_KNOWN + '?topic=https://caddy.ap.orb.local/posts/{id}')

</script>

<template>
        <h4>lastEventId</h4>
        <div v-if="es.lastEventId">{{ es.lastEventId }}</div>
        <h4>values</h4>
        <div v-for="(value, i) in es.dataFieldsValues.value" :key="i">
            {{ JSON.stringify(value) }}
        </div>
</template>