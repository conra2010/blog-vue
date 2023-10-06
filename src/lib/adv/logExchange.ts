import { mapExchange, type Exchange, type Operation } from '@urql/core'
import { fromArray, merge, pipe, map, filter, subscribe, makeSubject } from 'wonka';

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
                console.log('exchange:query ', JSON.stringify(operation))
                return operation
            })
        )

        const rx$ = forward(pre$)

        const post$ = pipe(rx$,
            map(result => {
                console.log('exchange:rx ', JSON.stringify(result))
                return result
            })
        )

        return post$;
    }
}

export const logExchange = (urn: string) => {
    return mapExchange({
        onOperation(op) {
            //console.log(urn, ' OP ', op)

            // const ax = fromArray([1,2,3])
            // const bx = fromArray([4,5,6])

            // pipe(
            //     merge([ax, bx]),
            //     subscribe((x) => console.log(x))
            // )
        },
        onResult(rx) {
            //console.log(urn, ' RX ', rx)
        }
    });
}

