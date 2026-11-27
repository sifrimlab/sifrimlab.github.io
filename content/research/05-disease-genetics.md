---
slug: disease-genetics
title: Genetic architecture of human disease
order: 5
question: >-
  Of the millions of variants in a patient's genome, which ones cause disease, for example in congenital heart disease,
  and how does genetic variation act through gene regulation?
approach: >-
  Deep learning models that integrate variant features, gene expression and patient phenotypes to prioritise candidate variants,
  and neural networks that predict chromatin accessibility from long-read sequencing data.
resources: []
publications:
  - doi:10.1038/s41525-026-00582-z
  - doi:10.1016/j.gim.2023.101059
  - doi:10.1371/journal.pgen.1009679
people:
  - fatemeh-hoseinkhani
  - vasiliki-stamatiou
  - marios-eftychiou
  - laurens-hannes
---

Genome sequencing produces millions of variants per individual, the vast majority of which are benign.
Identifying the small subset responsible for disease is a critical bottleneck in clinical genetics.
As part of the **DeepHeart** project, we are developing deep learning models that integrate variant features, gene expression, and patient phenotypes to prioritise candidate variants in congenital heart disease, improving diagnostic yield for patients.
In the related DeepHeartNet project, long-read whole-genome sequencing is used to identify gene–phenotype associations and capture complex genetic variation in non-syndromic congenital heart disease.

A second direction asks how variation acts through the regulatory genome: we develop deep neural network architectures that predict chromatin accessibility from long-read sequencing data, to study the impact of genetic variation in cancers such as sarcomas.

This work builds on the group's long-standing contributions to variant prioritisation by genomic data fusion ([Sifrim et al., *Nature Methods* 2013](https://doi.org/10.1038/nmeth.2656)) and to the genetic architecture of congenital heart disease ([Sifrim et al., *Nature Genetics* 2016](https://doi.org/10.1038/ng.3627)).
