import pytest
import azure.cognitiveservices.speech as speechsdk

from app.services import stt_service
from app.services.stt_service import (
    SttTranscriptResult,
    choose_best_name_result,
    get_auto_detect_name_locales,
    get_ordered_name_locales,
    is_reliable_name_result,
)


def test_azure_name_locales_prioritize_ui_language_and_include_all_site_languages():
    assert get_ordered_name_locales("tr") == [
        "tr-TR", "en-US", "es-ES", "de-DE", "pt-PT", "fr-FR",
    ]
    assert get_auto_detect_name_locales("tr") == ["tr-TR", "en-US", "es-ES", "de-DE"]


@pytest.mark.parametrize("name", ["Sahar Zar", "Ceyda \u00d6zt\u00fcrk", "Fran\u00e7ois D'Arc", "Jo\u00e3o-Silva"])
def test_azure_accepts_supported_latin_names(name):
    assert is_reliable_name_result(SttTranscriptResult(name, "tr-TR", 0.8))


def test_azure_rejects_unrelated_script_and_low_confidence_results():
    assert not is_reliable_name_result(SttTranscriptResult("\u0928\u092e\u0938\u094d\u0924\u0947", "hi-IN", 0.95))
    assert not is_reliable_name_result(SttTranscriptResult("Sahar", "en-US", 0.2))


def test_azure_chooses_highest_confidence_supported_name():
    best = choose_best_name_result([
        SttTranscriptResult("Saharza", "tr-TR", 0.58),
        SttTranscriptResult("Sahar Zar", "en-US", 0.91),
        SttTranscriptResult("\u0938\u0939\u0930", "hi-IN", 0.99),
    ])
    assert best.transcript == "Sahar Zar"


@pytest.mark.parametrize("punctuated", ["Sahar Zar.", "Sahar Zar!", "Sahar Zar,", "Sahar Zar\u2026"])
def test_azure_removes_terminal_punctuation_before_name_validation(monkeypatch, punctuated):
    result = type("RecognitionResult", (), {"reason": speechsdk.ResultReason.RecognizedSpeech})()
    monkeypatch.setattr(stt_service, "get_best_transcript_and_confidence", lambda value: (punctuated, 0.9))

    parsed = stt_service.parse_recognition_result(result, "name", "en-US")

    assert parsed is not None
    assert parsed.transcript == "Sahar Zar"
