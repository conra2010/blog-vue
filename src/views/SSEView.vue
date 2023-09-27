<script setup lang="ts">
import MercureEvent from '@/components/MercureEvent.vue';

import { computed, ref, type Ref, toRefs, reactive } from 'vue'

import { MERCURE_WELL_KNOWN } from '@/config/api';
import { useMercureEventSource, toDisplayStringx } from '@/lib/sse'

const es = useMercureEventSource(MERCURE_WELL_KNOWN + '?topic=https://caddy.ap.orb.local/posts/{id}')

function useSomething() {

    const dta: Ref<string> = ref('hello world!')

    function changeValue(val: string) {
        dta.value = val;
    }

    return reactive({
        dta, changeValue
    })
}

const smth = useSomething()

const imodel = ref('')

// watch(es.lastEventId, () => {
//     console.log(es.lastEventId.value)
// })

const cref = computed(() => {
    if (es.lastEventId !== undefined) {
        const foo = toDisplayStringx(es.lastEventId)
        console.log(foo)

        return es.lastEventId
    }
    return '(undefined)'
})

const other = ref('some value here')

const { yetAnotherCounter } = toRefs(es)

</script>

<template>
    <p>Some Data in object: {{ smth.dta }}</p>
    <input v-model="imodel" placeholder="some data" />
    <q-btn label="Save" @click="smth.changeValue(imodel)" />
    <hr />
    <p>Model: {{ imodel }}</p>
    <div v-if="es.lastEventId">
        <MercureEvent :event="es" />
        <q-card class="my-card text-white" style="background: radial-gradient(circle, #35a2ff 0%, #014a88 100%)">
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
                        <p>{{ es.yetAnotherCounter }}</p>
                        <p>{{ other }}</p>
                        <p>{{ cref }}</p>
                        <div class="text-h6">{{ es.lastEventId }}</div>
                        <div class="col-auto text-grey text-caption q-pt-md row no-wrap items-center">{{ es.eventType }}
                        </div>
                    </div>
                </div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="form-point">foo bar</div>
            </q-card-section>
        </q-card>
    </div>
</template>