# Accident Pyramid in Safetytool

Model: `safetytool.pyramid/1` (`js/pyramid.js`, `schema/pyramid.schema.json`, synthetic sample `data/example-pyramid.json`, tests `test/pyramid.test.js`). It sits in the model bar under **Event analysis**, separate from the five safety-analysis models and FRAM.

## What it does

Shows a **supplied event dataset** split into user-defined severity tiers, under the dataset's own written definitions: reporting period (observation window), inclusion/exclusion criteria, duplicate handling, reporting limitations, optional denominator. Input is aggregate counts (blank = unknown, never zero) and/or event records (date, tier, reference; duplicates and exclusions are *marked*, not deleted). CSV import (columns `id, date, category, reference, note`) always shows a preview first; unseen category labels stay uncategorised unless the analyst creates tiers; invalid dates are dropped from the date field and noted, not guessed.

* **Which numbers are used (Sprint B).** If any aggregate count is entered, the aggregate counts are the basis; records are then *not* counted and are shown only in a cross-check table (they are never added, because they may describe the same events, and the data cannot show whether the records are complete). Records become the basis only when no aggregate count is entered. Adding a record never changes a figure.
* **Date scope.** When the observation window is valid, only non-duplicate, non-excluded records with a valid `YYYY-MM-DD` date from `periodStart` to `periodEnd` (both days included) are counted. Records before/after the window and records without a usable date are reported separately and are not counted; they are never deleted. With no valid window nothing is filtered, and the screen says so.
* **Counts** are counts. **Rates** appear only when the dataset states a positive denominator, a unit, a written definition of the denominator, a rate scale **and** a valid observation window. Otherwise the picture says "COUNTS ONLY" and why.
* **Comparison** between two datasets (Analysis tab, from the gallery) is `compatible` only when tiers (labels and definitions), observation windows, inclusion/exclusion/duplicate statements and (for rates) denominator unit/definition/scale match. Otherwise a prominent warning is shown and **no difference is calculated**.
* Every picture states: it describes the supplied dataset under its definitions and limits; tier size is not proportional to counts; it is not a prediction; counts are not rates; rates are not risk.

## What it deliberately does not do

* No built-in ratio. Heinrich's historical figures are **not** treated as universal aviation probabilities, and the tool does not assume that lower tiers predict higher tiers in a fixed proportion. A test fails if a ratio constant appears in the module.
* No risk number, no forecast, no regulatory interpretation.
* The demonstration dataset is labelled **SYNTHETIC** and its tiers are not in any fixed proportion.

## Heinrich's triangle and other pyramids

* **Heinrich's triangle** is attributed to H. W. Heinrich, *Industrial Accident Prevention: A Scientific Approach* (1931), which he based on insurance claims and company records (secondary source: Wikipedia, "Accident triangle", read via search summary on 2026-10-15; the primary text was **not** read here). Its numerical ratios (widely quoted as 1:29:300) were derived from industrial injury data of that period.
* Later authors (for example F. E. Bird) produced other ratios and other pictures; "iceberg" and "safety pyramid" drawings are further variants. They are **not all Heinrich's**, and attributing each to him needs evidence. The ratios have been criticised (the secondary source only says so in general terms; the specific critiques were **not verified** here).
* Safetytool therefore implements a neutral *dataset view*, not any one author's ratio.

## Limits

Counts depend on reporting culture and completeness. A larger lower tier can reflect better reporting, not more events. Duplicates cannot be detected in aggregate counts: say how they were handled in the dataset description. Possible duplicates among records are only flagged.
