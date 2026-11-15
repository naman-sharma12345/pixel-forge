"""Tiny chip-tune synthesizer using only the standard library (wave, struct, math).

Produces 16-bit mono WAV bytes for the demo data: coin, jump, laser, explosion,
power-up, hit, blip and a short chiptune loop. Also generates small .obj models.
"""
import io
import math
import random
import struct
import wave

SAMPLE_RATE = 22050


def _wave(kind, phase):
    p = phase % 1.0
    if kind == 'square':
        return 1.0 if p < 0.5 else -1.0
    if kind == 'pulse':
        return 1.0 if p < 0.25 else -1.0
    if kind == 'saw':
        return 2.0 * p - 1.0
    if kind == 'tri':
        return 4.0 * abs(p - 0.5) - 1.0
    return math.sin(2 * math.pi * p)


def tone(seconds, f0, f1=None, kind='square', vol=0.5, attack=0.004, decay_pow=2.0):
    """A frequency sweep f0 -> f1 with a fast attack and polynomial decay."""
    n = int(SAMPLE_RATE * seconds)
    f1 = f0 if f1 is None else f1
    out, phase = [], 0.0
    for i in range(n):
        t = i / max(1, n - 1)
        freq = f0 + (f1 - f0) * t
        phase += freq / SAMPLE_RATE
        env = min(1.0, (i / SAMPLE_RATE) / attack) if attack else 1.0
        out.append(_wave(kind, phase) * vol * env * (1 - t) ** decay_pow)
    return out


def noise(seconds, vol=0.5, start_cut=1.0, end_cut=0.05, seed=1):
    """Low-passed noise burst (explosions, hits)."""
    rng = random.Random(seed)
    n = int(SAMPLE_RATE * seconds)
    out, last = [], 0.0
    for i in range(n):
        t = i / max(1, n - 1)
        cut = start_cut + (end_cut - start_cut) * t
        last += (rng.uniform(-1, 1) - last) * cut
        out.append(last * vol * (1 - t) ** 1.6)
    return out


def silence(seconds):
    return [0.0] * int(SAMPLE_RATE * seconds)


def mix_into(base, other, at=0.0):
    start = int(SAMPLE_RATE * at)
    if len(base) < start + len(other):
        base.extend([0.0] * (start + len(other) - len(base)))
    for i, v in enumerate(other):
        base[start + i] += v
    return base


def to_wav(samples):
    peak = max(1.0, max((abs(s) for s in samples), default=1.0))
    frames = b''.join(struct.pack('<h', int(max(-1.0, min(1.0, s / peak)) * 30000)) for s in samples)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(frames)
    return buf.getvalue()


def sound_effect(name):
    if name == 'coin':
        return to_wav(tone(0.07, 988, 988, 'square', 0.5) + tone(0.28, 1319, 1319, 'square', 0.5, decay_pow=1.5))
    if name == 'jump':
        return to_wav(tone(0.28, 260, 720, 'square', 0.5, decay_pow=1.2))
    if name == 'laser':
        return to_wav(tone(0.32, 1800, 180, 'saw', 0.45, decay_pow=1.0))
    if name == 'explosion':
        return to_wav(mix_into(noise(0.9, 0.9, 0.5, 0.02, seed=7), tone(0.5, 90, 35, 'square', 0.5)))
    if name == 'powerup':
        notes = [523, 659, 784, 1047, 1319]
        s = []
        for f in notes:
            s += tone(0.07, f, f * 1.01, 'square', 0.45, decay_pow=0.6)
        return to_wav(s + tone(0.25, 1568, 1568, 'square', 0.45))
    if name == 'hit':
        return to_wav(mix_into(noise(0.18, 0.9, 0.9, 0.1, seed=3), tone(0.12, 220, 70, 'square', 0.5)))
    if name == 'blip':
        return to_wav(tone(0.06, 880, 880, 'pulse', 0.5, decay_pow=1.0))
    return to_wav(chiptune_loop(seed=hash(name) & 0xFFFF))


def chiptune_loop(seed=1, bpm=120, bars=2):
    """A seamless-ish two-bar loop: bass, arpeggio lead and a hat."""
    rng = random.Random(seed)
    beat = 60.0 / bpm
    scale = [0, 3, 5, 7, 10, 12, 15]  # minor pentatonic-ish semitones
    root = rng.choice([110.0, 123.47, 130.81, 146.83])
    step = beat / 2
    total_steps = int(bars * 8)
    out = []
    for i in range(total_steps):
        pos = i * step
        bass_note = root * 2 ** (rng.choice([0, 0, 7, 5, 3]) / 12) if i % 2 == 0 else None
        if bass_note:
            mix_into(out, tone(step * 0.95, bass_note, bass_note, 'tri', 0.55, decay_pow=0.7), pos)
        lead = root * 4 * 2 ** (rng.choice(scale) / 12)
        mix_into(out, tone(step * 0.9, lead, lead, 'pulse', 0.28, decay_pow=1.3), pos)
        if i % 2 == 1:
            mix_into(out, noise(0.05, 0.25, 1.0, 0.7, seed=i), pos)
    return out


def duration_of(wav_bytes):
    with wave.open(io.BytesIO(wav_bytes), 'rb') as w:
        return round(w.getnframes() / w.getframerate(), 1)


def obj_model(seed):
    """A small low-poly prop (stack of boxes plus a pyramid roof) as Wavefront .obj text."""
    rng = random.Random(seed)
    verts, faces = [], []

    def box(x, y, z, w, h, d):
        base = len(verts) + 1
        for dx in (0, w):
            for dy in (0, h):
                for dz in (0, d):
                    verts.append((x + dx, y + dy, z + dz))
        for f in ((1, 2, 4, 3), (5, 7, 8, 6), (1, 5, 6, 2), (3, 4, 8, 7), (1, 3, 7, 5), (2, 6, 8, 4)):
            faces.append(tuple(base + i - 1 for i in f))

    for level in range(rng.randint(2, 4)):
        s = 2.0 - level * 0.3
        box(-s / 2, level * 0.8, -s / 2, s, 0.8, s)
    top = len(verts)
    apex = (0, 0.8 * (level + 1) + 1.0, 0)
    verts.append(apex)
    s = 2.0 - level * 0.3
    corners = [(-s / 2, 0.8 * (level + 1), -s / 2), (s / 2, 0.8 * (level + 1), -s / 2), (s / 2, 0.8 * (level + 1), s / 2), (-s / 2, 0.8 * (level + 1), s / 2)]
    ci = []
    for c in corners:
        verts.append(c)
        ci.append(len(verts))
    for i in range(4):
        faces.append((top + 1, ci[i], ci[(i + 1) % 4]))
    lines = ['# Pixel Forge demo model', f'# seed {seed}']
    lines += [f'v {x:.3f} {y:.3f} {z:.3f}' for x, y, z in verts]
    lines += ['f ' + ' '.join(str(i) for i in f) for f in faces]
    return '\n'.join(lines).encode()
