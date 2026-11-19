---
slug: rna-subcellular
title: Subcellular RNA organisation and spatial transcriptomics
order: 3
question: >-
  Where does an mRNA molecule sit inside a cell, and what does its localisation tell us about
  post-transcriptional regulation? And which genes should a targeted spatial experiment measure in the first place?
approach: >-
  Self-supervised representation learning on per-cell images of transcript localisation, with a probabilistic
  framework for pattern detection, and an evidence-based look at how gene panels are chosen for targeted spatial transcriptomics.
resources:
  - subcellspace
publications:
  - doi:10.64898/2026.04.28.720613
  - doi:10.64898/2026.10.06.757034
people:
  - david-wouters
  - ceyhun-alar
---

Where an RNA molecule sits inside a cell is not random: subcellular localisation is tightly regulated and functionally important.
Imaging-based spatial transcriptomics now measures hundreds to thousands of transcript species at subcellular resolution, making a systematic, genome-wide study of localisation possible.

**SubCellSpace** represents the localisation of each gene in each cell as an image and embeds it, with a self-supervised autoencoder, into a low-dimensional latent space that encodes subcellular patterning.
Around this embedding we built a probabilistic framework for pattern detection that controls false positives, together with a bounded metric that can be compared across datasets.
Alongside the method we released a dedicated ground-truth benchmark: a Xenium dataset of HEK293T cells that combines APEX-seq-validated localised transcripts with expression-matched controls.
On a MERFISH dataset of the mouse small intestine, SubCellSpace recovers apical–basal mRNA polarisation in enterocytes without predefined annotations.

Targeted spatial transcriptomics also requires choosing a gene panel before the experiment, which cannot be corrected afterwards.
We study how this choice is made in practice. Across 18 computational panel-selection tools, only 6.5% of 540 citing records reported using the tool for panel design, and in an independent corpus 34 of 479 studies (7.1%) involved a computational tool at all.
