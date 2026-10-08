import { greenhouseMap } from "./greenhouse";
export const sanguine_greenhouse = greenhouseMap(
  "sanguine_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW", "WPPpgggpPPW", "WYgggggggYW", "WcCCCCCCCKW",
    "WwwwggggggW", "WhDhgggggpW", "WPggrrrggYW", "WYpgrrrgpPW", "WWWWWEWWWWW",
  ], { to: "sanguine_ridge", x: 6, y: 12 },
  { script: "ch9_gh_visitor", sprite: "hiker", x: 3, y: 5 },
);
