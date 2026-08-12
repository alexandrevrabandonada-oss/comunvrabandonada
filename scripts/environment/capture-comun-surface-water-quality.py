#!/usr/bin/env python3
"""Controlled parser for INEA RH III consolidated raw-data PDFs.

This utility is deliberately outside the application runtime. It accepts the
two official PDFs as local inputs and emits a minimized, public-safe JSON
candidate. It does not geocode, fetch private systems, or infer potability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import pdfplumber

PARSER_VERSION = "inea-rh-iii-pdf-table-v1"
DATE = re.compile(r"^\d{1,2}/\d{1,2}/\d{2}$")
STATION = re.compile(r"^PS\d+$")

PARAMETERS = (
    ("biochemical_oxygen_demand", "Demanda Bioquímica de Oxigênio (DBO)", "mg/L", (320, 360)),
    ("total_phosphorus", "Fósforo Total (PT)", "mg/L", (360, 400)),
    ("ammoniacal_nitrogen", "Nitrogênio Amoniacal (NH3)", "mg/L", (400, 450)),
    ("dissolved_oxygen", "Oxigênio Dissolvido (OD)", "mg/L", (455, 500)),
    ("ph", "Potencial Hidrogeniônico (pH)", None, (500, 540)),
    ("turbidity", "Turbidez (T)", "UNT", (540, 580)),
    ("escherichia_coli", "Escherichia coli", "NMP/100mL", (570, 630)),
    ("total_dissolved_solids", "Sólidos Dissolvidos Totais (SDT)", "mg/L", (630, 670)),
    ("water_temperature", "Temperatura da água", "°C", (670, 715)),
    ("air_temperature", "Temperatura do ar", "°C", (715, 770)),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_date(value: str, year: int) -> str:
    day, month, short_year = value.split("/")
    if int(short_year) != year % 100:
        raise ValueError(f"date_year_mismatch:{value}:{year}")
    return datetime(year, int(month), int(day)).date().isoformat()


def parse_value(tokens: list[str], *, integer_groups: bool = False) -> tuple[float | None, str | None]:
    if not tokens:
        return None, None
    qualifier = tokens[0] if tokens[0] in {"<", ">", "ND", "NQ"} else None
    raw = "".join(token for token in tokens if token not in {"<", ">", "ND", "NQ"})
    if not raw:
        return None, qualifier
    if integer_groups and "." in raw and "," not in raw:
        normalized = raw.replace(".", "")
    elif "," in raw:
        normalized = raw.replace(".", "").replace(",", ".")
    else:
        normalized = raw
    return float(normalized), qualifier


def row_words(words: list[dict[str, Any]], top: float) -> list[dict[str, Any]]:
    return sorted(
        [word for word in words if abs(word["top"] - top) < 1.0],
        key=lambda word: word["x0"],
    )


def closest_station(stations: list[dict[str, Any]], top: float) -> str | None:
    if not stations:
        return None
    return min(stations, key=lambda word: abs(word["top"] - top))["text"]


def closest_location(words: list[dict[str, Any]], station_top: float) -> tuple[str | None, str | None]:
    nearby = [
        word
        for word in words
        if 100 <= word["x0"] <= 250 and abs(word["top"] - station_top) < 100
    ]
    by_top: dict[float, list[dict[str, Any]]] = defaultdict(list)
    for word in nearby:
        by_top[round(word["top"], 1)].append(word)
    for _, group in sorted(by_top.items(), key=lambda item: abs(item[0] - station_top)):
        text = " ".join(word["text"] for word in sorted(group, key=lambda word: word["x0"]))
        if "Rio Paraíba do Sul" in text and "Volta Redonda" in text:
            return "Rio Paraíba do Sul", "Volta Redonda"
    return None, None


def parse_pdf(path: Path, year: int, source_id: str) -> dict[str, Any]:
    station_metadata: dict[str, dict[str, Any]] = {}
    measurements: list[dict[str, Any]] = []
    indices: list[dict[str, Any]] = []
    active_station_code: str | None = None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            stations = [word for word in words if word["x0"] < 120 and STATION.match(word["text"])]
            if not stations:
                continue
            for station_word in stations:
                water_body, municipality = closest_location(words, station_word["top"])
                if municipality:
                    station_metadata[station_word["text"]] = {
                        "waterBody": water_body,
                        "municipality": municipality,
                    }
            date_words = [word for word in words if 230 <= word["x0"] <= 280 and DATE.match(word["text"])]
            for date_word in sorted(date_words, key=lambda word: word["top"]):
                _, month, _ = date_word["text"].split("/")
                if int(month) == 1:
                    # A new annual sequence begins in January. The station label
                    # is vertically centred in a merged cell, so choose the next
                    # label below that first row rather than the mathematically
                    # nearest label (which can still belong to the prior block).
                    following = [
                        station
                        for station in stations
                        if station["top"] >= date_word["top"] - 1.0
                    ]
                    active_station_code = (
                        min(following, key=lambda station: station["top"])["text"]
                        if following
                        else closest_station(stations, date_word["top"])
                    )
                station_code = active_station_code
                if not station_code:
                    continue
                metadata = station_metadata.get(station_code)
                if not metadata or metadata["municipality"] != "Volta Redonda":
                    continue
                sampled_at = parse_date(date_word["text"], year)
                row = row_words(words, date_word["top"])
                # The 2024 and 2025 PDFs use the same columns but a slightly
                # different page width. Anchor each row to its date cell.
                column_shift = date_word["x0"] - 255.5
                for canonical_id, label, unit, (start, end) in PARAMETERS:
                    tokens = [
                        word["text"]
                        for word in row
                        if start + column_shift <= word["x0"] < end + column_shift
                    ]
                    value, qualifier = parse_value(tokens, integer_groups=canonical_id in {"escherichia_coli", "total_dissolved_solids"})
                    measurements.append(
                        {
                            "stationId": f"surface-water:inea:{station_code}",
                            "sampledAt": sampled_at,
                            "parameter": canonical_id,
                            "officialParameterLabel": label,
                            "value": value,
                            "qualifier": qualifier,
                            "unit": unit,
                            "sourceId": source_id,
                        }
                    )
                index_tokens = [
                    word["text"]
                    for word in row
                    if 290 + column_shift <= word["x0"] < 320 + column_shift
                ]
                index_value, index_qualifier = parse_value(index_tokens)
                indices.append(
                    {
                        "stationId": f"surface-water:inea:{station_code}",
                        "sampledAt": sampled_at,
                        "value": index_value,
                        "qualifier": index_qualifier,
                        "classification": None,
                        "indexMethod": "IQA_NSF",
                        "sourceId": source_id,
                    }
                )
    stations = [
        {
            "stationId": f"surface-water:inea:{code}",
            "officialCode": code,
            "officialName": None,
            "waterBody": metadata["waterBody"],
            "municipality": metadata["municipality"],
            "geography": {"level": "official_public_point", "latitude": None, "longitude": None},
            "sourceIds": [source_id],
        }
        for code, metadata in sorted(station_metadata.items())
        if metadata["municipality"] == "Volta Redonda"
    ]
    return {"stations": stations, "measurements": measurements, "officialIndices": indices}


def assert_unique(records: list[dict[str, Any]], keys: tuple[str, ...]) -> None:
    seen = set()
    for record in records:
        identity = tuple(record[key] for key in keys)
        if identity in seen:
            raise ValueError(f"duplicate_record:{identity}")
        seen.add(identity)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-2025", type=Path, required=True)
    parser.add_argument("--pdf-2024", type=Path, required=True)
    args = parser.parse_args()
    source_2025 = "inea-rh-iii-raw-2025"
    source_2024 = "inea-rh-iii-raw-2024"
    parsed_2025 = parse_pdf(args.pdf_2025, 2025, source_2025)
    parsed_2024 = parse_pdf(args.pdf_2024, 2024, source_2024)
    assert_unique(parsed_2025["measurements"], ("stationId", "sampledAt", "parameter"))
    assert_unique(parsed_2025["officialIndices"], ("stationId", "sampledAt"))
    result = {
        "parserVersion": PARSER_VERSION,
        "sources": [
            {"sourceId": source_2025, "reportedYear": 2025, "rawSha256": sha256(args.pdf_2025)},
            {"sourceId": source_2024, "reportedYear": 2024, "rawSha256": sha256(args.pdf_2024)},
        ],
        "snapshot2025": parsed_2025,
        "drift2024": {
            "stationCodes": [station["officialCode"] for station in parsed_2024["stations"]],
            "parameterCount": len({item["parameter"] for item in parsed_2024["measurements"]}),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
