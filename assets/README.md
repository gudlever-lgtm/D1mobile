# Character atlas

`characters.png` is original generated artwork made for Askegrav: four walking poses each for a steel-armored warrior, skeleton, ash-grey demon and crimson guardian. It contains no extracted Diablo assets.

`characters.json` describes the actual source rectangles and foot anchors in the transparent atlas. Keep source dimensions and anchors together when replacing artwork. Frames share one pixel scale per character so their size stays stable during animation. The renderer mirrors sprites for left-facing movement and falls back to the locally drawn figures if loading fails.
