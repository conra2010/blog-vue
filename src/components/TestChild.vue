<script setup lang="ts">
import { ref, toRefs } from 'vue';
import { syncRef } from '@vueuse/core';

const props = defineProps<{ strval: string }>()

const { strval } = toRefs(props)

const { strval: localstrval } = props

const lvalref = ref(localstrval)

const uref = ref('')
const stop = syncRef(strval, uref, { direction: 'ltr'})

</script>

<template>
    <div class="test-child">
        <q-card class="my-card text-white q-mb-sm" style="background: radial-gradient(circle, #afdaff 0%, #5a8dbb 100%)">
            <q-card-section>
                <div class="text-h5 q-mt-sm q-mb-xs">
                    <div class="text-h7">Test Child Content</div>
                    <div class="text-h8">
                        toRefs(props) reacts to changes in parent ref: {{ strval }}
                    </div>
                    <q-input v-model="strval" filled label="ReadOnly Child prop toRefs()" placeholder="ref('some string value')" />
                </div>
            </q-card-section>
            <q-card-section>
                <div class="text-h5 q-mt-sm q-mb-xs">
                    <div class="text-h8">
                        destructure props won't react and is not a ref (model): {{ localstrval }}
                    </div>
                    <q-input v-model="localstrval" filled label="Child prop" placeholder="ref('some string value')" />
                </div>
            </q-card-section>
            <q-card-section>
                <div class="text-h5 q-mt-sm q-mb-xs">
                    <div class="text-h8">
                        const uref : {{ uref }}
                    </div>
                    <q-input v-model="uref" filled label="ref(destr Child prop)" placeholder="ref('some string value')" />
                </div>
            </q-card-section>
        </q-card>
    </div>
</template>