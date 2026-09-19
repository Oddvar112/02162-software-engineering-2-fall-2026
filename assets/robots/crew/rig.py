"""Rigid mechanical skinning and baked, portable Idle/Move animation clips."""

import math
import re

import bpy
from mathutils import Euler, Quaternion, Vector

FPS = 30
TAU = math.tau
PROFILES = {
    "bolt": (3.2, 0.9, "Impatient engine tremor and antenna sway", "Fast wheels and a forward racing lean"),
    "gizmo": (4.0, 0.8, "Nervous glances, blinking and fidgeting hands", "Alternating tripod steps and eager arm swings"),
    "brutus": (4.8, 1.6, "Slow head scan and a heavy fist shrug", "Rolling tracks, turning sprockets and suspension rumble"),
    "noodle": (4.0, 1.2, "Spring breathing, dreamy head tilt and loose arms", "Long alternating steps with a bouncing spring spine"),
    "disco": (2.4, 1.2, "Rhythmic sway and alternating jazz hands", "Rolling ball, dancing torso and arm groove"),
    "chomp": (3.2, 0.8, "Watchful eye stalks and impatient snapping pincers", "Alternating diagonal crab steps"),
    "pixel": (3.6, 0.8, "Curious CRT head tilt, pixel blink and aerial wobble", "Scooter wheels with a lively head bounce"),
    "snooze": (6.0, 2.4, "Slow sleepy head nod and heavy eyelids", "Slow rollers and a rotating wind-up key"),
    "captain": (4.8, 1.6, "A small salute and a confident head scan", "Steady castors and a restrained commanding sway"),
    "glitch": (3.2, 0.8, "Short irregular head twitches and mismatched arm fidgets", "A lopsided wheel-and-foot gait with an erratic head bob"),
}

HEAD_PIVOTS = {
    "bolt": (0,0,0.40), "gizmo": (0,0,0.50), "brutus": (0,0.035,0.69),
    "noodle": (0.05,0,0.81), "disco": (0,0,0.58), "chomp": (0,0.06,0.47),
    "pixel": (0,0,0.43), "snooze": (0,0.22,0.34),
    "captain": (0,0,0.65), "glitch": (0.087,0,0.67),
}
HEAD_NAMES = {
    "bolt": (), "gizmo": (),
    "brutus": ("Small stubborn", "Recessed squint", "Gentle little", "Underbite"),
    "noodle": ("Capsule head", "Sleepy eye", "Daydreaming", "Tiny bow", "Bow tie"),
    "disco": (),
    "chomp": ("Eye stalk", "Eye bulb", "Mischievous", "Angry brow"),
    "pixel": ("Massive CRT", "Screen gasket", "Curved CRT", "X eye", "Pixel open", "Wonky pixel", "CRT rear", "Side tuning"),
    "snooze": ("Sleepy drooping", "Sleep visor", "Heavy eyelid", "Snoring", "Snore vent"),
    "captain": ("Officer head", "Regular eye", "Monocle", "Brass monocle", "Curled magnificent", "Captain cap", "Peaked officer", "Cap visor", "Cap badge"),
    "glitch": ("Off-axis head", "Oversized square", "Large mismatched", "Little pink", "Jagged mouth", "Lone square", "Rear patch"),
}


def safe_name(value):
    return re.sub(r"[^A-Za-z0-9_]", "_", value)


def tread_sample(phase, side):
    """Constant-speed rounded rectangular belt path in original model space."""
    a, b, radius = .248, .076, .07
    straight, vertical, arc = 2*a, 2*b, math.pi*radius/2
    distance = (phase % 1) * (2*straight+2*vertical+4*arc)
    segments = (
        (straight, lambda t: (-a+t, b+radius, 0)),
        (arc, lambda t: (a+radius*math.sin(t/radius), b+radius*math.cos(t/radius), -t/radius)),
        (vertical, lambda t: (a+radius, b-t, -math.pi/2)),
        (arc, lambda t: (a+radius*math.cos(t/radius), -b-radius*math.sin(t/radius), -math.pi/2-t/radius)),
        (straight, lambda t: (a-t, -b-radius, -math.pi)),
        (arc, lambda t: (-a-radius*math.sin(t/radius), -b-radius*math.cos(t/radius), -math.pi-t/radius)),
        (vertical, lambda t: (-a-radius, -b+t, -3*math.pi/2)),
        (arc, lambda t: (-a-radius*math.cos(t/radius), b+radius*math.sin(t/radius), -3*math.pi/2-t/radius)),
    )
    for length, sample in segments:
        if distance <= length:
            y, z, angle = sample(distance)
            return Vector((side*.30, y, z+.17)), angle
        distance -= length
    return Vector((side*.30, -a, b+radius+.17)), 0


