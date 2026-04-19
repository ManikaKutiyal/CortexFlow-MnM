import os
import numpy as np
import nibabel as nib
from scipy.ndimage import gaussian_filter, binary_fill_holes, binary_dilation
from skimage.measure import marching_cubes

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(SCRIPT_DIR, "..", "public")
NIFTI_PATH = os.path.join(PUBLIC_DIR, "cortexflow_reference_mni.nii.gz")

REGIONS = [
    {
        "id": "broca",
        "name": "Broca's area (IFG: BA44 + BA45)",
        "centers_mni": [
            [-48, 12, 18],
            [-46, 16, 12],
            [-44, 20, 8],
            [-46, 26, 6],
            [-48, 30, 2],
            [-50, 14, 24],
        ],
        "sigma_mm": [8, 10, 8],
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "wernicke",
        "name": "Wernicke's area (posterior STG)",
        "centers_mni": [
            [-52, -22, 6],
            [-54, -30, 8],
            [-54, -40, 14],
            [-52, -48, 16],
            [-50, -54, 20],
            [-56, -34, 10],
        ],
        "sigma_mm": [7, 10, 7],
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "dlpfc",
        "name": "DLPFC (BA9/46)",
        "centers_mni": [
            [-42, 40, 24],
            [-44, 32, 28],
            [-46, 20, 32],
            [-44, 12, 36],
            [-40, 44, 20],
            [-46, 24, 38],
        ],
        "sigma_mm": [7, 10, 7],
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "sma",
        "name": "SMA (medial BA6)",
        "centers_mni": [
            [-4, 8, 56],
            [-2, 2, 58],
            [0, -4, 60],
            [2, -10, 62],
            [4, -16, 64],
            [0, 0, 66],
        ],
        "sigma_mm": [8, 10, 6],
        "gm_threshold_pct": 30,
        "mc_level": 0.20,
    },
    {
        "id": "amygdala",
        "name": "Amygdala",
        "centers_mni": [
            [-24, -4, -22],
            [-22, -2, -18],
            [-26, -6, -24],
            [-20, 0, -16],
            [-28, -8, -22],
            [-22, -4, -26],
        ],
        "sigma_mm": [5, 5, 5],
        "gm_threshold_pct": 20,
        "mc_level": 0.18,
    },
]

