"""Contrôle « IA zéro invention » (cahier des charges, section 10).

Le modèle ne reçoit que des extraits numérotés du dossier ([P1] preuve, [S2] source, [C3] chiffre,
[R4] personne-ressource, [K5] checklist). Sa sortie est contrôlée ici, phrase par phrase :
- chaque phrase cite au moins un extrait, et chaque identifiant cité existe ;
- chaque nombre, date et nom propre de la phrase figure dans les extraits cités ;
- aucune phrase ne porte de verdict.
Une phrase non conforme est retirée, avec sa raison. Sans phrase conforme, l'assistant s'abstient.
"""

import re
import unicodedata
from dataclasses import dataclass, field

EXCERPT_ID = re.compile(r"^[PSCRK]\d{1,3}$")
CITATION = re.compile(r"\[([PSCRK]\d{1,3})\]")
NUMBER = re.compile(r"\d+(?:[.,\s]\d{3})*(?:[.,]\d+)?")
# Mots en majuscule en début de phrase ou très courants : ce ne sont pas des noms propres à contrôler.
COMMON_CAPITALIZED = {
    "le", "la", "les", "un", "une", "des", "ce", "cette", "ces", "il", "elle", "ils", "elles", "on", "nous",
    "selon", "dans", "en", "au", "aux", "du", "de", "pour", "par", "sur", "avec", "sans", "mais", "et", "ou",
    "the", "a", "an", "this", "that", "these", "according", "in", "on", "for", "with", "and", "but",
    "ny", "ary", "ireo", "izany", "araka", "amin", "tamin", "ho", "fa", "na", "dia",
    "brouillon", "information", "radio", "post", "article", "démenti",
}
# Un verdict reste une décision humaine : ces termes sont refusés dans une phrase générée.
VERDICT_TERMS = (
    "c'est faux", "c'est vrai", "est faux", "est vrai", "est trompeur", "est fabriqué", "verdict",
    "is false", "is true", "is misleading", "fake news", "diso ", "marina ny", "tsy marina",
)
INSUFFICIENT = {
    "fr": "Information insuffisante dans le dossier.",
    "mg": "Tsy ampy ny vaovao ao amin'ny antontan-taratasy.",
    "en": "Insufficient information in the case file.",
}


@dataclass
class Excerpt:
    id: str
    text: str


@dataclass
class Sentence:
    text: str
    citations: list[str]


@dataclass
class Removed:
    text: str
    reason: str
    detail: str = ""


@dataclass
class CheckResult:
    kept: list[Sentence] = field(default_factory=list)
    removed: list[Removed] = field(default_factory=list)

    @property
    def compliant(self) -> bool:
        return not self.removed

    @property
    def abstained(self) -> bool:
        return not self.kept


def normalize(text: str) -> str:
    """Minuscules, sans accents ni espaces multiples : « 1 200 » et « 1200 » se comparent."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", text)


def _digits(number: str) -> str:
    return re.sub(r"[^\d]", "", number)


def _numbers(text: str) -> set[str]:
    return {_digits(match) for match in NUMBER.findall(text) if _digits(match)}


def _proper_nouns(text: str) -> set[str]:
    words = re.findall(r"[A-ZÀ-ÖØ-Þ][\wÀ-ÿ'’-]+", text)
    # Le premier mot de la phrase porte une majuscule sans être un nom propre.
    first = re.match(r"\W*([\wÀ-ÿ'’-]+)", text)
    first_word = first.group(1) if first else ""
    nouns = set()
    for index, word in enumerate(words):
        if index == 0 and word == first_word:
            continue
        if normalize(word) in COMMON_CAPITALIZED or len(word) < 3:
            continue
        nouns.add(word)
    return nouns


def check_sentence(sentence: Sentence, excerpts: dict[str, Excerpt]) -> Removed | None:
    text = CITATION.sub("", sentence.text).strip()
    if not sentence.citations:
        return Removed(sentence.text, "no_citation")
    unknown = [ident for ident in sentence.citations if ident not in excerpts]
    if unknown:
        return Removed(sentence.text, "unknown_excerpt", ", ".join(unknown))
    lowered = f" {normalize(text)} "
    for term in VERDICT_TERMS:
        if normalize(term) in lowered:
            return Removed(sentence.text, "verdict", term.strip())

    cited = " ".join(excerpts[ident].text for ident in sentence.citations)
    cited_numbers = _numbers(cited)
    missing_numbers = [number for number in _numbers(text) if number not in cited_numbers]
    if missing_numbers:
        return Removed(sentence.text, "number_not_in_excerpts", ", ".join(sorted(missing_numbers)))

    cited_normalized = normalize(cited)
    missing_names = [noun for noun in _proper_nouns(text) if normalize(noun) not in cited_normalized]
    if missing_names:
        return Removed(sentence.text, "name_not_in_excerpts", ", ".join(sorted(missing_names)))
    return None


def parse_sentences(raw: list) -> list[Sentence]:
    """Accepte la sortie JSON du modèle : [{"text": ..., "citations": [...]}] ou des phrases avec [P1] dans le texte."""
    sentences = []
    for item in raw:
        if isinstance(item, str):
            text, citations = item, []
        elif isinstance(item, dict):
            text = str(item.get("text", ""))
            citations = [str(ident).strip("[] ") for ident in item.get("citations", []) or []]
        else:
            continue
        citations += [ident for ident in CITATION.findall(text) if ident not in citations]
        citations = [ident for ident in citations if EXCERPT_ID.match(ident)]
        if text.strip():
            sentences.append(Sentence(text=text.strip(), citations=citations))
    return sentences


def check_output(raw_sentences: list, excerpts: list[Excerpt]) -> CheckResult:
    by_id = {excerpt.id: excerpt for excerpt in excerpts}
    result = CheckResult()
    for sentence in parse_sentences(raw_sentences):
        problem = check_sentence(sentence, by_id)
        if problem:
            result.removed.append(problem)
        else:
            result.kept.append(sentence)
    return result
