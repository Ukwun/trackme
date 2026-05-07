import { getNextjsVersion } from '../util.js';
import { setUpBuildTimeVariables } from './buildTime.js';
import { migrateDeprecatedWebpackOptions } from './deprecatedWebpackOptions.js';
import { getBundlerInfo, maybeWarnAboutUnsupportedTurbopack, maybeWarnAboutUnsupportedRunAfterProductionCompileHook, maybeConstructTurbopackConfig, resolveUseRunAfterProductionCompileHookOption, maybeSetUpRunAfterProductionCompileHook, maybeEnableTurbopackSourcemaps, getTurbopackPatch, getWebpackPatch, getServerExternalPackagesPatch } from './getFinalConfigObjectBundlerUtils.js';
import { resolveReleaseName, maybeSetUpTunnelRouteRewriteRules, shouldReturnEarlyInExperimentalBuildMode, maybeCreateRouteManifest, maybeGetVercelCronsConfig, getNextMajor, maybeSetClientTraceMetadataOption, maybeSetInstrumentationHookOption, warnIfMissingOnRouterTransitionStartHook } from './getFinalConfigObjectUtils.js';

/**
 * Materializes the final Next.js config object with Sentry's build-time integrations applied.
 *
 * Note: this mutates both `incomingUserNextConfigObject` and `userSentryOptions` (to apply defaults/migrations).
 */
function getFinalConfigObject(
  incomingUserNextConfigObject,
  userSentryOptions,
) {
  migrateDeprecatedWebpackOptions(userSentryOptions);
  const releaseName = resolveReleaseName(userSentryOptions);

  maybeSetUpTunnelRouteRewriteRules(incomingUserNextConfigObject, userSentryOptions);

  if (shouldReturnEarlyInExperimentalBuildMode()) {
    return incomingUserNextConfigObject;
  }

  const routeManifest = maybeCreateRouteManifest(incomingUserNextConfigObject, userSentryOptions);
  const vercelCronsConfigResult = maybeGetVercelCronsConfig(userSentryOptions);
  setUpBuildTimeVariables(incomingUserNextConfigObject, userSentryOptions, releaseName);

  const nextJsVersion = getNextjsVersion();
  const nextMajor = getNextMajor(nextJsVersion);

  maybeSetClientTraceMetadataOption(incomingUserNextConfigObject, nextJsVersion);
  maybeSetInstrumentationHookOption(incomingUserNextConfigObject, nextJsVersion);
  warnIfMissingOnRouterTransitionStartHook(userSentryOptions);

  const bundlerInfo = getBundlerInfo(nextJsVersion);
  maybeWarnAboutUnsupportedTurbopack(nextJsVersion, bundlerInfo);
  maybeWarnAboutUnsupportedRunAfterProductionCompileHook(nextJsVersion, userSentryOptions, bundlerInfo);

  const turboPackConfig = maybeConstructTurbopackConfig(
    incomingUserNextConfigObject,
    userSentryOptions,
    routeManifest,
    nextJsVersion,
    bundlerInfo,
    vercelCronsConfigResult,
  );

  const shouldUseRunAfterProductionCompileHook = resolveUseRunAfterProductionCompileHookOption(
    userSentryOptions,
    bundlerInfo,
  );

  maybeSetUpRunAfterProductionCompileHook({
    incomingUserNextConfigObject,
    userSentryOptions,
    releaseName,
    nextJsVersion,
    bundlerInfo,
    turboPackConfig,
    shouldUseRunAfterProductionCompileHook,
  });

  maybeEnableTurbopackSourcemaps(incomingUserNextConfigObject, userSentryOptions, bundlerInfo);

  return {
    ...incomingUserNextConfigObject,
    ...getServerExternalPackagesPatch(incomingUserNextConfigObject, nextMajor),
    ...getWebpackPatch({
      incomingUserNextConfigObject,
      userSentryOptions,
      releaseName,
      routeManifest,
      nextJsVersion,
      shouldUseRunAfterProductionCompileHook,
      bundlerInfo,
      vercelCronsConfigResult,
    }),
    ...getTurbopackPatch(bundlerInfo, turboPackConfig),
  };
}

export { getFinalConfigObject };
//# sourceMappingURL=getFinalConfigObject.js.map
