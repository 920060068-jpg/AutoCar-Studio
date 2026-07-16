# Audio Pipeline

## Mandatory Order

Every daily project must complete this sequence before formal narration:

Script Draft -> Storyboard Draft -> Narration Timing Budget -> Audio-Fit Script -> Static Audio Duration Estimate -> Audio Preflight -> Director Review -> Picture Render -> Picture Review -> Picture Lock -> MiniMax Live Probe -> MiniMax TTS -> Measured Audio Fit -> Audio Mix.

The old path `Picture Lock -> read long script -> MiniMax TTS -> discover overrun` is prohibited.

Before duration estimation, the pipeline must run `number semantic classification -> pronunciation dictionary lookup -> project override -> tts_text generation -> speed calibration`. `display_text`, `narration_text`, and `tts_text` are separate immutable roles. Only `tts_text` is sent to MiniMax.

## Audio Preflight

Formal MiniMax TTS is forbidden until all inputs exist and pass:

- `narration_timing_budget.yaml`
- approved `audio_fit_script.yaml`
- `narration_cue_sheet.yaml`
- subtitle timing draft
- voice registry mapping for `chenyao_male`
- MiniMax live probe success
- `estimated_fit_status: passed`
- `audio_preflight_pass: true`
- `number_semantics_pass: true`
- `pronunciation_dictionary_pass: true`
- `tts_text_generated: true`
- `display_text_unchanged: true`
- `speed_estimate_pass: true`
- `timing_budget_pass: true`

If any item is missing, Daily Auto Mode must condense copy and re-estimate first. It may revise twice before marking `audio_preflight_blocked`.

## Auto Condense

Daily Auto Mode may delete redundant modifiers, merge repeated ideas, shorten hooks/endings, compress explanation while preserving facts, enforce one core idea per shot, adjust punctuation and update subtitles. It may not change verified data, core facts, conclusion direction, risk qualifiers or unverified claims.

## TTS Budget Protection

Each generated segment must store text SHA-256, request fingerprint, voice ID, speed, output SHA-256, duration and trace ID. Same text and same parameters must reuse cache. Each shot has at most two formal requests. Failed service calls checkpoint and resume from the failed audio stage without repeating successful requests.

The request fingerprint is computed from the exact provider request body. Purpose labels, output paths, and run IDs must not split otherwise identical paid requests. Calibration audio may be promoted to a formal segment when text and all provider parameters match.

## Pronunciation and Speed

All numeric-looking tokens must be classified before formal TTS. Project overrides win over the global dictionary. Contextual model entries must not leak into ordinary quantities. The chenyao voice reads its safe native-speed range and default from `config/voice_registry.yaml`; text that cannot fit at the maximum safe speed must be condensed before any further TTS.

## Fit Rules

Natural silence is allowed and preferred over filler. Post speed changes above 1.15x fail. Each shot must keep at least 0.15 seconds of safety margin. Measured fit must pass before Audio PASS.
