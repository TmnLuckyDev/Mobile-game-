# Independent review follow-up, version 1.1

This is still a pre-release candidate. The independent review's release gates remain binding. A build success is not a Play launch approval.

## Implemented in source

- T03–T04: WebView 90+ baseline, native update/recovery screen, renderer-process recovery and startup timeout. Android 8 compatibility must still be tested with an updated provider.
- T05–T07: v1 migration, separate save slots for campaign/daily/orders/mastery, prior validated backup, persisted lifetime daily count, UTC date grace by resuming an unfinished puzzle, and monotonic local challenge date. No competitive economy. Reset explicitly clears legacy and backup keys.
- T08–T09: serialized product/purchase queries, explicit restore outcomes, bounded acknowledgment retries, pending and verified purchase handling. Actual Play purchase tests and backend verification have not been completed.
- T10/T12: keyboard/focus restoration and modal focus trap/inert background, asynchronous hint worker with timeout/cancellation and bounded cache. Rendering is still DOM based, not a full incremental component architecture.
- T11: verified shortest-path targets for first 25 campaign levels. Original boards kept to protect existing saved games. Later targets are certified, not optimal.
- T14/T15: separate sound mixer with filtered percussive metal tones and background suspension, split state, economy, content and solver into modules. Full CSS and professionally recorded audio-asset polish remain future work.
- T16–T18: npm lockfile, checksum-pinned Gradle wrapper, release and debug lint, candidate upload only after successful build, native and signed release workflows, legacy backup exclusions and Android game category. Main protection requires repository administration. Review final merged permissions and SDK disclosures before release.
- T20: campaign completion state, 24 special orders with three mold capacities and one/two reserves, seeded mastery mode.
- Product: eight craftable illustrated treasures, visible workshop shelf, metal economy, additional cosmetic themes, improved premium mold visuals, stepwise tutorial, ingot flight/drop and forge glow, large symbols/reduced motion, optional weekly goals.

## Outstanding release gates

- Native API 26 and 36 test on real accelerated runners/devices. The separate native gate fails fast if KVM is not accessible rather than reporting a skipped test as successful. API 26 also needs an updated System WebView. Test signed/minified build on devices, touch, back, lifecycle, old/new WebView, TalkBack, font scaling, tablets, resource use and offline behavior.
- Play Console identity/account/merchant configuration, secure upload key and approved environment, active product and license testers, valid signing and bundle verification, real purchase/pending/restore/refund tests, contact and public privacy policy, Data Safety, IARC, distribution and required closed test. The manual workflow creates a signed candidate only, never publishes it.
- Actual user acquisition/retention experiments and physical-device measurements. No observed commercial outcome or retention is claimed.
- No advertising or analytics SDK has been added. The review recommended experimenting with rewarded ads, larger collections, season events and backend entitlements only after soft-launch validation. Consent, data protection, and SDK declarations must come first. No externally hosted backend or sync has been provisioned.
- Further product work: curated new campaign layouts, genuinely mixed-capacity/locked-reserve mechanics, professional audio assets, wider localization, native store screenshots/video and ASO experiments, more substantial cosmetic sets after tester feedback.
