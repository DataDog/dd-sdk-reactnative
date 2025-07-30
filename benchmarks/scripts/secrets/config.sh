#!/bin/zsh

ROOT="$(pwd)"

DD_VAULT_ADDR=https://vault.us1.ddbuild.io
DD_SDK_RN_SECRETS_PATH_PREFIX='kv/aws/arn:aws:iam::486234852809:role/ci-dd-sdk-reactnative'

DD_RN_BENCHMARK_CLIENT_TOKEN="benchmark.client.token"
DD_RN_BENCHMARK_API_KEY="benchmark.api.key"
DD_RN_BENCHMARK_APP_KEY="benchmark.app.key"
DD_RN_BENCHMARK_APP_ID="benchmark.app.id"
DD_RN_BENCHMARK_E2E_PROVISIONING_PROFILE_BASE64="e2e.provisioning.profile.benchmark.base64"
DD_RN_BENCHMARK_E2E_CERTIFICATE_P12_BASE64="e2e.certificate.benchmark.p12.base64"
DD_RN_BENCHMARK_E2E_CERTIFICATE_PASSWORD="e2e.certificate.benchmark.password"
DD_RN_BENCHMARK_SYNTHETICS_ANDROID_APP_ID="benchmark.synthetics.android.app.id"
DD_RN_BENCHMARK_SYNTHETICS_IOS_APP_ID="benchmark.synthetics.ios.app.id"
