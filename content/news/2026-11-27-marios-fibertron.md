---
slug: marios-fibertron
title: One genome is enough - introducing FiberTron
date: '2026-11-27'
tags:
  - paper
---
**Main PhD work of LMIB member Marios Eftychiou is now on bioRxiv.**

Preprint: [FiberTron enables regulatory variant effect prediction and testing from multi-omic long reads of a single sample](https://www.biorxiv.org/content/10.64898/2026.11.13.762587v1)
## The question
Sequence-to-function (S2F) models learn to predict what DNA does (which regions are accessible, methylated or transcribed) directly from its sequence. They are usually trained on massive public compendia, covering hundreds of cell types and thousands of experiments.

That works well for well-studied cell types. But what if you want to understand a single genome: a patient, a rare tumor, or a cell type that has barely been profiled? Large public compendia have little or no data on these, and building such a compendium for every new sample isn't realistic.

Our answer: one sample is enough.

## Meet FiberTron
FiberTron is a 12M-parameter convolutional-transformer model, trained from scratch on a single sample. That sample is profiled with two long-read technologies: **Fiber-seq**, which reads chromatin accessibility and CpG methylation on the same DNA molecule, and **Nanopore direct RNA sequencing**, which reads native RNA molecules.

From 524 kb of reference sequence, FiberTron predicts three kinds of signal at base-pair resolution:
- CpG methylation
- chromatin accessibility
- strand-specific transcript coverage

## Small, fast and competitive
FiberTron models train end-to-end in under a day on a single 4-GPU node. Despite being more than an order of magnitude smaller than large foundation models, our model trained on HG002 performs on par with AlphaGenome for predicting the effects of dsQTL and eQTL variants.

## A built-in test set for variant effects
Because FiberTron is trained only on the reference sequence, each sample's own phased long-read data is never seen during training. This means the sample's real differences between its two copies of the genome can be used as an independent test of the model's variant-effect predictions.
## What FiberTron finds
Across samples, FiberTron:
- recapitulates OAS1 splicing variation associated with COVID-19 risk,
- recovers 79% of allele-specific accessibility variants in a melanoma cell line,
- identifies oncogenic TERT promoter and TAL1 enhancer mutations.
In a sample from a patient with clear cell sarcoma, a rare cancer, FiberTron also predicts the expression of the EWSR1::ATF1 fusion transcript and captures the fusion's distinctive imprint on chromatin.
## Why it matters
Our hope is that lightweight, single-sample training can bring base-resolution interpretation of non-coding variation within reach of individual labs. And, like Cybertron for the Transformers, we hope FiberTron can become a home planet for a new generation of S2F models built on long-read data.
## Acknowledgements
Huge thanks to my supervisor [Jonas Demeulemeester](https://www.kuleuven.be/wieiswie/en/person/00055916) and co-supervisor [Alejandro Sifrim](https://www.kuleuven.be/wieiswie/en/person/00041034), and to all co-authors and collaborators: [Laurens Lambrechts](https://www.kuleuven.be/wieiswie/en/person/00085175), [Joris Vande Velde](https://www.kuleuven.be/wieiswie/en/person/00080261), [Koen Theunis](https://www.kuleuven.be/wieiswie/en/person/00086782), Christopher Davies, Nischalan Pillay, [Kim De Keersmaecker](https://www.kuleuven.be/wieiswie/en/person/00046692) and [Stein Aerts](https://www.kuleuven.be/wieiswie/en/person/00038182).
Thanks also to [KU Leuven](https://www.kuleuven.be/english/kuleuven/), [Department of Oncology](https://gbiomed.kuleuven.be/english/research/50488876), the [VIB-KU Leuven Center for Cancer Biology](https://ccb.sites.vib.be/en/Cancer-Biology), [VIB.AI](https://vib.be/en/research-and-impact/research-centers/vibai-center-ai-computational-biology), the [Center for Human Genetics](https://gbiomed.kuleuven.be/english/cme), [VSC (Vlaams Supercomputer Centrum)](https://www.vscentrum.be/) and the [Research Foundation Flanders (FWO)](https://www.fwo.be/en/).

