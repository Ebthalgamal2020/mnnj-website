# Assets

- `brand/mnnj-logo-original.jpeg` — byte-identical copy of the logo as supplied
  (WhatsApp JPEG, 737 x 1600). Do not edit, recompress or re-export this file.
  Replace with a vector (SVG) or high-resolution transparent PNG master when available.

## images/

| Folder      | Content allowed                                              | Files expected |
|-------------|--------------------------------------------------------------|----------------|
| `hero/`     | Illustrative image allowed (not presented as an MNNJ job)    | `hero-property-2560.webp` (2560 wide; current file is 2560 x 850) |
| `services/` | Illustrative images allowed (not presented as MNNJ jobs)     | `service-exterior-cleaning-1200.webp`, `service-gutters-roofline-1200.webp`, `service-windows-conservatories-1200.webp`, `service-garden-maintenance-1200.webp` (1200 x 960, 5:4) |
| `illustrative/` | Illustrative only (not MNNJ jobs, not Marvin) | `about-property-1536.webp` (1536 x 474, About background, cropped from the supplied illustrative collage) |
| `results/`  | Genuine MNNJ before/after photos only                        | `compare-before-*.webp`, `compare-after-*.webp` (same framing, 16:9) |
| `gallery/`  | Genuine MNNJ project photos only                             | `gallery-01` … `gallery-07` |
| `about/`    | Approved photograph of Marvin only — never AI-generated      | `owner-portrait-*.webp` (4:5) |

Rules:
- No generated or stock imagery in `results/`, `gallery/` or `about/`.
- Generated images must not show a person who could be taken for Marvin or MNNJ staff
  (no faces, no branded clothing).
- Format: WebP, quality ~75–80. Keep each file under ~350 KB where possible.

Current use of illustrative imagery on the homepage:
- Hero, the four service cards and the About background are illustrative.
- The before/after slider is an ILLUSTRATIVE DEMO: both sides use
  `services/service-exterior-cleaning-1200.webp`; the "before" side is a CSS grade
  (`.compare-simulated`). It is labelled on the page "Illustrative demo · not a
  customer result". Replace with genuine photos in `results/` and remove the labels.
- The project gallery is kept in a `<template>` in index.html and is not shown
  until genuine MNNJ project photos are supplied.
