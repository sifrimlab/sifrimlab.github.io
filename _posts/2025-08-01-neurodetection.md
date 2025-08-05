---
title: New Paper for Deep Learning for Quantifying Neuron Loss in Alzheimer’s Disease
tags:
  - paper
  - research
last_modified_at: ""
---

<!-- excerpt start -->
<!-- excerpt end -->
Alzheimer’s disease involves the interplay of multiple pathological processes, ultimately leading to neuronal loss and brain degeneration. In our recent collaborative study with the [**Lab of Neuropathology**](https://gbiomed.kuleuven.be/english/research/50000666/50000668/53674587), we addressed a key challenge: **quantifying neuron loss that can be attributed to individual pathologies** across thousands of histological images, while accounting for both biological and technical variability.

To achieve this, our colleagues Geethika Arekatla and David Wouters trained a deep learning model on over 100,000 annotated objects. The resulting tool performs two core functions: it detects all objects in an image and classifies them as neurons or non-neurons with 95% accuracy. Independent benchmarking against expert human annotations demonstrated strong concordance, supporting its potential for routine use in neuropathology workflows.

The paper is published in [the Alzheimer's & Dementia® journal](https://doi.org/10.1002/alz.70483), and  the The model is open-source and available [here](https://github.com/neuropathology-lab/neurodetection).
{%
  include figure.html
  image="images/news/neurodetection.png"
  width="75%"
%}
