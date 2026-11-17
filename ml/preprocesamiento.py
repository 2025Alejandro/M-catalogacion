"""Preprocesamiento de texto en español para el clasificador de intenciones (Avance 2).

Pasos (en este orden):
  1. Normalización: minúsculas, eliminación de acentos (NFD), reemplazo de IDs y tiempos por marcadores.
  2. Tokenización: palabras alfanuméricas con expresión regular.
  3. Eliminación de stopwords: lista propia que CONSERVA palabras con valor para la intención
     (qué, quién, dónde, cómo, cuándo, minuto, aparece, dice, etc.).
  4. Stemming (raíz): SnowballStemmer('spanish') de NLTK si está instalado; si no, un reductor de
     sufijos sencillo incluido aquí (menos preciso). El script informa cuál se usó (STEMMER_USADO).

Marcadores: los IDs (NT20045) y tiempos (21:48, 00:09:15) no aportan significado por sí mismos, pero SÍ
indican la intención (un ID sugiere consulta de ficha; un tiempo sugiere fragmento por timecode),
por eso se sustituyen por los tokens «idmaterial» y «timecode» en lugar de eliminarse.
"""
from __future__ import annotations

import re
import unicodedata

try:  # NLTK es la opción del proyecto; si no está disponible se usa el reductor propio
    from nltk.stem.snowball import SpanishStemmer
    _SNOWBALL = SpanishStemmer()
    STEMMER_USADO = "NLTK SnowballStemmer('spanish')"
except Exception:  # pragma: no cover - depende del entorno
    _SNOWBALL = None
    STEMMER_USADO = "reductor de sufijos propio (NLTK no disponible)"

# Stopwords: artículos, preposiciones, conjunciones y pronombres de bajo valor.
# NO se incluyen palabras interrogativas ni verbos de consulta porque distinguen intenciones.
STOPWORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "uno", "lo", "al", "del", "de", "en", "con", "por", "para",
    "a", "y", "o", "u", "e", "se", "me", "te", "le", "les", "nos", "mi", "mis", "tu", "tus", "su", "sus",
    "es", "son", "este", "esta", "estos", "estas", "ese", "esa", "eso", "esto", "muy", "tambien", "pero",
    "entre", "porque", "pues", "ahi", "aqui", "oye", "disculpa", "favor", "urgente", "mira",
}
# Se conservan a propósito (aportan significado a la intención): que, quien, donde, como, cuando, cuanto, hay,
# mas, ya, sobre, hasta, desde, si, no, hola, gracias, minuto, aparece, dice, etc.

_RE_ID = re.compile(r"\b[a-z]{2}\d{5}\b", re.I)
_RE_TIEMPO = re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\b")
_RE_TOKEN = re.compile(r"[a-z0-9]+")


def quitar_acentos(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def normalizar(texto: str) -> str:
    """Minúsculas, sin acentos, con IDs y tiempos sustituidos por marcadores."""
    texto = _RE_ID.sub(" idmaterial ", texto)
    texto = _RE_TIEMPO.sub(" timecode ", texto)
    return quitar_acentos(texto.lower())


def tokenizar(texto: str) -> list[str]:
    return _RE_TOKEN.findall(texto)


_SUFIJOS = ["amientos", "imientos", "aciones", "uciones", "amiento", "imiento", "mente", "adoras", "adores",
            "ancias", "encias", "acion", "ucion", "adora", "ador", "ables", "ibles", "istas", "ando", "iendo",
            "aron", "ieron", "aban", "idas", "idos", "adas", "ados", "ante", "able", "ible", "ista", "ar", "er", "ir",
            "ado", "ido", "ada", "ida", "an", "en", "as", "es", "os", "a", "e", "o", "s"]


def _reductor_propio(token: str) -> str:
    if len(token) <= 4 or token.isdigit():
        return token
    for suf in _SUFIJOS:
        if token.endswith(suf) and len(token) - len(suf) >= 3:
            return token[: -len(suf)]
    return token


def raiz(token: str) -> str:
    if token in {"idmaterial", "timecode"}:
        return token
    return _SNOWBALL.stem(token) if _SNOWBALL else _reductor_propio(token)


def preprocesar(texto: str, usar_stopwords: bool = True, usar_stemming: bool = True) -> list[str]:
    tokens = tokenizar(normalizar(texto))
    if usar_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS]
    if usar_stemming:
        tokens = [raiz(t) for t in tokens]
    return tokens


def preprocesar_a_texto(texto: str) -> str:
    """Devuelve los tokens unidos por espacio (formato que consume TfidfVectorizer)."""
    return " ".join(preprocesar(texto))


if __name__ == "__main__":
    ejemplos = ["¿En qué minuto dijeron que no habrá aumento en la tarifa del metro? (NT20045, 21:48)",
                "Busca materiales sobre inundaciones", "¿Aparece alguna persona en el EN10388?"]
    print("Stemmer:", STEMMER_USADO)
    for e in ejemplos:
        n = normalizar(e); t = tokenizar(n); s = [x for x in t if x not in STOPWORDS]
        print(f"\nOriginal      : {e}\nNormalizado   : {n}\nTokens        : {t}\nSin stopwords : {s}\nRaíces        : {[raiz(x) for x in s]}")
