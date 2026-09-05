"""
AquaNex AI - YOLO11 Marine Debris Sonar Model Training Pipeline
Trains a real YOLO11 object detection model on the 10-class marine_debris_dataset.
Saves the optimized weights to backend/models/best.pt.
"""

import os
import sys
import shutil
from pathlib import Path
import argparse

CLASSES = [
    "Plastic Debris",
    "Fishing Gear",
    "Metal Debris",
    "Wood Debris",
    "Rubber Debris",
    "Glass Debris",
    "Abandoned Equipment",
    "Ship/Boat Debris",
    "Other Man-made Debris",
    "Unknown Anomaly"
]

def train_yolo11(
    data_yaml="marine_debris_dataset/data.yaml",
    epochs=5,
    imgsz=640,
    batch=8,
    model_name="yolo11n.pt",
    output_model="backend/models/best.pt",
    device=None,
    resume=False
):
    print("=" * 65)
    print("      AquaNex AI - YOLO11 Marine Debris Training Pipeline")
    print("=" * 65)
    
    # Check GPU availability
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda_available else "None (Using CPU)"
    except Exception:
        cuda_available = False
        gpu_name = "None"
        
    if device is None:
        device = "0" if cuda_available else "cpu"
        
    yaml_path = Path(data_yaml).resolve()
    if not yaml_path.exists():
        print(f"Error: Dataset configuration file not found at: {yaml_path}")
        return False
        
    print(f"Dataset Configuration : {yaml_path}")
    print(f"Target Epochs         : {epochs}")
    print(f"Image Resolution      : {imgsz}x{imgsz}")
    print(f"Batch Size            : {batch}")
    print(f"Base / Initial Model  : {model_name}")
    print(f"Compute Device        : {device} ({gpu_name})")
    print(f"Resume Training       : {resume}")
    print(f"Target Output Model   : {output_model}")
    print("-" * 65)

    try:
        from ultralytics import YOLO
        print("Ultralytics YOLO successfully loaded.")
        print(f"Initializing YOLO model: {model_name}...")
        
        model = YOLO(model_name)
        
        print("\n[Stage 1/2] Training across 10 marine debris sonar classes...")
        train_args = {
            "data": str(yaml_path),
            "epochs": epochs,
            "imgsz": imgsz,
            "batch": batch,
            "name": "aquanex_yolo11_run",
            "project": "runs/detect",
            "exist_ok": True,
            "save": True,
            "plots": True,
            "device": device,
            "verbose": True
        }
        if resume:
            train_args["resume"] = True
            
        results = model.train(**train_args)
        
        # Locate saved weights
        best_weights = Path(model.trainer.save_dir) / "weights" / "best.pt"
        if not best_weights.exists():
            best_weights = Path(model.trainer.save_dir) / "weights" / "last.pt"
            
        target_dest = Path(output_model).resolve()
        target_dest.parent.mkdir(parents=True, exist_ok=True)
        
        if best_weights.exists():
            shutil.copy(best_weights, target_dest)
            sz_mb = target_dest.stat().st_size / (1024 * 1024)
            print("\n" + "=" * 65)
            print(f"  ✓ TRAINING COMPLETED SUCCESSFULLY!")
            print(f"  ✓ Model saved to: {target_dest} ({sz_mb:.2f} MB)")
            print(f"  ✓ Training Run Dir: {model.trainer.save_dir}")
            print("=" * 65)
            
            # Print metrics if available
            try:
                metrics = model.val()
                print("\n[Validation Metrics]")
                print(f"  - Precision (B) : {metrics.box.mp:.4f}")
                print(f"  - Recall (B)    : {metrics.box.mr:.4f}")
                print(f"  - mAP50 (B)     : {metrics.box.map50:.4f}")
                print(f"  - mAP50-95 (B)  : {metrics.box.map:.4f}")
            except Exception as e:
                print(f"Metrics summary: {e}")
                
            return True
        else:
            print(f"Warning: Expected weights not found at {best_weights}.")
            return False
            
    except Exception as e:
        print(f"Error during YOLO11 training: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AquaNex AI YOLO11 model on marine debris sonar data")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs (e.g. 5, 10, 25, 50)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (e.g. 4, 8, 16)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution (default: 640)")
    parser.add_argument("--model-name", type=str, default="yolo11n.pt", help="Base model (yolo11n.pt or backend/models/best.pt)")
    parser.add_argument("--data", type=str, default="marine_debris_dataset/data.yaml", help="Path to data.yaml")
    parser.add_argument("--device", type=str, default=None, help="Device to use ('cpu' or '0')")
    parser.add_argument("--resume", action="store_true", help="Resume interrupted training")
    args = parser.parse_args()
    
    train_yolo11(
        data_yaml=args.data,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        model_name=args.model_name,
        device=args.device,
        resume=args.resume
    )