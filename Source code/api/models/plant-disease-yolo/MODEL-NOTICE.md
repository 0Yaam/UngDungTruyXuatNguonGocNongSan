# Plant disease object detector

- Upstream model: `JK-TK/PlantDiseaseDetection`
- Revision: `ee651406dd0b0bc9aa0458834f28316fc34b4435`
- Architecture: YOLO11x, 116 classes
- Upstream model card license declaration: MIT
- Runtime artifact: ONNX, static 640x640 input with NMS output `[1, 300, 6]`

The `.pt` checkpoint was used only to export the ONNX artifact and is not required at runtime.
