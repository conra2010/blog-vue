<script setup lang="ts">
import { ref } from 'vue'

import { MERCURE_WELL_KNOWN } from '@/config/api';
import { useMercureEventSource } from '@/lib/sse'

const es = useMercureEventSource(MERCURE_WELL_KNOWN + '?topic=https://caddy.ap.orb.local/posts/{id}')

</script>

<template>
    <div v-if="es.lastEventId.value">
        <q-card class="my-card text-white" style="background: radial-gradient(circle, #35a2ff 0%, #014a88 100%)">
            <q-card-section>
                <div class="row items-center no-wrap">
                    <div class="col">
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