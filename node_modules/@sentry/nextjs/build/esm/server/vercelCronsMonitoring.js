import { spanToJSON, _INTERNAL_safeDateNow, captureCheckIn, debug, getIsolationScope } from '@sentry/core';
import { DEBUG_BUILD } from '../common/debug-build.js';

// Attribute keys for storing cron check-in data on spans
const ATTR_SENTRY_CRON_CHECK_IN_ID = 'sentry.cron.checkInId';
const ATTR_SENTRY_CRON_MONITOR_SLUG = 'sentry.cron.monitorSlug';
const ATTR_SENTRY_CRON_START_TIME = 'sentry.cron.startTime';
const ATTR_SENTRY_CRON_SCHEDULE = 'sentry.cron.schedule';

/**
 * Gets the Vercel crons configuration that was injected at build time.
 */
function getVercelCronsConfig() {
  const globalWithCronsConfig = globalThis

;

  if (!globalWithCronsConfig._sentryVercelCronsConfig) {
    return undefined;
  }

  try {
    return JSON.parse(globalWithCronsConfig._sentryVercelCronsConfig) ;
  } catch {
    DEBUG_BUILD && debug.log('[@sentry/nextjs] Failed to parse Vercel crons config');
    return undefined;
  }
}

/**
 * Checks if the request is a Vercel cron request and starts a check-in if it matches a configured cron.
 */
function maybeStartCronCheckIn(span, route) {
  const vercelCronsConfig = getVercelCronsConfig();
  if (!vercelCronsConfig || !route) {
    return;
  }

  // The strategy here is to check if the request is a Vercel cron
  // request by checking the user agent, vercel always sets the user agent to 'vercel-cron/1.0'

  const headers = getIsolationScope().getScopeData().sdkProcessingMetadata?.normalizedRequest?.headers

;

  if (!headers) {
    return;
  }

  const userAgent = Array.isArray(headers['user-agent']) ? headers['user-agent'][0] : headers['user-agent'];
  if (!userAgent?.includes('vercel-cron')) {
    return;
  }

  const matchedCron = vercelCronsConfig.find(cron => cron.path === route);
  if (!matchedCron?.path || !matchedCron.schedule) {
    return;
  }

  // Use raw path as monitor slug to match legacy wrapApiHandlerWithSentryVercelCrons behavior,
  // so migration from automaticVercelMonitors to vercelCronsMonitoring keeps the same monitors.
  const monitorSlug = matchedCron.path;
  const startTime = _INTERNAL_safeDateNow() / 1000;

  const checkInId = captureCheckIn(
    { monitorSlug, status: 'in_progress' },
    {
      maxRuntime: 60 * 12,
      schedule: { type: 'crontab', value: matchedCron.schedule },
    },
  );

  DEBUG_BUILD && debug.log(`[Cron] Started check-in for "${monitorSlug}" with ID "${checkInId}"`);

  // Store marking attributes on the span so we can complete the check-in later
  span.setAttribute(ATTR_SENTRY_CRON_CHECK_IN_ID, checkInId);
  span.setAttribute(ATTR_SENTRY_CRON_MONITOR_SLUG, monitorSlug);
  span.setAttribute(ATTR_SENTRY_CRON_START_TIME, startTime);
  span.setAttribute(ATTR_SENTRY_CRON_SCHEDULE, matchedCron.schedule);
}

/**
 * Completes a Vercel cron check-in when a span ends.
 * Should be called from the spanEnd event handler.
 */
function maybeCompleteCronCheckIn(span) {
  const spanData = spanToJSON(span).data;
  const checkInId = spanData?.[ATTR_SENTRY_CRON_CHECK_IN_ID];
  const monitorSlug = spanData?.[ATTR_SENTRY_CRON_MONITOR_SLUG];
  const startTime = spanData?.[ATTR_SENTRY_CRON_START_TIME];
  const schedule = spanData?.[ATTR_SENTRY_CRON_SCHEDULE];

  if (!checkInId || !monitorSlug || typeof startTime !== 'number') {
    return;
  }

  const duration = _INTERNAL_safeDateNow() / 1000 - startTime;
  const spanStatus = spanToJSON(span).status;
  // Span status is 'ok' for success, undefined for unset, or an error message like 'internal_error'
  const checkInStatus = spanStatus && spanStatus !== 'ok' ? 'error' : 'ok';

  // Include monitor_config for upsert in case the in_progress check-in was lost
  const monitorConfig =
    typeof schedule === 'string'
      ? {
          maxRuntime: 60 * 12,
          schedule: { type: 'crontab' , value: schedule },
        }
      : undefined;

  captureCheckIn(
    {
      checkInId: checkInId ,
      monitorSlug: monitorSlug ,
      status: checkInStatus,
      duration,
    },
    monitorConfig,
  );

  // Cleanup marking attributes so they don't pollute user span data
  span.setAttribute(ATTR_SENTRY_CRON_CHECK_IN_ID, undefined);
  span.setAttribute(ATTR_SENTRY_CRON_MONITOR_SLUG, undefined);
  span.setAttribute(ATTR_SENTRY_CRON_START_TIME, undefined);
  span.setAttribute(ATTR_SENTRY_CRON_SCHEDULE, undefined);

  DEBUG_BUILD && debug.log(`[Cron] Completed check-in for "${monitorSlug}" with status "${checkInStatus}"`);
}

export { maybeCompleteCronCheckIn, maybeStartCronCheckIn };
//# sourceMappingURL=vercelCronsMonitoring.js.map
