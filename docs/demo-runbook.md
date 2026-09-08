# CareFlow demo and capture runbook

Use one connected story: a patient books a visit, staff find that visit in the
schedule, and the Patient Hub supplies the clinical context. Keep the wider
feature tour in the screenshot gallery.

## Preflight

1. Record the capture date, Git commit, and any local source changes. A local
   recording demonstrates that checkout; it does not verify the deployment.
2. Confirm the backend uses a local development database and the selected
   accounts/records are synthetic. Use the existing **Continue with Demo**
   buttons. Keep sign-in, credentials, browser profiles, and other apps outside
   the recording.
3. Check the reserved ports before starting anything. Use an existing CareFlow
   process on its port; do not start a duplicate or switch ports.

   | Surface | Local address |
   | --- | --- |
   | Clinician | `http://localhost:5173` |
   | Patient | `http://localhost:5174` |
   | API | `http://localhost:8000` |

   From the repository root, in separate terminals:

   ```bash
   cd backend
   ./venv/bin/python manage.py check
   ./venv/bin/python manage.py runserver localhost:8000 --noreload
   ```

   ```bash
   VITE_API_URL=http://localhost:8000 VITE_DEMO_MODE=true npm run dev:clinician
   ```

   ```bash
   VITE_API_URL=http://localhost:8000 npm run dev:patient
   ```

   Use the repository's `.nvmrc` runtime for the frontend commands. The landing
   app is not required for this recording. Starting servers is not permission
   to apply migrations or reseed a database.
4. Confirm the patient account is active and linked to the intended facility.
   Its provider must offer online scheduling, and its visit type must be
   bookable online. Both provider and type determine whether a booking is
   auto-confirmed. The facility needs the corresponding active status code:
   `confirmed` for auto-confirmed bookings, otherwise `pending`.
5. Check that at least one future slot exists, lies in the intended facility's
   working hours, and has no provider conflict. Seeded dates expire: having
   many historical slots does not make the booking flow ready. With explicit
   local setup authorization, add a bounded number through the existing
   `/v1/appointments/bookable-slots/` API, including `facility_id`; use its normal
   authentication and CSRF handshake. Do not reset or rerun the full seed just
   to refresh dates.
6. Choose a slot beyond the stricter facility/provider cancellation cutoff,
   with online cancellation enabled in both. Verify that the same provider and
   date can be located in the clinician schedule. Portal booking currently assigns
   a rendering provider, but no resource; Schedule and Agenda filter by resource.
   For the connected staff handoff, explicitly authorize a resource assignment
   on the synthetic visit through Hub → Appointments. Keep its patient, provider,
   type, status, and time unchanged, and verify the saved resource before showing
   the visit in Schedule. A calendar count alone does not identify the booking.
7. Open Patient Hub from Search Patient and from the schedule before the main
   take. A populated Hub must render without an error boundary. Stop if it
   fails; do not conceal a broken transition with an unrelated screenshot.
8. Record existing display preferences before changing them. Use a consistent
   theme, useful schedule working hours, and a readable sidebar state. Keep
   DOB, chart number, reason, and note labels off in the schedule capture. Leave
   SSNs masked and avoid personal-detail forms or free-text clinical notes.
9. Make a short recording test. Verify dimensions, legible text, playback, and
   no microphone track before rehearsing the complete story.

## Recording script

Target 60–90 seconds. Short section captions should make the recording useful
without audio; place them outside important controls. These are pacing targets,
not claims that a take has been recorded successfully.

| Time | Scene | Visible result |
| --- | --- | --- |
| 0–8s | Patient home → Book an appointment | A clear starting action in the patient portal |
| 8–25s | Choose provider, visit type, and future time | The booking progresses through real choices |
| 25–35s | Review and confirm | The new visit appears in the patient's appointments |
| 35–50s | Staff open Hub → Appointments and assign the visit to a resource | Show the actual staff assignment; portal booking does not assign a resource |
| 50–65s | Open Schedule and select that resource and date | The same visit is visible to staff |
| 65–80s | Return to Hub and review appointment history | Connected patient context, without opening sensitive detail forms |

Track the created appointment ID in a private local receipt to establish that
the recording uses the same record in both portals. Do not display database IDs
or backend tooling in the public clip. Keep a successful action and its actual
result together when editing. Trim setup, idle waits, and failed takes; never
create a simulated success state.

## Capture and media preparation

Use a dedicated browser window with only the two local portals. Aim for a
1440×900 viewport where supported. Capture at native pixel density; do not
upscale a small image and call it high resolution. If a native window supplies
a different viewport, record the actual dimensions and use the same framing
across the gallery.

On macOS, the built-in recorder can capture a specific, verified window. First
identify the current CareFlow window ID; never reuse an ID from an earlier
session. Capture the patient, staff-assignment, and schedule/Hub scenes as
separate bounded takes so the assembly recipe can trim each workflow segment.
Run the following once per take, setting `capture_output_name` to
`patient-take.mov`, `staff-assignment-take.mov`, or `schedule-hub-take.mov`:

