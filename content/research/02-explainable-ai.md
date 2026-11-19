---
slug: explainable-ai
title: Explainable AI for multi-omic representation learning
order: 2
question: >-
  Which genes, regulators and molecular features does a model actually rely on,
  and can what it has learned be turned into testable biological hypotheses?
approach: >-
  Feature-attribution methods that respect dependencies between inputs. Causal Integrated Gradients routes
  attributions along prior causal structure, such as a transcription factor regulating its target gene,
  and separates direct from mediated effects.
resources:
  - causal-ig
publications:
  - arxiv:2610.22126
people:
  - joran-michiels
  - anis-ismail
---

Building accurate models is not enough; we need to understand what they learn.
We are developing explainability methods tailored to multi-omic settings, enabling researchers to trace model predictions back to interpretable biological features such as gene programmes, regulatory elements, and cell states.
This work bridges the gap between black-box deep learning and actionable biological insight.

Standard attribution methods treat input features as independent.
When features are causally related, they tend to credit a downstream correlate, for example a target gene, rather than the upstream driver, such as the transcription factor that regulates it.
**Causal Integrated Gradients** embeds a known causal graph in the integration path, decomposing each feature's attribution into a direct effect and effects mediated through its causal descendants, at the computational cost of standard Integrated Gradients.
On simulated single-cell expression data with a known gene regulatory network, it most accurately recovers the transcription factors that drive the simulation.

We also use feature attribution methods to investigate the inner workings of multi-omic integration models. With MIMA and the prostate cancer dataset from that work as a case study, the aim is to uncover the biological signals these models learn and the molecular features, across modalities, that may contribute to prostate cancer biology.
