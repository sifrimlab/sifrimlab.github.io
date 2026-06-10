---
title: Research
nav:
  order: 1
  tooltip: Published works
---

# {% include icon.html icon="fa-solid fa-microscope" %}Research

We develop machine learning and statistical methods to make sense of complex, multi-modal biological data.
Our work spans tool development, disease modelling, and collaborative data analysis, always with a focus on reproducibility and biological interpretability.

{% include section.html %}

## Multi-omic Integration

Modern biology generates data across many molecular layers: genome, transcriptome, proteome, and more.
We build computational methods that jointly analyse these heterogeneous datasets to reveal biological patterns invisible in any single modality.
Our recent tool [Multiverse](https://github.com/sifrimlab/multiverse) provides a reproducible benchmarking framework for multimodal single-cell integration, and [MIMA](https://github.com/sifrimlab/mima) is a multimodal variational autoencoder for learning unified cellular representations.

{% include section.html dark=true %}

## DeepHeart - Variant Prioritization for Congenital Heart Disease

Genome sequencing produces millions of variants per individual, the vast majority of which are benign.
Identifying the small subset responsible for disease is a critical bottleneck in clinical genetics.
As part of the **DeepHeart** project, we are developping deep learning models that integrate variant features, gene expression, and patient phenotypes to prioritize candidate variants in congenital heart disease, improving diagnostic yield for patients.

{% include section.html %}

## Explainable AI for Multi-omic Representation Learning

Building accurate models is not enough; we need to understand what they learn.
We are developping explainability methods tailored to multi-omic settings, enabling researchers to trace model predictions back to interpretable biological features such as gene programmes, regulatory elements, and cell states.
This work bridges the gap between black-box deep learning and actionable biological insight.

{% include section.html dark=true %}

## RNA Subcellular Organization

Where an RNA molecule sits inside a cell is not random, subcellular localisation is tightly regulated and functionally important.
We develop deep learning models that map RNA localisation at subcellular resolution by fusing transcriptomic readouts with high-content microscopy images.
Our tool [Subcellspace](https://github.com/sifrimlab/subcellspace) provides an end-to-end pipeline for this analysis.

{% include section.html %}

## Collaborative Bioinformatics within LISCO

As members of the [Leuven Single-Cell Institute (LISCO)](https://lisco.kuleuven.be), we work closely with experimental groups to help them get the most from their single-cell and spatial data.
A key focus is end-to-end analysis pipelines for marker gene identification, from raw count matrices to biologically validated cell-type signatures.
These collaborations drive new methodological questions and ensure our tools are tested on real and diverse datasets.

{% include section.html %}

## Highlighted Publications

{% include citation.html lookup="doi:10.1101/2025.10.21.683449" style="rich" %}
{% include citation.html lookup="doi:10.64898/2026.04.28.720613" style="rich" %}

{% include section.html %}

## All Publications

{% include search-box.html %}

{% include search-info.html %}

{% include list.html data="citations" component="citation" style="rich" %}
