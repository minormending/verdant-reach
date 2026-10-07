"""Generator edge authoring: corners, animation, fallbacks and palette limits."""
import unittest

import numpy as np

from tile_edges import join_edges


def variants():
    out = {}
    for frame in (1, 2):
        suffix = '' if frame == 1 else '__2'
        out[f'grass{suffix}'] = np.zeros((16, 16), np.int16)
        for m in range(16):
            a = np.indices((16, 16)).sum(axis=0).astype(np.int16) % 3
            a[0] = (m + frame) % 4
            a[-1] = (m + frame + 1) % 4
            a[:, 0] = (m + frame + 2) % 4
            a[:, -1] = (m + frame + 3) % 4
            out[f'grass@{m}{suffix}'] = a
    return out


class EdgeTests(unittest.TestCase):
    def assert_joined(self, out):
        for suffix in ('', '__2'):
            for m in range(16):
                a = out.get(f'grass@{m}{suffix}', out[f'grass{suffix}'])
                for n in range(16):
                    b = out.get(f'grass@{n}{suffix}', out[f'grass{suffix}'])
                    if m & 2 and n & 8:
                        np.testing.assert_array_equal(a[:, -1], b[:, 0])
                    if m & 4 and n & 1:
                        np.testing.assert_array_equal(a[-1], b[0])

    def test_every_reciprocal_pair_and_corner_in_both_frames(self):
        before = variants()
        snapshot = {s: a.copy() for s, a in before.items()}
        after = join_edges(before)
        self.assert_joined(after)
        for s, a in after.items():
            np.testing.assert_array_equal(a[1:15, 1:15], before[s][1:15, 1:15])
            np.testing.assert_array_equal(before[s], snapshot[s])
            for y in (0, 8):
                for x in (0, 8):
                    self.assertLessEqual(len(np.unique(a[y:y+8, x:x+8])), 4)
        for s, a in join_edges(after).items():
            np.testing.assert_array_equal(a, after[s])
        for s, a in join_edges(dict(reversed(list(before.items())))).items():
            np.testing.assert_array_equal(a, after[s])

    def test_missing_masks_and_decorated_alternates(self):
        before = variants()
        del before['grass@3']
        del before['grass@3__2']
        before['grass~1'] = before['grass'].copy()
        before['grass~1'][4:8, 4:8] = 3
        after = join_edges(before)
        self.assert_joined(after)
        np.testing.assert_array_equal(after['grass~1'][4:8, 4:8], before['grass~1'][4:8, 4:8])
        np.testing.assert_array_equal(after['grass~1'], before['grass~1'])
        self.assertNotIn('grass@3', after)

    def test_wrap_and_unselected_ground(self):
        before = variants()
        before['grass~1'] = before['grass@2'].copy()
        before['prop'] = before['grass@4'].copy()
        after = join_edges(before, repeat=('grass',))
        self.assert_joined(after)
        for s in ('grass', 'grass__2', 'grass~1'):
            a = after[s]
            np.testing.assert_array_equal(a[0], a[-1])
            np.testing.assert_array_equal(a[:, 0], a[:, -1])
        np.testing.assert_array_equal(after['prop'], before['prop'])

    def test_border_palette_does_not_add_a_fifth_quadrant_colour(self):
        before = variants()
        # A joined variant uses a distinct ramp. Every quadrant fits four
        # colours before and after; that ramp must not become a fifth hue
        # in the other variants when their borders meet.
        before['grass@2'][:] = 4
        after = join_edges(before)
        self.assert_joined(after)
        for s, a in after.items():
            for y in (0, 8):
                for x in (0, 8):
                    self.assertLessEqual(len(np.unique(a[y:y+8, x:x+8])), 4)

    def test_authored_trim_colour_and_impossible_palette(self):
        before = variants()
        after = join_edges(before, edge_colours={'grass': (0,)})
        self.assert_joined(after)
        for m in range(16):
            a = after[f'grass@{m}']
            for bit, edge in ((1, a[0]), (2, a[:, -1]), (4, a[-1]), (8, a[:, 0])):
                if m & bit:
                    self.assertTrue(np.all(edge == 0))
        with self.assertRaises(ValueError):
            join_edges(before, edge_colours={'grass': (99,)})


if __name__ == '__main__':
    unittest.main()
