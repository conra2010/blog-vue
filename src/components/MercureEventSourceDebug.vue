<script setup lang="ts">
import { toRefs, ref, type Ref, watch, computed } from 'vue';
import { useMercure, type MercureSource } from '@/lib/sse'

const props = defineProps<{ source: MercureSource }>()

const { lastEventID, eventType, status, error, lastEventIDOnError } = toRefs(props.source)

const expanded = ref(false)

const eventIDsHistory: Ref<string[]> = ref([])

watch(lastEventID, () => {
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
    <q-card class="my-card">
        <q-card-section>
            <q-input v-model="errorstr" readonly label="Error" stack-label />
            <q-input v-model="lastEventIDOnError" readonly label="Last Event ID on Error" stack-label />
            <q-input v-model="lastEventID" readonly label="Last Event ID" stack-label />
            <q-input v-model="eventType" readonly label="Event Type" stack-label />
            <q-input v-model="status" readonly label="Source Status" stack-label />
        </q-card-section>
        <q-card-actions>
            <q-btn color="grey" round flat dense :icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click="expanded = !expanded" />
        </q-card-actions>
        <q-slide-transition>
            <div v-show="expanded">
                <q-separator />
                <q-card-section style="color: black;"  class="text-subtitle2">
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