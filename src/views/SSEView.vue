<script setup lang="ts">
import MercureEvent from '@/components/MercureEvent.vue';

import { watch, computed, ref, type Ref, toRefs, reactive } from 'vue'

import { MERCURE_WELL_KNOWN, MERCURE_TOPICS_PREFIX } from '@/config/api';
import { useMercureEventSource, useMercure } from '@/lib/sse'

import MercureEventSourceDebug from '@/components/MercureEventSourceDebug.vue';

const es = useMercure(MERCURE_WELL_KNOWN + '?topic=' + MERCURE_TOPICS_PREFIX + '/posts/{id}', {}, {retry_baseline: 10000, retry_rng_span: 2000 })

const knownEventIDs: Ref<string[]> = ref([])

const { lastEventID } = toRefs(es)

const eventCount = ref(0)

watch(lastEventID, () => {
    eventCount.value++

    if (knownEventIDs.value.unshift(es.lastEventID) >= 16) {
        //  keep it short
        knownEventIDs.value.pop()
    }
})

</script>

<template>
    <MercureEventSourceDebug :source="es" />
</template>