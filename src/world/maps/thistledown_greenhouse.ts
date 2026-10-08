import { greenhouseMap } from "./greenhouse";
export const thistledown_greenhouse = greenhouseMap(
  "thistledown_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW", "WPPpgggpPPW", "WYgggggggYW", "WcCCCCCCCKW",
    "WwwwggggggW", "WhDhgggggpW", "WPggrrrggYW", "WYpgrrrgpPW", "WWWWWEWWWWW",
  ], { to: "thistledown", x: 6, y: 11 },
  { script: "ch9_gh_visitor", sprite: "hiker", x: 3, y: 5 },
);
