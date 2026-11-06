# VIRAL REMIX FACTORY — implementation and verification

Release remix-v1-2026-11-06. GitHub Pages only; no server, source-media download, API key, SNS auto-post or model training.

## Implemented

- Isolated VIRAL REMIX tab, mobile layout, manual reference URL/metrics/provenance/observations and general principle tags. No automatic audiovisual analysis from a URL.
- Ten original archetypes: distinct layouts, rules, mid-story events and measured ending summaries. Seed changes also change geometry; not just color/speed. Reference tags and comparable measured completion rates influence order. First ten cover all ten archetypes.
- Ball/wall/ring count inputs; initial ball count1–200 (requested up to500 visibly capped), dynamic max500, walls0–100, rings1–30. These are configuration limits, not verified physical-iPhone safe limits.
- Deterministic fixed-step physics shared between preview and frozen MP4 design. Continuous15/30/61/75/90-second story timelines with new conditions; no looping reset to pad duration. Preview stops at end, can pause/reset.
- Persistent IndexedDB serial queue for1/5/10/20/50/100 plans. Stop, reload, resume/retry, seed history; structural and sparse visual fingerprints; at most3 automatic attempts before pausing. Video library remains30 files/200MiB; recording64MiB. Capacity stops with recovery save path; does not retain100 MP4 blobs.
- Sparse scene QA (nonblack, motion, finite/bounded positions, severe overlap heuristic, visual change), scheduled middle/ending, actual MP4 decode/seek/resolution/nonblack samples, synthesized audio event and signal peak checks. Failure creates a new seeded design of the same archetype. Not continuous collision proof or perceptual source similarity detection. Manual source-similarity, listening, satisfaction and ending review required.
- Original Web Audio collision/phase/final tones. No copied melody.
- Existing analytics UI now includes remix-* IDs, nullable measured views/likes/watch/completion/eligible views/revenue. Three same-duration posts required for selection; under10 provisional;30% exploration. Observational completion-rate preference, not causal learning or model retraining. Platform differences can confound comparisons.
- Actions scheduled daily5×15sec at03:20UTC; disable with repository variable REMIX_DAILY_ENABLED=false. Manual1–100 videos,15/30/61/75/90sec, at most10 per shard, max2 simultaneous jobs/one recorder each,25-minute job timeout, artifacts3-day retention. Default360px; outputs normalized offline to H264/AAC. No automatic SNS posting. Partial artifacts retained on failure; rerunning the same seed reproduces designs (no persistent cross-run media dedup database).
- Actions reference job audits recorded metadata freshness, NOT refreshed SNS metrics. Authorized API/import required for genuine automatic SNS data refresh. Performance for Actions comes from committed docs/remix/performance.json, not private browser data.

## Research evidence

`docs/remix/research.json`: five records. Three secondary reports exceeding100k likes OR1M views; **zero directly verified threshold videos**. Instagram music.bouncingball profile/reel throttled; YouTube original throttled; TikTok restricted/robots blocked. Reddit result reported26575 score; never treated as likes. Unknown dates/observations remain null. No source video was watched/downloaded, so visual/audio observations are not invented; suggested principle tags are manual hypotheses.

Sources: https://vosscore.com/tag/relaxing (reported metrics, not primary verification); https://www.instagram.com/reel/DeUvaLwMp3o/ ; https://www.tiktok.com/@user3286787618877/video/7655636861829860630 ; https://www.youtube.com/shorts/6aG36N_Fq00 ; https://www.reddit.com/r/oddlysatisfying/comments/17p5qu1/a_ball_speeding_up_by_1_each_bounce_untill_the/ .

TikTok official policy requires original high-quality videos over a minute and other eligibility conditions: https://support.tiktok.com/en/business-and-creator/creator-rewards-program/how-is-the-creator-rewards-program-different-from-the-tiktok-creator-fund . Duration alone guarantees neither eligibility nor payment.

## Verification

- Unit validation: ten distinct layouts/rules/endings; deterministic designs;100-plan data shape; caps; frozen recording; reference provenance; exploration rate.
- Actual mobile-width Chromium UI: ten15sec audio MP4s generated serially, stop/reload/resume, per-video playable decoding/nonblack samples, design snapshot agreement, duplicate reseeding;90sec continuous deterministic scene.
- Actions renderer: actual3/30/61/75/90sec MP4s (one each), FFmpeg decoded non-silent audio, H264/AAC output. Ten15sec native UI recordings separately verified.
- Hundred-plan queue persisted/restored with100 unique seeds;30 metadata-only capacity fixtures prevent any recorder start. This is NOT100 actual MP4s.
- Initial cloud Actions batch generated5×15sec successfully; run42163532567, artifact remix-20261106-0 (3-day retention).
- Baseline80-template/default factories and23 archived replay paths preserved; old custom counts100/30/6, touch editor and MP4/static pixel comparison rerun.
- Final CI and public URL verification recorded separately after source push. Public sample page generated from real ten-video test output during deployment.

## Not verified / incomplete

Physical iPhone Safari touch/MP4/audio/Files/share/heat/memory/high-resolution, actual50/100-video stress runs, long-duration device stress, human popularity/quality evaluation, primary SNS counts, automated authenticated research refresh and source-media perceptual similarity. No claim of monetization qualification. 50/100-plan and workflow support is implemented, but not a claim of completed100-video device testing.
