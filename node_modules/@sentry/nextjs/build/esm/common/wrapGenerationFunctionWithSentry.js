import { getIsolationScope, winterCGHeadersToDict, handleCallbackErrors, getActiveSpan, SPAN_STATUS_ERROR, SPAN_STATUS_OK, captureException } from '@sentry/core';
import { isNotFoundNavigationError, isRedirectNavigationError } from './nextNavigationErrorUtils.js';
import { waitUntil, flushSafelyWithTimeout } from './utils/responseEnd.js';

/**
 * Wraps a generation function (e.g. generateMetadata) with Sentry error instrumentation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapGenerationFunctionWithSentry(
  generationFunction,
  context,
) {
  return new Proxy(generationFunction, {
    apply: (originalFunction, thisArg, args) => {
      const isolationScope = getIsolationScope();

      let headers = undefined;
      // We try-catch here just in case anything goes wrong with the async storage since it is Next.js internal API
      try {
        headers = context.requestAsyncStorage?.getStore()?.headers;
      } catch {
        /** empty */
      }

      const headersDict = headers ? winterCGHeadersToDict(headers) : undefined;

      isolationScope.setSDKProcessingMetadata({
        normalizedRequest: {
          headers: headersDict,
        } ,
      });

      return handleCallbackErrors(
        () => originalFunction.apply(thisArg, args),
        error => {
          const span = getActiveSpan();
          const { componentRoute, componentType, generationFunctionIdentifier } = context;
          let shouldCapture = true;
          isolationScope.setTransactionName(`${componentType}.${generationFunctionIdentifier} (${componentRoute})`);

          if (span) {
            if (isNotFoundNavigationError(error)) {
              // We don't want to report "not-found"s
              shouldCapture = false;
              span.setStatus({ code: SPAN_STATUS_ERROR, message: 'not_found' });
            } else if (isRedirectNavigationError(error)) {
              // We don't want to report redirects
              shouldCapture = false;
              span.setStatus({ code: SPAN_STATUS_OK });
            } else {
              span.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
            }
          }

          if (shouldCapture) {
            captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.function.nextjs.generation_function',
                data: {
                  function: generationFunctionIdentifier,
                },
              },
            });
          }
        },
        () => {
          waitUntil(flushSafelyWithTimeout());
        },
      );
    },
  });
}

export { wrapGenerationFunctionWithSentry };
//# sourceMappingURL=wrapGenerationFunctionWithSentry.js.map
