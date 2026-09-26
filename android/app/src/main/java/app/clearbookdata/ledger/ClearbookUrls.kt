package app.clearbookdata.ledger

/**
 * Only the production apex is trusted. www is a separate forwarder and is not
 * opened inside the app. No financial data is stored here.
 */
object ClearbookUrls {
    const val HOST = "clearbookdata.in"
    const val HOME = "https://clearbookdata.in/"
    const val LOGIN = "https://clearbookdata.in/login?mode=login"
    const val TRANSACTIONS = "https://clearbookdata.in/transactions"
    const val SETTINGS = "https://clearbookdata.in/settings"

    fun isTrustedHttps(scheme: String?, host: String?): Boolean {
        return scheme == "https" && host == HOST
    }
}
