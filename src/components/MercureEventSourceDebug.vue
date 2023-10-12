<script setup lang="ts">
import { toRefs, ref, type Ref, watch, computed } from 'vue';
import { useMercure, type MercureSource } from '@/lib/sse'

const props = defineProps<{ source: MercureSource }>()

const { lastEventID, eventType, status, error, lastEventIDOnError, dataFieldsValues } = toRefs(props.source)

const verbose = ref(true)

const expanded = ref(false)

const eventIDsHistory: Ref<string[]> = ref([])

watch(lastEventID, () => {
    if (verbose.value) {
        console.log(lastEventID.value)
        console.log(eventType.value)
        console.log(JSON.stringify(dataFieldsValues.value))
    }
    if (eventIDsHistory.value.unshift(lastEventID.value) > 64) {
        eventIDsHistory.value.pop()
    }
})

const errorstr = computed(() => {
    if (error.value) {
        return error.value.type
    }

    return 'n/a'
})
</script>

<template>
        <!-- 

    <q-badge color="orange" text-color="black" label="2" />

    <q-badge color="purple">
      <q-icon name="bluetooth" color="white" />
    </q-badge>
 -->

    <q-card class="top-card">
        <q-card-section>
            <q-badge color="blue">
                {{ status }}
            </q-badge>
            <q-badge v-if="status !== 'OPEN'" color="red">
                12 <q-icon name="warning" color="white" class="q-ml-xs" />
            </q-badge>
        </q-card-section>
        <q-card-section>
            <p>last event type: {{ eventType }}</p>
            <p>lastEventID: {{ lastEventID }}</p>
            <p>status: {{ status }}</p>
            <p>lastEventID on error: {{ lastEventIDOnError }}</p>
        </q-card-section>
        <q-card-actions>
            <q-checkbox v-model="verbose" label="console.log" />
            <q-btn color="grey" round flat dense :icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click="expanded = !expanded" />
        </q-card-actions>
        <q-slide-transition>
            <div v-show="expanded">
                <q-separator />
                <q-card-section style="color: black;"  class="text-subtitle2">
                    <p>event IDs</p>
                    <div class="q-ma-md">
                        <q-scroll-area style="height: 500px; ">
                            <div v-for="(item, index) in eventIDsHistory" :key="index" class="q-py-xs">
                                <p>{{ index }} {{ item }}</p>
                            </div>
                        </q-scroll-area>
                    </div>
                </q-card-section>
            </div>
        </q-slide-transition>
    </q-card>
</template>

<style>
.top-card {
    color: black;
}
</style>