def rig_character(parts, identifier):
    """Define rest-space bones; original mechanical parts keep their own meshes."""
    scale = parts["fit_scale"]
    center = Vector(parts["fit_center"])
    fit = lambda p: (Vector(p) - center) * scale
    objects = [obj for obj in parts.objects if obj.type == "MESH"]
    joints = {
        "Root": (Vector((0,0,0)), None),
        "Body": (fit((0,0,0.34)), "Root"),
        "Head": (fit(HEAD_PIVOTS[identifier]), "Body"),
        "Eyes": (fit((HEAD_PIVOTS[identifier][0], 0.20, {
            "bolt":.309,"gizmo":.565,"brutus":.79,"noodle":.95,"disco":.641,
            "chomp":.678,"pixel":.747,"snooze":.401,"captain":.80,"glitch":.85,
        }[identifier])), "Head"),
        "Antenna": (fit((HEAD_PIVOTS[identifier][0],0,{
            "bolt":.56,"gizmo":.8,"brutus":.85,"noodle":1.054,"disco":.89,
            "chomp":.50,"pixel":.87,"snooze":.492,"captain":.94,"glitch":.968,
        }[identifier])), "Head"),
    }
    shoulder_height = {"gizmo":.47,"brutus":.585,"noodle":.79,"disco":.43,
        "chomp":.38,"pixel":.33,"captain":.55,"glitch":.48}.get(identifier,.45)
    shoulder_width = {"brutus":.32,"noodle":.08,"pixel":.13,"captain":.184}.get(identifier,.22)
    for side in (-1,1):
        joints["Arm_L" if side<0 else "Arm_R"] = (
            fit((side*shoulder_width,0,shoulder_height)), "Head" if identifier=="noodle" else "Body")
    joints["Key"] = (fit((0,-.16,.847)), "Body")
    wheel_specs, legs, roles, treads = {}, {}, {}, {}
    for obj in objects:
        name = obj.name
        position = obj.matrix_world.translation
        side = "L" if position.x < 0 else "R"
        role = "Body"
        if "tread_phase" in obj:
            role = "Tread_"+str(len(treads))
            point, angle = tread_sample(obj["tread_phase"], obj["tread_side"])
            joints[role] = (fit(point), "Root")
            treads[role] = (obj["tread_phase"], obj["tread_side"], point, angle)
        elif "wheel_pivot" in obj:
            point = tuple(obj["wheel_pivot"])
            key = "Wheel_" + str(list(wheel_specs).index(point) if point in wheel_specs else len(wheel_specs))
            wheel_specs[point] = (key, obj["wheel_radius"]*scale)
            joints[key] = (fit(point), "Root")
            role = key
        elif "leg_name" in obj:
            key = safe_name(obj["leg_name"])
            hip,knee,ankle = [fit(obj["leg_"+p]) for p in ("hip","knee","ankle")]
            joints[key+"_Upper"] = (hip,"Root")
            joints[key+"_Lower"] = (knee,key+"_Upper")
            joints[key+"_Foot"] = (ankle,key+"_Lower")
            legs[key] = (hip,knee,ankle)
            role = key + "_" + obj["leg_segment"]
        elif name.startswith(("Track wheel", "Track hub")):
            original = position/scale + center
            point = (math.copysign(.30,original.x),round(original.y,2),.17)
            key = "Sprocket_" + safe_name(str(point))
            joints[key] = (fit(point),"Root")
            role = key
        elif name.startswith(("Continuous tank tread","Track top grip")):
            role = "Root"
        elif name.startswith("Single ball wheel"):
            role = "Ball"
            joints[role] = (fit((0,0,.14)),"Root")
        elif name.startswith(("Spare wrench", "Emergency tool")):
            role = "Body"
        elif identifier=="snooze" and name.startswith(("Wind-up butterfly", "Key bridge")):
            role = "Key"
        elif name.startswith(HEAD_NAMES[identifier]):
            role = "Head"
        elif any(word in name.lower() for word in ("arm", "hand", "claw", "fist", "pincer", "knuckle", "glove")):
            role = "Arm_"+side
        if any(word in name.lower() for word in ("aerial", "antenna", "feeler", "whip", "beacon")):
            role = "Antenna"
        # Blink the lit optics, never their rims or the laser/status lights.
        if (any(word in name.lower() for word in (" eye", "pupil", "eyelid", "competitive squint", "star horizontal", "star vertical"))
            and not any(word in name.lower() for word in ("socket", "patch", "band", "glass", "bulb", "stalk", "brow"))):
            role = "Eyes"
        if identifier=="gizmo" and name.startswith(("Off-center pupil","Eye glint")):
            role = "Pupil"
            joints[role] = (fit((0,.262,.565)),"Eyes")
        if identifier=="chomp" and "pincer" in name and ("finger" in name):
            original = position/scale+center
            large = original.x<0
            base_x,base_y = (-.36,.28) if large else (.35,.25)
            jaw_side = -1 if original.x<base_x else 1
            role = "Jaw_"+side+("_a" if jaw_side<0 else "_b")
            joints[role] = (fit((base_x,base_y,.47 if large else .43)),"Arm_"+side)
        roles[obj.name] = role

    data = bpy.data.armatures.new(identifier+"_Skeleton")
    rig = bpy.data.objects.new(identifier+"_Rig",data)
    parts.objects.link(rig)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for name,(position,parent) in joints.items():
        bone = data.edit_bones.new(name)
        bone.head = position
        # Identical rest axes: X sideways, Y forward, Z up, before glTF conversion.
        bone.tail = position+Vector((0,.06,0))
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.show_in_front = True
    for obj in objects:
        bind_mesh(obj, roles[obj.name], rig, identifier)
    return rig, roles, legs, wheel_specs, treads


