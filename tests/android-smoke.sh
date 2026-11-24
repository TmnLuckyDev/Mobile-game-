#!/usr/bin/env bash
set -euo pipefail
OUT=artifacts/native
mkdir -p "$OUT"
APK=$(find candidate -name '*debug.apk' -type f -print -quit)
test -n "$APK"
adb install -r "$APK"
adb shell am start -W -n com.tmnluckydev.pocketfoundry/.MainActivity

trap 'adb logcat -d -s AndroidRuntime:E > "$OUT/android-runtime.log" || true' EXIT

# Match accessible text rather than assuming fixed pixel coordinates or density.
find_node() {
  adb shell uiautomator dump /sdcard/pocket-foundry.xml >/dev/null 2>&1 || return 1
  adb exec-out cat /sdcard/pocket-foundry.xml > "$OUT/window.xml"
  python3 - "$OUT/window.xml" "$1" <<'PY'
import sys, re, xml.etree.ElementTree as ET
try:
    root = ET.parse(sys.argv[1]).getroot()
except Exception:
    sys.exit(1)
for n in root.iter('node'):
    if any(sys.argv[2].lower() in n.get(k, '').lower() for k in ('text', 'content-desc')):
        p = list(map(int, re.findall(r'\d+', n.get('bounds',''))))
        if len(p) == 4 and p[2] > p[0] and p[3] > p[1]:
            print((p[0]+p[2])//2, (p[1]+p[3])//2)
            sys.exit(0)
sys.exit(1)
PY
}
wait_for() {
  local pos
  for i in $(seq 1 12); do
    if pos=$(find_node "$1"); then printf '%s\n' "$pos"; return 0; fi
    sleep 1
  done
  echo "Unable to find accessible UI: $1" >&2
  return 1
}
tap() {
  local pos
  pos=$(wait_for "$1")
  read -r x y <<< "$pos"
  adb shell input tap "$x" "$y"
  sleep 0.5
}
screenshot() { adb exec-out screencap -p > "$OUT/$1.png"; }

wait_for 'Play campaign' >/dev/null
screenshot '01-native-home'
tap 'Play campaign'
wait_for 'Mold 1' >/dev/null
screenshot '02-native-tutorial'
tap 'Mold 1'
tap 'Mold 3'
adb shell am force-stop com.tmnluckydev.pocketfoundry
adb shell am start -W -n com.tmnluckydev.pocketfoundry/.MainActivity
tap 'Resume puzzle'
tap 'Mold 2'
tap 'Mold 1'
tap 'Mold 3'
tap 'Mold 2'
wait_for 'Perfectly forged' >/dev/null
screenshot '03-native-victory'
echo 'Android smoke test: launch, input, process restart, resume and victory passed.'
