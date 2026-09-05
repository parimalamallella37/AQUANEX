"""
AquaNex AI - Custom 10-Class YOLO11 Marine Debris Sonar Dataset Generator

Generates high-fidelity side-scan sonar imagery modeling real acoustic physics:
- Specular acoustic highlights (high backscatter reflection from dense/metallic/polymer materials)
- Acoustic shadow projection (sound obstruction casting shadows outward from nadir)
- Natural sediment backscatter with sand ripples and background noise
- YOLO normalized bounding boxes: <class_id> <x_center> <y_center> <width> <height>

Target Classes:
0: Plastic Debris (bottles, containers, fragments)
1: Fishing Gear (nets, ropes, fishing lines)
2: Metal Debris (sheets, pipes, cans, machinery)
3: Wood Debris (logs, wooden structures)
4: Rubber Debris (tires, rubber objects)
5: Glass Debris (glass bottles, objects)
6: Abandoned Equipment (traps, buoys, cages)
7: Ship/Boat Debris (vessel fragments, shipwreck debris)
8: Other Man-made Debris (other artificial objects)
9: Unknown Anomaly (suspicious sonar target)
"""

import os
import random
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CLASSES = [
    'Plastic Debris',
    'Fishing Gear',
    'Metal Debris',
    'Wood Debris',
    'Rubber Debris',
    'Glass Debris',
    'Abandoned Equipment',
    'Ship/Boat Debris',
    'Other Man-made Debris',
    'Unknown Anomaly'
]

def create_sonar_texture(width=640, height=480, palette='copper'):
    """Generates authentic side-scan sonar background with nadir dead zone and ripples."""
    base = np.random.normal(loc=75, scale=18, size=(height, width)).astype(np.float32)
    
    # Add slant-range attenuation & sand ripples
    y_coords, x_coords = np.indices((height, width))
    ripple_freq = random.uniform(0.04, 0.08)
    ripples = np.sin(x_coords * ripple_freq + np.cos(y_coords * 0.02) * 2.0) * 12.0
    base += ripples
    
    # Nadir dead-zone track down center
    nadir_cx = width // 2
    nadir_half_w = int(width * 0.035)
    
    # Nadir column is darker water column
    base[:, nadir_cx - nadir_half_w : nadir_cx + nadir_half_w] = np.random.normal(loc=20, scale=6, size=(height, nadir_half_w * 2))
    
    # High-reflectance first bottom return along nadir edge
    base[:, nadir_cx - nadir_half_w - 3 : nadir_cx - nadir_half_w] += 60.0
    base[:, nadir_cx + nadir_half_w : nadir_cx + nadir_half_w + 3] += 60.0
    
    base = np.clip(base, 0, 255).astype(np.uint8)
    
    # Convert to RGB with acoustic palette
    if palette == 'copper':
        r = (base * 1.0).astype(np.uint8)
        g = (base * 0.65).astype(np.uint8)
        b = (base * 0.25).astype(np.uint8)
    elif palette == 'ocean':
        r = (base * 0.15).astype(np.uint8)
        g = (base * 0.75).astype(np.uint8)
        b = (base * 0.85).astype(np.uint8)
    else: # grayscale acoustic
        r = g = b = base
        
    rgb = np.stack([r, g, b], axis=-1)
    img = Image.fromarray(rgb)
    return img.filter(ImageFilter.GaussianBlur(radius=0.7))

