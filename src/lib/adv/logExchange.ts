import { mapExchange, type Exchange } from '@urql/core'
import { fromArray, merge, pipe, subscribe } from 'wonka';

export const nopExchange = ({client,forward}) => {
    return ops$ => {
        const forwardops$ = ops$;
  
        const oprx$ = forward(ops$);
  
        return oprx$;
    };
  };
  
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
  
  