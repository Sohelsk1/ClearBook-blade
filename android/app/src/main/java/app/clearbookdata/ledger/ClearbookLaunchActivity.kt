package app.clearbookdata.ledger

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Keeps a visible Clearbook screen. The previous build handed off to Chrome and
 * finished itself, so on many phones the app flashed and closed.
 * The ledger still opens in the system browser, not an embedded WebView.
 */
class ClearbookLaunchActivity : AppCompatActivity() {
    private lateinit var titleView: TextView
    private lateinit var bodyView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_launch)
        val root = findViewById<View>(R.id.launch_root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(bars.left + 24, bars.top + 24, bars.right + 24, bars.bottom + 24)
            insets
        }
        titleView = findViewById(R.id.launch_title)
        bodyView = findViewById(R.id.launch_body)
        findViewById<View>(R.id.launch_open).setOnClickListener { openDestination() }
        if (savedInstanceState == null && intent?.action != Intent.ACTION_SEND && isOnline()) {
            root.post { openDestination() }
        } else {
            showState()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        showState()
        if (intent.action != Intent.ACTION_SEND) openDestination()
    }

    private fun openDestination() {
        if (intent?.action == Intent.ACTION_SEND) {
            showState()
            return
        }
        if (!isOnline()) {
            showState()
            return
        }
        val url = destinationUrl()
        val tabs = CustomTabsIntent.Builder().setShowTitle(true).build()
        try {
            tabs.launchUrl(this, Uri.parse(url))
        } catch (_: ActivityNotFoundException) {
            val view = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            try {
                startActivity(view)
            } catch (_: ActivityNotFoundException) {
                titleView.setText(R.string.no_browser_title)
                bodyView.setText(R.string.no_browser_body)
            }
        }
    }

    private fun showState() {
        when {
            intent?.action == Intent.ACTION_SEND -> {
                titleView.setText(R.string.import_title)
                bodyView.setText(R.string.import_body)
            }
            !isOnline() -> {
                titleView.setText(R.string.offline_title)
                bodyView.setText(R.string.offline_body)
            }
            else -> {
                titleView.setText(R.string.app_name)
                bodyView.setText(R.string.launch_body)
            }
        }
    }

    private fun destinationUrl(): String {
        if (intent?.action == Intent.ACTION_SEND) return ClearbookUrls.TRANSACTIONS
        val data = intent?.data
        if (ClearbookUrls.isTrustedHttps(data?.scheme, data?.host)) return data.toString()
        return ClearbookUrls.HOME
    }

    private fun isOnline(): Boolean {
        val manager = getSystemService(ConnectivityManager::class.java) ?: return true
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
