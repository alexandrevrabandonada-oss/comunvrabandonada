#!/usr/bin/env python3
"""Materialize a public-safe ANEEL interruption snapshot from one official Parquet resource.

This controlled capture never runs in application runtime. It requires a local,
hash-verified ANEEL resource and only writes the official municipality slice.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq


MUNICIPALITY_CODE = "3306305"
EXPECTED_CNPJ = "60444437000146"
EXPECTED_AGENT = "LIGHT SERVICOS DE ELETRICIDADE S A"
EXPECTED_SIGLA = "LIGHT SESA"
EXPECTED_COLUMNS = [
    "DatGeracaoConjuntoDados",
    "NumCNPJDistribuidora",
    "NomAgente",
    "SigAgente",
    "CodMunicipioIBGE",
    "CodInterrupcao",
    "CodEvento",
    "CodOcorrencia",
    "CodConjUnidadeConsumidora",
    "DscConjuntoUnidadeConsumidora",
    "CodAlimentador",
    "CodSubestacao",
    "AnoCompetencia",
    "MesCompetencia",
    "DscLocalizacaoInterrupcao",
    "DscMotivoExpurgo",
    "DatInicioInterrupcao",
    "DatFimInterrupcao",
    "DscFatoGeradorOrigem",
    "DscFatoGeradorTipo",
    "DscFatoGeradorCausa",
    "DscFatoGeradorDetalhe",
    "NumNivelTensao",
    "QtdConsumidoresAfetados",
    "QtdConsumidoresAtivos",
    "DscTipoElementoInterrompido",
]


def normalized(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        return value.strip()
    return value


def source_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_source_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    raise ValueError("unsupported_source_datetime")


def interruption_key(record: dict[str, Any], resource_year: int) -> str:
    fields = [
        str(resource_year),
        str(record["NumCNPJDistribuidora"]),
        str(record["CodInterrupcao"]),
        str(record["CodAlimentador"]),
        str(record["CodSubestacao"]),
        str(record["DatInicioInterrupcao"]),
        str(record["DatFimInterrupcao"]),
    ]
    return "aneel:power-interruption:" + ":".join(fields)


def materialize(args: argparse.Namespace) -> dict[str, Any]:
    source_path = Path(args.input_parquet)
    output_path = Path(args.output)
    parquet = pq.ParquetFile(source_path)
    if parquet.schema_arrow.names != EXPECTED_COLUMNS:
        raise ValueError("schema_drift_unreviewed")

    records: list[dict[str, Any]] = []
    for batch in parquet.iter_batches(columns=EXPECTED_COLUMNS, batch_size=65536):
        values = batch.to_pydict()
        for index, municipality in enumerate(values["CodMunicipioIBGE"]):
            if str(municipality) != MUNICIPALITY_CODE:
                continue
            original_start = values["DatInicioInterrupcao"][index]
            original_end = values["DatFimInterrupcao"][index]
            record = {field: normalized(values[field][index]) for field in EXPECTED_COLUMNS}
            record["NumCNPJDistribuidora"] = str(record["NumCNPJDistribuidora"])
            if (
                record["NumCNPJDistribuidora"] != EXPECTED_CNPJ
                or record["NomAgente"] != EXPECTED_AGENT
                or record["SigAgente"] != EXPECTED_SIGLA
            ):
                raise ValueError("unexpected_distributor_for_municipality")
            try:
                duration = int(
                    (parse_source_datetime(original_end)
                    - parse_source_datetime(original_start)).total_seconds()
                )
            except ValueError as error:
                raise ValueError("invalid_interruption_datetime") from error
            if duration < 0:
                raise ValueError("negative_interruption_duration")
            record["durationSeconds"] = duration
            record["interruptionKey"] = interruption_key(record, args.resource_year)
            records.append(record)

    duplicate_keys = [key for key, count in Counter(record["interruptionKey"] for record in records).items() if count > 1]
    if duplicate_keys:
        raise ValueError("duplicate_interruption_identity")
    if not records:
        raise ValueError("municipality_slice_empty")

    periods = sorted({f"{record['AnoCompetencia']}-{int(record['MesCompetencia']):02d}" for record in records})
    source_dates = sorted({record["DatGeracaoConjuntoDados"] for record in records})
    snapshot = {
        "snapshotId": f"comun-power-interruptions-aneel-v1-{periods[-1]}",
        "snapshotVersion": "comun-power-interruptions-aneel-v1",
        "sourceKind": "official_public_data",
        "methodologyVersion": "comun-power-interruptions-aneel-methodology-v1",
        "verifiedAt": args.verified_at,
        "sourceResourceYear": args.resource_year,
        "latestPublishedCompetence": periods[-1],
        "reportedCompetencePeriods": periods,
        "sourceReportedDates": source_dates,
        "municipality": {"ibgeCode": MUNICIPALITY_CODE, "name": "Volta Redonda", "state": "RJ"},
        "distributor": {
            "cnpj": EXPECTED_CNPJ,
            "officialName": EXPECTED_AGENT,
            "officialAbbreviation": EXPECTED_SIGLA,
        },
        "sourceIds": [args.source_id],
        "sourceRawSha256": source_sha256(source_path),
        "recordCount": len(records),
        "identityRule": "resource year + distributor CNPJ + published interruption code + feeder + substation + start + end",
        "qualityState": "source_verified",
        "automaticPublicationAllowed": False,
        "runtimeExternalFetchAllowed": False,
        "semantics": {
            "collectiveDecFecIncluded": False,
            "municipalityAggregateAllowed": False,
            "outageEventInferenceAllowed": False,
            "consumerAffectedMeansUniquePeople": False,
            "electricalSetMeansNeighborhood": False,
            "geographicProjectionAllowed": False,
            "privateDataAllowed": False,
        },
        "limitations": [
            "The 2026 resource is not a complete calendar year; the reported competence periods are explicit.",
            "QtdConsumidoresAfetados is a published count for each interruption and must not be summed as unique consumers or people.",
            "Electrical-set, feeder, substation, and urban/rural context are technical source fields, not neighborhood or census geography.",
            "This snapshot preserves official cause and expurgo fields without editorial attribution or reclassification.",
        ],
        "records": records,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as output:
        output.write((json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"))
    return {
        "snapshotId": snapshot["snapshotId"],
        "recordCount": len(records),
        "latestPublishedCompetence": periods[-1],
        "sourceRawSha256": snapshot["sourceRawSha256"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-parquet", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--resource-year", required=True, type=int)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--verified-at", required=True)
    print(json.dumps(materialize(parser.parse_args()), ensure_ascii=False))


if __name__ == "__main__":
    main()
