# MNNJ Exterior Property Care — website

This repo holds both versions of the MNNJ website side by side. Each version also has its own standalone repo:

| Version | Folder | Standalone repo |
|---------|--------|-----------------|
| V1 | [`v1/`](v1/) | [mnnj-website-v1](https://github.com/Ebthalgamal2020/mnnj-website-v1) |
| V2 — "Noir & Light" preview | [`v2/`](v2/) | [mnnj-website-v2](https://github.com/Ebthalgamal2020/mnnj-website-v2) |

`source-files/` holds the raw supplied files (the original logo photo and the image-asset pack).

## Building

```sh
npm install
npm run build:v1   # or build:v2, or build for both
npm run dev:v1     # watch mode (dev:v2 for V2)
```
