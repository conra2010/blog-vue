
import type { Operation, SubscriptionForwarder, SubscriptionOperation } from '@urql/core'
import { make, toObservable } from 'wonka';
import { Kind, parse } from 'graphql'
import type { DocumentNode, FieldNode, OperationDefinitionNode } from 'graphql';
import type { OperationResult } from '@urql/core';

import { useMercure, type MercureSource } from '@/lib/sse'
import { CADDY_MERCURE_URL, MERCURE_ENTRYPOINT } from '@/config/api';
import { toRefs, watch } from 'vue';

// see [urql subscriptions](https://formidable.com/open-source/urql/docs/advanced/subscriptions/)
//
// the urql client will use this to construct an actual 'exchange' when a graphql subscription
// is executed. this function must return something that conforms to the 'observable spec' with
// a 'subscribe()' method
//
// this implementation is taken from (...); it uses the Wonka library
//
// "Wonka is a lightweight iterable and observable library loosely based on the callbag spec. It
// exposes a set of helpers to create streams, which are sources of multiple values, which allow you
// to create, transform and consume event streams or iterable sets of data."
//
export const forwardSubscription: SubscriptionForwarder = (request, operation) => {
    // construct a wonka source from the server events. and with it a wonka
    // observable
    return toObservable(createFetchSource(request, operation));
};

const getFieldSelections = (query: DocumentNode): readonly FieldNode[] | null => {
    const node = query.definitions.find(
        (node: any): node is OperationDefinitionNode => {
            return node.kind === Kind.OPERATION_DEFINITION && node.name;
        }
    );

    return node !== undefined ? node.selectionSet.selections.filter(
        (node: any): node is FieldNode => {
            return node.kind === Kind.FIELD && node.name;
        }
    ) : null;
};

const createFetchSource = (request: SubscriptionOperation, operation: Operation) => {
    return make<OperationResult>(({ next, complete }) => {
        const abortController =
            typeof AbortController !== 'undefined'
                ? new AbortController()
                : undefined;

        const { context } = operation;

        const subscriptions: MercureSource[] = [];

        // get the initial request ready. this will return the mercureUrl for
        // the event source of updates
        const extraOptions =
            typeof context.fetchOptions === 'function'
                ? context.fetchOptions()
                : context.fetchOptions || {};

        const fetchOptions = {
            body: JSON.stringify(request),
            method: 'POST',
            ...extraOptions,
            headers: {
                'content-type': 'application/json',
                ...extraOptions.headers
            },
            signal:
                abortController !== undefined ? abortController.signal : undefined
        };

        executeFetch(request, operation, fetchOptions).then(result => {
            if (result !== undefined) {
                //next(result);

                const fieldSelections = getFieldSelections(parse(request.query));

                fieldSelections?.forEach(fieldSelection => {
                    const selectionName = fieldSelection.name.value;

                    const mercureUrl = result.data[selectionName].mercureUrl;
                    //console.log('Mercure Subscription recv URL: ', mercureUrl)

                    // TODO: automatically add this to the request set, and strip it in result
                    if (
                        process.env.NODE_ENV !== 'production' &&
                        !mercureUrl
                    ) {
                        throw new Error(
                            'Received a subscription response without mercureUrl. This will just return static data.'
                        );
                    }

                    // this is a problem now, using the full URL will prevent the PHP API code from publishing updates
                    // when a mutation is executed that changes the resource; maybe CORS? maybe certs?
                    //console.log(mercureUrl);
                    //const mercureSubscription = new EventSource(mercureUrl.replace('https://host.docker.internal:8445', MERCURE_ENTRYPOINT), { withCredentials: false });
                    //const mercureSubscription = new EventSource(mercureUrl, { withCredentials: false });

                    //  change the URL Caddy sees to the URL the web app needs
                    const mercure = useMercure(mercureUrl.replace(CADDY_MERCURE_URL, MERCURE_ENTRYPOINT), { withCredentials: false }, {
                        //  reconfigure timeout on error
                        retry_baseline: 1000, retry_rng_span: 500
                    });

                    const { lastEventID, eventType, dataFieldsValues } = toRefs(mercure)

                    watch(lastEventID, () => {
                        if (eventType.value === 'gqlsubs') {
                            //  TODO decide/design; use 1st data line for now
                            if (dataFieldsValues.value && dataFieldsValues.value.length > 0) {
                                const dvalue = dataFieldsValues.value[0]
                                result = {
                                    ...result,
                                    data: { ...result.data, [selectionName]: { ...result.data[selectionName], ...dvalue}}
                                }

                                next(result)
                            }
                        }
                    })

                    subscriptions.push(mercure);
                });
            }
        });

        //  return a 'teardown' function
        return () => {
            subscriptions.forEach(it => it.close());

            if (abortController !== undefined) {
                abortController.abort();
            }
        };
    });
};

const executeFetch = (request: SubscriptionOperation, operation: Operation, opts: RequestInit) => {
    const { url, fetch: fetcher } = operation.context;

    let response: Response | undefined;

    return (fetcher || fetch)(url, opts)
        .then(res => {
            const { status } = res;
            const statusRangeEnd = opts.redirect === 'manual' ? 400 : 300;
            response = res;

            if (status < 200 || status >= statusRangeEnd) {
                throw new Error(res.statusText);
            } else {
                return res.json();
            }
        })
        .then(result => result)
        .catch(err => {
            if (err.name !== 'AbortError') {
                return { errors: [err] };
            }
        });
};