import { greenhouseMap } from "./greenhouse";
export const saltmarsh_greenhouse = greenhouseMap(
  "saltmarsh_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW", "WPPpgggpPPW", "WYgggggggYW", "WcCCCCCCCKW",
    "WwwwggggggW", "WhDhgggggpW", "WPggrrrggYW", "WYpgrrrgpPW", "WWWWWEWWWWW",
  ], { to: "saltmarsh_harbour", x: 6, y: 12 },
  { script: "ch6_gh_visitor", sprite: "hiker", x: 3, y: 5 },
);
