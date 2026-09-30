import pytest
from app.services.soniox_service import parse_soniox_transcript, get_soniox_language_hints


def test_name_language_hints_include_all_site_languages():
    assert set(get_soniox_language_hints("tr", "name")) == {"en", "es", "de", "tr", "pt", "fr"}


@pytest.mark.parametrize("name", ["Sahar Zar", "Ceyda \u00d6zt\u00fcrk", "Fran\u00e7ois D'Arc", "Jo\u00e3o-Silva"])
def test_accepts_supported_latin_names(name):
    assert parse_soniox_transcript({"text": name, "tokens": [{"confidence": 0.8}]}, "name").transcript == name


def test_rejects_unrelated_script_and_low_confidence_results():
    assert not parse_soniox_transcript({"text": "\u0928\u092e\u0938\u094d\u0924\u0947"}, "name").transcript
    assert not parse_soniox_transcript({"text": "Sahar", "tokens": [{"confidence": 0.2}]}, "name").transcript


@pytest.mark.parametrize("punctuated", ["Sahar Zar.", "Sahar Zar!", "Sahar Zar,", "Sahar Zar\u2026"])
def test_removes_terminal_punctuation_before_name_validation(punctuated):
    assert parse_soniox_transcript({"text": punctuated}, "name").transcript == "Sahar Zar"
