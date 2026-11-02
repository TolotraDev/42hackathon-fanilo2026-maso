import os

from app.config import PROJECT_ENV, load_env_file


def test_lit_le_env_du_projet(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text("# commentaire\nHF_TOKEN=hf_test\nVIDE=\nDEJA=fichier\n", encoding="utf-8")
    monkeypatch.delenv("HF_TOKEN", raising=False)
    monkeypatch.delenv("VIDE", raising=False)
    monkeypatch.setenv("DEJA", "lancement")
    load_env_file(env)
    assert os.environ["HF_TOKEN"] == "hf_test"
    assert "VIDE" not in os.environ, "une valeur vide ne remplace rien"
    assert os.environ["DEJA"] == "lancement", "la variable passée au lancement reste prioritaire"


def test_cherche_le_env_a_la_racine_du_projet():
    assert PROJECT_ENV.parent.joinpath("package.json").is_file()
