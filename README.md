# RoboDemo Project Website

Website: https://robodemo-2027.github.io/

Paper: https://arxiv.org/abs/2611.32256

## Release Status

- [x] Complete [policy and Refreward training code](https://github.com/robodemo-2027/RoboDemo/tree/main/training), data preparation, environments and launchers.
- [x] Five checkpoints, evaluation code, numerical results and worked examples.
- [x] Evaluation image validated through Apptainer on H200; two-GPU evaluation and memory measurements.
- [x] All five training/evaluation CI jobs passed; 395 public CPU tests passed, 1 historical-fixture test skipped.
- [ ] End-to-end evaluation on eight physical GPUs.
- [ ] Docker Engine/NVIDIA Container Toolkit GPU startup on a supported host.
- [ ] Build and GPU-test the new training container recipe.

The November 27 release announcement and bilingual website checklist match
the [code repository's release status](https://github.com/robodemo-2027/RoboDemo#release-status).

## Website

Static HTML, CSS, JavaScript, SVG illustrations and selected research media.
GitHub Pages serves the repository root from the main branch; .nojekyll
disables Jekyll processing. No model, robot, API backend or training service
is connected to this website.

The main film includes synthetic English Kokoro-82M narration and English
subtitles. Earlier narrated films are preserved. Font licenses are included
under assets/fonts; the Kokoro-ONNX runtime notice is under assets/licenses.
The November 26 credit revision adds the eleven authors, four affiliations and
equal-contribution markers to the hero, film title, closing card and poster.
The original narration, subtitle timing and middle footage are unchanged;
`data/film-authors-revision.json` records packet-level preservation checks.
The editable cards are `assets/svg/film-{title,closing}-authors.svg`. Rebuild with
`node scripts/update-film-credits.mjs ORIGINAL_FILM.mp4 WORK_DIR` using FFmpeg
and `rsvg-convert`. Prior films are retained, but the player uses the credited cut.
Media retain their respective rights; this repository does not grant a
blanket license to redistribute recorded media.

Scientific values and recorded outcomes are unchanged from the local website.
Current method illustrations and historical evaluation protocols remain
explicitly distinguished. The paper link and citation follow the public arXiv
record. Search-engine indexing remains disabled; this link update does not
change the existing indexing policy.

Only the website is published here. Experiment directories, private provenance,
QA receipts, local paths, runtime dependencies, model weights and backups
are intentionally excluded.

For a local preview, run `node scripts/preview.mjs` and open
`http://127.0.0.1:4193/`. The localhost-only server supports byte-range requests
for native video seeking. Set `PORT` to use another local port.