def bind_mesh(obj, role, rig, identifier):
    """Rigid weights except the flexible coil, blended between its fixed endpoints."""
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    spring = identifier=="noodle" and obj.name.startswith(("Exposed spring", "Internal flexible"))
    if spring:
        body = obj.vertex_groups.new(name="Body")
        head = obj.vertex_groups.new(name="Head")
        top = rig.data.bones["Head"].head_local.z
        bottom = rig.data.bones["Body"].head_local.z
        for vertex in obj.data.vertices:
            z = (obj.matrix_world@vertex.co).z
            weight = min(1,max(0,(z-bottom)/(top-bottom)))
            body.add([vertex.index],1-weight,"REPLACE")
            head.add([vertex.index],weight,"REPLACE")
    else:
        obj.vertex_groups.new(name=role).add(list(range(len(obj.data.vertices))),1,"REPLACE")
    obj.parent = rig
    modifier = obj.modifiers.new("Mechanical skeleton", "ARMATURE")
    modifier.object = rig


def leg_pose(rig, name, rest, phase, stride, lift):
    """Bake a two-bone IK solution; feet remain level through the stance phase."""
    hip,knee,ankle = rest
    duty = .62
    if phase < duty:
        offset = stride*(.5-phase/duty)
        height = 0
    else:
        t = (phase-duty)/(1-duty)
        # Smooth lift/landing while horizontal stance velocity stays constant.
        offset = stride*(-.5+t)
        height = lift*math.sin(math.pi*t)**2
    target = ankle+Vector((0,offset,height))
    a,b = (knee-hip).length,(ankle-knee).length
    delta = target-hip
    distance = min(a+b-1e-5,max(abs(a-b)+1e-5,delta.length))
    direction = delta.normalized()
    bend = knee-(hip+(ankle-hip)*((knee-hip).dot(ankle-hip)/(ankle-hip).length_squared))
    bend -= direction*bend.dot(direction)
    bend.normalize()
    along = (a*a-b*b+distance*distance)/(2*distance)
    next_knee = hip+direction*along+bend*math.sqrt(max(0,a*a-along*along))
    target = hip+direction*distance
    upper = (knee-hip).rotation_difference(next_knee-hip)
    lower = (ankle-knee).rotation_difference(target-next_knee)
    rig.pose.bones[name+"_Upper"].rotation_quaternion = upper
    rig.pose.bones[name+"_Lower"].rotation_quaternion = upper.inverted()@lower
    rig.pose.bones[name+"_Foot"].rotation_quaternion = lower.inverted()