def add_debris_feature(draw, class_id, img_w=640, img_h=480, palette='copper'):
    """
    Renders acoustic highlights and acoustic shadows for each of the 10 classes.
    Acoustic shadow always projects AWAY from the center nadir track!
    """
    nadir_x = img_w // 2
    
    # Place on Port or Starboard side
    is_port = random.choice([True, False])
    if is_port:
        x = random.randint(30, nadir_x - 120)
        shadow_dir = -1  # shadow projects leftward (away from nadir)
    else:
        x = random.randint(nadir_x + 60, img_w - 140)
        shadow_dir = 1   # shadow projects rightward (away from nadir)
        
    y = random.randint(40, img_h - 130)
    
    # Colors
    if palette == 'copper':
        highlight_color = (255, 235, 170)
        shadow_color = (12, 8, 4)
    elif palette == 'ocean':
        highlight_color = (180, 255, 250)
        shadow_color = (4, 15, 25)
    else:
        highlight_color = (245, 245, 245)
        shadow_color = (10, 10, 10)
        
    # Class-specific acoustic geometries
    if class_id == 0:  # Plastic Debris (bottles, containers, fragments)
        w = random.randint(45, 75)
        h = random.randint(40, 65)
        shadow_len = random.randint(40, 65) * shadow_dir
        draw.ellipse([x + shadow_len, y + 4, x + w + shadow_len, y + h + 8], fill=shadow_color)
        draw.ellipse([x, y, x + w, y + h], fill=highlight_color)
        for _ in range(3):
            fx = random.randint(x, x + w - 10)
            fy = random.randint(y, y + h - 10)
            draw.rectangle([fx, fy, fx + 8, fy + 8], fill=highlight_color)
            
    elif class_id == 1:  # Fishing Gear (nets, ropes, fishing lines)
        w = random.randint(120, 190)
        h = random.randint(85, 140)
        shadow_len = random.randint(65, 100) * shadow_dir
        draw.polygon([
            (x + shadow_len, y), 
            (x + w + shadow_len, y + 20), 
            (x + w + shadow_len - 15, y + h + 25), 
            (x + shadow_len, y + h)
        ], fill=shadow_color)
        draw.polygon([(x, y), (x + w, y + 20), (x + w - 15, y + h), (x, y + h - 10)], fill=highlight_color)
        for row in range(y, y + h, 12):
            draw.line([(x, row), (x + w, row + 8)], fill=shadow_color, width=1)
            draw.line([(x + 5, row + 2), (x + w - 5, row + 10)], fill=highlight_color, width=1)
            
    elif class_id == 2:  # Metal Debris (sheets, pipes, machinery)
        w = random.randint(90, 160)
        h = random.randint(25, 45)
        shadow_len = random.randint(50, 75) * shadow_dir
        draw.rectangle([x + shadow_len, y + 8, x + w + shadow_len, y + h + 25], fill=shadow_color)
        draw.rectangle([x, y, x + w, y + h], fill=highlight_color)
        draw.line([(x, y), (x + w, y)], fill=(255, 255, 255), width=2)
        
    elif class_id == 3:  # Wood Debris (logs, wooden structures)
        w = random.randint(110, 170)
        h = random.randint(20, 35)
        shadow_len = random.randint(35, 55) * shadow_dir
        draw.rectangle([x + shadow_len, y + 6, x + w + shadow_len, y + h + 18], fill=shadow_color)
        draw.rounded_rectangle([x, y, x + w, y + h], radius=6, fill=highlight_color)
        
    elif class_id == 4:  # Rubber Debris (tires, circular objects)
        w = random.randint(50, 70)
        h = random.randint(50, 70)
        shadow_len = random.randint(40, 60) * shadow_dir
        draw.ellipse([x + shadow_len, y, x + w + shadow_len, y + h], fill=shadow_color)
        draw.ellipse([x, y, x + w, y + h], outline=highlight_color, width=5)
        draw.ellipse([x + 15, y + 15, x + w - 15, y + h - 15], fill=shadow_color)
        
    elif class_id == 5:  # Glass Debris (glass bottles, small containers)
        w = random.randint(25, 40)
        h = random.randint(25, 40)
        shadow_len = random.randint(20, 35) * shadow_dir
        draw.ellipse([x + shadow_len, y, x + w + shadow_len, y + h], fill=shadow_color)
        draw.ellipse([x, y, x + w, y + h], fill=highlight_color)
        
    elif class_id == 6:  # Abandoned Equipment (traps, buoys, cages)
        w = random.randint(75, 115)
        h = random.randint(70, 105)
        shadow_len = random.randint(50, 80) * shadow_dir
        draw.rectangle([x + shadow_len, y, x + w + shadow_len, y + h + 15], fill=shadow_color)
        draw.rectangle([x, y, x + w, y + h], outline=highlight_color, width=3)
        draw.line([(x, y), (x + w, y + h)], fill=highlight_color, width=2)
        draw.line([(x + w, y), (x, y + h)], fill=highlight_color, width=2)
        
    elif class_id == 7:  # Ship/Boat Debris (vessel fragments, shipwreck debris)
        w = random.randint(150, 240)
        h = random.randint(75, 130)
        shadow_len = random.randint(70, 110) * shadow_dir
        draw.polygon([
            (x + shadow_len, y),
            (x + w + shadow_len, y + 30),
            (x + w + shadow_len - 20, y + h + 30),
            (x + shadow_len, y + h)
        ], fill=shadow_color)
        draw.polygon([
            (x, y),
            (x + w, y + 30),
            (x + w - 20, y + h),
            (x, y + h)
        ], fill=highlight_color)
        draw.rectangle([x + 30, y + 20, x + w - 30, y + h - 20], fill=shadow_color)
        
    elif class_id == 8:  # Other Man-made Debris (artificial objects)
        w = random.randint(60, 100)
        h = random.randint(50, 85)
        shadow_len = random.randint(45, 70) * shadow_dir
        draw.polygon([
            (x + shadow_len, y),
            (x + w + shadow_len, y),
            (x + w + shadow_len, y + h),
            (x + shadow_len, y + h)
        ], fill=shadow_color)
        draw.polygon([(x, y), (x + w, y + 10), (x + w - 10, y + h), (x + 10, y + h)], fill=highlight_color)
        
    else:  # Unknown Anomaly (suspicious target)
        w = random.randint(70, 120)
        h = random.randint(60, 95)
        shadow_len = random.randint(50, 80) * shadow_dir
        draw.polygon([(x + shadow_len, y), (x + w + shadow_len, y + 10), (x + w + shadow_len, y + h), (x + shadow_len, y + h)], fill=shadow_color)
        draw.polygon([(x + 20, y), (x + w, y + 15), (x + w - 15, y + h), (x, y + h - 15)], fill=highlight_color)
        
    # Calculate normalized YOLO bounding box coordinates
    x_center = (x + w / 2) / img_w
    y_center = (y + h / 2) / img_h
    norm_w = w / img_w
    norm_h = h / img_h
    
    return f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}"

