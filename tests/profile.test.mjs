import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "data/profile-data.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(dataSource, context);
const data = context.window.PROFILE_DATA;
const serialized = JSON.stringify(data);

test("publication dataset has the complete captured inventory", () => {
  assert.equal(data.meta.counts.reports, 105);
  assert.equal(data.reports.length, 105);
  assert.equal(data.reports.reduce((sum, report) => sum + report.variants.length, 0), 183);
  assert.equal(data.lineage.neanderthal.locations.length, 250);
  assert.equal(data.lineage.neanderthal.traitMarkers.length, 38);
  assert.equal(data.ancestry.timeline.length, 17);
  assert.equal(Object.keys(data.ancestry.paintings).length, 6);
});

test("report category counts match the captured account", () => {
  const counts = data.reports.reduce((groups, report) => {
    (groups[report.category] ||= []).push(report);
    return groups;
  }, {});
  assert.equal(counts["Health Predisposition"].length, 14);
  assert.equal(counts["Carrier Status"].length, 46);
  assert.equal(counts.Wellness.length, 8);
  assert.equal(counts.Traits.length, 37);
});

test("every chromosome confidence view is internally complete", () => {
  const segmentCount = Object.values(data.ancestry.paintings).reduce(
    (total, chromosomes) => total + chromosomes.reduce(
      (sum, chromosome) => sum + (chromosome.a?.segments.length || 0) + (chromosome.b?.segments.length || 0),
      0
    ),
    0
  );
  assert.equal(segmentCount, 2415);
  Object.values(data.ancestry.paintings).forEach((chromosomes) => assert.equal(chromosomes.length, 24));
});

test("every displayed ancestry population has a unique shared color", () => {
  const populationNames = new Set([
    ...data.ancestry.broad.map((row) => row.name),
    ...data.ancestry.detailed.map((row) => row.name),
    ...data.ancestry.timeline.map((row) => row.name),
    ...Object.values(data.ancestry.paintings).flatMap((chromosomes) =>
      chromosomes.flatMap((chromosome) =>
        [chromosome.a, chromosome.b]
          .filter(Boolean)
          .flatMap((copy) => copy.segments.map((segment) => segment.name))
      )
    )
  ]);
  const paletteSource = appSource.match(
    /const ancestryDisplayColors = Object\.freeze\(\{([\s\S]*?)\}\);/
  )?.[1];
  assert.ok(paletteSource, "ancestry display palette is declared");
  populationNames.forEach((name) => {
    assert.ok(paletteSource.includes(`"${name}":`), `palette includes ${name}`);
  });
  const colors = [...paletteSource.matchAll(/#[0-9a-f]{6}/gi)].map((match) => match[0].toLowerCase());
  assert.equal(colors.length, populationNames.size);
  assert.equal(new Set(colors).size, populationNames.size);
});

test("every report separates its title from its result", () => {
  data.reports.forEach((report) => {
    assert.ok(report.title.trim(), report.id);
    assert.ok(report.result.trim(), report.id);
    assert.ok(!report.result.toLowerCase().startsWith(report.title.toLowerCase()), report.id);
  });
  assert.doesNotMatch(serialized, /awful lot of requests|rate.?limit/i);
});

test("direct identifiers and account routes are absent", () => {
  assert.doesNotMatch(serialized, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(serialized, /\/p\/[a-f0-9]{16}\//i);
  assert.doesNotMatch(serialized, /profile subject/i);
  assert.doesNotMatch(serialized, /"sourcePath"/);
});

test("family and relative records are not published", () => {
  assert.doesNotMatch(html, /id=["']relatives["']/i);
  assert.equal(Object.hasOwn(data, "relatives"), false);
  assert.equal(Object.hasOwn(data, "family"), false);
});

test("the interactive shell exposes every major captured section", () => {
  for (const id of ["ancestry", "timeline", "chromosomes", "lineage", "reports", "privacy", "report-dialog"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /painting-confidence/);
  assert.match(html, /id="painting-key"/);
  assert.match(html, /id="regional-toggle"/);
  assert.match(html, /report-search/);
  assert.match(html, /report-category-tabs/);
  assert.match(html, /report-groups/);
  assert.match(html, /<option value="broad" selected>Broad overview<\/option>/);
});

test("metadata and keyboard model match the publication surface", () => {
  assert.match(html, /rel="canonical" href="https:\/\/jehlp\.net\/profile\/"/);
  assert.match(html, /property="og:url" content="https:\/\/jehlp\.net\/profile\/"/);
  assert.doesNotMatch(html, /jwknt\.github\.io/i);
  assert.doesNotMatch(appSource, /piece\.tabIndex\s*=\s*0/);
  assert.doesNotMatch(appSource, /mark\.tabIndex\s*=\s*0/);
  assert.doesNotMatch(appSource, /range\.tabIndex\s*=\s*0/);
  assert.doesNotMatch(appSource, /row\.setAttribute\("role", "button"\)/);
});
