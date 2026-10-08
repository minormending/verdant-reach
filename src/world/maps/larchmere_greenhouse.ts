import { greenhouseMap } from "./greenhouse";
export const larchmere_greenhouse = greenhouseMap(
  "larchmere_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW", "WPPpgggpPPW", "WYgggggggYW", "WcCCCCCCCKW",
    "WwwwggggggW", "WhDhgggggpW", "WPggrrrggYW", "WYpgrrrgpPW", "WWWWWEWWWWW",
  ], { to: "larchmere", x: 6, y: 12 },
  { script: "ch7_gh_visitor", sprite: "hiker", x: 3, y: 5 },
);