```bash
mkdir -p output/playwright/demo-refresh
capture_output_name=patient-take.mov
screencapture -v -l"$capture_window_id" -V120 -x \
  "output/playwright/demo-refresh/$capture_output_name"
```

This records for 120 seconds without microphone audio. Let the bounded capture
finish: interrupting `screencapture` with Ctrl-C can discard the unfinished
movie. Verify the file before closing the session. Native capture may include
window margins and browser chrome; determine crop coordinates from a test
frame, then apply a consistent crop to the real footage and gallery images.

Use the installed media tools to inspect and encode the finished take:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height \
  -show_entries format=duration,size -of json \
  output/playwright/demo-refresh/patient-take.mov
```

Encode the assembled recording as H.264 MP4 with `yuv420p` and `+faststart`,
without audio. Target under 25 MB while preserving readable labels. Make a
10–15-second GIF preview from authentic motion, targeting under 5 MB. Use a
linked still if the GIF makes text unreadable. The full recording stays
available through an ordinary relative repository link; do not depend on
GitHub rendering an HTML video element.

The intended public asset set is `docs/screenshots/demo.mp4`, `demo.gif`, and
six PNGs: schedule, patient portal, Patient Hub, timeline, refill inbox, and
facility security. Retained screenshots must come from the capture build.
Historical synthetic schedules are suitable for gallery density; label their
dates honestly and distinguish them from the newly booked visit.

## Verification and cleanup

- Watch the whole final video muted. Verify the booking result and cross-portal
  continuity, clear captions, smooth cuts, and readable labels.
- Inspect all final images together for consistent framing and accurate
  captions. Exclude credentials, full SSNs, unrelated windows, and free-text
  medical detail. A refill queue summary does not require opening its history
  or a detail modal.
- Open the MP4, verify preview playback, check relative links, and run
  `git diff --check`. Record browser errors and unverified paths separately.
- Cancel only appointments created for this capture, through the existing
  patient cancellation flow. Verify cancelled status and the freed slots.
  Cancellation retains visit history; it is not a database rollback.
- Restore changed display preferences and close the isolated browser window.
  Stop only the server processes started for this capture.
- Keep the source commit, actual capture dimensions, data changes, cancelled
  appointment IDs, checks, and limitations in an ignored local receipt.
  Publish only the reviewed media and documentation.

## Live-demo fallback

Preflight the actual interview machine and deployed portals separately. If a
live action fails, retry once, then switch to a verified recording or screenshot
and continue the explanation. Say which environment the evidence represents.
If a required workflow is broken or a recording is incomplete, report that
explicitly; do not present an old slideshow as proof that the current flow works.

For engineering context, use [architecture.md](engineering/architecture.md),
[backend guidelines](engineering/backend-guidelines.md), and the
[verification guide](engineering/testing.md).

## September 8, 2026 capture

The included media shows a local synthetic workflow from checkout `70a7ab0`
plus the AppShell provider-order correction in this refresh. The recording is
61 seconds at 1920×1080, with captions and no audio. The GIF is a 12-second
motion preview. This capture does not verify the deployed portals.

One synthetic patient books September 11 at 10:00 AM with MD Elliot Reed. Staff
then assign the existing resource through Hub's appointment form; the form also
fills that resource's Exam Room 1. The patient, provider, type, status, start/end,
and appointment ID remain the same. The visit then appears in Schedule and Hub.
Portal booking itself does not assign the resource.

Native window capture used 3024×1748 pixels; video includes recorder margins
(3248×1972). Standard image content was cropped to 3024×1572 and reduced to
1920×998. Hub images crop out the identity sidebar; the timeline is a shorter
1920-pixel-wide detail crop to exclude historical visit reasons. In the video,
the appointment form's identity preview is visibly masked and labeled. No UI
states were simulated. June 3 gallery data is separate from the new booking.

Local preparation added three tagged slots and one active confirmed status.
One appointment was booked; only its resource assignment was saved by staff.
After capture, the appointment was cancelled through the portal, all three
slots were available, and the demo user’s saved preferences matched the original
snapshot. Unsaved regression edits did not change the captured interval. The
three task-started servers were stopped. Cancelled history and the added local
status/slots remain. No pending migrations were applied or remote data changed.

## Reusable encoding recipe

The following is the recipe used for this capture. It requires Python with
Pillow, FFmpeg/ffprobe, and the macOS Arial font shown below. Save it as
`output/playwright/demo-refresh/assemble_demo.py` and run it from the repository
root. Raw takes stay local; do not publish them. For another capture, update
the source names, timing, crop bounds, and identity mask after inspecting a
privacy-safe test frame. The mask must cover sensitive detail for every frame.

First prepare the patient scene from the native patient take:

```bash
ffmpeg -y -ss 0 -t 26 -i output/playwright/demo-refresh/patient-take.mov \
  -vf 'crop=3024:1572:112:250,scale=1920:998:flags=lanczos,fps=30' \
  -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -an \
  -movflags +faststart output/playwright/demo-refresh/patient-scene.mp4
