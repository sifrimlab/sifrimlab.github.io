---
slug: multi-omic-integration
title: Multi-omic and spatial data integration
order: 1
question: >-
  Modern technologies measure different molecular species on the same biological sample.
  How do these layers jointly describe the state of a cell or a tissue, beyond what any single modality reveals?
approach: >-
  Modality-agnostic deep generative models that learn shared low-dimensional representations while correcting
  for technical artefacts, together with the preprocessing, alignment and benchmarking needed to evaluate them reproducibly.
resources:
  - mima
  - focus
  - multiverse
publications:
  - doi:10.1101/2025.10.21.683449
  - doi:10.64898/2026.08.04.742705
people:
  - joseignacio-alvira
  - lorenzo-venturelli
  - jelle-jacobs
  - anis-ismail
  - regis-scarceriaux
  - saptarshi-chakrabarti
  - mora-toneguzzo
---

Modern biology generates data across many molecular layers: genome, transcriptome, proteome, and more.
We build computational methods that jointly analyse these heterogeneous datasets to reveal biological patterns invisible in any single modality.

**MIMA** is a modular, unsupervised framework for multi-omics integration and batch correction.
Applied to spatial and single-cell datasets, it removes batch effects while preserving biologically relevant information, learns representations that are predictive of expert pathologist annotations, and enables cross-modal translation.
This line of work points towards molecular digital pathology: combining high-dimensional molecular data with histopathological imaging for patient stratification.

Integration starts before the model. **FOCUS** takes raw spatial transcriptomics, mass spectrometry imaging, Raman spectroscopy imaging and microscopy data through preprocessing, alignment and resolution matching onto a shared observation grid.
**Multiverse** makes the evaluation of integration methods reproducible by building benchmarks from containerised components.
