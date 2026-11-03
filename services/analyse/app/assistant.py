"""Assistant éditorial borné au dossier (M11 / W11).

Consignes versionnées, sortie JSON structurée, contrôle « zéro invention » systématique
et journalisation de chaque génération (modèle, date, consigne, extraits, sortie, conformité).
"""

import json
import logging
from datetime import datetime, timezone

import httpx

from .llm import LLMError, LLMProvider, parse_json
from .zero_invention import INSUFFICIENT, Excerpt, check_output

PROMPT_VERSION = "assistant-2026-11-03"
FUNCTIONS = ("draft", "angles", "headlines", "questions", "context")
FORMATS = ("radio", "post", "article", "debunk")
LANGUAGES = ("fr", "mg", "en")

log = logging.getLogger("maso.assistant")

FORMAT_GUIDE = {
    "radio": "une brève radio d'environ 45 secondes (100 à 120 mots), phrases courtes, faciles à dire à voix haute",
    "post": "un post pour les réseaux sociaux, 3 à 5 phrases, clair et sans sensationnalisme",
    "article": "un article court de 5 à 8 phrases",
    "debunk": "un rapport de démenti : ce qui circule, ce que montrent les éléments du dossier, ce qui reste à confirmer",
}
FUNCTION_GUIDE = {
    "draft": "Rédige {format}.",
    "angles": "Propose 3 angles de traitement possibles, une phrase chacun.",
    "headlines": "Propose 3 titres possibles, chacun suivi de ses citations.",
    "questions": "Propose 3 à 5 questions d'interview à poser aux personnes-ressources citées.",
    "context": "Résume le contexte utile au lecteur, en 3 à 5 phrases.",
}
LANGUAGE_NAME = {"fr": "français", "mg": "malgache", "en": "anglais"}

SYSTEM = """Tu es l'assistant éditorial de MASO, outil de vérification des faits à Madagascar.
Règles absolues :
1. Tu n'utilises QUE les extraits numérotés fournis ([P] preuves, [S] sources, [C] chiffres, [R] personnes-ressources, [K] checklist). Aucune connaissance extérieure.
2. Chaque phrase factuelle cite au moins un identifiant d'extrait, dans "citations".
3. Tu recopies les nombres, dates et noms propres exactement comme dans les extraits.
4. Tu ne donnes JAMAIS de verdict (vrai, faux, trompeur…) ni de niveau de confiance : c'est une décision humaine.
5. Si les extraits ne suffisent pas, tu t'abstiens : "sentences" vide et tu listes ce qui manque dans "missing".
Réponds uniquement en JSON : {"sentences": [{"text": "...", "citations": ["P1"]}], "missing": ["..."]}"""


def build_prompt(function: str, fmt: str, language: str, claim: str, excerpts: list[Excerpt]) -> str:
    lines = [
        FUNCTION_GUIDE[function].format(format=FORMAT_GUIDE[fmt]),
        f"Langue de la réponse : {LANGUAGE_NAME[language]}.",
        f"Affirmation vérifiée : {claim or '(non précisée)'}",
        "Extraits du dossier :",
        *(f"[{excerpt.id}] {excerpt.text}" for excerpt in excerpts),
    ]
    return "\n".join(lines)


def run_assistant(
    provider: LLMProvider,
    client: httpx.Client,
    function: str,
    fmt: str,
    language: str,
    claim: str,
    excerpts: list[Excerpt],
) -> dict:
    prompt = build_prompt(function, fmt, language, claim, excerpts)
    raw = provider.generate(client, SYSTEM, prompt)
    try:
        output = parse_json(raw)
    except LLMError:
        output = {"sentences": [], "missing": []}
    result = check_output(output.get("sentences") or [], excerpts)
    missing = [str(item) for item in output.get("missing") or [] if str(item).strip()][:10]
    response = {
        "model": provider.name,
        "prompt_version": PROMPT_VERSION,
        "prompt": prompt,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sentences": [{"text": sentence.text, "citations": sentence.citations} for sentence in result.kept],
        "removed": [{"text": item.text, "reason": item.reason, "detail": item.detail} for item in result.removed],
        "missing": missing,
        "compliant": result.compliant,
        "abstained": result.abstained,
        "abstention": INSUFFICIENT[language] if result.abstained else None,
        "cited_excerpts": sorted({ident for sentence in result.kept for ident in sentence.citations}),
    }
    log.info(
        json.dumps(
            {k: response[k] for k in ("model", "prompt_version", "generated_at", "compliant", "abstained", "cited_excerpts")}
            | {"function": function, "removed": len(result.removed)}
        )
    )
    return response
