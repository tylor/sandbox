"""
Generate audio assets for 1-800-DOGS:
  1. hold-music.wav  - smooth easy-listening hold music (~60 seconds)
  2. bark1.wav       - short single bark
  3. bark2.wav       - double bark
  4. bark3.wav       - excited barking sequence
"""

import wave, struct, math, random, os, array

SAMPLE_RATE = 22050
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'public', 'audio')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def write_wav(filename, samples):
    path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        data = array.array('h', (int(max(-1, min(1, s)) * 32767) for s in samples))
        f.writeframes(data.tobytes())
    print(f'  wrote {path} ({len(samples)/SAMPLE_RATE:.1f}s)')


def make_buffer(duration):
    return [0.0] * int(SAMPLE_RATE * duration)


def add_to(buf, offset_sec, samples):
    """Add samples into buf starting at offset_sec. In-place, fast."""
    start = int(SAMPLE_RATE * offset_sec)
    end = min(start + len(samples), len(buf))
    for i in range(end - start):
        buf[start + i] += samples[i]


def envelope(samples, attack=0.02, release=0.05):
    result = list(samples)
    a = min(int(SAMPLE_RATE * attack), len(result))
    r = min(int(SAMPLE_RATE * release), len(result))
    for i in range(a):
        result[i] *= i / a
    for i in range(r):
        result[len(result) - 1 - i] *= i / r
    return result


def soft_pad(freq, duration, volume=0.08):
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    tw = 2 * math.pi / SAMPLE_RATE
    f1, f2, f3 = freq * tw, freq * 1.002 * tw, freq * 0.998 * tw
    for i in range(n):
        samples[i] = (math.sin(f1 * i) * 0.5 +
                       math.sin(f2 * i) * 0.25 +
                       math.sin(f3 * i) * 0.25) * volume
    return envelope(samples, 0.1, 0.15)


def piano_tone(freq, duration, volume=0.18):
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    tw = 2 * math.pi / SAMPLE_RATE
    f1 = freq * tw
    for i in range(n):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 2.5)
        s = (math.sin(f1 * i) * 0.6 +
             math.sin(f1 * 2 * i) * 0.2 +
             math.sin(f1 * 3 * i) * 0.1 +
             math.sin(f1 * 4 * i) * 0.05)
        samples[i] = s * env * volume
    return envelope(samples, 0.005, 0.08)


def bass_tone(freq, duration, volume=0.12):
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    tw = 2 * math.pi * freq / SAMPLE_RATE
    for i in range(n):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 1.5)
        samples[i] = (math.sin(tw * i) * 0.7 + math.sin(tw * 2 * i) * 0.2) * env * volume
    return envelope(samples, 0.01, 0.05)


# ── Hold Music ───────────────────────────────────────────────────────────────

