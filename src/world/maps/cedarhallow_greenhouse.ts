import { greenhouseMap } from "./greenhouse";
import { say, type Scripts } from "../build";

export const cedarhallow_greenhouse = greenhouseMap(
  "cedarhallow_greenhouse", "GREENHOUSE", [
    "WWOOOOOOOWW",
    "WPPpgggpPPW",
    "WYgggggggYW",
    "WcCCCCCCCKW",
    "WwwwggggggW",
    "WhDhgggggpW",
    "WPggrrrggYW",
    "WYpgrrrgpPW",
    "WWWWWEWWWWW",
  ], { to: "cedarhallow", x: 6, y: 17 },
  { script: "ch5_gh_visitor", sprite: "hiker", x: 3, y: 5 },
);
export const scripts: Scripts = { ch5_gh_visitor: [say("TODO(text): ch5_gh_visitor")] };
