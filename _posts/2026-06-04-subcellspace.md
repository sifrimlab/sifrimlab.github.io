---
title: Introducing SubCellSpace, 𝗮𝗻 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 𝗳𝗼𝗿 modeling 𝘀𝘂𝗯𝗰𝗲𝗹𝗹𝘂𝗹𝗮𝗿 𝗺𝗥𝗡𝗔 𝗹𝗼𝗰𝗮𝗹𝗶𝘇𝗮𝘁𝗶𝗼𝗻 𝗽𝗮𝘁𝘁𝗲𝗿𝗻𝘀 𝗶𝗻 𝘀𝗽𝗮𝘁𝗶𝗮𝗹 𝘁𝗿𝗮𝗻𝘀𝗰𝗿𝗶𝗽𝘁𝗼𝗺𝗶𝗰𝘀.
tags:
  - paper
last_modified_at: ""
---

<!-- excerpt start -->
<!-- excerpt end -->

We are excited to share our latest preprint (the culmination of the PhD work of our colleague David Wouters): 𝗦𝘂𝗯𝗖𝗲𝗹𝗹𝗦𝗽𝗮𝗰𝗲, 𝗮𝗻 𝗲𝗺𝗯𝗲𝗱𝗱𝗶𝗻𝗴–𝗯𝗮𝘀𝗲𝗱 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 𝗳𝗼𝗿 𝗮𝘂𝘁𝗼𝗺𝗮𝘁𝗲𝗱 𝗰𝗵𝗮𝗿𝗮𝗰𝘁𝗲𝗿𝗶𝘇𝗮𝘁𝗶𝗼𝗻 𝗼𝗳 𝘀𝘂𝗯𝗰𝗲𝗹𝗹𝘂𝗹𝗮𝗿 𝗺𝗥𝗡𝗔 𝗹𝗼𝗰𝗮𝗹𝗶𝘇𝗮𝘁𝗶𝗼𝗻 𝗽𝗮𝘁𝘁𝗲𝗿𝗻𝘀 𝗶𝗻 𝘀𝗽𝗮𝘁𝗶𝗮𝗹 𝘁𝗿𝗮𝗻𝘀𝗰𝗿𝗶𝗽𝘁𝗼𝗺𝗶𝗰𝘀.

𝗦𝘂𝗯𝗰𝗲𝗹𝗹𝘂𝗹𝗮𝗿 𝗹𝗼𝗰𝗮𝗹𝗶𝘇𝗮𝘁𝗶𝗼𝗻 𝗼𝗳 𝗥𝗡𝗔 is a phenomenon conserved across evolution, yet aside from some anecdotal examples, little is known about its roles in post-transcriptional regulation. However to systematically analyse large-scale datasets of subcellular expression patterns computational tools are required. The few existing tools either depend on predefined compartments, scale poorly to full datasets, or lack principled ground truth for benchmarking.


SubCellSpace addresses this with a 𝘀𝗲𝗹𝗳-𝘀𝘂𝗽𝗲𝗿𝘃𝗶𝘀𝗲𝗱 𝗮𝘂𝘁𝗼𝗲𝗻𝗰𝗼𝗱𝗲𝗿 that represents per-cell mRNA localization as images and projects them into a low-dimensional latent space encoding subcellular patterning. Around this, we developed a 𝗽𝗿𝗼𝗯𝗮𝗯𝗶𝗹𝗶𝘀𝘁𝗶𝗰 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸 for pattern detection and a bounded, comparable metric that supports cross-dataset analysis. The latent geometry itself enables exploratory work — recovering co-localized and segregated gene pairs, as well as tissue-level organizational principles, directly from the embedding.


Alongside the method, we release what is, to our knowledge, the first principled 𝗴𝗿𝗼𝘂𝗻𝗱-𝘁𝗿𝘂𝘁𝗵 𝗯𝗲𝗻𝗰𝗵𝗺𝗮𝗿𝗸 for imaging-based ST: a tailored Xenium dataset on HEK293T cells combining APEX-seq–validated localized transcripts with expression-matched non-localized controls.


Applied to a small-intestine MERFISH dataset, SubCellSpace automatically recovers apical–basal mRNA polarization without any predefined annotations, and extends to protein staining via transfer learning.


The [preprint](https://www.biorxiv.org/content/10.64898/2026.04.28.720613v1), [code](https://github.com/sifrimlab/SubCellSpace) 𝗮𝗿𝗲 𝗼𝗽𝗲𝗻𝗹𝘆 𝗮𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲.
{%
  include figure.html
  image="images/news/subcellspace.png"
  width="75%"
%}