```

The script trims the authentic takes, adds caption bars, applies the disclosed
identity mask, joins the segments, creates a palette-based motion preview, and
decodes both outputs as a final integrity check. The schedule scene plays at
three-quarter speed for readability; the other scenes retain their timing.

```python
#!/usr/bin/env python3
"""Mechanical edit of authentic local CareFlow recordings; no app-state synthesis.

Run from repository root: python3 output/playwright/demo-refresh/assemble_demo.py
Requires installed ffmpeg/ffprobe and Pillow. Raw captures remain ignored/local.
"""
from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT / 'output/playwright/demo-refresh'
DEST = ROOT / 'docs/screenshots'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
PAGE = 'crop=3024:1572:112:250'
HUB = 'crop=2492:1296:596:282'
# The right preview is masked BEFORE scaling. Left edge excludes background rail.
FORM = 'crop=2420:1450:410:310,drawbox=x=1840:y=90:w=580:h=1210:color=0xedf3f7:t=fill'
SCENES = [
    ('patient-scene.mp4', 0, 26, 1, None, '01  Patient books a follow-up', False),
    ('staff-assignment-take.mov', 8, 9, 1, FORM, '02  Staff assigns a schedule resource', True),
    ('staff-assignment-take.mov', 48, 3.95, 1, FORM, '02  Staff saves the resource assignment', True),
    ('staff-assignment-take.mov', 52.5, 4, 1, HUB, '02  Saved visit retains its time and provider', False),
    ('schedule-hub-take.mov', 0, 4.5, 4/3, PAGE, '03  Same visit on the clinician schedule', False),
    ('schedule-hub-take.mov', 22, 12, 1, HUB, '04  Visit available in Patient Hub', False),
]

def run(args):
    subprocess.run(args, check=True)

def titlebar(index, title, masked):
    image = Image.new('RGB', (1920, 84), '#102039')
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 80, 1920, 83), fill='#6396f4')
    draw.text((32, 21), title, fill='white', font=ImageFont.truetype(FONT, 32))
    meta = 'Local synthetic demo' + ('  ·  Patient details masked' if masked else '  ·  CareFlow')
    font = ImageFont.truetype(FONT, 21)
    draw.text((1888-draw.textlength(meta, font=font), 30), meta, fill='#bdcce2', font=font)
    target = WORK / f'title-{index}.png'
    image.save(target)
    return target

segments = []
edl = []
cursor = 0
for index, (source, start, duration, pace, crop, caption, masked) in enumerate(SCENES):
    target = WORK / f'edit-{index}.mp4'
    bar = titlebar(index, caption, masked)
    filters = ([crop] if crop else []) + [f'setpts=(PTS-STARTPTS)*{pace}', 'fps=30',
        'scale=1920:996:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos',
        'pad=1920:996:(ow-iw)/2:(oh-ih)/2:color=0xf1f5f9', 'pad=1920:1080:0:84:color=0xf1f5f9', 'setsar=1']
    run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(start), '-t', str(duration),
         '-i', str(WORK/source), '-i', str(bar), '-filter_complex',
         f'[0:v]{",".join(filters)}[scene];[scene][1:v]overlay=0:0[v]', '-map', '[v]',
         '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
         '-movflags', '+faststart', str(target)])
    segments.append(target)
    actual = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(target)]))
    edl.append({'output_start':round(cursor,3), 'output_end':round(cursor+actual,3),
                'source':source,'source_start':start,'source_duration':duration,
                'playback_duration_multiplier':pace,'crop_and_mask':crop,'caption':caption})
    cursor += actual
concat = WORK / 'segments.txt'
concat.write_text(''.join(f"file '{path}'\n" for path in segments))
run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(DEST/'demo.mp4')])
# Twelve seconds of real confirmation -> confirmed-list motion; no still slideshow.
run(['ffmpeg','-y','-loglevel','error','-ss','12','-t','12','-i',str(DEST/'demo.mp4'),
     '-filter_complex','fps=10,scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
     '-loop','0',str(DEST/'demo.gif')])
(WORK/'edit-decisions.json').write_text(json.dumps({'duration':cursor,'scenes':edl,'gif':{'source':'demo.mp4','start':12,'duration':12,'fps':10,'width':1100}},indent=2)+'\n')
for filename in ['demo.mp4','demo.gif']:
    run(['ffmpeg','-v','error','-i',str(DEST/filename),'-f','null','-'])
run(['ffmpeg','-y','-loglevel','error','-i',str(DEST/'demo.mp4'),'-vf','fps=1/4,scale=640:-1,tile=4x4','-frames:v','1',str(WORK/'final-contact-sheet.png')])
print(json.dumps({'duration':cursor,'mp4_bytes':(DEST/'demo.mp4').stat().st_size,'gif_bytes':(DEST/'demo.gif').stat().st_size}))
```
