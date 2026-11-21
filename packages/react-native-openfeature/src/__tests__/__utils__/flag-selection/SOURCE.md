# Shared Flag Selection Vectors

`selection-vectors.json` is copied unchanged from [DataDog/ffe-system-test-data](https://github.com/DataDog/ffe-system-test-data/blob/caa6d1ac3e5fbda0ce57ef3ffff3772901f3f466/flag-selection/selection-vectors.json) at commit `caa6d1ac3e5fbda0ce57ef3ffff3772901f3f466`.

The fetch-helper tests consume all 38 `sdk` expectations. Raw-query percent-decoding and server-side `selectedKeys` expectations are not SDK transport behavior and are not exercised here. Test runs use this checked-in snapshot without network access. Update shared expectations upstream, then replace this file from a pinned commit and update this provenance and the SDK-case count assertion together.
