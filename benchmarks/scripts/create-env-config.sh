#!/bin/bash

set -eo pipefail
source ./scripts/secrets/get-secret.sh

cd $ROOT
ENV_FILENAME=".env"

DD_CLIENT_TOKEN="$(get_secret $DD_RN_BENCHMARK_CLIENT_TOKEN)"
DD_API_KEY="$(get_secret $DD_RN_BENCHMARK_API_KEY)"
DD_APP_ID="$(get_secret $DD_RN_BENCHMARK_APP_ID)"
DD_SITE="us1"
DD_ENV="dev"

cat > "$ENV_FILENAME" <<EOF
DD_CLIENT_TOKEN="$DD_CLIENT_TOKEN"
DD_API_KEY="$DD_API_KEY"
DD_APP_ID="$DD_APP_ID"
DD_SITE="$DD_SITE"
DD_ENV="$DD_ENV"
BENCH_SCENARIO=
BENCH_RUN_TYPE=
EOF

echo ".env file created at $ENV_FILE"
