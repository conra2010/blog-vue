<script setup lang="ts">
import { toRefs, ref, type Ref, watch, computed, h } from 'vue';
import { useMercure, type MercureSource } from '@/lib/sse'

import { onMounted } from 'vue';
import anime from 'animejs'
import { useMutationObserver } from '@vueuse/core';

const el = ref()

onMounted(() => {
    const mut = useMutationObserver(el, (mutations) => {
        // console.log(mutations[0].type)
        if (mutations[0].type === 'characterData') {
            anime({
                targets: [ '.content' ],
                rotate: '+=5',
                duration: 500,
                loop: false
            })
        }
    }, { subtree: true, childList: true, characterData: true, attributes: true })
})

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
    <div class="container">
        <div class="content" style="scale: 0.50">
<svg
   width="100mm"
   height="100mm"
   viewBox="0 0 100 100"
   version="1.1"
   id="svg1"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <defs
     id="defs1" />
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1">
    <rect
       style="fill:none;fill-opacity:0.176166;stroke:#ffffff;stroke-width:1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;opacity:0.3"
       id="rect1"
       width="99.009903"
       height="99.009903"
       x="0.49504951"
       y="0.49504951" />
    <path
       style="opacity:0.3;fill:none;fill-opacity:0.176166;stroke:#ffffff;stroke-width:1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 25,50 H 75"
       id="path1"
       sodipodi:nodetypes="cc" />
    <path
       style="opacity:0.3;fill:none;fill-opacity:0.176166;stroke:#ffffff;stroke-width:1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 50,35 V 65"
       id="path2"
       sodipodi:nodetypes="cc" />
  </g>
</svg>

            <!-- <p>Hello!</p> -->
        </div>
    </div>
    <q-card class="q-pa-none bg-grey-8 text-white ">
        <q-list dense>
            <q-item>
                <q-item-section>Source Status:</q-item-section>
                <q-item-section class="col-7">{{ status }}</q-item-section>
            </q-item>
            <q-item>
                <q-item-section>
                    <q-item-label class="text-white" caption>
                        Last Event ID:
                    </q-item-label>
                    <q-item-label>
                        <q-badge ref="el" class="other">{{ lastEventID !== '' ? lastEventID : 'n/a' }}</q-badge>
                    </q-item-label>
                </q-item-section>
            </q-item>
            <q-item>
                <q-item-section>Last Event Type:</q-item-section>
                <q-item-section class="col-7">
                    {{ eventType }}
                </q-item-section>
            </q-item>
            <q-item>
                <q-item-section>
                    <q-item-label class="text-white" caption>
                        Last Event ID on Error:
                    </q-item-label>
                    <q-item-label>
                        <q-badge>{{ lastEventIDOnError !== '' ? lastEventIDOnError : 'n/a' }}</q-badge>
                    </q-item-label>
                </q-item-section>
            </q-item>
        </q-list>
    </q-card>
    <q-card class="top-card q-pa-none bg-grey-8 text-white">
        <q-card-actions>
            <q-checkbox v-model="verbose" label="console.log" />
            <q-btn color="grey" round flat dense :icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
                @click="expanded = !expanded" />
        </q-card-actions>
        <q-slide-transition>
            <div v-show="expanded">
                <q-separator />
                <q-card-section  class="text-subtitle2">
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