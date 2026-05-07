Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const util = require('../util.js');
const buildTime = require('./buildTime.js');
const deprecatedWebpackOptions = require('./deprecatedWebpackOptions.js');
const getFinalConfigObjectBundlerUtils = require('./getFinalConfigObjectBundlerUtils.js');
const getFinalConfigObjectUtils = require('./getFinalConfigObjectUtils.js');

/**
 * Materializes the final Next.js config object with Sentry's build-time integrations applied.
 *
 * Note: this mutates both `incomingUserNextConfigObject` and `userSentryOptions` (to apply defaults/migrations).
 */
function getFinalConfigObject(
  incomingUserNextConfigObject,
  userSentryOptions,
) {
  deprecatedWebpackOptions.migrateDeprecatedWebpackOptions(userSentryOptions);
  const releaseName = getFinalConfigObjectUtils.resolveReleaseName(userSentryOptions);

  getFinalConfigObjectUtils.maybeSetUpTunnelRouteRewriteRules(incomingUserNextConfigObject, userSentryOptions);

  if (getFinalConfigObjectUtils.shouldReturnEarlyInExperimentalBuildMode()) {
    return incomingUserNextConfigObject;
  }

  const routeManifest = getFinalConfigObjectUtils.maybeCreateRouteManifest(incomingUserNextConfigObject, userSentryOptions);
  const vercelCronsConfigResult = getFinalConfigObjectUtils.maybeGetVercelCronsConfig(userSentryOptions);
  buildTime.setUpBuildTimeVariables(incomingUserNextConfigObject, userSentryOptions, releaseName);

  const nextJsVersion = util.getNextjsVersion();
  const nextMajor = getFinalConfigObjectUtils.getNextMajor(nextJsVersion);

  getFinalConfigObjectUtils.maybeSetClientTraceMetadataOption(incomingUserNextConfigObject, nextJsVersion);
  getFinalConfigObjectUtils.maybeSetInstrumentationHookOption(incomingUserNextConfigObject, nextJsVersion);
  getFinalConfigObjectUtils.warnIfMissingOnRouterTransitionStartHook(userSentryOptions);

  const bundlerInfo = getFinalConfigObjectBundlerUtils.getBundlerInfo(nextJsVersion);
  getFinalConfigObjectBundlerUtils.maybeWarnAboutUnsupportedTurbopack(nextJsVersion, bundlerInfo);
  getFinalConfigObjectBundlerUtils.maybeWarnAboutUnsupportedRunAfterProductionCompileHook(nextJsVersion, userSentryOptions, bundlerInfo);

  const turboPackConfig = getFinalConfigObjectBundlerUtils.maybeConstructTurbopackConfig(
    incomingUserNextConfigObject,
    userSentryOptions,
    routeManifest,
    nextJsVersion,
    bundlerInfo,
    vercelCronsConfigResult,
  );

  const shouldUseRunAfterProductionCompileHook = getFinalConfigObjectBundlerUtils.resolveUseRunAfterProductionCompileHookOption(
    userSentryOptions,
    bundlerInfo,
  );

  getFinalConfigObjectBundlerUtils.maybeSetUpRunAfterProductionCompileHook({
    incomingUserNextConfigObject,
    userSentryOptions,
    releaseName,
    nextJsVersion,
    bundlerInfo,
    turboPackConfig,
    shouldUseRunAfterProductionCompileHook,
  });

  getFinalConfigObjectBundlerUtils.maybeEnableTurbopackSourcemaps(incomingUserNextConfigObject, userSentryOptions, bundlerInfo);

  return {
    ...incomingUserNextConfigObject,
    ...getFinalConfigObjectBundlerUtils.getServerExternalPackagesPatch(incomingUserNextConfigObject, nextMajor),
    ...getFinalConfigObjectBundlerUtils.getWebpackPatch({
      incomingUserNextConfigObject,
      userSentryOptions,
      releaseName,
      routeManifest,
      nextJsVersion,
      shouldUseRunAfterProductionCompileHook,
      bundlerInfo,
      vercelCronsConfigResult,
    }),
    ...getFinalConfigObjectBundlerUtils.getTurbopackPatch(bundlerInfo, turboPackConfig),
  };
}

exports.getFinalConfigObject = getFinalConfigObject;
//# sourceMappingURL=getFinalConfigObject.js.map
