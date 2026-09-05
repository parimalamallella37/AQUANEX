import os
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CLASSES = [
    'Ghost Net',
    'Plastic Debris',
    'Fishing Net',
    'Tire',
    'Metal Object',
    'Bottle',
    'Unknown Debris',
    'Natural Seafloor / No Debris'
]

def create_sonar_texture(width=640, height=480, palette='copper'):
    """Generates authentic side-scan sonar acoustic backscatter texture."""
    # Base acoustic sediment noise
    noise = np.random.rayleigh(scale=35, size=(height, width))
    
    # Sand ripples (periodic acoustic dunes)
    x = np.linspace(0, 10 * np.pi, width)
    y = np.linspace(0, 15 * np.pi, height)
    xx, yy = np.meshgrid(x, y)
    ripples = np.sin(xx * 0.4 + yy * 0.2) * 18 + np.sin(xx * 0.8) * 8
    
    acoustic_data = noise + ripples + 70
    acoustic_data = np.clip(acoustic_data, 10, 255).astype(np.uint8)
    
    img = Image.fromarray(acoustic_data, mode='L')
    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))
    
    # Apply color gradient matching EdgeTech / Klein Marine sonar
    rgb_img = Image.new('RGB', (width, height))
    pixels = np.array(img)
    
    if palette == 'copper':
        r = np.clip(pixels * 1.15, 0, 255).astype(np.uint8)
        g = np.clip(pixels * 0.72, 0, 255).astype(np.uint8)
        b = np.clip(pixels * 0.35, 0, 255).astype(np.uint8)
    else:
        r = np.clip(pixels * 0.25, 0, 255).astype(np.uint8)
        g = np.clip(pixels * 0.85, 0, 255).astype(np.uint8)
        b = np.clip(pixels * 1.05, 0, 255).astype(np.uint8)
        
    rgb = np.stack([r, g, b], axis=-1)
    sonar_img = Image.fromarray(rgb, mode='RGB')
    
    # Add central nadir dead zone (water column beneath towfish)
    draw = ImageDraw.Draw(sonar_img)
    nadir_cx = width // 2
    nadir_w = 16
    draw.rectangle([nadir_cx - nadir_w//2, 0, nadir_cx + nadir_w//2, height], fill=(4, 8, 14))
    
    return sonar_img

def add_debris_feature(draw, class_id, img_w, img_h, palette='copper'):
    """Draws specular highlight and acoustic shadow for a debris target and returns YOLO box."""
    # Place debris in port or starboard channel (avoiding center nadir)
    is_port = random.choice([True, False])
    margin = 50
    if is_port:
        x_min = margin
        x_max = (img_w // 2) - 80
    else:
        x_min = (img_w // 2) + 80
        x_max = img_w - margin - 100
        
    x = random.randint(x_min, x_max)
    y = random.randint(60, img_h - 140)
    
    highlight_color = (255, 235, 175) if palette == 'copper' else (200, 255, 255)
    shadow_color = (2, 4, 8)
    
    if class_id == 0:  # Ghost Net
        w = random.randint(110, 160)
        h = random.randint(90, 140)
        # Shadow casts outwards away from nadir
        shadow_ox = -60 if is_port else 60
        draw.polygon([
            (x + 10, y), (x + shadow_ox, y + 10),
            (x + w + shadow_ox, y + h + 10), (x + w - 10, y + h)
        ], fill=shadow_color)
        # Tangled mesh highlight
        for i in range(12):
            ox = random.randint(0, w)
            oy = random.randint(0, h)
            draw.line([(x + ox, y + oy), (x + ox + random.randint(-15, 15), y + oy + random.randint(-15, 15))], fill=highlight_color, width=2)
            
    elif class_id == 1:  # Plastic Debris
        w = random.randint(60, 90)
        h = random.randint(50, 80)
        shadow_ox = -40 if is_port else 40
        draw.polygon([(x, y), (x + shadow_ox, y), (x + w + shadow_ox, y + h), (x + w, y + h)], fill=shadow_color)
        draw.rectangle([x, y, x + w, y + h], outline=highlight_color, width=2)
        
    elif class_id == 2:  # Fishing Net
        w = random.randint(90, 130)
        h = random.randint(70, 110)
        shadow_ox = -50 if is_port else 50
        draw.polygon([(x, y), (x + shadow_ox, y), (x + w + shadow_ox, y + h), (x + w, y + h)], fill=shadow_color)
        for row in range(y, y + h, 14):
            draw.line([(x, row), (x + w, row)], fill=highlight_color, width=1)
            
    elif class_id == 3:  # Tire
        w = random.randint(45, 65)
        h = random.randint(45, 65)
        shadow_ox = -35 if is_port else 35
        draw.ellipse([x + shadow_ox, y, x + w + shadow_ox, y + h], fill=shadow_color)
        draw.ellipse([x, y, x + w, y + h], outline=highlight_color, width=4)
        draw.ellipse([x + 15, y + 15, x + w - 15, y + h - 15], fill=shadow_color)
        
    elif class_id == 4:  # Metal Object (Cylindrical / Beam)
        w = random.randint(100, 180)
        h = random.randint(30, 45)
        shadow_ox = -40 if is_port else 40
        draw.rectangle([x + shadow_ox, y + 10, x + w + shadow_ox, y + h + 25], fill=shadow_color)
        draw.rectangle([x, y, x + w, y + h], fill=highlight_color)
        
    elif class_id == 5:  # Bottle / Small Container
        w = random.randint(30, 45)
        h = random.randint(25, 40)
        shadow_ox = -25 if is_port else 25
        draw.ellipse([x + shadow_ox, y, x + w + shadow_ox, y + h], fill=shadow_color)
        draw.ellipse([x, y, x + w, y + h], fill=highlight_color)
        
    else:  # Unknown Debris
        w = random.randint(70, 110)
        h = random.randint(60, 95)
        shadow_ox = -45 if is_port else 45
        draw.polygon([(x, y), (x + shadow_ox, y), (x + w + shadow_ox, y + h), (x + w, y + h)], fill=shadow_color)
        draw.polygon([(x, y + 10), (x + w//2, y), (x + w, y + 20), (x + w - 10, y + h), (x + 10, y + h - 10)], fill=highlight_color)
        
    # Calculate normalized YOLO format: class_id x_center y_center width height
    x_center = (x + w / 2) / img_w
    y_center = (y + h / 2) / img_h
    norm_w = w / img_w
    norm_h = h / img_h
    
    return f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}"

def generate_dataset_split(split_name, count=20, base_dir='dataset'):
    """Generates a dataset split with images and YOLO annotation text files."""
    img_dir = os.path.join(base_dir, split_name, 'images')
    lbl_dir = os.path.join(base_dir, split_name, 'labels')
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(lbl_dir, exist_ok=True)
    
    for i in range(1, count + 1):
        filename = f"sonar_{split_name}_{i:03d}"
        img_path = os.path.join(img_dir, f"{filename}.png")
        lbl_path = os.path.join(lbl_dir, f"{filename}.txt")
        
        palette = random.choice(['copper', 'ocean'])
        sonar_img = create_sonar_texture(640, 480, palette)
        draw = ImageDraw.Draw(sonar_img)
        
        annotations = []
        
        # Decide scenario: Clean seafloor (class 7) or 1-3 debris objects
        if random.random() < 0.20:
            # Clean seafloor: no annotations needed in YOLO (empty file or class 7)
            pass
        else:
            # 1 to 3 debris items
            num_debris = random.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]
            for _ in range(num_debris):
                cls_id = random.randint(0, 6) # Classes 0 through 6
                ann = add_debris_feature(draw, cls_id, 640, 480, palette)
                annotations.append(ann)
                
        sonar_img.save(img_path, 'PNG')
        with open(lbl_path, 'w') as f:
            f.write('\n'.join(annotations))
            
    print(f"Generated {count} images and annotations for {split_name}.")

def create_dataset_yaml(base_dir='dataset'):
    yaml_content = f"""# AquaNex AI - YOLO Marine Debris Side-Scan Sonar Dataset
path: {os.path.abspath(base_dir)}
train: train/images
val: valid/images
test: test/images

# Number of target classes
nc: 8

# Target class names
names:
  0: 'Ghost Net'
  1: 'Plastic Debris'
  2: 'Fishing Net'
  3: 'Tire'
  4: 'Metal Object'
  5: 'Bottle'
  6: 'Unknown Debris'
  7: 'Natural Seafloor / No Debris'
"""
    with open(os.path.join(base_dir, 'data.yaml'), 'w') as f:
        f.write(yaml_content)
    print("Created data.yaml")

if __name__ == '__main__':
    base = 'dataset'
    generate_dataset_split('train', count=40, base_dir=base)
    generate_dataset_split('valid', count=15, base_dir=base)
    generate_dataset_split('test', count=15, base_dir=base)
    create_dataset_yaml(base)
    print("Dataset generation complete!")
