"""Ten distinct RoboRally characters. Blender 4.4+, no external dependencies.

blender --background --factory-startup --python assets/robots/crew/generate.py
Pass -- --only bolt,gizmo to rerender selected previews while exporting all models.
Pass -- --skip-renders to update only GLBs, the manifest, and the Blender source.
"""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
from rig import rig_character, bind_mesh, animate_rig, tread_sample, FPS
ROSTER = json.loads((ROOT / "lib/robots.json").read_text())
MODELS = ROOT / "public/models/robots"
PREVIEWS = ROOT / "public/robots/previews"
MODELS.mkdir(parents=True, exist_ok=True)
PREVIEWS.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new("The Factory Misfits")
bpy.context.window.scene = scene
scene.unit_settings.system = "METRIC"
scene.render.fps = FPS
scene.frame_start = 0
scene.frame_end = 180
collection = None


def material(name, color, metal=0.35, rough=0.36, glow=0):
    values = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    rgb = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    if glow:
        shader.inputs["Emission Color"].default_value = (*rgb, 1)
        shader.inputs["Emission Strength"].default_value = glow
    return mat


SLATE = material("Chassis | blue steel", "#43545e", 0.65)
DARK = material("Rubber | charcoal", "#18232c", 0.05, 0.78)
SCREEN = material("Glass | midnight", "#0c1923", 0.35, 0.22)
SILVER = material("Hardware | silver", "#a7b7bd", 0.8, 0.3)
BRASS = material("Hardware | brass", "#cb9d52", 0.7, 0.3)
IVORY = material("Markings | ivory", "#f6e7c9", 0.1, 0.45)
LIGHT = material("Optics | warm white", "#ffe6a3", 0.1, 0.3, 0.65)
PINK_LIGHT = material("Optics | magenta", "#ff76c9", 0.1, 0.3, 0.65)


def finish(obj, name, mat, bevel=0, segments=2, smooth=False):
    obj.name = name
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    if smooth:
        for face in obj.data.polygons:
            face.use_smooth = True
    if bevel:
        mod = obj.modifiers.new("Soft machined corners", "BEVEL")
        mod.width, mod.segments = bevel, segments
        mod = obj.modifiers.new("Corner normals", "WEIGHTED_NORMAL")
        mod.keep_sharp = True
    return obj


def box(name, at, size, mat, bevel=0.018, rot=None, segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rot:
        obj.rotation_euler = rot
    return finish(obj, name, mat, bevel, segments)


def cyl(name, at, radius, depth, mat, axis="Z", vertices=20, bevel=0.004):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=at)
    obj = bpy.context.object
    if axis == "X":
        obj.rotation_euler.y = math.pi / 2
    elif axis == "Y":
        obj.rotation_euler.x = math.pi / 2
    return finish(obj, name, mat, bevel, 1)


def orb(name, at, size, mat, ico=False):
    if ico:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=at)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1, location=at)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, smooth=not ico)


def cone(name, at, bottom, top, height, mat, vertices=24):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=bottom, radius2=top, depth=height, location=at)
    return finish(bpy.context.object, name, mat, 0.012, 2)


def beam(name, start, end, radius, mat):
    a, b = Vector(start), Vector(end)
    obj = cyl(name, (a + b) / 2, radius, (b - a).length, mat, vertices=10, bevel=0.002)
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return obj


def tube(name, points, radius, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 8
    curve.bevel_depth, curve.bevel_resolution = radius, 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    curve.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def torus(name, at, major, minor, mat, axis="Y"):
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=8, location=at, major_radius=major, minor_radius=minor)
    obj = bpy.context.object
    if axis == "Y":
        obj.rotation_euler.x = math.pi / 2
    elif axis == "X":
        obj.rotation_euler.y = math.pi / 2
    return finish(obj, name, mat, smooth=True)


def wheel(name, at, radius, width, color, teeth=12):
    before = set(collection.objects)
    x, y, z = at
    cyl(name + " tire", at, radius, width, DARK, "X", 20, 0.008)
    for side in (-1, 1):
        cyl(name + " rim", (x + side * (width / 2 + 0.005), y, z), radius * 0.68, 0.018, color, "X", 16)
        cyl(name + " axle", (x + side * (width / 2 + 0.018), y, z), radius * 0.22, 0.02, SILVER, "X", 10)
    for i in range(teeth):
        a = math.tau * i / teeth
        box(name + " tread", (x, y + math.sin(a) * radius, z + math.cos(a) * radius),
            (width + 0.005, 0.036, 0.015), DARK, 0.002, ( -a, 0, 0), 1)
    for obj in set(collection.objects) - before:
        obj["wheel_pivot"] = list(at)
        obj["wheel_radius"] = radius


