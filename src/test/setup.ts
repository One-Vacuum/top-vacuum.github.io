// Shared: identical in top-vacuum.github.io and one-vacuum.github.io (change both;
// scripts/check-shared.sh compares them).
// Tests must never reach the network: a forgotten fetch mock would otherwise
// POST to FormSubmit and email the owner. Tests stub fetch explicitly.
globalThis.fetch = (() => Promise.reject(new Error('Network access is disabled in tests'))) as typeof fetch;
