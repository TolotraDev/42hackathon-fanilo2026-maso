import pytest
from defusedxml.common import DefusedXmlException

from app.veille import parse_feed

RSS = b"""<?xml version="1.0"?>
<rss version="2.0"><channel><title>Journal test</title>
<item><title>Cyclone : alerte rouge &amp; evacuation</title><link>https://example.org/a</link>
<description>&lt;p&gt;Le BNGRC appelle &lt;b&gt;au calme&lt;/b&gt;.&lt;/p&gt;</description>
<pubDate>Tue, 03 Nov 2026 08:00:00 GMT</pubDate></item>
</channel></rss>"""

ATOM = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Flux Atom</title>
<entry><title>Prix du riz</title><link href="https://example.org/b"/><updated>2026-11-02T10:00:00Z</updated>
<summary>Hausse annoncee</summary></entry></feed>"""


def test_rss_items_are_cleaned():
    [item] = parse_feed(RSS, "https://example.org/rss")
    assert item["title"] == "Cyclone : alerte rouge & evacuation"
    assert item["summary"] == "Le BNGRC appelle au calme ."
    assert item["source"] == "Journal test"
    assert item["published_at"].startswith("2026-11-03")


def test_atom_entries_are_read():
    [item] = parse_feed(ATOM, "https://example.org/atom")
    assert item["link"] == "https://example.org/b" and item["source"] == "Flux Atom"


def test_entity_expansion_is_refused():
    bomb = b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;">]><rss><channel><title>&b;</title></channel></rss>'
    with pytest.raises(DefusedXmlException):
        parse_feed(bomb, "https://example.org")