def write_obj(vertices, faces, normals, filepath):
    with open(filepath, "w") as f:
        f.write(f"# {os.path.basename(filepath)}\n")
        f.write(f"# Vertices: {len(vertices)}, Faces: {len(faces)}\n\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        f.write("\n")
        for n in normals:
            f.write(f"vn {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}\n")
        f.write("\n")
        for face in faces:
            a, b, c = face + 1
            f.write(f"f {a}//{a} {b}//{b} {c}//{c}\n")


def mni_to_voxel(mni_coord, affine):
    inv_affine = np.linalg.inv(affine)
    mni_homo = np.array([*mni_coord, 1.0])
    voxel = (inv_affine @ mni_homo)[:3]
    return voxel


def voxel_to_threejs(vertices, center, extent):
    scaled = (vertices - center) * (2.0 / extent)
    return np.column_stack([
        scaled[:, 0],
        scaled[:, 2],
        -scaled[:, 1],
    ])


def normals_to_threejs(normals):
    return np.column_stack([
        normals[:, 0],
        normals[:, 2],
        -normals[:, 1],
    ])


def build_region_field(data_region, region, affine, region_step):
    region_shape = data_region.shape
    voxel_size = abs(affine[0, 0]) * region_step

    sigma_vox = [s / voxel_size for s in region["sigma_mm"]]

    ii, jj, kk = np.mgrid[0:region_shape[0], 0:region_shape[1], 0:region_shape[2]]

    field = np.zeros(region_shape, dtype=np.float64)
    for mni_center in region["centers_mni"]:
        vc = mni_to_voxel(mni_center, affine) / region_step

        dist_sq = (
            ((ii - vc[0]) / sigma_vox[0]) ** 2 +
            ((jj - vc[1]) / sigma_vox[1]) ** 2 +
            ((kk - vc[2]) / sigma_vox[2]) ** 2
        )
        field += np.exp(-dist_sq / 2.0)

    field /= field.max()

    nonzero = data_region[data_region > 0]
    gm_low = np.percentile(nonzero, region["gm_threshold_pct"])
    gm_high = np.percentile(nonzero, 95)
    gm_mask = (data_region >= gm_low) & (data_region <= gm_high)

    if region["gm_threshold_pct"] < 25:
        subcort_low = np.percentile(nonzero, 10)
        subcort_mask = data_region >= subcort_low
        gm_mask = gm_mask | subcort_mask

    gm_mask = binary_dilation(gm_mask, iterations=1)

    field *= gm_mask.astype(np.float64)

    field = gaussian_filter(field, sigma=0.8)

    if field.max() > 0:
        field /= field.max()

    return field


def main():
    print(f"Loading {NIFTI_PATH}...")
    img = nib.load(NIFTI_PATH)
    data = img.get_fdata()
    affine = img.affine
    shape = data.shape
    print(f"  Volume: {shape}, range: [{data.min():.1f}, {data.max():.1f}]")

    print("\n=== Brain Surface ===")
    step = 3
    data_ds = data[::step, ::step, ::step]

    threshold = np.percentile(data_ds[data_ds > 0], 25)
    brain_mask = data_ds > threshold

    brain_mask = binary_fill_holes(brain_mask)
    smoothed = gaussian_filter(brain_mask.astype(np.float64), sigma=1.5)
    verts, faces, normals, _ = marching_cubes(smoothed, level=0.5)

    verts_orig = verts * step

    ones = np.ones((len(verts_orig), 1))
    verts_mni = (affine @ np.hstack([verts_orig, ones]).T).T[:, :3]

    global_center = (verts_mni.max(axis=0) + verts_mni.min(axis=0)) / 2
    global_extent = (verts_mni.max(axis=0) - verts_mni.min(axis=0)).max()

    print(f"  Global center: [{global_center[0]:.1f}, {global_center[1]:.1f}, {global_center[2]:.1f}]")
    print(f"  Global extent: {global_extent:.1f} mm, scale: {2.0/global_extent:.6f}")

    verts_three = voxel_to_threejs(verts_mni, global_center, global_extent)
    normals_three = normals_to_threejs(normals)

    brain_path = os.path.join(PUBLIC_DIR, "cortexflow_surface_mesh.obj")
    write_obj(verts_three, faces, normals_three, brain_path)
    print(f"  Saved: {brain_path}")
    print(f"  {len(verts_three)} vertices, {len(faces)} faces, {os.path.getsize(brain_path)/1024:.0f} KB")

    print("\n=== Anatomically-Shaped Region Meshes ===")

    region_step = 2
    data_region = data[::region_step, ::region_step, ::region_step]

    for region in REGIONS:
        print(f"\n  [{region['id']}] {region['name']}")
        print(f"    Sub-centers: {len(region['centers_mni'])} MNI points")
        print(f"    Sigma (mm): {region['sigma_mm']}")

        field = build_region_field(data_region, region, affine, region_step)

        print(f"    Field max: {field.max():.3f}, nonzero voxels: {(field > 0.01).sum()}")

        try:
            r_verts, r_faces, r_normals, _ = marching_cubes(field, level=region["mc_level"])
        except ValueError:
            print(f"    SKIP: no surface found at level={region['mc_level']}")
            continue

        r_verts_orig = r_verts * region_step

        r_verts_mni = (affine @ np.hstack([r_verts_orig, np.ones((len(r_verts_orig), 1))]).T).T[:, :3]

        r_verts_three = voxel_to_threejs(r_verts_mni, global_center, global_extent)
        r_normals_three = normals_to_threejs(r_normals)

        bbox_min = r_verts_mni.min(axis=0)
        bbox_max = r_verts_mni.max(axis=0)
        bbox_size = bbox_max - bbox_min
        print(f"    MNI bbox: [{bbox_min[0]:.0f},{bbox_min[1]:.0f},{bbox_min[2]:.0f}] to [{bbox_max[0]:.0f},{bbox_max[1]:.0f},{bbox_max[2]:.0f}]")
        print(f"    Extent: {bbox_size[0]:.0f} x {bbox_size[1]:.0f} x {bbox_size[2]:.0f} mm")
        region_filename = {
            "broca": "cortex_region_language_exec.obj",
            "wernicke": "cortex_region_language_comp.obj",
            "dlpfc": "cortex_region_exec_control.obj",
            "sma": "cortex_region_motor_planning.obj",
            "amygdala": "cortex_region_affect_hub.obj",
        }[region["id"]]
        region_path = os.path.join(PUBLIC_DIR, region_filename)
        write_obj(r_verts_three, r_faces, r_normals_three, region_path)
        print(f"    Saved: {region_path}")
        print(f"    {len(r_verts_three)} vertices, {len(r_faces)} faces, {os.path.getsize(region_path)/1024:.0f} KB")


if __name__ == "__main__":
    main()
