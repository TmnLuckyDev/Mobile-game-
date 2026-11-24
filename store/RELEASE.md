# Google Play release gates

This is a pre-release candidate, not a signed or published production game. Do not claim it is approved by Google until the Play Console review is complete.

## 1. Build / device verification

- Verify the latest GitHub Actions run is green: engine tests, UI tests, Android lint, APK and AAB build. The Android emulator smoke job additionally verifies Android 16 launch, touch input, process restart, resume, and tutorial completion if the hosted runner supports emulation.
- Install the debug APK on at least one Android 16 device and one older supported device. Test pause/resume, process kill, rotate, system back, offline launch, all controls, color symbols, and restore after closing the app.
- Check screenshots on a real Android device. Browser screenshots from CI are preview assets for review, not proof of a native device test.
- Review accessibility with TalkBack and verify font sizing, touch targets and cutouts.
- Verify no unexpected SDK permissions or data transfer in merged manifest and Play pre-launch report.

## 2. Play Console configuration (owner only)

- Create a Google Play developer account if not already available, complete identity and payment-profile checks as applicable.
- Create the app using application ID `com.tmnluckydev.pocketfoundry`. Verify brand name and package availability before establishing permanent identity.
- In Play Console, enable Play App Signing and securely create/retain an upload key. Never commit private signing keys or passwords to the repository.
- Create one-time product ID `foundry_plus`, non-consumable, with an active purchase option for the supported markets. Proposed launch price USD 2.99 or appropriate local equivalent, subject to store pricing and tax. It unlocks two themes only.
- Retrieve the app's Play licensing public key and use it as `PLAY_BILLING_PUBLIC_KEY` for verification. This is not the private signing key. The game supports free play if no valid public key is configured.
- Configure license testers. Verify successful, canceled, pending, restored, already-owned and refunded purchases with a Play-distributed test build. Confirm the price is localized and no entitlement is granted for an unverified/pending purchase. The client-only cosmetic purchase design is not a server-side entitlement system. Consider a secure backend if the monetization expands.

## 3. Signed Android App Bundle

Use JDK 17, Gradle 8.13, SDK platform 36. The build targets Android 16 (API 36) and supports Android 8+ (API 26).

Set these environment variables on a trusted build machine using its secret manager (do not paste private passwords into chat or commit them):

- `ANDROID_KEYSTORE_PATH`: path to upload keystore
- `ANDROID_KEY_ALIAS`: upload key alias
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_PASSWORD`: key password
- `PLAY_BILLING_PUBLIC_KEY`: RSA licensing public key copied from Play Console

Run `gradle --no-daemon :app:lintRelease :app:bundleRelease`. Confirm the AAB is signed with the upload key and its version code is unique. Upload `app/build/outputs/bundle/release/app-release.aab` to internal testing first. The CI unsigned artifact is for build verification and is not upload-ready.

## 4. Store listing / disclosures

- Use `LISTING.md` as initial copy. Review title and terms. Use the supplied `icon-512.png` and `feature-1024x500.png` (editable SVG sources are included). Capture actual game screenshots on Android for each required device class.
- Host `PRIVACY.md` as a public, human-readable HTTPS page with the developer's verified contact address, then provide its URL in Play Console. Keep the in-app privacy disclosure consistent.
- Complete Data safety based on the final merged app/SDK behavior. Current app stores gameplay only locally and invokes Google Play Billing for purchases. Review the Play Billing SDK's disclosure obligations rather than assuming every form field is "no".
- Fill content rating, target audience, ads declaration (initial game has no ads), app access (all core puzzles available without account), financial features if applicable, app category and countries. Do not misrepresent categories or age targets.
- Complete internal/closed testing and address the pre-launch report. New personal accounts subject to Google's testing gate require at least 12 opted-in testers for 14 continuous days before applying for production access.
- Publish only when the actual signed artifact, payment configuration, compliance checks and device testing are complete.

Official references: [Android target API](https://support.google.com/googleplay/android-developer/answer/11926878), [testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465), [Play Billing](https://developer.android.com/google/play/billing/integrate), [Play App Signing](https://developer.android.com/studio/publish/app-signing).

## 5. Measure rather than assume revenue

Start with an internal/closed test, then a soft launch. Track store-page conversion, D1/D7 retention, session length, quality feedback and IAP revenue in Play Console or an explicitly consented, privacy-reviewed analytics solution if added later. Do not buy ads before retention and lifetime value are viable. Test store listing variants and theme pricing first. Optional rewarded ads could be a future experiment, after privacy and consent review, but are not included in this release candidate.
