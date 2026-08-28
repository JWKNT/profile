(() => {
  "use strict";

  const data = window.PROFILE_DATA;
  if (!data) {
    document.body.textContent = "The profile dataset could not be loaded.";
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const appendTextCell = (row, text, className = "") => {
    const cell = el("td", className, text);
    row.append(cell);
    return cell;
  };
  const formatPercent = (value) => `${Number(value).toFixed(Number(value) % 1 ? 1 : 0)}%`;

  const { meta, ancestry, lineage, reports, privacy } = data;

  $("#dataset-date").textContent = meta.captured;
  $("#dataset-version").textContent = `Ancestry v${meta.ancestryVersion} · chip ${meta.genotypingChip}`;

  const sectionLinks = [...document.querySelectorAll(".section-index a")];
  const sectionIndex = $(".section-index");
  const indexedSections = sectionLinks.map((link) => document.querySelector(link.hash)).filter(Boolean);
  let sectionFrame;
  let activeSectionId = "";
  const updateCurrentSection = () => {
    const marker = window.scrollY + $(".section-index").offsetHeight + 64;
    const current = indexedSections.reduce(
      (match, section) => section.offsetTop <= marker ? section : match,
      null
    );
    sectionLinks.forEach((link) => {
      if (current && link.hash === `#${current.id}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (current && current.id !== activeSectionId) {
      activeSectionId = current.id;
      const activeLink = sectionLinks.find((link) => link.hash === `#${current.id}`);
      if (activeLink && window.matchMedia("(max-width: 620px)").matches) {
        sectionIndex.scrollTo({
          left: activeLink.offsetLeft - (sectionIndex.clientWidth - activeLink.offsetWidth) / 2,
          behavior: "smooth"
        });
      }
    }
  };
  window.addEventListener("scroll", () => {
    if (sectionFrame) return;
    sectionFrame = window.requestAnimationFrame(() => {
      updateCurrentSection();
      sectionFrame = null;
    });
  }, { passive: true });
  sectionLinks.forEach((link) => link.addEventListener("click", () => {
    sectionLinks.forEach((item) => item.removeAttribute("aria-current"));
    link.setAttribute("aria-current", "location");
  }));
  updateCurrentSection();

  const metrics = [
    ["Ancestry", formatPercent(ancestry.total.percent)],
    ["Reports", meta.counts.reports.toLocaleString()],
    ["Report markers", meta.counts.testedReportMarkers.toLocaleString()],
    ["DNA segments", meta.counts.chromosomeSegments.toLocaleString()],
    ["Neanderthal variants", meta.counts.neanderthalVariants.toLocaleString()]
  ];
  const metricList = $("#headline-metrics");
  metrics.forEach(([label, value]) => {
    const item = el("div");
    item.append(el("dt", "", label), el("dd", "", value));
    metricList.append(item);
  });

  const compositionBar = $("#composition-bar");
  const compositionList = $("#composition-list");
  const ancestryDepth = $("#ancestry-depth");

  function renderComposition() {
    const rows = ancestry[ancestryDepth.value];
    compositionBar.replaceChildren();
    compositionList.replaceChildren();
    compositionBar.setAttribute(
      "aria-label",
      rows.map((row) => `${row.name} ${formatPercent(row.percent)}`).join(", ")
    );

    rows.forEach((row) => {
      const segment = el("span");
      segment.style.width = `${row.percent}%`;
      segment.style.background = row.color;
      segment.title = `${row.name}: ${formatPercent(row.percent)}`;
      compositionBar.append(segment);

      const item = el("li");
      const swatch = el("span", "swatch");
      swatch.style.setProperty("--swatch", row.color);
      const name = el("span", "composition-name", row.name);
      if (row.group && row.group !== row.name) name.append(el("small", "", row.group));
      item.append(swatch, name, el("strong", "composition-value", formatPercent(row.percent)));
      compositionList.append(item);
    });
  }

  ancestryDepth.addEventListener("change", renderComposition);
  renderComposition();

  const signalList = $("#regional-signals");
  ancestry.regionalSignals.forEach((signal, index) => {
    const row = ancestry.detailed.find((item) => item.name === signal.name);
    const item = el("div", "regional-signal");
    item.dataset.overflowSignal = String(index >= 6);
    item.hidden = index >= 6;
    const swatch = el("span", "signal-swatch");
    swatch.style.setProperty("--swatch", row?.color || "var(--blue)");
    const copy = el("div");
    copy.append(el("strong", "", signal.name));
    const suffix = signal.additional ? ` · +${signal.additional} regions` : "";
    copy.append(el("span", "", `${signal.regions.join(" · ")}${suffix}`));
    item.append(swatch, copy);
    signalList.append(item);
  });

  const regionalToggle = $("#regional-toggle");
  const additionalSignals = ancestry.regionalSignals.length - 6;
  regionalToggle.textContent = `Show all ${ancestry.regionalSignals.length}`;
  regionalToggle.addEventListener("click", () => {
    const expanded = regionalToggle.getAttribute("aria-expanded") === "true";
    signalList.querySelectorAll("[data-overflow-signal='true']").forEach((item) => {
      item.hidden = expanded;
    });
    regionalToggle.setAttribute("aria-expanded", String(!expanded));
    regionalToggle.textContent = expanded ? `Show all ${ancestry.regionalSignals.length}` : `Show ${additionalSignals} fewer`;
  });

  const versionBody = $("#version-table-body");
  ancestry.versionHistory.comparison.forEach((change) => {
    const row = el("tr");
    appendTextCell(row, change.population);
    appendTextCell(row, change.current);
    appendTextCell(row, change.previous);
    appendTextCell(row, change.change);
    appendTextCell(row, change.note);
    versionBody.append(row);
  });

  const timelineKey = $("#timeline-key");
  timelineKey.append(el("span", "", "Population"));
  ancestry.timelineScale.slice(1).forEach((point) => {
    const key = el("span", "timeline-key-point");
    key.append(el("small", "", `Gen. ${point.generation}`), el("strong", "", String(point.year)));
    timelineKey.append(key);
  });

  const timeline = $("#ancestry-timeline");
  ancestry.timeline.forEach((entry) => {
    const row = el("div", "timeline-row");
    row.append(el("div", "timeline-label", entry.name));
    const track = el("div", "timeline-track");
    const range = el("span", "timeline-range");
    const start = Number(entry.startClass.replace("start-", ""));
    const width = Number(entry.widthClass.replace("width-", ""));
    range.style.setProperty("--start", start);
    range.style.setProperty("--width", width);
    range.style.setProperty("--range", entry.color);
    range.tabIndex = 0;
    range.title = entry.description;
    range.setAttribute("aria-label", `${entry.name}: generations ${entry.generationRange}, between ${entry.estimatedYears}`);
    range.append(el("span", "timeline-range-label", entry.estimatedYears.replace(" and ", "–")));
    track.append(range);
    row.append(track);
    timeline.append(row);
  });

  const confidence = $("#painting-confidence");
  const paintingNames = Object.keys(ancestry.paintings);
  paintingNames.forEach((name) => {
    const option = el("option", "", name);
    option.value = name;
    confidence.append(option);
  });
  confidence.value = "Most likely";

  const plot = $("#chromosome-plot");
  const plotStatus = $("#plot-status");
  const paintingLegend = $("#painting-legend");
  const paintingKey = $("#painting-key");
  const paintingKeySummary = $("#painting-key-summary");
  if (window.matchMedia("(max-width: 620px)").matches) paintingKey.open = false;

  // Display-only palette: 23andMe's source colors cluster heavily in blue.
  // These colors preserve ancestry families while making every key entry unique.
  const paintingDisplayColors = Object.freeze({
    "European": "#5d6874",
    "Broadly European": "#a9b0b7",
    "Unassigned": "#ded9cb",
    "British & Irish": "#2f6fa3",
    "Broadly British & Irish": "#94b9d5",
    "English": "#0b4f8a",
    "Scottish": "#3e84b8",
    "Irish": "#67a6c7",
    "Welsh": "#9bc9df",
    "Western European": "#a96028",
    "Broadly Western European": "#e2b683",
    "Austrian & Southern German": "#87401d",
    "French": "#c45f27",
    "Swiss, Southwestern German & Western Austrian": "#d47c35",
    "Dutch & Northern German": "#df9b52",
    "Belgian, Rhinelander & Southern Dutch": "#ecc078",
    "Ashkenazi Jewish": "#7b52a3",
    "Nordic": "#117f7b",
    "Broadly Nordic": "#8fc9c3",
    "Swedish": "#075f63",
    "Norwegian": "#35a19a",
    "Danish": "#65beb3",
    "Italian & Maltese": "#b84c4f",
    "Broadly Italian & Maltese": "#e8aaa1",
    "Northern Italian": "#96383d",
    "Southern Italian": "#d56a60",
    "Sardinian": "#ef9788",
    "Central & Eastern European": "#4f844e",
    "Broadly Central & Eastern European": "#aac69e",
    "Belarusian, Polish & Ukrainian": "#72a761",
    "Greek & Balkan": "#b88925",
    "Albanian & Macedonian": "#dfb23f"
  });

  function paintingColor(segment) {
    return paintingDisplayColors[segment.name] || segment.color;
  }

  let activeCopy = "both";
  let activePopulation = null;
  let displayedSegmentCount = 0;
  let displayedChromosomeCount = 0;

  function updatePaintingHighlight() {
    document.querySelectorAll(".segment").forEach((segment) => {
      const matches = !activePopulation || segment.dataset.population === activePopulation;
      segment.classList.toggle("is-muted", !matches);
      segment.classList.toggle("is-highlighted", Boolean(activePopulation && matches));
    });
    document.querySelectorAll(".legend-button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.population === activePopulation));
    });
    const isolate = activePopulation ? ` · isolating ${activePopulation}` : "";
    plotStatus.textContent = `${confidence.value} confidence · ${displayedSegmentCount.toLocaleString()} displayed assignments · ${displayedChromosomeCount} chromosomes${isolate}`;
  }

  function renderPaintingLegend(palette) {
    paintingLegend.replaceChildren();
    paintingKeySummary.textContent = `Color key · ${palette.size} populations`;
    if (activePopulation && !palette.has(activePopulation)) activePopulation = null;
    palette.forEach((color, name) => {
      const button = el("button", "legend-button", name);
      button.type = "button";
      button.dataset.population = name;
      button.style.setProperty("--legend", color);
      button.setAttribute("aria-pressed", String(name === activePopulation));
      button.title = `Isolate ${name} segments`;
      button.addEventListener("click", () => {
        activePopulation = activePopulation === name ? null : name;
        updatePaintingHighlight();
      });
      paintingLegend.append(button);
    });
  }

  function renderPainting() {
    const chromosomes = ancestry.paintings[confidence.value];
    plot.replaceChildren();
    let visibleSegments = 0;
    const palette = new Map();

    chromosomes.forEach((chromosome) => {
      const row = el("div", "chromosome-row");
      row.append(el("span", "chromosome-number", chromosome.number));
      const copies = el("div", "chromosome-copies");

      ["a", "b"].forEach((copyName) => {
        const copy = chromosome[copyName];
        if (!copy) return;
        const track = el("div", `chromosome-copy copy-${copyName}`);
        track.dataset.copy = copyName;
        track.setAttribute("aria-label", `Chromosome ${chromosome.number}, copy ${copyName.toUpperCase()}`);
        track.hidden = activeCopy !== "both" && activeCopy !== copyName;
        copy.segments.forEach((segment) => {
          const piece = el("span", "segment");
          const displayColor = paintingColor(segment);
          piece.style.setProperty("--left", `${segment.left}%`);
          piece.style.setProperty("--width", `${segment.width}%`);
          piece.style.setProperty("--segment", displayColor);
          piece.dataset.population = segment.name;
          piece.tabIndex = 0;
          piece.title = `${segment.name} · chromosome ${chromosome.number}${copyName.toUpperCase()} · ${segment.left.toFixed(2)}–${(segment.left + segment.width).toFixed(2)}%`;
          piece.setAttribute("aria-label", piece.title);
          track.append(piece);
          if (!track.hidden) {
            visibleSegments += 1;
            if (!palette.has(segment.name)) palette.set(segment.name, displayColor);
          }
        });
        const centromere = el("span", "centromere");
        centromere.style.setProperty("--centromere", `${copy.centromere}%`);
        track.append(centromere);
        copies.append(track);
      });
      row.append(copies);
      plot.append(row);
    });

    displayedSegmentCount = visibleSegments;
    displayedChromosomeCount = chromosomes.length;
    renderPaintingLegend(palette);
    updatePaintingHighlight();
  }

  confidence.addEventListener("change", renderPainting);
  document.querySelectorAll("[data-haplotype]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCopy = button.dataset.haplotype;
      document.querySelectorAll("[data-haplotype]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      renderPainting();
    });
  });
  renderPainting();

  const lineageGrid = $("#lineage-grid");
  const lineageCards = [
    {
      title: "Maternal haplogroup",
      result: lineage.maternal.haplogroup,
      summary: `A lineage estimated around ${lineage.maternal.estimatedAgeYears.toLocaleString()} years old, moving from ${lineage.maternal.origin}.`,
      facts: [["Estimated range", lineage.maternal.ageRangeYears + " years"], ["Frequency", lineage.maternal.frequency], ["Distribution", lineage.maternal.presentDistribution]]
    },
    {
      title: "Paternal haplogroup",
      result: lineage.paternal.haplogroup,
      summary: `A descendant branch of ${lineage.paternal.branch}, estimated at ${lineage.paternal.estimatedAgeYears} years old.`,
      facts: [["Frequency", lineage.paternal.frequency], ["Origin", lineage.paternal.origin], ["Distribution", lineage.paternal.presentDistribution]]
    },
    {
      title: "Neanderthal ancestry",
      result: `${lineage.neanderthal.variantsFound} variants`,
      summary: `More Neanderthal DNA than ${lineage.neanderthal.moreThanPercent}% of customers, representing ${lineage.neanderthal.estimatedDnaPercent} of this genome.`,
      facts: [["Markers tested", lineage.neanderthal.variantsTested.toLocaleString()], ["Trait markers", lineage.neanderthal.traitMarkers.length.toLocaleString()], ["Detected trait associations", lineage.neanderthal.traitMarkers.filter((marker) => marker.detected).length.toLocaleString()]]
    }
  ];

  lineageCards.forEach((card) => {
    const article = el("article", "lineage-card");
    article.append(el("h3", "", card.title), el("p", "lineage-result", card.result), el("p", "", card.summary));
    const facts = el("dl", "lineage-facts");
    card.facts.forEach(([term, value]) => facts.append(el("dt", "", term), el("dd", "", value)));
    article.append(facts);
    lineageGrid.append(article);
  });

  const lineageSection = $("#lineage");
  const neanderthalDetails = el("details", "neanderthal-detail");
  neanderthalDetails.append(el("summary", "", `Explore all Neanderthal data · ${lineage.neanderthal.locations.length} detected positions · ${lineage.neanderthal.traitMarkers.length} trait markers`));

  const neanderthalMap = el("div", "neanderthal-map");
  const chromosomeOrder = [...new Set(lineage.neanderthal.locations.map((location) => location.chromosome))];
  chromosomeOrder.forEach((chromosome) => {
    const row = el("div", "neanderthal-row");
    row.append(el("span", "chromosome-number", chromosome));
    const tracks = el("div", "neanderthal-tracks");
    ["A", "B"].forEach((copy) => {
      const track = el("div", "neanderthal-track");
      track.setAttribute("aria-label", `Chromosome ${chromosome}, copy ${copy}`);
      lineage.neanderthal.locations.filter((location) => location.chromosome === chromosome && location.copy === copy).forEach((location) => {
        const mark = el("span", "neanderthal-mark");
        mark.style.left = `${location.positionPercent}%`;
        mark.tabIndex = 0;
        mark.title = `Chromosome ${chromosome}, copy ${copy}, relative position ${location.positionPercent.toFixed(2)}%`;
        mark.setAttribute("aria-label", mark.title);
        track.append(mark);
      });
      tracks.append(track);
    });
    row.append(tracks);
    neanderthalMap.append(row);
  });
  neanderthalDetails.append(neanderthalMap);

  const traitHeading = el("h3", "marker-heading", "Tested Neanderthal trait markers");
  const markerTable = el("table", "marker-table");
  const markerHead = el("thead");
  const markerHeadRow = el("tr");
  ["Marker", "Trait", "Genotype", "Neanderthal variant", "Association"].forEach((heading) => markerHeadRow.append(el("th", "", heading)));
  markerHead.append(markerHeadRow);
  const markerBody = el("tbody");
  lineage.neanderthal.traitMarkers.forEach((marker) => {
    const row = el("tr");
    appendTextCell(row, marker.marker);
    appendTextCell(row, marker.trait);
    appendTextCell(row, marker.genotype);
    appendTextCell(row, marker.detected ? "Detected" : "Not detected");
    appendTextCell(row, marker.association);
    markerBody.append(row);
  });
  markerTable.append(markerHead, markerBody);
  const markerScroll = el("div", "report-table-scroll marker-scroll");
  markerScroll.tabIndex = 0;
  markerScroll.setAttribute("aria-label", "All tested Neanderthal trait markers");
  markerScroll.append(markerTable);
  neanderthalDetails.append(traitHeading, markerScroll);
  lineageSection.append(neanderthalDetails);

  const category = $("#report-category");
  [...new Set(reports.map((report) => report.category))].forEach((name) => {
    const option = el("option", "", name);
    option.value = name;
    category.append(option);
  });

  const search = $("#report-search");
  const reportBody = $("#report-table-body");
  const reportStatus = $("#report-status");
  const reportEmpty = $("#report-empty");
  const dialog = $("#report-dialog");
  const isReportLocked = (report) => report.locked || /tasks required|complete tasks to view/i.test(report.result);
  const displayResult = (report) => isReportLocked(report)
    ? "Locked — account task required"
    : (report.result || "No result text captured");

  function searchableText(report) {
    return [
      report.title,
      report.category,
      report.result,
      report.description,
      ...report.personalNotes,
      ...report.variants.flatMap((variant) => Object.values(variant))
    ].join(" ").toLowerCase();
  }

  function openReport(report) {
    $("#dialog-category").textContent = report.category;
    $("#dialog-title").textContent = report.title;
    $("#dialog-result").textContent = displayResult(report);
    $("#dialog-description").textContent = report.description || "No report description was exposed.";

    const notes = $("#dialog-notes");
    notes.replaceChildren();
    if (report.personalNotes.length) {
      notes.open = false;
      notes.append(el("summary", "", `Report interpretation · ${report.personalNotes.length} notes`));
      const list = el("ul");
      report.personalNotes.forEach((note) => list.append(el("li", "", note.replace(/^This profile,\s*/i, ""))));
      notes.append(list);
      notes.hidden = false;
    } else {
      notes.hidden = true;
    }

    const facts = $("#dialog-facts");
    facts.replaceChildren(
      el("dt", "", "Status"), el("dd", "", isReportLocked(report) ? "Locked behind a required account task" : "Accessible"),
      el("dt", "", "Tested markers"), el("dd", "", report.variants.length.toLocaleString())
    );

    const variants = $("#dialog-variants");
    variants.replaceChildren();
    if (report.variants.length) {
      const table = el("table", "marker-table");
      const head = el("thead");
      const headRow = el("tr");
      ["Variant", "Gene", "Marker", "Genotype", "Status"].forEach((heading) => headRow.append(el("th", "", heading)));
      head.append(headRow);
      const body = el("tbody");
      report.variants.forEach((variant) => {
        const row = el("tr");
        if (variant.status === "detected") row.className = "variant-detected";
        appendTextCell(row, variant.name);
        appendTextCell(row, variant.gene);
        appendTextCell(row, variant.marker);
        appendTextCell(row, variant.genotype);
        appendTextCell(row, variant.status);
        body.append(row);
      });
      table.append(head, body);
      variants.append(table);
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderReports() {
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const filtered = reports.filter((report) => {
      const categoryMatches = selectedCategory === "all" || report.category === selectedCategory;
      return categoryMatches && (!query || searchableText(report).includes(query));
    });

    reportBody.replaceChildren();
    filtered.forEach((report) => {
      const row = el("tr", "report-row");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `Open ${report.title}: ${displayResult(report)}`);
      const nameCell = appendTextCell(row, report.title, "report-name");
      nameCell.append(el("span", "row-action", "View →"));
      appendTextCell(row, report.category, "report-category");
      appendTextCell(row, displayResult(report), "report-result");
      appendTextCell(row, report.variants.length ? report.variants.length.toLocaleString() : "—", "report-markers");
      row.addEventListener("click", () => openReport(report));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openReport(report);
        }
      });
      reportBody.append(row);
    });

    reportStatus.textContent = `${filtered.length.toLocaleString()} of ${reports.length.toLocaleString()} reports`;
    reportEmpty.hidden = filtered.length !== 0;
  }

  search.addEventListener("input", renderReports);
  category.addEventListener("change", renderReports);
  $("#reset-reports").addEventListener("click", () => {
    search.value = "";
    category.value = "all";
    renderReports();
    search.focus();
  });
  renderReports();

  const closeDialog = () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  };
  $("#dialog-close").addEventListener("click", closeDialog);
  $("#dialog-done").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  const fillList = (selector, rows) => {
    const list = $(selector);
    rows.forEach((row) => list.append(el("li", "", row)));
  };
  fillList("#included-list", privacy.included);
  fillList("#removed-list", privacy.removed);
  fillList("#processing-notes", privacy.processing);
  $("#processing-count").textContent = `(${privacy.processing.length})`;

  if (location.hash) {
    const alignHashTarget = () => {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ block: "start" });
    };
    window.requestAnimationFrame(alignHashTarget);
    window.setTimeout(alignHashTarget, 250);
  }
})();
