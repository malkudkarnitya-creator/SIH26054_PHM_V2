"""CSV loading for flight telemetry."""

from pathlib import Path
from typing import Union

import pandas as pd

from .validator import REQUIRED_COLUMNS, TelemetryValidationError, validate_columns

PathLike = Union[str, Path]


class FlightDataLoadError(RuntimeError):
    """Raised when flight telemetry cannot be loaded from a CSV file."""


def load_telemetry_csv(
    file_path: PathLike,
    *,
    required_columns: tuple[str, ...] = REQUIRED_COLUMNS,
) -> pd.DataFrame:
    """Load and validate flight telemetry from a CSV file.

    Args:
        file_path: Path to the telemetry CSV file.
        required_columns: Column names required by the monitoring pipeline.

    Returns:
        A pandas dataframe containing the loaded telemetry.

    Raises:
        TypeError: If ``file_path`` is not a path-like value.
        FileNotFoundError: If the path does not exist.
        IsADirectoryError: If the path points to a directory.
        FlightDataLoadError: If pandas cannot parse the CSV.
        TelemetryValidationError: If required columns are missing or duplicated.
    """
    if not isinstance(file_path, (str, Path)):
        raise TypeError(
            f"file_path must be a string or pathlib.Path, got {type(file_path).__name__}"
        )

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Telemetry CSV does not exist: {path}")
    if not path.is_file():
        raise IsADirectoryError(f"Telemetry CSV path is not a file: {path}")

    try:
        dataframe = pd.read_csv(path)
    except (pd.errors.ParserError, pd.errors.EmptyDataError, UnicodeDecodeError) as error:
        raise FlightDataLoadError(f"Unable to parse telemetry CSV '{path}': {error}") from error

    return validate_columns(dataframe, required_columns)
