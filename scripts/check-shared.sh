#!/usr/bin/env bash
# Files that must stay byte-identical between top-vacuum.github.io and
# one-vacuum.github.io. Run before opening a PR that touches any of them:
#   scripts/check-shared.sh ../one-vacuum.github.io
set -euo pipefail
other="${1:?usage: scripts/check-shared.sh <path to the other site repo>}"
shared=(
  src/lib/inquiry.ts
  src/lib/inquiry-form.ts
  src/lib/inquiry.test.ts
  src/lib/inquiry-form.test.ts
  src/components/InquiryForm.astro
  src/i18n/client.ts
  src/i18n/client.test.ts
  src/i18n/ui.test.ts
  src/test/setup.ts
  vitest.config.ts
  scripts/check-shared.sh
  .github/workflows/ci.yml
  .github/workflows/deploy.yml
)
status=0
for f in "${shared[@]}"; do
  if ! cmp -s "$f" "$other/$f"; then
    echo "differs: $f"
    status=1
  fi
done
if [ "$status" -eq 0 ]; then echo "shared files are identical (${#shared[@]})"; fi
exit "$status"
