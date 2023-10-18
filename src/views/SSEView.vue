<script setup lang="ts">
import MercureEvent from '@/components/MercureEvent.vue';

import { watch, computed, ref, type Ref, toRefs, reactive } from 'vue'

import { MERCURE_TOPICS_PREFIX, MERCURE_WELL_KNOWN } from '@/config/api';
import { useMercureEventSource, useMercure } from '@/lib/sse'

import MercureEventSourceDebug from '@/components/MercureEventSourceDebug.vue';
import { useCounterStore } from '@/stores/counter';

const es = useMercure(MERCURE_WELL_KNOWN + '?topic=' + MERCURE_TOPICS_PREFIX + '/posts/{id}', {}, {
    //  reconfigure timeout on error
    //
    //  Mercure has a config timeout that it uses to close
    //  connections; don't know why it does that, and it can
    //  be disabled, but just in case we'll automatically
    //  try to reconnect
    //
    retry_baseline_fn(n) {
        // return '5s', '1m', ... durations
        const steps = ['250ms', '1s', '1s', '1s', '5s', '20s']
        // const steps = ['250ms']
        if (n <= steps.length) { return steps[n - 1] }
        //  no more retries
        return 'infinity'
    },
    //  baseline + random small variation (ms)
    retry_rng_span: 250
})

const knownEventIDs: Ref<string[]> = ref([])

const { lastEventID } = toRefs(es)

const eventCount = ref(0)

const { nextRetryString } = useCounterStore()

watch(lastEventID, () => {
    eventCount.value++
    nextRetryString(lastEventID.value)
    if (knownEventIDs.value.unshift(es.lastEventID) >= 16) {
        //  keep it short
        knownEventIDs.value.pop()
    }
})

</script>

<template>
    <MercureEventSourceDebug :source="es" />
</template>