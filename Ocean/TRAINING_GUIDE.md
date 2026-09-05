# AquaNex AI — YOLO11 Marine Debris Sonar Model Training Guide

This guide explains how to train, fine-tune, and evaluate the custom **YOLO11** object detection model (`best.pt`) for acoustic side-scan sonar marine debris detection in **AquaNex AI**.

---

## 1. Quick Start: How to Train Remaining Epochs

### Method 1: Using the Batch Script (Recommended for Windows)
Double-click `train_model.bat` or run in terminal:
```cmd
train_model.bat 10
```
*(Replace `10` with any desired number of epochs, e.g. `5`, `10`, `25`, `50`).*

---

### Method 2: Using the Python CLI in `.venv`
Run from the root directory:
```powershell
.\.venv\Scripts\python.exe backend\train_yolo11.py --epochs 10 --model-name backend\models\best.pt
```

#### Available CLI Arguments:
| Argument | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `--epochs` | Number of training epochs | `5` | `--epochs 20` |
| `--model-name` | Base weights checkpoint | `yolo11n.pt` | `--model-name backend/models/best.pt` |
| `--batch` | Batch size | `8` | `--batch 16` |
| `--imgsz` | Image resolution | `640` | `--imgsz 640` |
| `--data` | Path to dataset YAML | `marine_debris_dataset/data.yaml` | `--data custom_data.yaml` |
| `--device` | Device (`cpu` or `0` for CUDA GPU) | Auto-detected | `--device 0` |
| `--resume` | Resume interrupted training | `False` | `--resume` |

---

## 2. 10 Marine Debris Classes Supported

The YOLO11 model is trained on the standardized 10-class marine debris taxonomy:

| ID | Class Name | Examples / Acoustic Profile | Threat Level |
| :---: | :--- | :--- | :---: |
| **0** | **Plastic Debris** | Bottles, plastic sheeting, bags, containers | `MEDIUM` |
| **1** | **Fishing Gear** | Ghost nets, ropes, longlines, trawl netting | `HIGH` |
| **2** | **Metal Debris** | Steel barrels, pipes, scrap frames, engines | `MEDIUM` |
| **3** | **Wood Debris** | Waterlogged timber, pilings, logs | `LOW` |
| **4** | **Rubber Debris** | Vehicle tires, docking bumpers, rubber rings | `MEDIUM` |
| **5** | **Glass Debris** | Glass bottles, ceramic containers | `LOW` |
| **6** | **Abandoned Equipment** | Crab traps, oceanographic frames, buoys | `HIGH` |
| **7** | **Ship/Boat Debris** | Sunken vessel hulls, structural wreckage | `HIGH` |
| **8** | **Other Man-made Debris** | Miscellaneous synthetic discarded items | `LOW` |
| **9** | **Unknown Anomaly** | Sonar target requiring secondary verification | `REVIEW REQUIRED` |

---

## 3. Dataset Structure & Adding Custom Sonar Imagery

The training dataset is structured in standard YOLO format:

```text
marine_debris_dataset/
├── data.yaml              <- Dataset configuration & class labels
├── train/
│   ├── images/            <- Training sonar frames (.png, .jpg)
│   └── labels/            <- Normalized YOLO bounding boxes (.txt)
├── valid/
│   ├── images/            <- Validation frames
│   └── labels/            <- Validation labels
└── test/
    ├── images/            <- Unseen test evaluation frames
    └── labels/            <- Test labels
```

### Format of `.txt` Label Files:
Each line represents one detected object:
```text
<class_id> <x_center> <y_center> <width> <height>
```
*(All coordinates normalized between `0.0` and `1.0`).*

### Adding More Data:
1. Place your new sonar images in `marine_debris_dataset/train/images/`.
2. Add corresponding annotation `.txt` files in `marine_debris_dataset/train/labels/`.
3. Re-run `train_model.bat` to fine-tune `backend/models/best.pt`.

---

## 4. Where the Model is Saved & How AquaNex AI Uses It

When training completes:
1. Ultralytics saves checkpoints in `runs/detect/aquanex_yolo11_run/weights/`.
2. `train_yolo11.py` automatically copies the top-performing weights to:
   ```text
   backend/models/best.pt
   ```
3. The FastAPI backend (`backend/main.py`) loads `backend/models/best.pt` for inference.
4. If you train new weights while the server is running, the server hot-reloads them via:
   `POST http://127.0.0.1:8000/api/reload-model`

---

## 5. Launching the Full AquaNex AI Application

### One-Click Launch:
Double-click `start_app.bat` or run:
```powershell
.\.venv\Scripts\python.exe backend\main.py
```
Then visit:
```text
http://127.0.0.1:8000/
```
The FastAPI backend serves both the REST API (`/api/analyze-sonar`) and the complete frontend UI (`index.html`, `css/`, `js/`).