def generate_hold_music():
    duration = 60.0
    buf = make_buffer(duration)

    N = {
        'C2': 65, 'D2': 73, 'E2': 82, 'F2': 87, 'G2': 98, 'A2': 110, 'Bb2': 117, 'B2': 123,
        'C3': 131, 'D3': 147, 'E3': 165, 'F3': 175, 'G3': 196, 'A3': 220, 'Bb3': 233, 'B3': 247,
        'C4': 262, 'D4': 294, 'Eb4': 311, 'E4': 330, 'F4': 349, 'G4': 392, 'Ab4': 415, 'A4': 440,
        'Bb4': 466, 'B4': 494,
        'C5': 523, 'D5': 587, 'Eb5': 622, 'E5': 659, 'F5': 698, 'G5': 784, 'A5': 880,
    }

    beat = 0.8
    bar = beat * 4

    chords = [
        ('C3', ['C4', 'E4', 'G4', 'B4']),
        ('D3', ['D4', 'F4', 'A4', 'C5']),
        ('G2', ['G3', 'B3', 'D4', 'F4']),
        ('C3', ['C4', 'E4', 'G4', 'B4']),
        ('F3', ['F4', 'A4', 'C5', 'E5']),
        ('F3', ['F4', 'Ab4', 'C5', 'Eb5']),
        ('C3', ['E4', 'G4', 'B4', 'C5']),
        ('G2', ['G3', 'B3', 'D4', 'F4']),
    ]

    melody_phrases = [
        [('E5',0,1),('G5',1,0.5),('E5',1.5,0.5),('D5',2,1),('C5',3,1),
         ('D5',4,1.5),('E5',5.5,0.5),('F5',6,1),('E5',7,1)],
        [('D5',0,1),('B4',1,1),('G4',2,0.5),('A4',2.5,0.5),('B4',3,1),
         ('C5',4,2),('E5',6,1),('D5',7,1)],
        [('C5',0,1),('A4',1,1),('F4',2,0.5),('G4',2.5,0.5),('A4',3,1),
         ('Ab4',4,1),('G4',5,1),('F4',6,0.5),('Eb4',6.5,0.5),('C4',7,1)],
        [('E4',0,1),('G4',1,1),('B4',2,1),('C5',3,1),
         ('D5',4,1.5),('B4',5.5,0.5),('G4',6,1),('C5',7,1)],
    ]

    print('    generating chords + bass...')
    phrase_idx = 0
    t = 0.0
    while t < duration - bar:
        phrase_start = t
        for bass_note, pad_notes in chords:
            if t >= duration - bar:
                break
            add_to(buf, t, bass_tone(N[bass_note], bar * 0.9))
            for pn in pad_notes:
                add_to(buf, t, soft_pad(N[pn], bar * 0.95))
            t += bar

        print(f'    melody phrase {phrase_idx}...')
        phrase = melody_phrases[phrase_idx % len(melody_phrases)]
        for note, beat_off, dur in phrase:
            note_start = phrase_start + beat_off * beat
            if note_start < duration:
                add_to(buf, note_start, piano_tone(N[note], dur * beat * 0.9, 0.22))
        phrase_idx += 1

    # Normalize
    peak = max(abs(s) for s in buf) or 1.0
    buf = [s / peak * 0.7 for s in buf]

    # Fade in/out
    fi = int(SAMPLE_RATE * 2)
    fo = int(SAMPLE_RATE * 3)
    for i in range(min(fi, len(buf))):
        buf[i] *= i / fi
    for i in range(min(fo, len(buf))):
        buf[len(buf) - 1 - i] *= i / fo

    write_wav('hold-music.wav', buf)


# ── Barking ──────────────────────────────────────────────────────────────────

def bark_sound(duration=0.15, base_freq=450, volume=0.6):
    n = int(SAMPLE_RATE * duration)
    tw = 2 * math.pi / SAMPLE_RATE
    samples = [0.0] * n
    for i in range(n):
        s = (math.sin(base_freq * tw * i) * 0.4 +
             math.sin(base_freq * 1.5 * tw * i) * 0.25 +
             math.sin(base_freq * 2.2 * tw * i) * 0.15 +
             math.sin(base_freq * 3.1 * tw * i) * 0.1 +
             (random.random() * 2 - 1) * 0.15)
        samples[i] = s * volume
    return envelope(samples, 0.005, 0.03)


def silence(duration):
    return [0.0] * int(SAMPLE_RATE * duration)


def generate_bark1():
    s = bark_sound(0.18, 420, 0.6) + silence(0.1)
    write_wav('bark1.wav', s)


def generate_bark2():
    s = bark_sound(0.15, 440, 0.6) + silence(0.12) + bark_sound(0.2, 400, 0.65) + silence(0.1)
    write_wav('bark2.wav', s)


def generate_bark3():
    s = []
    for dur, freq, vol in [(0.12,460,0.5),(0.1,480,0.55),(0.15,430,0.6),
                            (0.08,500,0.5),(0.1,470,0.55),(0.18,410,0.65),
                            (0.12,450,0.5),(0.14,440,0.6)]:
        s.extend(bark_sound(dur, freq, vol))
        s.extend(silence(0.08 + random.random() * 0.1))
    write_wav('bark3.wav', s)


if __name__ == '__main__':
    print('Generating 1-800-DOGS audio assets...')
    random.seed(42)
    generate_hold_music()
    generate_bark1()
    generate_bark2()
    generate_bark3()
    print('Done!')
