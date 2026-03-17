/**
 * Master kill switch for Cloud Save. When false, no Firebase modules are
 * imported, no sync logic runs, and no Cloud Save UI is rendered.
 * The bundler tree-shakes all Cloud Save code paths when disabled.
 */
export const CLOUD_SAVE_ENABLED = true;
