"""Validation for flight telemetry dataframes."""

from collections.abc import Iterable

import pandas as pd

REQUIRED_COLUMNS: tuple[str, ...] = (
    "timestamp",
    "rpm",
    "egt",
    "cht",
    "fuel_flow",
    "throttle",
    "altitude",
)


class TelemetryValidationError(ValueError):
    """Raised when flight telemetry does not satisfy the required schema."""


def validate_columns(
    dataframe: pd.DataFrame,
    required_columns: Iterable[str] = REQUIRED_COLUMNS,
) -> pd.DataFrame:
    """Validate that a dataframe contains the required telemetry columns.

    Extra columns are allowed so that additional telemetry can be carried
    through the pipeline without coupling this module to future sensors.
    The input dataframe is returned unchanged when validation succeeds.

    Args:
        dataframe: Telemetry dataframe to validate.
        required_columns: Column names required by the monitoring pipeline.

    Returns:
        The original dataframe.

    Raises:
        TypeError: If ``dataframe`` is not a pandas dataframe.
        TelemetryValidationError: If required columns are missing or duplicated.
    """
    if not isinstance(dataframe, pd.DataFrame):
        raise TypeError(
            f"dataframe must be a pandas.DataFrame, got {type(dataframe).__name__}"
        )

    required = tuple(required_columns)
    duplicate_required = sorted(
        {column for column in required if required.count(column) > 1}
    )
    if duplicate_required:
        raise TelemetryValidationError(
            f"required_columns contains duplicates: {duplicate_required}"
        )

    duplicate_columns = dataframe.columns[dataframe.columns.duplicated()].tolist()
    if duplicate_columns:
        raise TelemetryValidationError(
            f"Telemetry dataframe contains duplicate columns: {duplicate_columns}"
        )

    missing = [column for column in required if column not in dataframe.columns]
    if missing:
        raise TelemetryValidationError(
            f"Telemetry dataframe is missing required columns: {missing}"
        )

    return dataframe
