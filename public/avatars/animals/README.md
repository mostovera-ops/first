# Animal avatar renders

Drop your final 3D animal images here, named by slug, as PNG:

```
fox.png  octopus.png  bee.png   chick.png   elephant.png  turtle.png
pig.png  frog.png     penguin.png  giraffe.png  koala.png  dino.png
```

- Square images work best (they're displayed in a circle, `object-cover`).
- Recommended size: 256×256 or 512×512, transparent or solid background.

Until a file exists, the app falls back gracefully to the animal's emoji on a
deterministic gradient — so missing files never break the UI.
