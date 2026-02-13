/**
 * Test helper that imports pai-paths and exits with status
 * Used by integration tests to verify validation error handling
 */

(async () => {
  try {
    await import('./pai-paths.ts');
    console.log('IMPORT_SUCCESS');
    process.exit(0);
  } catch (error) {
    console.error('IMPORT_ERROR:', error);
    process.exit(1);
  }
})();