def leg_part(obj, name, segment, hip, knee, ankle):
    obj["leg_name"], obj["leg_segment"] = name, segment
    obj["leg_hip"], obj["leg_knee"], obj["leg_ankle"] = list(hip), list(knee), list(ankle)
    return obj


def eye(name, x, y, z, radius=0.045, mat=LIGHT):
    cyl(name + " socket", (x, y, z), radius * 1.28, 0.025, SLATE, "Y")
    cyl(name + " lens", (x, y + 0.018, z), radius, 0.014, mat, "Y")


def claw(name, at, color, size=1, angle=0):
    x, y, z = at
    cyl(name + " pivot", at, 0.056 * size, 0.065 * size, color, "Z", 12)
    for sign in (-1, 1):
        box(name + " finger", (x + sign * 0.046 * size, y + 0.072 * size, z),
            (0.035 * size, 0.15 * size, 0.06 * size), color, 0.012 * size,
            (0, 0, sign * angle))
        box(name + " fingertip", (x + sign * 0.036 * size, y + 0.14 * size, z),
            (0.055 * size, 0.03 * size, 0.06 * size), SILVER, 0.006 * size)


def bolt_detail(at, radius=0.012):
    cyl("Captive hex screw", at, radius, 0.01, SILVER, "Y", 6, 0.001)


