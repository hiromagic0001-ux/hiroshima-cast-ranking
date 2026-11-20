#!/usr/bin/env python3
"""Fail-closed validator for proposed Hiroshima Cast Search store database patches.

This tool never writes either input file. It validates a candidate JSON file against
an immutable baseline and an optional, explicit JSON-path allowlist.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def records_from(doc: Any) -> list[dict[str, Any]]:
    if isinstance(doc, list):
        records = doc
    elif isinstance(doc, dict) and isinstance(doc.get("records"), list):
        records = doc["records"]
    else:
        raise ValueError("JSON root must be an array or an object containing a records array")
    if not all(isinstance(x, dict) for x in records):
        raise ValueError("Every record must be a JSON object")
    return records


def load_json(path: Path) -> tuple[bytes, Any, list[dict[str, Any]]]:
    raw = path.read_bytes()
    doc = json.loads(raw.decode("utf-8-sig"))
    return raw, doc, records_from(doc)


def load_allowlist(path: Path | None) -> set[tuple[int, str]]:
    if path is None:
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("Allowlist must be a JSON array")
    result: set[tuple[int, str]] = set()
    for item in data:
        if not isinstance(item, dict) or not isinstance(item.get("auditNumber"), int) or not isinstance(item.get("path"), str):
            raise ValueError("Each allowlist entry needs integer auditNumber and string path")
        if item["auditNumber"] < 1 or not item["path"].startswith("/"):
            raise ValueError("auditNumber must be >= 1 and path must be a JSON Pointer")
        result.add((item["auditNumber"], item["path"]))
    return result


def pointer_get(obj: Any, pointer: str) -> Any:
    cur = obj
    for raw_part in pointer.lstrip("/").split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        if isinstance(cur, dict):
            if part not in cur:
                return MISSING
            cur = cur[part]
        elif isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
            cur = cur[int(part)]
        else:
            return MISSING
    return cur


class _Missing:
    pass


MISSING = _Missing()


def diff_paths(before: Any, after: Any, prefix: str = "") -> list[str]:
    if type(before) is not type(after):
        return [prefix or "/"]
    if isinstance(before, dict):
        out: list[str] = []
        for key in sorted(set(before) | set(after)):
            p = prefix + "/" + key.replace("~", "~0").replace("/", "~1")
            if key not in before or key not in after:
                out.append(p)
            else:
                out.extend(diff_paths(before[key], after[key], p))
        return out
    if isinstance(before, list):
        if len(before) != len(after):
            return [prefix + "/<length>"]
        out = []
        for i, (a, b) in enumerate(zip(before, after)):
            out.extend(diff_paths(a, b, prefix + f"/{i}"))
        return out
    return [] if before == after else [prefix or "/"]


def category_counts(records: list[dict[str, Any]]) -> Counter[str]:
    return Counter(str(r.get("category", "（未設定）")) for r in records)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--expected-git-blob-sha", required=True)
    parser.add_argument("--allowlist", type=Path, help="Optional JSON array of explicitly approved {auditNumber,path} changes")
    args = parser.parse_args()

    try:
        baseline_raw, baseline_doc, baseline = load_json(args.baseline)
        _, candidate_doc, candidate = load_json(args.candidate)
        actual_sha = git_blob_sha(baseline_raw)
        if actual_sha != args.expected_git_blob_sha:
            raise ValueError(f"Baseline SHA mismatch: expected {args.expected_git_blob_sha}, got {actual_sha}")

        errors: list[str] = []
        if len(baseline) != len(candidate):
            errors.append(f"record count changed: {len(baseline)} -> {len(candidate)}")
        if len(baseline) == len(candidate):
            allowed = load_allowlist(args.allowlist)
            all_diffs: list[tuple[int, str]] = []
            for i, (old, new) in enumerate(zip(baseline, candidate), start=1):
                if old.get("name") != new.get("name"):
                    errors.append(f"#{i} name changed")
                if old.get("category") != new.get("category"):
                    errors.append(f"#{i} category changed")
                for path in diff_paths(old, new):
                    all_diffs.append((i, path))
            for audit_no, path in all_diffs:
                if (audit_no, path) not in allowed:
                    errors.append(f"unapproved change at #{audit_no}{path}")
            unused = allowed - set(all_diffs)
            for audit_no, path in sorted(unused):
                errors.append(f"allowlist entry did not match an actual change: #{audit_no}{path}")

        if category_counts(baseline) != category_counts(candidate):
            errors.append("category totals changed")

        # Verify JSON serialization round-trip and root shape.
        roundtrip = json.loads(json.dumps(candidate_doc, ensure_ascii=False))
        records_from(roundtrip)

        print(f"Baseline Git blob SHA: {actual_sha}")
        print(f"Baseline records: {len(baseline)}")
        print(f"Candidate records: {len(candidate)}")
        print(f"Category totals: {dict(sorted(category_counts(candidate).items()))}")
        if errors:
            print("RESULT: FAIL")
            for error in errors:
                print(f"- {error}")
            return 1
        print("RESULT: PASS")
        print("No unapproved field changes, record reordering, count changes, name/category changes, or category-total changes detected.")
        return 0
    except Exception as exc:
        print(f"RESULT: FAIL\n- {exc}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
