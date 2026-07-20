#!/usr/bin/env python3
"""
check_fixture.py — an EXECUTABLE guardrail check for the worked-example fixture.

This is the runnable half of the RED-GREEN suite. It parses
`../fixtures/synthetic-worked-example.md` and enforces the ledger invariants the
skill promises, so a regression is caught mechanically instead of by eye:

  A. Quote integrity   — every row flagged `quote` must reproduce the source text
                         VERBATIM (a paraphrase mislabeled as a quote fails).
  B. Unverified rule   — no `unverified` row may be cited as an asserted fact
                         (its "Supported prose claim" must be empty / "—" / "not cited").
  C. No @all evidence  — no ledger row may cite the @all broadcast message.

Exit code 0 = all invariants hold (GREEN). Exit code 1 = a violation (RED).

RED-GREEN demo: open the fixture, change ledger row 3's flag from `paraphrase`
to `quote`, and re-run — check A fails, because that Fact is a paraphrase, not a
verbatim quote. Restore it and the check passes again.

Pure stdlib. No network, no credentials, no real data.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURE = os.path.join(HERE, "..", "fixtures", "synthetic-worked-example.md")

# The @all broadcast message id in the fixture (must never be cited as evidence).
BROADCAST_MSG_ID = "0006"


def norm(s):
    """Lowercase + collapse all whitespace to single spaces for a forgiving verbatim match."""
    return re.sub(r"\s+", " ", s).strip().lower()


def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def extract_messages_block(text):
    """Return the concatenated text of the fenced 'retrieved messages' block."""
    # Grab the first fenced ``` ... ``` block that appears after the messages heading.
    after = text.split("The retrieved messages", 1)
    if len(after) < 2:
        raise SystemExit("PARSE ERROR: could not find the retrieved-messages section.")
    m = re.search(r"```(.*?)```", after[1], re.DOTALL)
    if not m:
        raise SystemExit("PARSE ERROR: could not find the fenced messages block.")
    return m.group(1)


def parse_messages_by_id(block):
    """Split the messages block into {id: normalized_text}, keyed by the [msg://fixture/<id>] marker.

    Lets a `quote` row be checked against ITS OWN locator's message, not the whole block —
    so identical text living in a different message can't produce a false pass.
    """
    out = {}
    parts = re.split(r"\[msg://fixture/(\d+)\]", block)  # -> [pre, id1, body1, id2, body2, ...]
    for i in range(1, len(parts), 2):
        mid = parts[i]
        body = parts[i + 1] if i + 1 < len(parts) else ""
        out[mid] = norm(body)
    return out


def extract_ledger_rows(text):
    """Return (headers, rows) for the evidence-ledger markdown table."""
    section = text.split("Evidence ledger", 1)
    if len(section) < 2:
        raise SystemExit("PARSE ERROR: could not find the evidence-ledger section.")
    lines = [ln for ln in section[1].splitlines() if ln.strip().startswith("|")]
    if not lines:
        raise SystemExit("PARSE ERROR: no table rows under the evidence ledger.")

    def cells(line):
        # split on '|' and drop the leading/trailing empties
        parts = [c.strip() for c in line.strip().strip("|").split("|")]
        return parts

    headers = cells(lines[0])
    rows = []
    for ln in lines[1:]:
        if set(ln.replace("|", "").strip()) <= set("-: "):
            continue  # separator row
        rows.append(cells(ln))
    return headers, rows


def col(headers, name_fragment):
    for i, h in enumerate(headers):
        if name_fragment.lower() in h.lower():
            return i
    raise SystemExit("PARSE ERROR: column matching %r not found in %r" % (name_fragment, headers))


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else FIXTURE
    text = load(path)
    block = extract_messages_block(text)
    all_msgs = norm(block)
    by_id = parse_messages_by_id(block)
    headers, rows = extract_ledger_rows(text)

    i_fact = col(headers, "Fact")
    i_qp = col(headers, "Quote")            # "Quote/paraphrase" or "Quote vs paraphrase"
    i_ver = col(headers, "Verification")
    i_loc = col(headers, "Locator")
    i_claim = col(headers, "Supported prose claim")
    need = max(i_fact, i_qp, i_ver, i_loc, i_claim)

    failures = []
    checked_quotes = 0

    for r in rows:
        rid = r[0] if r else "?"
        # Fail CLOSED on malformed rows (do not silently skip — a short row could hide a violation).
        if len(r) <= need:
            failures.append("Row %s is malformed (%d cells, need > %d) — failing closed." % (rid, len(r), need))
            continue
        fact = r[i_fact]
        flag = r[i_qp].replace("*", "").strip().lower()
        ver = r[i_ver].replace("*", "").strip().lower()
        loc = r[i_loc]
        claim = r[i_claim].replace("*", "").strip().lower()

        # A. Quote integrity — verbatim against THIS row's locator message when resolvable.
        if flag == "quote":
            checked_quotes += 1
            m = re.search(r'"([^"]+)"', fact)          # prefer the "..."-quoted span
            snippet = norm(m.group(1) if m else fact)
            locm = re.search(r"(\d{3,})", loc)
            haystack = by_id.get(locm.group(1)) if locm else None
            scope = "message %s" % loc
            if haystack is None:                       # unresolved locator → fall back to whole block
                haystack, scope = all_msgs, "any message (locator unresolved)"
            if snippet not in haystack:
                failures.append(
                    "Row %s flagged `quote` but its text is NOT verbatim in %s: %r" % (rid, scope, snippet)
                )

        # B. Unverified rows must not be cited as asserted facts.
        if "unverified" in ver:
            cited_ok = (claim == "" or claim == "—" or "not cited" in claim)
            if not cited_ok:
                failures.append(
                    "Row %s is `unverified` but is cited as an asserted claim: %r" % (rid, r[i_claim])
                )

        # C. @all broadcast must never be evidence.
        if BROADCAST_MSG_ID in loc:
            failures.append("Row %s cites the @all broadcast message (%s) as evidence." % (rid, loc))

    print("Parsed %d ledger rows; verbatim-checked %d `quote` row(s) against their locator messages."
          % (len(rows), checked_quotes))
    if failures:
        print("RESULT: FAIL (RED)")
        for f in failures:
            print("  - " + f)
        return 1
    print("RESULT: PASS (GREEN) — quote integrity, unverified-not-cited, and no-@all-evidence all hold.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