def animate_rig(rig, identifier, legs, treads):
    idle_seconds,move_seconds,idle_description,move_description = PROFILES[identifier]
    pose = rig.pose.bones
    scale = rig.users_collection[0]["fit_scale"]
    for bone in pose:
        bone.rotation_mode = "QUATERNION"
    rig.animation_data_create()
    for clip,duration in (("Idle",idle_seconds),("Move",move_seconds)):
        action = bpy.data.actions.new(identifier+"_"+clip)
        action.use_fake_user = True
        rig.animation_data.action = action
        frames = round(duration*FPS)
        for frame in range(frames+1):
            phase = frame/frames
            wave = math.sin(TAU*phase)
            twice = math.sin(2*TAU*phase)
            for bone in pose:
                bone.location = (0,0,0)
                bone.rotation_quaternion = Quaternion()
                bone.scale = (1,1,1)
            def rotate(name, xyz):
                pose[name].rotation_quaternion = Euler(xyz,"XYZ").to_quaternion()
            def shift(name, xyz):
                pose[name].location = Vector(xyz)*scale
            def arms(amount):
                rotate("Arm_L",(amount*wave,amount*.35*twice,0))
                rotate("Arm_R",(-amount*wave,-amount*.35*twice,0))
            blink = max(0,1-abs(phase-.63)/.035)**2
            pose["Eyes"].scale.z = 1-.88*blink
            rotate("Antenna",(.025*twice,.04*wave,0))
            if clip=="Idle":
                if identifier=="bolt":
                    rotate("Body",(.008*twice,.012*wave,0))
                    rotate("Antenna",(.045*twice,.075*wave,0))
                elif identifier=="gizmo":
                    shift("Pupil",(.023*wave,0,.006*twice))
                    arms(.095)
                elif identifier=="brutus":
                    rotate("Head",(0,0,.10*wave))
                    rotate("Arm_L",(.065*wave,0,0))
                elif identifier=="noodle":
                    shift("Head",(0,0,.022*(1-math.cos(TAU*phase))))
                    rotate("Head",(0,.06*wave,.04*wave))
                    arms(.075)
                elif identifier=="disco":
                    rotate("Body",(0,.025*wave,.13*wave))
                    arms(.19)
                elif identifier=="chomp":
                    rotate("Head",(0,0,.11*wave))
                    for name in pose.keys():
                        if name.startswith("Jaw_"):
                            rotate(name,(0,0,(1 if name.endswith("_a") else -1)*.13*(1-math.cos(2*TAU*phase))))
                elif identifier=="pixel":
                    rotate("Head",(.018*twice,.085*wave,.05*wave))
                    arms(.05)
                elif identifier=="snooze":
                    rotate("Head",(.065*(1-math.cos(TAU*phase)),0,0))
                    pose["Eyes"].scale.z = .72-.3*(1-math.cos(TAU*phase))/2
                elif identifier=="captain":
                    rotate("Head",(0,0,.10*wave))
                    rotate("Arm_L",(0,.035*wave,.018*wave))
                else:
                    jitter = .045*math.sin(6*TAU*phase)**7+.025*wave
                    rotate("Head",(jitter,-jitter*1.5,jitter))
                    arms(.08)
            else:
                for name in pose.keys():
                    if name.startswith("Wheel_") or name=="Ball" or name.startswith("Sprocket_"):
                        rotate(name,(-TAU*phase*(3 if name.startswith("Sprocket_") else 1),0,0))
                for name,(offset,side,rest,angle) in treads.items():
                    point, next_angle = tread_sample(phase+offset,side)
                    shift(name,point-rest)
                    rotate(name,(next_angle-angle,0,0))
                for index,(name,rest) in enumerate(legs.items()):
                    # Chomp walks in diagonal pairs; Gizmo's three legs take turns.
                    offset = index/len(legs) if identifier=="gizmo" else (index%2)*.5
                    if identifier=="chomp":
                        offset = (0,.5,.5,0)[index]
                    stride = {"gizmo":.13,"noodle":.19,"chomp":.16,"glitch":.14}[identifier]*scale
                    leg_pose(rig,name,rest,(phase+offset)%1,stride,.055*scale)
                arms(.13)
                if identifier=="bolt":
                    rotate("Body",(-.045+.008*twice,.01*wave,0))
                elif identifier=="gizmo":
                    shift("Pupil",(.01*wave,0,0))
                elif identifier=="brutus":
                    shift("Body",(0,0,.004*(1-math.cos(4*TAU*phase))))
                    arms(.035)
                elif identifier=="noodle":
                    shift("Head",(0,0,.034*(1-math.cos(2*TAU*phase))/2))
                    rotate("Head",(0,.04*wave,0))
                elif identifier=="disco":
                    rotate("Body",(0,.045*wave,.17*wave))
                    arms(.25)
                elif identifier=="chomp":
                    rotate("Head",(.035*twice,0,0))
                    arms(.035)
                elif identifier=="pixel":
                    shift("Head",(0,0,.013*(1-math.cos(2*TAU*phase))))
                    rotate("Head",(0,.035*wave,0))
                elif identifier=="snooze":
                    rotate("Key",(0,0,-TAU*phase))
                    rotate("Head",(.035*(1-math.cos(TAU*phase)),0,0))
                elif identifier=="captain":
                    rotate("Body",(0,0,.025*wave))
                    arms(.025)
                else:
                    rotate("Head",(.035*twice,.06*wave,.055*math.sin(4*TAU*phase)**5))
            for bone in pose:
                for channel in ("location","rotation_quaternion","scale"):
                    bone.keyframe_insert(data_path=channel,frame=frame,group=bone.name)
        for curve in action.fcurves:
            for key in curve.keyframe_points:
                key.interpolation = "LINEAR"
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(action.name,0,action)
        strip.extrapolation = "NOTHING"
        track.mute = True
    for bone in pose:
        bone.location = (0,0,0)
        bone.rotation_quaternion = Quaternion()
        bone.scale = (1,1,1)
    return {
        "Idle": {"duration":idle_seconds,"description":idle_description},
        "Move": {"duration":move_seconds,"description":move_description},
    }
