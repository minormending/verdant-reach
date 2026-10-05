"""16x16 party/follower icons for species art C.

Frame 1 is hand-pixelled in icon_rows.py (full black outline, no selout,
head leaning left and filling at least half the icon, bottom on row 15,
1px clear at the sides). Frame 2 is a squash (common.squash): the top
drops 1px while the base stays planted.
"""

from __future__ import annotations

from common import icon
from icon_rows import ICONS


def make_icon(id_, pal):
    return icon(ICONS[id_], pal)
