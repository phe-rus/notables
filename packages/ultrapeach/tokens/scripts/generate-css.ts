import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderThemeCss } from "../src/index";

const target = fileURLToPath(new URL("../theme.css", import.meta.url));
writeFileSync(target, renderThemeCss());
console.log(`Wrote ${target}`);
