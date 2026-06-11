---
title: Introducing SubCellSpace, a framework for modeling subcellular mRNA localization patterns in spatial transcriptomics.
tags:
  - paper
last_modified_at: ""
---

<!-- excerpt start -->
<!-- excerpt end -->

We are excited to share our latest preprint (the culmination of the PhD work of our colleague David Wouters): Subcellspace, an embedding-based framework for automated characterization of subcellular mRNA localization patterns in spatial transcriptomics.

Subcellular localization of RNA is a phenomenon conserved across evolution, yet aside from some anecdotal examples, little is known about its roles in post-transcriptional regulation. However to systematically analyse large-scale datasets of subcellular expression patterns computational tools are required. The few existing tools either depend on predefined compartments, scale poorly to full datasets, or lack principled ground truth for benchmarking.


SubCellSpace addresses this with a self-supervised autoencoder that represents per-cell mRNA localization as images and projects them into a low-dimensional latent space encoding subcellular patterning. Around this, we developed a probalistic framework for pattern detection and a bounded, comparable metric that supports cross-dataset analysis. The latent geometry itself enables exploratory work, recovering co-localized and segregated gene pairs, as well as tissue-level organizational principles, directly from the embedding.


Alongside the method, we release what is, to our knowledge, the first principled ground-truth benchmark for imaging-based ST: a tailored Xenium dataset on HEK293T cells combining APEX-seq–validated localized transcripts with expression-matched non-localized controls.


Applied to a small-intestine MERFISH dataset, SubCellSpace automatically recovers apical–basal mRNA polarization without any predefined annotations, and extends to protein staining via transfer learning.


The [preprint](https://www.biorxiv.org/content/10.64898/2026.04.28.720613v1) and [code](https://github.com/sifrimlab/SubCellSpace) are openly available.
{%
  include figure.html
  image="images/news/subcellspace.png"
  width="75%"
%}
