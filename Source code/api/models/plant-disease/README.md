# Plant disease inference model

This directory contains the ONNX deployment artifact derived from
`rarfileexe/Plant-Disease-Detector` on Hugging Face.

- Pinned source revision: `b84fad67ce0de5c092e0a086689d60cfcc4072ec`
- Pinned source artifact: `https://huggingface.co/rarfileexe/Plant-Disease-Detector/resolve/b84fad67ce0de5c092e0a086689d60cfcc4072ec/model_4_mobilenet_finetuned.keras`

- Architecture: MobileNetV2
- Source format: Keras 3
- Deployment format: ONNX opset 17
- Input: RGB float32 NHWC, `batch x 224 x 224 x 3`, values in `[0, 255]`
- Output: 38 PlantVillage class probabilities
- License: MIT

The source training graph contained random augmentation layers connected with
training enabled. The deployment graph removes those layers, preserves the
trained MobileNetV2 and classifier weights, and performs only the expected
MobileNetV2 scaling from `[0, 255]` to `[-1, 1]`.

The application deliberately enables only the tomato and bell-pepper class
groups. Unsupported crops must not be forced through the classifier.

The upstream author reports training on the augmented PlantVillage dataset and
credits the PlantVillage project and Hughes et al. The data consists mainly of
controlled-background leaf images, so field performance can be substantially
lower. The confidence and crop-mass thresholds in `metadata.json` are cautious
demo operating thresholds, not calibrated accuracy guarantees.
