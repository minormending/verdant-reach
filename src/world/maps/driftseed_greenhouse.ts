import { greenhouseMap } from "./greenhouse";
export const driftseed_greenhouse = greenhouseMap(
  "driftseed_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW", "WPPpgggpPPW", "WYgggggggYW", "WcCCCCCCCKW",
    "WwwwggggggW", "WhDhgggggpW", "WPggrrrggYW", "WYpgrrrgpPW", "WWWWWEWWWWW",
  ], { to: "driftseed_isle", x: 14, y: 13 },
  { script: "ch6_gh_visitor", sprite: "hiker", x: 3, y: 5 },
);