def generate_split(split_name, count=40, base_dir='marine_debris_dataset'):
    img_dir = os.path.join(base_dir, split_name, 'images')
    lbl_dir = os.path.join(base_dir, split_name, 'labels')
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)
    
    for i in range(1, count + 1):
        filename = f"sonar_{split_name}_{i:03d}"
        img_path = os.path.join(img_dir, f"{filename}.png")
        lbl_path = os.path.join(lbl_dir, f"{filename}.txt")
        
        palette = random.choice(['copper', 'ocean', 'grayscale'])
        sonar_img = create_sonar_texture(640, 480, palette)
        draw = ImageDraw.Draw(sonar_img)
        
        annotations = []
        # 15% clean seafloor (no objects)
        if random.random() < 0.15:
            pass  # Empty label file = clean seafloor / no debris
        else:
            # 1 to 3 objects per frame
            num_objects = random.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]
            # Ensure balanced coverage across all 10 classes
            for _ in range(num_objects):
                class_id = (i + _) % 10
                ann = add_debris_feature(draw, class_id, 640, 480, palette)
                annotations.append(ann)
                
        sonar_img.save(img_path, 'PNG')
        with open(lbl_path, 'w') as f:
            f.write('\n'.join(annotations))
            
    print(f"Generated {count} images and annotations for {split_name}.")

def create_dataset_yaml(base_dir='marine_debris_dataset'):
    yaml_content = f"""# AquaNex AI - YOLO11 Marine Debris Sonar Dataset
train: train/images
val: valid/images
test: test/images

nc: 10

names:
  - Plastic Debris
  - Fishing Gear
  - Metal Debris
  - Wood Debris
  - Rubber Debris
  - Glass Debris
  - Abandoned Equipment
  - Ship/Boat Debris
  - Other Man-made Debris
  - Unknown Anomaly
"""
    yaml_path = os.path.join(base_dir, 'data.yaml')
    with open(yaml_path, 'w') as f:
        f.write(yaml_content.strip() + '\n')
    print(f"Created {yaml_path}")

if __name__ == '__main__':
    base_dir = 'marine_debris_dataset'
    os.makedirs(base_dir, exist_ok=True)
    create_dataset_yaml(base_dir)
    generate_split('train', count=60, base_dir=base_dir)
    generate_split('valid', count=20, base_dir=base_dir)
    generate_split('test', count=20, base_dir=base_dir)
    print("YOLO11 Marine Debris Dataset generation complete! Total 100 sonar frames.")
