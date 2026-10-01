from types import SimpleNamespace

import pytest

from app.services.computer_vision_summary import summarize_samples


def sample(yaw=0, pitch=0, roll=0, eye="center", interacting=False):
    return SimpleNamespace(yaw=yaw, pitch=pitch, roll=roll, estimated_eye_direction=eye,
                           is_user_interacting=interacting)


def test_head_statistics_use_population_variation_and_negative_values():
    result = summarize_samples([sample(-10, -6, 1), sample(0, 0, 3), sample(10, 6, 5)]).all_samples
    assert result.total_samples == result.valid_samples == 3
    for axis, expected in (("yaw", (-10, 10, 0, (200 / 3) ** 0.5, 20)),
                           ("pitch", (-6, 6, 0, 24 ** 0.5, 12)), ("roll", (1, 5, 3, (8 / 3) ** 0.5, 4))):
        metrics = result.head_pose[axis]
        assert list(metrics.model_dump().values()) == pytest.approx(expected)


def test_eye_counts_percentages_and_changes_require_consecutive_known_directions():
    rows = [sample(eye=eye) for eye in ("left", "left", "center", None, "right", "left", "center", "right")]
    result = summarize_samples(rows).all_samples
    assert result.eye_direction["left"].count == 3
    assert result.eye_direction["left"].percentage == 37.5
    assert result.eye_direction["center"].count == result.eye_direction["right"].count == 2
    assert result.eye_direction["unknown"].count == 1
    assert result.eye_direction["unknown"].percentage == 12.5
    assert result.eye_direction_changes == 4
    assert sum(item.percentage for item in result.eye_direction.values()) == 100


def test_interaction_group_does_not_bridge_excluded_samples_or_modify_input():
    rows = [sample(-10, eye="left"), sample(90, eye="right", interacting=True), sample(10, eye="center")]
    summary = summarize_samples(rows)
    assert summary.all_samples.head_pose["yaw"].mean == 30
    assert summary.all_samples.interacting_samples == 1
    assert summary.all_samples.interacting_percentage == pytest.approx(100 / 3)
    assert summary.all_samples.eye_direction_changes == 2
    filtered = summary.excluding_interaction
    assert filtered.total_samples == filtered.valid_samples == 2
    assert filtered.interacting_samples == filtered.interacting_percentage == 0
    assert filtered.head_pose["yaw"].mean == 0
    assert filtered.head_pose["yaw"].standard_deviation == 10
    assert filtered.eye_direction["right"].count == 0
    assert filtered.eye_direction_changes == 0
    assert rows[1].is_user_interacting and len(rows) == 3


def test_missing_head_does_not_become_zero_and_unknown_eyes_do_not_invalidate_head():
    result = summarize_samples([sample(10, 20, 30, eye=None), sample(None, None, None, eye=None),
                                sample(1, None, 2, eye="unknown"), sample(float("nan"), 0, 0)]).all_samples
    assert result.total_samples == 4 and result.valid_samples == 1 and result.missing_samples == 3
    assert result.head_pose["yaw"].mean == 10
    assert result.head_pose["pitch"].minimum == 20
    assert result.head_pose["roll"].standard_deviation == result.head_pose["roll"].range == 0
    assert result.eye_direction["unknown"].count == 3


@pytest.mark.parametrize("rows", [[], [sample(None, None, None, eye=None)]])
def test_empty_or_missing_session_has_null_angle_statistics_and_no_changes(rows):
    summary = summarize_samples(rows)
    for result in (summary.all_samples, summary.excluding_interaction):
        assert result.valid_samples == 0 and result.missing_samples == len(rows)
        assert result.eye_direction_changes == 0
        assert all(value is None for axis in result.head_pose.values() for value in axis.model_dump().values())
        assert result.eye_direction["unknown"].count == len(rows)
        assert result.eye_direction["unknown"].percentage == (100 if rows else 0)


def test_all_interacting_samples_leave_an_empty_filtered_group():
    summary = summarize_samples([sample(interacting=True)])
    assert summary.all_samples.interacting_percentage == 100
    assert summary.excluding_interaction.total_samples == 0
    assert summary.excluding_interaction.head_pose["yaw"].mean is None
