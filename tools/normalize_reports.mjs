import fs from "node:fs";
import vm from "node:vm";

const path = new URL("../data/profile-data.js", import.meta.url);
const source = fs.readFileSync(path, "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const data = context.window.PROFILE_DATA;

const outcomeStart = / (Unlikely|Likely|Less likely|Common|Predisposed|More likely|About a 50\/50 chance|Slightly higher odds)/;

for (const report of data.reports) {
  if (!report.title.trim()) {
    if (report.category === "Carrier Status" && report.result.endsWith(" Variant not detected")) {
      report.title = report.result.slice(0, -" Variant not detected".length);
      report.result = "Variant not detected";
    } else {
      const match = outcomeStart.exec(report.result);
      if (!match) throw new Error(`Unable to split ${report.id}`);
      report.title = report.result.slice(0, match.index);
      report.result = report.result.slice(match.index + 1);
    }
  }
  report.personalNotes = report.personalNotes.filter(
    (note) => !/awful lot of requests|rate.?limit/i.test(note)
  );
}

if (data.reports.some((report) => !report.title.trim() || !report.result.trim())) {
  throw new Error("Every report must have a title and result");
}

fs.writeFileSync(path, `window.PROFILE_DATA = ${JSON.stringify(data)};\n`);
