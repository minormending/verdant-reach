"""Hand-pixelled 16x16 party icons (palette indices: 0 outline, 1 dark,
2 mid, 3 light; '.' transparent). Composed on a grid with a few helpers so
each feature is placed deliberately; frame 2 is derived (squash or bob)."""


class G:
    def __init__(self):
        self.g = [["."] * 16 for _ in range(16)]

    def put(self, x, y, s):
        """Write string s starting at (x, y); '.' in s leaves the cell alone."""
        for i, ch in enumerate(s):
            if ch != "." and 0 <= x + i < 16 and 0 <= y < 16:
                self.g[y][x + i] = ch
        return self

    def block(self, x, y, rows):
        for j, r in enumerate(rows):
            self.put(x, y + j, r)
        return self

    def rows(self):
        return ["".join(r) for r in self.g]

    def shape(self, mask, ch, ring=True):
        """Fill a boolean 16x16 mask with ch, outlined over what's behind."""
        cells = [(x, y) for y in range(16) for x in range(16) if mask[y][x]]
        cs = set(cells)
        if ring:
            for x, y in cells:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q not in cs and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                        self.g[q[1]][q[0]] = "0"
        for x, y in cells:
            self.g[y][x] = ch
        return self

    def leaf(self, p0, p1, w, ch, ring=True, **kw):
        from px import Canvas
        return self.shape(Canvas(16, 16).leaf(p0, p1, w, **kw), ch, ring)

    def disc(self, cx, cy, rx, ry, ch, ring=True):
        """Filled ellipse (pixel centres) with its own 1px outline drawn over
        whatever is behind it."""
        cells = [(x, y) for y in range(16) for x in range(16)
                 if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1]
        cs = set(cells)
        if ring:
            for x, y in cells:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q not in cs and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                        self.g[q[1]][q[0]] = "0"
        for x, y in cells:
            self.g[y][x] = ch
        return self


def fit(rows):
    """Pad/trim drafted rows to 16x16."""
    rows = [(r + "." * 16)[:16] for r in rows] + ["." * 16] * 16
    return rows[:16]


def acorn():
    return G().block(0, 0, [
        "........00......",
        ".......010......",
        ".....0001000....",
        "...00111111100..",
        "..0122122111110.",
        "..0112212211110.",
        "..0111111111110.",
        "...00000000000..",
        "...02222222210..",
        "...03222222110..",
        "...03222222110..",
        "....0322221110..",
        "....0222211110..",
        ".....02211110...",
        "......011110....",
        ".......0000.....",
    ]).rows()


def sapling():
    return fit([
        "........00",
        ".....0001000",
        "....01313110",
        "...0101101010",
        ".00000000000000",
        "032222011022220",
        "0222220110222210",
        ".02221011022110",
        "..00000110000",
        ".00....0110",
        "0322...0110.00",
        "02221.01100220",
        ".022100110.00",
        "..000.0110",
        ".....0111100",
        "....01100110",
    ])


def oak():
    return G().block(0, 0, [
        ".....000000.....",
        "...0033222200...",
        "..032222222220..",
        ".03222212222210.",
        ".02222222222110.",
        "0222212222221110",
        "0222222222211110",
        "0122221222111110",
        ".011111111111100",
        "..0011001100100.",
        "......0110......",
        "......0110......",
        "......0110......",
        ".....011110.....",
        "....01100110....",
        "....000..000....",
    ]).rows()


def petals5(g, cx, cy, R, rx, ry, start, shade_idx=(2,), centre="1", cr=1.5):
    import math
    for k in range(5):
        a = math.radians(start + 72 * k)
        g.disc(cx + math.cos(a) * R, cy + math.sin(a) * R * 0.92, rx, ry, "2" if k in shade_idx else "3")
    g.disc(cx, cy, cr, cr, centre, ring=False)
    return g


def chili_blossom():
    g = G()
    g.put(9, 1, "..000").put(9, 2, ".01110").put(8, 3, ".010.0220").put(8, 4, "010..0220").put(13, 5, "00")
    g.put(7, 5, "010")
    petals5(g, 6.5, 10.5, 3.9, 2.2, 2.1, -90, shade_idx=(1, 2))
    g.put(5, 10, "1")
    return g.rows()


