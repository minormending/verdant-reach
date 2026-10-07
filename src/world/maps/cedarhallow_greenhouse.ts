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
  { script: "ch5_gh_visitor", sprite: "forager", x: 3, y: 5 },
);
export const scripts: Scripts = { ch5_gh_visitor: [
  say("Came up ROUTE 6 by night. GHOST PIPES all along the trail, pale as candles."),
  say("No green in them at all. They don't need the sun one bit."),
] };
