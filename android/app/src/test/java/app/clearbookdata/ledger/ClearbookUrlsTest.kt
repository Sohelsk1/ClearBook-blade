package app.clearbookdata.ledger

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClearbookUrlsTest {
    @Test
    fun acceptsProductionApexOnly() {
        assertTrue(ClearbookUrls.isTrustedHttps("https", "clearbookdata.in"))
    }

    @Test
    fun rejectsCleartextLookalikesAndOtherHosts() {
        assertFalse(ClearbookUrls.isTrustedHttps("http", "clearbookdata.in"))
        assertFalse(ClearbookUrls.isTrustedHttps("https", "www.clearbookdata.in"))
        assertFalse(ClearbookUrls.isTrustedHttps("https", "clearbookdata.in.evil.example"))
        assertFalse(ClearbookUrls.isTrustedHttps("https", "evil.clearbookdata.in"))
        assertFalse(ClearbookUrls.isTrustedHttps("javascript", "clearbookdata.in"))
        assertFalse(ClearbookUrls.isTrustedHttps(null, "clearbookdata.in"))
    }
}
