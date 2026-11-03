# ASMR / Surreal research — 2026-11-03

## Result and threshold accounting

- 20 distinct, source-linked candidates: AS-001–AS-010 ASMR; AS-011–AS-020 surreal/meme.
- **Directly verified ≥100,000 likes: 0 ASMR, 0 surreal. The target is not met.**
- Secondary pages historically report ≥100,000 likes for 4 ASMR and 10 surreal candidates. These 14 reports are **not** direct verification and do not count toward the threshold. Five ASMR reports are below the threshold; one has no reported like count. A counterexample with millions of views but 52K likes is intentionally retained to make the views/likes distinction visible.
- `likes`, `views`, `comments`, and `duration` remain null where the original-page value was not readable. Historical reported numbers appear only under `reported_metrics`, with a secondary evidence URL and precision caveat. `verification_status=snippet_only` means indirect evidence in this dataset; the actual source kind is `numeric_evidence_source=secondary_report`, not a claim that the original post was read.
- No video was downloaded, replayed, copied, trained on, or re-hosted. Only publicly readable HTML and search text were used. No video pixels or audio were available for frame-level measurement. All 0.5s / 1s / 3s observations are null; actual motion/sound/endings are described only as secondary reports when available.

## Primary access and provenance

1. [2mv satisfying index](https://www.2mv.ai/topic/satisfying): secondary title/creator/date/engagement index. All ten corresponding YouTube Shorts links were attempted. Two yielded only footer text, others returned footer, consent redirect, or fetch throttling. The index ranks by views; its selection threshold is not a 100K-like threshold.
2. [Tung character entry](https://knowyourmeme.com/memes/tung-tung-tung-sahur), [tree character entry](https://knowyourmeme.com/memes/brr-brr-patapim), [scenario-reversal entry](https://knowyourmeme.com/memes/no-la-polizia-italian-brainrot-arrested), [animal-machine entry](https://knowyourmeme.com/memes/bombardiro-crocodilo-italian-brainrot), [object-headed dancer entry](https://knowyourmeme.com/memes/ballerina-cappuccina-italian-brainrot): secondary historical reporting with original post URLs. All ten retained TikTok originals were attempted; extraction was restricted or empty. No original-page numeric counter was obtained.
3. Original URLs and video IDs were taken from actual source links, not guessed. Distinct IDs are not proof of distinct underlying footage. The memes share lore/sounds and may include derivative material; these cannot be treated as twenty independently original creative formulas.
4. Country fields remain null. An article's meme-origin region or a creator's language does not establish the uploader's location, citizenship, audience geography, or target market. Language fields specify title/narration evidence rather than nationality.

## Search log and breadth limitations

Executed query families (not an exhaustive or representative global sample):

| Language / market intent | Query examples | Outcome |
| --- | --- | --- |
| English / global, US, Canada, UK, Europe | `site.tiktok.com oddly satisfying "M Likes" soap cutting`; `site.instagram.com/reel satisfying "likes" "million"`; `site.youtube.com/shorts "satisfying" "likes"`; `oddly satisfying ASMR Canada UK Europe "100k likes"` | Secondary indexes predominated; no directly readable qualifying counters. |
| Spanish / Mexico and Latin America | `videos satisfactorios "me gusta" "Instagram"`; `ASMR satisfação Brasil México "curtidas" "me gusta"` | Broad irrelevant results and social platform help pages; no qualifying original. |
| Portuguese / Brazil | `"brainrot" "100 mil" curtidas vídeo`; mixed Brazil query above | Game engagement/profile totals were excluded, not mistaken for video likes. |
| Hindi / India | `ASMR संतोषजनक वीडियो लाइक लाख YouTube shorts`; `ASMR भारत 日本 "いいね" "लाख"` | No directly verified qualifying reference. |
| Indonesian / Indonesia | `"memuaskan" "ASMR" "suka" "TikTok"`; regional SEA query | Third-party creator averages and historical articles; averages excluded. |
| Arabic / Middle East | `"فيديو" "ASMR" "إعجاب"` | Reports about the Dubai-chocolate trend and unrelated game likes; neither supplies qualifying direct original counters here. |
| Southeast Asia | `ASMR Indonesia Philippines Vietnam Thailand "likes" satisfying` | Aggregate channel statistics and secondary indexes; not verified video-level likes. |
| Japan | Mixed Japanese/Hindi query above and Japanese results | No directly verified qualifying reference. |
| France / Europe | `ASMR satisfaisant vidéo 100000 likes Instagram Pinterest` | No qualifying direct original. |

Platform probes:

- **TikTok:** ten original links attempted, all unavailable as numeric evidence. Did not bypass access restrictions.
- **YouTube Shorts:** ten original links attempted, dynamic counters unavailable in extracted text or consent/throttling blocked retrieval.
- **Instagram Reels:** searches and [a known original Reel link](https://www.instagram.com/reel/DGmKPEZvE1Z/) attempted; fetch throttled. Not retained as a numeric case. No login bypass.
- **X:** `site.x.com "surreal" "likes" "animation"`, plus public search URL; X search returned 403. No qualifying counter obtained.
- **Reddit:** [soap-slicing post](https://www.reddit.com/r/oddlysatisfying/comments/11vrc69/slicing_this_bar_of_soap/) is publicly readable text, but no like count was exposed. Reddit upvotes are not platform likes and would be a distinct metric anyway. Comments are not video-viewing evidence. Not counted.
- **Pinterest:** indexed-pin queries and public search URL attempted; search URL inaccessible and no qualifying original pin counter found. Not counted.
- **Other public web:** KYM, 2mv and primary platform policy pages were readable. Commercial creator indexes were treated as secondary reports, not authoritative metrics.

This search process covers language/market intentions, **not** verified representative examples from every requested country. The retained sample is biased toward English titles and Italian/Indonesian meme descriptions because those pages were readable. This is a research limitation, not proof that those markets outperform others.

## Production hypotheses → parameters (not measured reference features)

The following are independent design hypotheses to test against generated samples and future real posting data, not causal findings from like counts:

| Principle | Proposed implementation parameter | Test |
| --- | --- | --- |
| A legible material change | Main subject 45–65% of frame; simple background; begin visible deformation within 0.5s | Mobile preview readability; human review, not a viral score |
| Anticipation and release | Two or three distinct phases: setup → deformation → reveal/recovery | Compare timing variants with actual completion rate |
| Tangible ASMR feel | Contact-triggered amplitude envelope, attack 4–12ms, decay 60–180ms, soft saturation; never just fixed metronome tones | Measure visual-event vs audio-event timestamps |
| Gloss/transparency | 2–3 gradient stops, one stable key light, restrained translucent edges and contact shadows | Frame comparisons at 360p; ensure effect survives compression |
| Recognizable but original surrealism | New abstract silhouette ≥90px at 360p; three story beats at normalized 0 / .35 / .70 | Distinct motion/ending screenshots; no existing character reuse |
| Meaningful variation | Change geometry/topology, interaction rule, and payoff; not only palette/speed | Template output difference + human originality review |
| An intentional loop | Match position/phase and amplitude at loop endpoints only for explicitly periodic designs | First/last-frame residual; physical non-periodic scenes should not claim seamlessness |

The app's procedural approximations are not photorealistic fluid simulation, genuine glass fracture, an AI character generator, or model re-training. No reference asset or existing Brainrot name/character/voice needs to be bundled.

## Monetization policy checks

Checked 2026-11-03. These observations are program-specific and do not promise eligibility or income:

- [YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392?hl=en) was readable. It explicitly excludes repetitive/mass-produced material and expects original, authentic substance; a template tool or self-generated asset does not by itself establish monetization eligibility. A library of sixty templates is not a policy exemption. Provide distinct interactions, narratives and editing, then review the actual channel/output.
- [TikTok Creator Rewards official announcement](https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program?lang=en) was readable. It describes original, high-quality videos **over one minute** and considers watch duration, finish rate, search value and engagement. The current app's 3–15-second outputs do not meet that particular program's duration requirement. This does not assert that every other monetization route has the same rule. The current [Creator Rewards help page](https://support.tiktok.com/en/business-and-creator/creator-rewards-program/creator-rewards-program) returned no readable text; current account/region eligibility must be rechecked in-app before relying on it.
- [Meta's Facebook original-content announcement](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/) was readable and emphasizes original content. It is specifically a Facebook source, not a substitute for current Instagram policy.
- [Instagram content monetization policy](https://help.instagram.com/2635536099905516) returned 429; the [Facebook-hosted Instagram help URL](https://www.facebook.com/help/instagram/2635536099905516) redirected to login/temporary block. No claim that current Instagram monetization details were verified. Do not infer that a visual loop or short clip is monetizable merely because it can be posted.

No copied song, voice imitation, brand-marked character or downloaded reference media was licensed by this research. Original synth sounds can avoid source-audio copying, but that is not a blanket legal clearance of all possible generated content.