def green_chili():
    return fit([
        ".......00",
        "........0",
        ".......010",
        ".....001100",
        "....01111110",
        "....00111000",
        ".....032210",
        ".....032210",
        ".....032210",
        "......03210",
        "......03210",
        "......02210",
        ".....02210",
        "....02210",
        "...0210",
        "....00",
    ])


def red_chili():
    return fit([
        "........00",
        ".......0300",
        "......003300",
        ".....03333330",
        ".....03111110",
        "......0222210",
        "......03222110",
        "......03222110",
        ".00...03222110",
        "0210..02222110",
        "0220..0222110",
        "02210022221110",
        ".02222222111 0",
        ".0112221111 0",
        "..001111100",
        "....00000",
    ])


def giant_water_lily():
    g = G()
    # centre petal (pink, upright)
    g.put(7, 2, "00").put(6, 3, "0220").put(6, 4, "0220").put(6, 5, "0220").put(6, 6, "0220")
    # inner petals leaning out
    g.put(3, 4, "0").put(12, 4, "0")
    g.put(2, 5, "030").put(11, 5, "030")
    g.put(2, 6, "0330").put(10, 6, "0330")
    g.put(2, 7, "0333").put(6, 7, "0220").put(10, 7, "3330")
    # outer petals splayed flat
    g.put(0, 8, "000333").put(6, 8, "0220").put(10, 8, "333000")
    g.put(0, 9, "0333033").put(7, 9, "00").put(9, 9, "3303330")
    g.put(0, 10, ".03330333").put(9, 10, "3033 30".replace(" ", "3"))
    g.put(1, 11, "00333333333300")
    # pad: dark top, pink rim
    g.put(0, 12, "0111000000001110")
    g.put(0, 13, "0222211111122220")
    g.put(1, 14, "00222222222200")
    g.put(3, 15, "0000000000")
    return g.rows()


def bramble_blossom():
    g = G()
    g.put(9, 11, "0").put(9, 12, "010").put(10, 13, "0110").put(12, 14, "0110").put(13, 15, "000")
    petals5(g, 7, 7.6, 3.9, 2.5, 2.4, -90, shade_idx=(1, 2))
    g.disc(7, 7.6, 1.5, 1.5, "1", ring=False)
    g.put(6, 7, "2")
    return g.rows()


def drupe_berry(g, cx, cy, rx, ry, glint=None):
    """Berry disc: bumpy outline, drupelet dots of the dark tone in a
    staggered grid, optional pale glints (tone 3) on the lit side."""
    g.disc(cx, cy, rx, ry, "2")
    for y in range(16):
        for x in range(16):
            if g.g[y][x] != "2":
                continue
            u = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
            if (x + (y // 2) * 1) % 2 == 1 and y % 2 == 1:
                g.g[y][x] = "1"
            elif u > 0.9 and (x + y) % 2 == 0:
                g.g[y][x] = "1"
    for x, y in glint or ():
        g.g[y][x] = "3"
    return g


def bramble_berry():
    g = G()
    g.put(9, 0, "..00").put(8, 1, "..0110").put(8, 2, ".0110").put(8, 3, "0110").put(12, 1, "0").put(13, 2, "0")
    drupe_berry(g, 7.5, 10, 6.4, 5.8)
    g.put(3, 3, "..0..0..0").put(3, 4, ".03003003").put(3, 4, ".030.030.0").put(3, 5, "0333333330")
    return g.rows()


def blackberry():
    g = G()
    g.block(0, 0, [
        "......000000....",
        ".....01111110...",
        "....01000.0110..",
        "....010....0110.",
        "...........0110.",
        "............010.",
        "............0110",
        "............0110",
    ])
    drupe_berry(g, 13, 12.5, 2.8, 3.0)
    drupe_berry(g, 6.8, 10.4, 6.2, 5.6, glint=[(3, 7), (4, 7), (3, 8)])
    g.put(4, 4, "0.0.0").put(4, 5, "01110")
    return g.rows()


PATTERNED = {"bramble_berry", "blackberry"}

ICONS = {"oak_acorn": acorn, "oak_sapling": sapling, "great_oak": oak,
         "chili_blossom": chili_blossom, "green_chili": green_chili, "red_chili": red_chili,
         "giant_water_lily": giant_water_lily, "bramble_blossom": bramble_blossom,
         "bramble_berry": bramble_berry, "blackberry": blackberry}
