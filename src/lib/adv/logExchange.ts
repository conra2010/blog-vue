import { useSignalsStore } from '@/stores/signals';
import { mapExchange, type Exchange, type Operation } from '@urql/core'
import { shallowRef, toRefs, type ShallowRef } from 'vue';
import { fromArray, merge, pipe, map, filter, subscribe, makeSubject } from 'wonka';
import { truncate } from 'lodash'

export const nopExchange = ({ client, forward }) => {
    //  ExchangeIO function
    //
    //  NOP exchange will forward all ops and return
    //  all results
    //
    return ops$ => {
        //  receive a stream of Operations from previous exchange
        //  
        //  usually query, mutation, subscription and teardown, but
        //  expect other types too
        //  => DON'T drop unknow operations
        //  => DO forward operations we don't handle
        //
        //  things are synchronous until something async takes place
        //  => order exchanges, sync first

        //  (optionally modify operations)
        const forwardops$ = ops$;

        //  forward(stream) calls the next exchange IO function
        const oprx$ = forward(ops$);

        //  we get back the next exchange's stream of results

        //  (optionally modify results)

        //  return results to previous exchange's forward(stream)
        return oprx$;
    };
};

export const signalingExchange = (options: string): Exchange => {

    //  const/vars here
    const { signal, unlink }= useSignalsStore()

    return ({ forward }) => ops$ => {

        const orpx$ = forward(ops$)

        const ex$ = pipe(orpx$,
            filter(value => {
                if (value.operation.kind !== 'teardown') {
                    if (value.error) {
                        let k = value.operation.key
                        let s = signal(k)

                        s!.value = true
                    }
                } else {
                    unlink(value.operation.key)
                }
                return true
            }))

        return ex$;
    }
}

export const otherExchange = (options: string): Exchange => {

    //  const/vars here

    return ({ forward }) => ops$ => {
        const { source: retry$, next: nextRetryOperation } = makeSubject<Operation>()

        const processing$ = pipe(retry$,
            filter(operation => {
                console.log('processing ', operation.kind)
                return false
            })
        )

        return pipe(merge([ops$, processing$]),
            map(operation => {
                nextRetryOperation(operation)
                return operation
            }),
            forward
        )
    }
}

export const logOpsExchange = ({ client, forward }) => {
    return ops$ => {

        const pre$ = pipe(
            ops$,
            map(operation => {
                console.log('PRE  ', JSON.stringify(operation))
                return operation
            })
        )

        const rx$ = forward(pre$)

        const post$ = pipe(rx$,
            map(result => {
                console.log('POST ', JSON.stringify(result))
                return result
            })
        )

        return post$;
    }
}

export const logExchange = (urn: string, summary: boolean) => {

    const short = (n: number) => (x: string) => truncate(x, {length:n})

    const s24 = short(24)

    return mapExchange({
        onOperation(op) {
            const doc = truncate(op.query.loc?.source.body, {'length':32})
            if (summary) {
                console.log('>> OP >> ', s24(urn), '/', op.key, ' ', op.kind, ' ', doc)
            } else {
                console.log('>> OP >> ', s24(urn), '/', op.key, ' ', doc, ' >> ', op)
            }

            // const ax = fromArray([1,2,3])
            // const bx = fromArray([4,5,6])

            // pipe(
            //     merge([ax, bx]),
            //     subscribe((x) => console.log(x))
            // )
        },
        onResult(rx) {
            const doc = truncate(rx.operation.query.loc?.source.body, {'length':32})
            if (summary) {
                console.log('<< RX << ', s24(urn), '/', rx.operation.key, ' ', rx.operation.kind, ' ', doc)
            } else {
                console.log('<< RX << ', urn, '/', rx.operation.key, ' ', doc, ' << ', rx)
            }
        }
    });
}

