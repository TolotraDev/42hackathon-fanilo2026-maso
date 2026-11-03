import pytest

from app.netguard import UnsafeUrlError, check_url, is_public_ip


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.5", "192.168.1.10", "169.254.169.254", "::1", "fc00::1", "0.0.0.0"])
def test_adresses_internes_refusees(address):
    assert not is_public_ip(address)


def test_adresse_publique_acceptee():
    assert is_public_ip("1.1.1.1")


@pytest.mark.parametrize(
    "url, reason",
    [
        ("file:///etc/passwd", "unsupported_scheme"),
        ("ftp://exemple.mg/x", "unsupported_scheme"),
        ("http://127.0.0.1/admin", "private_address"),
        ("http://localhost/", "private_address"),
        ("http://localhost:8000/", "unsupported_port"),
        ("http://169.254.169.254/latest/meta-data", "private_address"),
        ("http://user:secret@exemple.mg/", "invalid_host"),
        ("http://1.1.1.1:6379/", "unsupported_port"),
    ],
)
def test_urls_dangereuses_refusees(url, reason):
    with pytest.raises(UnsafeUrlError, match=reason):
        check_url(url)
