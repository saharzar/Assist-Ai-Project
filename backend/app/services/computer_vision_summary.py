"""Descriptive summaries of saved scalar values; no behavioral interpretation."""
from math import isfinite
from statistics import fmean, pstdev
from typing import Iterable, Protocol

from app.schemas.admin_computer_vision import (
    ComputerVisionMetrics, ComputerVisionSessionSummary, EyeDirectionSummary, HeadAxisSummary,
)


class SavedSample(Protocol):
    yaw: float | None
    pitch: float | None
    roll: float | None
    estimated_eye_direction: str | None
    is_user_interacting: bool


def summarize_samples(samples: Iterable[SavedSample]) -> ComputerVisionSessionSummary:
    """Input is in timestamp order. Percentages use all samples in each group.

    A valid head sample has three finite angles. Missing eyes are counted separately.
    Population standard deviation describes this session, rather than a population estimate.
    Eye changes require consecutive known directions: missing/excluded samples break continuity.
    Interacting samples remain stored; the second group excludes them only for calculation.
    """
    rows = list(samples)
    return ComputerVisionSessionSummary(all_samples=_metrics(rows, False),
                                        excluding_interaction=_metrics(rows, True))


def _metrics(rows: list[SavedSample], exclude_interaction: bool) -> ComputerVisionMetrics:
    angles = {axis: [] for axis in ("yaw", "pitch", "roll")}
    eye_counts = {direction: 0 for direction in ("left", "center", "right", "unknown")}
    total = valid = interacting = changes = 0
    previous_eye = None
    for row in rows:
        if exclude_interaction and row.is_user_interacting:
            previous_eye = None
            continue
        total += 1
        interacting += int(row.is_user_interacting)
        values = (row.yaw, row.pitch, row.roll)
        if all(value is not None and isfinite(value) for value in values):
            valid += 1
            for axis, value in zip(angles, values):
                angles[axis].append(value)
        eye = row.estimated_eye_direction if row.estimated_eye_direction in ("left", "center", "right") else None
        eye_counts[eye or "unknown"] += 1
        if eye is not None and previous_eye is not None and eye != previous_eye:
            changes += 1
        previous_eye = eye

    def percentage(count):
        return 100 * count / total if total else 0.0

    return ComputerVisionMetrics(
        total_samples=total, valid_samples=valid, missing_samples=total - valid,
        interacting_samples=interacting, interacting_percentage=percentage(interacting),
        head_pose={axis: HeadAxisSummary(
            minimum=min(values) if values else None, maximum=max(values) if values else None,
            mean=fmean(values) if values else None, standard_deviation=pstdev(values) if values else None,
            range=max(values) - min(values) if values else None,
        ) for axis, values in angles.items()},
        eye_direction={eye: EyeDirectionSummary(count=count, percentage=percentage(count))
                       for eye, count in eye_counts.items()}, eye_direction_changes=changes,
    )
