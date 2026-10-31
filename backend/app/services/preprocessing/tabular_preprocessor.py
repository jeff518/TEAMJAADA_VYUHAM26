"""Tabular Preprocessor for .csv and .xlsx spreadsheets.
Detects column schemas and datatypes, handles missing values, normalizes types,
removes duplicate records, and generates structured chunk summaries.
"""

import logging
import time
from pathlib import Path
from typing import Any, Dict, List
import pandas as pd

from app.services.preprocessing.base import BasePreprocessor, PreprocessingChunk, PreprocessingResult

logger = logging.getLogger("securedoc.preprocessing.tabular")


class TabularPreprocessor(BasePreprocessor):
    """Preprocessor for CSV, TSV, and Excel tabular datasets."""

    def process(self, doc_id: str, file_path: str, filename: str) -> PreprocessingResult:
        start_time = time.time()
        try:
            p = Path(file_path)
            ext = p.suffix.lower()

            # 1. Load Data
            if ext == ".csv":
                try:
                    df = pd.read_csv(file_path, encoding="utf-8")
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding="latin-1")
            elif ext in (".xlsx", ".xls"):
                df = pd.read_excel(file_path)
            elif ext == ".tsv":
                df = pd.read_csv(file_path, sep="\t")
            else:
                raise ValueError(f"Unsupported tabular extension: {ext}")

            before_rows, before_cols = df.shape
            raw_chars_before = int(df.memory_usage(deep=True).sum())

            # 2. Detect Schema
            schema = {col: str(dtype) for col, dtype in df.dtypes.items()}

            # 3. Handle Missing Values
            missing_stats = df.isnull().sum().to_dict()
            missing_total = int(sum(missing_stats.values()))

            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    # Fill numeric missing with 0 or median
                    df[col] = df[col].fillna(0)
                else:
                    df[col] = df[col].fillna("N/A")

            # 4. Normalize Types and Clean Column Names
            df.columns = [str(c).strip().replace(" ", "_").lower() for c in df.columns]

            # 5. Deduplicate Rows
            duplicates_count = int(df.duplicated().sum())
            if duplicates_count > 0:
                df = df.drop_duplicates().reset_index(drop=True)

            after_rows, after_cols = df.shape

            # 6. Generate Clean Content & Chunks (Groups of 25 rows)
            chunks: List[Dict[str, Any]] = []
            chunk_size = 25
            total_chunks = max(1, (len(df) + chunk_size - 1) // chunk_size)

            schema_summary = f"Columns ({len(df.columns)}): " + ", ".join([f"{c} ({schema.get(c, 'str')})" for c in df.columns])
            content_blocks = [f"=== Tabular Dataset: {filename} ===", schema_summary]

            for i in range(total_chunks):
                chunk_df = df.iloc[i * chunk_size : (i + 1) * chunk_size]
                chunk_str = chunk_df.to_string(index=False)
                row_start = i * chunk_size + 1
                row_end = min((i + 1) * chunk_size, len(df))
                location_str = f"rows: {row_start}-{row_end}"

                chunks.append(
                    PreprocessingChunk(
                        chunk_id=i + 1,
                        text=chunk_str,
                        location=location_str,
                        char_count=len(chunk_str),
                    ).to_dict()
                )
                content_blocks.append(f"\n--- [Rows {row_start} to {row_end}] ---\n{chunk_str}")

            cleaned_content = "\n".join(content_blocks)
            duration_ms = (time.time() - start_time) * 1000

            return PreprocessingResult(
                doc_id=doc_id,
                data_type="tabular",
                cleaned_content=cleaned_content,
                chunks=chunks,
                metadata={
                    "filename": filename,
                    "columns": list(df.columns),
                    "schema": schema,
                    "missing_values_handled": missing_total,
                    "duplicates_removed": duplicates_count,
                },
                stats={
                    "before_rows": before_rows,
                    "after_rows": after_rows,
                    "columns_count": after_cols,
                    "missing_imputed": missing_total,
                    "duplicates_removed": duplicates_count,
                    "chunks_count": len(chunks),
                },
                status="success",
                processing_time_ms=round(duration_ms, 2),
            )

        except Exception as e:
            logger.error("Tabular preprocessing failed for %s: %s", doc_id, e, exc_info=True)
            duration_ms = (time.time() - start_time) * 1000
            return PreprocessingResult(
                doc_id=doc_id,
                data_type="tabular",
                cleaned_content="",
                status="failed",
                error_message=f"Tabular preprocessing error: {str(e)}",
                processing_time_ms=round(duration_ms, 2),
            )