def wedge(name, center, width, depth, low, high, mat):
    x, y, z = center
    vertices = [(x + s * width/2, y + t * depth/2, z + h)
                for h, t in [(0, -1), (0, 1), (high, -1), (low, 1)] for s in (-1, 1)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [(0, 2, 3, 1), (0, 1, 5, 4), (2, 6, 7, 3), (4, 5, 7, 6), (0, 4, 6, 2), (1, 3, 7, 5)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return finish(obj, name, mat, 0.024, 2)


def build_bolt(paint):
    for x in (-0.27, 0.27):
        wheel("Rear slick", (x, -0.11, 0.168), 0.16, 0.13, paint)
    wheel("Nose steering wheel", (0, 0.235, 0.10), 0.092, 0.105, SLATE, 10)
    wedge("Low-slung racing fairing", (0, 0, 0.18), 0.43, 0.56, 0.18, 0.40, paint)
    box("Racing stripe", (0.042, -0.012, 0.478), (0.066, 0.46, 0.014), IVORY, 0.004,
        (-math.atan(0.22/0.56), 0, 0))
    box("Front visor", (0, 0.281, 0.303), (0.346, 0.026, 0.114), SCREEN, 0.018)
    for s in (-1, 1):
        box("Competitive squint", (s * 0.088, 0.3, 0.309), (0.094, 0.017, 0.023), LIGHT, 0.006,
            (0, s * 0.18, 0))
        wedge("Swept speed fin", (s * 0.18, -0.155, 0.548), 0.032, 0.25, 0.018, 0.18, paint)
        cyl("Exhaust", (s * 0.135, -0.32, 0.327), 0.053, 0.12, SLATE, "Y", 12)
        cyl("Exhaust bore", (s * 0.135, -0.383, 0.327), 0.034, 0.008, SCREEN, "Y", 12)
        box("Front bumper corner", (s * 0.16, 0.30, 0.226), (0.11, 0.061, 0.055), SLATE)
    cyl("Tiny laser", (0, 0.333, 0.235), 0.035, 0.052, SILVER, "Y")
    cyl("Laser lens", (0, 0.363, 0.235), 0.019, 0.009, LIGHT, "Y")
    beam("Radio whip", (-0.09, -0.19, 0.56), (-0.12, -0.32, 0.82), 0.009, SLATE)
    orb("Whip tip", (-0.12, -0.32, 0.82), (0.022, 0.022, 0.022), LIGHT)


def build_gizmo(paint):
    for x, y in [(-0.18, 0.10), (0.18, 0.10), (0, -0.18)]:
        name = "Leg_" + str(x)
        hip, knee, ankle = (x*0.7,y*0.6,0.30), (x,y-0.065,0.21), (x,y,0.12)
        leg_part(box("Little safety shoe", (x, y + 0.027, 0.065), (0.15, 0.20, 0.13), SLATE, 0.04), name, "Foot", hip,knee,ankle)
        leg_part(beam("Tripod thigh",hip,knee,0.029,SILVER),name,"Upper",hip,knee,ankle)
        leg_part(beam("Tripod shin",knee,ankle,0.035,SILVER),name,"Lower",hip,knee,ankle)
    orb("Pear-shaped enamel body", (0, 0, 0.48), (0.268, 0.23, 0.324), paint)
    orb("Crown bump", (0, -0.012, 0.69), (0.21, 0.194, 0.156), paint)
    torus("Oversize monocular rim", (0, 0.224, 0.565), 0.12, 0.025, SLATE)
    cyl("Giant worried eye", (0, 0.239, 0.565), 0.113, 0.032, IVORY, "Y", 24)
    cyl("Off-center pupil", (-0.025, 0.262, 0.573), 0.06, 0.013, SCREEN, "Y", 20)
    cyl("Eye glint", (-0.041, 0.272, 0.598), 0.018, 0.008, LIGHT, "Y", 12)
    box("Nervous little mouth", (0.018, 0.216, 0.391), (0.106, 0.026, 0.026), SCREEN, 0.012,
        (0, 0.16, 0))
    for s in (-1, 1):
        beam("Wiry elbow", (s * 0.22, 0, 0.47), (s * 0.32, 0.018, 0.36), 0.022, SLATE)
        beam("Raised forearm", (s * 0.32, 0.018, 0.36), (s * 0.35, 0.13, 0.49), 0.02, SILVER)
        claw("Helpful hand", (s * 0.35, 0.14, 0.50), paint, 0.65)
    beam("Tall feeler", (-0.1, -0.02, 0.80), (-0.15, -0.025, 1.00), 0.012, SILVER)
    orb("Feeler light", (-0.15, -0.025, 1.00), (0.035, 0.035, 0.035), LIGHT)
    tube("Bent feeler", [(0.10, -0.02, 0.8), (0.14, -0.02, 0.9), (0.24, 0, 0.86)], 0.011, SILVER)
    orb("Bent feeler cap", (0.24, 0, 0.86), (0.025, 0.025, 0.025), paint)
    box("Emergency tool backpack", (0, -0.215, 0.48), (0.26, 0.11, 0.28), SLATE, 0.035)
    beam("Spare wrench handle", (0.13, -0.26, 0.42), (0.20, -0.26, 0.71), 0.019, SILVER)
    claw("Spare wrench jaws", (0.2, -0.27, 0.74), SILVER, 0.65)


def build_brutus(paint):
    for s in (-1, 1):
        box("Continuous tank tread", (s * 0.30, 0, 0.17), (0.155, 0.63, 0.30), DARK, 0.07)
        for y in (-0.20, 0, 0.20):
            cyl("Track wheel", (s * 0.386, y, 0.17), 0.083, 0.02, paint, "X", 16)
            cyl("Track hub", (s * 0.402, y, 0.17), 0.033, 0.026, SILVER, "X", 10)
        for index in range(22):
            point, angle = tread_sample(index/22, s)
            link = box("Moving track link", point, (0.166, 0.048, 0.025), SLATE, 0.006, (angle,0,0), segments=1)
            link["tread_phase"], link["tread_side"] = index/22, s
        box("Chunky shoulder", (s * 0.295, -0.01, 0.645), (0.21, 0.33, 0.17), paint, 0.045)
    box("Boxy heavyweight torso", (0, 0, 0.476), (0.55, 0.415, 0.46), paint, 0.055)
    box("Bib armor", (0, 0.215, 0.475), (0.37, 0.065, 0.24), SLATE, 0.026)
    for x in (-0.117, 0, 0.117):
        box("Bib ivory stripe", (x, 0.252, 0.475), (0.045, 0.012, 0.11), IVORY, 0.005,
            (0, -0.3, 0))
    box("Small stubborn head", (0, 0.035, 0.786), (0.294, 0.26, 0.20), paint, 0.033)
    box("Recessed squint", (0, 0.174, 0.793), (0.246, 0.022, 0.074), SCREEN, 0.008)
    for s in (-1, 1):
        box("Gentle little eye", (s * 0.067, 0.189, 0.79), (0.063, 0.012, 0.017), LIGHT, 0.005)
    box("Underbite", (0, 0.197, 0.728), (0.28, 0.082, 0.06), SILVER, 0.012)
    beam("Heavy fist arm", (-0.32, 0.06, 0.585), (-0.41, 0.18, 0.44), 0.05, SLATE)
    box("Oversize boxing fist", (-0.39, 0.233, 0.414), (0.23, 0.235, 0.21), paint, 0.046)
    for x in (-0.445, -0.38, -0.315):
        box("Fist knuckle", (x, 0.353, 0.442), (0.04, 0.03, 0.07), SILVER, 0.01)
    beam("Delicate other arm", (0.315, 0.06, 0.58), (0.377, 0.16, 0.45), 0.024, SILVER)
    claw("Tiny apologetic hand", (0.377, 0.18, 0.445), SLATE, 0.62)
    for x in (-0.15, 0.15):
        cyl("Rear smokestack", (x, -0.21, 0.70), 0.035, 0.26, SLATE, vertices=12)
        cyl("Stack cap", (x, -0.21, 0.835), 0.047, 0.025, SILVER, vertices=12)


def build_noodle(paint):
    for s in (-1, 1):
        name = "Leg_" + str(s)
        hip,knee,ankle = (s*0.10,0,0.35),(s*0.16,-0.065,0.245),(s*0.15,0,0.15)
        leg_part(box("Comically big boot", (s * 0.165, 0.06, 0.075), (0.235, 0.31, 0.15), paint, 0.045,
            (0, 0, s * -0.16)),name,"Foot",hip,knee,ankle)
        leg_part(box("Boot sole", (s * 0.165, 0.06, 0.022), (0.24, 0.31, 0.044), DARK, 0.018,
            (0, 0, s * -0.16)),name,"Foot",hip,knee,ankle)
        leg_part(beam("Long thigh",hip,knee,0.024,SILVER),name,"Upper",hip,knee,ankle)
        leg_part(beam("Long shin",knee,ankle,0.024,SILVER),name,"Lower",hip,knee,ankle)
    orb("Hip joint", (0, 0, 0.345), (0.155, 0.11, 0.08), SLATE)
    points = []
    for i in range(193):
        t = i / 192
        a = t * math.tau * 7
        points.append((0.058 * math.cos(a) + 0.05 * t, 0.058 * math.sin(a), 0.37 + 0.44 * t))
    tube("Exposed spring spine", points, 0.015, SILVER)
    beam("Internal flexible cable", (0, 0, 0.36), (0.05, 0, 0.82), 0.012, DARK)
    orb("Capsule head", (0.054, 0, 0.941), (0.235, 0.139, 0.128), paint)
    box("Sleepy eye band", (0.054, 0.126, 0.946), (0.365, 0.04, 0.082), SCREEN, 0.027,
        (0, -0.08, 0))
    for x in (-0.04, 0.148):
        box("Daydreaming eyelid", (x, 0.151, 0.95), (0.091, 0.013, 0.019), LIGHT, 0.006,
            (0, -0.14, 0))
    for s in (-1, 1):
        tube("Dangling noodle arm", [(0.04+s*0.08,0,0.79),(s*0.23,0,0.71),(s*0.25,0.04,0.53),(s*0.30,0.13,0.48)], 0.018, paint)
        claw("Loose hand", (s*0.30,0.13,0.48), SILVER, 0.63)
    tube("Absent-minded aerial", [(0.07,-0.02,1.054),(0.09,-0.02,1.18),(0.20,0,1.20)], 0.012, SLATE)
    orb("Aerial pompom", (0.20,0,1.20), (0.03,0.03,0.03), LIGHT)
    box("Tiny bow tie center", (0.035,0.082,0.801), (0.033,0.03,0.04), BRASS, 0.006)
    for s in (-1,1):
        orb("Bow tie wing", (0.035+s*0.039,0.071,0.801), (0.038,0.023,0.034), paint, True)


def build_disco(paint):
    orb("Single ball wheel", (0, 0, 0.14), (0.14, 0.14, 0.14), DARK)
    torus("Ball bearing collar", (0, 0, 0.237), 0.114, 0.029, SILVER, "Z")
    body = orb("Faceted disco-ball shell", (0, 0, 0.58), (0.305, 0.255, 0.315), paint, True)
    highlight = material("Disco | alternating facets", "#c797ff", 0.60, 0.29)
    body.data.materials.append(highlight)
    for face in body.data.polygons:
        if face.index % 5 == 0:
            face.material_index = 1
    box("Star visor", (0,0.224,0.63), (0.4,0.054,0.105), SCREEN, 0.033)
    for s in (-1,1):
        box("Star horizontal", (s*0.1,0.258,0.641), (0.083,0.014,0.019), LIGHT, 0.005)
        box("Star vertical", (s*0.1,0.258,0.641), (0.019,0.014,0.075), LIGHT, 0.005)
        cyl("Headphone cushion", (s*0.293,0,0.65), 0.107, 0.075, DARK, "X")
        cyl("Headphone enamel cup", (s*0.337,0,0.65), 0.085, 0.043, paint, "X")
        cyl("Headphone disc", (s*0.363,0,0.65), 0.049, 0.018, BRASS, "X")
        beam("Jazz arm", (s*0.23,0,0.43), (s*0.36,0.01,0.45 if s<0 else 0.70), 0.025, SILVER)
        claw("Jazz hand", (s*0.37,0.05,0.47 if s<0 else 0.73), paint, 0.75)
    for i, h in enumerate((0.06, 0.13, 0.20, 0.11, 0.045)):
        box("Equalizer crown", ((i-2)*0.057,0,0.89+h/2), (0.038,0.048,h), BRASS, 0.011)
        box("Equalizer light", ((i-2)*0.057,0,0.89+h), (0.04,0.05,0.02), LIGHT, 0.004)
    tube("Smug smile", [(-0.071,0.237,0.5),(-0.03,0.252,0.477),(0.027,0.252,0.477),(0.082,0.232,0.513)], 0.011, IVORY)


def build_chomp(paint):
    for s in (-1, 1):
        for y in (-0.14, 0.12):
            name = "Leg_" + str(s) + "_" + str(y)
            hip,knee,ankle = (s*0.21,y,0.31),(s*0.35,y*1.5,0.21),(s*0.405,y*1.9,0.063)
            leg_part(beam("Crab upper leg",hip,knee,0.041,paint),name,"Upper",hip,knee,ankle)
            leg_part(beam("Crab lower leg",knee,ankle,0.028,SILVER),name,"Lower",hip,knee,ankle)
            leg_part(box("Crab toe", (s*0.411,y*1.9+0.035,0.046), (0.102,0.14,0.09), DARK, 0.025),name,"Foot",hip,knee,ankle)
    orb("Broad crab carapace", (0,0,0.37), (0.31,0.255,0.16), paint)
    box("Hungry mouth cavity", (0,0.248,0.343), (0.35,0.037,0.086), SCREEN, 0.02)
    for i in range(5):
        box("Square chomping tooth", ((i-2)*0.057,0.271,0.362 if i%2==0 else 0.32),
            (0.039,0.025,0.033), IVORY, 0.004)
    for s in (-1,1):
        beam("Eye stalk", (s*0.132,0.07,0.473), (s*0.18,0.074,0.66), 0.028, SLATE)
        orb("Eye bulb", (s*0.18,0.086,0.678), (0.095,0.078,0.091), paint)
        eye("Mischievous eye", s*0.18,0.156,0.678,0.052)
        box("Angry brow", (s*0.18,0.162,0.737), (0.132,0.038,0.03), paint, 0.01,
            (0,s*0.20,0))
    beam("Big claw elbow", (-0.23,0.10,0.38), (-0.35,0.23,0.44), 0.041, SLATE)
    claw("Enormous snack pincer", (-0.36,0.28,0.47), paint, 1.6, 0.23)
    beam("Small claw elbow", (0.23,0.10,0.38), (0.35,0.23,0.42), 0.027, SILVER)
    claw("Small snack pincer", (0.35,0.25,0.43), paint, 0.85, 0.1)
    for x in (-0.1,0,0.1):
        cone("Back shell spike", (x,-0.16,0.50), 0.037, 0, 0.10, BRASS, 8)


def build_pixel(paint):
    for s in (-1,1):
        wheel("Tiny scooter wheel", (s*0.14,0,0.113), 0.105, 0.085, paint, 10)
    box("Small keyboard body", (0,0,0.282), (0.28,0.24,0.22), paint, 0.033)
    box("Keyboard inset", (0,0.128,0.29), (0.21,0.023,0.11), SCREEN, 0.015)
    for x in (-0.07,0,0.07):
        for z in (0.27,0.313):
            box("Keyboard key", (x,0.146,z), (0.039,0.011,0.02), IVORY, 0.003)
    cyl("Neck", (0,0,0.414), 0.07, 0.10, SILVER)
    box("Massive CRT case", (0,0,0.68), (0.56,0.38,0.40), paint, 0.067)
    box("Screen gasket", (0,0.184,0.696), (0.478,0.044,0.311), SLATE, 0.043)
    box("Curved CRT glass", (0,0.213,0.696), (0.431,0.031,0.265), SCREEN, 0.041)
    for angle in (-math.pi/4, math.pi/4):
        box("X eye", (0.106,0.235,0.747), (0.093,0.015,0.023), LIGHT, 0.002,
            (0,angle,0))
    for x,z in [(-0.107,0.721),(-0.143,0.746),(-0.107,0.771),(-0.071,0.746)]:
        box("Pixel open eye", (x,0.235,z), (0.028,0.016,0.028), LIGHT, 0.001)
    for x,z in [(-0.099,0.64),(-0.066,0.616),(-0.033,0.616),(0,0.616),(0.033,0.628),(0.066,0.655)]:
        box("Wonky pixel smile", (x,0.235,z), (0.032,0.016,0.02), LIGHT, 0.001)
    for s in (-1,1):
        beam("Rabbit aerial", (s*0.11,-0.02,0.87), (s*0.225,-0.03,1.12 if s<0 else 1.05), 0.015, SILVER)
        orb("Aerial cap", (s*0.225,-0.03,1.12 if s<0 else 1.05), (0.031,0.031,0.031), paint)
        tube("Telephone cord arm", [(s*0.13,0,0.33),(s*0.26,0,0.31),(s*0.28,0.13,0.40)], 0.02, SLATE)
        claw("Tiny waving hand", (s*0.28,0.13,0.41), SILVER, 0.58)
    for z in (0.60,0.65,0.70,0.75):
        box("CRT rear vent", (0,-0.195,z), (0.29,0.022,0.019), SLATE, 0.005)
    cyl("Side tuning dial", (0.282,0.02,0.614), 0.045,0.028,BRASS,"X",12)


def build_snooze(paint):
    for s in (-1,1):
        for y in (-0.15,0.19):
            wheel("Slow roller", (s*0.20,y,0.08),0.073,0.07,SLATE,8)
    orb("Long snail belly", (0,0.02,0.235), (0.28,0.35,0.16), paint)
    cyl("Round clockwork shell", (0,-0.092,0.486),0.248,0.32,paint,"X",32,0.018)
    for s in (-1,1):
        torus("Clockwork shell band", (s*0.175,-0.092,0.486),0.185,0.022,BRASS,"X")
        cyl("Shell hub", (s*0.198,-0.092,0.486),0.06,0.031,BRASS,"X",16)
        for i in range(8):
            a=i*math.tau/8
            box("Shell clock tick", (s*0.199,-0.092+0.132*math.sin(a),0.486+0.132*math.cos(a)),
                (0.018,0.019,0.043),IVORY,0.003,(-a,0,0))
    orb("Sleepy drooping head", (0,0.252,0.375),(0.223,0.172,0.142),paint)
    box("Sleep visor",(0,0.401,0.401),(0.332,0.037,0.073),SCREEN,0.029)
    for s in (-1,1):
        tube("Heavy eyelid",[(s*0.091-0.035,0.424,0.41),(s*0.091,0.428,0.394),(s*0.091+0.035,0.424,0.41)],0.008,LIGHT)
    cyl("Snoring mouth", (0,0.427,0.345),0.029,0.018,SLATE,"Y",16)
    cyl("Snore vent", (0,0.439,0.345),0.016,0.01,SCREEN,"Y",12)
    beam("Wind-up key stem",(0,-0.16,0.676),(0,-0.16,0.847),0.024,BRASS)
    for s in (-1,1):
        torus("Wind-up butterfly key",(s*0.075,-0.16,0.857),0.066,0.022,BRASS)
    box("Key bridge",(0,-0.16,0.857),(0.10,0.031,0.025),BRASS,0.005)
    for s in (-1,1):
        beam("Short feeler",(s*0.12,0.22,0.492),(s*0.164,0.28,0.614),0.012,SLATE)
        orb("Feeler knob",(s*0.164,0.28,0.614),(0.029,0.029,0.029),paint)


def build_captain(paint):
    for x,y in [(-0.19,0.05),(0.19,0.05),(0,-0.18)]:
        wheel("Polished castor",(x,y,0.079),0.07,0.07,BRASS,8)
    cone("Bell-shaped uniform",(0,0,0.372),0.28,0.171,0.47,paint,24)
    cyl("Brass hem",(0,0,0.157),0.283,0.045,BRASS,vertices=24)
    for z in (0.30,0.40,0.50):
        cyl("Uniform brass button",(0,0.282-(z-0.157)*0.23,z),0.021,0.015,BRASS,"Y",12)
    cyl("Neck cuff",(0,0,0.642),0.092,0.074,BRASS)
    orb("Officer head",(0,0,0.774),(0.208,0.165,0.17),paint)
    eye("Regular eye",0.077,0.145,0.795,0.034)
    eye("Monocle eye",-0.085,0.146,0.80,0.047)
    torus("Brass monocle",(-0.085,0.171,0.8),0.06,0.012,BRASS)
    tube("Monocle chain",[(-0.146,0.17,0.8),(-0.184,0.146,0.74),(-0.185,0.13,0.657),(-0.15,0.13,0.61)],0.004,BRASS)
    for s in (-1,1):
        tube("Curled magnificent moustache",[(0,0.179,0.743),(s*0.053,0.185,0.724),(s*0.107,0.17,0.731),(s*0.136,0.158,0.762)],0.018,SLATE)
    cyl("Captain cap band",(0,0,0.91),0.217,0.047,SLATE,vertices=24)
    cone("Peaked officer cap",(0,-0.016,0.98),0.24,0.09,0.124,paint,24)
    box("Cap visor",(0,0.167,0.91),(0.318,0.191,0.024),BRASS,0.016)
    orb("Cap badge",(0,0.18,0.979),(0.035,0.012,0.039),BRASS,True)
    beam("Saluting upper arm",(-0.184,0,0.55),(-0.33,0.02,0.70),0.03,SLATE)
    beam("Saluting forearm",(-0.33,0.02,0.70),(-0.24,0.13,0.91),0.025,BRASS)
    box("Saluting glove",(-0.22,0.15,0.936),(0.10,0.065,0.065),paint,0.02,
        (0,0.30,0))
    beam("Commanding elbow",(0.184,0,0.55),(0.28,0.05,0.44),0.026,SLATE)
    claw("Pointing hand",(0.285,0.1,0.46),BRASS,0.66)


def build_glitch(paint):
    wheel("One enormous drive wheel",(-0.17,0,0.19),0.182,0.16,paint,16)
    hip,knee,ankle = (0.15,-0.005,0.30),(0.23,-0.065,0.19),(0.20,0.02,0.084)
    leg_part(box("Mismatched little foot",(0.20,0.055,0.042),(0.15,0.19,0.084),SLATE,0.022),"Leg_single","Foot",hip,knee,ankle)
    leg_part(beam("Crooked upper leg",hip,knee,0.03,SILVER),"Leg_single","Upper",hip,knee,ankle)
    leg_part(beam("Crooked balancing leg",knee,ankle,0.03,SILVER),"Leg_single","Lower",hip,knee,ankle)
    box("Offset lower cube",(-0.035,0,0.396),(0.36,0.31,0.27),paint,0.019,
        (0,0.15,0.12))
    box("Black patch panel",(-0.01,0.169,0.417),(0.23,0.032,0.18),SCREEN,0.009,
        (0,0.10,0))
    for i in range(3):
        box("Corrupt status bar",(-0.077+i*0.061,0.19,0.428),(0.034,0.019,0.035+i*0.023),PINK_LIGHT,0.002)
    beam("Bent exposed neck",(0.02,0,0.52),(0.087,-0.005,0.673),0.028,SILVER)
    box("Off-axis head cube",(0.076,0,0.815),(0.391,0.318,0.292),paint,0.032,
        (0,-0.15,-0.055))
    box("Oversized square eye patch",(-0.037,0.173,0.84),(0.184,0.049,0.167),SCREEN,0.015,
        (0,-0.15,0))
    box("Large mismatched eye",(-0.037,0.204,0.842),(0.092,0.018,0.086),LIGHT,0.008,
        (0,-0.15,0))
    eye("Little pink eye",0.181,0.156,0.859,0.033,PINK_LIGHT)
    tube("Jagged mouth",[(-0.03,0.17,0.745),(0.023,0.174,0.758),(0.065,0.17,0.734),(0.125,0.165,0.766)],0.009,SLATE)
    tube("Loose cable arm",[(-0.17,0,0.48),(-0.3,0.03,0.56),(-0.32,0.07,0.72)],0.022,SLATE)
    claw("Raised claw",(-0.32,0.09,0.735),paint,0.80)
    beam("Other crooked arm",(0.18,0,0.45),(0.33,0.05,0.35),0.024,SILVER)
    claw("Low claw",(0.33,0.09,0.36),SLATE,0.65)
    tube("Broken zig-zag antenna",[(-0.012,-0.04,0.968),(-0.035,-0.04,1.076),(-0.12,-0.04,1.055),(-0.10,-0.04,1.16)],0.013,SLATE)
    orb("Glitch beacon",(-0.10,-0.04,1.16),(0.027,0.027,0.027),PINK_LIGHT)
    cone("Lone square ear",(0.258,-0.01,0.993),0.055,0,0.14,paint,4)
    box("Rear patch",(0.077,-0.168,0.813),(0.23,0.035,0.17),SLATE,0.014)
    for i in range(3):
        box("Rear patched slot",(0.01+i*0.067,-0.19,0.813),(0.025,0.012,0.099),SCREEN,0.003)


def fit_to_tile(parts):
    """Measure evaluated geometry, preserve proportions, then ground at the origin."""
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    vertices = []
    for obj in parts.objects:
        evaluated = obj.evaluated_get(depsgraph)
        vertices.extend(evaluated.matrix_world @ v.co for v in evaluated.data.vertices)
    low = Vector([min(v[i] for v in vertices) for i in range(3)])
    high = Vector([max(v[i] for v in vertices) for i in range(3)])
    size = high - low
    factor = min(1, 0.86 / size.x, 0.86 / size.y, 1.23 / size.z)
    center = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    for obj in parts.objects:
        obj.location = (obj.location - center) * factor
        obj.scale *= factor
    bpy.context.view_layer.update()
    parts["fit_scale"] = factor
    parts["fit_center"] = list(center)
    return [round(size[i] * factor, 5) for i in (0, 2, 1)]


def export_robot(parts, identifier, rig, roles):
    export_scene = bpy.data.scenes.new(identifier + " | export")
    export_scene.render.fps = FPS
    export_scene.collection.objects.link(rig)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    groups = {}
    for source in parts.objects:
        if source.type != "MESH":
            continue
        evaluated = source.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
        obj = bpy.data.objects.new(source.name, mesh)
        obj.matrix_world = source.matrix_world.copy()
        export_scene.collection.objects.link(obj)
        bind_mesh(obj, roles[source.name], rig, identifier)
        key = tuple(mat.name for mat in source.data.materials)
        groups.setdefault(key, []).append(obj)
    bpy.context.window.scene = export_scene
    triangles = 0
    for names, objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects)>1:
            bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = identifier + " | " + names[0]
        obj.data.name = obj.name
        # Bake the active part's transform so runtime bounding boxes stay tight.
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    bpy.ops.object.select_all(action="SELECT")
    path = MODELS / (identifier + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        use_active_scene=True, export_yup=True, export_animations=True,
        export_animation_mode="NLA_TRACKS", export_skins=True,
        export_frame_range=False, export_frame_step=1,
        export_cameras=False, export_lights=False, export_extras=False,
        export_texcoords=False, export_normals=True,
    )
    bpy.context.window.scene = scene
    for obj in list(export_scene.objects):
        if obj == rig:
            export_scene.collection.objects.unlink(rig)
            continue
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    bpy.data.scenes.remove(export_scene)
    return {"triangles": triangles, "bytes": path.stat().st_size}


def area_light(name, at, power, size, color, stage):
    data = bpy.data.lights.new(name, "AREA")
    obj = bpy.data.objects.new(name, data)
    stage.objects.link(obj)
    obj.location = at
    obj.rotation_euler = (Vector((0, 0, 0.5)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    data.energy, data.shape, data.size, data.color = power, "DISK", size, color


def main():
    global collection
    only = None
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--only" in args:
        only = args[args.index("--only") + 1].split(",")
    cast = []
    manifest = []
    for character in ROSTER:
        identifier = character["id"]
        collection = bpy.data.collections.new(character["name"] + " | editable parts")
        scene.collection.children.link(collection)
        paint = material(character["name"] + " | enamel", character["color"], 0.33, 0.33)
        globals()["build_" + identifier](paint)
        dimensions = fit_to_tile(collection)
        rig, roles, legs, wheels, treads = rig_character(collection, identifier)
        clips = animate_rig(rig, identifier, legs, treads)
        scene.frame_set(0)
        bpy.context.view_layer.update()
        stats = export_robot(collection, identifier, rig, roles)
        manifest.append({**character, **stats, "dimensions": dimensions, "animations": clips})
        cast.append(collection)
        collection.hide_render = True
        print("BUILT " + identifier + " " + json.dumps(stats), flush=True)

    collection = bpy.data.collections.new("Studio | excluded from all GLBs")
    stage = collection
    scene.collection.children.link(stage)
    tile_mat = material("Studio tile", "#546e7e", 0.35, 0.6)
    edge_mat = material("Studio base", "#263d4a", 0.45, 0.5)
    box("Board tile", (0, 0, -0.055), (0.96, 0.96, 0.11), tile_mat, 0.017)
    box("Board tile base", (0, 0, -0.13), (1.015, 1.015, 0.055), edge_mat, 0.012)
    area_light("Warm key", (2.4, 3.5, 4), 340, 3, (1, 0.91, 0.80), stage)
    area_light("Cool fill", (-3, 1.4, 2.2), 240, 2.8, (0.68, 0.86, 1), stage)
    area_light("Sky rim", (0.7, -2.6, 3), 430, 2.2, (0.71, 0.88, 1), stage)
    world = bpy.data.worlds.new("Misfits studio world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.13, 0.19, 0.24, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.4
    scene.world = world
    camera_data = bpy.data.cameras.new("Portrait camera")
    camera = bpy.data.objects.new("Portrait camera", camera_data)
    stage.objects.link(camera)
    camera.location = (2.2, 4.4, 2.5)
    camera.rotation_euler = (Vector((0, 0, 0.50)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type, camera_data.ortho_scale = "ORTHO", 1.72
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 850
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    for character, parts in zip(ROSTER, cast):
        if "--skip-renders" in args or (only and character["id"] not in only):
            continue
        parts.hide_render = False
        scene.render.filepath = str(PREVIEWS / (character["id"] + ".png"))
        bpy.ops.render.render(write_still=True)
        parts.hide_render = True
        print("RENDERED " + character["id"], flush=True)

    # Arrange the editable source as a complete, easy-to-orbit cast.
    platforms = [obj for obj in stage.objects if obj.type == "MESH"]
    for index, parts in enumerate(cast):
        parts.hide_render = False
        offset = Vector(((index % 5 - 2) * 1.4, (index // 5) * 1.9, 0))
        for obj in parts.objects:
            if obj.parent is None:
                obj.location += offset
            if obj.type == "ARMATURE":
                obj.animation_data.nla_tracks["Idle"].mute = False
        for source in platforms:
            platform = source.copy()
            stage.objects.link(platform)
            platform.location += offset
    for source in platforms:
        bpy.data.objects.remove(source, do_unlink=True)
    camera.location = (3.1, 8.8, 6.8)
    camera.rotation_euler = (Vector((0, 0.9, 0.4)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.ortho_scale = 9
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_distance = 9
                area.spaces.active.region_3d.view_location = (0, 0.9, 0.4)
                area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()
                area.spaces.active.shading.type = "MATERIAL"
                area.spaces.active.overlay.show_extras = False
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "factory-misfits.blend"), compress=True)
    (MODELS / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("FINISHED " + str(HERE / "factory-misfits.blend"), flush=True)


if __name__ == "__main__":
    main()
