import { greenhouseMap } from "./greenhouse";

export const arboretum_greenhouse = greenhouseMap(
  "arboretum_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW", "WPPpgggpPPW", "WYgggggggYW", "WcCCCCCCCKW",
    "WwwwggggggW", "WhDhgggggpW", "WPggrrrggYW", "WYpgrrrgpPW", "WWWWWEWWWWW",
  ], { to: "council_arboretum", x: 6, y: 20 },
  { script: "ch10_gh_visitor", sprite: "gardener", x: 3, y: 5 },
);
