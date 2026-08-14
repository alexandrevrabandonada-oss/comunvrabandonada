#!/usr/bin/env bash

set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "COMUN_CHROMIUM_RETRY_COMMAND_MISSING"
  exit 64
fi

log_file="$(mktemp)"
cleanup() {
  rm -f -- "$log_file"
}
trap cleanup EXIT

set +e
"$@" 2>&1 | tee "$log_file"
first_exit_code=${PIPESTATUS[0]}
set -e

if [ "$first_exit_code" -eq 0 ]; then
  exit 0
fi

if ! grep -Eq 'Received signal 11.*SEGV|SIGSEGV' "$log_file"; then
  exit "$first_exit_code"
fi

echo "COMUN_CHROMIUM_TRANSIENT_RETRY reason=SIGSEGV attempt=1"
"$@"
